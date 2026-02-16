#!/usr/bin/env node
/**
 * X-GraphQL Validation CLI
 *
 * Command-line tool for validating x-graphql-* extensions in JSON Schema files.
 * Can be used standalone or integrated into pre-commit hooks and CI pipelines.
 *
 * Usage:
 *   validate-x-graphql <schema-file> [options]
 *   validate-x-graphql --help
 *
 * Options:
 *   --fail-on-warning    Exit with error code if warnings are found
 *   --json               Output results as JSON
 *   --quiet              Only show errors (suppress warnings)
 *   --verbose            Show detailed validation information
 */
import * as fs from "fs";
import * as path from "path";
import { validateSchema, } from "./x-graphql-validator";
function parseArgs(args) {
    const options = {
        failOnWarning: false,
        json: false,
        quiet: false,
        verbose: false,
        files: [],
    };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case "--fail-on-warning":
                options.failOnWarning = true;
                break;
            case "--json":
                options.json = true;
                break;
            case "--quiet":
                options.quiet = true;
                break;
            case "--verbose":
            case "-v":
                options.verbose = true;
                break;
            case "--help":
            case "-h":
                showHelp();
                process.exit(0);
                break;
            default:
                if (!arg.startsWith("--")) {
                    options.files.push(arg);
                }
                else {
                    console.error(`Unknown option: ${arg}`);
                    process.exit(1);
                }
        }
    }
    return options;
}
function showHelp() {
    console.log(`
X-GraphQL Schema Validator

Validates x-graphql-* extensions in JSON Schema files.

USAGE:
  validate-x-graphql <schema-file> [options]
  validate-x-graphql <directory> [options]
  validate-x-graphql schema1.json schema2.json [options]

OPTIONS:
  --fail-on-warning    Exit with error code if warnings are found
  --json               Output results as JSON
  --quiet              Only show errors (suppress warnings)
  --verbose, -v        Show detailed validation information
  --help, -h           Show this help message

EXAMPLES:
  # Validate a single schema
  validate-x-graphql schema.json

  # Validate multiple schemas
  validate-x-graphql schema1.json schema2.json schema3.json

  # Validate all schemas in a directory
  validate-x-graphql ./schemas/

  # Fail on warnings and output JSON
  validate-x-graphql schema.json --fail-on-warning --json

  # Use in pre-commit hook
  validate-x-graphql $(git diff --cached --name-only --diff-filter=ACM | grep '.json$')

EXIT CODES:
  0 - Validation passed
  1 - Validation failed (errors found)
  2 - Validation warnings found (with --fail-on-warning)
  3 - Invalid usage or file not found
`);
}
function findSchemaFiles(target) {
    const files = [];
    if (!fs.existsSync(target)) {
        return files;
    }
    const stat = fs.statSync(target);
    if (stat.isFile()) {
        if (target.endsWith(".json")) {
            files.push(target);
        }
    }
    else if (stat.isDirectory()) {
        const entries = fs.readdirSync(target);
        for (const entry of entries) {
            const fullPath = path.join(target, entry);
            files.push(...findSchemaFiles(fullPath));
        }
    }
    return files;
}
function loadSchema(filePath) {
    try {
        const content = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(content);
    }
    catch (error) {
        console.error(`Error loading schema from ${filePath}:`, error.message);
        return null;
    }
}
function validateFile(filePath, options) {
    const schema = loadSchema(filePath);
    if (!schema) {
        return {
            valid: false,
            errors: [
                {
                    path: filePath,
                    message: "Failed to load or parse schema file",
                    severity: "error",
                },
            ],
            warnings: [],
        };
    }
    return validateSchema(schema, filePath);
}
function validateFiles(files, options) {
    const results = [];
    for (const file of files) {
        if (options.verbose) {
            console.log(`Validating: ${file}`);
        }
        const result = validateFile(file, options);
        results.push({ file, result });
    }
    return results;
}
function outputResults(results, options) {
    let totalErrors = 0;
    let totalWarnings = 0;
    if (options.json) {
        const jsonOutput = results.map(({ file, result }) => ({
            file,
            valid: result.valid,
            errors: result.errors,
            warnings: result.warnings,
        }));
        console.log(JSON.stringify(jsonOutput, null, 2));
        for (const { result } of results) {
            totalErrors += result.errors.length;
            totalWarnings += result.warnings.length;
        }
    }
    else {
        for (const { file, result } of results) {
            totalErrors += result.errors.length;
            totalWarnings += result.warnings.length;
            if (result.errors.length === 0 &&
                (result.warnings.length === 0 || options.quiet)) {
                if (options.verbose) {
                    console.log(`✓ ${file}: Valid`);
                }
                continue;
            }
            console.log(`\n${file}:`);
            if (result.errors.length > 0) {
                console.log("  Errors:");
                for (const error of result.errors) {
                    console.log(`    ✗ [${error.path}] ${error.message}`);
                    if (options.verbose && error.attribute) {
                        console.log(`      Attribute: ${error.attribute}`);
                    }
                }
            }
            if (result.warnings.length > 0 && !options.quiet) {
                console.log("  Warnings:");
                for (const warning of result.warnings) {
                    console.log(`    ⚠ [${warning.path}] ${warning.message}`);
                    if (options.verbose && warning.attribute) {
                        console.log(`      Attribute: ${warning.attribute}`);
                    }
                }
            }
        }
        console.log();
        console.log("Summary:");
        console.log(`  Files validated: ${results.length}`);
        console.log(`  Total errors: ${totalErrors}`);
        if (!options.quiet) {
            console.log(`  Total warnings: ${totalWarnings}`);
        }
    }
    // Determine exit code
    if (totalErrors > 0) {
        return 1; // Errors found
    }
    if (options.failOnWarning && totalWarnings > 0) {
        return 2; // Warnings found with --fail-on-warning
    }
    return 0; // Success
}
function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error("Error: No schema files specified\n");
        showHelp();
        process.exit(3);
    }
    const options = parseArgs(args);
    if (options.files.length === 0) {
        console.error("Error: No schema files specified\n");
        showHelp();
        process.exit(3);
    }
    // Find all schema files
    const allFiles = [];
    for (const target of options.files) {
        const files = findSchemaFiles(target);
        if (files.length === 0) {
            console.error(`Warning: No JSON schema files found in ${target}`);
        }
        allFiles.push(...files);
    }
    if (allFiles.length === 0) {
        console.error("Error: No JSON schema files found");
        process.exit(3);
    }
    // Validate all files
    const results = validateFiles(allFiles, options);
    // Output results and exit with appropriate code
    const exitCode = outputResults(results, options);
    process.exit(exitCode);
}
// Run if executed directly
if (require.main === module) {
    main();
}
export { main, parseArgs, validateFile, validateFiles };
//# sourceMappingURL=validate-x-graphql.js.map