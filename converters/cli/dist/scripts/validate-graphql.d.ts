#!/usr/bin/env node
/**
 * Scripted GraphQL SDL Validator
 *
 * Discovers and validates all GraphQL SDL files in test-data directories.
 * Does NOT inline tests - imports SDL from test-data and validates them.
 * Outputs validation results in JSON format for CI/CD integration.
 */
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
        byDirectory: Record<string, {
            total: number;
            valid: number;
            invalid: number;
        }>;
        federationSchemas: number;
        totalTypes: number;
        totalFields: number;
    };
}
declare class GraphQLValidator {
    /**
     * Discover all GraphQL SDL files in test-data directories
     */
    discoverSDLFiles(): string[];
    /**
     * Check if SDL contains federation directives
     */
    isFederationSchema(sdl: string): boolean;
    /**
     * Detect federation version
     */
    detectFederationVersion(sdl: string): string | undefined;
    /**
     * Extract metadata from parsed schema
     */
    extractMetadata(sdl: string): SDLValidationResult["metadata"];
    /**
     * Validate a single SDL file
     */
    validateSDL(filePath: string): SDLValidationResult;
    /**
     * Perform quality checks on SDL
     */
    private performQualityChecks;
    /**
     * Validate all discovered SDL files
     */
    validateAll(): SDLValidationReport;
}
export { GraphQLValidator, SDLValidationResult, SDLValidationReport };
