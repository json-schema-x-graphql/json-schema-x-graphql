# Independent System Schema Architecture (GraphQL Federation)

**Version:** 2.0  
**Date:** December 4, 2025  
**Status:** Design Proposal  

## Overview

This document describes an architecture where system-specific schemas (Contract Data, Legacy Procurement, EASi, Public Spending, Logistics Mgmt) are managed independently using **GraphQL Federation concepts** — no custom mapping metadata required. Systems use standard `@key`, `@external`, and `@shareable` directives to declare how they join with the Schema Unification core schema.

## Design Philosophy

**Leverage GraphQL Federation, not custom metadata:**
- ✅ Use `@key` directives to identify join fields
- ✅ Use `@external` to reference common fields
- ✅ Use `additionalProperties` for dynamic extensions
- ❌ No custom `x-schema_unification-mapping` metadata
- ❌ No complex transformation declarations

## Current Architecture (Problems)

**Before:**
```json
{
  "system_extensions": {
    "contract_data": [ { "field_name": "...", "value": "..." } ],
    "legacy_procurement": [ { "field_name": "...", "value": "..." } ],
    "intake_process": [ { "field_name": "...", "value": "..." } ]
  }
}
```

**Issues:**
1. ❌ Schema Unification must pre-define all extension types
2. ❌ Adding new systems requires core schema changes
3. ❌ No GraphQL Federation support
4. ❌ Tight coupling

---

## New Architecture (Federation-Based)

### Core Concepts

#### 1. Schema Unification as Federation Gateway

Schema Unification defines the **common contract interface** that all systems extend:

```graphql
# Schema Unification Core Schema
type Contract @key(fields: "id") {
  id: ID!
  piid: String
  system_metadata: SystemMetadata!
  common_elements: CommonElements!
}
```

#### 2. Systems Define Their Own Schemas with @key

Each system schema declares which fields it can resolve:

**Public Spending Schema:**
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://api.public_spending.gov/schemas/public_spending.schema.json",
  "title": "Public Spending Procurement Schema",
  
  "x-graphql-federation-keys": ["piid", "id"],
  
  "$defs": {
    "public_spending_procurement": {
      "type": "object",
      "x-graphql-type-name": "Public SpendingProcurement",
      "x-graphql-federation-keys": ["piid"],
      
      "properties": {
        "piid": {
          "type": "string",
          "description": "Procurement Instrument Identifier (join key)",
          "x-graphql-field-type": "String",
          "x-graphql-field-non-null": true
        },
        
        "award_procurement_id": {
          "type": "integer",
          "description": "Public Spending internal ID"
        },
        
        "dod_claimant_program_code": {
          "type": "string",
          "description": "DoD-specific field (not in common_elements)"
        },
        
        "woman_owned_business": {
          "type": "boolean",
          "description": "Vendor classification flag"
        }
      }
    }
  }
}
```

**Generated GraphQL:**
```graphql
type Public SpendingProcurement @key(fields: "piid") {
  piid: String!
  awardProcurementId: Int
  dodClaimantProgramCode: String
  womanOwnedBusiness: Boolean
}

extend type Contract @key(fields: "id") {
  public_spendingData: Public SpendingProcurement @external
}
```

#### 3. Data Storage: additionalProperties

Schema Unification stores system-specific data in `system_extensions` using `additionalProperties`:

```json
{
  "id": "contract-12345",
  "piid": "GS00Q17NSD3003",
  "system_metadata": { "primary_system": "Contract Data" },
  "common_elements": {
    "contract_identification": {
      "piid": "GS00Q17NSD3003"
    }
  },
  "system_extensions": {
    "public_spending": {
      "award_procurement_id": 789012,
      "dod_claimant_program_code": "DOD-123",
      "woman_owned_business": true,
      "contingency_humanitarian_o": "Y"
    },
    "contract_data": {
      "solicitation_id": "SOL-2023-001",
      "clinger_cohen_compliance": true
    }
  }
}
```

**Key:** System ID (e.g., `public_spending`, `contract_data`)  
**Value:** Any structure the system wants (object, array, etc.)

---

## Implementation Guide

### Phase 1: Update Schema Unification Core Schema

**Changes to `schema_unification.schema.json`:**

```json
{
  "$defs": {
    "system_extensions": {
      "type": "object",
      "description": "System-specific extensions. Each system can add fields dynamically using their system_id as the key.",
      "properties": {},
      "additionalProperties": {
        "description": "System-specific data (any structure)",
        "oneOf": [
          { "type": "object" },
          { "type": "array" }
        ]
      }
    }
  }
}
```

**✅ Already implemented!**

### Phase 2: Create System Schemas with Federation Directives

**Directory Structure:**
```
src/data/systems/
├── public_spending/
│   ├── public_spending.schema.json       # JSON Schema with x-graphql-* hints
│   ├── public_spending.graphql           # Generated GraphQL SDL
│   └── resolvers.ts                  # Federation resolvers
├── contract_data/
│   ├── contract_data.schema.json
│   ├── contract_data.graphql
│   └── resolvers.ts
└── logistics_mgmt/
    ├── logistics_mgmt.schema.json
    ├── logistics_mgmt.graphql
    └── resolvers.ts
```

**Example: Public Spending System Schema**

`src/data/systems/public_spending/public_spending.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://api.public_spending.gov/schemas/public_spending-procurement.schema.json",
  "title": "Public Spending Procurement Schema",
  "description": "Schema for Public Spending procurement data that extends Schema Unification Contract type",
  
  "x-graphql-scalars": {
    "DateTime": {
      "description": "ISO 8601 date-time"
    },
    "Decimal": {
      "description": "High-precision decimal"
    }
  },
  
  "$defs": {
    "public_spending_procurement": {
      "type": "object",
      "description": "Public Spending procurement contract record",
      
      "x-graphql-type-name": "Public SpendingProcurement",
      "x-graphql-type-kind": "OBJECT",
      "x-graphql-federation-keys": ["piid", "unique_award_key"],
      
      "properties": {
        "piid": {
          "type": "string",
          "description": "Procurement Instrument Identifier (join key with Schema Unification)",
          "x-graphql-field-name": "piid",
          "x-graphql-field-type": "String",
          "x-graphql-field-non-null": true
        },
        
        "unique_award_key": {
          "type": "string",
          "description": "Unique award identifier",
          "x-graphql-field-name": "uniqueAwardKey",
          "x-graphql-field-type": "String",
          "x-graphql-field-non-null": true
        },
        
        "award_procurement_id": {
          "type": "integer",
          "description": "Internal database ID",
          "x-graphql-field-name": "awardProcurementId",
          "x-graphql-field-type": "Int"
        },
        
        "current_total_value_award": {
          "type": "string",
          "description": "Total contract value (raw from DB)",
          "x-graphql-field-name": "currentTotalValueAward",
          "x-graphql-field-type": "String"
        },
        
        "parsed_total_value": {
          "type": "number",
          "description": "Parsed numeric total value",
          "x-graphql-field-name": "parsedTotalValue",
          "x-graphql-field-type": "Decimal"
        },
        
        "dod_claimant_program_code": {
          "type": "string",
          "description": "DoD-specific claimant program code",
          "x-graphql-field-name": "dodClaimantProgramCode",
          "x-graphql-field-type": "String"
        },
        
        "vendor_classifications": {
          "type": "object",
          "description": "Vendor business type flags",
          "x-graphql-field-name": "vendorClassifications",
          "x-graphql-field-type": "VendorClassifications",
          "properties": {
            "woman_owned_business": {
              "type": "boolean",
              "x-graphql-field-name": "womanOwnedBusiness",
              "x-graphql-field-type": "Boolean"
            },
            "veteran_owned_business": {
              "type": "boolean",
              "x-graphql-field-name": "veteranOwnedBusiness",
              "x-graphql-field-type": "Boolean"
            }
          }
        },
        
        "updated_at": {
          "type": "string",
          "format": "date-time",
          "description": "Last update timestamp",
          "x-graphql-field-name": "updatedAt",
          "x-graphql-field-type": "DateTime"
        }
      },
      
      "required": ["piid", "unique_award_key"]
    }
  }
}
```

**Generated GraphQL SDL:**

`src/data/systems/public_spending/public_spending.graphql`:

```graphql
"""
Public Spending procurement contract record
"""
type Public SpendingProcurement 
  @key(fields: "piid") 
  @key(fields: "uniqueAwardKey") {
  
  piid: String!
  uniqueAwardKey: String!
  awardProcurementId: Int
  currentTotalValueAward: String
  parsedTotalValue: Decimal
  dodClaimantProgramCode: String
  vendorClassifications: VendorClassifications
  updatedAt: DateTime
}

type VendorClassifications {
  womanOwnedBusiness: Boolean
  veteranOwnedBusiness: Boolean
}

"""
Extend Schema Unification Contract type with Public Spending data
"""
extend type Contract @key(fields: "id") {
  """
  Fetch Public Spending-specific data for this contract
  """
  public_spendingData: Public SpendingProcurement
}

type Query {
  public_spendingProcurement(piid: String!): Public SpendingProcurement
  public_spendingProcurements(
    limit: Int = 10
    offset: Int = 0
  ): [Public SpendingProcurement!]!
}
```

### Phase 3: Federation Resolvers

**Public Spending Service Resolver:**

`src/data/systems/public_spending/resolvers.ts`:

```typescript
import { Contract } from '@schema_unification/types';

export const resolvers = {
  Contract: {
    // Federation resolver: resolve Contract by reference
    __resolveReference(reference: { id: string }) {
      return fetchContractById(reference.id);
    },
    
    // Resolve public_spendingData field
    async public_spendingData(contract: Contract) {
      const piid = contract.common_elements?.contract_identification?.piid;
      
      if (!piid) return null;
      
      // Fetch from system_extensions or query Public Spending DB
      if (contract.system_extensions?.public_spending) {
        return contract.system_extensions.public_spending;
      }
      
      // Fallback: query Public Spending database
      return await queryPublic SpendingByPIID(piid);
    }
  },
  
  Public SpendingProcurement: {
    // Federation entity resolver
    __resolveReference(reference: { piid: string }) {
      return queryPublic SpendingByPIID(reference.piid);
    },
    
    // Field resolver: parse total value on-demand
    parsedTotalValue(procurement: any) {
      const raw = procurement.current_total_value_award;
      if (!raw) return null;
      return parseFloat(raw.replace(/[$,]/g, ''));
    }
  },
  
  Query: {
    public_spendingProcurement(_: any, { piid }: { piid: string }) {
      return queryPublic SpendingByPIID(piid);
    },
    
    public_spendingProcurements(_: any, { limit, offset }: any) {
      return queryPublic SpendingProcurements(limit, offset);
    }
  }
};

async function queryPublic SpendingByPIID(piid: string) {
  const result = await db.query(`
    SELECT 
      piid,
      unique_award_key,
      award_procurement_id,
      current_total_value_award,
      dod_claimant_program_code,
      woman_owned_business,
      veteran_owned_business,
      updated_at
    FROM award_procurement
    WHERE piid = $1
  `, [piid]);
  
  return result.rows[0];
}
```

### Phase 4: Apollo Gateway Configuration

**Gateway Setup:**

```typescript
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import { ApolloServer } from '@apollo/server';

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      {
        name: 'schema_unification-core',
        url: 'http://schema_unification-api:4000/graphql'
      },
      {
        name: 'public_spending',
        url: 'http://public_spending-service:4001/graphql'
      },
      {
        name: 'contract_data',
        url: 'http://contract_data-service:4002/graphql'
      },
      {
        name: 'logistics_mgmt',
        url: 'http://logistics_mgmt-service:4003/graphql'
      }
    ]
  })
});

const server = new ApolloServer({ gateway });
```

**Federated Query Example:**

```graphql
query GetContractWithPublic SpendingData {
  contract(id: "contract-12345") {
    id
    piid
    
    # From Schema Unification core
    common_elements {
      contract_identification {
        piid
        contract_type
      }
      financial_info {
        total_contract_value
      }
    }
    
    # From Public Spending service
    public_spendingData {
      awardProcurementId
      dodClaimantProgramCode
      parsedTotalValue
      vendorClassifications {
        womanOwnedBusiness
        veteranOwnedBusiness
      }
      updatedAt
    }
  }
}
```

---

## Benefits

### 1. **Standard GraphQL Federation**
- No custom metadata — uses `@key`, `@external`, `@shareable`
- Works with Apollo Gateway, Mesh, Mercurius
- Standard tooling and documentation

### 2. **True Independence**
- Systems deploy their own services
- No coordination for adding fields
- Independent scaling and versioning

### 3. **Simple Storage Model**
- `additionalProperties` accepts any structure
- No schema updates needed in Schema Unification
- Systems own their data format

### 4. **Flexible Queries**
- Clients can fetch only what they need
- Federation handles joins automatically
- Type-safe across systems

### 5. **Backward Compatible**
- Existing Contract Data/Legacy Procurement/EASi extensions still work
- Gradual migration path
- No breaking changes

---

## Migration Path

### Week 1: Update Schema Unification Core
- ✅ Change `system_extensions` to `additionalProperties` (DONE)
- Update GraphQL schema generation scripts
- Test backward compatibility

### Week 2: Create Public Spending Service
- Create `src/data/systems/public_spending/` directory
- Write JSON Schema with `x-graphql-federation-keys`
- Generate GraphQL SDL
- Build resolver service

### Week 3: Deploy Federation Gateway
- Set up Apollo Gateway
- Configure subgraph URLs
- Test federated queries
- Deploy to staging

### Week 4: Migrate Existing Systems
- Extract Contract Data/Legacy Procurement/EASi as subgraphs
- Add `@key` directives
- Deploy independent services
- Migrate clients

---

## Example: Adding Public Spending (Zero Schema Unification Changes!)

```bash
# 1. Create system schema directory
mkdir -p src/data/systems/public_spending

# 2. Write JSON Schema with federation hints
cat > src/data/systems/public_spending/public_spending.schema.json <<'EOF'
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "x-graphql-type-name": "Public SpendingProcurement",
  "x-graphql-federation-keys": ["piid"],
  "properties": {
    "piid": {
      "type": "string",
      "x-graphql-field-name": "piid",
      "x-graphql-field-type": "String",
      "x-graphql-field-non-null": true
    }
  }
}
EOF

# 3. Generate GraphQL SDL
pnpm run generate:graphql:from-json \
  src/data/systems/public_spending/public_spending.schema.json

# 4. Build resolver service
npm init -y
npm install @apollo/subgraph graphql

# 5. Deploy service
docker build -t public_spending-service .
docker run -p 4001:4001 public_spending-service

# 6. Update gateway config
# Add to supergraph.yaml:
#   - name: public_spending
#     url: http://public_spending-service:4001/graphql

# 7. Query federated data
curl -X POST http://gateway:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ contract(id: \"123\") { public_spendingData { piid } } }"}'
```

**Zero changes to `schema_unification.schema.json`!** ✅

---

## Comparison: Custom Mapping vs Federation

| Aspect | Custom x-schema_unification-mapping | GraphQL Federation |
|--------|---------------------------|-------------------|
| Metadata | Custom `x-schema_unification-mapping` | Standard `@key`, `@external` |
| Tooling | Custom validators needed | Apollo Gateway, Rover, etc. |
| Learning Curve | New concepts to learn | Standard Federation patterns |
| Query Model | ETL batch processing | Real-time federated queries |
| Deployment | Monolithic ETL pipeline | Independent microservices |
| Complexity | Complex transformation layer | Simple resolvers |

**Winner:** GraphQL Federation ✅

---

## Schema Generation Scripts

**Update `scripts/generate-graphql-from-json-schema.mjs`:**

```javascript
// Recognize x-graphql-federation-keys
if (schema['x-graphql-federation-keys']) {
  const keys = schema['x-graphql-federation-keys'];
  keys.forEach(key => {
    typeDecl += ` @key(fields: "${key}")`;
  });
}

// Generate extend type Contract for system extensions
if (systemId && systemId !== 'schema_unification') {
  sdl += `\nextend type Contract @key(fields: "id") {\n`;
  sdl += `  ${systemId}Data: ${typeName}\n`;
  sdl += `}\n`;
}
```

---

## References

- [GraphQL Federation Spec](https://www.apollographql.com/docs/federation/)
- [Apollo Subgraph Development](https://www.apollographql.com/docs/federation/subgraphs/)
- [Schema Unification Schema v2.0](../../src/data/schema_unification.schema.json)
- [Existing x-graphql-* Guide](./x-graphql-hints-guide.md)

---

**Document Control:**
- Version: 2.0 (Simplified to use GraphQL Federation)
- Author: Schema Unification Forest Schema Team
- Status: Design Proposal
- Next Review: After Phase 1 implementation


## Current Architecture (Limitations)

**Current State:**
```json
{
  "system_extensions": {
    "contract_data": [ { "field_name": "...", "value": "..." } ],
    "legacy_procurement": [ { "field_name": "...", "value": "..." } ],
    "intake_process": [ { "field_name": "...", "value": "..." } ]
  }
}
```

**Problems:**
1. ❌ Schema Unification schema must pre-define all extension types
2. ❌ Adding new systems requires modifying core schema
3. ❌ No explicit mapping declarations in system schemas
4. ❌ Tight coupling between systems and core schema

---

## Proposed Architecture (Independent Systems)

### Design Principles

1. **Schema Independence:** System schemas are self-contained, managed in their own repositories/namespaces
2. **Explicit Mapping:** System schemas declare which fields map to `common_elements` via metadata
3. **No Upfront Registration:** Schema Unification doesn't need to know about systems in advance
4. **Federation-Ready:** GraphQL Federation allows systems to extend Schema Unification types dynamically
5. **Backward Compatible:** Existing patterns preserved for systems already mapped

### Key Concepts

#### 1. System Schema Self-Declaration

Each system schema declares its identity and mapping strategy:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://api.public_spending.gov/schemas/public_spending.schema.json",
  "title": "Public Spending Contract Schema",
  "description": "Canonical schema for Public Spending (GDSM) contract data",
  
  "x-schema_unification-mapping": {
    "system_id": "USASPENDING",
    "target_schema": "https://github.com/GSA-TTS/enterprise-schema-unification/schemas/v2.0",
    "mapping_version": "1.0",
    "strategy": "extend",
    "description": "Maps Public Spending procurement data to Schema Unification common elements"
  }
}
```

#### 2. Field-Level Mapping Declarations

Each field declares how it maps to Schema Unification:

```json
{
  "properties": {
    "piid": {
      "type": "string",
      "description": "Procurement Instrument Identifier",
      
      "x-schema_unification-mapping": {
        "target_path": "common_elements.contract_identification.piid",
        "mapping_type": "direct",
        "confidence": "exact",
        "transformation": null
      }
    },
    
    "current_total_value_award": {
      "type": "string",
      "description": "Total contract value with currency symbols",
      
      "x-schema_unification-mapping": {
        "target_path": "common_elements.financial_info.total_contract_value",
        "mapping_type": "transformed",
        "confidence": "high",
        "transformation": {
          "function": "parseNumericCurrency",
          "params": {
            "remove_symbols": ["$", ","],
            "target_type": "decimal"
          }
        }
      }
    },
    
    "woman_owned_business": {
      "type": "boolean",
      "description": "Woman-owned business flag",
      
      "x-schema_unification-mapping": {
        "target_path": "vendor_classifications.socioeconomic.woman_owned_business",
        "mapping_type": "aggregated",
        "confidence": "exact",
        "aggregation_group": "vendor_classifications",
        "transformation": null
      }
    },
    
    "dod_claimant_program_code": {
      "type": "string",
      "description": "DoD-specific claimant program code",
      
      "x-schema_unification-mapping": {
        "target_path": null,
        "mapping_type": "system_extension",
        "confidence": "not_applicable",
        "extension_category": "compliance",
        "description": "Preserved as USASPENDING-specific extension field"
      }
    }
  }
}
```

#### 3. Mapping Types

| Mapping Type | Description | Example |
|--------------|-------------|---------|
| `direct` | 1:1 field mapping, no transformation | `piid → piid` |
| `transformed` | Requires data transformation | `"$1,234.56" → 1234.56` |
| `aggregated` | Multiple fields combine into structure | `100 boolean flags → vendor_classifications` |
| `computed` | Derived from multiple sources | `base_value + options → total_value` |
| `conditional` | Mapping depends on business rules | `contract_type determines target path` |
| `system_extension` | No common mapping, preserved as extension | `dod_claimant_code` stays in extension |

#### 4. Transformation Declarations

Standard transformations are declared with reusable function names:

```json
{
  "x-schema_unification-transformations": {
    "parseNumericCurrency": {
      "description": "Parse numeric value from currency string",
      "input_type": "string",
      "output_type": "decimal",
      "function": "currency.parseNumeric",
      "params": {
        "remove_symbols": ["$", ",", " "],
        "decimal_separator": ".",
        "handle_empty": "null"
      }
    },
    
    "parsePublic SpendingDate": {
      "description": "Parse date from multiple Public Spending formats",
      "input_type": "string",
      "output_type": "date-time",
      "function": "date.parseMultiFormat",
      "params": {
        "formats": ["YYYY-MM-DD", "MM/DD/YYYY", "YYYYMMDD"],
        "output_format": "iso8601",
        "handle_invalid": "null",
        "handle_empty": "null"
      }
    },
    
    "mapContractType": {
      "description": "Map Public Spending contract type codes to Schema Unification enums",
      "input_type": "string",
      "output_type": "enum",
      "function": "enum.mapValue",
      "params": {
        "mapping": {
          "A": "BPA_CALL",
          "B": "PURCHASE_ORDER",
          "C": "DELIVERY_ORDER",
          "D": "DEFINITIVE_CONTRACT"
        },
        "default": "UNKNOWN"
      }
    }
  }
}
```

---

## Implementation Strategy

### Phase 1: Enhance Schema Unification Core Schema

**Goal:** Make Schema Unification schema extension-agnostic

**Changes to `schema_unification.schema.json`:**

```json
{
  "$defs": {
    "system_extensions": {
      "type": "object",
      "description": "Dynamic system-specific extensions (open-ended)",
      "x-graphql-type": {
        "name": "SystemExtensions",
        "description": "System-specific data from external sources"
      },
      "properties": {},
      "additionalProperties": {
        "description": "Any system can add extensions dynamically",
        "type": "array",
        "items": {
          "$ref": "#/$defs/system_extension_field"
        }
      }
    },
    
    "system_extension_field": {
      "type": "object",
      "description": "Generic system extension field",
      "properties": {
        "field_name": {
          "type": "string",
          "description": "Field name from source system"
        },
        "field_type": {
          "type": "string",
          "description": "Data type of the field",
          "enum": ["string", "number", "boolean", "object", "array"]
        },
        "value": {
          "description": "Field value (any type)",
          "x-graphql-scalar": "JSON"
        },
        "source_system": {
          "type": "string",
          "description": "System that provided this field"
        },
        "category": {
          "type": "string",
          "description": "Extension category (financial, compliance, vendor, etc.)"
        },
        "metadata": {
          "type": "object",
          "description": "Additional metadata about this field",
          "properties": {
            "source_field_name": { "type": "string" },
            "unmapped_reason": { "type": "string" },
            "experimental": { "type": "boolean" }
          }
        }
      },
      "required": ["field_name", "value", "source_system"]
    }
  }
}
```

**Key Changes:**
- Replace hardcoded `contract_data`, `legacy_procurement`, `intake_process` properties with `additionalProperties`
- Use generic `system_extension_field` type
- Add `source_system` to track origin
- Allow any system to add extensions without schema modification

### Phase 2: Create Independent System Schemas

**Directory Structure:**
```
src/data/systems/
├── contract_data/
│   ├── contract_data.schema.json        # Contract Data canonical schema
│   ├── contract_data-mapping.json       # Schema Unification mapping manifest
│   └── transformations.js      # Transformation functions
├── legacy_procurement/
│   ├── legacy_procurement.schema.json
│   ├── legacy_procurement-mapping.json
│   └── transformations.js
├── public_spending/
│   ├── public_spending.schema.json
│   ├── public_spending-mapping.json
│   └── transformations.js
└── logistics_mgmt/
    ├── logistics_mgmt.schema.json
    ├── logistics_mgmt-mapping.json
    └── transformations.js
```

**Example: Public Spending System Schema**

`src/data/systems/public_spending/public_spending.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://api.public_spending.gov/schemas/public_spending-procurement.schema.json",
  "title": "Public Spending Procurement Contract Schema",
  "description": "Canonical schema for Public Spending (GDSM) procurement contract data from award_procurement table",
  
  "x-schema_unification-mapping": {
    "system_id": "USASPENDING",
    "system_name": "Public Spending (Government-wide Data Standards Management)",
    "target_schema": "https://github.com/GSA-TTS/enterprise-schema-unification/schemas/v2.0",
    "mapping_version": "1.0",
    "strategy": "extend",
    "coverage": {
      "common_elements": "85%",
      "system_extensions": "100%",
      "unmapped_fields": 45
    }
  },
  
  "x-graphql-type": {
    "name": "Public SpendingProcurement",
    "description": "Public Spending procurement contract record",
    "extends": "Contract"
  },
  
  "$defs": {
    "public_spending_procurement": {
      "type": "object",
      "description": "Public Spending award_procurement table record",
      "properties": {
        
        "system_metadata": {
          "type": "object",
          "properties": {
            "award_procurement_id": {
              "type": "integer",
              "description": "Primary key in award_procurement table",
              "x-schema_unification-mapping": {
                "target_path": "system_metadata.system_chain[0].record_id",
                "mapping_type": "transformed",
                "transformation": "toStringId"
              }
            },
            "unique_award_key": {
              "type": "string",
              "description": "Unique award identifier",
              "x-schema_unification-mapping": {
                "target_path": "system_metadata.global_record_id",
                "mapping_type": "transformed",
                "transformation": "prefixWithSystem",
                "params": { "prefix": "public_spending:" }
              }
            },
            "updated_at": {
              "type": "string",
              "description": "Last update timestamp",
              "x-schema_unification-mapping": {
                "target_path": "system_metadata.last_modified",
                "mapping_type": "transformed",
                "transformation": "parsePublic SpendingDate"
              }
            }
          }
        },
        
        "contract_identification": {
          "type": "object",
          "properties": {
            "piid": {
              "type": "string",
              "description": "Procurement Instrument Identifier",
              "x-schema_unification-mapping": {
                "target_path": "common_elements.contract_identification.piid",
                "mapping_type": "direct",
                "confidence": "exact"
              }
            },
            "parent_award_id": {
              "type": "string",
              "description": "Parent award identifier",
              "x-schema_unification-mapping": {
                "target_path": "common_elements.contract_identification.original_award_piid",
                "mapping_type": "direct",
                "confidence": "high"
              }
            },
            "award_modification_amendme": {
              "type": "string",
              "description": "Modification/amendment number",
              "x-schema_unification-mapping": {
                "target_path": "common_elements.contract_identification.modification_number",
                "mapping_type": "direct",
                "confidence": "exact"
              }
            },
            "contract_award_type": {
              "type": "string",
              "description": "Contract award type code",
              "x-schema_unification-mapping": {
                "target_path": "common_elements.contract_identification.contract_type",
                "mapping_type": "transformed",
                "transformation": "mapContractType"
              }
            }
          }
        },
        
        "vendor_classifications": {
          "type": "object",
          "description": "Vendor business type classifications (100+ boolean flags)",
          "x-schema_unification-mapping": {
            "target_path": "vendor_classifications",
            "mapping_type": "aggregated",
            "confidence": "exact",
            "aggregation_strategy": "group_by_category"
          },
          "properties": {
            "small_business_competitive": { 
              "type": "boolean",
              "x-schema_unification-mapping": {
                "target_path": "vendor_classifications.small_business.small_business_competitive",
                "mapping_type": "direct"
              }
            },
            "woman_owned_business": { 
              "type": "boolean",
              "x-schema_unification-mapping": {
                "target_path": "vendor_classifications.socioeconomic.woman_owned_business",
                "mapping_type": "direct"
              }
            },
            "veteran_owned_business": { 
              "type": "boolean",
              "x-schema_unification-mapping": {
                "target_path": "vendor_classifications.socioeconomic.veteran_owned_business",
                "mapping_type": "direct"
              }
            }
            // ... 100+ more boolean flags
          }
        },
        
        "dod_specific": {
          "type": "object",
          "description": "DoD-specific compliance fields",
          "x-schema_unification-mapping": {
            "target_path": null,
            "mapping_type": "system_extension",
            "extension_category": "compliance"
          },
          "properties": {
            "dod_claimant_program_code": {
              "type": "string",
              "description": "DoD claimant program code",
              "x-schema_unification-mapping": {
                "target_path": null,
                "mapping_type": "system_extension"
              }
            },
            "dod_acquisition_program": {
              "type": "string",
              "x-schema_unification-mapping": {
                "target_path": null,
                "mapping_type": "system_extension"
              }
            }
          }
        }
      }
    }
  }
}
```

**Example: Mapping Manifest** (separate file for tooling)

`src/data/systems/public_spending/public_spending-mapping.json`:

```json
{
  "system_id": "USASPENDING",
  "mapping_version": "1.0",
  "target_schema": "https://github.com/GSA-TTS/enterprise-schema-unification/schemas/v2.0",
  "generated_at": "2025-12-04T10:00:00Z",
  
  "mappings": [
    {
      "source_field": "piid",
      "target_path": "common_elements.contract_identification.piid",
      "mapping_type": "direct",
      "confidence": "exact",
      "transformation": null
    },
    {
      "source_field": "current_total_value_award",
      "target_path": "common_elements.financial_info.total_contract_value",
      "mapping_type": "transformed",
      "confidence": "high",
      "transformation": "parseNumericCurrency"
    },
    {
      "source_field": "action_date",
      "target_path": "common_elements.contract_identification.action_date",
      "mapping_type": "transformed",
      "confidence": "exact",
      "transformation": "parsePublic SpendingDate"
    }
  ],
  
  "unmapped_fields": [
    {
      "source_field": "dod_claimant_program_code",
      "reason": "system_specific",
      "extension_category": "compliance"
    },
    {
      "source_field": "contingency_humanitarian_o",
      "reason": "no_common_equivalent",
      "extension_category": "contract_characteristics"
    }
  ],
  
  "statistics": {
    "total_fields": 315,
    "mapped_to_common": 268,
    "mapped_to_extensions": 47,
    "coverage_percentage": 85.08
  }
}
```

### Phase 3: Build Mapping Tools

**Tool 1: Mapping Validator**

`scripts/validate-system-mapping.mjs`:

```javascript
/**
 * Validates that system schema mappings are consistent with Schema Unification schema
 */
import Ajv from 'ajv';
import fs from 'fs';

async function validateSystemMapping(systemSchemaPath, schema_unificationSchemaPath) {
  const systemSchema = JSON.parse(fs.readFileSync(systemSchemaPath, 'utf-8'));
  const schema_unificationSchema = JSON.parse(fs.readFileSync(schema_unificationSchemaPath, 'utf-8'));
  
  const errors = [];
  
  // Validate x-schema_unification-mapping declarations
  function validateMappings(obj, path = '') {
    if (obj['x-schema_unification-mapping']) {
      const mapping = obj['x-schema_unification-mapping'];
      const targetPath = mapping.target_path;
      
      if (targetPath && !resolveSchemaPath(schema_unificationSchema, targetPath)) {
        errors.push({
          source_path: path,
          target_path: targetPath,
          error: `Target path does not exist in Schema Unification schema`
        });
      }
      
      if (mapping.transformation && !KNOWN_TRANSFORMATIONS.includes(mapping.transformation)) {
        errors.push({
          source_path: path,
          transformation: mapping.transformation,
          error: `Unknown transformation function`
        });
      }
    }
    
    // Recurse through nested properties
    if (obj.properties) {
      for (const [key, value] of Object.entries(obj.properties)) {
        validateMappings(value, `${path}.${key}`);
      }
    }
  }
  
  validateMappings(systemSchema);
  
  return {
    valid: errors.length === 0,
    errors,
    system_id: systemSchema['x-schema_unification-mapping']?.system_id
  };
}
```

**Tool 2: Transformation Executor**

`src/lib/transformations/executor.ts`:

```typescript
/**
 * Executes field transformations declared in system schemas
 */
import { DateParser } from './date-parser';
import { NumericParser } from './numeric-parser';
import { EnumMapper } from './enum-mapper';

export interface TransformationConfig {
  function: string;
  params?: Record<string, any>;
}

export class TransformationExecutor {
  private transformers = {
    parseNumericCurrency: NumericParser.parseCurrency,
    parsePublic SpendingDate: DateParser.parsePublic Spending,
    mapContractType: EnumMapper.mapContractType,
    toStringId: (val: number) => val.toString(),
    prefixWithSystem: (val: string, params: any) => `${params.prefix}${val}`
  };
  
  execute(value: any, config: TransformationConfig): any {
    const transformer = this.transformers[config.function];
    
    if (!transformer) {
      throw new Error(`Unknown transformation: ${config.function}`);
    }
    
    return config.params 
      ? transformer(value, config.params)
      : transformer(value);
  }
}
```

**Tool 3: Mapping Introspection Generator**

`scripts/generate-mapping-report.mjs`:

```javascript
/**
 * Generates human-readable mapping report from system schemas
 */
export function generateMappingReport(systemSchema) {
  const mappings = extractMappings(systemSchema);
  
  const report = {
    system_id: systemSchema['x-schema_unification-mapping'].system_id,
    coverage: {
      total_fields: mappings.length,
      mapped_to_common: mappings.filter(m => m.target_path?.startsWith('common_')).length,
      system_extensions: mappings.filter(m => m.mapping_type === 'system_extension').length
    },
    mappings_by_category: groupBy(mappings, 'category'),
    transformations_used: unique(mappings.map(m => m.transformation).filter(Boolean))
  };
  
  return report;
}
```

### Phase 4: GraphQL Federation Integration

**Enable Dynamic System Extensions via Federation:**

Each system can provide its own GraphQL subgraph that extends the `Contract` type:

**Public Spending Subgraph (`public_spending-service/schema.graphql`):**

```graphql
extend type Contract @key(fields: "id") {
  # Add Public Spending-specific fields that aren't in common_elements
  public_spendingExtensions: Public SpendingExtensions
}

type Public SpendingExtensions {
  dodClaimantProgramCode: String
  contingencyHumanitarianOperation: Boolean
  submissionId: String
  jobId: String
  rowNumber: Int
}

type Query {
  public_spendingContracts(
    filter: Public SpendingFilter
    first: Int = 10
    after: String
  ): Public SpendingContractConnection!
}
```

**Federation Resolver:**

```typescript
// public_spending-service/resolvers.ts
export const resolvers = {
  Contract: {
    __resolveReference(reference: { id: string }) {
      // Resolve Contract by Schema Unification global ID
      return fetchContractById(reference.id);
    },
    
    public_spendingExtensions(contract: Contract) {
      // Fetch Public Spending extensions from system_extensions
      const extensions = contract.system_extensions?.public_spending || [];
      return parseExtensions(extensions);
    }
  }
};
```

**No changes needed to Schema Unification core schema!** 🎉

---

## Benefits of This Architecture

### 1. **Decoupled System Management**
- Each system team manages their own schema
- No coordination needed to add new systems
- System schemas can evolve independently

### 2. **Explicit Mapping Documentation**
- Every field documents its Schema Unification mapping
- Mapping confidence levels tracked
- Unmapped fields clearly identified

### 3. **Automated Validation**
- Tools validate mappings are correct
- Catch breaking changes early
- Generate coverage reports

### 4. **Flexible Extensions**
- Systems can add fields without Schema Unification changes
- Extensions are first-class data
- GraphQL Federation enables dynamic type extension

### 5. **Improved Maintainability**
- Clear ownership boundaries
- Easier to onboard new systems
- Reduces coordination overhead

---

## Migration Path for Existing Systems

### Step 1: Extract System Schemas (Week 1)

```bash
# Extract Contract Data schema from Schema Unification
node scripts/extract-system-schema.mjs \
  --system contract_data \
  --output src/data/systems/contract_data/contract_data.schema.json

# Extract Legacy Procurement schema
node scripts/extract-system-schema.mjs \
  --system legacy_procurement \
  --output src/data/systems/legacy_procurement/legacy_procurement.schema.json
```

### Step 2: Add Mapping Metadata (Week 2)

- Manually add `x-schema_unification-mapping` to each field
- Document transformations
- Generate mapping manifests

### Step 3: Update Schema Unification Core (Week 3)

- Replace hardcoded extension types with `additionalProperties`
- Update GraphQL SDL generation
- Test backward compatibility

### Step 4: Deploy Federation (Week 4+)

- Deploy system-specific GraphQL subgraphs
- Configure Apollo Gateway
- Migrate clients to federated API

---

## Example: Adding Public Spending (No Schema Unification Changes!)

```bash
# 1. Create Public Spending schema with mappings
mkdir -p src/data/systems/public_spending
cat > src/data/systems/public_spending/public_spending.schema.json <<EOF
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "x-schema_unification-mapping": {
    "system_id": "USASPENDING",
    "target_schema": "https://github.com/GSA-TTS/enterprise-schema-unification/schemas/v2.0"
  },
  "properties": {
    "piid": {
      "type": "string",
      "x-schema_unification-mapping": {
        "target_path": "common_elements.contract_identification.piid",
        "mapping_type": "direct"
      }
    }
  }
}
EOF

# 2. Validate mapping
pnpm run validate:system-mapping public_spending

# 3. Generate transformation code
pnpm run generate:transformations public_spending

# 4. Start ETL pipeline
node etl/public_spending/index.js
```

**Zero changes to `schema_unification.schema.json`!** ✅

---

## Tooling Roadmap

| Tool | Purpose | Priority | Effort |
|------|---------|----------|--------|
| `validate-system-mapping.mjs` | Validate mappings against Schema Unification | High | 1 week |
| `generate-mapping-manifest.mjs` | Generate mapping.json from schema | High | 3 days |
| `generate-transformations.mjs` | Codegen transformation functions | Medium | 1 week |
| `mapping-coverage-report.mjs` | Generate coverage dashboard | Medium | 3 days |
| `extract-system-schema.mjs` | Extract existing system schemas | High | 3 days |
| `test-mapping-roundtrip.mjs` | Test data transformation roundtrips | Low | 1 week |

---

## Appendix A: Complete x-schema_unification-mapping Specification

### Schema-Level Metadata

```typescript
interface Schema UnificationMappingMetadata {
  system_id: string;              // Unique system identifier (e.g., "USASPENDING")
  system_name?: string;            // Human-readable name
  target_schema: string;           // Schema Unification schema URL
  mapping_version: string;         // Mapping version (semver)
  strategy: 'extend' | 'transform' | 'aggregate';
  coverage?: {
    common_elements: string;       // Percentage (e.g., "85%")
    system_extensions: string;
    unmapped_fields: number;
  };
}
```

### Field-Level Metadata

```typescript
interface FieldMapping {
  target_path: string | null;      // JSON pointer to Schema Unification field (null if extension)
  mapping_type: MappingType;
  confidence: 'exact' | 'high' | 'medium' | 'low' | 'not_applicable';
  transformation?: string | TransformationConfig;
  aggregation_group?: string;
  extension_category?: string;
  description?: string;
}

type MappingType = 
  | 'direct'              // 1:1 copy
  | 'transformed'         // Requires transformation
  | 'aggregated'          // Combines multiple fields
  | 'computed'            // Derived value
  | 'conditional'         // Conditional logic
  | 'system_extension';   // No common mapping

interface TransformationConfig {
  function: string;
  params?: Record<string, any>;
}
```

---

## Appendix B: Standard Transformation Functions

| Function | Input | Output | Description |
|----------|-------|--------|-------------|
| `parseNumericCurrency` | string | decimal | Remove $, commas from currency |
| `parsePublic SpendingDate` | string | date-time | Parse YYYY-MM-DD, MM/DD/YYYY, etc. |
| `mapContractType` | string | enum | Map contract type codes |
| `mapActionType` | string | enum | Map action type codes |
| `toStringId` | number | string | Convert numeric ID to string |
| `prefixWithSystem` | string | string | Add system prefix to ID |
| `parseAddress` | object | object | Normalize address structure |
| `aggregateFlags` | object | object | Group boolean flags by category |
| `calculateTotal` | array | decimal | Sum financial values |
| `coalesceValues` | array | any | First non-null value |

---

## Appendix C: Validation Rules

1. **Target Path Exists:** All non-null `target_path` values must resolve in Schema Unification schema
2. **Transformation Defined:** All `transformation` values must exist in transformation registry
3. **Confidence Required:** All mappings must declare confidence level
4. **Extension Category Required:** `system_extension` mappings must declare `extension_category`
5. **Circular References:** Detect and reject circular mapping dependencies
6. **Type Compatibility:** Source and target types must be compatible (with transformation)

---

## References

- [Schema Unification Forest Schema v2.0](../../src/data/schema_unification.schema.json)
- [Public Spending to Schema Unification Crosswalk](../mappings/public_spending-to-schema_unification-crosswalk.md)
- [GraphQL Federation Specification](https://www.apollographql.com/docs/federation/)
- [JSON Schema 2020-12 Spec](https://json-schema.org/draft/2020-12/json-schema-core.html)
- [JSON Pointer RFC 6901](https://datatracker.ietf.org/doc/html/rfc6901)

---

**Document Control:**
- Version: 1.0
- Author: Schema Unification Forest Schema Team
- Status: Design Proposal
- Next Review: Post Phase 1 implementation
