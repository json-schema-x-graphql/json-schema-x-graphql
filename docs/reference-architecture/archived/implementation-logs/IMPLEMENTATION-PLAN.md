# Schema Unification Forest — Master Implementation Plan

> **⚠️ ARCHIVED DOCUMENTATION**
>
> This document has been archived and is preserved for historical reference only.
>
> **See instead:**
>
> - [Schema Tooling Reference](../../schema-tooling-reference.md)
> - [System Mappings Guide](../../system-mappings-guide.md)
> - [External Systems Reference](../../external-systems-reference.md)
> - [Docs Index](../../README.md)
>
> **Archived:** 2025  
> **Reason:** Consolidated into comprehensive guides and moved to docs/archived/implementation-logs/

**Last Updated:** December 2024  
**Status:** IN PROGRESS

---

## Overview

This document tracks the implementation of two major initiatives:

1. **Scripts Audit Implementation** — Convert scripts to programmatic modules with unit tests
2. **Documentation Consolidation** — Reduce and organize documentation from 38 to ~15 core files

Both initiatives are detailed in their respective audit documents:

- [`scripts/audit/scripts-audit.md`](scripts/audit/scripts-audit.md)
- [`docs/audit/docs-consolidation-plan.md`](docs/audit/docs-consolidation-plan.md)

---

## Table of Contents

1. [Quick Status Overview](#quick-status-overview)
2. [Scripts Implementation](#scripts-implementation)
3. [Documentation Consolidation](#documentation-consolidation)
4. [Weekly Milestones](#weekly-milestones)
5. [Dependencies and Blockers](#dependencies-and-blockers)
6. [Testing Strategy](#testing-strategy)
7. [Success Criteria](#success-criteria)

---

## Quick Status Overview

### Scripts Audit

- **Phase:** 1 of 4 (Core Generators)
- **Progress:** 15% complete
- **Blocking Issues:** 1 (function signature mismatch in `generate-graphql-json-schema.mjs`)
- **Next Action:** Fix signature mismatch, add exports and tests

### Documentation Consolidation

- **Phase:** 1 of 5 (Planning and Setup)
- **Progress:** 20% complete (plan created)
- **Next Action:** Create archive structure, write first consolidated guides

### Overall Health

- 🟡 **YELLOW** — Planning complete, execution starting, 1 blocker identified

---

## Scripts Implementation

### Phase 1: Core Generators (Weeks 1-2)

**Goal:** Convert 4 core generator scripts to programmatic modules with unit tests

#### 1.1 Fix `generate-graphql-json-schema.mjs` ⚠️ BLOCKING

- [ ] **Review function signature** — expects 4 params, CLI passes 5
- [ ] **Update function** — `generateFromSDL(sdlFilePath, outputPath, options = {})`
- [ ] **Add JSDoc** — document all parameters
- [ ] **Add unit test** — verify parameter handling
- [ ] **Test round-trip** — SDL → JSON → SDL

**Files to modify:**

- `scripts/generate-graphql-json-schema.mjs`

**Estimated effort:** 4 hours

---

#### 1.2 Convert `generate-graphql-from-json-schema.mjs`

- [ ] **Verify exports** — `generateFromJSONSchema()` is already exported
- [ ] **Add JSDoc** — complete documentation
- [ ] **Create test file** — `__tests__/scripts/generate-graphql-from-json-schema.test.mjs`
- [ ] **Add fixtures** — `__tests__/fixtures/schemas/simple.schema.json`
- [ ] **Test cases:**
  - [ ] Valid JSON Schema → valid GraphQL SDL
  - [ ] Snake_case fields handled correctly
  - [ ] Complex nested types converted
  - [ ] Enum types preserved
  - [ ] Custom scalars mapped
- [ ] **Verify dual output** — writes to `generated-schemas/` and `src/data/generated/`

**Estimated effort:** 6 hours

---

#### 1.3 Convert `generate-graphql-json-schema-v2.mjs`

- [ ] **Review implementation** — understand V2-specific logic
- [ ] **Export function** — `generateV2(sdlFilePath, outputPath, options = {})`
- [ ] **Add JSDoc** — complete documentation
- [ ] **Create test file** — `__tests__/scripts/generate-graphql-json-schema-v2.test.mjs`
- [ ] **Test cases:**
  - [ ] V2 SDL with x-graphql hints → JSON Schema
  - [ ] x-graphql-\* extensions preserved
  - [ ] Custom directives handled

**Estimated effort:** 6 hours

---

#### 1.4 Convert `generate-schema-interop.mjs`

- [ ] **Export function** — `runInteropGeneration(options = {})`
- [ ] **Add JSDoc** — complete documentation
- [ ] **Create test file** — `__tests__/scripts/generate-schema-interop.test.mjs`
- [ ] **Test cases:**
  - [ ] Full pipeline runs successfully
  - [ ] All expected output files created
  - [ ] Files copied to correct locations

**Estimated effort:** 4 hours

---

#### 1.5 Validate Pointer Resolution

- [ ] **Create test file** — `__tests__/helpers/pointer-resolution.test.mjs`
- [ ] **Test cases:**
  - [ ] Resolve snake_case pointer segments
  - [ ] Resolve nested snake_case objects
  - [ ] Handle $ref pointers
  - [ ] Error handling for invalid pointers
- [ ] **Audit configs:**
  - [ ] `json-to-graphql.config.mjs`
  - [ ] `schema-sync.config.json`

**Estimated effort:** 4 hours

---

### Phase 2: Validators (Weeks 2-3)

**Goal:** Add programmatic exports and tests for all validators

#### 2.1 Convert `validate-schema.mjs`

- [ ] **Export function** — `validateSchema(schemaPath, options = {})`
- [ ] **Add JSDoc** — complete documentation
- [ ] **Create test file** — `__tests__/scripts/validate-schema.test.mjs`
- [ ] **Test fixtures:**
  - [ ] Valid schema passes
  - [ ] Invalid schema (missing required) fails
  - [ ] Invalid schema (wrong types) fails
  - [ ] Schema with $ref validates

**Estimated effort:** 5 hours

---

#### 2.2 Convert `validate-graphql-vs-jsonschema.mjs`

- [ ] **Export function** — `validateParity(graphqlPath, jsonSchemaPath, options = {})`
- [ ] **Add JSDoc** — complete documentation
- [ ] **Create test file** — `__tests__/scripts/validate-graphql-vs-jsonschema.test.mjs`
- [ ] **Test fixtures:**
  - [ ] Matching schemas pass
  - [ ] Missing JSON field detected
  - [ ] Missing GraphQL field detected
  - [ ] Type mismatch detected

**Estimated effort:** 5 hours

---

#### 2.3 Convert `validate-schema-sync.mjs`

- [ ] **Export function** — `compareSchemas(graphqlSchema, jsonSchema, options = {})`
- [ ] **Add JSDoc** — complete documentation
- [ ] **Create test file** — `__tests__/scripts/validate-schema-sync.test.mjs`
- [ ] **Test cases:**
  - [ ] Schemas in sync return success
  - [ ] Missing fields detected (both directions)
  - [ ] Type mismatches detected
  - [ ] Strict mode catches case differences

**Estimated effort:** 5 hours

---

### Phase 3: Consolidation (Weeks 3-4)

**Goal:** Consolidate duplicate logic and improve code reuse

#### 3.1 Create `scripts/lib/graphql-hints.mjs`

- [ ] **Audit common code** — across enhanced/with-extensions/custom generators
- [ ] **Extract functions:**
  - [ ] `processXGraphQLHints(schema)`
  - [ ] `buildSchemaWithExtensions(schema, hints)`
  - [ ] `applyCustomDirectives(schema, directives)`
- [ ] **Add JSDoc** — complete documentation
- [ ] **Create test file** — `__tests__/lib/graphql-hints.test.mjs`
- [ ] **Update generators** — use shared lib

**Estimated effort:** 10 hours

---

#### 3.2 Update Generators to Use Shared Lib

- [ ] **Update `generate-graphql-enhanced.mjs`** — import and use lib
- [ ] **Update `generate-graphql-with-extensions.mjs`** — import and use lib
- [ ] **Update `generate-graphql-custom.mjs`** — import and use lib
- [ ] **Add integration tests** — for each generator
- [ ] **Remove duplicate code** — verify no functionality lost

**Estimated effort:** 8 hours

---

#### 3.3 Move Dev Tools

- [ ] **Check for `map-missing-fields.mjs`** — move to `scripts/dev/` if exists
- [ ] **Check `test-core-types.mjs`** — convert to test harness or move to dev
- [ ] **Create `scripts/dev/README.md`** — explain purpose of dev tools

**Estimated effort:** 2 hours

---

### Phase 4: Testing & Documentation (Weeks 4-5)

**Goal:** Complete test coverage and documentation

#### 4.1 Add Unit Tests for Helper Modules

- [ ] **`helpers/case-conversion.mjs`** — test camelCase ↔ snake_case
- [ ] **`helpers/format-json.mjs`** — test JSON formatting
- [ ] **`generate-graphql-json-schema-helpers.mjs`** — test all helpers
- [ ] **`field-mapping-helper.mjs`** — test field mapping utilities

**Estimated effort:** 8 hours

---

#### 4.2 Update Documentation

- [ ] **Add JSDoc to all exports** — complete coverage
- [ ] **Update `scripts/README.md`:**
  - [ ] List all programmatic APIs
  - [ ] Function signatures with examples
  - [ ] Common usage patterns
  - [ ] Testing guidelines
- [ ] **Create `scripts/API.md`** — complete API reference
- [ ] **Update copilot instructions** — programmatic API examples

**Estimated effort:** 6 hours

---

#### 4.3 CI/CD Enhancements

- [ ] **Add CI step** — run unit tests for scripts
- [ ] **Add CI check** — verify generated files are committed
- [ ] **Add CI step** — verify no uncommitted changes after generation
- [ ] **Add CI step** — test coverage reporting
- [ ] **Add README badge** — test coverage

**Estimated effort:** 4 hours

---

## Documentation Consolidation

### Phase 1: Planning and Setup (Week 1)

#### 1.1 Planning

- [x] **Create consolidation plan** — `docs/audit/docs-consolidation-plan.md`
- [ ] **Review plan with team** — get feedback and approval
- [ ] **Finalize approach** — confirm archive strategy

**Estimated effort:** 2 hours (mostly done)

---

#### 1.2 Setup Archive Structure

- [ ] **Create directories:**
  - [ ] `docs/archived/`
  - [ ] `docs/archived/implementation-logs/`
  - [ ] `docs/archived/v1-v2-migration/`
  - [ ] `docs/archived/deprecated/`
- [ ] **Create archive READMEs:**
  - [ ] `docs/archived/README.md`
  - [ ] `docs/archived/implementation-logs/README.md`
  - [ ] `docs/archived/v1-v2-migration/README.md`
  - [ ] `docs/archived/deprecated/README.md`

**Estimated effort:** 2 hours

---

### Phase 2: Create Consolidated Guides (Week 2)

#### 2.1 Quick Start Guide

- [ ] **Create `docs/quick-start.md`**
- [ ] **Content:**
  - [ ] Prerequisites check
  - [ ] Installation steps
  - [ ] First validation
  - [ ] Generate schemas
  - [ ] View in browser
  - [ ] Next steps

**Estimated effort:** 3 hours

---

#### 2.2 Schema Pipeline Guide

- [ ] **Create `docs/schema-pipeline-guide.md`**
- [ ] **Consolidate content from:**
  - [ ] `schema-pipeline.md`
  - [ ] `schemaManagement.md`
  - [ ] `migration-to-json-schema-canonical.md`
- [ ] **Content structure:**
  - [ ] Overview and architecture
  - [ ] Generation pipeline
  - [ ] Validation suite
  - [ ] Management best practices
  - [ ] Canonical schema approach
  - [ ] Troubleshooting

**Estimated effort:** 6 hours

---

#### 2.3 Schema V1 vs V2 Guide

- [ ] **Create `docs/schema-v1-vs-v2-guide.md`**
- [ ] **Consolidate content from:**
  - [ ] `V1-VS-V2-QUICK-REFERENCE.md`
  - [ ] `V1-VS-V2-SCHEMA-COMPARISON.md`
  - [ ] `schema_unification-v2-diagram.md`
- [ ] **Content structure:**
  - [ ] Quick reference table
  - [ ] Detailed comparison
  - [ ] V2 architecture diagram
  - [ ] Migration guide

**Estimated effort:** 5 hours

---

### Phase 3: More Consolidated Guides + Renames (Week 3)

#### 3.1 Schema Tooling Reference

- [ ] **Create `docs/schema-tooling-reference.md`**
- [ ] **Consolidate content from:**
  - [ ] `schema-tooling-alternatives.md`
  - [ ] `typeconv-evaluation-results.md`
- [ ] **Content structure:**
  - [ ] Current stack
  - [ ] Alternatives evaluated
  - [ ] Decision matrix
  - [ ] Future considerations

**Estimated effort:** 4 hours

---

#### 3.2 System Mappings Guide

- [ ] **Create `docs/system-mappings-guide.md`**
- [ ] **Consolidate content from:**
  - [ ] `pertrified2contract_data.md`
  - [ ] `pertrified2legacy_procurement.md`
  - [ ] `pertrified2intake_process.md`
- [ ] **Content structure:**
  - [ ] Overview
  - [ ] Contract Data mappings
  - [ ] Legacy Procurement mappings
  - [ ] EASi mappings
  - [ ] Cross-system analysis

**Estimated effort:** 5 hours

---

#### 3.3 External Systems Reference

- [ ] **Create `docs/external-systems-reference.md`**
- [ ] **Consolidate content from:**
  - [ ] `fiscal.treasury.gov.md`
  - [ ] `deltalake.md`
- [ ] **Content structure:**
  - [ ] Integration architecture
  - [ ] Treasury API
  - [ ] Delta Lake
  - [ ] Future integrations

**Estimated effort:** 3 hours

---

#### 3.4 Rename Existing Guides

- [ ] **Rename to lowercase:**
  - [ ] `PYTHON-VALIDATION-QUICK-START.md` → `python-validation-guide.md`
  - [ ] `SCHEMA-LINTING-GUIDE.md` → `schema-linting-guide.md`
  - [ ] `Reporting-Use-Case-Implementation-Guide.md` → `reporting-guide.md`
  - [ ] `BusinessPlan.md` → `business-plan.md`
- [ ] **Update cross-references** in all docs

**Estimated effort:** 2 hours

---

### Phase 4: Archive and Update References (Week 4)

#### 4.1 Move Files to Archive

- [ ] **Move implementation logs:**
  - [ ] `BENCHMARK-SETUP-COMPLETE.md`
  - [ ] `GRAPHQL-CONVERTER-BUG-FIXES.md`
  - [ ] `GRAPHQL-VOYAGER-PAGES.md`
  - [ ] `MERMAID-DIAGRAM-PAGES-IMPLEMENTATION.md`
  - [ ] `SCHEMA-RESTRUCTURING-SUCCESS.md`
  - [ ] `VOYAGER-V2-HINTED-IMPLEMENTATION.md`
- [ ] **Move V1/V2 migration files:**
  - [ ] `V1-TO-V2-CONVERTER-RESULTS.md`
  - [ ] `V2-GRAPHQL-ENHANCEMENT-SUMMARY.md`
  - [ ] `migration-to-json-schema-canonical.md`
  - [ ] `schema_unification-v1-diagram.md`
- [ ] **Move deprecated files:**
  - [ ] `schema-todo.md`
  - [ ] `GRAPHQL-SCHEMA-ANALYSIS-AND-STRATEGY.md`
  - [ ] `graphql-extensions-guide.md`
  - [ ] `transformationHistory.md`

**Estimated effort:** 2 hours

---

#### 4.2 Add ARCHIVED Notices

- [ ] **Add notice to top of each archived file:**

```markdown
> **⚠️ ARCHIVED DOCUMENTATION**
>
> This document has been archived and is preserved for historical reference only.
>
> **See instead:** [Relevant Current Guide](../relevant-guide.md)
>
> **Archived:** December 2024  
> **Reason:** [Brief reason]
```

**Estimated effort:** 1 hour

---

#### 4.3 Update Cross-References

- [ ] **Update `docs/README.md`:**
  - [ ] New organization structure
  - [ ] Links to all consolidated guides
  - [ ] Link to archive
- [ ] **Update navigation component** — `src/components/ViewerNavigation/index.tsx`
- [ ] **Update copilot instructions** — `.github/chatmodes/schema-unification-project.chatmode.md`
- [ ] **Update homepage links** — if applicable

**Estimated effort:** 3 hours

---

### Phase 5: Review and Polish (Week 5)

#### 5.1 Content Review

- [ ] **Review all consolidated guides** — accuracy and completeness
- [ ] **Verify all cross-references work** — no broken links
- [ ] **Test all code examples** — ensure they work
- [ ] **Check frontmatter** — all valid YAML

**Estimated effort:** 4 hours

---

#### 5.2 Team Feedback

- [ ] **Share with team** — get feedback on new structure
- [ ] **Address feedback** — make requested changes
- [ ] **Final approval** — from stakeholders

**Estimated effort:** 2 hours

---

#### 5.3 Final Polish

- [ ] **Fix any issues found** in review
- [ ] **Final proofreading pass** — spelling, grammar, formatting
- [ ] **Verify build succeeds** — no warnings or errors
- [ ] **Update this tracking doc** — mark complete

**Estimated effort:** 2 hours

---

## Weekly Milestones

### Week 1 (Dec 9-15, 2024)

**Focus:** Planning complete, fix blocking issue, start Phase 1

**Scripts:**

- [ ] Fix `generate-graphql-json-schema.mjs` signature (BLOCKER)
- [ ] Start `generate-graphql-from-json-schema.mjs` conversion
- [ ] Create test fixtures directory structure

**Docs:**

- [x] Complete consolidation plan
- [ ] Review plan with team
- [ ] Create archive structure

**Deliverables:**

- Blocker resolved
- Test infrastructure set up
- Archive structure ready

---

### Week 2 (Dec 16-22, 2024)

**Focus:** Complete Phase 1 generators, start consolidated guides

**Scripts:**

- [ ] Complete all Phase 1 generator conversions
- [ ] All 4 core generators have tests
- [ ] Pointer resolution validated

**Docs:**

- [ ] `quick-start.md` written
- [ ] `schema-pipeline-guide.md` written
- [ ] `schema-v1-vs-v2-guide.md` written

**Deliverables:**

- 4 generators fully tested
- 3 major guides consolidated

---

### Week 3 (Dec 23-29, 2024)

**Focus:** Validators and more consolidated guides

**Scripts:**

- [ ] Complete Phase 2 validator conversions
- [ ] All 3 validators have tests

**Docs:**

- [ ] `schema-tooling-reference.md` written
- [ ] `system-mappings-guide.md` written
- [ ] `external-systems-reference.md` written
- [ ] All guides renamed to lowercase

**Deliverables:**

- 3 validators fully tested
- 3 more guides consolidated
- Consistent naming across all docs

---

### Week 4 (Dec 30 - Jan 5, 2025)

**Focus:** Consolidation and archiving

**Scripts:**

- [ ] Create `scripts/lib/graphql-hints.mjs`
- [ ] Update 3 generators to use shared lib
- [ ] Move dev tools to `scripts/dev/`

**Docs:**

- [ ] Move all files to archive
- [ ] Add ARCHIVED notices
- [ ] Update all cross-references

**Deliverables:**

- Shared GraphQL hints library
- All outdated docs archived
- All references updated

---

### Week 5 (Jan 6-12, 2025)

**Focus:** Testing, documentation, final polish

**Scripts:**

- [ ] Unit tests for all helper modules
- [ ] Update `scripts/README.md` and create `scripts/API.md`
- [ ] CI enhancements complete

**Docs:**

- [ ] Content review complete
- [ ] Team feedback addressed
- [ ] Final polish complete

**Deliverables:**

- Complete test coverage
- Complete API documentation
- Polished, reviewed documentation

---

## Dependencies and Blockers

### Current Blockers

#### 🔴 HIGH PRIORITY

1. **`generate-graphql-json-schema.mjs` function signature mismatch**
   - **Impact:** Blocks Phase 1 progress
   - **Owner:** TBD
   - **ETA:** Week 1
   - **Mitigation:** Prioritize this fix in Week 1

### Dependencies

#### Scripts → Docs

- Archive strategy must be finalized before moving implementation logs
- New generator APIs should be documented in consolidated guides

#### Phase Dependencies

- **Scripts Phase 2** depends on Phase 1 (need test infrastructure)
- **Scripts Phase 3** depends on Phase 1 & 2 (need working exports)
- **Docs Phase 4** depends on Phase 2 & 3 (need content to reference)

---

## Testing Strategy

### Unit Tests

- **Location:** `__tests__/scripts/`, `__tests__/helpers/`, `__tests__/lib/`
- **Coverage goal:** 80%+ for generators, 90%+ for validators
- **Framework:** Jest (already in use)

### Integration Tests

- **Focus:** Full pipeline workflows
- **Example:** SDL → JSON → SDL round-trip
- **Location:** `__tests__/integration/`

### Test Fixtures

- **Location:** `__tests__/fixtures/`
- **Structure:**
  ```
  __tests__/fixtures/
  ├── schemas/
  │   ├── simple.schema.json
  │   ├── complex.schema.json
  │   └── invalid.schema.json
  └── sdl/
      ├── simple.graphql
      ├── complex.graphql
      └── v2-hinted.graphql
  ```

### CI Testing

- Run on every PR
- Require passing tests for merge
- Coverage reporting with badge

---

## Success Criteria

### Scripts Audit Success

- ✅ **All generators export programmatic functions**
- ✅ **All validators export programmatic functions**
- ✅ **80%+ test coverage** for generators
- ✅ **90%+ test coverage** for validators
- ✅ **Complete JSDoc documentation** for all exports
- ✅ **CI runs tests** on every PR
- ✅ **No blockers** remaining

### Documentation Consolidation Success

- ✅ **Document count reduced from 38 to ~15** (60% reduction)
- ✅ **All implementation logs archived** (with ARCHIVED notices)
- ✅ **All redundancy eliminated** (consolidated into single guides)
- ✅ **Consistent naming** (lowercase-with-dashes)
- ✅ **No broken links** (all cross-references work)
- ✅ **New developers can start in <5 minutes** (using quick-start)
- ✅ **Team approval** of new structure

### Overall Project Success

- ✅ **Both initiatives complete** within 5 weeks
- ✅ **No functionality lost** (all code works, all content preserved)
- ✅ **Maintenance burden reduced** (fewer files, better organization)
- ✅ **Developer experience improved** (better docs, testable APIs)
- ✅ **CI/CD enhanced** (automated testing and validation)

---

## Progress Tracking

**Last Updated:** December 2024

### Scripts Audit: 15% Complete

- Planning: ✅ Complete
- Phase 1: 🔄 In Progress (1 blocker)
- Phase 2: ⏸️ Not Started
- Phase 3: ⏸️ Not Started
- Phase 4: ⏸️ Not Started

### Documentation Consolidation: 20% Complete

- Planning: ✅ Complete
- Phase 1: 🔄 In Progress (setup needed)
- Phase 2: ⏸️ Not Started
- Phase 3: ⏸️ Not Started
- Phase 4: ⏸️ Not Started
- Phase 5: ⏸️ Not Started

### Overall: 17% Complete

- **Completed:** 2 of 9 phases
- **In Progress:** 2 of 9 phases
- **Not Started:** 5 of 9 phases
- **Estimated Completion:** End of Week 5 (Jan 12, 2025)

---

## Next Actions

### This Week (Week 1)

1. **🔴 HIGH:** Fix `generate-graphql-json-schema.mjs` function signature
2. **🟡 MEDIUM:** Create test fixtures directory
3. **🟡 MEDIUM:** Create docs archive structure
4. **🟡 MEDIUM:** Review consolidation plan with team
5. **🟢 LOW:** Set up CI for running script tests

### Next Week (Week 2)

1. Complete Phase 1 generator conversions
2. Write first 3 consolidated docs guides
3. Begin Phase 2 validator conversions

---

## Notes

- All time estimates are approximate and may need adjustment
- Blockers should be escalated immediately
- Weekly sync recommended to track progress
- Consider breaking large consolidations into smaller PRs for intake_processer review

---

**End of Implementation Plan**
