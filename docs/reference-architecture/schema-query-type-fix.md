# Schema Query Type Fix

## Problem

Mock GraphQL services were failing to start because some subgraph schemas (particularly Logistics Mgmt) didn't have Query types. GraphQL servers require a Query type to be valid, even for library-only subgraphs that only define shared types.

## Root Cause

The schema generation process (`scripts/generate-subgraph-sdl.mjs`) only generates Query types when the source JSON schema contains an `x-graphql-operations.queries` section. Some schemas were missing this:

1. **Logistics Mgmt** (`src/data/logistics_mgmt.schema.json`) - Had no `x-graphql-operations` at all (library-only subgraph)
2. **Contract Data** (`src/data/contract_data.schema.json`) - Used `"query"` (singular) instead of `"queries"` (plural)
3. **Public Spending** (`src/data/public_spending.schema.json`) - Used `"query"` (singular) instead of `"queries"` (plural)

## Solution

### 1. Fixed JSON Schemas (Upstream)

#### Logistics Mgmt Schema
Added minimal `x-graphql-operations` with `_service` query (Federation metadata):

```json
"x-graphql-operations": {
  "queries": {
    "_service": {
      "type": "_Service!",
      "description": "Federation service metadata"
    }
  }
}
```

#### Contract Data & Public Spending Schemas
Changed `"query"` to `"queries"` to match what the generator expects:

```json
"x-graphql-operations": {
  "queries": {  // Was "query"
    ...
  }
}
```

### 2. Updated Package Scripts

Added Public Spending to the subgraph generation pipeline:

```json
"generate:subgraph:public_spending": "node scripts/generate-subgraph-sdl.mjs src/data/public_spending.schema.json",
"generate:subgraphs": "... && pnpm run generate:subgraph:public_spending"
```

### 3. Cleaned Up Mock Server

Removed workarounds from `dev/pocs/mockforge/mock-server.js`:
- Removed Query type detection logic
- Removed conditional `_service` resolver injection
- Simplified to always include `_service` resolver for Federation

## Files Changed

### JSON Schemas (Source of Truth)
- ✅ `src/data/logistics_mgmt.schema.json` - Added `x-graphql-operations.queries`
- ✅ `src/data/contract_data.schema.json` - Fixed `"query"` → `"queries"`
- ✅ `src/data/public_spending.schema.json` - Fixed `"query"` → `"queries"`

### Scripts & Configuration
- ✅ `package.json` - Added Public Spending to generation pipeline
- ✅ `dev/pocs/mockforge/mock-server.js` - Removed Query type workarounds

### Generated Files (To Be Regenerated)
- ⏳ `generated-schemas/logistics_mgmt.subgraph.graphql` - Will now include Query type
- ⏳ `generated-schemas/contract_data.subgraph.graphql` - Will regenerate with correct structure
- ⏳ `generated-schemas/public_spending.subgraph.graphql` - Will regenerate with correct structure
- ⏳ `generated-schemas/legacy_procurement.subgraph.graphql` - Already correct, will regenerate for consistency
- ⏳ `generated-schemas/intake_process.subgraph.graphql` - Already correct, will regenerate for consistency

## Next Steps

### 1. Regenerate All Subgraph Schemas

```bash
pnpm run generate:subgraphs
```

This will regenerate all 5 subgraph files from the updated JSON schemas:
- legacy_procurement.subgraph.graphql
- intake_process.subgraph.graphql
- logistics_mgmt.subgraph.graphql ✨ **Now with Query type**
- contract_data.subgraph.graphql ✨ **Fixed structure**
- public_spending.subgraph.graphql ✨ **Fixed structure**

### 2. Regenerate Supergraph

```bash
pnpm run generate:supergraph
```

This will compose all 5 subgraphs into the federated supergraph.

### 3. Rebuild MockForge Services

```bash
cd dev/pocs/mockforge
./rebuild.sh
```

This will rebuild all Docker images with the new schemas.

### 4. Test Services

```bash
cd dev/pocs/mockforge
./test-queries.sh
```

All services should now start successfully and respond to queries.

## Architecture

### Schema Generation Flow

```
JSON Schema (src/data/*.schema.json)
  ↓ [generate-subgraph-sdl.mjs]
  ↓ Reads: x-graphql-operations.queries
  ↓ Generates: type Query { ... }
  ↓
Subgraph SDL (generated-schemas/*.subgraph.graphql)
  ↓ [generate-supergraph.mjs]
  ↓ Composes all subgraphs
  ↓
Supergraph SDL (generated-schemas/schema_unification.supergraph.graphql)
  ↓ [mock-server.js]
  ↓ Loads individual subgraph
  ↓ Adds Federation directives
  ↓
Mock Service (Docker container on port 400X)
```

### Key Insight

**Fix schemas at the source (JSON) rather than patching at runtime (middleware).**

This ensures:
- Generated schemas are always valid
- No runtime workarounds needed
- Consistent behavior across all tools
- Easier to maintain and reason about

## Validation

After regeneration, all subgraph files should:
1. ✅ Have `type Query` with at least one field
2. ✅ Include Federation directives (`extend schema @link...`)
3. ✅ Be parseable by GraphQL parsers without errors
4. ✅ Load successfully in mock-server.js
5. ✅ Respond to introspection queries

## References

- **Schema Generator**: `scripts/generate-subgraph-sdl.mjs`
- **JSON Schema Spec**: Uses `x-graphql-operations.queries` for Query type generation
- **Federation Spec**: Requires all subgraphs to be valid GraphQL schemas (with Query type)
- **Library-Only Subgraphs**: Still need Query type with at minimum `_service` field
