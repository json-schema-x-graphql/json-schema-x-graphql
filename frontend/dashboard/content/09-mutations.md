# Mutations

## Overview

**What you'll learn:**
- What mutations are and how they differ from queries
- Writing data (create, update, delete operations)
- Mutation syntax and structure
- Return types and responses
- Error handling patterns
- Best practices for mutations
- Real-world mutation examples
- How JSON Schema represents state changes

**Why it matters:**
Queries let you *read* data. Mutations let you *write* data. While queries should be safe (never changing data), mutations explicitly state "I'm making a change." This distinction is powerful—it makes APIs more predictable and easier to optimize. Good mutations validate changes, return the modified data, and handle errors gracefully.

**Prerequisites:**
- Completed: [Module 1-8 (All Previous Modules)](/learning/01-introducing-types)
- Understand types, arguments, input types, and queries
- Ready to learn state changes

---

## Key Concepts

### Query vs Mutation

**Queries** are for reading data (safe, readonly):
```graphql
type Query {
  user(id: ID!): User
  posts: [Post!]!
}
```

**Mutations** are for writing data (changes state):
```graphql
type Mutation {
  createUser(input: CreateUserInput!): User!
  updatePost(id: ID!, input: UpdatePostInput!): Post!
  deleteComment(id: ID!): Boolean!
}
```

### Why Separate Query and Mutation?

1. **Intent clarity**: Mutation says "I'm changing something"
2. **Caching**: Queries can be cached, mutations always fresh
3. **Optimization**: Server can optimize reads differently from writes
4. **Safety**: Hard to accidentally modify data with queries
5. **Convention**: Developers know to be careful with mutations

### The Three Core Mutations

Most mutations fall into three categories:

1. **Create**: Add new data
   ```graphql
   type Mutation {
     createUser(input: CreateUserInput!): User!
   }
   ```

2. **Update**: Modify existing data
   ```graphql
   type Mutation {
     updateUser(id: ID!, input: UpdateUserInput!): User!
   }
   ```

3. **Delete**: Remove data
   ```graphql
   type Mutation {
     deleteUser(id: ID!): Boolean!
   }
   ```

---

## GraphQL Implementation

### Basic Mutation Structure

```graphql
type Mutation {
  createUser(input: CreateUserInput!): User!
}

input CreateUserInput {
  name: String!
  email: String!
  role: UserRole!
}

type User {
  id: ID!
  name: String!
  email: String!
  role: UserRole!
  createdAt: String!
}

enum UserRole {
  ADMIN
  MODERATOR
  USER
}
```

### Using Mutations

```graphql
mutation {
  createUser(input: {
    name: "John Doe"
    email: "john@example.com"
    role: USER
  }) {
    id
    name
    email
    createdAt
  }
}

# Response
{
  "data": {
    "createUser": {
      "id": "123",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2025-12-15T10:00:00Z"
    }
  }
}
```

### Create, Update, Delete

```graphql
type Mutation {
  # Create
  createPost(input: CreatePostInput!): Post!

  # Update
  updatePost(id: ID!, input: UpdatePostInput!): Post

  # Delete
  deletePost(id: ID!): Boolean!
}

input CreatePostInput {
  title: String!
  content: String!
  tags: [String!]
}

input UpdatePostInput {
  title: String
  content: String
  tags: [String!]
}

# Create example
mutation {
  createPost(input: {
    title: "GraphQL Guide"
    content: "Learn GraphQL..."
    tags: ["graphql", "api"]
  }) {
    id
    title
  }
}

# Update example
mutation {
  updatePost(id: "123", input: {
    title: "Updated Title"
  }) {
    id
    title
    content
  }
}

# Delete example
mutation {
  deletePost(id: "123")
}
```

### Multiple Mutations in One Request

You can run multiple mutations (though they execute sequentially):

```graphql
mutation {
  # First mutation
  createPost(input: {
    title: "New Post"
    content: "Content..."
  }) {
    id
  }

  # Second mutation
  createComment(postId: "123", input: {
    text: "Great post!"
  }) {
    id
  }
}
```

### Mutations with Variables

```graphql
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    name
    email
  }
}

# Variables
{
  "input": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "USER"
  }
}
```

### Error Handling in Mutations

Return a union of success and error:

```graphql
type Mutation {
  createUser(input: CreateUserInput!): CreateUserResult!
}

union CreateUserResult = User | CreateUserError

type CreateUserError {
  message: String!
  code: String!
  field: String
}

type User {
  id: ID!
  name: String!
  email: String!
}

# Query
mutation {
  createUser(input: {
    name: "John"
    email: "invalid"
  }) {
    ... on User {
      id
      name
    }

    ... on CreateUserError {
      message
      code
      field
    }
  }
}

# Response with error
{
  "data": {
    "createUser": {
      "message": "Invalid email format",
      "code": "INVALID_EMAIL",
      "field": "email"
    }
  }
}
```

---

## JSON Schema Implementation

### JSON Schema for Request/Response

JSON Schema represents mutations as operations with input and output schemas:

```json
{
  "$defs": {
    "CreateUserInput": {
      "type": "object",
      "title": "CreateUserInput",
      "required": ["name", "email", "role"],
      "properties": {
        "name": { "type": "string" },
        "email": { "type": "string", "format": "email" },
        "role": { "$ref": "#/$defs/UserRole" }
      }
    },
    "UserRole": {
      "type": "string",
      "enum": ["ADMIN", "MODERATOR", "USER"]
    },
    "User": {
      "type": "object",
      "required": ["id", "name", "email", "role", "createdAt"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "email": { "type": "string", "format": "email" },
        "role": { "$ref": "#/$defs/UserRole" },
        "createdAt": { "type": "string", "format": "date-time" }
      }
    }
  }
}
```

### Mutation Operation Schema

```json
{
  "title": "CreateUserMutation",
  "description": "Create a new user account",
  "type": "object",
  "properties": {
    "input": { "$ref": "#/$defs/CreateUserInput" }
  },
  "required": ["input"],
  "returns": { "$ref": "#/$defs/User" }
}
```

---

## json-schema-x-graphql Mapping

### Converting Mutations to JSON Schema

**GraphQL:**
```graphql
type Mutation {
  createUser(input: CreateUserInput!): User!
}

input CreateUserInput {
  name: String!
  email: String!
}

type User {
  id: ID!
  name: String!
  email: String!
}
```

**Converts to JSON Schema (data types only):**
```json
{
  "$defs": {
    "CreateUserInput": {
      "type": "object",
      "required": ["name", "email"],
      "properties": {
        "name": { "type": "string" },
        "email": { "type": "string", "format": "email" }
      }
    },
    "User": {
      "type": "object",
      "required": ["id", "name", "email"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "email": { "type": "string", "format": "email" }
      }
    }
  }
}
```

**Note**: The Mutation type itself doesn't convert (it's operation metadata). Only the input/output types convert to JSON Schema.

---

## Real-World Examples

### Example 1: Blog Management Mutations

**GraphQL:**
```graphql
type Mutation {
  # Post mutations
  createPost(input: CreatePostInput!): Post!
  updatePost(id: ID!, input: UpdatePostInput!): Post
  deletePost(id: ID!): DeleteResult!

  # Comment mutations
  createComment(postId: ID!, input: CreateCommentInput!): Comment!
  updateComment(id: ID!, input: UpdateCommentInput!): Comment
  deleteComment(id: ID!): Boolean!

  # Publication status
  publishPost(id: ID!): Post!
  archivePost(id: ID!): Post!
}

input CreatePostInput {
  title: String!
  content: String!
  tags: [String!]
}

input UpdatePostInput {
  title: String
  content: String
  tags: [String!]
}

input CreateCommentInput {
  text: String!
}

input UpdateCommentInput {
  text: String!
}

type Post {
  id: ID!
  title: String!
  content: String!
  status: PostStatus!
  tags: [String!]!
  author: User!
  comments: [Comment!]!
  createdAt: String!
  updatedAt: String!
}

type Comment {
  id: ID!
  text: String!
  author: User!
  createdAt: String!
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

type DeleteResult {
  success: Boolean!
  id: ID!
}
```

**Example mutations:**
```graphql
mutation PublishNewPost($postInput: CreatePostInput!) {
  createPost(input: $postInput) {
    id
    title
  }
}

mutation {
  publishPost(id: "123") {
    id
    status
  }
}

mutation {
  deletePost(id: "456") {
    success
    id
  }
}
```

### Example 2: E-Commerce Mutations

**GraphQL:**
```graphql
type Mutation {
  # Orders
  createOrder(input: CreateOrderInput!): OrderResult!
  updateOrderStatus(id: ID!, status: OrderStatus!): Order!
  cancelOrder(id: ID!): CancelResult!

  # Payments
  processPayment(orderId: ID!, input: PaymentInput!): PaymentResult!
  refundPayment(orderId: ID!): RefundResult!

  # Inventory
  updateInventory(productId: ID!, quantity: Int!): InventoryResult!
}

input CreateOrderInput {
  userId: ID!
  items: [OrderItemInput!]!
  shippingAddress: AddressInput!
}

input OrderItemInput {
  productId: ID!
  quantity: Int!
}

input AddressInput {
  street: String!
  city: String!
  country: String!
  zipCode: String!
}

input PaymentInput {
  method: PaymentMethod!
  amount: Int!
}

enum PaymentMethod {
  CREDIT_CARD
  DEBIT_CARD
  PAYPAL
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}

type Order {
  id: ID!
  userId: ID!
  items: [OrderItem!]!
  status: OrderStatus!
  total: Int!
  createdAt: String!
}

type OrderItem {
  id: ID!
  product: Product!
  quantity: Int!
  price: Int!
}

type OrderResult = Order | OrderError
type OrderError {
  message: String!
  code: String!
}

type PaymentResult = Payment | PaymentError
type Payment {
  id: ID!
  status: String!
}
```

**Example mutations:**
```graphql
mutation CreateNewOrder($orderInput: CreateOrderInput!) {
  createOrder(input: $orderInput) {
    ... on Order {
      id
      total
      status
    }

    ... on OrderError {
      message
      code
    }
  }
}

mutation {
  processPayment(
    orderId: "123"
    input: {
      method: CREDIT_CARD
      amount: 9999
    }
  ) {
    ... on Payment {
      id
      status
    }

    ... on PaymentError {
      message
    }
  }
}
```

---

## Common Patterns

### Pattern 1: Standard CRUD

Every entity typically needs create, read, update, delete:

```graphql
type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User
  deleteUser(id: ID!): Boolean!
}
```

### Pattern 2: Result Union

Return success or error:

```graphql
type Mutation {
  createUser(input: CreateUserInput!): CreateUserResult!
}

union CreateUserResult = User | CreateUserError

type CreateUserError {
  message: String!
  code: ErrorCode!
}

enum ErrorCode {
  INVALID_EMAIL
  EMAIL_ALREADY_EXISTS
  INVALID_INPUT
}
```

### Pattern 3: Bulk Operations

Operations on multiple items:

```graphql
type Mutation {
  deleteUsers(ids: [ID!]!): BulkDeleteResult!
  updatePostStatus(
    ids: [ID!]!
    status: PostStatus!
  ): [Post!]!
}

type BulkDeleteResult {
  deleted: Int!
  failed: Int!
  errors: [BulkError!]
}

type BulkError {
  id: ID!
  message: String!
}
```

### Pattern 4: Nested Mutations

Creating related data in one mutation:

```graphql
input CreatePostWithCommentsInput {
  title: String!
  content: String!
  comments: [CreateCommentInput!]
}

type Mutation {
  createPostWithComments(
    input: CreatePostWithCommentsInput!
  ): Post!
}
```

---

## Best Practices

### 1. Return Modified Data

Always return the modified object so client gets fresh state:

```graphql
# ✅ Good
type Mutation {
  updateUser(id: ID!, input: UpdateUserInput!): User!
}

# ❌ Less useful
type Mutation {
  updateUser(id: ID!, input: UpdateUserInput!): Boolean!
}
```

### 2. Use Input Types

Group mutation arguments into input types:

```graphql
# ✅ Clean
type Mutation {
  createUser(input: CreateUserInput!): User!
}

# ❌ Messy
type Mutation {
  createUser(
    name: String!
    email: String!
    role: UserRole!
  ): User!
}
```

### 3. Provide Meaningful Error Information

```graphql
# ✅ Helpful
type CreateUserError {
  message: String!
  code: ErrorCode!
  field: String
}

# ❌ Vague
type CreateUserError {
  error: String!
}
```

### 4. Make Updates Flexible

Allow updating any subset of fields:

```graphql
input UpdateUserInput {
  name: String
  email: String
  role: UserRole
  # All optional - update what you want
}

# ❌ Rigid - must update all
input UpdateUserInput {
  name: String!
  email: String!
  role: UserRole!
}
```

### 5. Clear Deletion Intent

Be explicit about what gets deleted:

```graphql
# ✅ Clear
type Mutation {
  deletePost(id: ID!): DeleteResult!
  hardDeletePost(id: ID!): DeleteResult!
  softDeletePost(id: ID!): DeleteResult!
}

type DeleteResult {
  id: ID!
  deleted: Boolean!
}

# ❌ Ambiguous
type Mutation {
  deletePost(id: ID!): Boolean!
}
```

---

## Practice Exercises

### Exercise 1: Design CRUD Mutations

Design mutations for a Task management system:

<details>
<summary>Solution</summary>

```graphql
input CreateTaskInput {
  title: String!
  description: String
  priority: Priority
}

input UpdateTaskInput {
  title: String
  description: String
  priority: Priority
  status: TaskStatus
}

type Mutation {
  createTask(input: CreateTaskInput!): Task!
  updateTask(id: ID!, input: UpdateTaskInput!): Task
  deleteTask(id: ID!): Boolean!
  
  # Additional mutations
  completeTask(id: ID!): Task!
  reopenTask(id: ID!): Task!
}

type Task {
  id: ID!
  title: String!
  description: String
  priority: Priority
  status: TaskStatus!
  createdAt: String!
  updatedAt: String!
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

</details>

---

### Exercise 2: Create Error Handling

Design a mutation with proper error handling for user creation:

<details>
<summary>Solution</summary>

```graphql
type Mutation {
  createUser(input: CreateUserInput!): CreateUserResult!
}

input CreateUserInput {
  name: String!
  email: String!
  password: String!
}

union CreateUserResult = User | CreateUserError

type User {
  id: ID!
  name: String!
  email: String!
  createdAt: String!
}

type CreateUserError {
  message: String!
  code: ErrorCode!
  field: String
}

enum ErrorCode {
  INVALID_EMAIL
  EMAIL_ALREADY_EXISTS
  WEAK_PASSWORD
  INVALID_NAME
  UNKNOWN_ERROR
}

# Usage
mutation {
  createUser(input: {
    name: "John"
    email: "john@example.com"
    password: "secret123"
  }) {
    ... on User {
      id
      name
    }
    
    ... on CreateUserError {
      message
      code
      field
    }
  }
}
```

</details>

---

### Exercise 3: Write Bulk Mutation

Design a mutation to update multiple posts at once:

<details>
<summary>Solution</summary>

```graphql
type Mutation {
  bulkUpdatePostStatus(
    ids: [ID!]!
    status: PostStatus!
  ): BulkUpdateResult!
}

type BulkUpdateResult {
  successful: [Post!]!
  failed: [BulkFailure!]!
  total: Int!
}

type BulkFailure {
  id: ID!
  message: String!
  code: String!
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

# Usage
mutation {
  bulkUpdatePostStatus(
    ids: ["1", "2", "3"]
    status: PUBLISHED
  ) {
    successful { id title status }
    failed { id message }
    total
  }
}
```

</details>

---

## Migration Guide

### Adding Mutations to Schema

**Before (Query only):**
```graphql
type Query {
  users: [User!]!
  user(id: ID!): User
}
```

**Step 1**: Create input types
```graphql
input CreateUserInput {
  name: String!
  email: String!
}

input UpdateUserInput {
  name: String
  email: String
}
```

**Step 2**: Add Mutation type
```graphql
type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User
  deleteUser(id: ID!): Boolean!
}
```

**Step 3**: Implement mutation resolvers in your server code

---

## Common Mistakes

| Mistake | Problem | Fix |
|---------|---------|-----|
| Only returning ID | Client needs fresh data | Return full object |
| No error handling | Errors unclear | Return error type from mutation |
| All fields required in update | Can't do partial updates | Make input fields optional |
| Mutations that don't change anything | Confusing, unnecessary | Keep mutations focused on changes |
| No validation | Invalid data accepted | Validate in resolver |

---

## Next Steps

**Congratulations!** You've completed all 9 core modules. 

**What to do now:**

1. **Review**: Go back through all modules
2. **Practice**: Build a complete schema for your domain
3. **Integrate**: Use json-schema-x-graphql converter
4. **Explore**:
   - [Tools](/tools) - Interactive learning tools
   - [Examples](/examples) - Real-world schemas
   - [Reference](/reference) - Quick lookup guides

---

## Key Takeaways

✅ **Mutations change state** - Explicit intent  
✅ **Separate from queries** - Different purposes  
✅ **Return modified data** - Client gets fresh state  
✅ **Use input types** - Cleaner mutations  
✅ **Handle errors** - Union types for success/failure  
✅ **Validate thoroughly** - Check business logic  
✅ **Document clearly** - Explain what mutations do  
✅ **Design for clients** - Return what they need  

---

## Resources

- [GraphQL Docs - Mutations](https://graphql.org/learn/queries/#mutations)
- [GraphQL Docs - Input Types](https://graphql.org/learn/schema/#input-types)
- [Apollo Docs - Mutations](https://www.apollographql.com/docs/apollo-server/data/mutations/)
- [Best Practices - Mutation Design](https://principledgraphql.com/)
- [Error Handling Patterns](https://www.apollographql.com/docs/apollo-server/data/errors/)

---

## Comprehensive Learning Summary

You've now learned:

1. **Module 1**: Types - the foundation
2. **Module 2**: Scalars, Objects, Lists - building blocks
3. **Module 3**: Nullability - data integrity
4. **Module 4**: Querying Between Types - graph traversal
5. **Module 5**: Schema - complete structures
6. **Module 6**: Enums - type safety
7. **Module 7**: Interfaces & Unions - composition
8. **Module 8**: Arguments - dynamic queries
9. **Module 9**: Mutations - writing data

**Next stage**: Apply these concepts to build real GraphQL APIs!

---

**Questions?** [Open a discussion](https://github.com/json-schema-x-graphql/discussions) or check the [FAQ](/help/faq)

Last updated: 2025-12-15
