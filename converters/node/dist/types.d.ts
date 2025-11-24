export interface ConversionOptions {
    validate?: boolean;
    includeDescriptions?: boolean;
    preserveFieldOrder?: boolean;
    prettyPrint?: boolean;
    federationVersion?: '1' | '2' | null;
    caseConversion?: 'camel' | 'snake';
}
export declare const DEFAULT_OPTIONS: Required<ConversionOptions>;
export declare enum ConversionDirection {
    JsonSchemaToGraphQL = "json-schema-to-graphql",
    GraphQLToJsonSchema = "graphql-to-json-schema"
}
export declare class ConversionError extends Error {
    code?: string;
    errors?: ValidationError[];
    constructor(message: string, errors?: ValidationError[], code?: string);
}
export interface ValidationError {
    message: string;
    path?: string;
    code?: string;
}
export interface ValidationResult {
    valid: boolean;
    errors?: ValidationError[];
}
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
export type GraphQLTypeKind = 'OBJECT' | 'INTERFACE' | 'UNION' | 'ENUM' | 'INPUT_OBJECT' | 'SCALAR';
export interface GraphQLDirective {
    name: string;
    arguments?: Record<string, string | number | boolean | string[] | number[] | string[][]>;
}
export interface GraphQLArgument {
    name: string;
    type: string;
    default?: unknown;
    description?: string;
}
export interface GraphQLEnumValue {
    name: string;
    description?: string;
    deprecationReason?: string;
}
export interface GraphQLField {
    name: string;
    type: string;
    description?: string;
    arguments?: GraphQLArgument[];
    directives?: GraphQLDirective[];
    deprecationReason?: string;
}
export interface GraphQLTypeDefinition {
    name: string;
    kind: GraphQLTypeKind;
    description?: string;
    implements?: string[];
    fields?: GraphQLField[];
    values?: GraphQLEnumValue[];
    types?: string[];
    directives?: GraphQLDirective[];
}
export type JsonSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';
export interface JsonSchemaProperty extends JsonSchema {
}
export interface JsonSchema {
    $schema?: string;
    $id?: string;
    title?: string;
    description?: string;
    type?: JsonSchemaType | JsonSchemaType[];
    properties?: {
        [key: string]: JsonSchemaProperty;
    };
    required?: string[];
    definitions?: {
        [key: string]: JsonSchema;
    };
    $defs?: {
        [key: string]: JsonSchema;
    };
    allOf?: JsonSchema[];
    anyOf?: JsonSchema[];
    oneOf?: JsonSchema[];
    enum?: unknown[];
    items?: JsonSchemaProperty | JsonSchemaProperty[];
    default?: unknown;
    deprecated?: boolean;
    format?: string;
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
    'x-graphql-federation-keys'?: Array<{
        fields: string;
        resolvable?: boolean;
    }>;
    'x-graphql-federation-external'?: boolean;
    'x-graphql-federation-requires'?: string;
    'x-graphql-federation-provides'?: string;
    'x-graphql-federation-shareable'?: boolean;
    'x-graphql-federation-authenticated'?: boolean;
    'x-graphql-federation-requires-scopes'?: string[][];
    [key: string]: unknown;
}
//# sourceMappingURL=types.d.ts.map