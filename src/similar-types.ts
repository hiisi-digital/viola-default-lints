/**
 * Similar Types Linter
 *
 * Detects types/interfaces with similar names or identical field structures.
 * - Similar names (fuzzy match) -> warning (fairly close) or error (very close)
 * - Same name but different fields -> error (demands investigation)
 * - Identical fields in different types -> warning (potential consolidation)
 *
 * @module
 */

import {
    BaseLinter,
    type CodebaseData,
    compareIdentifiers,
    type Issue,
    type IssueCatalog,
    jaccardSimilarity,
    type LinterConfig,
    type LinterDataRequirements,
    type LinterMeta,
    type SimilarityThresholds,
    type TypeInfo,
} from "@hiisi/viola";

// =============================================================================
// Configuration
// =============================================================================

/**
 * Thresholds for type name similarity.
 */
const _TYPE_NAME_THRESHOLDS: SimilarityThresholds = {
  low: 0.5,    // Below this: no match
  medium: 0.7, // Above this: warning
  high: 0.85,  // Above this: error
};

/**
 * Options for the similar types linter.
 */
export interface SimilarTypesOptions {
  /** Minimum similarity score to report (0-1) */
  minSimilarity?: number;
  /** Threshold for warning level */
  warningThreshold?: number;
  /** Threshold for error level */
  errorThreshold?: number;
  /** Minimum number of fields a type must have to check */
  minFieldCount?: number;
  /** Ignore types with names shorter than this */
  minNameLength?: number;
  /** Patterns for type names to ignore */
  ignorePatterns?: RegExp[];

  /**
   * Explicit list of type names to ignore. Use this as an escape hatch for
   * types that are intentionally similar by design.
   * 
   * Unlike patterns, this requires you to explicitly list each type,
   * forcing you to think about whether the similarity is truly intentional.
   * 
   * @default []
   * @example ["FileCondition", "LinterCondition"]
   */
  ignoreTypes?: string[];
  /** Also check for identical field structures */
  checkFieldStructure?: boolean;
  /** Minimum field similarity for structural match */
  fieldSimilarityThreshold?: number;
}

/**
 * Default options.
 */
const DEFAULT_OPTIONS: SimilarTypesOptions = {
  minSimilarity: 0.7,
  warningThreshold: 0.7,
  errorThreshold: 0.85,
  minFieldCount: 2,
  minNameLength: 3,
  ignorePatterns: [
    // Keep patterns empty by default - users can configure as needed
    // Common patterns that might be added:
    // /^I[A-Z]/,     // Interface prefix (IUser, IConfig)
    // /Props$/,      // React props
    // /Options$/,    // Options types
    // /Config$/,     // Config types
  ],
  ignoreTypes: [],
  checkFieldStructure: true,
  fieldSimilarityThreshold: 0.8,
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get options from linter config.
 */
function getOptions(config: LinterConfig): Required<SimilarTypesOptions> {
  const opts = config.options as Partial<SimilarTypesOptions> | undefined;
  return {
    ...DEFAULT_OPTIONS,
    ...opts,
    ignorePatterns: [
      ...(DEFAULT_OPTIONS.ignorePatterns ?? []),
      ...(opts?.ignorePatterns ?? []),
    ],
    ignoreTypes: [
      ...(DEFAULT_OPTIONS.ignoreTypes ?? []),
      ...(opts?.ignoreTypes ?? []),
    ],
  } as Required<SimilarTypesOptions>;
}

/**
 * Check if a type should be ignored based on name patterns or explicit list.
 */
function shouldIgnore(name: string, patterns: RegExp[], explicitNames: string[]): boolean {
  if (explicitNames.includes(name)) return true;
  return patterns.some((pattern) => pattern.test(name));
}

/**
 * Compare field lists for similarity using Jaccard index.
 * Returns 1 if identical, 0 if completely different.
 */
function compareFields(
  fieldsA: readonly { name: string; type: string }[],
  fieldsB: readonly { name: string; type: string }[]
): { nameSimilarity: number; typeSimilarity: number; combined: number } {
  if (fieldsA.length === 0 && fieldsB.length === 0) {
    return { nameSimilarity: 1, typeSimilarity: 1, combined: 1 };
  }
  if (fieldsA.length === 0 || fieldsB.length === 0) {
    return { nameSimilarity: 0, typeSimilarity: 0, combined: 0 };
  }

  // Compare field names using Jaccard similarity
  const namesA = new Set(fieldsA.map((f) => f.name));
  const namesB = new Set(fieldsB.map((f) => f.name));
  const nameSimilarity = jaccardSimilarity(namesA, namesB);

  // Compare field types for matching names
  const commonNames = [...namesA].filter((n) => namesB.has(n));
  let typeMatchCount = 0;

  for (const name of commonNames) {
    const fieldA = fieldsA.find((f) => f.name === name);
    const fieldB = fieldsB.find((f) => f.name === name);
    if (fieldA && fieldB && fieldA.type === fieldB.type) {
      typeMatchCount++;
    }
  }

  const typeSimilarity = commonNames.length > 0
    ? typeMatchCount / commonNames.length
    : 0;

  // Combined score weights field names more heavily
  const combined = nameSimilarity * 0.6 + typeSimilarity * 0.4;

  return { nameSimilarity, typeSimilarity, combined };
}

/**
 * Format type signature for display.
 */
function formatType(type: TypeInfo): string {
  const keyword = type.kind === "interface" ? "interface" : "type";
  const fields = type.fields.slice(0, 5).map((f) => {
    const opt = f.optional ? "?" : "";
    const ro = f.readonly ? "readonly " : "";
    return `${ro}${f.name}${opt}: ${f.type}`;
  });

  const more = type.fields.length > 5 ? `\n  ... ${type.fields.length - 5} more fields` : "";

  return `${keyword} ${type.name} {\n  ${fields.join(";\n  ")}${more}\n}`;
}

/**
 * Get a readable location string.
 */
function locationString(type: TypeInfo): string {
  return `${type.location.file}:${type.location.line}`;
}

/**
 * Get field names as a comma-separated string.
 */
function fieldNames(type: TypeInfo): string {
  const names = type.fields.map((f) => f.name);
  if (names.length <= 5) {
    return names.join(", ");
  }
  return names.slice(0, 5).join(", ") + `, ... (${names.length - 5} more)`;
}

// =============================================================================
// Similar Types Linter
// =============================================================================

/**
 * Linter that detects types/interfaces with similar names or structures.
 */
export class SimilarTypesLinter extends BaseLinter {
  readonly meta: LinterMeta = {
    id: "similar-types",
    name: "Similar Types",
    description:
      "Detects types/interfaces with similar names or identical field structures",
  };

  readonly catalog: IssueCatalog = {
    "similar-types/similar-name-high": {
      category: "maintainability",
      impact: "major",
      description: "Type names are very similar, likely indicating duplicates that should be consolidated",
    },
    "similar-types/similar-name-medium": {
      category: "maintainability",
      impact: "minor",
      description: "Type names are moderately similar, review to ensure they serve distinct purposes",
    },
    "similar-types/duplicate-type": {
      category: "maintainability",
      impact: "critical",
      description: "Type exists in multiple files with nearly identical structure",
    },
    "similar-types/same-name-different-structure": {
      category: "consistency",
      impact: "major",
      description: "Type exists in multiple files with different structures, which is confusing and error-prone",
    },
    "similar-types/similar-structure": {
      category: "maintainability",
      impact: "minor",
      description: "Types have very similar field structures but different names, consider consolidating",
    },
  };

  readonly requirements: LinterDataRequirements = {
    types: true,
  };

  lint(data: CodebaseData, config: LinterConfig): Issue[] {
    const issues: Issue[] = [];
    const options = getOptions(config);

    // Debug: Log initial state
    if (Deno.env.get("DEBUG_LINTERS")) {
      console.log(`[similar-types] Total types in codebase: ${data.allTypes.length}`);
      console.log(`[similar-types] Options:`, JSON.stringify(options, null, 2));
    }

    // Filter types to check
    const types = data.allTypes.filter((type) => {
      // Must have a name
      if (!type.name) return false;

      // Must meet minimum name length
      if (type.name.length < (options.minNameLength ?? 3)) return false;

      // Must not match ignore patterns or explicit ignore list
      if (shouldIgnore(type.name, options.ignorePatterns ?? [], options.ignoreTypes ?? [])) return false;

      // Must meet minimum field count
      if (type.fields.length < (options.minFieldCount ?? 2)) return false;

      return true;
    });

    // Debug: Log filtered types
    if (Deno.env.get("DEBUG_LINTERS")) {
      console.log(`[similar-types] Types after filtering: ${types.length}`);
      types.forEach(t => console.log(`  - ${t.name} (${t.fields.length} fields) in ${t.location.file}`));
    }

    // Compare all pairs for name similarity
    const checked = new Set<string>();

    for (let i = 0; i < types.length; i++) {
      for (let j = i + 1; j < types.length; j++) {
        const typeA = types[i]!;
        const typeB = types[j]!;

        // Create a unique key for this pair to avoid duplicates
        const pairKey = [
          `${typeA.location.file}:${typeA.location.line}:${typeA.name}`,
          `${typeB.location.file}:${typeB.location.line}:${typeB.name}`,
        ].sort().join("||");

        if (checked.has(pairKey)) continue;
        checked.add(pairKey);

        // Skip if in the same file (likely intentional related types)
        // Unless they have the exact same name
        if (typeA.location.file === typeB.location.file && typeA.name !== typeB.name) {
          if (Deno.env.get("DEBUG_LINTERS")) {
            console.log(`[similar-types] Skipping same-file pair: ${typeA.name} vs ${typeB.name}`);
          }
          continue;
        }

        const issue = this.checkPair(typeA, typeB, options);
        if (Deno.env.get("DEBUG_LINTERS")) {
          console.log(`[similar-types] Checked pair: ${typeA.name} vs ${typeB.name}, issue: ${issue ? issue.kind : 'none'}`);
        }
        if (issue) {
          issues.push(issue);
        }
      }
    }

    // Check for structurally identical types (if enabled)
    if (options.checkFieldStructure) {
      const structuralIssues = this.checkFieldStructures(types, options);
      issues.push(...structuralIssues);
    }

    if (Deno.env.get("DEBUG_LINTERS")) {
      console.log(`[similar-types] Total issues found: ${issues.length}`);
    }

    return issues;
  }

  /**
   * Check a pair of types for name similarity.
   */
  private checkPair(
    typeA: TypeInfo,
    typeB: TypeInfo,
    options: SimilarTypesOptions
  ): Issue | null {
    const { similarity, level: _level, metrics } = compareIdentifiers(typeA.name, typeB.name);

    if (Deno.env.get("DEBUG_LINTERS")) {
      console.log(`[similar-types] compareIdentifiers("${typeA.name}", "${typeB.name}") = ${similarity.toFixed(3)}, threshold: ${options.minSimilarity ?? 0.7}`);
    }

    // Exact same name in different files
    if (typeA.name === typeB.name) {
      return this.checkSameNameTypes(typeA, typeB, options);
    }

    // Check if similarity meets threshold
    if (similarity < (options.minSimilarity ?? 0.7)) {
      return null;
    }

    // Determine severity based on similarity
    const isError = similarity >= (options.errorThreshold ?? 0.85);
    const isWarning = similarity >= (options.warningThreshold ?? 0.7);

    if (!isError && !isWarning) {
      return null;
    }

    const pct = (similarity * 100).toFixed(0);

    if (isError) {
      return this.issue(
        "similar-name-high",
        typeA.location,
        `Type "${typeA.name}" is very similar to "${typeB.name}" (${pct}% match). ` +
          `This likely indicates duplicate types that should be consolidated.`,
        {
          relatedLocations: [typeB.location],
          suggestion:
            `Consider:\n` +
            `1. If these represent the same concept: consolidate into one type in packages/types/\n` +
            `2. If they're different: rename to clarify the distinction\n` +
            `3. If one extends the other: use proper inheritance/extension\n\n` +
            `Type A: ${locationString(typeA)}\n` +
            `Type B: ${locationString(typeB)}`,
          context: {
            similarity,
            typeA: typeA.name,
            typeB: typeB.name,
            metrics,
          },
        }
      );
    }

    return this.issue(
      "similar-name-medium",
      typeA.location,
      `Type "${typeA.name}" has similar name to "${typeB.name}" (${pct}% match). ` +
        `Review to ensure they serve distinct purposes.`,
      {
        relatedLocations: [typeB.location],
        suggestion:
          `If these types represent related concepts, consider:\n` +
          `1. Consolidating them into one type\n` +
          `2. Creating a base type they both extend\n` +
          `3. Renaming for clarity\n\n` +
          `Type A: ${locationString(typeA)}\n` +
          `Type B: ${locationString(typeB)}`,
        context: {
          similarity,
          typeA: typeA.name,
          typeB: typeB.name,
        },
      }
    );
  }

  /**
   * Check types with the exact same name in different files.
   */
  private checkSameNameTypes(
    typeA: TypeInfo,
    typeB: TypeInfo,
    _options: SimilarTypesOptions
  ): Issue | null {
    // Same name in different files is definitely suspicious
    const fieldComparison = compareFields(typeA.fields, typeB.fields);

    if (fieldComparison.combined > 0.9) {
      // Nearly identical types - likely duplicate
      return this.issue(
        "duplicate-type",
        typeA.location,
        `Type "${typeA.name}" exists in multiple files with nearly identical structure (${(fieldComparison.combined * 100).toFixed(0)}% match). ` +
          `This is duplicate code that should be consolidated.`,
        {
          relatedLocations: [typeB.location],
          suggestion:
            `IMMEDIATE ACTION REQUIRED:\n` +
            `1. Determine which is the canonical definition\n` +
            `2. Move to packages/types/ (if shared) or local types/ directory\n` +
            `3. Update all imports to use the single source\n` +
            `4. Delete the duplicate\n\n` +
            `Locations:\n` +
            `  - ${locationString(typeA)}\n` +
            `  - ${locationString(typeB)}`,
          context: {
            typeA: formatType(typeA),
            typeB: formatType(typeB),
            fieldComparison,
          },
        }
      );
    } else {
      // Same name but different structure - needs investigation
      return this.issue(
        "same-name-different-structure",
        typeA.location,
        `Type "${typeA.name}" exists in multiple files with DIFFERENT structures. ` +
          `This is confusing and error-prone.`,
        {
          relatedLocations: [typeB.location],
          suggestion:
            `IMMEDIATE ACTION REQUIRED:\n` +
            `1. If they represent the same concept: unify the structure\n` +
            `2. If they're different concepts: rename one for clarity\n` +
            `3. Consider if the difference is intentional or accidental\n\n` +
            `Type A fields: ${fieldNames(typeA)}\n` +
            `Type B fields: ${fieldNames(typeB)}\n\n` +
            `Locations:\n` +
            `  - ${locationString(typeA)}\n` +
            `  - ${locationString(typeB)}`,
          context: {
            typeA: formatType(typeA),
            typeB: formatType(typeB),
            fieldComparison,
          },
        }
      );
    }
  }

  /**
   * Check for types with identical or very similar field structures
   * but different names.
   */
  private checkFieldStructures(
    types: TypeInfo[],
    options: SimilarTypesOptions
  ): Issue[] {
    const issues: Issue[] = [];
    const threshold = options.fieldSimilarityThreshold ?? 0.8;
    const checked = new Set<string>();

    // Only check types with enough fields
    const typesWithFields = types.filter(
      (t) => t.fields.length >= (options.minFieldCount ?? 2)
    );

    for (let i = 0; i < typesWithFields.length; i++) {
      for (let j = i + 1; j < typesWithFields.length; j++) {
        const typeA = typesWithFields[i]!;
        const typeB = typesWithFields[j]!;

        // Skip same name (handled above)
        if (typeA.name === typeB.name) continue;

        // Skip if names are already similar (would be caught by name check)
        const { similarity: nameSim } = compareIdentifiers(typeA.name, typeB.name);
        if (nameSim > 0.5) continue;

        // Create unique key
        const pairKey = [
          `${typeA.location.file}:${typeA.name}`,
          `${typeB.location.file}:${typeB.name}`,
        ].sort().join("||");

        if (checked.has(pairKey)) continue;
        checked.add(pairKey);

        // Compare field structures
        const fieldComparison = compareFields(typeA.fields, typeB.fields);

        if (fieldComparison.combined >= threshold) {
          issues.push(
            this.issue(
              "similar-structure",
              typeA.location,
              `Types "${typeA.name}" and "${typeB.name}" have very similar field structures (${(fieldComparison.combined * 100).toFixed(0)}% match) ` +
                `but different names. Consider consolidating or creating a base type.`,
              {
                relatedLocations: [typeB.location],
                suggestion:
                  `These types have similar structures:\n` +
                  `  - ${typeA.name} at ${locationString(typeA)}\n` +
                  `  - ${typeB.name} at ${locationString(typeB)}\n\n` +
                  `Consider:\n` +
                  `1. If they represent the same concept: consolidate into one type\n` +
                  `2. If they share common fields: create a base type\n` +
                  `3. If the similarity is coincidental: add documentation explaining why they're separate`,
                context: {
                  typeA: typeA.name,
                  typeB: typeB.name,
                  fieldsA: fieldNames(typeA),
                  fieldsB: fieldNames(typeB),
                  fieldComparison,
                },
              }
            )
          );
        }
      }
    }

    return issues;
  }
}

/**
 * Default instance for registration.
 */
export const similarTypesLinter: SimilarTypesLinter = new SimilarTypesLinter();
