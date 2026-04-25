import {
  ConvertInput,
  ConversionResult,
  ConverterOptions,
  FederationVersion,
  NamingConvention,
  IdInferenceStrategy,
  OutputFormat,
} from "./generated/types.js";
export interface IJsonSchemaConverter {
  convert(input: ConvertInput): Promise<ConversionResult>;
}
export type ExtendedConverterOptions = ConverterOptions & {
  maxDepth?: number;
  excludeTypeSuffixes?: string[];
  includeOperationalTypes?: boolean;
};
export interface NormalizedConverterOptions {
  validate: boolean;
  includeDescriptions: boolean;
  preserveFieldOrder: boolean;
  federationVersion: FederationVersion;
  includeFederationDirectives: boolean;
  namingConvention: NamingConvention;
  inferIds: boolean;
  idStrategy: IdInferenceStrategy;
  outputFormat: OutputFormat;
  failOnWarning: boolean;
  maxDepth: number;
  excludeTypes: string[];
  excludePatterns: string[];
  excludeRegexes: RegExp[];
  descriptionBlockThreshold: number;
  emitEmptyTypes: boolean;
  inlineObjectThreshold: number;
  refNaming: "basename" | "file_and_path" | "hash";
  excludeTypeSuffixes: string[];
  includeOperationalTypes: boolean;
}
export interface JsonSchema {
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
  "x-graphql-args"?: Record<string, GraphQLArgumentConfig>;
  "x-graphql-arguments"?: Record<string, GraphQLArgumentConfig>;
  "x-graphql-field-arguments"?: Record<string, GraphQLArgumentConfig>;
  "x-graphql-directives"?: (GraphQLDirective | string)[];
  "x-graphql-enum"?: GraphQLEnumConfig;
  "x-graphql-field-name"?: string;
  "x-graphql-implements"?: string[];
  "x-graphql-operations"?: GraphQLOperations;
  "x-graphql-scalar"?: string;
  "x-graphql-scalars"?: Record<string, GraphQLScalarConfig>;
  "x-graphql-type"?:
    | string
    | {
        name?: string;
      };
  "x-graphql-type-implements"?: string[];
  "x-graphql-type-name"?: string;
  "x-graphql-union-types"?: string[];
  [key: string]: any;
}
export interface GraphQLArgumentConfig {
  type?: string;
  "x-graphql-type"?: string;
  default?: unknown;
  [key: string]: unknown;
}
export interface GraphQLOperationArg extends GraphQLArgumentConfig {}
export interface GraphQLDirective {
  name?: string;
  arguments?: Record<string, unknown>;
}
export interface GraphQLEnumValue {
  name?: string;
  value?: string | number;
  description?: string;
}
export interface GraphQLEnumConfig {
  values?: Array<string | number | GraphQLEnumValue> | Record<string, string | GraphQLEnumValue>;
}
export interface GraphQLOperationField {
  description?: string;
  type?: string;
  args?: Record<string, GraphQLOperationArg>;
}
export interface GraphQLOperations {
  queries?: Record<string, GraphQLOperationField>;
  mutations?: Record<string, GraphQLOperationField>;
  subscriptions?: Record<string, GraphQLOperationField>;
}
export interface GraphQLScalarConfig {
  description?: string;
  [key: string]: unknown;
}
export interface ConversionContext {
  rootSchema: JsonSchema;
  options: NormalizedConverterOptions;
  generatedTypes: Set<string>;
  generating: Set<string>;
  building: Set<string>;
  usedScalars: Set<string>;
  output: string[];
  typeNames: Map<string, string>;
}
export type JsonSchemaInput = string | JsonSchema;
