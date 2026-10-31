# Rust review: converters/rust (json-schema-x-graphql crate)

The crate is a **library** (published to crates.io, `cdylib` + `rlib`, public API with `Converter`, `ConversionOptions`, error types, and WASM bindings). It performs bidirectional JSON Schema ↔ GraphQL SDL conversion with `x-graphql-*` extensions and Apollo Federation v2 support.

**Overall verdict:** Solid, well-tested library with good architectural separation. The core conversion logic is correct and passes all 194 tests. The most important items to address are the **error-type chain-loss** in `ConversionError` (finding #4) and the **invalid-state `ConversionOptions` struct** (finding #5), both of which are API-design mistakes that downstream callers will notice.

**Tools run:**
- `cargo fmt --check` ✅ PASS
- `cargo clippy --all-targets --all-features -- -W clippy::pedantic` ⚠️ **548 warnings** (mostly pedantic style: `uninlined_format_args`, `must_use_candidate`, `cast_precision_loss`, `similar_names`, `redundant_else`, `manual_let_else`, `needless_raw_string_hashes`, `unnested_or_patterns`, `unreadable_literal`, `ignore_without_reason`, `format_push_string`, `redundant_closure_for_method_calls`)
- `cargo test` ✅ **194 tests passed**, 7 ignored

---

## Acceptance

- **Verdict:** accepted with modifications
- **Verified:** `cargo fmt --check` passed; `cargo clippy --all-targets --all-features -- -W clippy::pedantic` produced 548 warnings (draft reported ~450); `cargo test` passed 194 tests with 7 ignored (draft reported 180+).
- **Changes vs draft:**
  1. **Finding #1 (LRU cache bug) — REMOVED.** False positive. The `SimpleLruCache::get` implementation is correct: `IndexMap::shift_remove` + `insert` moves the entry to the back (most-recent) position, and eviction via `keys().next()` correctly removes the front (least-recently-used) entry.
  2. **Finding #2 (from_sdl panics) — RECLASSIFIED from Must fix to Should fix, retitled, rewritten.** The function contains zero `unwrap()`/`expect()` calls and cannot panic. The real issue is that malformed input (e.g. unclosed list `"[String"`) is silently accepted, returning `Ok` with incorrect state. This is a correctness problem, not a panic.
  3. **Finding #3 (error propagation) — DESCRIPTION CORRECTED.** The draft claimed `resolve_ref` returns `Ok(None)` on error; it actually returns `Err(...)` via `?`. The real mechanism is that `resolve_ref_schema` uses `if let Ok(Some(...))` which silently discards the `Err` variant.
  4. **"What's already good" trimmed to 4 items** per skill structure requirement (draft had 9).
  5. **Tool counts updated** (548 clippy warnings, 194 tests).

---

## Must fix

### 1. Error information lost in `resolve_ref_schema` fallback (`src/json_to_graphql.rs:451–457`)
**Rule:** Errors that lose information (C-GOOD-ERR, Rust API Guidelines)
**Problem:** `resolve_ref_schema` calls `Self::resolve_ref` which propagates `try_get_property` errors via `?`. However, `resolve_ref_schema` wraps the call in `if let Ok(Some(resolved)) = ...`, discarding the `Err` variant. When `resolve_ref` fails to locate a property, the error is silently swallowed and the function proceeds to create a placeholder `_external_ref` schema with wrong data — callers never see the underlying failure.
**Fix:**
```rust
fn resolve_ref_schema(&mut self, ref_path: &str) -> Option<&JsonValue> {
    let mut visited = HashSet::new();
    match Self::resolve_ref(self.root_schema, ref_path, &mut visited) {
        Ok(Some(resolved)) => return Some(resolved),
        Ok(None) => {}
        Err(e) => {
            // Log or propagate the error instead of silently ignoring it
            eprintln!("Warning: failed to resolve ref {}: {}", ref_path, e);
        }
    }
    // ... fallback logic
}
```

### 2. Public error type `ConversionError` discards upstream error chains (`src/error.rs:10–84`, `128–137`)
**Rule:** Library errors must implement `std::error::Error` with `source()` (C-GOOD-ERR, Effective Rust Item 7)
**Problem:** Variants `JsonError(String)` and `RegexError(String)` wrap upstream errors as strings via the `From` impls (`err.to_string()`). Downstream callers cannot inspect the cause via `error.source()`, and the original error kind (e.g. `serde_json::ErrorKind`) is lost. As a published library, this is a breaking API gap.
**Fix:** Store the original error where possible. If the upstream error must also be `Serialize`-compatible, use a newtype or feature-gated variant:
```rust
#[derive(Error, Debug, Serialize)]
pub enum ConversionError {
    // ...
    #[error("JSON error: {0}")]
    JsonError(JsonErrorPayload),

    #[error("Regex error: {0}")]
    RegexError(RegexErrorPayload),
    // ...
}

#[derive(Debug, Serialize)]
pub struct JsonErrorPayload(String);

impl std::fmt::Display for JsonErrorPayload {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl From<serde_json::Error> for ConversionError {
    fn from(err: serde_json::Error) -> Self {
        ConversionError::JsonError(JsonErrorPayload(err.to_string()))
    }
}
```
(Full `source()` support requires the upstream error to be stored; trade off against `Serialize` requirements.)

### 3. `ConversionOptions` public fields allow invalid runtime states (`src/types.rs:16–57`)
**Rule:** Make invalid states unrepresentable (Effective Rust Item 1, Rust API Guidelines C-STRUCT)
**Problem:** `ConversionOptions` is a public struct with all fields public. Callers can set `federation_version: 3` (unsupported), `inline_object_threshold: 0` (causes division-by-zero downstream), or contradictory `exclude_types` + `include_operational_types` combinations. No validation is performed before the converter uses these values.
**Fix:** Add a validation step, called by `Converter::with_options`:
```rust
impl ConversionOptions {
    pub fn validate(&self) -> crate::Result<()> {
        if self.inline_object_threshold == 0 {
            return Err(ConversionError::InvalidExtension(
                "inline_object_threshold must be > 0".into()
            ));
        }
        if self.federation_version > 2 {
            return Err(ConversionError::UnsupportedFeature(
                "federation_version > 2 is not supported".into()
            ));
        }
        Ok(())
    }
}
```

---

## Should fix

### 4. `GraphQLType::from_sdl` silently accepts malformed input (`src/types.rs:244–296`)
**Rule:** Parse functions should reject invalid input (M-PANIC-ON-BUG, Effective Rust Item 17)
**Problem:** The parser returns `Ok(...)` for several invalid inputs. For example, `"[String"` (no closing `]`) returns `Ok(GraphQLType { is_list: true, ... })` with no error. Extra trailing characters after valid input are silently ignored. While not a panic (there are no `unwrap()`/`expect()` calls in this function), the function is `pub` and callers rely on it to validate SDL type notation.
**Fix:** Validate that the entire input was consumed and that list brackets are balanced:
```rust
// After parsing, add:
if is_list && !closing_bracket_found {
    return Err("Unclosed list type: missing ']'".to_string());
}
if chars.any(|c| !c.is_whitespace()) {
    return Err(format!("Trailing characters after type: '{}'", chars.collect::<String>()));
}
```

### 5. `format!` with non-inlined variables — ~60 occurrences (clippy::uninlined_format_args)
**Rule:** Prefer inline format args (clippy::uninlined_format_args, Google Rust Style Guide)
**Problem:** `format!("{}", var)` instead of `format!("{var}")`. Minor allocation overhead; clippy flags it pervasively across `json_to_graphql.rs`, `analysis/coverage.rs`, `hints/operations.rs`, and tests.
**Fix:** Run `cargo clippy --fix` or update manually.

### 6. `usize` → `f64` cast precision loss in coverage reports (`src/analysis/coverage.rs:89, 106, 169, 186`)
**Rule:** Avoid silent precision loss (clippy::cast_precision_loss)
**Problem:** `usize` can be 64-bit; `f64` mantissa is 52 bits. For extremely large schemas, coverage percentages could be inaccurate. Unlikely in practice but the lint is correct.
**Fix:** Use `f64::from(mapped) / f64::from(total)` and add `#[allow(clippy::cast_precision_loss)]` with a comment if accepted.

### 7. Missing `#[must_use]` on pure functions — ~50+ functions flagged (clippy::must_use_candidate)
**Rule:** Add `#[must_use]` to pure functions (Rust API Guidelines C-MUST-USE)
**Problem:** Public functions such as `is_complete()`, `compute_coverage()`, `format_coverage_report()` have no side effects and their results can be silently discarded.
**Fix:** Add `#[must_use]` to flagged public functions and methods whose entire purpose is to return a value.

### 8. `DirectiveFilterMode::Custom` uses case-insensitive matching for directive names (`src/directive_filter.rs:64–69`)
**Rule:** Explicit case handling (Rust API Guidelines C-CASE)
**Problem:** `eq_ignore_ascii_case` means `@Key` and `@key` are treated identically. GraphQL directive names are case-sensitive per the spec (all spec directives use lowercase). If case-insensitivity is intentional for user convenience, it should be documented.
**Fix:** Either match exactly or document the case-insensitive behavior with a comment explaining the intent.

### 9. `validator.rs` URL regex is too permissive (`src/validator.rs:36–39`)
**Rule:** Validation should reject invalid inputs (Effective Rust Item 17)
**Problem:** `r"^https?://[^\s/$.?#].[^\s]*$"` accepts `http://` (no host), `http:///path`, and other invalid URLs.
**Fix:** Use a stricter regex or `url::Url::parse()`:
```rust
fn url_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| Regex::new(r"^https?://[a-zA-Z0-9.-]+(?::\d+)?(?:/[^\s]*)?$").unwrap())
}
```

### 10. `sanitize_type_name` and `sanitize_field_name` overlap with `case_conversion.rs` (`src/json_to_graphql.rs:1790–1943`, `src/case_conversion.rs`)
**Rule:** DRY — avoid duplicated logic (Rust Design Patterns)
**Problem:** `json_to_graphql.rs` has its own `to_camel_case`, `sanitize_type_name`, `sanitize_field_name` that duplicate/overlap with `case_conversion.rs` (`camel_to_snake`, `snake_to_camel`) but with slightly different edge-case handling.
**Fix:** Consolidate into `case_conversion.rs` with a `NamingConvention` parameter, or document clearly why the two versions differ.

### 11. `filter_line_directives` state machine mishandles parens in string literals (`src/directive_filter.rs:95–158`)
**Rule:** Parsers should be correct (M-PANIC-ON-BUG)
**Problem:** The `paren_depth` counter assumes parentheses in directive arguments are always paired for nesting. GraphQL allows string literals like `@dir(arg: "value(with)parens")` — the parens inside the string would throw off the depth counter, causing premature or missed directive boundaries.
**Fix:** Track whether the parser is currently inside a string literal, or add a test for this case and document the limitation.

### 12. `ConversionOptions::default()` hardcodes exclusion lists (`src/types.rs:72–88`)
**Rule:** Configuration should be explicit (Effective Rust Item 22)
**Problem:** The default excludes `Query`, `Mutation`, `Subscription`, `PageInfo`, and 9 type suffixes. Users who need these must explicitly clear the vectors, which is easy to miss.
**Fix:** Provide `ConversionOptions::minimal()` / `ConversionOptions::permissive()` presets, or document the defaults prominently in the struct-level doc comment.

### 13. `GqlScalar`, `GqlType`, `GqlValue` missing `Display` impl (`src/types.rs:149–177`)
**Rule:** Types meant to be read should implement `Display` (Rust API Guidelines C-DISPLAY)
**Problem:** These are public types used in error messages and debugging; `Debug` output is verbose and not user-facing.
**Fix:** Add `impl Display` for each, or at minimum for `GqlType`.

---

## Consider

### 14. Clippy pedantic: `similar_names` (`src/hints/operations.rs:67, 75, 105, 113`)
**Problem:** `fields_obj` vs `field_obj`, `args_obj` vs `arg_obj` — easy to misread.
**Fix:** Rename to `fields_map`, `field_map`, `args_map`, `arg_map`.

### 15. Clippy pedantic: `unreadable_literal` (`src/json_to_graphql.rs:1977, 1980`)
**Problem:** `2166136261` and `16777619` (FNV-1a constants) lack underscores.
**Fix:** `2_166_136_261` and `16_777_619`.

### 16. Clippy pedantic: `needless_raw_string_hashes` (`src/validation/mod.rs:127`, `src/validator.rs:580`)
**Problem:** Raw strings use `r#"..."#` delimiters when no `#` appears in the content.
**Fix:** Use `r"..."` instead.

### 17. Clippy pedantic: `manual_let_else` (`src/analysis/coverage.rs:144, 195`)
**Problem:** `match ... { Some(x) => x, None => continue/return }` instead of `let Some(x) = ... else { ... }`.
**Fix:** Modernize to `let`…`else` (available since Rust 1.65).

### 18. Clippy pedantic: `ignore_without_reason` (`tests/edge_cases.rs:4, 118, 136, 245`)
**Problem:** `#[ignore]` uses `//` comments instead of `= "reason"` syntax, which clippy cannot read.
**Fix:** Change to `#[ignore = "reason string"]`.

### 19. Clippy pedantic: `format_push_string` (`tests/edge_cases.rs:14`)
**Problem:** `json.push_str(&format!(...))` allocates an intermediate String.
**Fix:** Use `write!(json, ...)`.

### 20. Clippy pedantic: `redundant_closure_for_method_calls` (`tests/integration_tests.rs:30`)
**Problem:** `.map(|line| line.trim())` instead of `.map(str::trim)`.

### 21. Public enums should be `#[non_exhaustive]` (`src/types.rs:7–13, 100–121, 141–147, 392–400`)
**Rule:** Evolution safety (Rust API Guidelines C-NON-EXHAUSTIVE)
**Problem:** `ConversionDirection`, `IdInferenceStrategy`, `OutputFormat`, `DirectiveFilterMode`, `NamingConvention`, `GraphQLTypeKind` are public and likely to gain variants. Adding a variant is a breaking change without `#[non_exhaustive]`.
**Fix:** Add `#[non_exhaustive]` to all public enums.

### 22. `Converter::convert` clones entire input for cache key (`src/lib.rs:123–147`)
**Rule:** Avoid unnecessary allocations (Rust API Guidelines C-ALLOC)
**Problem:** `format!("{:?}:{}", direction, input)` allocates a new String for every call. For large schemas this is significant overhead.
**Fix:** Hash the input (e.g. with `ahash` if already a dependency) and use the hash as the cache key, or structure the cache to avoid the clone.

### 23. `wasm.rs` and `schema.rs` duplicate `ConverterOptions` → `ConversionOptions` mapping (`src/wasm.rs:250–321`, `src/schema.rs:27–67`)
**Rule:** DRY (Rust Design Patterns)
**Fix:** Extract the mapping into a shared `impl From<ConverterOptions> for ConversionOptions` in or near `api_types.rs`.

---

## What's already good

- **Clean module structure** with clear separation: core conversion, validation, federation, hints, mapping, analysis, DDL, diagram, and WASM — each in its own module.
- **Comprehensive test coverage** (194 tests across unit, integration, edge cases, bug regressions, and validation), all passing.
- **Strong error handling discipline** — `thiserror` throughout, `Result` return types, no panics in main conversion paths, and no `unsafe` code anywhere.
- **WASM support** with `wasm-bindgen`, panic hook, and a typed JS API layer via `api_types.rs`.

---

## Suggested lint config

The project lacks a `[lints]` table in `Cargo.toml`. Adopting the **BeautifulRust** lints (`lints/lints.toml` + `lints/clippy.toml` from https://github.com/morganlinton/BeautifulRust) would catch most of the **Should fix** and **Consider** findings automatically. It would have caught:

- `uninlined_format_args` (#5)
- `cast_precision_loss` (#6)
- `must_use_candidate` (#7)
- `similar_names` (#14)
- `unreadable_literal` (#15)
- `needless_raw_string_hashes` (#16)
- `manual_let_else` (#17)
- `ignore_without_reason` (#18)
- `format_push_string` (#19)
- `redundant_closure_for_method_calls` (#20)

Add to `Cargo.toml`:

```toml
[workspace.lints]
workspace = true
# or copy BeautifulRust's configs directly
```