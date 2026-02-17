# Apollo Federation Design Patterns

**Version:** 2.0  
**Last Updated:** January 2025

This guide documents best practices and common patterns for implementing Apollo Federation with JSON Schema x GraphQL converters.

---

## Table of Contents

1. [Entity Resolution Patterns](#entity-resolution-patterns)
2. [Foreign Key Pattern (Recommended)](#foreign-key-pattern-recommended)
3. [Non-Resolvable References](#non-resolvable-references)
4. [Composite Keys](#composite-keys)
5. [Entity Extensions](#entity-extensions)
6. [Resolver Implementation](#resolver-implementation)
7. [Common Mistakes](#common-mistakes)
8. [Testing & Validation](#testing--validation)

---

## Entity Resolution Patterns

### Overview

Apollo Federation allows you to split your GraphQL schema across multiple services (subgraphs). Entities are types that can be referenced and extended across subgraphs. The gateway needs to know how to fetch entity data when crossing subgraph boundaries.

### Key Concepts

- **Entity**: A type with `@key` directive that can be referenced from other subgraphs
- **Foreign Key**: A field that stores the key value of a related entity
- **Reference Resolution**: How the gateway fetches entity data across subgraphs
- **@external**: Marks fields that are defined in another subgraph
- **@provides**: Tells the gateway which fields this subgraph can provide
- **@requires**: Declares dependencies on other fields for resolution

---

## Foreign Key Pattern (Recommended)

### Problem

When one service references an entity from another service, the gateway needs to know how to resolve that entity. Without foreign key fields, the gateway cannot construct the query to fetch data from the owning service.

### Solution

**Store foreign key fields on the referencing entity** that match the `@key` fields of the referenced entity.

### Example: Product Reviews

#### Products Service (Owner)

```json
{
  "definitions": {
    "Product": {
      "type": "object",
      "description": "Product entity",
      "x-graphql-type-name": "Product",
      "x-graphql-federation-keys": ["upc"],
      "properties": {
        "upc": {
          "type": "string",
          "description": "Universal Product Code (primary key)",
          "x-graphql-field-type": "ID",
          "x-graphql-field-non-null": true
        },
        "name": {
          "type": "string",
          "description": "Product name"
        },
        "price": {
          "type": "number",
          "description": "Product price"
        }
      },
      "required": ["upc"]
    }
  }
}
```

**Generated SDL:**

```graphql
type Product @key(fields: "upc") {
  upc: ID!
  name: String
  price: Float
}
```

#### Reviews Service (Referencer)

```json
{
  "definitions": {
    "Product": {
      "type": "object",
      "description": "Extended Product type with reviews",
      "x-graphql-type-name": "Product",
      "x-graphql-federation-keys": ["upc"],
      "x-graphql-federation-extends": true,
      "properties": {
        "upc": {
          "type": "string",
          "description": "Universal Product Code",
          "x-graphql-field-type": "ID",
          "x-graphql-field-non-null": true
        },
        "reviews": {
          "type": "array",
          "description": "Reviews for this product",
          "x-graphql-field-type": "[Review!]",
          "x-graphql-field-non-null": true
        }
      },
      "required": ["upc"]
    },
    "Review": {
      "type": "object",
      "description": "Product review",
      "x-graphql-type-name": "Review",
      "x-graphql-federation-keys": ["id"],
      "properties": {
        "id": {
          "type": "string",
          "description": "Review ID",
          "x-graphql-field-type": "ID",
          "x-graphql-field-non-null": true
        },
        "product_upc": {
          "type": "string",
          "description": "Foreign key to Product (UPC)",
          "x-graphql-field-name": "productUpc",
          "x-graphql-field-type": "ID",
          "x-graphql-field-non-null": true
        },
        "rating": {
          "type": "integer",
          "description": "Rating from 1-5"
        },
        "body": {
          "type": "string",
          "description": "Review text"
        },
        "product": {
          "type": "object",
          "description": "Product being reviewed",
          "x-graphql-field-type": "Product",
          "x-graphql-field-non-null": true
        }
      },
      "required": ["id", "product_upc", "product"]
    }
  }
}
```

**Generated SDL:**

```graphql
type Product @key(fields: "upc") {
  upc: ID!
  reviews: [Review!]!
}

type Review @key(fields: "id") {
  id: ID!
  productUpc: ID!
  rating: Int
  body: String
  product: Product!
}
```

### Why This Works

1. **Gateway Query Path**: When resolving `Review.product`, the gateway:
   - Reads `Review.productUpc` from the Reviews service
   - Uses that value to construct `Product(upc: "...")` query
   - Fetches full Product data from Products service

2. **No Ambiguity**: The foreign key explicitly stores which product this review belongs to

3. **Resolver Implementation**: Your resolver can use the foreign key to fetch the entity

---

## Non-Resolvable References

### When to Use

Use non-resolvable references when:

- You only need to reference an entity stub without fetching additional fields
- The referenced entity's data is fully contained in the referencing service
- You want to avoid unnecessary network calls

### JSON Schema Pattern

```json
{
  "Product": {
    "type": "object",
    "x-graphql-type-name": "Product",
    "x-graphql-federation-keys": [
      {
        "fields": "upc",
        "resolvable": false
      }
    ],
    "properties": {
      "upc": {
        "type": "string",
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      }
    },
    "required": ["upc"]
  }
}
```

**Generated SDL:**

```graphql
type Product @key(fields: "upc", resolvable: false) {
  upc: ID!
}
```

### Important Note

With `resolvable: false`, the gateway will **not** attempt to fetch fields from the Product's owning service. Queries requesting additional Product fields will fail.

---

## Composite Keys

### Single Object with Multiple Fields

```json
{
  "User": {
    "type": "object",
    "x-graphql-federation-keys": ["id organizationId"],
    "properties": {
      "id": {
        "type": "string",
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      },
      "organization_id": {
        "type": "string",
        "x-graphql-field-name": "organizationId",
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      },
      "name": {
        "type": "string"
      }
    },
    "required": ["id", "organization_id"]
  }
}
```

**Generated SDL:**

```graphql
type User @key(fields: "id organizationId") {
  id: ID!
  organizationId: ID!
  name: String
}
```

### Nested Object Keys

```json
{
  "User": {
    "type": "object",
    "x-graphql-federation-keys": ["id organization { id }"],
    "properties": {
      "id": {
        "type": "string",
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      },
      "organization": {
        "type": "object",
        "x-graphql-field-type": "Organization",
        "x-graphql-field-non-null": true
      }
    },
    "required": ["id", "organization"]
  },
  "Organization": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      }
    },
    "required": ["id"]
  }
}
```

**Generated SDL:**

```graphql
type User @key(fields: "id organization { id }") {
  id: ID!
  organization: Organization!
}

type Organization {
  id: ID!
}
```

### Multiple Keys

```json
{
  "Product": {
    "type": "object",
    "x-graphql-federation-keys": ["upc", "sku"],
    "properties": {
      "upc": {
        "type": "string",
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      },
      "sku": {
        "type": "string",
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      }
    }
  }
}
```

**Generated SDL:**

```graphql
type Product @key(fields: "upc") @key(fields: "sku") {
  upc: ID!
  sku: ID!
}
```

---

## Entity Extensions

### Extending vs Owning

**Owner Service** (defines the entity):

```json
{
  "User": {
    "type": "object",
    "x-graphql-type-name": "User",
    "x-graphql-federation-keys": ["email"],
    "properties": {
      "email": {
        "type": "string",
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      },
      "name": {
        "type": "string"
      }
    },
    "required": ["email"]
  }
}
```

**Extending Service** (adds fields):

```json
{
  "User": {
    "type": "object",
    "x-graphql-type-name": "User",
    "x-graphql-federation-keys": ["email"],
    "x-graphql-federation-extends": true,
    "properties": {
      "email": {
        "type": "string",
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      },
      "reviews": {
        "type": "array",
        "x-graphql-field-type": "[Review!]",
        "x-graphql-field-non-null": true
      }
    },
    "required": ["email"]
  }
}
```

### Using @external and @requires

When you need to access external fields to compute your own:

```json
{
  "Product": {
    "type": "object",
    "x-graphql-federation-keys": ["upc"],
    "x-graphql-federation-extends": true,
    "properties": {
      "upc": {
        "type": "string",
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      },
      "price": {
        "type": "number",
        "x-graphql-field-type": "Float",
        "x-graphql-federation-external": true
      },
      "weight": {
        "type": "number",
        "x-graphql-field-type": "Float",
        "x-graphql-federation-external": true
      },
      "shipping_estimate": {
        "type": "number",
        "x-graphql-field-name": "shippingEstimate",
        "x-graphql-field-type": "Float",
        "x-graphql-federation-requires": "price weight"
      }
    }
  }
}
```

**Generated SDL:**

```graphql
type Product @key(fields: "upc") {
  upc: ID!
  price: Float @external
  weight: Float @external
  shippingEstimate: Float @requires(fields: "price weight")
}
```

### Using @provides

Tell the gateway you can provide certain fields of a referenced entity:

```json
{
  "Review": {
    "type": "object",
    "properties": {
      "product": {
        "type": "object",
        "x-graphql-field-type": "Product",
        "x-graphql-field-non-null": true,
        "x-graphql-federation-provides": "name"
      }
    }
  }
}
```

**Generated SDL:**

```graphql
type Review {
  product: Product! @provides(fields: "name")
}
```

---

## Resolver Implementation

### \_\_resolveReference Method

Every entity type needs a `__resolveReference` resolver:

**Node.js Example:**

```javascript
const resolvers = {
  Product: {
    __resolveReference(reference) {
      // reference contains the key field(s), e.g., { __typename: 'Product', upc: '12345' }
      return fetchProductByUpc(reference.upc);
    },
  },
};
```

**Using DataLoader (Recommended):**

```javascript
const productLoader = new DataLoader(async (upcs) => {
  const products = await db.products.findMany({
    where: { upc: { in: upcs } },
  });

  // Return in same order as input
  return upcs.map((upc) => products.find((p) => p.upc === upc));
});

const resolvers = {
  Product: {
    __resolveReference(reference, context) {
      return context.productLoader.load(reference.upc);
    },
  },
};
```

### Foreign Key Resolvers

When resolving relationships using foreign keys:

```javascript
const resolvers = {
  Review: {
    // Resolve the product relationship using the foreign key
    product(review, args, context) {
      return context.productLoader.load(review.productUpc);
    },

    // Resolve the author relationship using the foreign key
    author(review, args, context) {
      return context.userLoader.load(review.authorEmail);
    },
  },
};
```

### Extension Resolvers

For extended entity types:

```javascript
const resolvers = {
  Product: {
    // Resolve new field added by this service
    reviews(product, args, context) {
      return context.db.reviews.findMany({
        where: { productUpc: product.upc },
      });
    },
  },
};
```

---

## Common Mistakes

### 1. Missing Foreign Keys ❌

**Problem:**

```json
{
  "Review": {
    "properties": {
      "id": { "type": "string" },
      "product": {
        "x-graphql-field-type": "Product"
      }
    }
  }
}
```

**Issue:** No `product_upc` field means the gateway cannot resolve Product queries.

**Fix:** ✅

```json
{
  "Review": {
    "properties": {
      "id": { "type": "string" },
      "product_upc": {
        "x-graphql-field-name": "productUpc",
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      },
      "product": {
        "x-graphql-field-type": "Product"
      }
    },
    "required": ["product_upc"]
  }
}
```

### 2. Incorrect @external Usage ❌

**Problem:**

```json
{
  "Product": {
    "x-graphql-federation-keys": ["upc"],
    "x-graphql-federation-extends": true,
    "properties": {
      "upc": {
        "x-graphql-federation-external": true
      }
    }
  }
}
```

**Issue:** Key field marked @external in extension means the service cannot resolve Product entities.

**Fix:** ✅

```json
{
  "Product": {
    "x-graphql-federation-keys": ["upc"],
    "x-graphql-federation-extends": true,
    "properties": {
      "upc": {
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      }
    }
  }
}
```

### 3. Circular Dependencies ❌

**Problem:** Service A extends Entity from B, Service B extends Entity from A.

**Fix:** Restructure so one service owns the entity, others only extend it.

### 4. Missing \_\_resolveReference ❌

**Problem:** Entity defined but no resolver implementation.

**Fix:** Always implement `__resolveReference` for every entity type.

### 5. Mismatched Key Types ❌

**Problem:**

```json
// Service A
{ "upc": { "x-graphql-field-type": "String" } }

// Service B
{ "upc": { "x-graphql-field-type": "ID" } }
```

**Fix:** Ensure key field types match across all services.

---

## Testing & Validation

### Composition Validation

Use the validation script to check your schemas:

```bash
node scripts/validate-federation-composition.js
```

**Successful Output:**

```
✓ Composition successful!
✓ Supergraph schema written
```

**Failed Output with Error Details:**

```
✗ Composition failed with errors:
  - cannot move to subgraph "products" using @key(fields: "upc")
  - the key field(s) cannot be resolved from subgraph "reviews"
```

### Common Composition Errors

#### SATISFIABILITY_ERROR

**Symptom:** "cannot be satisfied by the subgraphs"

**Cause:** Missing foreign keys or @external on key fields

**Fix:** Add foreign key fields to referencing entity

#### EXTERNAL_MISSING_ON_BASE

**Symptom:** "Field marked @external but not defined in base"

**Cause:** Field marked @external but owning service doesn't define it

**Fix:** Remove @external or add field to owning service

#### KEY_FIELDS_MISSING_EXTERNAL

**Symptom:** "Key fields must be @external"

**Cause:** Extension declares new key fields

**Fix:** Use same keys as owning service, mark appropriately

### Manual Testing

Test entity resolution with queries:

```graphql
# Test crossing subgraph boundaries
query {
  product(upc: "12345") {
    name
    reviews {
      rating
      author {
        name
      }
    }
  }
}
```

Query planning inspection:

```bash
# Using Apollo Router
router --dev --supergraph=supergraph.graphql
```

---

## Real-World Example

Complete working example with proper patterns:

### Users Service

```json
{
  "User": {
    "x-graphql-federation-keys": ["email"],
    "properties": {
      "email": {
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      },
      "name": { "type": "string" },
      "username": { "type": "string" }
    },
    "required": ["email"]
  }
}
```

### Products Service

```json
{
  "Product": {
    "x-graphql-federation-keys": ["upc"],
    "properties": {
      "upc": {
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      },
      "name": { "type": "string" },
      "price": { "type": "number" }
    },
    "required": ["upc"]
  }
}
```

### Reviews Service

```json
{
  "User": {
    "x-graphql-federation-keys": ["email"],
    "x-graphql-federation-extends": true,
    "properties": {
      "email": {
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      },
      "reviews": {
        "x-graphql-field-type": "[Review!]",
        "x-graphql-field-non-null": true
      }
    }
  },
  "Product": {
    "x-graphql-federation-keys": ["upc"],
    "x-graphql-federation-extends": true,
    "properties": {
      "upc": {
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      },
      "reviews": {
        "x-graphql-field-type": "[Review!]",
        "x-graphql-field-non-null": true
      }
    }
  },
  "Review": {
    "x-graphql-federation-keys": ["id"],
    "properties": {
      "id": {
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      },
      "product_upc": {
        "x-graphql-field-name": "productUpc",
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      },
      "author_email": {
        "x-graphql-field-name": "authorEmail",
        "x-graphql-field-type": "ID",
        "x-graphql-field-non-null": true
      },
      "rating": { "type": "integer" },
      "body": { "type": "string" },
      "product": {
        "x-graphql-field-type": "Product",
        "x-graphql-field-non-null": true
      },
      "author": {
        "x-graphql-field-type": "User",
        "x-graphql-field-non-null": true
      }
    },
    "required": ["id", "product_upc", "author_email"]
  }
}
```

---

## Additional Resources

- [Apollo Federation Documentation](https://www.apollographql.com/docs/federation/)
- [Federation Spec v2.3](https://specs.apollo.dev/federation/v2.3)
- [X-GraphQL Attribute Reference](../../docs/x-graphql/)
- [Examples](../federation/)
- [Validation Scripts](../../scripts/)

---

**Need Help?**

- Check composition with: `node scripts/validate-federation-composition.js`
- Review examples: `examples/federation/json-schemas/`
- Run tests: `./scripts/test-federation-examples.sh`
