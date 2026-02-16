# X-GraphQL Attribute Registry & Developer Guide

**Last Updated**: December 18, 2025  
**Version**: 2.0 (Post Phase-6 Consolidation)  
**Status**: Stable  
**Purpose**: Complete reference for all `x-graphql-*` attributes used across the petrified-forest codebase

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Attribute Categories](#attribute-categories)
3. [Detailed Attribute Documentation](#detailed-attribute-documentation)
4. [Converters & Transformations](#converters--transformations)
5. [Usage Patterns](#usage-patterns)
6. [Linting & Validation](#linting--validation)
7. [Best Practices](#best-practices)

---

## Quick Reference

### All X-GraphQL Attributes (50+)

| Category | Attributes | Count |
|----------|-----------|-------|
| **Federation** | federation, federation-keys, federation-shareable, federation-authenticated, federation-inaccessible, federation-interface-object | 6 |
| **Type Definition** | type, type-name, type-kind, type-directives, implements, union, union-types | 7 |
| **Field Definition** | field, field-type, field-name, field-directives, field-non-null, required, nullable, skip | 8 |
| **Scalars** | scalar, scalar-type, scalar-references, shared-scalars | 4 |
| **Directives** | directives, directives-catalog, arg-directives | 3 |
| **Operations** | operations, pagination, args | 3 |
| **Enums** | enum, enums | 2 |
| **Schema** | schema-reference, system | 2 |
| **Data Source Mapping** | source-reference, source-mapping-type, mapping-notes | 3 |
| **Performance** | performance, phase3-performance, complexity, query-cost | 4 |
| **Security & Auth** | authorization, security, sensitive-data | 3 |
| **Caching & Observability** | caching, observability, rate-limiting | 3 |
| **Cost Model** | cost-model | 1 |
| **Error Handling** | error-codes | 1 |
| **Query Templates** | query-templates | 1 |
| **Other** | description | 1 |

**Total Unique Attributes**: 52

---

## Attribute Categories

### 1. Federation Attributes (6)

**Purpose**: Mark types and fields for Apollo Federation composition

#### `x-graphql-federation-shareable`
- **Type**: Boolean
- **Scope**: Type or Field
- **Usage**: Marks a type/field as shareable across multiple subgraphs
- **Generator**: Phase 4 (Type Standardization)
- **Converter Expectation**: Present on shared types (SharedVendor, SharedAddress)
- **Example**:
  ```json
  {
    "x-graphql-federation-shareable": true
  }
  ```
- **Locations**: 13 uses
  - petrified-supergraph.schema.json (shared type definitions)
  - usaspending.schema.json (Vendor, Address fields marked as shareable)
  - easi.schema.json (vendor fields marked as shareable)

#### `x-graphql-federation-keys`
- **Type**: Array of strings
- **Scope**: Type
- **Usage**: Defines the federation key fields for entity resolution
- **Example**:
  ```json
  {
    "x-graphql-federation-keys": ["id", "piid"]
  }
  ```
- **Locations**: Used in multiple types to define composite keys

#### `x-graphql-federation`
- **Type**: Boolean
- **Scope**: Type or Scalar
- **Usage**: Marks type/scalar as participating in federation
- **Example**:
  ```json
  {
    "x-graphql-federation": true
  }
  ```

#### `x-graphql-federation-authenticated`, `x-graphql-federation-inaccessible`, `x-graphql-federation-interface-object`
- **Type**: Boolean
- **Scope**: Type/Field
- **Usage**: Advanced federation directives for access control and interface handling
- **Status**: Reserved for Phase 7+ (Advanced Federation)

---

### 2. Type Definition Attributes (7)

**Purpose**: Define and describe GraphQL types in JSON Schema

#### `x-graphql-type-name`
- **Type**: String
- **Scope**: Object type
- **Usage**: Maps JSON Schema object to specific GraphQL type name (e.g., "FpdsVendor" instead of generic "Vendor")
- **Generator**: Schema author or converter
- **Converter Expectation**: Required for camelCase GraphQL SDL generation
- **Example**:
  ```json
  {
    "Vendor": {
      "type": "object",
      "x-graphql-type-name": "FpdsVendor"
    }
  }
  ```
- **Locations**: 64 uses across all schemas

#### `x-graphql-type-kind`
- **Type**: Enum ("OBJECT", "INTERFACE", "UNION", "SCALAR", "ENUM")
- **Scope**: Type
- **Usage**: Explicitly declares GraphQL type kind (usually inferred, but explicit here)
- **Example**:
  ```json
  {
    "x-graphql-type-kind": "OBJECT"
  }
  ```

#### `x-graphql-implements`
- **Type**: Array of strings
- **Scope**: Type
- **Usage**: Declares that this type implements GraphQL interfaces
- **Example**:
  ```json
  {
    "x-graphql-implements": ["Node", "Auditable"]
  }
  ```

#### `x-graphql-union`
- **Type**: Boolean
- **Scope**: Type
- **Usage**: Marks type as union type in GraphQL

#### `x-graphql-union-types`
- **Type**: Array of strings
- **Scope**: Union type
- **Usage**: Lists member types of the union
- **Example**:
  ```json
  {
    "x-graphql-union-types": ["FpdsVendor", "EasiVendor"]
  }
  ```

#### `x-graphql-type-directives`
- **Type**: Array of directive strings
- **Scope**: Type
- **Usage**: GraphQL directives to apply to the type definition
- **Example**:
  ```json
  {
    "x-graphql-type-directives": ["@shareable", "@cacheControl(maxAge: 3600)"]
  }
  ```

---

### 3. Field Definition Attributes (8)

**Purpose**: Define and describe GraphQL field properties

#### `x-graphql-field-type`
- **Type**: String (GraphQL type reference)
- **Scope**: Field property
- **Usage**: Specifies the GraphQL field type (e.g., "DateTime", "String", "Int")
- **Generator**: Phase 4 (Standardization)
- **Converter Expectation**: Used to override or clarify JSON Schema field type
- **Locations**: 20 uses
- **Example**:
  ```json
  {
    "created_at": {
      "type": "string",
      "x-graphql-field-type": "DateTime"
    }
  }
  ```

#### `x-graphql-field-name`
- **Type**: String
- **Scope**: Field property in source schemas (usaspending, etc.)
- **Usage**: Maps source field name to GraphQL field name (e.g., "awardingSubTierAgencyCode")
- **Purpose**: Used for name transformation during GraphQL generation
- **Locations**: 49 uses (primarily usaspending.schema.json)
- **Important**: This is **distinct from** `x-graphql-field` - it's a simple string name reference
- **Example**:
  ```json
  {
    "awarding_sub_tier_code": {
      "x-graphql-field-name": "awardingSubTierAgencyCode"
    }
  }
  ```
- **Phase 8B Analysis**: ✅ Kept separate (not consolidated with x-graphql-field)
  - Serves different purpose (name mapping vs. full field definition)
  - Cannot be consolidated without breaking functionality

#### `x-graphql-field-non-null`
- **Type**: Boolean
- **Scope**: Field property
- **Usage**: Makes field non-nullable (required) in GraphQL
- **Example**:
  ```json
  {
    "id": {
      "type": "integer",
      "x-graphql-field-non-null": true
    }
  }
  ```

#### `x-graphql-required`
- **Type**: Boolean or Array
- **Scope**: Field/Type
- **Usage**: Alternative specification of required fields
- **Alternate Name For**: `x-graphql-field-non-null`

#### `x-graphql-nullable`
- **Type**: Boolean
- **Scope**: Field property
- **Usage**: Explicitly marks field as nullable
- **Example**:
  ```json
  {
    "optional_field": {
      "x-graphql-nullable": true
    }
  }
  ```

#### `x-graphql-field`
- **Type**: Object (complex definition structure)
- **Scope**: Field property in managed schemas (petrified.schema.json)
- **Usage**: Container for complete field-level metadata and schema definition
- **Purpose**: Defines full GraphQL field with type, description, resolver, and args
- **Locations**: 111 uses (primarily petrified.schema.json - generated/managed)
- **Important**: This is **distinct from** `x-graphql-field-name` - it's a complex object structure
- **Example**:
  ```json
  {
    "id": {
      "x-graphql-field": {
        "type": "ID!",
        "description": "Global unique identifier",
        "resolver": "Contract.id"
      }
    }
  }
  ```
- **Phase 8B Analysis**: ✅ Kept separate (not consolidated with x-graphql-field-name)
  - Serves different purpose (full definition vs. name mapping)
  - Cannot be consolidated without breaking functionality
  - Used in different schema contexts (managed vs. user-defined)

#### `x-graphql-field-directives`
- **Type**: Array of directive strings
- **Scope**: Field property
- **Usage**: GraphQL directives to apply to field
- **Example**:
  ```json
  {
    "email": {
      "x-graphql-field-directives": ["@mask(maskLevel: \"HIGH\")"]
    }
  }
  ```

#### `x-graphql-skip`
- **Type**: Boolean
- **Scope**: Field property
- **Usage**: Skip this field in SDL generation

---

### 4. Scalar Attributes (4)

**Purpose**: Define and reference GraphQL scalar types

#### `x-graphql-scalar-type`
- **Type**: String
- **Scope**: Scalar definition
- **Usage**: Specifies the GraphQL scalar type
- **Example**:
  ```json
  {
    "email_address": {
      "type": "string",
      "format": "email",
      "x-graphql-scalar-type": "Email"
    }
  }
  ```

#### `x-graphql-scalar-references`
- **Type**: Object with `shared` and `local` arrays
- **Scope**: Schema root
- **Usage**: Declares which shared scalars from petrified-supergraph are available
- **Location**: Schema root level
- **Example**:
  ```json
  {
    "x-graphql-scalar-references": {
      "description": "Scalars inherited from petrified-supergraph.schema.json",
      "shared": ["Date", "DateTime", "Email", "URI", "UEI", "PIID"],
      "local": []
    }
  }
  ```

#### `x-graphql-scalar`
- **Type**: Object
- **Scope**: Scalar definition
- **Usage**: Container for scalar metadata

#### `x-graphql-shared-scalars`
- **Type**: Object (scalar definitions)
- **Scope**: Schema root (petrified-supergraph.schema.json only)
- **Usage**: Defines all shared scalars available to all subgraphs
- **Example**:
  ```json
  {
    "x-graphql-shared-scalars": {
      "Date": { "type": "string", "format": "date" },
      "DateTime": { "type": "string", "format": "date-time" },
      "Email": { "type": "string", "format": "email" }
    }
  }
  ```

---

### 5. Directive Attributes (3)

**Purpose**: Declare and configure GraphQL directives

#### `x-graphql-directives`
- **Type**: Array of directive definitions
- **Scope**: Schema root or type/field
- **Usage**: Declares GraphQL directives available in schema
- **Example**:
  ```json
  {
    "x-graphql-directives": [
      {
        "name": "@authorize",
        "locations": ["OBJECT", "FIELD_DEFINITION"],
        "args": ["roles"]
      }
    ]
  }
  ```

#### `x-graphql-directives-catalog`
- **Type**: Object (directive reference map)
- **Scope**: Schema root
- **Usage**: Maps directive names to their usage descriptions
- **Example**:
  ```json
  {
    "x-graphql-directives-catalog": {
      "authorize_contracting_officer": "@authorize(roles: [\"CONTRACTING_OFFICER\"])",
      "mask_pii": "@mask(maskLevel: \"HIGH\", maskFor: [\"PUBLIC\"])"
    }
  }
  ```
- **Location**: fpds.schema.json, other domain schemas

#### `x-graphql-arg-directives`
- **Type**: Array of directive strings
- **Scope**: Argument definition
- **Usage**: GraphQL directives for query/mutation arguments
- **Example**:
  ```json
  {
    "first": {
      "type": "integer",
      "x-graphql-arg-directives": ["@constraint(min: 1, max: 100)"]
    }
  }
  ```

---

### 6. Operations & Query Attributes (3)

#### `x-graphql-operations`
- **Type**: Object
- **Scope**: Schema root
- **Usage**: Declares Query, Mutation, Subscription operations available
- **Example**:
  ```json
  {
    "x-graphql-operations": {
      "Query": "FpdsQuery",
      "Mutation": "FpdsMutation"
    }
  }
  ```

#### `x-graphql-pagination`
- **Type**: Object
- **Scope**: Field/Type
- **Usage**: Pagination configuration (cursor-based, offset-based, etc.)
- **Example**:
  ```json
  {
    "x-graphql-pagination": {
      "type": "cursor",
      "defaultPageSize": 20,
      "maxPageSize": 100
    }
  }
  ```

#### `x-graphql-args`
- **Type**: Object
- **Scope**: Operation/Field
- **Usage**: Defines query/mutation arguments

---

### 7. Enum Attributes (2)

#### `x-graphql-enum`
- **Type**: Object
- **Scope**: Enum value
- **Usage**: Metadata for individual enum value

#### `x-graphql-enums`
- **Type**: Object (enum definitions)
- **Scope**: Schema root
- **Usage**: Declares enums available in schema
- **Example**:
  ```json
  {
    "x-graphql-enums": {
      "SystemName": {
        "description": "Enumeration of system identifiers",
        "values": ["ASSIST", "EASI", "CALM", "FPDS", "PRISM"]
      }
    }
  }
  ```

---

### 8. Schema & System Attributes (2)

#### `x-graphql-schema-reference`
- **Type**: String (filename)
- **Scope**: Schema root
- **Usage**: References the petrified-supergraph schema for cross-schema lookups
- **Example**:
  ```json
  {
    "x-graphql-schema-reference": "petrified-supergraph.schema.json"
  }
  ```

#### `x-graphql-system`
- **Type**: String (system name)
- **Scope**: Schema root or type
- **Usage**: Identifies which system this schema belongs to
- **Example**:
  ```json
  {
    "x-graphql-system": "FPDS"
  }
  ```

---

### 9. Data Source Mapping Attributes (3) — Phase 6

**Purpose**: Document data transformations and field mappings (consolidation from Phase 6)

#### `x-graphql-source-reference` ⭐ (New in Phase 6)
- **Type**: String (reference path)
- **Scope**: Field property
- **Usage**: Specifies the source field/path in the original data system
- **Generator**: generate-fpds-mapping.mjs
- **Converter Expectation**: Used to track field lineage and document data provenance
- **Locations**: 94 uses
  - usaspending.schema.json (field source mappings to FPDS)
- **Example**:
  ```json
  {
    "vendor_name": {
      "type": "string",
      "x-graphql-source-reference": "Vendor.name",
      "description": "Vendor company name from FPDS"
    }
  }
  ```
- **Replaced**: `x-fpds-source` (Phase 5)
- **Format**: `[System].[Path.To.Field]` (e.g., "FPDS:Vendor.name", "EASI:ES_VENDOR.VENDOR_NAME")

#### `x-graphql-source-mapping-type` ⭐ (New in Phase 6)
- **Type**: Enum ("direct", "derived", "native", "legacy", "computed")
- **Scope**: Field property
- **Usage**: Indicates how this field maps to the source system
- **Generator**: generate-fpds-mapping.mjs
- **Converter Expectation**: Determines resolver strategy
- **Locations**: 134 uses
  - usaspending.schema.json (mapping type for each field)
- **Values**:
  - `"direct"`: One-to-one mapping from source field
  - `"derived"`: Computed from one or more source fields
  - `"native"`: Exists only in this schema (not in source)
  - `"legacy"`: Deprecated but retained for backward compatibility
  - `"computed"`: Complex transformation at query time
- **Example**:
  ```json
  {
    "award_fiscal_year": {
      "type": "string",
      "x-graphql-source-mapping-type": "derived",
      "x-graphql-mapping-notes": "Derived from action_date"
    }
  }
  ```
- **Replaced**: `x-fpds-mapping-type` (Phase 5)

#### `x-graphql-mapping-notes` ⭐ (New in Phase 6)
- **Type**: String
- **Scope**: Field property
- **Usage**: Human-readable documentation of how field is mapped/transformed
- **Generator**: generate-fpds-mapping.mjs, generate-shareable-directives.mjs
- **Converter Expectation**: Used in documentation generation and SDL comments
- **Locations**: 89 uses
  - usaspending.schema.json (notes for each field)
- **Example**:
  ```json
  {
    "created_at": {
      "type": "string",
      "x-graphql-source-reference": "SystemMetadata.created_timestamp",
      "x-graphql-source-mapping-type": "direct",
      "x-graphql-mapping-notes": "Record creation timestamp from system metadata"
    }
  }
  ```
- **Replaced**: `x-mapping-notes` (Phase 5)

---

### 10. Performance Attributes (4)

#### `x-graphql-performance`
- **Type**: Object
- **Scope**: Schema root
- **Usage**: Global performance configuration

#### `x-graphql-phase3-performance`
- **Type**: Object
- **Scope**: Schema root or type
- **Usage**: Performance settings from Phase 3

#### `x-graphql-complexity`
- **Type**: Integer
- **Scope**: Field or Type
- **Usage**: Complexity score for query cost analysis
- **Reserved For**: Future use

#### `x-graphql-query-cost` ⭐ (Phase 6)
- **Type**: Integer
- **Scope**: Type or Field
- **Usage**: Estimated execution cost for query planning
- **Replaced**: `x-cost` (Phase 5)
- **Example**:
  ```json
  {
    "x-graphql-query-cost": 10
  }
  ```

---

### 11. Security & Authorization Attributes (3)

#### `x-graphql-authorization`
- **Type**: Object
- **Scope**: Schema root
- **Usage**: Authorization configuration and policies

#### `x-graphql-security`
- **Type**: Object
- **Scope**: Schema root
- **Usage**: Security policies and settings

#### `x-graphql-sensitive-data` ⭐ (Phase 6)
- **Type**: Boolean
- **Scope**: Field
- **Usage**: Marks field containing PII or sensitive information
- **Replaced**: `x-sensitive` (Phase 5)
- **Example**:
  ```json
  {
    "ip_address": {
      "type": "string",
      "x-graphql-sensitive-data": true
    }
  }
  ```

---

### 12. Caching & Observability Attributes (3)

#### `x-graphql-caching`
- **Type**: Object
- **Scope**: Schema root
- **Usage**: Caching policies and configuration

#### `x-graphql-observability`
- **Type**: Object
- **Scope**: Schema root
- **Usage**: Tracing, logging, metrics configuration

#### `x-graphql-rate-limiting`
- **Type**: Object
- **Scope**: Schema root
- **Usage**: Rate limiting rules and thresholds

---

### 13. Cost Model Attributes (1)

#### `x-graphql-cost-model`
- **Type**: Object
- **Scope**: Schema root
- **Usage**: Query cost calculation model configuration

---

### 14. Error Handling Attributes (1)

#### `x-graphql-error-codes`
- **Type**: Object (error code definitions)
- **Scope**: Schema root
- **Usage**: Standard error codes used in schema

---

### 15. Query Templates Attributes (1)

#### `x-graphql-query-templates`
- **Type**: Object (template definitions)
- **Scope**: Schema root
- **Usage**: Predefined GraphQL queries available to clients

---

### 16. Other Attributes (1)

#### `x-graphql-description`
- **Type**: String
- **Scope**: Any
- **Usage**: Alternative description field for better documentation

---

## Converters & Transformations

### How Converters Use X-GraphQL Attributes

#### 1. generate-fpds-mapping.mjs

**Input**: fpds-usaspending-mapping.json  
**Output**: usaspending.schema.json with added attributes

**Attributes Generated**:
- ✅ `x-graphql-source-reference`: Maps to field source path
- ✅ `x-graphql-source-mapping-type`: Sets mapping type (direct/derived/native)
- ✅ `x-graphql-mapping-notes`: Adds field documentation
- ✅ `x-graphql-shareable`: Indicates shareability
- ✅ `x-graphql-shareable-tier`: Sets federation tier

**Usage Pattern**:
```javascript
fieldDef['x-graphql-source-reference'] = fieldMapping.source;
fieldDef['x-graphql-source-mapping-type'] = 'direct';
fieldDef['x-graphql-mapping-notes'] = fieldMapping.notes;
```

#### 2. generate-subgraph-sdl.mjs

**Input**: JSON Schema files with x-graphql-* attributes  
**Output**: GraphQL SDL (supergraph)

**Attributes Read**:
- ✅ `x-graphql-type-name`: Determines type name in SDL
- ✅ `x-graphql-field-type`: Determines field type in SDL
- ✅ `x-graphql-field-name`: Determines camelCase field name
- ✅ `x-graphql-federation-shareable`: Adds @shareable directive
- ✅ `x-graphql-federation-keys`: Adds @key directive
- ✅ `x-graphql-type-directives`: Applies type directives
- ✅ `x-graphql-field-directives`: Applies field directives
- ✅ `x-graphql-scalar-type`: Determines scalar reference

**Transformation Example**:
```javascript
// From JSON Schema
{
  "vendor_name": {
    "type": "string",
    "x-graphql-field-type": "String",
    "x-graphql-federation-shareable": true
  }
}

// To GraphQL SDL
type Vendor {
  vendorName: String @shareable
}
```

#### 3. generate-shareable-directives.mjs

**Input**: JSON Schema with x-graphql- metadata  
**Output**: GraphQL SDL with @shareable directives

**Attributes Read**:
- ✅ `x-graphql-federation-shareable`: Adds @shareable
- ✅ `x-graphql-mapping-notes`: Adds field comments

#### 4. validate-schema.mjs

**Input**: JSON Schema files  
**Purpose**: Validate schema structure

**Attributes Validated**:
- ✅ `x-graphql-type-name`: Must match type pattern
- ✅ `x-graphql-field-type`: Must be valid GraphQL type
- ✅ `x-graphql-federation-keys`: Must reference existing fields

---

## Usage Patterns

### Pattern 1: Basic Type Definition

```json
{
  "Vendor": {
    "type": "object",
    "x-graphql-type-name": "FpdsVendor",
    "x-graphql-type-kind": "OBJECT",
    "x-graphql-federation-keys": ["vendor_id"],
    "x-graphql-federation-shareable": true,
    "properties": {
      "vendor_id": {
        "type": "string",
        "x-graphql-field-name": "vendorId",
        "x-graphql-field-type": "String",
        "x-graphql-field-non-null": true
      }
    }
  }
}
```

### Pattern 2: Field with Source Mapping

```json
{
  "award_date": {
    "type": "string",
    "format": "date",
    "x-graphql-field-type": "Date",
    "x-graphql-source-reference": "Award.date",
    "x-graphql-source-mapping-type": "direct",
    "x-graphql-mapping-notes": "Award execution date from FPDS database"
  }
}
```

### Pattern 3: Derived Field

```json
{
  "award_fiscal_year": {
    "type": "string",
    "x-graphql-source-reference": "Award.date",
    "x-graphql-source-mapping-type": "derived",
    "x-graphql-mapping-notes": "Fiscal year calculated from award date"
  }
}
```

### Pattern 4: Sensitive Data

```json
{
  "email": {
    "type": "string",
    "format": "email",
    "x-graphql-field-type": "Email",
    "x-graphql-sensitive-data": true,
    "x-graphql-field-directives": ["@mask(maskLevel: \"HIGH\")"]
  }
}
```

### Pattern 5: Federation Shared Type

```json
{
  "SharedAddress": {
    "type": "object",
    "x-graphql-type-name": "SharedAddress",
    "x-graphql-federation-shareable": true,
    "x-graphql-federation-keys": ["street_address", "city"],
    "properties": {
      "street_address": {
        "type": "string",
        "x-graphql-field-non-null": true
      }
    }
  }
}
```

---

## Linting & Validation

### Linting Rules for x-graphql-* Attributes

See [eslint-rules-x-graphql.mjs](#) for implementation.

#### Rule 1: Enforce x-graphql- Prefix for New Attributes

**Rule**: All new custom GraphQL SDL metadata must use `x-graphql-` prefix

**Scope**: JSON Schema files under `src/data/`

**Validation**:
```javascript
// ✅ PASS
"x-graphql-type-name": "FpdsVendor"
"x-graphql-source-reference": "Vendor.name"

// ❌ FAIL
"x-typeName": "FpdsVendor"
"x-source": "Vendor.name"
"custom-attr": "value"
```

#### Rule 2: Validate Attribute Values

**Rule**: Attribute values must match expected type and format

**Validation Examples**:
```javascript
// ❌ Invalid type
"x-graphql-federation-shareable": "true"  // Should be boolean

// ❌ Invalid enum
"x-graphql-source-mapping-type": "unknown"  // Must be: direct|derived|native|legacy

// ❌ Invalid format
"x-graphql-source-reference": "invalid.path"  // Must match pattern
```

#### Rule 3: Required Attributes for Types

**Rule**: Certain attributes must be present on type definitions

**Required When**:
- Defining new type → must have `x-graphql-type-name`
- Defining federation shared type → must have `x-graphql-federation-shareable`
- Mapping to source system → must have `x-graphql-source-reference` and `x-graphql-source-mapping-type`

#### Rule 4: Consistent Naming Conventions

**Rule**: Field names and type names must follow naming patterns

**Patterns**:
- Type names: PascalCase (e.g., `FpdsVendor`, `SharedAddress`)
- Field names in schema: snake_case (e.g., `vendor_name`, `created_at`)
- x-graphql-field-name: camelCase (e.g., `vendorName`, `createdAt`)

#### Rule 5: No Deprecated Attributes

**Rule**: Old attribute names (pre-Phase 6) must not be used

**Deprecated Attributes** (will fail linting):
- ❌ `x-fpds-source` → use `x-graphql-source-reference`
- ❌ `x-fpds-mapping-type` → use `x-graphql-source-mapping-type`
- ❌ `x-mapping-notes` → use `x-graphql-mapping-notes`
- ❌ `x-source-table` → use `x-graphql-source-table`
- ❌ `x-sensitive` → use `x-graphql-sensitive-data`
- ❌ `x-cost` → use `x-graphql-query-cost`

---

## Best Practices

### 1. Attribute Naming

✅ **DO**: Use `x-graphql-` prefix for all GraphQL SDL metadata

```json
{
  "x-graphql-type-name": "FpdsVendor",
  "x-graphql-federation-shareable": true
}
```

❌ **DON'T**: Use other prefixes or no prefix

```json
{
  "x-type-name": "FpdsVendor",
  "typeName": "FpdsVendor"
}
```

### 2. Source Mapping Completeness

✅ **DO**: Always include all three mapping attributes together

```json
{
  "vendor_name": {
    "x-graphql-source-reference": "Vendor.name",
    "x-graphql-source-mapping-type": "direct",
    "x-graphql-mapping-notes": "Vendor company name"
  }
}
```

❌ **DON'T**: Leave mapping attributes incomplete

```json
{
  "vendor_name": {
    "x-graphql-source-reference": "Vendor.name"
    // Missing source-mapping-type and mapping-notes
  }
}
```

### 3. Documentation

✅ **DO**: Provide clear, concise mapping notes

```json
{
  "x-graphql-mapping-notes": "Award modification sequence number (0-based). Used to distinguish multiple contract actions on same PIID."
}
```

❌ **DON'T**: Leave notes empty or generic

```json
{
  "x-graphql-mapping-notes": "field"
}
```

### 4. Federation Keys

✅ **DO**: Specify federation keys on all shareable types

```json
{
  "x-graphql-federation-shareable": true,
  "x-graphql-federation-keys": ["id", "vendor_name"]
}
```

❌ **DON'T**: Mark as shareable without keys

```json
{
  "x-graphql-federation-shareable": true
  // Missing federation-keys
}
```

### 5. Type Consistency

✅ **DO**: Match x-graphql-field-type with actual JSON Schema type

```json
{
  "created_at": {
    "type": "string",
    "format": "date-time",
    "x-graphql-field-type": "DateTime"
  }
}
```

❌ **DON'T**: Mismatch types

```json
{
  "created_at": {
    "type": "string",
    "x-graphql-field-type": "Int"  // Wrong type!
  }
}
```

### 6. Sensitive Data Marking

✅ **DO**: Mark all PII and sensitive fields

```json
{
  "email": {
    "x-graphql-sensitive-data": true
  },
  "ip_address": {
    "x-graphql-sensitive-data": true
  }
}
```

❌ **DON'T**: Omit sensitive data marking

```json
{
  "email": { ... },  // Should be marked
  "ssn": { ... }     // Should be marked
}
```

### 7. Converter Expectations

✅ **DO**: Use attributes that converters expect

**generate-fpds-mapping.mjs expects**:
- ✅ `x-graphql-source-reference` for data source
- ✅ `x-graphql-source-mapping-type` for transformation type
- ✅ `x-graphql-shareable` for federation participation

**generate-subgraph-sdl.mjs expects**:
- ✅ `x-graphql-type-name` for GraphQL type name
- ✅ `x-graphql-field-type` for GraphQL field type
- ✅ `x-graphql-federation-shareable` for @shareable directive

### 8. Extensibility

✅ **DO**: Follow the pattern when adding new attributes

When adding a new attribute:
1. Use `x-graphql-` prefix
2. Add to this registry
3. Document converter expectations
4. Add validation rules
5. Update linting rules

❌ **DON'T**: Invent new prefixes

```json
// ❌ Wrong
"x-petrified-new-attr": "value"
"x-forest-config": "value"

// ✅ Correct
"x-graphql-new-attr": "value"
```

---

## Validation Checklist

Use this checklist when adding new attributes or modifying schemas:

### Before Committing Schema Changes

- [ ] All custom attributes use `x-graphql-` prefix
- [ ] Type definitions have `x-graphql-type-name`
- [ ] Shared types have `x-graphql-federation-shareable`
- [ ] Shared types have `x-graphql-federation-keys`
- [ ] Source-mapped fields have all three mapping attributes
- [ ] Sensitive fields marked with `x-graphql-sensitive-data`
- [ ] Field types match `x-graphql-field-type`
- [ ] Mapping notes are clear and complete
- [ ] No deprecated attribute names used
- [ ] Schema validates with `pnpm run validate:schema`
- [ ] Supergraph regenerates without errors
- [ ] Tests pass: `pnpm test`

### Before Modifying Converters

- [ ] Know which x-graphql-* attributes you're reading/writing
- [ ] Update this registry if adding new attributes
- [ ] Add validation for new attribute values
- [ ] Test converter with example data
- [ ] Validate output schemas
- [ ] Run full test suite

---

## Future Enhancements (Phase 7+)

### Planned Attributes

- `x-graphql-audit-timestamp`: Audit tracking
- `x-graphql-original-type`: Pre-federation type name
- `x-graphql-schema-version`: Schema version info
- `x-graphql-deprecation-reason`: Field deprecation message
- `x-graphql-subscription-topics`: GraphQL subscription topics
- `x-graphql-batch-size-limit`: Batch operation limits

### Planned Tools

- Generic x-graphql-* attribute parser utility
- Automated attribute registry generator
- x-graphql-* attribute linter
- Attribute migration tools

---

**Version History**:
- v2.0 (Dec 18, 2025): Post Phase-6 consolidation, comprehensive registry
- v1.0 (Dec 18, 2025): Initial registry (Phase 5)

**Related Documentation**:
- [PHASE-6-COMPLETION-REPORT.md](./PHASE-6-COMPLETION-REPORT.md)
- [PHASE-5-COMPLETION-REPORT.md](./PHASE-5-COMPLETION-REPORT.md)
- [FIELD-MAPPING-REGISTRY.md](./mappings/FIELD-MAPPING-REGISTRY.md)

