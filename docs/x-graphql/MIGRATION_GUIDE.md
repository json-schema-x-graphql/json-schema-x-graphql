# X-GraphQL Migration Guide

**Upgrading to x-graphql v2.0 - Breaking Changes, Migration Paths, and Automated Tools**

Version: 2.0.0  
Last Updated: January 2025

---

## Table of Contents

- [Overview](#overview)
- [Breaking Changes](#breaking-changes)
- [Migration Paths](#migration-paths)
- [Automated Migration](#automated-migration)
- [Manual Migration](#manual-migration)
- [Validation](#validation)
- [Troubleshooting](#troubleshooting)

---

## Overview

X-GraphQL v2.0 introduces a standardized namespace structure and naming conventions. This guide helps you migrate from:

- **v1.x x-graphql attributes** (various naming patterns)
- **TTSE-petrified-forest schemas** (legacy attribute names)
- **Other JSON Schema → GraphQL tools**

### What's New in v2.0

✅ **Consistent Naming**: All attributes follow `x-graphql-{category}-{name}` pattern  
✅ **Federation Namespace**: Federation attributes now prefixed `x-graphql-federation-*`  
✅ **P0 Features**: Core features like `skip`, `nullable`, `description` fully supported  
✅ **Better Validation**: Comprehensive schema validation and linting  
✅ **Migration Tools**: Automated scripts for most changes

### Migration Timeline

- **Phase 1** (Week 1): Run migration script, update schemas
- **Phase 2** (Week 2): Test converted schemas, fix manual cases
- **Phase 3** (Week 3): Deploy and validate in production
- **Phase 4** (Week 4): Remove deprecated v1.x support

---

## Breaking Changes

### 1. Naming Convention Changes

| v1.x Attribute | v2.0 Attribute | Status |
|----------------|----------------|--------|
| `x-graphql-scalars` | `x-graphql-scalar` | ⚠️ Renamed |
| `x-graphql-shareable` | `x-graphql-federation-shareable` | ⚠️ Moved to federation namespace |
| `x-graphql-keys` | `x-graphql-federation-keys` | ⚠️ Moved to federation namespace |
| `x-graphql-requires` | `x-graphql-federation-requires` | ⚠️ Moved to federation namespace |
| `x-graphql-provides` | `x-graphql-federation-provides` | ⚠️ Moved to federation namespace |
| `x-graphql-external` | `x-graphql-federation-external` | ⚠️ Moved to federation namespace |
| `x-graphql-override-from` | `x-graphql-federation-override-from` | ⚠️ Moved to federation namespace |
| `x-graphql-type` (string) | `x-graphql-type-name` | ⚠️ Renamed for clarity |
| `x-graphql-type` (object) | `x-graphql-type-name` + `x-graphql-type-kind` | ⚠️ Split into two attributes |

### 2. Federation Namespace Consolidation

**Before (v1.x)**:
```json
{
  "type": "object",
  "x-graphql-type-name": "Product",
  "x-graphql-keys": ["id"],
  "x-graphql-shareable": true,
  "properties": {
    "inventory": {
      "type": "integer",
      "x-graphql-external": true
    }
  }
}
```

**After (v2.0)**:
```json
{
  "type": "object",
  "x-graphql-type-name": "Product",
  "x-graphql-federation-keys": ["id"],
  "x-graphql-federation-shareable": true,
  "properties": {
    "inventory": {
      "type": "integer",
      "x-graphql-federation-external": true
    }
  }
}
```

### 3. Description Handling

**Before (v1.x)** - Description always used from JSON Schema:
```json
{
  "type": "object",
  "description": "This is used in both JSON Schema validation and GraphQL"
}
```

**After (v2.0)** - Separate GraphQL-specific descriptions:
```json
{
  "type": "object",
  "description": "Internal JSON Schema documentation",
  "x-graphql-description": "Public GraphQL API documentation"
}
```

**Note**: If `x-graphql-description` is not present, `description` is still used (backward compatible).

### 4. Type Attribute Split

**Before (v1.x)**:
```json
{
  "x-graphql-type": {
    "name": "User",
    "kind": "INTERFACE"
  }
}
```

**After (v2.0)**:
```json
{
  "x-graphql-type-name": "User",
  "x-graphql-type-kind": "INTERFACE"
}
```

### 5. Scalar Naming

**Before (v1.x)**:
```json
{
  "definitions": {
    "CustomScalars": {
      "x-graphql-scalars": {
        "DateTime": "...",
        "Email": "..."
      }
    }
  }
}
```

**After (v2.0)**:
```json
{
  "definitions": {
    "DateTime": {
      "type": "string",
      "format": "date-time",
      "x-graphql-scalar": {
        "name": "DateTime",
        "description": "ISO 8601 date-time"
      }
    }
  }
}
```

---

## Migration Paths

### Path A: Automated Migration (Recommended)

Best for:
- Large schema repositories
- Consistent v1.x usage
- Teams with CI/CD pipelines

**Steps**:
1. Install migration tool
2. Run migration script
3. Review and commit changes
4. Validate with test suite

**Estimated Time**: 1-2 hours for 100+ schemas

### Path B: Manual Migration

Best for:
- Small number of schemas (<10)
- Custom/non-standard attributes
- Learning v2.0 conventions

**Steps**:
1. Read breaking changes
2. Update schemas manually
3. Use validation tool
4. Test conversions

**Estimated Time**: 30 minutes per schema

### Path C: Hybrid Migration

Best for:
- Mix of standard and custom schemas
- Complex federation setups
- Gradual rollout

**Steps**:
1. Run automated migration for bulk schemas
2. Manually fix edge cases
3. Validate all schemas
4. Deploy in stages

**Estimated Time**: 2-4 hours total

---

## Automated Migration

### Installation

**Node.js**:
```bash
npm install -g json-schema-x-graphql@2.0.0
# or
npx json-schema-x-graphql@2.0.0 migrate
```

**Standalone Script**:
```bash
curl -O https://raw.githubusercontent.com/JJediny/json-schema-x-graphql/main/scripts/migrate-to-v2.sh
chmod +x migrate-to-v2.sh
```

### Basic Usage

**Migrate Single File**:
```bash
json-schema-x-graphql migrate --input schema.json --output schema.v2.json
```

**Migrate Directory**:
```bash
json-schema-x-graphql migrate --input ./schemas --output ./schemas-v2 --recursive
```

**In-Place Migration** (⚠️ overwrites files):
```bash
json-schema-x-graphql migrate --input ./schemas --in-place --backup
```

### Migration Script Options

```bash
json-schema-x-graphql migrate [options]

Options:
  -i, --input <path>        Input file or directory
  -o, --output <path>       Output file or directory
  -r, --recursive           Process subdirectories
  --in-place                Overwrite input files
  --backup                  Create .bak backup before in-place
  --dry-run                 Show changes without writing
  --report <path>           Generate migration report
  --strict                  Fail on any warnings
  --federation-only         Only migrate federation attributes
  --verbose                 Detailed logging
```

### Example: Dry Run

```bash
json-schema-x-graphql migrate \
  --input ./schemas \
  --dry-run \
  --report migration-report.json \
  --verbose
```

**Output**:
```
Analyzing schemas...
Found 42 schemas to migrate

Changes Summary:
  - x-graphql-keys → x-graphql-federation-keys: 23 occurrences
  - x-graphql-shareable → x-graphql-federation-shareable: 15 occurrences
  - x-graphql-type (object) → x-graphql-type-name + x-graphql-type-kind: 8 occurrences
  - x-graphql-external → x-graphql-federation-external: 12 occurrences

Warnings:
  - schema-a.json: Custom attribute 'x-graphql-custom-directive' not migrated (manual review needed)
  - schema-b.json: Ambiguous 'x-graphql-type' value (manual review needed)

No files modified (dry run mode).
Report saved to: migration-report.json
```

### Migration Report

The migration tool generates a JSON report:

```json
{
  "summary": {
    "totalSchemas": 42,
    "migratedSchemas": 40,
    "skippedSchemas": 2,
    "totalChanges": 58,
    "warnings": 2,
    "errors": 0
  },
  "changes": [
    {
      "file": "user-schema.json",
      "path": "$.x-graphql-keys",
      "change": "renamed",
      "from": "x-graphql-keys",
      "to": "x-graphql-federation-keys",
      "value": ["id"]
    }
  ],
  "warnings": [
    {
      "file": "schema-a.json",
      "message": "Custom attribute 'x-graphql-custom-directive' requires manual review",
      "path": "$.x-graphql-custom-directive"
    }
  ],
  "skipped": [
    {
      "file": "invalid-schema.json",
      "reason": "Not a valid JSON Schema"
    }
  ]
}
```

---

## Manual Migration

### Step-by-Step Checklist

#### Step 1: Update Federation Attributes

Search and replace in your schemas:

```bash
# macOS/Linux
find ./schemas -name "*.json" -type f -exec sed -i '' \
  's/"x-graphql-keys"/"x-graphql-federation-keys"/g' {} +
find ./schemas -name "*.json" -type f -exec sed -i '' \
  's/"x-graphql-shareable"/"x-graphql-federation-shareable"/g' {} +
find ./schemas -name "*.json" -type f -exec sed -i '' \
  's/"x-graphql-external"/"x-graphql-federation-external"/g' {} +
find ./schemas -name "*.json" -type f -exec sed -i '' \
  's/"x-graphql-requires"/"x-graphql-federation-requires"/g' {} +
find ./schemas -name "*.json" -type f -exec sed -i '' \
  's/"x-graphql-provides"/"x-graphql-federation-provides"/g' {} +
find ./schemas -name "*.json" -type f -exec sed -i '' \
  's/"x-graphql-override-from"/"x-graphql-federation-override-from"/g' {} +
```

#### Step 2: Split `x-graphql-type` Objects

**Find instances**:
```bash
grep -r "x-graphql-type.*{" ./schemas
```

**Manual conversion**:

Before:
```json
{
  "x-graphql-type": {
    "name": "User",
    "kind": "INTERFACE"
  }
}
```

After:
```json
{
  "x-graphql-type-name": "User",
  "x-graphql-type-kind": "INTERFACE"
}
```

#### Step 3: Rename `x-graphql-type` Strings

**Find instances**:
```bash
grep -r '"x-graphql-type":.*"[^{]' ./schemas
```

**Replace**:
```bash
# This is safe for string values only
sed -i 's/"x-graphql-type": "\([^"]*\)"/"x-graphql-type-name": "\1"/g' schema.json
```

#### Step 4: Update Scalar Definitions

**Before**:
```json
{
  "x-graphql-scalars": {
    "DateTime": "ISO 8601 date-time"
  }
}
```

**After**:
```json
{
  "definitions": {
    "DateTime": {
      "type": "string",
      "format": "date-time",
      "x-graphql-scalar": {
        "name": "DateTime",
        "description": "ISO 8601 date-time"
      }
    }
  }
}
```

#### Step 5: Add GraphQL-Specific Descriptions (Optional)

If you want different descriptions for GraphQL vs JSON Schema:

```json
{
  "type": "object",
  "description": "Internal: User database model",
  "x-graphql-description": "User account entity",
  "properties": {
    "id": {
      "type": "string",
      "description": "Internal: UUID primary key",
      "x-graphql-description": "Unique user identifier"
    }
  }
}
```

### Manual Migration Checklist

- [ ] Backup all schemas
- [ ] Update `x-graphql-keys` → `x-graphql-federation-keys`
- [ ] Update `x-graphql-shareable` → `x-graphql-federation-shareable`
- [ ] Update `x-graphql-external` → `x-graphql-federation-external`
- [ ] Update `x-graphql-requires` → `x-graphql-federation-requires`
- [ ] Update `x-graphql-provides` → `x-graphql-federation-provides`
- [ ] Update `x-graphql-override-from` → `x-graphql-federation-override-from`
- [ ] Split `x-graphql-type` objects into `x-graphql-type-name` + `x-graphql-type-kind`
- [ ] Rename `x-graphql-type` (string) → `x-graphql-type-name`
- [ ] Update `x-graphql-scalars` → individual `x-graphql-scalar` definitions
- [ ] Add `x-graphql-description` where needed (optional)
- [ ] Run validation tool
- [ ] Test conversions
- [ ] Update documentation/comments

---

## Validation

### Validate Migrated Schemas

**Node.js Validator**:
```bash
npm install -g json-schema-x-graphql@2.0.0
json-schema-x-graphql validate ./schemas/**/*.json
```

**Rust Validator**:
```bash
cargo install json-schema-x-graphql
json-schema-x-graphql validate ./schemas
```

**Validation Output**:
```
Validating 42 schemas...

✓ user-schema.json (34 x-graphql attributes)
✓ product-schema.json (28 x-graphql attributes)
✗ order-schema.json (2 errors, 1 warning)
  Error: Unknown attribute 'x-graphql-keys' at $.x-graphql-keys
         Did you mean 'x-graphql-federation-keys'?
  Error: Invalid value for 'x-graphql-type-kind' at $.x-graphql-type-kind
         Expected one of: OBJECT, INTERFACE, UNION, INPUT_OBJECT
  Warning: Deprecated attribute 'x-graphql-type' at $.x-graphql-type

Summary:
  Total: 42 schemas
  Valid: 40
  Invalid: 2
  Warnings: 1
```

### Test Conversions

**Convert and Compare**:
```bash
# Generate GraphQL SDL from migrated schemas
json-schema-x-graphql convert \
  --input ./schemas-v2 \
  --output ./sdl-output \
  --format graphql

# Validate SDL with GraphQL tools
graphql-schema-linter ./sdl-output/**/*.graphql
```

**Run Integration Tests**:
```bash
# Node.js
npm test

# Rust
cargo test

# Run shared test suite
./scripts/run-integration-tests.sh
```

---

## Troubleshooting

### Issue: Migration Script Fails

**Error**: `SyntaxError: Unexpected token in JSON`

**Solution**: Ensure all input files are valid JSON:
```bash
# Validate JSON before migration
find ./schemas -name "*.json" -exec jsonlint {} \;
```

---

### Issue: Unknown Attribute Warnings

**Warning**: `Unknown attribute 'x-graphql-custom-field'`

**Solution**: 
1. Check if it's a typo of a standard attribute
2. If custom, add to validator allow-list:
```json
{
  "validatorConfig": {
    "allowUnknownAttributes": true,
    "customAttributes": ["x-graphql-custom-field"]
  }
}
```

---

### Issue: Federation Directives Not Working

**Error**: `Unknown directive @key`

**Solution**: Ensure you're using Apollo Federation schema:
```javascript
// Node.js
import { buildSubgraphSchema } from '@apollo/subgraph';

const typeDefs = convertedSDL;
const schema = buildSubgraphSchema({ typeDefs });
```

**Rust**: Use `apollo-router-scaffold` or Apollo Federation Rust SDK.

---

### Issue: Type Name Conflicts

**Error**: `Type 'User' defined multiple times`

**Solution**: 
1. Use unique type names across schemas
2. Or use federation to extend types:
```json
{
  "x-graphql-type-name": "User",
  "x-graphql-federation-keys": "id",
  "x-graphql-extends": true
}
```

---

### Issue: Descriptions Not Appearing

**Problem**: Descriptions from JSON Schema not showing in GraphQL

**Solution**: Check description handling:
- v2.0 prefers `x-graphql-description` over `description`
- If `x-graphql-description` is empty, `description` is used
- Ensure descriptions are non-empty strings

---

### Issue: Circular References

**Error**: `Maximum call stack size exceeded`

**Solution**: Ensure `$ref` cycles are handled:
```json
{
  "definitions": {
    "Node": {
      "type": "object",
      "properties": {
        "parent": { "$ref": "#/definitions/Node" }
      }
    }
  }
}
```

This is valid and should work in v2.0. If it fails, file a bug report.

---

## Migration Examples

### Example 1: Simple Schema

**Before (v1.x)**:
```json
{
  "type": "object",
  "x-graphql-type": "User",
  "x-graphql-keys": "id",
  "properties": {
    "id": { "type": "string" },
    "email": { "type": "string" }
  }
}
```

**After (v2.0)**:
```json
{
  "type": "object",
  "x-graphql-type-name": "User",
  "x-graphql-federation-keys": "id",
  "properties": {
    "id": { "type": "string" },
    "email": { "type": "string" }
  }
}
```

---

### Example 2: Complex Federation Schema

**Before (v1.x)**:
```json
{
  "type": "object",
  "x-graphql-type": {
    "name": "Product",
    "kind": "OBJECT"
  },
  "x-graphql-keys": ["id", "sku"],
  "x-graphql-shareable": true,
  "properties": {
    "id": { "type": "string" },
    "sku": { "type": "string" },
    "inventory": {
      "type": "integer",
      "x-graphql-external": true
    },
    "seller": {
      "type": "string",
      "x-graphql-provides": "email name"
    },
    "price": {
      "type": "number",
      "x-graphql-requires": "inventory"
    }
  }
}
```

**After (v2.0)**:
```json
{
  "type": "object",
  "x-graphql-type-name": "Product",
  "x-graphql-type-kind": "OBJECT",
  "x-graphql-federation-keys": ["id", "sku"],
  "x-graphql-federation-shareable": true,
  "properties": {
    "id": { "type": "string" },
    "sku": { "type": "string" },
    "inventory": {
      "type": "integer",
      "x-graphql-federation-external": true
    },
    "seller": {
      "type": "string",
      "x-graphql-federation-provides": "email name"
    },
    "price": {
      "type": "number",
      "x-graphql-federation-requires": "inventory"
    }
  }
}
```

---

## Rollback Plan

If you need to roll back to v1.x:

### Option 1: Restore from Backup

```bash
# If you used --backup flag
find ./schemas -name "*.json.bak" -exec bash -c 'mv "$1" "${1%.bak}"' _ {} \;
```

### Option 2: Reverse Migration

```bash
# Install v1.x
npm install json-schema-x-graphql@1.x

# Run reverse migration (if available)
json-schema-x-graphql migrate --reverse --input ./schemas-v2 --output ./schemas-v1
```

### Option 3: Git Revert

```bash
git revert <migration-commit-hash>
```

---

## Support and Resources

### Getting Help

- **Documentation**: [X-GraphQL Docs](../x-graphql/README.md)
- **Issues**: [GitHub Issues](https://github.com/JJediny/json-schema-x-graphql/issues)
- **Discussions**: [GitHub Discussions](https://github.com/JJediny/json-schema-x-graphql/discussions)

### Additional Resources

- [Quick Start Guide](QUICK_START.md) - Get started with v2.0
- [Attribute Reference](ATTRIBUTE_REFERENCE.md) - Complete attribute catalog
- [Common Patterns](COMMON_PATTERNS.md) - Real-world examples
- [Implementation Plan](../plans/X-GRAPHQL-NAMESPACE-IMPLEMENTATION-PLAN.md) - Technical details

---

**Version**: 2.0.0  
**Last Updated**: January 2025  
**Status**: ✅ Complete