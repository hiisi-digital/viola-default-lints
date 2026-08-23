/**
 * Similar Functions Linter
 *
 * Detects functions with similar names or identical parameter signatures.
 * - Similar names (fuzzy match) -> warning (fairly close) or error (very close)
 * - Same name but different params -> error (demands investigation)
 * - Suggests extracting common logic to reusable helpers
 *
 * @module
 */

import {
  BaseLinter,
  type CodebaseData,
  compareIdentifiers,
  type FunctionInfo,
  type Issue,
  type IssueCatalog,
  type LinterConfig,
  type LinterDataRequirements,
  type LinterMeta,
  type SimilarityThresholds,
} from "@hiisi/viola";
import { isIgnored, locationString, optionsFrom } from "./options.ts";

// =============================================================================
// Configuration
// =============================================================================

/**
 * Thresholds for function name similarity.
 */
const _FUNCTION_NAME_THRESHOLDS: SimilarityThresholds = {
  low: 0.5, // Below this: no match
  medium: 0.7, // Above this: warning
  high: 0.85, // Above this: error
};

/**
 * Options for the similar functions linter.
 */
export interface SimilarFunctionsOptions {
  /**
   * Compare methods against each other and against free functions.
   *
   * Off by default. A method's name is scoped by the type it hangs off, so
   * `get`, `has`, `size` and `build` recurring across unrelated classes are
   * the conventional names for those operations rather than duplication. Turn
   * it on for a codebase where methods genuinely should not repeat.
   *
   * @default false
   */
  compareMethods?: boolean;

  /** Minimum similarity score to report (0-1) */
  minSimilarity?: number;
  /** Threshold for warning level */
  warningThreshold?: number;
  /** Threshold for error level */
  errorThreshold?: number;
  /** Ignore functions shorter than this many lines */
  minFunctionLines?: number;
  /** Ignore functions with names shorter than this */
  minNameLength?: number;
  /** Patterns for function names to ignore */
  ignorePatterns?: RegExp[];

  /**
   * Explicit list of function names to ignore. Use this as an escape hatch for
   * functions that are intentionally similar by design.
   *
   * Unlike patterns, this requires you to explicitly list each function,
   * forcing you to think about whether the similarity is truly intentional.
   *
   * @default []
   * @example ["impactCond", "categoryCond", "fileCond"]
   */
  ignoreFunctions?: string[];
}

/**
 * Default options.
 */
const DEFAULT_OPTIONS: Required<SimilarFunctionsOptions> = {
  minSimilarity: 0.7,
  warningThreshold: 0.7,
  errorThreshold: 0.85,
  minFunctionLines: 3,
  compareMethods: false,
  minNameLength: 3,
  ignorePatterns: [
    /^handle[A-Z]/, // Event handlers are expected to be similar
    /^on[A-Z]/, // Event callbacks
    /^get[A-Z]/, // Getters often have similar patterns
    /^set[A-Z]/, // Setters
    /^is[A-Z]/, // Boolean checks
    /^has[A-Z]/, // Boolean checks
  ],
  // `constructor` is not a function name anybody chose, and constructors are
  // supposed to differ between classes. Reporting that one "exists in multiple
  // files with DIFFERENT signatures" describes what a constructor is.
  ignoreFunctions: ["constructor"],
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get options from linter config.
 */

/**
 * Check if a function should be ignored based on name patterns.
 */
/**
 * Compare parameter lists for similarity.
 * Returns 1 if identical, 0 if completely different.
 */
function compareParams(
  paramsA: readonly { name: string; type?: string }[],
  paramsB: readonly { name: string; type?: string }[],
): number {
  if (paramsA.length === 0 && paramsB.length === 0) return 1;
  if (paramsA.length !== paramsB.length) return 0;

  let matchCount = 0;
  for (let i = 0; i < paramsA.length; i++) {
    const a = paramsA[i]!;
    const b = paramsB[i]!;

    // Check type match (if both have types)
    if (a.type && b.type && a.type === b.type) {
      matchCount++;
    } else if (!a.type && !b.type) {
      // Both untyped, check name similarity
      const { similarity } = compareIdentifiers(a.name, b.name);
      if (similarity > 0.8) matchCount++;
    }
  }

  return matchCount / paramsA.length;
}

/**
 * Format function signature for display.
 */
function formatSignature(func: FunctionInfo): string {
  const params = func.params.map((p) => {
    let s = p.name;
    if (p.optional) s += "?";
    if (p.type) s += `: ${p.type}`;
    return s;
  }).join(", ");

  const async = func.isAsync ? "async " : "";
  const ret = func.returnType ? `: ${func.returnType}` : "";

  return `${async}function ${func.name}(${params})${ret}`;
}

/**
 * Get a readable location string.
 */
// =============================================================================
// Similar Functions Linter
// =============================================================================

/**
 * Linter that detects functions with similar names or signatures.
 */
export class SimilarFunctionsLinter extends BaseLinter {
  readonly meta: LinterMeta = {
    id: "similar-functions",
    name: "Similar Functions",
    description:
      "Detects functions with similar names that might be duplicates or should be consolidated",
  };

  readonly catalog: IssueCatalog = {
    "similar-functions/similar-name-high": {
      category: "maintainability",
      impact: "major",
      description:
        "Two functions have very similar names (85%+ match), indicating likely duplicate code that should be consolidated.",
    },
    "similar-functions/similar-name-medium": {
      category: "maintainability",
      impact: "minor",
      description:
        "Two functions have similar names (70-85% match). Review to ensure they serve distinct purposes.",
    },
    "similar-functions/duplicate-function": {
      category: "maintainability",
      impact: "critical",
      description:
        "The same function exists in multiple files with identical signatures. This is duplicate code that should be consolidated.",
    },
    "similar-functions/same-name-different-params": {
      category: "consistency",
      impact: "major",
      description:
        "The same function name exists in multiple files with different signatures. This is confusing and error-prone.",
    },
  };

  readonly requirements: LinterDataRequirements = {
    functions: true,
  };

  lint(data: CodebaseData, config: LinterConfig): Issue[] {
    const issues: Issue[] = [];
    const options = optionsFrom<Required<SimilarFunctionsOptions>>(
      config,
      DEFAULT_OPTIONS,
    );

    // Filter functions to check
    const functions = data.allFunctions.filter((func) => {
      // Must have a name
      if (!func.name) return false;

      // A method is named for what it does to its own type. `get` on a
      // registry is not `get` on a cache, and `build` on eight builders is
      // the builder pattern rather than eight copies of one function. Only a
      // free function is duplicated by being named the same somewhere else.
      if (
        (options.compareMethods ?? false) === false && func.kind === "method"
      ) {
        return false;
      }

      // Must meet minimum name length
      if (func.name.length < (options.minNameLength ?? 3)) return false;

      // Must not match ignore patterns or explicit ignore list
      if (
        isIgnored(
          func.name,
          options.ignorePatterns ?? [],
          options.ignoreFunctions ?? [],
        )
      ) return false;

      // Must meet minimum line count
      const lines = func.body.split("\n").length;
      if (lines < (options.minFunctionLines ?? 3)) return false;

      return true;
    });

    // Same-name functions are reported once per group, not once per pair.
    //
    // The pairwise form emitted one finding for every pair, so nine linter
    // classes each implementing `lint` produced thirty-six findings for one
    // fact, and the same file and line appeared eight times in a single run.
    // A reader cannot act on the fifth copy of a finding, and the count stops
    // meaning anything.
    const byName = new Map<string, FunctionInfo[]>();
    for (const fn of functions) {
      const group = byName.get(fn.name);
      if (group) group.push(fn);
      else byName.set(fn.name, [fn]);
    }

    const sameName = new Set<FunctionInfo>();
    for (const group of byName.values()) {
      if (group.length < 2) continue;
      for (const fn of group) sameName.add(fn);
      for (const issue of this.checkSameNameGroup(group)) issues.push(issue);
    }

    // Everything else still compares pairwise, because a similarity score is a
    // property of a pair and has no group form.
    const checked = new Set<string>();

    for (let i = 0; i < functions.length; i++) {
      for (let j = i + 1; j < functions.length; j++) {
        const funcA = functions[i]!;
        const funcB = functions[j]!;

        if (funcA.name === funcB.name) continue;

        const pairKey = [
          `${funcA.location.file}:${funcA.location.line}:${funcA.name}`,
          `${funcB.location.file}:${funcB.location.line}:${funcB.name}`,
        ].sort().join("||");

        if (checked.has(pairKey)) continue;
        checked.add(pairKey);

        // Skip if in the same file (likely intentional overloads or related functions)
        if (funcA.location.file === funcB.location.file) {
          continue;
        }

        const issue = this.checkPair(funcA, funcB, options);
        if (issue) {
          issues.push(issue);
        }
      }
    }

    return issues;
  }

  /**
   * One finding per set of same-named functions, split by whether their
   * signatures agree.
   */
  private checkSameNameGroup(group: readonly FunctionInfo[]): Issue[] {
    const first = group[0]!;
    const identical = group.filter((f) =>
      compareParams(first.params, f.params) === 1
    );
    const differing = group.filter((f) =>
      compareParams(first.params, f.params) !== 1
    );
    const out: Issue[] = [];

    if (identical.length > 1) {
      out.push(this.issue(
        "similar-functions/duplicate-function",
        first.location,
        `Function "${first.name}" exists in ${identical.length} places with an identical ` +
          `signature. This is likely duplicate code that should be consolidated.`,
        {
          relatedLocations: identical.slice(1).map((f) => f.location),
          suggestion: `IMMEDIATE ACTION REQUIRED:\n` +
            `1. Determine which is the canonical implementation\n` +
            `2. Move to a shared location\n` +
            `3. Update all imports to use the single source\n` +
            `4. Delete the duplicates\n\n` +
            `Locations:\n` +
            identical.map((f) => `  - ${locationString(f)}`).join("\n"),
          context: { count: identical.length },
        },
      ));
    }

    if (differing.length > 0) {
      out.push(this.issue(
        "similar-functions/same-name-different-params",
        first.location,
        `Function "${first.name}" exists in multiple files with DIFFERENT signatures. ` +
          `This is confusing and error-prone.`,
        {
          relatedLocations: differing.map((f) => f.location),
          suggestion: `IMMEDIATE ACTION REQUIRED:\n` +
            `1. If they do the same thing: unify the signature\n` +
            `2. If they do different things: rename one for clarity\n\n` +
            `Signatures:\n` +
            group.map((f) => `  ${formatSignature(f)} at ${locationString(f)}`)
              .join("\n"),
          context: { count: group.length },
        },
      ));
    }

    return out;
  }

  /**
   * Check a pair of functions for similarity.
   */
  private checkPair(
    funcA: FunctionInfo,
    funcB: FunctionInfo,
    options: SimilarFunctionsOptions,
  ): Issue | null {
    const { similarity, level: _level, metrics } = compareIdentifiers(
      funcA.name,
      funcB.name,
    );

    // Exact same name in different files
    if (funcA.name === funcB.name) {
      return this.checkSameNameFunctions(funcA, funcB, options);
    }

    // Check if similarity meets threshold
    if (similarity < (options.minSimilarity ?? 0.7)) {
      return null;
    }

    // Determine level based on similarity
    const isHigh = similarity >= (options.errorThreshold ?? 0.85);
    const isMedium = similarity >= (options.warningThreshold ?? 0.7);

    if (!isHigh && !isMedium) {
      return null;
    }

    const pct = (similarity * 100).toFixed(0);

    if (isHigh) {
      return this.issue(
        "similar-functions/similar-name-high",
        funcA.location,
        `Function "${funcA.name}" is very similar to "${funcB.name}" (${pct}% match). ` +
          `This likely indicates duplicate code that should be consolidated.`,
        {
          relatedLocations: [funcB.location],
          suggestion: `Consider:\n` +
            `1. If these do the same thing: consolidate into one function\n` +
            `2. If they do different things: rename to clarify the distinction\n` +
            `3. If they share logic: extract common code to a helper\n\n` +
            `Function A: ${locationString(funcA)}\n` +
            `Function B: ${locationString(funcB)}`,
          context: {
            similarity,
            funcA: formatSignature(funcA),
            funcB: formatSignature(funcB),
            metrics,
          },
        },
      );
    }

    return this.issue(
      "similar-functions/similar-name-medium",
      funcA.location,
      `Function "${funcA.name}" has similar name to "${funcB.name}" (${pct}% match). ` +
        `Review to ensure they serve distinct purposes.`,
      {
        relatedLocations: [funcB.location],
        suggestion: `If these functions do related things, consider:\n` +
          `1. Consolidating them\n` +
          `2. Extracting shared logic\n` +
          `3. Renaming for clarity\n\n` +
          `Function A: ${locationString(funcA)}\n` +
          `Function B: ${locationString(funcB)}`,
        context: {
          similarity,
          funcA: formatSignature(funcA),
          funcB: formatSignature(funcB),
        },
      },
    );
  }

  /**
   * Check functions with the exact same name in different files.
   */
  private checkSameNameFunctions(
    funcA: FunctionInfo,
    funcB: FunctionInfo,
    _options: SimilarFunctionsOptions,
  ): Issue | null {
    // Same name in different files is definitely suspicious
    const paramSimilarity = compareParams(funcA.params, funcB.params);

    if (paramSimilarity === 1) {
      // Identical signatures - likely duplicate
      return this.issue(
        "similar-functions/duplicate-function",
        funcA.location,
        `Function "${funcA.name}" exists in multiple files with identical signature. ` +
          `This is likely duplicate code that should be consolidated.`,
        {
          relatedLocations: [funcB.location],
          suggestion: `IMMEDIATE ACTION REQUIRED:\n` +
            `1. Determine which is the canonical implementation\n` +
            `2. Move to a shared location (packages/core/ or appropriate module)\n` +
            `3. Update all imports to use the single source\n` +
            `4. Delete the duplicate\n\n` +
            `Locations:\n` +
            `  - ${locationString(funcA)}\n` +
            `  - ${locationString(funcB)}`,
          context: {
            funcA: formatSignature(funcA),
            funcB: formatSignature(funcB),
            paramSimilarity,
          },
        },
      );
    } else {
      // Same name but different params - needs investigation
      return this.issue(
        "similar-functions/same-name-different-params",
        funcA.location,
        `Function "${funcA.name}" exists in multiple files with DIFFERENT signatures. ` +
          `This is confusing and error-prone.`,
        {
          relatedLocations: [funcB.location],
          suggestion: `IMMEDIATE ACTION REQUIRED:\n` +
            `1. If they do the same thing: unify the signature\n` +
            `2. If they do different things: rename one for clarity\n` +
            `3. Consider if the difference is intentional (overload) or accidental\n\n` +
            `Signatures:\n` +
            `  A: ${formatSignature(funcA)} at ${locationString(funcA)}\n` +
            `  B: ${formatSignature(funcB)} at ${locationString(funcB)}`,
          context: {
            funcA: formatSignature(funcA),
            funcB: formatSignature(funcB),
            paramSimilarity,
          },
        },
      );
    }
  }
}

/**
 * Default instance for registration.
 */
export const similarFunctionsLinter: SimilarFunctionsLinter =
  new SimilarFunctionsLinter();
