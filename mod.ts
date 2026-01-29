/**
 * Viola Default Lints Plugin
 *
 * A collection of linters for the viola convention linter with sensible
 * default rules for classifying issues by severity.
 *
 * ## Usage
 *
 * ```ts
 * // viola.config.ts
 * import { viola, report, when } from "@hiisi/viola";
 * import defaultLints from "@hiisi/viola-default-lints";
 *
 * export default viola()
 *   .use(defaultLints)  // adds linters + default rules
 *   .rule(report.off, when.in("**\/*_test.ts"));  // your overrides (last wins!)
 * ```
 *
 * Rules use "last wins" semantics (like CSS) - your rules after `.use()` override plugin defaults.
 *
 * ### Without Default Rules
 *
 * If you want just the linters without default rules, import `linters`:
 *
 * ```ts
 * import { viola } from "@hiisi/viola";
 * import { linters } from "@hiisi/viola-default-lints";
 *
 * export default viola()
 *   .add(linters)  // just linters, define your own rules
 *   .rule(report.error, when.impact.atLeast(Impact.Critical));
 * ```
 *
 * @module
 */

// =============================================================================
// Individual Linter Exports
// =============================================================================

export {
    DeprecationCheckLinter,
    deprecationCheckLinter,
    type DeprecationCheckOptions
} from "./src/deprecation-check.ts";

export {
    DuplicateLogicLinter,
    duplicateLogicLinter
} from "./src/duplicate-logic.ts";

export {
    DuplicateStringsLinter,
    duplicateStringsLinter,
    type DuplicateStringsOptions
} from "./src/duplicate-strings.ts";

export {
    MissingDocsLinter,
    missingDocsLinter
} from "./src/missing-docs.ts";

export {
    OrphanedCodeLinter,
    orphanedCodeLinter
} from "./src/orphaned-code.ts";

export {
    SchemaCollisionLinter,
    schemaCollisionLinter
} from "./src/schema-collision.ts";

export {
    SimilarFunctionsLinter,
    similarFunctionsLinter,
    type SimilarFunctionsOptions
} from "./src/similar-functions.ts";

export {
    SimilarTypesLinter,
    similarTypesLinter,
    type SimilarTypesOptions
} from "./src/similar-types.ts";

export {
    TypeLocationLinter,
    typeLocationLinter
} from "./src/type-location.ts";

// =============================================================================
// Plugin Implementation
// =============================================================================

import {
    Impact,
    report,
    type ViolaBuilder,
    type ViolaPlugin,
    when
} from "@hiisi/viola";
import { deprecationCheckLinter } from "./src/deprecation-check.ts";
import { duplicateLogicLinter } from "./src/duplicate-logic.ts";
import { duplicateStringsLinter } from "./src/duplicate-strings.ts";
import { missingDocsLinter } from "./src/missing-docs.ts";
import { orphanedCodeLinter } from "./src/orphaned-code.ts";
import { schemaCollisionLinter } from "./src/schema-collision.ts";
import { similarFunctionsLinter } from "./src/similar-functions.ts";
import { similarTypesLinter } from "./src/similar-types.ts";
import { typeLocationLinter } from "./src/type-location.ts";

/**
 * All linters as an array.
 * Use this if you want just linters without default rules.
 */
export const linters = [
    typeLocationLinter,
    similarFunctionsLinter,
    similarTypesLinter,
    duplicateStringsLinter,
    duplicateLogicLinter,
    deprecationCheckLinter,
    missingDocsLinter,
    orphanedCodeLinter,
    schemaCollisionLinter,
];

/**
 * Default lints plugin.
 *
 * Adds all linters and configures sensible default rules:
 * - Critical/Major impact → error
 * - Minor impact → warn
 * - Trivial impact → info
 *
 * Your rules defined after `.use(defaultLints)` override these (last wins).
 */
const defaultLints: ViolaPlugin = {
    build(viola: ViolaBuilder): void {
        // Add all linters
        for (const linter of linters) {
            viola.add(linter);
        }

        // Default rules based on impact severity
        // User rules after .use() override these (last wins)
        viola
            .rule(report.error, when.impact.atLeast(Impact.Major))
            .rule(report.warn, when.impact.is(Impact.Minor))
            .rule(report.info, when.impact.is(Impact.Trivial));
    }
};

/**
 * Default export is the plugin for easy use with viola().use(defaultLints)
 */
export default defaultLints;
