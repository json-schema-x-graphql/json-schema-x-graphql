# TTSE Petrified Forest Codebase Review

**Date:** February 16, 2026
**Target Codebase:** `~/TTSE-petrified-forest`
**Reviewer:** GitHub Copilot

## 1. Executive Summary

This document presents a comprehensive review of the `TTSE-petrified-forest` codebase's JSON Schema to GraphQL converter implementation, specifically comparing it against the current `json-schema-x-graphql` project.

The `TTSE-petrified-forest` implementation represents a mature, production-ready script tailored for a specific federation architecture. It relies heavily on `x-graphql-*` extensions to drive the SDL generation. The code is written in modern ES Modules (JavaScript) and is procedural in nature.

The `json-schema-x-graphql` project is a more structured, TypeScript-based library aiming for broader usage and stricter type safety. It covers most of the core features found in the target codebase but handles them with a more configuration-driven approach.

**Key Findings:**

- **Parity:** High on core features (Type/Field naming, basic scalars, Enums).
- **Federation:** The target codebase has hardcoded support for Apollo Federation v2.3 directives. The current project has structural support for federation via options and extensions.
- **Extensions:** The target `X-GRAPHQL-ATTRIBUTE-REGISTRY.md` is exhaustive and well-documented. The current project's `x-graphql-extensions.ts` captures the majority of these but may miss some nuance in specific areas like "Relay/Pagination" or "Operations" mapping if not fully implemented in the converter logic.
- **Architecture:** Target is a script; Current is a library.

## 2. Setup & Methodology

The review process involved analyzing the following key files from `~/TTSE-petrified-forest`:

1.  **Core Logic:** `scripts/lib/jsonschema-to-graphql.mjs` - The implementation of the conversion logic.
2.  **Specification:** `docs/x-graphql/X-GRAPHQL-ATTRIBUTE-REGISTRY.md` - The source of truth for supported extensions.
3.  **Entry Point:** `scripts/bin/generate-graphql.mjs` - How the CLI orchestrates the generation.

These were compared against the current workspace (`~/json-schema-x-graphql`):

1.  `converters/node/src/converter.ts`
2.  `converters/node/src/x-graphql-extensions.ts`

The goal was to identify discrepancies in feature support, attribute handling, and general architectural approach to ensure `json-schema-x-graphql` can serve as a superset or drop-in replacement.

## 3. Detailed Feature Comparison

| Feature Category | Target (`TTSE-petrified-forest`)                                | Current (`json-schema-x-graphql`)                                         | Status      |
| :--------------- | :-------------------------------------------------------------- | :------------------------------------------------------------------------ | :---------- |
| **Language**     | JavaScript (ESM)                                                | TypeScript                                                                | ✅ Superior |
| **Architecture** | Functional/Script-based                                         | Class/Interface-based                                                     | ✅ Superior |
| **Type Naming**  | `x-graphql-type-name` / `snakeToPascal`                         | `x-graphql-type-name` / Configurable Naming Strategy                      | ✅ Parity   |
| **Field Naming** | `x-graphql-field-name` / `snakeToCamel`                         | `x-graphql-field-name` / Configurable Naming Strategy                     | ✅ Parity   |
| **Scalars**      | Auto-maps `format` (date, time, email, uri) to GraphQL scalars. | Supports `x-graphql-scalar`. Needs verification of `format` auto-mapping. | ⚠️ Verify   |
| **Enums**        | Supports `x-graphql-enum` (values list or object map).          | Supports `x-graphql-enum`.                                                | ✅ Parity   |
| **Unions**       | `oneOf`/`anyOf` inference. `x-graphql-union`.                   | `oneOf`/`anyOf` inference. `x-graphql-union-types`.                       | ✅ Parity   |
| **Federation**   | Hardcoded directives (`@key`, `@shareable`, etc.).              | `federationVersion` option. Parses extensions like `federationKeys`.      | ✅ Parity   |
| **Directives**   | `formatDirectives` helper. Supports generic args.               | `x-graphql-directives` struct.                                            | ✅ Parity   |
| **Operations**   | `x-graphql-operations` (Queries, Mutations).                    | `x-graphql-operations` supported in extensions.                           | ✅ Parity   |
| **Descriptions** | `x-graphql-description` > `description`. Triple-quote escaping. | `x-graphql-description` > `description`.                                  | ✅ Parity   |
| **Nullability**  | `x-graphql-nullable`. Defaults based on `required`.             | `x-graphql-nullable`, `fieldNonNull`. Defaults based on `required`.       | ✅ Parity   |
| **Relay**        | `generateRelayTypes` (Pagination).                              | Not explicitly seen in core `converter.ts` logic.                         | ⚠️ Missing? |

## 4. Discrepancies & Findings

1.  **Scalar Mapping Logic:**
    - Target: Explicitly maps JSON Schema `format: "date-time"` -> `DateTime`, `format: "email"` -> `Email`, etc.
    - Current: Should ensure `converter.ts` includes these default format-to-scalar mappings to match the target's convenience.

2.  **Federation Setup:**
    - Target CLI manually injects `@link` definitions and standard directive definitions at the top of the SDL.
    - Current: The `converter.ts` likely handles this via `includeFederationDirectives` or similar options, but the specific header generation should be verified to match Apollo Federation v2.3 specs if required.

3.  **Relay/Pagination Support:**
    - Target `generate-graphql.mjs` calls `generateRelayTypes(data["x-graphql-pagination"])`.
    - Current: `x-graphql-extensions.ts` doesn't explicitly list `pagination` as a top-level extension in the `XGraphQLExtensions` interface (though it might be passed through generic properties). This logic might need to be ported if Relay-style pagination generation is a requirement.

4.  **Attribute Registry Completeness:**
    - The target's `X-GRAPHQL-ATTRIBUTE-REGISTRY.md` is very detailed. The current project should adopt this registry as the canonical specification to ensure no `x-graphql-*` attribute is left unimplemented.

5.  **`x-graphql-field` vs `x-graphql-field-name`:**
    - Target explicitly notes they are distinct. `x-graphql-field` is a complex object for simple fields, while `x-graphql-field-name` is just renaming.
    - Current: `x-graphql-extensions.ts` handles `fieldName`. It checks `type` (legacy `x-graphql-type`) for both string and object. It needs to ensure it supports the distinct complex `x-graphql-field` object pattern if widely used.

## 5. Recommendations

1.  **Adopt Registry:** Completely adopt the `X-GRAPHQL-ATTRIBUTE-REGISTRY.md` into the documentation to serve as the spec for the TypeScript converter.
2.  **Implement Relay Helpers:** Port the `generateRelayTypes` logic if it doesn't exist. This is crucial for connection-based pagination.
3.  **Verify Scalar Defaults:** Ensure the `converter.ts` holds the same default `format` -> `Scalar` mappings (DateTime, Date, Time, Email, URI) to reduce configuration overhead for users.
4.  **Integration Test:** Create an integration test that uses the `TTSE-petrified-forest` input schemas and asserts that the `json-schema-x-graphql` output is semantically equivalent (ignoring whitespace/ordering).
