/**
 * JSON Schema x GraphQL Node.js Converter
 *
 * Type definitions for the converter, including options, errors,
 * and representations for both JSON Schema and GraphQL constructs.
 *
 * @packageDocumentation
 */

// --- Conversion Configuration ---

/**
 * Defines the options available for the conversion process.
 */
export interface ConversionOptions {
  /**
   * If true, the input schemas will be validated before conversion.
   * This can help catch structural issues early.
   * @default false
   */
  validate?: boolean;

  /**
   * If true, `description` fields from the source schema will be included
   * as comments or descriptions in the output.
   * @default true
   */
  includeDescriptions?: boolean;

  /**
   * If true, the order of fields/properties in the source schema will be
   * preserved in the output. Note that field order in GraphQL is significant,
   * while property order in JSON is not.
   * @default false
   */
  preserveFieldOrder?: boolean;

  /**
   * If true, the output (e.g., JSON Schema) will be pretty-printed.
   * @default true
   */
  prettyPrint?: boolean;

  /**
   * Specifies the version of Apollo Federation to target, which can affect
   * which directives and features are used.
   * @default null
   */
  federationVersion?: '1' | '2' | null;

  /**
   * Specifies the case conversion strategy for field and property names.
   * 'camel' for camelCase, 'snake' for snake_case.
   * @default 'camel'
   */
  caseConversion?: 'camel' | 'snake';
}

/**
 * Default options for the converter. These are merged with any user-provided options.
 */
export const DEFAULT_OPTIONS: Required<ConversionOptions> = {
  validate: false,
  includeDescriptions: true,
  preserveFieldOrder: false,
  prettyPrint: true,
  federationVersion: null,
  caseConversion: 'camel',
};

/**
 * Enum specifying the direction of the conversion.
 */
export enum ConversionDirection {
  JsonSchemaToGraphQL = 'json-schema-to-graphql',
  GraphQLToJsonSchema = 'graphql-to-json-schema',
}

// --- Error and Result Types ---

/**
 * Custom error class for handling failures during the conversion process.
 * It can encapsulate multiple validation errors.
 */
export class ConversionError extends Error {
  public code?: string;
  public errors?: ValidationError[];

  constructor(message: string, errors?: ValidationError[], code?: string) {
    super(message);
    this.name = 'ConversionError';
    this.errors = errors;
    this.code = code;
  }
}

/**
 * Represents a single validation error, with a message and an optional path.
 */
export interface ValidationError {
  message: string;
  path?: string;
  code?: string;
}

/**
 * Represents the result of a validation operation.
 */
export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

/**
 * Represents the successful result of a conversion.
 */
export interface ConversionResult {
  output: string;
  metadata: {
    source: 'json-schema' | 'graphql';
    target: 'json-schema' | 'graphql';
    timestamp: string;
    typesCount: number;
    fieldsConverted?: number;
  };
}

// --- GraphQL-related types for x-graphql-* extensions ---

/**
 * The kind of GraphQL type, used in `x-graphql-type-kind`.
 */
export type GraphQLTypeKind = 'OBJECT' | 'INTERFACE' | 'UNION' | 'ENUM' | 'INPUT_OBJECT' | 'SCALAR';

/**
 * Represents a GraphQL directive for use in `x-graphql-*` extensions.
 */
export interface GraphQLDirective {
  name: string;
  arguments?: Record<string, string | number | boolean | string[] | number[] | string[][]>;
}

/**
 * Represents a GraphQL argument for a field.
 */
export interface GraphQLArgument {
  name: string;
  type: string;
  default?: unknown;
  description?: string;
}

/**
 * Represents a single value within a GraphQL enum.
 */
export interface GraphQLEnumValue {
  name: string;
  description?: string;
  deprecationReason?: string;
}

/**
 * Represents a field within a GraphQL type.
 */
export interface GraphQLField {
  name: string;
  type: string;
  description?: string;
  arguments?: GraphQLArgument[];
  directives?: GraphQLDirective[];
  deprecationReason?: string;
}

/**
 * A structured representation of a GraphQL type definition, often used
 * when constructing a schema from an intermediate format.
 */
export interface GraphQLTypeDefinition {
  name: string;
  kind: GraphQLTypeKind;
  description?: string;
  implements?: string[];
  fields?: GraphQLField[];
  values?: GraphQLEnumValue[];
  types?: string[]; // For union types
  directives?: GraphQLDirective[];
}

// --- JSON Schema related types ---

/**
 * The allowed primitive types in JSON Schema.
 */
export type JsonSchemaType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null';

/**
 * Represents a property within a JSON Schema object, which can itself be a schema.
 */
export interface JsonSchemaProperty extends JsonSchema {}

/**
 * Represents a JSON Schema object, including common keywords and custom `x-graphql-*` extensions.
 * This is the primary type for representing JSON Schema within the converter.
 */
export interface JsonSchema {
  $schema?: string;
  $id?: string;
  title?: string;
  description?: string;
  type?: JsonSchemaType | JsonSchemaType[];
  properties?: { [key: string]: JsonSchemaProperty };
  required?: string[];
  definitions?: { [key: string]: JsonSchema };
  $defs?: { [key: string]: JsonSchema };
  allOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  enum?: unknown[];
  items?: JsonSchemaProperty | JsonSchemaProperty[];
  default?: unknown;
  deprecated?: boolean;
  format?: string;

  // --- x-graphql-* extensions ---
  'x-graphql-type-name'?: string;
  'x-graphql-type-kind'?: GraphQLTypeKind;
  'x-graphql-implements'?: string[];
  'x-graphql-directives'?: GraphQLDirective[];
  'x-graphql-field-name'?: string;
  'x-graphql-arguments'?: GraphQLArgument[];
  'x-graphql-union-types'?: string[];
  'x-graphql-scalar'?: string;
  'x-graphql-type'?: string;
  'x-graphql-deprecation-reason'?: string;
  'x-graphql-field-type'?: string;
  'x-graphql-field-deprecated'?: boolean;
  'x-graphql-field-deprecation-reason'?: string;
  'x-graphql-field-non-null'?: boolean;
  'x-graphql-field-list-item-non-null'?: boolean;

  // --- Apollo Federation extensions ---
  'x-graphql-federation-keys'?: Array<{ fields: string; resolvable?: boolean }>;
  'x-graphql-federation-external'?: boolean;
  'x-graphql-federation-requires'?: string;
  'x-graphql-federation-provides'?: string;
  'x-graphql-federation-shareable'?: boolean;
  'x-graphql-federation-authenticated'?: boolean;
  'x-graphql-federation-requires-scopes'?: string[][];

  // Allow other properties for extensibility
  [key: string]: unknown;
}
