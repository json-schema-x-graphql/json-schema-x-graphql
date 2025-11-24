export { Converter, jsonSchemaToGraphQL, graphqlToJsonSchema } from './converter.js';
export { ConversionDirection, ConversionError, DEFAULT_OPTIONS } from './types.js';
export type { ConversionOptions, ConversionResult, ValidationResult, ValidationError, GraphQLTypeKind, GraphQLArgument, GraphQLDirective, GraphQLField, GraphQLEnumValue, GraphQLTypeDefinition, JsonSchemaType, JsonSchemaProperty, JsonSchema, } from './types.js';
export { Validator } from './validator.js';
export { LRUCache } from './cache.js';
export declare const VERSION = "0.1.0";
export declare function createConverter(options?: import('./types.js').ConversionOptions, cacheSize?: number): Promise<import("./converter.js").Converter>;
export declare function quickJsonToGraphQL(jsonSchema: string | import('./types.js').JsonSchema, options?: import('./types.js').ConversionOptions): Promise<string>;
export declare function quickGraphQLToJson(graphqlSdl: string, options?: import('./types.js').ConversionOptions): Promise<string>;
export declare function validateJsonSchema(schema: import('./types.js').JsonSchema): Promise<import('./types.js').ValidationResult>;
export declare function validateGraphQLSdl(sdl: string): Promise<import('./types.js').ValidationResult>;
export declare function validateGraphQLName(name: string): Promise<import('./types.js').ValidationResult>;
export declare function convertJsonToSdl(jsonSchema: string | import('./types.js').JsonSchema, options?: import('./types.js').ConversionOptions): Promise<{
    success: boolean;
    sdl?: string;
    errors?: Array<{
        message: string;
        code?: string;
    }>;
    statistics?: {
        typesConverted: number;
        fieldsConverted: number;
        conversionTimeMs: number;
    };
}>;
export declare function convertSdlToJson(graphqlSdl: string, options?: import('./types.js').ConversionOptions): Promise<{
    success: boolean;
    schema?: import('./types.js').JsonSchema;
    errors?: Array<{
        message: string;
        code?: string;
    }>;
    statistics?: {
        typesConverted: number;
        fieldsConverted: number;
        conversionTimeMs: number;
    };
}>;
//# sourceMappingURL=index.d.ts.map