#!/usr/bin/env node
/**
 * Scripted JSON Schema Validator
 *
 * Discovers and validates all JSON Schema files in test-data directories.
 * Does NOT inline tests - imports schemas from test-data and validates them.
 * Outputs validation results in JSON format for CI/CD integration.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { join, relative, extname, basename } from "path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

interface ValidationResult {
  file: string;
  valid: boolean;
  errors?: Array<{
    path: string;
    message: string;
    keyword?: string;
    params?: any;
  }>;
  warnings?: string[];
  schemaVersion?: string;
  hasXGraphQLExtensions?: boolean;
}

interface ValidationReport {
  timestamp: string;
  totalSchemas: number;
  validSchemas: number;
  invalidSchemas: number;
  results: ValidationResult[];
  summary: {
    byDirectory: Record<
      string,
      { total: number; valid: number; invalid: number }
    >;
    xGraphQLSchemas: number;
  };
}

const PROJECT_ROOT = join(__dirname, "../..");
const TEST_DATA_DIRS = [
  join(PROJECT_ROOT, "converters/test-data"),
  join(PROJECT_ROOT, "converters/test-data/x-graphql"),
];

// JSON Schema meta-schemas
const DRAFT_07_META_SCHEMA = "http://json-schema.org/draft-07/schema#";
const DRAFT_2019_09_META_SCHEMA =
  "https://json-schema.org/draft/2019-09/schema";
const DRAFT_2020_12_META_SCHEMA =
  "https://json-schema.org/draft/2020-12/schema";

class SchemaValidator {
  private ajv: Ajv;
  private strictAjv: Ajv;

  constructor() {
    // Standard validator
    this.ajv = new Ajv({
      strict: false,
      allErrors: true,
      verbose: true,
      validateFormats: true,
    });
    addFormats(this.ajv);

    // Strict validator for quality checks
    this.strictAjv = new Ajv({
      strict: true,
      allErrors: true,
      verbose: true,
      validateFormats: true,
    });
    addFormats(this.strictAjv);
  }

  /**
   * Discover all JSON Schema files in test-data directories
   */
  discoverSchemas(): string[] {
    const schemas: string[] = [];

    const walkDir = (dir: string) => {
      try {
        const entries = readdirSync(dir);
        for (const entry of entries) {
          const fullPath = join(dir, entry);
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            // Skip node_modules, expected/, etc.
            if (!["node_modules", "expected", ".git"].includes(entry)) {
              walkDir(fullPath);
            }
          } else if (stat.isFile() && extname(entry) === ".json") {
            // Skip options files
            if (!entry.endsWith(".options.json")) {
              schemas.push(fullPath);
            }
          }
        }
      } catch (err) {
        // Directory might not exist, skip
      }
    };

    for (const dir of TEST_DATA_DIRS) {
      walkDir(dir);
    }

    return schemas;
  }

  /**
   * Check if schema contains x-graphql extensions
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
   * Detect schema version
   */
  detectSchemaVersion(schema: any): string {
    if (schema.$schema) {
      return schema.$schema;
    }
    // Default to draft-07
    return DRAFT_07_META_SCHEMA;
  }

  /**
   * Validate a single schema file
   */
  validateSchema(filePath: string): ValidationResult {
    const relativePath = relative(PROJECT_ROOT, filePath);
    const result: ValidationResult = {
      file: relativePath,
      valid: true,
      warnings: [],
    };

    try {
      // Read and parse schema
      const content = readFileSync(filePath, "utf-8");
      const schema = JSON.parse(content);

      // Detect schema version and x-graphql extensions
      result.schemaVersion = this.detectSchemaVersion(schema);
      result.hasXGraphQLExtensions = this.hasXGraphQLExtensions(schema);

      // Validate against JSON Schema meta-schema
      const validate = this.ajv.compile({ $ref: result.schemaVersion });
      const valid = validate(schema);

      if (!valid && validate.errors) {
        result.valid = false;
        result.errors = validate.errors.map((err) => ({
          path: err.instancePath || err.schemaPath,
          message: err.message || "Validation error",
          keyword: err.keyword,
          params: err.params,
        }));
      }

      // Run strict validation for warnings
      try {
        const strictValidate = this.strictAjv.compile({
          $ref: result.schemaVersion,
        });
        strictValidate(schema);
      } catch (err: any) {
        // Strict mode errors become warnings
        if (err.message) {
          result.warnings?.push(`Strict mode: ${err.message}`);
        }
      }

      // Additional quality checks
      this.performQualityChecks(schema, result);
    } catch (err: any) {
      result.valid = false;
      result.errors = [
        {
          path: filePath,
          message: err.message || "Failed to parse schema",
        },
      ];
    }

    return result;
  }

  /**
   * Perform additional quality checks
   */
  private performQualityChecks(schema: any, result: ValidationResult): void {
    // Check for title/description
    if (!schema.title && !schema.description) {
      result.warnings?.push("Schema missing title and description");
    }

    // Check for definitions without usage
    if (schema.definitions || schema.$defs) {
      const defs = schema.definitions || schema.$defs;
      // This is informational only
      const defCount = Object.keys(defs).length;
      if (defCount > 0) {
        result.warnings?.push(`Schema has ${defCount} definitions`);
      }
    }

    // Check for x-graphql extensions consistency
    if (result.hasXGraphQLExtensions) {
      this.validateXGraphQLExtensions(schema, result);
    }
  }

  /**
   * Validate x-graphql extension usage
   */
  private validateXGraphQLExtensions(
    schema: any,
    result: ValidationResult,
  ): void {
    const checkExtensions = (obj: any, path: string = "") => {
      if (!obj || typeof obj !== "object") return;

      for (const key in obj) {
        const currentPath = path ? `${path}.${key}` : key;

        if (key.startsWith("x-graphql-")) {
          const extName = key.substring("x-graphql-".length);

          // Canonical x-graphql extensions from X-GRAPHQL-ATTRIBUTE-REGISTRY.md
          // See: docs/reference/x-graphql/X-GRAPHQL-ATTRIBUTE-REGISTRY.md
          const knownExtensions = new Set([
            // Federation Attributes (6+)
            "federation",
            "federation-keys",
            "federation-shareable",
            "federation-authenticated",
            "federation-inaccessible",
            "federation-interface-object",
            "federation-provides",
            "federation-external",
            "federation-requires",
            "federation-override-from",

            // Type Definition Attributes (7)
            "type",
            "type-name",
            "type-kind",
            "type-directives",
            "implements",
            "union",
            "union-types",

            // Field Definition Attributes (8+)
            "field",
            "field-type",
            "field-name",
            "field-directives",
            "field-non-null",
            "field-list-item-non-null",
            "required",
            "nullable",
            "skip",
            "arguments",

            // Scalar Attributes (4)
            "scalar",
            "scalar-type",
            "scalar-references",
            "shared-scalars",

            // Directive Attributes (3)
            "directives",
            "directives-catalog",
            "arg-directives",

            // Operations & Query Attributes (3)
            "operations",
            "pagination",
            "args",

            // Enum Attributes (2)
            "enum",
            "enums",

            // Schema & System Attributes (2)
            "schema-reference",
            "system",

            // Data Source Mapping Attributes (3)
            "source-reference",
            "source-mapping-type",
            "mapping-notes",

            // Performance Attributes (4)
            "performance",
            "phase3-performance",
            "complexity",
            "query-cost",

            // Security & Authorization Attributes (3)
            "authorization",
            "security",
            "sensitive-data",

            // Caching & Observability Attributes (3)
            "caching",
            "observability",
            "rate-limiting",

            // Cost Model Attribute (1)
            "cost-model",

            // Error Handling Attribute (1)
            "error-codes",

            // Query Templates Attribute (1)
            "query-templates",

            // Other common attributes
            "description",
            "inline-object-threshold",
            "inline-description-threshold",
            "description-block-threshold",
          ]);

          if (!knownExtensions.has(extName)) {
            result.warnings?.push(
              `Unknown x-graphql extension at ${currentPath}: ${key}`,
            );
          }

          // Validate extension value types
          if (key === "x-graphql-skip" && typeof obj[key] !== "boolean") {
            result.warnings?.push(
              `${currentPath} should be boolean, got ${typeof obj[key]}`,
            );
          }
          if (key === "x-graphql-nullable" && typeof obj[key] !== "boolean") {
            result.warnings?.push(
              `${currentPath} should be boolean, got ${typeof obj[key]}`,
            );
          }
          if (
            (key === "x-graphql-name" || key === "x-graphql-field-name") &&
            typeof obj[key] !== "string"
          ) {
            result.warnings?.push(
              `${currentPath} should be string, got ${typeof obj[key]}`,
            );
          }
        }

        if (typeof obj[key] === "object") {
          checkExtensions(obj[key], currentPath);
        }
      }
    };

    checkExtensions(schema);
  }

  /**
   * Validate all discovered schemas
   */
  validateAll(): ValidationReport {
    const schemas = this.discoverSchemas();
    const results: ValidationResult[] = [];
    const byDirectory: Record<
      string,
      { total: number; valid: number; invalid: number }
    > = {};

    console.log(`\n🔍 Discovered ${schemas.length} schema files\n`);

    for (const schemaPath of schemas) {
      const result = this.validateSchema(schemaPath);
      results.push(result);

      // Track by directory
      const dir = relative(PROJECT_ROOT, join(schemaPath, ".."));
      if (!byDirectory[dir]) {
        byDirectory[dir] = { total: 0, valid: 0, invalid: 0 };
      }
      byDirectory[dir].total++;
      if (result.valid) {
        byDirectory[dir].valid++;
      } else {
        byDirectory[dir].invalid++;
      }

      // Log result
      const status = result.valid ? "✅" : "❌";
      const xGraphQL = result.hasXGraphQLExtensions ? "🔧" : "  ";
      console.log(`${status} ${xGraphQL} ${result.file}`);

      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((err) => {
          console.log(`   ❌ ${err.path}: ${err.message}`);
        });
      }
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach((warn) => {
          console.log(`   ⚠️  ${warn}`);
        });
      }
    }

    const validCount = results.filter((r) => r.valid).length;
    const xGraphQLCount = results.filter((r) => r.hasXGraphQLExtensions).length;

    const report: ValidationReport = {
      timestamp: new Date().toISOString(),
      totalSchemas: schemas.length,
      validSchemas: validCount,
      invalidSchemas: schemas.length - validCount,
      results,
      summary: {
        byDirectory,
        xGraphQLSchemas: xGraphQLCount,
      },
    };

    return report;
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const flags = {
    json: args.includes("--json"),
    output: args.find((arg) => arg.startsWith("--output="))?.split("=")[1],
    failOnError: args.includes("--fail-on-error"),
    failOnWarning: args.includes("--fail-on-warning"),
  };

  const validator = new SchemaValidator();
  const report = validator.validateAll();

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("VALIDATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total schemas:    ${report.totalSchemas}`);
  console.log(`Valid schemas:    ${report.validSchemas} ✅`);
  console.log(`Invalid schemas:  ${report.invalidSchemas} ❌`);
  console.log(`x-graphql schemas: ${report.summary.xGraphQLSchemas} 🔧`);
  console.log("\nBy directory:");
  for (const [dir, stats] of Object.entries(report.summary.byDirectory)) {
    console.log(`  ${dir}:`);
    console.log(
      `    Total: ${stats.total}, Valid: ${stats.valid}, Invalid: ${stats.invalid}`,
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
  if (flags.failOnError && report.invalidSchemas > 0) {
    console.error("❌ Validation failed: invalid schemas found");
    process.exit(1);
  }

  const totalWarnings = report.results.reduce(
    (sum, r) => sum + (r.warnings?.length || 0),
    0,
  );
  if (flags.failOnWarning && totalWarnings > 0) {
    console.error("⚠️  Validation failed: warnings found");
    process.exit(1);
  }

  console.log("✅ Schema validation complete\n");
}

if (require.main === module) {
  main();
}

export { SchemaValidator, ValidationResult, ValidationReport };
