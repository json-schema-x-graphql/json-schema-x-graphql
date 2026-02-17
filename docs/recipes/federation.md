# Federation Recipe

This recipe demonstrates how to define a Federated Entity (Apollo Federation v2).

## Concept

Use `x-graphql-federation` at the object level to define keys, shareability, and extends status.

## JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": {
    "Product": {
      "type": "object",
      "title": "Product",
      "x-graphql-federation": {
        "keys": ["upc"],
        "shareable": true
      },
      "properties": {
        "upc": {
          "type": "string",
          "x-graphql-type": "ID"
        },
        "name": {
          "type": "string"
        },
        "price": {
          "type": "integer"
        }
      },
      "required": ["upc", "name"]
    },
    "Review": {
      "type": "object",
      "title": "Review",
      "properties": {
        "body": { "type": "string" },
        "author": {
          "$ref": "#/definitions/User"
        },
        "product": {
          "$ref": "#/definitions/Product"
        }
      }
    },
    "User": {
      "type": "object",
      "title": "User",
      "x-graphql-federation": {
        "keys": ["id"],
        "extends": true
      },
      "properties": {
        "id": { "type": "string", "x-graphql-type": "ID" }
      },
      "required": ["id"]
    }
  }
}
```

## Generated GraphQL

```graphql
type Product @key(fields: "upc") @shareable {
  upc: ID!
  name: String!
  price: Int
}

type Review {
  body: String
  author: User
  product: Product
}

type User @key(fields: "id") @extends {
  id: ID!
}
```
