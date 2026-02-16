# Converter Parity and Performance Report

## 1. Executive Summary

This report compares the functionality, performance, and output quality of the Node.js and Rust converters for the `json-schema-x-graphql` project.

**Key Findings:**

- **Performance**: The Rust converter is approximately **5x faster** than the Node.js converter.
- **Output Quality**: The Rust converter produces more idiomatic GraphQL SDL, automatically handling `snake_case` to `camelCase` conversion for fields and using Block Strings (`"""`) for descriptions.
- **Federation Support**: The Rust converter has superior support for Apollo Federation v2, correctly interpreting shorthand flags (e.g., `x-graphql-federation-shareable`) and supporting a structured `x-graphql` configuration object. The Node converter currently misses some federation shorthand flags.
- **Parity Status**: While both converters handle the core schema structure (Types, Scalars, Enums), there are significant differences in naming conventions and directive handling that prevent 1:1 output parity at this time.

## 2. Performance Benchmark

Benchmarks were run against 6 real-world schemas.

| Metric                     | Node.js Converter     | Rust Converter      | Improvement      |
| :------------------------- | :-------------------- | :------------------ | :--------------- |
| **Average Execution Time** | ~22.94 ms             | ~4.62 ms            | **4.99x Faster** |
| **Memory Usage**           | High (V8 Overhead)    | Low (Native Binary) | N/A              |
| **Startup Time**           | Slower (Node runtime) | Instant             | N/A              |

_Note: Benchmarks performed on local environment with 5 iterations per schema._

## 3. Feature Parity Matrix

| Feature                      |     Node.js Support     |      Rust Support       | Notes                                                          |
| :--------------------------- | :---------------------: | :---------------------: | :------------------------------------------------------------- |
| **Standard Types**           |           ✅            |           ✅            | Objects, Scalars, Enums, Unions, Interfaces, Inputs            |
| **Custom Scalars**           |           ✅            |           ✅            | Via `x-graphql-scalars`                                        |
| **Field Naming**             |    ⚠️ Preserves JSON    |      ✅ camelCase       | Rust enforces GraphQL conventions; Node preserves `snake_case` |
| **Descriptions**             | ⚠️ String Literal (`"`) | ✅ Block String (`"""`) | Rust handles multi-line descriptions better                    |
| **Explicit Directives**      |           ✅            |           ✅            | Via `x-graphql-directives`                                     |
| **Federation: Keys**         |           ✅            |           ✅            | `x-graphql-federation-keys`                                    |
| **Federation: Shareable**    |       ❌ Missing        |           ✅            | `x-graphql-federation-shareable`                               |
| **Federation: Inaccessible** |       ❌ Missing        |           ✅            | `x-graphql-federation-inaccessible`                            |
| **Federation: V2 Scopes**    |       ❌ Missing        |           ✅            | `x-graphql-federation-requires-scopes`                         |
| **Config Structure**         |  Flat (`x-graphql-*`)   |      Flat & Nested      | Rust supports `x-graphql: { federation: { ... } }`             |

## 4. Detailed Assessment

### Node.js Converter

- **Strengths**:
  - Easy to extend and modify for JavaScript developers.
  - Good support for custom scalars and basic type mapping.
- **Weaknesses**:
  - **Federation Gaps**: Does not appear to automatically map boolean federation flags (like `shareable`) to directives in the output.
  - **Naming Conventions**: Outputs fields in `snake_case` if the source JSON is `snake_case`. While valid GraphQL, it violates standard conventions.
  - **Formatting**: Uses single-line string literals for descriptions, which can be messy for long text.

### Rust Converter

- **Strengths**:
  - **Performance**: Significantly faster.
  - **Idiomatic Output**: Automatically converts `snake_case` JSON properties to `camelCase` GraphQL fields.
  - **Robust Federation**: Explicitly handles a wide range of Federation v2 directives (`@shareable`, `@inaccessible`, `@authenticated`, `@requiresScopes`, `@interfaceObject`, etc.).
  - **Flexible Config**: Supports both the flat `x-graphql-*` keys and a cleaner `x-graphql` object structure.
- **Weaknesses**:
  - Stricter compilation requirements.

## 5. Discrepancies & Observations

### Naming Convention Mismatch

The most visible difference in output is field naming.

- **Source**: `ia_piid_or_unique_id`
- **Node Output**: `ia_piid_or_unique_id: String`
- **Rust Output**: `iaPiidOrUniqueId: String`

This makes the Rust output "production-ready" for GraphQL clients, whereas the Node output might require a manual pass or a breaking change to the schema to align with frontend expectations.

### Directive Handling

The Node converter relies on `x-graphql-directives` for most directive injection. The Rust converter has dedicated logic to parse specific `x-graphql-federation-*` flags and inject the corresponding directives.

- **Example**: `x-graphql-federation-shareable: true`
  - **Rust**: Generates `type MyType @shareable { ... }`
  - **Node**: Generates `type MyType { ... }` (Directive missing)

## 6. Recommendations

1.  **Adopt Rust as Primary**: Given the performance speedup and superior Federation v2 support, the Rust converter should be the primary engine for the CLI and WASM integrations.
2.  **Update Node for Parity**: If the Node converter is maintained as a reference implementation, it must be updated to:
    - Implement `snake_to_camel` case conversion for fields.
    - Add logic to handle boolean federation flags (`shareable`, `inaccessible`, etc.) and inject the directives.
    - Switch to Block String format for descriptions.
3.  **Standardize Configuration**: Update documentation to encourage the nested `x-graphql: { ... }` configuration structure supported by Rust, and implement support for it in Node.
