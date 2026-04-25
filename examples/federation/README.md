# Apollo Federation Examples with X-GraphQL JSON Schema

This directory contains canonical Apollo Federation examples with their corresponding JSON Schema representations using X-GraphQL extensions.

## Overview

These examples demonstrate how to use JSON Schema with X-GraphQL extensions to generate federated GraphQL schemas that are compatible with Apollo Federation v2.

## Directory Structure

```
examples/federation/
├── README.md (this file)
├── sdl/                          # Reference SDL files
│   ├── apollo-classic/          # Classic 3-service example
│   │   ├── users-service.graphql
│   │   ├── products-service.graphql
│   │   └── reviews-service.graphql
│   └── strawberry/              # Strawberry GraphQL example
│       ├── books-service.graphql
│       └── reviews-service.graphql
└── json-schemas/                # Source JSON schemas
    ├── apollo-classic/
    │   ├── users-service.json
    │   ├── products-service.json
    │   └── reviews-service.json
    └── strawberry/
        ├── books-service.json
        └── reviews-service.json
```

## Examples

### 1. Apollo Classic: Users, Reviews, Products

The canonical three-service Apollo Federation example demonstrating:

- Entity keys with `@key(fields: "...")`
- Entity extensions with `extend type`
- External fields with `@external`
- Field dependencies with `@provides` and `@requires`

**Services:**

- **Users Service**: Owns the `User` entity (keyed by `email`)
- **Products Service**: Owns the `Product` entity (keyed by `upc`)
- **Reviews Service**: Owns the `Review` entity and extends `User` and `Product`

**Key Patterns:**

- `User @key(fields: "email")` - Email as primary key
- `Product @key(fields: "upc")` - UPC as primary key
- `Review @key(fields: "id")` - Standard ID key
- `author: User @provides(fields: "username")` - Provides username field
- `extend type User` - Extends User in Reviews service

### 2. Strawberry GraphQL: Books & Reviews

A simpler two-service example from Strawberry GraphQL demonstrating:

- Basic entity extension
- Simple relationships between services

**Services:**

- **Books Service**: Owns the `Book` entity (keyed by `id`)
- **Reviews Service**: Owns the `Review` entity and extends `Book`

**Key Patterns:**

- `Book @key(fields: "id")` - Standard ID key
- `extend type Book` - Extends Book to add reviews
- `reviews: [Review!]!` - Non-nullable list of reviews

## X-GraphQL Federation Mapping

### Federation Directives to JSON Schema Extensions

| Federation Directive       | JSON Schema Extension                                           | Scope      |
| -------------------------- | --------------------------------------------------------------- | ---------- |
| `@key(fields: "id")`       | `"x-graphql-federation": { "keys": [{ "fields": "id" }] }`      | Type       |
| `@external`                | `"x-graphql-federation": { "external": true }`                  | Field      |
| `@requires(fields: "...")` | `"x-graphql-federation": { "requires": "firstName lastName" }`  | Field      |
| `@provides(fields: "...")` | `"x-graphql-federation": { "provides": "username email" }`      | Field      |
| `@shareable`               | `"x-graphql-federation": { "shareable": true }`                 | Type/Field |
| `@override(from: "...")`   | `"x-graphql-federation": { "override": { "from": "service" } }` | Field      |
| `extend type`              | `"x-graphql-federation": { "extends": true }`                   | Type       |

### Complete Type Example

```json
{
  "User": {
    "type": "object",
    "x-graphql-type-name": "User",
    "x-graphql-federation": {
      "keys": [{ "fields": "email" }]
    },
    "properties": {
      "email": {
        "type": "string",
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      }
    }
  }
}
```

### Complete Field Example

```json
{
  "author": {
    "type": "object",
    "x-graphql-field-name": "author",
    "x-graphql-field-type": "User",
    "x-graphql-federation": {
      "provides": "username"
    }
  }
}
```

### Entity Extension Example

```json
{
  "UserExtension": {
    "type": "object",
    "x-graphql-type-name": "User",
    "x-graphql-federation": {
      "keys": [{ "fields": "email" }],
      "extends": true
    },
    "properties": {
      "email": {
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
    }
  }
}
```

## Testing the Examples

### Using Node.js Converter

```bash
# Convert Users service
node converters/node/dist/cli.js \
  --input examples/federation/json-schemas/apollo-classic/users-service.json \
  --output output/users-service.graphql

# Convert all Apollo classic services
for service in users products reviews; do
  node converters/node/dist/cli.js \
    --input examples/federation/json-schemas/apollo-classic/${service}-service.json \
    --output output/${service}-service.graphql
done
```

### Using Rust Converter

```bash
# Build the CLI first
cd converters/rust
cargo build --release --features=cli

# Convert Users service
./target/release/jxql \
  --input ../../examples/federation/json-schemas/apollo-classic/users-service.json \
  --output ../../output/users-service.graphql
```

### Validating Federation Schema

You can validate that the generated SDL is valid federation schema using Apollo tools:

```bash
# Install Rover CLI
npm install -g @apollo/rover

# Check the schema
rover subgraph check \
  --schema output/users-service.graphql \
  --name users

# Compose multiple subgraphs
rover supergraph compose \
  --config supergraph.yaml \
  --output supergraph.graphql
```

Example `supergraph.yaml`:

```yaml
federation_version: 2
subgraphs:
  users:
    routing_url: http://localhost:4001
    schema:
      file: ./output/users-service.graphql
  products:
    routing_url: http://localhost:4002
    schema:
      file: ./output/products-service.graphql
  reviews:
    routing_url: http://localhost:4003
    schema:
      file: ./output/reviews-service.graphql
```

## Common Patterns

### Pattern 1: Simple Entity Key

```json
{
  "x-graphql-federation": {
    "keys": [{ "fields": "id" }]
  }
}
```

Generates: `type User @key(fields: "id")`

### Pattern 2: Composite Key

```json
{
  "x-graphql-federation": {
    "keys": [{ "fields": "organizationId userId" }]
  }
}
```

Generates: `type User @key(fields: "organizationId userId")`

### Pattern 3: Multiple Keys

```json
{
  "x-graphql-federation": {
    "keys": [{ "fields": "id" }, { "fields": "email" }]
  }
}
```

Generates: `type User @key(fields: "id") @key(fields: "email")`

### Pattern 4: Non-Resolvable Key

```json
{
  "x-graphql-federation": {
    "keys": [{ "fields": "id", "resolvable": false }]
  }
}
```

Generates: `type User @key(fields: "id", resolvable: false)`

### Pattern 5: Entity Extension with External Fields

```json
{
  "UserExtension": {
    "x-graphql-type-name": "User",
    "x-graphql-federation": {
      "extends": true,
      "keys": [{ "fields": "id" }]
    },
    "properties": {
      "id": {
        "x-graphql-federation": {
          "external": true
        }
      }
    }
  }
}
```

Generates:

```graphql
type User @key(fields: "id") {
  id: ID! @external
  # ... other fields
}
```

### Pattern 6: Field with @provides

```json
{
  "author": {
    "x-graphql-field-type": "User",
    "x-graphql-federation": {
      "provides": "username email"
    }
  }
}
```

Generates: `author: User @provides(fields: "username email")`

### Pattern 7: Field with @requires

```json
{
  "full_name": {
    "x-graphql-field-name": "fullName",
    "x-graphql-field-type": "String",
    "x-graphql-federation": {
      "requires": "firstName lastName"
    }
  }
}
```

Generates: `fullName: String @requires(fields: "firstName lastName")`

## Best Practices

### 1. Entity Design

- **Choose stable keys**: Use fields that won't change (e.g., `id`, `email`, `upc`)
- **Document key fields**: Add descriptions to key fields explaining their significance
- **Use composite keys when needed**: For multi-tenant or hierarchical data

### 2. Entity Extensions

- **Always mark external fields**: Use `"external": true` for fields owned by other services
- **Match the key**: Extending types must have the same `@key` as the original
- **Keep extensions focused**: Only add fields relevant to the extending service

### 3. Field Dependencies

- **Use @provides sparingly**: Only when you can guarantee the data is available
- **Document @requires**: Explain why the computation needs those fields
- **Test resolution**: Ensure your resolvers handle the dependencies correctly

### 4. Service Boundaries

- **Clear ownership**: Each entity should have one authoritative service
- **Minimize cross-service calls**: Use @provides to optimize data fetching
- **Consider data consistency**: External fields may be stale

### 5. Schema Evolution

- **Version your keys**: Changing keys requires careful migration
- **Add fields carefully**: Consider impact on all services
- **Use @shareable**: For fields that multiple services can resolve

## Troubleshooting

### Issue: "Cannot extend type X because it is not defined"

**Solution**: Make sure the base type is defined in another subgraph and you're using `"extends": true`

### Issue: "@external field must be part of @key"

**Solution**: External fields must either be:

- Part of a `@key` directive
- Required by a field with `@requires`

### Issue: "Directive @key used on type with no fields"

**Solution**: Ensure the key field is defined in properties and marked as required

### Issue: "Cannot query field on type"

**Solution**: Extended types need the key fields marked as `@external` to be resolvable

## Resources

- [Apollo Federation Documentation](https://www.apollographql.com/docs/federation/)
- [Apollo Federation Spec](https://www.apollographql.com/docs/federation/federation-spec/)
- [X-GraphQL Extensions Guide](../../docs/X_GRAPHQL_EXTENSIONS.md)
- [Strawberry Federation Guide](https://strawberry.rocks/docs/guides/federation)
- [Rover CLI Documentation](https://www.apollographql.com/docs/rover/)

## Additional Examples

For more complex real-world examples, see:

- `examples/real-world-schemas/` - Production-grade schemas
- `converters/test-data/x-graphql/` - Test fixtures with all X-GraphQL features
- `docs/FEDERATION_PATTERNS.md` - Advanced patterns and recipes

## Contributing

To add new federation examples:

1. Create the reference SDL in `sdl/your-example/`
2. Create the JSON schema in `json-schemas/your-example/`
3. Test round-trip conversion
4. Document any new patterns in this README
5. Add test cases if introducing new directives

## License

These examples are part of the X-GraphQL project and follow the same license.
