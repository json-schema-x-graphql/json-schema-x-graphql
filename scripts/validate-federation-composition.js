#!/usr/bin/env node

/**
 * Federation Composition Validation Script
 *
 * Uses @theguild/federation-composition to validate and compose
 * generated federated subgraphs into a supergraph schema.
 *
 * This validates that:
 * 1. Each subgraph SDL is valid
 * 2. Federation directives are correct
 * 3. Subgraphs can be composed without errors
 * 4. Entity references are properly resolved
 */

const fs = require("fs");
const path = require("path");
const { parse, print } = require("graphql");
const { composeServices } = require("@theguild/federation-composition");

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printHeader(title) {
  console.log("\n" + "=".repeat(60));
  log(title, "cyan");
  console.log("=".repeat(60) + "\n");
}

function readSubgraphSchema(filePath) {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    log(`✗ Failed to read ${filePath}: ${error.message}`, "red");
    return null;
  }
}

function validateSubgraph(name, schema) {
  // Basic validation checks
  const checks = [
    {
      name: "Has type definitions",
      test: /type\s+\w+/,
    },
    {
      name: "Has federation directives",
      test: /@(key|extends|external|provides|requires|shareable)/,
    },
    {
      name: "Valid GraphQL syntax",
      test: /type\s+\w+\s*\{/,
    },
  ];

  const results = checks.map((check) => ({
    name: check.name,
    passed: check.test.test(schema),
  }));

  return results;
}

async function composeSubgraphs(subgraphs) {
  try {
    // Parse and validate each subgraph SDL first
    const services = subgraphs.map((sg) => {
      try {
        const document = parse(sg.schema);
        const normalizedSchema = print(document);
        return {
          name: sg.name,
          typeDefs: document, // Pass the parsed DocumentNode
        };
      } catch (parseError) {
        log(`\n✗ Failed to parse ${sg.name}: ${parseError.message}`, "red");
        throw parseError;
      }
    });

    log(`Attempting to compose ${services.length} subgraphs...`, "blue");

    const result = composeServices(services);

    if (result.errors && result.errors.length > 0) {
      log("\n✗ Composition failed with errors:", "red");
      result.errors.forEach((error, index) => {
        console.log(`\n  ${index + 1}. ${error.message}`);
        if (error.extensions?.serviceName) {
          console.log(`     Service: ${error.extensions.serviceName}`);
        }
        if (error.extensions?.code) {
          console.log(`     Code: ${error.extensions.code}`);
        }
      });
      return { success: false, errors: result.errors };
    }

    if (result.supergraphSdl) {
      log("\n✓ Composition successful!", "green");
      return { success: true, supergraphSdl: result.supergraphSdl };
    }

    return { success: false, errors: ["Unknown composition error"] };
  } catch (error) {
    log(`\n✗ Composition error: ${error.message}`, "red");
    console.error(error.stack);
    return { success: false, errors: [error.message] };
  }
}

function writeSupergraphSchema(outputPath, schema) {
  try {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, schema, "utf-8");
    log(`\n✓ Supergraph schema written to: ${outputPath}`, "green");
    return true;
  } catch (error) {
    log(`\n✗ Failed to write supergraph: ${error.message}`, "red");
    return false;
  }
}

function printSubgraphValidation(name, results) {
  console.log(`\n  ${name}:`);
  results.forEach((result) => {
    const symbol = result.passed ? "✓" : "✗";
    const color = result.passed ? "green" : "red";
    log(`    ${symbol} ${result.name}`, color);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const outputDir = args[0] || "output/federation/node";
  const supergraphOutput = args[1] || "output/federation/supergraph";

  printHeader("Federation Composition Validation");

  // Define examples and their subgraphs
  const examples = [
    {
      name: "apollo-classic",
      subgraphs: ["users", "products", "reviews"],
    },
    {
      name: "strawberry",
      subgraphs: ["books", "reviews"],
    },
  ];

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const example of examples) {
    printHeader(`Example: ${example.name}`);

    // Load all subgraph schemas
    const subgraphs = [];
    for (const serviceName of example.subgraphs) {
      const fileName = `${example.name}-${serviceName}.graphql`;
      const filePath = path.join(outputDir, fileName);

      log(`\nLoading subgraph: ${serviceName}`, "blue");
      const schema = readSubgraphSchema(filePath);

      if (!schema) {
        totalFailed++;
        continue;
      }

      // Validate subgraph
      const validation = validateSubgraph(serviceName, schema);
      printSubgraphValidation(serviceName, validation);

      const allPassed = validation.every((v) => v.passed);
      if (!allPassed) {
        log(`  ✗ Subgraph validation failed`, "red");
        totalFailed++;
      } else {
        log(`  ✓ Subgraph validation passed`, "green");
      }

      subgraphs.push({
        name: serviceName,
        schema,
      });
    }

    if (subgraphs.length === 0) {
      log("\n✗ No subgraphs loaded, skipping composition", "red");
      totalFailed++;
      continue;
    }

    // Attempt composition
    printHeader(`Composing ${example.name} subgraphs`);
    const compositionResult = await composeSubgraphs(subgraphs);

    if (compositionResult.success) {
      totalSuccess++;

      // Write supergraph schema
      const supergraphPath = path.join(supergraphOutput, `${example.name}-supergraph.graphql`);
      writeSupergraphSchema(supergraphPath, compositionResult.supergraphSdl);

      // Show some stats
      const lines = compositionResult.supergraphSdl.split("\n").length;
      const types = (compositionResult.supergraphSdl.match(/type\s+\w+/g) || []).length;
      log(`\n  Stats:`, "blue");
      console.log(`    Lines: ${lines}`);
      console.log(`    Types: ${types}`);
    } else {
      totalFailed++;
    }
  }

  // Final summary
  printHeader("Validation Summary");
  console.log(`  Examples tested: ${examples.length}`);
  log(`  ✓ Successful: ${totalSuccess}`, "green");
  if (totalFailed > 0) {
    log(`  ✗ Failed: ${totalFailed}`, "red");
  }

  // Exit with appropriate code
  if (totalFailed > 0) {
    log("\n⚠ Some validations failed", "yellow");
    process.exit(1);
  } else {
    log("\n✓ All validations passed!", "green");
    process.exit(0);
  }
}

// Run the script
main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
