# Quick Reference: V1 vs V2 Files

## Files for Comparison

### Schemas

| Type | V1 File | V2 File | Key Difference |
|------|---------|---------|----------------|
| **Schema** | `src/data/schema_unification.schema.json` | `src/data/schema_unification.schema.v2-generated.json` | V1 nested, V2 definitions-based |

### Example Data

| Type | V1 File | V2 File | Key Difference |
|------|---------|---------|----------------|
| **Example** | N/A | `public/data/schema_unification-v2-example.json` | V2 shows typed system extensions |

### System Mappings

| System | V1 File | V2 File | Key Difference |
|--------|---------|---------|----------------|
| **Contract Data** | `public/data/schema_unification2contract_data.json` | `public/data/schema_unification2contract_data-v2.json` | V2 has typed Contract Data extensions (legacy_procurementanceType, eligibility, usage) |
| **Legacy Procurement** | `public/data/schema_unification2legacy_procurement.json` | `public/data/schema_unification2legacy_procurement-v2.json` | V2 has CFDA structure, business classifications |
| **EASi** | `public/data/schema-unification2intake_process.json` | `public/data/schema_unification2intake_process-v2.json` | V2 has IT governance structure (GRB, LCID, business case) |

### GraphQL Output

| Type | V1 File | V2 File | Key Difference |
|------|---------|---------|----------------|
| **SDL** | `public/data/schema_unification-v1.graphql` (295 lines) | `public/data/schema_unification-v2.graphql` (537 lines) | V2 has 13 additional system-specific types |

### Documentation

| Doc | File | Description |
|-----|------|-------------|
| **Comparison** | `docs/V1-VS-V2-SCHEMA-COMPARISON.md` | 800+ line detailed analysis |
| **Analysis** | `docs/GRAPHQL-SCHEMA-ANALYSIS-AND-STRATEGY.md` | 1,200+ line strategy document |
| **Voyager Pages** | `docs/GRAPHQL-VOYAGER-PAGES.md` | Documentation of viewer pages |

---

## Quick Visual Comparison

### Open These Files Side-by-Side

**For Schema Structure:**
1. Open `src/data/schema_unification.schema.json` (V1)
2. Open `src/data/schema_unification.schema.v2-generated.json` (V2)
3. Compare: V1 is nested, V2 has `definitions` section

**For System Extensions:**
1. Search for `"systemExtensions"` in both schemas
2. V1: Generic `additionalProperties: true` objects
3. V2: Typed references to `Contract DataExtension`, `AssistExtension`, `EasiExtension`

**For Contract Data Mappings:**
1. Open `public/data/schema_unification2contract_data.json` (V1)
2. Open `public/data/schema_unification2contract_data-v2.json` (V2)
3. Compare: V2 has `$ref` and field-level mappings

---

## Web Viewers

### GraphQL Voyager

- **V1 (Core Model):** <http://localhost:3000/voyager-v1>
  - 17 types
  - Opaque system extensions (JSON)
  
- **V2 (API/Dashboard):** <http://localhost:3000/voyager-v2>
  - 30 types
  - Typed system extensions (13 additional types)
  - Contract Data: 5 types (Contract DataAssistanceType, Contract DataEligibility, etc.)
  - Legacy Procurement: 5 types (AssistAcquisitionData, AssistClientData, etc.)
  - EASi: 1 type (EasiSpecificData)

### Data Viewer

- Open: <http://localhost:3000/schema_unification-data-viewer>
- Load: `public/data/schema_unification-v2-example.json`
- Notice: `systemExtensions.contract_data` is structured object, not blob

### Schema Viewer

- Open: <http://localhost:3000/schema_unification-schema-viewer>
- Switch between V1 and V2 schemas
- Notice: V2 has `definitions` section with 21 types

---

## Key JSON Paths to Compare

### System Extensions Structure

**V1 Path:** `properties.systemExtensions.properties.contract_data`
```json
{
  "type": "object",
  "additionalProperties": true  // ❌ Anything goes
}
```

**V2 Path:** `definitions.Contract DataExtension`
```json
{
  "type": "object",
  "properties": {
    "contract_data": {
      "$ref": "#/definitions/Contract DataSpecificData"  // ✅ Typed
    }
  }
}
```

### Enums

**V1 Path:** `properties.systemMetadata.properties.primarySystem`
```json
{
  "type": "string",
  "enum": ["Contract Data", "Legacy Procurement", "Intake Process"]  // Inline enum
}
```

**V2 Path:** `definitions.SystemType`
```json
{
  "type": "string",
  "enum": ["Contract Data", "Legacy Procurement", "Intake Process"],  // Named enum definition
  "x-graphql-enum": true
}
```

### Contacts

**V1 Path:** `properties.contacts.items`
```json
{
  "type": "object",
  "properties": {
    "role": {
      "type": "string",
      "enum": ["CONTRACTING_OFFICER", ...]  // Inline
    }
  }
}
```

**V2 Path:** `definitions.Contact`
```json
{
  "type": "object",
  "properties": {
    "role": {
      "$ref": "#/definitions/ContactRole"  // Reference to enum
    }
  }
}
```

---

## GraphQL Type Comparison

### Contract DataExtension

**V1 GraphQL:**
```graphql
type Contract DataExtension {
  contract_data: JSON  # ❌ Opaque
}
```

**V2 GraphQL:**
```graphql
type Contract DataExtension {
  contract_data: Contract DataSpecificData  # ✅ Typed
}

type Contract DataSpecificData {
  legacy_procurementanceType: Contract DataAssistanceType
  applicantBeneficiary: Contract DataApplicantBeneficiaryType
  eligibility: Contract DataEligibility
  usage: Contract DataUsage
}

type Contract DataAssistanceType {
  code: String
  description: String
  isFinancialAssistance: Boolean
}
```

### Query Differences

**V1 GraphQL:**
```graphql
type Query {
  contracts: String  # ❌ Return type not properly typed
  contractByPiid: Contract
}
```

**V2 GraphQL:**
```graphql
type Query {
  contracts: String  # Still needs improvement
  contractByPiid: Contract
  searchContracts: String  # ✅ Additional query
}
```

---

## File Size Reference

| File | V1 Size | V2 Size | % Increase |
|------|---------|---------|------------|
| Schema | 25 KB | 35 KB | +40% |
| Contract Data Mapping | 5 KB | 8 KB | +60% |
| Legacy Procurement Mapping | 4 KB | 7 KB | +75% |
| EASi Mapping | 3 KB | 9 KB | +200% |
| GraphQL SDL | 7 KB (295 lines) | 13 KB (537 lines) | +82% |

**Why V2 is Larger:**
- Explicit type definitions (21 definitions)
- Detailed system extension structures
- More comprehensive documentation
- $ref usage adds clarity but increases size

**Trade-off:** Size vs Functionality
- V2 enables queryable system-specific data
- Essential for production API/dashboard
- Gzip compression reduces difference significantly

---

## Grep Patterns for Quick Comparison

### Find all definitions in V2
```bash
jq '.definitions | keys' src/data/schema_unification.schema.v2-generated.json
```

### Compare system extensions
```bash
# V1 (should show generic object)
jq '.properties.systemExtensions.properties.contract_data' src/data/schema_unification.schema.json

# V2 (should show $ref)
jq '.definitions.Contract DataExtension' src/data/schema_unification.schema.v2-generated.json
```

### Count $ref usage
```bash
# V1 (should be 0 or minimal)
grep -o '\$ref' src/data/schema_unification.schema.json | wc -l

# V2 (should be 50+)
grep -o '\$ref' src/data/schema_unification.schema.v2-generated.json | wc -l
```

### Compare mapping structures
```bash
# Contract Data V1
jq '.mappings.systemExtensions' public/data/schema_unification2contract_data.json

# Contract Data V2
jq '.mappings."systemExtensions.contract_data"' public/data/schema_unification2contract_data-v2.json
```

---

## Testing Checklist

### Visual Inspection
- [ ] Open both schemas in VS Code split view
- [ ] Navigate to `systemExtensions` in both
- [ ] Compare V1 (inline objects) vs V2 (definitions with $ref)
- [ ] Check V2 `definitions` section for 21 types

### Viewer Testing
- [ ] Open Voyager V1 - verify 17 types, JSON blobs for extensions
- [ ] Open Voyager V2 - verify 30 types, typed extensions
- [ ] Open Data Viewer - load V2 example, verify structured extensions
- [ ] Open Schema Viewer - switch between V1 and V2

### Mapping Verification
- [ ] Open Contract Data V1 and V2 mappings side-by-side
- [ ] Verify V2 has field-level mappings for legacy_procurementanceType, eligibility, usage
- [ ] Open Legacy Procurement V1 and V2 mappings
- [ ] Verify V2 has CFDA structure
- [ ] Open EASi V1 and V2 mappings
- [ ] Verify V2 has IT governance fields (GRB, LCID)

### Documentation Review
- [ ] Read `docs/V1-VS-V2-SCHEMA-COMPARISON.md`
- [ ] Understand key differences
- [ ] Review use case impact analysis
- [ ] Check migration path recommendations

---

## Next Steps

1. **Start Dev Server:**
   ```bash
   pnpm dev
   ```

2. **Open Voyager Pages:**
   - V1: <http://localhost:3000/voyager-v1>
   - V2: <http://localhost:3000/voyager-v2>

3. **Compare Visually:**
   - Click through types in both versions
   - Notice V2 has Contract Data/Legacy Procurement/EASi breakdown
   - V1 shows JSON scalars for extensions

4. **Load Data Viewer:**
   - Open: <http://localhost:3000/schema_unification-data-viewer>
   - Load: `public/data/schema_unification-v2-example.json`
   - Inspect system extensions structure

5. **Read Documentation:**
   - Start with: `docs/V1-VS-V2-SCHEMA-COMPARISON.md`
   - Then: `docs/GRAPHQL-SCHEMA-ANALYSIS-AND-STRATEGY.md`
   - Reference: This quick guide

---

## Summary

**V1 = Simple for Humans**
- Nested structure
- Easy to read
- Quick to edit
- Limited GraphQL functionality

**V2 = Powerful for APIs**
- Definitions-based structure
- Type reuse
- Queryable system extensions
- Production-ready GraphQL

**Recommendation: Use Both**
- V1 as source of truth for humans
- V2 auto-generated for tooling
- Best of both worlds

---

**Last Updated:** October 6, 2025  
**Files Generated:** 4 new V2 files + 2 documentation files  
**Ready for Visualization:** Yes ✅
