#!/usr/bin/env node
/**
 * Scripted JSON Schema Validator
 *
 * Discovers and validates all JSON Schema files in test-data directories.
 * Does NOT inline tests - imports schemas from test-data and validates them.
 * Outputs validation results in JSON format for CI/CD integration.
 */
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
        byDirectory: Record<string, {
            total: number;
            valid: number;
            invalid: number;
        }>;
        xGraphQLSchemas: number;
    };
}
declare class SchemaValidator {
    private ajv;
    private strictAjv;
    constructor();
    /**
     * Discover all JSON Schema files in test-data directories
     */
    discoverSchemas(): string[];
    /**
     * Check if schema contains x-graphql extensions
     */
    hasXGraphQLExtensions(schema: any): boolean;
    /**
     * Detect schema version
     */
    detectSchemaVersion(schema: any): string;
    /**
     * Validate a single schema file
     */
    validateSchema(filePath: string): ValidationResult;
    /**
     * Perform additional quality checks
     */
    private performQualityChecks;
    /**
     * Validate x-graphql extension usage
     */
    private validateXGraphQLExtensions;
    /**
     * Validate all discovered schemas
     */
    validateAll(): ValidationReport;
}
export { SchemaValidator, ValidationResult, ValidationReport };
