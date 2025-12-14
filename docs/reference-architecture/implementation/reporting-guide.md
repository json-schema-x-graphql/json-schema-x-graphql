# Reporting Use Case - JSON Schema Implementation Guide

This guide describes how to update the JSON Schema (`src/data/schema_unification.schema.json`) to achieve 1:1 validation parity with the enhanced GraphQL schema and support the new Reporting Use Case fields.

## Part 1: Schema Enhancements

### 1. Line Item Details

Add a new object definition and property to represent line items on orders.

1. **Define `LineItem` in `$defs`:**

```jsonc
// ...inside "$defs" object in schema_unification.schema.json
"LineItem": {
  "type": "object",
  "title": "LineItem",
  "description": "A specific line item on a contract order",
  "properties": {
    "id": { "type": "string" },
    "lineNumber": { "type": "string" },
    "description": { "type": "string" },
    "quantity": { "type": "number" },
    "unit": { "type": "string" },
    "unitPrice": { "type": "number" },
    "totalAmount": { "type": "number" },
    "productOrServiceCode": { "type": "string" }
  },
  "required": ["id", "lineNumber"]
}
```

1. **Add `lineItems` property to `Order` schema:**

```jsonc
// ...inside "properties" of the Order definition
"lineItems": {
  "type": "array",
  "description": "List of products or services on this order",
  "items": { "$ref": "#/\$defs/LineItem" }
}
```

### 2. Performance Dates

Add a new date-time field to the `Contract` interface and implementing types.

1. **Define `periodOfPerformanceEndDate` property on `Contract`:**

```jsonc
// ...inside "properties" of the Contract definition
"periodOfPerformanceEndDate": {
  "type": "string",
  "format": "date-time",
  "description": "The agreed upon completion date for the contract or order"
}
```

1. **If `Order` is a subtype, repeat the property there (or inherit if using `allOf`).**

## Part 2: JSON Schema vs. GraphQL Parity

For every field you add to the GraphQL schema (e.g., `lineItems`, `periodOfPerformanceEndDate`), ensure the matching JSON Schema:

- Defines the field under the correct `properties` block.
- Uses the correct JSON type (`string`, `number`, `boolean`, `array`, `object`).
- Specifies formats (`date-time`, `email`, `uri`) or `enum` where applicable.
- Marks required fields in `required` arrays.

## Part 3: Validation Workflow

1. After updating `schema_unification.schema.json`, run:

  ```bash
  python python/validate_schemas.py src/data/schema_unification.schema.json
  pnpm run validate:graphql
  pnpm run validate:sync
  pnpm run validate:sync:strict
  ```

1. Regenerate interop artifacts:

  ```bash
  pnpm run generate:schema:interop
  ```

1. Commit changes and ensure all CI checks pass.

With these additions, your JSON Schema will fully validate data for the new Reporting Use Case fields, ensuring 1:1 parity with your enhanced GraphQL schema.
