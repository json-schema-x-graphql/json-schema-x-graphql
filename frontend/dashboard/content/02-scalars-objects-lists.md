# Scalars, Objects, and Lists

## Overview

**What you'll learn:**
- The five built-in GraphQL scalar types and when to use each
- How scalars differ from object types
- The List type and array handling
- How JSON Schema represents each concept
- Practical patterns for combining them

**Why it matters:**
Scalars are the building blocks of all data types. Understanding them well helps you design schemas that are both flexible and type-safe. The way you define lists and scalars affects query validation, performance, and user experience.

**Prerequisites:**
- Completed: [Introducing Types](/learning/01-introducing-types)
- Understand object types vs scalar types
- Familiar with GraphQL basic syntax

---

## Key Concepts

### The Five Built-in Scalars

#### String
Represents text, from a single character to entire documents.

```graphql
name: String      # "John"
email: String     # "john@example.com"
content: String   # "Lorem ipsum dolor sit amet..."
```

**In JSON Schema**: `"type": "string"`

**Additional constraints**:
- `minLength`: Minimum characters
- `maxLength`: Maximum characters
- `pattern`: Regular expression matching

#### Int
32-bit integers (whole numbers without decimals).

```graphql
quantity: Int     # 5
year: Int         # 2025
temperature: Int  # -15
```

**Range**: -2,147,483,648 to 2,147,483,647

**In JSON Schema**: `"type": "integer"`

**Common use cases**:
- Counts and quantities
- Years and timestamps (though timestamp strings are better)
- Prices in cents (never decimal for currency)
- Scores and ratings

#### Float
Decimal numbers with arbitrary precision.

```graphql
price: Float          # 19.99
weight: Float         # 0.5
temperature: Float    # 98.6
```

**In JSON Schema**: `"type": "number"`

**Common use cases**:
- Weights and measurements
- Percentages
- Coordinates (latitude, longitude)
- Ratings (4.5 stars)

**Important note on currency**:
Never use Float for money! Always use Int with the smallest unit (cents, pence, etc.) to avoid precision loss.

```graphql
# ❌ Wrong
price: Float  # 19.99 (loses precision)

# ✅ Right
priceInCents: Int  # 1999 (precise)
```

#### Boolean
True/false values with no middle ground.

```graphql
isActive: Boolean       # true or false
hasPermission: Boolean  # true or false
isDeleted: Boolean      # true or false
```

**In JSON Schema**: `"type": "boolean"`

**Common use cases**:
- Flags and toggles
- Yes/no properties
- Feature flags
- Access control

#### ID
A unique identifier, internally a string, but semantically represents uniqueness.

```graphql
id: ID           # "user_123"
userId: ID       # "u-5f7a9c"
entityId: ID     # "entity:12345"
```

**In JSON Schema**: `"type": "string"` (optionally with `format: "uuid"`)

**Why a separate type?**
- Signals intent: "this identifies something unique"
- Improves developer experience: ID fields treated specially in tools
- Helps with code generation: Some tools generate special handling for IDs

**Common formats**:
- UUIDs: `"550e8400-e29b-41d4-a716-446655440000"`
- Numeric IDs: `"12345"`
- Compound IDs: `"user_123"`, `"org_456"`
- Opaque IDs: Anything the service can use to retrieve the object

---

## Objects as Containers for Scalars

### Simple Object Type

Most object types are primarily containers of scalar values:

```graphql
type User {
  id: ID                    # Scalar: unique identifier
  name: String              # Scalar: text
  email: String             # Scalar: text
  age: Int                  # Scalar: whole number
  registeredAt: String      # Scalar: ISO date string
  isEmailVerified: Boolean  # Scalar: flag
}
```

### Mixing Scalars and Objects

Object types can contain other object types:

```graphql
type User {
  id: ID
  name: String
  profile: UserProfile  # Object type (not scalar)
}

type UserProfile {
  bio: String           # Scalar
  avatar: String        # Scalar (URL)
  location: String      # Scalar
}
```

---

## The List Type

### Basic List Syntax

Use square brackets `[]` to indicate "one or more" (or zero):

```graphql
tags: [String]         # List of strings
phoneNumbers: [String] # List of phone numbers
scores: [Int]          # List of integers
friends: [User]        # List of User objects
```

### What List Means

- `[String]` means "zero or more strings"
- The list itself can be empty: `[]`
- The list itself can be null: `null`
- Each item in the list **can be null**: `["apple", null, "banana"]`

**In JSON Schema**:
```json
{
  "type": "array",
  "items": { "type": "string" }
}
```

### Lists of Objects

```graphql
type Store {
  id: ID
  name: String
  products: [Product]  # List of Product objects
}

type Product {
  id: ID
  name: String
  price: Int
}
```

**In JSON Schema**:
```json
{
  "type": "object",
  "properties": {
    "products": {
      "type": "array",
      "items": { "$ref": "#/$defs/Product" }
    }
  }
}
```

---

## JSON Schema Scalar Types

### Type Mapping Reference

| GraphQL | JSON Schema | Example | Use Case |
|---------|-------------|---------|----------|
| `String` | `"type": "string"` | "Hello" | Text, URLs, emails |
| `Int` | `"type": "integer"` | 42 | Counts, prices (cents) |
| `Float` | `"type": "number"` | 3.14 | Measurements, decimals |
| `Boolean` | `"type": "boolean"` | true | Flags, toggles |
| `ID` | `"type": "string"` | "user123" | Unique identifiers |

### Scalar Constraints in JSON Schema

```json
{
  "type": "object",
  "properties": {
    "email": {
      "type": "string",
      "format": "email"  // Email format validation
    },
    "age": {
      "type": "integer",
      "minimum": 0,      // Must be >= 0
      "maximum": 150     // Must be <= 150
    },
    "name": {
      "type": "string",
      "minLength": 1,    // At least 1 character
      "maxLength": 100   // At most 100 characters
    },
    "phone": {
      "type": "string",
      "pattern": "^\\d{10}$"  // Must be 10 digits
    },
    "website": {
      "type": "string",
      "format": "uri"    // Must be a valid URI
    }
  }
}
```

### Arrays in JSON Schema

```json
{
  "type": "array",
  "items": { "type": "string" },
  "minItems": 1,          // At least 1 item
  "maxItems": 10,         // At most 10 items
  "uniqueItems": true     // No duplicates
}
```

---

## Common Patterns

### Pattern 1: Paginated Lists

Return lists with metadata for pagination:

**GraphQL:**
```graphql
type UserConnection {
  users: [User]
  total: Int
  hasMore: Boolean
}

type Query {
  users(limit: Int = 10, offset: Int = 0): UserConnection
}
```

**JSON Schema:**
```json
{
  "type": "object",
  "properties": {
    "users": {
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

### Pattern 2: Flexible String Fields

Some fields accept structured data as strings:

```graphql
type User {
  id: ID
  name: String
  metadata: String  # JSON string
  tags: [String]    # Array of tags
  settings: String  # JSON configuration
}
```

**When to use**:
- Metadata that changes structure
- Complex nested data
- User-generated configuration

**Better approach** (see next module):
- Use `JSON` custom scalar
- Or parse the string on the client

### Pattern 3: Status Enums vs Strings

Compare these two approaches:

```graphql
# ❌ Less safe - any string allowed
type Order {
  status: String  # "pending", "shipped", "delivered"?
}

# ✅ Better - restricted values
enum OrderStatus {
  PENDING
  SHIPPED
  DELIVERED
  CANCELLED
}

type Order {
  status: OrderStatus!
}
```

---

## Real-World Examples

### Example 1: E-Commerce Product

**GraphQL:**
```graphql
type Product {
  id: ID!
  name: String!
  description: String
  price: Int!              # In cents
  rating: Float            # 0-5 stars
  inStock: Boolean!
  quantity: Int!
  tags: [String]           # ["electronics", "gadgets"]
  images: [String]         # URLs
  reviews: [Review]        # Other object types
}

type Query {
  product(id: ID!): Product
}
```

**JSON Schema:**
```json
{
  "$defs": {
    "Product": {
      "type": "object",
      "title": "Product",
      "required": ["id", "name", "price", "inStock", "quantity"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "description": { "type": "string" },
        "price": { "type": "integer", "minimum": 0 },
        "rating": { "type": "number", "minimum": 0, "maximum": 5 },
        "inStock": { "type": "boolean" },
        "quantity": { "type": "integer", "minimum": 0 },
        "tags": {
          "type": "array",
          "items": { "type": "string" }
        },
        "images": {
          "type": "array",
          "items": { "type": "string", "format": "uri" }
        },
        "reviews": {
          "type": "array",
          "items": { "$ref": "#/$defs/Review" }
        }
      }
    }
  }
}
```

### Example 2: User Profile

**GraphQL:**
```graphql
type User {
  id: ID!
  username: String!
  email: String!
  firstName: String
  lastName: String
  age: Int
  isActive: Boolean!
  joinedAt: String!       # ISO date
  bio: String
  socialLinks: [String]   # URLs
  favoriteColors: [String]
  settings: UserSettings
}

type UserSettings {
  emailNotifications: Boolean
  darkMode: Boolean
  language: String
}

type Query {
  user(id: ID!): User
  currentUser: User
}
```

**JSON Schema:**
```json
{
  "type": "object",
  "properties": {
    "user": { "$ref": "#/$defs/User" },
    "currentUser": { "$ref": "#/$defs/User" }
  },
  "$defs": {
    "User": {
      "type": "object",
      "title": "User",
      "required": ["id", "username", "email", "isActive", "joinedAt"],
      "properties": {
        "id": { "type": "string" },
        "username": { "type": "string", "minLength": 1 },
        "email": { "type": "string", "format": "email" },
        "firstName": { "type": "string" },
        "lastName": { "type": "string" },
        "age": { "type": "integer", "minimum": 0, "maximum": 150 },
        "isActive": { "type": "boolean" },
        "joinedAt": { "type": "string", "format": "date-time" },
        "bio": { "type": "string" },
        "socialLinks": {
          "type": "array",
          "items": { "type": "string", "format": "uri" }
        },
        "favoriteColors": {
          "type": "array",
          "items": { "type": "string" }
        },
        "settings": { "$ref": "#/$defs/UserSettings" }
      }
    },
    "UserSettings": {
      "type": "object",
      "title": "UserSettings",
      "properties": {
        "emailNotifications": { "type": "boolean" },
        "darkMode": { "type": "boolean" },
        "language": { "type": "string" }
      }
    }
  }
}
```

---

## Best Practices

### 1. Choose the Right Scalar Type

```graphql
# ✅ Good
type User {
  id: ID              # Unique identifier
  email: String       # Text
  age: Int            # Whole number
  rating: Float       # Decimal
  isVerified: Boolean # Yes/no
}

# ❌ Avoid
type User {
  id: String           # Too generic
  email: String        # Actually could be Int? (no validation)
  age: String          # Should be Int
  rating: String       # Should be Float
  isVerified: String   # Should be Boolean ("true"/"false")
}
```

### 2. Use Lists Appropriately

```graphql
# ✅ Good
type Post {
  tags: [String]      # Zero or more tags
  comments: [Comment] # Zero or more comments
}

# ❌ Avoid
type Post {
  tagString: String   # "tag1,tag2,tag3" - hard to parse
  commentCount: Int   # "There are 3 comments, but I can't access them"
}
```

### 3. Money Must Use Int (Cents)

```graphql
# ✅ Good
type Order {
  totalInCents: Int   # 9999 = $99.99
}

# ❌ Wrong
type Order {
  total: Float        # 99.99 (precision loss!)
}
```

### 4. Dates as Strings with Format

```graphql
# ✅ Good
type User {
  createdAt: String    # "2025-12-15T10:30:00Z"
}

# Note: Some schemas use custom Date scalar
# type User {
#   createdAt: DateTime
# }
```

### 5. URLs as Strings

```graphql
# ✅ Good
type User {
  avatar: String       # "https://example.com/avatar.jpg"
  website: String      # "https://example.com"
}
```

---

## Practice Exercises

### Exercise 1: Identify Scalar Types
For each field, what scalar type should it be?

1. A person's height in centimeters
2. Whether a post is published
3. The creation date of an account
4. The number of page views
5. A product SKU (like "PROD-12345")
6. Temperature in Celsius with decimals
7. Whether a user agreed to terms

<details>
<summary>Solution</summary>

1. **Height in cm**: `Int` (whole centimeters)
2. **Published flag**: `Boolean`
3. **Creation date**: `String` (ISO format like "2025-12-15T10:30:00Z")
4. **Page views**: `Int` (whole numbers)
5. **Product SKU**: `String` (mix of letters/numbers)
6. **Temperature with decimals**: `Float` (can be 98.6)
7. **Agreed to terms**: `Boolean`

</details>

### Exercise 2: List or Not?

For each field, should it be a single value or a list?

1. User's favorite color
2. User's favorite colors
3. An article's author
4. An article's authors (multiple people)
5. A comment's text
6. A post's comments

<details>
<summary>Solution</summary>

1. **Favorite color**: Single `String`
2. **Favorite colors**: `[String]` (list)
3. **Article author**: Single `User` (one author)
4. **Article authors**: `[User]` (list of authors)
5. **Comment text**: Single `String`
6. **Post comments**: `[Comment]` (list of comments)

</details>

### Exercise 3: Convert to JSON Schema

Convert this GraphQL type to JSON Schema:

```graphql
type Movie {
  id: ID!
  title: String!
  year: Int!
  rating: Float
  genres: [String]
  directors: [Person]
}
```

<details>
<summary>Solution</summary>

```json
{
  "type": "object",
  "title": "Movie",
  "required": ["id", "title", "year"],
  "properties": {
    "id": { "type": "string" },
    "title": { "type": "string" },
    "year": { "type": "integer" },
    "rating": { "type": "number" },
    "genres": {
      "type": "array",
      "items": { "type": "string" }
    },
    "directors": {
      "type": "array",
      "items": { "$ref": "#/$defs/Person" }
    }
  }
}
```

</details>

---

## Next Steps

**Ready for more advanced concepts?**

1. **Next Module**: [Nullability](/learning/03-nullability)
   - Make fields required or optional
   - Understand `!` notation
   - Handle missing data safely

2. **Then**: [Querying Between Types](/learning/04-querying-between-types)
   - Traverse relationships between types
   - Build complex queries
   - Understand the graph concept

3. **Tools to try**:
   - [Type Visualizer](/tools/type-visualizer) - See types graphically
   - [Schema Validator](/tools/validator) - Check your schemas

---

## Key Takeaways

✅ **Five scalar types**: String, Int, Float, Boolean, ID  
✅ **Use the right type**: Prevents data errors and improves type safety  
✅ **Never use Float for money**: Always use Int with smallest unit  
✅ **Lists with `[]`**: For zero or more items  
✅ **Mix scalars and objects**: Build complex types from simple pieces  

---

## Resources

- [GraphQL Docs - Scalars](https://graphql.org/learn/type-system/#scalars)
- [JSON Schema Docs - Types](https://json-schema.org/understanding-json-schema/reference/type.html)
- [JSON Schema Docs - Arrays](https://json-schema.org/understanding-json-schema/reference/array.html)
- [GraphQL Style Guide - Scalar Types](https://www.apollographql.com/docs/apollo-server/schema/schema/#scalar-types)

---

**Questions?** [Open an issue](https://github.com/json-schema-x-graphql/issues) or check the [FAQ](/help/faq)

Last updated: 2025-12-15
