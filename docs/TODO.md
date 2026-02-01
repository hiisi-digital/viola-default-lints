# TODO - viola-default-lints

Convention linters plugin for the Viola convention linter.

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

### Existing Tests
- [x] type-location_test.ts
- [x] similar-functions_test.ts
- [x] duplicate-strings_test.ts
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
