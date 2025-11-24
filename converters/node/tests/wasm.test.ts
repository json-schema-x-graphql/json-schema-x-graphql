/**
 * Dedicated tests for the Rust WASM converter.
 * This suite ensures that the compiled WebAssembly module loads correctly
 * and performs conversions as expected. It is intended to run in an environment
 * that can properly handle the WASM and JS bindings, separate from tests that
 * might mock this functionality.
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import type { WasmConverter } from '../../rust/pkg/json_schema_graphql_converter.js';

// This test suite assumes that the Jest environment is configured to handle
// the ES module exports from the wasm-pack generated JavaScript file.
describe('WASM Converter Direct Integration Tests', () => {
  let WasmModule: any;

  beforeAll(async () => {
    try {
      // Dynamically import the module to be tested.
      WasmModule = await import('../../rust/pkg/json_schema_graphql_converter.js');
    } catch (e) {
      // If this fails, it's a critical error in the test setup or WASM build.
      console.error('Failed to load the WASM module. Ensure it is built correctly.', e);
      // We'll throw an error to make it clear that the setup failed.
      throw new Error(
        'WASM module could not be imported. Run `wasm-pack build` in `converters/rust`.'
      );
    }
  });

  test('WASM module should export the WasmConverter class', () => {
    expect(WasmModule).toBeDefined();
    expect(typeof WasmModule.WasmConverter).toBe('function');
  });

  test('should convert a simple JSON Schema to GraphQL SDL', () => {
    const converter: WasmConverter = new WasmModule.WasmConverter();
    const jsonSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: {
        User: {
          type: 'object',
          'x-graphql-type-name': 'User',
          properties: {
            id: { type: 'string', 'x-graphql-field-type': 'ID!' },
            name: { type: 'string', description: 'The name of the user.' },
            email: { type: 'string', 'x-graphql-field-type': 'String!' },
          },
          required: ['id', 'email'],
        },
      },
    };

    const schemaString = JSON.stringify(jsonSchema);
    const result = converter.jsonSchemaToGraphQL(schemaString);

    expect(typeof result).toBe('string');
    expect(result).not.toContain('error');

    // Normalize whitespace for consistent assertions
    const normalizedResult = result.replace(/\s+/g, ' ').trim();

    expect(normalizedResult).toContain('type User {');
    expect(normalizedResult).toContain('"""The name of the user.""" name: String');
    expect(normalizedResult).toContain('id: ID!');
    expect(normalizedResult).toContain('email: String!');
  });

  test('should handle invalid JSON and return an error message', () => {
    const converter: WasmConverter = new WasmModule.WasmConverter();
    const invalidJson = '{"this is not valid json"';

    const result = converter.jsonSchemaToGraphQL(invalidJson);

    expect(result).toBeDefined();
    expect(result.toLowerCase()).toContain('error');
    expect(result).toContain('Failed to parse JSON schema');
  });

  test('should handle a schema that is valid JSON but invalid as a JSON Schema', () => {
    const converter: WasmConverter = new WasmModule.WasmConverter();
    // Valid JSON, but `type` has an invalid value "integerz"
    const invalidSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: {
        MyType: {
          type: 'object',
          properties: {
            age: { type: 'integerz' },
          },
        },
      },
    };
    const schemaString = JSON.stringify(invalidSchema);
    const result = converter.jsonSchemaToGraphQL(schemaString);

    expect(result).toBeDefined();
    expect(result.toLowerCase()).toContain('error');
    expect(result).toContain('Conversion failed');
  });
});
