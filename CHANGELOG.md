# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0](https://github.com/json-schema-x-graphql/json-schema-x-graphql/compare/v2.0.2...v2.1.0) (2026-10-05)


### 🎉 Features

* **converter:** Phase 1 core fixes, vocabulary extension, and tooling (review follow-ups included) ([69100a1](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/69100a1229a7823f242b637a81ab58a847394a3d))
* **schema:** add x-graphql-field-vocabulary and fix query argument SDL formatting ([#232](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues/232), [#235](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues/235)) ([ee07f5f](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/ee07f5f8ad82e01087554fb11ae31517652413f4))
* **tooling:** implement changelog, dprint, D2 export, and sync codegen types ([#11](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues/11), [#210](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues/210), [#211](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues/211), [#212](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues/212)) ([063403d](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/063403d80beed50ea0dd1bd627ba01abf8ca33fd))


### 🐛 Bug Fixes

* **ci:** align composer Vite plugin and vendor audits ([9c8f638](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/9c8f638e8264c56e03ad8e535da2f795a12ea5c0))
* **ci:** resolve beta clippy needless_bool and prettier format gate ([6cc16d2](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/6cc16d2f2dae0f5e28d81a1e13fa8f268128adb8))
* **converter:** close Node/Rust parity gaps found in review ([812ce2f](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/812ce2fbfe922e0690b1c43bcf6c0c6cc2a8c2f1))
* **converter:** emit root-level x-graphql-enums registry definitions ([60254a0](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/60254a00dd5b00aeeb6a362c0dc1832988fd19a7))
* **converter:** resolve lenient root pointers to the root type (parity with Rust) ([51e57a5](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/51e57a5fdbd49fc1af07ac986272099ec0ae91e0))
* **converter:** resolve nullability unions, array wrapping, root naming, and self-references ([#245](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues/245), [#234](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues/234), [#233](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues/233), [#231](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues/231), [#236](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues/236), [#237](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues/237)) ([27046ff](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/27046ff8cb8f90d155a2eb395188cb2c4d411c0b))
* **converter:** verbatim explicit names; shared scalar logic between engines ([c746e0d](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/c746e0dc0bdcc517032b210513e09c88f781be4c))
* **examples:** repair invalid identifiers in legacy reference SDL ([5308941](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/5308941341c3f53915f6eb7f7ea32cad01c84d06))
* **generator:** resolve CI schema paths ([b480acf](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/b480acf381222f642a8de81b70b7c4b8ee2ac205))
* **security:** broaden audit coverage and resolve generator paths ([daa07d1](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/daa07d1a180af8227e7f4da69a24cf18c5367324))
* **security:** expand dependency audit coverage ([4524ddf](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/4524ddf13eb8edc897459b7a33a75e259df094d7))


### 🏗️ Build System & Dependencies

* **deps:** bump next from 16.3.2 to 16.3.6 ([6496c8d](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/6496c8deaf762896148469953ea1a30ebbfbf848))
* **deps:** bump the dashboard-npm-dependencies group across 1 directory with 2 updates ([d9e264e](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/d9e264e8e7db1a1f5d4c84eb0d90511d62fdbe01))
* **deps:** bump the dashboard-npm-dependencies group across 1 directory with 2 updates ([26f386c](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/26f386ce9f02d32676ffea676f3561801c7ed1d7))
* **deps:** clear resolvable Dependabot npm advisories ([6e6709b](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/6e6709bd9391716ac74ee4463a74d2cee46cf901))
* **deps:** complete nested workspace security remediation ([4441eae](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/4441eae4098edcd0624c97be91caf01107391aa6))
* **deps:** drop unused ajv-cli/json-schema-to-graphql-types dev deps ([f90c888](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/f90c888dfa437a26316f4a295963382af1b69515))
* **deps:** override http-cache-semantics to clear GHSA-ch52-4w7c-c8xp ([7c05819](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/7c05819f123c41ab8cf89b59a85cf18a897babd1))
* **deps:** refresh pnpm lockfiles to clear resolvable Dependabot advisories ([1eb6d5f](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/1eb6d5f5621c3232bd0269f8af8c7c810725facc))
* **deps:** sync nested workspace security floors; clear 86 advisories ([0d6840e](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/0d6840ea151b62dabe11f37e71d01e9c9d41090a))
* **deps:** update GitHub Actions dependencies ([00ac026](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/00ac026682f5fe68daaab79c96cca7c9e393acc3))
* **deps:** update workspace npm dependencies ([7022c4c](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/7022c4c9617e242697a7a515a9f7b7ecfaf3cf0e))
* **deps:** update workspace overrides and remediate 34 security audit vulnerabilities ([1bd43db](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/1bd43dbfb6264d58236229d2744aa32d32ef68be))
* **tooling:** fix changelog generation and document vocabulary extension ([c12c379](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/c12c379ee7e17c9716db2bfe6f07a608666d5fc3))
* **tooling:** scope dprint to maintained SDL and drop orphaned mirror ([80a3c38](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/80a3c38927eee186a730221efd5902c206d536dd))

## [2.0.2] - 2026-09-28

### Security

- **rustls (RUSTSEC-2026-0049):** Upgraded `rustls` to 0.23.45, `aws-lc-rs` to 1.18.1, and `aws-lc-sys` to 0.45.0 in `Cargo.lock`. Security audit passes with zero vulnerabilities (`--deny warnings --deny unmaintained --deny unsound --deny yanked`).
- **devalue (GHSA-9rgm-9g3h-6x36):** Enforced `devalue: 5.9.4` via workspace overrides to address prototype pollution vulnerability in Vite and SvelteKit toolchains.
- **@xmldom/xmldom:** Added override `"@xmldom/xmldom@<0.9.12": ^0.9.12` to prevent vulnerable transitive resolutions.

### Changed

- **Consolidated Dependabot upgrades:**
  - Bumped GitHub Actions dependencies across all workflows (PR #257).
  - Bumped Cargo dependencies `opentelemetry` and `opentelemetry_sdk` to `0.33.0` (PR #259).
  - Bumped dashboard dependencies (PR #260).
  - Bumped workspace npm dependencies (PR #261).
- **Build system:**
  - Configured `@parcel/watcher` in `onlyBuiltDependencies` and `allowBuilds` in `pnpm-workspace.yaml` for pnpm v11 compatibility.
  - Aligned `@vitejs/plugin-react` to `^5.2.0` in `frontend/subgraph-composer` for compatibility with Vite 6.
  - Maintained Nextra 3 compatibility for `website` on Next 15 and React 18.

## [2.0.1] - 2026-09-13

### Changed

- **Release pipeline overhaul.** `release.yml` now produces a tagged, signed, SBOM-attested release for the Rust `jxql` CLI, the Node CLI bundles, _and_ the WASM bundle. Every binary carries a Sigstore-signed SLSA build-provenance attestation (`.intoto.jsonl`). CycloneDX JSON+XML SBOMs are generated for the Rust crate; CycloneDX JSON + SPDX JSON SBOMs are generated for both Node workspaces (`@cyclonedx/cdxgen`); a combined `SHA256SUMS.txt` and a `RELEASE_NOTES.md` are attached to the GitHub Release. See [scripts/release-build.sh](scripts/release-build.sh) for the locally-runnable equivalent.
- **release-please configuration.** release-please now manages both Node packages (`@json-schema-x-graphql/core`, `@json-schema-x-graphql/cli`) in lockstep with the root crate. The release-please workflow tolerates the org-level policy that blocks `GITHUB_TOKEN` PR creation, and falls back gracefully when no `RELEASE_PLEASE_TOKEN` is configured (#249, #250).
- **Dependency housekeeping.** `csv-parse` bumped 5.6.0 → 7.0.2, GitHub Actions dependency groups, dashboard & workspace npm groups, and `simd-json` (Rust) updated. Pre-existing yanked crates (`chacha20`, `quinn-proto`) remediated. Security audit reintroduced `--deny yanked` with all transitive issues resolved.

### Fixed

- **Rust crate:** `cargo build --bin jxql` now passes `--features cli` (the binary is `required-features = ["cli"]`). Workspace-root-anchored artifact paths.
- **Node CLI bundles:** `pnpm install --frozen-lockfile` is now run before per-package builds so `node_modules` is populated for `pnpm --filter`.
- **`secrets.CRATES_TOKEN` → `secrets.CARGO_TOKEN`** (the latter exists in the repo; the former was a phantom). Removed the redundant `cargo login` step.

## [Unreleased]

### Security

- Updated the documentation website to Next.js 16.3.8 and aligned the Nextra and React dependency set with its compatible, patched releases.
- Expanded production dependency audits to every independently locked pnpm workspace and enabled recursive submodule checkout for the security audit workflow.

### Fixed

- Corrected subgraph SDL generator path resolution for CI-style relative schema paths. Generated SDL is now written only beneath `frontend/dashboard`, never `scripts/src/data`.
- Updated dashboard subgraph generation commands to use the canonical hyphenated schema filenames.

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
