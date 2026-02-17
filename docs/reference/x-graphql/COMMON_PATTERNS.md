# X-GraphQL Common Patterns

**Real-world usage patterns and best practices for x-graphql extensions**

Version: 2.0.0  
Last Updated: January 2025

---

## Table of Contents

- [Basic Patterns](#basic-patterns)
- [Type Patterns](#type-patterns)
- [Field Patterns](#field-patterns)
- [Federation Patterns](#federation-patterns)
- [Advanced Patterns](#advanced-patterns)
- [Anti-Patterns](#anti-patterns)

---

## Basic Patterns

### Pattern: Simple Type Mapping

**Use Case**: Map a database model to a GraphQL type with renamed fields.

**JSON Schema**:

```json
{
  "definitions": {
    "User": {
      "type": "object",
      "x-graphql-type-name": "User",
      "properties": {
        "user_id": {
          "type": "string",
          "x-graphql-field-name": "id",
          "x-graphql-field-type": "ID"
        },
        "email_address": {
          "type": "string",
          "format": "email",
          "x-graphql-field-name": "email"
        },
        "full_name": {
          "type": "string",
          "x-graphql-field-name": "name"
        }
      },
      "required": ["user_id", "email_address"]
    }
  }
}
```

**GraphQL Output**:

```graphql
type User {
  id: ID!
  email: String!
  name: String
}
```

**Best Practices**:

- Use `x-graphql-field-name` to convert snake_case to camelCase
- Use `x-graphql-field-type: "ID"` for identifier fields
- Let `required` array control nullability unless you need exceptions

---

### Pattern: Hiding Sensitive Fields

**Use Case**: Exclude internal/sensitive fields from GraphQL API.

**JSON Schema**:

```json
{
  "type": "object",
  "x-graphql-type-name": "User",
  "properties": {
    "id": {
      "type": "string",
      "x-graphql-field-type": "ID"
    },
    "email": {
      "type": "string"
    },
    "password_hash": {
      "type": "string",
      "x-graphql-skip": true
    },
    "password_salt": {
      "type": "string",
      "x-graphql-skip": true
    },
    "internal_notes": {
      "type": "string",
      "x-graphql-skip": true
    }
  },
  "required": ["id", "email", "password_hash"]
}
```

**GraphQL Output**:

```graphql
type User {
  id: ID!
  email: String!
  # password_hash, password_salt, internal_notes excluded
}
```

**Best Practices**:

- Always skip password fields, tokens, and secrets
- Skip internal metadata fields
- Keep JSON Schema validation intact for backend use

---

### Pattern: Custom Scalar Types

**Use Case**: Use GraphQL custom scalars for formatted strings.

**JSON Schema**:

```json
{
  "type": "object",
  "x-graphql-type-name": "Event",
  "properties": {
    "id": {
      "type": "string",
      "x-graphql-field-type": "ID",
      "x-graphql-field-non-null": true
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "x-graphql-field-type": "DateTime",
      "x-graphql-field-non-null": true
    },
    "url": {
      "type": "string",
      "format": "uri",
      "x-graphql-field-type": "URL"
    },
    "email": {
      "type": "string",
      "format": "email",
      "x-graphql-field-type": "Email"
    },
    "metadata": {
      "type": "object",
      "x-graphql-field-type": "JSON"
    }
  }
}
```

**GraphQL Output**:

```graphql
type Event {
  id: ID!
  timestamp: DateTime!
  url: URL
  email: Email
  metadata: JSON
}
```

**Common Scalar Mappings**:

- `date-time` → `DateTime`
- `uri` → `URL`
- `email` → `Email`
- `uuid` → `UUID`
- `object` → `JSON`

---

## Type Patterns

### Pattern: Interface and Implementation

**Use Case**: Define shared fields across multiple types.

**JSON Schema**:

```json
{
  "definitions": {
    "Node": {
      "type": "object",
      "x-graphql-type-kind": "INTERFACE",
      "x-graphql-type-name": "Node",
      "x-graphql-description": "Entity with global unique identifier",
      "properties": {
        "id": {
          "type": "string",
          "x-graphql-field-type": "ID",
          "x-graphql-field-non-null": true
        }
      }
    },
    "Timestamped": {
      "type": "object",
      "x-graphql-type-kind": "INTERFACE",
      "x-graphql-type-name": "Timestamped",
      "properties": {
        "created_at": {
          "type": "string",
          "format": "date-time",
          "x-graphql-field-name": "createdAt",
          "x-graphql-field-type": "DateTime",
          "x-graphql-field-non-null": true
        },
        "updated_at": {
          "type": "string",
          "format": "date-time",
          "x-graphql-field-name": "updatedAt",
          "x-graphql-field-type": "DateTime"
        }
      }
    },
    "User": {
      "type": "object",
      "x-graphql-type-name": "User",
      "x-graphql-implements": ["Node", "Timestamped"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "created_at": { "type": "string", "format": "date-time" },
        "updated_at": { "type": "string", "format": "date-time" }
      }
    },
    "Product": {
      "type": "object",
      "x-graphql-type-name": "Product",
      "x-graphql-implements": ["Node", "Timestamped"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "price": { "type": "number" },
        "created_at": { "type": "string", "format": "date-time" },
        "updated_at": { "type": "string", "format": "date-time" }
      }
    }
  }
}
```

**GraphQL Output**:

```graphql
interface Node {
  id: ID!
}

interface Timestamped {
  createdAt: DateTime!
  updatedAt: DateTime
}

type User implements Node & Timestamped {
  id: ID!
  name: String
  createdAt: DateTime!
  updatedAt: DateTime
}

type Product implements Node & Timestamped {
  id: ID!
  name: String
  price: Float
  createdAt: DateTime!
  updatedAt: DateTime
}
```

**Best Practices**:

- Define common fields once in interfaces
- Ensure implementing types include all interface fields
- Use `Node` interface for relay-style pagination

---

### Pattern: Union Types for Polymorphic Results

**Use Case**: Search results that can return different entity types.

**JSON Schema**:

```json
{
  "definitions": {
    "User": {
      "type": "object",
      "x-graphql-type-name": "User",
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" }
      }
    },
    "Product": {
      "type": "object",
      "x-graphql-type-name": "Product",
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "price": { "type": "number" }
      }
    },
    "Post": {
      "type": "object",
      "x-graphql-type-name": "Post",
      "properties": {
        "id": { "type": "string" },
        "title": { "type": "string" }
      }
    },
    "SearchResult": {
      "x-graphql-type-kind": "UNION",
      "x-graphql-type-name": "SearchResult",
      "x-graphql-union-types": ["User", "Product", "Post"],
      "oneOf": [
        { "$ref": "#/definitions/User" },
        { "$ref": "#/definitions/Product" },
        { "$ref": "#/definitions/Post" }
      ]
    }
  }
}
```

**GraphQL Output**:

```graphql
union SearchResult = User | Product | Post

type Query {
  search(query: String!): [SearchResult!]!
}
```

**Best Practices**:

- Use `oneOf` in JSON Schema to match union semantics
- List all member types in `x-graphql-union-types`
- Consider using interfaces instead if types share common fields

---

### Pattern: Enum Types

**Use Case**: Define a fixed set of allowed values.

**JSON Schema**:

```json
{
  "definitions": {
    "UserRole": {
      "type": "string",
      "enum": ["ADMIN", "MODERATOR", "USER", "GUEST"],
      "x-graphql-type-name": "UserRole",
      "x-graphql-description": "User authorization level"
    },
    "OrderStatus": {
      "type": "string",
      "enum": ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"],
      "x-graphql-type-name": "OrderStatus"
    },
    "User": {
      "type": "object",
      "x-graphql-type-name": "User",
      "properties": {
        "id": { "type": "string" },
        "role": {
          "type": "string",
          "enum": ["ADMIN", "MODERATOR", "USER", "GUEST"],
          "x-graphql-field-type": "UserRole",
          "x-graphql-field-non-null": true
        }
      }
    }
  }
}
```

**GraphQL Output**:

```graphql
"""
User authorization level
"""
enum UserRole {
  ADMIN
  MODERATOR
  USER
  GUEST
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}

type User {
  id: String
  role: UserRole!
}
```

**Best Practices**:

- Use SCREAMING_SNAKE_CASE for enum values
- Define enums in `definitions` and reference with `$ref` or `x-graphql-field-type`
- Add descriptions to clarify enum purpose

---

## Field Patterns

### Pattern: Nullable vs Non-Null Fields

**Use Case**: Fine control over field nullability independent of JSON Schema.

**JSON Schema**:

```json
{
  "type": "object",
  "x-graphql-type-name": "User",
  "properties": {
    "id": {
      "type": "string",
      "x-graphql-field-type": "ID",
      "x-graphql-field-non-null": true
    },
    "email": {
      "type": "string",
      "x-graphql-field-non-null": true
    },
    "phone": {
      "type": "string"
    },
    "bio": {
      "type": "string",
      "x-graphql-nullable": true
    }
  },
  "required": ["id", "email", "bio"]
}
```

**GraphQL Output**:

```graphql
type User {
  id: ID!
  email: String!
  phone: String
  bio: String # nullable despite being in 'required'
}
```

**Decision Matrix**:
| Scenario | Use |
|----------|-----|
| Field always present | `x-graphql-field-non-null: true` |
| Field optional | Don't add to `required`, omit x-graphql-nullable |
| Required in JSON but optional in GraphQL | Add to `required`, set `x-graphql-nullable: true` |
| Override inferred nullability | Use explicit `x-graphql-field-non-null` or `x-graphql-nullable` |

---

### Pattern: List Fields with Non-Null Items

**Use Case**: Arrays that can be empty but never contain null items.

**JSON Schema**:

```json
{
  "type": "object",
  "x-graphql-type-name": "User",
  "properties": {
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "x-graphql-field-name": "tags",
      "x-graphql-field-list-item-non-null": true
    },
    "friend_ids": {
      "type": "array",
      "items": { "type": "string" },
      "x-graphql-field-name": "friendIds",
      "x-graphql-field-type": "[ID!]!",
      "x-graphql-field-non-null": true,
      "x-graphql-field-list-item-non-null": true
    }
  }
}
```

**GraphQL Output**:

```graphql
type User {
  tags: [String!] # nullable list, non-null items
  friendIds: [ID!]! # non-null list, non-null items
}
```

**List Nullability Combinations**:

- `[String]` - Nullable list, nullable items
- `[String!]` - Nullable list, non-null items
- `[String]!` - Non-null list, nullable items
- `[String!]!` - Non-null list, non-null items (most common)

---

### Pattern: Computed/Resolver Fields

**Use Case**: Fields resolved by server logic, not stored in database.

**JSON Schema**:

```json
{
  "type": "object",
  "x-graphql-type-name": "User",
  "properties": {
    "first_name": {
      "type": "string",
      "x-graphql-field-name": "firstName"
    },
    "last_name": {
      "type": "string",
      "x-graphql-field-name": "lastName"
    },
    "full_name": {
      "type": "string",
      "x-graphql-field-name": "fullName",
      "x-graphql-description": "Computed from firstName and lastName"
    },
    "age": {
      "type": "integer",
      "x-graphql-field-name": "age",
      "x-graphql-description": "Computed from birthDate"
    }
  }
}
```

**GraphQL Output**:

```graphql
type User {
  firstName: String
  lastName: String

  """
  Computed from firstName and lastName
  """
  fullName: String

  """
  Computed from birthDate
  """
  age: Int
}
```

**Note**: Computed fields appear in schema but resolvers provide values.

---

## Federation Patterns

### Pattern: Basic Entity with Key

**Use Case**: Define an entity resolvable by other subgraphs.

**JSON Schema**:

```json
{
  "type": "object",
  "x-graphql-type-name": "User",
  "x-graphql-federation-keys": "id",
  "properties": {
    "id": {
      "type": "string",
      "x-graphql-field-type": "ID",
      "x-graphql-field-non-null": true
    },
    "email": {
      "type": "string",
      "x-graphql-field-non-null": true
    },
    "name": {
      "type": "string"
    }
  }
}
```

**GraphQL Output**:

```graphql
type User @key(fields: "id") {
  id: ID!
  email: String!
  name: String
}
```

---

### Pattern: Multiple Entity Keys

**Use Case**: Entity resolvable by different fields in different contexts.

**JSON Schema**:

```json
{
  "type": "object",
  "x-graphql-type-name": "Product",
  "x-graphql-federation-keys": ["id", "sku", "upc"],
  "properties": {
    "id": {
      "type": "string",
      "x-graphql-field-type": "ID",
      "x-graphql-field-non-null": true
    },
    "sku": {
      "type": "string",
      "x-graphql-field-non-null": true
    },
    "upc": {
      "type": "string",
      "x-graphql-field-non-null": true
    },
    "name": {
      "type": "string"
    }
  }
}
```

**GraphQL Output**:

```graphql
type Product @key(fields: "id") @key(fields: "sku") @key(fields: "upc") {
  id: ID!
  sku: String!
  upc: String!
  name: String
}
```

---

### Pattern: Composite Key

**Use Case**: Entity identified by multiple fields together.

**JSON Schema**:

```json
{
  "type": "object",
  "x-graphql-type-name": "Membership",
  "x-graphql-federation-keys": "organizationId userId",
  "properties": {
    "organization_id": {
      "type": "string",
      "x-graphql-field-name": "organizationId",
      "x-graphql-field-type": "ID",
      "x-graphql-field-non-null": true
    },
    "user_id": {
      "type": "string",
      "x-graphql-field-name": "userId",
      "x-graphql-field-type": "ID",
      "x-graphql-field-non-null": true
    },
    "role": {
      "type": "string"
    }
  }
}
```

**GraphQL Output**:

```graphql
type Membership @key(fields: "organizationId userId") {
  organizationId: ID!
  userId: ID!
  role: String
}
```

---

### Pattern: Extending External Entity

**Use Case**: Add fields to an entity defined in another subgraph.

**JSON Schema (Subgraph A - defines User)**:

```json
{
  "type": "object",
  "x-graphql-type-name": "User",
  "x-graphql-federation-keys": "id",
  "properties": {
    "id": { "type": "string", "x-graphql-field-type": "ID" },
    "email": { "type": "string" }
  }
}
```

**JSON Schema (Subgraph B - extends User)**:

```json
{
  "type": "object",
  "x-graphql-type-name": "User",
  "x-graphql-federation-keys": "id",
  "properties": {
    "id": {
      "type": "string",
      "x-graphql-field-type": "ID",
      "x-graphql-federation-external": true
    },
    "orders": {
      "type": "array",
      "items": { "$ref": "#/definitions/Order" },
      "x-graphql-field-type": "[Order!]!"
    }
  }
}
```

**GraphQL Output (Subgraph B)**:

```graphql
extend type User @key(fields: "id") {
  id: ID! @external
  orders: [Order!]!
}
```

---

### Pattern: Field Dependencies with @requires

**Use Case**: Field needs data from another subgraph to resolve.

**JSON Schema**:

```json
{
  "type": "object",
  "x-graphql-type-name": "Product",
  "x-graphql-federation-keys": "id",
  "properties": {
    "id": { "type": "string", "x-graphql-field-type": "ID" },
    "weight": {
      "type": "number",
      "x-graphql-federation-external": true
    },
    "dimensions": {
      "type": "object",
      "x-graphql-federation-external": true
    },
    "shipping_estimate": {
      "type": "number",
      "x-graphql-field-name": "shippingEstimate",
      "x-graphql-field-type": "Float",
      "x-graphql-federation-requires": "weight dimensions"
    }
  }
}
```

**GraphQL Output**:

```graphql
type Product @key(fields: "id") {
  id: ID!
  weight: Float @external
  dimensions: Dimensions @external
  shippingEstimate: Float @requires(fields: "weight dimensions")
}
```

---

### Pattern: Field Providing Related Data with @provides

**Use Case**: Optimization - field returns entity with some of its fields already resolved.

**JSON Schema**:

```json
{
  "type": "object",
  "x-graphql-type-name": "Review",
  "properties": {
    "id": { "type": "string", "x-graphql-field-type": "ID" },
    "author": {
      "type": "string",
      "x-graphql-field-type": "User",
      "x-graphql-field-non-null": true,
      "x-graphql-federation-provides": "username email"
    },
    "product": {
      "type": "string",
      "x-graphql-field-type": "Product",
      "x-graphql-federation-provides": "name price"
    }
  }
}
```

**GraphQL Output**:

```graphql
type Review {
  id: ID
  author: User! @provides(fields: "username email")
  product: Product @provides(fields: "name price")
}
```

---

### Pattern: Shareable Type

**Use Case**: Type can be defined in multiple subgraphs (Federation v2).

**JSON Schema**:

```json
{
  "type": "object",
  "x-graphql-type-name": "Currency",
  "x-graphql-federation-shareable": true,
  "properties": {
    "code": {
      "type": "string",
      "x-graphql-field-non-null": true
    },
    "symbol": {
      "type": "string"
    }
  }
}
```

**GraphQL Output**:

```graphql
type Currency @shareable {
  code: String!
  symbol: String
}
```

**Use Cases**:

- Reference data (currencies, countries, etc.)
- Value objects shared across domains
- Types that don't change often

---

### Pattern: Field Override for Migration

**Use Case**: Migrate field ownership from one subgraph to another.

**JSON Schema (New Service)**:

```json
{
  "type": "object",
  "x-graphql-type-name": "Product",
  "x-graphql-federation-keys": "id",
  "properties": {
    "id": { "type": "string", "x-graphql-field-type": "ID" },
    "inventory_count": {
      "type": "integer",
      "x-graphql-field-name": "inventoryCount",
      "x-graphql-federation-override-from": "legacy-inventory-service"
    }
  }
}
```

**GraphQL Output**:

```graphql
type Product @key(fields: "id") {
  id: ID!
  inventoryCount: Int @override(from: "legacy-inventory-service")
}
```

**Migration Process**:

1. Deploy new service with @override
2. Route queries to new service
3. Deprecate old service
4. Remove @override after complete migration

---

## Advanced Patterns

### Pattern: Pagination with Relay Connection

**JSON Schema**:

```json
{
  "definitions": {
    "PageInfo": {
      "type": "object",
      "x-graphql-type-name": "PageInfo",
      "properties": {
        "has_next_page": {
          "type": "boolean",
          "x-graphql-field-name": "hasNextPage",
          "x-graphql-field-non-null": true
        },
        "has_previous_page": {
          "type": "boolean",
          "x-graphql-field-name": "hasPreviousPage",
          "x-graphql-field-non-null": true
        },
        "start_cursor": {
          "type": "string",
          "x-graphql-field-name": "startCursor"
        },
        "end_cursor": {
          "type": "string",
          "x-graphql-field-name": "endCursor"
        }
      }
    },
    "UserEdge": {
      "type": "object",
      "x-graphql-type-name": "UserEdge",
      "properties": {
        "cursor": {
          "type": "string",
          "x-graphql-field-non-null": true
        },
        "node": {
          "$ref": "#/definitions/User",
          "x-graphql-field-type": "User",
          "x-graphql-field-non-null": true
        }
      }
    },
    "UserConnection": {
      "type": "object",
      "x-graphql-type-name": "UserConnection",
      "properties": {
        "edges": {
          "type": "array",
          "items": { "$ref": "#/definitions/UserEdge" },
          "x-graphql-field-type": "[UserEdge!]!",
          "x-graphql-field-non-null": true
        },
        "page_info": {
          "$ref": "#/definitions/PageInfo",
          "x-graphql-field-name": "pageInfo",
          "x-graphql-field-type": "PageInfo",
          "x-graphql-field-non-null": true
        }
      }
    }
  }
}
```

**GraphQL Output**:

```graphql
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type UserEdge {
  cursor: String!
  node: User!
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
}
```

---

### Pattern: Input Types

**JSON Schema**:

```json
{
  "definitions": {
    "CreateUserInput": {
      "type": "object",
      "x-graphql-type-name": "CreateUserInput",
      "x-graphql-type-kind": "INPUT_OBJECT",
      "properties": {
        "email": {
          "type": "string",
          "format": "email",
          "x-graphql-field-non-null": true
        },
        "name": {
          "type": "string",
          "x-graphql-field-non-null": true
        },
        "role": {
          "type": "string",
          "enum": ["ADMIN", "USER"],
          "x-graphql-field-type": "UserRole"
        }
      },
      "required": ["email", "name"]
    }
  }
}
```

**GraphQL Output**:

```graphql
input CreateUserInput {
  email: String!
  name: String!
  role: UserRole
}
```

---

### Pattern: Recursive Types

**JSON Schema**:

```json
{
  "definitions": {
    "Comment": {
      "type": "object",
      "x-graphql-type-name": "Comment",
      "properties": {
        "id": {
          "type": "string",
          "x-graphql-field-type": "ID",
          "x-graphql-field-non-null": true
        },
        "text": {
          "type": "string",
          "x-graphql-field-non-null": true
        },
        "parent_id": {
          "type": "string",
          "x-graphql-field-name": "parent",
          "x-graphql-field-type": "Comment"
        },
        "replies": {
          "type": "array",
          "items": { "$ref": "#/definitions/Comment" },
          "x-graphql-field-type": "[Comment!]!"
        }
      }
    }
  }
}
```

**GraphQL Output**:

```graphql
type Comment {
  id: ID!
  text: String!
  parent: Comment
  replies: [Comment!]!
}
```

---

## Anti-Patterns

### ❌ Anti-Pattern: Over-Specifying Everything

**Bad**:

```json
{
  "properties": {
    "id": {
      "type": "string",
      "x-graphql-field-name": "id",
      "x-graphql-field-type": "String"
    }
  }
}
```

**Good** (let converter infer):

```json
{
  "properties": {
    "id": { "type": "string" }
  }
}
```

**Why**: Over-specification makes schemas verbose and harder to maintain. Use x-graphql attributes only when overriding default behavior.

---

### ❌ Anti-Pattern: Inconsistent Naming

**Bad**:

```json
{
  "properties": {
    "user_id": { "x-graphql-field-name": "userId" },
    "email_address": { "x-graphql-field-name": "email" },
    "created_at": {} // inconsistent - no rename
  }
}
```

**Good**:

```json
{
  "properties": {
    "user_id": { "x-graphql-field-name": "userId" },
    "email_address": { "x-graphql-field-name": "emailAddress" },
    "created_at": { "x-graphql-field-name": "createdAt" }
  }
}
```

**Why**: Be consistent - either rename all fields or none. Partial renaming creates confusion.

---

### ❌ Anti-Pattern: Ignoring JSON Schema Semantics

**Bad**:

```json
{
  "properties": {
    "id": {
      "type": "string",
      "x-graphql-field-type": "ID"
    }
  },
  "required": [] // ID not in required!
}
```

**Good**:

```json
{
  "properties": {
    "id": {
      "type": "string",
      "x-graphql-field-type": "ID",
      "x-graphql-field-non-null": true
    }
  },
  "required": ["id"]
}
```

**Why**: Maintain alignment between JSON Schema and GraphQL semantics. Both should reflect the same business rules.

---

### ❌ Anti-Pattern: Exposing Internal Structure

**Bad**:

```json
{
  "properties": {
    "password_hash": { "type": "string" },
    "password_salt": { "type": "string" },
    "internal_flags": { "type": "integer" }
  }
}
```

**Good**:

```json
{
  "properties": {
    "password_hash": {
      "type": "string",
      "x-graphql-skip": true
    },
    "password_salt": {
      "type": "string",
      "x-graphql-skip": true
    },
    "internal_flags": {
      "type": "integer",
      "x-graphql-skip": true
    }
  }
}
```

**Why**: Always hide sensitive and internal fields from public GraphQL API.

---

### ❌ Anti-Pattern: Mixing Concerns

**Bad**:

```json
{
  "x-graphql-type-name": "User",
  "x-database-table": "users",
  "x-rest-endpoint": "/api/users",
  "x-permissions": ["read:users"]
}
```

**Good**:

```json
{
  "x-graphql-type-name": "User",
  "description": "User account entity"
}
```

**Why**: Keep GraphQL-specific extensions separate from other concerns (database, REST, auth). Use separate schemas or layers for different concerns.

---

## See Also

- [Attribute Reference](ATTRIBUTE_REFERENCE.md) - Complete attribute catalog
- [Quick Start Guide](QUICK_START.md) - Get started quickly
- [Migration Guide](MIGRATION_GUIDE.md) - Migrate existing schemas
- [Implementation Plan](../plans/X-GRAPHQL-NAMESPACE-IMPLEMENTATION-PLAN.md) - Technical details

---

**Version**: 2.0.0  
**Last Updated**: January 2025  
**Status**: ✅ Complete
