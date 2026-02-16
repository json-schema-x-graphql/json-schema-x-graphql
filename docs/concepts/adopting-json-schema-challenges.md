# Challenges and Patterns: Emulating GraphQL Concepts in JSON Schema

While `json-schema-x-graphql` bridges the gap between JSON Schema and GraphQL, certain GraphQL-native concepts do not map 1:1 to JSON Schema's validation-centric model. This guide outlines the most difficult concepts to emulate and provides recommended patterns and alternative approaches.

## 1. Arguments on Fields

**The Friction**:
JSON Schema describes _data structures_ (objects, properties), whereas GraphQL fields are essentially _functions_ that can take arguments. JSON Schema has no native syntax for defining "arguments" for a property.

**GraphQL Native**:

```graphql
type User {
  avatar(size: Int = 100): String
}
```

**Recommended Pattern**: use `x-graphql-args`
Define arguments in a specific extension object attached to the property.

```json
{
  "properties": {
    "avatar": {
      "type": "string",
      "x-graphql-args": {
        "size": {
          "type": "integer",
          "default": 100
        }
      }
    }
  }
}
```

_Trade-off_: You lose standard JSON Schema validation for these arguments unless you build a custom validator or separate schema for the arguments.

---

## 2. Input Types vs. Output Types

**The Friction**:
In GraphQL, `Input` types (for mutations) and `Type` definitions (for queries) are strict and disjoint. A `User` type cannot be used as an argument to a mutation; you need a `UserInput`.
JSON Schema usage often reuses the same schema for validation of incoming data (Input) and outgoing data (Output).

**GraphQL Native**:

```graphql
input UserInput {
  name: String!
}
type User {
  id: ID!
  name: String!
}
```

**Recommended Pattern**: The "Dual-Purpose" Schema Strategy

1.  **Single Source**: Define the entity once in `user.schema.json`.
2.  **Contextual Generation**: Use the converter's ability to generate both.
    - **Auto-Generation**: If a schema is referenced in an `x-graphql-args` position, the converter currently (or should) generate an `Input` variant automatically (e.g., `UserInput`).
    - **Explicit Split**: For complex cases, maintain `user-input.schema.json` and `user-output.schema.json` that inherit from a `user-base.schema.json` using `allOf`.

```json
// user-base.schema.json
{ "definitions": { "name": { "type": "string" } } }

// user-output.schema.json
{
  "allOf": [ { "$ref": "user-base.json" } ],
  "properties": { "id": { "type": "string" } }
}
```

---

## 3. Interfaces & Polymorphism

**The Friction**:
GraphQL Interfaces (`interface`) imply a contract that implementing types _must_ satisfy.
JSON Schema's composition (`allOf`) adds constraints but doesn't strictly enforce named "Interface" relationships in the same way type systems do.

**GraphQL Native**:

```graphql
interface Node {
  id: ID!
}
type User implements Node {
  id: ID!
  name: String
}
```

**Recommended Pattern**: Explicit `x-graphql-implements`
Don't rely solely on `allOf` to infer interfaces. Be explicit.

```json
{
  "definitions": {
    "User": {
      "x-graphql-implements": ["Node"],
      "allOf": [{ "$ref": "#/definitions/Node" }],
      "properties": {
        "name": { "type": "string" }
      }
    }
  }
}
```

_Why_: This tells the converter explicitly to generate `implements Node` in SDL, while `allOf` ensures the JSON validation logic remains correct.

---

## 4. Nullability Semantics

**The Friction**:

- **GraphQL**: Field is nullable by default. `String!` means non-null.
- **JSON Schema**: Field is allowed to be missing or `null` unless in `required` array (for missing) or type excludes `null` (for null value).
- **Conflict**: APIs often distinguish between "null" (explicit reset) and "undefined" (no change).

**Recommended Pattern**: The strict `required` mapping

- **Non-Null**: Add property to `required` array AND ensure `type` does not include `"null"`.
- **Nullable**: Omit from `required` OR include `"null"` in type.

```json
{
  "type": "object",
  "required": ["id"],
  "properties": {
    "id": { "type": "string" }, // Becomes ID!
    "bio": { "type": "string" } // Becomes String (nullable)
  }
}
```

---

## 5. Unions

**The Friction**:
GraphQL Unions are distinct types (`union SearchResult = Human | Droid`).
JSON Schema has `oneOf`, which is purely about validation logic (does it match schema A or B?). `oneOf` can be messy if schemas overlap.

**Recommended Pattern**: Tagged Unions / `x-graphql-union`
Use `x-graphql-union` to explicitly name the union, rather than relying on the converter to guess a name like `Union_String_Int`.

```json
{
  "x-graphql-union": "SearchResult",
  "oneOf": [
    { "$ref": "#/definitions/Human" },
    { "$ref": "#/definitions/Droid" }
  ]
}
```

---

## 6. Logic & Resolvers (The "Runtime" Gap)

**The Friction**:
JSON Schema is static. It cannot express "fetch this from database X" or "transform this string". GraphQL SDL is often where developers think about _resolvers_.

**Recommended Pattern**: Directive-Driven Logic
Use directives to hint at runtime behavior, even if the runtime is custom.

```json
{
  "properties": {
    "weather": {
      "type": "string",
      "x-graphql-directives": ["@http(url: \"https://api.weather.com\")"]
    }
  }
}
```

_Alternative_: Keep JSON Schema for **Type Definitions** only. Write a separate "Resolver Map" in your code that maps `TypeName.fieldName` to functions. Don't try to embed business logic in the schema.

---

## 7. Order of Fields

**The Friction**:
JSON objects are unordered sets of key/value pairs. GraphQL schemas often rely on field order for readability or documentation tools.

**Recommended Pattern**: `x-graphql-field-order` (Planned/Custom)
Or, strictly rely on the converter's option `sortFields: false`, which respects the order of keys in the source JSON file (if the parser supports it).

---

## Summary of Recommendations

| Concept        | Difficulty | Native Mechanism   | Recommended `x-graphql` Pattern         |
| :------------- | :--------- | :----------------- | :-------------------------------------- |
| **Arguments**  | High       | `field(arg: Type)` | `x-graphql-args` object                 |
| **Interfaces** | Med        | `implements`       | `x-graphql-implements` + `allOf`        |
| **Inputs**     | Med        | `input` vs `type`  | Contextual generation or Explicit Split |
| **Unions**     | Med        | `union`            | `oneOf` + `x-graphql-union` name tag    |
| **Directives** | Low        | `@dir`             | `x-graphql-directives` array            |
