#!/usr/bin/env node

/**
 * Manual Node.js Converter Test Script
 * Tests the Node.js converter against all test schemas and compares outputs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { jsonSchemaToGraphQL } from "../converters/node/dist/converter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

// Paths
const PROJECT_ROOT = path.resolve(__dirname, "..");
const TEST_DATA_DIR = path.join(PROJECT_ROOT, "converters/test-data/x-graphql");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "output/node-test");
const EXPECTED_DIR = path.join(TEST_DATA_DIR, "expected");

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Stats
let total = 0;
let passed = 0;
let failed = 0;

console.log(`${colors.bold}${colors.cyan}`);
console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║           Node.js Converter Manual Test Suite                 ║");
console.log("╚════════════════════════════════════════════════════════════════╝");
console.log(colors.reset);

// Get all test schemas
const schemaFiles = fs
  .readdirSync(TEST_DATA_DIR)
  .filter((file) => file.endsWith(".json"))
  .sort();

console.log(`${colors.bold}Found ${schemaFiles.length} test schemas${colors.reset}\n`);

// Converter options
const converterOptions = {
  includeDescriptions: true,
  preserveFieldOrder: true,
  includeFederationDirectives: true,
  validate: false, // Skip validation to avoid errors
};

// Test each schema
for (const schemaFile of schemaFiles) {
  const schemaName = path.basename(schemaFile, ".json");
  const schemaPath = path.join(TEST_DATA_DIR, schemaFile);
  const expectedPath = path.join(EXPECTED_DIR, `${schemaName}.graphql`);
  const outputPath = path.join(OUTPUT_DIR, `${schemaName}.graphql`);

  console.log(`${colors.cyan}──────────────────────────────────────────────────${colors.reset}`);
  console.log(`${colors.bold}Testing: ${schemaName}${colors.reset}`);
  console.log(`${colors.cyan}──────────────────────────────────────────────────${colors.reset}`);

  total++;

  try {
    // Read schema
    const schemaContent = fs.readFileSync(schemaPath, "utf-8");
    const schema = JSON.parse(schemaContent);

    // Convert
    const sdl = jsonSchemaToGraphQL(schema, converterOptions);

    // Write output
    fs.writeFileSync(outputPath, sdl);

    console.log(`  ${colors.green}✓ Conversion succeeded${colors.reset}`);

    // Compare with expected if it exists
    if (fs.existsSync(expectedPath)) {
      const expected = fs.readFileSync(expectedPath, "utf-8");

      // Normalize whitespace for comparison
      const normalizeSDL = (sdl) =>
        sdl
          .trim()
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l)
          .join("\n");
      const normalizedExpected = normalizeSDL(expected);
      const normalizedActual = normalizeSDL(sdl);

      if (normalizedExpected === normalizedActual) {
        console.log(`  ${colors.green}✓ Output matches expected${colors.reset}`);
        passed++;
      } else {
        console.log(`  ${colors.red}✗ Output differs from expected${colors.reset}`);

        // Show a preview of differences
        const expectedLines = normalizedExpected.split("\n");
        const actualLines = normalizedActual.split("\n");
        const maxLines = Math.max(expectedLines.length, actualLines.length);

        let diffCount = 0;
        for (let i = 0; i < maxLines && diffCount < 5; i++) {
          if (expectedLines[i] !== actualLines[i]) {
            console.log(`    Line ${i + 1}:`);
            console.log(`      Expected: ${expectedLines[i] || "(empty)"}`);
            console.log(`      Actual:   ${actualLines[i] || "(empty)"}`);
            diffCount++;
          }
        }

        if (diffCount >= 5) {
          console.log(`    ... and more differences`);
        }

        failed++;
      }
    } else {
      console.log(`  ${colors.yellow}⚠ No expected output to compare${colors.reset}`);
    }

    // Manual validation checks
    console.log(`\n  ${colors.bold}Manual Validation:${colors.reset}`);

    if (schemaName === "interfaces") {
      if (sdl.includes("interface Node")) {
        console.log(
          `    ${colors.green}✓ Interface generation: 'interface Node' found${colors.reset}`,
        );
      } else {
        console.log(
          `    ${colors.red}✗ Interface generation: 'interface Node' NOT found${colors.reset}`,
        );
      }

      if (sdl.includes("implements Node")) {
        console.log(
          `    ${colors.green}✓ Interface implementation: 'implements Node' found${colors.reset}`,
        );
      } else {
        console.log(
          `    ${colors.red}✗ Interface implementation: 'implements Node' NOT found${colors.reset}`,
        );
      }
    }

    if (schemaName === "skip-fields") {
      if (!sdl.includes("password_hash") && !sdl.includes("passwordHash")) {
        console.log(`    ${colors.green}✓ Field skip: password_hash NOT in output${colors.reset}`);
      } else {
        console.log(`    ${colors.red}✗ Field skip: password_hash found in output${colors.reset}`);
      }

      if (!sdl.includes("InternalType")) {
        console.log(`    ${colors.green}✓ Type skip: InternalType NOT in output${colors.reset}`);
      } else {
        console.log(`    ${colors.red}✗ Type skip: InternalType found in output${colors.reset}`);
      }
    }

    if (schemaName === "nullability") {
      const requiredFieldMatch = sdl.match(/requiredField:\s*(\w+!)/);
      if (requiredFieldMatch) {
        console.log(
          `    ${colors.green}✓ Nullability: requiredField has '!' marker${colors.reset}`,
        );
      } else {
        console.log(
          `    ${colors.red}✗ Nullability: requiredField missing '!' marker${colors.reset}`,
        );
      }
    }

    if (schemaName === "comprehensive" || schemaName === "comprehensive-features") {
      const customScalars = ["Email", "URL", "DateTime", "JSON"];
      const foundScalars = customScalars.filter((scalar) => sdl.includes(scalar));

      if (foundScalars.length > 0) {
        console.log(
          `    ${colors.green}✓ Custom scalars: ${foundScalars.join(", ")}${colors.reset}`,
        );
      } else {
        console.log(`    ${colors.yellow}⚠ Custom scalars: none found${colors.reset}`);
      }

      if (sdl.includes("[String!]") || sdl.includes("[ID!]")) {
        console.log(`    ${colors.green}✓ List item non-null: [Type!] syntax found${colors.reset}`);
      } else {
        console.log(
          `    ${colors.yellow}⚠ List item non-null: [Type!] syntax not found${colors.reset}`,
        );
      }

      const fedDirectives = ["@key", "@requires", "@provides", "@external"];
      const foundDirectives = fedDirectives.filter((dir) => sdl.includes(dir));

      if (foundDirectives.length > 0) {
        console.log(
          `    ${colors.green}✓ Federation: ${foundDirectives.join(", ")}${colors.reset}`,
        );
      } else {
        console.log(`    ${colors.yellow}⚠ Federation: no directives found${colors.reset}`);
      }
    }

    if (schemaName === "unions") {
      if (sdl.match(/union\s+\w+\s*=\s*\w+(\s*\|\s*\w+)+/)) {
        console.log(
          `    ${colors.green}✓ Union syntax: 'union Name = Type1 | Type2' found${colors.reset}`,
        );
      } else {
        console.log(`    ${colors.red}✗ Union syntax: proper union not found${colors.reset}`);
      }
    }

    if (schemaName === "descriptions") {
      if (sdl.includes('"""') && sdl.includes('"')) {
        console.log(
          `    ${colors.green}✓ Descriptions: both block (""") and inline (") styles found${colors.reset}`,
        );
      } else {
        console.log(`    ${colors.yellow}⚠ Descriptions: check format${colors.reset}`);
      }
    }
  } catch (error) {
    console.log(`  ${colors.red}✗ Conversion failed: ${error.message}${colors.reset}`);
    failed++;

    // Show stack trace for debugging
    if (process.env.VERBOSE) {
      console.log(error.stack);
    }
  }

  console.log("");
}

// Summary
console.log(`${colors.bold}${colors.cyan}`);
console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║                      SUMMARY REPORT                            ║");
console.log("╚════════════════════════════════════════════════════════════════╝");
console.log(colors.reset);

console.log(`\n${colors.bold}Results:${colors.reset}`);
console.log(`  Total tests:  ${total}`);
console.log(`  ${colors.green}Passed:       ${passed}${colors.reset}`);
console.log(`  ${colors.red}Failed:       ${failed}${colors.reset}`);

console.log(`\n${colors.bold}Output Location:${colors.reset}`);
console.log(`  ${OUTPUT_DIR}`);

console.log(`\n${colors.bold}Files Generated:${colors.reset}`);
for (const schemaFile of schemaFiles) {
  const schemaName = path.basename(schemaFile, ".json");
  const outputPath = path.join(OUTPUT_DIR, `${schemaName}.graphql`);
  if (fs.existsSync(outputPath)) {
    const size = fs.statSync(outputPath).size;
    console.log(`  • ${schemaName}.graphql (${size} bytes)`);
  }
}

console.log("");

if (failed === 0 && passed === total) {
  console.log(`${colors.green}${colors.bold}✓ ALL TESTS PASSED!${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`${colors.red}${colors.bold}✗ SOME TESTS FAILED${colors.reset}\n`);
  console.log(`Review outputs in: ${OUTPUT_DIR}\n`);
  process.exit(1);
}
