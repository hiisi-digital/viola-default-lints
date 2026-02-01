# Copilot Instructions for viola-default-lints

Convention linters plugin for the Viola convention linter. Runtime: Deno (TypeScript).

## Project Context

This package provides a curated set of convention linters for the viola ecosystem. Each linter:
- Extends `BaseLinter` from `@hiisi/viola`
- Defines an issue catalog with categories and impact levels
- Implements the `lint()` method to analyze codebase data

## CRITICAL: Accessing @hiisi/viola

The core package is published to JSR. The import in deno.json currently uses a local path for development. For production, use:

```json
{
  "imports": {
    "@hiisi/viola": "jsr:@hiisi/viola@^0.1"
  }
}
```

## Before Starting Work

- **Check current branch**: If not main, you're likely working on a PR
- **Read docs/DESIGN.md**: Understand the linter architecture
- **Read docs/TODO.md**: Know what tasks need implementation
- **Check existing linters**: Use them as patterns for new work
- **Search before writing**: Check if functionality already exists

## Core Principles

### 1. Linter Self-Containment

**Each linter is a single file with its tests alongside**

```
src/
├── similar-functions.ts
├── similar-functions_test.ts
├── type-location.ts
├── type-location_test.ts
```

**Implications:**
- All linter code in one file (implementation + types + options)
- Test file adjacent with `_test.ts` suffix
- Shared utilities in `test_utils.ts`

### 2. BaseLinter Pattern

**All linters extend BaseLinter and follow the same structure**

```typescript
export class MyLinter extends BaseLinter {
  readonly meta: LinterMeta = {
    id: "my-linter",
    name: "My Linter",
    description: "What it checks",
  };

  readonly catalog: IssueCatalog = {
    "my-linter/issue-code": {
      category: "maintainability",
      impact: "major",
      description: "Issue description.",
    },
  };

  readonly requirements: LinterDataRequirements = {
    functions: true,  // Request needed data
  };

  lint(data: CodebaseData, config: LinterConfig): Issue[] {
    // Implementation
  }
}

export const myLinter = new MyLinter();
```

### 3. Issue ID Format

**Issue IDs follow `linter-id/issue-code` pattern**

```typescript
"similar-functions/duplicate-function"
"type-location/type-in-impl"
```

This enables targeted rule configuration in user configs.

### 4. Graceful Degradation

**Never crash on malformed input**

Linters should:
- Handle missing data gracefully
- Return empty array if nothing to check
- Log warnings for unexpected patterns (in verbose mode)
- Continue processing even if one item fails

### 5. Configuration with Defaults

**All options have sensible defaults**

```typescript
interface MyLinterOptions {
  minSimilarity?: number;  // Optional with default
  ignorePatterns?: RegExp[];
}

const DEFAULT_OPTIONS: MyLinterOptions = {
  minSimilarity: 0.7,
  ignorePatterns: [],
};

function getOptions(config: LinterConfig): MyLinterOptions {
  return { ...DEFAULT_OPTIONS, ...config.options };
}
```

### 6. Test Everything

**Each linter needs comprehensive tests**

Test:
- Basic detection
- Configuration options
- Edge cases
- Error recovery
- No false positives

## File Structure

```
viola-default-lints/
├── mod.ts                          # Plugin + exports
├── deno.json                       # Package manifest
├── README.md                       # Usage documentation
├── LICENSE                         # MPL-2.0
├── docs/
│   ├── DESIGN.md                   # Architecture
│   └── TODO.md                     # Tasks
├── .github/
│   ├── copilot-instructions.md     # This file
│   └── workflows/
└── src/
    ├── type-location.ts
    ├── type-location_test.ts
    ├── similar-functions.ts
    ├── similar-functions_test.ts
    ├── similar-types.ts
    ├── similar-types_test.ts
    ├── duplicate-strings.ts
    ├── duplicate-strings_test.ts
    ├── duplicate-logic.ts
    ├── duplicate-logic_test.ts
    ├── deprecation-check.ts
    ├── deprecation-check_test.ts
    ├── missing-docs.ts
    ├── missing-docs_test.ts
    ├── orphaned-code.ts
    ├── orphaned-code_test.ts
    ├── schema-collision.ts
    ├── schema-collision_test.ts
    └── test_utils.ts
```

## Coding Standards

### TypeScript

- Strict mode enabled
- No `any` types - use `unknown` and narrow
- Explicit return types on exported functions
- Use `readonly` for immutable data
- Prefer `interface` for object shapes

### Naming

- Files: `kebab-case.ts`
- Classes: `PascalCase` + `Linter` suffix
- Instances: `camelCase` + `Linter` suffix
- Issue IDs: `linter-id/issue-code`
- Constants: `SCREAMING_SNAKE_CASE`

### Documentation

- All exported symbols must have JSDoc
- Linter descriptions should be actionable
- Include configuration examples

### Issue Messages

Format issue messages to be:
- Specific (what's wrong)
- Actionable (how to fix)
- Contextual (include relevant details)

```typescript
return this.issue(
  "similar-functions/duplicate-function",
  funcA.location,
  `Function "${funcA.name}" exists in multiple files with identical signature. ` +
    `This is likely duplicate code that should be consolidated.`,
  {
    relatedLocations: [funcB.location],
    suggestion: "Move to a shared location and import from both places.",
    context: { funcA: signature(funcA), funcB: signature(funcB) },
  }
);
```

## Workflow

### Before Starting

1. Read docs/DESIGN.md for architecture
2. Read docs/TODO.md for current tasks
3. Check existing linter patterns

### Implementing a New Linter

1. Create `src/linter-name.ts`
2. Define `LinterMeta` with id, name, description
3. Define `IssueCatalog` with all possible issues
4. Define `requirements` for needed data
5. Implement `lint()` method
6. Create `src/linter-name_test.ts`
7. Export from `mod.ts`
8. Add to `linters` array

### Implementing Tests

1. Create `src/linter-name_test.ts`
2. Import test utilities from `test_utils.ts`
3. Test basic detection
4. Test configuration options
5. Test edge cases
6. Test no false positives

### Before Marking Done

1. All tests pass (`deno test src/`)
2. Type checking passes (`deno check mod.ts`)
3. Linter exported from mod.ts
4. Documentation complete
5. No console.log left in code

## Commits

Format: `type: lowercase message`

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

### Good Examples

- `feat: add missing-docs linter`
- `fix: handle empty function body in similar-functions`
- `test: add deprecation-check tests`
- `docs: document type-location configuration`

### Bad Examples

- `Added linter` (no type)
- `WIP` (not descriptive)
- `fix stuff` (not specific)

## Don't

- Add dependencies without explicit approval
- Modify other linters when working on one
- Skip tests
- Use `any` type
- Ignore error cases
- Leave TODO comments without issue reference
- Change issue IDs (breaks user configs)
- Remove configuration options (breaking change)

## Dependencies

Only these should be used:

- `@hiisi/viola` - Core runtime and types
- `@hiisi/flash-freeze` - Immutable data utilities
- `@std/assert` - Testing
- `@std/fs` - File system utilities
- `@std/path` - Path utilities

Do not add new dependencies without explicit approval.

## Code Constraints

| Rule | Limit | Reason |
|------|-------|--------|
| Linter file size | <400 LOC | Maintainability |
| Test file size | <300 LOC | Readability |
| Function length | <50 LOC | Readability |
| Issue catalog | <10 issues | Focused linter |
| Test coverage | >80% | Reliability |

## Testing Guidelines

### Unit Tests

```typescript
Deno.test("similarFunctionsLinter - detects identical signatures", () => {
  const data = createTestData({
    functions: [
      createFunction("formatDate", "a/utils.ts"),
      createFunction("formatDate", "b/helpers.ts"),
    ],
  });
  
  const issues = similarFunctionsLinter.lint(data, defaultConfig);
  
  assertEquals(issues.length, 1);
  assertStringIncludes(issues[0].message, "identical signature");
});
```

### Testing Configuration

```typescript
Deno.test("similarFunctionsLinter - respects minSimilarity option", () => {
  const config = createConfig({ minSimilarity: 0.95 });
  const issues = linter.lint(data, config);
  assertEquals(issues.length, 0);  // Below threshold
});
```

### Testing Edge Cases

```typescript
Deno.test("similarFunctionsLinter - handles empty function list", () => {
  const data = createTestData({ functions: [] });
  const issues = linter.lint(data, defaultConfig);
  assertEquals(issues.length, 0);  // No crash, no issues
});
```

## Issue Catalog Guidelines

### Categories

- `correctness` - Code that may not work correctly
- `maintainability` - Code that's hard to maintain
- `consistency` - Code that violates conventions
- `performance` - Code with performance issues
- `security` - Code with security concerns

### Impact Levels

- `critical` - Must fix immediately (bugs, security)
- `major` - Should fix soon (significant issues)
- `minor` - Nice to fix (improvements)
- `trivial` - Low priority (cosmetic)

## Review Checklist

Before marking work complete:

- [ ] All tests pass (`deno test src/`)
- [ ] Type checking passes (`deno check mod.ts`)
- [ ] Linter extends BaseLinter correctly
- [ ] Issue catalog complete with all possible issues
- [ ] Configuration has sensible defaults
- [ ] Error messages are helpful and actionable
- [ ] Test coverage >80%
- [ ] Exported from mod.ts
- [ ] Added to linters array
- [ ] Documentation updated
