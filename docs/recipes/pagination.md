# Pagination (Relay) Recipe

This recipe demonstrates how to automatically generate Relay-compliant Connection types.

## Concept

Use `x-graphql-connection: true` on a type definition to generate `*Connection` and `*Edge` types for it.
Or use `x-graphql-connection: "TypeName"` on any object to trigger generation of connection types for `TypeName`.

## JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": {
    "User": {
      "type": "object",
      "title": "User",
      "x-graphql-connection": true,
      "properties": {
        "id": { "type": "string", "x-graphql-type": "ID" },
        "username": { "type": "string" }
      }
    },
    "Query": {
      "type": "object",
      "title": "Query",
      "properties": {
        "users": {
          "type": "object",
          "x-graphql-type": "UserConnection",
          "x-graphql-args": {
            "first": { "type": "integer" },
            "after": { "type": "string" }
          }
        }
      }
    }
  }
}
```

## Generated GraphQL

```graphql
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type UserEdge {
  cursor: String!
  node: User
}

type UserConnection {
  edges: [UserEdge]
  pageInfo: PageInfo!
  totalCount: Int
}

type User {
  id: ID
  username: String
}

type Query {
  users(first: Int, after: String): UserConnection
}
```
