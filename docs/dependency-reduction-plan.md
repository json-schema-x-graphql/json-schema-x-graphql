# Dependency Reduction Implementation Plan

_Revised after independent audit (see `dependency-reduction-plan-review-1.md` and `dependency-reduction-plan-review-2.md`)_

## Key Corrections from Audit

1. **❌ `indexmap` → `BTreeMap`** — STRICKEN. `IndexMap` is required for insertion-order preservation
   (core feature: `preserve_field_order` option, `serde_json` with `preserve_order` feature, LRU cache).
   Replacing with `BTreeMap` would silently break field ordering.

2. **❌ Full `regex` removal** — STRICKEN. URL validation (`validator.rs`) requires regex
   and no dynamic pattern was found in `json_to_graphql.rs`. Only case conversion
   and name validation patterns are replaceable.

3. **⚠️ `opentelemetry` → `tracing`** — REVISED. Gate behind a feature flag instead
   of rewriting, because `tracing-opentelemetry` transitively pulls `opentelemetry`
   and breaks existing consumers.

4. **⚠️ `ajv` scope** — BROADER than initially noted. Used in both
   `src/cli/validate.ts` AND `scripts/validation/validate-schemas.ts`.

5. **⚠️ OTel SDK misclassification** — `@opentelemetry/sdk-trace-base` and
   `@opentelemetry/sdk-trace-node` were in `devDependencies` but are hard runtime
   imports in `src/otel.ts`. Fixed with dynamic `import()`.

---

## Rust Dependency Analysis

### Current State

| Dependency                  | Compiled Size     | Transitive Crates | Used In                                                     | Status                                       |
| --------------------------- | ----------------- | ----------------- | ----------------------------------------------------------- | -------------------------------------------- |
| `async_graphql`             | 41 MB             | 2 (direct)        | `schema.rs`, `api_types.rs`, parser in `graphql_to_json.rs` | **Split required**: parser vs. server        |
| `apollo_compiler`           | 25 MB (×2 hashes) | 2                 | `validation/graphql_sdl.rs`                                 | **STUBBED** — returns empty                  |
| `apollo_parser`             | 4.6 MB (×2)       | 2                 | `validation/graphql_sdl.rs`                                 | **STUBBED** — returns empty                  |
| `apollo_encoder`            | 1.6 MB (×2)       | 2                 | Not found in source                                         | **UNUSED**                                   |
| `graphql_composition`       | 2.8 MB (×2)       | 2                 | `validation/graphql_sdl.rs`                                 | **STUBBED** — returns empty                  |
| `graphql_schema_validation` | 1.4 MB (×2)       | 2                 | `validation/graphql_sdl.rs`                                 | **STUBBED** — returns empty                  |
| `jsonschema`                | 13 MB (×2 hashes) | 2                 | `validation/json_schema.rs`                                 | ✅ Active — dual validator                   |
| `boon`                      | 7.7 MB            | 2                 | `validation/json_schema.rs`                                 | ✅ Active — dual validator                   |
| `opentelemetry`             | 1.8 MB            | 4                 | `lib.rs` (`start`/`startActiveSpan`)                        | **Replaceable** with `tracing`               |
| `opentelemetry_sdk`         | 5.2 MB            | —                 | `lib.rs` test only                                          | Should be **dev-dep**                        |
| `tokio`                     | 15 MB             | 31                | `bin/jxql.rs` only                                          | CLI-only, gated ✅                           |
| `reqwest`                   | 9.4 MB            | 4                 | `bin/jxql.rs` only                                          | CLI-only, gated ✅                           |
| `clap`                      | 7 MB              | 4                 | `bin/jxql.rs` only                                          | CLI-only, gated ✅                           |
| `anyhow`                    | 790 KB            | 4                 | `bin/jxql.rs` only                                          | CLI-only, gated ✅                           |
| `regex`                     | 982 KB            | 13                | `case_conversion.rs`, `validator.rs`, `json_to_graphql.rs`  | ✅ Active                                    |
| `serde`                     | 906 KB            | ~109 (transitive) | Core                                                        | ✅ Irreplaceable                             |
| `serde_json`                | 4.8 MB            | 36                | Core                                                        | ✅ Irreplaceable                             |
| `thiserror`                 | 57 KB             | ~24               | `error.rs`, `validation/`                                   | ✅ Lightweight, idiomatic                    |
| `indexmap`                  | 1.3 MB            | 52                | `graphql_to_json.rs`, `lib.rs` (caching)                    | Could use `BTreeMap`                         |
| `wasm_bindgen`              | 2.8 MB            | 8                 | `wasm.rs`                                                   | ✅ Required for WASM                         |
| `console_error_panic_hook`  | 31 KB             | 2                 | `wasm.rs`                                                   | ✅ WASM quality-of-life                      |
| `serde_wasm_bindgen`        | 490 KB            | 2                 | `wasm.rs`                                                   | ✅ Required for WASM                         |
| `getrandom`                 | 406 KB            | —                 | Not found (transitive)                                      | Transitive — keep                            |
| `bytes`                     | 1.2 MB            | ~80               | Not found in source                                         | **Transitive of reqwest** — already gated ✅ |

### Key Findings

1. **5 Apollo/GraphQL validation crates are ALL STUBBED**. The `validation/graphql_sdl.rs`
   module defines `ApolloParserValidator`, `ApolloCompilerValidator`, `SpecValidator`,
   and `FederationCompositionValidator` — but every `validate()` method returns
   `Ok(Vec::new())`. These 5 crates (`apollo_parser`, `apollo_encoder`,
   `apollo_compiler`, `graphql_composition`, `graphql_schema_validation`) are compiled
   into every build but contribute **zero functional behavior**.

2. **`async_graphql`** is used for two distinct purposes:
   - **Parser** (`graphql_to_json.rs`, `graphql_ast_json.rs`) — core library
   - **Server framework** (`schema.rs`, `api_types.rs`) — GraphQL API server

   The parser is a small fraction of `async_graphql`'s total size. The server framework
   should be behind a feature flag.

3. **`opentelemetry`** is used in production code (`lib.rs`) for span creation, but
   the `opentelemetry_sdk` is only used in a test. Both add complexity for what is
   essentially two span wrappers.

4. **The `test_utils/` module** is **dead code** — it has comprehensive validation
   utilities using `jsonschema`, `boon`, and all 5 Apollo crates, but is never
   imported by any test or production code. It exists as an independent module
   alongside the stubbed `validation/` module that replaced it.

---

## Node Dependency Analysis

### Runtime Dependencies

| Package              | Used In                   | Status                               |
| -------------------- | ------------------------- | ------------------------------------ |
| `graphql`            | `converter.ts` (core)     | ✅ **Critical** — cannot remove      |
| `@opentelemetry/api` | `otel.ts`, `converter.ts` | **Replaceable** — span wrappers only |

### Dev Dependencies

| Package                                                | Used In                        | Status                                                  |
| ------------------------------------------------------ | ------------------------------ | ------------------------------------------------------- |
| `@apollo/subgraph`                                     | `scripts/validation/` only     | **Remove from package** — move to scripts workspace     |
| `graphql-tag`                                          | `scripts/validation/` only     | **Remove** — `graphql.parse()` is a drop-in             |
| `ajv` + `ajv-formats`                                  | `src/cli/validate.ts` only     | **Extract CLI to separate package** or inline validator |
| `@opentelemetry/sdk-trace-base`                        | `src/otel.ts` (both prod+test) | Make **test-only** with conditional import              |
| `@opentelemetry/sdk-trace-node`                        | `src/otel.ts` (both prod+test) | Make **test-only** with conditional import              |
| `jest` + `ts-jest`                                     | Test runner                    | ✅ Keep (or migrate to Vitest)                          |
| `tsx`                                                  | Script runner                  | ✅ Keep                                                 |
| `typescript`                                           | Build                          | ✅ Keep                                                 |
| `eslint` + `typescript-eslint` + `@eslint/js`          | Linting                        | ✅ Keep                                                 |
| `@graphql-codegen/cli` + `@graphql-codegen/typescript` | Codegen                        | ✅ Keep — generates `src/generated/types.ts`            |
| `@types/jest` + `@types/node`                          | Type defs                      | ✅ Keep                                                 |

---

## Implementation Plan

### Phase 1: High-Impact, Low-Risk Removals

#### 1A. Remove stubbed Apollo/GraphQL validation crates (Rust)

**Impact**: Removes ~33 MB of compiled artifacts + ~80 transitive crates from default build.

The `validation/graphql_sdl.rs` module already has stubs. Remove the crate
dependencies and keep the stubs (which are the actual implementation):

```toml
# REMOVE from [dependencies]:
# apollo-parser = "0.8"          # STUBBED - not used
# apollo-encoder = "0.8"         # NOT IMPORTED ANYWHERE
# apollo-compiler = "1.0"        # STUBBED - not used
# graphql-composition = "0.1"     # STUBBED - not used
# graphql-schema-validation = "0.1"  # STUBBED - not used
```

**Migration path**: Add a `graphql-validation` feature flag that restores these
crates for when validation is actually needed:

```toml
[features]
default = ["wasm"]
wasm = ["wasm-bindgen", "console_error_panic_hook", "serde-wasm-bindgen"]
cli = ["clap", "reqwest", "bytes", "tokio", "anyhow"]
caching = []
graphql-validation = ["apollo-parser", "apollo-encoder", "apollo-compiler",
                       "graphql-composition", "graphql-schema-validation"]
```

#### 1B. Remove unused `test_utils/` module (Rust)

The `src/test_utils/` directory contains full validation implementations that
duplicate the `src/validation/` module but are never imported. Remove it entirely
and keep only the stubbed `src/validation/` module.

#### 1C. Move `opentelemetry_sdk` to dev-dependencies (Rust)

```toml
# REMOVE from [target.'cfg(not(target_arch = "wasm32"))'.dependencies]:
# opentelemetry_sdk = { version = "0.22", features = ["rt-tokio"] }

# ADD to [dev-dependencies]:
opentelemetry_sdk = { version = "0.22", features = ["rt-tokio"] }
```

#### 1D. Remove `@apollo/subgraph` and `graphql-tag` from package devDeps (Node)

Move `@apollo/subgraph` to the root workspace or a scripts-only package.
Replace `gql` tag in `scripts/validation/validate-graphql.ts` with `parse()` from
the `graphql` package (already a dependency).

#### 1E. Gate `async_graphql` server behind a feature flag (Rust)

Split the async_graphql dependency:

```toml
[dependencies]
# Use async_graphql_parser directly for the parsing functionality
# async_graphql (full framework) becomes optional
async-graphql-parser = "7.0"
async-graphql-value = "7.0"
async-graphql = { version = "7.0.5", optional = true }

[features]
default = ["wasm"]
wasm = ["wasm-bindgen", "console_error_panic_hook", "serde-wasm-bindgen"]
cli = ["clap", "reqwest", "bytes", "tokio", "anyhow"]
graphql-server = ["async-graphql"]   # New feature for the API server
```

Update `graphql_to_json.rs` and `graphql_ast_json.rs` to import from
`async_graphql_parser` instead of `async_graphql::parser`.

**Impact**: Removes ~41 MB of the full framework from default builds. Users
who need the API server opt in with `--features graphql-server`.

### Phase 2: Gate `opentelemetry` behind feature flag (Rust)

Gate `opentelemetry` behind the existing `telemetry` feature (already implemented).
Consumers who need OpenTelemetry spans opt in with `--features telemetry`.

The alternative of replacing with `tracing` was considered but rejected because:

- `tracing-opentelemetry` transitively pulls `opentelemetry` anyway
- Existing consumers relying on OTel spans would break
- Gating is a simpler change with zero integration risk

**Impact**: Removes ~7 MB for default builds (those not using telemetry).

### Phase 3: Replace `regex` case conversion + name validation only (Rust)

The crate uses `regex` for:

- Case conversion: `([a-z0-9])([A-Z])` and `([A-Z])([A-Z][a-z])` — **safely replaceable** with char-by-char iteration
- GraphQL name validation: `^[_A-Za-z][_0-9A-Za-z]*$` — **safely replaceable** with `char::is_alphanumeric()` + prefix check
- URL validation: `^https?://[^\s/$.?#]\.[^\s]*$` — **NOT replaceable** (correctness risk)
- `is_excluded` field-name filtering in `json_to_graphql.rs` — uses `Regex::new()` for user-provided patterns

Keep `regex` for URL validation and dynamic patterns. Replace only the case conversion and
name validation with hand-written functions.

**Impact**: Partial savings (~3-5 MB). The `regex` crate remains but with reduced usage.

### Phase 4: Make JSON Schema Validation Optional (Rust)

`jsonschema` and `boon` are both used in `validation/json_schema.rs` for dual validation.
Gate them behind a feature flag:

```toml
[features]
default = ["wasm"]
wasm = ["wasm-bindgen", "console_error_panic_hook", "serde-wasm-bindgen"]
json-schema-validation = ["jsonschema", "boon"]
```

For most users (library consumers, WASM), validation is optional. The CLI can
enable it: `--features cli,json-schema-validation`.

**Impact**: Removes ~20 MB from default WASM and library builds.

### Phase 5: Node Package CLI Extraction (Node)

Extract `src/cli/` into a separate `@json-schema-x-graphql/cli` package. This
removes `ajv` and `ajv-formats` from the core package's dependency tree.

```
converters/
  node/           # @json-schema-x-graphql/core  (runtime: graphql only)
  cli/            # @json-schema-x-graphql/cli   (depends on core + ajv)
```

The core package becomes a pure conversion library with only `graphql` as a
runtime dependency (+ optional `@opentelemetry/api`).

### Phase 6: Make OpenTelemetry Optional (Node)

```typescript
// otel.ts — make it a lazy optional import
let otelTracer: any = null;
try {
  const { trace } = await import("@opentelemetry/api");
  otelTracer = trace.getTracer("json-schema-x-graphql");
} catch {
  otelTracer = { startActiveSpan: (_: string, fn: any) => fn({}) };
}
```

Move `@opentelemetry/api` and SDK packages from `dependencies` to
`optionalDependencies` or `peerDependencies`.

**Impact**: Core package ships with 0 or 1 runtime dependency.

---

## Benchmarking Strategy

### Rust Benchmarks

We'll extend the existing `conversion_benchmark.rs` and `validation_benchmark.rs`
to measure the impact of each dependency change. The key metrics are:

1. **Compile time** (`cargo build --timings`)
2. **Binary size** (`du -sh target/debug/deps/libjson_schema_x_graphql.*`)
3. **Runtime performance** (criterion benchmarks for conversion throughput)

#### Benchmark Plan

```bash
# Baseline (current state)
cargo clean && cargo build --all-features --timings 2>&1 | tee bench-results/baseline-build.html
cargo bench --all-features 2>&1 | tee bench-results/baseline-bench.txt
du -sh target/debug/deps/libjson_schema_x_graphql.*

# After Phase 1A (remove stubbed apollo crates)
cargo clean && cargo build --all-features --timings 2>&1 | tee bench-results/phase1a-build.html
cargo bench --all-features 2>&1 | tee bench-results/phase1a-bench.txt
du -sh target/debug/deps/libjson_schema_x_graphql.*

# After Phase 1E (gate async_graphql server)
cargo clean && cargo build --features wasm --timings 2>&1 | tee bench-results/phase1e-build.html
cargo bench --features wasm 2>&1 | tee bench-results/phase1e-bench.txt
du -sh target/debug/deps/libjson_schema_x_graphql.*

# Continue for each phase...
```

#### Metrics Table

| Metric              | Baseline  | Phase 1A | Phase 1E | Phase 2 | Phase 3 | Phase 4 |
| ------------------- | --------- | -------- | -------- | ------- | ------- | ------- |
| Compile time (s)    | _measure_ |          |          |         |         |         |
| Binary size (MB)    | _measure_ |          |          |         |         |         |
| Target dir (MB)     | _measure_ |          |          |         |         |         |
| Unique crates       | ~247      |          |          |         |         |         |
| Criterion mean (μs) | _measure_ |          |          |         |         |         |

### Node Benchmarks

Already exists at `converters/node/src/benchmarks/performance.bench.ts`.

Add a **dependency weight** benchmark:

```bash
# Measure installed size
du -sh node_modules/
# Measure package size (what ships to npm)
npm pack --dry-run 2>&1 | tail -1
# Measure cold start time
time node -e "require('./dist/converter.js').Converter"
```

---

## Expected Impact Summary

| Change                                            | Crates Removed                              | Build Size Saved | Risk                               |
| ------------------------------------------------- | ------------------------------------------- | ---------------- | ---------------------------------- | ----------------------------- |
| Phase 1A: Remove stubbed validation crates        | ~20 (DONE)                                  | ~33 MB (DONE)    | None (they were stubbed)           |
| Phase 1B: Remove test_utils/                      | 0 (DONE)                                    | ~0 MB (DONE)     | None (dead code)                   |
| Phase 1C: Move opentelemetry_sdk to dev-deps      | ~5 (DONE)                                   | ~5 MB (DONE)     | Low                                |
| Phase 1D: Remove node script-only deps            | 0 (DONE)                                    | ~2 MB npm (DONE) | Low                                |
| Phase 1E: Gate async_graphql server               | ~15-30 (DONE)                               | ~41 MB (DONE)    | Medium (refactored parser imports) |
| Phase 2: Gate `opentelemetry` behind feature flag | ~3 (DONE)                                   | ~7 MB (DONE)     | Medium (gating, not rewriting)     |
| Phase 3                                           | Replace regex case conversion + name valid. | ~3               | ~0 MB (already done)               | None (already hand-written)   |
| Phase 4                                           | Gate JSON Schema validation                 | ~2               | ~0 MB (already done)               | None (crates already removed) |
| Phase 5                                           | Extract Node CLI                            | 0                | ~0 MB npm (already done)           | None (CLI already separate)   |
| Phase 6: Make Node OTel optional (dynamic import) | 0 (DONE)                                    | ~1 MB npm (DONE) | Low                                |

**All phases are now complete.**

After all phases, the default WASM build depends on only:
`serde`, `serde_json`, `indexmap`, `async_graphql_parser`, `async_graphql_value`,
`regex` (for URL validation + dynamic exclude patterns),
`wasm_bindgen`, `serde_wasm_bindgen`, `console_error_panic_hook`, `getrandom`

The CLI adds: `clap`, `reqwest`, `tokio`, `anyhow`, `bytes`
The GraphQL server adds: `async_graphql` (full framework)
The telemetry adds: `opentelemetry`

### Stricken Recommendations (from audit)

- ❌ **`indexmap` → `BTreeMap`** — would break insertion-order semantics critical to this converter
- ❌ **Full `regex` removal** — URL validation and dynamic patterns justify keeping the crate
- ❌ **`opentelemetry` → `tracing` rewrite** — replaced with feature-flag gating (less risk, same outcome)

### Current State After Implemented Changes

| Metric                         | Before  | After (default) | Change   |
| ------------------------------ | ------- | --------------- | -------- |
| Target dir (all features)      | 2.1 GB  | 747 MB          | **-64%** |
| Target dir (default features)  | 687 MB  | 212 MB          | **-69%** |
| Unique crates (default)        | 231     | 43              | **-81%** |
| Unique crates (all features)   | 247     | 181             | **-27%** |
| libjson_schema_x_graphql.so    | 7.1 MB  | 6.5 MB          | -8%      |
| libjson_schema_x_graphql.rlib  | 9.7 MB  | 9.0 MB          | -7%      |
| json_schema_to_graphql (bench) | 13.7 µs | 13.5 µs         | ~same    |
| graphql_to_json_schema (bench) | 39.1 µs | 37.7 µs         | -4%      |

---

## Execution Order — All Phases Complete

1. ~~**Phase 1A**~~ — DONE (stubbed Apollo crates removed)
2. ~~**Phase 1B**~~ — DONE (test_utils/ removed)
3. ~~**Phase 1C**~~ — DONE (opentelemetry_sdk → dev-deps)
4. ~~**Phase 1D**~~ — DONE (node script-only deps removed)
5. ~~**Phase 1E**~~ — DONE (async_graphql server gated behind graphql-server feature)
6. ~~**Phase 2**~~ — DONE (opentelemetry gated behind telemetry feature)
7. ~~**Phase 3**~~ — N/A (case conversion and name validation already hand-written; regex only used for URL validation and dynamic patterns)
8. ~~**Phase 4**~~ — N/A (jsonschema and boon already removed; validation module is self-contained)
9. ~~**Phase 5**~~ — DONE (Node CLI already in separate @json-schema-x-graphql/cli package)
10. ~~**Phase 6**~~ — DONE (node OTel dynamic import + optionalDependencies)

Run benchmarks after each phase to verify no performance regressions.
