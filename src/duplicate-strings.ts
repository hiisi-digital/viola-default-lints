/**
 * Duplicate Strings Linter
 *
 * Detects string literals that appear multiple times in the codebase.
 *
 * @module
 */

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
}

/**
 * Default options.
 */
const DEFAULT_OPTIONS: DuplicateStringsOptions = {
  minLength: 4,
  maxLength: 200,
  threshold: 2,
  ignorePatterns: [
    /^(true|false|null|undefined|yes|no|on|off)$/i,
    /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$/,
    /^(utf-8|utf8|ascii|base64|hex|binary)$/i,
    /^(left|right|top|bottom|center|start|end)$/i,
    /^(error|warning|info|debug|success|failure)$/i,
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
};

// =============================================================================
// Helper Functions
// =============================================================================

function getOptions(config: LinterConfig): DuplicateStringsOptions {
  const opts = config.options as Partial<DuplicateStringsOptions> | undefined;
  return { ...DEFAULT_OPTIONS, ...opts };
}

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

function shouldIgnore(str: string, options: DuplicateStringsOptions): boolean {
  if (str.length < (options.minLength ?? 4)) return true;
  if (str.length > (options.maxLength ?? 200)) return true;
  const patterns = options.ignorePatterns ?? [];
  if (patterns.some((p) => p.test(str))) return true;
  if (options.ignoreIdentifierLike && looksLikeIdentifier(str)) return true;
  if (options.ignorePaths && looksLikePath(str)) return true;
  if (options.ignoreUrls && looksLikeUrl(str)) return true;
  if (options.ignoreCssClasses && looksLikeCssClasses(str)) return true;
  return false;
}

function groupByValue(strings: readonly StringLiteral[]): Map<string, StringLiteral[]> {
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
    description: "Detects string literals that appear multiple times and should be extracted to constants",
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
  };

  lint(data: CodebaseData, config: LinterConfig): Issue[] {
    const issues: Issue[] = [];
    const options = getOptions(config);

    const stringsToCheck = data.allStrings.filter(
      (str) => !shouldIgnore(str.value, options)
    );

    const groups = groupByValue(stringsToCheck);

    for (const [value, occurrences] of groups) {
      const count = occurrences.length;
      if (count >= (options.threshold ?? 2)) {
        issues.push(this.createDuplicateIssue(value, occurrences));
      }
    }

    issues.sort((a, b) => {
      const countA = (a.context?.count as number) ?? 0;
      const countB = (b.context?.count as number) ?? 0;
      return countB - countA;
    });

    return issues;
  }

  private createDuplicateIssue(value: string, occurrences: StringLiteral[]): Issue {
    const count = occurrences.length;
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
      `String ${formatString(value)} appears ${count} times across ${fileCount} file(s). Consider extracting to a constant.`,
      {
        confidence,
        suggestion:
          `Create a constant:\n` +
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
      }
    );
  }
}

export const duplicateStringsLinter: DuplicateStringsLinter = new DuplicateStringsLinter();
