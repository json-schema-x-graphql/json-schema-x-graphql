#!/usr/bin/env node
/**
 * Regression tests for generate-subgraph-sdl.mjs
 *
 * Run: node frontend/dashboard/scripts/generate-subgraph-sdl.test.mjs
 *
 * Exits 0 on success, 1 on failure. No external deps; uses node:assert + node:test
 * is not used here because the script is ESM and we want a single exit code.
 */

import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..", "..");
const GENERATOR = join(__dirname, "generate-subgraph-sdl.mjs");
const require = createRequire(import.meta.url);

let failures = 0;
let passes = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passes++;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message.split("\n").slice(0, 4).join("\n    ")}`);
    failures++;
  }
}

function runGenerator(inputPath, outDir) {
  const outFile = join(outDir, "out.subgraph.graphql");
  const r = spawnSync("node", [GENERATOR, inputPath, outFile], { encoding: "utf-8" });
  if (r.status !== 0) {
    throw new Error(`generator exited ${r.status}\n${r.stderr}`);
  }
  if (!existsSync(outFile)) throw new Error(`generator did not write ${outFile}`);
  return readFileSync(outFile, "utf-8");
}

function makeExecutable(sdl) {
  // @graphql-tools/schema is CJS; load via createRequire so we work in ESM
  const at = join(REPO_ROOT, "servers/mockforge/node_modules/@graphql-tools/schema");
  const { makeExecutableSchema } = require(at);
  return makeExecutableSchema({ typeDefs: sdl, assumeValidSDL: true });
}

console.log("\ngenerate-subgraph-sdl regression tests\n");

test("user-service.schema.json generates valid executable SDL", () => {
  const dir = mkdtempSync(join(tmpdir(), "gsdl-"));
  try {
    const sdl = runGenerator(join(REPO_ROOT, "examples/user-service.schema.json"), dir);
    const schema = makeExecutable(sdl);
    const types = Object.keys(schema.getTypeMap()).filter((t) => !t.startsWith("__"));
    assert.ok(types.length > 0, "should have user-defined types");
    // The fix: Email is referenced (format: email) and must now be declared
    assert.ok(sdl.includes("scalar Email"), "Email scalar must be declared");
    assert.ok(schema.getType("Email"), "Email must be resolvable in schema");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("legacy-procurement.schema.json: $ref honors x-graphql-type-name on target", () => {
  const dir = mkdtempSync(join(tmpdir(), "gsdl-"));
  try {
    const sdl = runGenerator(
      join(REPO_ROOT, "examples/real-world-schemas/legacy-procurement.schema.json"),
      dir
    );
    // The fix: references to legacy_procurement_record in $defs resolve to
    // AssistRecord (its x-graphql-type-name), not LegacyProcurementRecord.
    // Before the fix the SDL contained "legacyProcurementRecord: LegacyProcurementRecord"
    // which failed validation.
    assert.ok(
      sdl.includes("AssistRecord"),
      "AssistRecord (the renamed target) must be emitted"
    );
    assert.ok(
      !/:\s*LegacyProcurementRecord\b/.test(sdl),
      "no field may reference the unrenamed target name"
    );
    const schema = makeExecutable(sdl);
    const assistRecord = schema.getType("AssistRecord");
    assert.ok(assistRecord, "AssistRecord must be a valid GraphQL type");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("user-service: enum generation precedes type emission (no forward refs)", () => {
  const dir = mkdtempSync(join(tmpdir(), "gsdl-"));
  try {
    const sdl = runGenerator(join(REPO_ROOT, "examples/user-service.schema.json"), dir);
    const enumIdx = sdl.indexOf("enum UserRole");
    const typeIdx = sdl.indexOf("type User {");
    assert.ok(enumIdx > 0, "enum must be present");
    assert.ok(typeIdx > 0, "type must be present");
    assert.ok(enumIdx < typeIdx, "enum must be emitted before type that references it");
    const schema = makeExecutable(sdl);
    assert.ok(schema.getType("UserRole"), "UserRole must be resolvable");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("contract-data.schema.json: end-to-end pipeline produces loadable schema", () => {
  const dir = mkdtempSync(join(tmpdir(), "gsdl-"));
  try {
    const sdl = runGenerator(
      join(REPO_ROOT, "examples/real-world-schemas/contract-data.schema.json"),
      dir
    );
    const schema = makeExecutable(sdl);
    const types = Object.keys(schema.getTypeMap()).filter((t) => !t.startsWith("__"));
    assert.ok(types.length >= 10, `expected at least 10 types, got ${types.length}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

console.log(`\n${passes} passed, ${failures} failed\n`);
process.exit(failures > 0 ? 1 : 0);