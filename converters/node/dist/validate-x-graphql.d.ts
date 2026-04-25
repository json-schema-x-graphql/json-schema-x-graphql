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
import { ValidationResult } from "./x-graphql-validator";
interface CliOptions {
    failOnWarning: boolean;
    json: boolean;
    quiet: boolean;
    verbose: boolean;
    files: string[];
}
declare function parseArgs(args: string[]): CliOptions;
declare function validateFile(filePath: string): ValidationResult;
interface FileValidationResult {
    file: string;
    result: ValidationResult;
}
declare function validateFiles(files: string[], options: CliOptions): FileValidationResult[];
declare function main(): void;
export { main, parseArgs, validateFile, validateFiles };
