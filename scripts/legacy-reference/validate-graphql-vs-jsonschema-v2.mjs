#!/usr/bin/env node
import { makeExecutableSchema } from "@graphql-tools/schema";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import fs from "fs";
import { parse, buildSchema } from "graphql";
import path from "path";
import { fileURLToPath } from "url";

class SchemaSyncManager {
  constructor(graphqlSchemaSDL, jsonSchema) {
    this.graphqlSchemaSDL = graphqlSchemaSDL;
    this.jsonSchema = jsonSchema;
    this.ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(this.ajv);
    this.validator = this.ajv.compile(jsonSchema);
  }

  ensureGraphQLSchemaBuilds() {
    parse(this.graphqlSchemaSDL);
    makeExecutableSchema({ typeDefs: this.graphqlSchemaSDL });
    buildSchema(this.graphqlSchemaSDL);
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

function readFile(p) {
  return fs.readFileSync(p, "utf8");
}

function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, "..");

  // Use canonical SDL and JSON Schema
  const graphqlSDLPath = path.join(repoRoot, "src", "data", "schema_unification.graphql");
  const jsonSchemaPath = path.join(repoRoot, "src", "data", "schema_unification.schema.json");

  if (!fs.existsSync(graphqlSDLPath)) {
    console.error(`GraphQL SDL file not found: ${graphqlSDLPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(jsonSchemaPath)) {
    console.error(`JSON Schema file not found: ${jsonSchemaPath}`);
    process.exit(1);
  }

  const sdl = readFile(graphqlSDLPath);
  const jsonSchema = JSON.parse(readFile(jsonSchemaPath));

  const manager = new SchemaSyncManager(sdl, jsonSchema);

  try {
    manager.ensureGraphQLSchemaBuilds();
    console.log("✅ V2 GraphQL SDL parsed and schema built successfully.");
  } catch (e) {
    console.error("❌ V2 GraphQL SDL validation failed:");
    console.error(e.message);
    process.exit(1);
  }

  console.log("ℹ️ No sample JSON check for V2. SDL check completed.");
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
