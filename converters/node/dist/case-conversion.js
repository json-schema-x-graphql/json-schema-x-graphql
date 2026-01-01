/**
 * Case conversion utilities for flexible field name handling
 */
/**
 * Convert camelCase or PascalCase to snake_case
 */
export function camelToSnake(str) {
    return str
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
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
    }
    else if (obj !== null && typeof obj === 'object') {
        return Object.fromEntries(Object.entries(obj).map(([key, value]) => [
            converter(key),
            convertObjectKeys(value, converter),
        ]));
    }
    return obj;
}
/**
 * Convert GraphQL field names in SDL string using a converter
 */
export function convertGraphQLFields(sdl, converter) {
    return sdl.replace(/(\s*)([a-zA-Z][a-zA-Z0-9_]*)\s*:/g, (match, ws, field) => `${ws}${converter(field)}:`);
}
//# sourceMappingURL=case-conversion.js.map