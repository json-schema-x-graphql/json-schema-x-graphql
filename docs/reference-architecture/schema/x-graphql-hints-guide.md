# X-GraphQL Hint System Guide

## Overview

The `x-graphql-*` hint system allows JSON Schema authors to provide GraphQL-specific metadata that guides the schema-to-GraphQL conversion process. This enables fine-grained control over GraphQL type generation while maintaining a clean JSON Schema as the canonical source.

## Motivation

**Problem:** Automatic JSON Schema → GraphQL conversion has limitations:
- Generic naming (e.g., `JSON` type for all objects)
- Loss of semantic relationships
- No way to express GraphQL-specific concepts (interfaces, unions, directives)
- Ambiguous handling of nested objects

**Solution:** Add optional `x-graphql-*` extension properties to JSON Schema that guide the converter while remaining valid JSON Schema (ignored by JSON Schema validators).

---

## Available Hints

### 1. `x-graphql-type-name`

**Purpose:** Override the auto-generated GraphQL type name

**Use Case:** When the JSON Schema property name doesn't match the desired GraphQL type name

```json
{
  "type": "object",
  "x-graphql-type-name": "Contract DataAssistanceType",
  "properties": {
    "code": { "type": "string" },
    "description": { "type": "string" }
  }
}
```

**Result:**
```graphql
type Contract DataAssistanceType {
  code: String
  description: String
}
```

Without hint:
```graphql
type AssistanceType {  # Generic name
  code: String
  description: String
}
```

---

### 2. `x-graphql-field-name`

**Purpose:** Override the GraphQL field name (useful for reserved words or naming conventions)

**Use Case:** Avoid GraphQL reserved words or match API conventions

```json
{
  "properties": {
    "type": {
      "type": "string",
      "x-graphql-field-name": "contractType"
    }
  }
}
```

**Result:**
```graphql
type Contract {
  contractType: String  # Avoids 'type' reserved word conflict
}
```

---

### 3. `x-graphql-type`

**Purpose:** Specify exact GraphQL type (scalar, enum, interface, union)

**Values:**
- `"interface"` - Generate a GraphQL interface
- `"union"` - Generate a GraphQL union
- `"enum"` - Force enum generation
- `"ID"` - Use GraphQL ID scalar
- `"DateTime"` - Use DateTime custom scalar
- `"JSON"` - Use JSON scalar for opaque data

**Use Case: Interface**
```json
{
  "type": "object",
  "x-graphql-type": "interface",
  "x-graphql-type-name": "BaseContract",
  "properties": {
    "piid": { "type": "string" },
    "title": { "type": "string" }
  }
}
```

**Result:**
```graphql
interface BaseContract {
  piid: String!
  title: String
}
```

**Use Case: Custom Scalar**
```json
{
  "lastModified": {
    "type": "string",
    "format": "date-time",
    "x-graphql-type": "DateTime"
  }
}
```

**Result:**
```graphql
type Contract {
  lastModified: DateTime
}
```

---

### 4. `x-graphql-implements`

**Purpose:** Specify which interfaces a type implements

**Use Case:** Inheritance relationships in GraphQL

```json
{
  "type": "object",
  "x-graphql-type-name": "Contract DataContract",
  "x-graphql-implements": ["BaseContract", "Timestamped"],
  "properties": {
    "piid": { "type": "string" },
    "obligatedAmount": { "type": "number" }
  }
}
```

**Result:**
```graphql
type Contract DataContract implements BaseContract & Timestamped {
  piid: String!
  obligatedAmount: Float
}
```

---

### 5. `x-graphql-description`

**Purpose:** Provide GraphQL-specific description (separate from JSON Schema description)

**Use Case:** Different documentation for API consumers vs schema validators

```json
{
  "type": "string",
  "description": "PIID must be alphanumeric, max 50 chars",
  "x-graphql-description": "Unique contract identifier assigned by the contracting agency"
}
```

**Result:**
```graphql
"""
Unique contract identifier assigned by the contracting agency
"""
piid: String!
```

---

### 6. `x-graphql-nullable`

**Purpose:** Override nullability inference from `required` array

**Use Case:** When JSON Schema nullability doesn't match GraphQL API design

```json
{
  "type": "object",
  "required": ["id"],
  "properties": {
    "id": {
      "type": "string",
      "x-graphql-nullable": false
    },
    "optional": {
      "type": "string",
      "x-graphql-nullable": true
    }
  }
}
```

**Result:**
```graphql
type Contract {
  id: String!        # Non-null from required + hint
  optional: String   # Nullable despite not in required
}
```

---

### 7. `x-graphql-union-types`

**Purpose:** Specify member types for a GraphQL union

**Use Case:** Polymorphic fields that can return multiple types

```json
{
  "systemExtension": {
    "x-graphql-type": "union",
    "x-graphql-type-name": "SystemExtension",
    "x-graphql-union-types": ["Contract DataExtension", "Legacy ProcurementExtension", "EASiExtension"],
    "oneOf": [
      { "$ref": "#/definitions/Contract DataExtension" },
      { "$ref": "#/definitions/Legacy ProcurementExtension" },
      { "$ref": "#/definitions/EASiExtension" }
    ]
  }
}
```

**Result:**
```graphql
union SystemExtension = Contract DataExtension | Legacy ProcurementExtension | EASiExtension
```

---

### 8. `x-graphql-directives`

**Purpose:** Apply GraphQL directives to types or fields

**Use Case:** Add custom directives for authorization, caching, etc.

```json
{
  "type": "object",
  "x-graphql-directives": [
    { "name": "auth", "args": { "requires": "ADMIN" } },
    { "name": "cacheControl", "args": { "maxAge": 3600 } }
  ],
  "properties": {
    "ssn": {
      "type": "string",
      "x-graphql-directives": [
        { "name": "redact" }
      ]
    }
  }
}
```

**Result:**
```graphql
type SensitiveData @auth(requires: ADMIN) @cacheControl(maxAge: 3600) {
  ssn: String @redact
}
```

---

### 9. `x-graphql-skip`

**Purpose:** Exclude a property from GraphQL schema generation

**Use Case:** Internal fields not exposed in GraphQL API

```json
{
  "properties": {
    "_internalId": {
      "type": "string",
      "x-graphql-skip": true
    },
    "publicId": {
      "type": "string"
    }
  }
}
```

**Result:**
```graphql
type Contract {
  publicId: String  # _internalId not included
}
```

---

### 10. `x-graphql-args`

**Purpose:** Define arguments for a GraphQL field (for query/mutation generation)

**Use Case:** Parameterized fields or root query fields

```json
{
  "contracts": {
    "type": "array",
    "items": { "$ref": "#/definitions/Contract" },
    "x-graphql-args": {
      "limit": { "type": "Int", "defaultValue": 10 },
      "offset": { "type": "Int", "defaultValue": 0 },
      "filter": { "type": "ContractFilterInput" }
    }
  }
}
```

**Result:**
```graphql
type Query {
  contracts(
    limit: Int = 10
    offset: Int = 0
    filter: ContractFilterInput
  ): [Contract!]!
}
```

---

## Complete Example: Contract Data System Extension

### Before (No Hints)

**JSON Schema:**
```json
{
  "systemExtensions": {
    "type": "object",
    "properties": {
      "contract_data": {
        "type": "object",
        "properties": {
          "data": { "type": "object" }
        }
      }
    }
  }
}
```

**Generated GraphQL:**
```graphql
type SystemExtensions {
  contract_data: Fpds
}

type Fpds {
  data: JSON  # Opaque, not queryable!
}
```

---

### After (With Hints)

**Enhanced JSON Schema:**
```json
{
  "systemExtensions": {
    "type": "object",
    "x-graphql-type-name": "SystemExtensions",
    "properties": {
      "contract_data": {
        "type": "object",
        "x-graphql-type-name": "Contract DataExtension",
        "x-graphql-description": "Federal Procurement Data System extension with grant/loan data",
        "properties": {
          "legacy_procurementanceType": {
            "type": "object",
            "x-graphql-type-name": "Contract DataAssistanceType",
            "x-graphql-description": "Classification of financial legacy_procurementance",
            "properties": {
              "code": {
                "type": "string",
                "x-graphql-description": "Assistance type code (e.g., '02' for grant)"
              },
              "description": { "type": "string" }
            }
          },
          "eligibility": {
            "type": "object",
            "x-graphql-type-name": "Contract DataEligibility",
            "properties": {
              "eligibleApplicants": {
                "type": "array",
                "items": { "type": "string" }
              },
              "beneficiaryEligibility": {
                "type": "array",
                "items": { "type": "string" }
              }
            }
          },
          "usage": {
            "type": "object",
            "x-graphql-type-name": "Contract DataUsage",
            "properties": {
              "fundsObligated": {
                "type": "number",
                "x-graphql-description": "Total funds obligated for this legacy_procurementance"
              },
              "costSharing": {
                "type": "object",
                "x-graphql-type-name": "CostSharing",
                "properties": {
                  "required": { "type": "boolean" },
                  "percentage": { "type": "number" }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Generated GraphQL:**
```graphql
type SystemExtensions {
  """
  Federal Procurement Data System extension with grant/loan data
  """
  contract_data: Contract DataExtension
}

type Contract DataExtension {
  """
  Classification of financial legacy_procurementance
  """
  legacy_procurementanceType: Contract DataAssistanceType
  eligibility: Contract DataEligibility
  usage: Contract DataUsage
}

type Contract DataAssistanceType {
  """
  Assistance type code (e.g., '02' for grant)
  """
  code: String!
  description: String
}

type Contract DataEligibility {
  eligibleApplicants: [String!]!
  beneficiaryEligibility: [String!]!
}

type Contract DataUsage {
  """
  Total funds obligated for this legacy_procurementance
  """
  fundsObligated: Float
  costSharing: CostSharing
}

type CostSharing {
  required: Boolean
  percentage: Float
}
```

---

## Decision Tree for Contributors

### When to Add x-graphql Hints

```
START: Does this schema need GraphQL exposure?
│
├─ NO → Don't add hints, keep schema clean
│
└─ YES → Continue ↓

   Is the auto-generated name unclear/wrong?
   │
   ├─ YES → Add x-graphql-type-name
   │
   └─ NO → Continue ↓

      Does this represent an interface or union?
      │
      ├─ YES → Add x-graphql-type + x-graphql-implements/union-types
      │
      └─ NO → Continue ↓

         Do field names conflict with GraphQL reserved words?
         │
         ├─ YES → Add x-graphql-field-name
         │
         └─ NO → Continue ↓

            Is GraphQL description different from validation description?
            │
            ├─ YES → Add x-graphql-description
            │
            └─ NO → Continue ↓

               Is this field internal/private?
               │
               ├─ YES → Add x-graphql-skip: true
               │
               └─ NO → Done! Auto-generation is sufficient
```

### When to Use Each Hint Type

| Scenario | Hint | Example |
|----------|------|---------|
| Type name is too generic | `x-graphql-type-name` | `"contract_data"` → `"Contract DataExtension"` |
| Field conflicts with reserved word | `x-graphql-field-name` | `"type"` → `"contractType"` |
| Polymorphic relationship | `x-graphql-type: "interface"` | `BaseContract` interface |
| Multiple possible types | `x-graphql-type: "union"` | `SystemExtension` union |
| Special scalar needed | `x-graphql-type` | `"DateTime"`, `"ID"`, `"JSON"` |
| Inheritance relationship | `x-graphql-implements` | `implements BaseContract` |
| API docs differ from validation | `x-graphql-description` | User-friendly vs technical |
| Override nullability | `x-graphql-nullable` | Force non-null or nullable |
| Add GraphQL directives | `x-graphql-directives` | `@auth`, `@deprecated` |
| Internal field | `x-graphql-skip` | `_metadata`, `_version` |
| Query parameters | `x-graphql-args` | `limit`, `offset`, `filter` |

---

## Best Practices

### 1. ✅ DO: Use hints sparingly

Only add hints when auto-generation produces incorrect or suboptimal results.

```json
// ❌ BAD: Unnecessary hint
{
  "name": {
    "type": "string",
    "x-graphql-type-name": "String"  // Already correct!
  }
}

// ✅ GOOD: Helpful hint
{
  "contract_data": {
    "type": "object",
    "x-graphql-type-name": "Contract DataExtension"  // Clarifies purpose
  }
}
```

### 2. ✅ DO: Keep JSON Schema clean

Hints should be metadata, not core schema structure.

```json
// ❌ BAD: Logic in hints
{
  "type": "object",
  "x-graphql-skip-if-production": true  // Don't do conditional logic
}

// ✅ GOOD: Simple metadata
{
  "type": "object",
  "x-graphql-type-name": "InternalData",
  "x-graphql-skip": true  // Simple boolean
}
```

### 3. ✅ DO: Document hint rationale

Add comments explaining why a hint is needed.

```json
{
  "type": {
    "type": "string",
    "x-graphql-field-name": "contractType",
    "description": "Contract type (renamed in GraphQL to avoid 'type' reserved word)"
  }
}
```

### 4. ✅ DO: Test hint-based generation

Always test that hints produce expected GraphQL output.

```bash
# Generate GraphQL from hinted schema
pnpm run generate:graphql:v2

# Compare output
diff public/data/schema_unification-v2-expected.graphql public/data/schema_unification-v2.graphql
```

### 5. ❌ DON'T: Use hints for business logic

Hints are for schema conversion, not runtime behavior.

```json
// ❌ BAD
{
  "x-graphql-authorization": "admin-only"  // Use directives instead
}

// ✅ GOOD
{
  "x-graphql-directives": [
    { "name": "auth", "args": { "requires": "ADMIN" } }
  ]
}
```

---

## Migration Strategy

### Phase 1: Add Hints to V1 Schema (One System)

**Goal:** Prove the hint system with Contract Data extension

1. **Add type names**
   ```json
   "contract_data": {
     "x-graphql-type-name": "Contract DataExtension"
   }
   ```

2. **Add descriptions**
   ```json
   "legacy_procurementanceType": {
     "x-graphql-description": "Classification of financial legacy_procurementance"
   }
   ```

3. **Test generation**
   ```bash
   pnpm run generate:graphql:v2
   ```

4. **Compare output**
   - Before: Generic types, opaque JSON
   - After: Specific types, queryable fields

### Phase 2: Extend to All Systems

1. Legacy Procurement extension
2. EASi extension
3. Logistics Mgmt extension (if applicable)

### Phase 3: Advanced Features

1. Add interfaces for common patterns
2. Add unions for polymorphic fields
3. Add directives for auth/caching
4. Document argument patterns for queries

---

## Validation

### Schema Validation

Hints don't affect JSON Schema validation:

```bash
pnpm run validate:schema  # Still passes!
```

### GraphQL Validation

Generated GraphQL must be valid:

```bash
pnpm run validate:graphql
```

### Hint Validation

Create a custom validator for hint structure:

```javascript
// scripts/validate-hints.js
function validateHints(schema) {
  const validHints = [
    'x-graphql-type-name',
    'x-graphql-field-name',
    'x-graphql-type',
    'x-graphql-implements',
    'x-graphql-description',
    'x-graphql-nullable',
    'x-graphql-union-types',
    'x-graphql-directives',
    'x-graphql-skip',
    'x-graphql-args'
  ];
  
  // Check for typos in hint names
  const hints = Object.keys(schema).filter(k => k.startsWith('x-graphql-'));
  const invalid = hints.filter(h => !validHints.includes(h));
  
  if (invalid.length > 0) {
    console.error(`Invalid hints found: ${invalid.join(', ')}`);
    process.exit(1);
  }
}
```

---

## Tooling Support

### VS Code Extension

Create JSON Schema for hints to enable autocomplete:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": {
    "x-graphql-extensions": {
      "properties": {
        "x-graphql-type-name": {
          "type": "string",
          "description": "Override GraphQL type name"
        },
        "x-graphql-description": {
          "type": "string",
          "description": "GraphQL-specific description"
        }
      }
    }
  }
}
```

### Converter Support

Update `scripts/generate-graphql-custom.mjs` to recognize hints:

```javascript
function getTypeName(schema, defaultName) {
  return schema['x-graphql-type-name'] || defaultName;
}

function getDescription(schema) {
  return schema['x-graphql-description'] || schema.description;
}

function shouldSkipField(schema) {
  return schema['x-graphql-skip'] === true;
}
```

---

## Examples by Use Case

### Use Case 1: Typed System Extensions

**Goal:** Make system extensions queryable in GraphQL

**Solution:** Add type names to nested objects

[See complete example above in "Complete Example: Contract Data System Extension"]

### Use Case 2: Polymorphic Fields

**Goal:** Contract can come from different systems

**Solution:** Use union type

```json
{
  "contract": {
    "x-graphql-type": "union",
    "x-graphql-union-types": ["Contract DataContract", "Legacy ProcurementContract", "EASiContract"],
    "oneOf": [
      { "$ref": "#/definitions/Contract DataContract" },
      { "$ref": "#/definitions/Legacy ProcurementContract" },
      { "$ref": "#/definitions/EASiContract" }
    ]
  }
}
```

### Use Case 3: Common Interface

**Goal:** All contracts share base fields

**Solution:** Create interface and implement it

```json
{
  "BaseContract": {
    "x-graphql-type": "interface",
    "properties": {
      "piid": { "type": "string" },
      "title": { "type": "string" },
      "lastModified": { "type": "string" }
    }
  },
  "Contract DataContract": {
    "x-graphql-implements": ["BaseContract"],
    "properties": {
      "piid": { "type": "string" },
      "title": { "type": "string" },
      "lastModified": { "type": "string" },
      "obligatedAmount": { "type": "number" }
    }
  }
}
```

---

## Testing Strategy

### 1. Unit Tests

Test hint parsing:

```javascript
// tests/x-graphql-hints.test.js
describe('x-graphql hints', () => {
  it('should extract type name hint', () => {
    const schema = { 'x-graphql-type-name': 'Contract DataExtension' };
    expect(getTypeName(schema, 'Default')).toBe('Contract DataExtension');
  });

  it('should fall back to default when no hint', () => {
    const schema = {};
    expect(getTypeName(schema, 'Default')).toBe('Default');
  });
});
```

### 2. Integration Tests

Test full schema conversion:

```javascript
describe('hint-based generation', () => {
  it('should generate typed Contract Data extension', () => {
    const schema = loadSchema('schema_unification.schema.v2-hinted.json');
    const graphql = generateGraphQL(schema);
    
    expect(graphql).toContain('type Contract DataExtension');
    expect(graphql).toContain('legacy_procurementanceType: Contract DataAssistanceType');
  });
});
```

### 3. Snapshot Tests

Compare generated GraphQL against expected output:

```javascript
describe('GraphQL generation snapshots', () => {
  it('matches expected output', () => {
    const schema = loadSchema('schema_unification.schema.v2-hinted.json');
    const graphql = generateGraphQL(schema);
    expect(graphql).toMatchSnapshot();
  });
});
```

---

## Future Enhancements

### 1. Hint Inheritance

Allow child schemas to inherit parent hints:

```json
{
  "definitions": {
    "BaseExtension": {
      "x-graphql-directives": [{ "name": "auth" }]
    },
    "Contract DataExtension": {
      "allOf": [
        { "$ref": "#/definitions/BaseExtension" }
      ]
      // Inherits @auth directive
    }
  }
}
```

### 2. Hint Macros

Define reusable hint patterns:

```json
{
  "x-graphql-macros": {
    "adminOnly": {
      "x-graphql-directives": [
        { "name": "auth", "args": { "requires": "ADMIN" } }
      ]
    }
  },
  "sensitiveData": {
    "x-graphql-macro": "adminOnly"
  }
}
```

### 3. Conditional Hints

Apply hints based on environment:

```json
{
  "internalId": {
    "type": "string",
    "x-graphql-skip": {
      "production": true,
      "development": false
    }
  }
}
```

---

## References

- [JSON Schema Extension Guidelines](https://json-schema.org/understanding-json-schema/reference/generic.html)
- [GraphQL Type System](https://graphql.org/learn/schema/)
- [ADR 0002: Schema Tooling & Automation](../adr/0002-schema-tooling-automation.md)
- [V1 vs V2 Schema Comparison](V1-VS-V2-SCHEMA-COMPARISON.md)

---

## Support

For questions or issues with the x-graphql hint system:

1. Check this guide first
2. Review examples in `src/data/schema_unification.schema.v2-hinted.json` (once created)
3. Run `pnpm run generate:graphql:v2` to test your hints
4. Open an issue on GitHub with your schema snippet

---

**Status:** ✅ Complete Guide - Ready for Implementation

**Next Steps:**
1. ✅ Document hint system (this file)
2. 🔄 Enhance converter to support hints
3. ⏳ Add example annotations to V1 schema (Contract Data system)
4. ⏳ Test hint-based generation
5. ⏳ Document decision tree for contributors (included above)
