# Implementation Plan: Converter Improvements

This document outlines the step-by-step plan to enhance the Node.js and Rust converters based on the architectural improvements and code snippets defined in `docs/CODE_SNIPPETS_FOR_IMPROVEMENTS.md`.

## Goals

1.  **Robustness**: Handle complex schemas with circular references and deep nesting.
2.  **Flexibility**: Support flexible naming conventions (snake_case <-> camelCase).
3.  **Control**: Allow fine-grained filtering of output types.
4.  **Parity**: Ensure feature parity between Node.js and Rust implementations.

## Phase 1: Node.js Converter Enhancements

**Target Directory**: `converters/node/src`

### Step 1.1: Case Conversion Utilities

Create a dedicated utility module for handling field name transformations.

- **Action**: Create `converters/node/src/case-conversion.ts`.
- **Content**: Implement `camelToSnake`, `snakeToCamel`, `convertObjectKeys`, and `convertGraphQLFields` as defined in snippets.
- **Integration**: Export these functions for use in the main converter.

### Step 1.2: Enhanced $ref Resolution

Improve the reference resolution logic to handle recursion and case-insensitive matching.

- **Action**: Update `resolveRef` in `converters/node/src/converter.ts`.
- **Changes**:
  - Add `visited` Set to track circular references during resolution.
  - Implement recursive resolution for nested `$ref`s.
  - Add fallback logic to try `snake_case` and `camelCase` property names if exact match fails.

### Step 1.3: Circular Reference Protection

Prevent infinite loops during type generation.

- **Action**: Update `ConversionContext` and `convertTypeDefinition` in `converters/node/src/converter.ts`.
- **Changes**:
  - Add `building: Set<string>` to `ConversionContext`.
  - Check `building` set before starting type conversion.
  - Throw `CIRCULAR_REF` error if a cycle is detected.
  - Ensure `building.delete(typeName)` is called in a `finally` block.

### Step 1.4: Type Filtering

Allow users to exclude specific types or patterns from the output.

- **Action**: Update `ConversionOptions` and conversion logic in `converters/node/src/converter.ts`.
- **Changes**:
  - Add `excludeTypes`, `excludeTypeSuffixes`, and `includeOperationalTypes` to `ConversionOptions`.
  - Implement `shouldExcludeType` helper method.
  - Apply filtering in the main conversion loop before processing definitions.

### Step 1.5: $defs Extraction

Ensure types defined in `$defs` (or `definitions`) are properly extracted and converted.

- **Action**: Verify and update the main `convert` loop.
- **Changes**:
  - Iterate through `$defs` entries.
  - Extract `x-graphql-type-name`.
  - Convert and append to output if not excluded.

## Phase 2: Rust Converter Enhancements

**Target Directory**: `converters/rust/src`

### Step 2.1: Case Conversion Utilities

Port the case conversion logic to Rust.

- **Action**: Create `converters/rust/src/case_conversion.rs`.
- **Dependencies**: Add `regex` crate to `Cargo.toml`.
- **Content**: Implement `camel_to_snake` and `snake_to_camel`.
- **Tests**: Add unit tests within the module.

### Step 2.2: Enhanced $ref Resolution

Port the robust reference resolution to Rust.

- **Action**: Update `converters/rust/src/json_to_graphql.rs`.
- **Changes**:
  - Update `resolve_ref` signature to accept `visited: &mut HashSet<String>`.
  - Implement recursive resolution logic.
  - Use `case_conversion` utilities for property lookup fallbacks.

### Step 2.3: Circular Reference Protection

Port the circular reference protection to Rust.

- **Action**: Update `ConversionContext` struct in `converters/rust/src/json_to_graphql.rs`.
- **Changes**:
  - Add `building: HashSet<String>` to `ConversionContext`.
  - Update `convert_type_definition` to check and update the `building` set.

### Step 2.4: Type Filtering

Port the filtering logic to Rust.

- **Action**: Update `ConversionOptions` struct in `converters/rust/src/types.rs`.
- **Changes**:
  - Add `exclude_types`, `exclude_type_suffixes`, etc.
  - Implement `should_include_type` function in `json_to_graphql.rs`.
  - Apply filtering in the main conversion loop.

## Phase 3: Shared Test Cases & Verification

**Target Directory**: `converters/test-data`

### Step 3.1: Test Data Creation

Create standard JSON schemas that exercise the new features.

- **Files**:
  - `circular-refs.schema.json`: Schema with direct and indirect cycles.
  - `case-mismatch.schema.json`: Schema where `$ref` paths use different casing than definitions.
  - `filtering.schema.json`: Schema with types intended for exclusion (e.g., `UserFilter`, `PageInfo`).

### Step 3.2: Node.js Tests

- **Action**: Create `converters/node/src/improvements.test.ts`.
- **Content**: Tests for each new feature using the shared test data.

### Step 3.3: Rust Tests

- **Action**: Add tests to `converters/rust/src/lib.rs` or specific modules.
- **Content**: Equivalent tests to Node.js to ensure parity.

## Phase 4: Documentation

### Step 4.1: Configuration Guide

- **Action**: Update `converters/README.md` and `docs/COMPREHENSIVE_GUIDE.md`.
- **Content**: Document new configuration options (`excludeTypes`, etc.) and behavior of the enhanced resolver.

### Step 4.2: CLI Updates

- **Action**: Update CLI help text in both Node.js and Rust CLIs to reflect new options.

## Execution Order

1.  **Node.js Implementation** (Steps 1.1 - 1.5)
2.  **Node.js Verification** (Step 3.2)
3.  **Rust Implementation** (Steps 2.1 - 2.4)
4.  **Rust Verification** (Step 3.3)
5.  **Documentation** (Phase 4)
