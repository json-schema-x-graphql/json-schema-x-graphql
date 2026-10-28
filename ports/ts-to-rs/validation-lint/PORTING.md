# Porting notes: TypeScript `validation-lint` to Rust

## Behavior inventory

- All three public operations accept a JSON-Schema-shaped value and return an ordered array of lint findings. Findings are data, not failures, so the Rust functions return `Vec<ValidationIssue>` rather than `Result`.
- `lintSchema` recursively visits objects and arrays. At each object it reports deprecated attributes in the fixed mapping order, then non-standard `x-*` attributes in object-key order, then recursively visits children. Arrays use zero-based bracket paths. Null, scalars, and empty containers produce no findings themselves.
- Deprecated attributes have `error` severity. Invalid prefixes, missing object type names, lowercase type-name initials, and snake_case field names have `warning` severity. Every finding uses the validator `x-graphql-lint`.
- `lintDefinitionsCompleteness` reads `$defs`, falling back to `definitions` only when `$defs` is absent or null. It checks definitions in object-key order and emits at most one missing-type-name, one type-name-case, and one finding per matching field.
- `lintAll` returns all `lintSchema` findings first, followed by all `lintDefinitionsCompleteness` findings.

## API mapping

| TypeScript export | Rust equivalent |
| --- | --- |
| `ValidationIssue` interface | `ValidationIssue` struct with public `path`, `message`, `severity`, and `validator` fields |
| `ValidationIssue.severity: "error" \| "warning"` | `ValidationSeverity::{Error, Warning}`, with lowercase `Display` and exact, case-sensitive `FromStr` parsing |
| `lintSchema(schema: any): ValidationIssue[]` | `lint_schema(schema: &serde_json::Value) -> Vec<ValidationIssue>` |
| `lintDefinitionsCompleteness(schema: any): ValidationIssue[]` | `lint_definitions_completeness(schema: &serde_json::Value) -> Vec<ValidationIssue>` |
| `lintAll(schema: any): ValidationIssue[]` | `lint_all(schema: &serde_json::Value) -> Vec<ValidationIssue>` |

`ParseValidationSeverityError` is the Rust error type required by `FromStr`; it has no separate TypeScript counterpart. The source has no other closed issue-kind string set, and `validator` therefore remains a `String`.

## Test mapping

There are 10 Jest tests and 10 Rust integration tests.

| Jest test | Rust test in `tests/validation_lint.rs` |
| --- | --- |
| `detects deprecated x-* attributes` | `detects_deprecated_x_attributes` |
| `detects invalid x-* prefixes` | `detects_invalid_x_prefixes` |
| `allows permitted non-graphql x-* attributes` | `allows_permitted_non_graphql_x_attributes` |
| `allows x-graphql-* and x-viaduct-*` | `allows_x_graphql_and_x_viaduct` |
| `warns on missing x-graphql-type-name for object definitions` | `warns_on_missing_x_graphql_type_name_for_object_definitions` |
| `warns on type-name not in PascalCase` | `warns_on_type_name_not_in_pascal_case` |
| `warns on field-name using snake_case` | `warns_on_field_name_using_snake_case` |
| `does not warn on clean schema` | `does_not_warn_on_clean_schema` |
| `returns empty for a clean schema` | `returns_empty_for_a_clean_schema` |
| `combines issues from both linters` | `combines_issues_from_both_linters` |

The two clean-schema tests retain the original assertions: they check for no error-severity findings, despite their broader names.

## Deliberate differences

- The Rust API accepts only `serde_json::Value`, not arbitrary JavaScript values, prototypes, functions, symbols, or cyclic objects. It does not reproduce JavaScript runtime exceptions for malformed annotation types.
- Object insertion order is retained with `serde_json`'s `preserve_order` feature. For integer-like object keys, JavaScript's special numeric-key enumeration order can still differ from JSON insertion order.
- Definitions and properties must be JSON objects in Rust. JavaScript's `Object.entries` can also enumerate arrays and strings in these positions; those malformed containers are ignored by the Rust port.
- Non-string `x-graphql-type-name` and `x-graphql-field-name` values are ignored. The TypeScript casts do not perform runtime checks and can throw for some truthy non-string values.
- Type-name casing uses a Rust Unicode scalar and `char::to_uppercase`, while TypeScript uses the first UTF-16 code unit and JavaScript's `toUpperCase`. Ordinary ASCII and BMP names behave the same; supplementary-plane casing can differ.

## Preserved quirks

- A deprecated attribute also violates the non-standard-prefix rule, so it produces both an error and a warning.
- Completeness findings always use paths beginning `$.$defs`, even when the definitions came from the legacy `definitions` key.
- A missing-type-name check uses key presence: null `x-graphql-type-name` or `title` values suppress that warning.
- Only a truthy `x-graphql-enum` value skips a definition; false, null, zero, and an empty string do not.
- The PascalCase rule checks only whether the first character changes when uppercased. It does not validate the remainder of the name.
- The federation-key block in the TypeScript source emits no findings, so the Rust port intentionally has no federation-key lint.
- Object keys are interpolated into paths without escaping, and all issue messages and capitalization match the TypeScript text.

## Verification

Run from `ports/ts-to-rs/validation-lint/`:

| Command | Result |
| --- | --- |
| `cargo test` | Passed: 10 integration tests, 0 failures; unit and doc test suites also passed |
| `cargo clippy --all-targets -- -D warnings` | Passed with no warnings |
| `cargo fmt --check` | Passed with no formatting changes needed |
