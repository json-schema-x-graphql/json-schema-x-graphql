# GraphQL Voyager Pages

## Overview

The website now displays two GraphQL Voyager pages that visualize the Schema Unification Forest schemas as interactive graphs:

1. **Voyager V1 Auto-Generated** (`/voyager-v1`) - 17 core contract types
2. **Voyager V2 Hand-Crafted** (`/voyager-v2`) - 30 types with detailed extensions

## Pages Created

### 1. Voyager V1 Auto-Generated (`/voyager-v1`)

**File:** `src/pages/voyager-v1.tsx`  
**Data Source:** `public/data/schema_unification-v1.graphql` (from `generated-schemas/schema_unification.v2-generated-custom.graphql`)

**Features:**

- Visualizes the auto-generated V2 schema from V1 nested structure
- 17 core contract types extracted automatically
- 295 lines of GraphQL SDL
- Purple gradient header
- Navigation to V2 page

**Types Included:**

- Core: Contract, SystemMetadata, ContractIdentification, VendorInfo, AgencyInfo, etc.
- Enums: SystemType, ContactRole, ContractStatus
- Scalars: DateTime, Date, Decimal, JSON, Email, URI
- Consolidated system extensions (Contract Data, Legacy Procurement, EASi)

### 2. Voyager V2 Hand-Crafted (`/voyager-v2`)

**File:** `src/pages/voyager-v2.tsx`  
**Data Source:** `public/data/schema_unification-v2.graphql` (from `generated-schemas/schema_unification.v2-custom.graphql`)

**Features:**

- Visualizes the hand-crafted V2 schema with detailed breakdowns
- 30 types with granular system-specific extensions
- 537 lines of GraphQL SDL
- Pink gradient header
- Navigation to V1 page

**Types Included:**

- All core types from V1 (17 types)
- Plus 13 additional specialized types:
  - **Contract Data Types:** Contract DataContractData, Contract DataVendorInfo, Contract DataFinancialInfo, Contract DataPerformanceInfo, Contract DataCompetitionInfo
  - **Legacy Procurement Types:** AssistAwardData, AssistRecipientInfo, AssistFundingInfo
  - **EASi Types:** EasiProjectInfo, EasiRequirementInfo, EasiApprovalInfo, EasiGovernanceInfo, EasiBusinessCaseInfo

## Navigation Updates

### Navbar Changes

**File:** `src/layout/PageLayout/Navbar.tsx`

Added two new menu items under the "Tools" dropdown:

1. **GraphQL Voyager - V1 Auto-Generated**
   - Description: "17 core contract types auto-generated from V1 schema."
   - Link: `/voyager-v1`

2. **GraphQL Voyager - V2 Hand-Crafted**
   - Description: "30 types with detailed Contract Data/Legacy Procurement/EASi extensions."
   - Link: `/voyager-v2`

## Usage

### Development

Start the development server:

```bash
pnpm dev
```

Access the pages:

- V1 Auto-Generated: http://localhost:3000/voyager-v1
- V2 Hand-Crafted: http://localhost:3000/voyager-v2

### Navigation Paths

1. **From Homepage:**
   - Click "Tools" in the main navigation
   - Select "GraphQL Voyager - V1 Auto-Generated" or "GraphQL Voyager - V2 Hand-Crafted"

2. **Between Voyager Pages:**
   - Use the navigation buttons in the header of each page
   - V1 page: "View V2 Hand-Crafted (30 Types) →"
   - V2 page: "← View V1 Auto-Generated (17 Types)"

## Technical Details

### GraphQL Voyager Integration

Both pages use:

- **Library:** GraphQL Voyager via CDN (`graphql-voyager@^2.0.0`)
- **CSS:** `https://cdn.jsdelivr.net/npm/graphql-voyager/dist/voyager.css`
- **JS:** `https://cdn.jsdelivr.net/npm/graphql-voyager/dist/voyager.standalone.js`

### Schema Loading Process

1. Fetch GraphQL SDL from `/data/schema_unification-v1.graphql` or `/data/schema_unification-v2.graphql`
2. Build GraphQL schema using `graphql-js` `buildSchema()`
3. Generate introspection query using `getIntrospectionQuery()`
4. Execute introspection query against schema
5. Pass introspection result to GraphQL Voyager
6. Render interactive graph visualization

### Display Options

Both pages use the same Voyager configuration:

```typescript
{
  introspection: introspectionResult,
  displayOptions: {
    sortByAlphabet: true,
    showLeafFields: true,
  },
}
```

## Comparison: V1 vs V2

| Feature               | V1 Auto-Generated             | V2 Hand-Crafted                 |
| --------------------- | ----------------------------- | ------------------------------- |
| **Object Types**      | 17                            | 30                              |
| **Enums**             | 3                             | 3                               |
| **Scalars**           | 6                             | 6                               |
| **Lines of GraphQL**  | 295                           | 537                             |
| **Source Schema**     | V2 Generated                  | V2 Hand-Crafted                 |
| **System Extensions** | Consolidated                  | Granular (13 specialized types) |
| **Best For**          | Understanding core data model | Detailed API implementation     |
| **Header Color**      | Purple gradient               | Pink gradient                   |

### Shared Types

Both schemas include:

- ✅ Core contract types (Contract, SystemMetadata, VendorInfo, AgencyInfo, OrganizationInfo, PlaceOfPerformance, FinancialInfo, BusinessClassification, ContractCharacteristics, Contact, StatusInfo)
- ✅ Same enums (SystemType, ContactRole, ContractStatus)
- ✅ Same custom scalars (DateTime, Date, Decimal, JSON, Email, URI)
- ✅ Same Query/Mutation operations

### Differences

**V2 Hand-Crafted Additional Types:**

- **Contract Data System (5 types):** Contract DataContractData, Contract DataVendorInfo, Contract DataFinancialInfo, Contract DataPerformanceInfo, Contract DataCompetitionInfo
- **Legacy Procurement System (3 types):** AssistAwardData, AssistRecipientInfo, AssistFundingInfo
- **EASi System (5 types):** EasiProjectInfo, EasiRequirementInfo, EasiApprovalInfo, EasiGovernanceInfo, EasiBusinessCaseInfo

These additional types provide granular breakdowns of system-specific data that V1 consolidates into `Contract DataExtension`, `AssistExtension`, and `EasiExtension`.

## Benefits

### For Developers

- **Interactive Visualization:** Explore schema relationships visually
- **Type Discovery:** Quickly understand available types and their connections
- **Documentation:** Self-documenting schema structure
- **Comparison:** Easy comparison between core and detailed schemas

### For Stakeholders

- **Visual Understanding:** Non-technical stakeholders can see data structure
- **System Integration:** Understand how Contract Data, Legacy Procurement, and EASi data is modeled
- **API Planning:** Plan API implementations based on schema structure

### For Contributors

- **Schema Exploration:** Understand existing schema before making changes
- **Type Relationships:** See how types connect and depend on each other
- **Validation:** Verify schema changes visually

## Future Enhancements

### Potential Improvements

1. **Schema Diff View:** Visual comparison showing differences between V1 and V2
2. **Interactive Filtering:** Filter by system (Contract Data, Legacy Procurement, EASi)
3. **Export Options:** Export visualizations as SVG/PNG
4. **Documentation Links:** Link types to detailed documentation
5. **Historical Versions:** View previous schema versions
6. **Custom Queries:** Interactive query builder based on schema
7. **Resolver Status:** Show which types have resolvers implemented
8. **Breaking Changes:** Highlight breaking changes between versions

## Files Created/Updated

### New Files

- `src/pages/voyager-v1.tsx` - V1 auto-generated voyager page
- `src/pages/voyager-v2.tsx` - V2 hand-crafted voyager page
- `public/data/schema_unification-v1.graphql` - V1 GraphQL SDL (295 lines)
- `public/data/schema_unification-v2.graphql` - V2 GraphQL SDL (537 lines)
- `docs/GRAPHQL-VOYAGER-PAGES.md` - This documentation

### Updated Files

- `src/layout/PageLayout/Navbar.tsx` - Added menu items for both voyager pages

## Related Documentation

- [Schema Comparison](./SCHEMA-COMPARISON-AND-NEXT-STEPS.md) - Detailed analysis of V1 vs V2 schemas
- [V1 to V2 Converter Results](./V1-TO-V2-CONVERTER-RESULTS.md) - Converter test results
- [ADR 0002](./adr/0002-schema-tooling-automation.md) - Schema tooling automation decisions
- [Benchmark Setup](./BENCHMARK-SETUP-COMPLETE.md) - Benchmark documentation

## Support

For issues or questions:

1. Check error messages in browser console
2. Verify GraphQL files are in `public/data/` directory
3. Ensure GraphQL Voyager CDN is accessible
4. Check that GraphQL SDL is valid (no syntax errors)

---

**Last Updated:** October 6, 2025  
**Status:** ✅ Complete and Operational
