## Acceptance

- **Verdict**: accepted
- **Verification**: All commands re-run from `ports/ts-to-rs/validation-lint/` with clean results:
  - `cargo test` → 10 integration tests passed, 0 failures
  - `cargo clippy --all-targets -- -D warnings` → Passed with no warnings
  - `cargo fmt --check` → Passed with no formatting changes needed
- **Test-mapping audit**: 10/10 Jest tests mapped 1:1 to Rust integration tests. No unmapped tests, no weakened assertions.
- **Behavior fidelity**: All preserved quirks confirmed genuine:
  - Duplicate findings for deprecated attributes (error + warning)
  - `$.$defs` paths even when definitions came from legacy `definitions` key
  - Truthy-enum skipping (only truthy `x-graphql-enum` skips; false, 0, "" do not)
  - `lint_all` ordering: schema findings first, then completeness findings
  - Null/scalar/empty inputs return no findings
  - `$defs` → `definitions` fallback when `$defs` absent or null
  - Missing-type-name uses key presence (null values suppress warning)
  - PascalCase checks only first character uppercasing
  - No federation-key lint (matches no-op TypeScript block)

## Suite findings

The port demonstrates strong behavior parity with the TypeScript source. The Rust crate:

**Behavior parity:**
- Three public functions (`lint_schema`, `lint_definitions_completeness`, `lint_all`) accepting `&serde_json::Value` and returning `Vec<ValidationIssue>` — no `Result` because findings are data, not failures.
- Identical issue ordering, path construction, and message text.
- All 10 original test scenarios covered with equivalent assertions.

**Deliberate differences (documented in PORTING.md):**
- Input restricted to `serde_json::Value` (no JS prototypes, functions, symbols, cyclic objects).
- Object key order preserved via `serde_json` `preserve_order` feature; JS numeric-key enumeration order differences acknowledged.
- Non-object definitions/properties ignored (TS `Object.entries` can enumerate arrays/strings).
- Non-string `x-graphql-type-name` / `x-graphql-field-name` ignored (TS casts could throw).
- Unicode casing uses Rust scalar `char::to_uppercase` vs. JS UTF-16 `toUpperCase`; differs only on supplementary-plane characters.

**Preserved quirks (intentional, documented):**
- Deprecated attributes trigger both error (deprecated) and warning (non-standard prefix).
- Completeness paths hardcoded to `$.$defs` regardless of source key.
- Null `x-graphql-type-name` or `title` counts as present.
- Federation-key block is a no-op in both languages.

**Remaining risks**: None identified. The port is proportionate (~180 lines vs ~175 TS), well-tested, and passes all Rust quality gates. The PORTING.md is complete per the rust-port skill §6 requirements.