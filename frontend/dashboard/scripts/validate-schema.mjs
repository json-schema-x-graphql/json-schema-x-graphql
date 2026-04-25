#!/usr/bin/env node
import Ajv from "ajv";
import addFormats from "ajv-formats";
import fs from "fs";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

// Use canonical JSON Schema for validation
const schemaPath = path.join(repoRoot, "src/data/schema_unification.schema.json");
const dataFiles = [
  // Only validate canonical schema file
  {
    name: "schema_unification.schema.json",
    path: path.join(repoRoot, "src/data/schema_unification.schema.json"),
    validateSchema: true,
  },
];

export function validateFiles({ schemaFile = schemaPath, files = dataFiles } = {}) {
  // Prefer the Ajv 2020 build (bundled meta-schemas) when available; fall back to Ajv
  let AjvFactory = Ajv;
  try {
    const require = createRequire(import.meta.url);
    // require is synchronous and works across pnpm/ npm layouts
    const maybeAjv2020 = require("ajv/dist/2020.js");
    if (maybeAjv2020) {
      AjvFactory = maybeAjv2020.default || maybeAjv2020.Ajv2020 || maybeAjv2020;
    }
  } catch {
    // ignore - we'll use the base Ajv import
  }

  const ajv = new AjvFactory({ allErrors: true, strict: false });
  addFormats(ajv);

  // Load external schema files that are referenced in schema_unification.schema.json
  const externalSchemas = [
    {
      path: path.join(repoRoot, "src/data/contract_data.schema.json"),
      name: "contract_data.schema.json",
    },
    {
      path: path.join(repoRoot, "src/data/legacy_procurement.schema.json"),
      name: "legacy_procurement.schema.json",
    },
    {
      path: path.join(repoRoot, "src/data/intake_process.schema.json"),
      name: "intake_process.schema.json",
    },
    {
      path: path.join(repoRoot, "src/data/logistics_mgmt.schema.json"),
      name: "logistics_mgmt.schema.json",
    },
    {
      path: path.join(repoRoot, "src/data/public_spending.schema.json"),
      name: "public_spending.schema.json",
    },
  ];

  for (const extSchema of externalSchemas) {
    if (fs.existsSync(extSchema.path)) {
      try {
        const schemaContent = JSON.parse(fs.readFileSync(extSchema.path, "utf8"));
        ajv.addSchema(schemaContent, extSchema.name);
        console.debug(`Loaded external schema: ${extSchema.name}`);
      } catch (error) {
        console.warn(
          `Warning: Could not load external schema ${extSchema.name}:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  }

  const results = { totalErrors: 0, fileResults: {}, mainFileValid: true };

  // Helper to collect all $ref targets in the schema for diagnostics
  function collectRefs(node, out = new Set()) {
    if (!node || typeof node !== "object") return out;
    if (Array.isArray(node)) {
      for (const item of node) collectRefs(item, out);
      return out;
    }
    for (const [k, v] of Object.entries(node)) {
      if (k === "$ref" && typeof v === "string") out.add(v);
      else if (typeof v === "object") collectRefs(v, out);
    }
    return out;
  }
  // If requested schema file doesn't exist, fall back to the v1 canonical schema
  let effectiveSchemaFile = schemaFile;
  if (!fs.existsSync(effectiveSchemaFile)) {
    const fallback = path.join(repoRoot, "src/data/schema_unification.schema.json");
    if (fs.existsSync(fallback)) {
      effectiveSchemaFile = fallback;
      console.warn(`Schema file ${schemaFile} not found; falling back to ${fallback}`);
    } else {
      throw new Error(`Schema file not found: ${schemaFile}`);
    }
  }

  const schema = JSON.parse(fs.readFileSync(effectiveSchemaFile, "utf8"));

  // Compile schema with diagnostics: Ajv can throw when $ref targets are invalid
  let validate;
  try {
    validate = ajv.compile(schema);
  } catch (error) {
    const errorMsg = `Ajv failed to compile the schema: ${
      error instanceof Error ? error.message : String(error)
    }`;
    console.error(errorMsg);
    try {
      const refs = Array.from(collectRefs(schema)).sort();
      console.error("Found $ref targets (first 50 shown):\n", refs.slice(0, 50).join("\n"));
    } catch (inner) {
      console.error("Error while collecting $ref targets:", inner);
    }
    console.error("Top-level schema $id:", schema.$id || schema.id || "(none)");
    console.error(
      "Hint: ensure all internal $ref targets exist in $defs or are absolute URIs resolvable by Ajv. If you use remote references, add them to Ajv via ajv.addSchema().",
    );
    // Throw error instead of process.exit for testability
    throw new Error(errorMsg);
  }

  for (const dataFile of files) {
    // Skip missing data files instead of treating them as fatal errors
    if (!fs.existsSync(dataFile.path)) {
      results.fileResults[dataFile.name] = "missing";
      continue;
    }

    try {
      const data = JSON.parse(fs.readFileSync(dataFile.path, "utf8"));
      if (dataFile.validateSchema) {
        const valid = validate(data);
        results.fileResults[dataFile.name] = valid;
        if (!valid) {
          results.totalErrors += (validate.errors || []).length;
          if (
            dataFile.name === "schema_unification.json" ||
            dataFile.name === "schema_unification.v2.json"
          )
            results.mainFileValid = false;
        }
      } else {
        results.fileResults[dataFile.name] = "skipped";
      }
    } catch (error) {
      results.fileResults[dataFile.name] = false;
      results.totalErrors++;
      if (
        dataFile.name === "schema_unification.json" ||
        dataFile.name === "schema_unification.v2.json"
      ) {
        results.mainFileValid = false;
      }
    }
  }

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const results = validateFiles();
  if (results.totalErrors > 0 && !results.mainFileValid) {
    console.error(`Validation failed: ${results.totalErrors} errors`);
    process.exit(1);
  }
  console.log("Validation completed.");
  process.exit(0);
}
