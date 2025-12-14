> **⚠️ ARCHIVED DOCUMENTATION**
>
> This document has been archived and is preserved for historical reference only.
>
> **See instead:**
> - [Quick Start Guide](../../quick-start.md)
> - [Schema Pipeline Guide](../../schema-pipeline-guide.md)
> - [Schema Tooling Reference](../../schema-tooling-reference.md)
> - [System Mappings Guide](../../system-mappings-guide.md)
> - [Validator Usage Examples](../../examples/validator-usage.md)
> - [Docs Index](../../README.md)
>
> **Archived:** 2025  
> **Reason:** Consolidated into comprehensive guides; superseded by current docs
>
# Quick Implementation Guide

**Quick reference for implementing scripts audit and docs consolidation**

---

## 🚀 Getting Started

### Prerequisites
```bash
# Node.js
nvm use --lts
npm install -g pnpm
pnpm install

# Python
uv venv
source .venv/bin/activate
uv pip install -e ".[dev]"
```

---

## 📋 Overview

Two major initiatives in parallel:
1. **Scripts Audit** — Convert scripts to testable modules (~5 weeks)
2. **Docs Consolidation** — Reduce docs from 38 to ~15 files (~5 weeks)

**Detailed Plans:**
- [`scripts/audit/scripts-audit.md`](scripts/audit/scripts-audit.md)
- [`docs/audit/docs-consolidation-plan.md`](docs/audit/docs-consolidation-plan.md)
- [`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md)

---

## 🔥 Priority 1: Fix Blocker (Week 1)

### Issue
`generate-graphql-json-schema.mjs` has function signature mismatch

**File:** `scripts/generate-graphql-json-schema.mjs`

**Problem:**
- Function expects 4 params
- CLI passes 5 params

**Action:**
```javascript
// Update signature to:
export async function generateFromSDL(sdlFilePath, outputPath, options = {}) {
  // Implementation
}
```

**Test:**
```bash
# After fix, verify:
node scripts/generate-graphql-json-schema.mjs src/data/schema_unification.graphql generated-schemas/test.json
```

---

## 🛠️ Scripts Implementation Checklist

### Phase 1: Core Generators (Week 1-2)

#### ✅ Done
- [x] Canonical schema in snake_case at `src/data/schema_unification.schema.json`
- [x] Scripts write to both `generated-schemas/` and `src/data/generated/`
- [x] CI workflow updated

#### 🔄 In Progress
- [ ] Fix `generate-graphql-json-schema.mjs` signature ⚠️ **BLOCKING**
- [ ] Add exports and tests for 4 core generators

#### ⏸️ TODO
```
1. generate-graphql-from-json-schema.mjs
   - ✓ Already has exports
   - ✗ Needs tests: __tests__/scripts/generate-graphql-from-json-schema.test.mjs
   
2. generate-graphql-json-schema.mjs
   - ✗ Fix signature mismatch
   - ✗ Add exports
   - ✗ Needs tests: __tests__/scripts/generate-graphql-json-schema.test.mjs
   
3. generate-graphql-json-schema-v2.mjs
   - ✗ Add exports
   - ✗ Needs tests: __tests__/scripts/generate-graphql-json-schema-v2.test.mjs
   
4. generate-schema-interop.mjs
   - ✗ Add exports
   - ✗ Needs tests: __tests__/scripts/generate-schema-interop.test.mjs
```

### Phase 2: Validators (Week 2-3)
```
1. validate-schema.mjs → export validateSchema()
2. validate-graphql-vs-jsonschema.mjs → export validateParity()
3. validate-schema-sync.mjs → export compareSchemas()

All need tests in __tests__/scripts/
```

### Phase 3: Consolidation (Week 3-4)
```
1. Create scripts/lib/graphql-hints.mjs
2. Extract common x-graphql hint processing
3. Update 3 generators to use shared lib
4. Move dev tools to scripts/dev/
```

### Phase 4: Testing & Docs (Week 4-5)
```
1. Unit tests for all helpers
2. Update scripts/README.md
3. Create scripts/API.md
4. CI enhancements
```

---

## 📚 Docs Consolidation Checklist

### Current State
- **38 markdown files** (too many!)
- Significant overlap and redundancy
- Implementation logs mixed with user guides

### Target State
- **~15 core documents** (60% reduction)
- Clear hierarchy and purpose
- Historical content archived, not deleted

### Phase 1: Setup (Week 1)
```bash
# Create archive structure
mkdir -p docs/archived/{implementation-logs,v1-v2-migration,deprecated}

# Create READMEs
touch docs/archived/README.md
touch docs/archived/implementation-logs/README.md
touch docs/archived/v1-v2-migration/README.md
touch docs/archived/deprecated/README.md
```

### Phase 2: New Consolidated Guides (Week 2)

#### Create These Files:
```
1. docs/quick-start.md
   → 5-minute getting started guide
   
2. docs/schema-pipeline-guide.md
   → Consolidates: schema-pipeline.md, schemaManagement.md, migration-to-json-schema-canonical.md
   
3. docs/schema-v1-vs-v2-guide.md
   → Consolidates: V1-VS-V2-*.md files (4 files → 1)
```

### Phase 3: More Guides + Renames (Week 3)

#### Create:
```
4. docs/schema-tooling-reference.md
   → Consolidates: schema-tooling-alternatives.md, typeconv-evaluation-results.md
   
5. docs/system-mappings-guide.md
   → Consolidates: pertrified2contract_data.md, pertrified2legacy_procurement.md, pertrified2intake_process.md
   
6. docs/external-systems-reference.md
   → Consolidates: fiscal.treasury.gov.md, deltalake.md
```

#### Rename:
```bash
# Lowercase, consistent naming
git mv docs/PYTHON-VALIDATION-QUICK-START.md docs/python-validation-guide.md
git mv docs/SCHEMA-LINTING-GUIDE.md docs/schema-linting-guide.md
git mv docs/Reporting-Use-Case-Implementation-Guide.md docs/reporting-guide.md
git mv docs/BusinessPlan.md docs/business-plan.md
```

### Phase 4: Archive (Week 4)

#### Move Implementation Logs:
```bash
git mv docs/BENCHMARK-SETUP-COMPLETE.md docs/archived/implementation-logs/
git mv docs/GRAPHQL-CONVERTER-BUG-FIXES.md docs/archived/implementation-logs/
git mv docs/GRAPHQL-VOYAGER-PAGES.md docs/archived/implementation-logs/
git mv docs/MERMAID-DIAGRAM-PAGES-IMPLEMENTATION.md docs/archived/implementation-logs/
git mv docs/SCHEMA-RESTRUCTURING-SUCCESS.md docs/archived/implementation-logs/
git mv docs/VOYAGER-V2-HINTED-IMPLEMENTATION.md docs/archived/implementation-logs/
```

#### Move V1/V2 Migration:
```bash
git mv docs/V1-TO-V2-CONVERTER-RESULTS.md docs/archived/v1-v2-migration/
git mv docs/V2-GRAPHQL-ENHANCEMENT-SUMMARY.md docs/archived/v1-v2-migration/
git mv docs/schema_unification-v1-diagram.md docs/archived/v1-v2-migration/
```

#### Move Deprecated:
```bash
git mv docs/schema-todo.md docs/archived/deprecated/
git mv docs/GRAPHQL-SCHEMA-ANALYSIS-AND-STRATEGY.md docs/archived/deprecated/
git mv docs/graphql-extensions-guide.md docs/archived/deprecated/
git mv docs/transformationHistory.md docs/archived/deprecated/
```

#### Add ARCHIVED Notice Template:
```markdown
> **⚠️ ARCHIVED DOCUMENTATION**
> 
> This document has been archived and is preserved for historical reference only.
> 
> **See instead:** [Relevant Guide](../relevant-guide.md)
> 
> **Archived:** December 2024  
> **Reason:** Consolidated into comprehensive guide
```

### Phase 5: Polish (Week 5)
```
1. Review all new guides for accuracy
2. Verify all cross-references work (no broken links)
3. Update docs/README.md with new structure
4. Update navigation component
5. Get team feedback and approval
```

---

## 🧪 Testing Commands

### Run All Validators
```bash
# JavaScript validators
pnpm run validate:all

# Python validators
python python/validate_schemas.py src/data/*.schema.json

# Python tests
pytest python/tests/ -v
```

### Run Script Tests (after adding tests)
```bash
# All script tests
pnpm test:scripts

# Specific test file
jest __tests__/scripts/generate-graphql-from-json-schema.test.mjs

# With coverage
pnpm test:coverage
```

### Generate Schemas
```bash
# Full pipeline
pnpm run generate:schema:interop

# Individual generators
node scripts/generate-graphql-from-json-schema.mjs src/data/schema_unification.schema.json generated-schemas/schema_unification.sdl.graphql
```

---

## 📊 Progress Tracking

### Week 1 (Current)
- [ ] Fix blocker (function signature)
- [ ] Create test fixtures structure
- [ ] Create docs archive structure
- [ ] Review plan with team

### Week 2
- [ ] Complete Phase 1 generators (4 scripts)
- [ ] Write first 3 consolidated guides

### Week 3
- [ ] Complete Phase 2 validators (3 scripts)
- [ ] Write 3 more guides + rename existing

### Week 4
- [ ] Create shared GraphQL hints lib
- [ ] Archive all old docs

### Week 5
- [ ] Complete testing & documentation
- [ ] Final review and polish

---

## 🎯 Success Criteria

### Scripts
- ✅ All generators/validators export programmatic functions
- ✅ 80%+ test coverage for generators
- ✅ 90%+ test coverage for validators
- ✅ Complete JSDoc documentation
- ✅ CI runs tests on every PR

### Docs
- ✅ Reduced from 38 to ~15 core files (60% reduction)
- ✅ All implementation logs archived
- ✅ No broken links
- ✅ Consistent naming (lowercase-with-dashes)
- ✅ New developers start in <5 minutes

---

## 🆘 Need Help?

### Reference Documents
- **Detailed Plans:** See [`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md)
- **Scripts Audit:** See [`scripts/audit/scripts-audit.md`](scripts/audit/scripts-audit.md)
- **Docs Plan:** See [`docs/audit/docs-consolidation-plan.md`](docs/audit/docs-consolidation-plan.md)
- **Chatmode Instructions:** See [`.github/chatmodes/schema-unification-project.chatmode.md`](.github/chatmodes/schema-unification-project.chatmode.md)

### Common Issues
- **Generator errors?** Check snake_case vs camelCase in pointer paths
- **Tests failing?** Verify fixtures exist and paths are correct
- **Docs not building?** Check frontmatter YAML syntax
- **CI failing?** Run validators locally first

---

## 📝 Quick Reference

### File Locations
```
Scripts:
  Source: scripts/*.mjs
  Tests: __tests__/scripts/*.test.mjs
  Fixtures: __tests__/fixtures/
  Helpers: scripts/helpers/*.mjs
  Library: scripts/lib/*.mjs

Docs:
  Active: docs/*.md
  Archive: docs/archived/
  ADRs: docs/adr/
  Assets: docs/APIs/, docs/diagrams/

Schemas:
  Canonical: src/data/schema_unification.schema.json
  Generated: generated-schemas/, src/data/generated/
```

### Key Commands
```bash
# Install
pnpm install

# Generate
pnpm run generate:schema:interop

# Validate
pnpm run validate:all

# Test
pnpm test
pnpm test:scripts
pnpm test:coverage

# Dev
pnpm dev
pnpm build
```

---

**Last Updated:** December 2024  
**Status:** Week 1 - Planning Complete, Execution Starting