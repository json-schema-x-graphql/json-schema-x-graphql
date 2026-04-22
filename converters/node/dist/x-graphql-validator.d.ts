/**
 * X-GraphQL Validator
 *
 * Validation utilities for x-graphql-* extensions in JSON Schema.
 * Ensures correct usage of x-graphql attributes and provides helpful error messages.
 */
export interface ValidationError {
  path: string;
  message: string;
  severity: "error" | "warning";
  attribute?: string;
}
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}
/**
 * Validate all x-graphql extensions in a JSON Schema
 */
export declare function validateSchema(
  schema: Record<string, unknown>,
  path?: string,
): ValidationResult;
/**
 * Validate x-graphql extensions at a single schema level
 */
export declare function validateExtensions(
  schema: Record<string, unknown>,
  path: string,
): ValidationError[];
/**
 * Validate a single extension value
 */
export declare function validateExtensionValue(
  attribute: string,
  value: unknown,
  context?: Record<string, unknown>,
): ValidationError[];
/**
 * Format validation errors as human-readable messages
 */
export declare function formatValidationErrors(result: ValidationResult): string;
/**
 * Check if a schema has any x-graphql extensions
 */
export declare function hasXGraphQLExtensions(schema: Record<string, unknown>): boolean;
/**
 * Get all x-graphql attribute names used in a schema
 */
export declare function getUsedXGraphQLAttributes(schema: Record<string, unknown>): Set<string>;
