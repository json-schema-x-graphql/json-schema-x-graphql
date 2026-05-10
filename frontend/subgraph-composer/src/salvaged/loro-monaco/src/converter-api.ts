/**
 * Advanced Converter API with Full Option Support
 *
 * This module uses the Node converter (@json-schema-x-graphql/core)
 * which provides full support for all conversion options.
 */

import {
  jsonSchemaToGraphQL,
  graphqlToJsonSchema,
  ConverterOptions as NodeConverterOptions,
} from "@json-schema-x-graphql/core";

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

/**
 * Map our ConverterOptions to the Node converter's options format
 */
function mapOptions(options: ConverterOptions): NodeConverterOptions {
  return {
    validate: options.validate ?? true,
    includeDescriptions: options.includeDescriptions ?? true,
    preserveFieldOrder: options.preserveFieldOrder ?? false,
    federationVersion: (options.federationVersion ?? "AUTO") as any,
    includeFederationDirectives: options.includeFederationDirectives ?? true,
    namingConvention: (options.namingConvention ?? "PRESERVE") as any,
    inferIds: options.idStrategy !== "NONE",
    idStrategy: (options.idStrategy ?? "NONE") as any,
    outputFormat: (options.outputFormat ?? "SDL") as any,
    failOnWarning: options.failOnWarning ?? false,
  };
}

/**
 * Convert JSON Schema to GraphQL using the Node converter
 */
export async function convertJsonSchemaToGraphQL(
  jsonSchema: string,
  options: ConverterOptions = {},
): Promise<ConversionResult> {
  try {
    const sdlOutput = jsonSchemaToGraphQL(jsonSchema, mapOptions(options));

    return {
      output: sdlOutput || null,
      success: !!sdlOutput,
      errorCount: 0,
      warningCount: 0,
      diagnostics: [],
    };
  } catch (error) {
    console.error("❌ JSON Schema to GraphQL conversion failed:", error);
    return {
      output: null,
      success: false,
      errorCount: 1,
      warningCount: 0,
      diagnostics: [
        {
          severity: "error",
          message:
            error instanceof Error ? error.message : "Unknown conversion error",
          kind: "conversion-error",
        },
      ],
    };
  }
}

/**
 * Convert GraphQL SDL to JSON Schema using the Node converter
 */
export async function convertGraphQLToJsonSchema(
  graphqlSdl: string,
  options: ConverterOptions = {},
): Promise<ConversionResult> {
  try {
    const jsonOutput = graphqlToJsonSchema(graphqlSdl, mapOptions(options));

    return {
      output: jsonOutput || null,
      success: !!jsonOutput,
      errorCount: 0,
      warningCount: 0,
      diagnostics: [],
    };
  } catch (error) {
    console.error("❌ GraphQL to JSON Schema conversion failed:", error);
    return {
      output: null,
      success: false,
      errorCount: 1,
      warningCount: 0,
      diagnostics: [
        {
          severity: "error",
          message:
            error instanceof Error ? error.message : "Unknown conversion error",
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
