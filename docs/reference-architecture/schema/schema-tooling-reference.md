# Schema Tooling Reference

Status: Draft (placeholder)  
Audience: Engineers working on Schema Unification Forest schema generation, validation, and CI

This guide consolidates the schema tooling landscape for Schema Unification Forest. It explains how the generators, validators, shared libraries, tests, and CI interact; when to use each; and how to extend or replace pieces with minimal risk.

See also:
- `docs/process/quick-start.md` — TL;DR commands and environment setup
- `docs/schema/schema-pipeline-guide.md` — End-to-end generation and validation pipeline details
- `docs/schema/schema-v1-vs-v2-guide.md` — Conceptual differences between V1 and V2 and migration notes
- `docs/schema/x-graphql-hints-guide.md` — x-graphql hints reference (how JSON Schema carries GraphQL semantics)
- `docs/examples/validator-usage.md` — Live validator usage examples

Quick links: [Generators](#generators) · [Validators](#validators) · [Commands](#command-recipes) · [Testing](#testing-coverage) · [CI](#ci-integration)

---

## 1) Canonical sources and naming policy

- Canonical schema: `src/data/schema_unification.schema.json` (JSON Schema, snake_case).
- Curated / human-facing schema: `src/data/schema_unification.graphql` (GraphQL SDL, camelCase allowed).
- Round-trip support: bidirectional conversion exists for parity checks and interop, but JSON Schema is authoritative.
- Generated artifacts are written to:
  - `generated-schemas/` (working directory for CI and local dev)
  - `src/data/generated/` (consumed by the website and examples)

Conventions:
- Prefer snake_case for JSON Schema keys.
- Prefer camelCase for GraphQL field names (unless otherwise justified).
- Use `x-graphql-*` extensions on JSON Schema to preserve GraphQL semantics (enums, unions, scalars, directives, required-ness overrides, operations, pagination hints, etc.).

---

<a id="generators"></a>
## 2) Generators

Primary scripts (programmatic exports + thin CLI):

- `scripts/generate-graphql-json-schema.mjs`
  - Export: `generateFromSDL(sdlFilePath?, jsonSchemaFilePath?, outPath?, inputCase?, outputCase?)`
  - Purpose: GraphQL SDL → JSON Schema (reads canonical definitions, writes to `generated-schemas/` and `src/data/generated/`).
  - Typical usage: convert curated SDL to a machine-validated JSON Schema for comparisons.

- `scripts/generate-graphql-from-json-schema.mjs`
  - Export: `generateFromJSONSchema(schemaPath, outPath, options?)`
  - Purpose: JSON Schema → GraphQL SDL (converts canonical schema into SDL).
  - Options include `inputCase`, `outputCase`, and whether to publish to `src/data/generated/`.

- `scripts/generate-graphql-json-schema-v2.mjs`
  - Export: `generateV2({ schemaFile?, outPath? }?)`
  - Purpose: V2 GraphQL SDL (with hints) → JSON Schema; falls back to canonical SDL when target not present.

- `scripts/generate-schema-interop.mjs`
  - Export: `runInteropGeneration({ outputDir?, skipV2?, verbose? }?)`
  - Purpose: Orchestrates the full pipeline (field mapping, SDL→JSON, JSON→SDL, V2 JSON), and publishes website-consumable artifacts.

Shared library (new, centralized x-graphql handling):

- `scripts/lib/graphql-hints.mjs`
  - High-level: `generateEnhancedSDL(baseSDL, schema, options?)`
  - Metadata: `parseHintExtensions(schema)`, `collectSchemaHintMeta(schema)`, `summarizeHints(meta)`
  - Targeted helpers:
    - `addCustomScalarsSDL(scalarsMap, baseSDL?)`
    - `buildEnumSDL(enumConfig)`
    - `enhanceUnionDescriptions(sdl, unionsMap)`
    - `applyScalarFieldReplacements(sdl, scalarFieldMap)`
    - `applyRequiredFieldNonNull(sdl, requiredFieldMap)`
    - `addOperationsSDL(operationsConfig)`
    - `addPaginationTypesSDL(paginationConfig, baseSDL?)`
    - `buildMissingEnums(baseSDL, enums)`
    - `mergeParsedHints(a, b)`
  - Usage model: produce a base SDL (via `typeconv`, legacy builder, or GraphQL.js printSchema), then call `generateEnhancedSDL` with the canonical JSON Schema to apply hints.

Notes:
- `scripts/generate-graphql-with-extensions.mjs` and `scripts/generate-graphql-custom.mjs` have been refactored to call `generateEnhancedSDL` for consistent hint application and less duplication.
- The enhanced generator `scripts/generate-graphql-enhanced.mjs` builds an SDL via phased construction and then applies the same shared enhancements for parity with the other approaches.

---

<a id="validators"></a>
## 3) Validators

- `scripts/validate-schema.mjs`
  - Export: `validateFiles({ schemaFile?, files? }?)`
  - Purpose: Validate JSON documents against JSON Schema with Ajv (2020-12 when available).
  - Default behavior is conservative: the main validation target is the canonical schema itself and any designated sample artifacts.

- `scripts/validate-graphql-vs-jsonschema.mjs`
  - Exports: `SchemaSyncManager`, `validateParity(graphqlSchemaSDL, jsonSchema, sampleData?)`
  - Purpose: Ensure GraphQL SDL parses/builds; optionally validate a GraphQL-like sample JSON against the JSON Schema.

- `scripts/validate-schema-sync.mjs`
  - Export: `compareSchemas(sdl, jsonSchema, { strict?, config?, repoRoot? }?)`
  - Purpose: Lightweight parity check between SDL field names and JSON Schema properties (by-name presence).
  - Strict mode: reads a mapping config (`scripts/schema-sync.config.json`) to assert specific pointers and expected SDL fields.

Python validators (optional):
- `python/validate_schemas.py` (invoked via `pytest` or CLI) — secondary validation and cross-checks.

---

## 4) Commands (quick reference)

Local generation and validation:

    pnpm run generate:schema:interop
    pnpm run validate:all
    pnpm run validate:schema
    pnpm run validate:graphql
    pnpm run validate:sync
    pnpm run validate:sync:strict
    pnpm test
    pytest

Direct invocation examples:

    node scripts/generate-graphql-json-schema.mjs
    node scripts/generate-graphql-from-json-schema.mjs
    node scripts/generate-graphql-json-schema-v2.mjs
    node scripts/generate-schema-interop.mjs
    node scripts/validate-schema.mjs
    node scripts/validate-graphql-vs-jsonschema.mjs
    node scripts/validate-schema-sync.mjs --strict --config scripts/schema-sync.config.json

---

<a id="testing-coverage"></a>
## 5) Test suite and coverage

- Framework: Jest for JS/TS code; Pytest for Python.
- Structure:
  - `__tests__/scripts/` — unit/integration tests for generators and orchestrator.
  - `__tests__/lib/` — tests for shared libraries (e.g., `graphql-hints.mjs`).
  - `__tests__/fixtures/` — simple JSON Schemas and SDLs exercising basic and edge cases.
- Targets:
  - Generators: ≥ 80%
  - Validators: ≥ 90%
  - Helpers/Lib: ≥ 95%
- Tips:
  - Keep fixtures small and explicit.
  - Prefer asserting minimal invariants (e.g., “contains `enum Status`”) to avoid overly brittle tests.
  - For round-trip tests, compare structural equivalence rather than exact string equality where possible.

---

<a id="ci-integration"></a>
## 6) CI integration

GitHub Actions:
- `schema-validate-generate.yml` — installs dependencies, runs validators, generates interop artifacts, runs tests with coverage, and commits changed generated artifacts back to the PR when present.
- `schema-validation.yml` — validates schema on pushes/PRs to `main`, runs interop generation, and publishes generated files for the site.

Best practices:
- Keep `generated-schemas/` diffs committed to make changes explicit.
- Fail CI if required artifacts are missing after generation (guards against regressions).
- Summarize coverage in job summary for quick signal.

---

## 7) Adding or modifying x-graphql hints

When to use:
- You need to express a GraphQL concept that JSON Schema cannot represent natively (enums with rich metadata, unions, custom scalars, directive annotations, required overrides, operations scaffolding, pagination scaffolding).

Where to add:
- In the canonical JSON Schema, add `x-graphql-*` fields at the appropriate level:
  - Definition-level: `x-graphql-enum`, `x-graphql-union`, `x-graphql-implements`, `x-graphql-type`, `x-graphql-directives`
  - Property-level: `x-graphql-scalar`, `x-graphql-required`, `x-graphql-field-name`, `x-graphql-nullable`, `x-graphql-args`
  - Root-level: `x-graphql-scalars`, `x-graphql-operations`, `x-graphql-pagination`

How it flows:
- Generators produce a base SDL (via typeconv, GraphQL.js, or phased builder).
- `scripts/lib/graphql-hints.mjs` applies enhancements consistently across all generator paths.
- New hint kinds should be centralized in `graphql-hints.mjs` to keep behavior uniform.

---

## 8) Extending or swapping generation approaches

Supported paths:
- `typeconv`-based (`scripts/generate-graphql-with-extensions.mjs`)
- GraphQL.js builder-based (`scripts/generate-graphql-custom.mjs`)
- Phased custom builder (`scripts/generate-graphql-enhanced.mjs`)

All approaches should call `generateEnhancedSDL` to apply the same hint logic, ensuring consistent results. If you introduce a new base generator, wire it into `generateEnhancedSDL` rather than re-implementing hint transformations.

---

## 9) Versioning and compatibility

- Node 18+ (per `package.json` `engines`), CI typically runs Node 22.
- GraphQL 16.x.
- Ajv 8.x, with optional 2020-12 build detection.
- `typeconv` 2.x for JSON Schema → GraphQL baseline transforms.
- Keep an eye on SDL breaking changes (directives or SDL features) and JSON Schema dialects (draft 2020-12 used in canonical).

---

## 10) Troubleshooting

Common issues and checks:
- SDL parse errors: run `node scripts/validate-graphql-vs-jsonschema.mjs` to confirm SDL builds.
- Missing `$schema` warnings: certain outputs strip `$schema` intentionally to avoid meta-schema interference in downstream steps.
- Pointer or `$ref` resolution in Ajv: ensure local `$defs` or `definitions` include targets; for remote refs, add schemas to Ajv before compilation.
- Differences across generators: confirm all paths apply `generateEnhancedSDL`; test with a focused fixture to isolate.

---

## 11) Contributing and review

- Prefer adding programmatic exports with JSDoc to any new script.
- Add unit tests and fixtures for new behaviors, especially for `graphql-hints`.
- Update `scripts/README.md` with new programmatic APIs and examples.
- If docs are superseded, move to `docs/archived/` and add an ARCHIVED notice at the top (see `docs/archived/README.md` for template).

---

## 12) Roadmap (high-level)

- Validators Phase 2: finalize programmatic exports and tests:
  - `scripts/validate-schema.mjs` → `validateFiles(...)` (done)
  - `scripts/validate-graphql-vs-jsonschema.mjs` → `validateParity(...)` (done)
  - `scripts/validate-schema-sync.mjs` → `compareSchemas(...)` (done)
- Consolidate and document remaining guides:
  - `docs/mappings/system-mappings-guide.md` (Contract Data, Legacy Procurement, EASi)
  - `docs/external/external-systems-reference.md`
- CI: add schema diff detection (fail when unexpected changes are introduced) and ensure all generated artifacts are present.
- Coverage: close remaining TODO tests and enforce targets.

---

## Appendix A — Programmatic API index (quick lookup)

Generators:
- `scripts/generate-graphql-json-schema.mjs` → `generateFromSDL(...)`
- `scripts/generate-graphql-from-json-schema.mjs` → `generateFromJSONSchema(...)`
- `scripts/generate-graphql-json-schema-v2.mjs` → `generateV2({...})`
- `scripts/generate-schema-interop.mjs` → `runInteropGeneration({...})`
- `scripts/generate-graphql-enhanced.mjs` → `convertJSONSchemaToGraphQL(schema)`, `main(argv?)` (writes enhanced SDL)
- `scripts/generate-graphql-custom.mjs` → `convertJSONSchemaToGraphQL(schema)` (returns enhanced SDL)

Shared lib:
- `scripts/lib/graphql-hints.mjs` → `generateEnhancedSDL(...)`, `parseHintExtensions(...)`, `summarizeHints(...)`, plus helpers

Validators:
- `scripts/validate-schema.mjs` → `validateFiles({...})`
- `scripts/validate-graphql-vs-jsonschema.mjs` → `SchemaSyncManager`, `validateParity(graphqlSchemaSDL, jsonSchema, sampleData?)`
- `scripts/validate-schema-sync.mjs` → `compareSchemas(sdl, jsonSchema, { strict?, config?, repoRoot? }?)`

---

<a id="command-recipes"></a>
## Appendix B — Command recipes

Full interop generation and validations:

    pnpm run generate:schema:interop
    pnpm run validate:all

Focused conversions:

    node scripts/generate-graphql-json-schema.mjs --schema src/data/schema_unification.graphql --json-schema src/data/schema_unification.schema.json --out generated-schemas/schema_unification.from-graphql.json
    node scripts/generate-graphql-from-json-schema.mjs src/data/schema_unification.schema.json generated-schemas/schema_unification.from-json.graphql

Strict parity check with config:

    node scripts/validate-schema-sync.mjs --strict --config scripts/schema-sync.config.json

Run tests with coverage summary:

    pnpm run test:coverage

---

Changelog
- 2024-12: Initial draft created (placeholder) to capture the consolidated reference for schema tooling.
