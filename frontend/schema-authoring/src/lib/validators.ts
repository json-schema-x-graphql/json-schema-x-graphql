/**
 * JSON Schema Validators
 *
 * Provides validation utilities for JSON Schema and GraphQL SDL
 * using Ajv for JSON Schema validation.
 */

import Ajv, { type ValidateFunction, type ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  AutoFix,
  TextChange,
} from "../types";

/**
 * Ajv instance with formats
 */
const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false,
  validateFormats: true,
  $data: true,
});

addFormats(ajv);

/**
 * JSON Schema meta-schema for validation
 */
const DRAFT_07_SCHEMA = "http://json-schema.org/draft-07/schema#";
const DRAFT_2020_12_SCHEMA = "https://json-schema.org/draft/2020-12/schema";

/**
 * Validate JSON Schema
 */
export async function validateJsonSchema(
  schemaString: string,
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Step 1: Parse JSON
  let parsedSchema: unknown;
  try {
    parsedSchema = JSON.parse(schemaString);
  } catch (error) {
    const parseError = error as SyntaxError;
    const match = parseError.message.match(/position (\d+)/);
    const position = match ? parseInt(match[1], 10) : 0;
    const { line, column } = getLineColumn(schemaString, position);

    return {
      valid: false,
      errors: [
        {
          severity: "error",
          message: `JSON Parse Error: ${parseError.message}`,
          line,
          column,
          path: "",
          suggestion: getSyntaxErrorSuggestion(parseError.message),
          fix: getSyntaxErrorFix(schemaString, position, parseError),
        },
      ],
      warnings: [],
    };
  }

  // Step 2: Basic structure validation
  if (typeof parsedSchema !== "object" || parsedSchema === null) {
    return {
      valid: false,
      errors: [
        {
          severity: "error",
          message: "Schema must be an object",
          path: "",
          line: 1,
          column: 1,
          suggestion:
            'Wrap your schema in curly braces: { "type": "object", ... }',
        },
      ],
      warnings: [],
    };
  }

  const schema = parsedSchema as Record<string, unknown>;

  // Step 3: Check for $schema
  if (!schema.$schema) {
    warnings.push({
      severity: "warning",
      message: "Missing $schema property",
      path: "$schema",
      line: 1,
      column: 1,
      suggestion: `Add "$schema": "${DRAFT_07_SCHEMA}" to specify JSON Schema version`,
    });
  }

  // Step 4: Validate against JSON Schema meta-schema
  try {
    const metaSchemaUrl = (schema.$schema as string) || DRAFT_07_SCHEMA;

    // Fetch meta-schema if not cached
    let validate: ValidateFunction;
    try {
      validate = ajv.getSchema(metaSchemaUrl) || ajv.compile(true);
    } catch {
      // If meta-schema is not available, do basic validation
      validate = ajv.compile({
        type: "object",
        properties: {
          $schema: { type: "string" },
          type: { type: ["string", "array"] },
          properties: { type: "object" },
          items: { type: ["object", "array"] },
          required: { type: "array" },
        },
      });
    }

    const valid = validate(schema);

    if (!valid && validate.errors) {
      errors.push(
        ...validate.errors.map((error) => convertAjvError(error, schemaString)),
      );
    }
  } catch (error) {
    errors.push({
      severity: "error",
      message: error instanceof Error ? error.message : "Validation failed",
      path: "",
      line: 1,
      column: 1,
    });
  }

  // Step 5: Custom validations for x-graphql extensions
  const customValidations = validateXGraphQLExtensions(schema, schemaString);
  errors.push(...customValidations.errors);
  warnings.push(...customValidations.warnings);

  // Step 6: Check for common issues
  const commonIssues = checkCommonIssues(schema, schemaString);
  warnings.push(...commonIssues);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    schema: errors.length === 0 ? schema : undefined,
  };
}

/**
 * Convert Ajv error to ValidationError
 */
function convertAjvError(
  error: ErrorObject,
  schemaString: string,
): ValidationError {
  const path = error.instancePath || error.schemaPath || "";
  const position = findPositionInString(schemaString, path);
  const { line, column } = position
    ? getLineColumn(schemaString, position)
    : { line: 1, column: 1 };

  const message = formatAjvMessage(error);
  const suggestion = getAjvErrorSuggestion(error);
  const fix = getAjvErrorFix(error, schemaString, line, column);

  return {
    severity: "error",
    message,
    path,
    line,
    column,
    keyword: error.keyword,
    instancePath: error.instancePath,
    schemaPath: error.schemaPath,
    params: error.params,
    suggestion,
    fix,
  };
}

/**
 * Format Ajv error message
 */
function formatAjvMessage(error: ErrorObject): string {
  const path = error.instancePath ? ` at "${error.instancePath}"` : "";

  switch (error.keyword) {
    case "type":
      return `Type error${path}: should be ${error.params.type}`;
    case "required":
      return `Missing required property${path}: "${error.params.missingProperty}"`;
    case "additionalProperties":
      return `Unknown property${path}: "${error.params.additionalProperty}"`;
    case "enum":
      return `Invalid value${path}: must be one of ${JSON.stringify(error.params.allowedValues)}`;
    case "format":
      return `Format error${path}: should match format "${error.params.format}"`;
    case "pattern":
      return `Pattern error${path}: should match pattern ${error.params.pattern}`;
    case "minLength":
      return `Too short${path}: minimum length is ${error.params.limit}`;
    case "maxLength":
      return `Too long${path}: maximum length is ${error.params.limit}`;
    case "minimum":
      return `Too small${path}: minimum value is ${error.params.limit}`;
    case "maximum":
      return `Too large${path}: maximum value is ${error.params.limit}`;
    default:
      return error.message || `Validation error${path}`;
  }
}

/**
 * Get suggestion for Ajv error
 */
function getAjvErrorSuggestion(error: ErrorObject): string | undefined {
  switch (error.keyword) {
    case "type":
      return `Change the value to type ${error.params.type}`;
    case "required":
      return `Add the required property "${error.params.missingProperty}"`;
    case "additionalProperties":
      return `Remove the property "${error.params.additionalProperty}" or allow it in the schema`;
    case "enum":
      return `Use one of: ${error.params.allowedValues.join(", ")}`;
    case "format":
      return `Ensure the value matches the ${error.params.format} format`;
    default:
      return undefined;
  }
}

/**
 * Get auto-fix for Ajv error
 */
function getAjvErrorFix(
  error: ErrorObject,
  schemaString: string,
  line: number,
  column: number,
): AutoFix | undefined {
  const changes: TextChange[] = [];

  switch (error.keyword) {
    case "required": {
      // Suggest adding the missing property
      const missingProp = error.params.missingProperty;
      const insertText = `\n  "${missingProp}": "",`;

      changes.push({
        range: {
          startLine: line,
          startColumn: column,
          endLine: line,
          endColumn: column,
        },
        newText: insertText,
      });

      return {
        description: `Add missing required property "${missingProp}"`,
        changes,
        confidence: "medium",
      };
    }

    case "additionalProperties": {
      // Suggest removing the additional property
      const additionalProp = error.params.additionalProperty;

      return {
        description: `Remove additional property "${additionalProp}"`,
        changes: [], // Would need more context to implement
        confidence: "low",
      };
    }

    default:
      return undefined;
  }
}

/**
 * Get suggestion for syntax error
 */
function getSyntaxErrorSuggestion(message: string): string {
  if (message.includes("Unexpected token")) {
    return "Check for: missing quotes, trailing commas, or incorrect brackets";
  }
  if (message.includes("Unexpected end")) {
    return "Check for: unclosed brackets, quotes, or objects";
  }
  if (message.includes("Unexpected string")) {
    return "Check for: missing commas between properties";
  }
  return "Verify JSON syntax is correct";
}

/**
 * Get auto-fix for syntax error
 */
function getSyntaxErrorFix(
  schemaString: string,
  position: number,
  error: SyntaxError,
): AutoFix | undefined {
  const { line, column } = getLineColumn(schemaString, position);

  // Attempt to detect trailing comma
  if (error.message.includes("Unexpected token")) {
    const context = schemaString.slice(
      Math.max(0, position - 10),
      position + 10,
    );
    if (context.includes(",}") || context.includes(",]")) {
      return {
        description: "Remove trailing comma",
        changes: [
          {
            range: {
              startLine: line,
              startColumn: column - 1,
              endLine: line,
              endColumn: column,
            },
            newText: "",
          },
        ],
        confidence: "high",
      };
    }
  }

  return undefined;
}

/**
 * Validate x-graphql extensions
 */
function validateXGraphQLExtensions(
  schema: Record<string, unknown>,
  schemaString: string,
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check x-graphql-type-name
  if (
    schema["x-graphql-type-name"] &&
    typeof schema["x-graphql-type-name"] !== "string"
  ) {
    errors.push({
      severity: "error",
      message: "x-graphql-type-name must be a string",
      path: "x-graphql-type-name",
      line: 1,
      column: 1,
      suggestion: "Use a string value for the GraphQL type name",
    });
  }

  // Check x-graphql-federation-keys
  if (schema["x-graphql-federation-keys"]) {
    if (!Array.isArray(schema["x-graphql-federation-keys"])) {
      errors.push({
        severity: "error",
        message: "x-graphql-federation-keys must be an array",
        path: "x-graphql-federation-keys",
        line: 1,
        column: 1,
        suggestion: 'Use an array of key field names: ["id"] or ["id", "name"]',
      });
    }
  }

  // Check properties for x-graphql extensions
  if (schema.properties && typeof schema.properties === "object") {
    const props = schema.properties as Record<string, unknown>;
    Object.entries(props).forEach(([propName, propValue]) => {
      if (typeof propValue === "object" && propValue !== null) {
        const prop = propValue as Record<string, unknown>;

        // Check x-graphql-field-name
        if (
          prop["x-graphql-field-name"] &&
          typeof prop["x-graphql-field-name"] !== "string"
        ) {
          errors.push({
            severity: "error",
            message: `x-graphql-field-name must be a string in property "${propName}"`,
            path: `properties.${propName}.x-graphql-field-name`,
            line: 1,
            column: 1,
            suggestion: "Use a string value for the GraphQL field name",
          });
        }

        // Check x-graphql-arguments
        if (prop["x-graphql-arguments"]) {
          if (typeof prop["x-graphql-arguments"] !== "object") {
            errors.push({
              severity: "error",
              message: `x-graphql-arguments must be an object in property "${propName}"`,
              path: `properties.${propName}.x-graphql-arguments`,
              line: 1,
              column: 1,
              suggestion: "Use an object with argument definitions",
            });
          }
        }
      }
    });
  }

  return { errors, warnings };
}

/**
 * Check for common issues
 */
function checkCommonIssues(
  schema: Record<string, unknown>,
  schemaString: string,
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Check if schema has any properties
  if (!schema.properties && !schema.items && !schema.type) {
    warnings.push({
      severity: "warning",
      message: "Schema has no type, properties, or items defined",
      path: "",
      line: 1,
      column: 1,
      suggestion:
        'Add "type", "properties", or "items" to define the schema structure',
    });
  }

  // Check for empty properties
  if (schema.properties && typeof schema.properties === "object") {
    const props = schema.properties as Record<string, unknown>;
    if (Object.keys(props).length === 0) {
      warnings.push({
        severity: "warning",
        message: "Properties object is empty",
        path: "properties",
        line: 1,
        column: 1,
        suggestion:
          "Add at least one property definition or remove the empty properties object",
      });
    }
  }

  // Check for missing descriptions (helpful for GraphQL)
  if (!schema.description) {
    warnings.push({
      severity: "info",
      message: "Schema has no description",
      path: "description",
      line: 1,
      column: 1,
      suggestion: "Add a description to generate GraphQL documentation",
    });
  }

  return warnings;
}

/**
 * Get line and column from position
 */
function getLineColumn(
  text: string,
  position: number,
): { line: number; column: number } {
  const lines = text.slice(0, position).split("\n");
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

/**
 * Find position of path in JSON string
 */
function findPositionInString(jsonString: string, path: string): number | null {
  if (!path) return 0;

  // Simple heuristic: find the key in the string
  const pathParts = path.split("/").filter(Boolean);
  if (pathParts.length === 0) return 0;

  const lastKey = pathParts[pathParts.length - 1];
  const keyPattern = new RegExp(`"${lastKey}"\\s*:`);
  const match = keyPattern.exec(jsonString);

  return match ? match.index : null;
}

/**
 * Validate GraphQL SDL (basic)
 */
export async function validateGraphQLSdl(
  sdl: string,
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!sdl.trim()) {
    return {
      valid: false,
      errors: [
        {
          severity: "error",
          message: "GraphQL SDL is empty",
          path: "",
          line: 1,
          column: 1,
          suggestion: "Add at least one type definition",
        },
      ],
      warnings: [],
    };
  }

  // Basic syntax checks
  const lines = sdl.split("\n");
  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Check for common syntax errors
    if (
      trimmed.includes("{") &&
      !trimmed.includes("}") &&
      !lines[index + 1]?.includes("}")
    ) {
      warnings.push({
        severity: "warning",
        message: "Possible unclosed brace",
        line: index + 1,
        column: line.indexOf("{") + 1,
        suggestion: "Ensure all braces are properly closed",
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Format JSON Schema
 */
export function formatJsonSchema(schemaString: string): string {
  try {
    const parsed = JSON.parse(schemaString);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return schemaString;
  }
}

/**
 * Validate and format JSON Schema
 */
export async function validateAndFormat(
  schemaString: string,
): Promise<{ formatted: string; validation: ValidationResult }> {
  const validation = await validateJsonSchema(schemaString);
  const formatted = validation.valid
    ? formatJsonSchema(schemaString)
    : schemaString;

  return { formatted, validation };
}
