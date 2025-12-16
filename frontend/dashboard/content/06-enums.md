# Enums

## Overview

**What you'll learn:**
- What enums are and why they're powerful
- Defining enums with fixed values
- Type-safe status fields
- Enums in queries and mutations
- How JSON Schema represents enums
- Comparing enums to string fields
- Pattern matching and exhaustiveness
- Real-world enum use cases

**Why it matters:**
Enums let you restrict values to a specific set of options. Instead of accepting any string, an enum says "this field can only be one of these values." This prevents bugs—the API guarantees you'll only get valid values, and clients can use them with type safety. It's like using radio buttons instead of free-text fields.

**Prerequisites:**
- Completed: [Module 1: Introducing Types](/learning/01-introducing-types)
- Completed: [Module 2: Scalars, Objects, Lists](/learning/02-scalars-objects-lists)
- Completed: [Module 3: Nullability](/learning/03-nullability)
- Understand non-null markers and required fields

---

## Key Concepts

### What Is an Enum?

An **enum** is a special type that restricts values to a predefined set of options.

Instead of:
```graphql
# ❌ Risky - any string accepted
type Post {
  status: String    # Could be "published", "PUBLISHED", "pub", typos...
}
```

Use:
```graphql
# ✅ Type-safe
type Post {
  status: PostStatus!
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

### Why Enums Matter

**For API developers:**
- Restrict what values are valid
- Make invalid states impossible to represent
- Easier to evolve (add new values without breaking)

**For clients:**
- Autocomplete in editors
- Type safety (TypeScript, Python, etc. know valid values)
- No string typos
- Better error messages

### Real-World Examples

```graphql
enum UserRole {
  ADMIN
  MODERATOR
  USER
  GUEST
}

enum PaymentStatus {
  PENDING
  AUTHORIZED
  CAPTURED
  DECLINED
  REFUNDED
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}
```

---

## GraphQL Implementation

### Basic Enum Definition

```graphql
enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
  DELETED
}

type Post {
  id: ID!
  title: String!
  status: PostStatus!
}
```

### Using Enums in Queries

```graphql
type Query {
  posts(status: PostStatus): [Post!]!
}

# Query example:
query {
  posts(status: PUBLISHED) {
    title
    status
  }
}
```

### Using Enums in Mutations

```graphql
type Mutation {
  updatePostStatus(id: ID!, status: PostStatus!): Post!
}

# Mutation example:
mutation {
  updatePostStatus(id: "1", status: PUBLISHED) {
    id
    title
    status
  }
}
```

### Multiple Enums in a Schema

```graphql
enum UserRole {
  ADMIN
  MODERATOR
  USER
}

enum AccountStatus {
  ACTIVE
  SUSPENDED
  BANNED
  DELETED
}

type User {
  id: ID!
  name: String!
  role: UserRole!
  accountStatus: AccountStatus!
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  RETURNED
  CANCELLED
}

type Order {
  id: ID!
  user: User!
  status: OrderStatus!
  createdAt: String!
}

type Query {
  users(role: UserRole): [User!]!
  orders(status: OrderStatus): [Order!]!
}
```

### Enum Values in Responses

When you query an enum field, you get back the enum value (not a string):

```graphql
query {
  post(id: "1") {
    title
    status    # Returns: PUBLISHED (not "PUBLISHED")
  }
}
```

Response:
```json
{
  "data": {
    "post": {
      "title": "My Post",
      "status": "PUBLISHED"
    }
  }
}
```

---

## JSON Schema Implementation

### Enum Representation in JSON Schema

JSON Schema uses the `enum` keyword with an array of valid values:

```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["DRAFT", "PUBLISHED", "ARCHIVED", "DELETED"],
      "description": "Post publication status"
    }
  }
}
```

### Complete Example

```json
{
  "type": "object",
  "title": "Post",
  "required": ["id", "title", "status"],
  "properties": {
    "id": { "type": "string" },
    "title": { "type": "string" },
    "status": {
      "type": "string",
      "enum": ["DRAFT", "PUBLISHED", "ARCHIVED", "DELETED"],
      "description": "Publication status"
    }
  }
}
```

### Multiple Enums with $defs

For reusability, define enums in `$defs`:

```json
{
  "$defs": {
    "PostStatus": {
      "type": "string",
      "enum": ["DRAFT", "PUBLISHED", "ARCHIVED", "DELETED"]
    },
    "UserRole": {
      "type": "string",
      "enum": ["ADMIN", "MODERATOR", "USER"]
    }
  },
  "type": "object",
  "properties": {
    "status": { "$ref": "#/$defs/PostStatus" },
    "role": { "$ref": "#/$defs/UserRole" }
  }
}
```

### Enum vs String Constraint

Compare approaches:

```json
// ❌ Too permissive
{
  "type": "string",
  "minLength": 1
}

// ✅ Type-safe
{
  "type": "string",
  "enum": ["DRAFT", "PUBLISHED", "ARCHIVED"]
}

// ✅ Also good - with pattern + description
{
  "type": "string",
  "pattern": "^[A-Z_]+$",
  "enum": ["DRAFT", "PUBLISHED", "ARCHIVED"]
}
```

---

## json-schema-x-graphql Mapping

### Converting GraphQL Enums to JSON Schema

**GraphQL:**
```graphql
enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

type Post {
  status: PostStatus!
}
```

**Converts to JSON Schema:**
```json
{
  "$defs": {
    "PostStatus": {
      "type": "string",
      "enum": ["DRAFT", "PUBLISHED", "ARCHIVED"]
    }
  },
  "properties": {
    "status": { "$ref": "#/$defs/PostStatus" }
  }
}
```

### Converter Handling

The converter automatically:
- ✅ Extracts enum definitions
- ✅ Maps to JSON Schema `enum` keyword
- ✅ Creates references in `$defs`
- ✅ Preserves enum ordering
- ✅ Handles enum descriptions (if provided)

**Usage:**
```javascript
const converter = new Converter();

const graphqlSchema = `
  enum UserRole {
    ADMIN
    MODERATOR
    USER
  }
  
  type User {
    role: UserRole!
  }
`;

const result = await converter.convert({
  graphql: graphqlSchema,
  options: {
    includeDescriptions: true
  }
});

// Result includes PostStatus in $defs with enum constraint
```

---

## Real-World Examples

### Example 1: E-Commerce Order System

**GraphQL:**
```graphql
enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

enum PaymentStatus {
  UNPAID
  AUTHORIZED
  CAPTURED
  FAILED
  REFUNDED
}

enum ShippingCarrier {
  FEDEX
  UPS
  USPS
  DHL
}

type Order {
  id: ID!
  orderNumber: String!
  status: OrderStatus!
  paymentStatus: PaymentStatus!
  carrier: ShippingCarrier
  createdAt: String!
  shippedAt: String
}

type Mutation {
  updateOrderStatus(id: ID!, status: OrderStatus!): Order!
  updatePaymentStatus(id: ID!, status: PaymentStatus!): Order!
}

type Query {
  orders(status: OrderStatus): [Order!]!
  ordersByPaymentStatus(status: PaymentStatus): [Order!]!
}
```

**JSON Schema:**
```json
{
  "$defs": {
    "OrderStatus": {
      "type": "string",
      "enum": ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]
    },
    "PaymentStatus": {
      "type": "string",
      "enum": ["UNPAID", "AUTHORIZED", "CAPTURED", "FAILED", "REFUNDED"]
    },
    "ShippingCarrier": {
      "type": "string",
      "enum": ["FEDEX", "UPS", "USPS", "DHL"]
    },
    "Order": {
      "type": "object",
      "required": ["id", "orderNumber", "status", "paymentStatus", "createdAt"],
      "properties": {
        "id": { "type": "string" },
        "orderNumber": { "type": "string" },
        "status": { "$ref": "#/$defs/OrderStatus" },
        "paymentStatus": { "$ref": "#/$defs/PaymentStatus" },
        "carrier": { "$ref": "#/$defs/ShippingCarrier" },
        "createdAt": { "type": "string", "format": "date-time" },
        "shippedAt": { "type": "string", "format": "date-time" }
      }
    }
  }
}
```

### Example 2: User Management System

**GraphQL:**
```graphql
enum UserRole {
  OWNER
  ADMIN
  MODERATOR
  USER
  GUEST
}

enum AccountStatus {
  ACTIVE
  SUSPENDED
  BANNED
  PENDING_VERIFICATION
  DELETED
}

enum NotificationPreference {
  EMAIL
  SMS
  PUSH
  NONE
}

type User {
  id: ID!
  username: String!
  email: String!
  role: UserRole!
  status: AccountStatus!
  notifications: [NotificationPreference!]!
  createdAt: String!
}

type Query {
  user(id: ID!): User
  usersByRole(role: UserRole!): [User!]!
  usersByStatus(status: AccountStatus!): [User!]!
}

type Mutation {
  updateUserRole(id: ID!, role: UserRole!): User!
  updateAccountStatus(id: ID!, status: AccountStatus!): User!
  setNotificationPreferences(id: ID!, preferences: [NotificationPreference!]!): User!
}
```

---

## Common Patterns

### Pattern 1: Status Enums

Use enums for any status or state field:

```graphql
# ✅ Good
enum ProjectStatus {
  PLANNING
  IN_PROGRESS
  ON_HOLD
  COMPLETED
  ARCHIVED
}

type Project {
  status: ProjectStatus!
}

# ❌ Bad
type Project {
  status: String!  # Could be "planning", "PLANNING", "plan", typos...
}
```

### Pattern 2: Multiple Status Fields

Different aspects of the same entity:

```graphql
enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum TicketStatus {
  OPEN
  IN_PROGRESS
  ON_HOLD
  RESOLVED
  CLOSED
}

enum TicketCategory {
  BUG
  FEATURE_REQUEST
  DOCUMENTATION
  SUPPORT
}

type SupportTicket {
  id: ID!
  title: String!
  priority: TicketPriority!
  status: TicketStatus!
  category: TicketCategory!
}
```

### Pattern 3: Enum in Filters

Use enums as query filters:

```graphql
type Query {
  tickets(
    priority: TicketPriority
    status: TicketStatus
    category: TicketCategory
  ): [SupportTicket!]!
}

# Query example:
query {
  tickets(priority: CRITICAL, status: OPEN) {
    title
    description
  }
}
```

### Pattern 4: Nullable Enums

For optional enum fields:

```graphql
type Product {
  id: ID!
  name: String!
  category: ProductCategory!      # Required
  subcategory: ProductCategory    # Optional
}

enum ProductCategory {
  ELECTRONICS
  BOOKS
  CLOTHING
  HOME_GARDEN
}
```

---

## Best Practices

### 1. Use SCREAMING_SNAKE_CASE for Enum Values

```graphql
# ✅ Good
enum Status {
  IN_PROGRESS
  ON_HOLD
  COMPLETED
}

# ❌ Inconsistent
enum Status {
  inProgress
  onHold
  completed
}
```

**Why**: Enum values are constants, follow constant naming conventions.

### 2. Keep Enums in $defs for Reusability

```graphql
# ✅ Reusable
enum UserRole {
  ADMIN
  MODERATOR
  USER
}

type User { role: UserRole! }
type Team { owner: User!, moderators: [User!]! }

# ❌ Repeated
type User { role: String! }  # Documented as ADMIN|MODERATOR|USER
type Team { role: String! }  # Documented as ADMIN|MODERATOR|USER
```

### 3. Meaningful Enum Values

```graphql
# ✅ Clear
enum PaymentMethod {
  CREDIT_CARD
  DEBIT_CARD
  PAYPAL
  BANK_TRANSFER
  CASH
}

# ❌ Vague
enum PaymentMethod {
  METHOD_1
  METHOD_2
  METHOD_3
}
```

### 4. Add Descriptions to Important Enums

```graphql
"""
User account status in the system.
- ACTIVE: Account is usable
- SUSPENDED: Temporarily restricted
- BANNED: Permanently restricted
- DELETED: Soft-deleted account
"""
enum AccountStatus {
  ACTIVE
  SUSPENDED
  BANNED
  DELETED
}

type User {
  """Current account status"""
  status: AccountStatus!
}
```

### 5. Think About Extensibility

```graphql
# ✅ Extensible (easy to add new values)
enum DocumentStatus {
  DRAFT
  IN_REVIEW
  APPROVED
  PUBLISHED
  ARCHIVED
}

# ❌ Overly specific (hard to extend)
enum DocumentStatus {
  NEW_DOCUMENT
  WAITING_FOR_MANAGER_REVIEW
  WAITING_FOR_LEGAL_REVIEW
  READY_TO_PUBLISH
}
```

---

## Practice Exercises

### Exercise 1: Identify When to Use Enums

Should these be enums or strings?

1. Currency code (USD, EUR, GBP, JPY)
2. User full name
3. Email address
4. Document status (draft, published, archived)
5. Product description
6. Order priority (low, medium, high, urgent)
7. Phone number
8. Article category (news, opinion, how-to, review)

<details>
<summary>Solution</summary>

1. **Currency code**: ✅ ENUM - Fixed set of codes
2. **User full name**: ❌ STRING - Free-form text
3. **Email address**: ❌ STRING - Any valid email format
4. **Document status**: ✅ ENUM - Fixed states
5. **Product description**: ❌ STRING - Any description
6. **Order priority**: ✅ ENUM - Fixed levels
7. **Phone number**: ❌ STRING - Variable format
8. **Article category**: ✅ ENUM - Fixed categories

**Rule of thumb**: Use enum when there's a small, fixed set of valid options.

</details>

---

### Exercise 2: Design Enums for a Blog

Design enums for a blogging platform with these requirements:
- Posts can be drafted, published, or archived
- Comments can be pending (awaiting moderation), approved, or rejected
- Users can have roles: owner, editor, author, reader

<details>
<summary>Solution</summary>

```graphql
enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum CommentStatus {
  PENDING
  APPROVED
  REJECTED
}

enum UserRole {
  OWNER
  EDITOR
  AUTHOR
  READER
}

type Post {
  id: ID!
  title: String!
  status: PostStatus!
  comments: [Comment!]!
}

type Comment {
  id: ID!
  text: String!
  status: CommentStatus!
  author: User!
}

type User {
  id: ID!
  name: String!
  role: UserRole!
}
```

</details>

---

### Exercise 3: Convert String to Enum

Convert this schema to use enums instead of string fields:

```graphql
type Task {
  id: ID!
  title: String!
  priority: String!           # Values: "low", "medium", "high"
  status: String!             # Values: "todo", "in_progress", "done"
  assignee: User!
}
```

<details>
<summary>Solution</summary>

```graphql
enum TaskPriority {
  LOW
  MEDIUM
  HIGH
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

type Task {
  id: ID!
  title: String!
  priority: TaskPriority!
  status: TaskStatus!
  assignee: User!
}

type Query {
  tasks(priority: TaskPriority, status: TaskStatus): [Task!]!
}

type Mutation {
  updateTaskStatus(id: ID!, status: TaskStatus!): Task!
  updateTaskPriority(id: ID!, priority: TaskPriority!): Task!
}
```

**Benefits:**
- Type-safe (can't pass invalid values)
- Autocomplete in clients
- Better IDE support
- Easier to evolve (add new status values)

</details>

---

## Migration Guide

### Converting String to Enum

**Before:**
```graphql
type Task {
  status: String!  # Documented as: "todo", "in_progress", "done"
}
```

**Step 1**: Define the enum
```graphql
enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}
```

**Step 2**: Update field type
```graphql
type Task {
  status: TaskStatus!
}
```

**Step 3**: Update resolvers to return enum values instead of strings

**After:**
```graphql
enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

type Task {
  status: TaskStatus!
}

type Query {
  tasks(status: TaskStatus): [Task!]!
}
```

### Adding New Enum Values

GraphQL enums are designed to evolve:

```graphql
# Original
enum OrderStatus {
  PENDING
  SHIPPED
  DELIVERED
}

# Add new value (backwards compatible)
enum OrderStatus {
  PENDING
  SHIPPED
  DELIVERED
  RETURNED      # ← New value
  REFUNDED      # ← New value
}

# Clients not expecting RETURNED/REFUNDED just ignore them
```

---

## Common Mistakes

| Mistake | Problem | Fix |
|---------|---------|-----|
| Lowercase enum values | Non-standard, inconsistent | Use SCREAMING_SNAKE_CASE |
| Duplicate enum definitions | Confusing, hard to maintain | Define once in $defs, reference everywhere |
| Enum instead of flags | Wrong data structure | Use array of enums or separate boolean fields |
| Overly restrictive enums | Hard to evolve | Ensure room for future values |
| No validation on strings | Defeats enum purpose | Use type system, not documentation |

---

## Next Steps

**Ready to continue?**

1. **Next Module**: [Interfaces & Unions](/learning/07-interfaces-and-unions)
   - Shared fields across types
   - Polymorphic responses
   - Complex type hierarchies

2. **Then**: [Arguments](/learning/08-arguments)
   - Powerful query parameters
   - Input types for complex arguments
   - Filtering and pagination

3. **Practice**:
   - Convert string fields to enums in your schema
   - Add enums for status/state fields
   - Test with [Enum Validator](/tools/enum-validator) tool
   - Use converter to see enum mapping to JSON Schema

---

## Key Takeaways

✅ **Enums restrict values** - Only valid options allowed  
✅ **Type-safe** - Clients and servers know valid values  
✅ **Prevent bugs** - Invalid states are impossible  
✅ **Use SCREAMING_SNAKE_CASE** - Constant naming convention  
✅ **Define once, reuse everywhere** - Put in $defs  
✅ **Easy to evolve** - Add new values without breaking changes  
✅ **Better than strings** - More expressive and safer  
✅ **Filter with enums** - Use in query arguments  

---

## Resources

- [GraphQL Docs - Enums](https://graphql.org/learn/type-system/#enumeration-types)
- [JSON Schema - Enum Keyword](https://json-schema.org/understanding-json-schema/reference/generic.html#enumerated-values)
- [Best Practices - Type Safety](https://principledgraphql.com/)
- [Apollo Docs - Enums](https://www.apollographql.com/docs/apollo-server/schema/schema/#enumeration-types)

---

**Questions?** [Open a discussion](https://github.com/json-schema-x-graphql/discussions) or check the [FAQ](/help/faq)

Last updated: 2025-12-15
