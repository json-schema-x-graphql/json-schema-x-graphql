# Data Engineering Concepts ↔ GraphQL Federation

> If you already understand data engineering (canonical models, provenance, survivorship, joins), this guide maps those concepts to their GraphQL Federation equivalents.

---

## Canonical Data Models ↔ The Supergraph and Entities

**Data Engineering:** A canonical model represents the single source of truth — the authoritative schema for an organization.

**GraphQL Federation:** This concept maps to the **Supergraph**, which is the unified, composed contract exposing all types, fields, and cross-domain relationships to API consumers.

At the individual object level, the canonical record is an **Entity** — a type decorated with `@key` to establish its primary key representation so multiple subgraphs can reference the exact same object.

```graphql
type User @key(fields: "id") {
  id: ID!
  name: String
}
```

**Where they meet:** During **Composition**, the process that enforces governance by validating schema compatibility, ensuring consistent type definitions, and checking ownership boundaries before the canonical contract is published.

---

## Data Provenance and Lineage ↔ Subgraph Ownership and Directives

**Data Engineering:** Provenance and lineage tracking tell you where data came from and how it flows downstream.

**GraphQL Federation:** This is achieved through explicit **Subgraph Ownership** and field-level directives:

| Directive | Meaning |
|-----------|---------|
| `@external` | "This field originates from another subgraph" |
| `@requires` | "I need these specific fields from other subgraphs to compute my value" |

```graphql
type Billing @extends @key(fields: "id") {
  id: ID! @external
  creditScore: Int @requires(fields: "id name")
}
```

**Where they meet:** In the **declarative schema definitions**. The subgraph explicitly declares its upstream dependencies, preventing ambiguous ownership and establishing clear accountability.

---

## Survivorship ↔ Field Resolution Rules

**Data Engineering:** Survivorship rules determine which source "wins" when multiple systems provide overlapping attributes.

**GraphQL Federation:** Survivorship is codified into the schema using directives:

| Directive | Meaning |
|-----------|---------|
| `@override` | "This subgraph is now the authoritative source for this field" |
| `@provides` | "I can resolve this field even though another subgraph normally owns it" |

```graphql
type Product @key(fields: "id") {
  id: ID!
  name: String @override(from: "legacy-catalog")
  inStock: Boolean @provides(fields: "id")
}
```

**Where they meet:** Inside the **Router**. The router reads these survivorship directives at runtime to orchestrate operations and determine exactly which subgraph's resolver is authoritative for a given field.

---

## Concatenation and Joins ↔ Cross-Subgraph Resolution

**Data Engineering:** Bottom-up pipelines rely on query federation and joins to combine data from heterogeneous systems.

**GraphQL Federation:** The equivalent is **Cross-Subgraph Resolution**. The router receives a single query, breaks it into subgraph-specific operations, orchestrates execution across domains, and aggregates the responses into a single result.

Instead of building brittle ETL pipelines to join data across systems, domains simply reference entities from other domains in their schema:

```graphql
# Billing subgraph references User and Policy entities
type Invoice @key(fields: "id") {
  id: ID!
  customer: User
  policy: Policy
  amount: Float
}
```

**Where they meet:** Through **Declarative Entity References**. The router handles the join logic dynamically at runtime, creating a connected graph without physically centralizing the data.

---

## Data Transformation ↔ Response Translation Adapters

**Data Engineering:** ETL/ELT pipelines transform raw system-level data into consumable formats.

**GraphQL Federation:** This maps to the **Response Translation** phase of the emulation engine.

Instead of heavy ETL pipelines, the engine intercepts raw REST or database JSON responses and recursively applies metadata rules defined in the extended schema:

```json
{
  "properties": {
    "user_name": {
      "type": "string",
      "x-graphql-field-name": "userName"
    }
  }
}
```

**Where they meet:** At the **three-namespace design layer** (`x-graphql-field-name`, `x-graphql-type-name`). Raw `snake_case` backend properties are automatically converted into clean, typed, idiomatic `camelCase` GraphQL objects.

---

## Quick Reference Table

| Data Engineering | GraphQL Federation | Directive / Concept |
|------------------|--------------------|---------------------|
| Canonical model | Supergraph | Composition |
| Primary key | Entity `@key` | `@key(fields: "id")` |
| Foreign key | Cross-subgraph reference | `@external` + `@key` |
| Borrowed column | Borrowed field | `@external` |
| Denormalized / eager-loaded | Eager resolution | `@provides` |
| Computed column | Computed field | `@requires` |
| Shared table | Shared type | `@shareable` |
| Database / schema namespace | Subgraph | `x-graphql-subgraph-name` |
| Data provenance | Subgraph ownership | `@external`, `@requires` |
| Survivorship | Authoritative source | `@override`, `@provides` |
| ETL transformation | Response translation | `x-graphql-field-name` |

---

## See Also

- ADR 0008: Subgraph/Supergraph Metadata Naming
- ADR 0010: Visual Editor Design
- ADR 0011: Fine-Grained Authorization
- `website/pages/docs/recipes/federation.mdx`
