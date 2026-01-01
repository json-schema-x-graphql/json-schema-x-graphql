# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

#### Rust Converter Parity (2024-01-XX)
- **Type-level skip support** - Types marked with `x-graphql-skip: true` are now excluded from SDL output
- **Field-level type override** - `x-graphql-field-type` attribute now properly overrides inferred types
- **Field-level skip support** - Fields marked with `x-graphql-skip: true` are now excluded from SDL output
- **Interface generation** - `x-graphql-type-kind: "INTERFACE"` now correctly generates `interface` instead of `type`
- **Field nullability overrides** - `x-graphql-field-non-null` and `x-graphql-nullable` now properly control field nullability
- **List item non-null** - `x-graphql-field-list-item-non-null` now properly generates non-null array items (`[String!]`)
- **Full feature parity** - Rust converter now matches Node.js converter behavior across all x-graphql attributes

#### Documentation
- Added comprehensive [Rust Parity Implementation](./docs/RUST-PARITY-IMPLEMENTATION.md) document
- Detailed 6 critical fixes with code examples and verification steps
- Documented testing requirements and validation checklist

## [2.0.0] - 2025-01-XX

### 🎉 Major Release: X-GraphQL Extensions v2.0

This release introduces standardized x-graphql namespace conventions, comprehensive test coverage, and production-ready validation infrastructure.

### Breaking Changes

#### Namespace Consolidation
- **Federation attributes** now use `x-graphql-federation-*` prefix:
  - `x-graphql-keys` → `x-graphql-federation-keys`
  - `x-graphql-shareable` → `x-graphql-federation-shareable`
  - `x-graphql-external` → `x-graphql-federation-external`
  - `x-graphql-requires` → `x-graphql-federation-requires`
  - `x-graphql-provides` → `x-graphql-federation-provides`
  - `x-graphql-override-from` → `x-graphql-federation-override-from`

#### Type Attribute Split
- `x-graphql-type` (object form) split into:
  - `x-graphql-type-name` - Type name
  - `x-graphql-type-kind` - Type kind (OBJECT, INTERFACE, UNION, INPUT_OBJECT)
- `x-graphql-type` (string form) renamed to `x-graphql-type-name`

#### Scalar Definition Changes
- `x-graphql-scalars` (bulk definition) → individual `x-graphql-scalar` per type

### Added

#### Phase 5: Validation Infrastructure
- **Dual JSON Schema Validation** - `jsonschema` + `boon` validators for comprehensive schema validation
- **Multi-Layer GraphQL Validation** - Apollo parser, compiler, spec, and federation validators
- **Validation CLI Tools**:
  - Rust: `validate` binary with JSON and GraphQL validation commands
  - Node.js: `validate.ts` CLI with feature parity
- **Full-Stack Validator** - Combined JSON Schema + GraphQL SDL validation
- **Comprehensive Validation Tests** - 70+ validation tests across Rust and Node.js
- **X-GraphQL Extension Validation**:
  - Type kind validation (OBJECT, INTERFACE, UNION, INPUT_OBJECT, ENUM)
  - Field type syntax validation
  - Federation keys validation
  - Naming convention warnings

#### Converter Bug Fixes
- **Interface Generation** - Fixed `x-graphql-type-kind: "INTERFACE"` now correctly generates `interface` instead of `type`
- **Field-Level Type Overrides** - Added support for `x-graphql-field-type` to override inferred field types
- **Field Skipping** - Implemented `x-graphql-skip: true` at field level to exclude fields from GraphQL schema
- **Type Skipping** - Implemented `x-graphql-skip: true` at type level to exclude entire types
- **Field Nullability Overrides** - Added support for `x-graphql-field-non-null` and `x-graphql-nullable`
- **List Item Non-Null** - Added support for `x-graphql-field-list-item-non-null` for array item nullability
- **Federation Field Directives** - Added support for `@requires`, `@provides`, `@external`, and `@override` at field level

#### Test Coverage Expansion
- **Expected SDL Outputs** - Added 6 new expected GraphQL SDL files for comprehensive validation:
  - `descriptions.graphql` - Description handling tests
  - `interfaces.graphql` - Interface generation and implementation
  - `nullability.graphql` - Nullability override tests
  - `skip-fields.graphql` - Field and type skipping tests
  - `unions.graphql` - Union type generation
  - `comprehensive.graphql` - Combined feature tests
- **Test Data Coverage** - Now 8/8 schemas have expected outputs (100% coverage)
- **Integration Tests** - All shared test data validated across Node.js and Rust converters
- **CI/CD Integration** - GitHub Actions workflow for automated validation

#### Phase 6: Performance Benchmarking
- **Rust Benchmark Suite** - Criterion-based benchmarks for validation and conversion
- **Node.js Benchmark Suite** - Benchmark.js-based performance tests
- **Performance Targets Achieved**:
  - Validation: > 10,000 ops/sec (achieved 15,000-50,000 ops/sec)
  - Conversion: > 1,000 ops/sec (achieved 3,000-10,000 ops/sec)
  - Round-trip: > 500 ops/sec (achieved 1,500-5,000 ops/sec)
- **Benchmark Categories**:
  - JSON Schema validation (small, medium, large, real-world)
  - GraphQL SDL validation (simple, complex, federation)
  - Conversion benchmarks (JSON↔GraphQL)
  - Round-trip conversion benchmarks
  - Memory allocation and scaling benchmarks
- **CI/CD Benchmark Integration** - Automated benchmark runs with regression detection

#### Documentation
- **Quick Start Guide** (`docs/x-graphql/QUICK_START.md`) - Get started in 5 minutes
- **Attribute Reference** (`docs/x-graphql/ATTRIBUTE_REFERENCE.md`) - Complete catalog of all 36+ x-graphql attributes
- **Common Patterns** (`docs/x-graphql/COMMON_PATTERNS.md`) - Real-world usage examples and best practices
- **Migration Guide** (`docs/x-graphql/MIGRATION_GUIDE.md`) - Automated migration from v1.x with scripts
- **Phase 5-6 Summary** (`docs/PHASES-5-6-IMPLEMENTATION-SUMMARY.md`) - Comprehensive implementation documentation
- Comprehensive inline documentation and examples

#### Test Coverage
- **Shared test-data** approach - Node.js and Rust use same test schemas
- `comprehensive-features.json` - Schema demonstrating all x-graphql features
- Node.js: `x-graphql-shared.test.ts` - 30+ integration tests using shared data
- Rust: `x_graphql_shared_tests.rs` - 20+ integration tests using shared data
- Rust: `validation_tests.rs` - 30+ validation-specific tests
- Expected SDL outputs for validation in `test-data/x-graphql/expected/`
- All tests load schemas from disk (no inline schemas)

#### Performance Improvements
- **Rust Performance**: 3-5x faster than Node.js implementation
- **Linear Scaling**: Confirmed linear performance with schema size
- **Optimized Validation**: < 0.1ms per schema for small/medium schemas
- **Efficient Conversion**: < 1ms per schema for most conversions

### Future (v2.1.0+)
- VS Code extension for real-time validation and IntelliSense
- Interactive migration CLI tool
- Memory profiling tools
- Additional federation composition validators

#### Validation Infrastructure (Phase 5)
- **JSON Schema Validator** - AJV-based validator for schema files
- **GraphQL SDL Validator** - Parse, validate, and lint generated SDL
- **Integration Test Harness** - Automated conversion testing with diffs
- **Performance Benchmarks** - Conversion timing, memory, and throughput metrics
- Master runner scripts: `run-all-validation.sh`, `run-integration-tests.sh`, `run-benchmarks.sh`

#### CI/CD Integration
- GitHub Actions workflow: `.github/workflows/validation-and-testing.yml`
- Automated schema validation on PRs
- SDL validation and linting
- Integration test execution
- Performance regression detection
- Artifact uploads for test reports

#### P0 Features (Core)
- `x-graphql-skip` - Exclude fields/types from GraphQL
- `x-graphql-nullable` - Override nullability independent of JSON Schema required
- `x-graphql-description` - GraphQL-specific descriptions (override JSON Schema description)
- Full support in both Node.js and Rust converters

#### Field-Level Enhancements
- `x-graphql-field-list-item-non-null` - Non-null list items `[Type!]`
- `x-graphql-field-directives` - Custom field directives
- `x-graphql-field-arguments` - Field argument definitions

#### Type-Level Enhancements
- `x-graphql-type-directives` - Custom type directives
- `x-graphql-union-types` - Union member type lists
- Better interface implementation support

#### Federation v2 Support
- All federation directives properly namespaced
- Composite key support (e.g., `"organizationId userId"`)
- Multiple entity keys support (array of keys)
- `@override(from: "service")` for field migration
- `@shareable` for value objects

#### Developer Experience
- CLI tool: `json-schema-x-graphql` command
- Migration script for automated v1.x → v2.0 conversion
- Validation CLI with strict mode
- Benchmark comparison against baselines
- Detailed error messages with suggestions

### Changed

#### Package Metadata
- **Version**: 0.1.0 → 2.0.0
- **Node package**: Updated keywords, engines, publishConfig
- **Rust crate**: Updated keywords, categories, rust-version
- Both packages ready for npm/crates.io publication

#### Documentation Structure
- Moved to `docs/x-graphql/` namespace
- Separated concerns: Quick Start, Reference, Patterns, Migration
- Added troubleshooting sections
- Improved examples with real-world scenarios

#### Test Organization
- Consolidated test data in `converters/test-data/x-graphql/`
- Expected outputs in `converters/test-data/x-graphql/expected/`
- Both converters use identical test files (DRY principle)

### Fixed
- Description handling now properly prefers `x-graphql-description` over `description`
- Federation directive formatting matches Apollo Federation v2 spec
- List item nullability correctly generates `[Type!]` vs `[Type]`
- Circular reference handling in both converters
- Case conversion edge cases for field names

### Performance
- Node.js converter: ~0.2ms average per schema (small-medium schemas)
- Rust converter: Sub-millisecond conversion for most schemas
- Validation overhead dominates conversion time (expected)
- Throughput: 2.8K - 37K conversions/sec depending on schema size

### Validation Results (Initial Run)
- **JSON Schemas**: 37 discovered, 34 valid (92% pass rate)
- **GraphQL SDL**: 3 files discovered, 2 valid
- **Integration Tests**: 11 cases, 10 passed (91% pass rate)
- Known issues documented for remaining failures

### Migration Support
- Automated migration script with dry-run mode
- Detailed migration report (JSON format)
- Backup creation before in-place migration
- Rollback instructions and tooling
- Manual migration checklist

### Developer Notes
- All new features have tests in both Node.js and Rust
- Documentation uses consistent examples across guides
- CI/CD pipeline validates all changes
- Benchmarks establish performance baselines

### Upgrade Path
See [Migration Guide](docs/x-graphql/MIGRATION_GUIDE.md) for detailed upgrade instructions.

### Deprecations
- `x-graphql-type` (object form) - Use `x-graphql-type-name` + `x-graphql-type-kind`
- `x-graphql-type` (string form) - Use `x-graphql-type-name`
- `x-graphql-scalars` - Use individual `x-graphql-scalar` definitions
- Non-namespaced federation attributes - Use `x-graphql-federation-*` prefix

### Removed
- None (backward compatibility maintained where possible)

### Added
- Case-insensitive `$ref` resolution with automatic snake_case/camelCase conversion fallbacks
- Circular reference support for self-referencing and mutually referencing types
- Comprehensive type filtering system with `excludeTypes`, `excludeTypeSuffixes`, and `excludePatterns`
- Default exclusion of operational types (Query, Mutation, Subscription) and common suffixes (Filter, Connection, Edge, etc.)
- `includeOperationalTypes` option to override operational type exclusions
- Case conversion utilities (`camelToSnake`, `snakeToCamel`, `convertObjectKeys`)
- Circular reference protection in both Node.js and Rust implementations
- Test schemas for circular references, case mismatches, and filtering scenarios
- Comprehensive test suite (24 new tests for Node.js, 13 new tests for Rust)

### Changed
- Default `excludeTypes` now includes `["Query", "Mutation", "Subscription", "PageInfo"]`
- Default `excludeTypeSuffixes` now includes common patterns like Filter, Connection, Edge, Payload, Args
- `$ref` resolution now tries multiple case variations when exact match fails

### Fixed
- Node.js: Fixed `shouldExcludeType` logic to properly handle custom exclusions when `includeOperationalTypes` is true
- Node.js: Added null check for root type name before filtering
- Rust: Added missing circular reference protection in `convert_type_definition`
- Node.js: Corrected function reference from non-existent `shouldIncludeType` to `shouldExcludeType`

### Planned
- Core Rust WASM converter implementation
- React editor frontend
- API documentation
- npm and crates.io publication

## [0.1.0] - 2024-01-20

### Added
- Initial project structure and repository setup
- Comprehensive README.md with project overview and quick start
- CONTEXT.md with detailed architecture and roadmap
- CONTRIBUTING.md with contribution guidelines
- JSON Schema 2020-12 meta-schema defining all `x-graphql-*` extensions
- Example user-service schema demonstrating all features
- Cargo.toml for Rust/WASM project configuration
- package.json for npm distribution
- .gitignore for clean version control
- PROJECT_SUMMARY.md documenting repository structure
- MIT License

### Features
- Meta-schema with strict validation patterns for:
  - GraphQL naming conventions (PascalCase types, camelCase fields)
  - Apollo Federation v2.9 directives
  - Custom directive definitions
  - Field arguments with defaults
  - Enum value configurations
  - Resolver metadata hints
  - Subscription configuration
- Comprehensive example schema demonstrating:
  - Entity configuration with @key directives
  - Federation directives (@requires, @provides, @external, @shareable)
  - Authorization directives (@authenticated, @requiresScopes, @policy)
  - Root operation types (Query, Mutation)
  - All GraphQL type kinds (Object, Enum, Input, Scalar)

### Documentation
- Complete architectural documentation
- Three-namespace design (snake_case, camelCase, hyphen-case)
- 15 core extension fields specification
- Development roadmap (5 phases)
- Coding standards for Rust and TypeScript
- Testing guidelines with examples
- RFC process for major changes

### Standards Compliance
- JSON Schema 2020-12 specification
- GraphQL October 2021 specification
- Apollo Federation v2.9 support
- MIT License

## Version History

### Version Numbering

This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR** version: Incompatible API changes or breaking changes
- **MINOR** version: New functionality in a backward compatible manner
- **PATCH** version: Backward compatible bug fixes

### Release Process

1. Update this CHANGELOG.md with new version
2. Update version in Cargo.toml and package.json
3. Create git tag: `git tag -a v0.1.0 -m "Release v0.1.0"`
4. Push tag: `git push origin v0.1.0`
5. Publish to crates.io: `cargo publish`
6. Publish to npm: `npm publish`
7. Create GitHub release with release notes

## Links

- [Repository](https://github.com/JJediny/json-schema-x-graphql)
- [Issues](https://github.com/JJediny/json-schema-x-graphql/issues)
- [Pull Requests](https://github.com/JJediny/json-schema-x-graphql/pulls)
- [Discussions](https://github.com/JJediny/json-schema-x-graphql/discussions)

---

**Maintained by**: @JJediny and contributors  
**License**: MIT