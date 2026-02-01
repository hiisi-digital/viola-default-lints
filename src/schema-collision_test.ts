/**
 * Tests for the schema-collision linter.
 *
 * @module
 */

import type { LinterConfig } from "@hiisi/viola";
import { assertEquals } from "@std/assert";
import { SchemaCollisionLinter } from "./schema-collision.ts";
import {
    defaultConfig,
    expectNoViolations,
    first,
    mockCodebase,
    mockFile,
    mockType,
    mockSchema,
    mockField,
} from "./test_utils.ts";

const linter = new SchemaCollisionLinter();

// =============================================================================
// Basic Functionality
// =============================================================================

Deno.test("schema-collision - no violations when no schemas exist", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "User", isExported: true, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
    schemas: [],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("schema-collision - no violations when names don't collide", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "Order", isExported: true, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
    schemas: [
      mockSchema({ name: "User", file: "schemas/user.schema.json" }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

// =============================================================================
// Exact Name Collisions
// =============================================================================

Deno.test("schema-collision - reports exact name collision", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "User", file: "src/app.ts", line: 10, isExported: true, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
    schemas: [
      mockSchema({ name: "User", file: "schemas/user.schema.json" }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "schema-collision/exact-name-collision");
});

Deno.test("schema-collision - reports multiple exact collisions", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "User", file: "src/app.ts", line: 10, isExported: true, fields: [mockField("id", "string")] }),
          mockType({ name: "Order", file: "src/app.ts", line: 20, isExported: true, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
    schemas: [
      mockSchema({ name: "User", file: "schemas/user.schema.json" }),
      mockSchema({ name: "Order", file: "schemas/order.schema.json" }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 2);
});

// =============================================================================
// Case-Insensitive Collisions
// =============================================================================

Deno.test("schema-collision - reports case-insensitive collision", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "user", file: "src/app.ts", line: 10, isExported: true, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
    schemas: [
      mockSchema({ name: "User", file: "schemas/user.schema.json" }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "schema-collision/case-insensitive-collision");
});

Deno.test("schema-collision - can disable case-insensitive checking", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { checkCaseInsensitive: false },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "user", isExported: true, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
    schemas: [
      mockSchema({ name: "User", file: "schemas/user.schema.json" }),
    ],
  });

  const violations = linter.lint(data, config);
  expectNoViolations(violations);
});

// =============================================================================
// Variant Name Collisions
// =============================================================================

Deno.test("schema-collision - reports variant with Type suffix", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "UserType", file: "src/app.ts", line: 10, isExported: true, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
    schemas: [
      mockSchema({ name: "User", file: "schemas/user.schema.json" }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "schema-collision/variant-name-collision");
});

Deno.test("schema-collision - reports variant with Interface suffix", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "UserInterface", file: "src/app.ts", line: 10, isExported: true, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
    schemas: [
      mockSchema({ name: "User", file: "schemas/user.schema.json" }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "schema-collision/variant-name-collision");
});

Deno.test("schema-collision - reports variant with I prefix", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "IUser", file: "src/app.ts", line: 10, isExported: true, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
    schemas: [
      mockSchema({ name: "User", file: "schemas/user.schema.json" }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "schema-collision/variant-name-collision");
});

Deno.test("schema-collision - reports variant with T prefix", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "TUser", file: "src/app.ts", line: 10, isExported: true, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
    schemas: [
      mockSchema({ name: "User", file: "schemas/user.schema.json" }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "schema-collision/variant-name-collision");
});

Deno.test("schema-collision - can disable variant checking", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { checkVariants: false },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "UserType", isExported: true, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
    schemas: [
      mockSchema({ name: "User", file: "schemas/user.schema.json" }),
    ],
  });

  const violations = linter.lint(data, config);
  expectNoViolations(violations);
});

// =============================================================================
// Generated File Exclusions
// =============================================================================

Deno.test("schema-collision - ignores types in .generated.ts files", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/types.generated.ts",
        types: [
          mockType({ name: "User", isExported: true, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
    schemas: [
      mockSchema({ name: "User", file: "schemas/user.schema.json" }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("schema-collision - ignores types in .gen.ts files", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/types.gen.ts",
        types: [
          mockType({ name: "User", isExported: true, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
    schemas: [
      mockSchema({ name: "User", file: "schemas/user.schema.json" }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("schema-collision - ignores types in codegen directories", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/codegen/types.ts",
        types: [
          mockType({ name: "User", isExported: true, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
    schemas: [
      mockSchema({ name: "User", file: "schemas/user.schema.json" }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

// =============================================================================
// Configuration Options
// =============================================================================

Deno.test("schema-collision - respects ignoreSchemaPatterns option", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { 
      ignoreSchemaPatterns: [/^Test/],
    },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "TestUser", isExported: true, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
    schemas: [
      mockSchema({ name: "TestUser", file: "schemas/test-user.schema.json" }),
    ],
  });

  const violations = linter.lint(data, config);
  expectNoViolations(violations);
});

Deno.test("schema-collision - respects ignoreTypePatterns option", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { 
      ignoreTypePatterns: [/^Internal/],
    },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "InternalUser", isExported: true, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
    schemas: [
      mockSchema({ name: "InternalUser", file: "schemas/internal-user.schema.json" }),
    ],
  });

  const violations = linter.lint(data, config);
  expectNoViolations(violations);
});

Deno.test("schema-collision - can customize variant suffixes", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { 
      variantSuffixes: ["Entity"],
    },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "UserEntity", file: "src/app.ts", line: 10, isExported: true, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
    schemas: [
      mockSchema({ name: "User", file: "schemas/user.schema.json" }),
    ],
  });

  const violations = linter.lint(data, config);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "schema-collision/variant-name-collision");
});

Deno.test("schema-collision - can customize variant prefixes", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { 
      variantPrefixes: ["C"],
    },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "CUser", file: "src/app.ts", line: 10, isExported: true, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
    schemas: [
      mockSchema({ name: "User", file: "schemas/user.schema.json" }),
    ],
  });

  const violations = linter.lint(data, config);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "schema-collision/variant-name-collision");
});

Deno.test("schema-collision - can disable exact match checking", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { checkExactMatch: false },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "User", isExported: true, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
    schemas: [
      mockSchema({ name: "User", file: "schemas/user.schema.json" }),
    ],
  });

  const violations = linter.lint(data, config);
  expectNoViolations(violations);
});

// =============================================================================
// Priority of Collision Types
// =============================================================================

Deno.test("schema-collision - exact match takes precedence over other matches", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "User", file: "src/app.ts", line: 10, isExported: true, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
    schemas: [
      mockSchema({ name: "User", file: "schemas/user.schema.json" }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  // Should report exact match, not case-insensitive or variant
  assertEquals(first(violations).code, "schema-collision/exact-name-collision");
});

// =============================================================================
// Edge Cases
// =============================================================================

Deno.test("schema-collision - empty codebase produces no violations", () => {
  const data = mockCodebase({ files: [], schemas: [] });
  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("schema-collision - files with no types produce no violations", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [],
      }),
    ],
    schemas: [
      mockSchema({ name: "User", file: "schemas/user.schema.json" }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("schema-collision - schemas without colliding types produce no violations", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "Config", isExported: true, fields: [mockField("key", "string")] }),
        ],
      }),
    ],
    schemas: [
      mockSchema({ name: "User", file: "schemas/user.schema.json" }),
      mockSchema({ name: "Order", file: "schemas/order.schema.json" }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("schema-collision - non-exported types are not checked", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "User", isExported: false, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
    schemas: [
      mockSchema({ name: "User", file: "schemas/user.schema.json" }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

// =============================================================================
// Violation Properties
// =============================================================================

Deno.test("schema-collision - violation has correct linter name", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "User", file: "src/app.ts", line: 10, isExported: true, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
    schemas: [
      mockSchema({ name: "User", file: "schemas/user.schema.json" }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).linter, "schema-collision");
});

Deno.test("schema-collision - violation has correct severity", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "User", file: "src/app.ts", line: 10, isExported: true, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
    schemas: [
      mockSchema({ name: "User", file: "schemas/user.schema.json" }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).severity, "error");
});

Deno.test("schema-collision - violation includes related locations", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "User", file: "src/app.ts", line: 10, isExported: true, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
    schemas: [
      mockSchema({ name: "User", file: "schemas/user.schema.json" }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(Array.isArray(first(violations).relatedLocations), true);
  assertEquals(first(violations).relatedLocations!.length >= 1, true);
});

Deno.test("schema-collision - violation includes suggestion", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "User", file: "src/app.ts", line: 10, isExported: true, fields: [mockField("id", "string")] }),
        ],
      }),
    ],
    schemas: [
      mockSchema({ name: "User", file: "schemas/user.schema.json" }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(typeof first(violations).suggestion, "string");
  assertEquals(first(violations).suggestion!.length > 0, true);
});
