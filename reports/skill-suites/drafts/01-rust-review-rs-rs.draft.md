# Rust review: converters/rust (json-schema-x-graphql crate)

The crate is a **library** (published to crates.io, `cdylib` + `rlib`, public API with `Converter`, `ConversionOptions`, error types, and WASM bindings). It performs bidirectional JSON Schema ↔ GraphQL SDL conversion with `x-graphql-*` extensions and Apollo Federation v2 support.

**Overall verdict:** Solid, well-tested library with good architectural separation. The core conversion logic is correct and passes all 180+ tests. However, there are a few **reachable panics**, **error-type ergonomics issues**, and **clippy pedantic violations** that should be addressed before the next minor release. The most important fix is the LRU cache bug in `lib.rs` that silently breaks caching.

**Tools run:**
- `cargo fmt --check` ✅ PASS
- `cargo clippy --all-targets --all-features -- -W clippy::pedantic` ⚠️ **~450 warnings** (mostly pedantic style: `uninlined_format_args`, `must_use_candidate`, `cast_precision_loss`, `similar_names`, `redundant_else`, `manual_let_else`, `needless_raw_string_hashes`, `unnested_or_patterns`, `unreadable_literal`, `ignore_without_reason`, `format_push_string`, `redundant_closure_for_method_calls`)
- `cargo test` ✅ **180+ tests PASS**

---

## Must fix

### 1. LRU cache bug breaks caching silently (`src/lib.rs:65-98`)
**Rule:** Logic errors in public API (API Guidelines C-CORRECTNESS, Effective Rust Item 18)
**Problem:** `SimpleLruCache::get` uses `shift_remove` (removes and returns) then re-inserts the same value. This does **not** move the entry to the most-recent position—it removes it entirely, then re-inserts at the end, but the iteration order of `IndexMap` means the "oldest" key is now the one *after* the removed one. Cache eviction (`put`) also uses `shift_remove` + `insert`, which is correct for insertion order, but `get` breaks the LRU invariant. Result: cache hits don't refresh recency, causing premature eviction of hot entries.
**Fix:**
```rust
fn get(&mut self, key: &str) -> Option<String> {
    // Move to end (most recent) by removing and re-inserting
    let value = self.entries.shift_remove(key)?;
    self.entries.insert(key.to_string(), value.clone());
    Some(value)
}
```

### 2. `GraphQLType::from_sdl` panics on malformed input (`src/types.rs:244-296`)
**Rule:** Panics on reachable paths (M-PANIC-ON-BUG, API Guidelines C-PANIC)
**Problem:** The parser assumes well-formed GraphQL type syntax. Input like `"["` (unclosed list), `"String!!"` (double bang), or `"[String]!"` with extra chars will hit `unwrap()`/`expect()` paths or produce wrong results. This is a **public** constructor (`pub fn from_sdl`) that callers use for untrusted input.
**Fix:** Return `Result<Self, String>` (already does) but add exhaustive validation and replace all `unwrap()` with proper error returns:
```rust
// Example: line 252-267
if chars.peek() == Some(&'[') {
    is_list = true;
    chars.next(); // consume '['
    // ... parse name ...
    // Must check for closing ']' before continuing
    if chars.next() != Some(']') {
        return Err("Unclosed list type".to_string());
    }
}
```

### 3. `try_get_property` error not propagated in `resolve_ref_schema` (`src/json_to_graphql.rs:428-450`, `452-487`)
**Rule:** Errors that lose information (API Guidelines C-GOOD-ERR)
**Problem:** `resolve_ref_schema` calls `Self::resolve_ref` which calls `try_get_property`. If `try_get_property` returns `Err`, the `?` propagates, but the outer `resolve_ref` returns `Ok(None)` on error (line 382), silently swallowing the error. Callers then fall back to `extract_type_name_from_ref` which may produce wrong type names.
**Fix:** Propagate the error or log it:
```rust
fn resolve_ref_schema(&mut self, ref_path: &str) -> Option<&JsonValue> {
    let mut visited = HashSet::new();
    match Self::resolve_ref(self.root_schema, ref_path, &mut visited) {
        Ok(Some(resolved)) => return Some(resolved),
        Ok(None) => {}
        Err(e) => {
            // Log or handle the error instead of silently ignoring
            eprintln!("Warning: failed to resolve ref {}: {}", ref_path, e);
        }
    }
    // ... fallback logic
}
```

### 4. Public error type `ConversionError` variants lack `source()` for wrapped errors (`src/error.rs:10-84`)
**Rule:** Library errors must implement `std::error::Error` with `source()` (C-GOOD-ERR, Effective Rust Item 7)
**Problem:** Variants like `JsonError(String)`, `RegexError(String)`, `InvalidJsonSchema(String)` wrap upstream errors but discard the original `Error` impl. Downstream callers cannot inspect the cause via `error.source()`.
**Fix:** Store the upstream error (or its kind) and implement `source()`:
```rust
#[derive(Error, Debug, Serialize)]
pub enum ConversionError {
    // ...
    #[error("JSON error: {0}")]
    JsonError(#[source] #[serde(skip)] serde_json::Error), // Note: serde_json::Error is Send+Sync
    #[error("Regex error: {0}")]
    RegexError(#[source] #[serde(skip)] regex::Error),
    // ...
}
```
(Requires `thiserror` 2.0's `#[source]` support; may need to box or use `#[from]` on separate variants.)

### 5. `ConversionOptions` public fields allow invalid combinations (`src/types.rs:16-57`)
**Rule:** Make invalid states unrepresentable (Effective Rust Item 1, Rust API Guidelines C-STRUCT)
**Problem:** `ConversionOptions` is a public struct with all fields public. Callers can set `federation_version: 3` (unsupported), `inline_object_threshold: 0` (causes divide-by-zero in formatting), or contradictory `exclude_types` + `include_operational_types`.
**Fix:** Make fields private, provide builder methods with validation, or at minimum add a `validate(&self) -> Result<()>` method called by `Converter::with_options`:
```rust
impl ConversionOptions {
    pub fn validate(&self) -> Result<()> {
        if self.inline_object_threshold == 0 {
            return Err(ConversionError::InvalidExtension(
                "inline_object_threshold must be > 0".into()
            ));
        }
        if self.federation_version > 2 {
            return Err(ConversionError::UnsupportedFeature(
                "federation_version > 2 not supported".into()
            ));
        }
        Ok(())
    }
}
```

---

## Should fix

### 6. `format!` with variables not inlined (clippy::uninlined_format_args) — ~60 occurrences
**Rule:** Prefer inline format args (clippy::uninlined_format_args, Google Rust Style Guide)
**Problem:** `format!("{}", var)` instead of `format!("{var}")` — minor allocation overhead, but clippy flags it pervasively across `json_to_graphql.rs`, `analysis/coverage.rs`, `hints/operations.rs`, tests.
**Fix:** Run `cargo clippy --fix` or manually update.

### 7. `usize` → `f64` cast precision loss in coverage reports (`src/analysis/coverage.rs:89, 106, 169, 186`)
**Rule:** Avoid silent precision loss (clippy::cast_precision_loss)
**Problem:** `usize` can be 64-bit; `f64` mantissa is 52 bits. For schemas with >4 quadrillion fields, coverage % becomes inaccurate. Unlikely in practice but the lint is correct.
**Fix:** Use `f64::from(mapped) / f64::from(total)` or `mapped as f64 / total as f64` with `#[allow(clippy::cast_precision_loss)]` if accepted.

### 8. Missing `#[must_use]` on pure functions — ~15 functions flagged
**Rule:** Add `#[must_use]` to pure functions and types whose discard is a bug (API Guidelines C-MUST-USE)
**Problem:** `is_complete()`, `total()`, `is_compatible()`, `compute_coverage()`, `format_coverage_report()`, etc. can be called for side effects (none) and the result ignored silently.
**Fix:** Add `#[must_use]` to all flagged functions and methods.

### 9. `DirectiveFilterMode::Custom` case-insensitive match may be surprising (`src/directive_filter.rs:64-69`)
**Rule:** Explicit case handling (API Guidelines C-CASE)
**Problem:** `eq_ignore_ascii_case` on directive names means `@Key` and `@key` are treated identically, but GraphQL directive names are case-sensitive (`@key` ≠ `@Key`). The spec uses lowercase.
**Fix:** Document the behavior or use exact match. If case-insensitive is intentional for user convenience, add a comment.

### 10. `validator.rs` URL regex is too permissive (`src/validator.rs:36-39`)
**Rule:** Validation should reject invalid inputs (Effective Rust Item 17)
**Problem:** `r"^https?://[^\s/$.?#].[^\s]*$"` accepts `http://` (no host), `http:///path`, etc.
**Fix:** Use a stricter regex or `url::Url::parse()`:
```rust
fn url_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| Regex::new(r"^https?://[a-zA-Z0-9.-]+(?::\d+)?(?:/[^\s]*)?$").unwrap())
}
```

### 11. `sanitize_type_name` and `sanitize_field_name` duplication with `case_conversion.rs` (`src/json_to_graphql.rs:1790-1943`, `src/case_conversion.rs`)
**Rule:** DRY — don't repeat logic (Rust Design Patterns)
**Problem:** `json_to_graphql.rs` has its own `to_camel_case`, `sanitize_type_name`, `sanitize_field_name` that duplicate/overlap with `case_conversion.rs` but with different edge-case handling.
**Fix:** Consolidate into `case_conversion.rs` with a `NamingConvention` parameter, or document why they differ.

### 12. `filter_line_directives` complex state machine may mishandle nested parens (`src/directive_filter.rs:95-158`)
**Rule:** Parsers should be correct (M-PANIC-ON-BUG)
**Problem:** The `paren_depth` counter assumes directives never contain nested parentheses in arguments (e.g., `@directive(arg: "a(b)")`). GraphQL allows string literals with parens.
**Fix:** Track string literal state or use a proper GraphQL parser. At minimum, add a test for `@dir(arg: "parens(in)string")`.

### 13. `ConversionOptions::default()` hardcodes exclusion lists (`src/types.rs:72-88`)
**Rule:** Configuration should be explicit (Effective Rust Item 22)
**Problem:** Default excludes `Query`, `Mutation`, `Subscription`, `PageInfo`, and 9 suffixes. Users who want these must explicitly clear `exclude_types` and `exclude_type_suffixes`.
**Fix:** Document defaults prominently, or provide `ConversionOptions::minimal()` / `ConversionOptions::permissive()` presets.

### 14. `GqlScalar`, `GqlType`, `GqlValue` missing `Display` impl (`src/types.rs:149-177`)
**Rule:** Types meant to be read should implement `Display` (API Guidelines C-DISPLAY)
**Problem:** These are public types used in error messages and debugging; `Debug` output is verbose.
**Fix:** Add `impl Display` for each, or at least for `GqlType`.

---

## Consider

### 15. Clippy pedantic: `similar_names` in `hints/operations.rs:67,75,105,113`
**Problem:** `fields_obj` vs `field_obj`, `args_obj` vs `arg_obj` — shadowing risk.
**Fix:** Rename to `fields_map`, `field_map`, `args_map`, `arg_map`.

### 16. Clippy pedantic: `unreadable_literal` in `json_to_graphql.rs:1977,1980`
**Problem:** `2166136261` and `16777619` (FNV-1a constants) lack underscores.
**Fix:** `2_166_136_261` and `16_777_619`.

### 17. Clippy pedantic: `needless_raw_string_hashes` in `validation/mod.rs:127`, `validator.rs:580`
**Problem:** Raw strings with `#` delimiters not needed.
**Fix:** Use `r"..."` instead of `r#"..."#`.

### 18. Clippy pedantic: `manual_let_else` in `analysis/coverage.rs:144,195`
**Problem:** `match ... { Some(x) => x, None => continue/return }` instead of `let Some(x) = ... else { ... }`.
**Fix:** Modernize to `let...else`.

### 19. Clippy pedantic: `ignore_without_reason` in `tests/edge_cases.rs:4,118,136,245`
**Problem:** `#[ignore]` without `= "reason"`.
**Fix:** Add reason strings.

### 20. Clippy pedantic: `format_push_string` in `tests/edge_cases.rs:14`
**Problem:** `json.push_str(&format!(...))` allocates intermediate String.
**Fix:** Use `write!(json, ...)`.

### 21. Clippy pedantic: `redundant_closure_for_method_calls` in `tests/integration_tests.rs:30`
**Problem:** `.map(|line| line.trim())` → `.map(str::trim)`.

### 22. Public enums should be `#[non_exhaustive]` (`src/types.rs:7-13, 99-121, 140-147, 392-400`)
**Rule:** Evolution safety (API Guidelines C-NON-EXHAUSTIVE)
**Problem:** `ConversionDirection`, `IdInferenceStrategy`, `OutputFormat`, `DirectiveFilterMode`, `NamingConvention`, `GraphQLTypeKind` are public and likely to gain variants. Adding a variant is a breaking change without `#[non_exhaustive]`.
**Fix:** Add `#[non_exhaustive]` to all public enums.

### 23. `Converter::convert` takes `&str` for input but clones for cache key (`src/lib.rs:123-147`)
**Rule:** Avoid unnecessary allocations (Rust API Guidelines C-ALLOC)
**Problem:** `format!("{:?}:{}", direction, input)` allocates a new String for every call, even cache misses. For large schemas, this is significant.
**Fix:** Use a hash of the input (e.g., `blake3` or `ahash`) as cache key, or accept `&str` and hash incrementally.

### 24. `wasm.rs` duplicates `ConverterOptions` ↔ `ConversionOptions` mapping (`src/wasm.rs:250-321`, `src/schema.rs:27-67`)
**Rule:** DRY (Rust Design Patterns)
**Fix:** Extract to a shared `impl From<ConverterOptions> for ConversionOptions` in `api_types.rs`.

---

## What's already good

- **Clean module structure** with clear separation: core conversion (`json_to_graphql`, `graphql_to_json`), validation, federation, hints, mapping, analysis, DDL, diagram, WASM.
- **Comprehensive test coverage** (180+ tests across unit, integration, edge cases, bug regressions, validation).
- **Proper error handling** with `thiserror`, `Result` throughout, no panics in main conversion paths (except the `from_sdl` issue above).
- **WASM support** with `wasm-bindgen`, panic hook, and typed JS API via `api_types.rs`.
- **Documentation** on all public items with examples; doc tests pass.
- **Feature-gated optional dependencies** (cli, graphql-server, telemetry, caching) with minimal default features.
- **No `unsafe` code** anywhere in the crate.
- **Serde integration** for all public types with proper `#[serde]` attributes.
- **Apollo Federation v2 support** with directive definitions, link generation, and normalization.

---

## Suggested lint config

The project lacks a `[lints]` table in `Cargo.toml`. Adopting the **BeautifulRust** lints (`lints/lints.toml` + `lints/clippy.toml` from https://github.com/morganlinton/BeautifulRust) would catch most of the **Should fix** and **Consider** findings automatically. It would have caught:
- `uninlined_format_args` (#6)
- `cast_precision_loss` (#7)
- `must_use_candidate` (#8)
- `similar_names` (#15)
- `unreadable_literal` (#16)
- `needless_raw_string_hashes` (#17)
- `manual_let_else` (#18)
- `ignore_without_reason` (#19)
- `format_push_string` (#20)
- `redundant_closure_for_method_calls` (#21)

Add to `Cargo.toml`:
```toml
[workspace.lints]
workspace = true
# or copy BeautifulRust's configs directly
```