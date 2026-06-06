# 0011: Fine-Grained Authorization via @policy Directive and OpenFGA

Date: 2026-06-05

## Status

Accepted

## Context

The `json-schema-x-graphql` converter already supports Apollo Federation v2.9 authorization directives (`@authenticated`, `@requiresScopes`, `@policy`). In enterprise deployments, teams need caller-based, relationship-based access control (ReBAC) that goes beyond simple role lists. OpenFGA is a CNCF incubating project that provides fine-grained authorization based on the Zanzibar model.

The question is: how do we bridge the gap between the `@policy` directive in GraphQL SDL and an external policy engine like OpenFGA without bloating subgraphs or breaking the "subgraph independence" principle?

## Decision

Adopt a **three-layer authorization architecture**:

### Layer 1: Schema Declaration (Subgraph)
Subgraphs declare policy requirements via `x-graphql-*` vendor extensions in JSON Schema, which the converter losslessly translates into GraphQL `@policy` directives.

```json
{
  "properties": {
    "document": {
      "type": "object",
      "x-graphql-policy": "viewer_can_read_document"
    }
  }
}
```

Becomes:

```graphql
type Document @policy("viewer_can_read_document") {
  content: String
}
```

**Principle:** Subgraphs are lightweight and autonomous. They declare the policy requirement but do not implement the policy logic.

### Layer 2: Router Enforcement (Control Plane)
The federated router acts as the centralized enforcement point:
1. Extracts caller identity (e.g., JWT) from the incoming request
2. Intercepts any field or entity tagged with `@policy`
3. Evaluates the policy against the external policy engine (OpenFGA) before orchestrating execution
4. Rejects unauthorized fields at the query-planning stage, before subgraphs are even contacted

**Principle:** The router centralizes complex, dynamic authorization logic at runtime. This mirrors how enterprise data federation tools integrate with Apache Ranger for centralized policy management.

### Layer 3: Policy Engine (OpenFGA)
- Stores authorization tuples (user, relation, object)
- Provides Check, ListObjects, and Expand APIs
- Managed independently of the GraphQL schema lifecycle

## Consequences

### Positive
- **Subgraph autonomy preserved**: Subgraphs don't need to know about OpenFGA or complex RBAC
- **Centralized governance**: Policy changes happen in one place (the router + policy engine), not across N subgraphs
- **Lossless conversion**: `x-graphql-policy` maps directly to `@policy` without schema changes
- **Federation-native**: Uses the standard Apollo Federation v2.9 `@policy` directive

### Negative
- **Router complexity**: The router must be extended with a policy evaluation plugin
- **Cold-path latency**: Every `@policy` field requires a round-trip to the policy engine (mitigated by caching)
- **Policy drift**: If the JSON Schema's `x-graphql-policy` values diverge from the OpenFGA model, authorization failures become silent denials

### Mitigation
- Provide a `policy` CLI command that validates `x-graphql-policy` values against a registered OpenFGA model
- Cache policy checks in the router with TTL-based invalidation
- Add composition validation that flags `@policy` directives without matching OpenFGA relations

## Implementation Strategy

### Phase 1: Converter Support (Completed)
- `@policy` directive is already implemented in the converter (commit `f414f51`)
- `x-graphql-policy` vendor extension is supported in the schema

### Phase 2: Router Plugin (Pending)
- Implement a router plugin that intercepts `@policy` fields
- Add OpenFGA client configuration (endpoint, store ID, model ID)
- Cache policy check results in Redis/memory

### Phase 3: Validation & Tooling (Pending)
- CLI command: `json-schema-x-graphql validate-policies --openfga-url ...`
- Composition rule: all `@policy` values must exist in the OpenFGA model
- Docs page explaining the three-layer architecture

## References

- Issue #83: `Map security federation directives to Fine Grained Access / RBAC with OpenFGA`
- Apollo Federation v2.9 Authorization: https://www.apollographql.com/docs/graphos/schema-design/federation/authorization
- OpenFGA Documentation: https://openfga.dev/docs/intro
- `schema/x-graphql-extensions.schema.json` (vendor extension definitions)
- `website/pages/docs/recipes/federation.mdx`
