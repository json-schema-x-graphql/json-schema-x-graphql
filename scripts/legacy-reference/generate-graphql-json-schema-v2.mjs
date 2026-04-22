#!/usr/bin/env node
import fs from "fs/promises";
import {
  buildSchema,
  GraphQLList,
  GraphQLNonNull,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  isScalarType,
  isUnionType,
} from "graphql";
import path from "path";
import { fileURLToPath } from "url";
import { FEDERATION_DIRECTIVES } from "./helpers/federation-directives.mjs";
import { formatJson } from "./helpers/format-json.mjs";
// reuse existing scalar and conversion logic
import {
  ensureDefinition,
  buildEnumDefinition,
  buildUnionDefinition,
  buildObjectDefinition,
  convertGraphQLType,
} from "./helpers/generate-graphql-json-schema-helpers.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "");
// Use the v2 GraphQL SDL
const schemaPath = path.join(repoRoot, "src", "data", "schema_unification.target.graphql");
const outputDir = path.join(repoRoot, "generated-schemas");
const outputPath = path.join(outputDir, "schema_unification.v2.from-graphql.json");

/**
 * Generate JSON Schema from V2 GraphQL SDL with x-graphql hints
 *
 * Converts V2 GraphQL SDL (with x-graphql-* extensions) to JSON Schema format.
 * Falls back to canonical SDL if V2 target SDL is not found.
 *
 * @param {object} options - Generation options
 * @param {string} [options.schemaFile] - Path to input V2 GraphQL SDL file (defaults to src/data/schema_unification.target.graphql)
 * @param {string} [options.outPath] - Path to output JSON Schema file (defaults to generated-schemas/schema_unification.v2.from-graphql.json)
 * @returns {Promise<string>} Path to the generated JSON Schema file
 * @throws {Error} If SDL file cannot be read or GraphQL parsing fails
 *
 * @example
 * // Generate JSON Schema from V2 SDL
 * const outputPath = await generateV2({
 *   schemaFile: 'src/data/schema_unification.target.graphql',
 *   outPath: 'generated-schemas/schema_unification.v2.json'
 * });
 *
 * @example
 * // Use default paths with fallback
 * const outputPath = await generateV2();
 */
async function generateV2({ schemaFile = schemaPath, outPath = outputPath } = {}) {
  let rawSDL;
  try {
    rawSDL = await fs.readFile(schemaFile, "utf8");
  } catch (err) {
    // Fallback: if the V2 target SDL isn't present, fall back to the canonical SDL
    const fallback = path.join(
      repoRoot,
      "generated-schemas",
      "schema_unification.supergraph.graphql",
    );
    rawSDL = await fs.readFile(fallback, "utf8");
  }

  // Inject Federation directives definitions
  // We remove the specific "extend schema @link" line often found in supergraphs
  // because buildSchema parses a document, not an extension of an existing one.
  // The directives themselves are defined by FEDERATION_DIRECTIVES so they are valid in usage.
  const cleanedSDL =
    FEDERATION_DIRECTIVES + "\n" + rawSDL.replace(/extend\s+schema\s+@link\([^)]+\)\s*/g, "");

  const schema = buildSchema(cleanedSDL);
  const ctx = { definitions: new Map(), building: new Set(), schema };

  // Ensure definitions for all relevant types
  const typeMap = schema.getTypeMap();
  Object.values(typeMap).forEach((type) => {
    ensureDefinition(type, ctx);
  });

  const outputSchema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://github.com/GSA-TTS/enterprise-schema-unification/schemas/contract-v2-json",
    title: "Generated JSON Schema from GraphQL V2 SDL",
    type: "object",
    definitions: Object.fromEntries(ctx.definitions),
    $ref: "#/definitions/Query",
  };
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  const outputText = await Promise.resolve(formatJson(outputSchema));
  await fs.writeFile(outPath, outputText);
  return outPath;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateV2()
    .then((p) => console.log(`Generated: ${path.relative(repoRoot, p)}`))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

export { generateV2 };
