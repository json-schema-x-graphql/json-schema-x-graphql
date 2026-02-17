# Comprehensive Guide to JSON Schema x GraphQL Overrides

This guide details the advanced capabilities of the JSON Schema to GraphQL converter, focusing on the `x-graphql` extension object. This extension allows for precise control over the generated GraphQL SDL, enabling full support for Apollo Federation, complex type systems, and runtime directives.

## Table of Contents

1. [GraphQL Scalar Type Overrides](#1-graphql-scalar-type-overrides)
2. [Complex Type Definitions](#2-complex-type-definitions)
3. [Field-Level Configurations](#3-field-level-configurations)
4. [Apollo Federation Support](#4-apollo-federation-support)
5. [Directive Applications](#5-directive-applications)
6. [Schema Organization](#6-schema-organization)
7. [Advanced Type System Features](#7-advanced-type-system-features)
8. [Validation & Constraints](#8-validation--constraints)
9. [Performance & Optimization](#9-performance--optimization)

---

## 1. GraphQL Scalar Type Overrides

Standard JSON types often map to multiple GraphQL scalars. Use overrides to specify exact types.

### Custom Scalar Mappings

```json
{
  "properties": {
    "id": {
      "type": "string",
      "x-graphql": { "type": "ID" }
    },
    "amount": {
      "type": "number",
      "x-graphql": { "type": "Decimal" }
    },
    "metadata": {
      "type": "object",
      "x-graphql": { "type": "JSON" }
    },
    "createdAt": {
      "type": "string",
      "format": "date-time",
      "x-graphql": { "type": "DateTime" }
    }
  }
}
```

### Large Number Types

```json
{
  "properties": {
    "bigNumber": {
      "type": "integer",
      "x-graphql": { "type": "BigInt" }
    },
    "preciseDecimal": {
      "type": "number",
      "x-graphql": { "type": "BigDecimal" }
    }
  }
}
```

---

## 2. Complex Type Definitions

Go beyond basic objects with Unions, Interfaces, and Input types.

### Union Types

Define a type that can return one of several object types.

```json
{
  "SearchResult": {
    "oneOf": [
      { "$ref": "#/$defs/User" },
      { "$ref": "#/$defs/Post" },
      { "$ref": "#/$defs/Comment" }
    ],
    "x-graphql": {
      "type": "union",
      "resolveType": "searchResultType"
    }
  }
}
```

### Interface Types

Define common fields that other types must implement.

```json
{
  "Node": {
    "type": "object",
    "x-graphql": {
      "type": "interface",
      "resolveType": "nodeType"
    },
    "properties": {
      "id": { "type": "string", "x-graphql": { "type": "ID" } }
    }
  }
}
```

### Input Types

Explicitly define types used as arguments in mutations or queries.

```json
{
  "CreateUserInput": {
    "type": "object",
    "x-graphql": {
      "type": "input"
    },
    "properties": {
      "username": { "type": "string" },
      "email": { "type": "string" }
    }
  }
}
```

---

## 3. Field-Level Configurations

### Field Arguments

Add arguments to fields to support filtering, pagination, etc.

```json
{
  "properties": {
    "posts": {
      "type": "array",
      "items": { "$ref": "#/$defs/Post" },
      "x-graphql": {
        "args": {
          "first": {
            "type": "integer",
            "default": 10,
            "description": "Number of items to return"
          },
          "after": {
            "type": "string",
            "x-graphql": { "type": "Cursor" },
            "description": "Pagination cursor"
          },
          "filter": {
            "$ref": "#/$defs/PostFilterInput"
          },
          "orderBy": {
            "type": "string",
            "enum": ["CREATED_AT", "TITLE"],
            "x-graphql": { "type": "PostOrderBy" }
          }
        }
      }
    }
  }
}
```

### Computed/Virtual Fields

Define fields that don't exist in the JSON source but are calculated at runtime.

```json
{
  "properties": {
    "fullName": {
      "type": "string",
      "x-graphql": {
        "computed": true,
        "dependencies": ["firstName", "lastName"]
      }
    }
  }
}
```

---

## 4. Apollo Federation Support

Full support for Federation v1 and v2 directives.

### Entity Configuration

Mark a type as an Entity with keys.

```json
{
  "Product": {
    "type": "object",
    "x-graphql": {
      "federation": {
        "keys": [
          { "fields": "id", "resolvable": true },
          { "fields": "sku brand", "resolvable": false }
        ],
        "extends": true,
        "shareable": true,
        "interfaceObject": true
      }
    }
  }
}
```

### Field-Level Federation

Control field visibility and requirements across subgraphs.

```json
{
  "properties": {
    "price": {
      "type": "number",
      "x-graphql": {
        "federation": {
          "external": true,
          "requires": "currency"
        }
      }
    },
    "inStock": {
      "type": "boolean",
      "x-graphql": {
        "federation": {
          "provides": "inventory { quantity warehouse }",
          "shareable": true
        }
      }
    },
    "reviews": {
      "type": "array",
      "x-graphql": {
        "federation": {
          "override": { "from": "reviews-subgraph" }
        }
      }
    }
  }
}
```

### Federation Directives

Apply global federation settings.

```json
{
  "x-graphql": {
    "federation": {
      "composeDirective": "@custom",
      "tags": [
        { "name": "team", "value": "product-catalog" },
        { "name": "contract", "value": "public" }
      ],
      "authenticated": true,
      "requiresScopes": [["read:products"], ["admin"]]
    }
  }
}
```

---

## 5. Directive Applications

Apply arbitrary directives to fields or types.

### Field Directives

```json
{
  "properties": {
    "email": {
      "type": "string",
      "deprecated": true,
      "x-graphql": {
        "deprecation": {
          "reason": "Use contactEmail instead",
          "deletionDate": "2025-01-01"
        },
        "directives": [
          {
            "name": "auth",
            "args": { "requires": "USER" }
          }
        ]
      }
    },
    "ssn": {
      "type": "string",
      "x-graphql": {
        "directives": [
          {
            "name": "sensitive",
            "args": { "level": "PII", "encryption": "required" }
          }
        ]
      }
    }
  }
}
```

### Type Directives

```json
{
  "User": {
    "type": "object",
    "x-graphql": {
      "directives": [
        {
          "name": "cacheControl",
          "args": { "maxAge": 300, "scope": "PRIVATE" }
        }
      ]
    }
  }
}
```

---

## 6. Schema Organization

### Namespace/Module Support

Structure large schemas by namespacing types.

```json
{
  "Account": {
    "type": "object",
    "x-graphql": {
      "namespace": "billing",
      "implements": ["Node", "Timestamped"]
    }
  }
}
```

### Root Types

Explicitly define Query, Mutation, and Subscription roots.

```json
{
  "x-graphql": {
    "schema": {
      "query": {
        "fields": {
          "user": {
            "type": "User",
            "args": {
              "id": { "type": "string", "x-graphql": { "type": "ID!" } }
            }
          }
        }
      },
      "mutation": {
        "fields": {
          "createUser": {
            "type": "User",
            "args": { "input": { "$ref": "#/$defs/CreateUserInput" } }
          }
        }
      }
    }
  }
}
```

---

## 7. Advanced Type System Features

### Generic/Parameterized Types

Define generic structures like Connections.

```json
{
  "Connection": {
    "type": "object",
    "x-graphql": {
      "generic": {
        "typeParams": ["T"],
        "implements": "Relay.Connection<T>"
      }
    },
    "properties": {
      "edges": {
        "type": "array",
        "x-graphql": { "type": "[Edge<T>]" }
      }
    }
  }
}
```

### Custom Null Handling

Override JSON Schema's `required` behavior for GraphQL nullability.

```json
{
  "properties": {
    "middleName": {
      "type": ["string", "null"],
      "x-graphql": {
        "nullable": true
      }
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "x-graphql": {
        "nullable": false,
        "nullableItems": true // Result: [String]!
      }
    }
  }
}
```

---

## 8. Validation & Constraints

Pass JSON Schema validation constraints to custom GraphQL directives.

```json
{
  "properties": {
    "email": {
      "type": "string",
      "format": "email",
      "x-graphql": {
        "validate": {
          "email": true,
          "unique": true,
          "lowercase": true
        }
      }
    },
    "age": {
      "type": "integer",
      "minimum": 0,
      "maximum": 150,
      "x-graphql": {
        "validate": {
          "min": 0,
          "max": 150,
          "custom": "validateAge"
        }
      }
    }
  }
}
```

---

## 9. Performance & Optimization

Provide hints for query planners and data loaders.

```json
{
  "properties": {
    "profile": {
      "$ref": "#/$defs/UserProfile",
      "x-graphql": {
        "resolve": {
          "strategy": "dataloader",
          "batchKey": "userId",
          "cache": { "ttl": 300 }
        }
      }
    },
    "posts": {
      "type": "array",
      "x-graphql": {
        "resolve": {
          "strategy": "lazy",
          "pagination": "cursor",
          "defaultLimit": 10
        }
      }
    }
  }
}
```
