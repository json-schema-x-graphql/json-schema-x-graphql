# Schema

## Overview

**What you'll learn:**

- What a schema is and why it matters
- The Query type as the entry point
- Building a complete, cohesive schema
- Schema organization and structure
- Introspection (how clients discover your schema)
- How JSON Schema defines a complete data structure
- Schema validation and documentation
- Versioning schemas

**Why it matters:**
A schema is the contract between your API and its clients. It defines _everything_ - what types exist, what fields they have, what queries are possible. A well-designed schema is clear, consistent, and discoverable. It's the most important part of your API because without it, developers can't use your API effectively.

**Prerequisites:**

- Completed: [Module 1: Introducing Types](/learning/01-introducing-types)
- Completed: [Module 2: Scalars, Objects, Lists](/learning/02-scalars-objects-lists)
- Completed: [Module 3: Nullability](/learning/03-nullability)
- Completed: [Module 4: Querying Between Types](/learning/04-querying-between-types)
- Understand all foundational concepts

---

## Key Concepts

### What Is a Schema?

A **schema** is a complete, formally defined structure of your API. It's like a blueprint for your API, specifying:

- What types exist
- What fields each type has
- What queries are possible
- What data is required vs optional
- How types relate to each other

**Example:**

```graphql
# A complete minimal schema
type Query {
  user(id: ID!): User
}

type User {
  id: ID!
  name: String!
  email: String!
}
```

### The Query Type

Every GraphQL schema must have a **Query type**. This is the root type - the entry point to your API.

```graphql
type Query {
  user(id: ID!): User
  users: [User!]!
  search(query: String!): [User!]!
}
```

**Every GraphQL operation starts here.** You can't query anything outside of what the Query type defines.

### The Complete Picture

A schema is more than just types. It's:

```graphql
# Types
type User { ... }
type Post { ... }

# Entry point (Query)
type Query { ... }

# Modification entry point (optional)
type Mutation { ... }

# Subscriptions (optional)
type Subscription { ... }
```

### Schema as Contract

Think of a schema as a formal contract:

```
API Developer → Schema ← Client Developer
```

**API Developer says:**
"If you follow this schema, I promise to return data in this shape"

**Client Developer relies on:**
"This schema tells me exactly what I can query and what I'll get back"

---

## GraphQL Implementation

### Basic Schema Structure

```graphql
# 1. Define your types
type User {
  id: ID!
  name: String!
  email: String!
  createdAt: String!
}

type Post {
  id: ID!
  title: String!
  author: User!
  createdAt: String!
}

# 2. Define the Query entry point
type Query {
  # Single queries
  user(id: ID!): User
  post(id: ID!): Post

  # List queries
  users: [User!]!
  posts: [Post!]!

  # Search queries
  search(query: String!): [Post!]!
}
```

### Adding Mutations

Mutations let clients _modify_ data (not just read):

```graphql
type Query {
  user(id: ID!): User
  users: [User!]!
}

type Mutation {
  createUser(name: String!, email: String!): User!
  updateUser(id: ID!, name: String): User
  deleteUser(id: ID!): Boolean!

  createPost(title: String!, content: String!): Post!
  updatePost(id: ID!, title: String): Post
  deletePost(id: ID!): Boolean!
}
```

### Complete Schema Example

```graphql
"""
User in the system
"""
type User {
  """
  User's unique identifier
  """
  id: ID!

  """
  User's display name
  """
  name: String!

  """
  User's email address
  """
  email: String!

  """
  User's bio (optional)
  """
  bio: String

  """
  When account was created
  """
  createdAt: String!

  """
  All posts by this user
  """
  posts: [Post!]!
}

"""
Blog post
"""
type Post {
  """
  Post's unique identifier
  """
  id: ID!

  """
  Post title
  """
  title: String!

  """
  Post content
  """
  content: String!

  """
  Who wrote this post
  """
  author: User!

  """
  When post was published
  """
  createdAt: String!

  """
  When post was last updated
  """
  updatedAt: String!

  """
  Comments on this post
  """
  comments: [Comment!]!
}

"""
Comment on a post
"""
type Comment {
  """
  Comment's unique identifier
  """
  id: ID!

  """
  Comment text
  """
  text: String!

  """
  Who wrote this comment
  """
  author: User!

  """
  Which post this is on
  """
  post: Post!

  """
  When comment was posted
  """
  createdAt: String!
}

"""
Root query type - entry point to the API
"""
type Query {
  """
  Get a specific user by ID
  """
  user(id: ID!): User

  """
  Get all users
  """
  users(limit: Int, offset: Int): [User!]!

  """
  Get a specific post by ID
  """
  post(id: ID!): Post

  """
  Get all posts
  """
  posts(limit: Int, offset: Int): [Post!]!

  """
  Search posts by title or content
  """
  search(query: String!): [Post!]!
}

"""
Root mutation type - entry point for modifications
"""
type Mutation {
  """
  Create a new user
  """
  createUser(name: String!, email: String!): User!

  """
  Update user info
  """
  updateUser(id: ID!, name: String, email: String): User

  """
  Delete a user
  """
  deleteUser(id: ID!): Boolean!

  """
  Create a new post
  """
  createPost(title: String!, content: String!): Post!

  """
  Update a post
  """
  updatePost(id: ID!, title: String, content: String): Post

  """
  Delete a post
  """
  deletePost(id: ID!): Boolean!

  """
  Post a comment on a post
  """
  postComment(postId: ID!, text: String!): Comment!
}
```

### Schema Organization

Put your schema in a `.graphql` file:

```graphql
# schema.graphql

# Define scalar types if custom
scalar DateTime

# Define types
type User {
  # fields
}

type Post {
  # fields
}

# Define Query
type Query {
  # queries
}

# Define Mutation
type Mutation {
  # mutations
}
```

Then load it in your API server:

```javascript
// Node.js example
const fs = require("fs");
const { buildSchema } = require("graphql");

const schema = buildSchema(fs.readFileSync("schema.graphql", "utf8"));
```

---

## JSON Schema Implementation

### What JSON Schema Represents

JSON Schema represents the _structure_ of data, while GraphQL schema represents both structure _and_ operations:

```json
// JSON Schema - describes data shape
{
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

### Complete JSON Schema for a Domain

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Blog API Schema",
  "description": "Complete schema for a blogging platform",
  "$defs": {
    "User": {
      "type": "object",
      "title": "User",
      "description": "A user in the system",
      "required": ["id", "name", "email", "createdAt"],
      "properties": {
        "id": {
          "type": "string",
          "description": "Unique identifier"
        },
        "name": {
          "type": "string",
          "description": "Display name"
        },
        "email": {
          "type": "string",
          "format": "email",
          "description": "Email address"
        },
        "bio": {
          "type": "string",
          "description": "User's bio (optional)"
        },
        "createdAt": {
          "type": "string",
          "format": "date-time",
          "description": "Account creation time"
        },
        "posts": {
          "type": "array",
          "items": { "$ref": "#/$defs/Post" },
          "description": "All posts by this user"
        }
      }
    },
    "Post": {
      "type": "object",
      "title": "Post",
      "description": "A blog post",
      "required": [
        "id",
        "title",
        "content",
        "author",
        "createdAt",
        "updatedAt",
        "comments"
      ],
      "properties": {
        "id": {
          "type": "string",
          "description": "Post ID"
        },
        "title": {
          "type": "string",
          "description": "Post title"
        },
        "content": {
          "type": "string",
          "description": "Post content"
        },
        "author": {
          "$ref": "#/$defs/User",
          "description": "Post author"
        },
        "createdAt": {
          "type": "string",
          "format": "date-time"
        },
        "updatedAt": {
          "type": "string",
          "format": "date-time"
        },
        "comments": {
          "type": "array",
          "items": { "$ref": "#/$defs/Comment" },
          "minItems": 0
        }
      }
    },
    "Comment": {
      "type": "object",
      "title": "Comment",
      "required": ["id", "text", "author", "post", "createdAt"],
      "properties": {
        "id": { "type": "string" },
        "text": { "type": "string" },
        "author": { "$ref": "#/$defs/User" },
        "post": { "$ref": "#/$defs/Post" },
        "createdAt": { "type": "string", "format": "date-time" }
      }
    }
  }
}
```

### Key Differences

| Aspect             | GraphQL Schema                               | JSON Schema            |
| ------------------ | -------------------------------------------- | ---------------------- |
| **Purpose**        | Defines API operations                       | Defines data structure |
| **Query/Mutation** | Has Query, Mutation types                    | Only describes data    |
| **Arguments**      | Supports field arguments                     | No arguments           |
| **Required**       | Uses `!` marker                              | `required` array       |
| **Types**          | Scalar, Object, List, Enum, Interface, Union | Limited type system    |
| **Validation**     | Runtime by server                            | Used to validate JSON  |

---

## json-schema-x-graphql Mapping

### Converting GraphQL Schema to JSON Schema

The converter transforms your GraphQL schema to JSON Schema:

```javascript
const converter = new Converter();

const graphqlSchema = `
  type User {
    id: ID!
    name: String!
    email: String!
    posts: [Post!]!
  }

  type Post {
    id: ID!
    title: String!
    author: User!
  }

  type Query {
    user(id: ID!): User
    posts: [Post!]!
  }
`;

const result = await converter.convert({
  graphql: graphqlSchema,
  options: {
    includeDescriptions: true,
  },
});

console.log(result.jsonSchema);
// Returns complete JSON Schema with $defs
```

### What Gets Converted?

✅ **Converted:**

- All custom types → definitions in `$defs`
- Type fields → properties
- Non-null markers → `required` array
- Type references → `$ref`
- Lists → `type: "array"`
- Descriptions → description fields

❌ **Not Converted:**

- Query type arguments (Query type is operation, not data)
- Mutation type (GraphQL operation, not data structure)
- Subscription type (GraphQL operation, not data structure)
- Field arguments (operation-specific)

**Reason**: JSON Schema describes _data_, not _operations_. Query/Mutation are operations, not data types.

### Converter Usage for Complete Schema

```javascript
const converter = new Converter();

// Your complete GraphQL schema
const graphqlSchema = `
  type Query { ... }
  type Mutation { ... }
  type User { ... }
  type Post { ... }
  # ... all types
`;

// Convert
const result = await converter.convert({
  graphql: graphqlSchema,
  options: {
    includeDescriptions: true,
    extractInputTypes: true, // For mutation inputs
  },
});

// Result has:
// - result.jsonSchema - All data types
// - result.metadata - Conversion details
// - result.inputSchemas - For mutation inputs (optional)
```

---

## Real-World Examples

### Example 1: Social Media API

**GraphQL Schema:**

```graphql
type User {
  id: ID!
  username: String!
  email: String!
  avatar: String
  bio: String
  followers: [User!]!
  following: [User!]!
  posts: [Post!]!
  createdAt: String!
}

type Post {
  id: ID!
  content: String!
  author: User!
  likes: [User!]!
  comments: [Comment!]!
  createdAt: String!
  updatedAt: String!
}

type Comment {
  id: ID!
  text: String!
  author: User!
  post: Post!
  likes: [User!]!
  createdAt: String!
}

type Query {
  user(id: ID!): User
  users(limit: Int): [User!]!
  feed: [Post!]!
  post(id: ID!): Post
}

type Mutation {
  createPost(content: String!): Post!
  deletePost(id: ID!): Boolean!
  addComment(postId: ID!, text: String!): Comment!
  followUser(userId: ID!): User!
  unfollowUser(userId: ID!): User!
}
```

### Example 2: E-Commerce API

**GraphQL Schema:**

```graphql
type Product {
  id: ID!
  name: String!
  description: String!
  price: Int!
  category: Category!
  images: [String!]!
  inStock: Boolean!
  reviews: [Review!]!
  seller: User!
}

type Category {
  id: ID!
  name: String!
  products: [Product!]!
}

type Order {
  id: ID!
  customer: User!
  items: [OrderItem!]!
  total: Int!
  status: OrderStatus!
  createdAt: String!
}

type OrderItem {
  id: ID!
  product: Product!
  quantity: Int!
  price: Int!
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}

type User {
  id: ID!
  email: String!
  name: String!
  orders: [Order!]!
}

type Review {
  id: ID!
  text: String!
  rating: Int!
  author: User!
  product: Product!
  createdAt: String!
}

type Query {
  product(id: ID!): Product
  products(category: String, limit: Int): [Product!]!
  categories: [Category!]!
  order(id: ID!): Order
}

type Mutation {
  createOrder(items: [OrderItemInput!]!): Order!
  updateOrderStatus(id: ID!, status: OrderStatus!): Order!
  createReview(productId: ID!, text: String!, rating: Int!): Review!
}

input OrderItemInput {
  productId: ID!
  quantity: Int!
}
```

---

## Common Patterns

### Pattern 1: Root Query Fields

Every query entry point should be a root field:

```graphql
type Query {
  # Single item queries
  user(id: ID!): User
  post(id: ID!): Post

  # List queries
  users: [User!]!
  posts: [Post!]!

  # Search queries
  search(query: String!): [Post!]!

  # Aggregation queries
  userCount: Int!
}
```

### Pattern 2: Mutation Patterns

Mutations should group related operations:

```graphql
type Mutation {
  # Create operations
  createUser(input: CreateUserInput!): User!
  createPost(input: CreatePostInput!): Post!

  # Update operations
  updateUser(id: ID!, input: UpdateUserInput!): User
  updatePost(id: ID!, input: UpdatePostInput!): Post

  # Delete operations
  deleteUser(id: ID!): Boolean!
  deletePost(id: ID!): Boolean!
}

# Input types for grouping arguments
input CreateUserInput {
  name: String!
  email: String!
}

input UpdateUserInput {
  name: String
  email: String
}
```

### Pattern 3: Filtering and Pagination

Provide standard pagination options:

```graphql
type Query {
  posts(limit: Int = 10, offset: Int = 0, published: Boolean): PostConnection!
}

type PostConnection {
  nodes: [Post!]!
  total: Int!
  hasMore: Boolean!
}
```

### Pattern 4: Consistent Errors

Return structured error responses:

```graphql
type Mutation {
  createUser(input: CreateUserInput!): CreateUserResult!
}

union CreateUserResult = User | CreateUserError

type CreateUserError {
  message: String!
  code: String!
}
```

---

## Best Practices

### 1. Start with the Data Model

Design your types first, then build Query around them:

```graphql
# ✅ Start here - define the data
type User { ... }
type Post { ... }
type Comment { ... }

# Then - define how to access it
type Query {
  user(id: ID!): User
  posts: [Post!]!
}

# ❌ Don't - start with Query
type Query {
  # ... immediately putting everything here
}
```

### 2. Keep Query Simple

Query should expose the main entry points, not everything:

```graphql
# ✅ Simple Query
type Query {
  user(id: ID!): User
  posts: [Post!]!
}

# ❌ Overloaded Query
type Query {
  user(id: ID!): User
  users(...): [User!]!
  userByEmail(email: String!): User
  userByUsername(username: String!): User
  # ... 10 more user-related queries
}
```

### 3. Use Input Types for Complex Mutations

Group related arguments:

```graphql
# ✅ Clean
type Mutation {
  createPost(input: CreatePostInput!): Post!
}

input CreatePostInput {
  title: String!
  content: String!
  tags: [String!]
}

# ❌ Verbose
type Mutation {
  createPost(title: String!, content: String!, tags: [String!]): Post!
}
```

### 4. Document Your Schema

Write descriptions for everything:

```graphql
"""
A user in the system. Includes all public profile information
and relationships to posts and comments.
"""
type User {
  """
  Unique identifier
  """
  id: ID!

  """
  User's display name (1-100 characters)
  """
  name: String!

  """
  User's email (must be unique)
  """
  email: String!
}
```

### 5. Version Your Schema Carefully

GraphQL is designed to evolve without versioning:

```graphql
# ✅ Good - add optional field
type User {
  id: ID!
  name: String!
  email: String!
  bio: String # New optional field, backwards compatible
}

# ⚠️ Breaking - remove field
type User {
  id: ID!
  name: String!
  # email: String removed - BREAKS existing queries
}

# ✅ Alternative - deprecate then remove
type User {
  id: ID!
  name: String!
  email: String! @deprecated(reason: "Use primaryEmail")
  primaryEmail: String!
}
```

---

## Practice Exercises

### Exercise 1: Design a Schema

Design a GraphQL schema for a **task management app** with:

- Users
- Projects (owned by users)
- Tasks (in projects)
- Comments (on tasks)
- Due dates and status

Include Query and Mutation types.

<details>
<summary>Solution</summary>

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  projects: [Project!]!
}

type Project {
  id: ID!
  name: String!
  description: String
  owner: User!
  tasks: [Task!]!
  createdAt: String!
}

type Task {
  id: ID!
  title: String!
  description: String
  project: Project!
  status: TaskStatus!
  dueDate: String
  createdAt: String!
  comments: [Comment!]!
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
  BLOCKED
}

type Comment {
  id: ID!
  text: String!
  author: User!
  task: Task!
  createdAt: String!
}

type Query {
  user(id: ID!): User
  project(id: ID!): Project
  task(id: ID!): Task
  projects: [Project!]!
}

type Mutation {
  createProject(name: String!, description: String): Project!
  createTask(projectId: ID!, title: String!, dueDate: String): Task!
  updateTaskStatus(id: ID!, status: TaskStatus!): Task!
  addComment(taskId: ID!, text: String!): Comment!
}
```

</details>

---

### Exercise 2: JSON Schema from GraphQL

Convert the User type to JSON Schema:

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
}
```

<details>
<summary>Solution</summary>

```json
{
  "$defs": {
    "User": {
      "type": "object",
      "required": ["id", "name", "email", "posts"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "email": { "type": "string", "format": "email" },
        "posts": {
          "type": "array",
          "items": { "$ref": "#/$defs/Post" },
          "minItems": 1
        }
      }
    },
    "Post": {
      "type": "object",
      "required": ["id", "title"],
      "properties": {
        "id": { "type": "string" },
        "title": { "type": "string" }
      }
    }
  }
}
```

</details>

---

### Exercise 3: Identify Schema Issues

What problems do you see in this schema?

```graphql
type Query {
  user(id: ID!): User
  post(id: ID!): Post
  comment(id: ID!): Comment
  getCommentsByPostId(postId: ID!): [Comment!]!
  getPostsByUserId(userId: ID!): [Post!]!
  getUserById(id: ID!): User
  getUserByEmail(email: String!): User
  getUserByUsername(username: String!): User
}

type User {
  id: ID!
  username: String
  email: String
  name: String
  posts: [Post]
  comments: [Comment]
}

type Post {
  id: ID!
  title: String!
  content: String!
}

type Comment {
  id: ID!
  text: String!
}
```

<details>
<summary>Solution</summary>

Issues:

1. **Query is overloaded** - Too many similar getters (should just be `user(id:)`, `user(username:)` OR use a search)
2. **Inconsistent naming** - `getCommentsByPostId` vs just `comments`
3. **Missing relationships** - Post should have reference to User (author)
4. **Missing relationships** - Comment should reference Post and User
5. **Nullable required fields** - `username`, `email`, `name` should probably be required
6. **Nullable lists** - `[Post]` can be null - should be `[Post!]!` or just not have null

**Better version:**

```graphql
type Query {
  user(id: ID!): User
  post(id: ID!): Post
  posts: [Post!]!
}

type User {
  id: ID!
  username: String!
  email: String!
  name: String!
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
  comments: [Comment!]!
}

type Comment {
  id: ID!
  text: String!
  author: User!
  post: Post!
}
```

</details>

---

## Migration Guide

### Expanding an Existing Schema

When adding new functionality, follow these patterns:

**Adding a new type:**

1. Define the type
2. Add references from related types
3. Add Query fields to access it
4. Add Mutations if needed

```graphql
# Before
type Post {
  id: ID!
  title: String!
}

# After - add tags
type Post {
  id: ID!
  title: String!
  tags: [Tag!]!
}

type Tag {
  id: ID!
  name: String!
  posts: [Post!]!
}

type Query {
  tag(id: ID!): Tag
  tags: [Tag!]!
}
```

**Adding mutations:**

1. Define input types
2. Add mutation fields
3. Document return types

```graphql
type Mutation {
  createTag(input: CreateTagInput!): Tag!
  updateTag(id: ID!, input: UpdateTagInput!): Tag
}

input CreateTagInput {
  name: String!
  description: String
}

input UpdateTagInput {
  name: String
  description: String
}
```

---

## Common Mistakes

| Mistake                     | Problem                       | Solution                           |
| --------------------------- | ----------------------------- | ---------------------------------- |
| Circular infinite mutations | Mutation changes data forever | Return only necessary data         |
| Query returns everything    | Overfetch, performance issues | Let clients request what they need |
| No Query root               | Invalid schema                | Always define Query type           |
| Unclear naming              | Confusing API                 | Use clear, consistent names        |
| Mutable root fields         | Complex to cache              | Keep Query pure (read-only)        |

---

## Next Steps

**Ready to continue?**

1. **Next Module**: [Enums](/learning/06-enums)
   - Restricting values to specific options
   - Status fields
   - Type-safe enumeration

2. **Then**: [Interfaces & Unions](/learning/07-interfaces-and-unions)
   - Multiple types with shared fields
   - Polymorphic types
   - Complex type hierarchies

3. **Practice**:
   - Design a schema for your domain
   - Write it in a `.graphql` file
   - Test with [Schema Validator](/tools/schema-validator) tool
   - Convert to JSON Schema with converter

---

## Key Takeaways

✅ **Schema is the contract** - Defines everything about your API  
✅ **Query is the entry point** - All queries start in the Query type  
✅ **Mutation modifies data** - Separate concerns from Query  
✅ **Use references** - Types should relate to each other  
✅ **Documentation matters** - Write descriptions for everything  
✅ **Avoid breaking changes** - Add new fields, don't remove old ones  
✅ **Keep it organized** - Logical grouping of types and operations  
✅ **JSON Schema describes data** - GraphQL schema describes operations + data

---

## Resources

- [GraphQL Docs - Schema](https://graphql.org/learn/schema/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [Apollo Server - Schema Design](https://www.apollographql.com/docs/apollo-server/schema/schema)
- [JSON Schema - Structure](https://json-schema.org/understanding-json-schema/)
- [Principled GraphQL - Best Practices](https://principledgraphql.com/)

---

**Questions?** [Open a discussion](https://github.com/json-schema-x-graphql/discussions) or check the [FAQ](/help/faq)

Last updated: 2025-12-15
