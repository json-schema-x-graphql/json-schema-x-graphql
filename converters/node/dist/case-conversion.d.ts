/**
 * Case conversion utilities for flexible field name handling
 */
/**
 * Convert camelCase or PascalCase to snake_case
 */
export declare function camelToSnake(str: string): string;
/**
 * Convert snake_case to camelCase
 */
export declare function snakeToCamel(str: string): string;
/**
 * Recursively convert object keys using a converter function
 */
export declare function convertObjectKeys(obj: any, converter: (key: string) => string): any;
/**
 * Convert GraphQL field names in SDL string using a converter
 */
export declare function convertGraphQLFields(
  sdl: string,
  converter: (field: string) => string,
): string;
