// Case conversion utilities
// camelToSnake, snakeToCamel, convertObjectKeys, convertGraphQLFields

/**
 * Converts a string from CamelCase or camelCase to snake_case.
 * @param str The input string.
 * @returns The snake_cased string.
 */
export function camelToSnake(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * Converts a string from snake_case to camelCase.
 * @param str The input string.
 * @returns The camelCased string.
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-zA-Z0-9])/g, (_match, char) => char.toUpperCase());
}

type KeyConverter = (key: string) => string;

/**
 * Recursively converts the keys of an object using a provided converter function.
 * @param obj The object or array to process.
 * @param converter The function to apply to each key.
 * @returns A new object or array with the converted keys.
 */
export function convertObjectKeys(obj: unknown, converter: KeyConverter): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => convertObjectKeys(item, converter));
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        converter(key),
        convertObjectKeys(value, converter),
      ])
    );
  }
  return obj;
}

/**
 * Converts GraphQL field names within an SDL string using a converter function.
 * Note: This is a simple regex-based approach and may not cover all edge cases.
 * For robust conversion, a full GraphQL parser is recommended.
 * @param sdl The GraphQL SDL string.
 * @param converter The function to apply to each field name.
 * @returns The SDL string with converted field names.
 */
export function convertGraphQLFields(sdl: string, converter: KeyConverter): string {
  return sdl.replace(
    /(\s*)([a-zA-Z][a-zA-Z0-9_]*)\s*:/g,
    (_match, whitespace, field) => `${whitespace}${converter(field)}:`
  );
}
