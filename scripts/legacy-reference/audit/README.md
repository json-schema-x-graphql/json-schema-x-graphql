# Scripts Audit Directory

This directory contains audit documentation and implementation plans for the Schema Unification Forest scripts infrastructure.

---

## Purpose

The scripts audit tracks the conversion of CLI-only scripts into testable, programmatic modules with comprehensive unit tests and documentation.

## Documents

### [`scripts-audit.md`](scripts-audit.md)

**Comprehensive audit and implementation plan for all scripts**

- Complete inventory of all scripts in `scripts/`
- Detailed action items for each script
- Phase-by-phase implementation roadmap
- Testing strategy and coverage goals
- JSDoc documentation requirements
- Status tracking for all scripts

**Use this document for:**

- Understanding what needs to be done for each script
- Tracking implementation progress
- Reference for testing standards
- API documentation guidelines

---

## Quick Overview

### Goal

Convert long-running CLI-only scripts into modules that:

1. Export programmatic functions for testing and reuse
2. Keep thin CLI wrappers for command-line usage
3. Have comprehensive unit tests (80%+ coverage for generators, 90%+ for validators)
4. Include complete JSDoc documentation

### Phases

**Phase 1: Core Generators (Weeks 1-2)**

- Fix blocking function signature issue
- Convert 4 core generator scripts
- Add unit tests for all generators

**Phase 2: Validators (Weeks 2-3)**

- Convert 3 validator scripts
- Add unit tests for all validators

**Phase 3: Consolidation (Weeks 3-4)**

- Extract common GraphQL hints logic
- Create shared library modules
- Consolidate duplicate code

**Phase 4: Testing & Documentation (Weeks 4-5)**

- Complete test coverage
- Full API documentation
- CI/CD enhancements

---

## Current Status

**Overall Progress:** 15% complete

**Phase 1:** 🔄 In Progress (1 blocker)

- ⚠️ **BLOCKER:** `generate-graphql-json-schema.mjs` function signature mismatch
- Must be resolved before proceeding

**Phases 2-4:** ⏸️ Not Started

---

## Key Changes Already Implemented

✅ Canonical schema is now snake_case at `src/data/schema_unification.schema.json`  
✅ All generator scripts updated to read canonical snake_case schema  
✅ Pointer resolution logic updated for snake_case keys  
✅ Generators write to both `generated-schemas/` and `src/data/generated/`  
✅ Legacy pages and archived files reorganized  
✅ One-off conversion scripts moved to `scripts/dev/`  
✅ CI workflow updated for schema generation and publishing

---

## Script Inventory Summary

### Generators (8 scripts)

- `generate-graphql-from-json-schema.mjs` — ✅ Updated, ❌ Needs tests
- `generate-graphql-json-schema.mjs` — ⚠️ Signature issue, ❌ Needs tests
- `generate-graphql-json-schema-v2.mjs` — 🔄 Needs review and tests
- `generate-graphql-enhanced.mjs` — 🔄 Consolidate, needs tests
- `generate-graphql-with-extensions.mjs` — 🔄 Consolidate, needs tests
- `generate-graphql-custom.mjs` — 🔄 Consolidate, needs tests
- `generate-schema-interop.mjs` — ✅ Working, ❌ Needs tests
- `generate-field-mapping.mjs` — ✅ Updated, ❌ Needs tests

### Validators (4 scripts)

- `validate-schema.mjs` — ✅ Updated, ❌ Needs exports and tests
- `validate-graphql-vs-jsonschema.mjs` — ✅ Updated, ❌ Needs exports and tests
- `validate-graphql-vs-jsonschema-v2.mjs` — ✅ Updated, ❌ Needs exports and tests
- `validate-schema-sync.mjs` — ✅ Updated, ❌ Needs exports and tests

### Helpers (5 modules)

- `helpers/case-conversion.mjs` — ✅ Working, ❌ Needs tests
- `helpers/format-json.mjs` — ✅ Working, ❌ Needs tests
- `generate-graphql-json-schema-helpers.mjs` — ✅ Working, ❌ Needs tests
- `field-mapping-helper.mjs` — ✅ Working, ❌ Needs tests
- `json-to-graphql.config.mjs` — ✅ Updated, ❌ Needs tests

### Status Legend

- ✅ Complete / Working correctly
- ⚠️ Blocking issue / Needs immediate fix
- 🔄 In progress / Needs work
- ❌ Not started / Missing

---

## Next Actions

### Week 1 (Current)

1. **🔴 HIGH:** Fix `generate-graphql-json-schema.mjs` function signature (BLOCKER)
2. **🟡 MEDIUM:** Create test fixtures directory structure
3. **🟡 MEDIUM:** Start converting `generate-graphql-from-json-schema.mjs`

### Week 2

1. Complete all Phase 1 generator conversions
2. Ensure all 4 core generators have unit tests
3. Validate pointer resolution with snake_case

---

## Testing Strategy

### Test Organization

```
__tests__/
├── scripts/           # Generator & validator tests
├── helpers/           # Helper module tests
├── lib/               # Shared library tests
└── fixtures/          # Test fixtures
    ├── schemas/       # JSON Schema fixtures
    └── sdl/           # GraphQL SDL fixtures
```

### Coverage Goals

- **Generators:** 80%+ coverage
- **Validators:** 90%+ coverage
- **Helpers:** 95%+ coverage

### Commands

```bash
pnpm test:scripts       # Run script tests
pnpm test:helpers       # Run helper tests
pnpm test:coverage      # Run with coverage report
```

---

## Documentation Standards

All exported functions must have JSDoc with:

1. Description of what the function does
2. `@param` tags for all parameters with types and descriptions
3. `@returns` tag with return type and description
4. `@throws` tag if function can throw errors
5. `@example` tag with usage example

Example:

```javascript
/**
 * Generate GraphQL SDL from JSON Schema with snake_case field support
 *
 * @param {string} inputPath - Path to input JSON Schema file
 * @param {string} outputPath - Path to output GraphQL SDL file
 * @param {object} options - Generation options
 * @param {string} [options.inputCase='snake_case'] - Input field case style
 * @param {boolean} [options.publishToGenerated=true] - Copy to src/data/generated/
 * @returns {Promise<{success: boolean, sdl: string, errors?: string[]}>}
 * @throws {Error} If input file doesn't exist or is invalid
 *
 * @example
 * const result = await generateFromJSONSchema(
 *   'src/data/schema_unification.schema.json',
 *   'generated-schemas/schema_unification.sdl.graphql'
 * );
 */
export async function generateFromJSONSchema(
  inputPath,
  outputPath,
  options = {},
) {
  // Implementation
}
```

---

## Related Documentation

- **Master Implementation Plan:** [`IMPLEMENTATION-PLAN.md`](../../IMPLEMENTATION-PLAN.md)
- **Quick Guide:** [`QUICK-IMPLEMENTATION-GUIDE.md`](../../QUICK-IMPLEMENTATION-GUIDE.md)
- **Docs Consolidation:** [`docs/audit/docs-consolidation-plan.md`](../../docs/audit/docs-consolidation-plan.md)
- **Chatmode Instructions:** [`.github/chatmodes/schema-unification-project.chatmode.md`](../../.github/chatmodes/schema-unification-project.chatmode.md)

---

## Contributing

When working on script conversions:

1. **Read the audit** — Understand the full context in `scripts-audit.md`
2. **Fix blockers first** — Address any blocking issues before adding features
3. **Add exports** — Make functions importable for testing
4. **Write tests** — Add comprehensive unit tests
5. **Document APIs** — Add complete JSDoc comments
6. **Update tracking** — Mark items complete in `scripts-audit.md`

---

**Last Updated:** December 2024  
**Next Review:** After Phase 1 completion
