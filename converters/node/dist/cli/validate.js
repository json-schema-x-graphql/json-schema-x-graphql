#!/usr/bin/env node
/**
 * Validation CLI tool for JSON Schema and GraphQL SDL
 *
 * This tool provides comprehensive validation for both JSON Schema files
 * and GraphQL SDL files using multiple validators.
 */
import * as fs from "fs";
import * as path from "path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { parse } from "graphql";
import { buildSchema, GraphQLError } from "graphql";
class JsonSchemaValidator {
  constructor(strict = false) {
    this.strict = strict;
    this.ajv = new Ajv({
      allErrors: true,
      strict: this.strict,
      validateFormats: true,
    });
    addFormats(this.ajv);
  }
  validate(schema) {
    const errors = [];
    const warnings = [];
    // Basic structure validation
    if (typeof schema !== "object" || schema === null) {
      errors.push({
        path: "$",
        message: "Schema must be a JSON object",
        severity: "error",
        validator: "structure",
      });
      return { valid: false, errors, warnings };
    }
    // Validate x-graphql extensions
    this.validateXGraphQLExtensions(schema, "$", errors, warnings);
    // Validate naming conventions
    this.validateNamingConventions(schema, "$", warnings);
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
  validateFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const schema = JSON.parse(content);
      return this.validate(schema);
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            path: filePath,
            message: `Failed to read or parse file: ${error.message}`,
            severity: "error",
            validator: "file",
          },
        ],
        warnings: [],
      };
    }
  }
  validateXGraphQLExtensions(obj, path, errors, warnings) {
    if (typeof obj !== "object" || obj === null) return;
    // Validate x-graphql-type-kind
    if (obj["x-graphql-type-kind"]) {
      const validKinds = ["OBJECT", "INTERFACE", "UNION", "INPUT_OBJECT", "ENUM"];
      if (!validKinds.includes(obj["x-graphql-type-kind"])) {
        errors.push({
          path: `${path}.x-graphql-type-kind`,
          message: `Invalid type kind '${obj["x-graphql-type-kind"]}'. Must be one of: ${validKinds.join(", ")}`,
          severity: "error",
          validator: "x-graphql",
        });
      }
    }
    // Validate x-graphql-field-type format
    if (obj["x-graphql-field-type"]) {
      if (!this.isValidGraphQLType(obj["x-graphql-field-type"])) {
        warnings.push({
          path: `${path}.x-graphql-field-type`,
          message: `Potentially invalid GraphQL type format: '${obj["x-graphql-field-type"]}'`,
          severity: "warning",
          validator: "x-graphql",
        });
      }
    }
    // Validate federation keys
    if (obj["x-graphql-federation-keys"]) {
      if (Array.isArray(obj["x-graphql-federation-keys"])) {
        obj["x-graphql-federation-keys"].forEach((key, index) => {
          if (typeof key === "string" && key.trim() === "") {
            errors.push({
              path: `${path}.x-graphql-federation-keys[${index}]`,
              message: "Federation key cannot be empty",
              severity: "error",
              validator: "x-graphql",
            });
          }
        });
      }
    }
    // Recursively validate nested objects
    for (const [key, value] of Object.entries(obj)) {
      const newPath = path === "$" ? `$.${key}` : `${path}.${key}`;
      if (typeof value === "object" && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            this.validateXGraphQLExtensions(item, `${newPath}[${index}]`, errors, warnings);
          });
        } else {
          this.validateXGraphQLExtensions(value, newPath, errors, warnings);
        }
      }
    }
  }
  validateNamingConventions(obj, path, warnings) {
    if (typeof obj !== "object" || obj === null) return;
    // Check for plural type names
    if (obj["x-graphql-type-name"]) {
      const typeName = obj["x-graphql-type-name"];
      if (typeName.endsWith("s") || typeName.endsWith("ies") || typeName.endsWith("es")) {
        warnings.push({
          path: `${path}.x-graphql-type-name`,
          message: `Type name '${typeName}' appears to be plural. GraphQL types are typically singular.`,
          severity: "warning",
          validator: "naming",
        });
      }
      // Check PascalCase
      if (!/^[A-Z]/.test(typeName)) {
        warnings.push({
          path: `${path}.x-graphql-type-name`,
          message: `Type name '${typeName}' should start with uppercase letter (PascalCase convention)`,
          severity: "warning",
          validator: "naming",
        });
      }
    }
    // Check field name conventions (camelCase)
    if (obj["x-graphql-field-name"]) {
      const fieldName = obj["x-graphql-field-name"];
      if (fieldName.includes("_")) {
        warnings.push({
          path: `${path}.x-graphql-field-name`,
          message: `Field name '${fieldName}' uses snake_case. GraphQL fields typically use camelCase.`,
          severity: "warning",
          validator: "naming",
        });
      }
    }
    // Recursively check nested objects
    for (const value of Object.values(obj)) {
      if (typeof value === "object" && value !== null) {
        this.validateNamingConventions(value, path, warnings);
      }
    }
  }
  isValidGraphQLType(typeStr) {
    // Basic validation of GraphQL type syntax
    const trimmed = typeStr.trim();
    if (!trimmed) return false;
    // Check for balanced brackets
    let bracketDepth = 0;
    for (const ch of trimmed) {
      if (ch === "[") bracketDepth++;
      if (ch === "]") {
        bracketDepth--;
        if (bracketDepth < 0) return false;
      }
    }
    return bracketDepth === 0;
  }
}
class GraphQLSDLValidator {
  validate(sdl) {
    const errors = [];
    const warnings = [];
    try {
      // Parse the SDL
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _document = parse(sdl);
      // Validate using GraphQL's built-in validator
      try {
        const schema = buildSchema(sdl);
        // Check for Query type
        const queryType = schema.getQueryType();
        if (!queryType) {
          warnings.push({
            path: "$",
            message: "Schema should have a Query root type",
            severity: "warning",
            validator: "spec",
          });
        }
      } catch (error) {
        if (error instanceof GraphQLError) {
          errors.push({
            path: "$",
            message: error.message,
            severity: "error",
            validator: "graphql",
            line: error.locations?.[0]?.line,
            column: error.locations?.[0]?.column,
          });
        }
      }
    } catch (error) {
      if (error instanceof GraphQLError) {
        errors.push({
          path: "$",
          message: error.message,
          severity: "error",
          validator: "parser",
          line: error.locations?.[0]?.line,
          column: error.locations?.[0]?.column,
        });
      } else {
        errors.push({
          path: "$",
          message: error.message,
          severity: "error",
          validator: "parser",
        });
      }
    }
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
  validateFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return this.validate(content);
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            path: filePath,
            message: `Failed to read file: ${error.message}`,
            severity: "error",
            validator: "file",
          },
        ],
        warnings: [],
      };
    }
  }
}
function collectFiles(dir, extensions) {
  const files = [];
  function traverse(currentPath) {
    const stats = fs.statSync(currentPath);
    if (stats.isFile()) {
      const ext = path.extname(currentPath).slice(1);
      if (extensions.includes(ext)) {
        files.push(currentPath);
      }
    } else if (stats.isDirectory()) {
      const entries = fs.readdirSync(currentPath);
      for (const entry of entries) {
        traverse(path.join(currentPath, entry));
      }
    }
  }
  traverse(dir);
  return files;
}
function validateJsonSchemas(targetPath, recursive, strict, format, quiet) {
  const validator = new JsonSchemaValidator(strict);
  let allValid = true;
  let totalFiles = 0;
  let totalErrors = 0;
  let totalWarnings = 0;
  const files = recursive
    ? collectFiles(targetPath, ["json"])
    : fs.statSync(targetPath).isFile()
      ? [targetPath]
      : fs
          .readdirSync(targetPath)
          .map((f) => path.join(targetPath, f))
          .filter((f) => f.endsWith(".json"));
  for (const file of files) {
    totalFiles++;
    const result = validator.validateFile(file);
    if (format === "json") {
      console.log(
        JSON.stringify(
          {
            file,
            valid: result.valid,
            errors: result.errors,
            warnings: result.warnings,
          },
          null,
          2,
        ),
      );
    } else {
      if (result.errors.length > 0 || (result.warnings.length > 0 && !quiet)) {
        console.log(`\n📄 ${file}`);
      }
      if (result.errors.length > 0) {
        console.log("  ❌ Errors:");
        result.errors.forEach((error) => {
          console.log(`    • [${error.validator}] ${error.path}: ${error.message}`);
        });
        allValid = false;
        totalErrors += result.errors.length;
      }
      if (result.warnings.length > 0 && !quiet) {
        console.log("  ⚠️  Warnings:");
        result.warnings.forEach((warning) => {
          console.log(`    • [${warning.validator}] ${warning.path}: ${warning.message}`);
        });
        totalWarnings += result.warnings.length;
      }
      if (result.valid && result.warnings.length === 0 && !quiet) {
        console.log("  ✅ Valid");
      }
    }
  }
  if (format !== "json" && !quiet) {
    console.log("\n📊 Summary:");
    console.log(`  Files validated: ${totalFiles}`);
    console.log(`  Total errors: ${totalErrors}`);
    console.log(`  Total warnings: ${totalWarnings}`);
    console.log(allValid ? "  ✅ All schemas valid!" : "  ❌ Some schemas have errors");
  }
  return allValid;
}
function validateGraphQLSDL(targetPath, recursive, format, quiet) {
  const validator = new GraphQLSDLValidator();
  let allValid = true;
  let totalFiles = 0;
  let totalErrors = 0;
  let totalWarnings = 0;
  const files = recursive
    ? collectFiles(targetPath, ["graphql", "gql"])
    : fs.statSync(targetPath).isFile()
      ? [targetPath]
      : fs
          .readdirSync(targetPath)
          .map((f) => path.join(targetPath, f))
          .filter((f) => f.endsWith(".graphql") || f.endsWith(".gql"));
  for (const file of files) {
    totalFiles++;
    const result = validator.validateFile(file);
    if (format === "json") {
      console.log(
        JSON.stringify(
          {
            file,
            valid: result.valid,
            errors: result.errors,
            warnings: result.warnings,
          },
          null,
          2,
        ),
      );
    } else {
      if (result.errors.length > 0 || (result.warnings.length > 0 && !quiet)) {
        console.log(`\n📄 ${file}`);
      }
      if (result.errors.length > 0) {
        console.log("  ❌ Errors:");
        result.errors.forEach((error) => {
          const location = error.line ? `${error.line}:${error.column || 0}` : "";
          console.log(`    • ${location ? `[${location}] ` : ""}${error.message}`);
        });
        allValid = false;
        totalErrors += result.errors.length;
      }
      if (result.warnings.length > 0 && !quiet) {
        console.log("  ⚠️  Warnings:");
        result.warnings.forEach((warning) => {
          console.log(`    • [${warning.validator}] ${warning.message}`);
        });
        totalWarnings += result.warnings.length;
      }
      if (result.valid && result.warnings.length === 0 && !quiet) {
        console.log("  ✅ Valid");
      }
    }
  }
  if (format !== "json" && !quiet) {
    console.log("\n📊 Summary:");
    console.log(`  Files validated: ${totalFiles}`);
    console.log(`  Total errors: ${totalErrors}`);
    console.log(`  Total warnings: ${totalWarnings}`);
    console.log(allValid ? "  ✅ All SDL files valid!" : "  ❌ Some SDL files have errors");
  }
  return allValid;
}
function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
JSON Schema x GraphQL Validation CLI

Usage:
  validate json-schema <path> [options]    Validate JSON Schema files
  validate graphql <path> [options]        Validate GraphQL SDL files

Options:
  -r, --recursive      Recursively validate all files in directory
  -s, --strict         Enable strict validation mode
  -f, --format <type>  Output format (text, json) [default: text]
  -q, --quiet          Suppress warnings

Examples:
  validate json-schema schema.json
  validate json-schema ./schemas -r
  validate graphql schema.graphql
  validate graphql ./schemas -r --format json
    `);
    process.exit(0);
  }
  const command = args[0];
  const targetPath = args[1];
  const recursive = args.includes("-r") || args.includes("--recursive");
  const strict = args.includes("-s") || args.includes("--strict");
  const formatIndex = args.findIndex((a) => a === "-f" || a === "--format");
  const format = formatIndex !== -1 ? args[formatIndex + 1] : "text";
  const quiet = args.includes("-q") || args.includes("--quiet");
  if (!targetPath) {
    console.error("Error: Path is required");
    process.exit(1);
  }
  if (!fs.existsSync(targetPath)) {
    console.error(`Error: Path does not exist: ${targetPath}`);
    process.exit(1);
  }
  let isValid = false;
  switch (command) {
    case "json-schema":
    case "json":
      isValid = validateJsonSchemas(targetPath, recursive, strict, format, quiet);
      break;
    case "graphql":
    case "gql":
      isValid = validateGraphQLSDL(targetPath, recursive, format, quiet);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Use "json-schema" or "graphql"');
      process.exit(1);
  }
  process.exit(isValid ? 0 : 1);
}
// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
export { JsonSchemaValidator, GraphQLSDLValidator };
//# sourceMappingURL=validate.js.map
