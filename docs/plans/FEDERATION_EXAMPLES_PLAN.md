# Apollo Federation Examples: SDL to JSON Schema Conversion Plan

## Overview

This document outlines a plan to find canonical Apollo Federation examples and create corresponding JSON schemas that generate them using our X-GraphQL converters.

## Referenced Federation Examples

### 1. Classic Apollo Federation Example: Users, Reviews, Products

**Source**: [Apollo Federation Documentation](https://www.apollographql.com/docs/federation/)

This is the canonical three-service example from Apollo's official documentation.

#### Users Service SDL

```graphql
type User @key(fields: "email") {
  email: ID!
  name: String
  username: String
  birthDate: String
}
```

#### Reviews Service SDL

```graphql
type Review @key(fields: "id") {
  id: ID!
  body: String
  author: User @provides(fields: "username")
  product: Product
}

extend type User @key(fields: "email") {
  email: ID! @external
  reviews: [Review]
}

extend type Product @key(fields: "upc") {
  upc: String! @external
  reviews: [Review]
}
```

#### Products Service SDL

```graphql
type Product @key(fields: "upc") {
  upc: String!
  name: String
  price: Int
  weight: Int
}
```

### 2. Strawberry GraphQL Books & Reviews Example

**Source**: [Strawberry GraphQL Federation Docs](https://strawberry.rocks/docs/guides/federation)

#### Books Service (Strawberry Python)

```graphql
type Book @key(fields: "id") {
  id: ID!
  title: String!
  author: String!
}

type Query {
  books: [Book!]!
  book(id: ID!): Book
}
```

#### Reviews Service (Extends Book)

```graphql
extend type Book @key(fields: "id") {
  id: ID! @external
  reviews: [Review!]!
}

type Review {
  id: ID!
  rating: Int!
  comment: String
}

type Query {
  reviews: [Review!]!
}
```

### 3. Semantic Objects Platform Example

**Source**: Referenced as Docker Compose setup with gateway connecting to:
- semantic-objects service
- extend-example service

#### Planet Entity Example

```graphql
type Planet @key(fields: "id") {
  id: ID!
  name: String!
  diameter: Float
}
```

## JSON Schema Mapping Strategy

### Core Federation Directive Mappings

| Federation Directive | X-GraphQL Extension | Example |
|---------------------|---------------------|---------|
| `@key(fields: "id")` | `"x-graphql-federation-keys": ["id"]` | Single key |
| `@key(fields: "id email")` | `"x-graphql-federation-keys": ["id", "email"]` | Composite key |
| `@external` | `"x-graphql-federation-external": true` | Field level |
| `@requires(fields: "...")` | `"x-graphql-federation-requires": "firstName lastName"` | Field level |
| `@provides(fields: "...")` | `"x-graphql-federation-provides": "username email"` | Field level |
| `@extends` | `"x-graphql-federation-extends": true` | Type level |
| `@shareable` | `"x-graphql-federation-shareable": true` | Type or field level |
| `@override(from: "...")` | `"x-graphql-federation-override-from": "service-name"` | Field level |

### New Federation 2.x Directive Mappings

| Federation 2 Directive | X-GraphQL Extension | Notes |
|------------------------|---------------------|-------|
| `@interfaceObject` | `"x-graphql-federation-interface-object": true` | Type level |
| `@authenticated` | `"x-graphql-federation-authenticated": true` | Type or field level |
| `@requiresScopes` | `"x-graphql-federation-requires-scopes": [...]` | Authorization |
| `@inaccessible` | `"x-graphql-federation-inaccessible": true` | Hide from public schema |
| `@tag(name: "...")` | `"x-graphql-federation-tags": [{"name": "..."}]` | Metadata |
| `@composeDirective` | `"x-graphql-federation-compose-directive": "..."` | Custom directives |

## Implementation Plan

### Phase 1: Find and Document Original SDL Files

**Tasks:**
1. ✓ Document the classic Apollo Federation example (Users, Reviews, Products)
2. ✓ Document the Strawberry GraphQL example (Books, Reviews)
3. ✓ Document the Semantic Objects example (Planet entity)
4. Create reference SDL files in `examples/federation/sdl/`
5. Document the exact versions and sources

**Output:**
```
examples/federation/sdl/
├── apollo-classic/
│   ├── users-service.graphql
│   ├── reviews-service.graphql
│   └── products-service.graphql
├── strawberry/
│   ├── books-service.graphql
│   └── reviews-service.graphql
└── semantic-objects/
    └── planet-service.graphql
```

### Phase 2: Create Corresponding JSON Schemas

For each SDL file, create a JSON schema that will generate it.

**Example Structure for Users Service:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "User Service Schema",
  "description": "User entity for Apollo Federation classic example",
  "definitions": {
    "User": {
      "type": "object",
      "x-graphql-type-name": "User",
      "x-graphql-type-kind": "OBJECT",
      "x-graphql-description": "User account entity",
      "x-graphql-federation-keys": ["email"],
      "properties": {
        "email": {
          "type": "string",
          "format": "email",
          "x-graphql-field-name": "email",
          "x-graphql-field-type": "ID",
          "x-graphql-field-non-null": true
        },
        "name": {
          "type": "string",
          "x-graphql-field-name": "name",
          "x-graphql-nullable": true
        },
        "username": {
          "type": "string",
          "x-graphql-field-name": "username",
          "x-graphql-nullable": true
        },
        "birth_date": {
          "type": "string",
          "format": "date",
          "x-graphql-field-name": "birthDate",
          "x-graphql-nullable": true
        }
      },
      "required": ["email"]
    }
  }
}
```

**Output:**
```
examples/federation/json-schemas/
├── apollo-classic/
│   ├── users-service.json
│   ├── reviews-service.json
│   └── products-service.json
├── strawberry/
│   ├── books-service.json
│   └── reviews-service.json
└── semantic-objects/
    └── planet-service.json
```

### Phase 3: Test Round-Trip Conversions

**Validation Steps:**
1. Convert each JSON schema → SDL using Node.js converter
2. Convert each JSON schema → SDL using Rust converter
3. Compare generated SDL with original reference SDL
4. Document any differences or required adjustments
5. Ensure federation directives are correctly placed

**Test Script:**
```bash
#!/bin/bash
# test-federation-examples.sh

for example in examples/federation/json-schemas/**/*.json; do
  basename=$(basename "$example" .json)
  
  # Node converter
  node converters/node/dist/cli.js \
    --input "$example" \
    --output "examples/federation/output/node/$basename.graphql"
  
  # Rust converter
  ./converters/rust/target/release/jxql \
    --input "$example" \
    --output "examples/federation/output/rust/$basename.graphql"
  
  # Compare with reference
  diff "examples/federation/sdl/$basename.graphql" \
       "examples/federation/output/node/$basename.graphql"
done
```

### Phase 4: Advanced Federation Patterns

Create JSON schemas for advanced patterns:

#### Pattern 1: Entity Extension Across Services

```json
{
  "definitions": {
    "UserExtension": {
      "type": "object",
      "x-graphql-type-name": "User",
      "x-graphql-federation-extends": true,
      "x-graphql-federation-keys": ["email"],
      "properties": {
        "email": {
          "type": "string",
          "x-graphql-field-name": "email",
          "x-graphql-field-type": "ID",
          "x-graphql-field-non-null": true,
          "x-graphql-federation-external": true
        },
        "reviews": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/Review"
          },
          "x-graphql-field-name": "reviews",
          "x-graphql-field-type": "[Review]"
        }
      }
    }
  }
}
```

#### Pattern 2: @provides and @requires

```json
{
  "properties": {
    "author": {
      "type": "object",
      "x-graphql-field-name": "author",
      "x-graphql-field-type": "User",
      "x-graphql-federation-provides": "username",
      "x-graphql-description": "Review author with username provided"
    },
    "full_name": {
      "type": "string",
      "x-graphql-field-name": "fullName",
      "x-graphql-federation-requires": "firstName lastName",
      "x-graphql-description": "Computed from firstName and lastName"
    }
  }
}
```

#### Pattern 3: Composite Keys

```json
{
  "x-graphql-federation-keys": [
    {
      "fields": "id email",
      "resolvable": true
    },
    {
      "fields": "username",
      "resolvable": false
    }
  ]
}
```

### Phase 5: Documentation and Examples

Create comprehensive documentation:

**Files to Create:**
1. `docs/FEDERATION_GUIDE.md` - Complete guide to federation with X-GraphQL
2. `examples/federation/README.md` - Overview and quick start
3. `examples/federation/PATTERNS.md` - Common patterns and recipes
4. `examples/federation/MIGRATION.md` - Migrating existing federation schemas

**Documentation Sections:**

```markdown
# Federation with X-GraphQL Converters

## Quick Start
## Directive Mapping Reference
## Common Patterns
## Troubleshooting
## Best Practices
```

## Validation Checklist

- [ ] All directive mappings documented
- [ ] Classic Apollo example (Users/Reviews/Products) converted
- [ ] Strawberry example (Books/Reviews) converted
- [ ] Semantic Objects example (Planet) converted
- [ ] Round-trip conversion tests pass
- [ ] Federation 2.x directives supported
- [ ] Composite keys working
- [ ] @extends/@external pattern working
- [ ] @provides/@requires pattern working
- [ ] @override pattern working
- [ ] @shareable working
- [ ] Documentation complete
- [ ] Examples tested with Apollo Gateway
- [ ] Examples tested with Apollo Router

## File Structure

```
json-schema-x-graphql/
├── docs/
│   ├── FEDERATION_EXAMPLES_PLAN.md (this file)
│   ├── FEDERATION_GUIDE.md
│   └── FEDERATION_PATTERNS.md
├── examples/
│   └── federation/
│       ├── README.md
│       ├── sdl/                    # Reference SDL files
│       │   ├── apollo-classic/
│       │   ├── strawberry/
│       │   └── semantic-objects/
│       ├── json-schemas/           # Source JSON schemas
│       │   ├── apollo-classic/
│       │   ├── strawberry/
│       │   └── semantic-objects/
│       ├── output/                 # Generated SDL
│       │   ├── node/
│       │   └── rust/
│       └── docker-compose.yml      # Full federated example
├── converters/
│   └── test-data/
│       └── federation/             # Test fixtures
└── scripts/
    └── test-federation-examples.sh
```

## Next Steps

1. **Immediate**: Create the reference SDL files for all three examples
2. **Short-term**: Create corresponding JSON schemas that generate these SDLs
3. **Medium-term**: Test with actual Apollo Gateway/Router composition
4. **Long-term**: Create interactive examples with running services

## Resources

- [Apollo Federation Docs](https://www.apollographql.com/docs/federation/)
- [Apollo Federation Spec](https://www.apollographql.com/docs/federation/federation-spec/)
- [Strawberry Federation Guide](https://strawberry.rocks/docs/guides/federation)
- [Federation 2 Migration Guide](https://www.apollographql.com/docs/federation/federation-2/moving-to-federation-2/)

## Additional Examples to Consider

1. **Netflix DGS Framework** - Java/Kotlin federation examples
2. **Hot Chocolate** - .NET federation examples  
3. **Ariadne** - Python federation examples
4. **Apollo Server Examples** - Official Apollo repository examples
5. **Real-world Production Schemas** - Airbnb, GitHub, Shopify patterns

## Success Criteria

✅ **Phase 1 Complete** when we have documented reference SDLs for all three examples
✅ **Phase 2 Complete** when JSON schemas generate matching SDL output
✅ **Phase 3 Complete** when round-trip conversion tests pass with 100% accuracy
✅ **Phase 4 Complete** when all federation patterns are documented and tested
✅ **Phase 5 Complete** when documentation is published and examples are runnable

---

**Status**: Planning Phase
**Last Updated**: 2024
**Owner**: X-GraphQL Team