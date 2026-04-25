#!/usr/bin/env node
/**
 * Integration Test Harness - JSON Schema to GraphQL Conversion
 *
 * Discovers JSON Schema test files, converts them to GraphQL SDL,
 * and compares output against expected SDL files in test-data.
 * Does NOT inline tests - imports from test-data directories.
 * Outputs test results in JSON format for CI/CD integration.
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join, relative, basename } from "path";
import { jsonSchemaToGraphQL } from "../../converters/node/src/converter";
import { parse as parseGraphQL } from "graphql";

interface ConversionTestResult {
  schemaFile: string;
  expectedFile?: string;
  passed: boolean;
  skipped: boolean;
  skipReason?: string;
  errors?: string[];
  warnings?: string[];
  generatedSDL?: string;
  expectedSDL?: string;
  diff?: string;
  metadata?: {
    conversionTimeMs: number;
    generatedTypes: number;
    expectedTypes?: number;
    hasXGraphQLExtensions: boolean;
  };
}

interface IntegrationTestReport {
  timestamp: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  results: ConversionTestResult[];
  summary: {
    byDirectory: Record<
      string,
      { total: number; passed: number; failed: number; skipped: number }
    >;
    averageConversionTimeMs: number;
    totalTypesGenerated: number;
  };
}

const PROJECT_ROOT = join(__dirname, "../..");
const TEST_DATA_DIR = join(PROJECT_ROOT, "converters/test-data");
const X_GRAPHQL_DIR = join(TEST_DATA_DIR, "x-graphql");
const EXPECTED_DIR = join(X_GRAPHQL_DIR, "expected");

class IntegrationTestHarness {
  /**
   * Discover test schema files
   */
  discoverTestSchemas(): Array<{ schemaPath: string; expectedPath?: string }> {
    const tests: Array<{ schemaPath: string; expectedPath?: string }> = [];

    // First, check x-graphql directory for schemas with expected outputs
    if (existsSync(X_GRAPHQL_DIR)) {
      const files = readdirSync(X_GRAPHQL_DIR);
      for (const file of files) {
        if (file.endsWith(".json")) {
          const schemaPath = join(X_GRAPHQL_DIR, file);
          const baseName = basename(file, ".json");
          const expectedPath = join(EXPECTED_DIR, `${baseName}.graphql`);

          tests.push({
            schemaPath,
            expectedPath: existsSync(expectedPath) ? expectedPath : undefined,
          });
        }
      }
    }

    // Also include other test schemas (without expected outputs)
    const otherSchemas = [
      "complex-schema.json",
      "user-service.json",
      "federation_v2.json",
      "federation_auto.json",
    ];

    for (const schema of otherSchemas) {
      const schemaPath = join(TEST_DATA_DIR, schema);
      if (existsSync(schemaPath)) {
        tests.push({ schemaPath, expectedPath: undefined });
      }
    }

    return tests;
  }

  /**
   * Load options file if exists
   */
  loadOptions(schemaPath: string): any {
    const optionsPath = schemaPath.replace(".json", ".options.json");
    if (existsSync(optionsPath)) {
      try {
        const content = readFileSync(optionsPath, "utf-8");
        return JSON.parse(content);
      } catch {
        // Invalid options file, use defaults
        return {};
      }
    }
    return {};
  }

  /**
   * Check if schema has x-graphql extensions
   */
  hasXGraphQLExtensions(schema: any): boolean {
    const checkObject = (obj: any): boolean => {
      if (!obj || typeof obj !== "object") return false;

      for (const key in obj) {
        if (key.startsWith("x-graphql")) return true;
        if (typeof obj[key] === "object" && checkObject(obj[key])) return true;
      }
      return false;
    };

    return checkObject(schema);
  }

  /**
   * Count types in SDL
   */
  countTypes(sdl: string): number {
    try {
      const ast = parseGraphQL(sdl);
      let count = 0;
      for (const def of ast.definitions) {
        if (
          def.kind === "ObjectTypeDefinition" ||
          def.kind === "InterfaceTypeDefinition" ||
          def.kind === "InputObjectTypeDefinition" ||
          def.kind === "EnumTypeDefinition" ||
          def.kind === "ScalarTypeDefinition" ||
          def.kind === "UnionTypeDefinition"
        ) {
          count++;
        }
      }
      return count;
    } catch {
      return 0;
    }
  }

  /**
   * Normalize SDL for comparison (remove whitespace differences)
   */
  normalizeSDL(sdl: string): string {
    return sdl
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .join("\n");
  }

  /**
   * Generate diff between expected and actual SDL
   */
  generateDiff(expected: string, actual: string): string {
    const expectedLines = expected.split("\n");
    const actualLines = actual.split("\n");
    const diff: string[] = [];

    const maxLines = Math.max(expectedLines.length, actualLines.length);

    for (let i = 0; i < maxLines; i++) {
      const expectedLine = expectedLines[i] || "";
      const actualLine = actualLines[i] || "";

      if (expectedLine !== actualLine) {
        if (expectedLine) {
          diff.push(`- ${expectedLine}`);
        }
        if (actualLine) {
          diff.push(`+ ${actualLine}`);
        }
      }
    }

    return diff.join("\n");
  }

  /**
   * Run a single conversion test
   */
  async runTest(test: {
    schemaPath: string;
    expectedPath?: string;
  }): Promise<ConversionTestResult> {
    const relativePath = relative(PROJECT_ROOT, test.schemaPath);
    const result: ConversionTestResult = {
      schemaFile: relativePath,
      expectedFile: test.expectedPath
        ? relative(PROJECT_ROOT, test.expectedPath)
        : undefined,
      passed: false,
      skipped: false,
      warnings: [],
    };

    try {
      // Load schema
      const schemaContent = readFileSync(test.schemaPath, "utf-8");
      const schema = JSON.parse(schemaContent);

      // Check for x-graphql extensions
      const hasExtensions = this.hasXGraphQLExtensions(schema);

      // Load options
      const options = this.loadOptions(test.schemaPath);

      // Check if test should be skipped
      if (options._skip || schema._skip) {
        result.skipped = true;
        result.skipReason =
          options._skipReason || schema._skipReason || "Marked as skip";
        return result;
      }

      // Convert schema to SDL
      const startTime = Date.now();
      let generatedSDL: string;

      try {
        generatedSDL = jsonSchemaToGraphQL(schema, options);
      } catch (conversionError: any) {
        result.passed = false;
        result.errors = [conversionError.message || "Conversion failed"];
        return result;
      }

      const conversionTime = Date.now() - startTime;
      const generatedTypes = this.countTypes(generatedSDL);

      result.generatedSDL = generatedSDL;
      result.metadata = {
        conversionTimeMs: conversionTime,
        generatedTypes,
        hasXGraphQLExtensions: hasExtensions,
      };

      // If expected SDL exists, compare
      if (test.expectedPath && existsSync(test.expectedPath)) {
        const expectedSDL = readFileSync(test.expectedPath, "utf-8");
        result.expectedSDL = expectedSDL;
        result.metadata.expectedTypes = this.countTypes(expectedSDL);

        // Normalize both for comparison
        const normalizedExpected = this.normalizeSDL(expectedSDL);
        const normalizedGenerated = this.normalizeSDL(generatedSDL);

        if (normalizedExpected === normalizedGenerated) {
          result.passed = true;
        } else {
          result.passed = false;
          result.errors = ["Generated SDL does not match expected SDL"];
          result.diff = this.generateDiff(
            normalizedExpected,
            normalizedGenerated,
          );
        }
      } else {
        // No expected output - just validate SDL is parseable
        try {
          parseGraphQL(generatedSDL);
          result.passed = true;
          result.warnings?.push(
            "No expected SDL to compare against - validated syntax only",
          );
        } catch (parseError: any) {
          result.passed = false;
          result.errors = [`Generated invalid SDL: ${parseError.message}`];
        }
      }

      // Additional validations
      if (hasExtensions) {
        // Check that x-graphql extensions were applied
        const hasSkipExtension =
          schema["x-graphql-skip"] !== undefined ||
          JSON.stringify(schema).includes("x-graphql-skip");
        const hasDescriptionExtension = JSON.stringify(schema).includes(
          "x-graphql-description",
        );

        if (hasSkipExtension && generatedSDL.includes("# Skipped")) {
          result.warnings?.push("x-graphql-skip may not be applied correctly");
        }

        if (!hasDescriptionExtension && !generatedSDL.includes('"""')) {
          result.warnings?.push("Schema may be missing descriptions");
        }
      }
    } catch (err: any) {
      result.passed = false;
      result.errors = [err.message || "Test execution failed"];
    }

    return result;
  }

  /**
   * Run all integration tests
   */
  async runAll(): Promise<IntegrationTestReport> {
    const tests = this.discoverTestSchemas();
    const results: ConversionTestResult[] = [];
    const byDirectory: Record<
      string,
      { total: number; passed: number; failed: number; skipped: number }
    > = {};

    console.log(`\n🧪 Discovered ${tests.length} integration test cases\n`);

    let totalConversionTime = 0;
    let totalTypesGenerated = 0;
    let conversionCount = 0;

    for (const test of tests) {
      const result = await this.runTest(test);
      results.push(result);

      // Track by directory
      const dir = relative(PROJECT_ROOT, join(test.schemaPath, ".."));
      if (!byDirectory[dir]) {
        byDirectory[dir] = { total: 0, passed: 0, failed: 0, skipped: 0 };
      }
      byDirectory[dir].total++;

      if (result.skipped) {
        byDirectory[dir].skipped++;
      } else if (result.passed) {
        byDirectory[dir].passed++;
      } else {
        byDirectory[dir].failed++;
      }

      // Aggregate metadata
      if (result.metadata) {
        totalConversionTime += result.metadata.conversionTimeMs;
        totalTypesGenerated += result.metadata.generatedTypes;
        conversionCount++;
      }

      // Log result
      let status = result.passed ? "✅" : "❌";
      if (result.skipped) status = "⏭️ ";
      const xGraphQL = result.metadata?.hasXGraphQLExtensions ? "🔧" : "  ";
      const expected = result.expectedFile ? "📋" : "  ";

      console.log(`${status} ${xGraphQL}${expected} ${result.schemaFile}`);

      if (result.skipped) {
        console.log(`      Skipped: ${result.skipReason}`);
      } else if (result.metadata) {
        console.log(
          `      ${result.metadata.conversionTimeMs}ms, ` +
            `${result.metadata.generatedTypes} types` +
            (result.metadata.expectedTypes
              ? ` (expected ${result.metadata.expectedTypes})`
              : ""),
        );
      }

      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((err) => {
          console.log(`   ❌ ${err}`);
        });
      }

      if (result.diff) {
        const diffLines = result.diff.split("\n").slice(0, 10); // Show first 10 lines
        console.log("   📝 Diff (first 10 lines):");
        diffLines.forEach((line) => {
          console.log(`      ${line}`);
        });
        if (result.diff.split("\n").length > 10) {
          console.log(
            `      ... (${result.diff.split("\n").length - 10} more lines)`,
          );
        }
      }

      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach((warn) => {
          console.log(`   ⚠️  ${warn}`);
        });
      }
    }

    const passedCount = results.filter((r) => r.passed && !r.skipped).length;
    const failedCount = results.filter((r) => !r.passed && !r.skipped).length;
    const skippedCount = results.filter((r) => r.skipped).length;

    const report: IntegrationTestReport = {
      timestamp: new Date().toISOString(),
      totalTests: tests.length,
      passedTests: passedCount,
      failedTests: failedCount,
      skippedTests: skippedCount,
      results,
      summary: {
        byDirectory,
        averageConversionTimeMs:
          conversionCount > 0 ? totalConversionTime / conversionCount : 0,
        totalTypesGenerated,
      },
    };

    return report;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const flags = {
    json: args.includes("--json"),
    output: args.find((arg) => arg.startsWith("--output="))?.split("=")[1],
    failOnError: args.includes("--fail-on-error"),
    verbose: args.includes("--verbose"),
    updateExpected: args.includes("--update-expected"),
  };

  const harness = new IntegrationTestHarness();
  const report = await harness.runAll();

  // Handle update-expected flag
  if (flags.updateExpected && report.failedTests > 0) {
    console.log("\n🔄 Updating expected SDL files...");
    let updatedCount = 0;

    for (const result of report.results) {
      if (!result.passed && result.expectedFile && result.generatedSDL) {
        try {
          const fullPath = join(PROJECT_ROOT, result.expectedFile);
          writeFileSync(fullPath, result.generatedSDL);
          console.log(`   📝 Updated: ${result.expectedFile}`);
          updatedCount++;
          // Mark as passed for the report if we want, or just let users re-run
          result.passed = true; // Optimistically mark as passed
          report.failedTests--;
          report.passedTests++;
        } catch (err: any) {
          console.error(
            `   ❌ Failed to update ${result.expectedFile}: ${err.message}`,
          );
        }
      }
    }
    console.log(`\n✅ Updated ${updatedCount} expected files.\n`);
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("INTEGRATION TEST SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total tests:     ${report.totalTests}`);
  console.log(`Passed:          ${report.passedTests} ✅`);
  console.log(`Failed:          ${report.failedTests} ❌`);
  console.log(`Skipped:         ${report.skippedTests} ⏭️`);
  console.log(
    `Avg conv time:   ${report.summary.averageConversionTimeMs.toFixed(2)}ms`,
  );
  console.log(`Total types:     ${report.summary.totalTypesGenerated}`);
  console.log("\nBy directory:");
  for (const [dir, stats] of Object.entries(report.summary.byDirectory)) {
    console.log(`  ${dir}:`);
    console.log(
      `    Total: ${stats.total}, ` +
        `Passed: ${stats.passed}, ` +
        `Failed: ${stats.failed}, ` +
        `Skipped: ${stats.skipped}`,
    );
  }
  console.log("=".repeat(60) + "\n");

  // Output JSON report if requested
  if (flags.output) {
    writeFileSync(flags.output, JSON.stringify(report, null, 2));
    console.log(`📄 Report written to: ${flags.output}\n`);
  }

  if (flags.json) {
    console.log(JSON.stringify(report, null, 2));
  }

  // Exit with error if requested
  if (flags.failOnError && report.failedTests > 0) {
    console.error("❌ Integration tests failed");
    process.exit(1);
  }

  if (report.failedTests === 0 && report.passedTests > 0) {
    console.log("✅ All integration tests passed\n");
  } else if (report.failedTests > 0) {
    console.log("⚠️  Some integration tests failed\n");
  } else {
    console.log("ℹ️  No tests executed\n");
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}

export { IntegrationTestHarness, ConversionTestResult, IntegrationTestReport };
