# Introducing Types

## Overview

**What you'll learn:**

- What GraphQL types are and why they matter
- The difference between object types and scalar types
- How the Query type serves as your API gateway
- How JSON Schema represents types
- How json-schema-x-graphql maps between them

**Why it matters:**
Types are the foundation of GraphQL schemas. They define what data is available, what format it's in, and how you can interact with it. Understanding types is the key to building and consuming GraphQL APIs effectively.

**Prerequisites:**

- Basic understanding of APIs
- Familiarity with JSON
- No prior GraphQL knowledge required

---

## Key Concepts

### Object Types: Containers for Related Data

An **object type** represents something concrete with properties—like a `Fruit`, `User`, or `Product`. Each property is called a **field**, and each field has a specific data type.

**Real-world analogy**: Think of an object type as a form. The form itself is the type (e.g., "Contact Form"), and the fields are the individual inputs (name, email, phone).

### Scalar Types: Primitive Values

A **scalar type** represents a single, indivisible value. GraphQL provides five built-in scalars:

- `String`: Text (e.g., "banana", "hello world")
- `Int`: Whole numbers (e.g., 5, -42, 0)
- `Float`: Decimal numbers (e.g., 3.14, 0.5)
- `Boolean`: True/false values
- `ID`: Unique identifiers (strings formatted for IDs)

**Real-world analogy**: Scalar types are like data types in a spreadsheet—each cell contains a single type of value.

### The Query Type: Your API Gateway

The `Query` type is the entry point to your GraphQL API. It defines all the possible requests you can make. Without it, there's no way to retrieve data—it's like the front door of a building.

**Real-world analogy**: If your data is a library, the Query type is the card catalog that tells you where to find books.

---

## GraphQL Implementation

### Defining an Object Type

```graphql
type Fruit {
  id: ID
  name: String
  quantity: Int
  price: Int
  averageWeight: Float
  hasEdibleSeeds: Boolean
}
```

**What this means:**

- We're defining a type called `Fruit`
- It has 6 fields with specific types
- Any data representing a fruit must have these fields

### Defining Scalar Fields

In the example above:

- `id: ID` — A unique identifier (string format)
- `name: String` — Text describing the fruit
- `quantity: Int` — Number of items in stock
- `price: Int` — Cost in cents
- `averageWeight: Float` — Decimal weight in kg
- `hasEdibleSeeds: Boolean` — Yes/no flag

### The Query Type

```graphql
type Query {
  mostPopularFruit: Fruit
  fruits: [Fruit]
}
```

**What this means:**

- `mostPopularFruit` returns a single `Fruit` object
- `fruits` returns a list of `Fruit` objects
- These are the only ways to access fruit data in this API

### Making a Query

```graphql
query GetFruit {
  mostPopularFruit {
    name
    price
  }
}
```

**What happens:**

1. We ask for `mostPopularFruit` from the Query type
2. We specify which fields we want: `name` and `price`
3. The server returns a response like:

```json
{
  "data": {
    "mostPopularFruit": {
      "name": "banana",
      "price": 44
    }
  }
}
```

---

## JSON Schema Implementation

### Defining an Object Type

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "Fruit",
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "quantity": { "type": "integer" },
    "price": { "type": "integer" },
    "averageWeight": { "type": "number" },
    "hasEdibleSeeds": { "type": "boolean" }
  }
}
```

**Key differences from GraphQL:**

- JSON Schema uses `properties` instead of fields
- Types are lowercase (`string`, `integer`, `number`, `boolean`)
- Structure is JSON-based rather than SDL (Schema Definition Language)

### Defining Multiple Types with References

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "Query",
  "properties": {
    "mostPopularFruit": { "$ref": "#/$defs/Fruit" },
    "fruits": {
      "type": "array",
      "items": { "$ref": "#/$defs/Fruit" }
    }
  },
  "$defs": {
    "Fruit": {
      "type": "object",
      "title": "Fruit",
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "quantity": { "type": "integer" },
        "price": { "type": "integer" },
        "averageWeight": { "type": "number" },
        "hasEdibleSeeds": { "type": "boolean" }
      }
    }
  }
}
```

**Key features:**

- `$defs` contains reusable type definitions
- `$ref` references other types
- `array` with `items` is how you represent lists

### Scalar Type Mapping

| GraphQL   | JSON Schema         | Example  |
| --------- | ------------------- | -------- |
| `String`  | `"type": "string"`  | "banana" |
| `Int`     | `"type": "integer"` | 5        |
| `Float`   | `"type": "number"`  | 3.14     |
| `Boolean` | `"type": "boolean"` | true     |
| `ID`      | `"type": "string"`  | "f123"   |

---

## json-schema-x-graphql Mapping

### How the Converter Works

The converter translates between these two formats:

**GraphQL → JSON Schema:**

```
Object Type → JSON object in $defs
Field → JSON property
Scalar Type → JSON type (string, integer, etc.)
List Type → array with items
```

**JSON Schema → GraphQL:**

```
$defs objects → GraphQL type definitions
properties → Fields
JSON types → GraphQL scalars
array items → List types
```

### Configuration for Type Conversion

```javascript
const converter = new Converter();
const result = await converter.convert({
  jsonSchema: schema,
  options: {
    includeDescriptions: true, // Preserve field docs
    preserveFieldOrder: true, // Maintain field order
    inferIds: true, // Auto-detect ID fields
  },
});
```

### Practical Example

**Input: JSON Schema**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "Query",
  "properties": {
    "greeting": { "type": "string" }
  },
  "$defs": {
    "Greeting": {
      "type": "object",
      "title": "Greeting",
      "properties": {
        "message": { "type": "string" }
      }
    }
  }
}
```

**Output: GraphQL SDL**

```graphql
type Query {
  greeting: String
}

type Greeting {
  message: String
}
```

### Special Considerations

**1. Type Names**

- GraphQL requires PascalCase: `MyType`, `UserProfile`
- JSON Schema titles become type names
- The converter automatically capitalizes

**2. Lists vs Single Values**

- JSON Schema: Use `"type": "array"` with `items`
- GraphQL: Use square brackets `[Type]`
- Converter: Detects arrays and converts to list types

**3. Descriptions and Documentation**

- JSON Schema: Use `"description"` fields
- GraphQL: Use `"""` block comments
- Converter: Preserves descriptions when enabled

---

## Real-World Examples

### Example 1: E-Commerce Product Type

**GraphQL:**

```graphql
type Product {
  id: ID
  name: String
  description: String
  price: Int
  inStock: Boolean
  categories: [String]
}

type Query {
  product(id: ID): Product
  allProducts: [Product]
}
```

**JSON Schema:**

```json
{
  "type": "object",
  "title": "Query",
  "properties": {
    "product": {
      "type": "object",
      "properties": {
        "id": { "type": "string" }
      }
    },
    "allProducts": {
      "type": "array",
      "items": { "$ref": "#/$defs/Product" }
    }
  },
  "$defs": {
    "Product": {
      "type": "object",
      "title": "Product",
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "description": { "type": "string" },
        "price": { "type": "integer" },
        "inStock": { "type": "boolean" },
        "categories": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    }
  }
}
```

### Example 2: User Management

**GraphQL:**

```graphql
type User {
  id: ID
  email: String
  username: String
  createdAt: String
  isActive: Boolean
}

type Query {
  me: User
  user(id: ID): User
  users: [User]
}
```

**JSON Schema:**

```json
{
  "type": "object",
  "title": "Query",
  "properties": {
    "me": { "$ref": "#/$defs/User" },
    "user": {
      "type": "object",
      "properties": {
        "id": { "type": "string" }
      }
    },
    "users": {
      "type": "array",
      "items": { "$ref": "#/$defs/User" }
    }
  },
  "$defs": {
    "User": {
      "type": "object",
      "title": "User",
      "properties": {
        "id": { "type": "string" },
        "email": { "type": "string", "format": "email" },
        "username": { "type": "string" },
        "createdAt": { "type": "string", "format": "date-time" },
        "isActive": { "type": "boolean" }
      }
    }
  }
}
```

---

## Common Patterns

### Pattern 1: The ID Field

Every type usually has an `id` field to uniquely identify instances:

```graphql
type User {
  id: ID # Always required
  email: String
  name: String
}
```

**Why**: You need a way to request a specific resource and distinguish between similar objects.

### Pattern 2: List of Items

Return multiple objects of the same type:

```graphql
type Query {
  fruits: [Fruit] # Returns 0 or more fruits
}
```

### Pattern 3: Single vs. Multiple

Offer both specific and bulk retrieval:

```graphql
type Query {
  user(id: ID): User # Get one
  users: [User] # Get all
}
```

---

## Migration Guide

### Converting GraphQL to JSON Schema

1. **Identify the root Query type** → This becomes the root object
2. **For each field on Query:**
   - Create a property
   - Reference its return type
3. **For each custom type:**
   - Create an entry in `$defs`
   - Map fields to properties
4. **Convert scalar types:**
   - Use the mapping table above

**Quick checklist:**

- [ ] Root schema has `title: "Query"`
- [ ] All custom types in `$defs`
- [ ] Types use `$ref` for references
- [ ] Scalar types correct

### Converting JSON Schema to GraphQL

1. **Start with the root object** → This is your Query type
2. **For each property:**
   - Create a field
   - Use appropriate scalar type
3. **For each `$defs` entry:**
   - Create a new type definition
4. **Use square brackets `[]`** for arrays
5. **Capitalize type names** (PascalCase)

**Quick checklist:**

- [ ] Root becomes `type Query`
- [ ] All types PascalCase
- [ ] Arrays use `[Type]` syntax
- [ ] All scalars correct

---

## Practice Exercises

### Exercise 1: Identify Type Components

Given this GraphQL schema, identify:

1. Which is the object type?
2. Which are scalar types?
3. What is the Query type's entry point?

```graphql
type User {
  id: ID
  name: String
  email: String
}

type Query {
  user: User
}
```

<details>
<summary>Solution</summary>

1. **Object type**: `User` (has multiple fields)
2. **Scalar types**: `ID`, `String` (primitive values)
3. **Query entry point**: `user` (only way to access User data)

</details>

### Exercise 2: Create a JSON Schema

Create a JSON Schema that represents this GraphQL type:

```graphql
type Book {
  id: ID
  title: String
  author: String
  pageCount: Int
}

type Query {
  books: [Book]
}
```

<details>
<summary>Solution</summary>

```json
{
  "type": "object",
  "title": "Query",
  "properties": {
    "books": {
      "type": "array",
      "items": { "$ref": "#/$defs/Book" }
    }
  },
  "$defs": {
    "Book": {
      "type": "object",
      "title": "Book",
      "properties": {
        "id": { "type": "string" },
        "title": { "type": "string" },
        "author": { "type": "string" },
        "pageCount": { "type": "integer" }
      }
    }
  }
}
```

</details>

### Exercise 3: Identify Missing Information

This GraphQL schema is incomplete. What's missing?

```graphql
type Article {
  id: ID
  title: String
  content: String
}
```

<details>
<summary>Solution</summary>

The Query type is missing! Without it, there's no way to access articles. Add:

```graphql
type Query {
  article(id: ID): Article
  allArticles: [Article]
}
```

</details>

---

## Next Steps

**Ready to dive deeper?** Here's the recommended learning path:

1. **Next Module**: [Scalars, Objects, and Lists](/learning/02-scalars-objects-lists)
   - Learn more about scalar types
   - Understand list constraints
   - See more complex type combinations

2. **Then**: [Nullability](/learning/03-nullability)
   - Make fields required
   - Handle optional data
   - Ensure data integrity

3. **For exploration**:
   - Try the [Type Visualizer](/tools/type-visualizer) tool
   - Use the [Schema Converter](/tools/schema-converter) tool
   - Explore [Code Examples](/examples/types)

---

## Key Takeaways

✅ **Types are the foundation** of GraphQL APIs—they define what data is available  
✅ **Object types** are collections of fields; **scalar types** are primitive values  
✅ **The Query type** is your gateway to accessing data  
✅ **JSON Schema** and **GraphQL** represent types differently but contain the same information  
✅ **json-schema-x-graphql** bridges the gap, converting between both formats

---

## Resources

- [GraphQL Docs - Type System](https://graphql.org/learn/type-system/)
- [JSON Schema Docs - Type](https://json-schema.org/understanding-json-schema/basics/type.html)
- [Apollo Sandbox - Interactive GraphQL Explorer](https://studio.apollographql.com/sandbox)
- [json-schema-x-graphql Documentation](../docs/README.md)

---

**Questions or feedback?** [Open an issue](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues) or [start a discussion](https://github.com/json-schema-x-graphql/json-schema-x-graphql/discussions)

Last updated: 2025-12-15
