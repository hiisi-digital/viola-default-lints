# TODO - viola-default-lints

Convention linters plugin for the Viola convention linter.

## 🚨 CRITICAL: Test Fixes Required

The test suite has 29 failing tests due to two main issues:

### Issue 1: Issue `kind` Format Mismatch

Tests expect short codes like `type-outside-types` but linters emit the full qualified format `linter-id/issue-code` (e.g., `type-location/type-outside-types`).

**Root cause**: The `BaseLinter.issue()` method in viola core prefixes issue kinds with the linter ID:
```typescript
const kind = issueKind.includes("/") 
  ? issueKind 
  : `${this.meta.id}/${issueKind}`;
```

**Fix required**: Update all tests to use full qualified issue codes:
- [ ] `type-location_test.ts` - Change `type-outside-types` → `type-location/type-outside-types`
- [ ] `similar-functions_test.ts` - Change codes to `similar-functions/...`
- [ ] `similar-types_test.ts` - Change codes to `similar-types/...`
- [ ] `duplicate-strings_test.ts` - Change codes to `duplicate-strings/...`
- [ ] `orphaned-code_test.ts` - Change codes to `orphaned-code/...`
- [ ] `schema-collision_test.ts` - Change codes to `schema-collision/...`
- [ ] `deprecation-check_test.ts` - Change codes to `deprecation-check/...`

### Issue 2: Linter Behavioral Mismatches

Some test expectations don't match actual linter behavior:
- [ ] `duplicate-strings` - Detection threshold/logic differs from test expectations
- [ ] `orphaned-code` - Entry point handling (mod.ts, index.ts, main.ts) not working as expected
- [ ] `schema-collision` - Case-insensitive and exact match options not behaving as tested
- [ ] `similar-functions` - Similarity threshold calculations differ
- [ ] `similar-types` - Name similarity and structure comparison differ

**Fix approach**: 
1. First update all issue codes to full qualified format
2. Then run tests to see which behavioral tests still fail
3. Investigate each linter to determine if test or linter is wrong
4. Update tests OR fix linter logic accordingly

### Failing Tests Summary (29 total)

```
deprecation-check - case insensitive DEPRECATED detection
duplicate-strings - reports strings that appear multiple times
duplicate-strings - reports duplicates across files
duplicate-strings - does NOT ignore test files by default
duplicate-strings - does NOT ignore spec files by default
duplicate-strings - reports multiple distinct duplicate groups
orphaned-code - does not report exports from mod.ts
orphaned-code - does not report exports from index.ts
orphaned-code - does not report exports from main.ts
orphaned-code - treats re-exports as usage by default
orphaned-code - respects entryPointPatterns option
schema-collision - can disable case-insensitive checking
schema-collision - can disable exact match checking
schema-collision - non-exported types are not checked
similar-functions - reports functions with similar names (medium threshold)
similar-functions - reports similar functions across files
similar-functions - identical names in different files produces high similarity
similar-types - reports types with very similar names (high similarity)
similar-types - reports types with moderately similar names (medium similarity)
similar-types - same name but different structure produces same-name-different-structure
similar-types - violation has correct severity
similar-types - violation includes related locations
similar-types - violation includes suggestion
similar-types - violation has correct linter name
type-location - reports non-exported types outside types dir too
type-location - reports types outside types directories
type-location - reports multiple types in wrong location
type-location - reports interface outside types directory
type-location - reports functions in types/ directory
```

## ✅ Phase 1: Core Linters (COMPLETED)

### Linter Implementations
- [x] type-location - Types in types/ directories
- [x] similar-functions - Detect similar function names
- [x] similar-types - Detect similar type names
- [x] duplicate-strings - Find repeated string literals
- [x] duplicate-logic - Detect duplicated code patterns
- [x] deprecation-check - Find expired deprecations
- [x] missing-docs - Find undocumented exports
- [x] orphaned-code - Find unused internal code
- [x] schema-collision - Find conflicting schemas

### Plugin Structure
- [x] ViolaPlugin interface implementation
- [x] Default rules by impact level
- [x] Individual linter exports
- [x] Linters array export

## 🚧 Phase 2: Testing (IN PROGRESS)

### Test Infrastructure Fixes
- [ ] Update `expectCodes` helper OR update all tests to use full qualified issue codes
- [ ] Review test_utils.ts for any other assumptions about issue format
- [ ] Ensure CodebaseData mock factories match current viola core types

### Existing Tests (NEED FIXES)
- [ ] type-location_test.ts - Fix issue code format (5 failing)
- [ ] similar-functions_test.ts - Fix issue code format + behavior (3 failing)
- [ ] similar-types_test.ts - Fix issue code format + behavior (6 failing)
- [ ] duplicate-strings_test.ts - Fix issue code format + behavior (5 failing)
- [ ] deprecation-check_test.ts - Fix case sensitivity test (1 failing)
- [ ] orphaned-code_test.ts - Fix entry point handling tests (5 failing)
- [ ] schema-collision_test.ts - Fix option handling tests (3 failing)
- [x] test_utils.ts (shared utilities)

### Missing Tests
- [ ] similar-types_test.ts
  - [ ] Similar name detection
  - [ ] Duplicate type detection
  - [ ] Configuration options
  - [ ] Ignore patterns

- [ ] duplicate-logic_test.ts
  - [ ] Identical block detection
  - [ ] Similar block detection
  - [ ] Minimum block size filtering
  - [ ] Cross-file detection

- [ ] deprecation-check_test.ts
  - [ ] Past removal date detection
  - [ ] Approaching removal warning
  - [ ] Missing removal date
  - [ ] JSDoc @deprecated parsing

- [ ] missing-docs_test.ts
  - [ ] Missing function docs
  - [ ] Missing type docs
  - [ ] Missing class docs
  - [ ] requireExamples option
  - [ ] requireParams option

- [ ] orphaned-code_test.ts
  - [ ] Unused function detection
  - [ ] Unused type detection
  - [ ] Unused export detection
  - [ ] Ignore patterns

- [ ] schema-collision_test.ts
  - [ ] Conflicting schema detection
  - [ ] Type shadowing detection
  - [ ] Schema pattern configuration

### Test Fixtures
- [ ] Create comprehensive fixtures for each linter
- [ ] Edge case examples
- [ ] Configuration variant examples

## 📋 Phase 3: Linter Enhancements

### type-location
- [ ] Support for barrel files (index.ts re-exports)
- [ ] Allow inline types option
- [ ] Custom types directory patterns

### similar-functions
- [ ] Body similarity comparison (not just names)
- [ ] Cross-module duplicate detection
- [ ] Suggestions for consolidation locations

### similar-types
- [ ] Structural similarity comparison
- [ ] Generic type handling
- [ ] Intersection/union type analysis

### duplicate-strings
- [ ] Template literal support
- [ ] String concatenation detection
- [ ] Automatic constant extraction suggestions

### duplicate-logic
- [ ] AST-based comparison (not just text)
- [ ] Parameterized duplicate detection
- [ ] Refactoring suggestions

### deprecation-check
- [ ] Support for @since tags
- [ ] Migration path suggestions
- [ ] Deprecation timeline visualization

### missing-docs
- [ ] Documentation quality scoring
- [ ] Auto-generate doc stubs
- [ ] Link to related symbols

### orphaned-code
- [ ] Dead code elimination suggestions
- [ ] Usage graph visualization
- [ ] Safe removal verification

### schema-collision
- [ ] Schema versioning support
- [ ] Migration detection
- [ ] Breaking change analysis

## 📋 Phase 4: New Linters (Future)

### complexity-check
- [ ] Cyclomatic complexity
- [ ] Cognitive complexity
- [ ] Function length
- [ ] Parameter count

### naming-conventions
- [ ] Configurable naming patterns
- [ ] File naming rules
- [ ] Export naming consistency

### import-organization
- [ ] Import grouping rules
- [ ] Unused import detection
- [ ] Circular dependency detection

### test-coverage
- [ ] Untested exports
- [ ] Test file organization
- [ ] Test naming conventions

### security-patterns
- [ ] Hardcoded secrets detection
- [ ] Unsafe patterns
- [ ] Injection vulnerabilities

## CI/CD

- [x] CI workflow (thin wrapper to reusable)
- [x] Release workflow (thin wrapper to reusable)
- [ ] Add test coverage reporting
- [ ] Add linter benchmarks

## Documentation

- [x] README with usage examples
- [x] Individual linter documentation in code
- [ ] Configuration reference document
- [ ] Linter writing guide
- [ ] Migration guide from other linters

## Notes

### Current State

9 linters implemented with basic functionality. Main gaps:
1. **Testing** - Only 3 of 9 linters have test files
2. **Configuration docs** - Options not fully documented
3. **Advanced features** - Most linters are MVP implementations

### Design Principles

- Each linter is self-contained in its own file
- Tests live alongside implementation (*_test.ts)
- Linters should fail gracefully on malformed input
- Configuration should have sensible defaults

### Dependencies

Only these should be used:
- `@hiisi/viola` - Core runtime and types
- `@hiisi/flash-freeze` - Immutable data utilities
- `@std/assert` - Testing
- `@std/fs` - File system utilities (if needed)
- `@std/path` - Path utilities

Do not add new dependencies without explicit approval.

### Performance Targets

- Linter execution: <100ms per 1000 files
- Memory: <100MB for large codebases
- Startup: <50ms plugin initialization
