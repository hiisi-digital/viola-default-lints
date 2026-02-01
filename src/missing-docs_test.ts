/**
 * Tests for the missing-docs linter.
 *
 * @module
 */

import type { LinterConfig } from "@hiisi/viola";
import { assertEquals } from "@std/assert";
import { MissingDocsLinter } from "./missing-docs.ts";
import {
    defaultConfig,
    expectNoViolations,
    first,
    mockCodebase,
    mockFile,
    mockFunction,
    mockType,
    mockParam,
} from "./test_utils.ts";

const linter = new MissingDocsLinter();

// =============================================================================
// Basic Functionality
// =============================================================================

Deno.test("missing-docs - no violations for documented exports", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "doSomething", 
            isExported: true,
            jsDoc: "/**\n * Does something useful.\n */",
          }),
        ],
        types: [
          mockType({ 
            name: "Config", 
            isExported: true,
            jsDoc: "/**\n * Configuration options.\n */",
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("missing-docs - no violations for non-exported items", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "internalHelper", 
            isExported: false,
            // No JSDoc
          }),
        ],
        types: [
          mockType({ 
            name: "InternalType", 
            isExported: false,
            // No JSDoc
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

// =============================================================================
// Missing Function Docs
// =============================================================================

Deno.test("missing-docs - reports exported function without JSDoc", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "publicFunction", 
            file: "src/app.ts",
            line: 10,
            isExported: true,
            jsDoc: undefined,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "missing-docs/missing-function-docs");
});

Deno.test("missing-docs - reports exported function with empty JSDoc", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "publicFunction", 
            file: "src/app.ts",
            line: 10,
            isExported: true,
            jsDoc: "",
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "missing-docs/missing-function-docs");
});

Deno.test("missing-docs - reports exported function with whitespace-only JSDoc", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "publicFunction", 
            file: "src/app.ts",
            line: 10,
            isExported: true,
            jsDoc: "   \n   ",
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "missing-docs/missing-function-docs");
});

// =============================================================================
// Missing Type Docs
// =============================================================================

Deno.test("missing-docs - reports exported type without JSDoc", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ 
            name: "PublicType", 
            file: "src/app.ts",
            line: 5,
            isExported: true,
            jsDoc: undefined,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "missing-docs/missing-type-docs");
});

Deno.test("missing-docs - reports exported interface without JSDoc", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ 
            name: "PublicInterface", 
            kind: "interface",
            file: "src/app.ts",
            line: 5,
            isExported: true,
            jsDoc: undefined,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "missing-docs/missing-type-docs");
});

// =============================================================================
// Parameter Documentation
// =============================================================================

Deno.test("missing-docs - does not require param docs by default", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "process", 
            isExported: true,
            params: [mockParam("data", "string"), mockParam("options", "object")],
            jsDoc: "/**\n * Processes data.\n */",
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("missing-docs - detects missing param docs when enabled", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { requireParamDocs: true },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "process", 
            file: "src/app.ts",
            line: 10,
            isExported: true,
            params: [mockParam("data", "string"), mockParam("options", "object")],
            jsDoc: "/**\n * Processes data.\n */",
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  assertEquals(violations.length, 2); // One for each missing param
  assertEquals(violations[0]!.code, "missing-docs/missing-param-doc");
  assertEquals(violations[1]!.code, "missing-docs/missing-param-doc");
});

Deno.test("missing-docs - accepts valid param documentation", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { requireParamDocs: true },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "process", 
            isExported: true,
            params: [mockParam("data", "string"), mockParam("options", "object")],
            jsDoc: "/**\n * Processes data.\n * @param data The input data\n * @param options Processing options\n */",
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  expectNoViolations(violations);
});

// =============================================================================
// Returns Documentation
// =============================================================================

Deno.test("missing-docs - does not require returns docs by default", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "calculate", 
            isExported: true,
            returnType: "number",
            jsDoc: "/**\n * Calculates something.\n */",
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("missing-docs - detects missing returns docs when enabled", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { requireReturnsDocs: true },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "calculate", 
            file: "src/app.ts",
            line: 10,
            isExported: true,
            returnType: "number",
            jsDoc: "/**\n * Calculates something.\n */",
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "missing-docs/missing-returns-doc");
});

Deno.test("missing-docs - accepts valid returns documentation", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { requireReturnsDocs: true },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "calculate", 
            isExported: true,
            returnType: "number",
            jsDoc: "/**\n * Calculates something.\n * @returns The result\n */",
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  expectNoViolations(violations);
});

Deno.test("missing-docs - does not require returns docs for void functions", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { requireReturnsDocs: true },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "doSomething", 
            isExported: true,
            returnType: "void",
            jsDoc: "/**\n * Does something.\n */",
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  expectNoViolations(violations);
});

// =============================================================================
// Configuration Options
// =============================================================================

Deno.test("missing-docs - respects minFunctionLines option", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { minFunctionLines: 5 },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "shortFunction", 
            isExported: true,
            body: "{ return x; }",
            // No JSDoc, but body is too short
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  expectNoViolations(violations);
});

Deno.test("missing-docs - can disable function docs checking", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { requireFunctionDocs: false },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "undocumented", 
            isExported: true,
            // No JSDoc
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  expectNoViolations(violations);
});

Deno.test("missing-docs - can disable type docs checking", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { requireTypeDocs: false },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ 
            name: "UndocumentedType", 
            isExported: true,
            // No JSDoc
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  expectNoViolations(violations);
});

Deno.test("missing-docs - respects ignoreFunctionPatterns option", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { 
      ignoreFunctionPatterns: [/^get/, /^set/],
    },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ name: "getValue", isExported: true }), // No JSDoc but matches pattern
          mockFunction({ name: "setValue", isExported: true }), // No JSDoc but matches pattern
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  expectNoViolations(violations);
});

Deno.test("missing-docs - respects ignoreTypePatterns option", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { 
      ignoreTypePatterns: [/Props$/, /Options$/],
    },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        types: [
          mockType({ name: "ComponentProps", isExported: true }), // No JSDoc but matches pattern
          mockType({ name: "FetchOptions", isExported: true }), // No JSDoc but matches pattern
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

Deno.test("missing-docs - ignores test files by default", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app_test.ts",
        functions: [
          mockFunction({ name: "testFunction", isExported: true }), // No JSDoc
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("missing-docs - ignores spec files by default", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.spec.ts",
        functions: [
          mockFunction({ name: "testFunction", isExported: true }), // No JSDoc
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("missing-docs - ignores tests/ directory by default", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "tests/integration/api.ts",
        functions: [
          mockFunction({ name: "testFunction", isExported: true }), // No JSDoc
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

// =============================================================================
// Anonymous Functions
// =============================================================================

Deno.test("missing-docs - ignores anonymous functions", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ name: "", isExported: true }), // Anonymous, no JSDoc
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

// =============================================================================
// Multiple Violations
// =============================================================================

Deno.test("missing-docs - reports multiple undocumented exports", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ name: "funcA", file: "src/app.ts", line: 10, isExported: true }),
          mockFunction({ name: "funcB", file: "src/app.ts", line: 20, isExported: true }),
        ],
        types: [
          mockType({ name: "TypeA", file: "src/app.ts", line: 30, isExported: true }),
          mockType({ name: "TypeB", file: "src/app.ts", line: 40, isExported: true }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 4);
});

// =============================================================================
// Edge Cases
// =============================================================================

Deno.test("missing-docs - empty codebase produces no violations", () => {
  const data = mockCodebase({ files: [] });
  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("missing-docs - files with no exports produce no violations", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ name: "internal", isExported: false }),
        ],
        types: [
          mockType({ name: "InternalType", isExported: false }),
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

Deno.test("missing-docs - violation has correct linter name", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ name: "undocumented", file: "src/app.ts", line: 10, isExported: true }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).linter, "missing-docs");
});

Deno.test("missing-docs - violation has correct severity", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ name: "undocumented", file: "src/app.ts", line: 10, isExported: true }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).severity, "warning");
});

Deno.test("missing-docs - violation includes suggestion", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ name: "undocumented", file: "src/app.ts", line: 10, isExported: true }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(typeof first(violations).suggestion, "string");
  assertEquals(first(violations).suggestion!.length > 0, true);
});
