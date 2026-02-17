# Nullability

## Overview

**What you'll learn:**

- What null means in data and why it matters
- The non-null type marker (`!`) and how to use it
- Required vs optional fields
- Understanding nullability combinations
- How JSON Schema handles required fields
- Best practices for data integrity
- Designing schemas that prevent errors

**Why it matters:**
Nullability is one of the most powerful features of GraphQL's type system. By marking fields as non-null (`!`), you guarantee to clients that they'll always get a value—no surprises. This prevents bugs, improves user experience, and reduces error handling code.

**Prerequisites:**

- Completed: [Module 1: Introducing Types](/learning/01-introducing-types)
- Completed: [Module 2: Scalars, Objects, Lists](/learning/02-scalars-objects-lists)
- Understand object types, scalar types, and list syntax

---

## Key Concepts

### What is Null?

**Null** is the absence of a value. In programming, it represents "nothing" or "no data."

```graphql
# Examples of null values:
user: null
email: null
orders: null
```

**Real-world analogy**: Like a question on a form that someone didn't fill in, leaving it blank.

### When Fields Can Be Null

By default, **any field can return null**:

```graphql
type User {
  name: String # Could be "John" or null
  email: String # Could be "john@example.com" or null
  age: Int # Could be 25 or null
}
```

**Why allow null?**

- Not all data might be available
- Users might not fill in optional fields
- Data could be deleted
- Information might be incomplete

### Making Fields Non-Nullable

Add an exclamation mark (`!`) to guarantee a value is always present:

```graphql
type User {
  id: ID! # Always has a value (never null)
  name: String! # Always has a value (never null)
  email: String # Can be null (optional)
  age: Int # Can be null (optional)
}
```

**Real-world analogy**: Required fields on a form (marked with `*`) vs optional fields.

### The Power of Non-Null

When you mark a field as non-null (`!`), you're making a **promise** to the client:

> "This field will never be null. You can always expect a value here."

This changes how clients write code. Without the guarantee:

```javascript
// Without guarantee (nullable)
if (user.name != null) {
  console.log(user.name.toUpperCase()); // Need to check first
}
```

With the guarantee:

```javascript
// With guarantee (non-null)
console.log(user.name.toUpperCase()); // Safe to use directly!
```

---

## GraphQL Implementation

### Basic Nullability Syntax

```graphql
# Nullable (can be null or a value)
field: String

# Non-null (must have a value)
field: String!
```

### Lists and Nullability

Nullability gets interesting with lists. The `!` can go in different places:

```graphql
# Different nullability combinations
tags: [String]       # Nullable list of nullable strings
tags: [String!]      # Nullable list of non-null strings
tags: [String]!      # Non-null list of nullable strings
tags: [String!]!     # Non-null list of non-null strings
```

**Reading from outside to inside:**

1. `[String]!` - The **list** cannot be null, but items can be
2. `[String!]` - The **items** cannot be null, but the list can be
3. `[String!]!` - Both the **list and items** cannot be null

### Real-World Examples

```graphql
type User {
  id: ID! # Always has an ID
  email: String! # Email required
  phone: String # Phone optional
  createdAt: String! # Always tracked
}

type Post {
  id: ID! # Post always has ID
  title: String! # Title required
  content: String! # Content required
  tags: [String!]! # Non-empty list of tags
  comments: [Comment!]! # Non-empty list of comments
  author: User! # Author always present
}

type Comment {
  id: ID!
  text: String!
  author: User # Author optional (anonymous comments)
  createdAt: String!
}

type Query {
  user(id: ID!): User # ID required, returns nullable User
  users: [User!]! # Returns non-empty list of users
}
```

---

## JSON Schema Implementation

### Marking Fields as Required

In JSON Schema, required fields are specified in a `required` array:

```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "email": { "type": "string" }
  },
  "required": ["id", "name"]
}
```

**Meaning:**

- `id` is required (non-null equivalent)
- `name` is required (non-null equivalent)
- `email` is optional (nullable equivalent)

### Explicitly Allowing Null

If you want to explicitly allow null, use the `nullable` keyword (though it's less common):

```json
{
  "type": ["string", "null"],
  "description": "Can be string or null"
}
```

Or in newer JSON Schema drafts:

```json
{
  "type": "string",
  "nullable": true
}
```

### Array Requirements

For arrays, you control whether the list itself can be null:

```json
{
  "type": "array",
  "items": { "type": "string" }
  // This array can be null by default
}

{
  "type": "array",
  "items": { "type": "string" },
  "minItems": 1  // At least 1 item (non-empty)
}
```

### Complete Example

```json
{
  "type": "object",
  "title": "User",
  "required": ["id", "email", "createdAt"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier"
    },
    "email": {
      "type": "string",
      "format": "email",
      "description": "Email address (required)"
    },
    "phone": {
      "type": ["string", "null"],
      "description": "Phone number (optional)"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time",
      "description": "Account creation time"
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 0,
      "description": "List of tags"
    }
  }
}
```

---

## json-schema-x-graphql Mapping

### Conversion Rules

**GraphQL → JSON Schema:**

```
Field!    →  Add to required array
Field     →  Not in required array
[Type!]!  →  array with minItems: 1
[Type!]   →  array (items non-null)
[Type]!   →  array required, items nullable
[Type]    →  array nullable, items nullable
```

**JSON Schema → GraphQL:**

```
In required array     →  Add !
Not in required       →  No ! (nullable)
minItems: 1           →  [Type]!
type: "array"         →  [Type] syntax
```

### Converter Configuration

```javascript
const converter = new Converter();
const result = await converter.convert({
  jsonSchema: schema,
  options: {
    includeDescriptions: true,
    preserveFieldOrder: true,
    validate: false,
    inferIds: true,
  },
});
```

The converter:

- ✅ Detects `required` arrays
- ✅ Converts to `!` syntax in GraphQL
- ✅ Handles list nullability
- ✅ Preserves field descriptions

---

## Real-World Examples

### Example 1: E-Commerce Product

**GraphQL:**

```graphql
type Product {
  id: ID! # Always present
  name: String! # Required
  description: String # Optional
  price: Int! # Required in cents
  discountedPrice: Int # Optional (if on sale)
  inStock: Boolean! # Always tracked
  inventory: Int! # Must know stock
  tags: [String!]! # Non-empty required tags
  images: [String!]! # Must have at least cover
  reviews: [Review!]! # Reviews if product exists
  seller: User! # Always has seller
}

type Query {
  product(id: ID!): Product # ID required, product could be null
  products: [Product!]! # Always returns list of products
}
```

**JSON Schema:**

```json
{
  "type": "object",
  "title": "Product",
  "required": [
    "id",
    "name",
    "price",
    "inStock",
    "inventory",
    "tags",
    "images",
    "reviews",
    "seller"
  ],
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "description": { "type": "string" },
    "price": { "type": "integer", "minimum": 0 },
    "discountedPrice": { "type": "integer" },
    "inStock": { "type": "boolean" },
    "inventory": { "type": "integer", "minimum": 0 },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1
    },
    "images": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1
    },
    "reviews": {
      "type": "array",
      "items": { "$ref": "#/$defs/Review" },
      "minItems": 1
    },
    "seller": { "$ref": "#/$defs/User" }
  }
}
```

### Example 2: Blog System

**GraphQL:**

```graphql
type Post {
  id: ID! # Always has ID
  title: String! # Title required
  slug: String! # URL slug required
  content: String! # Content required
  excerpt: String # Optional summary
  author: User! # Always has author
  createdAt: String! # Always tracked
  updatedAt: String! # Always tracked
  publishedAt: String # Optional (draft vs published)
  tags: [String!]! # Always has tags
  comments: [Comment!]! # Always has comments list
}

type Comment {
  id: ID!
  text: String!
  author: User # Anonymous OK (optional author)
  createdAt: String!
  approved: Boolean! # Always tracked
}

type Query {
  post(id: ID!): Post # Post might not exist
  posts(published: Boolean!): [Post!]! # Query requires boolean
}
```

---

## Common Patterns

### Pattern 1: Entity IDs Are Always Non-Null

Every entity should have a required ID:

```graphql
# ✅ Good
type User {
  id: ID! # Always non-null
  name: String!
}

# ❌ Wrong
type User {
  id: ID # ID should be required!
  name: String
}
```

**Why**: IDs uniquely identify entities. A null ID is meaningless.

### Pattern 2: Core Properties Are Non-Null

Essential properties that define the entity should be non-null:

```graphql
# ✅ Good
type User {
  id: ID! # Core
  email: String! # Core
  name: String! # Core
  bio: String # Optional
  avatar: String # Optional
}

# Reasoning:
# Can't have a user without ID, email, or name
# Can have a user without bio or avatar
```

### Pattern 3: Nullable Lists for Cardinality

Return null when the relationship doesn't exist:

```graphql
# User has 0 or more posts
type User {
  posts: [Post!]! # Empty array or list of posts
}

# Author is required for a post
type Post {
  author: User! # Always has author
}
```

### Pattern 4: Timestamps Are Always Present

Track when things happen:

```graphql
type Post {
  id: ID!
  createdAt: String! # Always tracked
  updatedAt: String! # Always tracked
  publishedAt: String # Optional (only if published)
  deletedAt: String # Optional (only if deleted)
}
```

---

## Best Practices

### 1. Default to Non-Null

Make fields non-null unless there's a specific reason they could be missing:

```graphql
# ✅ Better
type User {
  id: ID!
  email: String!
  name: String!
  bio: String # Intentionally optional
}

# ❌ Risky
type User {
  id: ID
  email: String
  name: String
  bio: String
}
```

**Why**: Null propagates errors up the query. Non-null fields prevent this.

### 2. Non-Null Propagation

If a field is non-null and it becomes null, the entire parent becomes null:

```graphql
type Post {
  id: ID!
  title: String!
}

type Query {
  posts: [Post!]! # List contains non-null items
}

# If any post's title becomes null,
# that post is removed from list
# List never contains null items
```

### 3. Empty Lists vs Null Lists

Return empty list instead of null:

```graphql
# ✅ Good
type User {
  posts: [Post!]! # Empty list if no posts, never null
}

# ❌ Less ideal
type User {
  posts: [Post!] # Null or list - inconsistent
}
```

### 4. Distinguish Between "Not Found" and "Not Applicable"

```graphql
type Query {
  user(id: ID!): User # Null if not found
  post(slug: String!): Post # Null if not found
}

type User {
  email: String! # Always has email
  phone: String # May not have provided
  premiumUntil: String # Null if not premium
}
```

### 5. Document Nullability

Always explain why something is nullable:

```graphql
type User {
  id: ID! # Unique identifier, always present
  email: String! # Required for account
  phone: String # Optional, user may not provide
  bio: String # Optional, can be empty profile
  deletedAt: String # Present only if user deleted
}
```

---

## Practice Exercises

### Exercise 1: Identify Nullability

For each field, determine if it should be nullable or non-nullable:

1. User's unique ID
2. Post's title
3. User's middle name
4. Post's author
5. Comment's author (anonymous allowed)
6. Product's price
7. User's preferences
8. Blog's URL

<details>
<summary>Solution</summary>

1. **User's ID**: Non-null `ID!` - Unique identifier must exist
2. **Post's title**: Non-null `String!` - Core property
3. **User's middle name**: Nullable `String` - Optional name part
4. **Post's author**: Non-null `User!` - Posts always have authors
5. **Comment's author**: Nullable `User` - Anonymous comments allowed
6. **Product's price**: Non-null `Int!` - Must know price
7. **User's preferences**: Non-null `Preferences!` - Has default preferences
8. **Blog's URL**: Non-null `String!` - Required property

</details>

---

### Exercise 2: Nullability Combinations

What does each combination mean?

```graphql
1. tags: [String]
2. tags: [String!]
3. tags: [String]!
4. tags: [String!]!
```

<details>
<summary>Solution</summary>

1. **`tags: [String]`**
   - List can be null
   - Items can be null
   - Result: `null` or `["a", null, "c"]`

2. **`tags: [String!]`**
   - List can be null
   - Items cannot be null
   - Result: `null` or `["a", "b", "c"]` (no nulls inside)

3. **`tags: [String]!`**
   - List cannot be null
   - Items can be null
   - Result: `[]` or `["a", null, "c"]` (list always present, might have nulls)

4. **`tags: [String!]!`**
   - List cannot be null
   - Items cannot be null
   - Result: `[]` or `["a", "b", "c"]` (guaranteed non-empty values)

</details>

---

### Exercise 3: Convert to JSON Schema

Convert this GraphQL type to JSON Schema, marking required fields:

```graphql
type Article {
  id: ID!
  title: String!
  content: String!
  excerpt: String
  published: Boolean!
  tags: [String!]!
  author: User!
}
```

<details>
<summary>Solution</summary>

```json
{
  "type": "object",
  "title": "Article",
  "required": ["id", "title", "content", "published", "tags", "author"],
  "properties": {
    "id": { "type": "string" },
    "title": { "type": "string" },
    "content": { "type": "string" },
    "excerpt": { "type": "string" },
    "published": { "type": "boolean" },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1
    },
    "author": { "$ref": "#/$defs/User" }
  }
}
```

Key differences:

- Required fields go in `required` array: id, title, content, published, tags, author
- Optional fields (excerpt) are NOT in required array
- Arrays with minItems represent `[Type!]!`

</details>

---

## Migration Guide

### GraphQL to JSON Schema

**Step 1**: Identify all non-null fields (those with `!`)

**Step 2**: Add them to the `required` array

**Step 3**: For list fields with `!`, add `minItems: 1`

**Example:**

```graphql
type Post {
  id: ID!
  title: String!
  tags: [String!]!
  comments: [Comment]
}
```

↓

```json
{
  "type": "object",
  "title": "Post",
  "required": ["id", "title", "tags", "comments"],
  "properties": {
    "id": { "type": "string" },
    "title": { "type": "string" },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1
    },
    "comments": {
      "type": "array",
      "items": { "$ref": "#/$defs/Comment" }
    }
  }
}
```

### JSON Schema to GraphQL

**Step 1**: Check `required` array

**Step 2**: Add `!` to fields in required array

**Step 3**: For arrays with `minItems: 1`, use `[Type]!` or `[Type!]!`

**Example:**

```json
{
  "type": "object",
  "title": "Post",
  "required": ["id", "title", "tags"],
  "properties": {
    "id": { "type": "string" },
    "title": { "type": "string" },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1
    }
  }
}
```

↓

```graphql
type Post {
  id: ID!
  title: String!
  tags: [String!]!
}
```

---

## Common Mistakes

| Mistake                           | Problem                         | Fix                            |
| --------------------------------- | ------------------------------- | ------------------------------ |
| All fields nullable               | Clients can't rely on data      | Mark important fields with `!` |
| All fields non-null               | Inflexible schema               | Allow null for optional data   |
| Misunderstanding list nullability | Wrong assumptions about data    | Test all 4 combinations        |
| Nullable IDs                      | Meaningless entities            | Always use `ID!`               |
| Inconsistent list handling        | Some endpoints empty, some null | Always return empty list       |

---

## Next Steps

**Ready to move forward?**

1. **Next Module**: [Querying Between Types](/learning/04-querying-between-types)
   - How types relate to each other
   - Graph traversal
   - Complex queries

2. **Then**: [Schema](/learning/05-schema)
   - Building complete, well-designed schemas
   - Schema introspection
   - Documentation

3. **Practice**:
   - Review your own schemas
   - Mark which fields should be non-null
   - Think about why each field might be null
   - Test with [Nullability Checker](/tools/nullability-checker) tool

---

## Key Takeaways

✅ **Default to non-null** - Add `!` to most fields, except intentionally optional ones  
✅ **Nullability is a promise** - Non-null fields guarantee data to clients  
✅ **Null propagates** - If a non-null field becomes null, the parent becomes null  
✅ **Empty lists are better** - Return `[]` instead of `null` for lists  
✅ **Document why** - Explain why each field is nullable or non-null  
✅ **IDs and core properties** - Always use `!` for these  
✅ **JSON Schema uses `required`** - Mark required fields in the array

---

## Resources

- [GraphQL Docs - Nullability](https://graphql.org/learn/type-system/#lists-and-non-null)
- [JSON Schema - Required Properties](https://json-schema.org/understanding-json-schema/reference/object.html#required)
- [Apollo Docs - Schema Design](https://www.apollographql.com/docs/apollo-server/schema/schema)
- [Best Practices - Nullable Types](https://principledgraphql.com/)

---

**Questions?** [Open a discussion](https://github.com/json-schema-x-graphql/discussions) or check the [FAQ](/help/faq)

Last updated: 2025-12-15
