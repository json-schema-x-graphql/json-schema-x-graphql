/**
 * Custom Jest Transformer for the WASM Module.
 *
 * This transformer intercepts requests for the wasm-pack generated JavaScript file
 * and returns a stable, mock implementation instead. This is a robust way to handle
 * modules that Jest's default transformer cannot process.
 *
 * It works by replacing the content of the problematic file with a valid,
 * mock ES module at transformation time.
 */

module.exports = {
  process() {
    return {
      // The `code` property contains the JavaScript that will be used by Jest
      // in place of the original file's content.
      code: `
        // Export a mock WasmConverter class with the same interface as the real one.
        export class WasmConverter {
          constructor() {
            // console.log('Mock WasmConverter instantiated by transformer.');
          }

          // Mock the main conversion function.
          jsonSchemaToGraphQL(schemaString) {
            // Return an empty string for empty input to mimic real behavior.
            if (!schemaString || schemaString.trim() === '{}') {
              return '';
            }
            // Return a predictable GraphQL string for tests to assert against.
            return \`
# --- MOCK WASM CONVERTER OUTPUT ---
type MockUser {
  id: ID!
  name: String
}\`;
          }

          // Mock the reverse conversion function.
          graphqlToJsonSchema(_graphqlSdl) {
            return JSON.stringify({
              "$schema": "https://json-schema.org/draft/2020-12/schema",
              "title": "MockUser",
              "type": "object",
              "properties": {
                "id": { "type": "string" },
                "name": { "type": "string" },
              },
            });
          }
        }

        // Mock the default export `init` function.
        export default () => Promise.resolve();
      `,
    };
  },
};
