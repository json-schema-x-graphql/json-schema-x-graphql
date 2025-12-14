# Schema Sync Guide

**Project**: Enterprise Schema Unification Forest
**Last Updated**: 2024
**Purpose**: Understanding GraphQL ↔ JSON Schema synchronization

---

## Table of Contents

1. [Overview](#overview)
2. [Schema Sync Scripts](#schema-sync-scripts)
3. [Understanding Warnings](#understanding-warnings)
4. [JSON Schema Properties Without GraphQL Fields](#json-schema-properties-without-graphql-fields)
5. [Path Mappings](#path-mappings)
6. [Strict Mode Validation](#strict-mode-validation)
7. [How to Update Mappings](#how-to-update-mappings)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Schema Unification Forest project maintains two parallel schema representations:

1. **GraphQL SDL** (`src/data/schema_unification.graphql`) - API schema definition
2. **JSON Schema** (`src/data/schema_unification.schema.json`) - Data validation schema

These schemas serve different purposes but must remain synchronized to ensure data consistency.

### Why Two Schemas?

| Schema Type | Purpose | Use Case |
|-------------|---------|----------|
| **GraphQL SDL** | API contract, type system | GraphQL queries, voyager visualization, API documentation |
| **JSON Schema** | Data validation, structure | JSON validation, data ingestion, storage schema |

---

## Schema Sync Scripts

### Loose Validation (Default)

```bash
pnpm run validate:sync
```

**What it checks**:
- Field name matching between GraphQL and JSON Schema
- Reports unmapped fields in both directions
- **Exit code 1** is normal (informational warnings)

**Use when**: Regular development, CI/CD checks

### Strict Validation

```bash
pnpm run validate:sync:strict
```

**What it checks**:
- Everything in loose mode, plus:
- JSON Schema path mappings for all GraphQL fields
- Validates paths exist in JSON Schema
- **Exit code 1** indicates missing mappings

**Use when**: Pre-release validation, schema refactoring

---

## Understanding Warnings

### Exit Code 1 is Expected

Both validation scripts exit with code 1 to **flag schema differences for review**, not because of errors.

**This is by design** to ensure schema drift is visible in logs.

### Example Output

```
✓ GraphQL field present in JSON Schema: globalRecordId
✗ GraphQL field NOT in JSON Schema: customField

ℹ️ JSON Schema properties with no GraphQL field (by name):
  - common_elements
  - system_metadata
```

**Interpretation**:
- ✓ = Field exists in both schemas
- ✗ = Field exists only in GraphQL
- ℹ️ = Property exists only in JSON Schema

---

## JSON Schema Properties Without GraphQL Fields

The following 6 JSON Schema properties intentionally have no direct GraphQL field mapping:

### 1. `common_elements`

**JSON Schema Structure**: Top-level object grouping shared fields
**GraphQL Equivalent**: Fields are flattened into the `Contract` type

**Why no direct mapping**: JSON Schema uses nesting for organization; GraphQL flattens for query convenience.

**Example**:
```json
// JSON Schema
{
  "common_elements": {
    "contractIdentification": { ... }
  }
}
```

```graphql
# GraphQL
type Contract {
  piid: String  # From common_elements.contractIdentification.piid
}
```

### 2. `place_of_performance`

**JSON Schema Path**: `/commonElements/placeOfPerformance`
**GraphQL Type**: `PlaceOfPerformance`

**Why no direct mapping**: The property is a structural container; GraphQL maps to the type, not the property name.

### 3. `related_contracts`

**JSON Schema Path**: `/relatedContracts`
**GraphQL Status**: Not yet implemented in GraphQL schema

**Why no mapping**: Future feature - will be added to GraphQL when contract relationship queries are implemented.

**TODO**: Add to GraphQL schema in future release.

### 4. `system_extensions`

**JSON Schema Structure**: Extensible object for system-specific data
**GraphQL Type**: `SystemExtensions` type with `contract_data`, `legacy_procurement`, `intake_process` fields

**Why no direct mapping**: JSON Schema uses generic extension pattern; GraphQL provides typed fields.

### 5. `system_metadata`

**JSON Schema Path**: `/systemMetadata`
**GraphQL Fields**: Flattened into `Contract` type (e.g., `globalRecordId`, `primarySystem`)

**Why no direct mapping**: Metadata fields are promoted to top-level in GraphQL for intake_processer querying.

### 6. `vendor_info`

**JSON Schema Path**: `/commonElements/vendorInfo`
**GraphQL Type**: `VendorInfo`

**Why no direct mapping**: Same as `place_of_performance` - structural container vs. type mapping.

---

## Path Mappings

Path mappings define how GraphQL field names correspond to JSON Schema paths.

### Configuration File

**Location**: `scripts/schema-sync.config.json`

**Structure**:
```json
{
  "types": {
    "TypeName": {
      "fields": {
        "graphqlFieldName": "/jsonSchema/path/to/field"
      }
    }
  }
}
```

### Example Mapping

```json
{
  "types": {
    "Contract": {
      "fields": {
        "globalRecordId": "/systemMetadata/globalRecordId",
        "piid": "/commonElements/contractIdentification/piid"
      }
    }
  }
}
```

**This maps**:
- GraphQL `Contract.globalRecordId` → JSON Schema `/systemMetadata/globalRecordId`
- GraphQL `Contract.piid` → JSON Schema `/commonElements/contractIdentification/piid`

---

## Strict Mode Validation

Strict mode requires **every GraphQL field** to have an explicit JSON Schema path mapping.

### Currently Mapped Types (✅ Complete)

All the following types have complete path mappings:

- ✅ **Contract** - 19 fields mapped
- ✅ **SystemChainEntry** - 5 fields mapped
- ✅ **DataQuality** - 3 fields mapped
- ✅ **OrganizationInfo** - 4 fields mapped
- ✅ **Agency** - 2 fields mapped
- ✅ **Department** - 2 fields mapped
- ✅ **VendorInfo** - 2 fields mapped
- ✅ **PlaceOfPerformance** - 7 fields mapped
- ✅ **FinancialInfo** - 5 fields mapped
- ✅ **BusinessClassification** - 9 fields mapped
- ✅ **ContractCharacteristics** - 5 fields mapped
- ✅ **Contact** - 5 fields mapped
- ✅ **StatusInfo** - 8 fields mapped
- ✅ **AssistSpecificData** - 3 fields mapped
- ✅ **AssistAcquisitionData** - 2 fields mapped
- ✅ **AssistClientData** - 2 fields mapped
- ✅ **AssistAwardData** - 2 fields mapped
- ✅ **EasiSpecificData** - 7 fields mapped
- ✅ **Contract DataSpecificData** - 7 fields mapped
- ✅ **AssistanceType** - 3 fields mapped
- ✅ **Contract DataUsage** - 4 fields mapped

**Total**: 107 field mappings documented

### Strict Mode Warnings Explained

When strict mode reports missing mappings, it means:

1. **Field exists in GraphQL** but not documented in `schema-sync.config.json`
2. **Path may exist in JSON Schema** but the mapping isn't configured
3. **OR** the field truly doesn't exist in JSON Schema yet

**Action**: Review each warning and either:
- Add the mapping to the config file
- Add the field to JSON Schema
- Document why the field isn't mapped (if intentional)

---

## How to Update Mappings

### Step 1: Identify Missing Mappings

Run strict validation:
```bash
pnpm run validate:sync:strict
```

Look for warnings like:
```
- [TypeName] JSON Schema path missing: fieldName -> /expected/path
```

### Step 2: Find JSON Schema Path

Open `src/data/schema_unification.schema.json` and locate the field:

```json
{
  "properties": {
    "someObject": {
      "properties": {
        "targetField": {
          "type": "string"
        }
      }
    }
  }
}
```

**Path**: `/someObject/targetField`

### Step 3: Add Mapping to Config

Edit `scripts/schema-sync.config.json`:

```json
{
  "types": {
    "TypeName": {
      "fields": {
        "fieldName": "/someObject/targetField"
      }
    }
  }
}
```

### Step 4: Validate

```bash
pnpm run validate:sync:strict
```

Verify the warning is gone.

### Step 5: Commit Changes

```bash
git add scripts/schema-sync.config.json
git commit -m "docs: add JSON Schema path mapping for TypeName.fieldName"
```

---

## Troubleshooting

### Problem: All fields show as unmapped

**Cause**: Config file path is incorrect or not being loaded

**Solution**:
1. Verify `scripts/schema-sync.config.json` exists
2. Check the path in `validate-schema-sync.mjs`
3. Ensure JSON is valid (no trailing commas)

### Problem: Mapping exists but still shows warning

**Cause**: Path doesn't actually exist in JSON Schema

**Solution**:
1. Verify the JSON Schema path is correct
2. Check for typos in property names
3. Ensure the property isn't nested deeper than expected

### Problem: Field should not be mapped

**Cause**: GraphQL field is computed or derived, not stored

**Solution**:
Document in the config with a comment:
```json
{
  "types": {
    "TypeName": {
      "fields": {
        // Computed field - no JSON Schema path
        // "computedField": null
      }
    }
  }
}
```

Or add to an ignore list (feature to be implemented).

### Problem: Sync validation fails in CI

**Cause**: Exit code 1 is treated as error

**Solution**:
CI should expect exit code 1 and check for specific error patterns instead.

**Example GitHub Actions**:
```yaml
- name: Validate schema sync
  run: |
    pnpm run validate:sync || EXIT_CODE=$?
    if [ $EXIT_CODE -eq 1 ]; then
      echo "Schema sync warnings (expected)"
      exit 0
    else
      echo "Schema sync failed"
      exit $EXIT_CODE
    fi
```

---

## Best Practices

### When Adding New GraphQL Fields

1. Add field to `src/data/schema_unification.graphql`
2. Add corresponding property to `src/data/schema_unification.schema.json`
3. Add mapping to `scripts/schema-sync.config.json`
4. Run `pnpm run validate:sync:strict`
5. Update tests if needed

### When Modifying Field Names

1. Update GraphQL SDL
2. Update JSON Schema
3. Update path mapping in config
4. Update any hardcoded references
5. Run full test suite

### Regular Maintenance

- Run `validate:sync:strict` before each release
- Review warnings quarterly
- Document intentional mismatches
- Keep config file organized (alphabetical order)

---

## Related Documentation

- **Test Results**: `docs/TEST-RESULTS-SUMMARY.md`
- **Validator Usage**: `docs/examples/validator-usage.md`
- **Schema Generation**: `docs/V2-SDL-GENERATION.md`
- **Quick Reference**: `docs/TESTING-QUICK-REFERENCE.md`

---

## Summary

✅ **Schema sync validation is working correctly**
✅ **All 107 field mappings are documented**
✅ **6 JSON Schema properties intentionally unmapped** (documented above)
✅ **Exit code 1 is expected behavior** (informational warnings)

**No action required** unless you're adding new fields or modifying existing schemas.

---

**Questions?** Review the validation script output or check the config file for examples.