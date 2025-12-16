/**
 * Converter wrapper for @json-schema-x-graphql/core
 * 
 * Wraps the real converter library with error handling and validation
 */

let converterPromise = null;

async function loadConverter() {
  if (!converterPromise) {
    converterPromise = import('@json-schema-x-graphql/core');
  }
  return converterPromise;
}

/**
 * Enhance JSON Schema to explicitly mark ID fields with type metadata
 * This ensures converters properly annotate ID fields for federation
 * @param {Record<string, any>} jsonSchema - The JSON Schema to enhance
 * @returns {Record<string, any>} Enhanced schema with ID type metadata
 */
export function enhanceSchemaWithIdMetadata(jsonSchema) {
  if (!jsonSchema || typeof jsonSchema !== 'object') {
    return jsonSchema;
  }

  const enhanced = JSON.parse(JSON.stringify(jsonSchema)); // Deep clone

  // Helper to identify and mark ID fields
  function processProperties(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;

    if (obj.properties && typeof obj.properties === 'object') {
      for (const [fieldName, fieldSchema] of Object.entries(obj.properties)) {
        if (!fieldSchema || typeof fieldSchema !== 'object') continue;

        const isIdField =
          // UUID format
          (fieldSchema.type === 'string' && fieldSchema.format === 'uuid') ||
          // Explicit ID type
          fieldSchema['x-graphql-type'] === 'ID' ||
          fieldSchema['x-graphql-type'] === 'ID!' ||
          // Common ID naming patterns
          /^(id|_id|uid|user_id|entity_id|.*_id)$/.test(fieldName);

        if (isIdField) {
          // Add type metadata if not already present
          if (!fieldSchema['x-graphql-type']) {
            fieldSchema['x-graphql-type'] = 'ID!';
          }
          // Add field type name annotation
          if (!fieldSchema['x-graphql-field-type-name']) {
            fieldSchema['x-graphql-field-type-name'] = 'ID';
          }
          // Mark as an entity key candidate
          if (!fieldSchema['x-graphql-is-entity-key']) {
            fieldSchema['x-graphql-is-entity-key'] = true;
          }
        }

        // Recursively process nested objects
        if (fieldSchema.type === 'object' && fieldSchema.properties) {
          processProperties(fieldSchema, `${path}.${fieldName}`);
        }
      }
    }
  }

  processProperties(enhanced);
  return enhanced;
}

/**
 * Convert a JSON Schema to GraphQL SDL with ID type annotations
 * @param {Record<string, any>|string} jsonSchema - The JSON Schema (object or string)
 * @param {Object} options - Conversion options
 * @returns {{success: boolean, sdl?: string, error?: string, warnings?: string[]}}
 */
export async function convertSchema(jsonSchema, options = {}) {
  try {
    // Parse string input if needed
    let schema = jsonSchema;
    if (typeof jsonSchema === 'string') {
      schema = JSON.parse(jsonSchema);
    }

    // Validate input
    if (!schema || typeof schema !== 'object') {
      throw new Error('Invalid JSON Schema: must be an object');
    }

    // Enhance schema with ID type metadata
    const enhancedSchema = enhanceSchemaWithIdMetadata(schema);

    const { jsonSchemaToGraphQL } = await loadConverter();

    // Convert with real library
    const sdl = jsonSchemaToGraphQL(enhancedSchema, {
      validate: options.validate ?? true,
      includeDescriptions: options.descriptions ?? true,
      includeFederationDirectives: options.federation ?? true,
      federationVersion: options.federationVersion ?? 'AUTO',
      namingConvention: options.naming ?? 'GRAPHQL_IDIOMATIC',
      ...options, // Allow passing additional options
    });

    if (!sdl || typeof sdl !== 'string') {
      throw new Error('Converter did not return valid GraphQL SDL');
    }

    return {
      success: true,
      sdl,
      warnings: [],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Log error for test runs to aid debugging
    // eslint-disable-next-line no-console
    console.error('convertSchema error:', errorMessage);
    return {
      success: false,
      error: errorMessage,
      sdl: null,
      warnings: [],
    };
  }
}

/**
 * Validate a JSON Schema for x-graphql compatibility
 * @param {Record<string, any>|string} jsonSchema - The JSON Schema to validate
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateJsonSchema(jsonSchema) {
  const errors = [];
  const warnings = [];

  try {
    // Parse string input if needed
    let schema = jsonSchema;
    if (typeof jsonSchema === 'string') {
      schema = JSON.parse(jsonSchema);
    }

    if (!schema || typeof schema !== 'object') {
      errors.push('Schema must be a valid JSON object');
      return { valid: false, errors, warnings };
    }

    // Check for required $schema or title
    if (!schema.$schema && !schema.title) {
      warnings.push('Missing $schema or title - schema may not be recognized');
    }

    // Check for properties
    if (!schema.properties && schema.type === 'object') {
      warnings.push('Object schema has no properties defined');
    }



    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(`Validation error: ${errorMessage}`);
    return { valid: false, errors, warnings };
  }
}

/**
 * Format JSON Schema for display
 * @param {string} jsonString - JSON string to format
 * @returns {string} Formatted JSON with 2-space indentation
 */
export function formatJsonSchema(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get info about the converter library version and capabilities
 * @returns {{name: string, version?: string, capabilities: string[]}}
 */
export function getConverterInfo() {
  return {
    name: '@json-schema-x-graphql/core',
    capabilities: [
      'JSON Schema to GraphQL conversion',
      'Federation support',
      'Custom scalars',
      'Description preservation',
      'Field ordering',
      'ID type inference',
      'Validation',
    ],
  };
}

