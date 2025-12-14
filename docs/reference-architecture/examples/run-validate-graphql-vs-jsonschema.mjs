#!/usr/bin/env node
/**
 * Example: Programmatic usage of validate-graphql-vs-jsonschema
 *
 * Usage (from repo root):
 *   node docs/examples/run-validate-graphql-vs-jsonschema.mjs [--sdl path/to/schema_unification.graphql] [--schema path/to/schema_unification.schema.json] [--sample path/to/sample.json]
 *
 * What it does:
 *   1) Loads the GraphQL SDL and the JSON Schema (defaults to src/data/*).
 *   2) Ensures the SDL parses/builds successfully.
 *   3) If a --sample file is provided, validates it against the JSON Schema.
 *
 * Exit codes:
 *   0 - SDL builds; sample either not provided or valid
 *   1 - SDL fails to parse/build
 *   2 - Sample provided but fails JSON Schema validation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateParity } from '../../scripts/validate-graphql-vs-jsonschema.mjs';

// Resolve repo root relative to this example script (docs/examples/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--sdl') args.sdl = argv[++i];
    else if (a === '--schema') args.schema = argv[++i];
    else if (a === '--sample') args.sample = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function usage() {
  console.log(`
Usage:
  node docs/examples/run-validate-graphql-vs-jsonschema.mjs [--sdl path/to/schema_unification.graphql] [--schema path/to/schema_unification.schema.json] [--sample path/to/sample.json]

Options:
  --sdl     Path to GraphQL SDL file (default: generated-schemas/schema_unification.supergraph.graphql)
  --schema  Path to JSON Schema file (default: src/data/schema_unification.schema.json)
  --sample  Optional path to a JSON sample to validate against the JSON Schema
  --help    Show this help
`);
}

function readFileUtf8(p) {
  return fs.readFileSync(p, 'utf8');
}

function readJson(p) {
  return JSON.parse(readFileUtf8(p));
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    process.exit(0);
  }

  const sdlPath = path.isAbsolute(args.sdl || '')
    ? args.sdl
    : path.join(repoRoot, args.sdl || 'generated-schemas/schema_unification.supergraph.graphql');

  const schemaPath = path.isAbsolute(args.schema || '')
    ? args.schema
    : path.join(repoRoot, args.schema || 'src/data/schema_unification.schema.json');

  if (!fs.existsSync(sdlPath)) {
    console.error(`❌ SDL file not found: ${sdlPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ JSON Schema file not found: ${schemaPath}`);
    process.exit(1);
  }

  const sdl = readFileUtf8(sdlPath);
  const jsonSchema = readJson(schemaPath);

  const samplePath =
    args.sample && !path.isAbsolute(args.sample)
      ? path.join(process.cwd(), args.sample)
      : args.sample || null;

  // 1) Ensure SDL parses/builds
  try {
    const result = validateParity(sdl, jsonSchema);
    if (result && result.sdlBuilds) {
      console.log('✅ GraphQL SDL parsed and schema built successfully.');
    } else {
      console.error('❌ SDL did not build successfully (unexpected state).');
      process.exit(1);
    }
  } catch (e) {
    console.error('❌ GraphQL SDL validation failed:');
    console.error(e?.message || e);
    process.exit(1);
  }

  // 2) Optionally validate a sample JSON payload
  if (samplePath) {
    if (!fs.existsSync(samplePath)) {
      console.error(`❌ Sample file not found: ${samplePath}`);
      process.exit(2);
    }
    let sampleData = null;
    try {
      sampleData = readJson(samplePath);
    } catch (e) {
      console.error(`❌ Failed to parse sample JSON: ${samplePath}`);
      console.error(e?.message || e);
      process.exit(2);
    }

    try {
      const result = validateParity(sdl, jsonSchema, sampleData);
      if (result && result.sampleValid) {
        console.log(`✅ Sample JSON validated against JSON Schema (${samplePath}).`);
      } else {
        console.error('❌ Sample validation did not return expected success (unexpected state).');
        process.exit(2);
      }
    } catch (e) {
      console.error(`❌ Validation failed for sample: ${samplePath}`);
      if (e && Array.isArray(e.validationErrors)) {
        console.error('Ajv validation errors:');
        console.error(JSON.stringify(e.validationErrors, null, 2));
      } else {
        console.error(e?.message || e);
      }
      process.exit(2);
    }
  } else {
    console.log('ℹ️ No sample provided. SDL check completed.');
  }

  console.log('🎉 Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err?.message || err);
  process.exit(1);
});
