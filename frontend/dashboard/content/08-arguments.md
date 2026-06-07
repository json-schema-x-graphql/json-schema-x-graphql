# Arguments

## Overview

**What you'll learn:**

- What arguments are and how they work
- Field arguments vs type arguments
- Input types for complex arguments
- Variables for reusable queries
- Default values
- Argument validation
- Filtering, sorting, and pagination patterns
- How JSON Schema validates arguments

**Why it matters:**
Arguments let you make queries dynamic. Instead of hardcoding queries for every case, you pass parameters—like searching, filtering, sorting, and paginating. They're the knobs and dials of your API, letting clients customize exactly what they ask for. Well-designed arguments make your API powerful and flexible.

**Prerequisites:**

- Completed: [Module 1-5 (Core Concepts)](/learning/01-introducing-types)
- Completed: [Module 6: Enums](/learning/06-enums)
- Completed: [Module 7: Interfaces & Unions](/learning/07-interfaces-unions)
- Understand types, nullability, and enums

---

## Key Concepts

### What Are Arguments?

**Arguments** are parameters you pass to fields. They let clients request specific data instead of getting everything.

```graphql
# Without arguments - get all users
query {
  users {
    name
  }
}

# With argument - get specific user
query {
  user(id: "123") {
    # ← id is an argument
    name
  }
}
```

### Field Arguments vs Type Arguments

**Field arguments**: Parameters on specific fields

```graphql
type Query {
  user(id: ID!): User # Argument on user field
  users(limit: Int): [User!]! # Argument on users field
}
```

**Type arguments**: Not possible in GraphQL

```graphql
# This is NOT valid GraphQL
type User<T> {  # Can't do this
  data: T
}
```

---

## GraphQL Implementation

### Simple Arguments

```graphql
type Query {
  user(id: ID!): User
  post(id: ID!): Post
  search(query: String!): [Post!]!
}

# Queries
query {
  user(id: "123") {
    name
  }
  post(id: "456") {
    title
  }
  search(query: "graphql") {
    title
  }
}
```

### Multiple Arguments

```graphql
type Query {
  users(limit: Int, offset: Int, role: UserRole): [User!]!
}

query {
  users(limit: 10, offset: 20, role: ADMIN) {
    id
    name
    role
  }
}
```

### Default Values

Provide defaults to make arguments optional:

```graphql
type Query {
  users(
    limit: Int = 10 # Default: 10
    offset: Int = 0 # Default: 0
    role: UserRole = USER # Default: USER
  ): [User!]!
}

query {
  users {
    # Uses defaults
    id
    name
  }
}

query {
  users(limit: 5) {
    # Override limit only
    id
    name
  }
}
```

### Input Types for Complex Arguments

When you have many related arguments, use input types:

```graphql
# Without input type (messy)
type Query {
  posts(
    userId: ID
    status: PostStatus
    minDate: String
    maxDate: String
    tags: [String!]
    sortBy: String
    sortOrder: SortOrder
  ): [Post!]!
}

# With input type (clean)
input PostFilter {
  userId: ID
  status: PostStatus
  dateRange: DateRangeInput
  tags: [String!]
  sort: SortInput
}

input DateRangeInput {
  start: String!
  end: String!
}

input SortInput {
  field: String!
  order: SortOrder!
}

type Query {
  posts(filter: PostFilter): [Post!]!
}

query {
  posts(
    filter: {
      userId: "123"
      status: PUBLISHED
      dateRange: { start: "2025-01-01", end: "2025-12-31" }
      tags: ["graphql", "api"]
      sort: { field: "createdAt", order: DESC }
    }
  ) {
    id
    title
  }
}
```

### Variables for Reusable Queries

Don't hardcode values—use variables:

```graphql
# Without variables (hardcoded)
query {
  user(id: "123") {
    name
  }
}

# With variables (reusable)
query GetUser($userId: ID!) {
  user(id: $userId) {
    name
  }
}

# Pass variables at runtime
{
  "query": "query GetUser($userId: ID!) { ... }",
  "variables": {
    "userId": "123"
  }
}
```

**Why variables matter:**

- Reuse same query with different values
- Prevent injection attacks
- Better performance (query cached, only variables change)
- Type-safe parameter passing

### Complex Query With Variables

```graphql
query SearchPosts(
  $query: String!
  $limit: Int = 10
  $offset: Int = 0
  $status: PostStatus
) {
  posts(
    search: $query
    limit: $limit
    offset: $offset
    status: $status
  ) {
    id
    title
    author { name }
  }
}

# Variables
{
  "query": "graphql",
  "limit": 20,
  "offset": 40,
  "status": "PUBLISHED"
}
```

### Nullable vs Non-Null Arguments

```graphql
type Query {
  user(id: ID!): User # Required argument
  users(limit: Int): [User!]! # Optional argument
  search(
    query: String! # Required
    limit: Int = 10 # Optional with default
  ): [Post!]!
}
```

---

## JSON Schema Implementation

### Arguments in JSON Schema

JSON Schema doesn't have a direct equivalent to GraphQL arguments. Instead, use schema properties for request parameters:

```json
{
  "type": "object",
  "title": "GetUserRequest",
  "required": ["userId"],
  "properties": {
    "userId": {
      "type": "string",
      "description": "User ID (required)"
    },
    "includeProfile": {
      "type": "boolean",
      "default": false,
      "description": "Include full profile (optional)"
    }
  }
}
```

### Input Types as JSON Schema

Input types become objects in JSON Schema:

```graphql
input PostFilterInput {
  userId: ID
  status: PostStatus
  tags: [String!]
}
```

Converts to:

```json
{
  "$defs": {
    "PostFilterInput": {
      "type": "object",
      "properties": {
        "userId": { "type": "string" },
        "status": { "$ref": "#/$defs/PostStatus" },
        "tags": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "PostStatus": {
      "type": "string",
      "enum": ["DRAFT", "PUBLISHED", "ARCHIVED"]
    }
  }
}
```

### Validation Constraints

JSON Schema can express argument constraints:

```json
{
  "userId": {
    "type": "string",
    "minLength": 1,
    "description": "Non-empty user ID"
  },
  "limit": {
    "type": "integer",
    "minimum": 1,
    "maximum": 100,
    "default": 10,
    "description": "Results per page (1-100)"
  },
  "offset": {
    "type": "integer",
    "minimum": 0,
    "description": "Pagination offset"
  }
}
```

---

## json-schema-x-graphql Mapping

### Converting Arguments to JSON Schema

**GraphQL:**

```graphql
type Query {
  posts(limit: Int = 10, offset: Int = 0, status: PostStatus): [Post!]!
}

enum PostStatus {
  DRAFT
  PUBLISHED
}
```

**Converts to JSON Schema:**

```json
{
  "$defs": {
    "PostsArguments": {
      "type": "object",
      "properties": {
        "limit": {
          "type": "integer",
          "default": 10
        },
        "offset": {
          "type": "integer",
          "default": 0
        },
        "status": {
          "type": "string",
          "enum": ["DRAFT", "PUBLISHED"]
        }
      }
    }
  }
}
```

### Converter Handling

The converter:

- ✅ Extracts arguments from fields
- ✅ Maps scalar arguments to JSON Schema types
- ✅ Handles default values
- ✅ Converts input types to objects
- ✅ Preserves nullability requirements

**Note**: Arguments don't typically convert automatically because they're operation-specific, not data-specific. The converter focuses on data types (output types), not operations (arguments).

---

## Real-World Examples

### Example 1: Blog Query with Pagination and Filtering

**GraphQL:**

```graphql
enum SortOrder {
  ASC
  DESC
}

input PostFilterInput {
  status: PostStatus
  authorId: ID
  tags: [String!]
  dateFrom: String
  dateTo: String
}

input PostSortInput {
  field: String!
  order: SortOrder = ASC
}

type Query {
  posts(
    filter: PostFilterInput
    sort: PostSortInput
    limit: Int = 20
    offset: Int = 0
  ): PostConnection!
}

type PostConnection {
  nodes: [Post!]!
  total: Int!
  hasMore: Boolean!
  pageSize: Int!
  offset: Int!
}
```

**Query example:**

```graphql
query GetPublishedPosts($authorId: ID, $limit: Int = 20, $offset: Int = 0) {
  posts(
    filter: { status: PUBLISHED, authorId: $authorId }
    sort: { field: "createdAt", order: DESC }
    limit: $limit
    offset: $offset
  ) {
    nodes {
      id
      title
      author {
        name
      }
      createdAt
    }
    total
    hasMore
    pageSize
  }
}
```

### Example 2: Search with Multiple Options

**GraphQL:**

```graphql
input SearchInput {
  query: String!
  type: SearchType
  limit: Int = 10
  offset: Int = 0
  exact: Boolean = false
}

enum SearchType {
  ALL
  ARTICLES
  USERS
  COMMENTS
}

type Query {
  search(input: SearchInput!): [SearchResult!]!
}

union SearchResult = Article | User | Comment

type Article {
  id: ID!
  title: String!
  content: String!
}

type User {
  id: ID!
  name: String!
  email: String!
}

type Comment {
  id: ID!
  text: String!
  author: User!
}
```

**Query with variables:**

```graphql
query Search($searchInput: SearchInput!) {
  search(input: $searchInput) {
    ... on Article {
      id
      title
    }
    ... on User {
      id
      name
    }
    ... on Comment {
      id
      text
    }
  }
}

# Variables
{
  "searchInput": {
    "query": "graphql",
    "type": "ARTICLES",
    "limit": 25
  }
}
```

---

## Common Patterns

### Pattern 1: Pagination

```graphql
type Query {
  users(limit: Int = 10, offset: Int = 0): UserConnection!
}

type UserConnection {
  nodes: [User!]!
  total: Int!
  hasMore: Boolean!
}
```

### Pattern 2: Filtering with Input Type

```graphql
input UserFilter {
  role: UserRole
  status: AccountStatus
  createdAfter: String
}

type Query {
  users(filter: UserFilter, limit: Int): [User!]!
}
```

### Pattern 3: Sorting

```graphql
enum SortOrder {
  ASC
  DESC
}

input SortInput {
  field: String!
  order: SortOrder = ASC
}

type Query {
  posts(sort: SortInput, limit: Int): [Post!]!
}
```

### Pattern 4: Search

```graphql
type Query {
  search(query: String!, type: SearchType, limit: Int = 10): [SearchResult!]!
}
```

---

## Best Practices

### 1. Use Input Types for Multiple Arguments

```graphql
# ✅ Clean
input UserFilter {
  role: UserRole
  status: AccountStatus
}

type Query {
  users(filter: UserFilter): [User!]!
}

# ❌ Messy
type Query {
  users(role: UserRole, status: AccountStatus): [User!]!
}
```

### 2. Provide Sensible Defaults

```graphql
# ✅ Good defaults
type Query {
  posts(
    limit: Int = 20 # Not too much, not too little
    offset: Int = 0
  ): [Post!]!
}

# ❌ No defaults forces client complexity
type Query {
  posts(limit: Int!, offset: Int!): [Post!]!
}
```

### 3. Use Variables in Production

```graphql
# ✅ Recommended - reusable and safe
query GetUser($id: ID!) {
  user(id: $id) {
    name
  }
}

# ❌ Not reusable - hardcoded
query {
  user(id: "123") {
    name
  }
}
```

### 4. Document Argument Constraints

```graphql
type Query {
  """
  Get posts with optional filtering.

  Arguments:
  - filter: Optional filter criteria
  - limit: Results per page (1-100, default: 20)
  - offset: Pagination offset (default: 0)
  """
  posts(filter: PostFilter, limit: Int = 20, offset: Int = 0): [Post!]!
}
```

### 5. Validate on Server

Even though GraphQL validates types, validate business logic:

```javascript
// Pseudo-code
resolveQuery(posts, args) {
  if (args.limit < 1 || args.limit > 100) {
    throw new Error("limit must be between 1 and 100");
  }
  if (args.offset < 0) {
    throw new Error("offset must be >= 0");
  }
  // ... proceed
}
```

---

## Practice Exercises

### Exercise 1: Add Arguments to Query

Add arguments to get posts with pagination and filtering:

```graphql
type Query {
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  status: PostStatus!
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

<details>
<summary>Solution</summary>

```graphql
type Query {
  posts(limit: Int = 20, offset: Int = 0, status: PostStatus): PostConnection!
}

type PostConnection {
  nodes: [Post!]!
  total: Int!
  hasMore: Boolean!
}

type Post {
  id: ID!
  title: String!
  status: PostStatus!
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

# Example query
query GetPublishedPosts($limit: Int, $offset: Int) {
  posts(limit: $limit, offset: $offset, status: PUBLISHED) {
    nodes {
      id
      title
    }
    total
    hasMore
  }
}
```

</details>

---

### Exercise 2: Design Input Type

Design an input type for filtering users with multiple criteria:

<details>
<summary>Solution</summary>

```graphql
input UserFilter {
  role: UserRole
  status: AccountStatus
  createdAfter: String
  createdBefore: String
  name: String
  email: String
}

enum UserRole {
  ADMIN
  MODERATOR
  USER
}

enum AccountStatus {
  ACTIVE
  SUSPENDED
  BANNED
}

type Query {
  users(filter: UserFilter, limit: Int = 20, offset: Int = 0): [User!]!
}

# Query
query {
  users(
    filter: { role: ADMIN, status: ACTIVE, createdAfter: "2025-01-01" }
    limit: 10
  ) {
    id
    name
    role
    status
  }
}
```

</details>

---

### Exercise 3: Write Query with Variables

Convert this hardcoded query to use variables:

```graphql
query {
  posts(limit: 10, offset: 20, status: PUBLISHED) {
    id
    title
    author {
      name
    }
  }
}
```

<details>
<summary>Solution</summary>

```graphql
query GetPosts(
  $limit: Int = 10
  $offset: Int = 20
  $status: PostStatus = PUBLISHED
) {
  posts(limit: $limit, offset: $offset, status: $status) {
    id
    title
    author { name }
  }
}

# Variables passed separately
{
  "limit": 10,
  "offset": 20,
  "status": "PUBLISHED"
}

# Or use defaults
{}
```

</details>

---

## Migration Guide

### Adding Arguments to Existing Fields

**Before:**

```graphql
type Query {
  posts: [Post!]!
}
```

**Step 1**: Add arguments

```graphql
type Query {
  posts(limit: Int = 20, offset: Int = 0): [Post!]!
}
```

**Step 2**: If many arguments, use input type

```graphql
input PostFilter {
  status: PostStatus
  authorId: ID
}

type Query {
  posts(filter: PostFilter, limit: Int = 20, offset: Int = 0): PostConnection!
}
```

**Step 3**: Update resolvers to handle arguments

---

## Common Mistakes

| Mistake                     | Problem                              | Fix                               |
| --------------------------- | ------------------------------------ | --------------------------------- |
| All arguments required      | Clients must specify everything      | Use defaults and optional args    |
| No input types              | Query signature too long             | Group related args in input types |
| Hardcoded values in queries | Not reusable                         | Use variables with $              |
| No validation               | Invalid requests processed           | Validate on server                |
| Inconsistent pagination     | Different endpoints work differently | Use standard limit/offset pattern |

---

## Next Steps

**Ready to continue?**

1. **Next Module**: [Mutations](/learning/09-mutations)
   - Writing data (not just reading)
   - Creating, updating, deleting
   - Advanced mutation patterns

2. **Practice**:
   - Add arguments to your existing queries
   - Create input types for complex filters
   - Use variables in queries
   - Test with [Query Builder](/tools/query-builder) tool

---

## Key Takeaways

✅ **Arguments make queries dynamic** - Pass parameters instead of hardcoding  
✅ **Input types reduce complexity** - Group related arguments  
✅ **Variables enable reuse** - Same query, different parameters  
✅ **Default values help clients** - Make arguments optional when sensible  
✅ **Validate constraints** - Even though GraphQL type checks, validate business logic  
✅ **Documentation matters** - Explain what each argument does  
✅ **Pagination is standard** - limit/offset or cursor pattern  
✅ **Keep arguments focused** - Don't make fields with 20 arguments

---

## Resources

- [GraphQL Docs - Arguments](https://graphql.org/learn/queries/#arguments)
- [GraphQL Docs - Variables](https://graphql.org/learn/queries/#variables)
- [GraphQL Docs - Input Types](https://graphql.org/learn/schema/#input-types)
- [Apollo Docs - Pagination](https://www.apollographql.com/docs/apollo-server/data/pagination/)
- [REST to GraphQL - Arguments](https://www.apollographql.com/docs/apollo-server/getting-started/)

---

**Questions?** [Open a discussion](https://github.com/json-schema-x-graphql/discussions) or check the [FAQ](/help/faq)

Last updated: 2025-12-15
