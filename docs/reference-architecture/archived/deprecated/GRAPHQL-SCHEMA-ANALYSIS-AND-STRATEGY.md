> **⚠️ ARCHIVED DOCUMENTATION**
>
> This document has been archived and is preserved for historical reference only.
>
> See instead: [x-graphql Hints Guide](x-graphql-hints-guide.md) and [Schema Pipeline Guide](schema-pipeline-guide.md)
>
> Archived: December 2024  
> Reason: Superseded by consolidated guides

# GraphQL Schema Analysis and Strategy

## Executive Summary

This document analyzes both GraphQL schemas (V1 auto-generated vs V2 hand-crafted) to determine which is most useful for API/dashboard purposes, and proposes a balanced strategy that maintains JSON Schema simplicity while enhancing GraphQL output.

**TL;DR Recommendation:** Use **V2 Hand-Crafted schema** for API/Dashboard development, but adopt a **hybrid maintenance strategy** that keeps V1 JSON Schema simple while allowing targeted enhancements.

---

## Schema Comparison Analysis

### Overview Statistics

| Metric                    | V1 Auto-Generated                    | V2 Hand-Crafted                          |
| ------------------------- | ------------------------------------ | ---------------------------------------- |
| **Lines of GraphQL SDL**  | 295                                  | 537                                      |
| **Object Types**          | 17                                   | 30                                       |
| **Enums**                 | 3                                    | 3                                        |
| **Scalars**               | 6                                    | 6                                        |
| **Source**                | Auto-converted from V1 nested schema | Manually crafted with extensions         |
| **System Extensions**     | Opaque (JSON type)                   | Typed & Queryable (13 specialized types) |
| **Documentation Quality** | Basic                                | Detailed with descriptions               |
| **API/Dashboard Ready**   | ❌ Limited                           | ✅ Production-Ready                      |

---

## Detailed Type-by-Type Comparison

### Core Types (Identical in Both)

Both schemas share these 17 core types with identical structure:

1. **Contract** - Main contract entity
2. **SystemMetadata** - Multi-system metadata
3. **SystemChainEntry** - System chain tracking
4. **DataQuality** - Quality metrics
5. **ContractIdentification** - PIID and contract details
6. **AgencyInfo** - Agency/department information
7. **OrganizationInfo** - Contracting organizations
8. **VendorInfo** - Vendor details
9. **PlaceOfPerformance** - Location information
10. **FinancialInfo** - Contract financials
11. **BusinessClassification** - NAICS, PSC, etc.
12. **ContractCharacteristics** - Dates, types, competition
13. **Contact** - Contact information
14. **StatusInfo** - Contract status tracking
15. **Contract DataExtension** - Contract Data system data
16. **AssistExtension** - Legacy Procurement system data
17. **EasiExtension** - EASi system data

**Key Difference:** In V1, the last three (system extensions) are **opaque JSON types**. In V2, they are **typed structures**.

---

## Critical Difference: System Extensions

### V1 Auto-Generated Approach (PROBLEM for API/Dashboard)

```graphql
type Contract DataExtension {
  """Raw Contract Data-specific data (stored as JSON)"""
  contract_data: JSON
}

type AssistExtension {
  """Raw Legacy Procurement-specific data (stored as JSON)"""
  legacy_procurement: JSON
}

type EasiExtension {
  """Raw EASi-specific data (stored as JSON)"""
  intake_process: JSON
}
```

**Problems:**

- ❌ System-specific data is opaque JSON blob
- ❌ Cannot query specific Contract Data/Legacy Procurement/EASi fields
- ❌ No type safety for filters/sorting
- ❌ Client must parse JSON manually
- ❌ GraphQL introspection cannot discover fields
- ❌ Cannot use GraphQL fragments on system-specific data

**Example Query Limitation:**

```graphql
# ❌ CANNOT DO THIS with V1:
query {
  contracts {
    piid
    contract_dataExtension {
      contract_data {
        specificData {
          legacy_procurementanceType # Error: JSON type has no fields
        }
      }
    }
  }
}

# ✅ CAN ONLY DO THIS:
query {
  contracts {
    piid
    contract_dataExtension {
      contract_data # Returns opaque JSON - must parse client-side
    }
  }
}
```

### V2 Hand-Crafted Approach (IDEAL for API/Dashboard)

```graphql
type Contract DataExtension {
  """Contract Data-specific data with typed structure"""
  contract_data: Contract DataSpecificData
}

type Contract DataSpecificData {
  """Assistance type information"""
  legacy_procurementanceType: Contract DataAssistanceType

  """Applicant/beneficiary details"""
  applicantBeneficiary: Contract DataApplicantBeneficiaryType

  """Eligibility criteria"""
  eligibility: Contract DataEligibility

  """Usage and reporting"""
  usage: Contract DataUsage
}

type Contract DataAssistanceType {
  """Type code for legacy_procurementance"""
  code: String

  """Type description"""
  description: String

  """Financial legacy_procurementance flag"""
  isFinancialAssistance: Boolean
}

# Plus 4 more Contract Data types, 5 Legacy Procurement types, 1 EASi type
```

**Benefits:**

- ✅ System-specific data is fully typed and queryable
- ✅ Can query specific nested fields
- ✅ Type safety for filters, sorting, validation
- ✅ GraphQL introspection reveals all fields
- ✅ Can use fragments for system-specific queries
- ✅ Better developer experience (autocomplete, docs)

**Example Query Power:**

```graphql
# ✅ CAN DO THIS with V2:
query {
  contracts(
    filter: {
      contract_data: {
        legacy_procurementanceType: { isFinancialAssistance: true }
        eligibility: { code: "ABC123" }
      }
    }
  ) {
    piid
    contractTitle
    contract_dataExtension {
      contract_data {
        legacy_procurementanceType {
          code
          description
          isFinancialAssistance
        }
        applicantBeneficiary {
          name
          type
          location
        }
      }
    }
  }
}
```

---

## Query Types Comparison

### V1 Auto-Generated Queries

```graphql
type Query {
  """
  Fetch a single contract by global ID
  """
  contract: Contract

  """
  Fetch a contract by PIID
  """
  contractByPiid: Contract

  """
  List all contracts with optional filtering
  """
  contracts: String # ⚠️ Returns String (should be [Contract])
  """
  List contracts by source system
  """
  contractsBySystem: String # ⚠️ Returns String (should be [Contract])
}
```

**Problems:**

- ⚠️ Query arguments not properly typed (converter limitation)
- ⚠️ Return types are String instead of proper types
- ❌ No pagination support
- ❌ No full-text search
- ❌ Limited filtering capabilities

### V2 Hand-Crafted Queries

```graphql
type Query {
  """
  Fetch a single contract by global ID
  """
  contract: Contract

  """
  Fetch a contract by PIID
  """
  contractByPiid: Contract

  """
  Paginated list of contracts with filtering
  """
  contracts: String # Should be ContractConnection for pagination
  """
  Full-text search for contracts
  """
  searchContracts: String # Should be [Contract] with SearchInput
}
```

**Improvements:**

- ✅ More query options (pagination, search)
- ⚠️ Still has String return types (needs enhancement)
- ✅ Better documentation
- ✅ Clearer intent for different query types

**Ideal State (Future Enhancement):**

```graphql
type Query {
  contract(id: ID!): Contract
  contractByPiid(piid: String!): Contract
  contracts(
    first: Int = 20
    after: String
    filter: ContractFilter
    sort: ContractSort
  ): ContractConnection!
  searchContracts(
    query: String!
    fields: [SearchField!]
    first: Int = 20
  ): [Contract!]!
}
```

---

## API/Dashboard Use Case Analysis

### Use Case 1: Leadership Dashboard

**Requirement:** Display contracts by agency with financial totals, filterable by system (Contract Data, Legacy Procurement, EASi).

**V1 Auto-Generated:**

```graphql
# ❌ Cannot filter by system-specific fields
query DashboardData {
  contracts {
    contractTitle
    organizationInfo {
      contractingAgency {
        name
      }
    }
    financialInfo {
      totalContractValue
    }
    contract_dataExtension {
      contract_data # Opaque JSON - must parse client-side
    }
  }
}
```

**Problems:**

- Must fetch all contracts and filter client-side
- Cannot aggregate by Contract Data-specific fields
- No type safety on filtering

**V2 Hand-Crafted:**

```graphql
# ✅ Can filter and query system-specific fields
query DashboardData {
  contracts(filter: { primarySystem: Contract Data }) {
    contractTitle
    organizationInfo {
      contractingAgency { name }
    }
    financialInfo {
      totalContractValue
    }
    contract_dataExtension {
      contract_data {
        legacy_procurementanceType {
          code
          description
          isFinancialAssistance
        }
      }
    }
  }
}
```

**Benefits:**

- Server-side filtering by system
- Typed system-specific data
- Can aggregate specific Contract Data fields

**Winner:** ✅ **V2 Hand-Crafted**

---

### Use Case 2: Contract Search Interface

**Requirement:** Full-text search with faceted filters (agency, system, contract type, financial range).

**V1 Auto-Generated:**

```graphql
# ❌ Limited search capabilities
query SearchContracts {
  contracts {
    # No filtering args
    piid
    contractTitle
    organizationInfo {
      contractingAgency {
        name
      }
    }
  }
}
```

**Problems:**

- No search query support
- Must fetch all and search client-side
- No faceted filtering

**V2 Hand-Crafted:**

```graphql
# ✅ Dedicated search query (though args need enhancement)
query SearchContracts {
  searchContracts {
    # Supports full-text search
    piid
    contractTitle
    organizationInfo {
      contractingAgency {
        name
      }
    }
    systemMetadata {
      primarySystem
    }
  }
}
```

**Benefits:**

- Dedicated search endpoint
- Can extend with proper filter args
- Better performance (server-side search)

**Winner:** ✅ **V2 Hand-Crafted** (with enhancement needed)

---

### Use Case 3: System-Specific Reports

**Requirement:** Generate Contract Data-specific report showing legacy_procurementance types and eligibility.

**V1 Auto-Generated:**

```graphql
# ❌ Cannot query Contract Data-specific fields
query Contract DataReport {
  contracts {
    piid
    contract_dataExtension {
      contract_data  # JSON blob - must parse all fields client-side
    }
  }
}
```

**Problems:**

- Cannot query specific Contract Data fields
- Must transfer entire JSON blob
- No validation on expected fields

**V2 Hand-Crafted:**

```graphql
# ✅ Precise field selection for Contract Data data
query Contract DataReport {
  contracts(filter: { primarySystem: Contract Data }) {
    piid
    contract_dataExtension {
      contract_data {
        legacy_procurementanceType {
          code
          description
          isFinancialAssistance
        }
        eligibility {
          code
          description
          eligibleApplicants
        }
        usage {
          reportingPeriod
          fundsObligated
        }
      }
    }
  }
}
```

**Benefits:**

- Precise field selection (efficient)
- Type-safe Contract Data data access
- Clear structure for reporting

**Winner:** ✅ **V2 Hand-Crafted**

---

## Recommendation: V2 for API/Dashboard

### Clear Winner: V2 Hand-Crafted Schema

**Why V2 is Superior for API/Dashboard:**

1. **Queryable System Data** ⭐⭐⭐
   - Contract Data, Legacy Procurement, EASi data is fully typed
   - Can query specific nested fields
   - Enables powerful filtering and sorting

2. **Type Safety** ⭐⭐⭐
   - No opaque JSON blobs
   - GraphQL type system enforces structure
   - Better validation and error handling

3. **Developer Experience** ⭐⭐
   - Autocomplete in GraphQL clients
   - Inline documentation
   - Clear API contracts

4. **Performance** ⭐⭐
   - Server-side filtering reduces data transfer
   - Precise field selection (no over-fetching)
   - Can add indexes on specific fields

5. **Maintainability** ⭐
   - Clear structure for system extensions
   - Easier to add new fields
   - Better documentation

**V1 Use Cases:**

- Understanding core data model (educational)
- Quick schema exploration
- Simple validation scenarios

**V2 Use Cases:**

- Production API implementation ✅
- Leadership dashboards ✅
- System-specific reporting ✅
- Full-text search interfaces ✅
- Complex filtering and aggregation ✅

---

## Balanced Strategy: Hybrid Approach

### Goal: Maintain JSON Schema Simplicity + Enhance GraphQL Output

The challenge: We want to keep `src/data/schema_unification.schema.json` (V1) simple and maintainable for humans, while producing a powerful GraphQL schema for APIs/dashboards.

### Proposed Hybrid Strategy

#### Phase 1: Keep V1 Schema as Human Source of Truth ✅ (DONE)

**Current State:**

- `src/data/schema_unification.schema.json` - Simple nested structure
- Easy to read and maintain
- Perfect for documentation and validation

**Keep this approach** - Do NOT restructure V1 schema.

#### Phase 2: Add Minimal x-graphql Hints to V1 Schema

**Strategy:** Add lightweight extension hints to V1 schema that guide the auto-converter without changing the core structure.

**Example Enhancement:**

```json
{
  "systemExtensions": {
    "type": "object",
    "description": "System-specific data extensions",
    "properties": {
      "contract_data": {
        "type": "object",
        "description": "Contract Data-specific data",
        "x-graphql-expand": true,
        "x-graphql-extract-types": [
          "legacy_procurementanceType",
          "applicantBeneficiary",
          "eligibility",
          "usage"
        ],
        "properties": {
          "legacy_procurementanceType": {
            "type": "object",
            "x-graphql-type": "Contract DataAssistanceType",
            "properties": {
              "code": { "type": "string" },
              "description": { "type": "string" },
              "isFinancialAssistance": { "type": "boolean" }
            }
          }
        }
      }
    }
  }
}
```

**Benefits:**

- ✅ V1 schema remains readable
- ✅ Auto-converter knows which fields to expand
- ✅ Non-invasive (x-graphql-\* properties ignored by validators)
- ✅ Enables richer GraphQL output

**Drawbacks:**

- ⚠️ V1 schema grows slightly (minimal)
- ⚠️ Requires converter enhancements
- ⚠️ Two places to document (JSON Schema + x-graphql hints)

#### Phase 3: Auto-Generate Enhanced V2 from Annotated V1

**Enhanced Converter Features:**

```javascript
// scripts/convert-v1-to-v2-enhanced.mjs

function extractDefinitions(v1Schema) {
  // Existing: Extract core types
  const definitions = extractCoreTypes(v1Schema);

  // NEW: Process x-graphql-expand hints
  const expandableTypes = findPropertiesWithHint(v1Schema, "x-graphql-expand");

  for (const prop of expandableTypes) {
    if (prop["x-graphql-extract-types"]) {
      // Extract nested types specified in hints
      for (const typeName of prop["x-graphql-extract-types"]) {
        definitions[typeName] = extractNestedType(prop, typeName);
      }
    }
  }

  return definitions;
}
```

**Result:** Auto-generated V2 with system-specific types extracted based on hints.

#### Phase 4: Allow Manual V2 Refinements

**Strategy:** Auto-generate V2 as base, then allow manual enhancements for complex cases.

**Workflow:**

1. Edit V1 schema (simple nested structure)
2. Run enhanced converter → generates V2 base
3. Manually refine V2 for complex system extensions (optional)
4. Generate GraphQL SDL from V2

**Version Control:**

```
src/data/
  schema_unification.schema.json              # V1: Human-maintained source of truth
  schema_unification.schema.v2-generated.json # V2: Auto-generated base
  schema_unification.schema.v2-refined.json   # V2: Manually refined (optional)
```

**Decision Tree:**

```
Need to add new field?
│
├─ Core contract data?
│  └─ Edit V1 → Run converter → Done ✅
│
└─ System-specific detail?
   ├─ Simple field?
   │  └─ Edit V1 + add x-graphql hint → Run converter → Done ✅
   │
   └─ Complex nested structure?
      └─ Edit V1 → Run converter → Manually refine V2 → Done ✅
```

---

## Implementation Roadmap

### Immediate (Landing Page Update) ✅ DONE

- ✅ Update landing page with 2 Voyager buttons
  - "GraphQL: Core Model" → /voyager-v1
  - "GraphQL: API/Dashboard" → /voyager-v2 (gradient button)
- ✅ Emphasize V2 as production-ready API schema

### Short Term (Converter Enhancements)

**Goal:** Enable V1 schema hints to produce better V2 output

1. **Add x-graphql hint support to converter** (scripts/convert-v1-to-v2.mjs)
   - Support `x-graphql-expand: true` flag
   - Support `x-graphql-extract-types` array
   - Support `x-graphql-type` explicit type names
   - Support `x-graphql-description` for better docs

2. **Document hint system**
   - Create guide: "Enhancing GraphQL Output with Minimal Hints"
   - Examples of common hint patterns
   - Decision tree for when to use hints vs manual refinement

3. **Add validation**
   - Validate x-graphql hints are consistent
   - Warn if hints reference non-existent properties
   - Suggest hints for opaque JSON properties

### Medium Term (Query Enhancement)

**Goal:** Fix query argument types and add proper return types

1. **Parse string-based argument definitions**
   - Convert `"ID!"` → `GraphQLNonNull(GraphQLID)`
   - Convert `"String!"` → `GraphQLNonNull(GraphQLString)`
   - Support arrays: `"[Contract!]!"`

2. **Add pagination types**
   - ContractConnection
   - ContractEdge
   - PageInfo
   - Relay-style pagination

3. **Add filter/sort input types**
   - ContractFilter input type
   - ContractSort enum
   - System-specific filter inputs

### Long Term (Complete API Schema)

**Goal:** Production-ready GraphQL API

1. **Add Mutations**
   - Create/Update/Delete operations
   - Proper input validation
   - Error handling

2. **Add Subscriptions** (if real-time needed)
   - Contract updates
   - System sync notifications

3. **Add Directives**
   - @deprecated for old fields
   - @auth for access control
   - @requires for field dependencies

4. **Generate Resolvers**
   - Stub resolvers from schema
   - TypeScript resolver types
   - Resolver documentation

---

## Specific Recommendations

### For JSON Schema Maintenance (V1)

**DO:**

- ✅ Keep nested structure (human-readable)
- ✅ Add x-graphql hints for complex types (minimal)
- ✅ Use clear descriptions (become GraphQL docs)
- ✅ Maintain as single source of truth

**DON'T:**

- ❌ Don't add definitions section (breaks simplicity)
- ❌ Don't restructure for tooling (defeats purpose)
- ❌ Don't duplicate data between V1 and V2 manually

### For GraphQL Generation (V2)

**DO:**

- ✅ Use V2 hand-crafted for production API
- ✅ Auto-generate V2 base from V1 when possible
- ✅ Manually refine system extensions (Contract Data, Legacy Procurement, EASi)
- ✅ Keep V2 in version control (review changes)

**DON'T:**

- ❌ Don't manually edit auto-generated sections
- ❌ Don't lose manual refinements on regeneration
- ❌ Don't skip documentation in V2

### For Landing Page

**DO:**

- ✅ Show both Voyager buttons (Core Model vs API/Dashboard)
- ✅ Use visual distinction (gradient for V2)
- ✅ Label clearly (purpose, not just version number)
- ✅ Link to documentation explaining differences

**DON'T:**

- ❌ Don't hide V1 (still useful for learning)
- ❌ Don't make them equal (V2 is production-ready)

---

## Example: Annotating V1 Schema

### Before (Current V1 - Opaque Contract Data Extension)

```json
{
  "systemExtensions": {
    "type": "object",
    "properties": {
      "contract_data": {
        "type": "object",
        "description": "Contract Data-specific data",
        "additionalProperties": true
      }
    }
  }
}
```

**Result:** Generates `contract_data: JSON` in GraphQL (opaque).

### After (Enhanced V1 - With Hints)

```json
{
  "systemExtensions": {
    "type": "object",
    "properties": {
      "contract_data": {
        "type": "object",
        "description": "Contract Data-specific data",
        "x-graphql-expand": true,
        "x-graphql-type": "Contract DataSpecificData",
        "properties": {
          "legacy_procurementanceType": {
            "type": "object",
            "description": "Type of legacy_procurementance provided",
            "x-graphql-type": "Contract DataAssistanceType",
            "properties": {
              "code": {
                "type": "string",
                "description": "Assistance type code"
              },
              "description": {
                "type": "string",
                "description": "Human-readable description"
              },
              "isFinancialAssistance": {
                "type": "boolean",
                "description": "Whether this is financial legacy_procurementance"
              }
            }
          },
          "eligibility": {
            "type": "object",
            "description": "Eligibility criteria",
            "x-graphql-type": "Contract DataEligibility",
            "properties": {
              "code": { "type": "string" },
              "description": { "type": "string" },
              "eligibleApplicants": {
                "type": "array",
                "items": { "type": "string" }
              }
            }
          }
        }
      }
    }
  }
}
```

**Result:** Generates proper typed structures:

```graphql
type Contract DataSpecificData {
  legacy_procurementanceType: Contract DataAssistanceType
  eligibility: Contract DataEligibility
}

type Contract DataAssistanceType {
  code: String
  description: String
  isFinancialAssistance: Boolean
}

type Contract DataEligibility {
  code: String
  description: String
  eligibleApplicants: [String]
}
```

**Trade-off Analysis:**

- V1 schema grows from ~50 lines to ~100 lines for Contract Data section
- BUT: Remains readable and well-structured
- AND: Generates production-ready GraphQL types
- STILL: Much simpler than full definitions-based schema

---

## Conclusion

### Summary of Recommendations

1. **For API/Dashboard Development: Use V2 Hand-Crafted Schema** ✅
   - Superior type safety
   - Queryable system-specific data
   - Production-ready for leadership dashboards

2. **For JSON Schema Maintenance: Hybrid Approach** ✅
   - Keep V1 simple and human-readable
   - Add minimal x-graphql hints for complex types
   - Auto-generate V2 base, manually refine when needed

3. **For Landing Page: Show Both, Emphasize V2** ✅
   - Two buttons: "Core Model" (V1) and "API/Dashboard" (V2)
   - Visual distinction (gradient button for V2)
   - Clear labeling of purpose

4. **For Converter: Enhance with Hint Support** 🔄
   - Add x-graphql-expand, x-graphql-type support
   - Enable richer V2 generation from annotated V1
   - Preserve manual refinements

### Expected Outcomes

**For Developers:**

- ✅ Powerful GraphQL API for dashboards (V2)
- ✅ Simple JSON Schema for maintenance (V1)
- ✅ Clear upgrade path (hints + manual refinement)

**For Leadership:**

- ✅ Production-ready API schema visualization (V2)
- ✅ Clear understanding of system-specific data
- ✅ Confidence in data structure for reporting

**For Contributors:**

- ✅ Easy to maintain JSON Schema (V1 remains simple)
- ✅ Clear guidelines on when to use hints
- ✅ Automated tooling reduces manual work

### Next Steps

1. ✅ **DONE:** Update landing page with both Voyager buttons
2. **TODO:** Document x-graphql hint system
3. **TODO:** Enhance converter to support hints
4. **TODO:** Add example annotations to V1 schema (one system)
5. **TODO:** Test hint-based generation
6. **TODO:** Document decision tree for contributors

---

**Document Status:** ✅ Complete  
**Last Updated:** October 6, 2025  
**Reviewed By:** Analysis based on schema comparison and API use case evaluation  
**Next Review:** After hint system implementation
