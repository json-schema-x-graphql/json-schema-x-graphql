# ADR 0001: Schema-Driven Data Contract

## Status

Accepted (Updated December 2025: JSON Schema is now the canonical source)

## Context

Technology Transformation Services is synthesizing contract data from multiple upstream systems (Contract Data, Legacy Procurement, EASi, Logistics Mgmt) and persisting a harmonized view in Databricks Delta Lake. The team needs a single, human-readable contract that governs the shape of the data across ingestion, storage, and presentation. We evaluated ad-hoc JSON examples, relational ERDs, and direct table schemas, but those approaches made it difficult to reason about nested substructures and to communicate schema diffs to both engineers and domain stakeholders.

Initially, we considered GraphQL SDL as the canonical source following the [GraphQL Tools schema-driven development guidance](https://the-guild.dev/graphql/tools/docs/introduction). However, through practical experience, we determined that **JSON Schema** provides superior benefits for our use case:

- **Native validation support**: JSON Schema is designed for data validation, which is our primary use case for ingestion pipelines.
- **Python ecosystem integration**: Our ETL tooling uses Python, which has robust JSON Schema validation libraries.
- **Rich constraint expressions**: JSON Schema supports regex patterns, numeric ranges, string formats, and other constraints that GraphQL SDL cannot express.
- **Database compatibility**: snake_case naming in JSON Schema aligns with Delta Lake table schemas without transformation.
- **Bidirectional generation**: We can generate GraphQL SDL from JSON Schema using x-graphql-* extension metadata.

Downstream integrations require multiple perspectives:

- **GraphQL SDL** for API layer, federation, and type-safe queries.
- **Delta Lake tables** for analytical workloads.
- **Field mappings** for snake_case ↔ camelCase conversions.
- **Documentation artifacts** for stakeholder communication.

We therefore needed an approach where JSON Schema sources all derivative artifacts while guaranteeing parity across formats.

## Decision

Adopt **JSON Schema** (`src/data/*.schema.json`) as the source of truth for the Schema Unification Forest contract schema. All schema-aware tooling—including GraphQL SDL generation, Databricks table planning, and validation—must trace back to these JSON Schemas. The decision bundles the following practices:

- **Maintain JSON Schemas** in `src/data/` with x-graphql-* extension metadata for SDL generation.
- **Generate GraphQL SDL** using repository tooling (`scripts/generate-graphql-from-json.mjs`), ensuring precise type parity for API layer.
- **Align Delta Lake table definitions** with JSON Schema field taxonomy; ingestion pipelines treat JSON Schema as the authoritative contract that data must satisfy before landing in the lake.
- **Generate field mappings** to translate between snake_case (database) and camelCase (API) automatically.
- **Validate all ingestion data** against JSON Schema before persistence to ensure data quality.
- **Do NOT manually edit generated GraphQL schemas** in `generated-schemas/` — they are auto-generated and will be overwritten.

## Consequences

### Positive

- **Single source of truth**: JSON Schema reduces drift between formats and minimizes manual reconciliation.
- **Native validation**: Python tooling can directly validate data against JSON Schema without intermediate conversions.
- **Rich constraints**: Numeric ranges, regex patterns, formats, and other validation rules are expressed natively.
- **Database alignment**: snake_case naming matches Delta Lake tables without transformation.
- **Automated SDL generation**: GraphQL schemas are generated consistently from JSON Schema via tooling.
- **Bidirectional parity**: Round-trip conversion between JSON Schema ↔ GraphQL SDL is validated in CI.
- **Stakeholder clarity**: JSON Schema is more familiar to data engineers and Python developers on the team.

### Negative / Considerations

- **Contributors must understand x-graphql-* metadata**: Schema maintainers need to know extension conventions for SDL generation.
- **Generated artifacts must not be edited**: GraphQL SDL files in `generated-schemas/` are auto-generated and changes will be overwritten.
- **Tooling dependency**: The pipeline depends on generator scripts; broken tooling can block schema updates and requires ongoing maintenance.
- **Learning curve for GraphQL features**: While SDL is generated, schema designers must understand how JSON Schema maps to GraphQL types (enums, unions, interfaces).
- **Two naming conventions**: Team must maintain awareness of snake_case (JSON Schema) vs camelCase (GraphQL) conventions.

## Related Decisions

- **ADR 0002**: Automated Schema Parity Toolchain ensures JSON Schema ↔ GraphQL SDL parity
- **ADR 0006**: Three-Namespace Naming Convention formalizes snake_case/camelCase/hyphen-case usage
- **ADR 0008**: Python Validation Tooling establishes JSON Schema validation in ETL pipelines
