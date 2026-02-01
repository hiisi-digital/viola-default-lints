# viola-default-lints Design Document

## Overview

`@hiisi/viola-default-lints` is a plugin package for the Viola convention linter that provides a curated set of convention linters with sensible default rules.

## Purpose

This package provides:

1. **Convention linters** for common code quality issues
2. **Default severity rules** based on issue impact
3. **Plugin interface** for easy integration with viola
4. **Individual exports** for selective linter usage

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   @hiisi/viola-default-lints                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Plugin Interface                        │ │
│  │  defaultLints: ViolaPlugin                                │ │
│  │  - Registers all linters                                  │ │
│  │  - Applies default rules (impact → severity)              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Linters Array                          │ │
│  │  linters: BaseLinter[]                                    │ │
│  │  - All linters without default rules                      │ │
│  │  - For custom rule configuration                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                Individual Linters                        │   │
│  │                                                          │   │
│  │  ┌──────────────────┐  ┌──────────────────┐             │   │
│  │  │ type-location    │  │ similar-functions │             │   │
│  │  │ Types in types/  │  │ Detect duplicates │             │   │
│  │  └──────────────────┘  └──────────────────┘             │   │
│  │                                                          │   │
│  │  ┌──────────────────┐  ┌──────────────────┐             │   │
│  │  │ similar-types    │  │ duplicate-strings │             │   │
│  │  │ Name collisions  │  │ Repeated literals │             │   │
│  │  └──────────────────┘  └──────────────────┘             │   │
│  │                                                          │   │
│  │  ┌──────────────────┐  ┌──────────────────┐             │   │
│  │  │ duplicate-logic  │  │ deprecation-check │             │   │
│  │  │ Code duplication │  │ Expired deprecations│           │   │
│  │  └──────────────────┘  └──────────────────┘             │   │
│  │                                                          │   │
│  │  ┌──────────────────┐  ┌──────────────────┐             │   │
│  │  │ missing-docs     │  │ orphaned-code     │             │   │
│  │  │ Undocumented API │  │ Unused internals  │             │   │
│  │  └──────────────────┘  └──────────────────┘             │   │
│  │                                                          │   │
│  │  ┌──────────────────┐                                   │   │
│  │  │ schema-collision │                                   │   │
│  │  │ Conflicting defs │                                   │   │
│  │  └──────────────────┘                                   │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Linter Descriptions

### type-location

**Purpose**: Enforce that type definitions live in dedicated `types/` directories.

**Issues**:
- `type-in-impl` - Type defined in implementation file
- `interface-in-impl` - Interface defined in implementation file
- `enum-in-impl` - Enum defined in implementation file
- `type-alias-in-impl` - Type alias in implementation file

**Configuration**:
- `allowInlineTypes` - Allow small inline types
- `typesDirPattern` - Glob pattern for types directories

### similar-functions

**Purpose**: Detect functions with similar names that might be duplicates.

**Issues**:
- `similar-name-high` - 85%+ name similarity (likely duplicate)
- `similar-name-medium` - 70-85% similarity (review needed)
- `duplicate-function` - Same name and signature in multiple files
- `same-name-different-params` - Same name, different signatures

**Configuration**:
- `minSimilarity` - Minimum similarity to report (0-1)
- `warningThreshold` - Threshold for warning level
- `errorThreshold` - Threshold for error level
- `minFunctionLines` - Ignore short functions
- `minNameLength` - Ignore short names
- `ignorePatterns` - Regex patterns to ignore
- `ignoreFunctions` - Explicit function names to ignore

### similar-types

**Purpose**: Detect types with similar names that might cause confusion.

**Issues**:
- `similar-name-high` - Very similar type names
- `similar-name-medium` - Moderately similar names
- `duplicate-type` - Same type in multiple locations

**Configuration**:
- `minSimilarity` - Minimum similarity to report
- `ignorePatterns` - Patterns to ignore

### duplicate-strings

**Purpose**: Find repeated string literals that should be constants.

**Issues**:
- `repeated-string` - String appears multiple times
- `magic-string` - Unexplained string literal

**Configuration**:
- `minLength` - Minimum string length to check
- `minOccurrences` - Minimum occurrences to report
- `ignorePatterns` - Patterns to ignore (e.g., test strings)

### duplicate-logic

**Purpose**: Detect duplicated code patterns.

**Issues**:
- `duplicate-block` - Identical code blocks
- `similar-block` - Very similar code blocks

**Configuration**:
- `minBlockSize` - Minimum lines to consider
- `similarityThreshold` - Threshold for similar detection

### deprecation-check

**Purpose**: Find deprecated code past its removal date.

**Issues**:
- `past-removal-date` - Deprecation removal date has passed
- `approaching-removal` - Removal date approaching
- `missing-removal-date` - Deprecated without removal date

**Configuration**:
- `warningDays` - Days before removal to warn
- `requireRemovalDate` - Require removal dates on deprecations

### missing-docs

**Purpose**: Find exported symbols without documentation.

**Issues**:
- `missing-function-doc` - Exported function without JSDoc
- `missing-type-doc` - Exported type without documentation
- `missing-class-doc` - Exported class without documentation

**Configuration**:
- `requireExamples` - Require @example in docs
- `requireParams` - Require @param for all parameters

### orphaned-code

**Purpose**: Find internal code that's never used.

**Issues**:
- `unused-function` - Internal function never called
- `unused-type` - Internal type never referenced
- `unused-export` - Export never imported elsewhere

**Configuration**:
- `ignorePatterns` - Patterns for intentionally unused code
- `checkTests` - Include test files in analysis

### schema-collision

**Purpose**: Find conflicting schema or type definitions.

**Issues**:
- `conflicting-schema` - Same name, different shapes
- `shadowed-type` - Type shadows another in scope

**Configuration**:
- `schemaPatterns` - Patterns identifying schema files

## Default Rules

The plugin applies these severity rules by default:

```typescript
.rule(report.error, when.impact.atLeast(Impact.Major))
.rule(report.warn, when.impact.is(Impact.Minor))
.rule(report.info, when.impact.is(Impact.Trivial))
```

Users can override by adding rules after `.use(defaultLints)` (last wins).

## Issue Catalog Structure

Each linter defines an issue catalog mapping issue IDs to metadata:

```typescript
readonly catalog: IssueCatalog = {
  "linter-id/issue-code": {
    category: "maintainability",  // or correctness, consistency, etc.
    impact: "major",              // critical, major, minor, trivial
    description: "Human-readable description of the issue.",
  },
};
```

Categories:
- `correctness` - Code that may not work correctly
- `maintainability` - Code that's hard to maintain
- `consistency` - Code that violates project conventions
- `performance` - Code with performance issues
- `security` - Code with security concerns

Impact levels:
- `critical` - Must fix immediately
- `major` - Should fix soon
- `minor` - Nice to fix
- `trivial` - Low priority

## File Structure

```
viola-default-lints/
├── mod.ts                          # Plugin export + individual linter exports
├── deno.json                       # Package manifest
├── README.md                       # Usage documentation
├── LICENSE                         # MPL-2.0
├── docs/
│   ├── DESIGN.md                   # This file
│   └── TODO.md                     # Implementation tasks
├── .github/
│   ├── copilot-instructions.md
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
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
    └── test_utils.ts               # Shared test utilities

```

## Dependencies

- `@hiisi/viola` - Core runtime and types
- `@hiisi/flash-freeze` - Immutable data utilities
- `@std/assert` - Testing
- `@std/fs` - File system utilities
- `@std/path` - Path utilities

## Usage Patterns

### Full Plugin (Recommended)

```typescript
import { viola } from "@hiisi/viola";
import defaultLints from "@hiisi/viola-default-lints";

export default viola()
  .use(defaultLints)  // All linters + default rules
  .rule(report.off, when.in("**/*_test.ts"));  // Your overrides
```

### Linters Only (Custom Rules)

```typescript
import { viola, report, when, Impact } from "@hiisi/viola";
import { linters } from "@hiisi/viola-default-lints";

export default viola()
  .add(linters)  // Just linters, no default rules
  .rule(report.error, when.impact.atLeast(Impact.Critical));
```

### Individual Linters

```typescript
import { viola } from "@hiisi/viola";
import { typeLocationLinter, similarFunctionsLinter } from "@hiisi/viola-default-lints";

export default viola()
  .add(typeLocationLinter)
  .add(similarFunctionsLinter);
```

## Design Decisions

### Plugin Pattern

Uses `ViolaPlugin` interface for clean integration:

```typescript
const defaultLints: ViolaPlugin = {
  build(viola: ViolaBuilder): void {
    for (const linter of linters) {
      viola.add(linter);
    }
    // Apply default rules
    viola.rule(report.error, when.impact.atLeast(Impact.Major));
  }
};
```

### Singleton Linter Instances

Each linter is exported as a singleton instance:

```typescript
export const similarFunctionsLinter = new SimilarFunctionsLinter();
```

This ensures consistent behavior and allows state sharing if needed.

### Configuration via LinterConfig

Linters receive configuration through the standard `LinterConfig` interface:

```typescript
lint(data: CodebaseData, config: LinterConfig): Issue[] {
  const options = config.options as LinterOptions;
  // Use options with defaults
}
```

### Issue ID Format

Issue IDs follow the pattern `linter-id/issue-code`:

- `similar-functions/duplicate-function`
- `type-location/type-in-impl`

This allows targeted rule configuration:

```typescript
.rule(report.off, when.issue("similar-functions/*"))
.rule(report.error, when.issue("type-location/type-in-impl"))
```

## Testing Strategy

1. **Unit tests** for each linter in isolation
2. **Snapshot tests** for issue output format
3. **Integration tests** with real codebases
4. **Regression tests** for fixed bugs

Each linter should have corresponding `*_test.ts` file testing:
- Basic detection
- Configuration options
- Edge cases
- Error recovery

## Performance Considerations

1. **Lazy data extraction** - Only request needed data types
2. **Early filtering** - Skip files/symbols that don't match
3. **Efficient comparison** - Use optimized string similarity algorithms
4. **Caching** - Cache intermediate results within a lint run

## Future Enhancements

See TODO.md for planned improvements and additional linters.
