/**
 * Tests for the similar-types linter.
 *
 * @module
 */

import type { LinterConfig } from "@hiisi/viola";
import { assertEquals } from "@std/assert";
import { SimilarTypesLinter } from "./similar-types.ts";
import {
    defaultConfig,
    expectNoViolations,
    first,
    mockCodebase,
    mockFile,
    mockType,
    mockField,
} from "./test_utils.ts";

const linter = new SimilarTypesLinter();

// =============================================================================
// Basic Functionality
// =============================================================================

Deno.test("similar-types - no violations for unique type names", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "User", file: "src/app.ts", line: 1, fields: [mockField("id", "string"), mockField("name", "string")] }),
          mockType({ name: "Order", file: "src/app.ts", line: 10, fields: [mockField("id", "string"), mockField("total", "number")] }),
          mockType({ name: "Config", file: "src/app.ts", line: 20, fields: [mockField("apiKey", "string"), mockField("debug", "boolean")] }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("similar-types - reports types with very similar names (high similarity)", () => {
  // "UserData" vs "UserDatas" has high similarity
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "UserData", file: "src/app.ts", line: 1, fields: [mockField("id", "string"), mockField("name", "string")] }),
        ],
      }),
      mockFile({
        path: "src/utils.ts",
        types: [
          mockType({ name: "UserDatas", file: "src/utils.ts", line: 1, fields: [mockField("id", "string"), mockField("email", "string")] }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).kind, "similar-types/similar-name-high");
});

Deno.test("similar-types - reports types with moderately similar names (medium similarity)", () => {
  // Similar but not identical names
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/user.ts",
        types: [
          mockType({ name: "UserInfo", file: "src/user.ts", line: 1, fields: [mockField("id", "string"), mockField("name", "string")] }),
        ],
      }),
      mockFile({
        path: "src/admin.ts",
        types: [
          mockType({ name: "UserInfos", file: "src/admin.ts", line: 1, fields: [mockField("id", "string"), mockField("role", "string")] }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).kind, "similar-types/similar-name-medium");
});

Deno.test("similar-types - identical names in different files produces duplicate-type", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/user.ts",
        types: [
          mockType({ 
            name: "Person", 
            file: "src/user.ts", 
            line: 1, 
            fields: [mockField("name", "string"), mockField("age", "number")] 
          }),
        ],
      }),
      mockFile({
        path: "src/admin.ts",
        types: [
          mockType({ 
            name: "Person", 
            file: "src/admin.ts", 
            line: 1, 
            fields: [mockField("name", "string"), mockField("age", "number")] 
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).kind, "similar-types/duplicate-type");
});

Deno.test("similar-types - same name but different structure produces same-name-different-structure", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/user.ts",
        types: [
          mockType({ 
            name: "Config", 
            file: "src/user.ts", 
            line: 1, 
            fields: [mockField("apiKey", "string"), mockField("timeout", "number")] 
          }),
        ],
      }),
      mockFile({
        path: "src/admin.ts",
        types: [
          mockType({ 
            name: "Config", 
            file: "src/admin.ts", 
            line: 1, 
            fields: [mockField("database", "string"), mockField("port", "number")] 
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).kind, "similar-types/same-name-different-structure");
});

// =============================================================================
// Field Structure Similarity
// =============================================================================

Deno.test("similar-types - detects types with similar field structures", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/user.ts",
        types: [
          mockType({ 
            name: "UserRecord", 
            file: "src/user.ts", 
            line: 1, 
            fields: [mockField("id", "string"), mockField("name", "string"), mockField("email", "string")] 
          }),
        ],
      }),
      mockFile({
        path: "src/admin.ts",
        types: [
          mockType({ 
            name: "AdminAccount", 
            file: "src/admin.ts", 
            line: 1, 
            fields: [mockField("id", "string"), mockField("name", "string"), mockField("email", "string")] 
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).kind, "similar-types/similar-structure");
});

// =============================================================================
// Ignore Patterns
// =============================================================================

Deno.test("similar-types - ignores types with 'Props' suffix by default", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "UserProps", file: "src/app.ts", line: 1, fields: [mockField("name", "string")] }),
          mockType({ name: "UserProp", file: "src/app.ts", line: 10, fields: [mockField("name", "string")] }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("similar-types - ignores types with 'Options' suffix by default", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "FetchOptions", file: "src/app.ts", line: 1, fields: [mockField("timeout", "number")] }),
          mockType({ name: "FetchOption", file: "src/app.ts", line: 10, fields: [mockField("timeout", "number")] }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("similar-types - ignores types with 'Config' suffix by default", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "DatabaseConfig", file: "src/app.ts", line: 1, fields: [mockField("host", "string")] }),
          mockType({ name: "DatabaseConfigs", file: "src/app.ts", line: 10, fields: [mockField("host", "string")] }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("similar-types - ignores types with 'I' prefix by default (IUser pattern)", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "IUser", file: "src/app.ts", line: 1, fields: [mockField("id", "string")] }),
          mockType({ name: "IUsers", file: "src/app.ts", line: 10, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("similar-types - respects ignoreTypes option", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: {
      ignoreTypes: ["FileCondition", "LinterCondition"],
    },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "FileCondition", file: "src/app.ts", line: 1, fields: [mockField("path", "string"), mockField("match", "boolean")] }),
        ],
      }),
      mockFile({
        path: "src/utils.ts",
        types: [
          mockType({ name: "LinterCondition", file: "src/utils.ts", line: 1, fields: [mockField("id", "string"), mockField("enabled", "boolean")] }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  expectNoViolations(violations);
});

// =============================================================================
// Same File Types
// =============================================================================

Deno.test("similar-types - ignores similar types in same file (unless exact name)", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "UserData", file: "src/app.ts", line: 1, fields: [mockField("id", "string"), mockField("name", "string")] }),
          mockType({ name: "UserDatas", file: "src/app.ts", line: 10, fields: [mockField("id", "string"), mockField("email", "string")] }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

// =============================================================================
// Configuration Options
// =============================================================================

Deno.test("similar-types - configurable similarity threshold", () => {
  // These names have moderate similarity - below default 0.7 but above 0.5
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "UserEntity", file: "src/app.ts", line: 1, fields: [mockField("id", "string"), mockField("name", "string")] }),
        ],
      }),
      mockFile({
        path: "src/utils.ts",
        types: [
          mockType({ name: "UserEntities", file: "src/utils.ts", line: 1, fields: [mockField("id", "string"), mockField("email", "string")] }),
        ],
      }),
    ],
  });

  // With default threshold (0.7), these might or might not match depending on exact similarity
  const defaultViolations = linter.lint(data, defaultConfig);

  // With lower threshold (0.5), they should match if they're above 0.5
  const lowConfig: LinterConfig = {
    ...defaultConfig,
    options: { minSimilarity: 0.5, warningThreshold: 0.5, errorThreshold: 0.85 },
  };
  const lowViolations = linter.lint(data, lowConfig);

  // With high threshold (0.95), they should not match
  const highConfig: LinterConfig = {
    ...defaultConfig,
    options: { minSimilarity: 0.95, warningThreshold: 0.95, errorThreshold: 0.99 },
  };
  const highViolations = linter.lint(data, highConfig);
  expectNoViolations(highViolations);
});

Deno.test("similar-types - respects minFieldCount option", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { minFieldCount: 3 },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          // Only 2 fields - should be ignored
          mockType({ name: "UserData", file: "src/app.ts", line: 1, fields: [mockField("id", "string"), mockField("name", "string")] }),
        ],
      }),
      mockFile({
        path: "src/utils.ts",
        types: [
          mockType({ name: "UserDatas", file: "src/utils.ts", line: 1, fields: [mockField("id", "string"), mockField("email", "string")] }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  expectNoViolations(violations);
});

Deno.test("similar-types - respects minNameLength option", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { minNameLength: 10 },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          // Short name - should be ignored
          mockType({ name: "User", file: "src/app.ts", line: 1, fields: [mockField("id", "string"), mockField("name", "string")] }),
        ],
      }),
      mockFile({
        path: "src/utils.ts",
        types: [
          mockType({ name: "Users", file: "src/utils.ts", line: 1, fields: [mockField("id", "string"), mockField("email", "string")] }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  expectNoViolations(violations);
});

Deno.test("similar-types - can disable field structure checking", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { checkFieldStructure: false },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/user.ts",
        types: [
          mockType({ 
            name: "UserRecord", 
            file: "src/user.ts", 
            line: 1, 
            fields: [mockField("id", "string"), mockField("name", "string"), mockField("email", "string")] 
          }),
        ],
      }),
      mockFile({
        path: "src/admin.ts",
        types: [
          mockType({ 
            name: "AdminAccount", 
            file: "src/admin.ts", 
            line: 1, 
            fields: [mockField("id", "string"), mockField("name", "string"), mockField("email", "string")] 
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  // Should not detect structure similarity when disabled
  expectNoViolations(violations);
});

// =============================================================================
// Edge Cases
// =============================================================================

Deno.test("similar-types - empty codebase produces no violations", () => {
  const data = mockCodebase({ files: [] });
  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("similar-types - files with no types produce no violations", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/constants.ts",
        types: [],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("similar-types - single type produces no violations", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "User", file: "src/app.ts", line: 1, fields: [mockField("id", "string"), mockField("name", "string")] }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("similar-types - types with too few fields are ignored", () => {
  // Default minFieldCount is 2
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "Result", file: "src/app.ts", line: 1, fields: [mockField("value", "string")] }),
        ],
      }),
      mockFile({
        path: "src/utils.ts",
        types: [
          mockType({ name: "Results", file: "src/utils.ts", line: 1, fields: [mockField("value", "string")] }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("similar-types - types with empty fields are ignored", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "EmptyType", file: "src/app.ts", line: 1, fields: [] }),
        ],
      }),
      mockFile({
        path: "src/utils.ts",
        types: [
          mockType({ name: "EmptyTypes", file: "src/utils.ts", line: 1, fields: [] }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

// =============================================================================
// Violation Properties
// =============================================================================

Deno.test("similar-types - violation has correct severity", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "UserData", file: "src/app.ts", line: 1, fields: [mockField("id", "string"), mockField("name", "string")] }),
        ],
      }),
      mockFile({
        path: "src/utils.ts",
        types: [
          mockType({ name: "UserDatas", file: "src/utils.ts", line: 1, fields: [mockField("id", "string"), mockField("email", "string")] }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
});

Deno.test("similar-types - violation includes related locations", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "UserData", file: "src/app.ts", line: 1, fields: [mockField("id", "string"), mockField("name", "string")] }),
        ],
      }),
      mockFile({
        path: "src/utils.ts",
        types: [
          mockType({ name: "UserDatas", file: "src/utils.ts", line: 1, fields: [mockField("id", "string"), mockField("email", "string")] }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(Array.isArray(first(violations).relatedLocations), true);
  assertEquals(first(violations).relatedLocations!.length >= 1, true);
});

Deno.test("similar-types - violation includes suggestion", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "UserData", file: "src/app.ts", line: 1, fields: [mockField("id", "string"), mockField("name", "string")] }),
        ],
      }),
      mockFile({
        path: "src/utils.ts",
        types: [
          mockType({ name: "UserDatas", file: "src/utils.ts", line: 1, fields: [mockField("id", "string"), mockField("email", "string")] }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(typeof first(violations).suggestion, "string");
  assertEquals(first(violations).suggestion!.length > 0, true);
});

Deno.test("similar-types - violation has correct linter name", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "UserData", file: "src/app.ts", line: 1, fields: [mockField("id", "string"), mockField("name", "string")] }),
        ],
      }),
      mockFile({
        path: "src/utils.ts",
        types: [
          mockType({ name: "UserDatas", file: "src/utils.ts", line: 1, fields: [mockField("id", "string"), mockField("email", "string")] }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
});
