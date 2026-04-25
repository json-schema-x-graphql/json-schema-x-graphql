#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the converter
const converterPath = join(__dirname, "../converters/node/dist/index.js");
let converter;

try {
  const module = await import(converterPath);
  converter = module;
} catch (error) {
  console.error("❌ Error: Could not load converter module");
  console.error("Please run: cd converters/node && npm run build");
  console.error("Error details:", error.message);
  process.exit(1);
}

// Get input file from command line or use default
const inputFile = process.argv[2] || join(__dirname, "../schema/test.json");
const outputDir = join(__dirname, "../output");

console.log("🔄 JSON Schema ↔ GraphQL Round-Trip Converter Test\n");
console.log("=".repeat(70));
console.log(`📁 Input file: ${inputFile}`);
console.log("=".repeat(70) + "\n");

try {
  // Read input JSON Schema
  console.log("📖 Step 1: Reading JSON Schema...");
  const jsonSchemaContent = readFileSync(inputFile, "utf-8");
  const jsonSchema = JSON.parse(jsonSchemaContent);
  console.log(`✅ Successfully loaded JSON Schema (${jsonSchemaContent.length} bytes)`);
  console.log(`   Schema title: ${jsonSchema.title || "N/A"}`);
  console.log(`   Schema ID: ${jsonSchema.$id || "N/A"}\n`);

  // Convert JSON Schema to GraphQL
  console.log("🔄 Step 2: Converting JSON Schema → GraphQL SDL...");
  const startTime1 = Date.now();
  const graphqlSdl = converter.jsonSchemaToGraphQL(jsonSchemaContent, {
    validate: false,
    includeDescriptions: true,
    preserveFieldOrder: true,
    federationVersion: 2,
  });
  const duration1 = Date.now() - startTime1;
  console.log(`✅ Conversion completed in ${duration1}ms`);
  console.log(`   GraphQL SDL size: ${graphqlSdl.length} bytes`);
  console.log(`   Lines of SDL: ${graphqlSdl.split("\n").length}\n`);

  // Save intermediate GraphQL SDL
  const graphqlFile = join(outputDir, `${basename(inputFile, ".json")}.graphql`);
  writeFileSync(graphqlFile, graphqlSdl, "utf-8");
  console.log(`💾 Saved GraphQL SDL to: ${graphqlFile}\n`);

  // Convert GraphQL back to JSON Schema
  console.log("🔄 Step 3: Converting GraphQL SDL → JSON Schema (round-trip)...");
  const startTime2 = Date.now();
  const roundTripJsonSchema = converter.graphqlToJsonSchema(graphqlSdl, {
    validate: false,
    includeDescriptions: true,
    preserveFieldOrder: true,
  });
  const duration2 = Date.now() - startTime2;
  console.log(`✅ Conversion completed in ${duration2}ms`);
  console.log(`   JSON Schema size: ${roundTripJsonSchema.length} bytes\n`);

  // Save round-trip JSON Schema
  const roundTripFile = join(outputDir, `${basename(inputFile, ".json")}.roundtrip.json`);
  const roundTripPretty = JSON.stringify(JSON.parse(roundTripJsonSchema), null, 2);
  writeFileSync(roundTripFile, roundTripPretty, "utf-8");
  console.log(`💾 Saved round-trip JSON Schema to: ${roundTripFile}\n`);

  // Compare original and round-trip schemas
  console.log("🔍 Step 4: Comparing original and round-trip schemas...");
  const originalParsed = JSON.parse(jsonSchemaContent);
  const roundTripParsed = JSON.parse(roundTripJsonSchema);

  // Deep comparison
  const differences = compareObjects(originalParsed, roundTripParsed, "root");

  if (differences.length === 0) {
    console.log("✅ Perfect match! Schemas are identical.\n");
  } else {
    console.log(`⚠️  Found ${differences.length} difference(s):\n`);
    differences.slice(0, 10).forEach((diff, index) => {
      console.log(`   ${index + 1}. ${diff}`);
    });
    if (differences.length > 10) {
      console.log(`   ... and ${differences.length - 10} more differences`);
    }
    console.log();
  }

  // Summary
  console.log("=".repeat(70));
  console.log("📊 SUMMARY");
  console.log("=".repeat(70));
  console.log(`Original JSON Schema:     ${jsonSchemaContent.length.toLocaleString()} bytes`);
  console.log(`GraphQL SDL:              ${graphqlSdl.length.toLocaleString()} bytes`);
  console.log(`Round-trip JSON Schema:   ${roundTripJsonSchema.length.toLocaleString()} bytes`);
  console.log(`Total time:               ${duration1 + duration2}ms`);
  console.log(
    `Schema preservation:      ${differences.length === 0 ? "100%" : `~${Math.max(0, 100 - differences.length * 2).toFixed(1)}%`}`,
  );
  console.log("=".repeat(70));

  if (differences.length === 0) {
    console.log("\n✅ Round-trip conversion successful! The schema is fully preserved.");
  } else {
    console.log("\n⚠️  Round-trip completed with minor differences (this may be expected).");
    console.log("   Check the output files for details.");
  }

  console.log("\n📁 Output files:");
  console.log(`   - ${graphqlFile}`);
  console.log(`   - ${roundTripFile}\n`);
} catch (error) {
  console.error("\n❌ Error during conversion:");
  console.error(`   ${error.message}`);
  if (error.stack) {
    console.error("\n📋 Stack trace:");
    console.error(error.stack);
  }
  process.exit(1);
}

// Helper function to compare objects
function compareObjects(obj1, obj2, path = "") {
  const differences = [];

  const keys1 = new Set(Object.keys(obj1 || {}));
  const keys2 = new Set(Object.keys(obj2 || {}));
  const allKeys = new Set([...keys1, ...keys2]);

  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key;

    if (!keys1.has(key)) {
      differences.push(`Missing in original: ${currentPath}`);
      continue;
    }

    if (!keys2.has(key)) {
      differences.push(`Missing in round-trip: ${currentPath}`);
      continue;
    }

    const val1 = obj1[key];
    const val2 = obj2[key];

    if (typeof val1 !== typeof val2) {
      differences.push(`Type mismatch at ${currentPath}: ${typeof val1} vs ${typeof val2}`);
      continue;
    }

    if (val1 === null || val2 === null) {
      if (val1 !== val2) {
        differences.push(`Value mismatch at ${currentPath}: ${val1} vs ${val2}`);
      }
      continue;
    }

    if (typeof val1 === "object") {
      if (Array.isArray(val1) && Array.isArray(val2)) {
        if (val1.length !== val2.length) {
          differences.push(
            `Array length mismatch at ${currentPath}: ${val1.length} vs ${val2.length}`,
          );
        } else {
          for (let i = 0; i < val1.length; i++) {
            const arrayDiffs = compareObjects(
              { item: val1[i] },
              { item: val2[i] },
              `${currentPath}[${i}]`,
            );
            differences.push(...arrayDiffs);
          }
        }
      } else {
        const nestedDiffs = compareObjects(val1, val2, currentPath);
        differences.push(...nestedDiffs);
      }
    } else if (val1 !== val2) {
      // Ignore some expected differences
      if (!shouldIgnoreDifference(currentPath, val1, val2)) {
        differences.push(`Value mismatch at ${currentPath}: "${val1}" vs "${val2}"`);
      }
    }
  }

  return differences;
}

// Helper to ignore expected differences
function shouldIgnoreDifference(path, val1, val2) {
  // Ignore minor formatting differences in descriptions
  if (path.includes("description") && typeof val1 === "string" && typeof val2 === "string") {
    return val1.trim() === val2.trim();
  }

  // Ignore schema version differences
  if (path.includes("$schema")) {
    return true;
  }

  return false;
}
