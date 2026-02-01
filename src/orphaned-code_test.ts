/**
 * Tests for the orphaned-code linter.
 *
 * @module
 */

import type { LinterConfig } from "@hiisi/viola";
import { assertEquals } from "@std/assert";
import { OrphanedCodeLinter } from "./orphaned-code.ts";
import {
    defaultConfig,
    expectNoViolations,
    first,
    mockCodebase,
    mockFile,
    mockExport,
    mockImport,
} from "./test_utils.ts";

const linter = new OrphanedCodeLinter();

// =============================================================================
// Basic Functionality
// =============================================================================

Deno.test("orphaned-code - no violations for used exports", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/utils.ts",
        exports: [
          mockExport({ name: "helper", kind: "function", file: "src/utils.ts", line: 1 }),
        ],
      }),
      mockFile({
        path: "src/app.ts",
        imports: [
          mockImport({ name: "helper", from: "./utils.ts", file: "src/app.ts" }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("orphaned-code - reports unused exported function", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/utils.ts",
        exports: [
          mockExport({ name: "unusedHelper", kind: "function", file: "src/utils.ts", line: 1 }),
        ],
      }),
      mockFile({
        path: "src/app.ts",
        imports: [],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "orphaned-code/orphaned-export");
});

Deno.test("orphaned-code - reports unused exported type", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/types.ts",
        exports: [
          mockExport({ name: "UnusedType", kind: "type", file: "src/types.ts", line: 1 }),
        ],
      }),
      mockFile({
        path: "src/app.ts",
        imports: [],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "orphaned-code/orphaned-export");
});

// =============================================================================
// Entry Point Exclusions
// =============================================================================

Deno.test("orphaned-code - does not report exports from mod.ts", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "mod.ts",
        exports: [
          mockExport({ name: "publicAPI", kind: "function", file: "mod.ts", line: 1 }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("orphaned-code - does not report exports from index.ts", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/index.ts",
        exports: [
          mockExport({ name: "publicAPI", kind: "function", file: "src/index.ts", line: 1 }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("orphaned-code - does not report exports from main.ts", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/main.ts",
        exports: [
          mockExport({ name: "publicAPI", kind: "function", file: "src/main.ts", line: 1 }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

// =============================================================================
// Re-export Handling
// =============================================================================

Deno.test("orphaned-code - treats re-exports as usage by default", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/utils.ts",
        exports: [
          mockExport({ name: "helper", kind: "function", file: "src/utils.ts", line: 1 }),
        ],
      }),
      mockFile({
        path: "mod.ts",
        exports: [
          mockExport({ name: "helper", kind: "re-export", from: "./src/utils.ts", file: "mod.ts", line: 1 }),
        ],
        imports: [
          mockImport({ name: "helper", from: "./src/utils.ts", file: "mod.ts" }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("orphaned-code - can disable re-export as usage", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { reexportCountsAsUsage: false },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/utils.ts",
        exports: [
          mockExport({ name: "helper", kind: "function", file: "src/utils.ts", line: 1 }),
        ],
      }),
      mockFile({
        path: "mod.ts",
        exports: [
          mockExport({ name: "helper", kind: "re-export", from: "./src/utils.ts", file: "mod.ts", line: 1 }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  // Should report because re-export doesn't count as usage
  assertEquals(violations.length, 1);
});

// =============================================================================
// Namespace Imports
// =============================================================================

Deno.test("orphaned-code - namespace imports use all exports", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/utils.ts",
        exports: [
          mockExport({ name: "helperA", kind: "function", file: "src/utils.ts", line: 1 }),
          mockExport({ name: "helperB", kind: "function", file: "src/utils.ts", line: 10 }),
        ],
      }),
      mockFile({
        path: "src/app.ts",
        imports: [
          mockImport({ name: "utils", from: "./utils.ts", file: "src/app.ts", isNamespace: true }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

// =============================================================================
// Default Exports
// =============================================================================

Deno.test("orphaned-code - does not check default exports by default", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/component.ts",
        exports: [
          mockExport({ name: "default", kind: "function", file: "src/component.ts", line: 1 }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("orphaned-code - can enable default export checking", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { checkDefaultExports: true },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/component.ts",
        exports: [
          mockExport({ name: "default", kind: "function", file: "src/component.ts", line: 1 }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  // Default export from non-entry file should be reported
  assertEquals(violations.length, 1);
});

// =============================================================================
// Configuration Options
// =============================================================================

Deno.test("orphaned-code - can disable function checking", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { checkFunctions: false },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/utils.ts",
        exports: [
          mockExport({ name: "unusedFunction", kind: "function", file: "src/utils.ts", line: 1 }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  expectNoViolations(violations);
});

Deno.test("orphaned-code - can disable type checking", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { checkTypes: false },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/types.ts",
        exports: [
          mockExport({ name: "UnusedType", kind: "type", file: "src/types.ts", line: 1 }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  expectNoViolations(violations);
});

Deno.test("orphaned-code - respects ignoreExportPatterns option", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { 
      ignoreExportPatterns: [/^_/, /Test$/],
    },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/utils.ts",
        exports: [
          mockExport({ name: "_internalHelper", kind: "function", file: "src/utils.ts", line: 1 }),
          mockExport({ name: "helperTest", kind: "function", file: "src/utils.ts", line: 10 }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  expectNoViolations(violations);
});

Deno.test("orphaned-code - respects publicApiFiles option", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { 
      publicApiFiles: ["src/utils/hash.ts", "src/utils/similarity.ts"],
    },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/utils/hash.ts",
        exports: [
          mockExport({ name: "hashCode", kind: "function", file: "src/utils/hash.ts", line: 1 }),
        ],
      }),
      mockFile({
        path: "src/utils/similarity.ts",
        exports: [
          mockExport({ name: "compare", kind: "function", file: "src/utils/similarity.ts", line: 1 }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  expectNoViolations(violations);
});

Deno.test("orphaned-code - respects entryPointPatterns option", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { 
      entryPointPatterns: [/cli\.ts$/],
    },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/cli.ts",
        exports: [
          mockExport({ name: "main", kind: "function", file: "src/cli.ts", line: 1 }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  expectNoViolations(violations);
});

// =============================================================================
// File Pattern Exclusions
// =============================================================================

Deno.test("orphaned-code - ignores test files by default", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app_test.ts",
        exports: [
          mockExport({ name: "testHelper", kind: "function", file: "src/app_test.ts", line: 1 }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("orphaned-code - ignores spec files by default", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.spec.ts",
        exports: [
          mockExport({ name: "testHelper", kind: "function", file: "src/app.spec.ts", line: 1 }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("orphaned-code - ignores tests/ directory by default", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "tests/helpers.ts",
        exports: [
          mockExport({ name: "testHelper", kind: "function", file: "tests/helpers.ts", line: 1 }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

// =============================================================================
// External Imports
// =============================================================================

Deno.test("orphaned-code - ignores external imports", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        imports: [
          mockImport({ name: "assertEquals", from: "@std/assert", file: "src/app.ts" }),
          mockImport({ name: "readFile", from: "node:fs", file: "src/app.ts" }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

// =============================================================================
// Re-export Kinds
// =============================================================================

Deno.test("orphaned-code - does not report re-export kinds as orphaned", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "mod.ts",
        exports: [
          mockExport({ name: "helper", kind: "re-export", from: "./src/utils.ts", file: "mod.ts", line: 1 }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

// =============================================================================
// Multiple Files and Imports
// =============================================================================

Deno.test("orphaned-code - handles complex import/export chains", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/core/utils.ts",
        exports: [
          mockExport({ name: "coreHelper", kind: "function", file: "src/core/utils.ts", line: 1 }),
        ],
      }),
      mockFile({
        path: "src/utils.ts",
        exports: [
          mockExport({ name: "coreHelper", kind: "re-export", from: "./core/utils.ts", file: "src/utils.ts", line: 1 }),
        ],
        imports: [
          mockImport({ name: "coreHelper", from: "./core/utils.ts", file: "src/utils.ts" }),
        ],
      }),
      mockFile({
        path: "src/app.ts",
        imports: [
          mockImport({ name: "coreHelper", from: "./utils.ts", file: "src/app.ts" }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

// =============================================================================
// Edge Cases
// =============================================================================

Deno.test("orphaned-code - empty codebase produces no violations", () => {
  const data = mockCodebase({ files: [] });
  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("orphaned-code - files with no exports produce no violations", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        exports: [],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("orphaned-code - handles circular dependencies gracefully", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/a.ts",
        exports: [
          mockExport({ name: "funcA", kind: "function", file: "src/a.ts", line: 1 }),
        ],
        imports: [
          mockImport({ name: "funcB", from: "./b.ts", file: "src/a.ts" }),
        ],
      }),
      mockFile({
        path: "src/b.ts",
        exports: [
          mockExport({ name: "funcB", kind: "function", file: "src/b.ts", line: 1 }),
        ],
        imports: [
          mockImport({ name: "funcA", from: "./a.ts", file: "src/b.ts" }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  // Both functions are used, no violations
  expectNoViolations(violations);
});

// =============================================================================
// Violation Properties
// =============================================================================

Deno.test("orphaned-code - violation has correct linter name", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/utils.ts",
        exports: [
          mockExport({ name: "unusedHelper", kind: "function", file: "src/utils.ts", line: 1 }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).linter, "orphaned-code");
});

Deno.test("orphaned-code - violation has correct severity", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/utils.ts",
        exports: [
          mockExport({ name: "unusedHelper", kind: "function", file: "src/utils.ts", line: 1 }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).severity, "warning");
});

Deno.test("orphaned-code - violation includes suggestion", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/utils.ts",
        exports: [
          mockExport({ name: "unusedHelper", kind: "function", file: "src/utils.ts", line: 1 }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(typeof first(violations).suggestion, "string");
  assertEquals(first(violations).suggestion!.length > 0, true);
});
