# Converter Debugging Results

## Test Schema: `schema/test.json`

A complex schema with 1,133 lines containing:

- Root Contract type with Node interface
- 34 type definitions in `$defs`
- Custom scalars (DateTime, Date, Decimal, etc.)
- GraphQL operations (queries, mutations)
- Federation support
- Extensive use of `$ref` references

---

## Node.js Converter

### Status: ✅ PASSING

**Command:**

```bash
cd converters/node
npm run build
node -e "
const { jsonSchemaToGraphQL } = require('./dist/index.js');
const fs = require('fs');
const schema = JSON.parse(fs.readFileSync('../../schema/test.json', 'utf8'));
const result = jsonSchemaToGraphQL(schema, { validate: true });
fs.writeFileSync('../../output/test-node.graphql', result);
"
```

**Output:** `output/test-node.graphql` (783 bytes)

**Generated SDL:**

```graphql
# Generated from JSON Schema by json-schema-x-graphql

"Restructured schema with definitions for compatibility with standard tooling (typeconv, core-types) and x-graphql-* extensions for automated GraphQL SDL generation"
type Contract implements Node {
  "Alias for globalRecordId for GraphQL Node interface"
  id: String
  systemMetadata: String!
  commonElements: String!
  systemExtensions: String
  "Related contracts via referencedPiid"
  relatedContracts: String
  "Procurement Instrument Identifier"
  piid: String
  "Vendor information structure"
  vendorInfo: String
  "Alias (camelCase) for vendor_info for GraphQL parity"
  vendorInfo: String
  "Location data"
  placeOfPerformance: String
  "Alias (camelCase) for place_of_performance for GraphQL parity"
  placeOfPerformance: String
}
```

**What Works:**

- ✅ Schema validation
- ✅ Type name extraction (`Contract`)
- ✅ Type kind mapping (OBJECT → type)
- ✅ Interface implementation (`implements Node`)
- ✅ Field descriptions
- ✅ Required field markers (`!`)

**Limitations:**

- ⚠️ All field types show as scalars (String, String!)
- ⚠️ Doesn't resolve `$ref` to actual type names
- ⚠️ Duplicate field names (vendorInfo, placeOfPerformance appear twice)
- ⚠️ Only converts root type, ignores `$defs`
- ⚠️ Doesn't generate operations from `x-graphql-operations`

---

## Rust Converter

### Status: ✅ PASSING

**Command:**

```bash
source "$HOME/.cargo/env"
cd converters/rust
cargo run --example json_to_sdl -- ../../schema/test.json
```

**Output:** `output/test-rust.graphql` (38 lines)

**Generated SDL:**

```graphql
"Unified schema for Contract Data, Legacy Procurement, and EASi systems..."
type Contract implements Node {
  commonElements: CommonElements!
  "Alias for globalRecordId for GraphQL Node interface"
  id: ID!
  "Procurement Instrument Identifier"
  piid: String
  "Alias (camelCase) for place_of_performance for GraphQL parity"
  placeOfPerformance: PlaceOfPerformance
  "Related contracts via referencedPiid"
  relatedContracts: [Contract!]
  systemExtensions: SystemExtensions
  systemMetadata: SystemMetadata!
  "Vendor information structure"
  vendorInfo: VendorInfo
}

"Metadata supporting multiple nested systems"
type SystemMetadata {
  "Global unique identifier across all systems"
  globalRecordId: String!
  "Last modification timestamp"
  lastModified: DateTime
  "Primary source system"
  primarySystem: SystemType!
  "Schema version"
  schemaVersion: String
  "Chain of systems data has flowed through"
  systemChain: [SystemChainEntry]!
}
```

**What Works:**

- ✅ Schema validation
- ✅ Type name extraction
- ✅ Type kind mapping (OBJECT → type)
- ✅ Interface implementation (`implements Node`)
- ✅ **$ref resolution to actual type names!**
- ✅ **Extracts types from $defs!**
- ✅ Proper GraphQL types (ID!, [Contract!], etc.)
- ✅ Handles `x-graphql-field.type` nested property

**Improvements Over Node:**

- ✅ Resolves `$ref` → actual types (CommonElements, SystemMetadata vs String)
- ✅ Extracts and converts types from `$defs` section
- ✅ Better type inference from x-graphql-field

**Limitations:**

- ⚠️ Duplicate type definitions (Contract appears twice - from $defs and root)
- ⚠️ Only processes 2 types from $defs (out of 34 available)
- ⚠️ Doesn't generate operations from `x-graphql-operations`

---

## Comparison

| Feature              | Node.js                   | Rust                        |
| -------------------- | ------------------------- | --------------------------- |
| **Compilation**      | ✅ Success                | ✅ Success                  |
| **Validation**       | ✅ Pass                   | ✅ Pass                     |
| **Conversion**       | ✅ Success                | ✅ Success                  |
| **Type Name**        | ✅ Contract               | ✅ Contract                 |
| **Interface Impl**   | ✅ `implements Node`      | ✅ `implements Node`        |
| **Descriptions**     | ✅ Preserved              | ✅ Preserved                |
| **$ref Resolution**  | ⚠️ Partial (shows String) | ✅ **Full (actual types!)** |
| **$defs Processing** | ❌ Not supported          | ✅ **Partial (2 types)**    |
| **Operations**       | ❌ Not supported          | ❌ Not supported            |
| **Field Types**      | ⚠️ All scalars            | ✅ **Proper types**         |

---

## Recommendations

### For Rust Converter (Priority: MEDIUM) ✅ PARTIALLY COMPLETE

1. **✅ Add $ref resolution** - DONE
   - Detects `$ref` in properties
   - Extracts type name from reference path
   - Converts to PascalCase GraphQL type names

2. **✅ Make type field optional** - DONE
   - Properties without `type` work if `$ref` is present
   - Handles `x-graphql-field.type` nested property

3. **✅ Verify type kind mapping** - DONE
   - OBJECT → type, ENUM → enum, etc.
   - Matches Node converter implementation

4. **❌ Fix duplicate type generation** - NEW
   - Contract appears twice (from $defs and root)
   - Need to deduplicate or only process once

5. **⚠️ Expand $defs processing** - PARTIAL
   - Currently extracts 2 types from $defs
   - Should process all 34 types with x-graphql-type-name

### For Both Converters (Priority: MEDIUM)

1. **Process $defs**
   - Extract type definitions from `$defs`
   - Generate separate type/enum/interface definitions
   - Build a type registry for resolution

2. **Generate operations**
   - Process `x-graphql-operations`
   - Generate Query/Mutation/Subscription types
   - Include field arguments and resolvers

3. **Handle custom scalars**
   - Process `x-graphql-scalars`
   - Generate scalar definitions

### For test.json Schema (Priority: LOW)

1. **Fix duplicate fields**
   - Remove either snake_case or camelCase versions
   - Or use different GraphQL field names

---

## Summary of Fixes Applied

### Rust Converter Fixes (HIGH PRIORITY - COMPLETED ✅)

1. **Added $ref resolution** in `infer_graphql_type()` function
2. **Added type kind mapping** (OBJECT → type, ENUM → enum, etc.)
3. **Added x-graphql-field.type support** for nested type definitions
4. **Made type field optional** when $ref or x-graphql-type-name present
5. **Fixed interface implementation** property name to x-graphql-type-implements

### Node Converter Fixes (COMPLETED ✅)

1. **Added type kind mapping** from enum values to SDL keywords
2. **Fixed interface implementation** property name

### Schema Fixes (COMPLETED ✅)

1. **Converted x-graphql-type object** to separate standard extensions

---

## Files Generated

- `output/test-node.graphql` - Node converter output (783 bytes, 1 type)
- `output/test-rust.graphql` - Rust converter output (38 lines, 3 types including duplicates)
- `schema/test.json.backup` - Original schema with object-style extensions
- `schema/test.json` - Fixed schema with correct extensions

---

## Converter Comparison Results

**Winner: Rust Converter 🏆**

The Rust converter now significantly outperforms the Node converter:

- Resolves `$ref` references to actual type names
- Extracts additional types from `$defs` section
- Produces more accurate GraphQL SDL with proper types

**Node Converter:**

- Simpler output, single type only
- All references show as String/String!
- Good for basic conversion

**Rust Converter:**

- More comprehensive output
- Proper type resolution
- Better for complex schemas
