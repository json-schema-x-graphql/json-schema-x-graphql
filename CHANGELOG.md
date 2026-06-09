# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.0 (2026-06-09)


### Features

* add unified support for ESLint, Oxlint, Prettier, and Oxfmt ([87bb839](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/87bb8392e7d92aa2fe9c6d3a063a00c04a538456))
* add unified support for ESLint, Oxlint, Prettier, and Oxfmt ([ba55b7d](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/ba55b7d2d5fd4641a7d5fd4adf6992cfeb54fa29))
* **ci:** add comprehensive GitHub Actions publishing workflow ([8407e23](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/8407e23c7c9440245b32db9e1220b9932e6bf7ad))
* **ci:** Add comprehensive GitHub Actions publishing workflow ([c4a1802](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/c4a18028c96e31e2d4e5d4a7d3c945adf509e3d7))
* **editor:** hide voyager preview and show visualize tab only after generation ([1182955](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/118295584943a9096b84056c82bea8b466d30fb5))
* **editor:** remove redundant individual subgraph text box ([b323d76](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/b323d7674ecdb9c08c4eba64ccc1495920ad8fdc))
* **federation:** implement [@policy](https://github.com/policy) directive and organic composition drift validator ([f414f51](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/f414f51f50253855048949cef8e45fc3404943b7))
* **federation:** implement [@policy](https://github.com/policy) directive and organic composition… ([dbe2fd2](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/dbe2fd283b3ebcb0b35748a968bd6dd6a790946b))
* **frontend:** add federation ER diagram visualization to subgraph-composer ([34b0944](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/34b09441f56309be6e3ab69d36d7d1ab63b01faf))
* **frontend:** add federation ER diagram visualization to subgraph-composer ([4d5f902](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/4d5f90219713339299f504a525118ee611909e12)), closes [#20](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues/20)
* **frontend:** add graphql-voyager visualization to subgraph-composer ([f58c362](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/f58c362bc05926cbe72dd1fbe8f181c014165ecf))
* **frontend:** add graphql-voyager visualization to subgraph-composer ([3cd9371](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/3cd937190cdd58c2868ddcf4b12780b0c5a51650)), closes [#19](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues/19)
* **gateway:** add production-grade GraphQL Mesh in-memory gateway comparison ([7e98b4a](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/7e98b4abdd5a8228132f852f328ce1818bf74720))
* **gateway:** implement federated REST emulation & stitching gateway ([0749e08](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/0749e081e922907aed94740324a71738831c8dfc))
* **gateway:** implement federated REST emulation & stitching gateway ([c6ec618](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/c6ec618da6c381dd7f120dd0f2e9f66aad2ed767))
* **telemetry:** instrument tests and library methods with OpenTelemetry ([5231407](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/52314076c0883c55847e22017a3676c1e17f5227))
* **visual-editor:** add field-level bezier linkages and federation o… ([dc83766](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/dc837663f4d9de88199d61a35fa688454aab1426))
* **visual-editor:** add field-level bezier linkages and federation orchestration edges ([fbde7e5](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/fbde7e5bbae1a61fa2d51cd4427b9f4eacc68c05))


### Bug Fixes

* batch uncommitted security fixes and editor build updates ([13045ea](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/13045eaf2ac0e00cc68965a20658a6fd40bcda93))
* **ci:** Add pnpm-lock.yaml and run install from root in workflows ([9e387b4](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/9e387b4caeb87696c91e796c62b7e8e6de7cdf36))
* **ci:** address Copilot review feedback for release workflow ([a406a30](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/a406a30dc264b396753d464704e72f5443dea678))
* **ci:** fix rust formatting errors and resolve axios vulnerability ([f89d54d](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/f89d54dec89a7201f4eb48d7d32064cc6510f263))
* **ci:** pin release-please-action to tag v4 to resolve resolution error ([2a92344](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/2a923442689fc4d305fd19f1f30a914372c41f6a))
* **ci:** resolve CI failures from linter and missing script path ([d6b696a](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/d6b696a5e9d02fec9ef05866bbfe82bddadc1664))
* CodeQL escapes, remove tracked coverage, audit fixes ([045a8a4](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/045a8a4d0a96b9efaac8e2aad30c604e2506f2b8))
* CodeQL escapes, remove tracked coverage, audit fixes ([e96c74d](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/e96c74d7a0364b2ec9cc3dff9bca15f93dd2708d))
* CodeQL identity-replacement in esc(), remove spurious allowBuilds ([2f98224](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/2f982245f7e6d6c1db72f5b361858f40a6e2ea49))
* **converter:** circular reference protection and enhanced $ref resolution ([2a2dca7](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/2a2dca7a2e97b808f0c54a5838131feab42dbcb8))
* **converter:** circular reference protection and enhanced $ref resolution ([a63eefd](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/a63eefd18ac47c0d173ea1bf3d54f142b8a69db8))
* **deploy:** update editor base url and docs link for subpath deployment ([c5fd9c9](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/c5fd9c97994a80885ee95920d02c7d0a80948491))
* **deploy:** update editor base url and docs link for subpath deployment ([9c98964](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/9c98964600c3f826e02d7fec02628c1baae1476e))
* disable wasm-pack build script (broken postinstall 404) ([ff06e65](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/ff06e6592abc141a1e4511440e56eb77fa89c73e))
* **editor:** eliminate Maximum update depth exceeded infinite render loops ([e7ce618](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/e7ce618fd048bd471cadbd0f769e2fbb377224f7))
* **editor:** GitHub Pages base path, dev script, and ER diagram polish ([aa1a703](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/aa1a7038fd3a4f88dbac4662f77a38f1e910a0d1))
* **editor:** resolve layout clipping and statistics scrollbar bug ([33d1120](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/33d112021c58d9e9eedc3f540b1dcd781c8f42c3))
* **frontend:** address ER diagram review feedback ([5498df6](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/5498df6fe0e0f4448e251b7fa3988d4a6850547f))
* harden VoyagerPanel SDL prep, api-server body limit, remove debug logs ([de7d7a6](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/de7d7a61fe6363e7074e3360a7c8e1f7c351c9f1))
* **otel+security:** add Resource to spans, crypto.getRandomValues, trace compose(), fix dead code & CSS ([a935be7](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/a935be729c173f6c35d66bd41bdf4dc4c108135f))
* **pr-review:** address copilot feedback with dynamic template routing and esm dynamic imports ([c07b9c0](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/c07b9c03e2f4c2bffe24aa50e62f94cbd9d2bc68))
* **pr-review:** useless guard, unused vars, schemaDiff .then() on Set crash, landing page typo ([20ddf16](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/20ddf164fc8de276a67cb9015a212d4d5f67d6d2))
* regex escapes, unused vars, monaco tokenizer & security upgrades ([eb37f30](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/eb37f300553a8e09095fb11d5ad424e6d221936a))
* regex escapes, unused vars, monaco tokenizer & security upgrades ([1e47490](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/1e47490cab51a5a8d388d6e719a2e07f3fa01d0b))
* resolve all CI failures across 4 categories ([2b417ba](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/2b417ba455aaeffdd11edca3c3bb5c92194e047f))
* resolve all moderate+ audit vulnerabilities ([864ef0b](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/864ef0b8bb72ee9415173ab49bc61e53205d3a7f))
* resolve all moderate+ audit vulnerabilities ([8f973d8](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/8f973d8b56e91785d577c30d2340307e49badfe7))
* resolve CodeQL insecure randomness and format node package files ([fca0c31](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/fca0c31e849ad240da2ac8a1eb5a466cb093401b))
* resolve otel browser crashes, fix react 18/19 test mismatch, and lint errors ([84a602a](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/84a602a3923da7b3927fb8240d4fd83ff872e2da))
* resolve oxfmt/prettier formatting conflict ([5037aa0](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/5037aa05946d279c775ba4e16ba58c5815a9fdf6))
* resolve oxfmt/prettier formatting conflict ([fce6385](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/fce638521db2210adf89de94eed38f8079e4421f))
* resolve PR [#108](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues/108) CI failures and CodeQL alerts ([01b229b](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/01b229baebf5781fb6d445819c11311f113e1588))
* restore allowBuilds with proper boolean values, add esbuild/wasm-pack ([59054e6](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/59054e6b42e56f8acdfe786ab9217f829a9dd120))
* security audit — Dependabot/CodeQL findings, dead code, error handling ([849d705](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/849d7058f8ee67fc6f4c89d2998f0d4fc7acb533))
* security audit — Dependabot/CodeQL findings, dead code, error handling ([3f68e78](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/3f68e7808431cb73caa30c50c2d43e9da9200163))
* Security fixes and editor build updates ([2a39d74](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/2a39d747265c6f0646638c7dc1b30abc8a0b83c6))
* **subgraph-composer:** OTel instrumentation, SDL validation, scroll, security hardening ([e0c7a29](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/e0c7a2912a77e4f32448612bf3f868651745fa5e))
* **SubgraphEditor:** validate SDL not JSON, fix Statistics scroll overflow ([44ce260](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/44ce260118f9d9d726f46bb474a8d537b09e0ba3))


### Performance Improvements

* **ci:** Enable pnpm caching in validation workflow ([a781b5e](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/a781b5edcac89de762618ce9175dd72f0ae99f64))

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
