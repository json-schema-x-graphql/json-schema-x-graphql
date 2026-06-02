# Schema Pipeline Guide

**Comprehensive guide to schema generation, validation, and management**

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Canonical Schema](#canonical-schema)
4. [Generation Pipeline](#generation-pipeline)
5. [Validation Suite](#validation-suite)
6. [Management Best Practices](#management-best-practices)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Topics](#advanced-topics)

---

## Overview

The Schema Unification Forest project maintains a **bidirectional schema interop pipeline** that ensures consistency between JSON Schema and GraphQL SDL representations of the data model.

### Key Principles

- **JSON Schema is canonical** — `src/data/schema_unification.schema.json` is the single source of truth
- **Snake_case convention** — All canonical field names use snake_case
- **Bidirectional conversion** — GraphQL SDL ↔ JSON Schema with parity validation
- **Generated artifacts committed** — All generated files are tracked in Git
- **Website consumption** — Generated schemas copied to `src/data/generated/` for Next.js

### File Locations

| Type                      | Path                                        | Purpose                          |
| ------------------------- | ------------------------------------------- | -------------------------------- |
| **Canonical JSON Schema** | `src/data/schema_unification.schema.json`   | Source of truth (snake_case)     |
| **Canonical GraphQL SDL** | `src/data/schema_unification.graphql`       | Human-readable schema definition |
| **Generated artifacts**   | `generated-schemas/`                        | CI/CD outputs                    |
| **Website schemas**       | `src/data/generated/`                       | For Next.js import               |
| **Field mapping**         | `generated-schemas/field-name-mapping.json` | camelCase ↔ snake_case           |

---

## Architecture

### Schema Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Canonical Sources                         │
├──────────────────────────┬──────────────────────────────────┤
│  schema_unification.schema.json   │   schema_unification.graphql              │
│  (JSON Schema - snake)   │   (GraphQL SDL - camel)          │
└────────────┬─────────────┴──────────────┬───────────────────┘
             │                            │
             ▼                            ▼
    ┌────────────────┐          ┌────────────────┐
    │  Generator 1   │          │  Generator 2   │
    │  JSON → SDL    │          │  SDL → JSON    │
    └────────┬───────┘          └────────┬───────┘
             │                            │
             ▼                            ▼
    ┌────────────────┐          ┌────────────────┐
    │ Generated SDL  │          │ Generated JSON │
    └────────┬───────┘          └────────┬───────┘
             │                            │
             └──────────┬─────────────────┘
                        ▼
                ┌───────────────┐
                │   Validators  │
                │ Check Parity  │
                └───────┬───────┘
                        │
                        ▼
                ┌───────────────┐
                │ Publish to    │
                │ src/data/gen/ │
                └───────────────┘
```

### Components

#### Generators

- **`generate-graphql-from-json-schema.mjs`** — JSON Schema → GraphQL SDL
- **`generate-graphql-json-schema.mjs`** — GraphQL SDL → JSON Schema
- **`generate-graphql-json-schema-v2.mjs`** — V2 SDL with x-graphql hints
- **`generate-schema-interop.mjs`** — Orchestrates full pipeline
- **`generate-field-mapping.mjs`** — Creates camelCase ↔ snake_case mapping

#### Validators

- **`validate-schema.mjs`** — Ajv-based JSON Schema validation
- **`validate-graphql-vs-jsonschema.mjs`** — GraphQL ↔ JSON parity checker
- **`validate-schema-sync.mjs`** — Field synchronization validator

#### Helpers

- **`helpers/case-conversion.mjs`** — Case conversion utilities
- **`helpers/format-json.mjs`** — JSON formatting
- **`json-to-graphql.config.mjs`** — Type mapping configuration

---

## Canonical Schema

### Why JSON Schema is Canonical

JSON Schema was chosen as the canonical format because:

1. **Richer Validation** — Pattern matching, numeric constraints, array limits
2. **Data at Rest** — Natural fit for document validation
3. **Flexible Structure** — Can model any JSON structure
4. **Comprehensive Documentation** — Examples, constraints, format specs
5. **Tool Support** — Widely supported validation tools

### Schema Conventions

#### Naming Conventions

```json
{
  "properties": {
    "contract_id": { "type": "string" }, // ✅ snake_case
    "organization_info": {
      // ✅ snake_case
      "type": "object",
      "properties": {
        "primary_name": { "type": "string" }, // ✅ snake_case
        "duns_number": { "type": "string" } // ✅ snake_case
      }
    }
  }
}
```

#### Required Fields

```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "optional_field": { "type": "string" }
  },
  "required": ["id", "name"] // ✅ Explicit required array
}
```

#### Enumerations

```json
{
  "contact_role": {
    "type": "string",
    "enum": ["primary", "technical", "administrative", "contracting_officer"],
    "description": "Role of the contact person"
  }
}
```

### GraphQL Extensions (x-graphql-\*)

To enable rich GraphQL generation from JSON Schema, use `x-graphql-*` extensions:

#### Enum Extensions

```json
{
  "ContactRole": {
    "type": "string",
    "enum": ["primary", "technical", "administrative"],
    "x-graphql-enum": {
      "name": "ContactRole",
      "values": {
        "primary": { "name": "PRIMARY", "description": "Primary contact" },
        "technical": { "name": "TECHNICAL", "description": "Technical lead" }
      }
    }
  }
}
```

#### Union Type Extensions

```json
{
  "SystemExtension": {
    "description": "Union of system-specific extensions",
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

#### Required Field Overrides

```json
{
  "schema_version": {
    "type": "string",
    "default": "2.0.0",
    "x-graphql-required": true // Forces non-null in GraphQL
  }
}
```

---

## Generation Pipeline

### Quick Start

Run the complete pipeline:

```bash
pnpm run generate:schema:interop
```

This executes all generators in sequence:

1. Field name mapping
2. GraphQL SDL → JSON Schema
3. JSON Schema → GraphQL SDL
4. V2 schema generation (if V2 SDL exists)

### Individual Generators

#### 1. Generate GraphQL from JSON Schema

```bash
node scripts/generate-graphql-from-json-schema.mjs
```

**Inputs:**

- `src/data/schema_unification.schema.json` (canonical)
- Field mapping (optional)

**Outputs:**

- `generated-schemas/schema_unification.from-json.graphql`
- `src/data/generated/schema_unification.from-json.graphql`

**Features:**

- Snake_case → camelCase conversion
- Type inference from JSON Schema
- Enum generation
- Description mapping

#### 2. Generate JSON Schema from GraphQL SDL

```bash
node scripts/generate-graphql-json-schema.mjs
```

**Inputs:**

- `src/data/schema_unification.graphql` (SDL)
- `src/data/schema_unification.schema.json` (for definitions)

**Outputs:**

- `generated-schemas/schema_unification.from-graphql.json`
- `src/data/generated/schema_unification.from-graphql.json`

**Features:**

- Preserves existing definitions
- CamelCase → snake_case conversion
- GraphQL type → JSON Schema type mapping
- Handles interfaces and unions

#### 3. Generate V2 Schema with Hints

```bash
node scripts/generate-graphql-json-schema-v2.mjs
```

**Inputs:**

- `src/data/schema_unification.target.graphql` (V2 SDL with hints)

**Outputs:**

- `generated-schemas/schema_unification.v2.from-graphql.json`

**Features:**

- Processes x-graphql-\* extensions
- Enhanced interface/union handling
- Custom directive support

#### 4. Generate Field Mapping

```bash
node scripts/generate-field-mapping.mjs
```

**Output:**

- `generated-schemas/field-name-mapping.json`

Maps GraphQL camelCase fields to JSON Schema snake_case:

```json
{
  "contractId": {
    "snake": "contract_id",
    "locations": ["#/definitions/Contract/properties/contract_id"]
  },
  "organizationInfo": {
    "snake": "organization_info",
    "locations": ["#/definitions/Contract/properties/organization_info"]
  }
}
```

### Programmatic Usage

All generators export functions for programmatic use:

```javascript
import { generateFromJSONSchema } from "./scripts/generate-graphql-from-json-schema.mjs";
import { generateFromSDL } from "./scripts/generate-graphql-json-schema.mjs";
import { generateV2 } from "./scripts/generate-graphql-json-schema-v2.mjs";
import { runInteropGeneration } from "./scripts/generate-schema-interop.mjs";

// Generate SDL from JSON Schema
const sdlPath = await generateFromJSONSchema({
  schemaFile: "src/data/schema_unification.schema.json",
  outPath: "generated-schemas/output.graphql",
});

// Generate JSON from SDL
const jsonPath = await generateFromSDL(
  "src/data/schema_unification.graphql",
  "src/data/schema_unification.schema.json",
  "generated-schemas/output.json",
  "camel", // input case
  "snake", // output case
);

// Run full pipeline
const outputs = await runInteropGeneration({
  outputDir: "generated-schemas",
  verbose: true,
});
```

### Configuration

#### Type Mapping (`json-to-graphql.config.mjs`)

Define how JSON Schema types map to GraphQL:

```javascript
export const typeConfigs = [
  {
    name: "Contract",
    description: "Core contract record",
    pointer: "/definitions/Contract",
    outputType: "type",
  },
  {
    name: "OrganizationInfo",
    description: "Organization details",
    pointer: "/definitions/Contract/properties/organization_info",
    outputType: "type",
  },
];

export const enumConfigs = [
  {
    name: "ContactRole",
    pointer: "/definitions/ContactRole",
    values: ["primary", "technical", "administrative"],
  },
];

export const unionConfigs = [
  {
    name: "SystemExtension",
    description: "Union of system extensions",
    members: ["Contract DataExtension", "AssistExtension", "EasiExtension"],
  },
];
```

---

## Validation Suite

### Overview

The validation suite ensures schema integrity and parity between formats.

### Run All Validators

```bash
pnpm run validate:all
```

Runs:

- JSON Schema validation (Ajv)
- GraphQL SDL validation
- Parity checking (GraphQL ↔ JSON)
- Synchronization validation (strict mode)

### Individual Validators

#### 1. JSON Schema Validation

```bash
pnpm run validate:schema
```

Validates JSON Schema files using Ajv:

- Structural correctness
- Valid $ref pointers
- Type consistency
- Required field presence

**Checks:**

- ✅ Valid JSON Schema draft-07 or 2020-12
- ✅ All `$ref` pointers resolve
- ✅ No circular dependencies
- ✅ Enum values are consistent

#### 2. GraphQL SDL Validation

```bash
pnpm run validate:graphql
```

Validates GraphQL SDL syntax and semantics:

- Valid GraphQL syntax
- Type definitions complete
- Field types resolve
- Interface implementations correct

**Checks:**

- ✅ Valid GraphQL SDL syntax
- ✅ All types defined
- ✅ Field types exist
- ✅ Arguments have valid types

#### 3. Parity Validation

```bash
pnpm run validate:parity
```

Compares GraphQL SDL with JSON Schema:

- Field presence in both formats
- Type compatibility
- Required vs non-null alignment
- Description consistency

**Output Example:**

```
✓ Contract.id present in both schemas
✓ Contract.name present in both schemas
✗ Contract.schemaVersion: required in SDL but optional in JSON Schema
✗ Contract.analytics: present in SDL but missing in JSON Schema
```

#### 4. Sync Validation

```bash
# Normal mode
pnpm run validate:sync

# Strict mode (case-sensitive)
pnpm run validate:sync:strict
```

Validates field synchronization:

- All fields match (ignoring case in normal mode)
- Type equivalence
- Nested object parity

### Python Validation

```bash
# Validate all JSON Schemas
python python/validate_schemas.py src/data/*.schema.json

# Run Python tests
pytest python/tests/ -v

# With coverage
pytest --cov=python --cov-report=term-missing
```

Python validators provide:

- Additional JSON Schema validation
- Custom validation rules
- Integration tests
- Performance benchmarks

---

## Management Best Practices

### Making Schema Changes

#### Standard Workflow

1. **Edit canonical schema**

   ```bash
   vim src/data/schema_unification.schema.json
   ```

2. **Validate changes**

   ```bash
   pnpm run validate:schema
   ```

3. **Regenerate artifacts**

   ```bash
   pnpm run generate:schema:interop
   ```

4. **Check parity**

   ```bash
   pnpm run validate:sync
   ```

5. **Run tests**

   ```bash
   pnpm test
   pytest
   ```

6. **Commit everything**
   ```bash
   git add src/data/schema_unification.schema.json
   git add generated-schemas/
   git add src/data/generated/
   git commit -m "feat: add new field to Contract type"
   ```

### When to Regenerate

Regenerate schemas when:

- ✅ Canonical JSON Schema changes
- ✅ GraphQL SDL changes
- ✅ Type mapping config changes
- ✅ After merging branches with schema changes

Do NOT regenerate for:

- ❌ Documentation-only changes
- ❌ Code changes that don't affect schemas
- ❌ Test updates

### Handling Conflicts

#### Parity Issues

When SDL and JSON Schema diverge:

1. **Identify the mismatch**

   ```bash
   pnpm run validate:sync --strict
   ```

2. **Decide which is correct**
   - If JSON Schema is correct: Update SDL manually or regenerate
   - If SDL is correct: Update JSON Schema

3. **Make the change**
   - Edit canonical file
   - Regenerate
   - Verify parity restored

4. **Document the decision**
   - Add comment in schema
   - Update ADR if architectural

#### Required vs Non-Null

Common issue: Field is `required` in JSON Schema but nullable in SDL (or vice versa).

**Solution 1: Make consistent**

```json
// JSON Schema
{
  "properties": {
    "schema_version": { "type": "string" }
  },
  "required": ["schema_version"] // Add to required
}
```

```graphql
# GraphQL SDL
type SystemMetadata {
  schemaVersion: String! # Make non-null
}
```

**Solution 2: Use x-graphql override**

```json
{
  "properties": {
    "schema_version": {
      "type": "string",
      "x-graphql-required": true // Override in GraphQL only
    }
  }
}
```

### Version Control

#### What to Commit

Always commit:

- ✅ `src/data/schema_unification.schema.json`
- ✅ `src/data/schema_unification.graphql`
- ✅ `generated-schemas/*` (all generated files)
- ✅ `src/data/generated/*` (website schemas)

Never commit:

- ❌ `node_modules/`
- ❌ `.next/`
- ❌ `__tests__/test-output/`
- ❌ Python `*.pyc` files

#### Git Workflow

```bash
# Feature branch
git checkout -b feature/add-contract-field

# Make changes
vim src/data/schema_unification.schema.json

# Regenerate
pnpm run generate:schema:interop

# Validate
pnpm run validate:all

# Stage all related files
git add src/data/schema_unification.schema.json
git add generated-schemas/
git add src/data/generated/

# Commit with descriptive message
git commit -m "feat(schema): add contract_category field to Contract type

- Added contract_category enum field
- Regenerated all schema artifacts
- Updated field mapping
- All validators pass"

# Push
git push origin feature/add-contract-field
```

### CI/CD Integration

The schema pipeline runs automatically in CI:

```yaml
# .github/workflows/schema-validation.yml
- name: Generate schemas
  run: pnpm run generate:schema:interop

- name: Validate all schemas
  run: pnpm run validate:all

- name: Check for uncommitted changes
  run: |
    git diff --exit-code generated-schemas/
    git diff --exit-code src/data/generated/
```

If CI fails:

1. Pull latest changes
2. Regenerate locally
3. Commit generated files
4. Push again

---

## Troubleshooting

### Common Issues

#### Issue: Validation Fails After Schema Change

**Symptoms:**

```
✗ JSON Schema validation failed
✗ Contract.new_field: type "InvalidType" does not exist
```

**Solution:**

1. Check field type is valid
2. Ensure referenced types are defined
3. Verify `$ref` pointers are correct

```bash
# Validate JSON Schema syntax
pnpm run validate:schema

# Check references
grep -r "InvalidType" src/data/schema_unification.schema.json
```

#### Issue: Parity Check Fails

**Symptoms:**

```
✗ Field mismatch: Contract.fieldName
  - Present in JSON Schema: field_name
  - Present in GraphQL SDL: fieldName
```

**Solution:**

1. Ensure field mapping is up-to-date

   ```bash
   node scripts/generate-field-mapping.mjs
   ```

2. Check case conversion is working

   ```javascript
   // In case-conversion.mjs
   camelToSnake("fieldName"); // Should return 'field_name'
   ```

3. Regenerate with correct mapping
   ```bash
   pnpm run generate:schema:interop
   ```

#### Issue: Generated SDL Missing Fields

**Symptoms:**

- Fields in JSON Schema not appearing in generated SDL

**Solution:**

1. Check type mapping configuration

   ```javascript
   // json-to-graphql.config.mjs
   export const typeConfigs = [
     {
       name: "MyType",
       pointer: "/definitions/my_type", // Check this path
       outputType: "type",
     },
   ];
   ```

2. Verify JSON pointer resolves

   ```bash
   # Test pointer manually
   node -e "
   const schema = require('./src/data/schema_unification.schema.json');
   const { resolvePointer } = require('./scripts/helpers/pointer-utils.mjs');
   console.log(resolvePointer(schema, '/definitions/my_type'));
   "
   ```

3. Check field is not filtered out
   - Some fields may be intentionally skipped
   - Check generator code for filters

#### Issue: Circular Reference Error

**Symptoms:**

```
Error: Maximum call stack size exceeded
Circular reference detected: Contract -> Organization -> Contract
```

**Solution:**

1. Use `$ref` pointers instead of inline definitions

   ```json
   {
     "properties": {
       "organization": {
         "$ref": "#/definitions/Organization" // ✅ Reference
       }
     }
   }
   ```

2. Ensure generator handles circular refs
   - Check `building` set in generator
   - Verify refs are not deeply expanded

#### Issue: Python Validation Fails

**Symptoms:**

```
ValidationError: 'field_name' is a required property
```

**Solution:**

1. Check Python environment

   ```bash
   source .venv/bin/activate
   python --version  # Should be >= 3.9
   ```

2. Reinstall dependencies

   ```bash
   uv pip install -e ".[dev]"
   ```

3. Verify schema file exists and is valid JSON
   ```bash
   python -m json.tool src/data/schema_unification.schema.json > /dev/null
   ```

### Debug Mode

Enable debug logging:

```bash
# Environment variable
DEBUG=* pnpm run generate:schema:interop

# Or in code
console.log('[DEBUG]', yourVariable);
```

### Getting Help

1. **Check documentation**
   - This guide
   - `scripts/README.md`
   - Architecture Decision Records in `docs/adr/`

2. **Review archived logs**
   - `docs/archived/implementation-logs/GRAPHQL-CONVERTER-BUG-FIXES.md`
   - Common issues and solutions

3. **Ask the team**
   - Open GitHub issue
   - Team chat
   - Tag @schema-team

---

## Advanced Topics

### Custom Scalar Mapping

Define custom scalars in JSON Schema:

```json
{
  "last_modified": {
    "type": "string",
    "format": "date-time",
    "x-graphql-scalar": "DateTime",
    "description": "Last modification timestamp"
  }
}
```

Register scalar in GraphQL:

```graphql
scalar DateTime
```

### Complex Type Mapping

For complex nested types:

```javascript
// json-to-graphql.config.mjs
export const typeConfigs = [
  {
    name: "FinancialInfo",
    description: "Financial details",
    pointer: "/definitions/Contract/properties/financial_info",
    outputType: "type",
    fields: {
      // Custom field mappings
      obligatedAmount: {
        pointer: "obligated_amount",
        type: "Decimal",
        required: true,
      },
    },
  },
];
```

### Conditional Schema Generation

Generate different schemas based on environment:

```javascript
const env = process.env.NODE_ENV;

if (env === "production") {
  // Exclude dev-only fields
  schema = filterDevFields(schema);
}
```

### Performance Optimization

For large schemas:

1. **Use streaming for file I/O**

   ```javascript
   const stream = fs.createReadStream("large-schema.json");
   const parser = JSONStream.parse();
   stream.pipe(parser);
   ```

2. **Cache generated artifacts**

   ```javascript
   if (fs.existsSync(cacheFile)) {
     return JSON.parse(fs.readFileSync(cacheFile));
   }
   ```

3. **Parallel generation**
   ```javascript
   await Promise.all([generateFromJSON(), generateFromSDL(), generateFieldMapping()]);
   ```

---

## Reference

### Commands Quick Reference

```bash
# Generation
pnpm run generate:schema:interop     # Full pipeline
pnpm run generate:mapping            # Field mapping only

# Validation
pnpm run validate:all                # All validators
pnpm run validate:schema             # JSON Schema only
pnpm run validate:graphql            # GraphQL SDL only
pnpm run validate:sync               # Parity check
pnpm run validate:sync:strict        # Strict parity

# Python
python python/validate_schemas.py src/data/*.schema.json
pytest python/tests/ -v

# Development
pnpm dev                             # Start dev server
pnpm test                            # Run JS/TS tests
```

### File Structure

```
enterprise-schema-unification/
├── src/data/
│   ├── schema_unification.schema.json        # ⭐ Canonical JSON Schema
│   ├── schema_unification.graphql            # ⭐ Canonical GraphQL SDL
│   ├── generated/                   # Website schemas
│   └── archived/                    # Legacy schemas
├── generated-schemas/               # ⭐ Generated artifacts
│   ├── schema_unification.from-json.graphql
│   ├── schema_unification.from-graphql.json
│   ├── field-name-mapping.json
│   └── schema_unification.v2.from-graphql.json
├── scripts/
│   ├── generate-*.mjs               # Generators
│   ├── validate-*.mjs               # Validators
│   └── helpers/                     # Utilities
└── python/
    ├── validate_schemas.py          # Python validator
    └── tests/                       # Python tests
```

### Key Conventions

- **Snake_case** for JSON Schema fields
- **CamelCase** for GraphQL SDL fields
- **Generated files committed** to Git
- **Both directions validated** for parity
- **Python + JavaScript** validation

---

## Next Steps

- **Learn x-graphql hints:** [x-graphql Hints Guide](x-graphql-hints-guide.md)
- **Understand V1 vs V2:** [Schema V1 vs V2 Guide](schema-v1-vs-v2-guide.md)
- **Explore tooling:** [Schema Tooling Reference](schema-tooling-reference.md)
- **Python validation:** [Python Validation Guide](python-validation-guide.md)

---

**Last Updated:** December 2024  
**Version:** 2.0  
**Status:** Active
