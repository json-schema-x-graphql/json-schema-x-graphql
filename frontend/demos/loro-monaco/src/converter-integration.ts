/**
 * WebAssembly-powered JSON Schema <-> GraphQL Converter Integration
 *
 * This module replaces the simplified JavaScript converter with the production-grade
 * Rust converter, compiled to WebAssembly. It handles the asynchronous loading of the
 * WASM module and provides the same function interface to the application.
 */

// 1. Import the generated JavaScript bindings for our WASM module.
//    Vite, with vite-plugin-wasm, will handle the bundling of the .wasm file.
import init, {
  jsonSchemaToGraphQL as wasmJsonSchemaToGraphQL,
  graphqlToJsonSchema as wasmGraphqlToJsonSchema,
} from "../../../../converters/rust/pkg/json_schema_graphql_converter.js";

// 2. Initialize the WASM module.
//    This is an asynchronous operation. We create a promise that resolves
//    once the module is loaded and ready. Any calls to the converter functions
//    will await this promise, ensuring they don't execute before the
//    WASM environment is prepared.
const wasmReady = init().catch((err) => {
  console.error("🚨 Failed to initialize the WASM converter module.", err);
  // Propagate the error to alert the user that the core functionality is broken.
  alert(
    "Fatal Error: The core conversion engine (WASM) could not be loaded. " +
      "Please check the console for details and try reloading the page.",
  );
  return Promise.reject(err);
});

// Define a common options interface for type-safety and consistency with the Rust converter.
interface ConversionOptions {
  validate?: boolean;
  includeDescriptions?: boolean;
  preserveFieldOrder?: boolean;
  federationVersion?: number | null;
}

/**
 * Converts a JSON Schema string to a GraphQL SDL string using the Rust WASM converter.
 *
 * @param {string} jsonSchemaStr - The JSON Schema provided as a string.
 * @param {ConversionOptions} options - Configuration for the conversion process.
 * @returns {Promise<string>} A promise that resolves to the generated GraphQL SDL string.
 */
export async function jsonSchemaToGraphQL(
  jsonSchemaStr: string,
): Promise<string> {
  // Ensure the WASM module is initialized before proceeding.
  await wasmReady;

  try {
    console.log("🚀 Calling WASM -> jsonSchemaToGraphQL");

    // Execute the WASM function. If the Rust function returns an `Err`,
    // wasm-bindgen will throw a JavaScript exception.
    const sdlOutput = wasmJsonSchemaToGraphQL(jsonSchemaStr);

    if (typeof sdlOutput !== "string") {
      // This is a sanity check in case the WASM interface changes unexpectedly.
      throw new Error(
        "Unexpected return type from WASM. Expected a GraphQL SDL string.",
      );
    }

    return sdlOutput;
  } catch (error) {
    console.error("❌ WASM conversion (JSON Schema -> GraphQL) failed:", error);
    // Re-throw a standardized error message to be handled by the UI.
    throw new Error(
      `Failed to convert JSON Schema to GraphQL: ${String(error)}`,
    );
  }
}

/**
 * Converts a GraphQL SDL string to a JSON Schema string using the Rust WASM converter.
 *
 * @param {string} graphqlSdl - The GraphQL SDL provided as a string.
 * @param {ConversionOptions} options - Configuration for the conversion process.
 * @returns {Promise<string>} A promise that resolves to the generated JSON Schema, pretty-printed.
 */
export async function graphqlToJsonSchema(graphqlSdl: string): Promise<string> {
  // Ensure the WASM module is initialized.
  await wasmReady;

  try {
    console.log("🚀 Calling WASM -> graphqlToJsonSchema");

    // Execute the WASM function. With `serde-wasm-bindgen`, a `serde_json::Value`
    // from Rust is automatically converted into a JavaScript object.
    const schemaObject = wasmGraphqlToJsonSchema(graphqlSdl);

    if (typeof schemaObject !== "object" || schemaObject === null) {
      // Sanity check for the return type.
      throw new Error(
        "Unexpected return type from WASM. Expected a JSON Schema object.",
      );
    }

    // Pretty-print the resulting JSON object for readability in the editor.
    return JSON.stringify(schemaObject, null, 2);
  } catch (error) {
    console.error("❌ WASM conversion (GraphQL -> JSON Schema) failed:", error);
    throw new Error(
      `Failed to convert GraphQL to JSON Schema: ${String(error)}`,
    );
  }
}
