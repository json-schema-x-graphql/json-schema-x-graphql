# Improvement & Simplification Plan for json-schema-x-graphql

Based on the audit of the `TTSE-petrified-forest` codebase, the Apollo Voyage crosswalk, and the identified challenges of adopting JSON Schema for GraphQL development, here are the core recommendations to improve and simplify the `json-schema-x-graphql` project.

## 1. Architectural Improvements

### 1.1 "Directive-First" Internal Architecture

**Problem**: The current `converter.ts` often special-cases specific federation features (like keys, shareable, overrides) inside the print logic, leading to large `formatDirectives` functions with complex branching.
**Recommendation**:
Normalize all `x-graphql-federation-*` attributes into a generic `Directive` structure _before_ the rendering phase.

- **Pipeline**: `Schema` -> `Normalization` (Generic Directives) -> `SDL Generation`
- **Benefit**: This simplifies the core printer. It just knows how to print "Type + Directives". Adding new Federation v3 features becomes a configuration change in the normalizer, not a change to the core printer.

### 1.2 Unify Extension Extraction

**Problem**: We currently look for `x-graphql-*` scattered throughout the code.
**Recommendation**:
Fully leverage the `x-graphql-extensions.ts` module to create a single "Context Object" for every node before processing.

- Instead of checking `schema["x-graphql-type-name"]` deep in the recursion, map the schema to a standardized `GraphQLTypeDefinition` intermediate representation (IR) first.
- This decoupling allows for clearer testing of the "Schema -> IR" logic separate from "IR -> SDL string".

## 2. Feature & Usability Enhancements

### 2.1 Native Scalar Auto-Mapping (Convention over Configuration)

**Problem**: Users currently have to explicitly map `format` to scalars or use `x-graphql-scalar`, adding verbosity.
**Pattern from TTSE**: Automatically map standard JSON Schema formats.
**Recommendation**:
Hardcode the following defaults (overridable via config):

- `format: "date-time"` → `scalar DateTime`
- `format: "date"` → `scalar Date`
- `format: "time"` → `scalar Time`
- `format: "email"` → `scalar Email`
- `format: "uri"` → `scalar URI`
  _Why_: Reduces lines of code in user schemas significantly.

### 2.2 The "Dual-Purpose" Input Generation

**Problem**: GraphQL requires distinct `Input` types for arguments.
**Recommendation**:
Implement an `autoGenInputs` option.

- If enabled, when the converter encounters an object in an argument position (via `x-graphql-args`), it automatically:
  1. Generates a parallel type named `${TypeName}Input`.
  2. Strips fields that are read-only (if marked via `readOnly: true` in JSON Schema).
  3. Changes type references deep in the tree to their `Input` variants.

### 2.3 Relay Connection Helper

**Problem**: Manually defining `Edge` and `Connection` types in JSON Schema is verbose and error-prone.
**Recommendation**:
Implement a transform for `x-graphql-connection: "Type"`.

- When encountered, the generator automatically emits standard Relay `PageInfo`, `${Type}Edge`, and `${Type}Connection` types.
- This creates parity with the `TTSE` implementation.

## 3. Standardization & Documentation

### 3.1 Strict Adherence to the Attribute Registry

**Action**: The `X-GRAPHQL-ATTRIBUTE-REGISTRY.md` should be the "Law".

- **Linter**: Add a CLI mode `json-schema-x-graphql lint` that validates input schemas specifically against this registry (warning on unknown `x-graphql-*` attributes).
- **Consolidation**: Deprecate any legacy attributes found in `converter.ts` that are not in the registry.

### 3.2 "Recipes" for Common Patterns

**Action**: Create a `recipes` folder in the repo containing copy-pasteable JSON Schemas for common GraphQL patterns identified in the "Challenges" doc:

- **Polymorphism**: Interface implementation pattern.
- **Arguments**: Field with arguments pattern.
- **Federation**: Entity with `@key` and `@requires`.

## 4. Implementation Priorities (Phase 1)

1.  **Refactor Converter**: Extract federation logic into a `normalizeDirectives` pass.
2.  **Scalar Defaults**: Implement the auto-mapping for `date-time`, `email`, etc.
3.  **Linter**: Add the validation step to warn on unsupported attributes.
4.  **Relay Support**: Add the connection generation logic.

By moving logic "upstream" (into normalization/IR generation) and adopting convention-over-configuration for Scalars and Relay, the codebase will become smaller, easier to read, and more powerful for the end user.
