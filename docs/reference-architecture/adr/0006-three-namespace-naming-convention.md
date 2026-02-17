# ADR 0006: Three-Namespace Naming Convention

**Status:** Accepted  
**Date:** 2024-12-01  
**Authors:** Development Team  
**Supersedes:** None

## Context

The Schema Unification Forest project integrates JSON Schema (database/validation domain), GraphQL SDL (API domain), and extension metadata (tooling domain). Each domain has different naming conventions, and the project requires bidirectional conversion between JSON Schema and GraphQL SDL while preserving semantic information.

### Current State

The project uses three distinct naming conventions across different contexts:

1. **`snake_case`** - JSON Schema property names (database/validation domain)

   ```json
   {
     "properties": {
       "user_id": { "type": "string" },
       "created_at": { "type": "string", "format": "date-time" }
     }
   }
   ```

2. **`camelCase`** - GraphQL SDL field names (API domain)

   ```graphql
   type User {
     userId: ID!
     createdAt: DateTime!
   }
   ```

3. **`hyphen-case`** - Extension metadata keys (tooling domain)
   ```json
   {
     "properties": {
       "user_id": {
         "x-graphql-field-name": "userId",
         "x-graphql-field-type": "ID",
         "x-graphql-field-non-null": true
       }
     }
   }
   ```

### Why Three Conventions?

**snake_case for JSON Schema (Database Domain):**

- Standard in PostgreSQL, MySQL, and most database systems
- Common in Python, Ruby, and backend validation tooling
- Used by government data standards (Contract Data, Unified Model, Databricks)
- Avoids reserved words and SQL compatibility issues
- Canonical source schema is `src/data/schema_unification.schema.json` (snake_case)

**camelCase for GraphQL SDL (API Domain):**

- GraphQL community standard (Apollo, The Guild, GraphQL Foundation)
- JavaScript/TypeScript frontend convention
- Matches JSON response expectations in browsers
- Used by all major GraphQL frameworks (Apollo Server, graphql-yoga, Relay)
- Generated SDL is `generated-schemas/schema_unification.from-json.graphql` (camelCase)

**hyphen-case for Extension Metadata:**

- JSON Schema extension specification uses hyphenated prefixes (`x-*`)
- Avoids collision with standard JSON Schema keywords (no `xGraphql*`)
- Clear visual distinction from domain fields
- Consistent with OpenAPI Specification (`x-*` extensions)
- Used in `x-graphql-*` hints for bidirectional conversion

### Business Requirements

1. **Lossless Bidirectional Conversion:** JSON Schema ↔ GraphQL SDL conversion must preserve all semantic information
2. **Database Compatibility:** Schema must validate data from PostgreSQL databases using snake_case columns
3. **API Standards:** GraphQL API must follow JavaScript/GraphQL community conventions (camelCase)
4. **Tooling Interoperability:** Must work with standard JSON Schema validators (AJV, sourcemeta-jsonschema)
5. **Federation Support:** GraphQL SDL must support Apollo Federation directives
6. **Developer Clarity:** Naming conventions must be predictable and self-documenting

### Technical Constraints

- **20+ REST APIs** to integrate (Databricks, Contract Data, Unified Model, etc.) returning snake_case JSON
- **36+ generator scripts** converting between JSON Schema and GraphQL SDL
- **Field mapping validation** ensures snake_case ↔ camelCase conversion accuracy
- **JSON Schema Draft 2020-12** compliance required for validation tooling
- **Apollo Federation v2.9** compliance required for distributed graph

## Decision

**We adopt a three-namespace naming convention with explicit conversion rules and extension metadata.**

### Naming Rules by Domain

#### 1. JSON Schema Properties (Canonical Source)

**Convention:** `snake_case`

**Rules:**

- All object properties in JSON Schema use snake_case
- Applies to: `src/data/schema_unification.schema.json`, `src/data/legacy_procurement.schema.json`, etc.
- Required properties listed in `required` array use snake_case names
- `$ref` pointers use snake_case: `"$ref": "#/$defs/contract_award"`

**Example:**

```json
{
  "type": "object",
  "required": ["contract_id", "award_date"],
  "properties": {
    "contract_id": {
      "type": "string",
      "description": "Unique contract identifier"
    },
    "award_date": {
      "type": "string",
      "format": "date",
      "description": "Date contract was awarded"
    },
    "total_amount": {
      "type": "number",
      "description": "Total contract value in USD"
    }
  }
}
```

#### 2. GraphQL SDL Fields (Generated Output)

**Convention:** `camelCase`

**Rules:**

- All field names in GraphQL SDL use camelCase
- Type names use PascalCase: `ContractAward`, `User`, `Organization`
- Enum values use SCREAMING_SNAKE_CASE: `ACTIVE`, `INACTIVE`, `PENDING`
- Generated files: `generated-schemas/*.graphql`, `src/data/generated/*.graphql`

**Example:**

```graphql
"""
Contract award record
"""
type ContractAward {
  """
  Unique contract identifier
  """
  contractId: String!

  """
  Date contract was awarded
  """
  awardDate: Date!

  """
  Total contract value in USD
  """
  totalAmount: Decimal
}
```

#### 3. Extension Metadata (Tooling Hints)

**Convention:** `x-graphql-*` with hyphen-case

**Rules:**

- All extension keys start with `x-graphql-` prefix
- Sub-keys use hyphen-case: `x-graphql-field-name`, `x-graphql-type-kind`
- Federation extensions: `x-graphql-federation-keys`, `x-graphql-federation-shareable`
- Never use camelCase in extension keys (no `xGraphqlFieldName`)

**Example:**

```json
{
  "properties": {
    "contract_id": {
      "type": "string",
      "x-graphql-field-name": "contractId",
      "x-graphql-field-type": "String",
      "x-graphql-field-non-null": true,
      "x-graphql-federation-keys": ["contract_id"]
    },
    "total_amount": {
      "type": "number",
      "x-graphql-field-name": "totalAmount",
      "x-graphql-field-type": "Decimal",
      "x-graphql-federation-requires": "base_amount tax_amount"
    }
  }
}
```

### Conversion Tools

**Automated Conversion Functions:**

```javascript
// scripts/helpers/case-conversion.mjs

export function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function snakeToPascal(str) {
  return str
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

export function camelToSnake(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
```

**Field Mapping Validation:**

- Script: `scripts/generate-field-mapping.mjs`
- Output: `generated-schemas/field-name-mapping.json`
- Purpose: Validate snake_case ↔ camelCase conversion accuracy
- Used in: `scripts/validate-schema-sync.mjs` (parity checks)

### Extension Metadata Specification

**Core Fields (Always Required):**

- `x-graphql-type-name` - Type name in PascalCase
- `x-graphql-type-kind` - OBJECT | INTERFACE | UNION | ENUM | INPUT_OBJECT | SCALAR
- `x-graphql-field-name` - Field name in camelCase
- `x-graphql-field-type` - GraphQL type reference

**Type Modifiers:**

- `x-graphql-field-non-null` - Non-nullable field marker (`!`)
- `x-graphql-field-list-item-non-null` - Non-nullable list items (`[Item!]`)

**Apollo Federation (30 total extension fields):**

- `x-graphql-federation-keys` - Entity resolution keys
- `x-graphql-federation-shareable` - Shareable marker
- `x-graphql-federation-external` - External field marker
- `x-graphql-federation-requires` - Required field sets
- `x-graphql-federation-provides` - Provided field sets
- `x-graphql-federation-authenticated` - Require authentication
- `x-graphql-federation-requires-scopes` - Required scopes
- `x-graphql-federation-cost-weight` - Operation cost (v2.9+)
- See [docs/x-graphql-hints-guide.md](../x-graphql-hints-guide.md) for complete list

## Consequences

### Positive

- **Clear Domain Separation:** Each domain (database, API, tooling) has distinct, recognizable naming
- **Lossless Conversion:** x-graphql hints enable perfect JSON Schema ↔ GraphQL SDL round-trips
- **Database Compatibility:** snake_case matches PostgreSQL, MySQL, and government data standards
- **API Standards:** camelCase matches GraphQL/JavaScript community conventions
- **Tooling Interoperability:** Standard x-\* prefix works with JSON Schema validators
- **Federation Support:** All Apollo Federation v2.9 directives expressible via extensions
- **Automated Validation:** Field mapping validator ensures conversion accuracy
- **Developer Clarity:** Naming convention immediately identifies domain context

### Negative

- **Learning Curve:** New contributors must learn three conventions and when to use each
- **Extension Verbosity:** x-graphql-\* extensions add ~30% to JSON Schema file size
- **Manual Hints:** Developers must add x-graphql hints when GraphQL semantics differ from JSON Schema
- **Pointer Resolution:** JSON Schema `$ref` pointers must use snake_case, requiring careful pointer updates
- **Case Sensitivity:** Typos in extension keys (e.g., `x-graphql-fieldName` vs `x-graphql-field-name`) cause silent failures

### Neutral

- **Generator Dependency:** Conversions rely on scripts in `scripts/generate-*.mjs`
- **Field Mapping File:** `field-name-mapping.json` must be regenerated when schema changes
- **Enum Values:** Decided to use SCREAMING_SNAKE_CASE (GraphQL convention) rather than preserving snake_case
- **Type Names:** PascalCase for GraphQL types (standard) vs snake_case in JSON Schema titles

## Alternatives Considered

### Alternative 1: Single Naming Convention (All snake_case)

**Approach:** Use snake_case everywhere (JSON Schema, GraphQL SDL, extensions)

**Why Rejected:**

- Violates GraphQL community standards (camelCase fields expected)
- JavaScript/TypeScript frontends expect camelCase in JSON responses
- Apollo Federation tooling assumes camelCase
- Major GraphQL frameworks (Apollo, The Guild) use camelCase
- Would alienate frontend developers familiar with GraphQL

### Alternative 2: Single Naming Convention (All camelCase)

**Approach:** Use camelCase everywhere (JSON Schema, GraphQL SDL, extensions)

**Why Rejected:**

- PostgreSQL databases use snake_case columns
- Government data sources (Contract Data, Unified Model) return snake_case JSON
- Python validation tooling expects snake_case
- Database migrations would require column renaming (high risk)
- JSON Schema community uses snake_case for property names

### Alternative 3: No Extension Metadata (Inference Only)

**Approach:** Infer GraphQL types from JSON Schema without hints

**Why Rejected:**

- Cannot express GraphQL interfaces, unions, or custom scalars
- Apollo Federation directives require explicit hints
- Type ambiguity: JSON "string" could be String, ID, DateTime, Date, Email, URI
- No way to specify non-nullable fields that aren't in `required` array
- Enum values would lose semantic meaning (codes vs descriptions)
- Computed fields (e.g., @requires) cannot be inferred

### Alternative 4: Separate Schema Files (JSON Schema + GraphQL SDL)

**Approach:** Maintain JSON Schema and GraphQL SDL separately, sync manually

**Why Rejected:**

- High risk of drift between schemas (already documented in ADR 0002)
- Manual sync error-prone (46 fields, 8 types, 1200+ lines)
- No single source of truth
- Validation inconsistencies between API and database
- Defeats purpose of schema-driven contract (ADR 0001)

## Success Metrics

1. **Zero Conversion Errors:** All scripts in `pnpm run validate:all` pass (schema, graphql, sync, strict)
2. **Field Parity:** `field-name-mapping.json` shows 100% snake_case ↔ camelCase coverage
3. **Federation Compliance:** Generated SDL validates with Apollo Federation composition
4. **Developer Onboarding:** New contributors understand naming conventions from docs in <30 minutes
5. **REST Integration:** 20+ REST APIs integrated with correct snake_case ↔ camelCase transformation

## Implementation Status

- ✅ Canonical schema: `src/data/schema_unification.schema.json` (snake_case)
- ✅ Generated SDL: `generated-schemas/schema_unification.from-json.graphql` (camelCase)
- ✅ Extension metadata: 30 x-graphql-\* fields defined and documented
- ✅ Case conversion helpers: `scripts/helpers/case-conversion.mjs`
- ✅ Field mapping validator: `scripts/generate-field-mapping.mjs`
- ✅ Sync validation: `scripts/validate-schema-sync.mjs`
- ✅ Documentation: `docs/x-graphql-hints-guide.md`, `docs/x-graphql-quick-reference.md`

## Related Documentation

- [docs/x-graphql-hints-guide.md](../x-graphql-hints-guide.md) - Complete extension metadata reference
- [docs/x-graphql-quick-reference.md](../x-graphql-quick-reference.md) - Quick lookup table for hints
- [docs/SCHEMA-ARCHITECTURE.md](../SCHEMA-ARCHITECTURE.md) - Schema file conventions
- [scripts/helpers/case-conversion.mjs](../../scripts/helpers/case-conversion.mjs) - Conversion utilities
- [ADR 0001: Schema-Driven Data Contract](./0001-schema-driven-data-contract.md) - Why single source of truth
- [ADR 0002: Automated Schema Parity Toolchain](./0002-schema-tooling-automation.md) - Conversion scripts
- [JSON Schema Draft 2020-12 Spec](https://json-schema.org/draft/2020-12/json-schema-core.html) - Extension prefix rules
- [OpenAPI x-\* Extensions](https://spec.openapis.org/oas/v3.1.0#specification-extensions) - Extension precedent

## Review Schedule

- **Q1 2025:** Audit all JSON Schema files for consistent snake_case usage
- **Q2 2025:** Review x-graphql-\* extension set, add new Federation v2.10 directives if released
- **Q4 2025:** Evaluate tooling improvements for automatic hint generation
