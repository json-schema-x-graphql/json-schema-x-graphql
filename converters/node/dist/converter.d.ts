/**
 * JSON Schema <-> GraphQL Converter with deep $ref resolution.
 *
 * This module normalizes converter options, resolves nested JSON Pointer references,
 * and produces deterministic GraphQL SDL output that mirrors the behavior of the
 * Rust implementation as closely as possible.
 */
import type { ConverterOptions, ConvertInput, ConversionResult } from "./generated/types.js";
import { IJsonSchemaConverter, ExtendedConverterOptions, JsonSchemaInput } from "./interfaces.js";
export declare function jsonSchemaToGraphQL(
  jsonSchemaInput: JsonSchemaInput,
  options?: ExtendedConverterOptions,
): string;
export declare function graphqlToJsonSchema(graphqlSdl: string, options?: ConverterOptions): string;
export declare class Converter implements IJsonSchemaConverter {
  convert(input: ConvertInput): Promise<ConversionResult>;
}
