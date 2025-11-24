import { convertJsonToGraphql } from './json-to-graphql.js';
import { convertGraphqlToJson } from './graphql-to-json.js';
import { ConversionOptions, JsonSchema, DEFAULT_OPTIONS, ConversionError } from './types.js';
import { LRUCache } from './cache.js';
import type { WasmConverter } from '../../rust/pkg/json_schema_graphql_converter.js';

let rustConverter: WasmConverter | undefined;
// Dynamically load the Rust WASM converter
import('../../rust/pkg/json_schema_graphql_converter.js')
  .then((module) => {
    rustConverter = new module.WasmConverter();
  })
  .catch((err) => {
    // Note: This error is logged during testing, which is expected if the wasm isn't built.
    console.error('Could not load Rust WASM converter, falling back to JS. Error:', err);
  });

/**
 * A class that encapsulates the conversion logic between JSON Schema and GraphQL SDL.
 * It can be instantiated with specific options and an optional cache.
 */
export class Converter {
  private options: Required<ConversionOptions>;
  private cache?: LRUCache<string, string>;

  /**
   * Creates a new converter instance.
   * @param options Optional conversion options to override defaults.
   * @param cacheSize The size of the LRU cache to use for memoizing conversions. Defaults to 0 (no cache).
   */
  constructor(options: ConversionOptions = {}, cacheSize = 0) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    if (cacheSize > 0) {
      this.cache = new LRUCache(cacheSize);
    }
  }

  /**
   * Converts a JSON Schema to GraphQL SDL.
   * @param jsonSchema The JSON Schema object or string.
   * @returns The GraphQL SDL string.
   */
  public async jsonSchemaToGraphQL(jsonSchema: JsonSchema | string): Promise<string> {
    const schemaString = typeof jsonSchema === 'string' ? jsonSchema : JSON.stringify(jsonSchema);
    const cacheKey = `json2gql::${schemaString}`;
    if (this.cache?.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Prefer the Rust-based converter if it's available
    if (rustConverter) {
      try {
        const result = rustConverter.jsonSchemaToGraphQL(schemaString);
        if (this.cache) {
          this.cache.set(cacheKey, result);
        }
        return result;
      } catch (e) {
        console.error('Rust converter failed, falling back to JS implementation.', e);
      }
    }

    // Fallback to the pure JavaScript implementation
    try {
      const schemaObject = JSON.parse(schemaString);
      const result = await convertJsonToGraphql(schemaObject, this.options);
      if (this.cache) {
        this.cache.set(cacheKey, result);
      }
      return result;
    } catch (error) {
      if (error instanceof ConversionError) {
        throw error;
      }
      throw new ConversionError(
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        'CONVERSION_FAILED'
      );
    }
  }

  /**
   * Converts a GraphQL SDL string to a JSON Schema object.
   * @param graphqlSdl The GraphQL SDL string.
   * @returns The JSON Schema object, pretty-printed as a string.
   */
  public graphqlToJsonSchema(graphqlSdl: string): string {
    const cacheKey = `gql2json::${graphqlSdl}`;
    if (this.cache?.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const schemaObject = convertGraphqlToJson(graphqlSdl, this.options);
      const result = JSON.stringify(schemaObject, null, 2);
      if (this.cache) {
        this.cache.set(cacheKey, result);
      }
      return result;
    } catch (error) {
      if (error instanceof ConversionError) {
        throw error;
      }
      throw new ConversionError(
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        'CONVERSION_FAILED'
      );
    }
  }
}

/**
 * A default converter instance for convenience.
 */
const defaultConverter = new Converter();

/**
 * Convenience function to convert JSON Schema to GraphQL SDL using default options.
 * @param jsonSchema The JSON Schema object or string.
 * @param options Optional conversion options to override defaults for this call.
 * @returns The GraphQL SDL string.
 */
export async function jsonSchemaToGraphQL(
  jsonSchema: JsonSchema | string,
  options?: ConversionOptions
): Promise<string> {
  if (options) {
    return new Converter(options).jsonSchemaToGraphQL(jsonSchema);
  }
  return defaultConverter.jsonSchemaToGraphQL(jsonSchema);
}

/**
 * Convenience function to convert GraphQL SDL to JSON Schema using default options.
 * @param graphqlSdl The GraphQL SDL string.
 * @param options Optional conversion options to override defaults for this call.
 * @returns The JSON Schema object, pretty-printed as a string.
 */
export function graphqlToJsonSchema(graphqlSdl: string, options?: ConversionOptions): string {
  if (options) {
    return new Converter(options).graphqlToJsonSchema(graphqlSdl);
  }
  return defaultConverter.graphqlToJsonSchema(graphqlSdl);
}
