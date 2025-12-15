/**
 * Advanced Converter API with Full Option Support
 *
 * This module provides a high-level API that maps the application's option
 * interface to the WASM converter. Currently wraps the basic WASM functions.
 *
 * TODO: Once Rust converter's standardized `convert` API is exported from WASM,
 * this module should be updated to support all options:
 * - idStrategy (NONE | COMMON_PATTERNS | ALL_STRINGS)
 * - outputFormat (SDL | SDL_WITH_FEDERATION_METADATA | AST_JSON)
 * - failOnWarning
 * - includeFederationDirectives
 * - namingConvention
 */

import init, {
  jsonSchemaToGraphQL as wasmJsonSchemaToGraphQL,
  graphqlToJsonSchema as wasmGraphqlToJsonSchema,
} from "./wasm/json_schema_graphql_converter.js";

export interface ConverterOptions {
  validate?: boolean;
  includeDescriptions?: boolean;
  preserveFieldOrder?: boolean;
  federationVersion?: "NONE" | "V1" | "V2" | "AUTO";
  includeFederationDirectives?: boolean;
  namingConvention?: "PRESERVE" | "GRAPHQL_IDIOMATIC";
  idStrategy?: "NONE" | "COMMON_PATTERNS" | "ALL_STRINGS";
  outputFormat?: "SDL" | "SDL_WITH_FEDERATION_METADATA" | "AST_JSON";
  failOnWarning?: boolean;
  prettyPrint?: boolean;
}

export interface ConversionResult {
  output: string | null;
  success: boolean;
  errorCount: number;
  warningCount: number;
  diagnostics: Array<{
    severity: "error" | "warning" | "info";
    message: string;
    kind?: string;
    path?: string;
    code?: string;
  }>;
}

// Initialize the WASM module once
let wasmInitialized = false;
let wasmError: Error | null = null;
const WASM_AVAILABLE = false; // WASM binary not available in demo

const wasmReadyPromise = Promise.resolve();

/**
 * Convert JSON Schema to GraphQL using the WASM converter
 *
 * Note: Current WASM implementation has limited option support.
 * The following options are currently ignored (pending standardized WASM API):
 * - idStrategy, outputFormat, failOnWarning, includeFederationDirectives, namingConvention
 * All conversions currently output SDL format.
 */
export async function convertJsonSchemaToGraphQL(
  jsonSchema: string,
  options: ConverterOptions = {},
): Promise<ConversionResult> {
  await wasmReadyPromise;

  if (!WASM_AVAILABLE) {
    return {
      output: null,
      success: false,
      errorCount: 1,
      warningCount: 0,
      diagnostics: [
        {
          severity: "error",
          message:
            "JSON Schema to GraphQL converter is not available in this demo. WASM binary not included.",
        },
      ],
    };
  }

  if (wasmError) {
    return {
      output: null,
      success: false,
      errorCount: 1,
      warningCount: 0,
      diagnostics: [
        {
          severity: "error",
          message: `WASM converter initialization failed: ${wasmError.message}`,
        },
      ],
    };
  }

  try {
    console.log("🔄 Converting JSON Schema to GraphQL");

    // Call the basic WASM function
    const sdlOutput = wasmJsonSchemaToGraphQL(jsonSchema);

    if (typeof sdlOutput !== "string") {
      throw new Error(
        "Unexpected return type from WASM. Expected a GraphQL SDL string.",
      );
    }

    // Format output if requested
    const formattedOutput =
      options.prettyPrint !== false ? sdlOutput : sdlOutput;

    return {
      output: formattedOutput,
      success: true,
      errorCount: 0,
      warningCount: 0,
      diagnostics: [],
    };
  } catch (error) {
    console.error("❌ Conversion failed:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "object"
          ? JSON.stringify(error)
          : String(error);

    return {
      output: null,
      success: false,
      errorCount: 1,
      warningCount: 0,
      diagnostics: [
        {
          severity: "error",
          message: errorMessage,
          kind: "conversion-error",
        },
      ],
    };
  }
}

/**
 * Convert GraphQL SDL to JSON Schema using the WASM converter
 */
export async function convertGraphQLToJsonSchema(
  graphqlSdl: string,
  options: ConverterOptions = {},
): Promise<ConversionResult> {
  await wasmReadyPromise;

  if (!WASM_AVAILABLE) {
    return {
      output: null,
      success: false,
      errorCount: 1,
      warningCount: 0,
      diagnostics: [
        {
          severity: "error",
          message:
            "GraphQL to JSON Schema converter is not available in this demo. WASM binary not included.",
        },
      ],
    };
  }

  if (wasmError) {
    return {
      output: null,
      success: false,
      errorCount: 1,
      warningCount: 0,
      diagnostics: [
        {
          severity: "error",
          message: `WASM converter initialization failed: ${wasmError.message}`,
        },
      ],
    };
  }

  try {
    console.log("🔄 Converting GraphQL to JSON Schema");

    // Call the basic WASM function
    const schemaString = wasmGraphqlToJsonSchema(graphqlSdl);

    if (typeof schemaString !== "string") {
      throw new Error(
        "Unexpected return type from WASM. Expected a JSON Schema string.",
      );
    }

    // Format output if requested
    const formattedOutput = options.prettyPrint !== false ? schemaString : schemaString;

    return {
      output: formattedOutput,
      success: true,
      errorCount: 0,
      warningCount: 0,
      diagnostics: [],
    };
  } catch (error) {
    console.error("❌ Conversion failed:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "object"
          ? JSON.stringify(error)
          : String(error);

    return {
      output: null,
      success: false,
      errorCount: 1,
      warningCount: 0,
      diagnostics: [
        {
          severity: "error",
          message: errorMessage,
          kind: "conversion-error",
        },
      ],
    };
  }
}

/**
 * Format converter output for display
 */
export function formatOutput(
  output: string | null,
  format: "SDL" | "SDL_WITH_FEDERATION_METADATA" | "AST_JSON",
  prettify: boolean = true,
): string {
  if (!output) return "";

  if (format === "AST_JSON" && prettify) {
    try {
      const parsed = JSON.parse(output);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return output;
    }
  }

  return output;
}
