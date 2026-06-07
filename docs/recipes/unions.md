# Unions Recipe

This recipe demonstrates how to define a Union type.

## Concept

Use `oneOf` to create a Union. Ensure `x-graphql-type: "union"` is implicit or explicit depending on configuration, but pure `oneOf` references are generally treated as Unions.

## JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": {
    "SearchResult": {
      "title": "SearchResult",
      "oneOf": [
        { "$ref": "#/definitions/Author" },
        { "$ref": "#/definitions/Book" }
      ]
    },
    "Author": {
      "type": "object",
      "title": "Author",
      "properties": {
        "name": { "type": "string" }
      }
    },
    "Book": {
      "type": "object",
      "title": "Book",
      "properties": {
        "title": { "type": "string" }
      }
    }
  }
}
```

## Generated GraphQL

```graphql
union SearchResult = Author | Book

type Author {
  name: String
}

type Book {
  title: String
}
```
