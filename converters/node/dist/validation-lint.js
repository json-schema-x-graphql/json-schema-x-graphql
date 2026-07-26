/**
 * X-GraphQL attribute linting.
 *
 * Detects deprecated attributes, missing type names,
 * and naming convention violations.
 */
const DEPRECATED_ATTRIBUTES = {
    "x-fpds-source": "x-graphql-source-reference",
    "x-fpds-mapping-type": "x-graphql-source-mapping-type",
    "x-mapping-notes": "x-graphql-mapping-notes",
    "x-source-table": "x-graphql-source-table",
    "x-source-field-name": "x-graphql-source-field-name",
    "x-update-note": "x-graphql-update-note",
    "x-sensitive": "x-graphql-sensitive-data",
    "x-cost": "x-graphql-query-cost",
    "x-complexity": "x-graphql-query-complexity",
};
const ALLOWED_NON_GRAPHQL = new Set([
    "x-request-id",
    "x-correlation-id",
    "x-trace-id",
    "x-original-type",
    "x-schema-version",
    "x-last-updated",
    "x-source-path",
]);
/** Lint a JSON Schema value for x-graphql attribute issues. */
export function lintSchema(schema) {
    const issues = [];
    lintValue(schema, "$", issues);
    return issues;
}
function lintValue(value, path, issues) {
    if (!value || typeof value !== "object")
        return;
    if (Array.isArray(value)) {
        value.forEach((v, i) => {
            lintValue(v, `${path}[${i}]`, issues);
        });
        return;
    }
    const obj = value;
    // Deprecated x-* attributes
    for (const [deprecated, replacement] of Object.entries(DEPRECATED_ATTRIBUTES)) {
        if (deprecated in obj) {
            issues.push({
                path: `${path}.${deprecated}`,
                message: `Deprecated attribute '${deprecated}' found. Use '${replacement}' instead.`,
                severity: "error",
                validator: "x-graphql-lint",
            });
        }
    }
    // Invalid x-* prefix detection
    for (const key of Object.keys(obj)) {
        if (key.startsWith("x-") &&
            !key.startsWith("x-graphql-") &&
            !key.startsWith("x-viaduct-") &&
            !ALLOWED_NON_GRAPHQL.has(key)) {
            issues.push({
                path: `${path}.${key}`,
                message: `Non-standard x-* attribute '${key}'. Consider using x-graphql-* namespace.`,
                severity: "warning",
                validator: "x-graphql-lint",
            });
        }
    }
    // Recurse
    for (const [k, v] of Object.entries(obj)) {
        const newPath = path === "$" ? `$.${k}` : `${path}.${k}`;
        lintValue(v, newPath, issues);
    }
}
/** Validate completeness of x-graphql annotations on definitions. */
export function lintDefinitionsCompleteness(schema) {
    const issues = [];
    const obj = schema;
    if (!obj || typeof obj !== "object")
        return issues;
    const defs = (obj["$defs"] ??
        obj["definitions"]);
    if (!defs)
        return issues;
    for (const [defName, defSchema] of Object.entries(defs)) {
        if (!defSchema || typeof defSchema !== "object")
            continue;
        const defObj = defSchema;
        // Skip scalar/enum-only definitions
        if (defObj["x-graphql-type-kind"] === "SCALAR")
            continue;
        if (defObj["x-graphql-enum"])
            continue;
        // Check for type-name
        const hasTypeName = "x-graphql-type-name" in defObj;
        const hasTitle = "title" in defObj;
        const isObject = defObj.type === "object";
        if (isObject && !hasTypeName && !hasTitle) {
            issues.push({
                path: `$.$defs.${defName}`,
                message: `Object definition '${defName}' missing x-graphql-type-name. Consider adding one for explicit type naming.`,
                severity: "warning",
                validator: "x-graphql-lint",
            });
        }
        // Federation key presence
        const federation = defObj["x-graphql-federation"];
        if (federation && "keys" in federation) {
            const hasFederationKeys = "x-graphql-federation-keys" in defObj ||
                "x-graphql-federation-key" in defObj;
            if (!hasFederationKeys) {
                // OK, keys are inside the federation object
            }
        }
        // Check type-name PascalCase
        const typeName = defObj["x-graphql-type-name"];
        if (typeName) {
            const firstChar = typeName[0];
            if (firstChar && firstChar !== firstChar.toUpperCase()) {
                issues.push({
                    path: `$.$defs.${defName}.x-graphql-type-name`,
                    message: `Type name '${typeName}' should use PascalCase (start with uppercase).`,
                    severity: "warning",
                    validator: "x-graphql-lint",
                });
            }
        }
        // Check field names in properties
        const properties = defObj["properties"];
        if (properties) {
            for (const [propName, propSchema] of Object.entries(properties)) {
                if (!propSchema || typeof propSchema !== "object")
                    continue;
                const propObj = propSchema;
                const fieldName = propObj["x-graphql-field-name"];
                if (fieldName && fieldName.includes("_")) {
                    issues.push({
                        path: `$.$defs.${defName}.properties.${propName}.x-graphql-field-name`,
                        message: `Field name '${fieldName}' uses snake_case. GraphQL fields should use camelCase.`,
                        severity: "warning",
                        validator: "x-graphql-lint",
                    });
                }
            }
        }
    }
    return issues;
}
/** Run all linting rules and return combined issues. */
export function lintAll(schema) {
    return [...lintSchema(schema), ...lintDefinitionsCompleteness(schema)];
}
//# sourceMappingURL=validation-lint.js.map