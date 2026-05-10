# Converter Dependency Reduction Plan

**Project:** `json-schema-x-graphql`  
**Scope:** Node and Rust converter packages  
**Status:** Draft  
**Goal:** Reduce the number of runtime and development dependencies used by the converter implementations while preserving correctness, test coverage, and developer experience.

## Audit Status

Initial dependency review completed. The current codebase shows a clear split between:
- **core converter dependencies** used directly by converter source
- **tooling / UI / legacy dependencies** that should be isolated or removed from the converter core
- **optional CLI / validation dependencies** that can likely be feature-gated or moved out of the minimal runtime path

### High-confidence keepers
These are used directly by converter source and should remain for now:
- Node: `graphql`, `ajv`, `ajv-formats`, `typescript`, `jest`, `ts-jest`, `tsx`, `eslint`, `@typescript-eslint/*`, `@types/node`, `@types/jest`
- Rust: `async-graphql`, `serde`, `serde_json`, `thiserror`, `indexmap`, `regex`, `getrandom`, `jsonschema`, `apollo-parser`, `apollo-encoder`, `apollo-compiler`, `graphql-composition`, `graphql-schema-validation`

### High-confidence removal or relocation candidates
These appear to be UI/editor compatibility packages, deprecated transitive-style utilities, or build tooling rather than core converter dependencies:
- Node: `@codemirror/basic-setup`, `graphql-language-service-*`, `inflight`, `abab`, `domexception`, `node-domexception`, `whatwg-encoding`, `graphql-tag`
- Node tooling candidates: `rollup`, `@rollup/plugin-node-resolve`, `@rollup/plugin-typescript`, `@theguild/federation-composition`, `glob`, `rimraf`
- Rust optional candidates: `clap`, `reqwest`, `tokio`, `anyhow`, `boon`, `lru`

### Next actions
1. Confirm direct usage for every candidate package/crate.
2. Remove the clearly unused Node compatibility and editor packages first.
3. Isolate CLI-only and validation-only Rust crates behind feature flags or package boundaries.
4. Re-run the converter unit suite and parity suite after each batch.
5. Record keep/remove/isolate decisions in a dependency audit table before making further removals.

---

## 1. Purpose

The converter packages currently carry a meaningful dependency footprint across both JavaScript/TypeScript and Rust. This plan defines a path to reduce that footprint so that the converters become:

- easier to maintain
- easier to audit
- faster to install and build
- more portable across repos
- easier to extract into standalone repositories later

This plan focuses on the converter packages only, not the website, builder, or other proof-of-concept applications.

---

## 1. Purpose

The converter packages currently carry a meaningful dependency footprint across both JavaScript/TypeScript and Rust. This plan defines a path to reduce that footprint so that the converters become:

- easier to maintain
- easier to audit
- faster to install and build
- more portable across repos
- easier to extract into standalone repositories later

This plan focuses on the converter packages only, not the website, builder, or other proof-of-concept applications.

---

## 2. Dependency Audit Table

| Package / Crate | Current role | Decision | Confidence | Notes |
| --- | --- | --- | --- | --- |
| `graphql` | Node runtime parsing/printing | Keep | High | Directly used by converter and parity code |
| `ajv` | Node JSON Schema validation | Keep | High | Directly used in validation CLI |
| `ajv-formats` | Node schema format validation | Keep | High | Directly used in validation CLI |
| `typescript` | Node build toolchain | Keep | High | Required for converter package compilation |
| `jest` | Node test runner | Keep | High | Required for current converter tests |
| `ts-jest` | TS test integration | Keep | High | Required by Jest configuration |
| `tsx` | Script runner for validation/benchmark tools | Keep | Medium | Likely needed for repo scripts; revisit after script split |
| `eslint` | Linting | Keep | High | Directly used for package quality checks |
| `@typescript-eslint/*` | TS linting | Keep | High | Required by lint stack |
| `@types/node` | TS node types | Keep | High | Required by node scripts/build |
| `@types/jest` | TS test types | Keep | High | Required by tests |
| `@apollo/subgraph` | Federation/subgraph support | Keep | Medium | Verify only needed for converter package workflows |
| `@graphql-codegen/cli` | Generated types/build helper | Keep | Medium | Used by local codegen script; isolate if generation moves elsewhere |
| `@graphql-codegen/typescript` | Generated types/build helper | Keep | Medium | Same as above |
| `@theguild/federation-composition` | Federation tooling | Keep | Medium | Verify direct use before keeping in core package |
| `glob` | File discovery in tests/scripts | Keep | Medium | Likely script-only; candidate for later isolation |
| `rimraf` | Cleanup scripts | Keep | Medium | Script-only; replace with native cleanup where practical |
| `rollup` | Build/bundling tooling | Candidate | Medium | Move out if package no longer bundles in-repo |
| `@rollup/plugin-node-resolve` | Rollup helper | Candidate | Medium | Same as above |
| `@rollup/plugin-typescript` | Rollup helper | Candidate | Medium | Same as above |
| `@codemirror/basic-setup` | Editor/UI dependency | Remove/relocate | High | Not part of converter core |
| `graphql-language-service-interface` | Editor tooling | Remove/relocate | High | Appears UI/editor-oriented |
| `graphql-language-service-parser` | Editor tooling | Remove/relocate | High | Appears UI/editor-oriented |
| `graphql-language-service-types` | Editor tooling | Remove/relocate | High | Appears UI/editor-oriented |
| `graphql-language-service-utils` | Editor tooling | Remove/relocate | High | Appears UI/editor-oriented |
| `inflight` | Deprecated utility | Remove | High | Deprecated and not directly referenced in source |
| `abab` | Polyfill / compatibility | Remove | Medium | Candidate unless a hidden path depends on it |
| `domexception` | Polyfill / compatibility | Remove | Medium | Candidate unless a hidden path depends on it |
| `node-domexception` | Polyfill / compatibility | Remove | Medium | Candidate unless a hidden path depends on it |
| `whatwg-encoding` | Compatibility helper | Remove | Medium | Candidate unless a hidden path depends on it |
| `graphql-tag` | GraphQL document helper | Remove | Medium | No direct source usage found so far |
| `async-graphql` | Rust GraphQL parsing/AST/runtime | Keep | High | Directly used throughout converter source |
| `serde` | Rust serialization | Keep | High | Directly used throughout converter source |
| `serde_json` | Rust JSON handling | Keep | High | Directly used throughout converter source |
| `thiserror` | Rust error enums | Keep | High | Directly used throughout converter source |
| `indexmap` | Rust deterministic maps | Keep | High | Directly used throughout converter source |
| `regex` | Rust naming/case helpers | Keep | High | Directly used in case conversion |
| `getrandom` | Rust wasm entropy support | Keep | High | Required for wasm target |
| `jsonschema` | Rust JSON Schema validation | Keep | High | Core validation functionality |
| `apollo-parser` | Rust SDL parsing | Keep | High | Directly used in converter source |
| `apollo-encoder` | Rust SDL encoding | Keep | High | Directly used in converter source |
| `apollo-compiler` | Rust GraphQL tooling | Keep | High | Directly used in converter source |
| `graphql-composition` | Rust federation composition | Keep | High | Directly used in converter source |
| `graphql-schema-validation` | Rust GraphQL validation | Keep | High | Directly used in converter source |
| `clap` | Rust CLI parsing | Candidate | Medium | Isolate to CLI feature if possible |
| `reqwest` | Rust HTTP client | Candidate | Medium | Likely CLI/validation only |
| `tokio` | Rust async runtime | Candidate | Medium | Likely CLI/validation only |
| `anyhow` | Rust convenience errors | Candidate | Medium | Replace with typed errors if practical |
| `boon` | Rust validation helper | Candidate | Medium | Verify whether `jsonschema` already covers the need |
| `lru` | Rust caching | Candidate | Medium | Remove unless caching is a proven need |
| `pretty_assertions` | Rust test diff helper | Keep | Medium | Dev-only; useful but optional |
| `criterion` | Rust benchmarking | Keep | Medium | Dev-only; isolate benchmark usage |

---

## 3. Current Dependency Reduction Targets

### Node converter
Focus on reducing:
- runtime dependencies
- build-time dependencies
- test-only dependencies
- indirect dependencies pulled in by heavy tooling

### Rust converter
Focus on reducing:
- third-party crates that duplicate standard library features
- feature-heavy crates used only for narrow tasks
- dependencies used only by optional or legacy code paths

---

## 4. Desired End State

The ideal end state is a converter stack that uses:

### Node converter
- a small set of core packages for:
  - parsing
  - testing
  - type checking
  - minimal bundling/building
- no unnecessary helper libraries for behavior already covered by the standard library or existing core packages

### Rust converter
- a minimal set of crates for:
  - CLI parsing if needed
  - serialization
  - testing
  - wasm output if required
- no duplicate utility crates when equivalent functionality exists in the standard library

---

## 5. Reduction Strategy for the Node Converter

### 5.1 Categorize dependencies
Split dependencies into these groups:

- **Runtime dependencies**
  - used by published or executed converter logic
- **Build dependencies**
  - used for compilation or bundling
- **Test dependencies**
  - used only by tests
- **Tooling dependencies**
  - used for linting, formatting, docs, or release tasks

### 5.2 Remove libraries with standard-library replacements
Candidates should be reviewed for replacement by:
- native string manipulation
- native URL/path utilities
- built-in JSON parsing/stringification
- plain TypeScript types and narrow helper functions

### 5.3 Minimize transitive tooling
Prefer smaller toolchains where possible:
- avoid overlapping formatter/linter/test tooling
- avoid libraries that are only needed for one narrow script

### 5.4 Consolidate test helpers
Shared test helpers should live in the repo, not in separate utility packages, unless they are truly reusable across projects.

### 5.5 Prefer one testing stack
Keep the Node converter on one main test runner and one test assertion style to avoid unnecessary complexity.

---

## 6. Reduction Strategy for the Rust Converter

### 6.1 Audit each crate by purpose
For each dependency, ask:

- Is this functionality available in `std`?
- Is this crate required for CLI, wasm, or serialization?
- Is this dependency only supporting an old code path?
- Is there a lighter alternative?
- Can we move the logic into a small internal module?

### 6.2 Prefer `std` and internal modules
Rust makes it easy to remove dependencies when the behavior is simple enough for:
- `std::fs`
- `std::path`
- `std::collections`
- `std::fmt`
- internal helper modules

### 6.3 Avoid feature-heavy crates unless justified
Only keep crates that:
- materially reduce complexity
- provide correct parsing/serialization behavior
- are required by CLI or wasm packaging

### 6.4 Keep WASM-specific dependencies isolated
If wasm packaging requires additional crates, isolate them so the core library stays lean.

### 6.5 Reduce optional feature sprawl
Minimize optional feature flags unless they are clearly needed for:
- CLI support
- wasm output
- cross-platform compatibility

---

## 7. High-Value Simplification Targets

These are the kinds of dependencies most worth reviewing first:

### Node-side examples
- utility libraries that duplicate native `path`, `url`, or `fs` behavior
- test-only packages that overlap with existing test tooling
- old compatibility packages that are no longer required by supported Node versions
- polyfills or browser-only compatibility shims that are not needed in the converter runtime

### Rust-side examples
- helper crates for trivial operations
- crates added for historical compatibility
- dependencies used only in isolated examples or legacy tests
- crates that can be replaced by a small internal helper module

---

## 8. Risk Areas

### Risk 1: Breaking parity between Node and Rust
Mitigation:
- run shared fixture comparisons after every dependency removal
- keep semantic outputs stable
- validate known edge cases like naming, nullability, refs, and federation metadata

### Risk 2: Replacing a dependency with custom code that is less reliable
Mitigation:
- only replace a dependency when the replacement is small, testable, and clearly simpler
- add targeted tests for the new implementation

### Risk 3: Build or release scripts become harder to maintain
Mitigation:
- keep build scripts simple
- document any dependency removal that changes release behavior
- avoid one-off shell logic when a small script is enough

### Risk 4: Removing a dependency that is indirectly important
Mitigation:
- inspect all direct usages
- run the full converter test suite after each change
- check packaging and release paths, not just unit tests

---

## 9. Decision Framework for Each Dependency

For each package or crate, classify it with one of these outcomes:

### Keep
The dependency is necessary and well-justified.

### Replace
The dependency can be swapped for:
- standard library code
- a smaller package
- internal helper logic

### Isolate
The dependency is only needed in tests, examples, or optional paths and should be moved out of the core runtime path.

### Remove
The dependency is unused or redundant.

---

## 10. Suggested Reduction Order

### Phase 1: Inventory
Create a full list of Node and Rust direct dependencies with their purpose.

### Phase 2: Remove unused dependencies
Delete anything that is clearly unused.

### Phase 3: Replace standard-library equivalents
Convert simple helper dependencies into internal code.

### Phase 4: Isolate test-only and example-only dependencies
Move those out of the core runtime and into test-only scopes.

### Phase 5: Consolidate build tooling
Avoid multiple overlapping tools where one can do the job.

### Phase 6: Validate parity and release
Run:
- converter unit tests
- shared parity tests
- release build checks
- packaging checks

---

## 11. Recommended Validation Checklist

After each dependency reduction step, verify:

- converter unit tests pass
- shared parity tests pass
- Node build passes
- Rust build passes
- WASM output still builds if applicable
- CLI still works
- package metadata is still correct
- no new warnings or audit issues were introduced

---

## 12. Success Criteria

This plan is successful when:

- the direct dependency count is lower
- transitive dependency weight is lower
- install and build times improve
- test suite remains green
- converter behavior remains stable
- future repo extraction becomes easier
- dependency audit surface is reduced

---

## 13. Practical Expectations

This should not be treated as a one-shot cleanup. The best results will come from incremental passes:

1. remove obvious dead dependencies
2. simplify helper code
3. isolate test-only dependencies
4. trim build tooling
5. revisit again after repo split

Small reductions that preserve correctness are better than aggressive removals that destabilize the converters.

---

## 14. Relation to the Monorepo Migration Plan

This dependency reduction work should happen alongside the monorepo migration effort because:

- cleaner package boundaries make dependency review easier
- shared testing becomes more reliable
- extraction into separate repos becomes easier later
- the converter packages become more portable and easier to publish independently

---

## 15. Immediate Next Actions

1. Inventory all Node and Rust direct dependencies
2. Map each dependency to a specific use case
3. Remove unused packages or crates
4. Identify standard-library replacements
5. Move test-only tooling out of runtime paths
6. Run the full converter test and parity suite
7. Document every removal and replacement

---

## 16. Final Recommendation

The converter packages should aim for:
- minimal runtime dependencies
- minimal duplicated tooling
- a shared test harness
- clearly isolated example and test-only code
- strict parity verification after each reduction

This will make the converters easier to maintain now and much easier to split into dedicated repositories later.