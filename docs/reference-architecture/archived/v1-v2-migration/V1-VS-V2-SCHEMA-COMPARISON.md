# V1 vs V2 Schema Comparison: Side-by-Side Analysis

## Overview

This document provides a detailed side-by-side comparison of V1 (nested) and V2 (definitions-based) schemas, their example data, and system mappings.

---

## Files Generated

### V1 Files (Existing)
- `src/data/schema_unification.schema.json` - V1 nested schema
- `public/data/schema_unification2contract_data.json` - V1 Contract Data mapping
- `public/data/schema_unification2legacy_procurement.json` - V1 Legacy Procurement mapping  
- `public/data/schema-unification2intake_process.json` - V1 EASi mapping

### V2 Files (New)
- `src/data/schema_unification.schema.v2-generated.json` - V2 definitions-based schema
- `public/data/schema_unification-v2-example.json` - V2 example contract instance
- `public/data/schema_unification2contract_data-v2.json` - V2 Contract Data mapping
- `public/data/schema_unification2legacy_procurement-v2.json` - V2 Legacy Procurement mapping
- `public/data/schema_unification2intake_process-v2.json` - V2 EASi mapping

---

## Schema Structure Comparison

### V1 Schema: Nested Structure

**Philosophy:** Human-readable, everything defined inline

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "systemMetadata": {
      "type": "object",
      "properties": {
        "primarySystem": {
          "type": "string",
          "enum": ["Contract Data", "Legacy Procurement", "Intake Process"]
        },
        "systemChain": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "systemName": { "type": "string" },
              "recordId": { "type": "string" },
              // ... inline nested definition
            }
          }
        }
      }
    }
  }
}
```

**Characteristics:**
- ✅ Easy to read top-to-bottom
- ✅ No need to jump between sections
- ✅ Self-contained
- ❌ Lots of repetition
- ❌ Hard to reuse types
- ❌ Incompatible with most code generators
- ❌ No `definitions` section

### V2 Schema: Definitions-Based Structure

**Philosophy:** DRY (Don't Repeat Yourself), reusable type definitions

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "systemMetadata": {
      "$ref": "#/definitions/SystemMetadata"
    }
  },
  "definitions": {
    "SystemMetadata": {
      "type": "object",
      "properties": {
        "primarySystem": {
          "$ref": "#/definitions/SystemType"
        },
        "systemChain": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/SystemChainEntry"
          }
        }
      }
    },
    "SystemType": {
      "type": "string",
      "enum": ["Contract Data", "Legacy Procurement", "Intake Process"]
    },
    "SystemChainEntry": {
      "type": "object",
      "properties": {
        // ... defined once, referenced everywhere
      }
    }
  }
}
```

**Characteristics:**
- ✅ Reusable type definitions
- ✅ Compatible with GraphQL generators
- ✅ Compatible with TypeScript generators
- ✅ Clear type boundaries
- ✅ DRY principle
- ⚠️ Need to jump between sections
- ⚠️ More verbose in definitions

---

## Key Structural Differences

### 1. Type Definitions

| Aspect | V1 Nested | V2 Definitions |
|--------|-----------|----------------|
| **Reusability** | None - everything inline | 21 reusable definitions |
| **Type References** | No $ref usage | Extensive $ref usage |
| **Enums** | Inline strings | Named enum definitions |
| **Complex Types** | Nested objects | Separate definitions |

### 2. System Extensions (CRITICAL DIFFERENCE)

#### V1 Approach: Generic Objects

```json
{
  "systemExtensions": {
    "type": "object",
    "properties": {
      "contract_data": {
        "type": "object",
        "additionalProperties": true,
        "description": "Contract Data-specific data"
      },
      "legacy_procurement": {
        "type": "object",
        "additionalProperties": true,
        "description": "Legacy Procurement-specific data"
      },
      "intake_process": {
        "type": "object",
        "additionalProperties": true,
        "description": "EASi-specific data"
      }
    }
  }
}
```

**Result in GraphQL:**
```graphql
type Contract DataExtension {
  """Raw Contract Data-specific data (stored as JSON)"""
  contract_data: JSON  # ❌ Opaque blob
}
```

**Impact:**
- ❌ Cannot query specific Contract Data fields
- ❌ No type safety
- ❌ Must parse JSON client-side
- ❌ GraphQL introspection doesn't reveal structure

#### V2 Approach: Typed Structures

```json
{
  "definitions": {
    "Contract DataExtension": {
      "type": "object",
      "properties": {
        "contract_data": {
          "$ref": "#/definitions/Contract DataSpecificData"
        }
      }
    },
    "Contract DataSpecificData": {
      "type": "object",
      "properties": {
        "legacy_procurementanceType": {
          "type": "object",
          "properties": {
            "code": { "type": "string" },
            "description": { "type": "string" },
            "isFinancialAssistance": { "type": "boolean" }
          }
        },
        "eligibility": { /* ... */ },
        "usage": { /* ... */ }
      }
    }
  }
}
```

**Result in GraphQL:**
```graphql
type Contract DataExtension {
  contract_data: Contract DataSpecificData  # ✅ Typed structure
}

type Contract DataSpecificData {
  legacy_procurementanceType: Contract DataAssistanceType
  eligibility: Contract DataEligibility
  usage: Contract DataUsage
}
```

**Impact:**
- ✅ Fully queryable Contract Data fields
- ✅ Type safety
- ✅ Server-side filtering
- ✅ GraphQL introspection works

---

## Example Data Comparison

### V1 Example (Hypothetical - Nested Structure)

```json
{
  "systemMetadata": {
    "primarySystem": "Contract Data",
    "systemChain": [
      {
        "systemName": "Contract Data",
        "recordId": "Contract Data-10.001-2024",
        "processedDate": "2024-01-15T14:30:00Z"
      }
    ]
  },
  "contractIdentification": {
    "piid": "GS-35F-0001Y",
    "contractTitle": "IT Services"
  },
  // ... rest of contract data
  "systemExtensions": {
    "contract_data": {
      // ❌ Generic object - structure not defined
      "legacy_procurementanceType": "04",
      "someField": "someValue",
      "nested": {
        "data": "here"
      }
    }
  }
}
```

**Problem:** System extensions have no schema validation - anything goes.

### V2 Example (Typed Structure)

```json
{
  "systemMetadata": {
    "primarySystem": "Contract Data",
    "systemChain": [
      {
        "systemName": "Contract Data",
        "recordId": "Contract Data-10.001-2024",
        "processedDate": "2024-01-15T14:30:00Z",
        "dataQuality": {
          "completenessScore": 0.92,
          "validationErrors": [],
          "lastValidated": "2024-01-15T14:30:00Z"
        }
      }
    ],
    "schemaVersion": "2.0",
    "lastModified": "2024-01-15T14:30:00Z",
    "globalRecordId": "PETRIFIED-Contract Data-2024-001"
  },
  "contractIdentification": {
    "piid": "GS-35F-0001Y",
    "contractTitle": "IT Services and Solutions - Cloud Computing"
  },
  // ... rest of contract data
  "systemExtensions": {
    "contract_data": {
      // ✅ Typed structure - schema enforced
      "legacy_procurementanceType": {
        "code": "04",
        "description": "Project Grant",
        "isFinancialAssistance": true
      },
      "eligibility": {
        "code": "21",
        "description": "Small Business",
        "eligibleApplicants": ["Small Business", "8(a) Certified"]
      },
      "usage": {
        "reportingPeriod": "Q1-FY2024",
        "fundsObligated": 12500000.50
      }
    }
  }
}
```

**Benefits:** 
- Schema validation on system extensions
- Clear structure for Contract Data-specific data
- Type safety throughout

---

## System Mappings Comparison

### Contract Data Mapping Differences

#### V1 Contract Data Mapping

```json
{
  "systemExtensions": {
    "contract_data": "data.rawFpdsData"  // ❌ Maps to entire object
  }
}
```

**Issues:**
- Generic object mapping
- No field-level mapping
- Everything goes into one blob

#### V2 Contract Data Mapping

```json
{
  "systemExtensions.contract_data": {
    "$ref": "#/definitions/Contract DataExtension",
    "legacy_procurementanceType": {
      "code": "legacy_procurementanceType.code",
      "description": "legacy_procurementanceType.description",
      "isFinancialAssistance": "legacy_procurementanceType.isFinancial"
    },
    "applicantBeneficiary": {
      "name": "beneficiary.name",
      "type": "beneficiary.entityType"
    },
    "eligibility": {
      "code": "eligibility.code",
      "eligibleApplicants": "eligibility.applicantTypes"
    }
  }
}
```

**Benefits:**
- Field-level mapping clarity
- Reference to definition
- Clear transformation rules
- Queryable structure

### Legacy Procurement Mapping Differences

#### V1 Legacy Procurement Mapping (Implicit)

```json
{
  "systemExtensions": {
    "legacy_procurement": "award.rawData"  // ❌ Generic object
  }
}
```

#### V2 Legacy Procurement Mapping (Explicit)

```json
{
  "systemExtensions.legacy_procurement": {
    "$ref": "#/definitions/AssistExtension",
    "acquisitionData": {
      "cfda": {
        "number": "program.cfdaNumber",
        "title": "program.cfdaTitle"
      }
    },
    "clientData": {
      "businessType": "recipient.businessTypes",
      "minorityOwned": "recipient.minorityOwned"
    }
  }
}
```

**Benefits:**
- CFDA data is queryable
- Business classifications are typed
- Clear structure for grants/awards

### EASi Mapping Differences

#### V1 EASi Mapping (Minimal)

```json
{
  "systemExtensions": {
    "intake_process": "intake.rawData"  // ❌ IT governance data as blob
  }
}
```

#### V2 EASi Mapping (Detailed)

```json
{
  "systemExtensions.intake_process": {
    "$ref": "#/definitions/EasiExtension",
    "projectInfo": {
      "itSystemName": "system.name",
      "businessOwner": "system.businessOwner.name"
    },
    "approvalInfo": {
      "grbReviewDate": "governance.grbReviewDate",
      "lcid": "governance.lcid"
    },
    "businessCaseInfo": {
      "status": "businessCase.status",
      "estimatedLifecycleCost": "businessCase.preferredSolution.estimatedLifecycleCost"
    }
  }
}
```

**Benefits:**
- IT governance data is queryable
- GRB/GRT information is typed
- Business case tracking is explicit
- Lifecycle ID (LCID) is accessible

---

## GraphQL Output Comparison

### V1 GraphQL Output (295 lines)

```graphql
type Contract {
  systemMetadata: SystemMetadata
  contractIdentification: ContractIdentification
  # ... other fields
  systemExtensions: SystemExtensions
}

type SystemExtensions {
  contract_data: JSON  # ❌ Opaque
  legacy_procurement: JSON  # ❌ Opaque
  intake_process: JSON  # ❌ Opaque
}

# Cannot query:
query {
  contracts {
    systemExtensions {
      contract_data  # Returns entire JSON blob
      # ❌ Cannot do: contract_data { legacy_procurementanceType { code } }
    }
  }
}
```

### V2 GraphQL Output (537 lines)

```graphql
type Contract {
  systemMetadata: SystemMetadata
  contractIdentification: ContractIdentification
  # ... other fields
  systemExtensions: SystemExtensions
}

type SystemExtensions {
  contract_data: Contract DataExtension  # ✅ Typed
  legacy_procurement: AssistExtension  # ✅ Typed
  intake_process: EasiExtension  # ✅ Typed
}

type Contract DataExtension {
  contract_data: Contract DataSpecificData
}

type Contract DataSpecificData {
  legacy_procurementanceType: Contract DataAssistanceType
  eligibility: Contract DataEligibility
  usage: Contract DataUsage
}

# Can query:
query {
  contracts {
    systemExtensions {
      contract_data {
        contract_data {
          legacy_procurementanceType {
            code
            description
            isFinancialAssistance
          }
          eligibility {
            eligibleApplicants
          }
        }
      }
    }
  }
}
```

---

## Use Case Impact Analysis

### Use Case 1: Dashboard Filtering

**Requirement:** Filter contracts by Contract Data legacy_procurementance type

**V1 Limitation:**
```graphql
# ❌ CANNOT DO THIS
query {
  contracts(filter: {
    contract_data: { legacy_procurementanceType: { isFinancialAssistance: true } }
  }) {
    piid
  }
}
```
**Workaround:** Fetch all contracts, parse JSON client-side, filter in memory.

**V2 Solution:**
```graphql
# ✅ CAN DO THIS
query {
  contracts(filter: {
    systemExtensions: {
      contract_data: {
        contract_data: {
          legacy_procurementanceType: { isFinancialAssistance: true }
        }
      }
    }
  }) {
    piid
    systemExtensions {
      contract_data {
        contract_data {
          legacy_procurementanceType {
            code
            description
          }
        }
      }
    }
  }
}
```

### Use Case 2: Legacy Procurement CFDA Reporting

**Requirement:** Generate report of all Legacy Procurement awards by CFDA number

**V1 Limitation:**
```graphql
# ❌ Cannot query CFDA number
query {
  contracts(filter: { primarySystem: Legacy Procurement }) {
    piid
    systemExtensions {
      legacy_procurement  # Returns JSON blob with CFDA somewhere inside
    }
  }
}
```

**V2 Solution:**
```graphql
# ✅ Can query CFDA explicitly
query {
  contracts(filter: { primarySystem: Legacy Procurement }) {
    piid
    systemExtensions {
      legacy_procurement {
        legacy_procurement {
          acquisitionData {
            cfda {
              number
              title
            }
          }
        }
      }
    }
  }
}
```

### Use Case 3: EASi Governance Tracking

**Requirement:** Track IT projects by GRB review status and LCID

**V1 Limitation:**
```graphql
# ❌ Cannot query governance fields
query {
  contracts(filter: { primarySystem: Intake Process }) {
    piid
    systemExtensions {
      intake_process  # Returns JSON blob - must parse for GRB/LCID
    }
  }
}
```

**V2 Solution:**
```graphql
# ✅ Can query governance fields explicitly
query {
  contracts(filter: { primarySystem: Intake Process }) {
    piid
    systemExtensions {
      intake_process {
        intake_process {
          approvalInfo {
            grbReviewDate
            grbRecommendation
            lcid
          }
          governanceInfo {
            requestType
            governanceTeams
          }
        }
      }
    }
  }
}
```

---

## Maintenance Comparison

### Adding New Field to Core Contract (e.g., "contractValue")

#### V1 Approach
```json
{
  "properties": {
    "financialInfo": {
      "type": "object",
      "properties": {
        "contractValue": {
          "type": "number",
          "description": "New field"
        }
      }
    }
  }
}
```
**Steps:** 1 (add inline)

#### V2 Approach
```json
{
  "definitions": {
    "FinancialInfo": {
      "type": "object",
      "properties": {
        "contractValue": {
          "type": "number",
          "description": "New field"
        }
      }
    }
  }
}
```
**Steps:** 1 (add to definition)
**Benefit:** Automatically available everywhere FinancialInfo is referenced

### Adding New Contract Data-Specific Field

#### V1 Approach
```json
{
  "properties": {
    "systemExtensions": {
      "properties": {
        "contract_data": {
          "type": "object",
          "additionalProperties": true  // Anything goes
        }
      }
    }
  }
}
```
**Steps:** 1 (just add to data - no schema change needed)
**Problem:** No validation, no type safety, no GraphQL discovery

#### V2 Approach
```json
{
  "definitions": {
    "Contract DataSpecificData": {
      "properties": {
        "newField": {
          "type": "string",
          "description": "New Contract Data field"
        }
      }
    }
  }
}
```
**Steps:** 1 (add to Contract DataSpecificData definition)
**Benefit:** Type safety, validation, automatic GraphQL update, queryable

---

## File Size Comparison

| File | V1 Size | V2 Size | Difference |
|------|---------|---------|------------|
| **Schema** | ~25 KB | ~35 KB | +40% (more definitions) |
| **Contract Data Mapping** | ~5 KB | ~8 KB | +60% (detailed mappings) |
| **Legacy Procurement Mapping** | ~4 KB | ~7 KB | +75% (detailed mappings) |
| **EASi Mapping** | ~3 KB | ~9 KB | +200% (IT governance details) |
| **Example Data** | ~10 KB | ~12 KB | +20% (structured extensions) |

**Analysis:**
- V2 files are larger due to explicit structure
- Trade-off: Size vs Functionality
- V2 enables much more powerful queries
- Gzip compression reduces difference significantly

---

## Developer Experience Comparison

### V1 Developer Experience

**Pros:**
- ✅ Easy to read schema top-to-bottom
- ✅ Quick to understand overall structure
- ✅ Simple to validate data instances

**Cons:**
- ❌ No autocomplete for system extensions
- ❌ Must parse JSON manually for Contract Data/Legacy Procurement/EASi data
- ❌ No type safety in GraphQL queries
- ❌ Cannot filter by system-specific fields
- ❌ Limited IDE support

### V2 Developer Experience

**Pros:**
- ✅ Full autocomplete in GraphQL clients (GraphiQL, Playground)
- ✅ Type safety throughout
- ✅ Clear type definitions
- ✅ Can query any field explicitly
- ✅ Better IDE support (TypeScript generation)
- ✅ Self-documenting through GraphQL introspection

**Cons:**
- ⚠️ Must navigate between definitions
- ⚠️ More complex schema structure
- ⚠️ Learning curve for $ref usage

---

## Migration Path

### Option 1: Keep Both (Recommended)

**Strategy:** Maintain V1 as human-readable source, generate V2 for tooling

**Workflow:**
1. Edit V1 schema (simple, nested)
2. Run converter → generates V2 base
3. Manually refine V2 system extensions (Contract Data/Legacy Procurement/EASi)
4. Generate GraphQL from V2

**Benefits:**
- V1 remains simple for humans
- V2 provides power for tools
- Best of both worlds

### Option 2: Migrate to V2 Only

**Strategy:** Use V2 as single source of truth

**Considerations:**
- More complex to maintain
- Better for code generation
- May require team training

### Option 3: Hybrid with Hints (Future)

**Strategy:** Add x-graphql hints to V1, generate rich V2

**Example:**
```json
{
  "systemExtensions": {
    "contract_data": {
      "type": "object",
      "x-graphql-expand": true,
      "x-graphql-type": "Contract DataSpecificData"
    }
  }
}
```

**Benefits:**
- V1 stays mostly simple
- Auto-generates rich V2
- Non-invasive hints

---

## Summary

### V1 Strengths
- ✅ Human-readable
- ✅ Easy to understand
- ✅ Simple validation
- ✅ Quick to edit

### V1 Weaknesses
- ❌ System extensions opaque
- ❌ Limited GraphQL queries
- ❌ No type reuse
- ❌ Incompatible with most tools

### V2 Strengths
- ✅ Queryable system extensions
- ✅ Type safety
- ✅ Code generation ready
- ✅ Powerful GraphQL queries
- ✅ Production-ready for APIs

### V2 Weaknesses
- ⚠️ More complex structure
- ⚠️ Requires navigation
- ⚠️ Larger file size

### Recommendation

**For API/Dashboard Development:** Use **V2**
- Essential for queryable system-specific data
- Required for type-safe filtering
- Enables powerful GraphQL queries

**For Documentation/Training:** Use **V1**
- Easier to understand
- Better for explaining structure
- Simpler for stakeholders

**For Maintenance:** Use **Hybrid Approach**
- Keep V1 as human source
- Auto-generate V2 for tooling
- Best of both worlds

---

## Visual Comparison

### V1 Structure (Flat, Nested)
```
schema_unification.schema.json
├── properties
│   ├── systemMetadata (inline object)
│   ├── contractIdentification (inline object)
│   └── systemExtensions (inline object)
│       ├── contract_data (generic object) ❌
│       ├── legacy_procurement (generic object) ❌
│       └── intake_process (generic object) ❌
```

### V2 Structure (Modular, Referenced)
```
schema_unification.schema.v2-generated.json
├── properties
│   ├── systemMetadata → $ref: #/definitions/SystemMetadata
│   ├── contractIdentification → $ref: #/definitions/ContractIdentification
│   └── systemExtensions → $ref: #/definitions/SystemExtensions
│
└── definitions/
    ├── SystemMetadata
    ├── ContractIdentification
    ├── SystemExtensions
    │   ├── contract_data → $ref: #/definitions/Contract DataExtension ✅
    │   ├── legacy_procurement → $ref: #/definitions/AssistExtension ✅
    │   └── intake_process → $ref: #/definitions/EasiExtension ✅
    ├── Contract DataExtension
    │   └── contract_data → Contract DataSpecificData
    │       ├── legacy_procurementanceType
    │       ├── eligibility
    │       └── usage
    ├── AssistExtension
    │   └── legacy_procurement → AssistSpecificData
    │       ├── acquisitionData
    │       ├── clientData
    │       └── awardData
    └── EasiExtension
        └── intake_process → EasiSpecificData
            ├── projectInfo
            ├── requirementInfo
            ├── approvalInfo
            ├── governanceInfo
            └── businessCaseInfo
```

---

**Document Status:** ✅ Complete  
**Last Updated:** October 6, 2025  
**Files Generated:** 5 new V2 files + this comparison document  
**Next Steps:** Review files, test in viewers, decide on maintenance strategy
