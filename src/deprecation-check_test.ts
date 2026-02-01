/**
 * Tests for the deprecation-check linter.
 *
 * @module
 */

import type { LinterConfig } from "@hiisi/viola";
import { assertEquals } from "@std/assert";
import { DeprecationCheckLinter } from "./deprecation-check.ts";
import {
    defaultConfig,
    expectNoViolations,
    first,
    mockCodebase,
    mockFile,
} from "./test_utils.ts";

const linter = new DeprecationCheckLinter();

// =============================================================================
// Basic Functionality
// =============================================================================

Deno.test("deprecation-check - no violations for clean code", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        content: `
          /**
           * A clean function with no deprecation markers.
           */
          export function doSomething() {
            return "hello";
          }
        `,
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("deprecation-check - detects @deprecated annotation", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        content: `
          /**
           * @deprecated Use newFunction instead
           */
          export function oldFunction() {
            return "old";
          }
        `,
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "deprecation-check/deprecated-annotation");
});

Deno.test("deprecation-check - detects DEPRECATED marker", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        content: `
          // DEPRECATED: This function is no longer used
          export function oldFunction() {
            return "old";
          }
        `,
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "deprecation-check/deprecated-marker");
});

Deno.test("deprecation-check - detects 'is deprecated' mention", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        content: `
          // This function is deprecated
          export function oldFunction() {
            return "old";
          }
        `,
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "deprecation-check/deprecated-mention");
});

Deno.test("deprecation-check - detects 'are deprecated' mention", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        content: `
          // These functions are deprecated
          export function oldFunction() {
            return "old";
          }
        `,
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "deprecation-check/deprecated-mention");
});

// =============================================================================
// Removal Markers
// =============================================================================

Deno.test("deprecation-check - detects 'to be removed' marker", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        content: `
          // This function is to be removed in v2.0
          export function oldFunction() {
            return "old";
          }
        `,
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "deprecation-check/deprecated-removal");
});

Deno.test("deprecation-check - detects 'will be removed' marker", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        content: `
          // This will be removed soon
          export function oldFunction() {
            return "old";
          }
        `,
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "deprecation-check/deprecated-removal");
});

Deno.test("deprecation-check - detects 'scheduled for removal' marker", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        content: `
          // This is scheduled for removal
          export function oldFunction() {
            return "old";
          }
        `,
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "deprecation-check/deprecated-removal");
});

// =============================================================================
// Obsolete Markers
// =============================================================================

Deno.test("deprecation-check - detects obsolete marker", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        content: `
          // This function is obsolete
          export function oldFunction() {
            return "old";
          }
        `,
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "deprecation-check/deprecated-obsolete");
});

// =============================================================================
// Warning Markers
// =============================================================================

Deno.test("deprecation-check - detects 'do not use' warning", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        content: `
          // Do not use this function
          export function oldFunction() {
            return "old";
          }
        `,
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "deprecation-check/deprecated-warning");
});

Deno.test("deprecation-check - detects 'avoid using' warning", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        content: `
          // Avoid using this pattern
          export function oldFunction() {
            return "old";
          }
        `,
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "deprecation-check/deprecated-warning");
});

// =============================================================================
// Legacy Code Detection
// =============================================================================

Deno.test("deprecation-check - does not detect 'legacy' by default", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        content: `
          // This is legacy code
          export function oldFunction() {
            return "old";
          }
        `,
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("deprecation-check - detects 'legacy' when enabled", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { checkLegacy: true },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        content: `
          // This is legacy code
          export function oldFunction() {
            return "old";
          }
        `,
      }),
    ],
  });

  const violations = linter.lint(data, config);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).code, "deprecation-check/deprecated-legacy");
});

// =============================================================================
// False Positive Handling
// =============================================================================

Deno.test("deprecation-check - ignores meta discussion about deprecation", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/linter.ts",
        content: `
          /**
           * Check if the function has any @deprecated annotations.
           * This function helps detect deprecation markers.
           */
          export function checkForDeprecation() {
            return "checking";
          }
        `,
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("deprecation-check - ignores 'check for deprecation' pattern", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/analyzer.ts",
        content: `
          // This function will check for deprecation patterns
          export function analyze() {
            return "analyzing";
          }
        `,
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("deprecation-check - ignores 'detect deprecation' pattern", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/tool.ts",
        content: `
          // Tool to detect deprecation in code
          export function detectDeprecation() {
            return "detecting";
          }
        `,
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

// =============================================================================
// File Exclusions
// =============================================================================

Deno.test("deprecation-check - ignores markdown files", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "README.md",
        content: `
          # Documentation

          This API is deprecated and will be removed in v2.0.
        `,
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("deprecation-check - ignores CHANGELOG files", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "CHANGELOG.md",
        content: `
          ## v1.5.0

          - Deprecated oldFunction in favor of newFunction
        `,
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("deprecation-check - ignores deprecation-check.ts itself", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/deprecation-check.ts",
        content: `
          // Pattern to detect @deprecated annotations
          const DEPRECATION_PATTERNS = [/@deprecated/];
        `,
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

// =============================================================================
// Configuration Options
// =============================================================================

Deno.test("deprecation-check - respects excludeFiles option", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { 
      excludeFiles: [/generated/],
    },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/generated/types.ts",
        content: `
          /**
           * @deprecated This is auto-generated
           */
          export type OldType = string;
        `,
      }),
    ],
  });

  const violations = linter.lint(data, config);
  expectNoViolations(violations);
});

Deno.test("deprecation-check - respects checkObsolete option", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { checkObsolete: false },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        content: `
          // This function is obsolete
          export function oldFunction() {
            return "old";
          }
        `,
      }),
    ],
  });

  const violations = linter.lint(data, config);
  expectNoViolations(violations);
});

Deno.test("deprecation-check - respects checkRemovalMarkers option", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { checkRemovalMarkers: false },
  };

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        content: `
          // This will be removed soon
          export function oldFunction() {
            return "old";
          }
        `,
      }),
    ],
  });

  const violations = linter.lint(data, config);
  expectNoViolations(violations);
});

// =============================================================================
// Multiple Deprecations
// =============================================================================

Deno.test("deprecation-check - reports multiple deprecations in same file", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        content: `
          /**
           * @deprecated Use newFunctionA instead
           */
          export function oldFunctionA() {
            return "old A";
          }

          /**
           * @deprecated Use newFunctionB instead
           */
          export function oldFunctionB() {
            return "old B";
          }
        `,
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 2);
});

Deno.test("deprecation-check - reports deprecations across multiple files", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        content: `
          /**
           * @deprecated Use newFunction instead
           */
          export function oldFunction() {
            return "old";
          }
        `,
      }),
      mockFile({
        path: "src/utils.ts",
        content: `
          // DEPRECATED: No longer needed
          export function oldUtil() {
            return "old util";
          }
        `,
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 2);
});

// =============================================================================
// Edge Cases
// =============================================================================

Deno.test("deprecation-check - empty codebase produces no violations", () => {
  const data = mockCodebase({ files: [] });
  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("deprecation-check - files with no content produce no violations", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        content: "",
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("deprecation-check - files with no content field are skipped", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        // content is undefined
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("deprecation-check - case insensitive DEPRECATED detection", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        content: `
          // deprecated function
          export function oldFunction() {
            return "old";
          }
        `,
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  // Should still detect case-insensitive matches
  assertEquals(violations.length >= 1, true);
});

// =============================================================================
// Violation Properties
// =============================================================================

Deno.test("deprecation-check - violation has correct linter name", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        content: `
          /**
           * @deprecated Use newFunction instead
           */
          export function oldFunction() {
            return "old";
          }
        `,
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).linter, "deprecation-check");
});

Deno.test("deprecation-check - violation has correct severity", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        content: `
          /**
           * @deprecated Use newFunction instead
           */
          export function oldFunction() {
            return "old";
          }
        `,
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).severity, "error");
});

Deno.test("deprecation-check - violation includes suggestion", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        content: `
          /**
           * @deprecated Use newFunction instead
           */
          export function oldFunction() {
            return "old";
          }
        `,
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(typeof first(violations).suggestion, "string");
  assertEquals(first(violations).suggestion!.length > 0, true);
});

Deno.test("deprecation-check - violation includes line location", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        content: `
          /**
           * @deprecated Use newFunction instead
           */
          export function oldFunction() {
            return "old";
          }
        `,
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(typeof first(violations).location.line, "number");
  assertEquals(first(violations).location.line > 0, true);
});
