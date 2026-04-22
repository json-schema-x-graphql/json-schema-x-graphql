#!/usr/bin/env node

/*
 Validate GraphQL SDL and validate GraphQL-like JSON responses against JSON Schema.

 Usage:
   node scripts/validate-graphql-vs-jsonschema.mjs [path/to/sample.json]

 - Reads GraphQL SDL from generated-schemas/schema_unification.supergraph.graphql
 - Reads JSON Schema from src/data/schema_unification.schema.json
 - If a sample JSON file path is passed, validates it against the JSON Schema
*/
import { makeExecutableSchema } from "@graphql-tools/schema";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import fs from "fs";
import { parse, buildSchema } from "graphql";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import { FEDERATION_DIRECTIVES } from "./helpers/federation-directives.mjs";

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
        console.log("Using Ajv 2020 build for draft-2020-12 support");
      }
    } catch (e) {
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
    // Inject Federation directives definitions so buildSchema understands them
    // We remove the specific "extend schema @link" line often found in supergraphs
    const cleanedSDL =
      FEDERATION_DIRECTIVES +
      "\n" +
      this.graphqlSchemaSDL.replace(/extend\s+schema\s+@link\([^)]+\)\s*/g, "");

    // Parse and build to ensure SDL is valid
    parse(cleanedSDL);
    makeExecutableSchema({ typeDefs: cleanedSDL });
    buildSchema(cleanedSDL);
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

function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, "..");
  const graphqlSDLPath = path.join(
    repoRoot,
    "generated-schemas",
    "schema_unification.supergraph.graphql",
  );
  const jsonSchemaPath = path.join(repoRoot, "src", "data", "schema_unification.schema.json");

  // Load SDL and JSON Schema
  if (!fs.existsSync(graphqlSDLPath)) {
    console.error(`GraphQL SDL file not found: ${graphqlSDLPath}`);
    console.error(`Run 'pnpm run generate:supergraph' to generate it.`);
    process.exit(1);
  }
  if (!fs.existsSync(jsonSchemaPath)) {
    console.error(`JSON Schema file not found: ${jsonSchemaPath}`);
    process.exit(1);
  }

  const sdl = readFile(graphqlSDLPath);
  const jsonSchema = JSON.parse(readFile(jsonSchemaPath));

  // Load external system schemas to resolve $ref
  const systemSchemas = [];
  const systemSchemaFiles = [
    "contract_data.schema.json",
    "legacy_procurement.schema.json",
    "intake_process.schema.json",
    "logistics_mgmt.schema.json",
    "public_spending.schema.json",
  ];

  for (const schemaFile of systemSchemaFiles) {
    const schemaPath = path.join(repoRoot, "src", "data", schemaFile);
    if (fs.existsSync(schemaPath)) {
      try {
        const schema = JSON.parse(readFile(schemaPath));
        systemSchemas.push(schema);
      } catch (e) {
        console.warn(`Warning: Could not load ${schemaFile}:`, e.message);
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
    process.exit(1);
  }

  // Determine sample JSON path
  const samplePathArg = process.argv[2];
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
      process.exit(0);
    } catch (e) {
      console.error(`❌ Validation failed for ${samplePath}`);
      if (e.validationErrors) {
        console.error(JSON.stringify(e.validationErrors, null, 2));
      } else {
        console.error(e.message);
      }
      process.exit(1);
    }
  } else {
    console.log("ℹ️ No sample JSON provided/found. SDL check completed.");
    process.exit(0);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
