# Implementation Plan: Standardized Converter API

This plan outlines the steps to unify the Node.js and Rust converters under a single, strictly typed API defined by the GraphQL SDL (`schema/converter-api.graphql`).

**Status Update**: The GraphQL SDL has been updated with improved semantics for federation, ID inference, output formats, and diagnostics. Type generation for Node has been completed (`converters/node/src/generated/types.ts`). The Rust API types in `converters/rust/src/api_types.rs` match the SDL. **Node converter refactor is complete and the parity harness now passes end-to-end.** The workspace test runner still fails due to the Rust example path rejecting `fuzz_edge_cases` (`InvalidType("schema must be an object")`); outputs are cleared to avoid stale comparisons.

**Parity Progress**:
- **Sanitization**: Aligned.
- **Empty Objects**: Aligned.
- **Collision Detection**: Aligned (Rust implements two-pass strategy).
- **Inline Objects**: Aligned (Rust implements recursive generation).
- **Validation**: Aligned (Rust validation relaxed).
- **Tests**: Parity harness passing for all fixtures when run via `src/parity.test.ts`. Workspace `pnpm -w -C converters/node test --silent` still fails because the Rust example runner returns `InvalidType("schema must be an object")` on `fuzz_edge_cases`.

**Remaining Parity Work**:
- Address the Rust example runner failure on `fuzz_edge_cases` (either handle empty objects consistently or skip in example path).
- Minor formatting differences (whitespace) are acceptable.
- Recursion depth handling differences are acceptable.

**Immediate Next Steps**:
1.  **Phase 3 (Rust Refactor)**: Update the Rust converter to fully implement the new `ConverterOptions` interface and handle problematic fixtures (e.g., `fuzz_edge_cases`) without hard failures.
2.  **Verification**: Ensure both converters pass the comprehensive test suite with the new options enabled, including workspace-level runners.

## Phase 1: Type Generation

**Goal**: Generate TypeScript interfaces and Rust structs from the `converter-api.graphql` source of truth.

### 1.1 Node.js (TypeScript)
1.  **Install Dependencies**:
    ```bash
    npm install --save-dev @graphql-codegen/cli @graphql-codegen/typescript
    ```
2.  **Configure Codegen**:
    Create `converters/node/codegen.ts`:
    ```typescript
    import type { CodegenConfig } from '@graphql-codegen/cli';

    const config: CodegenConfig = {
      overwrite: true,
      schema: "../../schema/converter-api.graphql",
      generates: {
        "src/generated/types.ts": {
          plugins: ["typescript"],
          config: {
            enumsAsTypes: true // Optional: depending on preference
          }
        }
      }
    };
    export default config;
    ```
3.  **Generate**: Run `graphql-codegen` to produce `src/generated/types.ts`. (Completed) The TypeScript types have been updated to reflect the SDL edits — see `converters/node/src/generated/types.ts` for the resulting declarations (includes `inferIds` precedence note and `AST_JSON` stability note).

### 1.2 Rust
1.  **Tooling**: Use `async-graphql` or a dedicated codegen tool like `graphql-client` (though we are implementing the server-side of the interface, so we might need to manually map structs or use a schema-derive macro if available).
2.  **Manual Mapping (Recommended for Control)**:
    Update `converters/rust/src/api_types.rs` to mirror the updated SDL.
    ```rust
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Deserialize, Serialize)]
    pub struct ConverterOptions {
        pub validate: bool,
        pub include_descriptions: bool,
        pub preserve_field_order: bool,
        pub federation_version: FederationVersion,
        pub include_federation_directives: bool, // New
        pub naming_convention: NamingConvention,
        pub infer_ids: bool, // Deprecated
        pub id_strategy: IdInferenceStrategy, // New (Default: NONE)
        pub output_format: OutputFormat, // New
        pub fail_on_warning: bool, // New
        pub exclude_types: Option<Vec<String>>,
        pub exclude_patterns: Option<Vec<String>>,
    }

    #[derive(Debug, Deserialize, Serialize)]
    pub enum FederationVersion {
        NONE,
        V1,
        V2,
        AUTO, // New
    }

    #[derive(Debug, Deserialize, Serialize)]
    pub enum IdInferenceStrategy {
        NONE,
        COMMON_PATTERNS,
        ALL_STRINGS,
    }

    #[derive(Debug, Deserialize, Serialize)]
    pub enum OutputFormat {
        SDL,
        SDL_WITH_FEDERATION_METADATA,
        AST_JSON,
    }
    
    // Ensure DiagnosticKind includes OTHER
    ```
    *Note: Ensure `serde` rename attributes are used to match the GraphQL field names if they differ (camelCase vs snake_case).*

## Phase 2: Node Converter Refactor

**Goal**: Update the Node converter to implement the generated interface.

1.  **Define Interface**:
    Create `converters/node/src/interfaces.ts`:
    ```typescript
    import { ConvertInput, ConversionResult } from './generated/types';

    export interface IJsonSchemaConverter {
      convert(input: ConvertInput): Promise<ConversionResult>;
    }
    ```
2.  **Refactor `Converter` Class**:
    *   Update `converters/node/src/converter.ts` to implement `IJsonSchemaConverter`.
    *   Change the `options` argument to match `ConverterOptions` from the generated types.
    *   **New Logic**:
        *   Implement `idStrategy` (replacing `inferIds` logic).
        *   Implement `includeFederationDirectives` flag.
        *   Implement `FederationVersion.AUTO` scanning logic.
        *   Implement `failOnWarning` check at the end of conversion.
        *   Populate `errorCount` and `warningCount` in `ConversionResult`.
        *   **Rename**: Populate `output` field (previously `sdl`) in `ConversionResult`.
        *   Add `kind` to `Diagnostic` objects.
    *   Map the `NamingConvention` enum to the internal logic (e.g., if `GRAPHQL_IDIOMATIC`, enable the `toCamelCase` transformation).

3.  **Update CLI**:
    *   Refactor `converters/node/src/cli.ts` to parse command line arguments into the `ConverterOptions` structure before calling the converter.

## Phase 3: Rust Converter Refactor

**Goal**: Update the Rust converter to align with the standard API.

1.  **Update `ConversionOptions` Struct**:
    *   Modify `converters/rust/src/types.rs` (or `api_types.rs`) to match the updated fields in `ConverterOptions` (SDL).
    *   Add `naming_convention`, `exclude_types`, `exclude_patterns`.
    *   Add `id_strategy`, `output_format`, `fail_on_warning`, `include_federation_directives`.

2.  **Implement Logic**:
    *   Update `json_to_graphql.rs` to respect `naming_convention`.
        *   If `PRESERVE`, skip `snake_to_camel` / `snake_to_pascal`.
        *   If `GRAPHQL_IDIOMATIC`, use the existing transformation logic.
    *   Implement `FederationVersion::AUTO` logic (scan for directives).
    *   Implement `IdInferenceStrategy`.
    *   Implement `OutputFormat` (initially support SDL, stub others if needed).
    *   Implement `fail_on_warning` logic.
    *   Categorize diagnostics with `DiagnosticKind`.
    *   **Rename**: Ensure `ConversionResult` struct uses `output` instead of `sdl`.

3.  **WASM Entrypoint**:
    *   Update `converters/rust/src/wasm.rs` to expose a `convert_json_to_graphql` function that accepts the `ConvertInput` JSON object and returns `ConversionResult`.

## Phase 4: Verification & Benchmarking

1.  **Update Benchmark Script**:
    *   Modify `scripts/benchmark.mjs` to pass arguments that align with the new CLI flags (which should now mirror `ConverterOptions`).
    *   Ensure both converters are run with `namingConvention: GRAPHQL_IDIOMATIC` to ensure a fair comparison of output quality.

2.  **Parity Check**:
    *   Run the benchmark.
    *   Compare outputs. The Node converter (now with `toCamelCase` and Federation support) should produce output much closer to the Rust converter.
    *   Verify `Diagnostic` structures match between implementations.

3.  **New Feature Verification**:
    *   **ID Strategy**: Create a test case with `idStrategy: PROVIDED` vs `idStrategy: AUTO` and verify both converters produce identical output for each mode.
    *   **Federation**: Create a test case with `includeFederationDirectives: true` and `federationVersion: 2.0` and verify `@key` directives are generated identically.
    *   **Output Format**: Verify `outputFormat: JSON` (if implemented) produces identical AST JSON.
    *   **Error Handling**: Create a schema that triggers a warning and verify `failOnWarning: true` causes both converters to error out with the same diagnostic code.

## Phase 5: Documentation

1.  **Update README**:
    *   Document the `ConverterOptions` available in the SDL.
    *   Explain the new `IdInferenceStrategy`, `FederationVersion` modes, and `OutputFormat`.
    *   Explain how to generate the types for consumers.