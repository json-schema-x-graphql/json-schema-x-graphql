#!/usr/bin/env node
/**
 * Validation CLI tool for JSON Schema and GraphQL SDL
 *
 * This tool provides comprehensive validation for both JSON Schema files
 * and GraphQL SDL files using multiple validators.
 */
interface ValidationIssue {
  path: string;
  message: string;
  severity: "error" | "warning";
  validator: string;
  line?: number;
  column?: number;
}
interface JsonSchemaValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}
interface GraphQLValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}
declare class JsonSchemaValidator {
  private strict;
  private ajv;
  constructor(strict?: boolean);
  validate(schema: any): JsonSchemaValidationResult;
  validateFile(filePath: string): JsonSchemaValidationResult;
  private validateXGraphQLExtensions;
  private validateNamingConventions;
  private isValidGraphQLType;
}
declare class GraphQLSDLValidator {
  validate(sdl: string): GraphQLValidationResult;
  validateFile(filePath: string): GraphQLValidationResult;
}
export { JsonSchemaValidator, GraphQLSDLValidator };
