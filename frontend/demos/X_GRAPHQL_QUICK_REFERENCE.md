# x-graphql Extensions Quick Reference

Quick reference for using `x-graphql-*` extensions in JSON Schema for GraphQL conversion.

---

## Basic Type Definition

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "User",
  "description": "A user in the system",
  "type": "object",
  "x-graphql-type-name": "User",
  "x-graphql-type-kind": "OBJECT"
}
```

**Generates:**

```graphql
"A user in the system"
type User {
  # fields here
}
```

---

## Field Mappings

### Simple Field

```json
{
  "username": {
    "type": "string",
    "description": "User's username",
    "x-graphql-field-name": "username",
    "x-graphql-field-type": "String",
    "x-graphql-field-non-null": true
  }
}
```

**Generates:**

```graphql
"User's username"
username: String!
```

### Field with Custom Type

```json
{
  "userId": {
    "type": "string",
    "x-graphql-field-type": "ID",
    "x-graphql-field-non-null": true
  }
}
```

**Generates:**

```graphql
userId: ID!
```

### Array Field

```json
{
  "tags": {
    "type": "array",
    "items": {
      "type": "string"
    },
    "x-graphql-field-type": "[String]",
    "x-graphql-field-non-null": true,
    "x-graphql-field-list-item-non-null": true
  }
}
```

**Generates:**

```graphql
tags: [String!]!
```

### Field with Arguments

```json
{
  "posts": {
    "type": "array",
    "items": { "$ref": "#/$defs/post" },
    "x-graphql-field-type": "[Post]",
    "x-graphql-field-arguments": [
      {
        "name": "limit",
        "type": "Int",
        "description": "Max posts to return",
        "default-value": 10
      },
      {
        "name": "offset",
        "type": "Int",
        "default-value": 0
      }
    ]
  }
}
```

**Generates:**

```graphql
posts(limit: Int = 10, offset: Int = 0): [Post]
```

---

## Enums

```json
{
  "$defs": {
    "user_role": {
      "type": "string",
      "enum": ["ADMIN", "USER", "GUEST"],
      "description": "Available user roles",
      "x-graphql-type-name": "UserRole",
      "x-graphql-type-kind": "ENUM",
      "x-graphql-enum-value-configs": {
        "ADMIN": {
          "description": "Administrator with full access"
        },
        "USER": {
          "description": "Regular user"
        },
        "GUEST": {
          "description": "Guest user",
          "deprecated": true,
          "deprecation-reason": "Being phased out"
        }
      }
    }
  }
}
```

**Generates:**

```graphql
"Available user roles"
enum UserRole {
  "Administrator with full access"
  ADMIN

  "Regular user"
  USER

  "Guest user"
  GUEST @deprecated(reason: "Being phased out")
}
```

---

## Apollo Federation

### Entity with @key

```json
{
  "type": "object",
  "x-graphql-type-name": "Product",
  "x-graphql-federation-keys": [
    {
      "fields": "id",
      "resolvable": true
    }
  ]
}
```

**Generates:**

```graphql
type Product @key(fields: "id") {
  # fields
}
```

### Multiple Keys

```json
{
  "x-graphql-federation-keys": [
    {
      "fields": "id"
    },
    {
      "fields": "sku organizationId"
    }
  ]
}
```

**Generates:**

```graphql
type Product
  @key(fields: "id")
  @key(fields: "sku organizationId") {
  # fields
}
```

### Shareable Type

```json
{
  "x-graphql-type-name": "Product",
  "x-graphql-federation-shareable": true
}
```

**Generates:**

```graphql
type Product @shareable {
  # fields
}
```

---

## Directives

### Type Directives

```json
{
  "x-graphql-type-name": "User",
  "x-graphql-type-directives": [
    {
      "name": "tag",
      "args": {
        "name": "public"
      }
    }
  ]
}
```

**Generates:**

```graphql
type User @tag(name: "public") {
  # fields
}
```

### Field Directives

```json
{
  "email": {
    "type": "string",
    "x-graphql-field-type": "String",
    "x-graphql-field-directives": [
      {
        "name": "deprecated",
        "args": {
          "reason": "Use contactEmail instead"
        }
      }
    ]
  }
}
```

**Generates:**

```graphql
email: String @deprecated(reason: "Use contactEmail instead")
```

---

## Type Mappings

| JSON Schema Type      | Default GraphQL Type | Custom Override                  |
| --------------------- | -------------------- | -------------------------------- |
| `"string"`            | `String`             | `x-graphql-field-type: "ID"`     |
| `"integer"`           | `Int`                | `x-graphql-field-type: "BigInt"` |
| `"number"`            | `Float`              | -                                |
| `"boolean"`           | `Boolean`            | -                                |
| `"array"`             | `[ItemType]`         | Use `x-graphql-field-type`       |
| `"object"`            | `JSON`               | Reference via `$ref`             |
| `format: "date-time"` | `DateTime`           | Custom scalar                    |
| `format: "date"`      | `Date`               | Custom scalar                    |
| `format: "email"`     | `String`             | Custom scalar                    |
| `format: "uri"`       | `String`             | Custom scalar                    |

---

## Common Patterns

### 1. Reference to Another Type

```json
{
  "profile": {
    "$ref": "#/$defs/profile",
    "x-graphql-field-type": "Profile"
  }
}
```

### 2. Nullable vs Non-Null

```json
{
  "requiredField": {
    "type": "string",
    "x-graphql-field-non-null": true
  },
  "optionalField": {
    "type": "string"
  }
}
```

**Generates:**

```graphql
requiredField: String!
optionalField: String
```

### 3. Lists with Nullability Control

```json
{
  "items": {
    "type": "array",
    "items": { "type": "string" },
    "x-graphql-field-type": "[String]",
    "x-graphql-field-non-null": true,           # List itself is required
    "x-graphql-field-list-item-non-null": true  # Items cannot be null
  }
}
```

**Generates:**

```graphql
items: [String!]!
```

### 4. Default Schema Config

```json
{
  "x-graphql-schema-config": {
    "query-type": "Query",
    "mutation-type": "Mutation",
    "subscription-type": "Subscription",
    "federation-version": "v2.9"
  }
}
```

### 5. Link Imports (Federation)

```json
{
  "x-graphql-link-imports": [
    {
      "url": "https://specs.apollo.dev/federation/v2.9",
      "import": ["@key", "@shareable", "@external"]
    }
  ]
}
```

---

## Extension Naming Convention

All extensions use **hyphen-case** (kebab-case):

- ✅ `x-graphql-field-name`
- ✅ `x-graphql-type-directives`
- ✅ `x-graphql-federation-keys`
- ❌ `x_graphql_field_name` (not snake_case)
- ❌ `xGraphqlFieldName` (not camelCase)

---

## Full Example

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "User",
  "description": "A user in the system",
  "type": "object",
  "x-graphql-type-name": "User",
  "x-graphql-type-kind": "OBJECT",
  "x-graphql-federation-keys": [
    {
      "fields": "id",
      "resolvable": true
    }
  ],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier",
      "x-graphql-field-type": "ID",
      "x-graphql-field-non-null": true
    },
    "username": {
      "type": "string",
      "description": "User's username",
      "x-graphql-field-non-null": true
    },
    "email": {
      "type": "string",
      "format": "email",
      "x-graphql-field-non-null": true
    },
    "role": {
      "type": "string",
      "enum": ["ADMIN", "USER"],
      "x-graphql-field-type": "UserRole",
      "x-graphql-field-non-null": true
    },
    "posts": {
      "type": "array",
      "items": { "$ref": "#/$defs/post" },
      "x-graphql-field-type": "[Post]",
      "x-graphql-field-arguments": [
        {
          "name": "limit",
          "type": "Int",
          "default-value": 10
        }
      ]
    }
  },
  "required": ["id", "username", "email", "role"],
  "$defs": {
    "user_role": {
      "type": "string",
      "enum": ["ADMIN", "USER"],
      "x-graphql-type-name": "UserRole",
      "x-graphql-type-kind": "ENUM"
    },
    "post": {
      "type": "object",
      "x-graphql-type-name": "Post",
      "properties": {
        "id": {
          "type": "string",
          "x-graphql-field-type": "ID",
          "x-graphql-field-non-null": true
        },
        "title": {
          "type": "string",
          "x-graphql-field-non-null": true
        }
      }
    }
  }
}
```

**Generates:**

```graphql
"A user in the system"
type User @key(fields: "id") {
  "Unique identifier"
  id: ID!

  "User's username"
  username: String!

  email: String!

  role: UserRole!

  posts(limit: Int = 10): [Post]
}

enum UserRole {
  ADMIN
  USER
}

type Post {
  id: ID!
  title: String!
}
```

---

## Tips

1. **Always set `x-graphql-type-name`** for types in `$defs` - otherwise they won't convert properly
2. **Use `x-graphql-field-non-null: true`** instead of relying on `required` array for precise control
3. **Enums must be in `$defs`** with proper `x-graphql-type-kind: "ENUM"`
4. **Federation keys** are essential for entities in federated schemas
5. **Test conversions** with the visual editor to catch issues early

---

## More Information

- **Full meta-schema:** `schema/x-graphql-extensions.schema.json`
- **Complete example:** `frontend/demos/example-schema.json`
- **Converter code:** `frontend/demos/*/src/converter-integration.ts`
- **Apollo Federation:** https://www.apollographql.com/docs/federation/
