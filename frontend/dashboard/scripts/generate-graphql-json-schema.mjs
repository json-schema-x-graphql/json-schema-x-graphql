#!/usr/bin/env node
import fs from "fs/promises";
import { buildSchema } from "graphql";
import path from "path";
import { fileURLToPath } from "url";
import {
  createContext,
  ensureDefinition,
  isScalarType,
  isBuiltInScalar,
  shouldIncludeType,
} from "./generate-graphql-json-schema-helpers.mjs";
import { camelToSnake, snakeToCamel } from "./helpers/case-conversion.mjs";
import { FEDERATION_DIRECTIVES } from "./helpers/federation-directives.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "");
// Use the composed supergraph as the source SDL instead of schema_unification.graphql
const sdlPath = path.join(repoRoot, "generated-schemas", "schema_unification.supergraph.graphql");
const jsonSchemaPath = path.join(repoRoot, "src", "data", "schema_unification.schema.json");
const outputDir = path.join(repoRoot, "generated-schemas");
const outputPath = path.join(outputDir, "schema_unification.from-graphql.json");

// Simplified script to detect and convert CamelCase to snake_case
const convertKeysToSnakeCase = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToSnakeCase);
  } else if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [camelToSnake(key), convertKeysToSnakeCase(value)]),
    );
  }
  return obj;
};

// Generic object key converter
function convertObjectKeys(obj, keyConverter) {
  if (Array.isArray(obj)) {
    return obj.map((item) => convertObjectKeys(item, keyConverter));
  } else if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        keyConverter(key),
        convertObjectKeys(value, keyConverter),
      ]),
    );
  }
  return obj;
}

// Preprocess the schema to rename $schema to avoid conflicts
const preprocessSchema = (schema) => {
  const schemaCopy = { ...schema };
  if (schemaCopy["$schema"]) {
    schemaCopy["_schema"] = schemaCopy["$schema"];
    delete schemaCopy["$schema"];
  }
  return schemaCopy;
};

// Completely strip out $schema from all processing steps
const stripSchemaProperty = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(stripSchemaProperty);
  } else if (obj && typeof obj === "object") {
    const { $schema, ...rest } = obj; // Remove $schema property
    return Object.fromEntries(
      Object.entries(rest).map(([key, value]) => [key, stripSchemaProperty(value)]),
    );
  }
  return obj;
};

// Removed duplicate generateFromSDL definition

/**
 * Generate JSON Schema from GraphQL SDL
 *
 * Converts GraphQL SDL to JSON Schema format, reading the canonical JSON Schema
 * for definitions and writing output to both generated-schemas/ and src/data/generated/
 *
 * @param {string} [sdlFilePath] - Path to input GraphQL SDL file (defaults to generated-schemas/schema_unification.supergraph.graphql)
 * @param {string} [jsonSchemaFilePath] - Path to canonical JSON Schema file for definitions (defaults to src/data/schema_unification.schema.json)
 * @param {string} [outPath] - Path to output JSON Schema file (defaults to generated-schemas/schema_unification.from-graphql.json)
 * @param {string} [inputCase='camel'] - Input field name case style ('camel' or 'snake')
 * @param {string} [outputCase='camel'] - Output field name case style ('camel' or 'snake')
 * @returns {Promise<string>} Path to the generated JSON Schema file
 * @throws {Error} If SDL file doesn't exist or GraphQL parsing fails
 *
 * @example
 * // Generate JSON Schema from SDL with snake_case output
 * const outputPath = await generateFromSDL(
 *   'generated-schemas/schema_unification.supergraph.graphql',
 *   'src/data/schema_unification.schema.json',
 *   'generated-schemas/schema_unification.from-graphql.json',
 *   'camel',
 *   'snake'
 * );
 *
 * @example
 * // Use default paths
 * const outputPath = await generateFromSDL();
 */
export async function generateFromSDL(
  sdlFilePath = sdlPath,
  jsonSchemaFilePath = jsonSchemaPath,
  outPath = outputPath,
  inputCase = "camel",
  outputCase = "camel",
) {
  // Read SDL file as string and parse using buildSchema
  const sdl = await fs.readFile(sdlFilePath, "utf8");

  // Inject Federation directives definitions
  // We remove the specific "extend schema @link" line often found in supergraphs
  // because buildSchema parses a document, not an extension of an existing one.
  // The directives themselves are defined by FEDERATION_DIRECTIVES so they are valid in usage.
  let cleanedSDL =
    FEDERATION_DIRECTIVES + "\n" + sdl.replace(/extend\s+schema\s+@link\([^)]+\)\s*/g, "");

  let convertedSDL = cleanedSDL;
  if (inputCase !== outputCase) {
    const { convertGraphQLFields } = await import("./helpers/case-conversion.mjs");
    convertedSDL = convertGraphQLFields(
      cleanedSDL,
      outputCase === "snake" ? camelToSnake : snakeToCamel,
    );
  }
  let schema, ctx;
  try {
    schema = buildSchema(convertedSDL);
    ctx = createContext(schema);
  } catch (err) {
    console.error("[ERROR] Failed to parse GraphQL SDL at:", sdlFilePath);
    const sdlLines = convertedSDL.split("\n").slice(0, 10).join("\n");
    console.error("[ERROR] First 10 lines of SDL:\n" + sdlLines);
    console.error("[ERROR] GraphQL parse error:", err.message);
    throw err;
  }

  // Read canonical JSON schema (already in snake_case)
  const schemaJson = JSON.parse(await fs.readFile(jsonSchemaFilePath, "utf8"));
  const definitions = schemaJson.definitions || schemaJson.$defs || {};
  // No conversion needed, already snake_case

  const outputDocument = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://ttse-schema-unification-project.app.cloud.gov/schemas/schema_unification-graphql.json",
    title: "Schema Unification Forest GraphQL Schema",
    description: "JSON Schema generated from schema_unification.graphql SDL (snake_case)",
    definitions: definitions,
  };

  console.log("[DEBUG] Document with snake_case fields:", outputDocument);

  // Completely remove the $schema property from the document
  const { $schema, ...filteredDocument } = outputDocument;

  // Use filteredDocument for further processing
  const outputText = JSON.stringify(filteredDocument, null, 2);
  await fs.writeFile(outPath, outputText);
  console.log("[DEBUG] Document written without $schema property:", filteredDocument);

  // Also write to src/data/generated for website consumption
  const generatedDir = path.join(repoRoot, "src", "data", "generated");
  await fs.mkdir(generatedDir, { recursive: true });
  const generatedOutPath = path.join(generatedDir, path.basename(outPath));
  await fs.writeFile(generatedOutPath, outputText);
  console.log("[DEBUG] Document also written to:", generatedOutPath);

  return outPath;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // CLI argument parsing
  const argv = process.argv.slice(2);
  let sdlFilePath = sdlPath;
  let jsonSchemaFilePath = jsonSchemaPath;
  let outPath = outputPath;
  let inputCase = "camel";
  let outputCase = "camel";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--schema" && argv[i + 1]) sdlFilePath = argv[i + 1];
    if (argv[i] === "--json-schema" && argv[i + 1]) jsonSchemaFilePath = argv[i + 1];
    if (argv[i] === "--out" && argv[i + 1]) outPath = argv[i + 1];
    if (argv[i] === "--input-case" && argv[i + 1]) inputCase = argv[i + 1];
    if (argv[i] === "--output-case" && argv[i + 1]) outputCase = argv[i + 1];
  }
  if (!sdlFilePath) sdlFilePath = sdlPath;
  if (!jsonSchemaFilePath) jsonSchemaFilePath = jsonSchemaPath;
  if (!outPath) outPath = outputPath;
  console.log("[DEBUG] CLI args:", {
    sdlFilePath,
    jsonSchemaFilePath,
    outPath,
    inputCase,
    outputCase,
  });
  generateFromSDL(sdlFilePath, jsonSchemaFilePath, outPath, inputCase, outputCase)
    .then((p) => {
      process.stdout.write(`JSON Schema written to ${path.relative(process.cwd(), p)}\n`);
    })
    .catch((error) => {
      console.error("[generate-graphql-json-schema]", error);
      process.exit(1);
    });
}
