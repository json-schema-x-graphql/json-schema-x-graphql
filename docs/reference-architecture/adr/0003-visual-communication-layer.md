# ADR 0003: Schema Viewers as Communication Layer

## Status

Accepted

## Context

The project includes multiple viewers—Voyager (`/voyager`), the JSON data viewer, schema viewer, and Mermaid diagrams. During stakeholder sessions we learned that these interfaces are not primary product surfaces; instead, they help teams understand and validate the schema decisions captured in ADR 0001 and ADR 0002. Without clarifying their intent, contributors might over-engineer the viewers or treat them as production UIs rather than explanatory artifacts.

## Decision

Maintain viewer tooling strictly as communication aids:

- Voyager loads the pre-generated introspection JSON to visualize the SDL structure for engineers.
- The Schema Unification data and schema viewers demonstrate how normalized records align with the SDL and JSON Schema outputs.
- Mermaid diagrams in `src/data/schema_unification.mermaid.mmd` are regenerated when the SDL changes to support policy discussions.

Viewers should not introduce additional business logic or divergent data transformations. Any schema change must originate from the SDL pipeline, with viewers consuming derived artifacts.

## Consequences

### Positive

- Keeps the team focused on schema integrity while still providing rich visualization for stakeholders.
- Simplifies maintenance by limiting viewer scope to read-only experiences fed by generated artifacts.
- Encourages contributors to update documentation and viewers whenever the SDL evolves, reinforcing the schema-driven workflow.

### Negative / Considerations

- Viewers are intentionally lightweight and may not satisfy all UX expectations; heavy customization should be avoided unless the schema contract demands it.
- Additional tooling is required for end-user products; these viewers are not a substitute for production applications.
