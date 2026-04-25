#!/usr/bin/env node

/**
 * Supergraph Composer
 *
 * Composes multiple subgraph SDL files into a single federated supergraph.
 * Uses @graphql-tools/merge and @graphql-tools/schema for proper schema composition.
 *
 * Features:
 * - Merges multiple subgraphs with conflict resolution
 * - Deduplicates types, enums, scalars across subgraphs
 * - Preserves federation directives (@key, @shareable, etc.)
 * - Generates executable schema for validation
 *
 * Usage:
 *   node scripts/generate-supergraph.mjs [output-file.graphql]
 *
 * Examples:
 *   node scripts/generate-supergraph.mjs
 *   node scripts/generate-supergraph.mjs generated-schemas/schema_unification.supergraph.graphql
 *
 * Dependencies:
 *   npm install @graphql-tools/merge @graphql-tools/schema graphql
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { glob } from "glob";
import { print, parse } from "graphql";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const GENERATED_SCHEMAS_DIR = path.join(repoRoot, "generated-schemas");
const SRC_GENERATED_DIR = path.join(repoRoot, "src", "data", "generated");
const DEFAULT_OUTPUT = path.join(GENERATED_SCHEMAS_DIR, "schema_unification.supergraph.graphql");

// Check if @graphql-tools is available
let hasGraphQLTools = false;
let mergeTypeDefs, makeExecutableSchema;
try {
  const merge = await import("@graphql-tools/merge");
  const schema = await import("@graphql-tools/schema");
  mergeTypeDefs = merge.mergeTypeDefs;
  makeExecutableSchema = schema.makeExecutableSchema;
  hasGraphQLTools = !!(mergeTypeDefs && makeExecutableSchema);
  if (hasGraphQLTools) {
    console.log("✅ @graphql-tools/merge and @graphql-tools/schema loaded");
  }
} catch (e) {
  console.warn("⚠️  @graphql-tools not found:", e.message);
  console.warn("⚠️  Install with: npm install @graphql-tools/merge @graphql-tools/schema");
  console.warn("⚠️  Falling back to simple concatenation (not recommended for production)");
}

/**
 * Find all subgraph SDL files
 */
async function findSubgraphs() {
  const pattern = path.join(GENERATED_SCHEMAS_DIR, "*.subgraph.graphql");
  const files = await glob(pattern);
  return files.sort(); // Alphabetical order for deterministic output
}

/**
 * Read and parse subgraph SDL
 */
async function readSubgraph(filePath) {
  const content = await fs.readFile(filePath, "utf-8");
  const name = path.basename(filePath, ".subgraph.graphql");
  return { name, content, path: filePath };
}

/**
 * Compose subgraphs into supergraph using @graphql-tools/merge
 */
async function composeSubgraphsWithTools(subgraphs) {
  console.log("🔧 Using @graphql-tools/merge for proper schema composition...");

  // Parse all subgraph SDL documents
  const typeDefs = [];
  for (const subgraph of subgraphs) {
    try {
      const ast = parse(subgraph.content);
      typeDefs.push(ast);
    } catch (e) {
      console.error(`❌ Failed to parse ${subgraph.name}:`, e.message);
      const lines = subgraph.content.split("\n");
      const errorLine = e.locations?.[0]?.line || 0;
      if (errorLine > 0) {
        console.error(`   Line ${errorLine}: ${lines[errorLine - 1]}`);
      }
      throw e;
    }
  }

  // Merge type definitions with conflict resolution
  const merged = mergeTypeDefs(typeDefs, {
    useSchemaDefinition: false, // Don't auto-generate schema { query: Query }
    forceSchemaDefinition: false,
    throwOnConflict: false, // Allow merging with warnings
    commentDescriptions: true,
    reverseDirectives: false,
  });

  console.log(`✅ Merged ${typeDefs.length} subgraphs`);

  // mergeTypeDefs can return either a string or AST depending on input
  // Ensure we have a string for output
  const sdl = typeof merged === "string" ? merged : print(merged);

  // Validate by creating executable schema
  try {
    // Parse SDL string back to AST for validation
    const ast = typeof merged === "string" ? parse(merged) : merged;
    const executableSchema = makeExecutableSchema({
      typeDefs: ast,
      resolvers: {}, // No resolvers needed for SDL generation
    });
    console.log("✅ Schema validation passed");
  } catch (e) {
    console.warn("⚠️  Schema validation warning:", e.message);
  }

  // Add metadata header
  const header = `# Schema Unification Forest Supergraph
# Auto-generated from ${subgraphs.length} subgraphs using @graphql-tools/merge
# Generated: ${new Date().toISOString()}
#
# Subgraphs:
${subgraphs.map((s) => `#   - ${s.name}`).join("\n")}

`;

  return header + sdl;
}

/**
 * Compose subgraphs with simple concatenation (fallback)
 */
function composeSubgraphsSimple(subgraphs) {
  console.log("⚠️  Using simple concatenation (no conflict resolution)...");

  const output = [];

  // Add supergraph header
  output.push(`# Schema Unification Forest Supergraph
# Auto-generated from ${subgraphs.length} subgraphs (simple concatenation)
# Generated: ${new Date().toISOString()}
#
# Subgraphs:
${subgraphs.map((s) => `#   - ${s.name}`).join("\n")}
`);

  // Add federation schema directive (only once for supergraph)
  output.push(
    'extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key", "@shareable", "@external", "@provides", "@requires", "@override", "@inaccessible", "@tag"])',
  );
  output.push("");

  // Collect all custom scalars with their descriptions (deduplicate)
  const customScalars = new Map(); // Map<name, description>
  subgraphs.forEach((subgraph) => {
    // Match scalar with optional description: """desc"""\nscalar Name
    const scalarMatches = subgraph.content.matchAll(/("""[\s\S]*?"""\s*)?scalar\s+(\w+)/g);
    for (const match of scalarMatches) {
      const description = match[1] ? match[1].trim() : null;
      const scalarName = match[2];
      if (!customScalars.has(scalarName)) {
        customScalars.set(scalarName, description);
      }
    }
  });

  // Add custom scalars section with descriptions
  if (customScalars.size > 0) {
    output.push("# Custom Scalars");
    Array.from(customScalars.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([scalarName, description]) => {
        if (description) {
          output.push(description);
        }
        output.push(`scalar ${scalarName}`);
        output.push("");
      });
  }

  // Add each subgraph's types
  subgraphs.forEach((subgraph) => {
    output.push(`# ==========================================`);
    output.push(`# Subgraph: ${subgraph.name.toUpperCase()}`);
    output.push(`# ==========================================`);
    output.push("");

    // Remove the extend schema directive from subgraph (we added it at top)
    let content = subgraph.content.replace(/extend schema @link\([^)]+\)\s*/g, "");

    // Remove duplicate scalar definitions (including descriptions)
    // Match: """description"""\nscalar Name or scalar Name
    content = content.replace(
      /("""[\s\S]*?"""\s*)?scalar\s+(\w+)\s*/g,
      (match, description, scalarName) => {
        if (customScalars.has(scalarName)) {
          return ""; // Already defined at top
        }
        return match;
      },
    );

    output.push(content.trim());
    output.push("");
  });

  return output.join("\n");
}

/**
 * Main composition function
 */
async function generateSupergraph(outputPath = DEFAULT_OUTPUT) {
  console.log(`\n🔨 Composing federated supergraph...`);

  // Find all subgraphs
  const subgraphPaths = await findSubgraphs();

  if (subgraphPaths.length === 0) {
    console.warn("⚠️  No subgraph files found. Run generate-subgraph-sdl.mjs first.");
    process.exit(1);
  }

  console.log(`📦 Found ${subgraphPaths.length} subgraphs:`);
  subgraphPaths.forEach((p) => console.log(`   - ${path.basename(p)}`));

  // Read all subgraphs
  const subgraphs = await Promise.all(subgraphPaths.map(readSubgraph));

  // Compose supergraph using @graphql-tools if available
  const supergraph = hasGraphQLTools
    ? await composeSubgraphsWithTools(subgraphs)
    : composeSubgraphsSimple(subgraphs);

  // Write supergraph
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, supergraph, "utf-8");
  console.log(`✅ Generated: ${outputPath}`);

  // Also write to src/data/generated/
  const srcOutputPath = path.join(SRC_GENERATED_DIR, path.basename(outputPath));
  await fs.mkdir(path.dirname(srcOutputPath), { recursive: true });
  await fs.writeFile(srcOutputPath, supergraph, "utf-8");
  console.log(`✅ Copied to: ${srcOutputPath}`);

  // Stats
  const lines = supergraph.split("\n").length;
  const types = (supergraph.match(/^type\s+\w+/gm) || []).length;
  const enums = (supergraph.match(/^enum\s+\w+/gm) || []).length;

  console.log(`\n📊 Supergraph stats:`);
  console.log(`   Lines: ${lines}`);
  console.log(`   Types: ${types}`);
  console.log(`   Enums: ${enums}`);
  console.log(`   Subgraphs: ${subgraphs.length}`);

  return supergraph;
}

/**
 * CLI Entry Point
 */
async function main() {
  const args = process.argv.slice(2);
  const outputPath = args[0] ? path.resolve(args[0]) : DEFAULT_OUTPUT;

  try {
    await generateSupergraph(outputPath);
    console.log("\n✨ Done!\n");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateSupergraph };
