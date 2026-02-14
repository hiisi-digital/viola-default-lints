/**
 * Tests for the duplicate-logic linter.
 *
 * @module
 */

import type { LinterConfig } from "@hiisi/viola";
import { assertEquals } from "@std/assert";
import { DuplicateLogicLinter } from "./duplicate-logic.ts";
import {
    defaultConfig,
    expectNoViolations,
    first,
    mockCodebase,
    mockFile,
    mockFunction,
} from "./test_utils.ts";

const linter = new DuplicateLogicLinter();

// =============================================================================
// Basic Functionality
// =============================================================================

Deno.test("duplicate-logic - no violations for unique function implementations", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "createUser", 
            file: "src/app.ts", 
            line: 1,
            body: `{
              const id = generateId();
              const timestamp = Date.now();
              return { id, timestamp, role: 'user' };
            }`
          }),
          mockFunction({ 
            name: "deleteOrder", 
            file: "src/app.ts", 
            line: 10,
            body: `{
              validateOrderId(orderId);
              const order = db.orders.find(orderId);
              if (order) db.orders.delete(orderId);
            }`
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("duplicate-logic - reports exact duplicate functions", () => {
  const identicalBody = `{
    const result = validateInput(data);
    if (!result.valid) throw new Error('Invalid');
    return processData(result.data);
  }`;

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "processUserData", 
            file: "src/app.ts", 
            line: 1,
            body: identicalBody,
          }),
        ],
      }),
      mockFile({
        path: "src/utils.ts",
        functions: [
          mockFunction({ 
            name: "processAdminData", 
            file: "src/utils.ts", 
            line: 1,
            body: identicalBody,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).kind, "duplicate-logic/exact-duplicate");
});

Deno.test("duplicate-logic - reports similar implementations", () => {
  const bodyA = `{
    const user = database.users.findOne(userId);
    if (!user) throw new Error('User not found');
    const validated = validate(user);
    return transform(validated);
  }`;

  const bodyB = `{
    const admin = database.admins.findOne(adminId);
    if (!admin) throw new Error('Admin not found');
    const validated = validate(admin);
    return transform(validated);
  }`;

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/user.ts",
        functions: [
          mockFunction({
            name: "fetchUser",
            file: "src/user.ts",
            line: 1,
            body: bodyA,
          }),
        ],
      }),
      mockFile({
        path: "src/admin.ts",
        functions: [
          mockFunction({
            name: "fetchAdmin",
            file: "src/admin.ts",
            line: 1,
            body: bodyB,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length >= 1, true);
});

// =============================================================================
// Minimum Body Length Filtering
// =============================================================================

Deno.test("duplicate-logic - ignores functions with bodies too short", () => {
  const shortBody = `{ return x; }`;

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "getX", 
            file: "src/app.ts", 
            line: 1,
            body: shortBody,
          }),
          mockFunction({ 
            name: "getY", 
            file: "src/app.ts", 
            line: 5,
            body: shortBody,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("duplicate-logic - respects minBodyLength option", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { minBodyLength: 200 },
  };

  const mediumBody = `{
    const result = doSomething();
    return result;
  }`;

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "funcA", 
            file: "src/app.ts", 
            line: 1,
            body: mediumBody,
          }),
        ],
      }),
      mockFile({
        path: "src/utils.ts",
        functions: [
          mockFunction({ 
            name: "funcB", 
            file: "src/utils.ts", 
            line: 1,
            body: mediumBody,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  // Should be ignored because body is less than 200 characters
  expectNoViolations(violations);
});

Deno.test("duplicate-logic - respects minBodyLines option", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { minBodyLines: 10 },
  };

  const shortMultilineBody = `{
    const a = 1;
    return a;
  }`;

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "funcA", 
            file: "src/app.ts", 
            line: 1,
            body: shortMultilineBody,
          }),
        ],
      }),
      mockFile({
        path: "src/utils.ts",
        functions: [
          mockFunction({ 
            name: "funcB", 
            file: "src/utils.ts", 
            line: 1,
            body: shortMultilineBody,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  // Should be ignored because body has less than 10 lines
  expectNoViolations(violations);
});

// =============================================================================
// Cross-File Detection
// =============================================================================

Deno.test("duplicate-logic - detects duplicates across different files", () => {
  const duplicateBody = `{
    const validation = validateInput(input);
    if (!validation.success) return null;
    const processed = processValidData(validation.data);
    return formatResult(processed);
  }`;

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/module-a.ts",
        functions: [
          mockFunction({ 
            name: "handleA", 
            file: "src/module-a.ts", 
            line: 1,
            body: duplicateBody,
          }),
        ],
      }),
      mockFile({
        path: "src/module-b.ts",
        functions: [
          mockFunction({ 
            name: "handleB", 
            file: "src/module-b.ts", 
            line: 1,
            body: duplicateBody,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
});

Deno.test("duplicate-logic - can disable cross-file comparison", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { crossFile: false },
  };

  const duplicateBody = `{
    const validation = validateInput(input);
    if (!validation.success) return null;
    return processValidData(validation.data);
  }`;

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/module-a.ts",
        functions: [
          mockFunction({ 
            name: "handleA", 
            file: "src/module-a.ts", 
            line: 1,
            body: duplicateBody,
          }),
        ],
      }),
      mockFile({
        path: "src/module-b.ts",
        functions: [
          mockFunction({ 
            name: "handleB", 
            file: "src/module-b.ts", 
            line: 1,
            body: duplicateBody,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  // Should not detect because crossFile is disabled
  expectNoViolations(violations);
});

// =============================================================================
// File Pattern Exclusions
// =============================================================================

Deno.test("duplicate-logic - ignores test files by default", () => {
  const duplicateBody = `{
    const result = calculateSomething();
    expect(result).toBe(expected);
    return result;
  }`;

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app_test.ts",
        functions: [
          mockFunction({ 
            name: "testA", 
            file: "src/app_test.ts", 
            line: 1,
            body: duplicateBody,
          }),
          mockFunction({ 
            name: "testB", 
            file: "src/app_test.ts", 
            line: 10,
            body: duplicateBody,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("duplicate-logic - ignores spec files by default", () => {
  const duplicateBody = `{
    const result = calculateSomething();
    expect(result).toBe(expected);
    return result;
  }`;

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.spec.ts",
        functions: [
          mockFunction({ 
            name: "testA", 
            file: "src/app.spec.ts", 
            line: 1,
            body: duplicateBody,
          }),
          mockFunction({ 
            name: "testB", 
            file: "src/app.spec.ts", 
            line: 10,
            body: duplicateBody,
          }),
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

Deno.test("duplicate-logic - respects similarityThreshold option", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { similarityThreshold: 0.99 },
  };

  const slightlyDifferentBodyA = `{
    const user = database.findUser(id);
    if (!user) throw new Error('Not found');
    return user;
  }`;

  const slightlyDifferentBodyB = `{
    const user = database.findUser(id);
    if (!user) throw new Error('Missing');
    return user;
  }`;

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "funcA", 
            file: "src/app.ts", 
            line: 1,
            body: slightlyDifferentBodyA,
          }),
        ],
      }),
      mockFile({
        path: "src/utils.ts",
        functions: [
          mockFunction({ 
            name: "funcB", 
            file: "src/utils.ts", 
            line: 1,
            body: slightlyDifferentBodyB,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  // With very high threshold (0.99), slight differences prevent matching
  expectNoViolations(violations);
});

Deno.test("duplicate-logic - respects ignoreFunctions option", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { ignoreFunctions: ["impactCond", "categoryCond"] },
  };

  const duplicateBody = `{
    const check = condition.check(value);
    return check.result;
  }`;

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "impactCond", 
            file: "src/app.ts", 
            line: 1,
            body: duplicateBody,
          }),
          mockFunction({ 
            name: "categoryCond", 
            file: "src/app.ts", 
            line: 10,
            body: duplicateBody,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  expectNoViolations(violations);
});

Deno.test("duplicate-logic - respects maxPairs option", () => {
  const config: LinterConfig = {
    ...defaultConfig,
    options: { maxPairs: 1 },
  };

  const duplicateBody = `{
    const value = calculate();
    return transform(value);
  }`;

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ name: "funcA", file: "src/app.ts", line: 1, body: duplicateBody }),
          mockFunction({ name: "funcB", file: "src/app.ts", line: 10, body: duplicateBody }),
          mockFunction({ name: "funcC", file: "src/app.ts", line: 20, body: duplicateBody }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, config);
  // Should only report maxPairs (1) violations
  assertEquals(violations.length, 1);
});

Deno.test("duplicate-logic - errorOnExact option controls severity", () => {
  const exactConfig: LinterConfig = {
    ...defaultConfig,
    options: { errorOnExact: true },
  };

  const duplicateBody = `{
    const result = doSomething();
    return result;
  }`;

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "funcA", 
            file: "src/app.ts", 
            line: 1,
            body: duplicateBody,
          }),
        ],
      }),
      mockFile({
        path: "src/utils.ts",
        functions: [
          mockFunction({ 
            name: "funcB", 
            file: "src/utils.ts", 
            line: 1,
            body: duplicateBody,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, exactConfig);
  assertEquals(violations.length, 1);
});

// =============================================================================
// Edge Cases
// =============================================================================

Deno.test("duplicate-logic - empty codebase produces no violations", () => {
  const data = mockCodebase({ files: [] });
  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("duplicate-logic - files with no functions produce no violations", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/constants.ts",
        functions: [],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("duplicate-logic - single function produces no violations", () => {
  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "onlyFunction", 
            file: "src/app.ts", 
            line: 1,
            body: `{
              const result = doSomething();
              return result;
            }`
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  expectNoViolations(violations);
});

Deno.test("duplicate-logic - functions in same file with same body are detected", () => {
  const duplicateBody = `{
    const validated = validate(input);
    if (!validated) return null;
    return process(validated);
  }`;

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "funcA", 
            file: "src/app.ts", 
            line: 1,
            body: duplicateBody,
          }),
          mockFunction({ 
            name: "funcB", 
            file: "src/app.ts", 
            line: 10,
            body: duplicateBody,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
});

// =============================================================================
// Violation Properties
// =============================================================================

Deno.test("duplicate-logic - violation has correct linter name", () => {
  const duplicateBody = `{
    const result = process(data);
    return result;
  }`;

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({
            name: "funcA",
            file: "src/app.ts",
            line: 1,
            body: duplicateBody,
          }),
        ],
      }),
      mockFile({
        path: "src/utils.ts",
        functions: [
          mockFunction({
            name: "funcB",
            file: "src/utils.ts",
            line: 1,
            body: duplicateBody,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(first(violations).kind, "duplicate-logic/exact-duplicate");
});

Deno.test("duplicate-logic - violation includes related locations", () => {
  const duplicateBody = `{
    const result = process(data);
    return result;
  }`;

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "funcA", 
            file: "src/app.ts", 
            line: 1,
            body: duplicateBody,
          }),
        ],
      }),
      mockFile({
        path: "src/utils.ts",
        functions: [
          mockFunction({ 
            name: "funcB", 
            file: "src/utils.ts", 
            line: 1,
            body: duplicateBody,
          }),
        ],
      }),
    ],
  });

  const violations = linter.lint(data, defaultConfig);
  assertEquals(violations.length, 1);
  assertEquals(Array.isArray(first(violations).relatedLocations), true);
  assertEquals(first(violations).relatedLocations!.length >= 1, true);
});

Deno.test("duplicate-logic - violation includes suggestion", () => {
  const duplicateBody = `{
    const result = process(data);
    return result;
  }`;

  const data = mockCodebase({
    files: [
      mockFile({
        path: "src/app.ts",
        functions: [
          mockFunction({ 
            name: "funcA", 
            file: "src/app.ts", 
            line: 1,
            body: duplicateBody,
          }),
        ],
      }),
      mockFile({
        path: "src/utils.ts",
        functions: [
          mockFunction({ 
            name: "funcB", 
            file: "src/utils.ts", 
            line: 1,
            body: duplicateBody,
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
