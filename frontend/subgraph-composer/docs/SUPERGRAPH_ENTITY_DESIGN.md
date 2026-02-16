# Supergraph Entity Design

## Overview

The `x-graphql-supergraph-name` extension enables JSON Schemas to explicitly declare their role in a federated GraphQL supergraph, specifically identifying **base entity subgraphs** that own type definitions and serve as query roots.

## Problem Statement

Currently, in Apollo Federation:

- **Base/Owner subgraphs** define the primary entity type with `@key`
- **Extending subgraphs** use `@extends` to add fields
- Federation validators must infer ownership from directives alone

This can be ambiguous when:

- Multiple schemas might have `@key` directives
- Composition order matters for query routing
- API gateways need to know which subgraph to route entity queries to
- Documentation needs to clarify entity ownership

## Solution: `x-graphql-supergraph-name`

Add metadata to explicitly declare a schema's role in the supergraph.

### Schema Extension Format

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "User Entity",
  "x-graphql-supergraph-name": "users-service",
  "x-graphql-supergraph-type": "base-entity",
  "x-graphql-supergraph-entity": "User",
  "properties": { ... }
}
```

### Properties

| Property                          | Type    | Required | Description                                                                               |
| --------------------------------- | ------- | -------- | ----------------------------------------------------------------------------------------- |
| `x-graphql-supergraph-name`       | string  | Yes      | Unique identifier for this subgraph (e.g., "users-service", "posts-service")              |
| `x-graphql-supergraph-type`       | enum    | Yes      | Role in supergraph: `base-entity` \| `entity-extending` \| `utility`                      |
| `x-graphql-supergraph-entity`     | string  | Yes      | The entity type name (e.g., "User", "Post"). All schemas for same entity must match this. |
| `x-graphql-supergraph-query-root` | boolean | Optional | If true, this subgraph can handle root Query type fields for this entity                  |
| `x-graphql-supergraph-version`    | string  | Optional | Schema version for this subgraph (e.g., "1.0.0")                                          |

## Usage Examples

### Base Entity Subgraph (Owner)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "User Entity - Base",
  "x-graphql-supergraph-name": "users-service",
  "x-graphql-supergraph-type": "base-entity",
  "x-graphql-supergraph-entity": "User",
  "x-graphql-supergraph-query-root": true,
  "type": "object",
  "x-graphql-type-name": "User",
  "x-graphql-directives": [
    {
      "name": "key",
      "arguments": { "fields": "\"user_id\"" }
    }
  ],
  "properties": {
    "user_id": {
      "type": "string",
      "x-graphql-type": "ID!"
    }
  }
}
```

### Extending Entity Subgraph

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "User Status - Extending",
  "x-graphql-supergraph-name": "user-status-service",
  "x-graphql-supergraph-type": "entity-extending",
  "x-graphql-supergraph-entity": "User",
  "x-graphql-supergraph-query-root": false,
  "type": "object",
  "x-graphql-type-name": "User",
  "x-graphql-directives": [
    { "name": "extends" },
    {
      "name": "key",
      "arguments": { "fields": "\"user_id\"" }
    }
  ],
  "properties": {
    "user_id": {
      "type": "string",
      "x-graphql-type": "ID!",
      "x-graphql-directives": [{ "name": "external" }]
    }
  }
}
```

### Utility Subgraph (Non-entity)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Common Scalars",
  "x-graphql-supergraph-name": "shared-types",
  "x-graphql-supergraph-type": "utility",
  "x-graphql-supergraph-entity": null,
  "properties": {
    "customScalars": { ... }
  }
}
```

## Validation Rules

### For Base Entity Subgraphs

1. ✅ Must have `x-graphql-supergraph-type: "base-entity"`
2. ✅ Must have `@key` directive without `@extends`
3. ✅ Must define Query type with entity resolver (when `x-graphql-supergraph-query-root: true`)
4. ✅ All other schemas for this entity must reference this subgraph name
5. ✅ Entity type name must match `x-graphql-supergraph-entity`

### For Extending Entity Subgraphs

1. ✅ Must have `x-graphql-supergraph-type: "entity-extending"`
2. ✅ Must have `@extends` directive
3. ✅ Must reference existing entity via `x-graphql-supergraph-entity`
4. ✅ Must use `@external` for fields from owner
5. ✅ Must have `@key` repeating owner's key fields

### For Utility Subgraphs

1. ✅ `x-graphql-supergraph-entity` should be null or omitted
2. ✅ Can include shared types, enums, scalars, directives
3. ✅ No `@extends` or `@key` required

## Composition Algorithm

When composing a supergraph:

```
1. Identify all schemas with same x-graphql-supergraph-entity
2. Find base entity (x-graphql-supergraph-type: "base-entity")
3. Validate base entity has @key
4. Validate all extenders use @extends with matching @key fields
5. Route Query.entity() to base entity subgraph
6. Route Query.entity(id) field resolution to base (then extenders if needed)
7. Generate federation SDL with proper @external markers
```

## Implementation Plan

### Phase 1: Schema Extensions

- Add x-graphql-supergraph-\* properties to JSON Schema spec
- Update templates.js to include metadata for 3 federation examples
- Document new extensions in schema docs

### Phase 2: Validation

- Extend federation-validator.js to check supergraph metadata
- Validate base entity requirements
- Validate extending entity dependencies

### Phase 3: Composition

- Update composer.js to use supergraph metadata
- Route queries to correct base entity subgraph
- Generate composition report with entity ownership

### Phase 4: UI Integration

- Show supergraph entity metadata in SubgraphComposer
- Display entity ownership diagram
- Highlight composition routes

## Benefits

1. **Explicit Entity Ownership** - Clear which subgraph owns each entity
2. **Better Composition** - Validators know which subgraphs can compose together
3. **Gateway Routing** - API gateway knows where to route entity queries
4. **Documentation** - Self-documenting schema relationships
5. **Validation** - Catch composition errors early
6. **Tooling** - Enables advanced features like entity relationship visualization

## Backward Compatibility

- The x-graphql-supergraph-\* properties are optional
- Schemas without them fall back to @key/@extends inference
- Existing federation patterns continue to work
- New properties are ignored by non-compatible tools

## Example: Complete 3-Schema Federation with Metadata

```json
// Schema 1: users-service (base-entity)
{
  "x-graphql-supergraph-name": "users-service",
  "x-graphql-supergraph-type": "base-entity",
  "x-graphql-supergraph-entity": "User",
  "x-graphql-supergraph-query-root": true,
  "x-graphql-type-name": "User",
  "x-graphql-directives": [{"name": "key", "arguments": {"fields": "\"user_id\""}}]
}

// Schema 2: user-status-service (entity-extending)
{
  "x-graphql-supergraph-name": "user-status-service",
  "x-graphql-supergraph-type": "entity-extending",
  "x-graphql-supergraph-entity": "User",
  "x-graphql-supergraph-query-root": false,
  "x-graphql-type-name": "User",
  "x-graphql-directives": [
    {"name": "extends"},
    {"name": "key", "arguments": {"fields": "\"user_id\""}}
  ]
}

// Schema 3: user-details-service (entity-extending)
{
  "x-graphql-supergraph-name": "user-details-service",
  "x-graphql-supergraph-type": "entity-extending",
  "x-graphql-supergraph-entity": "User",
  "x-graphql-supergraph-query-root": false,
  "x-graphql-type-name": "User",
  "x-graphql-directives": [
    {"name": "extends"},
    {"name": "key", "arguments": {"fields": "\"user_id\""}}
  ]
}
```

## Related Standards

- [Apollo Federation](https://www.apollographql.com/docs/federation/)
- [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12/schema)
- [GraphQL Federation Spec](https://github.com/apollographql/federation-next)

## Future Enhancements

1. **Entity Relationships** - `x-graphql-supergraph-requires` for field-level composition
2. **Versioning** - Manage breaking changes across subgraph versions
3. **Policies** - Attach authorization/rate-limiting policies to entities
4. **Metrics** - Metadata for monitoring entity query performance
5. **Cost Analysis** - Estimate GraphQL query cost based on entity composition
