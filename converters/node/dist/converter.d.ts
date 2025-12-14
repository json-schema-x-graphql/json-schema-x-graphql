/**
 * JSON Schema <-> GraphQL Converter with deep $ref resolution.
 *
 * This module normalizes converter options, resolves nested JSON Pointer references,
 * and produces deterministic GraphQL SDL output that mirrors the behavior of the
 * Rust implementation as closely as possible.
 */
import { ConverterOptions, ConvertInput, ConversionResult } from './generated/types';
import { IJsonSchemaConverter } from './interfaces';
export { ConverterOptions };
export type ExtendedConverterOptions = ConverterOptions & {
    maxDepth?: number;
};
interface JsonSchema {
    $schema?: string;
    title?: string;
    description?: string;
    type?: string | string[];
    properties?: Record<string, JsonSchema>;
    required?: string[];
    items?: JsonSchema;
    $ref?: string;
    enum?: (string | number)[];
    format?: string;
    $defs?: Record<string, JsonSchema>;
    definitions?: Record<string, JsonSchema>;
    oneOf?: JsonSchema[];
    anyOf?: JsonSchema[];
    allOf?: JsonSchema[];
    "x-graphql-arguments"?: Record<string, GraphQLArgumentConfig>;
    "x-graphql-directives"?: GraphQLDirective[];
    "x-graphql-enum"?: GraphQLEnumConfig;
    "x-graphql-field-name"?: string;
    "x-graphql-implements"?: string[];
    "x-graphql-operations"?: GraphQLOperations;
    "x-graphql-scalar"?: string;
    "x-graphql-scalars"?: Record<string, GraphQLScalarConfig>;
    "x-graphql-type"?: string | {
        name?: string;
    };
    "x-graphql-type-implements"?: string[];
    "x-graphql-type-name"?: string;
    "x-graphql-union-types"?: string[];
    [key: string]: any;
}
interface GraphQLArgumentConfig {
    type?: string;
    "x-graphql-type"?: string;
    default?: unknown;
    [key: string]: unknown;
}
interface GraphQLOperationArg extends GraphQLArgumentConfig {
}
interface GraphQLDirective {
    name?: string;
    arguments?: Record<string, unknown>;
}
interface GraphQLEnumValue {
    name?: string;
    value?: string | number;
    description?: string;
}
interface GraphQLEnumConfig {
    values?: Array<string | number | GraphQLEnumValue>;
}
interface GraphQLOperationField {
    description?: string;
    type?: string;
    args?: Record<string, GraphQLOperationArg>;
}
interface GraphQLOperations {
    queries?: Record<string, GraphQLOperationField>;
    mutations?: Record<string, GraphQLOperationField>;
}
interface GraphQLScalarConfig {
    description?: string;
    [key: string]: unknown;
}
type JsonSchemaInput = string | JsonSchema;
export declare function jsonSchemaToGraphQL(jsonSchemaInput: JsonSchemaInput, options?: ExtendedConverterOptions): string;
export declare function graphqlToJsonSchema(graphqlSdl: string, options?: ConverterOptions): string;
export declare class Converter implements IJsonSchemaConverter {
    convert(input: ConvertInput): Promise<ConversionResult>;
}
