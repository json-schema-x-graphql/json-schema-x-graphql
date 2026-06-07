Now I have a comprehensive understanding of both the branch's proposed changes and the actual codebase. Let me now compose my independent audit and analysis.

Key findings from my audit:

## Rust Side

1. **`apollo_encoder` (0.8.0)** — **LITERALLY UNUSED**. `grep -rn "apollo_encoder"` across all Rust source returns zero results. The plan correctly identifies this for removal.

2. **Apollo validation crates** (`apollo-parser`, `apollo-compiler`, `graphql-composition`, `graphql-schema-validation`) — **ALL STUBBED**. The `validation/graphql_sdl.rs` module defines validators whose `validate()` methods all return `Ok(Vec::new())`. These dependencies are compiled but contribute zero functional value. However, there's a subtlety: the `test_utils/graphql_validation.rs` module has actual working implementations that USE these crates. But as the plan correctly notes, `test_utils/` is dead code (never imported by any test or production code).

3. **`async_graphql`** is used for:
   - Core parsing in `graphql_to_json.rs` and `graphql_ast_json.rs` — imports `async_graphql::parser::*`
   - Server framework in `schema.rs` and `api_types.rs` — uses `Schema`, `SimpleObject`, `InputObject`, etc.
   The plan suggests splitting: use `async-graphql-parser` directly and gate the full framework. This is reasonable but there's a risk — `async-graphql-parser` and `async-graphql-value` may not be independently versioned/stabilized the same way. I should note this.

4. **`opentelemetry`** — used in `lib.rs` for two trivial span wrappers. The plan suggests replacing with `tracing`. This is reasonable but may be over-engineering if the spans are genuinely useful for OTel integration.

5. **`regex`** — the plan acknowledges it IS actively used (case conversion, GraphQL name/type validation, URL validation, dynamic patterns in `json_to_graphql.rs`). Replacing it is mentioned as Phase 3 but acknowledged as medium risk. The case conversion and name validation replacements are trivial; the URL and dynamic pattern replacements are more questionable.

6. **`indexmap`** — the plan suggests replacing with `BTreeMap`, but `indexmap` is used extensively in `graphql_to_json.rs` for field order preservation. Since preserving field order is a core feature, `IndexMap` (which preserves insertion order) is exactly right. `BTreeMap` (sorted order) would be WRONG for this use case. This is a critical oversight in the plan.

7. **`jsonschema` and `boon`** — used in `validation/json_schema.rs` for dual validation. The plan suggests gating behind a feature flag. This is reasonable but the default should probably include it since validation is on by default in `ConversionOptions`.

## Node Side

1. **`@apollo/subgraph`** — used ONLY in `scripts/validation/validate-graphql.ts` via `buildSubgraphSchema`. The plan says to move to a scripts-only package. Reasonable, but note the scripts are outside the `converters/node/` package boundary so moving to a separate package is the right approach.

2. **`graphql-tag`** — used in the same script just for `import gql from "graphql-tag"`. The plan notes `graphql.parse()` is a drop-in replacement. This is correct — all `gql` does is parse template literals into AST, and `graphql.parse()` does the same.

3. **`ajv` + `ajv-formats`** — used in TWO places: `scripts/validation/validate-schemas.ts` (the script-level validator) AND `src/cli/validate.ts` (the package's CLI). The plan only mentions `src/cli/validate.ts`. The script-level usage would also need to be addressed.

4. **`@opentelemetry/api`** — runtime dependency. The plan identifies it can be made optional. The analysis is correct — the core conversion logic doesn't need tracing.

5. **`@opentelemetry/sdk-trace-base` and `@opentelemetry/sdk-trace-node`** — currently in devDependencies but used in `src/otel.ts` which is imported by `src/converter.ts` at runtime. This means the SDK is a hard runtime dependency, not a dev dependency. The plan's recommendation to make it truly optional with conditional imports is correct.

## Plan Quality Assessment

### Good recommendations:
- Phase 1A: Remove stubbed Apollo crates — excellent, zero risk, confirmed unused
- Phase 1B: Remove dead `test_utils/` — excellent
- Phase 1C: Move `opentelemetry_sdk` to dev-deps — good, it's only used in a test in `lib.rs` (I verified this)
- Phase 1D: Remove unused Node dev deps — good, `graphql-tag` is redundant, `@apollo/subgraph` should be moved

### Questionable recommendations:
- Phase 1E: `indexmap` → `BTreeMap` — **WRONG**. `IndexMap` preserves insertion order which is critical for `graphql_to_json.rs` field order preservation. `BTreeMap` would sort alphabetically, destroying semantic field ordering.
- Phase 3: Replace `regex` — questionable cost/benefit. The `regex` crate is well-maintained, thoroughly tested, and the replacements introduce hand-rolled code that may have edge cases. For URL validation especially, a hand-rolled regex is likely less correct than the existing one. However, the GraphQL name validation and case conversion replacements are reasonable.
- Phase 2: OTel → tracing — valid but may break existing OTel integrations. The plan correctly notes `tracing-opentelemetry` bridge exists.

### Missed recommendations:
- `indexmap` is also used for the LRU cache in `lib.rs` (which is under `#[cfg(feature = "caching")]`). The `BTreeMap` replacement wouldn't work for the LRU cache either (need insertion order for eviction).
- The plan doesn't discuss WASM binary size impact. Many of these crates may already be stripped during WASM optimization (wasm-opt).
- The plan suggests `--all-features` for benchmarks, but `--all-features` would enable `cli` which pulls in `tokio`, `reqwest`, etc. This would skew benchmarks.

Let me now write up a comprehensive audit.
</thinking>

Now I have all the data I need. Let me compile the comprehensive audit.

---

# Independent Audit: Dependency Reduction Plan for `json-schema-x-graphql`

**Branch**: `glm-5.1-converter-refactor` | **Commit**: `d7f4f1d` — _"goal reduce package dependencies"_  
**Auditor**: Independent review against live codebase at `HEAD`

---

## 1. Scope of the Branch

The branch makes only two non-documentation changes:

| File | Change |
|---|---|
| `.cargo/config.toml` | New — consolidates build artifacts into a single `target/` directory |
| `Cargo.toml` (root) | Adds `[profile.dev]` / `[profile.test]` with `debug = 1` (line-tables only) + `debug = 0` for dep packages |
| `package.json` (root) | Bumps `pnpm` from `11.0.9` → `11.5.2` |

The substantive analytical work is in **`docs/dependency-reduction-plan.md`** — a 372-line implementation plan proposing to remove ~50 crates and ~120 MB of build artifacts across 6 phases.

---

## 2. Rust Dependency Audit — Finding-by-Finding Verification

### 2.1 Apollo/GraphQL Validation Crates: **CONFIRMED STUBBED**

I traced every `use` statement and every `validate()` implementation:

```
converters/rust/src/validation/graphql_sdl.rs:
  - ApolloParserValidator::validate()        → Ok(Vec::new())   [line 146]
  - ApolloCompilerValidator::validate_with_federation() → Ok(Vec::new()) [line 170]
  - SpecValidator::validate()               → Ok(Vec::new())   [line 193]
  - FederationCompositionValidator::validate() → Ok(Vec::new()) [line 216]
```

Zero imports of `apollo_parser`, `apollo_compiler`, `graphql_composition`, or `graphql_schema_validation` exist anywhere in `src/`. The `src/test_utils/graphql_validation.rs` file (lines 146-250) **does** have working implementations using these crates, but `test_utils/` is never imported by any test or production code — confirmed with `grep -rn "test_utils"` excluding the `test_utils/` directory itself, which returns zero matches.

**`apollo_encoder`** (0.8.0) is particularly damning: `grep -rn "apollo_encoder" converters/` returns **zero results** across all Rust source. It is literally unused, period.

**Verdict**: ✅ Phase 1A is correct. These 5 crates can be removed unconditionally. The plan's suggestion to add an opt-in `graphql-validation` feature flag for future re-enablement is prudent.

### 2.2 `async_graphql` Dual-Use: **CONFIRMED, BUT WITH NUANCE**

Usage breakdown confirmed:

| File | What it imports | Purpose |
|---|---|---|
| `graphql_to_json.rs` | `async_graphql::parser::*` | Core parsing |
| `graphql_ast_json.rs` | `async_graphql::parser::*` | AST → JSON |
| `schema.rs` | `async_graphql::{Schema, ...}` | API server |
| `api_types.rs` | `async_graphql::{Enum, InputObject, SimpleObject}` | API types |

**Risk assessment for Phase 1E (split parser from server)**:

The plan suggests replacing `async_graphql` with `async-graphql-parser` + `async-graphql-value` as direct deps, and gating the full framework behind a `graphql-server` feature. This is architecturally sound **but has a dependency stability concern**:

- `async-graphql-parser` and `async-graphql-value` are internal sub-crates of the `async-graphql` workspace. They are published to crates.io but their API stability guarantees are weaker than the main `async-graphql` crate.
- The `async_graphql::parser` module re-exports `async-graphql-parser` types. The conversion is a drop-in import change (`async_graphql::parser::types::*` → `async_graphql_parser::types::*`), but if the sub-crate introduces a breaking change, the main crate might absorb it while direct dependents break.

**Mitigation**: Pin to the same version as the current `async_graphql` (7.0.5) and add a CI check that verifies the parser sub-crate version matches.

**Verdict**: ✅ Phase 1E is correct but carries medium risk. Worth doing for the ~41 MB savings.

### 2.3 `indexmap` → `BTreeMap`: **INCORRECT — CRITICAL FLAW**

The plan states:

> Could use `BTreeMap`

This is **wrong** for this codebase. `IndexMap` is used in `graphql_to_json.rs` for:

```rust
let type_registry: IndexMap<String, TypeDef> = doc...  // line 26
let arguments = IndexMap::new();                         // line 350
let mut properties = IndexMap::new();                    // line 483
```

These structures preserve **insertion order**, which is semantically meaningful — GraphQL SDL fields have a defined order, and "preserve field order" is an explicit `ConversionOption`. `BTreeMap` would sort alphabetically, destroying the field ordering that users expect. This is not a cosmetic issue; it would constitute a **silent behavioral regression**.

Additionally, the LRU cache in `lib.rs` uses `IndexMap` because it needs both O(1) lookup and insertion-order iteration for eviction — `BTreeMap` cannot serve as an LRU.

**Verdict**: ❌ The `indexmap` → `BTreeMap` recommendation should be **stricken**. `IndexMap` is purpose-built and well-maintained. Its 1.3 MB compiled size is justified.

### 2.4 `regex` Replacement: **PARTIALLY CORRECT, OVERSTATED BENEFIT**

Usage breakdown:

| Location | Pattern | Replacement feasibility |
|---|---|---|
| `case_conversion.rs:20` | `([a-z0-9])([A-Z])` and `([A-Z])([A-Z][a-z])` | ✅ Trivial — char-by-char iteration |
| `validator.rs:9-21` | GraphQL name/type/URL validation | ⚠️ Mixed — name validation is simple char-class check; URL is complex |
| `json_to_graphql.rs:1651` | Dynamic `regex::Regex::new(pattern)` | ❌ Cannot replace — user-provided patterns at runtime |

The plan acknowledges keeping `regex` behind a feature flag for the dynamic case. The ~12 MB claimed savings is for `regex` + `regex_automata` + `regex_syntax` combined, but `regex_automata` may already be shared with other dependencies.

**Risk**: Hand-rolling URL validation introduces subtle correctness issues (IDN, IPv6 in URLs, fragment handling). The `regex` crate is maintained by the Rust library team and is thoroughly fuzzed. The case conversion replacement is safe and worth doing. The name validation replacement is safe. The URL validation replacement is **not** worth the correctness risk.

**Verdict**: ⚠️ Phase 3 is partially valid but overstates the benefit. Keep `regex` for URL validation and dynamic patterns. Only replace case conversion and name validation.

### 2.5 `opentelemetry` → `tracing`: **VALID BUT PREMATURE**

Current usage in `lib.rs` (lines 142-164):

```rust
use opentelemetry::trace::Tracer;
let tracer = opentelemetry::global::tracer("json-schema-x-graphql");
let _span = tracer.start("json_schema_to_graphql");
```

This is two span wrappers — trivially replaced by `#[instrument]`. However:

- `tracing` does **not** produce OpenTelemetry spans without `tracing-opentelemetry`. If any consumer currently relies on the OTel spans for distributed tracing, replacing wholesale would break them.
- `tracing-opentelemetry` itself pulls in `opentelemetry` + `opentelemetry_sdk` transitively, so the net dependency reduction may be smaller than claimed.

**Better approach**: Gate the existing `opentelemetry` usage behind a feature flag (like `telemetry`) and make it opt-in. Don't rewrite in `tracing` unless there's a concrete need.

**Verdict**: ⚠️ Phase 2 is architecturally valid but carries integration risk. Consider gating instead of rewriting.

---

## 3. Node Dependency Audit — Finding-by-Finding Verification

### 3.1 `@apollo/subgraph` and `graphql-tag`: **CONFIRMED SCRIPT-ONLY**

```typescript
// scripts/validation/validate-graphql.ts (lines 12-14)
import { buildSubgraphSchema } from "@apollo/subgraph";
import gql from "graphql-tag";
```

These are **not** imported by any file in `converters/node/src/`. They are used exclusively in `scripts/validation/validate-graphql.ts`, which is outside the package boundary.

**`graphql-tag` replacement**: The plan notes `graphql.parse()` is a drop-in. Verified — both produce the same `DocumentNode`. The script already imports `parse` from `graphql` (line 12), so `gql` is indeed redundant.

**Verdict**: ✅ Phase 1D is correct and low risk. Move `@apollo/subgraph` to a scripts workspace package. Replace `gql` with `parse()`.

### 3.2 `ajv` + `ajv-formats`: **DUAL USAGE NOT FULLY CAPTURED**

The plan identifies usage in `src/cli/validate.ts` **but misses** that these are ALSO used in `scripts/validation/validate-schemas.ts` (lines 12-13, 56-71). This script-level usage means:

- Removing `ajv` from the package's `devDependencies` would break `scripts/validation/validate-schemas.ts` unless it also moves to a separate package.
- The plan's Phase 5 (extract CLI) only addresses `src/cli/`. The script-level validator needs the same treatment.

**Verdict**: ⚠️ Phase 5 is correct in intent but incomplete in scope. The `scripts/validation/validate-schemas.ts` usage needs to be factored into the extraction plan.

### 3.3 OpenTelemetry SDK as "dev dependency": **MISCLASSIFIED**

The plan lists `@opentelemetry/sdk-trace-base` and `@opentelemetry/sdk-trace-node` as dev dependencies, but `src/otel.ts` (lines 1-6) imports them unconditionally:

```typescript
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { SimpleSpanProcessor, InMemorySpanExporter } from "@opentelemetry/sdk-trace-base";
```

This module is imported by `src/converter.ts` (line 43), making these **hard runtime dependencies** despite being listed under `devDependencies` in `package.json`. The guard at lines 12-16 checks for Node environment at import time, but the imports themselves execute regardless.

The plan's Phase 6 (dynamic `import()`) correctly identifies this issue and the fix: use a lazy `await import()` so the SDK is never loaded in browser/WASM contexts.

**Verdict**: ✅ Phase 6 correctly identifies the real problem — the SDKs are misclassified and loaded unconditionally. Dynamic import is the right fix.

### 3.4 `@opentelemetry/api` as runtime dependency: **LOW IMPACT TO REMOVE**

The `@opentelemetry/api` package is ~40 KB and is the ONLY non-`graphql` runtime dependency. Making it optional would achieve the "0 or 1 runtime dependency" goal. However, since `graphql` itself is ~600 KB, the relative savings are minor (~6%).

**Verdict**: ✅ Phase 6 is architecturally clean but low material impact. Worth doing for the principle of minimizing the API surface.

---

## 4. The Branch's Actual Changes — Are They Correct?

The three file changes on the branch are sound and independent:

### `.cargo/config.toml`
```toml
[build]
target-dir = "target"
```
Consolidates Cargo build output. The plan cites "~589 MB in a separate target dir" for `converters/rust/target/`. Current measurement shows 1.1 GB in the single `target/` and the `converters/rust/target/` was already cleaned up. This is a **no-brainer** — reduces disk usage and avoids recompiling shared dependencies between workspace members.

### `Cargo.toml` profile changes
```toml
[profile.dev]
debug = 1        # line-tables-only
[profile.dev.package."*"]
debug = 0        # skip deps
```
This is the standard Rust optimization for faster dev iteration. `debug = 1` provides enough info for backtraces while dramatically reducing binary size and compile time. `debug = 0` for dependencies is safe — you rarely need to step into `serde` internals during debugging.

### `package.json` pnpm version bump
`11.0.9` → `11.5.2` is a patch-range bump with no breaking changes.

**Verdict**: All three changes are correct, low-risk, and independently valuable.

---

## 5. Recommended Execution Order (Revised)

Based on the audit findings, here is the corrected order:

| # | Phase | Risk | Impact | Audit Note |
|---|---|---|---|---|
| **1** | Remove stubbed Apollo crates + `apollo_encoder` | ✅ None | ~33 MB | Zero risk, confirmed unused |
| **2** | Remove dead `test_utils/` module | ✅ None | ~0 MB | Confirmed never imported |
| **3** | Move `opentelemetry_sdk` to dev-deps | ✅ Low | ~5 MB | Only used in test at lib.rs:258 |
| **4** | Remove `graphql-tag`, move `@apollo/subgraph` to scripts package | ✅ Low | ~2 MB npm | `gql` → `parse()` confirmed drop-in |
| **5** | Gate JSON Schema validation behind feature flag | ✅ Low | ~20 MB | Default should remain ON |
| **6** | Node: dynamic import for OTel SDK | ✅ Low | ~1 MB npm | Fixes SDK misclassification |
| **7** | Gate `async_graphql` server behind feature flag | ⚠️ Medium | ~41 MB | Verify `async-graphql-parser` version pinning |
| **8** | Extract Node CLI to separate package | ⚠️ Medium | ~5 MB npm | Must also cover `scripts/validation/` |
| **9** | Replace `regex` case conversion + name validation | ⚠️ Medium | ~3-5 MB | Keep `regex` for URL + dynamic patterns |
| **10** | Gate `opentelemetry` behind feature flag | ⚠️ Medium | ~7 MB | Gate, don't rewrite to `tracing` |

### Stricken recommendations:
- ❌ **`indexmap` → `BTreeMap`** — would break field ordering, a core feature
- ❌ **Full `regex` removal** — URL validation and dynamic patterns justify keeping the crate

---

## 6. Summary

The `docs/dependency-reduction-plan.md` is a **thorough and largely correct** analysis. Of the 10 proposed changes, **8 are valid and well-reasoned**, **2 contain errors** (the `indexmap` → `BTreeMap` suggestion and the incomplete scope of `ajv` extraction). The branch's three actual code changes (`.cargo/config.toml`, debug profiles, pnpm bump) are sound and independently mergeable.

The plan correctly identifies that the single biggest win (~33 MB) comes from removing the 5 stubbed/unused Apollo validation crates — a change that carries **zero functional risk** since every `validate()` method already returns empty results. This alone would justify the refactoring effort.
