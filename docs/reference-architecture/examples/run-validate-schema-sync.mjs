#!/usr/bin/env node
/**
 * Example: Programmatic usage of validate-schema-sync
 *
 * This script demonstrates how to use compareSchemas(sdl, jsonSchema, { strict?, config? })
 * to perform:
 *  - A basic name-parity check between GraphQL SDL and JSON Schema
 *  - An optional strict parity check using a mapping config (JSON Pointers)
 *
 * Usage:
 *   node docs/examples/run-validate-schema-sync.mjs
 *   node docs/examples/run-validate-schema-sync.mjs --strict
 *   node docs/examples/run-validate-schema-sync.mjs --strict --config scripts/schema-sync.config.json
 *
 * Notes:
 *   - By default, this script loads:
 *       SDL:    generated-schemas/schema_unification.supergraph.graphql
 *       Schema: src/data/schema_unification.schema.json
 *   - In strict mode, it will attempt to load the config at:
 *       scripts/schema-sync.config.json (unless overridden via --config)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { compareSchemas } from '../../scripts/validate-schema-sync.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const defaultPaths = {
  sdl: path.join(repoRoot, 'src', 'data', 'schema_unification.graphql'),
  jsonSchema: path.join(repoRoot, 'src', 'data', 'schema_unification.schema.json'),
  strictConfig: path.join(repoRoot, 'scripts', 'schema-sync.config.json'),
};

function readText(p) {
  if (!fs.existsSync(p)) {
    throw new Error(`File not found: ${p}`);
  }
  return fs.readFileSync(p, 'utf8');
}

function readJson(p) {
  if (!fs.existsSync(p)) {
    throw new Error(`File not found: ${p}`);
  }
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    throw new Error(`Failed to parse JSON: ${p}\n${e && e.message ? e.message : e}`);
  }
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = { strict: false, config: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--strict') {
      args.strict = true;
    } else if (a === '--config') {
      args.config = argv[i + 1];
      i++;
    }
  }
  return args;
}

function clamp(arr, max = 20) {
  if (!Array.isArray(arr)) return arr;
  if (arr.length <= max) return arr;
  return [...arr.slice(0, max), `...and ${arr.length - max} more`];
}

function printResult(label, result) {
  console.log(`\n=== ${label} ===`);
  if (result.missingInJson?.length) {
    console.log('❌ GraphQL fields missing in JSON Schema:');
    clamp(result.missingInJson).forEach((n) => console.log(`  - ${n}`));
  } else {
    console.log('✅ All GraphQL fields are present in JSON Schema (by name).');
  }

  if (result.missingInGraphQL?.length) {
    console.log('ℹ️ JSON Schema properties with no GraphQL field (by name):');
    clamp(result.missingInGraphQL).forEach((n) => console.log(`  - ${n}`));
  } else {
    console.log('✅ All JSON Schema properties have a matching GraphQL field (by name).');
  }

  if (result.missingCritical?.length) {
    console.log('💥 Critical JSON Schema properties missing:', result.missingCritical.join(', '));
  }

  if (result.strictIssues?.length) {
    console.log('❌ Strict sync issues:');
    clamp(result.strictIssues).forEach((i) => console.log(`  - ${i}`));
  }

  console.log('Exit code (for CI-style gating):', result.exitCode);
}

async function main() {
  const args = parseArgs();

  const sdlPath = defaultPaths.sdl;
  const schemaPath = defaultPaths.jsonSchema;

  console.log('Loading SDL:', sdlPath);
  console.log('Loading JSON Schema:', schemaPath);

  const sdl = readText(sdlPath);
  const jsonSchema = readJson(schemaPath);

  // 1) Basic parity check
  const basic = compareSchemas(sdl, jsonSchema);
  printResult('Basic name parity', basic);

  // 2) Strict parity (optional)
  let overallExit = basic.exitCode;

  if (args.strict) {
    let configObj = null;

    if (args.config) {
      const resolved = path.isAbsolute(args.config)
        ? args.config
        : path.join(process.cwd(), args.config);
      console.log('\nStrict mode enabled with config:', resolved);
      configObj = readJson(resolved);
    } else if (fs.existsSync(defaultPaths.strictConfig)) {
      console.log('\nStrict mode enabled with default config:', defaultPaths.strictConfig);
      configObj = readJson(defaultPaths.strictConfig);
    } else {
      console.log('\nStrict mode enabled, but no config file found. Using empty config.');
      configObj = { types: {} };
    }

    const strictRes = compareSchemas(sdl, jsonSchema, {
      strict: true,
      config: configObj,
      repoRoot,
    });
    printResult('Strict parity', strictRes);

    overallExit = Math.max(overallExit, strictRes.exitCode);
  } else {
    console.log('\nTip: run with --strict to enforce a mapping config (JSON Pointers).');
  }

  // Set exit code so this example can be used in CI-like scenarios.
  process.exitCode = overallExit;
}

main().catch((err) => {
  console.error('\nUnexpected error:', err && err.stack ? err.stack : err);
  process.exitCode = 2;
});
