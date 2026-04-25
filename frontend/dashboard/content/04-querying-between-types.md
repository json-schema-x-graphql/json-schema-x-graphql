# Querying Between Types

## Overview

**What you'll learn:**

- How types reference each other
- Object fields that reference other types
- Following relationships through queries
- Graph traversal (moving between connected types)
- Fragments and nested data fetching
- How JSON Schema models relationships with `$ref`
- The difference between local and remote types

**Why it matters:**
Real data is relational. A user has posts. A post has comments. A comment has an author. GraphQL's ability to query _across_ types—following relationships—is what makes it powerful. You're not just querying fields, you're _traversing a graph_ of connected data.

**Prerequisites:**

- Completed: [Module 1: Introducing Types](/learning/01-introducing-types)
- Completed: [Module 2: Scalars, Objects, Lists](/learning/02-scalars-objects-lists)
- Completed: [Module 3: Nullability](/learning/03-nullability)
- Understand object types and non-null markers

---

## Key Concepts

### What Does "Between Types" Mean?

When one type contains a field that is _another type_, you can query that nested type's fields:

```graphql
# User type references Post type
type User {
  id: ID!
  name: String!
  posts: [Post!]! # <-- This is a different type!
}

type Post {
  id: ID!
  title: String!
  author: User! # <-- References back to User!
}
```

### The Graph Structure

Your schema isn't just types in isolation. It's a **connected graph**:

```
User ←→ Post ←→ Comment
 ↓       ↓        ↓
 |      Author   Author
 |       |        |
 └───────┴────────┘
```

### Following References in Queries

When you query a user, you can ask for related posts. Then in those posts, you can ask for related comments:

```graphql
query {
  user(id: "123") {
    name
    posts {
      title
      comments {
        text
        author {
          name
        }
      }
    }
  }
}
```

**What you're doing:**

1. Start at User (id "123")
2. Follow to Posts (related via user.posts)
3. Follow to Comments (related via post.comments)
4. Follow to Author (related via comment.author)
5. Get Author's name

---

## GraphQL Implementation

### Simple Type Reference

```graphql
type User {
  id: ID!
  name: String!
  email: String!
}

type Post {
  id: ID!
  title: String!
  author: User! # <-- References User type
}

type Query {
  post(id: ID!): Post
}
```

**Query example:**

```graphql
query {
  post(id: "1") {
    title
    author {
      name
      email
    }
  }
}
```

### Multiple Relationships

A type can reference multiple types:

```graphql
type Post {
  id: ID!
  title: String!
  author: User! # Relationship to User
  category: Category! # Relationship to Category
  comments: [Comment!]! # Relationship to Comment
}

type Query {
  post(id: ID!): Post
}
```

**Query:**

```graphql
query {
  post(id: "1") {
    title
    author {
      name
    }
    category {
      name
    }
    comments {
      text
    }
  }
}
```

### Circular References

Types can reference each other (create circles):

```graphql
type User {
  id: ID!
  name: String!
  posts: [Post!]! # User → Post
}

type Post {
  id: ID!
  title: String!
  author: User! # Post → User (circle!)
}
```

**This is fine!** You just need to be careful with circular queries:

```graphql
# ❌ This will loop infinitely
query {
  user(id: "1") {
    posts {
      author {
        posts {
          author {
            posts {
              # ... infinite loop!
            }
          }
        }
      }
    }
  }
}
```

**The solution**: Clients stop requesting at some depth:

```graphql
# ✅ Good - stops after 2 levels
query {
  user(id: "1") {
    posts {
      author {
        name # Stop here, don't ask for author.posts
      }
    }
  }
}
```

### Arguments in Referenced Types

When following to a related type, you can still pass arguments:

```graphql
type User {
  id: ID!
  name: String!
  posts(limit: Int, offset: Int): [Post!]!
}

type Post {
  id: ID!
  title: String!
  comments(approved: Boolean): [Comment!]!
}
```

**Query:**

```graphql
query {
  user(id: "1") {
    posts(limit: 5, offset: 0) {
      title
      comments(approved: true) {
        text
      }
    }
  }
}
```

---

## JSON Schema Implementation

### Using $ref for Relationships

JSON Schema uses `$ref` to reference other types (similar to pointers):

```json
{
  "type": "object",
  "title": "Post",
  "properties": {
    "id": { "type": "string" },
    "title": { "type": "string" },
    "author": { "$ref": "#/$defs/User" }
  },
  "$defs": {
    "User": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "email": { "type": "string" }
      },
      "required": ["id", "name", "email"]
    }
  }
}
```

**What `$ref` means:**

- `#/$defs/User` - Look up the definition called "User" in the same schema
- `#` - Same document
- `/$defs/User` - Path to the User definition

### Lists of Related Types

```json
{
  "type": "object",
  "title": "User",
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "posts": {
      "type": "array",
      "items": { "$ref": "#/$defs/Post" }
    }
  },
  "$defs": {
    "Post": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "title": { "type": "string" }
      }
    }
  }
}
```

### Circular References in JSON Schema

```json
{
  "$defs": {
    "User": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "posts": {
          "type": "array",
          "items": { "$ref": "#/$defs/Post" }
        }
      }
    },
    "Post": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "author": { "$ref": "#/$defs/User" }
      }
    }
  }
}
```

**Note**: The schema defines the structure but doesn't execute queries. Circular refs are fine here.

---

## json-schema-x-graphql Mapping

### Conversion: Type References

**GraphQL:**

```graphql
type User {
  posts: [Post!]!
}

type Post {
  author: User!
}
```

**Converts to JSON Schema:**

```json
{
  "title": "User",
  "properties": {
    "posts": {
      "type": "array",
      "items": { "$ref": "#/$defs/Post" }
    }
  },
  "$defs": {
    "Post": {
      "properties": {
        "author": { "$ref": "#/$defs/User" }
      }
    }
  }
}
```

**Conversion rules:**

- GraphQL type reference → JSON Schema `$ref`
- `Type!` → `{ "$ref": "#/$defs/Type" }`
- `[Type!]!` → Array of `$ref`

### Converter API Usage

```javascript
const converter = new Converter();

const graphqlSchema = `
  type User {
    id: ID!
    posts: [Post!]!
  }
  
  type Post {
    id: ID!
    author: User!
  }
`;

const result = await converter.convert({
  graphql: graphqlSchema,
  options: {
    includeDescriptions: true,
    inferIds: true,
  },
});

// Result includes $defs for User and Post
// With proper $ref links between them
```

### Key Consideration: Circular Reference Handling

The converter handles circular references automatically:

```javascript
// Converter detects User → Post → User cycle
// Keeps both in $defs
// Creates proper $ref relationships
// Adds cycle detection to prevent infinite expansion
```

---

## Real-World Examples

### Example 1: Blog System

**GraphQL:**

```graphql
type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
  category: Category!
  tags: [Tag!]!
  comments: [Comment!]!
  createdAt: String!
}

type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
  comments: [Comment!]!
}

type Comment {
  id: ID!
  text: String!
  author: User!
  post: Post!
  createdAt: String!
}

type Category {
  id: ID!
  name: String!
  posts: [Post!]!
}

type Tag {
  id: ID!
  name: String!
  posts: [Post!]!
}

type Query {
  post(id: ID!): Post
  user(id: ID!): User
  category(id: ID!): Category
}
```

**JSON Schema:**

```json
{
  "$defs": {
    "Post": {
      "type": "object",
      "required": ["id", "title", "content", "author", "category", "tags", "comments", "createdAt"],
      "properties": {
        "id": { "type": "string" },
        "title": { "type": "string" },
        "content": { "type": "string" },
        "author": { "$ref": "#/$defs/User" },
        "category": { "$ref": "#/$defs/Category" },
        "tags": {
          "type": "array",
          "items": { "$ref": "#/$defs/Tag" },
          "minItems": 1
        },
        "comments": {
          "type": "array",
          "items": { "$ref": "#/$defs/Comment" }
        },
        "createdAt": { "type": "string", "format": "date-time" }
      }
    },
    "User": {
      "type": "object",
      "required": ["id", "name", "email", "posts", "comments"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "email": { "type": "string", "format": "email" },
        "posts": {
          "type": "array",
          "items": { "$ref": "#/$defs/Post" }
        },
        "comments": {
          "type": "array",
          "items": { "$ref": "#/$defs/Comment" }
        }
      }
    },
    "Comment": {
      "type": "object",
      "required": ["id", "text", "author", "post", "createdAt"],
      "properties": {
        "id": { "type": "string" },
        "text": { "type": "string" },
        "author": { "$ref": "#/$defs/User" },
        "post": { "$ref": "#/$defs/Post" },
        "createdAt": { "type": "string", "format": "date-time" }
      }
    },
    "Category": {
      "type": "object",
      "required": ["id", "name", "posts"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "posts": {
          "type": "array",
          "items": { "$ref": "#/$defs/Post" }
        }
      }
    },
    "Tag": {
      "type": "object",
      "required": ["id", "name", "posts"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "posts": {
          "type": "array",
          "items": { "$ref": "#/$defs/Post" }
        }
      }
    }
  }
}
```

**Sample query:**

```graphql
query {
  post(id: "1") {
    title
    author {
      name
      email
    }
    category {
      name
    }
    comments {
      text
      author {
        name
      }
    }
  }
}
```

### Example 2: E-Commerce System

**GraphQL:**

```graphql
type Product {
  id: ID!
  name: String!
  price: Int!
  seller: User!
  category: Category!
  reviews: [Review!]!
  inventory: Inventory!
}

type User {
  id: ID!
  name: String!
  email: String!
  products: [Product!]!
  reviews: [Review!]!
}

type Review {
  id: ID!
  text: String!
  rating: Int!
  author: User!
  product: Product!
}

type Category {
  id: ID!
  name: String!
  products: [Product!]!
}

type Inventory {
  id: ID!
  quantity: Int!
  reorderPoint: Int!
  product: Product!
}
```

**Sample query:**

```graphql
query {
  product(id: "123") {
    name
    price
    seller {
      name
      email
    }
    category {
      name
    }
    reviews {
      rating
      text
      author {
        name
      }
    }
    inventory {
      quantity
      reorderPoint
    }
  }
}
```

---

## Common Patterns

### Pattern 1: One-to-Many Relationships

User has many posts:

```graphql
type User {
  posts: [Post!]!
}

type Post {
  author: User!
}
```

Query all posts for a user:

```graphql
query {
  user(id: "1") {
    posts {
      title
      createdAt
    }
  }
}
```

### Pattern 2: Many-to-Many Relationships

Posts have many tags, tags have many posts:

```graphql
type Post {
  tags: [Tag!]!
}

type Tag {
  posts: [Post!]!
}
```

Query posts with specific tag:

```graphql
query {
  tag(id: "trending") {
    posts {
      title
      author {
        name
      }
    }
  }
}
```

### Pattern 3: Polymorphic Responses (Using Interfaces)

Multiple types can implement the same interface:

```graphql
interface Node {
  id: ID!
  createdAt: String!
}

type User implements Node {
  id: ID!
  createdAt: String!
  name: String!
}

type Post implements Node {
  id: ID!
  createdAt: String!
  title: String!
}
```

This allows querying multiple types with shared fields.

### Pattern 4: Pagination on Related Types

Request relationships with limits:

```graphql
type User {
  posts(limit: Int, offset: Int): [Post!]!
  comments(limit: Int): [Comment!]!
}
```

Query:

```graphql
query {
  user(id: "1") {
    posts(limit: 10, offset: 0) {
      title
    }
  }
}
```

---

## Best Practices

### 1. Bidirectional Relationships

If A references B, consider if B should reference A:

```graphql
# ✅ Good - both directions
type User {
  posts: [Post!]!
}

type Post {
  author: User!
}

# ❌ Incomplete
type User {
  posts: [Post!]!
}

type Post {
  title: String!
  # Missing author reference
}
```

### 2. Depth Limits in Queries

Protect against deeply nested queries by setting limits in resolvers:

```javascript
// Pseudo-code for resolver
const resolvePost = (post, args, context) => {
  if (context.depth > 5) {
    throw new Error("Query too deeply nested");
  }
  // ... resolve post
};
```

### 3. Meaningful Field Names

Reference fields should clearly indicate the relationship:

```graphql
# ✅ Clear
type Post {
  author: User!
  reviewer: User # different relationship
  tags: [Tag!]!
}

# ❌ Ambiguous
type Post {
  user: User! # which user?
  users: [User!]! # what do these users do?
}
```

### 4. Balance Between Efficiency and Flexibility

Too many relationships = complex queries. Too few = N+1 problems.

```graphql
# ✅ Balanced
type Post {
  author: User!
  comments: [Comment!]!
}

# ❌ Too many
type Post {
  author: User!
  comments: [Comment!]!
  category: Category!
  tags: [Tag!]!
  relatedPosts: [Post!]! # Too related
}
```

### 5. Use Fragments for Complex Queries

When you reuse field selections, use fragments:

```graphql
fragment UserFields on User {
  id
  name
  email
}

query {
  post(id: "1") {
    title
    author {
      ...UserFields
    }
    comments {
      author {
        ...UserFields
      }
    }
  }
}
```

---

## Practice Exercises

### Exercise 1: Map Relationships

For this schema, draw the relationship graph:

```graphql
type Article {
  id: ID!
  author: User!
  category: Category!
  comments: [Comment!]!
}

type User {
  id: ID!
  articles: [Article!]!
}

type Category {
  id: ID!
  articles: [Article!]!
}

type Comment {
  id: ID!
  author: User!
  article: Article!
}
```

<details>
<summary>Solution</summary>

```
        User
       /    \
      /      \
   Article   Comment
    /  \        |
   /    \       |
  Cat   Comment-Author
```

Or as text:

- User ← → Article (via author/articles)
- User ← → Comment (via author)
- Article ← → Category (via category/articles)
- Article ← → Comment (via comments/article)

</details>

---

### Exercise 2: Write a Query

Write a GraphQL query to get:

- A user with ID "123"
- All their articles
- For each article, the category and comments
- For each comment, the author's name

<details>
<summary>Solution</summary>

```graphql
query {
  user(id: "123") {
    id
    name
    articles {
      id
      title
      category {
        name
      }
      comments {
        text
        author {
          name
        }
      }
    }
  }
}
```

This traverses: User → Articles → Category & Comments → Author

</details>

---

### Exercise 3: Convert to JSON Schema

Convert this GraphQL to JSON Schema with proper $ref relationships:

```graphql
type Order {
  id: ID!
  customer: User!
  items: [OrderItem!]!
  total: Int!
}

type User {
  id: ID!
  name: String!
  orders: [Order!]!
}

type OrderItem {
  id: ID!
  product: Product!
  quantity: Int!
}

type Product {
  id: ID!
  name: String!
  price: Int!
}
```

<details>
<summary>Solution</summary>

```json
{
  "$defs": {
    "Order": {
      "type": "object",
      "required": ["id", "customer", "items", "total"],
      "properties": {
        "id": { "type": "string" },
        "customer": { "$ref": "#/$defs/User" },
        "items": {
          "type": "array",
          "items": { "$ref": "#/$defs/OrderItem" },
          "minItems": 1
        },
        "total": { "type": "integer" }
      }
    },
    "User": {
      "type": "object",
      "required": ["id", "name", "orders"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "orders": {
          "type": "array",
          "items": { "$ref": "#/$defs/Order" }
        }
      }
    },
    "OrderItem": {
      "type": "object",
      "required": ["id", "product", "quantity"],
      "properties": {
        "id": { "type": "string" },
        "product": { "$ref": "#/$defs/Product" },
        "quantity": { "type": "integer", "minimum": 1 }
      }
    },
    "Product": {
      "type": "object",
      "required": ["id", "name", "price"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "price": { "type": "integer", "minimum": 0 }
      }
    }
  }
}
```

All types use `$ref` to reference each other, just like GraphQL references types.

</details>

---

## Migration Guide

### GraphQL to JSON Schema

**Step 1**: Identify all type references in GraphQL

```graphql
type Post {
  author: User! # ← This is a type reference
  comments: [Comment!]! # ← This is a type reference
}
```

**Step 2**: Convert references to `$ref`

```json
{
  "properties": {
    "author": { "$ref": "#/$defs/User" },
    "comments": {
      "type": "array",
      "items": { "$ref": "#/$defs/Comment" }
    }
  }
}
```

**Step 3**: Add all referenced types to `$defs`

```json
{
  "$defs": {
    "User": {
      /* User schema */
    },
    "Comment": {
      /* Comment schema */
    }
  }
}
```

### JSON Schema to GraphQL

**Step 1**: Identify `$ref` properties

```json
{
  "properties": {
    "author": { "$ref": "#/$defs/User" }
  }
}
```

**Step 2**: Convert to type references

```graphql
type Post {
  author: User!
}
```

**Step 3**: Add all referenced types to schema

```graphql
type User {
  // User fields
}

type Post {
  author: User!
}
```

---

## Common Mistakes

| Mistake                      | Problem                          | Fix                                          |
| ---------------------------- | -------------------------------- | -------------------------------------------- |
| Circular infinite queries    | Query never returns              | Set depth limits, client stops at some level |
| Unused type references       | Missing relationships            | Add reverse references (bidirectional)       |
| Missing $ref in JSON Schema  | Types appear duplicated          | Use `$ref` to point to shared definitions    |
| Overly deep relationships    | Complex queries, performance     | Limit how deep queries can go                |
| Breaking circular references | Types can't reference each other | GraphQL and JSON Schema both support circles |

---

## Next Steps

**Ready to continue?**

1. **Next Module**: [Schema](/learning/05-schema)
   - Designing complete, cohesive schemas
   - Root Query type
   - Schema organization

2. **Then**: [Enums](/learning/06-enums)
   - Restricting values to specific options
   - Type-safe status values
   - Better validation

3. **Practice**:
   - Map relationships in your domain
   - Draw a relationship graph
   - Test queries on existing schemas
   - Use [Query Builder](/tools/query-builder) tool

---

## Key Takeaways

✅ **Types reference types** - One type can contain another  
✅ **It's a graph** - All your types form a connected network  
✅ **Query across boundaries** - Follow references in queries  
✅ **Bidirectional relationships** - If A → B, consider B → A  
✅ **Use $ref in JSON Schema** - `$ref: "#/$defs/Type"` points to definitions  
✅ **Circular references are okay** - User ↔ Post ↔ Comment is fine  
✅ **Protect depth** - Set limits on how deep queries can go  
✅ **Fragments reduce repetition** - Reuse field selections with fragments

---

## Resources

- [GraphQL Docs - Object Types](https://graphql.org/learn/type-system/#object-types)
- [JSON Schema - References](https://json-schema.org/understanding-json-schema/structuring.html#ref)
- [GraphQL Patterns - Circular References](https://www.apollographql.com/docs/apollo-server/schema/schema)
- [Query Complexity Analysis](https://www.apollographql.com/docs/apollo-server/performance/query-complexity/)

---

**Questions?** [Open a discussion](https://github.com/json-schema-x-graphql/discussions) or check the [FAQ](/help/faq)

Last updated: 2025-12-15
