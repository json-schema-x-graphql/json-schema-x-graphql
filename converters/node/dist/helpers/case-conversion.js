export function camelToSnake(str) {
    return str
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
        .toLowerCase();
}
export function snakeToCamel(str) {
    return str.replace(/_([a-zA-Z0-9])/g, (_match, char) => char.toUpperCase());
}
export function convertObjectKeys(obj, converter) {
    if (Array.isArray(obj)) {
        return obj.map((item) => convertObjectKeys(item, converter));
    }
    if (obj !== null && typeof obj === 'object') {
        return Object.fromEntries(Object.entries(obj).map(([key, value]) => [
            converter(key),
            convertObjectKeys(value, converter),
        ]));
    }
    return obj;
}
export function convertGraphQLFields(sdl, converter) {
    return sdl.replace(/(\s*)([a-zA-Z][a-zA-Z0-9_]*)\s*:/g, (_match, whitespace, field) => `${whitespace}${converter(field)}:`);
}
//# sourceMappingURL=case-conversion.js.map