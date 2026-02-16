# CLI Wrapper Guide - X-GraphQL Converters

**Version:** 2.0.0  
**Last Updated:** 2024  
**Status:** Production Ready

---

## Overview

This guide covers the CLI wrappers for both the Node.js and Rust converters, providing a unified interface for JSON Schema ↔ GraphQL SDL conversion with full x-graphql extension support.

---

## Table of Contents

1. [Installation](#installation)
2. [Node.js CLI](#nodejs-cli)
3. [Rust CLI](#rust-cli)
4. [Common Usage Patterns](#common-usage-patterns)
5. [X-GraphQL Attributes](#x-graphql-attributes)
6. [Advanced Features](#advanced-features)
7. [Examples](#examples)
8. [Troubleshooting](#troubleshooting)
9. [Performance Comparison](#performance-comparison)

---

## Installation

### Node.js Converter

```bash
# Install globally
npm install -g @json-schema-x-graphql/core

# Or use locally
cd converters/node
npm install
npm run build

# Run with npx
npx json-schema-x-graphql --help
```

### Rust Converter

```bash
# Build from source
cd converters/rust
cargo build --release

# The binary will be at: target/release/jxql

# Optional: Install globally
cargo install --path .
```

---

## Node.js CLI

### Command: `json-schema-x-graphql`

**Location:** `converters/node/dist/cli.js`

### Basic Syntax

```bash
json-schema-x-graphql [OPTIONS] --input <FILE>
```

### Options

| Option                            | Type     | Default           | Description                                                 |
| --------------------------------- | -------- | ----------------- | ----------------------------------------------------------- |
| `-i, --input`                     | string   | required          | Path to JSON Schema file                                    |
| `-o, --output`                    | string   | stdout            | Output file path                                            |
| `--descriptions`                  | boolean  | true              | Include descriptions in output                              |
| `--preserve-order`                | boolean  | true              | Preserve field order from schema                            |
| `--include-federation-directives` | boolean  | true              | Emit federation directives                                  |
| `--federation-version`            | enum     | V2                | Federation version (NONE, V1, V2, AUTO)                     |
| `--naming-convention`             | enum     | GRAPHQL_IDIOMATIC | Naming strategy (PRESERVE, GRAPHQL_IDIOMATIC)               |
| `--infer-ids`                     | boolean  | false             | Infer ID scalars (deprecated, use --id-strategy)            |
| `--id-strategy`                   | enum     | NONE              | ID inference (NONE, COMMON_PATTERNS, ALL_STRINGS)           |
| `--output-format`                 | enum     | SDL               | Output format (SDL, SDL_WITH_FEDERATION_METADATA, AST_JSON) |
| `--fail-on-warning`               | boolean  | false             | Treat warnings as errors                                    |
| `--exclude-type`                  | string[] | []                | Exclude specific types (repeatable)                         |
| `--exclude-pattern`               | string[] | []                | Exclude by regex pattern (repeatable)                       |
| `-h, --help`                      | -        | -                 | Show help message                                           |
| `-v, --version`                   | -        | -                 | Show version                                                |

### Examples

```bash
# Basic conversion
json-schema-x-graphql --input schema.json

# Save to file
json-schema-x-graphql --input schema.json --output schema.graphql

# Without descriptions
json-schema-x-graphql --input schema.json --descriptions=false

# Federation v1
json-schema-x-graphql --input schema.json --federation-version=V1

# Infer IDs for common patterns
json-schema-x-graphql --input schema.json --id-strategy=COMMON_PATTERNS

# Exclude types
json-schema-x-graphql --input schema.json \
  --exclude-type Query \
  --exclude-type Mutation

# JSON output format
json-schema-x-graphql --input schema.json \
  --output-format=AST_JSON \
  --output schema.json
```

---

## Rust CLI

### Command: `jxql`

**Location:** `converters/rust/target/release/jxql`

### Basic Syntax

```bash
jxql [OPTIONS] --input <FILE>
```

### Options

| Option                 | Type   | Default           | Description                         |
| ---------------------- | ------ | ----------------- | ----------------------------------- |
| `-i, --input`          | string | required          | Path to JSON Schema file or URL     |
| `-o, --output`         | path   | stdout            | Output file path                    |
| `--infer-ids`          | flag   | false             | Infer ID scalar from id/\_id fields |
| `--no-validate`        | flag   | false             | Disable schema validation           |
| `--descriptions`       | flag   | true              | Include descriptions in output      |
| `--preserve-order`     | flag   | true              | Preserve field order                |
| `--federation-version` | u8     | 2                 | Federation version (1 or 2)         |
| `--naming-convention`  | string | GRAPHQL_IDIOMATIC | Naming convention                   |
| `--id-strategy`        | string | NONE              | ID inference strategy               |
| `--output-format`      | string | SDL               | Output format                       |
| `--fail-on-warning`    | flag   | false             | Treat warnings as errors            |
| `--exclude-types`      | list   | []                | Types to exclude (comma-separated)  |
| `--exclude-patterns`   | list   | []                | Regex patterns (comma-separated)    |

### Examples

```bash
# Basic conversion
jxql --input schema.json

# Save to file
jxql --input schema.json --output schema.graphql

# Fetch from URL
jxql --input https://example.com/schema.json

# Without validation
jxql --input schema.json --no-validate

# Exclude types
jxql --input schema.json --exclude-types Query,Mutation

# ID inference
jxql --input schema.json --id-strategy COMMON_PATTERNS
```

---

## Common Usage Patterns

### 1. Basic Schema Conversion

**Scenario:** Convert a simple JSON Schema to GraphQL SDL

```bash
# Node.js
json-schema-x-graphql --input user-schema.json --output user.graphql

# Rust
jxql --input user-schema.json --output user.graphql
```

**Input:** `user-schema.json`

```json
{
  "title": "User",
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "email": { "type": "string" }
  },
  "required": ["id", "name"]
}
```

**Output:** `user.graphql`

```graphql
type User {
  id: ID!
  name: String!
  email: String
}
```

---

### 2. Interface Generation

**Scenario:** Generate GraphQL interfaces from JSON Schema

```bash
json-schema-x-graphql --input interfaces.json --output interfaces.graphql
```

**Input:** `interfaces.json`

```json
{
  "definitions": {
    "Node": {
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
      "x-graphql-implements": ["Node"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" }
      },
      "required": ["id", "name"]
    }
  }
}
```

**Output:** `interfaces.graphql`

```graphql
interface Node {
  id: ID!
}

type User implements Node {
  id: ID!
  name: String!
}
```

---

### 3. Federation Schema

**Scenario:** Generate a federated GraphQL schema with entity keys

```bash
json-schema-x-graphql --input product-schema.json \
  --federation-version=V2 \
  --output product.graphql
```

**Input:** `product-schema.json`

```json
{
  "definitions": {
    "Product": {
      "x-graphql-federation-keys": [{ "fields": "id" }],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "price": { "type": "number" }
      },
      "required": ["id", "name", "price"]
    }
  }
}
```

**Output:** `product.graphql`

```graphql
type Product @key(fields: "id") {
  id: ID!
  name: String!
  price: Float!
}
```

---

### 4. Custom Scalars

**Scenario:** Use custom scalar types for fields

```bash
json-schema-x-graphql --input contact-schema.json --output contact.graphql
```

**Input:** `contact-schema.json`

```json
{
  "definitions": {
    "Contact": {
      "properties": {
        "email": {
          "type": "string",
          "x-graphql-field-type": "Email"
        },
        "website": {
          "type": "string",
          "x-graphql-field-type": "URL"
        },
        "createdAt": {
          "type": "string",
          "x-graphql-field-type": "DateTime"
        }
      }
    }
  }
}
```

**Output:** `contact.graphql`

```graphql
type Contact {
  email: Email!
  website: URL!
  createdAt: DateTime!
}
```

---

### 5. Skipping Fields and Types

**Scenario:** Exclude sensitive or internal fields from GraphQL schema

```bash
json-schema-x-graphql --input user-schema.json --output user.graphql
```

**Input:** `user-schema.json`

```json
{
  "definitions": {
    "User": {
      "properties": {
        "id": { "type": "string" },
        "username": { "type": "string" },
        "password_hash": {
          "type": "string",
          "x-graphql-skip": true
        }
      }
    },
    "InternalMetadata": {
      "x-graphql-skip": true,
      "properties": {
        "internalId": { "type": "string" }
      }
    }
  }
}
```

**Output:** `user.graphql`

```graphql
type User {
  id: ID!
  username: String!
  # password_hash is excluded
}
# InternalMetadata is excluded
```

---

### 6. Nullability Control

**Scenario:** Override nullability for specific fields

```bash
json-schema-x-graphql --input schema.json --output schema.graphql
```

**Input:** `schema.json`

```json
{
  "definitions": {
    "User": {
      "properties": {
        "id": { "type": "string" },
        "email": {
          "type": "string",
          "x-graphql-nullable": true
        },
        "role": {
          "type": "string",
          "x-graphql-field-non-null": true
        }
      },
      "required": ["id", "email"]
    }
  }
}
```

**Output:** `schema.graphql`

```graphql
type User {
  id: ID!
  email: String # nullable despite being in required
  role: String! # non-null despite not being in required
}
```

---

### 7. Array Non-Null Items

**Scenario:** Specify non-null items in arrays

```bash
json-schema-x-graphql --input schema.json --output schema.graphql
```

**Input:** `schema.json`

```json
{
  "definitions": {
    "User": {
      "properties": {
        "tags": {
          "type": "array",
          "items": { "type": "string" },
          "x-graphql-field-list-item-non-null": true
        }
      }
    }
  }
}
```

**Output:** `schema.graphql`

```graphql
type User {
  tags: [String!]! # Array of non-null strings
}
```

---

### 8. Union Types

**Scenario:** Create GraphQL unions from oneOf schemas

```bash
json-schema-x-graphql --input schema.json --output schema.graphql
```

**Input:** `schema.json`

```json
{
  "definitions": {
    "SearchResult": {
      "oneOf": [
        { "$ref": "#/definitions/User" },
        { "$ref": "#/definitions/Product" }
      ]
    },
    "User": {
      "properties": {
        "name": { "type": "string" }
      }
    },
    "Product": {
      "properties": {
        "title": { "type": "string" }
      }
    }
  }
}
```

**Output:** `schema.graphql`

```graphql
union SearchResult = User | Product

type User {
  name: String!
}

type Product {
  title: String!
}
```

---

## X-GraphQL Attributes

### Type-Level Attributes

| Attribute               | Type     | Description                                        | Example                                      |
| ----------------------- | -------- | -------------------------------------------------- | -------------------------------------------- |
| `x-graphql-type-name`   | string   | Custom type name                                   | `"x-graphql-type-name": "UserAccount"`       |
| `x-graphql-type-kind`   | enum     | Type kind (INTERFACE, OBJECT, UNION, INPUT_OBJECT) | `"x-graphql-type-kind": "INTERFACE"`         |
| `x-graphql-implements`  | string[] | Interface implementations                          | `"x-graphql-implements": ["Node"]`           |
| `x-graphql-union-types` | string[] | Union member types                                 | `"x-graphql-union-types": ["User", "Admin"]` |
| `x-graphql-skip`        | boolean  | Exclude type from output                           | `"x-graphql-skip": true`                     |

### Field-Level Attributes

| Attribute                            | Type    | Description               | Example                                      |
| ------------------------------------ | ------- | ------------------------- | -------------------------------------------- |
| `x-graphql-field-name`               | string  | Custom field name         | `"x-graphql-field-name": "userId"`           |
| `x-graphql-field-type`               | string  | Custom field type         | `"x-graphql-field-type": "Email"`            |
| `x-graphql-field-non-null`           | boolean | Force non-null            | `"x-graphql-field-non-null": true`           |
| `x-graphql-nullable`                 | boolean | Force nullable            | `"x-graphql-nullable": true`                 |
| `x-graphql-field-list-item-non-null` | boolean | Non-null array items      | `"x-graphql-field-list-item-non-null": true` |
| `x-graphql-skip`                     | boolean | Exclude field from output | `"x-graphql-skip": true`                     |

### Federation Attributes

| Attribute                            | Type    | Description     | Example                                             |
| ------------------------------------ | ------- | --------------- | --------------------------------------------------- |
| `x-graphql-federation-keys`          | array   | Entity keys     | `"x-graphql-federation-keys": [{"fields": "id"}]`   |
| `x-graphql-federation-shareable`     | boolean | Shareable type  | `"x-graphql-federation-shareable": true`            |
| `x-graphql-federation-external`      | boolean | External field  | `"x-graphql-federation-external": true`             |
| `x-graphql-federation-requires`      | string  | Required fields | `"x-graphql-federation-requires": "email username"` |
| `x-graphql-federation-provides`      | string  | Provided fields | `"x-graphql-federation-provides": "name email"`     |
| `x-graphql-federation-override-from` | string  | Override source | `"x-graphql-federation-override-from": "users"`     |

---

## Advanced Features

### 1. Batch Processing

Process multiple schemas at once:

```bash
# Node.js (shell loop)
for schema in schemas/*.json; do
  json-schema-x-graphql --input "$schema" --output "${schema%.json}.graphql"
done

# Rust (shell loop)
for schema in schemas/*.json; do
  jxql --input "$schema" --output "${schema%.json}.graphql"
done
```

### 2. Remote Schemas

Fetch and convert schemas from URLs (Rust only):

```bash
jxql --input https://example.com/api/schema.json --output schema.graphql
```

### 3. Output to stdout for Piping

```bash
# Generate SDL and validate with external tool
json-schema-x-graphql --input schema.json | graphql-inspector validate

# Combine with other tools
jxql --input schema.json | prettier --parser graphql
```

### 4. Validation Mode

```bash
# Node.js (validation is on by default)
json-schema-x-graphql --input schema.json --fail-on-warning

# Rust (skip validation for speed)
jxql --input schema.json --no-validate
```

### 5. Different Output Formats

```bash
# SDL with metadata
json-schema-x-graphql --input schema.json \
  --output-format=SDL_WITH_FEDERATION_METADATA

# AST JSON
json-schema-x-graphql --input schema.json \
  --output-format=AST_JSON \
  --output schema-ast.json
```

---

## Examples

### Complete E-commerce Schema

**Command:**

```bash
json-schema-x-graphql --input ecommerce.json \
  --federation-version=V2 \
  --id-strategy=COMMON_PATTERNS \
  --output ecommerce.graphql
```

**Input:** `ecommerce.json`

```json
{
  "definitions": {
    "Node": {
      "x-graphql-type-kind": "INTERFACE",
      "properties": {
        "id": { "type": "string" }
      }
    },
    "Product": {
      "x-graphql-implements": ["Node"],
      "x-graphql-federation-keys": [{ "fields": "id" }],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "price": { "type": "number" },
        "inStock": { "type": "boolean" },
        "seller": {
          "x-graphql-field-type": "User",
          "x-graphql-federation-provides": "email username"
        }
      },
      "required": ["id", "name", "price"]
    },
    "User": {
      "x-graphql-implements": ["Node"],
      "x-graphql-federation-keys": [{ "fields": "id" }],
      "properties": {
        "id": { "type": "string" },
        "username": { "type": "string" },
        "email": {
          "type": "string",
          "x-graphql-field-type": "Email"
        },
        "password_hash": {
          "type": "string",
          "x-graphql-skip": true
        }
      },
      "required": ["id", "username", "email"]
    }
  }
}
```

**Output:** `ecommerce.graphql`

```graphql
interface Node {
  id: ID!
}

type Product implements Node @key(fields: "id") {
  id: ID!
  name: String!
  price: Float!
  inStock: Boolean!
  seller: User! @provides(fields: "email username")
}

type User implements Node @key(fields: "id") {
  id: ID!
  username: String!
  email: Email!
}
```

---

## Troubleshooting

### Common Issues

#### 1. Module Not Found (Node.js)

**Error:**

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
```

**Solution:**

```bash
cd converters/node
npm run build
```

#### 2. Rust Binary Not Found

**Error:**

```
jxql: command not found
```

**Solution:**

```bash
cd converters/rust
cargo build --release
# Use full path: ./target/release/jxql
```

#### 3. Invalid Schema

**Error:**

```
Error: Invalid JSON Schema
```

**Solution:**

- Validate your JSON Schema with a validator
- Check for missing required fields
- Ensure proper JSON syntax

#### 4. Conversion Failures

**Error:**

```
Conversion failed: ...
```

**Solution:**

- Enable validation: remove `--no-validate` flag
- Check x-graphql attribute syntax
- Verify all referenced types exist

### Debug Mode

```bash
# Node.js - set verbose mode
VERBOSE=1 json-schema-x-graphql --input schema.json

# Rust - use debug build for better error messages
cd converters/rust
cargo build --bin jxql
./target/debug/jxql --input schema.json
```

---

## Performance Comparison

### Benchmark Results

Based on testing with 8 test schemas, 10 iterations each:

| Converter   | Total Time | Avg per Schema | Relative Speed  |
| ----------- | ---------- | -------------- | --------------- |
| **Node.js** | ~250ms     | 25ms           | 1.0x (baseline) |
| **Rust**    | ~50ms      | 5ms            | ~5x faster      |

### When to Use Each

**Use Node.js when:**

- You're already in a Node.js environment
- You need npm integration
- Quick setup is important
- Working with small schemas (<100 types)

**Use Rust when:**

- Performance is critical
- Processing large schemas (>100 types)
- Batch processing multiple schemas
- Production deployment with high throughput

---

## Integration Examples

### npm Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "generate:schema": "json-schema-x-graphql --input schema.json --output schema.graphql",
    "generate:fed": "json-schema-x-graphql --input schema.json --federation-version=V2 --output federated.graphql",
    "validate:schema": "json-schema-x-graphql --input schema.json --fail-on-warning"
  }
}
```

### Makefile

```makefile
.PHONY: generate-schemas

generate-schemas:
	@for schema in schemas/*.json; do \
		jxql --input $$schema --output $${schema%.json}.graphql; \
	done

validate-schemas:
	@for schema in schemas/*.json; do \
		json-schema-x-graphql --input $$schema --fail-on-warning; \
	done
```

### CI/CD (GitHub Actions)

```yaml
name: Generate GraphQL Schemas

on: [push]

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install converter
        run: npm install -g @json-schema-x-graphql/core
      - name: Generate schemas
        run: |
          for schema in schemas/*.json; do
            json-schema-x-graphql --input $schema --output ${schema%.json}.graphql
          done
      - name: Commit generated files
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add schemas/*.graphql
          git commit -m "Generated GraphQL schemas" || true
          git push
```

---

## Best Practices

### 1. Version Control

✅ **Do:**

- Commit both JSON Schema and generated GraphQL SDL
- Use consistent converter options across team
- Document converter version in README

❌ **Don't:**

- Manually edit generated GraphQL files
- Mix converter versions in same project

### 2. Schema Organization

✅ **Do:**

```
project/
├── schemas/
│   ├── user.json
│   ├── product.json
│   └── order.json
├── graphql/
│   ├── user.graphql
│   ├── product.graphql
│   └── order.graphql
└── scripts/
    └── generate-schemas.sh
```

### 3. X-GraphQL Attributes

✅ **Do:**

- Use type-kind for interfaces: `"x-graphql-type-kind": "INTERFACE"`
- Skip sensitive fields: `"x-graphql-skip": true`
- Use field-type for custom scalars: `"x-graphql-field-type": "Email"`

❌ **Don't:**

- Mix old and new attribute formats
- Forget to validate schemas after adding attributes

### 4. Federation

✅ **Do:**

- Always specify entity keys: `"x-graphql-federation-keys"`
- Use provides/requires for boundary fields
- Version federation schemas consistently

---

## Additional Resources

- **Main Documentation:** `../README.md`
- **X-GraphQL Attribute Reference:** `./X-GRAPHQL-ATTRIBUTE-REFERENCE.md`
- **Implementation Status:** `./IMPLEMENTATION-STATUS-CURRENT.md`
- **Migration Guide:** `./MIGRATION-GUIDE.md`
- **Troubleshooting:** `./TROUBLESHOOTING.md`

---

## Support

- **Issues:** https://github.com/JJediny/json-schema-x-graphql/issues
- **Discussions:** https://github.com/JJediny/json-schema-x-graphql/discussions
- **Examples:** `../../examples/`

---

**Document Version:** 1.0  
**Converter Version:** 2.0.0  
**Last Updated:** 2024
