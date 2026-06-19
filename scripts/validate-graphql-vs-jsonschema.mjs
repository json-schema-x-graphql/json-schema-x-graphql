#!/usr/bin/env node

/*
 Validate GraphQL SDL and validate GraphQL-like JSON responses against JSON Schema.

 Usage:
   node scripts/validate-graphql-vs-jsonschema.mjs [path/to/sample.json]

 - Reads GraphQL SDL from generated-schemas/petrified.supergraph.graphql
 - Reads JSON Schema from src/data/petrified.schema.json
 - If a sample JSON file path is passed, validates it against the JSON Schema
*/
import { makeExecutableSchema } from "@graphql-tools/schema";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import fs from "fs";
import { parse, buildSchema } from "graphql";
import { createRequire } from "module";
import path from "path";
import { isDirectRun, runMain } from "./helpers/cli-runner.mjs";
import { FEDERATION_DIRECTIVES } from "./helpers/federation-directives.mjs";
import { getRepoRoot } from "./helpers/repo-root.mjs";
import { getSystemsWithSchemaFiles } from "./helpers/system-registry.mjs";

// Helper to only log debug statements when DEBUG env var is set
const debug = (...args) => {
  if (process.env.DEBUG) {
    console.log(...args);
  }
};

export class SchemaSyncManager {
  constructor(graphqlSchemaSDL, jsonSchema, externalSchemas = []) {
    this.graphqlSchemaSDL = graphqlSchemaSDL;
    this.jsonSchema = jsonSchema;

    // Prefer the Ajv 2020 build (bundled meta-schemas) when available; fall back to Ajv
    let AjvFactory = Ajv;
    try {
      const require = createRequire(import.meta.url);
      // require is synchronous and works across pnpm/ npm layouts
      const maybeAjv2020 = require("ajv/dist/2020.js");
      if (maybeAjv2020 && typeof maybeAjv2020 === "function") {
        AjvFactory = maybeAjv2020;
        debug("Using Ajv 2020 build for draft-2020-12 support");
      }
    } catch {
      // Fall back to regular Ajv
    }

    this.ajv = new AjvFactory({ strict: false, allErrors: true });
    addFormats(this.ajv);

    // Pre-load external schemas to resolve $ref
    for (const schema of externalSchemas) {
      this.ajv.addSchema(schema);
    }

    this.validator = this.ajv.compile(jsonSchema);
  }

  ensureGraphQLSchemaBuilds() {
    // Inject Federation directives definitions only if they aren't already present in the SDL.
    // Standard tools like buildSchema/makeExecutableSchema need these definitions to parse federation metadata.
    let cleanedSDL = this.graphqlSchemaSDL.replace(/extend\s+schema\s+@link\([^)]+\)\s*/g, "");

    // Check if SDL already contains standard federation directive definitions
    const hasDirectives =
      cleanedSDL.includes("directive @key") ||
      cleanedSDL.includes("directive @shareable") ||
      cleanedSDL.includes("directive @link");

    if (!hasDirectives) {
      cleanedSDL = FEDERATION_DIRECTIVES + "\n" + cleanedSDL;
    }

    // Parse and build to ensure SDL is valid
    try {
      parse(cleanedSDL);
      makeExecutableSchema({ typeDefs: cleanedSDL });
      buildSchema(cleanedSDL);
    } catch (err) {
      // If it still fails, it might be due to a subset of directives being present or different versions.
      // We log the error but let the caller handle it.
      debug("GraphQL Schema build failed:", err.message);
      throw err;
    }
    return true;
  }

  validateGraphQLResponse(data) {
    const isValid = this.validator(data);
    if (!isValid) {
      const errors = this.validator.errors || [];
      const msg = `Schema validation failed: ${JSON.stringify(errors, null, 2)}`;
      const err = new Error(msg);
      err.validationErrors = errors;
      throw err;
    }
    return true;
  }
}

/**
 * Programmatic API: validate GraphQL SDL builds and optionally validate a sample payload against the given JSON Schema.
 *
 * @param {string} graphqlSchemaSDL - GraphQL SDL string
 * @param {object} jsonSchema - Parsed JSON Schema object
 * @param {object|null} [sampleData=null] - Optional sample JSON to validate against the schema
 * @returns {{ sdlBuilds: boolean, sampleValid: boolean|null }}
 * @throws {Error} When SDL fails to parse/build or sample validation fails
 */
export function validateParity(graphqlSchemaSDL, jsonSchema, sampleData = null) {
  const manager = new SchemaSyncManager(graphqlSchemaSDL, jsonSchema);
  const result = { sdlBuilds: false, sampleValid: null };

  // Ensure SDL parses and builds
  manager.ensureGraphQLSchemaBuilds();
  result.sdlBuilds = true;

  // Optionally validate a sample JSON object against the JSON Schema
  if (sampleData !== null && sampleData !== undefined) {
    manager.validateGraphQLResponse(sampleData);
    result.sampleValid = true;
  }

  return result;
}

function readFile(p) {
  return fs.readFileSync(p, "utf8");
}

function main(argv = process.argv.slice(2)) {
  const repoRoot = getRepoRoot(import.meta.url);
  const graphqlSDLPath = path.join(repoRoot, "generated-schemas", "petrified.supergraph.graphql");
  const jsonSchemaPath = path.join(repoRoot, "src", "data", "petrified.schema.json");

  // Load SDL and JSON Schema
  if (!fs.existsSync(graphqlSDLPath)) {
    console.error(`GraphQL SDL file not found: ${graphqlSDLPath}`);
    console.error(`Run 'pnpm run generate:supergraph' to generate it.`);
    return 1;
  }
  if (!fs.existsSync(jsonSchemaPath)) {
    console.error(`JSON Schema file not found: ${jsonSchemaPath}`);
    return 1;
  }

  const sdl = readFile(graphqlSDLPath);
  const jsonSchema = JSON.parse(readFile(jsonSchemaPath));

  // Load external system schemas to resolve $ref
  const systemSchemas = [];
  const systems = getSystemsWithSchemaFiles().filter(system => system.id !== "petrified");

  for (const system of systems) {
    const schemaPath = path.join(repoRoot, system.schema);
    if (fs.existsSync(schemaPath)) {
      try {
        const schema = JSON.parse(readFile(schemaPath));
        systemSchemas.push(schema);
      } catch (e) {
        console.warn(`Warning: Could not load ${system.schema}:`, e.message);
      }
    }
  }

  // Initialize manager with external schemas
  const manager = new SchemaSyncManager(sdl, jsonSchema, systemSchemas);

  // Validate SDL can be built
  try {
    manager.ensureGraphQLSchemaBuilds();
    console.log("✅ GraphQL SDL parsed and schema built successfully.");
  } catch (e) {
    console.error("❌ GraphQL SDL validation failed:");
    console.error(e.message);
    return 1;
  }

  // Determine sample JSON path
  const samplePathArg = argv[0];
  let samplePath = null;
  if (samplePathArg) {
    samplePath = path.isAbsolute(samplePathArg)
      ? samplePathArg
      : path.join(process.cwd(), samplePathArg);
  } else {
    // By default do not validate the schema file against itself. If a sample JSON is required,
    // pass its path as a CLI argument. This avoids validating the JSON Schema document as a
    // GraphQL response sample which will always be missing data instance properties.
    samplePath = null;
  }

  if (samplePath) {
    try {
      const data = JSON.parse(readFile(samplePath));
      manager.validateGraphQLResponse(data);
      console.log(`✅ Sample JSON validated against JSON Schema (${samplePath}).`);
      console.log("🎉 Validation workflow completed successfully.");
      return 0;
    } catch {
      console.error(`❌ Validation failed for ${samplePath}`);
      if (e.validationErrors) {
        console.error(JSON.stringify(e.validationErrors, null, 2));
      } else {
        console.error(e.message);
      }
      return 1;
    }
  } else {
    console.log("ℹ️ No sample JSON provided/found. SDL check completed.");
    return 0;
  }
}

if (isDirectRun(import.meta.url)) {
  runMain(() => {
    const exitCode = main();
    if (typeof exitCode === "number" && exitCode !== 0) {
      process.exitCode = exitCode;
    }
  });
}
