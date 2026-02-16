# Source Data Directory Cleanup Summary

**Date:** December 4, 2025  
**Branch:** public_spending-reconciling-v2many  
**Status:** ✅ Documentation Complete - Manual Git Commands Required

---

## What Was Done

### ✅ 1. Created Archive Marker for schema_unification.graphql

**File:** `src/data/archived/schema_unification.graphql.legacy`

- Added header explaining why file was archived
- Documented that x-graphql-\* annotations are now single source of truth
- Preserved reference to original content (truncated for space)

### ✅ 2. Created src/data/README.md

**File:** `src/data/README.md`

Comprehensive documentation including:

- Directory structure explanation
- Workflow diagrams
- Naming conventions (snake_case, camelCase, x-graphql-\*)
- When to use x-graphql-\* annotations
- Validation commands
- CI/CD integration details

### ✅ 3. Created src/data/generated/README.md

**File:** `src/data/generated/README.md`

- Clear warning: "Auto-Generated Directory - Do Not Edit"
- Lists CI workflows that populate it
- Workflow diagram
- Links to canonical sources

### ✅ 4. Created Removal Notice for supgraphs/

**File:** `src/data/supgraphs/REMOVED.md`

- Explains why directory is superseded
- Documents what was here (contract_data.graphql, contract_data.schema.json)
- Notes differences between legacy (242 lines) and current (720 lines)
- Points to new locations

### ✅ 5. Updated docs/SCHEMA-ARCHITECTURE.md

**Changes:**

- Removed `schema_unification.graphql` from canonical sources table
- Added `public_spending.schema.json` to sources table
- Updated data flow diagram to show actual reality (JSON → SDL, not bidirectional)
- Added `archived/` directory with legacy files
- Corrected "Website Consumption" to document CI auto-population

### ✅ 6. Created docs/CLEANUP-PLAN-src-data.md

**Complete cleanup plan with:**

- Executive summary
- Rationale for each change
- Git commands to execute
- Validation steps
- Migration impact assessment
- Post-cleanup architecture diagram

---

## What Needs Manual Execution

Since I don't have terminal access, you'll need to run these Git commands:

### Step 1: Move schema_unification.graphql to archived/

```bash
# The archived version already has a header - now move the original
git mv src/data/schema_unification.graphql src/data/archived/schema_unification.graphql.original

# Or if you want to append the full content to the .legacy file:
cat src/data/schema_unification.graphql >> src/data/archived/schema_unification.graphql.legacy
git rm src/data/schema_unification.graphql
```

### Step 2: Remove supgraphs/ directory

```bash
# The REMOVED.md file is now inside - commit it first as documentation
git add src/data/supgraphs/REMOVED.md
git commit -m "docs: add removal notice for legacy supgraphs directory"

# Then remove the actual schema files
git rm src/data/supgraphs/contract_data.graphql
git rm src/data/supgraphs/contract_data.schema.json

# Keep the REMOVED.md for historical reference, or remove entire directory:
# git rm -r src/data/supgraphs/
```

### Step 3: Commit all documentation

```bash
git add src/data/README.md
git add src/data/generated/README.md
git add src/data/archived/schema_unification.graphql.legacy
git add docs/SCHEMA-ARCHITECTURE.md
git add docs/CLEANUP-PLAN-src-data.md

git commit -m "docs: clarify source data architecture and archive legacy files

- Archived src/data/schema_unification.graphql (superseded by x-graphql annotations)
- Documented src/data/ directory structure and conventions
- Documented src/data/generated/ as CI-managed (do not edit)
- Added removal notice for src/data/supgraphs/ (superseded)
- Updated SCHEMA-ARCHITECTURE.md to reflect actual data flow
- Created comprehensive cleanup plan document

x-graphql-* annotations in JSON Schema are now single source of truth.
All GraphQL SDL is generated from JSON Schema, not manually edited."
```

### Step 4: Validate Everything Still Works

```bash
# Validate JSON Schemas
python python/validate_schemas.py src/data/*.schema.json

# Validate GraphQL generation
pnpm run validate:all

# Build website
pnpm build

# Check for broken imports
grep -r "schema_unification.graphql" src/pages/ || echo "✓ No broken imports"
grep -r "supgraphs" src/ || echo "✓ No supgraphs references"
```

---

## Files Created/Modified

### Created:

1. `src/data/README.md` - Complete directory documentation
2. `src/data/generated/README.md` - CI-managed warning
3. `src/data/archived/schema_unification.graphql.legacy` - Archived SDL with header
4. `src/data/supgraphs/REMOVED.md` - Removal notice
5. `docs/CLEANUP-PLAN-src-data.md` - Full cleanup plan

### Modified:

1. `docs/SCHEMA-ARCHITECTURE.md` - Updated to reflect reality

### To Be Removed (Manual):

1. `src/data/schema_unification.graphql` - Move to archived/
2. `src/data/supgraphs/contract_data.graphql` - Legacy SDL
3. `src/data/supgraphs/contract_data.schema.json` - Legacy schema

---

## Validation Checklist

After executing the Git commands:

- [ ] `src/data/schema_unification.graphql` moved to `archived/`
- [ ] `src/data/supgraphs/` directory removed (or marked with REMOVED.md)
- [ ] `pnpm run validate:all` passes
- [ ] `python python/validate_schemas.py src/data/*.schema.json` passes
- [ ] `pnpm build` succeeds
- [ ] No broken imports: `grep -r "schema_unification.graphql" src/pages/`
- [ ] No supgraphs refs: `grep -r "supgraphs" src/`

---

## Architecture After Cleanup

```
src/data/
├── README.md                   ✅ NEW - Documents structure
├── schema_unification.schema.json       ✅ Canonical unified schema
├── contract_data.schema.json            ✅ Canonical Contract Data subgraph (720 lines)
├── legacy_procurement.schema.json          ✅ Canonical Legacy Procurement subgraph
├── intake_process.schema.json            ✅ Canonical EASi subgraph
├── logistics_mgmt.schema.json            ✅ Canonical Logistics Mgmt subgraph
├── public_spending.schema.json     ✅ Canonical Public Spending subgraph
├── archived/                   ✅ Historical versions
│   └── schema_unification.graphql.legacy ✅ NEW - Archived SDL
└── generated/                  ✅ CI auto-populated
    ├── README.md               ✅ NEW - "Do not edit" warning
    ├── *.subgraph.graphql
    └── schema_unification.supergraph.graphql
```

**Result:** Clean, documented, single source of truth architecture ✨

---

## Key Takeaways

1. **JSON Schema with x-graphql-\* annotations** = Single source of truth
2. **All GraphQL SDL is generated**, not manually edited
3. **`src/data/generated/`** = CI-managed mirror (do not edit)
4. **Legacy files archived**, not deleted (Git history preserved)
5. **Documentation updated** to reflect actual architecture

---

## Next Steps

1. **Execute the Git commands above** (I can't run terminal commands)
2. **Run validation suite** to ensure nothing broke
3. **Optionally:** Update `README.md` at project root to link to `src/data/README.md`
4. **Optionally:** Add to PR description referencing this summary

Ready to execute? 🚀
