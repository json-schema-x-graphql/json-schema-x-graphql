# Interfaces & Unions

## Overview

**What you'll learn:**

- What interfaces are and how they work
- Shared fields across multiple types
- Implementing interfaces
- Querying interface types
- What unions are and when to use them
- The difference between interfaces and unions
- Polymorphic responses
- Real-world interface and union patterns

**Why it matters:**
Real-world systems have types that share common fields. A blog system might have Posts and Videos that both need ID, title, and author. Instead of duplicating these fields in every type, interfaces let you define shared fields once. Unions let you return different types from the same query. Together, they enable powerful, expressive APIs that reduce duplication and handle complex scenarios elegantly.

**Prerequisites:**

- Completed: [Module 1: Introducing Types](/learning/01-introducing-types)
- Completed: [Module 2: Scalars, Objects, Lists](/learning/02-scalars-objects-lists)
- Completed: [Module 3: Nullability](/learning/03-nullability)
- Completed: [Module 4: Querying Between Types](/learning/04-querying-between-types)
- Completed: [Module 5: Schema](/learning/05-schema)
- Completed: [Module 6: Enums](/learning/06-enums)
- Understand object types and type composition

---

## Key Concepts

### What Is an Interface?

An **interface** is a set of fields that multiple types must implement. It's like a contract: "If you implement this interface, you must have these fields."

```graphql
# Define the interface
interface Content {
  id: ID!
  title: String!
  author: User!
  createdAt: String!
}

# Implement it in types
type BlogPost implements Content {
  id: ID!
  title: String!
  author: User!
  createdAt: String!
  content: String! # Additional field
}

type Video implements Content {
  id: ID!
  title: String!
  author: User!
  createdAt: String!
  duration: Int! # Additional field
}
```

### What Is a Union?

A **union** is a type that can be one of several different types. It's like saying "this field could be a Post OR a Video OR a Comment."

```graphql
union SearchResult = BlogPost | Video | Comment

type Query {
  search(query: String!): [SearchResult!]!
}
```

### Interface vs Union

| Aspect       | Interface                        | Union                               |
| ------------ | -------------------------------- | ----------------------------------- |
| **Purpose**  | Share common fields              | Handle alternatives                 |
| **Fields**   | All implementing types have them | Each type has its own fields        |
| **Use when** | Multiple types share structure   | Type could be different shapes      |
| **Example**  | Node (id, createdAt)             | SearchResult (Post, Video, Comment) |

---

## GraphQL Implementation

### Defining Interfaces

```graphql
interface Node {
  id: ID!
  createdAt: String!
}

interface Content {
  id: ID!
  title: String!
  author: User!
  createdAt: String!
}
```

### Implementing Interfaces

```graphql
type BlogPost implements Content {
  id: ID! # From interface
  title: String! # From interface
  author: User! # From interface
  createdAt: String! # From interface
  content: String! # Specific to BlogPost
  tags: [String!]!
}

type Video implements Content {
  id: ID! # From interface
  title: String! # From interface
  author: User! # From interface
  createdAt: String! # From interface
  duration: Int! # Specific to Video
  thumbnailUrl: String!
}

type Podcast implements Content {
  id: ID! # From interface
  title: String! # From interface
  author: User! # From interface
  createdAt: String! # From interface
  duration: Int!
  audioUrl: String!
}
```

### Multiple Interfaces

A type can implement multiple interfaces:

```graphql
interface Node {
  id: ID!
}

interface Authored {
  author: User!
  createdAt: String!
}

type BlogPost implements Node & Authored {
  id: ID!
  author: User!
  createdAt: String!
  title: String!
  content: String!
}
```

### Querying Interfaces

```graphql
type Query {
  content(id: ID!): Content # Returns any Content type
  allContent: [Content!]! # List of mixed types
}
```

**Query example:**

```graphql
query {
  allContent {
    id
    title
    author {
      name
    }
    # Can't access video-specific or post-specific fields here

    ... on BlogPost {
      content
      tags
    }

    ... on Video {
      duration
      thumbnailUrl
    }
  }
}
```

### Defining Unions

```graphql
union SearchResult = BlogPost | Video | Comment | User

union MediaItem = Photo | Video | Document
```

### Querying Unions

```graphql
type Query {
  search(query: String!): [SearchResult!]!
}

query {
  search(query: "graphql") {
    # Can't access common fields (union types might not have them)

    ... on BlogPost {
      title
      content
      author {
        name
      }
    }

    ... on Video {
      title
      duration
      thumbnailUrl
    }

    ... on Comment {
      text
      author {
        name
      }
    }

    ... on User {
      name
      email
    }
  }
}
```

### Querying `__typename`

Get the actual type of an interface/union result:

```graphql
query {
  allContent {
    __typename # Returns "BlogPost", "Video", etc.
    id
    title
  }
}
```

Response:

```json
{
  "data": {
    "allContent": [
      {
        "__typename": "BlogPost",
        "id": "1",
        "title": "GraphQL Guide"
      },
      {
        "__typename": "Video",
        "id": "2",
        "title": "GraphQL Tutorial"
      }
    ]
  }
}
```

---

## JSON Schema Implementation

### JSON Schema Doesn't Have Interfaces

JSON Schema has limited support for polymorphism. Common approaches:

**Approach 1: Using `oneOf`**

```json
{
  "oneOf": [
    { "$ref": "#/$defs/BlogPost" },
    { "$ref": "#/$defs/Video" },
    { "$ref": "#/$defs/Comment" }
  ]
}
```

**Approach 2: Using `type` discrimination**

```json
{
  "type": "object",
  "discriminator": {
    "propertyName": "type",
    "mapping": {
      "post": "#/$defs/BlogPost",
      "video": "#/$defs/Video"
    }
  },
  "properties": {
    "type": {
      "type": "string",
      "enum": ["post", "video", "comment"]
    },
    "id": { "type": "string" },
    "title": { "type": "string" }
  }
}
```

**Approach 3: Shared base + extensions**

```json
{
  "$defs": {
    "Content": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "title": { "type": "string" },
        "author": { "$ref": "#/$defs/User" },
        "createdAt": { "type": "string", "format": "date-time" }
      },
      "required": ["id", "title", "author", "createdAt"]
    },
    "BlogPost": {
      "allOf": [
        { "$ref": "#/$defs/Content" },
        {
          "type": "object",
          "properties": {
            "content": { "type": "string" },
            "tags": { "type": "array", "items": { "type": "string" } }
          }
        }
      ]
    },
    "Video": {
      "allOf": [
        { "$ref": "#/$defs/Content" },
        {
          "type": "object",
          "properties": {
            "duration": { "type": "integer" },
            "thumbnailUrl": { "type": "string" }
          }
        }
      ]
    }
  }
}
```

---

## json-schema-x-graphql Mapping

### Converting Interfaces to JSON Schema

**GraphQL:**

```graphql
interface Content {
  id: ID!
  title: String!
  author: User!
}

type BlogPost implements Content {
  id: ID!
  title: String!
  author: User!
  content: String!
}

type Video implements Content {
  id: ID!
  title: String!
  author: User!
  duration: Int!
}
```

**Converts to JSON Schema:**

```json
{
  "$defs": {
    "Content": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "title": { "type": "string" },
        "author": { "$ref": "#/$defs/User" }
      },
      "required": ["id", "title", "author"]
    },
    "BlogPost": {
      "allOf": [
        { "$ref": "#/$defs/Content" },
        {
          "type": "object",
          "properties": {
            "content": { "type": "string" }
          },
          "required": ["content"]
        }
      ]
    },
    "Video": {
      "allOf": [
        { "$ref": "#/$defs/Content" },
        {
          "type": "object",
          "properties": {
            "duration": { "type": "integer" }
          },
          "required": ["duration"]
        }
      ]
    }
  }
}
```

### Converting Unions to JSON Schema

**GraphQL:**

```graphql
union SearchResult = BlogPost | Video | Comment
```

**Converts to JSON Schema:**

```json
{
  "SearchResult": {
    "oneOf": [
      { "$ref": "#/$defs/BlogPost" },
      { "$ref": "#/$defs/Video" },
      { "$ref": "#/$defs/Comment" }
    ]
  }
}
```

---

## Real-World Examples

### Example 1: Content Management System

**GraphQL:**

```graphql
interface Content {
  id: ID!
  title: String!
  description: String!
  author: User!
  createdAt: String!
  updatedAt: String!
  published: Boolean!
}

type Article implements Content {
  id: ID!
  title: String!
  description: String!
  author: User!
  createdAt: String!
  updatedAt: String!
  published: Boolean!
  body: String!
  category: String!
}

type Video implements Content {
  id: ID!
  title: String!
  description: String!
  author: User!
  createdAt: String!
  updatedAt: String!
  published: Boolean!
  url: String!
  duration: Int!
  transcript: String
}

type Image implements Content {
  id: ID!
  title: String!
  description: String!
  author: User!
  createdAt: String!
  updatedAt: String!
  published: Boolean!
  url: String!
  width: Int!
  height: Int!
  altText: String!
}

type Query {
  content(id: ID!): Content
  allContent(published: Boolean): [Content!]!

  articles: [Article!]!
  videos: [Video!]!
  images: [Image!]!
}
```

**Query example:**

```graphql
query {
  allContent {
    id
    title
    author {
      name
    }

    ... on Article {
      body
      category
    }

    ... on Video {
      url
      duration
    }

    ... on Image {
      url
      altText
    }
  }
}
```

### Example 2: Search Results with Union

**GraphQL:**

```graphql
union SearchResult = Article | User | Comment | Tag

type Query {
  search(query: String!, type: SearchType): [SearchResult!]!
}

enum SearchType {
  ALL
  ARTICLES
  USERS
  COMMENTS
  TAGS
}

query {
  search(query: "graphql", type: ALL) {
    ... on Article {
      id
      title
      body
    }

    ... on User {
      id
      name
      email
    }

    ... on Comment {
      id
      text
      author { name }
    }

    ... on Tag {
      id
      name
      count: Int!
    }
  }
}
```

---

## Common Patterns

### Pattern 1: Node Interface for All Types

Make every type implement a Node interface:

```graphql
interface Node {
  id: ID!
}

type User implements Node {
  id: ID!
  name: String!
}

type Post implements Node {
  id: ID!
  title: String!
}

type Query {
  node(id: ID!): Node
}

query {
  node(id: "123") {
    id

    ... on User {
      name
    }
    ... on Post {
      title
    }
  }
}
```

### Pattern 2: Timestamped Interface

Share common timestamp fields:

```graphql
interface Timestamped {
  createdAt: String!
  updatedAt: String!
  deletedAt: String
}

type User implements Timestamped {
  id: ID!
  name: String!
  createdAt: String!
  updatedAt: String!
  deletedAt: String
}

type Post implements Timestamped {
  id: ID!
  title: String!
  createdAt: String!
  updatedAt: String!
  deletedAt: String
}
```

### Pattern 3: Hierarchical Search Results

```graphql
union SearchResult = Document | Folder | Image | Video | User

type Query {
  search(query: String!, limit: Int): [SearchResult!]!
}
```

---

## Best Practices

### 1. Use Interfaces for Shared Structure

```graphql
# ✅ Good - shared fields in interface
interface Entity {
  id: ID!
  createdAt: String!
}

type User implements Entity { ... }
type Post implements Entity { ... }

# ❌ Bad - repeated fields
type User {
  id: ID!
  createdAt: String!
  ...
}

type Post {
  id: ID!
  createdAt: String!
  ...
}
```

### 2. Use Unions for Type Alternatives

```graphql
# ✅ Good - union for different types
union SearchResult = Article | Video | User

# ❌ Bad - optional fields that are mutually exclusive
type SearchResult {
  article: Article
  video: Video
  user: User
  # Could have all null, or all populated
}
```

### 3. Use `__typename` for Client Logic

```graphql
query {
  allContent {
    __typename # Use this to determine type on client
    id
    title

    ... on BlogPost {
      content
    }
    ... on Video {
      duration
    }
  }
}
```

### 4. Design Interfaces With Query Intent

```graphql
# ✅ Good - interface matches query intent
interface Content {
  id: ID!
  title: String!
  description: String!
}

# ❌ Too minimal
interface Content {
  id: ID!
}

# ❌ Too specific
interface Content {
  id: ID!
  title: String!
  description: String!
  author: User!
  createdAt: String!
  updatedAt: String!
  tags: [String!]!
}
```

### 5. Keep Union Members Specific

```graphql
# ✅ Clear intent
union PaymentResult = Payment | PaymentError

# ❌ Too broad
union PaymentResult = Payment | Order | User | Error
```

---

## Practice Exercises

### Exercise 1: Design Interfaces

Design an interface for a "Person" type that could be implemented by different user types (Employee, Customer, Admin):

<details>
<summary>Solution</summary>

```graphql
interface Person {
  id: ID!
  name: String!
  email: String!
  phone: String
  createdAt: String!
}

type Employee implements Person {
  id: ID!
  name: String!
  email: String!
  phone: String
  createdAt: String!
  employeeId: String!
  department: String!
  salary: Int!
}

type Customer implements Person {
  id: ID!
  name: String!
  email: String!
  phone: String
  createdAt: String!
  customerId: String!
  subscriptionStatus: SubscriptionStatus!
}

type Admin implements Person {
  id: ID!
  name: String!
  email: String!
  phone: String
  createdAt: String!
  adminLevel: AdminLevel!
  permissions: [String!]!
}

enum SubscriptionStatus {
  ACTIVE
  INACTIVE
  CANCELLED
}

enum AdminLevel {
  SUPER_ADMIN
  ADMIN
  MODERATOR
}
```

</details>

---

### Exercise 2: Design a Union

Design a union for a notification system that can return different types of notifications:

<details>
<summary>Solution</summary>

```graphql
union Notification =
  | CommentNotification
  | FollowNotification
  | LikeNotification
  | SystemNotification

type CommentNotification {
  id: ID!
  message: String!
  post: Post!
  comment: Comment!
  createdAt: String!
}

type FollowNotification {
  id: ID!
  message: String!
  follower: User!
  createdAt: String!
}

type LikeNotification {
  id: ID!
  message: String!
  post: Post!
  user: User!
  createdAt: String!
}

type SystemNotification {
  id: ID!
  title: String!
  message: String!
  level: NotificationLevel!
  createdAt: String!
}

enum NotificationLevel {
  INFO
  WARNING
  ERROR
}

type Query {
  notifications(userId: ID!): [Notification!]!
}
```

</details>

---

### Exercise 3: Query With Fragments

Write a query for this schema using inline fragments:

```graphql
interface Animal {
  id: ID!
  name: String!
}

type Dog implements Animal {
  id: ID!
  name: String!
  breed: String!
}

type Cat implements Animal {
  id: ID!
  name: String!
  color: String!
}

type Query {
  animals: [Animal!]!
}
```

<details>
<summary>Solution</summary>

```graphql
query {
  animals {
    id
    name

    ... on Dog {
      breed
    }

    ... on Cat {
      color
    }
  }
}

# Response:
{
  "data": {
    "animals": [
      {
        "id": "1",
        "name": "Rex",
        "breed": "Labrador"
      },
      {
        "id": "2",
        "name": "Whiskers",
        "color": "Orange"
      }
    ]
  }
}
```

</details>

---

## Migration Guide

### Adding an Interface to Existing Types

**Before:**

```graphql
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
```

**Step 1**: Extract common fields to interface

```graphql
interface Entity {
  id: ID!
  createdAt: String!
}
```

**Step 2**: Update types to implement interface

```graphql
type User implements Entity {
  id: ID!
  name: String!
  email: String!
  createdAt: String!
}

type Post implements Entity {
  id: ID!
  title: String!
  author: User!
  createdAt: String!
}
```

**Step 3**: Update queries to use interface

```graphql
type Query {
  entity(id: ID!): Entity # Could be User or Post
}
```

---

## Common Mistakes

| Mistake                             | Problem                        | Fix                                    |
| ----------------------------------- | ------------------------------ | -------------------------------------- |
| Using interface when union needed   | Can't handle different fields  | Use union for type alternatives        |
| Union instead of interface          | Can't query common fields      | Use interface for shared structure     |
| Not using `__typename`              | Client can't distinguish types | Always include `__typename` in queries |
| Circular interface implementations  | Overly complex                 | Keep interfaces focused                |
| Interface without consistent fields | Defeats purpose                | Ensure all implementations match       |

---

## Next Steps

**Ready to continue?**

1. **Next Module**: [Arguments](/learning/08-arguments)
   - Powerful query parameters
   - Input types for complex arguments
   - Filtering and pagination

2. **Then**: [Mutations](/learning/09-mutations)
   - Writing data (not just reading)
   - State changes
   - Advanced patterns

3. **Practice**:
   - Identify shared fields in your domain
   - Create interfaces for them
   - Design polymorphic queries
   - Use [Type Visualizer](/tools/type-visualizer) tool

---

## Key Takeaways

✅ **Interfaces share structure** - Common fields across types  
✅ **Unions handle alternatives** - Type could be different shapes  
✅ **Implement interfaces** - Types must have all interface fields  
✅ **Query with fragments** - `... on Type { fields }`  
✅ **Use `__typename`** - Know which type you got back  
✅ **Reduce duplication** - Interfaces prevent repeated fields  
✅ **Support polymorphism** - Return different types from one query  
✅ **Easier evolution** - Add types implementing interface without breaking

---

## Resources

- [GraphQL Docs - Interfaces](https://graphql.org/learn/type-system/#interfaces)
- [GraphQL Docs - Unions](https://graphql.org/learn/type-system/#unions)
- [JSON Schema - OneOf](https://json-schema.org/understanding-json-schema/reference/combining.html#oneof)
- [Apollo Docs - Interfaces & Unions](https://www.apollographql.com/docs/apollo-server/schema/schema/#interfaces)

---

**Questions?** [Open a discussion](https://github.com/json-schema-x-graphql/discussions) or check the [FAQ](/help/faq)

Last updated: 2025-12-15
