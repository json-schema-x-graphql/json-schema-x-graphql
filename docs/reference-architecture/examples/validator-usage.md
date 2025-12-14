# Validator Usage Examples

Status: Stable
Audience: Engineers working with Schema Unification Forest schema validation and parity checks

This page provides copy-paste runnable examples for the three validator scripts. It includes CLI usage, programmatic usage, and how these checks are wired into CI and coverage reporting.

- See also:
  - [Schema Tooling Reference](../schema-tooling-reference.md)
  - [System Mappings Guide](../system-mappings-guide.md)
  - [External Systems Reference](../external-systems-reference.md)

---

## Table of contents

- [Prerequisites](#prerequisites)
- [Validate JSON Schema with Ajv (validate-schema.mjs)](#validate-schema)
  - [CLI usage](#validate-schema-cli)
  - [Programmatic usage](#validate-schema-programmatic)
- [Validate GraphQL SDL and sample against JSON Schema (validate-graphql-vs-jsonschema.mjs)](#validate-graphql-vs-jsonschema)
  - [CLI usage](#validate-graphql-vs-jsonschema-cli)
  - [Programmatic usage (with and without sample)](#validate-graphql-vs-jsonschema-programmatic)
- [Name parity and strict sync (validate-schema-sync.mjs)](#validate-schema-sync)
  - [CLI usage](#validate-schema-sync-cli)
  - [Programmatic usage](#validate-schema-sync-programmatic)
  - [Strict config example](#validate-schema-sync-strict-config)
- [Testing and coverage](#testing-and-coverage)
- [CI behavior and failure conditions](#ci)

---

## Prerequisites

- Node 18+ (CI uses Node 22)
- pnpm installed
- From the repo root, install dependencies:
```bash
pnpm install
```

---

## Validate JSON Schema with Ajv (validate-schema.mjs)
<a id="validate-schema"></a>

Validates JSON documents against the canonical JSON Schema with Ajv (draft 2020-12 supported when available).

Script: `scripts/validate-schema.mjs`  
Export: `validateFiles({ schemaFile?, files? }?)`

### CLI usage
<a id="validate-schema-cli"></a>

Validate the canonical schema and any configured files:
```bash
pnpm run validate:schema
```

Validate a custom JSON against the canonical schema:
```bash
# Create a quick sample file (example)
cat > /tmp/sample.json <<'JSON'
{ "piid": "123", "award_amount": 1000 }
JSON

# Run the validator using the canonical schema
node scripts/validate-schema.mjs
```

Use a different schema (if you have a variant):
```bash
node -e "import { validateFiles } from './scripts/validate-schema.mjs'; \
  const results = validateFiles({ schemaFile: 'src/data/schema_unification.schema.json', files: [{ name: 'tmp', path: '/tmp/sample.json', validateSchema: true }]}); \
  console.log(results);"
```

### Programmatic usage
<a id="validate-schema-programmatic"></a>

Call the exported API directly:
```js
// file: examples/run-validate-schema.mjs
import { validateFiles } from '../../scripts/validate-schema.mjs';

const results = validateFiles({
  schemaFile: 'src/data/schema_unification.schema.json',
  files: [
    { name: 'schema_unification.schema.json', path: 'src/data/schema_unification.schema.json', validateSchema: true },
    // You can add more files here
  ],
});

console.log('Total errors:', results.totalErrors);
console.log('Per-file results:', results.fileResults);
```

Run it:
```bash
node docs/examples/run-validate-schema.mjs
```

---

## Validate GraphQL SDL and sample against JSON Schema (validate-graphql-vs-jsonschema.mjs)
<a id="validate-graphql-vs-jsonschema"></a>

Ensures GraphQL SDL parses/builds and optionally validates a GraphQL-like JSON sample against the JSON Schema.

Script: `scripts/validate-graphql-vs-jsonschema.mjs`  
Exports: `SchemaSyncManager`, `validateParity(graphqlSchemaSDL, jsonSchema, sampleData?)`

### CLI usage
<a id="validate-graphql-vs-jsonschema-cli"></a>

Check that the SDL builds:
```bash
pnpm run validate:graphql
```

Optionally validate a sample JSON payload against the canonical JSON Schema:
```bash
cat > /tmp/person.sample.json <<'JSON'
{
  "piid": "ABC-123",
  "vendorInfo": { "uei": "UEI123", "duns": "000000000", "vendor_name": "Acme LLC" },
  "award_amount": 5000
}
JSON

node scripts/validate-graphql-vs-jsonschema.mjs /tmp/person.sample.json
```

### Programmatic usage (with and without sample)
<a id="validate-graphql-vs-jsonschema-programmatic"></a>

```js
// file: examples/run-validate-graphql-vs-jsonschema.mjs
import fs from 'fs';
import path from 'path';
import { validateParity } from '../../scripts/validate-graphql-vs-jsonschema.mjs';

const sdlPath = 'src/data/schema_unification.graphql';
const schemaPath = 'src/data/schema_unification.schema.json';

const sdl = fs.readFileSync(sdlPath, 'utf8');
const jsonSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

// 1) SDL builds (no sample)
const res1 = validateParity(sdl, jsonSchema);
console.log('SDL builds:', res1.sdlBuilds, 'sampleValid:', res1.sampleValid);

// 2) SDL builds + sample passes
const sample = {
  piid: '001',
  award_amount: 1000
};
const res2 = validateParity(sdl, jsonSchema, sample);
console.log('SDL builds:', res2.sdlBuilds, 'sampleValid:', res2.sampleValid);
```

Run it:
```bash
node docs/examples/run-validate-graphql-vs-jsonschema.mjs
```

---

## Name parity and strict sync (validate-schema-sync.mjs)
<a id="validate-schema-sync"></a>

Performs a by-name parity check between GraphQL SDL field names and JSON Schema property keys. In strict mode, it also enforces a mapping file with JSON Pointers to assert specific relationships.

Script: `scripts/validate-schema-sync.mjs`  
Export: `compareSchemas(sdl, jsonSchema, { strict?, config?, repoRoot? }?)`

### CLI usage
<a id="validate-schema-sync-cli"></a>

Basic parity check:
```bash
pnpm run validate:sync
```

Strict parity check with mapping config (default path: `scripts/schema-sync.config.json`):
```bash
pnpm run validate:sync:strict
```

Use a custom config:
```bash
node scripts/validate-schema-sync.mjs --strict --config scripts/schema-sync.config.json
```

### Programmatic usage
<a id="validate-schema-sync-programmatic"></a>

```js
// file: examples/run-validate-schema-sync.mjs
import fs from 'fs';
import { compareSchemas } from '../../scripts/validate-schema-sync.mjs';

const sdl = fs.readFileSync('src/data/schema_unification.graphql', 'utf8');
const jsonSchema = JSON.parse(fs.readFileSync('src/data/schema_unification.schema.json', 'utf8'));

// Non-strict parity
const basic = compareSchemas(sdl, jsonSchema);
console.log('missingInJson:', basic.missingInJson);
console.log('missingInGraphQL:', basic.missingInGraphQL);
console.log('exitCode:', basic.exitCode);

// Strict parity with in-memory config object
const strictConfig = {
  types: {
    Contract: {
      fields: {
        piid: '/piid',
        vendorInfo: '/vendorInfo'
      }
    }
  }
};
const strict = compareSchemas(sdl, jsonSchema, { strict: true, config: strictConfig });
console.log('strictIssues:', strict.strictIssues);
console.log('exitCode:', strict.exitCode);
```

Run it:
```bash
node docs/examples/run-validate-schema-sync.mjs
```

### Strict config example
<a id="validate-schema-sync-strict-config"></a>

The strict config uses JSON Pointers (e.g., `/vendorInfo/uei`) to assert that a GraphQL field maps to a specific location in the JSON Schema.

```json
{
  "types": {
    "Contract": {
      "fields": {
        "piid": "/piid",
        "vendorInfo": "/vendorInfo",
        "placeOfPerformance": "/placeOfPerformance"
      }
    },
    "VendorInfo": {
      "fields": {
        "uei": "/vendorInfo/uei",
        "duns": "/vendorInfo/duns",
        "vendorName": "/vendorInfo/vendorName"
      }
    }
  }
}
```

Save as `scripts/schema-sync.config.json` and run:
```bash
node scripts/validate-schema-sync.mjs --strict --config scripts/schema-sync.config.json
```

---

## Testing and coverage
<a id="testing-and-coverage"></a>

- Run all tests with coverage summary:
```bash
pnpm run test:coverage
```

- Validator test suites included:
  - `__tests__/validators/validate-graphql-vs-jsonschema.test.mjs`
  - `__tests__/validators/validate-schema-sync.test.mjs`

Coverage is summarized in `coverage/coverage-summary.json` and appended to the job summary in CI.

---

## CI behavior and failure conditions
<a id="ci"></a>

The “Schema Validate and Generate” workflow enforces:

- Validation:
  - Runs all validators (Ajv JSON Schema, SDL build, name parity, strict parity).
- Generation:
  - Runs the interop pipeline to regenerate artifacts (e.g., `generated-schemas/schema_unification.from-graphql.json`).
- Diff enforcement:
  - Fails if expected generated artifacts are missing.
  - Fails if running generation leaves uncommitted changes (ensures generated files in the repo are in sync with the code).
- Coverage:
  - Publishes coverage artifacts, and appends a coverage summary to the job summary.

To fix a generation diff failure locally:
```bash
pnpm run generate:schema:interop
git status
git add -A
git commit -m "chore: update generated schema artifacts"
```

---

## Tips and troubleshooting

- If Ajv fails to compile the schema, check for unresolved `$ref` targets. Ensure `$defs` contain all internal references or add remote schemas to Ajv.
- For SDL parse/build errors, isolate the failing type or directive by temporarily removing sections and re-running the SDL check.
- For parity noise:
  - Exclude known non-mapping fields via code or update strict config to reflect intended relationships.
  - Focus on “critical” fields (`piid`, `vendorInfo`, `placeOfPerformance`) first—they gate the exit code intentionally.