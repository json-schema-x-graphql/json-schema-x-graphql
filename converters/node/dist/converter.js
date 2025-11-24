import { convertJsonToGraphql } from './json-to-graphql.js';
import { convertGraphqlToJson } from './graphql-to-json.js';
import { DEFAULT_OPTIONS, ConversionError } from './types.js';
import { LRUCache } from './cache.js';
let rustConverter;
import('../../rust/pkg/json_schema_graphql_converter.js')
    .then((module) => {
    rustConverter = new module.WasmConverter();
})
    .catch((err) => {
    console.error('Could not load Rust WASM converter, falling back to JS. Error:', err);
});
export class Converter {
    options;
    cache;
    constructor(options = {}, cacheSize = 0) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        if (cacheSize > 0) {
            this.cache = new LRUCache(cacheSize);
        }
    }
    async jsonSchemaToGraphQL(jsonSchema) {
        const schemaString = typeof jsonSchema === 'string' ? jsonSchema : JSON.stringify(jsonSchema);
        const cacheKey = `json2gql::${schemaString}`;
        if (this.cache?.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        if (rustConverter) {
            try {
                const result = rustConverter.jsonSchemaToGraphQL(schemaString);
                if (this.cache) {
                    this.cache.set(cacheKey, result);
                }
                return result;
            }
            catch (e) {
                console.error('Rust converter failed, falling back to JS implementation.', e);
            }
        }
        try {
            const schemaObject = JSON.parse(schemaString);
            const result = await convertJsonToGraphql(schemaObject, this.options);
            if (this.cache) {
                this.cache.set(cacheKey, result);
            }
            return result;
        }
        catch (error) {
            if (error instanceof ConversionError) {
                throw error;
            }
            throw new ConversionError(error instanceof Error ? error.message : 'Unknown error', undefined, 'CONVERSION_FAILED');
        }
    }
    graphqlToJsonSchema(graphqlSdl) {
        const cacheKey = `gql2json::${graphqlSdl}`;
        if (this.cache?.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        try {
            const schemaObject = convertGraphqlToJson(graphqlSdl, this.options);
            const result = JSON.stringify(schemaObject, null, 2);
            if (this.cache) {
                this.cache.set(cacheKey, result);
            }
            return result;
        }
        catch (error) {
            if (error instanceof ConversionError) {
                throw error;
            }
            throw new ConversionError(error instanceof Error ? error.message : 'Unknown error', undefined, 'CONVERSION_FAILED');
        }
    }
}
const defaultConverter = new Converter();
export async function jsonSchemaToGraphQL(jsonSchema, options) {
    if (options) {
        return new Converter(options).jsonSchemaToGraphQL(jsonSchema);
    }
    return defaultConverter.jsonSchemaToGraphQL(jsonSchema);
}
export function graphqlToJsonSchema(graphqlSdl, options) {
    if (options) {
        return new Converter(options).graphqlToJsonSchema(graphqlSdl);
    }
    return defaultConverter.graphqlToJsonSchema(graphqlSdl);
}
//# sourceMappingURL=converter.js.map