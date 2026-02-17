# X-GraphQL Hints: Quick Reference

> **Fast reference for using x-graphql-\* hints in JSON Schema to generate high-quality GraphQL SDL**

## Quick Start

### 1. Add hints to your JSON Schema

```json
{
  "definitions": {
    "Contract": {
      "type": "object",
      "x-graphql-type": "interface",
      "properties": {
        "contractId": {
          "type": "string",
          "x-graphql-nullable": false
        }
      }
    }
  }
}
```

### 2. Generate GraphQL

```bash
node scripts/generate-graphql-enhanced.mjs input.json output.graphql
```

### 3. Result

```graphql
interface Contract {
  contractId: String!
}
```

## All Hint Types

| Hint                    | Purpose                      | Example                                           |
| ----------------------- | ---------------------------- | ------------------------------------------------- |
| `x-graphql-type`        | Specify GraphQL type kind    | `"interface"`, `"union"`, `"enum"`                |
| `x-graphql-type-name`   | Override type name           | `"ProcurementInstrument"`                         |
| `x-graphql-field-name`  | Override field name          | `"procurementInstrumentId"`                       |
| `x-graphql-description` | GraphQL-specific description | `"Unique contract ID"`                            |
| `x-graphql-nullable`    | Override nullability         | `false` (makes field required)                    |
| `x-graphql-implements`  | Specify interfaces           | `["Contract", "Searchable"]`                      |
| `x-graphql-union-types` | Union member types           | `["IDVContract", "Order"]`                        |
| `x-graphql-directives`  | Apply directives             | `[{"name": "currency", "args": {...}}]`           |
| `x-graphql-args`        | Field arguments              | `{"limit": {"type": "Int", "defaultValue": 100}}` |
| `x-graphql-skip`        | Exclude from GraphQL         | `true`                                            |

## Common Patterns

### Interface Inheritance

**JSON Schema:**

```json
{
  "Contract": {
    "x-graphql-type": "interface",
    "properties": {
      "contractId": { "type": "string" }
    }
  },
  "IDVContract": {
    "type": "object",
    "x-graphql-implements": ["Contract"],
    "properties": {
      "contractId": { "type": "string" },
      "idvType": { "type": "string" }
    }
  }
}
```

**Generated GraphQL:**

```graphql
interface Contract {
  contractId: String
}

type IDVContract implements Contract {
  contractId: String
  idvType: String
}
```

### Union Types

**JSON Schema:**

```json
{
  "ContractSearchResult": {
    "x-graphql-type": "union",
    "x-graphql-union-types": ["IDVContract", "Order"],
    "oneOf": [
      { "$ref": "#/definitions/IDVContract" },
      { "$ref": "#/definitions/Order" }
    ]
  }
}
```

**Generated GraphQL:**

```graphql
union ContractSearchResult = IDVContract | Order
```

### Custom Scalars

**JSON Schema:**

```json
{
  "effectiveDate": {
    "type": "string",
    "format": "date-time"
  },
  "amount": {
    "type": "number",
    "x-graphql-directives": [
      {
        "name": "currency",
        "args": { "code": "USD" }
      }
    ]
  }
}
```

**Generated GraphQL:**

```graphql
effectiveDate: DateTime
amount: Float @currency(code: "USD")
```

### Field Renaming

**JSON Schema:**

```json
{
  "piid": {
    "type": "string",
    "x-graphql-field-name": "procurementInstrumentId"
  },
  "is8A": {
    "type": "boolean",
    "x-graphql-field-name": "isSBA8A"
  }
}
```

**Generated GraphQL:**

```graphql
procurementInstrumentId: String
isSBA8A: Boolean
```

### Query Arguments

**JSON Schema:**

```json
{
  "contracts": {
    "type": "array",
    "x-graphql-args": {
      "limit": {
        "type": "Int",
        "defaultValue": 100
      },
      "status": {
        "type": "ContractStatus"
      }
    }
  }
}
```

**Generated GraphQL:**

```graphql
contracts(limit: Int = 100, status: ContractStatus): [Contract!]
```

### Nullability Control

**JSON Schema:**

```json
{
  "properties": {
    "required_field": {
      "type": "string",
      "x-graphql-nullable": false
    },
    "optional_field": {
      "type": "string",
      "x-graphql-nullable": true
    }
  },
  "required": ["required_field"]
}
```

**Generated GraphQL:**

```graphql
required_field: String!
optional_field: String
```

## Decision Tree

```
Need advanced GraphQL features?
│
├─ Interface inheritance?
│   └─ Use: x-graphql-type: "interface" + x-graphql-implements
│
├─ Union types?
│   └─ Use: x-graphql-type: "union" + x-graphql-union-types
│
├─ Custom scalar?
│   └─ Use: format: "date-time" (auto-detected as DateTime)
│
├─ Field arguments?
│   └─ Use: x-graphql-args
│
├─ Directives?
│   └─ Use: x-graphql-directives
│
├─ Better field names?
│   └─ Use: x-graphql-field-name
│
└─ GraphQL-specific description?
    └─ Use: x-graphql-description
```

## Type Inference (No Hints Needed)

The converter automatically infers:

| JSON Schema                               | GraphQL            |
| ----------------------------------------- | ------------------ |
| `"type": "string"`                        | `String`           |
| `"type": "integer"`                       | `Int`              |
| `"type": "number"`                        | `Float`            |
| `"type": "boolean"`                       | `Boolean`          |
| `"type": "string", "format": "date-time"` | `DateTime`         |
| `"type": "array"`                         | `[Type]`           |
| `"$ref": "#/definitions/Type"`            | `Type`             |
| `"enum": [...]`                           | `enum TypeName`    |
| In `required` array                       | `Type!` (non-null) |

## Best Practices

### ✅ DO

- **Let inference work first** - Only add hints when needed
- **Use semantic field names** - `procurementInstrumentId` vs `piid`
- **Document with descriptions** - Help API consumers understand
- **Be consistent** - Same patterns across similar types

### ❌ DON'T

- **Over-hint** - Don't add hints for things that infer correctly
- **Contradict schema** - Keep hints aligned with JSON Schema semantics
- **Skip documentation** - Always explain why a hint is needed
- **Mix styles** - Be consistent in naming conventions

## Examples

### Complete Contract Data Example

See: `src/data/schema_unification-contract_data-hinted.schema.json`

Demonstrates:

- Contract interface with 6 fields
- IDVContract and Order implementing Contract
- ContractSearchResult union type
- Custom scalars (DateTime)
- Directives (@currency)
- Query arguments with defaults
- Field renaming (piid → procurementInstrumentId)

### Generated Output

See: `public/data/schema_unification-contract_data-hinted.graphql`

Result:

- 179 lines of clean GraphQL SDL
- 7 object types
- 1 interface
- 1 union
- 1 enum
- Full Query type with arguments

## CLI Usage

### Basic

```bash
node scripts/generate-graphql-enhanced.mjs input.json output.graphql
```

### With Paths

```bash
node scripts/generate-graphql-enhanced.mjs \
  src/data/my-schema.json \
  public/data/my-schema.graphql
```

### Output Example

```
🚀 Enhanced GraphQL Generator with x-graphql Hints

📥 Input:  src/data/my-schema.json
📤 Output: public/data/my-schema.graphql

📋 Processing JSON Schema with x-graphql hints...
  ├─ Phase 1: Processing interfaces...
    ├─ Generated interface: Contract
  ├─ Phase 2: Processing unions...
  ├─ Phase 3: Processing enums...
  ├─ Phase 4: Processing object types...
  ├─ Phase 5: Processing root Query type...
✅ GraphQL SDL generation complete!

📊 Statistics:
  ├─ Total lines: 179
  ├─ Object types: 7
  ├─ Interfaces: 1
  ├─ Unions: 1
  └─ Enums: 1
```

## Full Documentation

- **Complete Guide**: [`docs/x-graphql-hints-guide.md`](x-graphql-hints-guide.md)
- **Implementation**: [`docs/X-GRAPHQL-IMPLEMENTATION.md`](X-GRAPHQL-IMPLEMENTATION.md)
- **Summary**: [`docs/V2-GRAPHQL-ENHANCEMENT-SUMMARY.md`](V2-GRAPHQL-ENHANCEMENT-SUMMARY.md)

## Need Help?

1. Check the [complete guide](x-graphql-hints-guide.md) for detailed examples
2. Look at `src/data/schema_unification-contract_data-hinted.schema.json` for real-world usage
3. Review generated output in `public/data/schema_unification-contract_data-hinted.graphql`
4. Read implementation details in [X-GRAPHQL-IMPLEMENTATION.md](X-GRAPHQL-IMPLEMENTATION.md)

---

**Quick tip**: Start with type inference (no hints), then add hints only where needed for advanced features like interfaces, unions, or better naming.
