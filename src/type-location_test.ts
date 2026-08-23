/**
 * Tests for the type-location linter.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import {
  defaultConfig,
  expectCodes,
  expectNoViolations,
  first,
  mockCodebase,
  mockFile,
  mockFunction,
  mockType,
} from "./test_utils.ts";
import type { LinterConfig } from "@hiisi/viola";
import { TypeLocationLinter } from "./type-location.ts";

const linter = new TypeLocationLinter();

/**
 * A project that keeps a types-only package, and says so.
 *
 * Every assertion about types being in the wrong place needs this, because a
 * project that has not declared one has not agreed to keep one. The package
 * name used to be hardcoded in the linter, so these tests passed without ever
 * stating the convention they were testing.
 */
const declaresTypesPackage: LinterConfig = {
  enabled: true,
  options: { typesOnlyPackages: ["packages/types"] },
};

// =============================================================================
// Basic Functionality
// =============================================================================

Deno.test("type-location - no violations for types in types/ directory", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "packages/types/models.ts",
        types: [
          mockType({ name: "User", isExported: true }),
          mockType({ name: "Config", isExported: true }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, declaresTypesPackage);
  expectNoViolations(violations);
});

Deno.test("type-location - no violations for types in local types/ subdirectory", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "packages/core/types/config.ts",
        types: [
          mockType({ name: "CoreConfig", isExported: true }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, declaresTypesPackage);
  expectNoViolations(violations);
});

Deno.test("type-location - no violations for types in .types.ts files", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "packages/core/db.types.ts",
        types: [
          mockType({ name: "DatabaseRow", isExported: true }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, declaresTypesPackage);
  expectNoViolations(violations);
});

Deno.test("type-location - reports non-exported types outside types dir too", () => {
  // The linter doesn't distinguish exported vs non-exported - all types
  // outside types/ directories are flagged
  const data = mockCodebase({
    files: [
      mockFile({
        path: "packages/core/utils.ts",
        types: [
          mockType({
            name: "InternalHelper",
            isExported: false,
            file: "packages/core/utils.ts",
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, declaresTypesPackage);
  assertEquals(violations.length, 1);
  expectCodes(violations, ["type-location/type-outside-types"]);
});

// =============================================================================
// Violation Detection
// =============================================================================

Deno.test("type-location - reports types outside types directories", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "packages/core/utils.ts",
        types: [
          mockType({
            name: "UtilType",
            isExported: true,
            file: "packages/core/utils.ts",
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, declaresTypesPackage);
  assertEquals(violations.length, 1);
  expectCodes(violations, ["type-location/type-outside-types"]);
});

Deno.test("type-location - reports multiple types in wrong location", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "packages/server/handler.ts",
        types: [
          mockType({
            name: "Request",
            isExported: true,
            file: "packages/server/handler.ts",
            line: 10,
          }),
          mockType({
            name: "Response",
            isExported: true,
            file: "packages/server/handler.ts",
            line: 20,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, declaresTypesPackage);
  assertEquals(violations.length, 2);
  expectCodes(violations, [
    "type-location/type-outside-types",
    "type-location/type-outside-types",
  ]);
});

Deno.test("type-location - reports interface outside types directory", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "packages/api/client.ts",
        types: [
          mockType({
            name: "ApiClient",
            kind: "interface",
            isExported: true,
            file: "packages/api/client.ts",
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, declaresTypesPackage);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).kind, "type-location/type-outside-types");
});

// =============================================================================
// Logic in Types Directory Detection
// =============================================================================

Deno.test("type-location - reports functions in types/ directory", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "packages/types/models.ts",
        functions: [
          mockFunction({
            name: "createUser",
            isExported: true,
            file: "packages/types/models.ts",
          }),
        ],
        types: [
          mockType({ name: "User", isExported: true }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, declaresTypesPackage);
  assertEquals(violations.length, 1);
  expectCodes(violations, ["type-location/logic-in-types"]);
});

Deno.test("type-location - no violation for functions in *.guards.ts file", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "packages/types/user.guards.ts",
        functions: [
          mockFunction({ name: "isUser", isExported: true }),
          mockFunction({ name: "isConfig", isExported: true }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, declaresTypesPackage);
  expectNoViolations(violations);
});

Deno.test("type-location - no violation for functions in *.validators.ts file", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "packages/types/user.validators.ts",
        functions: [
          mockFunction({ name: "assertUser", isExported: true }),
          mockFunction({ name: "assertValid", isExported: true }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, declaresTypesPackage);
  expectNoViolations(violations);
});

// =============================================================================
// File Pattern Exclusions
// =============================================================================

Deno.test("type-location - types in test files are still flagged (linter doesnt exclude tests)", () => {
  // Note: This linter doesn't have test file exclusions built in
  // It reports all types outside types/ directories
  const data = mockCodebase({
    files: [
      mockFile({
        path: "packages/core/utils_test.ts",
        types: [
          mockType({
            name: "TestHelper",
            isExported: true,
            file: "packages/core/utils_test.ts",
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, declaresTypesPackage);
  // The linter will still flag this - it doesn't have test file exclusions
  assertEquals(violations.length, 1);
});

Deno.test("type-location - types in .types.ts files are allowed", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "packages/core/utils.types.ts",
        types: [
          mockType({ name: "UtilType", isExported: true }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, declaresTypesPackage);
  expectNoViolations(violations);
});

Deno.test("type-location - types in types.ts files are allowed", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "packages/core/types.ts",
        types: [
          mockType({ name: "CoreType", isExported: true }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, declaresTypesPackage);
  expectNoViolations(violations);
});

// =============================================================================
// Mixed Scenarios
// =============================================================================

Deno.test("type-location - handles mixed valid and invalid locations", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "packages/types/user.ts",
        types: [
          mockType({ name: "User", isExported: true }),
        ],
      }),
      mockFile({
        path: "packages/core/config.ts",
        types: [
          mockType({
            name: "BadConfig",
            isExported: true,
            file: "packages/core/config.ts",
          }),
        ],
      }),
      mockFile({
        path: "packages/core/types/local.ts",
        types: [
          mockType({ name: "LocalType", isExported: true }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, declaresTypesPackage);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).message.includes("BadConfig"), true);
});

Deno.test("type-location - empty codebase produces no violations", () => {
  const data = mockCodebase({ files: [] });
  const violations = linter.lint(data, declaresTypesPackage);
  expectNoViolations(violations);
});

Deno.test("type-location - files with no types produce no violations", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "packages/core/utils.ts",
        types: [],
        functions: [
          mockFunction({ name: "helper", isExported: true }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, declaresTypesPackage);
  expectNoViolations(violations);
});

// =============================================================================
// Violation Properties
// =============================================================================

Deno.test("type-location - violation includes suggestion", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "packages/core/bad.ts",
        types: [
          mockType({
            name: "BadType",
            isExported: true,
            file: "packages/core/bad.ts",
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, declaresTypesPackage);
  assertEquals(violations.length, 1);
  assertEquals(typeof first(violations).suggestion, "string");
  assertEquals(first(violations).suggestion!.length > 0, true);
});

// =============================================================================
// What a project has not declared
// =============================================================================

Deno.test("type-location - a project that declares no types package is not in breach of having one", () => {
  // The load-bearing default. This linter used to hold `packages/types` and
  // two literal file paths from one particular monorepo, take its config as
  // `_config`, and never read it. Every other project therefore had its whole
  // type surface reported for breaking a convention it had never agreed to.
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/grammars/resolver.ts",
        types: [mockType({ name: "GrammarRole", isExported: true })],
      }),
    ],
  });

  expectNoViolations(linter.lint(data, defaultConfig));
});

Deno.test("type-location - declaring a package is what turns the rule on", () => {
  // The control for the law above. If this passed too, the default would not
  // be a default, it would be the linter having stopped working.
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/grammars/resolver.ts",
        types: [mockType({ name: "GrammarRole", isExported: true })],
      }),
    ],
  });

  const violations = linter.lint(data, declaresTypesPackage);
  assertEquals(violations.length, 1);
  expectCodes(violations, ["type-location/type-outside-types"]);
});

Deno.test("type-location - a declared package still has its logic guarded", () => {
  // The half of this linter that is not a filing convention: a package that
  // says it holds types and nothing else must not hold logic.
  const data = mockCodebase({
    files: [
      mockFile({
        path: "packages/types/models.ts",
        functions: [mockFunction({ name: "build", isExported: true })],
      }),
    ],
  });

  const violations = linter.lint(data, declaresTypesPackage);
  assertEquals(violations.length, 1);
  expectCodes(violations, ["type-location/logic-in-types"]);
});

Deno.test("type-location - the allowed-files list is the project's, not the linter's", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/wire/schema.ts",
        types: [mockType({ name: "Wire", isExported: true })],
      }),
    ],
  });

  expectNoViolations(linter.lint(data, {
    enabled: true,
    options: {
      typesOnlyPackages: ["packages/types"],
      allowedTypeFiles: ["src/wire/schema.ts"],
    },
  }));
});
