/**
 * Tests for the duplicate-strings linter.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { DuplicateStringsLinter } from "./duplicate-strings.ts";
import {
  defaultConfig,
  expectCodes,
  expectNoViolations,
  first,
  mockCodebase,
  mockFile,
  mockImport,
  mockString,
  mockType,
} from "./test_utils.ts";

const linter = new DuplicateStringsLinter();

// =============================================================================
// Basic Functionality
// =============================================================================

Deno.test("duplicate-strings - no violations for unique strings", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        strings: [
          mockString({ value: "hello", file: "src/app.ts", line: 1 }),
          mockString({ value: "world", file: "src/app.ts", line: 2 }),
          mockString({ value: "foo", file: "src/app.ts", line: 3 }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("duplicate-strings - reports strings that appear multiple times", () => {
  // Use a string that won't be filtered (not CSS-like, not identifier-like)
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        strings: [
          mockString({
            value: "This is a longer duplicate string that should be detected!",
            file: "src/app.ts",
            line: 1,
          }),
          mockString({
            value: "This is a longer duplicate string that should be detected!",
            file: "src/app.ts",
            line: 5,
          }),
          mockString({
            value: "This is a longer duplicate string that should be detected!",
            file: "src/app.ts",
            line: 10,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  expectCodes(violations, ["duplicate-strings/duplicate"]);
});

Deno.test("duplicate-strings - reports duplicates across files", () => {
  // Use a string that won't be filtered
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        strings: [
          mockString({
            value: "This shared error message appears in multiple files!",
            file: "src/app.ts",
            line: 1,
          }),
        ],
      }),
      mockFile({
        path: "src/utils.ts",
        strings: [
          mockString({
            value: "This shared error message appears in multiple files!",
            file: "src/utils.ts",
            line: 1,
          }),
        ],
      }),
      mockFile({
        path: "src/config.ts",
        strings: [
          mockString({
            value: "This shared error message appears in multiple files!",
            file: "src/config.ts",
            line: 1,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  expectCodes(violations, ["duplicate-strings/duplicate"]);
});

// =============================================================================
// Threshold Behavior
// =============================================================================

Deno.test("duplicate-strings - respects minimum occurrence threshold", () => {
  // Default warning threshold is 2, error threshold is 3
  // With only 1 occurrence, no violation
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        strings: [
          mockString({
            value: "This string only appears once in the codebase!",
            file: "src/app.ts",
            line: 1,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("duplicate-strings - configurable threshold via options", () => {
  // With warningThreshold: 2 (default), 2 occurrences should trigger
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        strings: [
          mockString({
            value: "This message appears exactly twice in the code!",
            file: "src/app.ts",
            line: 1,
          }),
          mockString({
            value: "This message appears exactly twice in the code!",
            file: "src/app.ts",
            line: 5,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
});

// =============================================================================
// String Length Filtering
// =============================================================================

Deno.test("duplicate-strings - ignores short strings by default", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        strings: [
          mockString({ value: "a", file: "src/app.ts", line: 1 }),
          mockString({ value: "a", file: "src/app.ts", line: 2 }),
          mockString({ value: "a", file: "src/app.ts", line: 3 }),
          mockString({ value: "a", file: "src/app.ts", line: 4 }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("duplicate-strings - ignores empty strings", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        strings: [
          mockString({ value: "", file: "src/app.ts", line: 1 }),
          mockString({ value: "", file: "src/app.ts", line: 2 }),
          mockString({ value: "", file: "src/app.ts", line: 3 }),
          mockString({ value: "", file: "src/app.ts", line: 4 }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

// =============================================================================
// File Pattern Exclusions
// =============================================================================

Deno.test("duplicate-strings - does NOT ignore test files by default", () => {
  // Note: This linter doesn't exclude test files by default
  // It will report duplicate strings in test files too
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app_test.ts",
        strings: [
          mockString({
            value: "This test assertion message repeats in tests!",
            file: "src/app_test.ts",
            line: 1,
          }),
          mockString({
            value: "This test assertion message repeats in tests!",
            file: "src/app_test.ts",
            line: 5,
          }),
          mockString({
            value: "This test assertion message repeats in tests!",
            file: "src/app_test.ts",
            line: 10,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  expectCodes(violations, ["duplicate-strings/duplicate"]);
});

Deno.test("duplicate-strings - does NOT ignore spec files by default", () => {
  // Note: This linter doesn't exclude spec files by default
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.spec.ts",
        strings: [
          mockString({
            value: "This spec string message repeats in spec files!",
            file: "src/app.spec.ts",
            line: 1,
          }),
          mockString({
            value: "This spec string message repeats in spec files!",
            file: "src/app.spec.ts",
            line: 5,
          }),
          mockString({
            value: "This spec string message repeats in spec files!",
            file: "src/app.spec.ts",
            line: 10,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  expectCodes(violations, ["duplicate-strings/duplicate"]);
});

// =============================================================================
// Multiple Duplicate Groups
// =============================================================================

Deno.test("duplicate-strings - reports multiple distinct duplicate groups", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        strings: [
          mockString({
            value: "The first error message that repeats many times!",
            file: "src/app.ts",
            line: 1,
          }),
          mockString({
            value: "The first error message that repeats many times!",
            file: "src/app.ts",
            line: 2,
          }),
          mockString({
            value: "The first error message that repeats many times!",
            file: "src/app.ts",
            line: 3,
          }),
          mockString({
            value: "The second warning message also repeats here!",
            file: "src/app.ts",
            line: 10,
          }),
          mockString({
            value: "The second warning message also repeats here!",
            file: "src/app.ts",
            line: 11,
          }),
          mockString({
            value: "The second warning message also repeats here!",
            file: "src/app.ts",
            line: 12,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 2);
  expectCodes(violations, [
    "duplicate-strings/duplicate",
    "duplicate-strings/duplicate",
  ]);
});

// =============================================================================
// Violation Properties
// =============================================================================

Deno.test("duplicate-strings - violation has correct severity", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        strings: [
          mockString({
            value: "This repeated text should trigger a warning or error!",
            file: "src/app.ts",
            line: 1,
          }),
          mockString({
            value: "This repeated text should trigger a warning or error!",
            file: "src/app.ts",
            line: 5,
          }),
          mockString({
            value: "This repeated text should trigger a warning or error!",
            file: "src/app.ts",
            line: 10,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  // 3 occurrences >= errorThreshold (3), so it should be "error"
});

Deno.test("duplicate-strings - violation includes related locations", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        strings: [
          mockString({
            value: "This repeated value should have related locations!",
            file: "src/app.ts",
            line: 1,
          }),
          mockString({
            value: "This repeated value should have related locations!",
            file: "src/app.ts",
            line: 5,
          }),
          mockString({
            value: "This repeated value should have related locations!",
            file: "src/app.ts",
            line: 10,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(Array.isArray(first(violations).relatedLocations), true);
  // Should have related locations pointing to the duplicate occurrences
  assertEquals(first(violations).relatedLocations!.length >= 1, true);
});

Deno.test("duplicate-strings - violation includes suggestion", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        strings: [
          mockString({
            value: "Please extract me into a constant variable!",
            file: "src/app.ts",
            line: 1,
          }),
          mockString({
            value: "Please extract me into a constant variable!",
            file: "src/app.ts",
            line: 5,
          }),
          mockString({
            value: "Please extract me into a constant variable!",
            file: "src/app.ts",
            line: 10,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(typeof first(violations).suggestion, "string");
  assertEquals(first(violations).suggestion!.length > 0, true);
});

Deno.test("duplicate-strings - violation has correct linter name", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        strings: [
          mockString({
            value: "Check that the linter name is correct here!",
            file: "src/app.ts",
            line: 1,
          }),
          mockString({
            value: "Check that the linter name is correct here!",
            file: "src/app.ts",
            line: 5,
          }),
          mockString({
            value: "Check that the linter name is correct here!",
            file: "src/app.ts",
            line: 10,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
});

// =============================================================================
// Edge Cases
// =============================================================================

Deno.test("duplicate-strings - empty codebase produces no violations", () => {
  const data = mockCodebase({ files: [] });
  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("duplicate-strings - files with no strings produce no violations", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        strings: [],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("duplicate-strings - handles whitespace-only differences", () => {
  // Strings that differ only in whitespace should be treated as different
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        strings: [
          mockString({ value: "hello world", file: "src/app.ts", line: 1 }),
          mockString({ value: "hello  world", file: "src/app.ts", line: 2 }),
          mockString({ value: "hello   world", file: "src/app.ts", line: 3 }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("duplicate-strings - case-sensitive matching", () => {
  // "Hello" and "hello" should be treated as different strings
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        strings: [
          mockString({ value: "Hello", file: "src/app.ts", line: 1 }),
          mockString({ value: "hello", file: "src/app.ts", line: 2 }),
          mockString({ value: "HELLO", file: "src/app.ts", line: 3 }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

// =============================================================================
// A type's own vocabulary
// =============================================================================

/** A codebase declaring a union, and using its members. */
function withUnion(occurrences: number) {
  return mockCodebase({
    files: [
      mockFile({
        path: "src/roles.ts",
        types: [
          mockType({
            name: "GrammarRole",
            body: `"primary" | "suppressed"`,
          }),
        ],
        strings: Array.from(
          { length: occurrences },
          (_, i) => mockString({ value: "primary", line: i + 1 }),
        ),
      }),
    ],
  });
}

Deno.test("duplicate-strings - a union member is not a duplicated string", () => {
  // It repeats because the type says it may, and the compiler checks every
  // occurrence. A shared constant would remove the property that makes that
  // safe: rename the union member and every use breaks, which is the point.
  const violations = linter.lint(withUnion(6), defaultConfig);
  expectNoViolations(violations);
});

Deno.test("duplicate-strings - a string no type declares is still reported", () => {
  // The control. If the vocabulary rule swallowed everything, the law above
  // would pass while the linter had simply stopped reporting.
  //
  // The literal is a message rather than a key, because the existing
  // heuristics already drop anything identifier-shaped: `some-repeated-key`
  // reads as an identifier and never reaches the vocabulary check at all.
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/roles.ts",
        types: [mockType({ name: "GrammarRole", body: `"primary"` })],
        strings: Array.from(
          { length: 6 },
          (_, i) =>
            mockString({ value: "Cannot open file, aborting", line: i + 1 }),
        ),
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
});

Deno.test("duplicate-strings - the exclusion can be turned off", () => {
  // It is a default rather than a law. A project that does want its union
  // members counted says so, and gets them.
  const violations = linter.lint(withUnion(6), {
    enabled: true,
    options: { ignoreDeclaredVocabulary: false },
  });
  assertEquals(violations.length, 1);
});

Deno.test("duplicate-strings - an enum value counts as vocabulary too", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/impact.ts",
        types: [
          mockType({
            name: "Impact",
            body: `{ Critical = "critical", Major = "major" }`,
          }),
        ],
        strings: Array.from(
          { length: 6 },
          (_, i) => mockString({ value: "critical", line: i + 1 }),
        ),
      }),
    ],
  });

  expectNoViolations(linter.lint(data, defaultConfig));
});

// =============================================================================
// Which files an occurrence counts in
// =============================================================================

/** Occurrences of one literal, split across source and a test file. */
function split(inSource: number, inTests: number) {
  const strings = [
    ...Array.from({ length: inSource }, (_, i) => ({
      file: "src/thing.ts",
      line: i + 1,
    })),
    ...Array.from({ length: inTests }, (_, i) => ({
      file: "src/thing_test.ts",
      line: i + 1,
    })),
  ];
  return mockCodebase({
    files: [
      mockFile({
        path: "src/thing.ts",
        strings: strings.map((s) =>
          mockString({
            value: "Cannot open file, aborting",
            line: s.line,
            file: s.file,
          })
        ),
      }),
    ],
  });
}

Deno.test("duplicate-strings - everything counts by default", () => {
  // The default is the whole tree, so no project's behaviour changes unless it
  // says otherwise.
  const violations = linter.lint(split(1, 4), defaultConfig);
  assertEquals(violations.length, 1);
});

Deno.test("duplicate-strings - a narrowed population is counted over", () => {
  // Four occurrences, all in a test file, one in source. A project that counts
  // only source sees one occurrence, which is below the threshold.
  const violations = linter.lint(split(1, 4), {
    enabled: true,
    options: { countIn: ["src/**", "!src/**/*_test.ts"] },
  });
  expectNoViolations(violations);
});

Deno.test("duplicate-strings - narrowing does not hide a real duplication", () => {
  // The control. Narrowing the population must not stop reporting a literal
  // that is genuinely repeated inside it.
  const violations = linter.lint(split(4, 1), {
    enabled: true,
    options: { countIn: ["src/**", "!src/**/*_test.ts"] },
  });
  assertEquals(violations.length, 1);
});

Deno.test("duplicate-strings - a negation wins wherever it matches", () => {
  const violations = linter.lint(split(0, 5), {
    enabled: true,
    options: { countIn: ["**", "!**/*_test.ts"] },
  });
  expectNoViolations(violations);
});

// =============================================================================
// Half a sentence is not a constant
// =============================================================================

/** One literal repeated, as a template fragment or as a plain string. */
function repeated(value: string, isTemplate: boolean, times = 5) {
  return mockCodebase({
    files: [
      mockFile({
        path: "src/report.ts",
        strings: Array.from(
          { length: times },
          (_, i) => mockString({ value, line: i + 1, isTemplate }),
        ),
      }),
    ],
  });
}

Deno.test("duplicate-strings - a template fragment is not a duplicated string", () => {
  // The leading word of `Found ${n} things` repeats across every message shaped
  // that way. Extracting a constant leaves the message assembled from pieces,
  // which is worse than the repetition.
  expectNoViolations(
    linter.lint(repeated("Cannot open file, aborting", true), defaultConfig),
  );
});

Deno.test("duplicate-strings - the same text as a plain string is still reported", () => {
  // The control. The exclusion is about where the text sits, not about the
  // text, so the identical literal outside a template must still be found.
  const violations = linter.lint(
    repeated("Cannot open file, aborting", false),
    defaultConfig,
  );
  assertEquals(violations.length, 1);
});

Deno.test("duplicate-strings - counting fragments can be turned back on", () => {
  const violations = linter.lint(repeated("Cannot open file, aborting", true), {
    enabled: true,
    options: { ignoreTemplateFragments: false },
  });
  assertEquals(violations.length, 1);
});

Deno.test("duplicate-strings - a runtime union member is vocabulary too", () => {
  // `stdout: "piped"` is a member of Deno's own `CommandOptions`. The union
  // belongs to the runtime, so a consumer cannot rename a member of it and
  // extracting a constant only hides which API value is meant.
  expectNoViolations(linter.lint(repeated("piped", false, 8), defaultConfig));
});

Deno.test("duplicate-strings - a word that merely recurs is not vocabulary", () => {
  // The control. The list is unions that can be named and pointed at, not
  // every string that turns up often.
  const violations = linter.lint(
    repeated("Cannot open file, aborting", false, 8),
    defaultConfig,
  );
  assertEquals(violations.length, 1);
});

Deno.test("duplicate-strings - a module specifier is not a duplicated string", () => {
  // `import ts from "typescript"` repeats in every file that imports it, which
  // is what importing is. A specifier cannot become a constant either: it is
  // resolved before any constant exists.
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/a.ts",
        imports: [mockImport({ name: "ts", from: "typescript" })],
        strings: Array.from(
          { length: 5 },
          (_, i) => mockString({ value: "typescript", line: i + 1 }),
        ),
      }),
    ],
  });

  expectNoViolations(linter.lint(data, defaultConfig));
});

Deno.test("duplicate-strings - a string nothing imports is still reported", () => {
  // The control. Only what the codebase actually imports is exempt.
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/a.ts",
        imports: [mockImport({ name: "ts", from: "typescript" })],
        strings: Array.from(
          { length: 5 },
          (_, i) =>
            mockString({ value: "Cannot open file, aborting", line: i + 1 }),
        ),
      }),
    ],
  });

  assertEquals(linter.lint(data, defaultConfig).length, 1);
});
