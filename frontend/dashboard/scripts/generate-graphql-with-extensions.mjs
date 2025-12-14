#!/usr/bin/env node

/**
 * Generate GraphQL SDL from JSON Schema with x-graphql-* extensions
 *
 * This script:
 * 1. Uses typeconv to generate base GraphQL SDL from JSON Schema
 * 2. Post-processes the SDL to apply x-graphql-* extensions
 * 3. Outputs enhanced GraphQL SDL
 *
 * Usage:
 *   node scripts/generate-graphql-with-extensions.mjs <input-schema.json> <output.graphql>
 */
import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { generateEnhancedSDL } from "./lib/graphql-hints.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

// Parse CLI arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error(
    "Usage: node generate-graphql-with-extensions.mjs <input-schema.json> <output.graphql>"
  );
  process.exit(1);
}

const schemaPath = path.resolve(args[0]);
const outputPath = path.resolve(args[1]);

async function generateGraphQL() {
  console.log("📖 Reading JSON Schema...");
  const schemaContent = await fs.readFile(schemaPath, "utf8");
  const schema = JSON.parse(schemaContent);

  console.log("🔄 Converting with typeconv...");
  const tempDir = path.join(repoRoot, "generated-schemas", "temp-graphql");
  await fs.mkdir(tempDir, { recursive: true });

  try {
    // Run typeconv (it creates a directory with the output file inside)
    const typeconvOutput = path.join(tempDir, "output.graphql");
    execSync(`pnpm exec typeconv -f jsc -t gql -o "${typeconvOutput}" "${schemaPath}"`, {
      stdio: "inherit",
    });

    // Read base GraphQL from the generated directory
    const generatedFileName = path.basename(schemaPath).replace(".json", ".graphql");
    const baseGraphQLPath = path.join(tempDir, "output.graphql", generatedFileName);
    const baseGraphQL = await fs.readFile(baseGraphQLPath, "utf8");

    console.log("✨ Post-processing with extensions...");
    const enhancedGraphQL = generateEnhancedSDL(baseGraphQL, schema);

    console.log("💾 Writing GraphQL SDL...");
    await fs.writeFile(outputPath, enhancedGraphQL, "utf8");

    console.log(`✅ Generated: ${path.relative(repoRoot, outputPath)}`);
    console.log(`   ${enhancedGraphQL.split("\n").length} lines`);
  } finally {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

/**
 * Process x-graphql-* extensions from JSON Schema and enhance GraphQL SDL
 */
async function processGraphQLExtensions(baseGraphQL, schema) {
  let graphql = baseGraphQL;

  // Remove auto-generated header
  graphql = graphql.replace(/^# The file.*?\n\n/s, "");

  // 1. Add custom scalars at the top
  graphql = addCustomScalars(graphql, schema);

  // 2. Process enums (replace union declarations)
  graphql = processEnums(graphql, schema);

  // 3. Process unions (they're already correct from typeconv)
  graphql = enhanceUnions(graphql, schema);

  // 4. Apply custom scalar types to fields
  graphql = applyCustomScalars(graphql, schema);

  // 5. Apply required field overrides
  graphql = applyRequiredOverrides(graphql, schema);

  // 6. Add operations (Query, Mutation, Subscription)
  graphql = addOperations(graphql, schema);

  // 7. Add pagination types
  graphql = addPaginationTypes(graphql, schema);

  return graphql;
}

/**
 * Add custom scalar declarations
 */
function addCustomScalars(graphql, schema) {
  const scalars = schema["x-graphql-scalars"] || {};

  if (Object.keys(scalars).length === 0) {
    return graphql;
  }

  const scalarSDL = Object.entries(scalars)
    .map(([name, config]) => {
      const desc = config.description ? `"""\n${config.description}\n"""\n` : "";
      return `${desc}scalar ${name}`;
    })
    .join("\n\n");

  return scalarSDL + "\n\n" + graphql;
}

/**
 * Process enums - replace incorrect union declarations with proper enums
 */
function processEnums(graphql, schema) {
  const definitions = schema.definitions || {};
  let result = graphql;

  for (const [name, def] of Object.entries(definitions)) {
    if (def["x-graphql-enum"]) {
      const enumConfig = def["x-graphql-enum"];
      const enumSDL = generateEnumSDL(enumConfig, def);

      // Replace the incorrect union declaration
      const unionPattern = new RegExp(`"[^"]*"\\s*union ${name} = String`, "g");
      result = result.replace(unionPattern, enumSDL);
    }
  }

  return result;
}

/**
 * Generate enum SDL from x-graphql-enum extension
 */
function generateEnumSDL(enumConfig, definition) {
  const { name, description, values } = enumConfig;

  const enumValues = Object.entries(values || {})
    .map(([key, config]) => {
      const valueDesc = config.description ? `  """\n  ${config.description}\n  """\n` : "";
      const deprecated = config.deprecated ? ` @deprecated(reason: "${config.deprecated}")` : "";
      return `${valueDesc}  ${config.name}${deprecated}`;
    })
    .join("\n");

  const desc = description ? `"""\n${description}\n"""\n` : "";
  return `${desc}enum ${name} {\n${enumValues}\n}`;
}

/**
 * Enhance union type descriptions
 */
function enhanceUnions(graphql, schema) {
  const definitions = schema.definitions || {};
  let result = graphql;

  for (const [name, def] of Object.entries(definitions)) {
    if (def["x-graphql-union"]) {
      const unionConfig = def["x-graphql-union"];
      if (unionConfig.description) {
        // Find and add description to union
        const pattern = new RegExp(`(union ${name} =)`, "g");
        result = result.replace(pattern, `"""\n${unionConfig.description}\n"""\n$1`);
      }
    }
  }

  return result;
}

/**
 * Apply custom scalar types to fields
 */
function applyCustomScalars(graphql, schema) {
  let result = graphql;
  const definitions = schema.definitions || {};

  // Build map of field -> scalar
  const scalarMap = new Map();

  function scanProperties(typeName, properties) {
    if (!properties) return;

    for (const [propName, propDef] of Object.entries(properties)) {
      if (propDef["x-graphql-scalar"]) {
        scalarMap.set(`${typeName}.${propName}`, propDef["x-graphql-scalar"]);
      }
    }
  }

  for (const [typeName, def] of Object.entries(definitions)) {
    if (def.properties) {
      scanProperties(typeName, def.properties);
    }
  }

  // Apply scalars - process line by line to avoid regex issues
  const lines = result.split("\n");
  let currentType = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track current type
    const typeMatch = line.match(/^type (\w+)/);
    if (typeMatch) {
      currentType = typeMatch[1];
      continue;
    }

    // Check if we're at the end of a type
    if (line.trim() === "}") {
      currentType = null;
      continue;
    }

    // Apply scalar replacement for fields in current type
    if (currentType) {
      for (const [field, scalar] of scalarMap.entries()) {
        const [typeName, fieldName] = field.split(".");

        if (typeName === currentType) {
          // Match: fieldName: Type (with optional ! or array brackets)
          const fieldPattern = new RegExp(
            `^(\\s*"[^"]*"\\s*)?\\s*(${fieldName}):\\s*(String|Float|Int|Boolean)([!\\[\\]\\s]*)`
          );
          const match = line.match(fieldPattern);

          if (match) {
            const [, desc, field, oldType, suffix] = match;
            lines[i] = `${desc || ""}  ${field}: ${scalar}${suffix}`;
            break;
          }
        }
      }
    }
  }

  return lines.join("\n");
}

/**
 * Apply x-graphql-required overrides
 */
function applyRequiredOverrides(graphql, schema) {
  const definitions = schema.definitions || {};

  // Build list of fields that should be required
  const requiredFields = new Set();

  function scanProperties(typeName, properties) {
    if (!properties) return;

    for (const [propName, propDef] of Object.entries(properties)) {
      if (propDef["x-graphql-required"] === true) {
        requiredFields.add(`${typeName}.${propName}`);
      }
    }
  }

  for (const [typeName, def] of Object.entries(definitions)) {
    if (def.properties) {
      scanProperties(typeName, def.properties);
    }
  }

  // Apply required markers - process line by line
  const lines = graphql.split("\n");
  let currentType = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track current type
    const typeMatch = line.match(/^type (\w+)/);
    if (typeMatch) {
      currentType = typeMatch[1];
      continue;
    }

    // Check if we're at the end of a type
    if (line.trim() === "}") {
      currentType = null;
      continue;
    }

    // Apply required override for fields in current type
    if (currentType) {
      for (const fieldKey of requiredFields) {
        const [typeName, fieldName] = fieldKey.split(".");

        if (typeName === currentType) {
          // Match: fieldName: Type (without !)
          const fieldPattern = new RegExp(
            `^(\\s*(?:"[^"]*"\\s*)?)\\s*(${fieldName}):\\s*([\\w\\[\\]]+?)(?!!)\\s*$`
          );
          const match = line.match(fieldPattern);

          if (match) {
            const [, desc, field, type] = match;
            lines[i] = `${desc}  ${field}: ${type}!`;
            break;
          }
        }
      }
    }
  }

  return lines.join("\n");
}

/**
 * Add Query, Mutation, Subscription operations
 */
function addOperations(graphql, schema) {
  const operations = schema["x-graphql-operations"];
  if (!operations) return graphql;

  let result = graphql;

  if (operations.queries) {
    const queryType = generateOperationType("Query", operations.queries);
    result += "\n\n" + queryType;
  }

  if (operations.mutations) {
    const mutationType = generateOperationType("Mutation", operations.mutations);
    result += "\n\n" + mutationType;
  }

  if (operations.subscriptions) {
    const subscriptionType = generateOperationType("Subscription", operations.subscriptions);
    result += "\n\n" + subscriptionType;
  }

  return result;
}

/**
 * Generate operation type (Query/Mutation/Subscription)
 */
function generateOperationType(typeName, operations) {
  const fields = Object.entries(operations)
    .map(([name, config]) => {
      const desc = config.description ? `  """\n  ${config.description}\n  """\n` : "";
      const args = config.args ? generateArgs(config.args) : "";
      return `${desc}  ${name}${args}: ${config.type}`;
    })
    .join("\n");

  return `type ${typeName} {\n${fields}\n}`;
}

/**
 * Generate field arguments
 */
function generateArgs(args) {
  const argsList = Object.entries(args)
    .map(([name, config]) => {
      const desc = config.description ? `\n    """\n    ${config.description}\n    """\n    ` : "";
      const defaultVal = config.default !== undefined ? ` = ${JSON.stringify(config.default)}` : "";
      return `${desc}${name}: ${config.type}${defaultVal}`;
    })
    .join("\n    ");

  if (argsList.includes("\n")) {
    return `(\n    ${argsList}\n  )`;
  }
  return `(${argsList})`;
}

/**
 * Add Relay-style pagination types
 */
function addPaginationTypes(graphql, schema) {
  const pagination = schema["x-graphql-pagination"];
  if (!pagination || !pagination.enabled) return graphql;

  const paginationSDL = `
"""
Information about pagination in a connection
"""
type PageInfo {
  """
  Whether there are more items when paginating forward
  """
  hasNextPage: Boolean!

  """
  Whether there are more items when paginating backward
  """
  hasPreviousPage: Boolean!

  """
  Cursor of the first item
  """
  startCursor: String

  """
  Cursor of the last item
  """
  endCursor: String
}

"""
Edge in a contract connection
"""
type ContractEdge {
  """
  Cursor for this edge
  """
  cursor: String!

  """
  The contract node
  """
  node: Contract!
}

"""
Paginated connection of contracts
"""
type ContractConnection {
  """
  List of edges
  """
  edges: [ContractEdge!]!

  """
  Pagination information
  """
  pageInfo: PageInfo!

  """
  Total number of items (optional, may be expensive)
  """
  totalCount: Int
}

"""
Node interface for globally identifiable objects
"""
interface Node {
  """
  Global unique identifier
  """
  id: ID!
}

"""
Input filter for contracts
"""
input ContractFilter {
  """
  Filter by PIID
  """
  piid: String

  """
  Filter by system type
  """
  system: SystemType

  """
  Filter by status
  """
  status: ContractStatus
}

"""
Ordering options for contracts
"""
input ContractOrderBy {
  """
  Field to order by
  """
  field: String!

  """
  Sort direction
  """
  direction: String!
}

"""
Result of data ingestion operation
"""
type IngestionResult {
  """
  Whether ingestion was successful
  """
  success: Boolean!

  """
  Number of records ingested
  """
  recordsIngested: Int

  """
  Error message if failed
  """
  error: String
}`;

  return graphql + "\n" + paginationSDL;
}

// Run the generator
generateGraphQL().catch(err => {
  console.error("❌ Error:", err.message);
  console.error(err.stack);
  process.exit(1);
});
