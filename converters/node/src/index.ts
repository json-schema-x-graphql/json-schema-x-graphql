/**
 * JSON Schema x GraphQL Node.js Converter
 *
 * Bidirectional, lossless converter between JSON Schema and GraphQL SDL
 * using standardized `x-graphql-*` extensions.
 *
 * @packageDocumentation
 */

// Main converter class and convenience functions
export { Converter, jsonSchemaToGraphQL, graphqlToJsonSchema } from './converter.js';

// Type definitions
export { ConversionDirection, ConversionError, DEFAULT_OPTIONS } from './types.js';

export type {
  ConversionOptions,
  ConversionResult,
  ValidationResult,
  ValidationError,
  GraphQLTypeKind,
  GraphQLArgument,
  GraphQLDirective,
  GraphQLField,
  GraphQLEnumValue,
  GraphQLTypeDefinition,
  JsonSchemaType,
  JsonSchemaProperty,
  JsonSchema,
} from './types.js';

// Validator
export { Validator } from './validator.js';

// Cache utility
export { LRUCache } from './cache.js';

// Version
export const VERSION = '0.1.0';

/**
 * Create a new converter instance with default options
 *
 * @example
 * ```typescript
 * import { createConverter } from '@json-schema-x-graphql/node-converter';
 *
 * const converter = createConverter();
 * const graphql = converter.jsonSchemaToGraphQL(jsonSchemaString);
 * ```
 */
export async function createConverter(
  options?: import('./types.js').ConversionOptions,
  cacheSize?: number
) {
  const { Converter } = await import('./converter.js');
  return new Converter(options, cacheSize);
}

/**
 * Quick conversion from JSON Schema to GraphQL SDL
 *
 * @param jsonSchema - JSON Schema as string or object
 * @param options - Optional conversion options
 * @returns GraphQL SDL string
 *
 * @example
 * ```typescript
 * import { quickJsonToGraphQL } from '@json-schema-x-graphql/node-converter';
 *
 * const schema = {
 *   type: 'object',
 *   'x-graphql-type-name': 'User',
 *   properties: {
 *     id: { type: 'string', 'x-graphql-type': 'ID!' }
 *   }
 * };
 *
 * const graphql = quickJsonToGraphQL(schema);
 * console.log(graphql);
 * ```
 */
export async function quickJsonToGraphQL(
  jsonSchema: string | import('./types.js').JsonSchema,
  options?: import('./types.js').ConversionOptions
): Promise<string> {
  const { jsonSchemaToGraphQL } = await import('./converter.js');
  return jsonSchemaToGraphQL(jsonSchema, options);
}

/**
 * Quick conversion from GraphQL SDL to JSON Schema
 *
 * @param graphqlSdl - GraphQL SDL string
 * @param options - Optional conversion options
 * @returns JSON Schema as string
 *
 * @example
 * ```typescript
 * import { quickGraphQLToJson } from '@json-schema-x-graphql/node-converter';
 *
 * const sdl = `
 *   type User {
 *     id: ID!
 *     name: String
 *   }
 * `;
 *
 * const jsonSchema = quickGraphQLToJson(sdl);
 * console.log(jsonSchema);
 * ```
 */
export async function quickGraphQLToJson(
  graphqlSdl: string,
  options?: import('./types.js').ConversionOptions
): Promise<string> {
  const { graphqlToJsonSchema } = await import('./converter.js');
  return graphqlToJsonSchema(graphqlSdl, options);
}

/**
 * Validate a JSON Schema with x-graphql-* extensions
 *
 * @param schema - JSON Schema to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * import { validateJsonSchema } from '@json-schema-x-graphql/node-converter';
 *
 * const result = validateJsonSchema(schema);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export async function validateJsonSchema(
  schema: import('./types.js').JsonSchema
): Promise<import('./types.js').ValidationResult> {
  const { Validator } = await import('./validator.js');
  const validator = new Validator();
  return validator.validateJsonSchema(schema);
}

/**
 * Validate GraphQL SDL syntax
 *
 * @param sdl - GraphQL SDL string
 * @returns Validation result
 *
 * @example
 * ```typescript
 * import { validateGraphQLSdl } from '@json-schema-x-graphql/node-converter';
 *
 * const result = validateGraphQLSdl(sdl);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export async function validateGraphQLSdl(
  sdl: string
): Promise<import('./types.js').ValidationResult> {
  const { Validator } = await import('./validator.js');
  const validator = new Validator();
  return validator.validateGraphQLSdl(sdl);
}

/**
 * Validate a GraphQL name
 *
 * @param name - Name to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * import { validateGraphQLName } from '@json-schema-x-graphql/node-converter';
 *
 * const result = validateGraphQLName('User');
 * console.log(result.valid); // true
 *
 * const invalid = validateGraphQLName('123Invalid');
 * console.log(invalid.valid); // false
 * ```
 */
export async function validateGraphQLName(
  name: string
): Promise<import('./types.js').ValidationResult> {
  const { Validator } = await import('./validator.js');
  const validator = new Validator();
  return validator.validateGraphQLName(name);
}

/**
 * Convert JSON Schema to GraphQL SDL (with detailed result structure)
 *
 * @param jsonSchema - JSON Schema as object or string
 * @param options - Optional conversion options
 * @returns Detailed conversion result with success flag, SDL, errors, and statistics
 *
 * @example
 * ```typescript
 * import { convertJsonToSdl } from '@json-schema-x-graphql/node-converter';
 *
 * const schema = {
 *   type: 'object',
 *   'x-graphql-type-name': 'User',
 *   properties: {
 *     id: { type: 'string', 'x-graphql-type': 'ID!' }
 *   }
 * };
 *
 * const result = await convertJsonToSdl(schema);
 * if (result.success) {
 *   console.log(result.sdl);
 * } else {
 *   console.error(result.errors);
 * }
 * ```
 */
export async function convertJsonToSdl(
  jsonSchema: string | import('./types.js').JsonSchema,
  options?: import('./types.js').ConversionOptions
): Promise<{
  success: boolean;
  sdl?: string;
  errors?: Array<{ message: string; code?: string }>;
  statistics?: {
    typesConverted: number;
    fieldsConverted: number;
    conversionTimeMs: number;
  };
}> {
  const startTime = Date.now();

  try {
    const { jsonSchemaToGraphQL } = await import('./converter.js');
    const sdl = await jsonSchemaToGraphQL(jsonSchema, options);

    // Count types and fields in the output
    const typeMatches = sdl.match(/^(type|interface|enum|union|input|scalar)\s+\w+/gm) || [];
    const fieldMatches = sdl.match(/^\s+\w+.*:/gm) || [];

    return {
      success: true,
      sdl,
      statistics: {
        typesConverted: typeMatches.length,
        fieldsConverted: fieldMatches.length,
        conversionTimeMs: Date.now() - startTime,
      },
    };
  } catch (error) {
    const conversionError = error as import('./types.js').ConversionError;
    return {
      success: false,
      errors: conversionError.errors || [
        {
          message: conversionError.message || 'Unknown conversion error',
          code: conversionError.code || 'CONVERSION_FAILED',
        },
      ],
      statistics: {
        typesConverted: 0,
        fieldsConverted: 0,
        conversionTimeMs: Date.now() - startTime,
      },
    };
  }
}

/**
 * Convert GraphQL SDL to JSON Schema (with detailed result structure)
 *
 * @param graphqlSdl - GraphQL SDL as string
 * @param options - Optional conversion options
 * @returns Detailed conversion result with success flag, schema, errors, and statistics
 *
 * @example
 * ```typescript
 * import { convertSdlToJson } from '@json-schema-x-graphql/node-converter';
 *
 * const sdl = `
 *   type User {
 *     id: ID!
 *     name: String
 *   }
 * `;
 *
 * const result = await convertSdlToJson(sdl);
 * if (result.success) {
 *   console.log(result.schema);
 * } else {
 *   console.error(result.errors);
 * }
 * ```
 */
export async function convertSdlToJson(
  graphqlSdl: string,
  options?: import('./types.js').ConversionOptions
): Promise<{
  success: boolean;
  schema?: import('./types.js').JsonSchema;
  errors?: Array<{ message: string; code?: string }>;
  statistics?: {
    typesConverted: number;
    fieldsConverted: number;
    conversionTimeMs: number;
  };
}> {
  const startTime = Date.now();

  try {
    const { graphqlToJsonSchema } = await import('./converter.js');
    const schemaString = graphqlToJsonSchema(graphqlSdl, options);
    const schema: import('./types.js').JsonSchema = JSON.parse(schemaString);

    // Count types and fields in the schema
    const defs = schema.$defs || schema.definitions || {};
    const typesConverted = Object.keys(defs).length + (schema['x-graphql-type-name'] ? 1 : 0);
    let fieldsConverted = 0;

    Object.values(defs).forEach((def: { properties?: Record<string, unknown> }) => {
      if (def.properties) {
        fieldsConverted += Object.keys(def.properties).length;
      }
    });

    if (schema.properties) {
      fieldsConverted += Object.keys(schema.properties).length;
    }

    return {
      success: true,
      schema,
      statistics: {
        typesConverted,
        fieldsConverted,
        conversionTimeMs: Date.now() - startTime,
      },
    };
  } catch (error) {
    const conversionError = error as import('./types.js').ConversionError;
    return {
      success: false,
      errors: conversionError.errors || [
        {
          message: conversionError.message || 'Unknown conversion error',
          code: conversionError.code || 'CONVERSION_FAILED',
        },
      ],
      statistics: {
        typesConverted: 0,
        fieldsConverted: 0,
        conversionTimeMs: Date.now() - startTime,
      },
    };
  }
}
