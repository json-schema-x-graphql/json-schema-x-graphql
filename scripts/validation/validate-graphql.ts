#!/usr/bin/env node
/**
 * Scripted GraphQL SDL Validator
 *
 * Discovers and validates all GraphQL SDL files in test-data directories.
 * Does NOT inline tests - imports SDL from test-data and validates them.
 * Outputs validation results in JSON format for CI/CD integration.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { join, relative, extname } from "path";
import { parse, validate, buildSchema, GraphQLError } from "graphql";
import { buildSubgraphSchema } from "@apollo/subgraph";
import gql from "graphql-tag";

interface SDLValidationResult {
  file: string;
  valid: boolean;
  errors?: Array<{
    message: string;
    line?: number;
    column?: number;
    type: "syntax" | "validation" | "federation" | "composition";
  }>;
  warnings?: string[];
  metadata?: {
    types: number;
    fields: number;
    directives: string[];
    isFederation: boolean;
    federationVersion?: string;
  };
}

interface SDLValidationReport {
  timestamp: string;
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  results: SDLValidationResult[];
  summary: {
    byDirectory: Record<
      string,
      { total: number; valid: number; invalid: number }
    >;
    federationSchemas: number;
    totalTypes: number;
    totalFields: number;
  };
}

const PROJECT_ROOT = join(__dirname, "../..");
const TEST_DATA_DIRS = [
  join(PROJECT_ROOT, "converters/test-data"),
  join(PROJECT_ROOT, "converters/test-data/x-graphql/expected"),
];

class GraphQLValidator {
  /**
   * Discover all GraphQL SDL files in test-data directories
   */
  discoverSDLFiles(): string[] {
    const files: string[] = [];

    const walkDir = (dir: string) => {
      try {
        const entries = readdirSync(dir);
        for (const entry of entries) {
          const fullPath = join(dir, entry);
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            // Skip node_modules, .git, etc.
            if (!["node_modules", ".git", "dist", "build"].includes(entry)) {
              walkDir(fullPath);
            }
          } else if (stat.isFile()) {
            const ext = extname(entry);
            if ([".graphql", ".gql", ".sdl"].includes(ext)) {
              files.push(fullPath);
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

    return files;
  }

  /**
   * Check if SDL contains federation directives
   */
  isFederationSchema(sdl: string): boolean {
    const federationDirectives = [
      "@key",
      "@external",
      "@requires",
      "@provides",
      "@shareable",
      "@inaccessible",
      "@override",
      "@tag",
      "extend type",
      "extend interface",
    ];

    return federationDirectives.some((directive) => sdl.includes(directive));
  }

  /**
   * Detect federation version
   */
  detectFederationVersion(sdl: string): string | undefined {
    if (sdl.includes('@link(url: "https://specs.apollo.dev/federation/v2')) {
      return "v2";
    }
    if (this.isFederationSchema(sdl)) {
      return "v1";
    }
    return undefined;
  }

  /**
   * Extract metadata from parsed schema
   */
  extractMetadata(sdl: string): SDLValidationResult["metadata"] {
    try {
      const ast = parse(sdl);
      let typeCount = 0;
      let fieldCount = 0;
      const directives = new Set<string>();

      for (const def of ast.definitions) {
        if (
          def.kind === "ObjectTypeDefinition" ||
          def.kind === "InterfaceTypeDefinition" ||
          def.kind === "InputObjectTypeDefinition" ||
          def.kind === "EnumTypeDefinition" ||
          def.kind === "ScalarTypeDefinition" ||
          def.kind === "UnionTypeDefinition"
        ) {
          typeCount++;

          if ("fields" in def && def.fields) {
            fieldCount += def.fields.length;
          }
          if ("values" in def && def.values) {
            fieldCount += def.values.length;
          }
        }

        if ("directives" in def && def.directives) {
          def.directives.forEach((dir) => {
            if (dir.name?.value) {
              directives.add(`@${dir.name.value}`);
            }
          });
        }
      }

      const isFederation = this.isFederationSchema(sdl);
      const federationVersion = this.detectFederationVersion(sdl);

      return {
        types: typeCount,
        fields: fieldCount,
        directives: Array.from(directives),
        isFederation,
        federationVersion,
      };
    } catch (err) {
      return {
        types: 0,
        fields: 0,
        directives: [],
        isFederation: false,
      };
    }
  }

  /**
   * Validate a single SDL file
   */
  validateSDL(filePath: string): SDLValidationResult {
    const relativePath = relative(PROJECT_ROOT, filePath);
    const result: SDLValidationResult = {
      file: relativePath,
      valid: true,
      warnings: [],
    };

    try {
      // Read SDL content
      const sdl = readFileSync(filePath, "utf-8");

      // Extract metadata first
      result.metadata = this.extractMetadata(sdl);

      // 1. Parse SDL (syntax validation)
      let ast;
      try {
        ast = parse(sdl);
      } catch (err: any) {
        result.valid = false;
        if (!result.errors) result.errors = [];
        result.errors.push({
          message: err.message || "Syntax error",
          line: err.locations?.[0]?.line,
          column: err.locations?.[0]?.column,
          type: "syntax",
        });
        return result;
      }

      // 2. Build and validate schema (semantic validation)
      try {
        let schemaSDL = sdl;

        // Add common scalar definitions if they are missing but used
        const commonScalars = [
          "DateTime",
          "Date",
          "Email",
          "URL",
          "JSON",
          "Void",
        ];
        const missingScalars = commonScalars.filter(
          (scalar) => sdl.includes(scalar) && !sdl.includes(`scalar ${scalar}`),
        );

        if (missingScalars.length > 0) {
          schemaSDL +=
            "\n" + missingScalars.map((s) => `scalar ${s}`).join("\n");
        }

        // If it's a federation schema, add directive definitions for standard validation
        if (result.metadata?.isFederation) {
          // Basic Federation V1 directives needed for buildSchema to pass
          const fedDirectives = `
             scalar _FieldSet
             directive @key(fields: _FieldSet!) on OBJECT | INTERFACE
             directive @requires(fields: _FieldSet!) on FIELD_DEFINITION
             directive @provides(fields: _FieldSet!) on FIELD_DEFINITION
             directive @external on FIELD_DEFINITION
             directive @shareable on OBJECT | FIELD_DEFINITION
             directive @override(from: String!) on FIELD_DEFINITION
             directive @inaccessible on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ENUM | ENUM_VALUE | SCALAR | INPUT_OBJECT | INPUT_FIELD_DEFINITION | ARGUMENT_DEFINITION
             directive @tag(name: String!) on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ENUM | ENUM_VALUE | SCALAR | INPUT_OBJECT | INPUT_FIELD_DEFINITION | ARGUMENT_DEFINITION
             directive @extends on OBJECT | INTERFACE
           `;
          schemaSDL += fedDirectives;
        }

        // Try to build as complete schema
        const schema = buildSchema(schemaSDL);
        const errors = validate(schema, ast);

        if (errors.length > 0) {
          result.valid = false;
          if (!result.errors) result.errors = [];
          errors.forEach((err: GraphQLError) => {
            result.errors!.push({
              message: err.message,
              line: err.locations?.[0]?.line,
              column: err.locations?.[0]?.column,
              type: "validation",
            });
          });
        }
      } catch (err: any) {
        // Check if error is just missing Query type (SDL fragment)
        const isMissingQueryType = err.message?.includes(
          "Query root type must be provided",
        );

        if (isMissingQueryType) {
          // This is an SDL fragment (type definitions only), not an error
          result.valid = true;
          result.warnings?.push(
            "SDL fragment without Query type - types are valid but schema is incomplete",
          );
        } else {
          // Real schema build error
          result.valid = false;
          if (!result.errors) result.errors = [];
          result.errors.push({
            message: err.message || "Schema validation error",
            type: "validation",
          });
        }
      }

      // 3. Federation validation (if applicable)
      if (result.metadata?.isFederation && result.valid) {
        try {
          const subgraphAst = gql(sdl);
          const subgraphSchema = buildSubgraphSchema([
            { typeDefs: subgraphAst },
          ]);

          // Basic federation checks
          if (!subgraphSchema) {
            result.warnings?.push(
              "Federation subgraph schema could not be built",
            );
          }
        } catch (err: any) {
          // Federation errors are warnings for v1, errors for v2
          if (result.metadata.federationVersion === "v2") {
            result.valid = false;
            if (!result.errors) result.errors = [];
            result.errors.push({
              message: `Federation validation: ${err.message}`,
              type: "federation",
            });
          } else {
            // v1 or detection - treat as warnings
            result.warnings?.push(`Federation warning: ${err.message}`);
          }
        }
      }

      // 4. Quality checks
      this.performQualityChecks(sdl, result);
    } catch (err: any) {
      result.valid = false;
      result.errors = [
        {
          message: err.message || "Failed to validate SDL",
          type: "validation",
        },
      ];
    }

    return result;
  }

  /**
   * Perform quality checks on SDL
   */
  private performQualityChecks(sdl: string, result: SDLValidationResult): void {
    // Check for descriptions (but not for SDL fragments)
    const hasDescriptions = sdl.includes('"""') || sdl.includes('"');
    const hasQuery = sdl.includes("type Query");
    const hasMutation = sdl.includes("type Mutation");

    if (!hasDescriptions && hasQuery) {
      result.warnings?.push("Schema has no descriptions");
    }

    // Check for common issues (only for complete schemas)
    if (hasQuery && !hasMutation) {
      result.warnings?.push("Schema has Query but no Mutation type");
    }

    // Check for deprecated directive usage
    const deprecatedCount = (sdl.match(/@deprecated/g) || []).length;
    if (deprecatedCount > 0) {
      result.warnings?.push(`Schema has ${deprecatedCount} deprecated fields`);
    }

    // Check for ID type usage
    if (!sdl.includes("ID") && result.metadata && result.metadata.types > 3) {
      result.warnings?.push("Schema does not use ID scalar type");
    }

    // Check for input types
    const hasInputTypes = sdl.includes("input ");
    if (!hasInputTypes && result.metadata && result.metadata.types > 5) {
      result.warnings?.push("Schema has no input types");
    }

    // Check for interfaces
    const hasInterfaces = sdl.includes("interface ");
    if (!hasInterfaces && result.metadata && result.metadata.types > 10) {
      result.warnings?.push(
        "Large schema without interfaces - consider using them for reusability",
      );
    }

    // Federation-specific checks
    if (result.metadata?.isFederation) {
      if (!sdl.includes("@key")) {
        result.warnings?.push("Federation schema without @key directive");
      }
      if (result.metadata.federationVersion === "v1") {
        result.warnings?.push("Using Federation v1 - consider upgrading to v2");
      }
    }
  }

  /**
   * Validate all discovered SDL files
   */
  validateAll(): SDLValidationReport {
    const files = this.discoverSDLFiles();
    const results: SDLValidationResult[] = [];
    const byDirectory: Record<
      string,
      { total: number; valid: number; invalid: number }
    > = {};

    console.log(`\n🔍 Discovered ${files.length} GraphQL SDL files\n`);

    let totalTypes = 0;
    let totalFields = 0;
    let federationCount = 0;

    for (const filePath of files) {
      const result = this.validateSDL(filePath);
      results.push(result);

      // Track by directory
      const dir = relative(PROJECT_ROOT, join(filePath, ".."));
      if (!byDirectory[dir]) {
        byDirectory[dir] = { total: 0, valid: 0, invalid: 0 };
      }
      byDirectory[dir].total++;
      if (result.valid) {
        byDirectory[dir].valid++;
      } else {
        byDirectory[dir].invalid++;
      }

      // Aggregate metadata
      if (result.metadata) {
        totalTypes += result.metadata.types;
        totalFields += result.metadata.fields;
        if (result.metadata.isFederation) {
          federationCount++;
        }
      }

      // Log result
      const status = result.valid ? "✅" : "❌";
      const federation = result.metadata?.isFederation ? "🌐" : "  ";
      console.log(`${status} ${federation} ${result.file}`);

      if (result.metadata) {
        console.log(
          `      ${result.metadata.types} types, ${result.metadata.fields} fields` +
            (result.metadata.isFederation
              ? ` [Federation ${result.metadata.federationVersion}]`
              : ""),
        );
      }

      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((err) => {
          const location = err.line
            ? ` (line ${err.line}${err.column ? `:${err.column}` : ""})`
            : "";
          console.log(`   ❌ [${err.type}]${location}: ${err.message}`);
        });
      }
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach((warn) => {
          console.log(`   ⚠️  ${warn}`);
        });
      }
    }

    const validCount = results.filter((r) => r.valid).length;

    const report: SDLValidationReport = {
      timestamp: new Date().toISOString(),
      totalFiles: files.length,
      validFiles: validCount,
      invalidFiles: files.length - validCount,
      results,
      summary: {
        byDirectory,
        federationSchemas: federationCount,
        totalTypes,
        totalFields,
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

  const validator = new GraphQLValidator();
  const report = validator.validateAll();

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("GRAPHQL SDL VALIDATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total SDL files:     ${report.totalFiles}`);
  console.log(`Valid files:         ${report.validFiles} ✅`);
  console.log(`Invalid files:       ${report.invalidFiles} ❌`);
  console.log(`Federation schemas:  ${report.summary.federationSchemas} 🌐`);
  console.log(`Total types:         ${report.summary.totalTypes}`);
  console.log(`Total fields:        ${report.summary.totalFields}`);
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
  if (flags.failOnError && report.invalidFiles > 0) {
    console.error("❌ Validation failed: invalid SDL files found");
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

  console.log("✅ GraphQL SDL validation complete\n");
}

if (require.main === module) {
  main();
}

export { GraphQLValidator, SDLValidationResult, SDLValidationReport };
