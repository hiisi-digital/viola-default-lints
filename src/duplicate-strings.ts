/**
 * Duplicate Strings Linter
 *
 * Detects string literals that appear multiple times in the codebase.
 *
 * @module
 */

import { matchesGlob } from "@hiisi/viola/utils";
import {
  BaseLinter,
  type CodebaseData,
  type Issue,
  type IssueCatalog,
  type LinterConfig,
  type LinterDataRequirements,
  type LinterMeta,
  type StringLiteral,
} from "@hiisi/viola";
import { isIgnored, locationString, optionsFrom } from "./options.ts";

// =============================================================================
// Configuration
// =============================================================================

/**
 * Options for the duplicate strings linter.
 */
export interface DuplicateStringsOptions {
  /** Minimum string length to check (shorter strings are ignored) */
  minLength?: number;
  /** Maximum string length to check (very long strings are usually unique) */
  maxLength?: number;
  /** Number of occurrences that triggers detection */
  threshold?: number;
  /** Patterns to ignore (e.g., common strings like "true", "false") */
  ignorePatterns?: RegExp[];
  /** Ignore strings that look like identifiers (camelCase, snake_case) */
  ignoreIdentifierLike?: boolean;
  /** Ignore strings that look like paths */
  ignorePaths?: boolean;
  /** Ignore strings that look like URLs */
  ignoreUrls?: boolean;
  /** Ignore strings that are likely CSS classes */
  ignoreCssClasses?: boolean;
  /**
   * Ignore strings used in typeof comparisons (e.g., "object", "function", "string").
   * These are JavaScript primitive type names commonly used in type guards.
   * @default true
   */
  ignoreTypeofStrings?: boolean;
  /**
   * Ignore strings the codebase declares as members of a type.
   *
   * The literals of a string-literal union and the values of a string enum:
   * `"primary"` where `type Role = "primary" | "suppressed"`, `"major"` where
   * `enum Impact { Major = "major" }`.
   *
   * They repeat because the type says they may, and the compiler checks every
   * occurrence. Extracting a constant loses the correspondence with the
   * declaration and removes the property that makes them safe: rename the
   * union member and every use breaks, which is exactly what a shared constant
   * would stop happening.
   *
   * @default true
   */
  ignoreDeclaredVocabulary?: boolean;

  /**
   * Ignore the text between the holes of a template literal.
   *
   * A fragment such as the leading word of `Found ${n} things` is half a
   * sentence, not a constant. It repeats across every message shaped that way,
   * and the remedy this linter suggests, extracting a constant, would leave
   * the message reading as an assembled fragment rather than as a sentence.
   *
   * A repeated message *shape* is worth noticing, but the answer to that is a
   * shared function, which is a different finding than this one makes.
   *
   * @default true
   */
  ignoreTemplateFragments?: boolean;

  /**
   * Ignore the module a string names, where it names one.
   *
   * `import ts from "typescript"` repeats in every file that imports it, which
   * is what importing is. The remedy this linter offers does not apply: a
   * specifier cannot be a constant, since an import is resolved before any
   * constant exists.
   *
   * @default true
   */
  ignoreModuleSpecifiers?: boolean;

  /**
   * Which files an occurrence has to be in to count toward the threshold.
   *
   * **Everything, by default.** A project that wants a narrower population
   * says so; the linter does not decide on its behalf, and does not carry an
   * opinion about which of `_test.ts`, `.test.ts`, `.spec.ts` or `__tests__/`
   * a project uses.
   *
   * The reason to narrow it: a literal spelled out four times across four test
   * cases is four tests each asserting its own expected value, not a
   * maintainability problem. The remedy this linter suggests, a shared
   * constant, makes those tests assert the constant against itself, which is
   * the one shape a test may never have.
   *
   * Occurrences outside the population are still reported in the locations
   * list, so nothing is hidden; they just do not push a string over the
   * threshold on their own.
   *
   * @default ["**"]
   * @example ["src/**", "!src/**\/*_test.ts"]
   */
  countIn?: readonly string[];

  /**
   * Explicit list of strings to ignore. Use this as an escape hatch for
   * project-specific strings that are intentionally repeated.
   *
   * Unlike patterns, this requires you to explicitly list each string,
   * forcing you to think about whether it truly should be exempt.
   *
   * @default []
   * @example ["my-app-name", "some-repeated-key"]
   */
  ignoreStrings?: string[];
}

/**
 * Strings used in typeof comparisons - JavaScript primitive type names.
 * These are genuinely ubiquitous in type guards and shouldn't be flagged.
 */
const TYPEOF_STRINGS = new Set([
  "object",
  "function",
  "string",
  "number",
  "boolean",
  "undefined",
  "symbol",
  "bigint",
]);

/**
 * String unions the runtime declares, which a consumer has to spell out.
 *
 * The same case as `TYPEOF_STRINGS` above and the same reasoning: these are
 * members of a type, they repeat because the type says they may, and the
 * remedy this linter offers is not available. `stdout: PIPED` obscures a Deno
 * API value and gains nothing, since the union belongs to the runtime and
 * renaming a member of it is not something a consumer can do.
 *
 * Only unions that can be named and pointed at. A word that merely recurs is
 * not on this list.
 */
const RUNTIME_VOCABULARY = new Set([
  // Deno.CommandOptions stdin/stdout/stderr
  "piped",
  "inherit",
  // Deno.PermissionName
  "read",
  "write",
  "net",
  "env",
  "run",
  "ffi",
  "sys",
]);

/**
 * Default options.
 */
const DEFAULT_OPTIONS: Required<DuplicateStringsOptions> = {
  minLength: 4,
  maxLength: 200,
  threshold: 2,
  ignorePatterns: [
    /^(true|false|null|undefined|yes|no|on|off)$/i,
    /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$/,
    /^(utf-8|utf8|ascii|base64|hex|binary)$/i,
    /^(left|right|top|bottom|center|start|end)$/i,
    /^(id|name|type|value|key|data|text|label|title)$/i,
    /^(click|change|submit|focus|blur|input|load)$/i,
    /^\d+$/, // Pure numbers
    /^[a-z]$/, // Single letters
    /^\s+$/, // Whitespace only
  ],
  ignoreIdentifierLike: true,
  ignorePaths: true,
  ignoreUrls: true,
  ignoreCssClasses: true,
  ignoreTypeofStrings: true,
  ignoreDeclaredVocabulary: true,
  ignoreTemplateFragments: true,
  ignoreModuleSpecifiers: true,
  countIn: ["**"],
  ignoreStrings: [],
};

// =============================================================================
// Helper Functions
// =============================================================================

function looksLikeIdentifier(str: string): boolean {
  if (/^[a-z][a-zA-Z0-9]*$/.test(str) && /[A-Z]/.test(str)) return true;
  if (/^[A-Z][a-zA-Z0-9]*$/.test(str)) return true;
  if (/^[a-z][a-z0-9_]*$/.test(str) && str.includes("_")) return true;
  if (/^[A-Z][A-Z0-9_]*$/.test(str) && str.includes("_")) return true;
  if (/^[a-z][a-z0-9-]*$/.test(str) && str.includes("-")) return true;
  return false;
}

function looksLikePath(str: string): boolean {
  if (str.includes("/") || str.includes("\\")) return true;
  if (/\.[a-z]{2,4}$/i.test(str)) return true;
  if (str.startsWith("./") || str.startsWith("../")) return true;
  return false;
}

function looksLikeUrl(str: string): boolean {
  return /^(https?|ftp|file|ws|wss):\/\//i.test(str) ||
    str.startsWith("//") ||
    /^[a-z][a-z0-9+.-]*:/i.test(str);
}

function looksLikeCssClasses(str: string): boolean {
  const parts = str.split(/\s+/);
  if (parts.length < 2) return false;
  return parts.every((p) => /^[a-z][a-z0-9_-]*$/i.test(p));
}

function shouldIgnore(
  str: string,
  options: DuplicateStringsOptions,
  vocabulary: ReadonlySet<string>,
): boolean {
  if (
    (options.ignoreDeclaredVocabulary ?? true) &&
    (vocabulary.has(str) || RUNTIME_VOCABULARY.has(str))
  ) {
    return true;
  }
  if (str.length < (options.minLength ?? 4)) return true;
  if (str.length > (options.maxLength ?? 200)) return true;
  const patterns = options.ignorePatterns ?? [];
  if (patterns.some((p) => p.test(str))) return true;
  if (options.ignoreIdentifierLike && looksLikeIdentifier(str)) return true;
  if (options.ignorePaths && looksLikePath(str)) return true;
  if (options.ignoreUrls && looksLikeUrl(str)) return true;
  if (options.ignoreCssClasses && looksLikeCssClasses(str)) return true;
  // Ignore typeof comparison strings (object, function, string, etc.)
  if ((options.ignoreTypeofStrings ?? true) && TYPEOF_STRINGS.has(str)) {
    return true;
  }
  // Ignore explicitly listed strings
  if (options.ignoreStrings?.includes(str)) return true;
  return false;
}

/**
 * Whether a file is in the population the threshold is counted over.
 *
 * A leading `!` negates, and a negation wins wherever it matches, so
 * `["src/**", "!src/**\/*_test.ts"]` reads the way it looks.
 */
function counts(file: string, patterns: readonly string[]): boolean {
  let included = false;
  for (const pattern of patterns) {
    if (pattern.startsWith("!")) {
      if (matchesGlob(file, pattern.slice(1))) return false;
    } else if (matchesGlob(file, pattern)) {
      included = true;
    }
  }
  return included;
}

function groupByValue(
  strings: readonly StringLiteral[],
): Map<string, StringLiteral[]> {
  const groups = new Map<string, StringLiteral[]>();
  for (const str of strings) {
    const existing = groups.get(str.value);
    if (existing) {
      existing.push(str);
    } else {
      groups.set(str.value, [str]);
    }
  }
  return groups;
}

function formatString(str: string, maxLen: number = 50): string {
  if (str.length <= maxLen) return `"${str}"`;
  return `"${str.slice(0, maxLen - 3)}..."`;
}

function suggestConstName(str: string): string {
  const words = str
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .slice(0, 4);
  if (words.length === 0) return "STRING_CONSTANT";
  return words.map((w) => w.toUpperCase()).join("_");
}

// =============================================================================
// Duplicate Strings Linter
// =============================================================================

export class DuplicateStringsLinter extends BaseLinter {
  readonly meta: LinterMeta = {
    id: "duplicate-strings",
    name: "Duplicate Strings",
    description:
      "Detects string literals that appear multiple times and should be extracted to constants",
  };

  readonly catalog: IssueCatalog = {
    "duplicate-strings/duplicate": {
      category: "maintainability",
      impact: "minor",
      description: "String literal appears multiple times",
      defaultConfidence: 85,
    },
  };

  readonly requirements: LinterDataRequirements = {
    strings: true,
    // The declared vocabulary is read off type bodies, so the types have to
    // have been extracted for it to be there at all.
    types: true,
  };

  lint(data: CodebaseData, config: LinterConfig): Issue[] {
    const issues: Issue[] = [];
    const options = optionsFrom<Required<DuplicateStringsOptions>>(
      config,
      DEFAULT_OPTIONS,
    );

    const vocabulary = data.literalVocabulary ?? new Set<string>();
    // Every module this codebase imports, which is where a specifier's
    // repetition comes from and why it is not duplication.
    const specifiers = (options.ignoreModuleSpecifiers ?? true)
      ? new Set(data.allImports.map((i) => i.from))
      : new Set<string>();
    const stringsToCheck = data.allStrings.filter((str) =>
      !specifiers.has(str.value) &&
      !((options.ignoreTemplateFragments ?? true) && str.isTemplate) &&
      !shouldIgnore(str.value, options, vocabulary)
    );

    const groups = groupByValue(stringsToCheck);

    const population = options.countIn ?? ["**"];
    for (const [value, occurrences] of groups) {
      // Counted over the population, reported over everything: a reader
      // chasing a finding still sees every place the string turns up.
      const counted = occurrences.filter((o) =>
        counts(o.location.file, population)
      );
      if (counted.length >= (options.threshold ?? 2)) {
        issues.push(
          this.createDuplicateIssue(value, occurrences, counted.length),
        );
      }
    }

    issues.sort((a, b) => {
      const countA = (a.context?.count as number) ?? 0;
      const countB = (b.context?.count as number) ?? 0;
      return countB - countA;
    });

    return issues;
  }

  private createDuplicateIssue(
    value: string,
    occurrences: StringLiteral[],
    countedCount: number = occurrences.length,
  ): Issue {
    const count = countedCount;
    const firstOccurrence = occurrences[0]!;
    const suggestedName = suggestConstName(value);
    const files = [...new Set(occurrences.map((o) => o.location.file))];
    const fileCount = files.length;

    const locationList = occurrences
      .slice(0, 5)
      .map((o) => `  - ${o.location.file}:${o.location.line}`)
      .join("\n");
    const moreLocations = occurrences.length > 5
      ? `\n  ... and ${occurrences.length - 5} more locations`
      : "";

    // Confidence scales with number of occurrences
    const confidence = Math.min(95, 70 + count * 5);

    return this.issue(
      "duplicate",
      firstOccurrence.location,
      `String ${
        formatString(value)
      } appears ${count} times across ${fileCount} file(s). Consider extracting to a constant.`,
      {
        confidence,
        suggestion: `Create a constant:\n` +
          `  export const ${suggestedName} = ${formatString(value, 80)};\n\n` +
          `Locations:\n${locationList}${moreLocations}`,
        relatedLocations: occurrences.slice(1).map((o) => o.location),
        context: {
          value,
          count,
          fileCount,
          suggestedName,
          files,
        },
      },
    );
  }
}

export const duplicateStringsLinter: DuplicateStringsLinter =
  new DuplicateStringsLinter();
