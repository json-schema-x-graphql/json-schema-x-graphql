# Implementation Plan: Standardized Converter API

This plan outlines the steps to unify the Node.js and Rust converters under a single, strictly typed API defined by the GraphQL SDL (`schema/converter-api.graphql`).

**Status Update**: The GraphQL SDL has been updated with improved semantics for federation, ID inference, output formats, and diagnostics.

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
3.  **Generate**: Run `graphql-codegen` to produce `src/generated/types.ts`.

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

## Phase 5: Documentation

1.  **Update README**:
    *   Document the `ConverterOptions` available in the SDL.
    *   Explain the new `IdInferenceStrategy`, `FederationVersion` modes, and `OutputFormat`.
    *   Explain how to generate the types for consumers.