# X-GraphQL Quick Reference Guide

**Version**: 2.0.0-alpha  
**Last Updated**: December 31, 2024

---

## Overview

The `x-graphql-*` namespace provides extensions to JSON Schema for precise control over GraphQL SDL generation. This guide covers the most commonly used attributes.

---

## P0 Features (Essential)

### Type & Field Naming

#### `x-graphql-type-name`

Specify the GraphQL type name.

```json
{
  "type": "object",
  "x-graphql-type-name": "User",
  "properties": { ... }
}
```

**Output**: `type User { ... }`

---

#### `x-graphql-field-name`

Specify the GraphQL field name.

```json
{
  "user_id": {
    "type": "string",
    "x-graphql-field-name": "id"
  }
}
```

**Output**: `id: String`

---

### Nullability Control

#### `x-graphql-field-non-null`

Mark a field as non-null (required in GraphQL).

```json
{
  "email": {
    "type": "string",
    "x-graphql-field-non-null": true
  }
}
```

**Output**: `email: String!`

---

#### `x-graphql-nullable`

Explicitly make a field nullable (overrides `required` array).

```json
{
  "optional_field": {
    "type": "string",
    "x-graphql-nullable": true
  }
}
```

**Output**: `optionalField: String` (nullable even if in `required` array)

**Priority**: `x-graphql-nullable` > `x-graphql-field-non-null` > `required` array

---

#### `x-graphql-field-list-item-non-null`

Control nullability of items in an array.

```json
{
  "tags": {
    "type": "array",
    "items": { "type": "string" },
    "x-graphql-field-list-item-non-null": true
  }
}
```

**Output**: `tags: [String!]` (list of non-null strings)

---

### Field/Type Skipping

#### `x-graphql-skip`

Exclude a field or type from GraphQL schema generation.

```json
{
  "password_hash": {
    "type": "string",
    "x-graphql-skip": true
  }
}
```

**Result**: Field will not appear in GraphQL SDL

**Use Cases**:

- Hide sensitive data (passwords, tokens)
- Exclude internal metadata
- Remove database-specific fields

---

### Descriptions

#### `x-graphql-description`

Provide GraphQL-specific description (overrides JSON Schema `description`).

```json
{
  "type": "object",
  "description": "Database model description",
  "x-graphql-description": "User entity exposed via GraphQL API",
  "properties": { ... }
}
```

**Output**:

```graphql
"""
User entity exposed via GraphQL API
"""
type User { ... }
```

**Priority**: `x-graphql-description` > `description`

---

### Type Overrides

#### `x-graphql-field-type`

Override the inferred GraphQL type.

```json
{
  "created_at": {
    "type": "string",
    "format": "date-time",
    "x-graphql-field-type": "DateTime"
  }
}
```

**Output**: `createdAt: DateTime`

**Common Uses**:

- Map to custom scalars (`DateTime`, `Date`, `JSON`, `Upload`)
- Override type inference
- Use specific GraphQL types

---

## P1 Features (Important)

### Interfaces

#### `x-graphql-type-kind`

Specify the GraphQL type kind.

```json
{
  "type": "object",
  "x-graphql-type-name": "Node",
  "x-graphql-type-kind": "INTERFACE",
  "properties": {
    "id": {
      "type": "string",
      "x-graphql-field-type": "ID",
      "x-graphql-field-non-null": true
    }
  }
}
```

**Output**:

```graphql
interface Node {
  id: ID!
}
```

**Valid Values**: `OBJECT`, `INTERFACE`, `UNION`, `ENUM`, `INPUT_OBJECT`, `SCALAR`

---

#### `x-graphql-implements`

Specify which interfaces a type implements.

```json
{
  "type": "object",
  "x-graphql-type-name": "User",
  "x-graphql-implements": ["Node", "Timestamped"],
  "properties": { ... }
}
```

**Output**: `type User implements Node & Timestamped { ... }`

---

### Union Types

#### `x-graphql-union-types`

Define a union type with member types.

```json
{
  "type": "object",
  "x-graphql-type-name": "SearchResult",
  "x-graphql-type-kind": "UNION",
  "x-graphql-union-types": ["User", "Product", "Article"],
  "oneOf": [
    { "$ref": "#/definitions/User" },
    { "$ref": "#/definitions/Product" },
    { "$ref": "#/definitions/Article" }
  ]
}
```

**Output**: `union SearchResult = User | Product | Article`

---

### Federation

#### `x-graphql-federation-keys`

Define federation keys for Apollo Federation.

```json
{
  "type": "object",
  "x-graphql-type-name": "User",
  "x-graphql-federation-keys": ["id"],
  "properties": { ... }
}
```

**Output**: `type User @key(fields: "id") { ... }`

**Multiple Keys**:

```json
{
  "x-graphql-federation-keys": ["id", "email"]
}
```

**Output**:

```graphql
type User
  @key(fields: "id")
  @key(fields: "email")
{ ... }
```

---

#### `x-graphql-federation-shareable`

Mark a type as shareable across subgraphs.

```json
{
  "type": "object",
  "x-graphql-type-name": "Product",
  "x-graphql-federation-shareable": true,
  "properties": { ... }
}
```

**Output**: `type Product @shareable { ... }`

---

#### `x-graphql-federation-requires`

Specify fields required for resolution.

```json
{
  "total_price": {
    "type": "number",
    "x-graphql-field-name": "totalPrice",
    "x-graphql-federation-requires": ["quantity", "price"]
  }
}
```

**Output**: `totalPrice: Float @requires(fields: "quantity price")`

---

#### `x-graphql-federation-provides`

Specify fields provided by this resolver.

```json
{
  "user": {
    "type": "object",
    "x-graphql-field-name": "user",
    "x-graphql-field-type": "User",
    "x-graphql-federation-provides": ["username"]
  }
}
```

**Output**: `user: User @provides(fields: "username")`

---

## Common Patterns

### Pattern 1: Hide Sensitive Fields

```json
{
  "User": {
    "type": "object",
    "x-graphql-type-name": "User",
    "properties": {
      "id": {
        "type": "string",
        "x-graphql-field-name": "id",
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      },
      "email": {
        "type": "string",
        "x-graphql-field-name": "email",
        "x-graphql-field-non-null": true
      },
      "password_hash": {
        "type": "string",
        "x-graphql-skip": true
      },
      "password_salt": {
        "type": "string",
        "x-graphql-skip": true
      }
    }
  }
}
```

**Result**: Password fields never appear in GraphQL schema

---

### Pattern 2: Override Nullability

```json
{
  "DeletedUser": {
    "type": "object",
    "x-graphql-type-name": "DeletedUser",
    "properties": {
      "id": {
        "type": "string",
        "x-graphql-field-name": "id",
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      },
      "deleted_at": {
        "type": "string",
        "format": "date-time",
        "x-graphql-field-name": "deletedAt",
        "x-graphql-field-type": "DateTime",
        "x-graphql-nullable": true
      }
    },
    "required": ["id", "deleted_at"]
  }
}
```

**Result**: `deletedAt` is nullable despite being in `required` array

---

### Pattern 3: GraphQL-Specific Descriptions

```json
{
  "User": {
    "type": "object",
    "description": "User table in database with authentication info",
    "x-graphql-description": "Represents a user in the application",
    "x-graphql-type-name": "User",
    "properties": {
      "email": {
        "type": "string",
        "description": "User's email (must be unique in DB)",
        "x-graphql-description": "User's email address for login and notifications",
        "x-graphql-field-name": "email"
      }
    }
  }
}
```

**Result**: GraphQL descriptions are cleaner and API-focused

---

### Pattern 4: Non-null Lists

```json
{
  "Post": {
    "type": "object",
    "x-graphql-type-name": "Post",
    "properties": {
      "tags": {
        "type": "array",
        "items": { "type": "string" },
        "x-graphql-field-name": "tags",
        "x-graphql-field-non-null": true,
        "x-graphql-field-list-item-non-null": true
      }
    }
  }
}
```

**Output**: `tags: [String!]!` (non-null list of non-null strings)

---

### Pattern 5: Interface Implementation

```json
{
  "definitions": {
    "Node": {
      "type": "object",
      "x-graphql-type-name": "Node",
      "x-graphql-type-kind": "INTERFACE",
      "properties": {
        "id": {
          "type": "string",
          "x-graphql-field-type": "ID",
          "x-graphql-field-non-null": true
        }
      }
    },
    "User": {
      "type": "object",
      "x-graphql-type-name": "User",
      "x-graphql-implements": ["Node"],
      "properties": {
        "id": {
          "type": "string",
          "x-graphql-field-type": "ID",
          "x-graphql-field-non-null": true
        },
        "username": {
          "type": "string",
          "x-graphql-field-non-null": true
        }
      }
    }
  }
}
```

**Output**:

```graphql
interface Node {
  id: ID!
}

type User implements Node {
  id: ID!
  username: String!
}
```

---

## Validation

### Using the CLI Validator

```bash
# Validate a schema
npx validate-x-graphql schema.json

# Validate multiple schemas
npx validate-x-graphql schema1.json schema2.json

# Validate a directory
npx validate-x-graphql ./schemas/

# Fail on warnings
npx validate-x-graphql schema.json --fail-on-warning

# JSON output
npx validate-x-graphql schema.json --json
```

### Common Validation Errors

**Invalid GraphQL Name**:

```
Error: x-graphql-type-name "User-Type" is not a valid GraphQL name
Must match: /^[_A-Za-z][_0-9A-Za-z]*$/
```

**Missing Union Types**:

```
Error: x-graphql-type-kind "UNION" requires x-graphql-union-types to be specified
```

**Type Mismatch**:

```
Error: x-graphql-skip must be a boolean
```

---

## Priority and Precedence

### Nullability Priority (Highest to Lowest)

1. `x-graphql-nullable`
2. `x-graphql-field-non-null`
3. `required` array in JSON Schema

### Description Priority (Highest to Lowest)

1. `x-graphql-description`
2. `description` (JSON Schema)

### Naming Priority (Highest to Lowest)

1. `x-graphql-type-name` / `x-graphql-field-name`
2. `title` (for types)
3. Property name (for fields)

---

## Best Practices

### ✅ DO

- Use `x-graphql-skip` for sensitive data
- Use `x-graphql-description` for API-facing descriptions
- Use `x-graphql-nullable` to override nullability explicitly
- Validate schemas before committing (use pre-commit hook)
- Keep GraphQL names consistent with your API conventions

### ❌ DON'T

- Don't use both `x-graphql-nullable: true` and `x-graphql-field-non-null: true` (confusing)
- Don't skip required fields without understanding the impact
- Don't use invalid GraphQL names (no hyphens, must start with letter)
- Don't put database implementation details in `x-graphql-description`

---

## Cheat Sheet

| Attribute                   | Purpose         | Type         | Example             |
| --------------------------- | --------------- | ------------ | ------------------- |
| `x-graphql-type-name`       | Set type name   | string       | `"User"`            |
| `x-graphql-field-name`      | Set field name  | string       | `"userId"`          |
| `x-graphql-field-type`      | Override type   | string       | `"DateTime"`        |
| `x-graphql-field-non-null`  | Make non-null   | boolean      | `true`              |
| `x-graphql-nullable`        | Make nullable   | boolean      | `true`              |
| `x-graphql-skip`            | Hide from SDL   | boolean      | `true`              |
| `x-graphql-description`     | GraphQL desc    | string       | `"User entity"`     |
| `x-graphql-type-kind`       | Type kind       | enum         | `"INTERFACE"`       |
| `x-graphql-implements`      | Interfaces      | array        | `["Node"]`          |
| `x-graphql-union-types`     | Union members   | array        | `["User", "Admin"]` |
| `x-graphql-federation-keys` | Federation keys | array/string | `["id"]`            |

---

## Additional Resources

- **Full Implementation Plan**: `docs/plans/X-GRAPHQL-NAMESPACE-IMPLEMENTATION-PLAN.md`
- **Implementation Status**: `IMPLEMENTATION_STATUS.md`
- **Test Schemas**: `converters/test-data/x-graphql/`
- **API Documentation**: `converters/node/src/x-graphql-extensions.ts`
- **Validation Guide**: `converters/node/src/x-graphql-validator.ts`

---

## Getting Help

### Validation Errors

Run the validator with `--verbose` for detailed information:

```bash
npx validate-x-graphql schema.json --verbose
```

### Testing Your Schema

Use the test schemas as examples:

```bash
ls converters/test-data/x-graphql/
```

### Common Issues

Check `IMPLEMENTATION_STATUS.md` for known issues and workarounds.

---

**Version**: 2.0.0-alpha  
**Last Updated**: December 31, 2024  
**Status**: P0 Features Complete
