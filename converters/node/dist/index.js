export { Converter, jsonSchemaToGraphQL, graphqlToJsonSchema } from './converter.js';
export { ConversionDirection, ConversionError, DEFAULT_OPTIONS } from './types.js';
export { Validator } from './validator.js';
export { LRUCache } from './cache.js';
export const VERSION = '0.1.0';
export async function createConverter(options, cacheSize) {
    const { Converter } = await import('./converter.js');
    return new Converter(options, cacheSize);
}
export async function quickJsonToGraphQL(jsonSchema, options) {
    const { jsonSchemaToGraphQL } = await import('./converter.js');
    return jsonSchemaToGraphQL(jsonSchema, options);
}
export async function quickGraphQLToJson(graphqlSdl, options) {
    const { graphqlToJsonSchema } = await import('./converter.js');
    return graphqlToJsonSchema(graphqlSdl, options);
}
export async function validateJsonSchema(schema) {
    const { Validator } = await import('./validator.js');
    const validator = new Validator();
    return validator.validateJsonSchema(schema);
}
export async function validateGraphQLSdl(sdl) {
    const { Validator } = await import('./validator.js');
    const validator = new Validator();
    return validator.validateGraphQLSdl(sdl);
}
export async function validateGraphQLName(name) {
    const { Validator } = await import('./validator.js');
    const validator = new Validator();
    return validator.validateGraphQLName(name);
}
export async function convertJsonToSdl(jsonSchema, options) {
    const startTime = Date.now();
    try {
        const { jsonSchemaToGraphQL } = await import('./converter.js');
        const sdl = await jsonSchemaToGraphQL(jsonSchema, options);
        const typeMatches = sdl.match(/^(type|interface|enum|union|input|scalar)\s+\w+/gm) || [];
        const fieldMatches = sdl.match(/^\s+\w+.*:/gm) || [];
        return {
            success: true,
            sdl,
            statistics: {
                typesConverted: typeMatches.length,
                fieldsConverted: fieldMatches.length,
                conversionTimeMs: Date.now() - startTime,
            },
        };
    }
    catch (error) {
        const conversionError = error;
        return {
            success: false,
            errors: conversionError.errors || [
                {
                    message: conversionError.message || 'Unknown conversion error',
                    code: conversionError.code || 'CONVERSION_FAILED',
                },
            ],
            statistics: {
                typesConverted: 0,
                fieldsConverted: 0,
                conversionTimeMs: Date.now() - startTime,
            },
        };
    }
}
export async function convertSdlToJson(graphqlSdl, options) {
    const startTime = Date.now();
    try {
        const { graphqlToJsonSchema } = await import('./converter.js');
        const schemaString = graphqlToJsonSchema(graphqlSdl, options);
        const schema = JSON.parse(schemaString);
        const defs = schema.$defs || schema.definitions || {};
        const typesConverted = Object.keys(defs).length + (schema['x-graphql-type-name'] ? 1 : 0);
        let fieldsConverted = 0;
        Object.values(defs).forEach((def) => {
            if (def.properties) {
                fieldsConverted += Object.keys(def.properties).length;
            }
        });
        if (schema.properties) {
            fieldsConverted += Object.keys(schema.properties).length;
        }
        return {
            success: true,
            schema,
            statistics: {
                typesConverted,
                fieldsConverted,
                conversionTimeMs: Date.now() - startTime,
            },
        };
    }
    catch (error) {
        const conversionError = error;
        return {
            success: false,
            errors: conversionError.errors || [
                {
                    message: conversionError.message || 'Unknown conversion error',
                    code: conversionError.code || 'CONVERSION_FAILED',
                },
            ],
            statistics: {
                typesConverted: 0,
                fieldsConverted: 0,
                conversionTimeMs: Date.now() - startTime,
            },
        };
    }
}
//# sourceMappingURL=index.js.map