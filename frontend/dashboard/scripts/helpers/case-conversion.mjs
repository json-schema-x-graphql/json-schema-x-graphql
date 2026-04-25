// Case conversion utilities for Schema Unification Forest schemas
// camelToSnake, snakeToCamel, convertObjectKeys, convertGraphQLFields

/**
 * Convert CamelCase or camelCase to snake_case
 */
export function camelToSnake(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

/**
 * Convert snake_case to camelCase
 */
export function snakeToCamel(str) {
  return str.replace(/_([a-zA-Z0-9])/g, (_, c) => c.toUpperCase());
}

/**
 * Recursively convert object keys using a converter function
 */
export function convertObjectKeys(obj, converter) {
  if (Array.isArray(obj)) {
    return obj.map((item) => convertObjectKeys(item, converter));
  } else if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        converter(key),
        convertObjectKeys(value, converter),
      ]),
    );
  }
  return obj;
}

/**
 * Convert GraphQL field names in SDL string using a converter
 * Only converts field names, not type names
 */
export function convertGraphQLFields(sdl, converter) {
  // This is a simple regex-based approach; for robust conversion, use a GraphQL parser
  return sdl.replace(
    /(\s*)([a-zA-Z][a-zA-Z0-9_]*)\s*:/g,
    (match, ws, field) => `${ws}${converter(field)}:`,
  );
}
