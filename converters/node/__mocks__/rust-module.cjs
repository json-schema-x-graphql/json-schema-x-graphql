/**
 * Manual mock for the Rust WASM module (CommonJS version).
 *
 * This file is used by Jest via `moduleNameMapper` to replace the actual
 * WASM-generated JavaScript during tests. This version uses CommonJS syntax
 * (`module.exports`) to ensure compatibility with Jest's module system
 * without requiring complex ESM transformations for the mock itself.
 */

class WasmConverter {
  constructor() {
    // console.log('Mock WasmConverter (CJS) instantiated.');
  }

  /**
   * Mocked conversion from JSON Schema to GraphQL.
   * @param {string} schemaString - The input schema.
   * @returns {string} A fixed, simple GraphQL SDL string.
   */
  jsonSchemaToGraphQL(schemaString) {
    if (!schemaString || schemaString.trim() === '{}') {
      return '';
    }
    return `
# --- MOCK WASM CONVERTER OUTPUT ---
type MockUser {
  id: ID!
  name: String
}`;
  }

  /**
   * Mocked conversion from GraphQL to JSON Schema.
   * @param {string} _graphqlSdl - The input SDL (ignored in mock).
   * @returns {string} A fixed, simple JSON Schema string.
   */
  graphqlToJsonSchema(_graphqlSdl) {
    return JSON.stringify(
      {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'MockUser',
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
        },
      },
      null,
      2
    );
  }
}

// Mock the `init` function, which is the default export in the real module.
const init = () => Promise.resolve();

// Export the mock components using CommonJS syntax.
// We also need to set __esModule: true to correctly mock an ES module with a default export.
module.exports = {
  __esModule: true,
  WasmConverter,
  default: init,
};
