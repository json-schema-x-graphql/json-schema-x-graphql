/**
 * Global Jest setup file.
 *
 * This file is executed by Jest before running the test suites. Its primary
 * purpose here is to globally mock the Rust WASM module. By mocking it here,
 * we prevent Jest from trying to parse the wasm-pack generated JavaScript,
 * which uses syntax (like top-level await or import.meta) that can cause the
 * Jest transformer to fail.
 */

jest.mock(
  '../../rust/pkg/json_schema_graphql_converter.js',
  () => ({
    // Provide a mock implementation for the WasmConverter class.
    WasmConverter: class MockWasmConverter {
      /**
       * Mocked conversion from JSON Schema to GraphQL.
       * Returns a predictable, simple GraphQL SDL string. This allows tests
       * to run without the real WASM binary and verify that the conversion
       * logic was invoked.
       */
      jsonSchemaToGraphQL(schemaString) {
        // Handle empty or invalid input gracefully, similar to the real converter.
        if (!schemaString || schemaString.trim() === '{}') {
          return '';
        }
        // Return a consistent mock output for testing purposes.
        return `
# --- MOCK WASM CONVERTER OUTPUT ---
type MockUser {
  id: ID!
  name: String
}`;
      }

      /**
       * Mocked conversion from GraphQL to JSON Schema.
       * Returns a simple, predictable JSON Schema string.
       */
      graphqlToJsonSchema(_graphqlSdl) {
        return JSON.stringify({
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          title: 'MockUser',
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
          },
        });
      }
    },
    // The wasm-pack generated file also includes a default export `init` function
    // that loads the WASM binary. We mock it to return a resolved promise,
    // simulating a successful and instantaneous load.
    default: () => Promise.resolve(),
  }),
  {
    // `virtual: true` is important for ensuring the mock is consistently applied,
    // especially with ES Modules.
    virtual: true,
  }
);
