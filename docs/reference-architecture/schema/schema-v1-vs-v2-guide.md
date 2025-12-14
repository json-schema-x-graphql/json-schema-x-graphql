# Schema V1 vs V2 Guide

**Understanding the differences and migration path between V1 and V2 schemas**

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Overview](#overview)
3. [Key Differences](#key-differences)
4. [V2 Architecture](#v2-architecture)
5. [Migration Guide](#migration-guide)
6. [x-graphql Hints System](#x-graphql-hints-system)
7. [Breaking Changes](#breaking-changes)
8. [Benefits of V2](#benefits-of-v2)

---

## Quick Reference

### At a Glance

| Aspect | V1 | V2 |
|--------|----|----|
| **Field Naming** | camelCase | snake_case (canonical) |
| **Canonical Source** | GraphQL SDL | JSON Schema |
| **GraphQL Hints** | ❌ None | ✅ x-graphql-* extensions |
| **Interface Support** | ⚠️ Limited | ✅ Full support |
| **Union Types** | ⚠️ Basic | ✅ Enhanced with hints |
| **Custom Directives** | ❌ Not supported | ✅ Supported via hints |
| **Bidirectional Sync** | ⚠️ Manual | ✅ Automated pipeline |
| **Validation** | GraphQL only | GraphQL + JSON Schema + Python |
| **Type Safety** | Good | Excellent |
| **Tooling** | Basic | Comprehensive |

### Migration Checklist

- [ ] Read this guide completely
- [ ] Understand V2 architecture
- [ ] Review your current V1 usage
- [ ] Plan migration timeline
- [ ] Update to snake_case fields
- [ ] Add x-graphql hints
- [ ] Run migration script
- [ ] Validate with V2 validators
- [ ] Update documentation
- [ ] Deploy and monitor

---

## Overview

### What Changed?

The Schema Unification Forest project transitioned from V1 to V2 to improve:
- **Schema management** — JSON Schema as single source of truth
- **Field naming** — Consistent snake_case convention
- **Type system** — Rich GraphQL features via x-graphql hints
- **Validation** — Comprehensive multi-language validation
- **Developer experience** — Better tooling and documentation

### Timeline

- **V1 Era:** 2023 - Early 2024
  - GraphQL SDL as canonical
  - Manual schema synchronization
  - camelCase field names
  - Basic type system

- **Migration Period:** Q1 2024
  - Designed V2 architecture
  - Built conversion tools
  - Migrated data structures
  - Validated parity

- **V2 Era:** Mid 2024 - Present
  - JSON Schema canonical
  - Automated pipeline
  - snake_case fields
  - Enhanced type system

### Status

✅ **V2 is now canonical** — All new development uses V2  
⚠️ **V1 is deprecated** — Maintained for historical reference only  
📦 **V1 files archived** — Located in `src/data/archived/` and `src/legacy-pages/`

---

## Key Differences

### 1. Field Naming Convention

#### V1: camelCase

```json
{
  "contractId": "ABC123",
  "organizationInfo": {
    "primaryName": "ACME Corp",
    "dunsNumber": "123456789"
  },
  "financialInfo": {
    "obligatedAmount": 100000
  }
}
```

```graphql
type Contract {
  contractId: ID!
  organizationInfo: OrganizationInfo
  financialInfo: FinancialInfo
}
```

#### V2: snake_case (JSON Schema) + camelCase (GraphQL SDL)

```json
{
  "contract_id": "ABC123",
  "organization_info": {
    "primary_name": "ACME Corp",
    "duns_number": "123456789"
  },
  "financial_info": {
    "obligated_amount": 100000
  }
}
```

```graphql
type Contract {
  contractId: ID!          # Converted from contract_id
  organizationInfo: OrganizationInfo
  financialInfo: FinancialInfo
}
```

**Why?** Snake_case is standard for JSON Schema and aligns with Python/database conventions.

---

### 2. Canonical Source

#### V1: GraphQL SDL First

```
GraphQL SDL (manual) → JSON Schema (generated)
```

- SDL was hand-crafted
- JSON Schema derived from SDL
- Changes made to SDL, regenerated JSON

#### V2: JSON Schema First

```
JSON Schema (canonical) ↔ GraphQL SDL (bidirectional)
```

- JSON Schema is single source of truth
- GraphQL SDL generated from JSON Schema
- Bidirectional validation ensures parity
- Both formats committed to Git

**Why?** JSON Schema provides richer validation and is better suited for data-at-rest.

---

### 3. Type System Enhancements

#### V1: Basic Types

```graphql
# Limited interface support
type Contract {
  id: ID!
  name: String!
}

# Basic unions
union SearchResult = Contract | Organization

# Simple enums
enum Status {
  ACTIVE
  INACTIVE
}
```

#### V2: Enhanced with x-graphql Hints

```json
{
  "ContactRole": {
    "type": "string",
    "enum": ["primary", "technical", "administrative"],
    "x-graphql-enum": {
      "name": "ContactRole",
      "description": "Role of contact person",
      "values": {
        "primary": {
          "name": "PRIMARY",
          "description": "Primary contact for contract"
        },
        "technical": {
          "name": "TECHNICAL",
          "description": "Technical point of contact"
        }
      }
    }
  },
  "SystemExtension": {
    "x-graphql-union": {
      "name": "SystemExtension",
      "types": ["Contract DataExtension", "AssistExtension", "EasiExtension"]
    },
    "oneOf": [
      { "$ref": "#/definitions/Contract DataExtension" },
      { "$ref": "#/definitions/AssistExtension" },
      { "$ref": "#/definitions/EasiExtension" }
    ]
  }
}
```

**Benefits:**
- Richer enum documentation
- Proper union type support
- Interface implementation hints
- Custom directive metadata

---

### 4. Validation Approach

#### V1: Single Layer

```
GraphQL SDL validation only
```

- Validated SDL syntax
- Checked type references
- No data validation

#### V2: Multi-Layer

```
JSON Schema (Ajv) + GraphQL SDL + Parity Check + Python
```

**Validation Layers:**

1. **JSON Schema Structural** — Ajv validates schema correctness
2. **GraphQL SDL** — Validates generated SDL syntax
3. **Parity Validation** — Ensures JSON ↔ GraphQL consistency
4. **Python Validation** — Additional JSON Schema validation
5. **Integration Tests** — End-to-end validation

**Commands:**
```bash
pnpm run validate:all               # All validators
pnpm run validate:schema            # JSON Schema
pnpm run validate:graphql           # GraphQL SDL
pnpm run validate:sync              # Parity check
python python/validate_schemas.py   # Python validation
```

---

## V2 Architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│              V2 Schema Architecture                      │
└─────────────────────────────────────────────────────────┘

                   Canonical Source
                          │
                          ▼
         ┌────────────────────────────────┐
         │  schema_unification.schema.json         │
         │  (JSON Schema - snake_case)    │
         │  + x-graphql-* hints           │
         └────────────┬───────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
    ┌──────────┐           ┌──────────┐
    │Generator │           │Generator │
    │JSON→SDL  │           │SDL→JSON  │
    └─────┬────┘           └────┬─────┘
          │                     │
          ▼                     ▼
    ┌──────────┐           ┌──────────┐
    │Generated │           │Generated │
    │   SDL    │           │   JSON   │
    └─────┬────┘           └────┬─────┘
          │                     │
          └──────────┬──────────┘
                     │
                     ▼
            ┌────────────────┐
            │   Validators   │
            │  Check Parity  │
            └────────┬───────┘
                     │
                     ▼
              ┌────────────┐
              │  Website   │
              │ src/data/  │
              │ generated/ │
              └────────────┘
```

### Components

#### 1. Canonical JSON Schema
- **Location:** `src/data/schema_unification.schema.json`
- **Format:** JSON Schema draft-07/2020-12
- **Naming:** snake_case
- **Extensions:** x-graphql-* hints for GraphQL generation

#### 2. Field Mapping
- **Location:** `generated-schemas/field-name-mapping.json`
- **Purpose:** Maps camelCase ↔ snake_case
- **Generated:** Automatically from canonical schema

#### 3. Generators
- **JSON → SDL:** `generate-graphql-from-json-schema.mjs`
- **SDL → JSON:** `generate-graphql-json-schema.mjs`
- **V2 Enhanced:** `generate-graphql-json-schema-v2.mjs`

#### 4. Validators
- **Schema:** Ajv-based JSON Schema validation
- **GraphQL:** SDL syntax and type validation
- **Parity:** Bidirectional consistency checks
- **Python:** Additional JSON Schema validation

---

## Migration Guide

### Automated Migration

Use the conversion script:

```bash
node scripts/convert-v1-to-v2.mjs
```

This script:
1. Converts camelCase → snake_case
2. Updates $ref pointers
3. Adds x-graphql hints (basic)
4. Validates output

### Manual Migration Steps

#### Step 1: Convert Field Names

**Before (V1):**
```json
{
  "contractId": "123",
  "organizationInfo": {
    "primaryName": "ACME"
  }
}
```

**After (V2):**
```json
{
  "contract_id": "123",
  "organization_info": {
    "primary_name": "ACME"
  }
}
```

**Script:**
```bash
node scripts/dev/convert-camel-to-snake.mjs \
  input.schema.json \
  output.schema.json
```

#### Step 2: Add x-graphql Hints

For enums:
```json
{
  "contact_role": {
    "type": "string",
    "enum": ["primary", "technical"],
    "x-graphql-enum": {
      "name": "ContactRole",
      "values": {
        "primary": { "name": "PRIMARY" },
        "technical": { "name": "TECHNICAL" }
      }
    }
  }
}
```

For unions:
```json
{
  "system_extension": {
    "x-graphql-union": {
      "name": "SystemExtension",
      "types": ["Contract DataExtension", "AssistExtension"]
    },
    "oneOf": [
      { "$ref": "#/definitions/Contract DataExtension" },
      { "$ref": "#/definitions/AssistExtension" }
    ]
  }
}
```

#### Step 3: Update $ref Pointers

**Before:**
```json
{
  "$ref": "#/definitions/organizationInfo"
}
```

**After:**
```json
{
  "$ref": "#/definitions/organization_info"
}
```

#### Step 4: Validate Migration

```bash
# Validate JSON Schema
pnpm run validate:schema

# Generate GraphQL SDL
pnpm run generate:schema:interop

# Check parity
pnpm run validate:sync

# Run tests
pnpm test
pytest
```

#### Step 5: Update Code References

Update your application code to use snake_case:

```javascript
// Before (V1)
const contractId = data.contractId;
const orgName = data.organizationInfo.primaryName;

// After (V2)
const contractId = data.contract_id;
const orgName = data.organization_info.primary_name;
```

---

## x-graphql Hints System

### Overview

x-graphql hints allow JSON Schema to contain metadata for rich GraphQL generation.

### Supported Hints

#### `x-graphql-enum`

Enhanced enum definitions:

```json
{
  "Status": {
    "type": "string",
    "enum": ["active", "inactive"],
    "x-graphql-enum": {
      "name": "Status",
      "description": "Contract status",
      "values": {
        "active": {
          "name": "ACTIVE",
          "description": "Currently active",
          "deprecationReason": null
        },
        "inactive": {
          "name": "INACTIVE",
          "description": "No longer active"
        }
      }
    }
  }
}
```

#### `x-graphql-union`

Union type definitions:

```json
{
  "SearchResult": {
    "x-graphql-union": {
      "name": "SearchResult",
      "description": "Search result types",
      "types": ["Contract", "Organization", "Contact"]
    },
    "oneOf": [
      { "$ref": "#/definitions/Contract" },
      { "$ref": "#/definitions/Organization" },
      { "$ref": "#/definitions/Contact" }
    ]
  }
}
```

#### `x-graphql-interface`

Interface implementations:

```json
{
  "Contract": {
    "type": "object",
    "x-graphql-interface": {
      "implements": ["Node", "Timestamped"]
    },
    "properties": {
      "id": { "type": "string" }
    }
  }
}
```

#### `x-graphql-required`

Override required status for GraphQL:

```json
{
  "schema_version": {
    "type": "string",
    "x-graphql-required": true  // Forces non-null in GraphQL
  }
}
```

#### `x-graphql-scalar`

Custom scalar mapping:

```json
{
  "created_at": {
    "type": "string",
    "format": "date-time",
    "x-graphql-scalar": "DateTime"
  }
}
```

### Complete Example

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/contract.schema.json",
  "definitions": {
    "Contract": {
      "type": "object",
      "x-graphql-interface": {
        "implements": ["Node"]
      },
      "properties": {
        "id": {
          "type": "string",
          "x-graphql-scalar": "ID"
        },
        "status": {
          "$ref": "#/definitions/ContractStatus"
        },
        "extension": {
          "$ref": "#/definitions/SystemExtension"
        }
      },
      "required": ["id", "status"]
    },
    "ContractStatus": {
      "type": "string",
      "enum": ["active", "completed", "terminated"],
      "x-graphql-enum": {
        "name": "ContractStatus",
        "values": {
          "active": { "name": "ACTIVE" },
          "completed": { "name": "COMPLETED" },
          "terminated": { "name": "TERMINATED" }
        }
      }
    },
    "SystemExtension": {
      "x-graphql-union": {
        "name": "SystemExtension",
        "types": ["Contract DataExtension", "AssistExtension"]
      },
      "oneOf": [
        { "$ref": "#/definitions/Contract DataExtension" },
        { "$ref": "#/definitions/AssistExtension" }
      ]
    }
  }
}
```

Generates:

```graphql
interface Node {
  id: ID!
}

enum ContractStatus {
  ACTIVE
  COMPLETED
  TERMINATED
}

union SystemExtension = Contract DataExtension | AssistExtension

type Contract implements Node {
  id: ID!
  status: ContractStatus!
  extension: SystemExtension
}
```

---

## Breaking Changes

### Field Names

All field names changed from camelCase to snake_case in JSON data:

```javascript
// V1
data.contractId
data.organizationInfo.primaryName

// V2
data.contract_id
data.organization_info.primary_name
```

**Migration:** Update all field access in code.

### $ref Pointers

All JSON Schema pointers updated:

```json
// V1
{ "$ref": "#/definitions/organizationInfo" }

// V2
{ "$ref": "#/definitions/organization_info" }
```

**Migration:** Run conversion script to update all refs.

### Enum Values

Enum values normalized to uppercase in GraphQL:

```graphql
# V1
enum ContactRole {
  primary
  technical
}

# V2
enum ContactRole {
  PRIMARY
  TECHNICAL
}
```

**Migration:** Update GraphQL queries to use uppercase values.

### Type Names

Some type names changed for consistency:

| V1 | V2 |
|----|-----|
| `OrgInfo` | `OrganizationInfo` |
| `FinInfo` | `FinancialInfo` |
| `SysExtension` | `SystemExtension` |

**Migration:** Update type references in code.

---

## Benefits of V2

### 1. Richer Validation

JSON Schema provides comprehensive validation:
- Pattern matching for strings
- Numeric ranges and constraints
- Array length limits
- Complex conditional logic

```json
{
  "contract_id": {
    "type": "string",
    "pattern": "^[A-Z]{3}[0-9]{6}$",
    "minLength": 9,
    "maxLength": 9
  },
  "amount": {
    "type": "number",
    "minimum": 0,
    "maximum": 1000000000
  }
}
```

### 2. Better Tooling

- JSON Schema validators (Ajv, jsonschema)
- Python validation tools
- IDE autocompletion
- Schema linters

### 3. Consistent Naming

Snake_case aligns with:
- Database column names
- Python conventions
- REST API standards
- JSON conventions

### 4. Bidirectional Pipeline

Automated synchronization:
- JSON Schema → GraphQL SDL
- GraphQL SDL → JSON Schema
- Parity validation
- CI/CD integration

### 5. Enhanced Type System

x-graphql hints enable:
- Rich enum documentation
- Proper union types
- Interface implementations
- Custom directives

### 6. Future-Proof

JSON Schema as canonical enables:
- OpenAPI generation
- TypeScript type generation
- Database schema generation
- Documentation generation

---

## Reference

### File Locations

**V2 (Active):**
- Canonical: `src/data/schema_unification.schema.json`
- GraphQL SDL: `src/data/schema_unification.graphql`
- Generated: `generated-schemas/`
- Website: `src/data/generated/`

**V1 (Archived):**
- Schema: `src/data/archived/schema_unification-v1.schema.json`
- SDL: `src/data/archived/schema_unification-v1.graphql`
- Docs: `docs/archived/v1-v2-migration/`
- Pages: `src/legacy-pages/`

### Commands

```bash
# V2 Commands (Current)
pnpm run generate:schema:interop
pnpm run validate:all
pnpm run validate:sync

# Conversion
node scripts/convert-v1-to-v2.mjs
node scripts/dev/convert-camel-to-snake.mjs
```

### Related Documentation

- **Pipeline Guide:** [schema-pipeline-guide.md](schema-pipeline-guide.md)
- **x-graphql Guide:** [x-graphql-hints-guide.md](x-graphql-hints-guide.md)
- **Migration Results:** [docs/archived/v1-v2-migration/V1-TO-V2-CONVERTER-RESULTS.md](archived/v1-v2-migration/V1-TO-V2-CONVERTER-RESULTS.md)
- **Enhancement Summary:** [docs/archived/v1-v2-migration/V2-GRAPHQL-ENHANCEMENT-SUMMARY.md](archived/v1-v2-migration/V2-GRAPHQL-ENHANCEMENT-SUMMARY.md)

---

**Last Updated:** December 2024  
**Version:** 2.0  
**Status:** V2 is canonical, V1 is archived