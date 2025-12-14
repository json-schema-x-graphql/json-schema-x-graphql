# Schema Transformation Pipeline

This repository now maintains a bi-directional schema interop pipeline so that changes to the normalized JSON Schema can be compared directly against the curated GraphQL SDL. The workflow favors the canonical SDL in `src/data/schema_unification.graphql`, but the generated artifact exposes how closely the JSON representation can approximate that shape.

## Commands

Run the composite generator after updating either schema:

```bash
pnpm run generate:schema:interop
```

The command performs two steps:

1. **GraphQL → JSON Schema** via `scripts/generate-graphql-json-schema.mjs` (unchanged). The output lives in `generated-schemas/schema_unification.from-graphql.json`.
2. **JSON Schema → GraphQL SDL** via `scripts/generate-graphql-from-json-schema.mjs` (new). The output lives in `generated-schemas/schema_unification.from-json.graphql` and uses the naming, descriptions, and field structure that most closely match the curated SDL.

Warnings are printed for notable mismatches (for example, when a GraphQL field is marked non-null but the JSON Schema property is not required).

## Coverage

The converter focuses on the persistent contract record:

- `Contract` and nested aggregates (`OrganizationInfo`, `FinancialInfo`, `StatusInfo`, etc.).
- System extensions for Contract Data, Legacy Procurement, and EASi, including their nested objects.
- Enumerations inferred directly from JSON Schema enums (`SystemType`, `ContractStatus`, `ContactRole`).
- Shared scalars (`Date`, `DateTime`, `Decimal`, `JSON`).

This moves the generated SDL from path-derived type names (e.g., `EnhancedGovernmentContractManagementNormalizedSchemaCommonElements`) to the human-readable domain names used in `schema_unification.graphql`.

## Known constraints

| Area | Constraint | Mitigation |
| --- | --- | --- |
| Required vs non-null | Some JSON Schema properties (for example `schemaVersion`) are optional but the curated SDL treats them as non-null. The generator emits the canonical type and logs a warning. | Review warnings after each run and decide whether to adjust the JSON Schema or loosen the SDL requirement. |
| System extensions | The JSON Schema groups extensions under `systemExtensions.contract_data/legacy_procurement/intake_process`. The generated SDL keeps this grouping in the `SystemExtensions` wrapper instead of flattening to the `[SystemExtension!]!` union that the curated SDL exposes. | Future work could add an adapter to flatten the grouped arrays into a single list. For now, the union type is emitted for parity checks, but the wrapper remains. |
| Missing fields | The JSON Schema omits certain analytics- and quality-related fields that exist in the curated SDL. These are absent from the generated SDL. | Use `scripts/schema-sync.config.json` to continue tracking the gaps and decide whether to expand the JSON Schema. |
| Enum casing | JSON Schema enums are lowercase for some fields (e.g., `contact role` and `contract status`). The generator uppercases values to align with GraphQL enum naming. | When new enum values are introduced, they will be normalized automatically. |

## Extending the mapping

All mapping logic lives in `scripts/json-to-graphql.config.mjs`:

- **Add fields or types** by editing `typeConfigs`. Each entry specifies the GraphQL type name, the JSON pointer to the data, and the GraphQL output type.
- **Add enums** by extending `enumConfigs`. Enum values are inferred from the JSON Schema and normalized for GraphQL.
- **Add unions** via `unionConfigs`.

After modifying the config, rerun `pnpm run generate:schema:interop` and inspect `generated-schemas/schema_unification.from-json.graphql`.

## Validation

Pair the transformation with the existing validation commands:

- `pnpm run validate:schema` – JSON Schema structural validation.
- `pnpm run validate:graphql` – GraphQL SDL validation.
- `pnpm run validate:sync` and `pnpm run validate:sync:strict` – parity checks that highlight gaps between the schemas.

The combination of the generated SDL and the validation reports makes drift between the JSON Schema and GraphQL SDL visible and actionable.
