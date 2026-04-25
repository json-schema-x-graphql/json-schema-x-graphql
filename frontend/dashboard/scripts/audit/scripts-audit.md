# Scripts Audit — Schema Unification Forest

Generated: automatic audit of `scripts/` to decide which scripts should be archived, consolidated, or converted into programmatic helpers.

**Last Updated:** December 2024

---

## Table of Contents

1. [Summary](#summary)
2. [Recent Changes Implemented](#recent-changes-implemented)
3. [Implementation Roadmap](#implementation-roadmap)
4. [High Priority Actions](#high-priority-actions)
5. [Medium Priority Actions](#medium-priority-actions)
6. [Low Priority Actions](#low-priority-actions)
7. [Script Inventory](#script-inventory)
8. [Testing Strategy](#testing-strategy)
9. [Documentation Requirements](#documentation-requirements)

---

## Summary

### Goal

- Keep canonical JSON Schema in snake_case (`src/data/schema_unification.schema.json`)
- Ensure generator scripts run cleanly when executed as CLIs and when imported programmatically by tests
- Reduce code duplication and improve maintainability by extracting common logic into shared modules

### Action Plan

1. Convert long-running CLI-only scripts into modules that export programmatic functions (keep thin CLI wrappers)
2. Add unit tests for all generators and validators
3. Archive deprecated one-off scripts
4. Consolidate duplicate/similar functionality into shared helpers
5. Add comprehensive JSDoc documentation to all exported functions

---

## Recent Changes Implemented

1. ✅ **Canonical schema is now snake_case** at `src/data/schema_unification.schema.json`
2. ✅ **All generator scripts updated** to read from canonical snake_case schema
3. ✅ **Pointer resolution logic updated** to handle snake_case keys
4. ✅ **Generator scripts now write to both locations:**
   - `generated-schemas/` (canonical generated outputs, CI artifacts)
   - `src/data/generated/` (for Next.js to import directly)
5. ✅ **Legacy v1/v2 viewer pages moved** to `src/legacy-pages/`
6. ✅ **Archived files moved** to `src/data/archived/`
7. ✅ **One-off conversion scripts moved** to `scripts/dev/`
8. ✅ **CI workflow updated** to generate and publish schemas for website consumption

---

## Implementation Roadmap

### Phase 1: Core Generators (Week 1-2)

**Goal:** Convert core generator scripts to programmatic modules with unit tests

- [ ] `generate-graphql-from-json-schema.mjs`
- [ ] `generate-graphql-json-schema.mjs`
- [ ] `generate-graphql-json-schema-v2.mjs`
- [ ] `generate-schema-interop.mjs`

### Phase 2: Validators (Week 2-3)

**Goal:** Add programmatic exports and tests for all validators

- [ ] `validate-schema.mjs`
- [ ] `validate-graphql-vs-jsonschema.mjs`
- [ ] `validate-graphql-vs-jsonschema-v2.mjs`
- [ ] `validate-schema-sync.mjs`

### Phase 3: Consolidation (Week 3-4)

**Goal:** Consolidate duplicate logic and improve code reuse

- [ ] Extract common x-graphql hint processing
- [ ] Consolidate GraphQL generators
- [ ] Extract shared schema transformation logic
- [ ] Create `scripts/lib/` modules for shared code

### Phase 4: Testing & Documentation (Week 4-5)

**Goal:** Complete test coverage and documentation

- [ ] Add unit tests for all helper modules
- [ ] Add integration tests for generator pipelines
- [ ] Add JSDoc to all exported functions
- [ ] Update `scripts/README.md` with API documentation

---

## High Priority Actions

### Required for Clean CI/CD

#### 1. Fix `generate-graphql-json-schema.mjs` Function Signature

**Status:** ⚠️ BLOCKING

**Current Issue:**

- Function expects 4 params but CLI passes 5
- `generateFromSDL(sdlFilePath, jsonSchemaFilePath, outPath, inputCase, outputCase)`

**Action Items:**

- [ ] Review function signature and CLI invocation
- [ ] Update function to accept 5 parameters or adjust CLI to pass 4
- [ ] Add JSDoc documenting all parameters
- [ ] Add unit test verifying correct parameter handling

**Files to Modify:**

- `scripts/generate-graphql-json-schema.mjs`

---

#### 2. Convert Core Generators to Programmatic Modules

##### A. `generate-graphql-from-json-schema.mjs`

**Status:** ✅ PARTIALLY COMPLETE (exports exist, needs tests)

**Action Items:**

- [ ] Verify `generateFromJSONSchema()` is exported and documented
- [ ] Create test file: `__tests__/scripts/generate-graphql-from-json-schema.test.mjs`
- [ ] Add test fixtures in `__tests__/fixtures/`
- [ ] Test cases:
  - [ ] Valid JSON Schema → produces valid GraphQL SDL
  - [ ] Snake_case field names are handled correctly
  - [ ] Complex nested types are converted properly
  - [ ] Enum types are preserved
  - [ ] Custom scalars are mapped correctly
- [ ] Verify output files are written to both `generated-schemas/` and `src/data/generated/`

**Expected Function Signature:**

```javascript
/**
 * Generate GraphQL SDL from JSON Schema
 * @param {string} inputPath - Path to input JSON Schema file
 * @param {string} outputPath - Path to output GraphQL SDL file
 * @param {object} options - Generation options
 * @param {string} options.inputCase - Input case style (snake_case, camelCase)
 * @param {string} options.outputCase - Output case style (snake_case, camelCase)
 * @param {boolean} options.publishToGenerated - Copy to src/data/generated/
 * @returns {Promise<{success: boolean, sdl: string, errors?: string[]}>}
 */
export async function generateFromJSONSchema(inputPath, outputPath, options = {})
```

---

##### B. `generate-graphql-json-schema.mjs`

**Status:** ⚠️ NEEDS WORK (function signature mismatch)

**Action Items:**

- [ ] Fix function signature to match CLI invocation
- [ ] Export `generateFromSDL()` function
- [ ] Add JSDoc documentation
- [ ] Create test file: `__tests__/scripts/generate-graphql-json-schema.test.mjs`
- [ ] Test cases:
  - [ ] Valid GraphQL SDL → produces valid JSON Schema
  - [ ] Round-trip test (SDL → JSON → SDL produces equivalent schema)
  - [ ] Directives are preserved in x-graphql extensions
  - [ ] Interface and Union types handled correctly

**Expected Function Signature:**

```javascript
/**
 * Generate JSON Schema from GraphQL SDL
 * @param {string} sdlFilePath - Path to input GraphQL SDL file
 * @param {string} outputPath - Path to output JSON Schema file
 * @param {object} options - Generation options
 * @returns {Promise<{success: boolean, schema: object, errors?: string[]}>}
 */
export async function generateFromSDL(sdlFilePath, outputPath, options = {})
```

---

##### C. `generate-graphql-json-schema-v2.mjs`

**Status:** 🔄 NEEDS REVIEW

**Action Items:**

- [ ] Review current implementation
- [ ] Export `generateV2()` function
- [ ] Add JSDoc documentation
- [ ] Create test file: `__tests__/scripts/generate-graphql-json-schema-v2.test.mjs`
- [ ] Test cases:
  - [ ] V2 SDL with x-graphql hints → JSON Schema
  - [ ] All x-graphql-\* extensions are preserved
  - [ ] Custom directives handled correctly

---

##### D. `generate-schema-interop.mjs`

**Status:** ✅ WORKING (orchestration script)

**Action Items:**

- [ ] Export `runInteropGeneration()` function
- [ ] Add JSDoc documentation
- [ ] Create test file: `__tests__/scripts/generate-schema-interop.test.mjs`
- [ ] Test cases:
  - [ ] Full pipeline runs successfully
  - [ ] All expected output files are created
  - [ ] Files are copied to correct locations

---

#### 3. Validate Pointer Resolution with snake_case

**Status:** ✅ MOSTLY COMPLETE (needs test coverage)

**Action Items:**

- [ ] Create test file: `__tests__/helpers/pointer-resolution.test.mjs`
- [ ] Test cases:
  - [ ] Resolve pointer with snake_case segments
  - [ ] Resolve pointer with nested snake_case objects
  - [ ] Handle $ref pointers correctly
  - [ ] Error handling for invalid pointers
- [ ] Verify all configs use correct pointer syntax:
  - [ ] `json-to-graphql.config.mjs`
  - [ ] `schema-sync.config.json`
  - [ ] Any other config files with JSON pointers

---

## Medium Priority Actions

### Programmatic API Improvements

#### 4. Add Unit Tests for Validators

##### A. `validate-schema.mjs`

**Status:** 🔄 NEEDS EXPORTS

**Action Items:**

- [ ] Export `validateSchema(schemaPath)` function
- [ ] Add JSDoc documentation
- [ ] Create test file: `__tests__/scripts/validate-schema.test.mjs`
- [ ] Test fixtures:
  - [ ] Valid schema passes validation
  - [ ] Invalid schema (missing required fields) fails correctly
  - [ ] Invalid schema (wrong types) fails correctly
  - [ ] Schema with $ref pointers validates correctly

**Expected Function Signature:**

```javascript
/**
 * Validate JSON Schema file
 * @param {string} schemaPath - Path to JSON Schema file
 * @param {object} options - Validation options
 * @returns {Promise<{valid: boolean, errors?: object[]}>}
 */
export async function validateSchema(schemaPath, options = {})
```

---

##### B. `validate-graphql-vs-jsonschema.mjs`

**Status:** 🔄 NEEDS EXPORTS

**Action Items:**

- [ ] Export `validateParity(graphqlPath, jsonSchemaPath)` function
- [ ] Add JSDoc documentation
- [ ] Create test file: `__tests__/scripts/validate-graphql-vs-jsonschema.test.mjs`
- [ ] Test fixtures (small SDL/JSON pairs):
  - [ ] Matching schemas pass validation
  - [ ] Missing field in JSON Schema detected
  - [ ] Missing field in GraphQL SDL detected
  - [ ] Type mismatch detected

---

##### C. `validate-schema-sync.mjs`

**Status:** 🔄 NEEDS EXPORTS

**Action Items:**

- [ ] Export `compareSchemas(graphqlSchema, jsonSchema, options)` function
- [ ] Add JSDoc documentation
- [ ] Create test file: `__tests__/scripts/validate-schema-sync.test.mjs`
- [ ] Test cases:
  - [ ] Schemas in sync return success
  - [ ] Missing fields detected (both directions)
  - [ ] Type mismatches detected
  - [ ] Strict mode catches case differences

**Expected Function Signature:**

```javascript
/**
 * Compare GraphQL schema and JSON Schema for parity
 * @param {string|object} graphqlSchema - GraphQL schema (path or parsed schema)
 * @param {string|object} jsonSchema - JSON Schema (path or parsed schema)
 * @param {object} options - Comparison options
 * @param {boolean} options.strict - Enable strict mode (case-sensitive)
 * @returns {Promise<{inSync: boolean, differences: object[]}>}
 */
export async function compareSchemas(graphqlSchema, jsonSchema, options = {})
```

---

#### 5. Consolidate GraphQL Generators

**Status:** 🔄 IN PLANNING

**Current State:**

- Multiple similar generator scripts with duplicated logic
- Common x-graphql hint processing repeated across files
- Schema building helpers scattered across multiple files

**Scripts to Consolidate:**

- `generate-graphql-enhanced.mjs`
- `generate-graphql-with-extensions.mjs`
- `generate-graphql-custom.mjs`

**Action Items:**

- [ ] Audit common code across all three scripts
- [ ] Create `scripts/lib/graphql-hints.mjs` module
- [ ] Extract functions:
  - [ ] `processXGraphQLHints(schema)`
  - [ ] `buildSchemaWithExtensions(schema, hints)`
  - [ ] `applyCustomDirectives(schema, directives)`
- [ ] Update each generator to use shared lib
- [ ] Add unit tests for lib functions
- [ ] Create integration test for each generator

**Expected Structure:**

```javascript
// scripts/lib/graphql-hints.mjs

/**
 * Process x-graphql-* hints from JSON Schema
 */
export function processXGraphQLHints(schema) {}

/**
 * Build GraphQL schema with x-graphql extensions
 */
export function buildSchemaWithExtensions(schema, hints) {}

/**
 * Apply custom directives to schema
 */
export function applyCustomDirectives(schema, directives) {}
```

---

## Low Priority Actions

### Cleanup & Documentation

#### 6. Move Dev Tools to `scripts/dev/`

**Status:** ✅ PARTIALLY COMPLETE

**Completed:**

- ✅ `convert-camel-to-snake.mjs` moved to `scripts/dev/`

**Remaining:**

- [ ] Check if `map-missing-fields.mjs` exists and move to `scripts/dev/`
- [ ] Check if `test-core-types.mjs` should be moved or converted to test harness
- [ ] Create `scripts/dev/README.md` explaining purpose of dev tools

---

#### 7. Update Documentation

**Action Items:**

- [ ] Add JSDoc comments to all exported functions
- [ ] Update `scripts/README.md` with:
  - [ ] List of all programmatic APIs
  - [ ] Function signatures with examples
  - [ ] Common usage patterns
  - [ ] Testing guidelines
- [ ] Update `.github/copilot-instructions.md` with:
  - [ ] Examples of programmatic API usage
  - [ ] Testing conventions
  - [ ] Import patterns
- [ ] Create `scripts/API.md` with complete API reference

---

#### 8. CI/CD Enhancements

**Status:** ✅ PARTIALLY COMPLETE

**Completed:**

- ✅ CI generates schemas and publishes to `src/data/generated/`

**Remaining:**

- [ ] Add CI step to run unit tests for generator/validator scripts
- [ ] Add CI check that all generated files are committed
- [ ] Add CI step to verify no uncommitted changes after generation
- [ ] Add CI step for test coverage reporting
- [ ] Add badge to README showing test coverage

**Example CI Workflow Addition:**

```yaml
- name: Run script unit tests
  run: pnpm test:scripts

- name: Verify generated files are committed
  run: |
    git diff --exit-code generated-schemas/
    git diff --exit-code src/data/generated/
```

---

## Script Inventory

### Active Generator Scripts

| Script                                  | Status             | Priority | Needs Export | Needs Tests |
| --------------------------------------- | ------------------ | -------- | ------------ | ----------- |
| `generate-graphql-from-json-schema.mjs` | ✅ Updated         | HIGH     | ✅ Has       | ❌ Missing  |
| `generate-graphql-json-schema.mjs`      | ⚠️ Signature issue | HIGH     | ❌ Missing   | ❌ Missing  |
| `generate-graphql-json-schema-v2.mjs`   | 🔄 Review          | HIGH     | ❌ Missing   | ❌ Missing  |
| `generate-graphql-enhanced.mjs`         | 🔄 Consolidate     | MEDIUM   | ❌ Missing   | ❌ Missing  |
| `generate-graphql-with-extensions.mjs`  | 🔄 Consolidate     | MEDIUM   | ❌ Missing   | ❌ Missing  |
| `generate-graphql-custom.mjs`           | 🔄 Consolidate     | MEDIUM   | ❌ Missing   | ❌ Missing  |
| `generate-schema-interop.mjs`           | ✅ Working         | HIGH     | ❌ Missing   | ❌ Missing  |
| `generate-field-mapping.mjs`            | ✅ Updated         | MEDIUM   | ❌ Missing   | ❌ Missing  |

### Active Validator Scripts

| Script                                  | Status     | Priority | Needs Export | Needs Tests |
| --------------------------------------- | ---------- | -------- | ------------ | ----------- |
| `validate-schema.mjs`                   | ✅ Updated | HIGH     | ❌ Missing   | ❌ Missing  |
| `validate-graphql-vs-jsonschema.mjs`    | ✅ Updated | HIGH     | ❌ Missing   | ❌ Missing  |
| `validate-graphql-vs-jsonschema-v2.mjs` | ✅ Updated | MEDIUM   | ❌ Missing   | ❌ Missing  |
| `validate-schema-sync.mjs`              | ✅ Updated | HIGH     | ❌ Missing   | ❌ Missing  |

### Conversion/Transform Scripts

| Script                   | Status     | Priority | Notes                                          |
| ------------------------ | ---------- | -------- | ---------------------------------------------- |
| `convert-v1-to-v2.mjs`   | ✅ Updated | LOW      | Keep as CLI, extract lib if needed             |
| `restructure-schema.mjs` | ✅ Updated | LOW      | Archive after testing, extract transformations |

### Helper Modules

| Module                                     | Status     | Priority | Needs Tests |
| ------------------------------------------ | ---------- | -------- | ----------- |
| `helpers/case-conversion.mjs`              | ✅ Working | MEDIUM   | ❌ Missing  |
| `helpers/format-json.mjs`                  | ✅ Working | MEDIUM   | ❌ Missing  |
| `generate-graphql-json-schema-helpers.mjs` | ✅ Working | MEDIUM   | ❌ Missing  |
| `field-mapping-helper.mjs`                 | ✅ Working | MEDIUM   | ❌ Missing  |
| `json-to-graphql.config.mjs`               | ✅ Updated | MEDIUM   | ❌ Missing  |

### Development Tools

| Tool                         | Location       | Status                     |
| ---------------------------- | -------------- | -------------------------- |
| `convert-camel-to-snake.mjs` | `scripts/dev/` | ✅ Moved                   |
| `map-missing-fields.mjs`     | TBD            | 🔄 Check if exists         |
| `test-core-types.mjs`        | `scripts/`     | 🔄 Convert to test harness |

### Status Legend

- ✅ Complete / Working correctly
- ⚠️ Blocking issue / Needs immediate fix
- 🔄 In progress / Needs work
- ❌ Not started / Missing

---

## Testing Strategy

### Test Organization

```
__tests__/
├── scripts/                          # Generator & validator tests
│   ├── generate-graphql-from-json-schema.test.mjs
│   ├── generate-graphql-json-schema.test.mjs
│   ├── generate-graphql-json-schema-v2.test.mjs
│   ├── generate-schema-interop.test.mjs
│   ├── validate-schema.test.mjs
│   ├── validate-graphql-vs-jsonschema.test.mjs
│   └── validate-schema-sync.test.mjs
├── helpers/                          # Helper module tests
│   ├── case-conversion.test.mjs
│   ├── pointer-resolution.test.mjs
│   └── graphql-hints.test.mjs
├── lib/                              # Shared library tests
│   └── graphql-hints.test.mjs
└── fixtures/                         # Test fixtures
    ├── schemas/
    │   ├── simple.schema.json
    │   ├── complex.schema.json
    │   └── invalid.schema.json
    └── sdl/
        ├── simple.graphql
        ├── complex.graphql
        └── v2-hinted.graphql
```

### Test Coverage Goals

- **Generators:** 80%+ coverage
- **Validators:** 90%+ coverage
- **Helpers:** 95%+ coverage
- **Integration tests:** Cover full pipeline workflows

### Testing Commands

Add to `package.json`:

```json
{
  "scripts": {
    "test:scripts": "jest __tests__/scripts/",
    "test:helpers": "jest __tests__/helpers/",
    "test:lib": "jest __tests__/lib/",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch"
  }
}
```

---

## Documentation Requirements

### JSDoc Standards

All exported functions must have:

1. Description of what the function does
2. `@param` tags for all parameters with types and descriptions
3. `@returns` tag with return type and description
4. `@throws` tag if function can throw errors
5. `@example` tag with usage example

### Example JSDoc:

```javascript
/**
 * Generate GraphQL SDL from JSON Schema with snake_case field support
 *
 * @param {string} inputPath - Path to input JSON Schema file (must be valid JSON Schema draft-07)
 * @param {string} outputPath - Path to output GraphQL SDL file
 * @param {object} options - Generation options
 * @param {string} [options.inputCase='snake_case'] - Input field name case style
 * @param {string} [options.outputCase='snake_case'] - Output field name case style
 * @param {boolean} [options.publishToGenerated=true] - Copy output to src/data/generated/
 * @returns {Promise<GenerationResult>} Generation result with success status and SDL
 * @throws {Error} If input file doesn't exist or is invalid JSON Schema
 *
 * @example
 * const result = await generateFromJSONSchema(
 *   'src/data/schema_unification.schema.json',
 *   'generated-schemas/schema_unification.sdl.graphql',
 *   { publishToGenerated: true }
 * );
 * if (result.success) {
 *   console.log('Generated SDL:', result.sdl);
 * }
 *
 * @typedef {object} GenerationResult
 * @property {boolean} success - Whether generation succeeded
 * @property {string} sdl - Generated GraphQL SDL
 * @property {string[]} [errors] - Error messages if generation failed
 */
export async function generateFromJSONSchema(inputPath, outputPath, options = {}) {
  // Implementation
}
```

---

## Summary Checklist

### Phase 1: Core Generators (Week 1-2)

- [ ] Fix `generate-graphql-json-schema.mjs` function signature
- [ ] Add exports and tests for all 4 core generators
- [ ] Verify pointer resolution with snake_case

### Phase 2: Validators (Week 2-3)

- [ ] Add exports to all validators
- [ ] Create test files for all validators
- [ ] Add test fixtures

### Phase 3: Consolidation (Week 3-4)

- [ ] Create `scripts/lib/graphql-hints.mjs`
- [ ] Consolidate GraphQL generators
- [ ] Move dev tools to `scripts/dev/`

### Phase 4: Testing & Documentation (Week 4-5)

- [ ] Complete all unit tests
- [ ] Add integration tests
- [ ] Update all documentation
- [ ] Add CI test steps

---

## Appendix: Quick Script Inventory

Full list of scripts in `scripts/`:

**Generators:**

- `generate-graphql-from-json-schema.mjs`
- `generate-graphql-json-schema.mjs`
- `generate-graphql-json-schema-v2.mjs`
- `generate-graphql-enhanced.mjs`
- `generate-graphql-with-extensions.mjs`
- `generate-graphql-custom.mjs`
- `generate-schema-interop.mjs`
- `generate-field-mapping.mjs`
- `generate-schema_unification-introspection.mjs`

**Validators:**

- `validate-schema.js`
- `validate-schema.mjs`
- `validate-graphql-vs-jsonschema.mjs`
- `validate-graphql-vs-jsonschema-v2.mjs`
- `validate-schema-sync.mjs`

**Converters:**

- `convert-v1-to-v2.mjs`
- `restructure-schema.mjs`

**Helpers:**

- `generate-graphql-json-schema-helpers.mjs`
- `field-mapping-helper.mjs`
- `json-to-graphql.config.mjs`
- `helpers/case-conversion.mjs`
- `helpers/format-json.mjs`

**Utilities:**

- `coverage-summary-format.js`
- `extract-keycloak-cert.sh`
- `generate-self-signed-cert.sh`
- `omnigraph-generate.cjs`
- `test-core-types.mjs`

**Config:**

- `schema-sync.config.json`

---

**Last Updated:** December 2024  
**Next Review:** After Phase 1 completion
