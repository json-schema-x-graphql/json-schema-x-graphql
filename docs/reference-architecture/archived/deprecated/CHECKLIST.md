# Implementation Checklist

**Quick daily/weekly checklist for tracking progress**

Last Updated: December 2024

---

## 🔥 Week 1: Fix Blocker & Setup (Current)

### Critical (Must Complete This Week)

- [ ] **FIX BLOCKER:** `generate-graphql-json-schema.mjs` function signature
  - File: `scripts/generate-graphql-json-schema.mjs`
  - Issue: Function expects 4 params, CLI passes 5
  - Solution: Update to `generateFromSDL(sdlFilePath, outputPath, options = {})`
  - Test: Run script manually to verify fix

### High Priority

- [ ] Create test fixtures directory structure

  ```bash
  mkdir -p __tests__/{scripts,helpers,lib,fixtures/{schemas,sdl}}
  ```

- [ ] Create docs archive structure

  ```bash
  mkdir -p docs/archived/{implementation-logs,v1-v2-migration,deprecated}
  ```

- [ ] Create archive READMEs (4 files)
  - [ ] `docs/archived/README.md`
  - [ ] `docs/archived/implementation-logs/README.md`
  - [ ] `docs/archived/v1-v2-migration/README.md`
  - [ ] `docs/archived/deprecated/README.md`

### Medium Priority

- [ ] Review consolidation plan with team
- [ ] Get approval on archive strategy
- [ ] Start test file for `generate-graphql-from-json-schema.mjs`

### Daily Standup Questions

- Is the blocker resolved?
- Are test directories set up?
- Is archive structure ready?

---

## 📅 Week 2: Core Generators & First Guides

### Scripts: Complete Phase 1

- [ ] **Generator 1:** `generate-graphql-from-json-schema.mjs`
  - [ ] Verify exports exist
  - [ ] Add JSDoc documentation
  - [ ] Create test file: `__tests__/scripts/generate-graphql-from-json-schema.test.mjs`
  - [ ] Add 5+ test cases
  - [ ] Verify dual output (generated-schemas/ and src/data/generated/)

- [ ] **Generator 2:** `generate-graphql-json-schema.mjs`
  - [ ] Fix function signature (from Week 1)
  - [ ] Export `generateFromSDL()`
  - [ ] Add JSDoc documentation
  - [ ] Create test file
  - [ ] Add round-trip test (SDL → JSON → SDL)

- [ ] **Generator 3:** `generate-graphql-json-schema-v2.mjs`
  - [ ] Review implementation
  - [ ] Export `generateV2()`
  - [ ] Add JSDoc documentation
  - [ ] Create test file
  - [ ] Test x-graphql hints preservation

- [ ] **Generator 4:** `generate-schema-interop.mjs`
  - [ ] Export `runInteropGeneration()`
  - [ ] Add JSDoc documentation
  - [ ] Create test file
  - [ ] Test full pipeline

- [ ] **Pointer Resolution Tests**
  - [ ] Create test file: `__tests__/helpers/pointer-resolution.test.mjs`
  - [ ] Test snake_case pointers
  - [ ] Test nested objects
  - [ ] Test $ref handling

### Docs: Start Consolidated Guides

- [ ] **Write:** `docs/quick-start.md`
  - Prerequisites
  - Installation
  - First validation
  - Generate schemas
  - View in browser
  - Next steps

- [ ] **Write:** `docs/schema-pipeline-guide.md`
  - Consolidate: schema-pipeline.md, schemaManagement.md, migration-to-json-schema-canonical.md
  - Overview & architecture
  - Generation pipeline
  - Validation suite
  - Best practices
  - Troubleshooting

- [ ] **Write:** `docs/schema-v1-vs-v2-guide.md`
  - Consolidate: V1-VS-V2-\*.md files
  - Quick reference table
  - Detailed comparison
  - V2 diagram
  - Migration guide

### Week 2 Success Criteria

✅ All 4 core generators have tests  
✅ All tests passing  
✅ 3 consolidated guides written  
✅ No blockers for Week 3

---

## 📅 Week 3: Validators & More Guides

### Scripts: Complete Phase 2

- [ ] **Validator 1:** `validate-schema.mjs`
  - [ ] Export `validateSchema(schemaPath, options)`
  - [ ] Add JSDoc
  - [ ] Create test file
  - [ ] Test valid/invalid schemas

- [ ] **Validator 2:** `validate-graphql-vs-jsonschema.mjs`
  - [ ] Export `validateParity(graphqlPath, jsonSchemaPath, options)`
  - [ ] Add JSDoc
  - [ ] Create test file
  - [ ] Test matching/mismatched schemas

- [ ] **Validator 3:** `validate-schema-sync.mjs`
  - [ ] Export `compareSchemas(graphqlSchema, jsonSchema, options)`
  - [ ] Add JSDoc
  - [ ] Create test file
  - [ ] Test sync detection, strict mode

### Docs: More Consolidated Guides

- [ ] **Write:** `docs/schema-tooling-reference.md`
  - Consolidate: schema-tooling-alternatives.md, typeconv-evaluation-results.md
  - Current stack
  - Alternatives evaluated
  - Decision matrix

- [ ] **Write:** `docs/system-mappings-guide.md`
  - Consolidate: pertrified2contract_data.md, pertrified2legacy_procurement.md, pertrified2intake_process.md
  - Contract Data mappings
  - Legacy Procurement mappings
  - EASi mappings
  - Cross-system analysis

- [ ] **Write:** `docs/external-systems-reference.md`
  - Consolidate: fiscal.treasury.gov.md, deltalake.md
  - Treasury API
  - Delta Lake
  - Integration patterns

- [ ] **Rename existing guides to lowercase:**

  ```bash
  git mv docs/PYTHON-VALIDATION-QUICK-START.md docs/python-validation-guide.md
  git mv docs/SCHEMA-LINTING-GUIDE.md docs/schema-linting-guide.md
  git mv docs/Reporting-Use-Case-Implementation-Guide.md docs/reporting-guide.md
  git mv docs/BusinessPlan.md docs/business-plan.md
  ```

- [ ] Update all cross-references to renamed files

### Week 3 Success Criteria

✅ All 3 validators have tests  
✅ All tests passing  
✅ 3 more guides written  
✅ All guides use consistent naming

---

## 📅 Week 4: Consolidation & Archiving

### Scripts: Complete Phase 3

- [ ] **Create shared library:** `scripts/lib/graphql-hints.mjs`
  - [ ] Audit common code across 3 generators
  - [ ] Extract `processXGraphQLHints()`
  - [ ] Extract `buildSchemaWithExtensions()`
  - [ ] Extract `applyCustomDirectives()`
  - [ ] Add JSDoc to all exports
  - [ ] Create test file: `__tests__/lib/graphql-hints.test.mjs`

- [ ] **Update generators to use shared lib:**
  - [ ] Update `generate-graphql-enhanced.mjs`
  - [ ] Update `generate-graphql-with-extensions.mjs`
  - [ ] Update `generate-graphql-custom.mjs`
  - [ ] Remove duplicate code
  - [ ] Add integration tests

- [ ] **Move dev tools:**
  - [ ] Check if `map-missing-fields.mjs` exists → move to `scripts/dev/`
  - [ ] Check `test-core-types.mjs` → convert or move
  - [ ] Create `scripts/dev/README.md`

### Docs: Archive Old Files

- [ ] **Move implementation logs to archive:**

  ```bash
  git mv docs/BENCHMARK-SETUP-COMPLETE.md docs/archived/implementation-logs/
  git mv docs/GRAPHQL-CONVERTER-BUG-FIXES.md docs/archived/implementation-logs/
  git mv docs/GRAPHQL-VOYAGER-PAGES.md docs/archived/implementation-logs/
  git mv docs/MERMAID-DIAGRAM-PAGES-IMPLEMENTATION.md docs/archived/implementation-logs/
  git mv docs/SCHEMA-RESTRUCTURING-SUCCESS.md docs/archived/implementation-logs/
  git mv docs/VOYAGER-V2-HINTED-IMPLEMENTATION.md docs/archived/implementation-logs/
  ```

- [ ] **Move V1/V2 migration files:**

  ```bash
  git mv docs/V1-TO-V2-CONVERTER-RESULTS.md docs/archived/v1-v2-migration/
  git mv docs/V2-GRAPHQL-ENHANCEMENT-SUMMARY.md docs/archived/v1-v2-migration/
  git mv docs/schema_unification-v1-diagram.md docs/archived/v1-v2-migration/
  ```

- [ ] **Move deprecated files:**

  ```bash
  git mv docs/schema-todo.md docs/archived/deprecated/
  git mv docs/GRAPHQL-SCHEMA-ANALYSIS-AND-STRATEGY.md docs/archived/deprecated/
  git mv docs/graphql-extensions-guide.md docs/archived/deprecated/
  git mv docs/transformationHistory.md docs/archived/deprecated/
  ```

- [ ] **Add ARCHIVED notices** to all archived files

- [ ] **Update main README:** `docs/README.md`
  - [ ] New organization structure
  - [ ] Links to all active guides
  - [ ] Link to archive

- [ ] **Update navigation component** (if applicable)

- [ ] **Update copilot instructions**

### Week 4 Success Criteria

✅ Shared GraphQL hints library created  
✅ 3 generators using shared lib  
✅ 17 files moved to archive  
✅ All cross-references updated

---

## 📅 Week 5: Testing, Documentation, Polish

### Scripts: Complete Phase 4

- [ ] **Add unit tests for helpers:**
  - [ ] `helpers/case-conversion.mjs`
  - [ ] `helpers/format-json.mjs`
  - [ ] `generate-graphql-json-schema-helpers.mjs`
  - [ ] `field-mapping-helper.mjs`

- [ ] **Update documentation:**
  - [ ] Add JSDoc to all remaining exports
  - [ ] Update `scripts/README.md`:
    - List all programmatic APIs
    - Function signatures with examples
    - Common usage patterns
    - Testing guidelines
  - [ ] Create `scripts/API.md` (complete API reference)
  - [ ] Update copilot instructions with API examples

- [ ] **CI/CD enhancements:**
  - [ ] Add CI step: run unit tests for scripts
  - [ ] Add CI check: verify generated files are committed
  - [ ] Add CI step: verify no uncommitted changes after generation
  - [ ] Add CI step: test coverage reporting
  - [ ] Add README badge: test coverage

### Docs: Review and Polish

- [ ] **Content review:**
  - [ ] Review all consolidated guides for accuracy
  - [ ] Verify all cross-references work (no broken links)
  - [ ] Test all code examples
  - [ ] Check all frontmatter (valid YAML)

- [ ] **Team feedback:**
  - [ ] Share new structure with team
  - [ ] Collect feedback
  - [ ] Address requested changes
  - [ ] Get final approval

- [ ] **Final polish:**
  - [ ] Fix issues found in review
  - [ ] Final proofreading pass
  - [ ] Verify build succeeds (no warnings)
  - [ ] Update tracking documents

### Week 5 Success Criteria

✅ 80%+ test coverage for generators  
✅ 90%+ test coverage for validators  
✅ Complete API documentation  
✅ All docs reviewed and polished  
✅ Team approval received

---

## 🎯 Final Success Criteria

### Scripts Audit ✅

- [ ] All generators export programmatic functions
- [ ] All validators export programmatic functions
- [ ] 80%+ test coverage for generators
- [ ] 90%+ test coverage for validators
- [ ] Complete JSDoc documentation
- [ ] CI runs tests on every PR
- [ ] No remaining blockers

### Documentation Consolidation ✅

- [ ] Document count: 38 → ~15 (60% reduction)
- [ ] All implementation logs archived
- [ ] All redundancy eliminated
- [ ] Consistent naming (lowercase-with-dashes)
- [ ] No broken links
- [ ] New developers can start in <5 minutes
- [ ] Team approval received

---

## 📊 Quick Status Check

**Week 1:** ☐ Planning ☐ Setup ☐ Blocker Fixed  
**Week 2:** ☐ 4 Generators ☐ 3 Guides  
**Week 3:** ☐ 3 Validators ☐ 3 More Guides  
**Week 4:** ☐ Shared Lib ☐ Archive Complete  
**Week 5:** ☐ Testing ☐ Polish ☐ Approved

**Overall Progress:** \_\_% complete

---

## 🆘 Blockers / Issues

**Active Blockers:**

1. [BLOCKER] `generate-graphql-json-schema.mjs` function signature mismatch
   - Owner: \***\*\_\_\_\*\***
   - Status: \***\*\_\_\_\*\***
   - ETA: Week 1

**Resolved:**

- (None yet)

---

## 📝 Notes

_(Add daily notes, decisions, or important updates here)_

---

**Last Updated:** December 2024
