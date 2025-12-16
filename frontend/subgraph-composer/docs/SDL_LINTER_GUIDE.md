# SDL Linter & Subgraph Naming Guide

## Overview

This guide documents the SDL (Schema Definition Language) linting capabilities and the new subgraph/supergraph metadata naming convention implemented in the JSON Schema to GraphQL converter.

## Subgraph/Supergraph Naming Convention

### Quick Rules

**✅ Supergraph Namespace** - Use ONLY for the base entity owner subgraph:
- `x-graphql-supergraph-name`
- `x-graphql-supergraph-type` = `"base-entity"`
- `x-graphql-supergraph-entity`
- `x-graphql-supergraph-query-root` = `true`

**✅ Subgraph Namespace** - Use for ALL extending subgraphs:
- `x-graphql-subgraph-name`
- `x-graphql-subgraph-type` = `"entity-extending"` or `"utility"`
- `x-graphql-subgraph-entity`
- `x-graphql-subgraph-query-root` = `false` (or omitted)

### Example: Three-Subgraph Federation

#### Subgraph 1: Users Service (Owner/Base Entity)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "User Entity - Owner Subgraph",
  "x-graphql-supergraph-name": "users-service",
  "x-graphql-supergraph-type": "base-entity",
  "x-graphql-supergraph-entity": "User",
  "x-graphql-supergraph-query-root": true,
  "type": "object",
  "x-graphql-type-name": "User",
  "properties": {
    "user_id": {
      "type": "string",
      "format": "uuid",
      "x-graphql-type": "ID!"
    },
    "first_name": { "type": "string", "x-graphql-type": "String!" },
    "last_name": { "type": "string", "x-graphql-type": "String!" }
  }
}
```

#### Subgraph 2: User Status Service (Extending)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "User Status - Extending Subgraph",
  "x-graphql-subgraph-name": "user-status-service",
  "x-graphql-subgraph-type": "entity-extending",
  "x-graphql-subgraph-entity": "User",
  "x-graphql-subgraph-query-root": false,
  "type": "object",
  "properties": {
    "user_id": {
      "type": "string",
      "format": "uuid",
      "x-graphql-type": "ID!",
      "x-graphql-directives": [{ "name": "external" }]
    },
    "account_role": { "type": "string", "enum": ["ADMIN", "USER", "GUEST"] },
    "current_status": { "type": "string", "enum": ["ACTIVE", "INACTIVE", "SUSPENDED"] }
  }
}
```

#### Subgraph 3: User Details Service (Extending)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "User Details - Extending Subgraph",
  "x-graphql-subgraph-name": "user-details-service",
  "x-graphql-subgraph-type": "entity-extending",
  "x-graphql-subgraph-entity": "User",
  "x-graphql-subgraph-query-root": false,
  "type": "object",
  "properties": {
    "user_id": {
      "type": "string",
      "format": "uuid",
      "x-graphql-type": "ID!",
      "x-graphql-directives": [{ "name": "external" }]
    },
    "contact_info": { "type": "object", "x-graphql-type-name": "ContactInfo" },
    "address": { "type": "object", "x-graphql-type-name": "Address" }
  }
}
```

## SDL Linting

### What Gets Linted

The `lintSDL()` function checks GraphQL SDL for:

| Check | Severity | Details |
|-------|----------|---------|
| **Type Naming** | Error | Types must use PascalCase (e.g., `User`, `Account`) |
| **Field Naming** | Warning | Fields should use snake_case (e.g., `user_id`, `first_name`) |
| **@extends/@key** | Warning | Types with @extends should have @key directive |
| **@external/@extends** | Warning | @external should only appear with @extends |
| **Duplicate Types** | Error | Type name appears more than once |
| **Empty Types** | Info | Type has no fields or only placeholder |

### Using the Linter

```javascript
import { lintSDL } from './lib/federation-validator.js';

const sdl = `
  type User @key(fields: "id") {
    id: ID!
    first_name: String!
  }
`;

const issues = lintSDL(sdl);

console.log('Errors:', issues.errors);     // Critical issues (fail build)
console.log('Warnings:', issues.warnings); // Best practice violations
console.log('Infos:', issues.infos);       // Informational hints
```

**Example Output:**
```javascript
{
  errors: [
    'Type name "user" should start with uppercase letter (PascalCase)'
  ],
  warnings: [
    'Field name "FirstName" should use snake_case (start with lowercase)'
  ],
  infos: []
}
```

## Subgraph Naming Validation

### What Gets Validated

The `validateSubgraphNaming()` function enforces:

1. **Only ONE supergraph allowed** ✓
   - Error if multiple schemas use `x-graphql-supergraph-*`

2. **Supergraph must be base-entity** ✓
   - Error if supergraph has type other than `"base-entity"`

3. **No mixed metadata** ✓
   - Error if schema uses both `x-graphql-supergraph-*` and `x-graphql-subgraph-*`

4. **Valid subgraph types** ✓
   - Error if subgraph type is `"base-entity"` (only supergraph can be)
   - Only `"entity-extending"` or `"utility"` allowed

5. **Consistency checks** ✓
   - Warning if extending subgraphs exist without base entity

### Using the Validator

```javascript
import { validateSubgraphNaming } from './lib/federation-validator.js';

const schemas = [
  {
    name: 'users-service',
    schema: {
      'x-graphql-supergraph-name': 'users-service',
      'x-graphql-supergraph-type': 'base-entity',
      'x-graphql-supergraph-entity': 'User',
      'x-graphql-supergraph-query-root': true
    },
    type: 'owner'
  },
  {
    name: 'user-status-service',
    schema: {
      'x-graphql-subgraph-name': 'user-status-service',
      'x-graphql-subgraph-type': 'entity-extending',
      'x-graphql-subgraph-entity': 'User'
    },
    type: 'extending'
  }
];

const result = validateSubgraphNaming(schemas);

console.log('Valid:', result.valid);                    // true/false
console.log('Supergraph count:', result.supergraphCount); // Should be 1
console.log('Subgraph count:', result.subgraphCount);     // Should be N-1
console.log('Errors:', result.errors);                   // Any validation errors
console.log('Warnings:', result.warnings);               // Any warnings
```

**Example Output:**
```javascript
{
  valid: true,
  errors: [],
  warnings: [],
  supergraphCount: 1,
  subgraphCount: 2,
  supergraphSchemas: [
    { name: 'users-service', type: 'base-entity', isBaseEntity: true }
  ],
  subgraphSchemas: [
    { name: 'user-status-service', type: 'entity-extending' },
    { name: 'user-details-service', type: 'entity-extending' }
  ]
}
```

## Common Patterns

### ✅ Valid Three-Subgraph Composition

```
users-service (OWNER)
  ├─ x-graphql-supergraph-name
  ├─ x-graphql-supergraph-type: "base-entity"
  └─ @key(fields: "user_id")

user-status-service (EXTENDING)
  ├─ x-graphql-subgraph-name
  ├─ x-graphql-subgraph-type: "entity-extending"
  └─ @extends + @key(fields: "user_id")

user-details-service (EXTENDING)
  ├─ x-graphql-subgraph-name
  ├─ x-graphql-subgraph-type: "entity-extending"
  └─ @extends + @key(fields: "user_id")
```

### ❌ Invalid: Multiple Base Entities

```
❌ REJECTED:
users-service (x-graphql-supergraph-type: "base-entity")
products-service (x-graphql-supergraph-type: "base-entity")
       ↑
Error: Only 1 subgraph can use x-graphql-supergraph-* metadata
```

### ❌ Invalid: Subgraph as Base Entity

```
❌ REJECTED:
users-service (x-graphql-subgraph-type: "base-entity")
       ↑
Error: x-graphql-subgraph-type must be "entity-extending" or "utility"
```

### ❌ Invalid: Mixed Metadata

```
❌ REJECTED:
{
  "x-graphql-supergraph-name": "...",
  "x-graphql-subgraph-name": "..."
       ↑
Error: Cannot mix x-graphql-supergraph-* and x-graphql-subgraph-* metadata
```

## Integration with Converter

The converter automatically:

1. **Detects ID fields** in JSON Schema
2. **Adds ID type metadata** (x-graphql-type: "ID!")
3. **Applies federation directives** based on metadata
4. **Generates SDL** with proper @key/@extends/@external

## Test Coverage

✅ **164 tests passing** including:
- 15 SDL linting tests
- 12 subgraph naming validation tests
- All federation validator tests
- All converter tests
- All federation directive tests

## Best Practices

1. **Always validate** before composition
   ```javascript
   const naming = validateSubgraphNaming(schemas);
   const linting = schemas.forEach(s => lintSDL(s.sdl));
   ```

2. **One owner, many extenders**
   ```
   1 supergraph (base-entity) 
   + N subgraphs (entity-extending)
   = Federated composition
   ```

3. **Use snake_case for fields**
   ```json
   ✅ "user_id", "first_name", "account_status"
   ❌ "userId", "firstName", "accountStatus"
   ```

4. **Use PascalCase for types**
   ```graphql
   ✅ type User, type Account, type UserStatus
   ❌ type user, type account, type user_status
   ```

5. **Define ID fields explicitly**
   ```json
   "user_id": {
     "type": "string",
     "format": "uuid",
     "x-graphql-type": "ID!"
   }
   ```

## References

- [Apollo Federation Documentation](https://www.apollographql.com/docs/apollo-server/federation/)
- [GraphQL SDL Specification](https://spec.graphql.org/)
- [ADR 0008: Subgraph/Supergraph Metadata Naming](../docs/adr/0008-subgraph-supergraph-metadata-naming.md)
- [ADR 0009: Use GraphQL-ESLint for SDL Linting](../docs/adr/0009-use-graphql-eslint-for-sdl-linting.md)
