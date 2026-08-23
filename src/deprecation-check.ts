/**
 * Deprecation Check Linter
 *
 * Detects any deprecation mentions in the codebase. In a pre-release project,
 * deprecated code should be deleted immediately, not annotated.
 *
 * This linter is fully self-contained - it extracts deprecation information
 * directly from file content rather than relying on the crawler.
 *
 * Checks for:
 * - @deprecated JSDoc annotations
 * - "deprecated" or "DEPRECATED" in comments
 * - Legacy/deprecated mentions in documentation
 * - Code marked for removal
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
  type SourceLocation,
} from "@hiisi/viola";
import { optionsFrom } from "./options.ts";

// =============================================================================
// Configuration
// =============================================================================

/**
 * The kinds of deprecation this linter tells apart.
 *
 * Declared rather than left as loose strings on the table below. It is the
 * vocabulary of this module, every issue code is built from it, and typing it
 * means a misspelling in the table is a build error rather than a kind nobody
 * can configure off.
 */
export type DeprecationKind =
  | "annotation"
  | "marker"
  | "mention"
  | "legacy"
  | "removal"
  | "obsolete"
  | "warning";

/**
 * Patterns that indicate deprecation, most specific first.
 *
 * The order matters: the first match on a line wins, so a general pattern
 * placed above a specific one would swallow it.
 */
const DEPRECATION_PATTERNS: readonly {
  readonly pattern: RegExp;
  readonly type: DeprecationKind;
}[] = [
  { pattern: /@deprecated/i, type: "annotation" },
  { pattern: /\bis\s+deprecated\b/i, type: "mention" },
  { pattern: /\bare\s+deprecated\b/i, type: "mention" },
  { pattern: /\bmarked\s+(?:as\s+)?deprecated\b/i, type: "mention" },
  { pattern: /\bDEPRECATED\b/i, type: "marker" },
  { pattern: /\blegacy\b/i, type: "legacy" },
  { pattern: /\bto.?be.?removed\b/i, type: "removal" },
  { pattern: /\bwill.?be.?removed\b/i, type: "removal" },
  { pattern: /\bscheduled.?for.?removal\b/i, type: "removal" },
  { pattern: /\bobsolete\b/i, type: "obsolete" },
  { pattern: /\bdo.?not.?use\b/i, type: "warning" },
  { pattern: /\bavoid.?using\b/i, type: "warning" },
];

/**
 * Patterns that indicate false positives (talking ABOUT deprecation, not actual deprecation).
 */
const FALSE_POSITIVE_PATTERNS = [
  /has\s+any\s+@?deprecated/i, // "has any @deprecated" - describing a field
  /check.*deprecat/i, // "check for deprecation"
  /detect.*deprecat/i, // "detect deprecation"
  /find.*deprecat/i, // "find deprecation"
  /deprecation.?pattern/i, // "deprecation pattern"
  /deprecation.?check/i, // "deprecation check"
  /deprecation.?linter/i, // "deprecation linter"
  /deprecation.?mention/i, // "deprecation mention"
  /deprecation.?marker/i, // "deprecation marker"
  /deprecation.?warning/i, // "deprecation warning" (meta)
  /handle.?deprecat/i, // "handle deprecation"
  /FALSE_POSITIVE/, // This file's own constant
  /DEPRECATION_PATTERNS/, // This file's own constant
];

/**
 * File patterns to exclude from checking.
 */
const EXCLUDED_FILE_PATTERNS = [
  // A test for a detector contains what it detects. This linter's own suite
  // is twenty-five deprecation markers by construction, and every one of them
  // is the test doing its job. The source was already excluded for the same
  // reason; the test was not, which is the half nobody had run into yet.
  /deprecation-check_test\.ts$/,
  /CHANGELOG/i,
  /HISTORY/i,
  /MIGRATION/i,
  /\.md$/, // Documentation often legitimately discusses deprecation
  /deprecation-check\.ts$/, // This linter itself
];

/**
 * Options for the deprecation check linter.
 */
export interface DeprecationCheckOptions {
  /** Also check for "legacy" mentions */
  checkLegacy?: boolean;
  /** Also check for "obsolete" mentions */
  checkObsolete?: boolean;
  /** Also check for removal markers */
  checkRemovalMarkers?: boolean;
  /**
   * Files this linter does not read.
   *
   * Added to the defaults rather than replacing them. A project with its own
   * detector, or fixtures full of the words this looks for, names them here:
   * the alternative is a lint that cannot be tested without failing.
   *
   * @default []
   * @example [/fixtures\/deprecated\//]
   */
  excludeFiles?: readonly RegExp[];
  /** Additional patterns that indicate false positives */
  falsePositivePatterns?: RegExp[];
}

/**
 * Default options.
 */
const DEFAULT_OPTIONS: Required<DeprecationCheckOptions> = {
  checkLegacy: false, // Too noisy by default
  checkObsolete: true,
  checkRemovalMarkers: true,
  excludeFiles: [],
  falsePositivePatterns: [],
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get options from linter config.
 */

/**
 * Check if a file should be excluded.
 */
function shouldExcludeFile(
  filePath: string,
  options: DeprecationCheckOptions,
): boolean {
  // The defaults plus whatever the project added. It was written twice, once
  // testing the built-ins and once testing the project's, with the project's
  // list folded into both.
  return [...EXCLUDED_FILE_PATTERNS, ...(options.excludeFiles ?? [])]
    .some((p) => p.test(filePath));
}

/**
 * Check if a match is a false positive.
 */
function isFalsePositive(
  line: string,
  options: DeprecationCheckOptions,
): boolean {
  // Check built-in false positive patterns
  if (FALSE_POSITIVE_PATTERNS.some((p) => p.test(line))) {
    return true;
  }
  // Check user-provided false positive patterns
  const userPatterns = options.falsePositivePatterns ?? [];
  return userPatterns.some((p) => p.test(line));
}

/**
 * Determine if a deprecation type should be checked based on options.
 */
function shouldCheckType(
  type: string,
  options: DeprecationCheckOptions,
): boolean {
  switch (type) {
    case "legacy":
      return options.checkLegacy ?? false;
    case "obsolete":
      return options.checkObsolete ?? true;
    case "removal":
      return options.checkRemovalMarkers ?? true;
    default:
      return true;
  }
}

/**
 * Get the deprecation type label for display.
 */
function getTypeLabel(type: string): string {
  switch (type) {
    case "annotation":
      return "@deprecated annotation";
    case "marker":
      return "DEPRECATED marker";
    case "mention":
      return "deprecation mention";
    case "legacy":
      return "legacy code reference";
    case "removal":
      return "removal marker";
    case "obsolete":
      return "obsolete marker";
    case "warning":
      return "usage warning";
    default:
      return "deprecation indicator";
  }
}

/**
 * Whether an offset on a line sits inside a quoted string.
 *
 * The word is a marker when somebody wrote it in a comment. Inside a string
 * literal it is data: a mock linter named `"deprecated-api"` in a test fixture
 * is not a deprecation, and neither is a message about deprecation. Scanning
 * raw lines cannot tell those apart, which is why the false-positive list
 * below grew a phrase at a time.
 *
 * Counting quotes across the line rather than parsing it, because a lint that
 * needed a parse would need the grammar, and one line is enough context for
 * the question being asked. An escaped quote does not open or close.
 */
function insideString(line: string, offset: number): boolean {
  let quote: string | null = null;
  for (let i = 0; i < offset && i < line.length; i++) {
    const ch = line[i]!;
    if (ch === "\\") {
      i++;
      continue;
    }
    if (quote === null) {
      if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    } else if (ch === quote) {
      quote = null;
    }
  }
  return quote !== null;
}

/**
 * A detected deprecation in the source code.
 */
interface DeprecationMatch {
  location: SourceLocation;
  type: string;
  line: string;
}

/**
 * Extract deprecations from file content.
 * This is the core extraction logic that was previously in the crawler.
 */
function extractDeprecations(
  content: string,
  filePath: string,
  options: DeprecationCheckOptions,
): DeprecationMatch[] {
  const deprecations: DeprecationMatch[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const lineNum = i + 1;

    // Check each deprecation pattern
    for (const { pattern, type } of DEPRECATION_PATTERNS) {
      // Skip types that are disabled by options
      if (!shouldCheckType(type, options)) continue;

      const match = line.match(pattern);
      if (match?.index !== undefined) {
        // A mention inside a string literal is data rather than a marker.
        if (insideString(line, match.index)) continue;
        // Check for false positives
        if (isFalsePositive(line, options)) continue;

        deprecations.push({
          location: { file: filePath, line: lineNum },
          type,
          line: line.trim(),
        });

        // Only report one deprecation per line
        break;
      }
    }
  }

  return deprecations;
}

// =============================================================================
// Deprecation Check Linter
// =============================================================================

/**
 * Linter that detects deprecated code that should be removed.
 *
 * This linter is fully self-contained - it reads file content directly
 * and performs its own extraction logic. The core viola system provides
 * only structural data; all semantic analysis happens here.
 */
export class DeprecationCheckLinter extends BaseLinter {
  readonly meta: LinterMeta = {
    id: "deprecation-check",
    name: "Deprecation Check",
    description:
      "Detects @deprecated annotations and deprecation mentions that indicate code should be removed",
    docsUrl: "docs/PRINCIPLES.md",
  };

  readonly catalog: IssueCatalog = {
    "deprecation-check/deprecated-annotation": {
      category: "maintainability",
      impact: "major",
      description:
        "Found @deprecated annotation - deprecated code should be deleted, not marked",
    },
    "deprecation-check/deprecated-marker": {
      category: "maintainability",
      impact: "major",
      description:
        "Found DEPRECATED marker - deprecated code should be deleted, not marked",
    },
    "deprecation-check/deprecated-mention": {
      category: "maintainability",
      impact: "minor",
      description: "Found deprecation mention in code",
    },
    "deprecation-check/deprecated-legacy": {
      category: "maintainability",
      impact: "minor",
      description:
        "Found legacy code reference that may indicate deprecated code",
    },
    "deprecation-check/deprecated-removal": {
      category: "maintainability",
      impact: "major",
      description:
        "Found code marked for removal - should be deleted immediately",
    },
    "deprecation-check/deprecated-obsolete": {
      category: "maintainability",
      impact: "major",
      description: "Found obsolete code marker - should be deleted immediately",
    },
    "deprecation-check/deprecated-warning": {
      category: "maintainability",
      impact: "minor",
      description: "Found usage warning indicating code should not be used",
    },
  };

  /**
   * This linter needs file content to do its own extraction.
   * It also needs files to iterate over all files.
   */
  readonly requirements: LinterDataRequirements = {
    content: true,
    files: true,
  };

  lint(data: CodebaseData, config: LinterConfig): Issue[] {
    const issues: Issue[] = [];
    const options = optionsFrom<Required<DeprecationCheckOptions>>(
      config,
      DEFAULT_OPTIONS,
    );

    for (const file of data.files) {
      // Skip excluded files
      if (shouldExcludeFile(file.path, options)) continue;

      // Get file content - the crawler provides this when content: true is requested
      const content = file.content;
      if (!content) continue;

      // Extract deprecations from file content
      const deprecations = extractDeprecations(content, file.path, options);

      // Create issues for each deprecation found
      for (const deprecation of deprecations) {
        issues.push(this.createDeprecationIssue(deprecation));
      }
    }

    return issues;
  }

  /**
   * Create an issue for a deprecation.
   */
  private createDeprecationIssue(match: DeprecationMatch): Issue {
    const typeLabel = getTypeLabel(match.type);

    return this.issue(
      `deprecation-check/deprecated-${match.type}`,
      match.location,
      `Found ${typeLabel} in ${match.location.file}:${match.location.line}. ` +
        `Deprecated code should be DELETED, not marked.`,
      {
        suggestion: `IMMEDIATE ACTION REQUIRED:\n` +
          `This is a PRE-RELEASE project. There are NO users depending on this code.\n\n` +
          `DO NOT:\n` +
          `  - Keep deprecated code "just in case"\n` +
          `  - Add backwards compatibility shims\n` +
          `  - Leave TODO comments about removing it later\n\n` +
          `DO:\n` +
          `  - DELETE the deprecated code NOW\n` +
          `  - If something depends on it, update that code\n` +
          `  - If you're unsure, ask - but default to deletion\n\n` +
          `WHY: Deprecated code is dead weight. It confuses developers, ` +
          `increases maintenance burden, and WILL be forgotten. ` +
          `"Later" never comes. Delete it now.`,
        context: {
          type: match.type,
          typeLabel,
          sourceLine: match.line,
        },
      },
    );
  }
}

/**
 * Default instance for registration.
 */
export const deprecationCheckLinter: DeprecationCheckLinter =
  new DeprecationCheckLinter();
