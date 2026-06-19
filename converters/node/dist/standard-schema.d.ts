import { ConverterOptions } from "./generated/types.js";
import type { StandardSchemaV1 } from "@standard-schema/spec";
export declare function isZodSchema(schema: any): boolean;
export declare function isStandardSchema(schema: any): schema is StandardSchemaV1;
/**
 * Converts a Zod or Standard Schema to GraphQL SDL.
 * Uses `zod-to-json-schema` to bridge to JSON Schema, then runs the converter.
 *
 * @param schema A Zod schema or Standard Schema-compliant object.
 * @param options Converter options.
 */
export declare function convertStandardSchemaToGraphQL(schema: any, options?: ConverterOptions): string;
