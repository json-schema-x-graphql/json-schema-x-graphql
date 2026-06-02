# X-GraphQL Quick Start Guide

Get started with JSON Schema x GraphQL conversions in under 5 minutes.

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Common Patterns](#common-patterns)
- [CLI Tools](#cli-tools)
- [Next Steps](#next-steps)

## Installation

### Node.js

```bash
npm install json-schema-x-graphql
```

### Rust

```toml
[dependencies]
json-schema-x-graphql = "2.0.0"
```

### CLI Tools

```bash
# Install Rust CLI globally
cargo install json-schema-x-graphql --features cli

# Or use Node.js CLI via npx
npx json-schema-x-graphql --help
```

## Basic Usage

### 1. Simple Type Conversion

**JSON Schema → GraphQL**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "x-graphql-type-name": "User",
  "properties": {
    "id": {
      "type": "string",
      "x-graphql-field-type": "ID!"
    },
    "name": {
      "type": "string"
    },
    "email": {
      "type": "string",
      "format": "email"
    }
  },
  "required": ["id", "name"]
}
```

**Converts to:**

```graphql
type User {
  id: ID!
  name: String!
  email: String
}
```

### 2. Using the Converter (Node.js)

```javascript
import { Converter, ConversionDirection } from "json-schema-x-graphql";

const converter = new Converter();

// JSON Schema to GraphQL
const jsonSchema = `{
  "type": "object",
  "x-graphql-type-name": "Product",
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" }
  }
}`;

const graphql = converter.convert(
  jsonSchema,
  ConversionDirection.JsonSchemaToGraphQL,
);

console.log(graphql);
// Output:
// type Product {
//   id: String
//   name: String
// }
```

### 3. Using the Converter (Rust)

```rust
use json_schema_x_graphql::{Converter, ConversionDirection};

fn main() {
    let converter = Converter::new();

    let json_schema = r#"{
        "type": "object",
        "x-graphql-type-name": "Product",
        "properties": {
            "id": { "type": "string" },
            "name": { "type": "string" }
        }
    }"#;

    let graphql = converter
        .convert(json_schema, ConversionDirection::JsonSchemaToGraphQL)
        .unwrap();

    println!("{}", graphql);
}
```

## Common Patterns

### Non-Null Fields

Make a field required in GraphQL:

```json
{
  "properties": {
    "id": {
      "type": "string",
      "x-graphql-field-non-null": true
    }
  }
}
```

```graphql
type MyType {
  id: String!
}
```

### Arrays and Lists

Define list types:

```json
{
  "properties": {
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "x-graphql-field-type": "[String!]!"
    }
  }
}
```

```graphql
type MyType {
  tags: [String!]!
}
```

### Custom Field Names

Override default field name conversion:

```json
{
  "properties": {
    "user_id": {
      "type": "string",
      "x-graphql-field-name": "userId"
    }
  }
}
```

```graphql
type MyType {
  userId: String
}
```

### Interfaces

Define GraphQL interfaces:

```json
{
  "type": "object",
  "x-graphql-type-name": "Node",
  "x-graphql-type-kind": "INTERFACE",
  "properties": {
    "id": {
      "type": "string",
      "x-graphql-field-type": "ID!"
    }
  }
}
```

```graphql
interface Node {
  id: ID!
}
```

### Implementing Interfaces

```json
{
  "type": "object",
  "x-graphql-type-name": "User",
  "x-graphql-implements": ["Node"],
  "properties": {
    "id": {
      "type": "string",
      "x-graphql-field-type": "ID!"
    },
    "name": {
      "type": "string"
    }
  }
}
```

```graphql
type User implements Node {
  id: ID!
  name: String
}
```

### Unions

Define union types:

```json
{
  "oneOf": [{ "$ref": "#/definitions/User" }, { "$ref": "#/definitions/Post" }],
  "x-graphql-type-name": "SearchResult",
  "x-graphql-type-kind": "UNION",
  "x-graphql-union-types": ["User", "Post"]
}
```

```graphql
union SearchResult = User | Post
```

### Apollo Federation

Add federation directives:

```json
{
  "type": "object",
  "x-graphql-type-name": "User",
  "x-graphql-federation-keys": ["id"],
  "properties": {
    "id": {
      "type": "string",
      "x-graphql-field-type": "ID!"
    },
    "email": {
      "type": "string",
      "x-graphql-federation-shareable": true
    }
  }
}
```

```graphql
type User @key(fields: "id") {
  id: ID!
  email: String @shareable
}
```

## CLI Tools

### Validate Schemas

```bash
# Validate JSON Schema files
jxql validate json-schema path/to/schema.json

# Validate GraphQL SDL files
jxql validate graphql path/to/schema.graphql

# Recursive validation
jxql validate json-schema ./schemas -r

# Strict mode with detailed output
jxql validate json-schema schema.json -s --format json
```

### Convert Files

```bash
# Convert JSON Schema to GraphQL
jxql convert -i schema.json -o schema.graphql

# Convert GraphQL to JSON Schema
jxql convert -i schema.graphql -o schema.json --direction graphql-to-json

# Batch conversion
jxql convert -i ./schemas -o ./output -r
```

### Run Benchmarks

```bash
# Node.js
npm run benchmark

# Rust
cargo bench
```

## Next Steps

### Learn More

- **[Attribute Reference](./ATTRIBUTE_REFERENCE.md)** - Complete list of all x-graphql attributes
- **[Common Patterns](./COMMON_PATTERNS.md)** - Real-world examples and best practices
- **[Migration Guide](./MIGRATION_GUIDE.md)** - Upgrading from v1.x to v2.0

### Advanced Topics

1. **Federation Setup**
   - Learn how to use Apollo Federation v2 directives
   - See [Common Patterns - Federation](./COMMON_PATTERNS.md#federation-patterns)

2. **Performance Optimization**
   - Enable caching for better performance
   - Configure validation options
   - See benchmark results in CI

3. **Custom Type Mappings**
   - Override default type conversions
   - Add custom scalar types
   - Configure naming conventions

### Examples

Check out the complete examples in:

- `converters/test-data/x-graphql/` - Test schemas with all features
- `converters/test-data/x-graphql/expected/` - Expected GraphQL outputs

### Get Help

- **Issues**: [GitHub Issues](https://github.com/JJediny/json-schema-x-graphql/issues)
- **Discussions**: [GitHub Discussions](https://github.com/JJediny/json-schema-x-graphql/discussions)
- **Documentation**: Full docs at `/docs/x-graphql/`

## Tips and Best Practices

### 1. Use Descriptive Type Names

```json
{
  "x-graphql-type-name": "UserProfile" // ✅ Clear and specific
}
```

```json
{
  "x-graphql-type-name": "Users" // ⚠️ Avoid plurals
}
```

### 2. Leverage Validation

Always validate your schemas before deployment:

```bash
jxql validate json-schema schema.json
```

### 3. Test Round-Trip Conversions

Ensure your schema survives round-trip conversion:

```javascript
const original = readJsonSchema("schema.json");
const graphql = converter.convert(original, "json-to-graphql");
const backToJson = converter.convert(graphql, "graphql-to-json");
// Verify: original ≈ backToJson
```

### 4. Use Strict Mode for Critical Schemas

```javascript
const converter = new Converter({
  validate: true,
  strict: true,
});
```

### 5. Follow GraphQL Naming Conventions

- **Types**: PascalCase (e.g., `UserProfile`)
- **Fields**: camelCase (e.g., `userId`, `firstName`)
- **Enums**: SCREAMING_SNAKE_CASE (e.g., `USER_ROLE`)

## Quick Reference Card

| JSON Schema Type    | GraphQL Type | Non-Null                             |
| ------------------- | ------------ | ------------------------------------ |
| `"type": "string"`  | `String`     | Add `x-graphql-field-non-null: true` |
| `"type": "integer"` | `Int`        | or use `required` array              |
| `"type": "number"`  | `Float`      |                                      |
| `"type": "boolean"` | `Boolean`    |                                      |
| `"type": "array"`   | `[Type]`     | Use `x-graphql-field-type`           |
| `"type": "object"`  | Custom Type  | Define with `x-graphql-type-name`    |

| X-GraphQL Extension              | Purpose                                                |
| -------------------------------- | ------------------------------------------------------ |
| `x-graphql-type-name`            | Set GraphQL type name                                  |
| `x-graphql-type-kind`            | `OBJECT`, `INTERFACE`, `UNION`, `INPUT_OBJECT`, `ENUM` |
| `x-graphql-field-name`           | Override field name                                    |
| `x-graphql-field-type`           | Explicit GraphQL type                                  |
| `x-graphql-field-non-null`       | Make field required                                    |
| `x-graphql-implements`           | Implement interfaces                                   |
| `x-graphql-union-types`          | Union member types                                     |
| `x-graphql-federation-keys`      | Federation @key fields                                 |
| `x-graphql-federation-shareable` | Mark as @shareable                                     |
| `x-graphql-skip`                 | Exclude from GraphQL                                   |

---

**Ready to start?** Pick a use case above and try it out! For more details, see the [complete documentation](./README.md).
