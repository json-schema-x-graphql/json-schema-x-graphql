import { ConversionOptions, JsonSchema } from './types.js';
export declare class Converter {
    private options;
    private cache?;
    constructor(options?: ConversionOptions, cacheSize?: number);
    jsonSchemaToGraphQL(jsonSchema: JsonSchema | string): Promise<string>;
    graphqlToJsonSchema(graphqlSdl: string): string;
}
export declare function jsonSchemaToGraphQL(jsonSchema: JsonSchema | string, options?: ConversionOptions): Promise<string>;
export declare function graphqlToJsonSchema(graphqlSdl: string, options?: ConversionOptions): string;
//# sourceMappingURL=converter.d.ts.map