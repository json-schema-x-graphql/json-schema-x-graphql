# X-GraphQL Attribute Reference

**Complete catalog of all x-graphql-\* extensions for JSON Schema to GraphQL conversion**

Version: 2.0.0  
Last Updated: January 2025

---

## Table of Contents

- [Overview](#overview)
- [Type-Level Attributes](#type-level-attributes)
- [Field-Level Attributes](#field-level-attributes)
- [Federation Attributes](#federation-attributes)
- [Metadata Attributes](#metadata-attributes)
- [Legacy Attributes](#legacy-attributes)
- [Attribute Priority Rules](#attribute-priority-rules)
- [Examples](#examples)

---

## Overview

X-GraphQL attributes are JSON Schema vendor extensions (prefixed with `x-graphql-`) that provide fine-grained control over GraphQL SDL generation. These attributes are:

- **Optional**: Converters provide sensible defaults when attributes are absent
- **Non-invasive**: Standard JSON Schema validation ignores vendor extensions
- **Explicit**: Override auto-generated behavior when needed
- **Composable**: Combine multiple attributes for complex scenarios

### Naming Convention

All attributes follow the pattern: `x-graphql-{category}-{name}`

- Type-level: `x-graphql-type-*`
- Field-level: `x-graphql-field-*`
- Federation: `x-graphql-federation-*`
- General: `x-graphql-{name}` (e.g., `x-graphql-description`, `x-graphql-skip`)

---

## Type-Level Attributes

### `x-graphql-type-name`

**Type**: `string`  
**Scope**: Object, Enum  
**Priority**: P0

Specifies the exact GraphQL type name to use instead of the auto-generated name.

**Example**:

```json
{
  "type": "object",
  "x-graphql-type-name": "User",
  "properties": {
    "id": { "type": "string" }
  }
}
```

**Output**:

```graphql
type User {
  id: String
}
```

**Best Practices**:

- Use PascalCase for types
- Be explicit when auto-generation doesn't match your schema conventions
- Required when using definitions that don't map cleanly to type names

---

### `x-graphql-type-kind`

**Type**: `string` (enum)  
**Scope**: Object  
**Priority**: P0

Defines the GraphQL type kind. Overrides default behavior (objects become `OBJECT` by default).

**Valid Values**:

- `"OBJECT"` (default for JSON Schema objects)
- `"INTERFACE"`
- `"UNION"`
- `"INPUT_OBJECT"`

**Example - Interface**:

```json
{
  "type": "object",
  "x-graphql-type-name": "Node",
  "x-graphql-type-kind": "INTERFACE",
  "properties": {
    "id": { "type": "string" }
  }
}
```

**Output**:

```graphql
interface Node {
  id: String
}
```

**Example - Union**:

```json
{
  "x-graphql-type-kind": "UNION",
  "x-graphql-type-name": "SearchResult",
  "x-graphql-union-types": ["User", "Product"]
}
```

**Output**:

```graphql
union SearchResult = User | Product
```

---

### `x-graphql-implements`

**Type**: `string[]`  
**Scope**: Object  
**Priority**: P1

Specifies which GraphQL interfaces this type implements.

**Example**:

```json
{
  "type": "object",
  "x-graphql-type-name": "User",
  "x-graphql-implements": ["Node", "Timestamped"],
  "properties": {
    "id": { "type": "string" },
    "createdAt": { "type": "string", "format": "date-time" }
  }
}
```

**Output**:

```graphql
type User implements Node & Timestamped {
  id: String
  createdAt: String
}
```

**Best Practices**:

- Ensure all interface fields are present in the implementing type
- List interfaces in dependency order if they extend each other

---

### `x-graphql-union-types`

**Type**: `string[]`  
**Scope**: Object (with `x-graphql-type-kind: "UNION"`)  
**Priority**: P1

Lists the member types for a union type.

**Example**:

```json
{
  "x-graphql-type-kind": "UNION",
  "x-graphql-type-name": "SearchResult",
  "x-graphql-union-types": ["User", "Product", "Post"],
  "oneOf": [
    { "$ref": "#/definitions/User" },
    { "$ref": "#/definitions/Product" },
    { "$ref": "#/definitions/Post" }
  ]
}
```

**Output**:

```graphql
union SearchResult = User | Product | Post
```

---

### `x-graphql-type-directives`

**Type**: `object[]`  
**Scope**: Object  
**Priority**: P2

Custom directives to apply to the type definition.

**Example**:

```json
{
  "type": "object",
  "x-graphql-type-name": "User",
  "x-graphql-type-directives": [
    { "name": "cacheControl", "args": { "maxAge": 60 } },
    { "name": "auth", "args": { "requires": "USER" } }
  ]
}
```

**Output**:

```graphql
type User @cacheControl(maxAge: 60) @auth(requires: USER) {
  # fields...
}
```

---

## Field-Level Attributes

### `x-graphql-field-name`

**Type**: `string`  
**Scope**: Property  
**Priority**: P0

Specifies the exact GraphQL field name (overrides case conversion).

**Example**:

```json
{
  "properties": {
    "user_id": {
      "type": "string",
      "x-graphql-field-name": "id"
    }
  }
}
```

**Output**:

```graphql
id: String
```

**Best Practices**:

- Use camelCase for field names
- Map database column names to GraphQL conventions

---

### `x-graphql-field-type`

**Type**: `string`  
**Scope**: Property  
**Priority**: P0

Overrides the auto-inferred GraphQL type for a field.

**Example**:

```json
{
  "properties": {
    "id": {
      "type": "string",
      "x-graphql-field-type": "ID"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time",
      "x-graphql-field-type": "DateTime"
    }
  }
}
```

**Output**:

```graphql
id: ID
createdAt: DateTime
```

**Common Mappings**:

- `string` → `"ID"` for identifiers
- `string` (format: date-time) → `"DateTime"`
- `string` (format: uri) → `"URL"`
- `string` (format: email) → `"Email"`
- `object` → `"JSON"` for arbitrary objects

---

### `x-graphql-field-non-null`

**Type**: `boolean`  
**Scope**: Property  
**Priority**: P0

Explicitly marks a field as non-nullable (adds `!` in GraphQL).

**Example**:

```json
{
  "properties": {
    "email": {
      "type": "string",
      "x-graphql-field-non-null": true
    }
  }
}
```

**Output**:

```graphql
email: String!
```

**Note**: This takes precedence over JSON Schema `required` array.

---

### `x-graphql-nullable`

**Type**: `boolean`  
**Scope**: Property  
**Priority**: P0

Forces a field to be nullable in GraphQL, even if it's in JSON Schema `required` array.

**Example**:

```json
{
  "properties": {
    "optionalField": {
      "type": "string",
      "x-graphql-nullable": true
    }
  },
  "required": ["optionalField"]
}
```

**Output**:

```graphql
optionalField: String
```

**Use Cases**:

- Fields required for JSON validation but optional in GraphQL queries
- Backward compatibility during schema evolution

---

### `x-graphql-field-list-item-non-null`

**Type**: `boolean`  
**Scope**: Array property  
**Priority**: P1

Makes list items non-nullable (creates `[Type!]` instead of `[Type]`).

**Example**:

```json
{
  "properties": {
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "x-graphql-field-list-item-non-null": true
    }
  }
}
```

**Output**:

```graphql
tags: [String!]
```

---

### `x-graphql-skip`

**Type**: `boolean`  
**Scope**: Property or Object  
**Priority**: P0

Completely excludes a field or type from GraphQL SDL generation.

**Example - Skip Field**:

```json
{
  "properties": {
    "id": { "type": "string" },
    "password_hash": {
      "type": "string",
      "x-graphql-skip": true
    }
  }
}
```

**Output**:

```graphql
type User {
  id: String
  # password_hash is excluded
}
```

**Example - Skip Type**:

```json
{
  "definitions": {
    "InternalType": {
      "type": "object",
      "x-graphql-skip": true,
      "properties": { "secret": { "type": "string" } }
    }
  }
}
```

**Use Cases**:

- Internal fields (passwords, tokens, secrets)
- Computed fields handled by resolvers
- Types only used for JSON validation

---

### `x-graphql-field-directives`

**Type**: `object[]`  
**Scope**: Property  
**Priority**: P2

Custom directives to apply to the field.

**Example**:

```json
{
  "properties": {
    "email": {
      "type": "string",
      "x-graphql-field-directives": [
        {
          "name": "deprecated",
          "args": { "reason": "Use 'emailAddress' instead" }
        }
      ]
    }
  }
}
```

**Output**:

```graphql
email: String @deprecated(reason: "Use 'emailAddress' instead")
```

---

### `x-graphql-field-arguments`

**Type**: `object`  
**Scope**: Property  
**Priority**: P2

Defines arguments for a field (for query/mutation fields).

**Example**:

```json
{
  "properties": {
    "user": {
      "type": "object",
      "x-graphql-field-arguments": {
        "id": { "type": "ID!", "description": "User ID" }
      }
    }
  }
}
```

**Output**:

```graphql
user(id: ID!): User
```

---

## Federation Attributes

### `x-graphql-federation-keys`

**Type**: `string | string[]`  
**Scope**: Object  
**Priority**: P1

Defines entity keys for Apollo Federation. Can be a single key or multiple keys.

**Example - Single Key**:

```json
{
  "type": "object",
  "x-graphql-type-name": "Product",
  "x-graphql-federation-keys": "id"
}
```

**Output**:

```graphql
type Product @key(fields: "id") {
  id: ID!
}
```

**Example - Multiple Keys**:

```json
{
  "x-graphql-federation-keys": ["id", "sku"]
}
```

**Output**:

```graphql
type Product @key(fields: "id") @key(fields: "sku") {
  id: ID!
  sku: String!
}
```

**Example - Composite Key**:

```json
{
  "x-graphql-federation-keys": "organizationId accountId"
}
```

**Output**:

```graphql
type Account @key(fields: "organizationId accountId") {
  organizationId: ID!
  accountId: ID!
}
```

---

### `x-graphql-federation-shareable`

**Type**: `boolean`  
**Scope**: Object  
**Priority**: P1

Marks a type as shareable across multiple subgraphs (Federation v2).

**Example**:

```json
{
  "type": "object",
  "x-graphql-type-name": "Product",
  "x-graphql-federation-shareable": true
}
```

**Output**:

```graphql
type Product @shareable {
  id: ID!
  name: String
}
```

---

### `x-graphql-federation-external`

**Type**: `boolean`  
**Scope**: Property  
**Priority**: P1

Marks a field as owned by another subgraph.

**Example**:

```json
{
  "properties": {
    "inventoryCount": {
      "type": "integer",
      "x-graphql-federation-external": true
    }
  }
}
```

**Output**:

```graphql
type Product {
  inventoryCount: Int @external
}
```

---

### `x-graphql-federation-requires`

**Type**: `string | string[]`  
**Scope**: Property  
**Priority**: P1

Specifies fields from another subgraph required to resolve this field.

**Example**:

```json
{
  "properties": {
    "shippingEstimate": {
      "type": "number",
      "x-graphql-federation-requires": "weight dimensions"
    }
  }
}
```

**Output**:

```graphql
shippingEstimate: Float @requires(fields: "weight dimensions")
```

---

### `x-graphql-federation-provides`

**Type**: `string | string[]`  
**Scope**: Property  
**Priority**: P1

Specifies which fields from a related type this field can provide.

**Example**:

```json
{
  "properties": {
    "seller": {
      "type": "string",
      "x-graphql-field-type": "User",
      "x-graphql-federation-provides": "email username"
    }
  }
}
```

**Output**:

```graphql
seller: User @provides(fields: "email username")
```

---

### `x-graphql-federation-override-from`

**Type**: `string`  
**Scope**: Property  
**Priority**: P1

Marks a field as migrated from another subgraph.

**Example**:

```json
{
  "properties": {
    "legacyField": {
      "type": "string",
      "x-graphql-federation-override-from": "legacy-service"
    }
  }
}
```

**Output**:

```graphql
legacyField: String @override(from: "legacy-service")
```

---

## Metadata Attributes

### `x-graphql-description`

**Type**: `string`  
**Scope**: Object, Property  
**Priority**: P0

GraphQL-specific description that overrides JSON Schema `description`.

**Example**:

```json
{
  "type": "object",
  "description": "Internal database model for users",
  "x-graphql-description": "User account entity",
  "properties": {
    "id": {
      "type": "string",
      "description": "Internal UUID",
      "x-graphql-description": "Unique user identifier"
    }
  }
}
```

**Output**:

```graphql
"""
User account entity
"""
type User {
  """
  Unique user identifier
  """
  id: String
}
```

**Use Cases**:

- Different documentation for API vs internal use
- GraphQL-specific clarifications

---

### `x-graphql-scalar`

**Type**: `object`  
**Scope**: String/Number types  
**Priority**: P2

Defines a custom scalar type with metadata.

**Example**:

```json
{
  "type": "string",
  "x-graphql-scalar": {
    "name": "Email",
    "description": "Valid email address",
    "specifiedByURL": "https://tools.ietf.org/html/rfc5322"
  }
}
```

**Output**:

```graphql
"""
Valid email address
"""
scalar Email @specifiedBy(url: "https://tools.ietf.org/html/rfc5322")
```

---

## Legacy Attributes

### `x-graphql-type`

**Type**: `string | object`  
**Scope**: Object  
**Status**: ⚠️ Deprecated (use `x-graphql-type-name` and `x-graphql-type-kind`)

Legacy attribute for specifying type name and kind.

**String Form** (equivalent to `x-graphql-type-name`):

```json
{
  "x-graphql-type": "User"
}
```

**Object Form**:

```json
{
  "x-graphql-type": {
    "name": "User",
    "kind": "OBJECT"
  }
}
```

**Migration**: Use `x-graphql-type-name` and `x-graphql-type-kind` separately.

---

## Attribute Priority Rules

When multiple attributes could affect the same behavior, they are resolved in this order:

### Field Nullability

1. `x-graphql-nullable` (if `true`, field is nullable regardless of other settings)
2. `x-graphql-field-non-null` (if `true`, field is non-null)
3. JSON Schema `required` array (if present, field is non-null)
4. Default: nullable

### Field Name

1. `x-graphql-field-name` (explicit name)
2. Property key with case conversion (snake_case → camelCase)

### Type Name

1. `x-graphql-type-name` (explicit name)
2. `x-graphql-type` (legacy, string form)
3. Definition key with case conversion

### Description

1. `x-graphql-description` (GraphQL-specific)
2. `description` (standard JSON Schema)
3. No description

---

## Examples

### Complete Entity with All Features

```json
{
  "type": "object",
  "x-graphql-type-name": "User",
  "x-graphql-type-kind": "OBJECT",
  "x-graphql-implements": ["Node", "Timestamped"],
  "x-graphql-description": "User account with full metadata",
  "x-graphql-federation-keys": ["id", "email"],
  "x-graphql-federation-shareable": true,
  "properties": {
    "id": {
      "type": "string",
      "x-graphql-field-name": "id",
      "x-graphql-field-type": "ID",
      "x-graphql-field-non-null": true,
      "x-graphql-description": "Unique identifier"
    },
    "email": {
      "type": "string",
      "format": "email",
      "x-graphql-field-type": "Email",
      "x-graphql-field-non-null": true
    },
    "password_hash": {
      "type": "string",
      "x-graphql-skip": true
    },
    "profile_image": {
      "type": ["string", "null"],
      "x-graphql-field-name": "profileImage",
      "x-graphql-nullable": true
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "x-graphql-field-list-item-non-null": true
    }
  },
  "required": ["id", "email"]
}
```

**Output**:

```graphql
"""
User account with full metadata
"""
type User implements Node & Timestamped
  @key(fields: "id")
  @key(fields: "email")
  @shareable {
  """
  Unique identifier
  """
  id: ID!

  email: Email!
  profileImage: String
  tags: [String!]
}
```

---

## See Also

- [Quick Start Guide](QUICK_START.md) - Get started in 5 minutes
- [Common Patterns](COMMON_PATTERNS.md) - Real-world usage patterns
- [Migration Guide](MIGRATION_GUIDE.md) - Migrate from other tools
- [Implementation Plan](../plans/X-GRAPHQL-NAMESPACE-IMPLEMENTATION-PLAN.md) - Technical details

---

**Version**: 2.0.0  
**Last Updated**: January 2025  
**Status**: ✅ Complete
