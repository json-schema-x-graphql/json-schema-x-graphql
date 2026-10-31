# PORTING.md — Rust → TypeScript: `analysis/diff`

## Source baseline

- **Source file:** `converters/rust/src/analysis/diff.rs` (388 lines)
- **Source revision:** git `e0796ea` (working tree clean for this file);
  sha256 `9c7738047d1e989f086bc7193bccf5406b2fe8b0023f0c5927148ffcf056b30c`
- **Source toolchain:** Cargo (crate `json-schema-x-graphql` v2.0.2)
- **Source tests:** `cd converters/rust && cargo test analysis::diff` — re-run at
  acceptance: 6 passed, 0 failed, 0 ignored (plus 0-match runs of the other
  suite binaries). Source and its tests remain untouched.
- **Existing TS counterpart:** `converters/node/src/analysis/index.ts` lines
  199–363 already contain a near-identical port of the same module (missing
  `formatDiffSummary`). The Rust module remains the source of truth; see
  "Existing TS comparison" below for where that counterpart diverges from Rust.

## Target

- **Directory:** `ports/rs-to-ts/analysis-diff/`
- **Package:** `{"type": "module", "private": true}`, zero external dependencies
- **Runtime:** Node ≥22.18/24 native TypeScript type-stripping
  (verified on Node v24.18.0). Erasable syntax only, enforced by
  `erasableSyntaxOnly: true` in tsconfig — no `enum`, `namespace`, or
  parameter properties anywhere in the port.
- **Module specifiers:** relative imports use the literal `.ts` extension
  (`./analysis-diff.ts`). Node does **not** remap `.js` → `.ts`, so the common
  nodenext `.js` convention fails at runtime with `ERR_MODULE_NOT_FOUND`;
  `allowImportingTsExtensions: true` (with `noEmit`) makes tsc accept it.
  Both `node --test` and `tsx` resolve `.ts` specifiers.
- **TypeScript:** `tsc --noEmit`, strict mode, ESNext modules, bundler
  resolution (verified with tsc 6.0.3 resolved from the repo root)
- **Test runner:** builtin `node:test` + `node:assert/strict`

## API mapping

| Rust symbol | TS export | Notes |
|---|---|---|
| `DiffSeverity` enum | `type DiffSeverity = "added" \| "removed" \| "modified"` | Unit variants → string-literal union (3/3 values) |
| `DiffCategory` enum | `type DiffCategory = "type" \| "field" \| "fieldType" \| "fieldRequired" \| "federation" \| "metadata"` | Same pattern (6/6 values; `metadata` is never produced by either implementation) |
| `Diff` struct | `interface Diff` | Fields `category`, `severity`, `path`, `message` |
| `DiffResult` struct | `interface DiffResult` | `diffs`, `breakingChanges`, `nonBreakingChanges` (snake_case → camelCase) |
| `DiffResult::is_compatible()` | `isCompatible(result)` standalone | Returns `result.breakingChanges === 0` |
| `DiffResult::total()` | `total(result)` standalone | Returns `result.diffs.length` |
| `diff_schemas(old, new)` | `diffSchemas(old, new_)` | Root comparison function; inputs `unknown` (≙ `&Value`) |
| `format_diff_summary(result)` | `formatDiffSummary(result)` | Human-readable diff summary |
| `extract_defs_map` | (private) `extractDefsMap` | Internal helper |
| `diff_type_definition` | (private) `diffTypeDefinition` | Internal helper |

## Test mapping

| Rust test (line) | TS test name | Notes |
|---|---|---|
| `test_no_diff_identical` (278) | `test_no_diff_identical` | Identical schemas → 0 diffs |
| `test_added_type` (292) | `test_added_type` | New `$defs` entry → Added severity |
| `test_removed_type_breaking` (308) | `test_removed_type_breaking` | Removed `$defs` entry → breaking, 1 breaking change |
| `test_added_field_non_breaking` (322) | `test_added_field_non_breaking` | New property → compatible, Added severity |
| `test_required_change_breaking` (351) | `test_required_change_breaking` | New required field → not compatible |
| `test_format_diff_summary` (379) | `test_format_diff_summary` | Summary string assertions |
| (characterization) | `kind_change_produces_modified_severity_diff` | `"type"` string change → Modified (diff.rs:145–155) |
| (characterization) | `removed_field_is_breaking` | Property removal → Removed, breaking (diff.rs:178–185) |
| (characterization) | `federation_key_removal_is_breaking` | Fed key removal → Removed, breaking (diff.rs:232–248) |
| (characterization) | `required_to_optional_is_non_breaking` | Required→optional → Modified, compatible (diff.rs:207–217) |
| (characterization) | `definitions_fallback_works` | `definitions` key fallback when `$defs` absent (diff.rs:118–120) |
| (characterization) | `non_object_schema_returns_zero_diffs` | `null`/string/number input → empty (diff.rs:114–117) |
| (characterization) | `type_array_property_falls_back_to_unknown_kind` | Array `"type"` → "unknown" kind on both sides → no diff (diff.rs:137–144) |
| (characterization) | `total_and_isCompatible_match_counts` | `total()` ≡ `diffs.length`; breaking + non-breaking ≡ total; empty edge case |
| (characterization, added at acceptance) | `defs_extraction_matches_rust_edge_cases` | Null `$defs` shadows `definitions`; array containers rejected; non-object defs still counted as added/removed; non-object common defs → no field diffs |

**Count:** 6 ported Rust tests + 9 characterization tests = **15 total**.
(The deliverable as first submitted had 14; acceptance added the 15th to
characterize the `extract_defs_map` edge cases after fixing fidelity gaps.)

## Preserved quirks (faithful to Rust, intentional)

1. **Optional → required is modeled as severity `Removed`** (diff.rs:219–230),
   i.e. the "breaking" bucket, even though nothing was removed. Preserved
   exactly: the TS port pushes `severity: "removed"` with the
   `"...is now required (breaking change)"` message.
2. **`$defs` presence shadows `definitions`** (diff.rs:118–120).
   `Option::or_else` fires only when the key is *absent*; `{"$defs": null,
   "definitions": {...}}` yields **no** definitions in both implementations.
   (The naive TS `??` fallback gets this wrong; the port uses `Object.hasOwn`.)
3. **Kind detection is `as_str()`-only** (diff.rs:137–144): an array-typed
   `"type"` (e.g. `["string", "null"]`) is not a string, so the kind is
   `"unknown"` — no coercion.
4. **Non-object definition values still count as type names** (diff.rs:113–124
   clones every value; the `as_object()` guards live in `diff_type_definition`,
   diff.rs:127–134): `{"$defs": {"A": 5}}` → `{"$defs": {}}` reports
   `Type 'A' was removed`, while a common non-object def produces no field diffs.
5. **`DiffCategory::Metadata` is never produced** by any code path; the union
   member `"metadata"` is kept for enum-value-set parity.
6. **Counting split** (diff.rs:96–104): breaking = `Removed` only;
   non-breaking = everything else; `breaking + non-breaking === diffs.length`.

## Ordering semantics (deliberate difference)

**Rust:** Uses `std::collections::HashSet` for type-name sets, property-name
sets, and required-field sets. Rust's `HashSet` iteration order is
**nondeterministic** (depends on the default hasher's per-process random
seed). The diff output order varies between runs; the Rust side makes no
determinism claim and none is assumed here.

**TypeScript:** Uses native `Set`/object-key iteration, which is
**insertion-ordered**. Since `extractDefsMap` iterates `Object.entries()` in
JSON key-declaration order, the port's output is deterministic:

1. Added types: in order they appear in the _new_ schema's `$defs`/`definitions`
2. Removed types: in order they appear in the _old_ schema's `$defs`/`definitions`
3. Modified types: in order they appear in the _old_ schema (intersection)
4. Within a type definition: property additions/removals follow property
   declaration order

This is a **deliberate difference**, not an equivalence claim: any single Rust
run produces *some* order the TS port may or may not match. No sorting was
present in the Rust source; consumers that need a canonical order across both
implementations must sort explicitly. Note JS objects sort integer-like keys
before string keys — another divergence from Rust for numeric type names.

## Additional deliberate differences

| Area | Rust | TS port | Reason |
|---|---|---|---|
| Defs map values | `HashMap<String, Value>` deep-clones every value | `{ ...container }` shallow copy; values stay by reference | Port never mutates defs; no observable difference, avoids copying |
| Key presence checks | `contains_key` (own entries) | `Object.hasOwn` (not `in`, which consults the prototype chain) | Exact own-key semantics |
| Methods vs functions | `impl DiffResult { is_compatible, total }` | Standalone `isCompatible(result)`, `total(result)` | Plain-data interfaces; TS convention |
| Enum representation | `pub enum` | String-literal union types | Erasable-syntax-only runtime (Node type-stripping) |
| Field names | snake_case | camelCase | Target-language convention (documented mapping above) |

Everything else — message strings (including the U+2192 `→` in
`changed kind: 'x' → 'y'`), path formats (`$.$defs.<Name>[.type|.properties.<f>|.required|.x-graphql-federation-keys]`),
severity/category assignments, summary layout (`Schema diff: N total changes`,
two-space-indented counts, blank line, `[+/-/~] path: message` rows joined by
`\n`) — matches the Rust source exactly.

## Verification commands

```sh
# Typecheck (from repo root)
npx tsc --noEmit -p ports/rs-to-ts/analysis-diff/tsconfig.json

# Tests — native Node type-stripping (from ports/rs-to-ts/analysis-diff/)
node --test                          # auto-discovery; also: npm test
node --test src/analysis-diff.test.ts

# Tests — tsx fallback (exercises the same file through converters/node's tsx)
cd converters/node && npx tsx ../../ports/rs-to-ts/analysis-diff/src/analysis-diff.test.ts

# Source baseline (from converters/rust/)
cargo test analysis::diff
```

Gotcha: `node --test src/` (directory positional) fails on Node v24.18.0 —
the runner tries to execute `src` itself as a test file. Use bare
`node --test` (auto-discovery) or the explicit file path. An earlier revision
of this package used `.js` import specifiers, which Node cannot resolve to
`.ts` files; that is fixed by importing `./analysis-diff.ts` directly.

## Verification results (re-run at acceptance)

| Command | Result |
|---|---|
| `cargo test analysis::diff` (converters/rust) | 6 passed, 0 failed, 0 ignored |
| `npx tsc --noEmit -p ports/rs-to-ts/analysis-diff/tsconfig.json` | exit 0, no diagnostics |
| `npm test` (= `node --test`) in the port dir | 15 tests, 15 pass, 0 fail (Node v24.18.0) |
| `node --test src/analysis-diff.test.ts` | 15 pass, exit 0 |
| `npx tsx .../analysis-diff.test.ts` (from converters/node) | 15 pass, exit 0 |
| `npm run typecheck` in the port dir | exit 0 |

## Existing TS comparison

`converters/node/src/analysis/index.ts` (lines 199–363) contains an earlier
near-identical port. Where it differs from Rust (and from this port):

| Aspect | Existing TS (`converters/node`) | This port (`ports/rs-to-ts/analysis-diff/`) |
|---|---|---|
| `$defs` fallback | `??` — a present-null `$defs` wrongly falls through to `definitions` | `Object.hasOwn` presence check — matches Rust `or_else` |
| Non-object defs | Kept in name set (like Rust), but `diffTypeDefinition` coerces via `old ?? {}` — a `5` becomes `{}` and still gets field-diffed | Kept in name set; `as_object()`-equivalent guard skips non-object defs entirely (matches Rust) |
| `type` kind detection | `String(oldObj.type ?? "unknown")` — non-string types coerced (e.g. `["a"]` → `"a"`) | `typeof === "string"` only — matches Rust `Value::as_str()` |
| Federation key check | `in` operator (prototype chain visible) | `Object.hasOwn` (own keys only, matches `contains_key`) |
| `formatDiffSummary` | Not present | Present, matches Rust |
| Tests | None for the diff module | 15 tests with assertions |

## Unverified cases / limits

- **No cross-language differential harness:** equivalence rests on line-by-line
  source comparison plus the 15 tests, not on running both implementations
  over a shared corpus in lockstep. Inputs beyond the characterized domain
  (deeply nested `$defs` values, exotic malformed JSON) are unverified.
- **Ordering divergence is untestable by construction:** the Rust side is
  nondeterministic, so no order-equality assertion was written or can be.
- **Hosts:** only Node v24.18.0 (Linux) exercised. Browser/Bun/Deno not
  tested; do not infer support. No build artifact is emitted (`noEmit`) — the
  port is consumed as source via type-stripping or tsx.
- **Performance:** not measured (skill TS08 deliberately not attempted; no
  equivalence-first benchmark was requested).
- **Prototype-polluted inputs:** `Object.hasOwn` neutralizes the known leak
  paths, but polluted containers were not part of the test corpus.
