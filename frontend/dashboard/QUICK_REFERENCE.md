# GraphQL & JSON Schema Quick Reference

A fast lookup guide for the json-schema-x-graphql dashboard learning hub.

---

## Scalar Types at a Glance

| Type        | GraphQL   | JSON Schema | Example     | Use                       |
| ----------- | --------- | ----------- | ----------- | ------------------------- |
| **String**  | `String`  | `"string"`  | `"banana"`  | Text, URLs, emails        |
| **Integer** | `Int`     | `"integer"` | `42`        | Counts, prices in cents   |
| **Decimal** | `Float`   | `"number"`  | `3.14`      | Measurements, percentages |
| **Boolean** | `Boolean` | `"boolean"` | `true`      | Flags, toggles            |
| **ID**      | `ID`      | `"string"`  | `"user123"` | Unique identifiers        |

---

## Type Modifiers

### Nullability (Next, Optional)

| GraphQL      | JSON Schema                      | Meaning                          |
| ------------ | -------------------------------- | -------------------------------- |
| `String`     | (default)                        | Can be `null` or a string        |
| `String!`    | `"type": "string"` in required   | Must be a string, never `null`   |
| `[String]`   | `"array"`                        | List that can be `null`          |
| `[String!]`  | List of non-null items           | List where items can't be `null` |
| `[String]!`  | Required list (but can be empty) | List that can't be `null`        |
| `[String!]!` | Required non-null list           | Everything required              |

---

## GraphQL Schema Structure

### Basic Type Definition

```graphql
type User {
  id: ID!
  name: String!
  email: String
  isActive: Boolean!
}
```

### Query Type (Entry Point)

```graphql
type Query {
  user(id: ID!): User
  users: [User!]!
}
```

### With Descriptions

```graphql
"""
Represents a user in the system
"""
type User {
  "Unique identifier"
  id: ID!

  "User's full name"
  name: String!
}
```

---

## JSON Schema Equivalents

### Basic Type Definition

```json
{
  "type": "object",
  "title": "User",
  "required": ["id", "name", "isActive"],
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "email": { "type": "string" },
    "isActive": { "type": "boolean" }
  }
}
```

### With References

```json
{
  "type": "object",
  "title": "Query",
  "properties": {
    "user": { "$ref": "#/$defs/User" },
    "users": {
      "type": "array",
      "items": { "$ref": "#/$defs/User" }
    }
  },
  "$defs": {
    "User": {
      /* ...type definition... */
    }
  }
}
```

### With Descriptions

```json
{
  "type": "object",
  "title": "User",
  "description": "Represents a user in the system",
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier"
    },
    "name": {
      "type": "string",
      "description": "User's full name"
    }
  }
}
```

---

## Common Patterns

### List of Items

**GraphQL:**

```graphql
type User {
  tags: [String!]!
}
```

**JSON Schema:**

```json
{
  "tags": {
    "type": "array",
    "items": { "type": "string" },
    "minItems": 0
  }
}
```

### Pagination

**GraphQL:**

```graphql
type UserConnection {
  users: [User!]!
  total: Int!
  hasMore: Boolean!
}

type Query {
  users(limit: Int = 10, offset: Int = 0): UserConnection!
}
```

**JSON Schema:**

```json
{
  "$defs": {
    "UserConnection": {
      "type": "object",
      "properties": {
        "users": {
          "type": "array",
          "items": { "$ref": "#/$defs/User" }
        },
        "total": { "type": "integer" },
        "hasMore": { "type": "boolean" }
      }
    }
  }
}
```

### Nested Objects

**GraphQL:**

```graphql
type User {
  id: ID!
  name: String!
  profile: UserProfile!
}

type UserProfile {
  bio: String
  avatar: String
}
```

**JSON Schema:**

```json
{
  "$defs": {
    "User": {
      "type": "object",
      "properties": {
        "profile": { "$ref": "#/$defs/UserProfile" }
      }
    },
    "UserProfile": {
      "type": "object",
      "properties": {
        "bio": { "type": "string" },
        "avatar": { "type": "string" }
      }
    }
  }
}
```

---

## Conversion Tips

### GraphQL → JSON Schema

| GraphQL              | →   | JSON Schema                                  |
| -------------------- | --- | -------------------------------------------- |
| `type Foo { ... }`   | →   | `{ "type": "object", "title": "Foo", ... }`  |
| Field name           | →   | Property in `properties`                     |
| `String`             | →   | `"type": "string"`                           |
| `[Type]`             | →   | `"type": "array", "items": { $ref or type }` |
| `Type!`              | →   | Add to `required` array                      |
| Comments `"""..."""` | →   | `"description": "..."`                       |

### JSON Schema → GraphQL

| JSON Schema        | →   | GraphQL                   |
| ------------------ | --- | ------------------------- |
| `"type": "object"` | →   | `type ObjectName { ... }` |
| `"properties"`     | →   | Fields of the type        |
| `"type": "string"` | →   | `String`                  |
| `"type": "array"`  | →   | `[ItemType]`              |
| `"required"`       | →   | Add `!` to field types    |
| `"description"`    | →   | `"""..."""` comment       |

---

## Naming Conventions

### GraphQL

- **Type names**: PascalCase (`User`, `BlogPost`, `UserProfile`)
- **Field names**: camelCase (`firstName`, `lastLoginAt`)
- **Enum values**: SCREAMING_SNAKE_CASE (`ACTIVE`, `PENDING`)
- **Query fields**: camelCase (`getUser`, `listUsers`)

### JSON Schema

- **Type names**: PascalCase (in `title`)
- **Property names**: camelCase or snake_case (depends on data)
- **Enum values**: SCREAMING_SNAKE_CASE

---

## Query Examples

### Simple Query

**GraphQL:**

```graphql
query GetUser {
  user(id: "123") {
    name
    email
  }
}
```

**Response:**

```json
{
  "data": {
    "user": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

### With Variables

**GraphQL:**

```graphql
query GetUser($userId: ID!) {
  user(id: $userId) {
    name
    email
  }
}

# Variables:
# { "userId": "123" }
```

### Nested Query

**GraphQL:**

```graphql
query GetUserWithPosts {
  user(id: "123") {
    name
    posts {
      title
      content
    }
  }
}
```

---

## Validation Checklist

### Before Deploying Your Schema

- [ ] Root `Query` type exists
- [ ] All custom types are defined (in GraphQL `$defs` for JSON Schema)
- [ ] All required fields marked as non-null (`!`)
- [ ] Type names are PascalCase
- [ ] Field names are camelCase
- [ ] Descriptions are clear and present
- [ ] No circular dependencies without proper type references
- [ ] ID fields exist on main types
- [ ] Lists use square brackets `[]`
- [ ] Monetary values use `Int` (not `Float`)
- [ ] Validated against schema validator
- [ ] Examples work in Apollo Sandbox or equivalent

---

## Common Mistakes

| Mistake                        | Problem              | Fix                          |
| ------------------------------ | -------------------- | ---------------------------- |
| `type: String` in JSON Schema  | Missing property key | Use `"type": "string"`       |
| Using `Float` for money        | Precision loss       | Use `Int` with smallest unit |
| Field `status: String`         | No type safety       | Use `enum OrderStatus`       |
| List of lists `[[String]]`     | Confusing syntax     | Use pagination instead       |
| Circular types without refs    | Hard to process      | Use `$ref` or proper typing  |
| No descriptions                | Hard to understand   | Add `description` fields     |
| Mixing camelCase/snake_case    | Inconsistent API     | Pick one convention          |
| Required field with wrong type | Validation fails     | Match `required` with type   |

---

## Tools & Resources

### Validators

- [GraphQL Schema Validator](https://www.apollographql.com/docs/apollo-server/schema/schema)
- [JSON Schema Validator](https://www.jsonschemavalidator.net/)
- json-schema-x-graphql Converter

### Visualizers

- [GraphQL Voyager](https://graphql-voyager.herokuapp.com/) - See schema as graph
- [JSON Schema Viewer](https://json-schema.org/understanding-json-schema/) - Learn JSON Schema

### Learning

- [graphql.com/learn](https://graphql.com/learn/) - GraphQL official learning
- [json-schema.org](https://json-schema.org/) - JSON Schema docs
- [Dashboard Learning Hub](/learning/) - This site's tutorials

### Communities

- [GraphQL Community](https://graphql.org/community/)
- [Stack Overflow: GraphQL](https://stackoverflow.com/questions/tagged/graphql)
- [Stack Overflow: JSON Schema](https://stackoverflow.com/questions/tagged/json-schema)

---

## Troubleshooting

### GraphQL Conversion Issues

**Problem**: Empty output from converter  
**Check**: Is your root type named `Query`? Are types in `$defs`?

**Problem**: Type names are lowercase  
**Check**: Use `x-graphql.typeName` hints in schema

**Problem**: Missing descriptions  
**Check**: Enable `includeDescriptions: true` in converter options

### JSON Schema Conversion Issues

**Problem**: Properties not showing as fields  
**Check**: Are fields in the root `properties` object?

**Problem**: References not resolving  
**Check**: Are types in `$defs`? Are `$ref` paths correct?

**Problem**: Type validation fails  
**Check**: Use standard JSON Schema types (`string`, `integer`, `number`, `boolean`, `array`, `object`)

---

## Module Map

| Module                                                            | Topics                              | Read Time |
| ----------------------------------------------------------------- | ----------------------------------- | --------- |
| [01: Introducing Types](/learning/01-introducing-types)           | Object types, scalars, Query type   | 12 min    |
| [02: Scalars, Objects, Lists](/learning/02-scalars-objects-lists) | All 5 scalars, Lists, real examples | 15 min    |
| [03: Nullability](/learning/03-nullability)                       | Required fields, Non-null type      | 10 min    |
| [04: Querying Between Types](/learning/04-querying-between-types) | Type relationships, graph traversal | 14 min    |
| [05: Schema](/learning/05-schema)                                 | Schema structure, introspection     | 13 min    |
| [06: Enums](/learning/06-enums)                                   | Constrained values, type safety     | 11 min    |
| [07: Interfaces & Unions](/learning/07-interfaces-unions)         | Polymorphism, shared fields         | 16 min    |
| [08: Arguments](/learning/08-arguments)                           | Field parameters, input types       | 14 min    |
| [09: Mutations](/learning/09-mutations)                           | Write operations, state changes     | 13 min    |

**Total Learning Time**: ~118 minutes (~2 hours)

---

## Glossary

**API Contract**: An agreement between client and server about available data and operations

**Enum**: A type that restricts values to a predefined set

**Field**: A property or attribute on an object type

**Graph**: The interconnected structure of types and their relationships

**Introspection**: The ability to query schema metadata

**Mutation**: An operation that changes data (write/delete)

**Null**: The absence of a value

**Object Type**: A collection of fields representing a logical entity

**Query**: An operation that retrieves data (read-only)

**Scalar**: A primitive data type that holds a single value

**Schema**: The definition of all types and operations available in an API

**Type**: A blueprint defining the shape and constraints of data

**Type System**: The set of rules governing what types of data are valid

---

## Tips for Success

1. **Start simple**: Master basic types before complex compositions
2. **Use descriptions**: Always document your types
3. **Follow conventions**: camelCase for fields, PascalCase for types
4. **Test your schema**: Use validators and tools
5. **Iterate gradually**: Add complexity as needed
6. **Think in graphs**: Types relate to each other
7. **Design for queries**: Think about how data will be accessed
8. **Plan for evolution**: Make schema flexible for future changes

---

**Need help?** Check the [FAQ](/help/faq) or [open an issue](https://github.com/json-schema-x-graphql/issues)

Last updated: 2025-12-15
