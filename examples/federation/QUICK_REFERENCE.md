# Apollo Federation Quick Reference - X-GraphQL Extensions

## Quick Directive Mapping

| GraphQL Federation              | JSON Schema X-GraphQL Extension                             |
| ------------------------------- | ----------------------------------------------------------- |
| `@key(fields: "id")`            | `"x-graphql-federation": { "keys": [{ "fields": "id" }] }`  |
| `@external`                     | `"x-graphql-federation": { "external": true }`              |
| `@provides(fields: "username")` | `"x-graphql-federation": { "provides": "username" }`        |
| `@requires(fields: "email")`    | `"x-graphql-federation": { "requires": "email" }`           |
| `extend type User`              | `"x-graphql-federation": { "extends": true }`               |
| `@shareable`                    | `"x-graphql-federation": { "shareable": true }`             |
| `@override(from: "old")`        | `"x-graphql-federation": { "override": { "from": "old" } }` |

## Common Patterns

### 1. Simple Entity with Key

**GraphQL SDL:**

```graphql
type User @key(fields: "id") {
  id: ID!
  name: String
}
```

**JSON Schema:**

```json
{
  "User": {
    "type": "object",
    "x-graphql-type-name": "User",
    "x-graphql-federation": {
      "keys": [{ "fields": "id" }]
    },
    "properties": {
      "id": {
        "type": "string",
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      },
      "name": {
        "type": "string",
        "x-graphql-field-name": "name"
      }
    },
    "required": ["id"]
  }
}
```

### 2. Entity Extension with External Field

**GraphQL SDL:**

```graphql
type User @key(fields: "id") {
  id: ID! @external
  reviews: [Review]
}
```

**JSON Schema:**

```json
{
  "UserExtension": {
    "type": "object",
    "x-graphql-type-name": "User",
    "x-graphql-federation": {
      "extends": true,
      "keys": [{ "fields": "id" }]
    },
    "properties": {
      "id": {
        "type": "string",
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true,
        "x-graphql-federation": {
          "external": true
        }
      },
      "reviews": {
        "type": "array",
        "x-graphql-field-type": "[Review]"
      }
    },
    "required": ["id"]
  }
}
```

### 3. Field with @provides

**GraphQL SDL:**

```graphql
type Review {
  author: User @provides(fields: "username")
}
```

**JSON Schema:**

```json
{
  "Review": {
    "properties": {
      "author": {
        "type": "object",
        "x-graphql-field-type": "User",
        "x-graphql-federation": {
          "provides": "username"
        }
      }
    }
  }
}
```

### 4. Field with @requires

**GraphQL SDL:**

```graphql
type User {
  firstName: String
  lastName: String
  fullName: String @requires(fields: "firstName lastName")
}
```

**JSON Schema:**

```json
{
  "User": {
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
        "x-graphql-federation": {
          "requires": "firstName lastName"
        }
      }
    }
  }
}
```

### 5. Composite Key

**GraphQL SDL:**

```graphql
type Product @key(fields: "sku storeId") {
  sku: String!
  storeId: ID!
  name: String
}
```

**JSON Schema:**

```json
{
  "Product": {
    "type": "object",
    "x-graphql-type-name": "Product",
    "x-graphql-federation": {
      "keys": [{ "fields": "sku storeId" }]
    },
    "properties": {
      "sku": {
        "type": "string",
        "x-graphql-field-name": "sku",
        "x-graphql-field-non-null": true
      },
      "store_id": {
        "type": "string",
        "x-graphql-field-name": "storeId",
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      },
      "name": {
        "type": "string"
      }
    },
    "required": ["sku", "store_id"]
  }
}
```

### 6. Multiple Keys

**GraphQL SDL:**

```graphql
type User @key(fields: "id") @key(fields: "email") {
  id: ID!
  email: String!
  name: String
}
```

**JSON Schema:**

```json
{
  "User": {
    "type": "object",
    "x-graphql-type-name": "User",
    "x-graphql-federation": {
      "keys": [{ "fields": "id" }, { "fields": "email" }]
    },
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
    },
    "required": ["id", "email"]
  }
}
```

### 7. Shareable Field

**GraphQL SDL:**

```graphql
type Product @key(fields: "id") {
  id: ID!
  name: String @shareable
}
```

**JSON Schema:**

```json
{
  "Product": {
    "type": "object",
    "x-graphql-type-name": "Product",
    "x-graphql-federation": {
      "keys": [{ "fields": "id" }]
    },
    "properties": {
      "id": {
        "type": "string",
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      },
      "name": {
        "type": "string",
        "x-graphql-federation": {
          "shareable": true
        }
      }
    },
    "required": ["id"]
  }
}
```

### 8. Override Field

**GraphQL SDL:**

```graphql
type Product @key(fields: "id") {
  id: ID!
  price: Float @override(from: "legacy-service")
}
```

**JSON Schema:**

```json
{
  "Product": {
    "type": "object",
    "x-graphql-type-name": "Product",
    "x-graphql-federation": {
      "keys": [{ "fields": "id" }]
    },
    "properties": {
      "id": {
        "type": "string",
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      },
      "price": {
        "type": "number",
        "x-graphql-field-type": "Float",
        "x-graphql-federation": {
          "override": {
            "from": "legacy-service"
          }
        }
      }
    },
    "required": ["id"]
  }
}
```

## Testing Your Schema

### Convert to SDL

```bash
# Node.js
node converters/node/dist/cli.js --input your-schema.json

# Rust
./converters/rust/target/release/jxql --input your-schema.json
```

### Validate with Rover

```bash
# Check single subgraph
rover subgraph check --schema output.graphql --name your-service

# Compose supergraph
rover supergraph compose --config supergraph.yaml
```

## Examples Directory

- `examples/federation/sdl/apollo-classic/` - Reference SDL files
- `examples/federation/json-schemas/apollo-classic/` - JSON Schema sources
- `examples/federation/README.md` - Complete guide with all patterns

## Common Mistakes

❌ **Forgetting to mark extended type:**

```json
{
  "User": {
    "x-graphql-federation": {
      "keys": [{ "fields": "id" }]
      // Missing "extends": true
    }
  }
}
```

❌ **Forgetting @external on key field:**

```json
{
  "id": {
    // Missing "external": true for extended entity
  }
}
```

❌ **Wrong key field in extension:**

```json
{
  "UserExtension": {
    "x-graphql-federation": {
      "keys": [{ "fields": "email" }] // Should match original key
    }
  }
}
```

✅ **Correct patterns:**

- Always use `"extends": true` when extending types
- Mark key fields as `"external": true` in extensions
- Match the exact key fields from the original entity

## Resources

- Full Guide: `examples/federation/README.md`
- Implementation Plan: `docs/FEDERATION_EXAMPLES_PLAN.md`
- Test Script: `scripts/test-federation-examples.sh`
- Apollo Docs: https://www.apollographql.com/docs/federation/
