# Implementation Plan: Standardized Converter API

This plan outlines the steps to unify the Node.js and Rust converters under a single, strictly typed API defined by the GraphQL SDL (`schema/converter-api.graphql`).

**Status Update**: The GraphQL SDL has been updated with improved semantics for federation, ID inference, output formats, and diagnostics. Type generation for Node has been completed (`converters/node/src/generated/types.ts`). The Rust API types in `converters/rust/src/api_types.rs` match the SDL. **Node and Rust converters are refactored and the full workspace parity suite now passes** (`pnpm -w -C converters/node test --silent` green). External refs and inline ordering are aligned; fuzz edge cases now succeed.

**Parity Progress**:

- **Sanitization**: Aligned.
- **Empty Objects**: Aligned.
- **Collision Detection**: Aligned (Rust implements two-pass strategy).
- **Inline Objects**: Aligned (Rust implements recursive generation).
- **Validation**: Aligned (Rust validation relaxed).
- **Tests**: Parity harness and workspace runner both green; external refs, ordering, and combinators are aligned.

**Remaining Parity Work**:

- None blocking. Minor formatting differences (whitespace) are acceptable.
- Recursion depth handling differences are acceptable.

**Immediate Next Steps**:

1.  **Phase 4 (Verification & Benchmarking)**: Refresh benchmarks/scripts to use the standardized options; run/update `scripts/benchmark.mjs` if needed.
2.  **Phase 5 (Documentation)**: Document `ConverterOptions` (SDL), behaviors (inline thresholds, external ref placeholders), and the now-passing parity status. Consider noting ts-jest `esModuleInterop` warnings as non-blocking.
3.  **Frontend Completion Plan**: See `frontend/IMPLEMENTATION_PLAN.md` for the focused plan to finish the editor (converter integration, UX polish, testing, and release tasks).

## Phase 1: Type Generation

**Status**: Completed. Node and Rust type surfaces are in sync with `schema/converter-api.graphql`.

**Goal**: Generate TypeScript interfaces and Rust structs from the `converter-api.graphql` source of truth.

### 1.1 Node.js (TypeScript)

1.  **Install Dependencies**:
    ```bash
    npm install --save-dev @graphql-codegen/cli @graphql-codegen/typescript
    ```
2.  **Configure Codegen**:
    Create `converters/node/codegen.ts`:

    ```typescript
    import type { CodegenConfig } from "@graphql-codegen/cli";

    const config: CodegenConfig = {
      overwrite: true,
      schema: "../../schema/converter-api.graphql",
      generates: {
        "src/generated/types.ts": {
          plugins: ["typescript"],
          config: {
            enumsAsTypes: true, // Optional: depending on preference
          },
        },
      },
    };
    export default config;
    ```

3.  **Generate**: Run `graphql-codegen` to produce `src/generated/types.ts`. (Completed) The TypeScript types have been updated to reflect the SDL edits — see `converters/node/src/generated/types.ts` for the resulting declarations (includes `inferIds` precedence note and `AST_JSON` stability note).

### 1.2 Rust

Status: Completed. `converters/rust/src/api_types.rs` mirrors the SDL (naming convention, id strategy, output format, federation flags, diagnostics enums). Serde naming is aligned with GraphQL field names.

## Phase 2: Node Converter Refactor

**Status**: Completed for parity scope. Converter implements `ConverterOptions`, supports `idStrategy` vs `inferIds`, `outputFormat`, federation toggles, diagnostics counts/kind, and CLI wiring. `output` replaces legacy `sdl` field.

**Follow-ups (optional)**:

- Keep CLI help text and README examples in sync with the finalized option names.
- Confirm `esModuleInterop` warnings remain non-blocking or silence via ts-jest config if desired.

## Phase 3: Rust Converter Refactor

**Status**: Completed for parity scope. `api_types.rs` matches the SDL; `json_to_graphql.rs` handles naming conventions, id strategy, output formats (SDL/AST JSON), federation options, diagnostic kinds/counts, and uses `output` instead of `sdl`. WASM entrypoint is wired through `convert_json_to_graphql`.

**Follow-ups (optional)**:

- Expand AST JSON conformance tests if new shapes are added.
- Keep `wasm` bindings regenerated when the SDL evolves.

## Phase 4: Verification & Benchmarking

**Goal**: Lock in performance and behavioral parity across option combinations.

1.  **Benchmark Script Refresh**:
    - Ensure `scripts/benchmark.mjs` (and `scripts/test-both-converters.js` if used) passes the standardized CLI flags: `--naming-convention`, `--id-strategy`, `--output-format`, `--include-federation-directives`, `--federation-version`.
    - Run with `namingConvention=GRAPHQL_IDIOMATIC`, `outputFormat=SDL` and `AST_JSON` to compare both converters.

2.  **Behavioral Verification**:
    - Add/refresh fixtures for `idStrategy` modes (COMMON_PATTERNS vs ALL_STRINGS vs NONE) and compare outputs/diagnostics.
    - Add a federation fixture (`includeFederationDirectives=true`, `federationVersion=V2`/`AUTO`) and ensure directives/keys match.
    - Add a warning-triggering schema and assert `failOnWarning=true` yields matching failure semantics.

3.  **Report**:
    - Capture benchmark results in `output/benchmark/` (or equivalent) and summarize any deltas.

## Phase 5: Documentation

**Goal**: Publish the finalized API surface and behaviors.

1.  **README / Docs Refresh**:
    - Document `ConverterOptions` (source of truth: `schema/converter-api.graphql`) in `README.md` and `docs/README.md`.
    - Describe behaviors: naming conventions, inline/external ref handling, federation toggles, `output` vs `sdl`, diagnostics counts/kinds, `idStrategy` precedence over `inferIds`.
    - Note supported output formats (SDL, SDL_WITH_FEDERATION_METADATA, AST_JSON) and when AST JSON is preferred.

2.  **CLI Examples**:
    - Update CLI usage snippets to show new flags and example invocations for both Node and Rust binaries/WASM.

3.  **Testing Guidance**:
    - Update `docs/TESTING_GUIDE.md` (or add a short section) describing the parity harness, `pnpm -w -C converters/node test --silent`, and how to run benchmarks with standardized options.
