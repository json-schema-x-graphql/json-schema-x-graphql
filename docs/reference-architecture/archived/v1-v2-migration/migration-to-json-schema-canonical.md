# Migration Plan: JSON Schema as Canonical Source

## Executive Summary

This document outlines the complete migration from GraphQL SDL as canonical to JSON Schema as canonical source of truth for the Enterprise Schema Unification Forest contract schema.

**Timeline**: 4-6 weeks  
**Risk Level**: Medium  
**Effort**: ~40-60 hours  
**Code Reduction**: 85% (1,558 lines → ~200 lines)

---

## Table of Contents

1. [Current State](#current-state)
2. [Target State](#target-state)
3. [Migration Phases](#migration-phases)
4. [GraphQL Extension Patterns](#graphql-extension-patterns)
5. [Implementation Details](#implementation-details)
6. [Testing Strategy](#testing-strategy)
7. [Rollback Plan](#rollback-plan)
8. [Success Criteria](#success-criteria)

---

## Current State

### Existing Architecture

```
GraphQL SDL (Canonical)
    ↓
JSON Schema (Generated) → Data Validation
    ↓
TypeScript Types (Generated)
```

### Current Files

- **Canonical**: `src/data/schema_unification.graphql` (GraphQL SDL)
- **Generated**: `src/data/schema_unification.schema.json` (JSON Schema)
- **Custom Scripts**: 1,558 lines
  - `scripts/generate-graphql-json-schema.mjs` (307 lines)
  - `scripts/generate-graphql-from-json-schema.mjs` (250 lines)
  - `scripts/json-to-graphql.config.mjs` (597 lines)
  - Validation scripts (404 lines)

### Issues

- ❌ Document-oriented JSON Schema incompatible with standard tools
- ❌ High maintenance burden (40+ hours/year)
- ❌ Complex custom transformation logic
- ❌ Bidirectional sync complexity

---

## Target State

### New Architecture

```
JSON Schema v2 (Canonical) + x-graphql-* extensions
    ↓
GraphQL SDL (Generated via typeconv + post-processor)
    ↓
TypeScript Types (Generated)
    ↓
Documentation (Generated)
```

### Target Files

- **Canonical**: `src/data/schema_unification.schema.json` (JSON Schema with definitions)
- **Generated**: `src/data/schema_unification.graphql` (GraphQL SDL)
- **Minimal Scripts**: ~200 lines
  - `scripts/generate-graphql.mjs` (100 lines - typeconv + post-processing)
  - `scripts/post-process-graphql.mjs` (100 lines - extensions handler)

### Benefits

- ✅ Standards-compliant schema structure
- ✅ Compatible with typeconv, core-types, ajv
- ✅ 85% code reduction
- ✅ Single source of truth
- ✅ Rich validation capabilities

---

## Migration Phases

### Phase 0: Preparation (Week 1) ✅ COMPLETED

**Status**: ✅ Done

**Activities**:
- [x] Evaluate typeconv and core-types
- [x] Document current schema structure
- [x] Create restructuring script
- [x] Restructure JSON Schema to use definitions
- [x] Test typeconv conversion (30 types converted)
- [x] Create backup of original schema

**Artifacts**:
- `src/data/schema_unification.schema.v2.json` (restructured)
- `src/data/schema_unification.schema.v1-backup.json` (backup)
- `scripts/restructure-schema.mjs`
- `docs/SCHEMA-RESTRUCTURING-SUCCESS.md`
- `generated-schemas/test.v2.graphql/schema_unification.schema.v2.graphql`

---

### Phase 1: Add GraphQL Extensions (Week 2)

**Status**: ⏳ Pending

**Goal**: Enhance JSON Schema with `x-graphql-*` metadata to preserve GraphQL features

#### 1.1 Enum Extensions

**File**: `src/data/schema_unification.schema.json`

**Before**:
```json
{
  "definitions": {
    "Contact": {
      "properties": {
        "role": {
          "type": "string",
          "enum": ["primary", "technical", "administrative", "contracting_officer"]
        }
      }
    }
  }
}
```

**After**:
```json
{
  "definitions": {
    "ContactRole": {
      "type": "string",
      "description": "Role classification for contract contacts",
      "enum": ["primary", "technical", "administrative", "contracting_officer"],
      "x-graphql-enum": {
        "name": "ContactRole",
        "description": "Role classification for contract contacts",
        "values": {
          "primary": { "name": "PRIMARY", "description": "Primary contact" },
          "technical": { "name": "TECHNICAL", "description": "Technical point of contact" },
          "administrative": { "name": "ADMINISTRATIVE", "description": "Administrative contact" },
          "contracting_officer": { "name": "CONTRACTING_OFFICER", "description": "Contracting officer" }
        }
      }
    },
    "Contact": {
      "properties": {
        "role": { "$ref": "#/definitions/ContactRole" }
      }
    }
  }
}
```

**Enums to Add**:
1. `ContactRole` (4 values)
2. `SystemType` (4 values: Contract Data, Legacy Procurement, Intake Process, Logistics Mgmt)
3. `ContractStatus` (5 values: draft, published, awarded, completed, cancelled)

#### 1.2 Union Type Extensions

**Add to SystemExtensions**:
```json
{
  "definitions": {
    "SystemExtension": {
      "description": "System-specific extensions",
      "x-graphql-union": {
        "name": "SystemExtension",
        "description": "System-specific extensions projected from the normalized schema",
        "types": ["Contract DataExtension", "AssistExtension", "EasiExtension"]
      },
      "oneOf": [
        { "$ref": "#/definitions/Contract DataExtension" },
        { "$ref": "#/definitions/AssistExtension" },
        { "$ref": "#/definitions/EasiExtension" }
      ]
    }
  }
}
```

#### 1.3 Required Field Overrides

**Add to fields that are optional in JSON but required in GraphQL**:
```json
{
  "definitions": {
    "SystemMetadata": {
      "properties": {
        "schemaVersion": {
          "type": "string",
          "default": "2.0",
          "x-graphql-required": true
        },
        "lastModified": {
          "type": "string",
          "format": "date-time",
          "x-graphql-required": true
        }
      }
    }
  }
}
```

#### 1.4 GraphQL Operations

**Add at root level**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://github.com/GSA-TTS/enterprise-schema-unification/schemas/contract-v2",
  "x-graphql-operations": {
    "queries": {
      "contract": {
        "type": "Contract",
        "description": "Fetch a single contract by ID",
        "args": {
          "id": {
            "type": "ID!",
            "description": "Global record identifier"
          }
        }
      },
      "contracts": {
        "type": "ContractConnection!",
        "description": "Paginated list of contracts",
        "args": {
          "first": { "type": "Int", "default": 10 },
          "after": { "type": "String" },
          "filter": { "type": "ContractFilter" }
        }
      }
    },
    "mutations": {
      "triggerDataIngestion": {
        "type": "Boolean!",
        "description": "Trigger data ingestion from external system",
        "args": {
          "system": {
            "type": "SystemType!",
            "description": "System to ingest from"
          }
        }
      }
    }
  }
}
```

#### 1.5 Custom Scalars

**Add at root level**:
```json
{
  "x-graphql-scalars": {
    "DateTime": {
      "description": "ISO 8601 date-time string",
      "serialize": "String"
    },
    "Date": {
      "description": "ISO 8601 date string",
      "serialize": "String"
    },
    "Decimal": {
      "description": "Decimal number for currency/precision values",
      "serialize": "Float"
    },
    "JSON": {
      "description": "Arbitrary JSON value",
      "serialize": "JSON"
    }
  }
}
```

**Deliverables**:
- [ ] Enhanced JSON Schema with all extensions
- [ ] Documentation of extension patterns
- [ ] Validation that schema still passes JSON Schema validators

---

### Phase 2: Create Generation Scripts (Week 3)

**Status**: ⏳ Pending

#### 2.1 Main Generator Script

**File**: `scripts/generate-graphql.mjs`

```javascript
#!/usr/bin/env node

/**
 * Generate GraphQL SDL from JSON Schema with x-graphql-* extensions
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { convert } from 'typeconv';
import { processGraphQLExtensions } from './lib/graphql-extensions.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const schemaPath = path.join(repoRoot, 'src', 'data', 'schema_unification.schema.json');
const outputPath = path.join(repoRoot, 'src', 'data', 'schema_unification.graphql');
const tempPath = path.join(repoRoot, 'generated-schemas', 'temp.graphql');

async function generateGraphQL() {
  console.log('📖 Reading JSON Schema...');
  const schemaContent = await fs.readFile(schemaPath, 'utf8');
  const schema = JSON.parse(schemaContent);
  
  console.log('🔄 Converting with typeconv...');
  const result = await convert({
    fromFilename: schemaPath,
    fromType: 'jsc',
    toType: 'gql'
  });
  
  console.log('✨ Post-processing with extensions...');
  const enhancedGraphQL = processGraphQLExtensions(result.data, schema);
  
  console.log('💾 Writing GraphQL SDL...');
  await fs.writeFile(outputPath, enhancedGraphQL, 'utf8');
  
  console.log(`✅ Generated: ${path.relative(repoRoot, outputPath)}`);
}

generateGraphQL().catch(err => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
```

#### 2.2 Extensions Processor

**File**: `scripts/lib/graphql-extensions.mjs`

```javascript
/**
 * Process x-graphql-* extensions from JSON Schema and enhance GraphQL SDL
 */

export function processGraphQLExtensions(baseGraphQL, jsonSchema) {
  let graphql = baseGraphQL;
  
  // 1. Process enums
  graphql = processEnums(graphql, jsonSchema);
  
  // 2. Process union types
  graphql = processUnions(graphql, jsonSchema);
  
  // 3. Process required field overrides
  graphql = processRequiredFields(graphql, jsonSchema);
  
  // 4. Add custom scalars
  graphql = addCustomScalars(graphql, jsonSchema);
  
  // 5. Add operations (Query, Mutation)
  graphql = addOperations(graphql, jsonSchema);
  
  // 6. Add pagination types
  graphql = addPaginationTypes(graphql, jsonSchema);
  
  return graphql;
}

function processEnums(graphql, schema) {
  const enums = [];
  
  for (const [name, def] of Object.entries(schema.definitions || {})) {
    if (def['x-graphql-enum']) {
      const enumDef = def['x-graphql-enum'];
      const enumSDL = generateEnumSDL(enumDef, def);
      enums.push(enumSDL);
      
      // Replace String type with enum name
      const pattern = new RegExp(`${name}:\\s*String`, 'g');
      graphql = graphql.replace(pattern, `${name}: ${enumDef.name}`);
    }
  }
  
  return enums.join('\n\n') + '\n\n' + graphql;
}

function generateEnumSDL(enumConfig, definition) {
  const { name, description, values } = enumConfig;
  const enumValues = Object.entries(values || {}).map(([key, config]) => {
    const valueDesc = config.description ? `  "${config.description}"\n` : '';
    return `${valueDesc}  ${config.name}`;
  }).join('\n');
  
  const desc = description ? `"${description}"\n` : '';
  return `${desc}enum ${name} {\n${enumValues}\n}`;
}

function processUnions(graphql, schema) {
  const unions = [];
  
  for (const [name, def] of Object.entries(schema.definitions || {})) {
    if (def['x-graphql-union']) {
      const unionConfig = def['x-graphql-union'];
      const unionSDL = generateUnionSDL(unionConfig);
      unions.push(unionSDL);
    }
  }
  
  return unions.join('\n\n') + '\n\n' + graphql;
}

function generateUnionSDL(unionConfig) {
  const { name, description, types } = unionConfig;
  const desc = description ? `"${description}"\n` : '';
  return `${desc}union ${name} = ${types.join(' | ')}`;
}

function addCustomScalars(graphql, schema) {
  const scalars = schema['x-graphql-scalars'] || {};
  const scalarSDL = Object.entries(scalars).map(([name, config]) => {
    const desc = config.description ? `"${config.description}"\n` : '';
    return `${desc}scalar ${name}`;
  }).join('\n\n');
  
  return scalarSDL ? scalarSDL + '\n\n' + graphql : graphql;
}

function addOperations(graphql, schema) {
  const operations = schema['x-graphql-operations'] || {};
  let sdl = graphql;
  
  if (operations.queries) {
    const queryType = generateOperationType('Query', operations.queries);
    sdl += '\n\n' + queryType;
  }
  
  if (operations.mutations) {
    const mutationType = generateOperationType('Mutation', operations.mutations);
    sdl += '\n\n' + mutationType;
  }
  
  return sdl;
}

function generateOperationType(typeName, operations) {
  const fields = Object.entries(operations).map(([name, config]) => {
    const desc = config.description ? `  "${config.description}"\n` : '';
    const args = config.args ? generateArgs(config.args) : '';
    return `${desc}  ${name}${args}: ${config.type}`;
  }).join('\n');
  
  return `type ${typeName} {\n${fields}\n}`;
}

function generateArgs(args) {
  const argsList = Object.entries(args).map(([name, config]) => {
    return `${name}: ${config.type}`;
  }).join(', ');
  return `(${argsList})`;
}

function addPaginationTypes(graphql, schema) {
  const paginationSDL = `
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type ContractEdge {
  cursor: String!
  node: Contract!
}

type ContractConnection {
  edges: [ContractEdge!]!
  pageInfo: PageInfo!
  totalCount: Int
}`;
  
  return graphql + '\n\n' + paginationSDL;
}

function processRequiredFields(graphql, schema) {
  // Scan for x-graphql-required and add ! to types
  // This is a simplified version - full implementation would be more robust
  for (const [name, def] of Object.entries(schema.definitions || {})) {
    for (const [propName, propDef] of Object.entries(def.properties || {})) {
      if (propDef['x-graphql-required']) {
        // Add ! to make field required in GraphQL
        const pattern = new RegExp(`(${propName}:\\s*\\w+)(?!!)`, 'g');
        graphql = graphql.replace(pattern, '$1!');
      }
    }
  }
  return graphql;
}
```

**Deliverables**:
- [ ] Main generation script
- [ ] Extensions processor library
- [ ] Unit tests for extensions processor
- [ ] Documentation for adding new extensions

---

### Phase 3: Update Package Scripts (Week 3)

**Status**: ⏳ Pending

**File**: `package.json`

**Changes**:

```json
{
  "scripts": {
    "// Schema Generation": "",
    "generate:graphql": "node scripts/generate-graphql.mjs",
    "generate:types": "typeconv -f jsc -t ts -o src/types/schema.ts src/data/schema_unification.schema.json",
    "generate:docs": "node scripts/generate-schema-docs.mjs",
    "generate:all": "pnpm run generate:graphql && pnpm run generate:types && pnpm run generate:docs",
    
    "// Validation": "",
    "validate:schema": "ajv validate -s src/data/schema_unification.schema.json -d 'src/data/schema_unification.json'",
    "validate:graphql": "node scripts/validate-graphql-syntax.mjs",
    "validate:parity": "node scripts/validate-schema-graphql-parity.mjs",
    "validate:all": "pnpm run validate:schema && pnpm run validate:graphql && pnpm run validate:parity",
    
    "// Legacy (to be removed after migration)": "",
    "generate:schema:interop": "node scripts/generate-schema-interop.js",
    "validate:sync": "node scripts/validate-schema-sync.mjs"
  }
}
```

**Deliverables**:
- [ ] Updated package.json
- [ ] Deprecation notices for old scripts
- [ ] Migration guide for contributors

---

### Phase 4: Testing & Validation (Week 4)

**Status**: ⏳ Pending

#### 4.1 Unit Tests

**File**: `tests/schema-generation.test.js`

```javascript
import { processGraphQLExtensions } from '../scripts/lib/graphql-extensions.mjs';

describe('GraphQL Extensions Processor', () => {
  test('should generate enum from x-graphql-enum', () => {
    const schema = {
      definitions: {
        ContactRole: {
          type: 'string',
          enum: ['primary', 'technical'],
          'x-graphql-enum': {
            name: 'ContactRole',
            values: {
              primary: { name: 'PRIMARY' },
              technical: { name: 'TECHNICAL' }
            }
          }
        }
      }
    };
    
    const result = processGraphQLExtensions('', schema);
    expect(result).toContain('enum ContactRole');
    expect(result).toContain('PRIMARY');
    expect(result).toContain('TECHNICAL');
  });
  
  test('should generate union from x-graphql-union', () => {
    const schema = {
      definitions: {
        SystemExtension: {
          'x-graphql-union': {
            name: 'SystemExtension',
            types: ['Contract DataExtension', 'AssistExtension']
          }
        }
      }
    };
    
    const result = processGraphQLExtensions('', schema);
    expect(result).toContain('union SystemExtension = Contract DataExtension | AssistExtension');
  });
  
  // Add more tests...
});
```

#### 4.2 Integration Tests

**File**: `tests/schema-roundtrip.test.js`

```javascript
describe('Schema Roundtrip', () => {
  test('JSON Schema → GraphQL → TypeScript types should be consistent', async () => {
    // Generate GraphQL from JSON Schema
    await generateGraphQL();
    
    // Parse generated GraphQL
    const graphql = await fs.readFile('src/data/schema_unification.graphql', 'utf8');
    const schema = buildSchema(graphql);
    
    // Validate all expected types exist
    expect(schema.getType('Contract')).toBeDefined();
    expect(schema.getType('SystemMetadata')).toBeDefined();
    expect(schema.getType('ContactRole')).toBeDefined();
    
    // Validate Query type
    const queryType = schema.getQueryType();
    expect(queryType.getFields().contract).toBeDefined();
    expect(queryType.getFields().contracts).toBeDefined();
  });
  
  test('Generated GraphQL should match curated version structure', () => {
    // Compare field counts, type names, etc.
  });
});
```

#### 4.3 Validation Suite

Create comprehensive validation:

1. **Schema Structure Validation**
   - All definitions have correct structure
   - No circular references break typeconv
   - All `$ref` pointers are valid

2. **Extension Validation**
   - All `x-graphql-*` properties follow specification
   - Enum values are properly formatted
   - Union types reference existing definitions

3. **Data Instance Validation**
   - Sample data validates against JSON Schema
   - Edge cases are covered

4. **Generated GraphQL Validation**
   - GraphQL syntax is valid
   - All types from JSON Schema are present
   - Required fields are properly marked
   - Operations are correctly generated

**Deliverables**:
- [ ] Complete test suite (>80% coverage)
- [ ] CI integration for tests
- [ ] Validation reports

---

### Phase 5: Documentation Updates (Week 5)

**Status**: ⏳ Pending

#### 5.1 Update Existing Docs

**Files to Update**:
- [x] `docs/adr/0002-schema-tooling-automation.md` - Updated with new decision
- [ ] `docs/schema-pipeline.md` - Update with new workflow
- [ ] `README.md` - Update schema management section
- [ ] `CONTRIBUTING.md` - Update contribution guidelines

#### 5.2 Create New Docs

**New Documents**:
- [ ] `docs/graphql-extensions-guide.md` - Complete guide to x-graphql-* extensions
- [ ] `docs/schema-contribution-guide.md` - How to contribute schema changes
- [ ] `docs/troubleshooting-schema.md` - Common issues and solutions

**Deliverables**:
- [ ] All documentation updated
- [ ] Examples for common patterns
- [ ] Troubleshooting guide

---

### Phase 6: Cutover & Cleanup (Week 6)

**Status**: ⏳ Pending

#### 6.1 Cutover Steps

1. **Final Validation**
   ```bash
   pnpm run validate:all
   pnpm test
   ```

2. **Replace Original Schema**
   ```bash
   # Archive old schema
   mv src/data/schema_unification.schema.json src/data/schema_unification.schema.v1-original.json
   
   # Promote v2 to canonical
   mv src/data/schema_unification.schema.v2.json src/data/schema_unification.schema.json
   ```

3. **Archive Old GraphQL SDL**
   ```bash
   # Keep as reference
   mv src/data/schema_unification.graphql src/data/schema_unification.graphql.manual-curated
   
   # Generate new from JSON Schema
   pnpm run generate:graphql
   ```

4. **Remove Custom Scripts**
   ```bash
   mkdir scripts/archived
   mv scripts/generate-graphql-json-schema.mjs scripts/archived/
   mv scripts/generate-graphql-from-json-schema.mjs scripts/archived/
   mv scripts/json-to-graphql.config.mjs scripts/archived/
   mv scripts/generate-schema-interop.js scripts/archived/
   ```

5. **Update CI/CD**
   - Update GitHub Actions workflows
   - Update deployment scripts
   - Update validation pipelines

#### 6.2 Announcement

**Communication Plan**:
- [ ] Post announcement in team Slack/chat
- [ ] Send email to stakeholders
- [ ] Update project wiki/confluence
- [ ] Create migration guide for contributors

#### 6.3 Monitoring

**Track for 2 weeks**:
- [ ] Schema generation errors
- [ ] GraphQL API issues
- [ ] Data validation failures
- [ ] Contributor feedback

**Deliverables**:
- [ ] Cutover completed successfully
- [ ] Old scripts archived
- [ ] Team informed
- [ ] Monitoring in place

---

## GraphQL Extension Patterns

### Complete Extension Reference

#### Pattern 1: Simple Enum

```json
{
  "ContactRole": {
    "type": "string",
    "description": "Contact role classification",
    "enum": ["primary", "technical", "administrative", "contracting_officer"],
    "x-graphql-enum": {
      "name": "ContactRole",
      "description": "Role classification for contract contacts",
      "values": {
        "primary": { "name": "PRIMARY", "description": "Primary contact" },
        "technical": { "name": "TECHNICAL", "description": "Technical POC" },
        "administrative": { "name": "ADMINISTRATIVE", "description": "Administrative contact" },
        "contracting_officer": { "name": "CONTRACTING_OFFICER", "description": "Contracting officer" }
      }
    }
  }
}
```

#### Pattern 2: Union Types

```json
{
  "SystemExtension": {
    "description": "System-specific extension",
    "x-graphql-union": {
      "name": "SystemExtension",
      "description": "Union of all system-specific extensions",
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

#### Pattern 3: Required Override

```json
{
  "SystemMetadata": {
    "properties": {
      "schemaVersion": {
        "type": "string",
        "default": "2.0",
        "x-graphql-required": true,
        "x-graphql-description": "Schema version (required in GraphQL, optional in JSON)"
      }
    }
  }
}
```

#### Pattern 4: Custom Scalar Mapping

```json
{
  "lastModified": {
    "type": "string",
    "format": "date-time",
    "x-graphql-scalar": "DateTime",
    "x-graphql-description": "Last modification timestamp"
  }
}
```

#### Pattern 5: Relationship/Resolver Hint

```json
{
  "Contract": {
    "properties": {
      "relatedContracts": {
        "x-graphql-field": {
          "type": "[Contract!]",
          "description": "Related contracts via referencedPiid",
          "resolver": "Contract.relatedContracts",
          "args": {
            "first": { "type": "Int", "default": 10 }
          }
        }
      }
    }
  }
}
```

#### Pattern 6: Pagination

```json
{
  "x-graphql-pagination": {
    "enabled": true,
    "types": {
      "Contract": {
        "connection": "ContractConnection",
        "edge": "ContractEdge"
      }
    }
  }
}
```

---

## Testing Strategy

### Test Pyramid

```
        /\
       /  \         E2E Tests (5%)
      /----\        - Full schema generation pipeline
     /      \       - Data validation end-to-end
    /--------\      Integration Tests (20%)
   /          \     - JSON Schema → GraphQL conversion
  /------------\    - Extension processing
 /              \   Unit Tests (75%)
/________________\  - Individual extension processors
                    - Validation functions
```

### Test Categories

#### 1. Unit Tests (`tests/unit/`)

- **Extension Processors**
  - Enum generation
  - Union generation
  - Required field processing
  - Scalar mapping
  - Operation generation

- **Utilities**
  - Schema traversal
  - Reference resolution
  - Type mapping

#### 2. Integration Tests (`tests/integration/`)

- **Schema Conversion**
  - Complete JSON Schema → GraphQL conversion
  - Extension application
  - Post-processing

- **Validation**
  - Schema structure validation
  - Extension validation
  - Data instance validation

#### 3. End-to-End Tests (`tests/e2e/`)

- **Full Pipeline**
  - Read JSON Schema
  - Generate GraphQL SDL
  - Validate GraphQL syntax
  - Compare with expected output

- **Data Flow**
  - Validate sample data against JSON Schema
  - Use generated GraphQL for queries
  - Ensure consistency

### Coverage Goals

- **Unit Tests**: >90% coverage
- **Integration Tests**: >80% coverage
- **E2E Tests**: Critical paths covered

### Continuous Testing

```yaml
# .github/workflows/schema-validation.yml
name: Schema Validation

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm test
      - run: pnpm run validate:all
      - run: pnpm run generate:all
      
      - name: Check for changes
        run: |
          if [[ -n $(git status --porcelain) ]]; then
            echo "Generated files differ from committed files"
            git diff
            exit 1
          fi
```

---

## Rollback Plan

### Rollback Triggers

Initiate rollback if:
- **Critical**: Generated GraphQL breaks API consumers
- **High**: Data validation failures increase >10%
- **High**: Schema generation fails consistently
- **Medium**: Team cannot contribute schema changes
- **Medium**: Performance degradation >20%

### Rollback Procedure

#### Quick Rollback (< 30 minutes)

1. **Restore Original Files**
   ```bash
   # Restore GraphQL SDL as canonical
   git checkout origin/main -- src/data/schema_unification.graphql
   
   # Restore original JSON Schema
   cp src/data/schema_unification.schema.v1-original.json src/data/schema_unification.schema.json
   
   # Restore old scripts
   git checkout origin/main -- scripts/
   
   # Restore package.json
   git checkout origin/main -- package.json
   ```

2. **Reinstall Dependencies**
   ```bash
   pnpm install
   ```

3. **Validate**
   ```bash
   pnpm run validate:all
   pnpm test
   ```

4. **Deploy**
   ```bash
   git commit -m "Rollback: Restore GraphQL SDL as canonical"
   git push
   ```

#### Full Rollback (< 2 hours)

If quick rollback doesn't resolve issues:

1. **Revert Branch**
   ```bash
   git revert <migration-commit-range>
   git push
   ```

2. **Notify Team**
   - Post in team channels
   - Email stakeholders
   - Update status page

3. **Root Cause Analysis**
   - Document what failed
   - Analyze logs
   - Create fix plan

4. **Schedule Retry**
   - Address root causes
   - Update migration plan
   - Reschedule cutover

### Rollback Testing

**Before Migration**: Practice rollback procedure

```bash
# Create test branch
git checkout -b test-rollback

# Perform migration steps
# ... migration commands ...

# Practice rollback
# ... rollback commands ...

# Validate system state
pnpm run validate:all
pnpm test

# Clean up
git checkout main
git branch -D test-rollback
```

---

## Success Criteria

### Must-Have (Go/No-Go)

- ✅ All 30 types from JSON Schema convert to GraphQL
- ✅ Generated GraphQL has valid syntax
- ✅ All existing tests pass
- ✅ Sample data validates against new schema
- ✅ CI/CD pipelines succeed
- ✅ Documentation is updated
- ✅ Team has been trained

### Should-Have

- ✅ Generated GraphQL matches curated version (90%+ similarity)
- ✅ Code reduction achieves >80% target
- ✅ Generation time < 5 seconds
- ✅ Zero regression in data validation
- ✅ Contributor guide is clear and tested

### Nice-to-Have

- ⚪ Automated doc generation working
- ⚪ TypeScript types auto-generated
- ⚪ Performance improvement in validation
- ⚪ Enhanced error messages

### Metrics to Track

| Metric | Before | Target | Actual |
|--------|--------|--------|--------|
| **Lines of Custom Code** | 1,558 | <250 | TBD |
| **Schema Generation Time** | N/A | <5s | TBD |
| **Test Coverage** | 65% | >80% | TBD |
| **Build Time** | 2m 30s | <2m | TBD |
| **Contributor Onboarding** | 4 hours | <2 hours | TBD |
| **Maintenance Hours/Year** | 40+ | <10 | TBD |

---

## Risk Management

### High Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Breaking API Changes** | Medium | Critical | Extensive testing, gradual rollout |
| **Data Validation Failures** | Medium | High | Validate all instances before cutover |
| **Tool Compatibility Issues** | Low | Medium | Test with multiple typeconv versions |
| **Team Adoption Issues** | Medium | Medium | Training, documentation, support |

### Medium Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Performance Degradation** | Low | Medium | Benchmark before/after |
| **Extension Pattern Limitations** | Medium | Medium | Build flexibility into processors |
| **Documentation Gaps** | High | Low | Thorough documentation phase |

### Low Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Contributor Confusion** | Low | Low | Clear guides, examples |
| **Tooling Bugs** | Low | Low | Report upstream, workarounds |

---

## Post-Migration

### Week 1-2: Monitoring

- [ ] Monitor schema generation success rate
- [ ] Track data validation errors
- [ ] Gather team feedback
- [ ] Address quick wins

### Month 1: Optimization

- [ ] Optimize generation performance
- [ ] Enhance error messages
- [ ] Add convenience scripts
- [ ] Create video tutorials

### Quarter 1: Evolution

- [ ] Evaluate additional use cases
- [ ] Consider additional extensions
- [ ] Plan next improvements
- [ ] Measure maintenance savings

---

## Appendix

### A. Tool Versions

- `typeconv`: ^2.3.1
- `core-types-graphql`: ^3.0.0
- `core-types-json-schema`: ^2.2.0
- `ajv`: ^8.17.1
- `graphql`: ^16.11.0

### B. Reference Links

- [JSON Schema Specification](https://json-schema.org/specification.html)
- [GraphQL Specification](https://spec.graphql.org/)
- [typeconv Documentation](https://github.com/grantila/typeconv)
- [core-types Documentation](https://github.com/grantila/core-types)

### C. Key Contacts

- **Schema Owner**: [Team/Person]
- **Technical Lead**: [Team/Person]
- **Migration Lead**: [Team/Person]

### D. Timeline Summary

```
Week 1 (✅):  Preparation, restructuring
Week 2 (⏳):  Add GraphQL extensions
Week 3 (⏳):  Create generation scripts
Week 4 (⏳):  Testing & validation
Week 5 (⏳):  Documentation
Week 6 (⏳):  Cutover & cleanup
```

---

## Conclusion

This migration plan provides a comprehensive roadmap for transitioning from GraphQL SDL to JSON Schema as the canonical source. The approach balances:

- **Safety**: Extensive testing and rollback procedures
- **Efficiency**: 85% code reduction
- **Quality**: Enhanced validation capabilities
- **Maintainability**: Standard tooling and clear patterns

**Next Step**: Begin Phase 1 by adding GraphQL extensions to the restructured JSON Schema.
