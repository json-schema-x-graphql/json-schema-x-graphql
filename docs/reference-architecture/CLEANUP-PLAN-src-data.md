# Source Data Directory Cleanup Plan

**Date:** December 4, 2025  
**Branch:** public_spending-reconciling-v2many

---

## Executive Summary

The `src/data/` directory contains legacy files that should be archived or removed, and auto-generated directories that should be documented as CI-managed.

## Current Single Source of Truth

**✅ JSON Schema with x-graphql-* annotations**
- `src/data/*.schema.json` files are canonical (snake_case)
- x-graphql-* extensions define GraphQL SDL generation rules
- Scripts generate SDL **from** JSON Schema (not vice versa)

---

## Files to Archive

### 1. `src/data/schema_unification.graphql`

**Status:** Legacy SDL file marked as "canonical" in old docs but superseded by x-graphql annotations

**Reason to Archive:**
- Not imported by any Next.js code (verified via grep)
- Not used as input by current generator scripts
- Documentation incorrectly calls it "canonical source"
- Real source: `schema_unification.schema.json` with x-graphql-* annotations

**Action:**
```bash
mv src/data/schema_unification.graphql src/data/archived/schema_unification.graphql.legacy
```

**Git Commit Message:**
```
chore: archive legacy schema_unification.graphql SDL file

x-graphql annotations in JSON Schema are now single source of truth.
This SDL file is no longer used by generators or imported by website.
```

---

## Directories to Remove

### 2. `src/data/supgraphs/`

**Current Contents:**
- `contract_data.graphql` (legacy SDL)
- `contract_data.schema.json` (duplicate of main contract_data.schema.json)

**Reason to Remove:**
- Superseded by `generated-schemas/` outputs
- Contract Data schema should live at `src/data/contract_data.schema.json` (canonical)
- Generated SDL should go to `generated-schemas/contract_data.subgraph.graphql`

**Action:**
```bash
# Check if contract_data.schema.json has any unique content first
diff src/data/supgraphs/contract_data.schema.json src/data/contract_data.schema.json

# If different, merge unique content to src/data/contract_data.schema.json
# Then remove the directory
rm -rf src/data/supgraphs/
```

**Git Commit Message:**
```
chore: remove superseded supgraphs directory

All subgraph SDL generation now happens in generated-schemas/.
Canonical schemas live at src/data/{system}.schema.json.
```

---

## Directories to Document (Not Remove)

### 3. `src/data/generated/`

**Status:** Auto-populated by CI workflows

**Purpose:** 
- Mirror of `generated-schemas/` for direct Next.js imports
- Allows website to import schemas without build-time copying

**CI Workflows That Populate It:**
- `.github/workflows/schema-validate-generate.yml` (lines 127-131)
- `.github/workflows/composition.yml` (line 59)
- Generator scripts with `--no-generated-copy=false` flag

**Action:** Document in README, do NOT manually edit or remove

**Add to `src/data/README.md`:**
```markdown
## Directory Structure

### Canonical Sources (Edit These)
- `*.schema.json` - JSON Schema with x-graphql-* annotations (snake_case)
- One file per system: `contract_data.schema.json`, `legacy_procurement.schema.json`, etc.

### Auto-Generated (Do Not Edit)
- `generated/` - Auto-populated by CI from `generated-schemas/`
- Provides direct imports for Next.js website
- Regenerated on every schema change

### Legacy Files (Archived)
- `archived/` - Historical schema versions for reference
```

---

## Documentation Updates

### 4. Update `docs/SCHEMA-ARCHITECTURE.md`

**Current Problem:** 
- Lines 18, 98, 122, 309 incorrectly label `schema_unification.graphql` as "CANONICAL"
- Diagram shows bidirectional flow (JSON ↔ SDL) when it's actually JSON → SDL only

**Correction:**
```markdown
## Source of Truth (Revised)

| File | Purpose | Status | Edit? |
|------|---------|--------|-------|
| `*.schema.json` | System schemas with x-graphql annotations | ✅ **CANONICAL** | ✅ Yes |
| `schema_unification.schema.json` | Unified supergraph schema | ✅ **CANONICAL** | ✅ Yes |
| `schema_unification.graphql` | Legacy SDL (archived) | ❌ **DEPRECATED** | ❌ No |

## Data Flow (Corrected)

```
Canonical JSON Schema (snake_case)
with x-graphql-* annotations
         ↓
  [Generator Scripts]
         ↓
Generated GraphQL SDL (camelCase)
         ↓
   CI Auto-Copy
         ↓
src/data/generated/ (website import)
```
```

---

## Validation Steps

After cleanup, verify:

1. **Schema generation still works:**
   ```bash
   pnpm run generate:schema:interop
   node scripts/generate-graphql-from-json-schema.mjs
   ```

2. **Validation passes:**
   ```bash
   pnpm run validate:all
   ```

3. **Website builds:**
   ```bash
   pnpm build
   ```

4. **No broken imports:**
   ```bash
   grep -r "schema_unification.graphql" src/
   grep -r "supgraphs" src/
   ```

---

## Execution Commands

```bash
# 1. Archive legacy SDL file
git mv src/data/schema_unification.graphql src/data/archived/schema_unification.graphql.legacy

# 2. Check for unique content in supgraphs
diff src/data/supgraphs/contract_data.schema.json src/data/contract_data.schema.json || echo "Files differ"

# 3. If identical, remove supgraphs directory
rm -rf src/data/supgraphs/

# 4. Document src/data/generated/ as CI-managed
echo "# Auto-Generated by CI - Do Not Edit" > src/data/generated/README.md
echo "This directory is automatically populated from generated-schemas/ by CI workflows." >> src/data/generated/README.md

# 5. Commit changes
git add -A
git commit -m "chore: archive legacy SDL files and document CI-managed directories

- Archived src/data/schema_unification.graphql (superseded by x-graphql annotations)
- Removed src/data/supgraphs/ (superseded by generated-schemas/)
- Documented src/data/generated/ as CI-managed (do not edit)"

# 6. Validate
pnpm run validate:all
pnpm build
```

---

## Migration Impact

**Breaking Changes:** None
- No code imports these files
- All generators read from JSON Schema
- CI workflows already use correct paths

**Documentation Updates Needed:**
- `docs/SCHEMA-ARCHITECTURE.md` - Remove schema_unification.graphql as canonical
- `docs/schema-pipeline-guide.md` - Update flow diagrams
- `README.md` - Clarify x-graphql as single source of truth

---

## Questions to Answer

- [x] Is `schema_unification.graphql` used anywhere? **No** (verified via grep)
- [x] Does `src/data/generated/` need manual management? **No** (CI auto-populates)
- [x] Are `supgraphs/` files referenced? **No** (legacy directory)
- [x] What's the single source of truth? **JSON Schema with x-graphql-* annotations**

---

## Post-Cleanup Architecture

```
src/data/
├── README.md                   ← Documents structure
├── schema_unification.schema.json       ← Canonical unified schema
├── contract_data.schema.json            ← Canonical Contract Data subgraph
├── legacy_procurement.schema.json          ← Canonical Legacy Procurement subgraph
├── intake_process.schema.json            ← Canonical EASi subgraph
├── logistics_mgmt.schema.json            ← Canonical Logistics Mgmt subgraph
├── public_spending.schema.json     ← Canonical Public Spending subgraph
├── archived/                   ← Historical versions
│   └── schema_unification.graphql.legacy
└── generated/                  ← CI auto-populated (do not edit)
    ├── README.md               ← "Auto-generated by CI"
    ├── *.subgraph.graphql
    └── schema_unification.supergraph.graphql
```

**Result:** Clean, documented, single source of truth architecture
