/**
 * X-GraphQL Extensions Handler
 *
 * This module provides utilities for extracting and applying x-graphql-* extensions
 * from JSON Schema to GraphQL SDL generation. It handles all x-graphql attributes
 * including P0 features: skip, nullable, description, and core type/field mapping.
 */
/**
 * Extracts all x-graphql-* extensions from a JSON Schema object
 */
export function extractExtensions(schema) {
    const extensions = {};
    for (const [key, value] of Object.entries(schema)) {
        if (!key.startsWith("x-graphql-")) {
            continue;
        }
        const extensionKey = key.substring(10); // Remove 'x-graphql-' prefix
        switch (extensionKey) {
            // Type-level
            case "type-name":
                extensions.typeName = value;
                break;
            case "type-kind":
                extensions.typeKind = value;
                break;
            case "input":
                if (value === true) {
                    extensions.typeKind = "INPUT_OBJECT";
                }
                break;
            case "implements":
            case "type-implements":
                extensions.implements = Array.isArray(value)
                    ? value
                    : [value];
                break;
            case "union-types":
                extensions.unionTypes = Array.isArray(value)
                    ? value
                    : [value];
                break;
            case "union":
                if (typeof value === "object" && value !== null) {
                    const u = value;
                    if (u.types) {
                        extensions.unionTypes = Array.isArray(u.types)
                            ? u.types
                            : [u.types];
                    }
                }
                break;
            case "type-directives":
            case "directives":
                extensions.typeDirectives =
                    value;
                break;
            // Field-level
            case "field-name":
                extensions.fieldName = value;
                break;
            case "field-type":
                extensions.fieldType = value;
                break;
            case "field-non-null":
                extensions.fieldNonNull = value;
                break;
            case "field-list-item-non-null":
                extensions.fieldListItemNonNull = value;
                break;
            case "field-directives":
                extensions.fieldDirectives =
                    value;
                break;
            case "field-arguments":
            case "arguments":
                extensions.fieldArguments = value;
                break;
            // P0 Features
            case "skip":
                extensions.skip = value;
                break;
            case "nullable":
                extensions.nullable = value;
                break;
            case "description":
                extensions.description = value;
                break;
            // Federation
            case "federation-keys":
            case "federation-key":
                extensions.federationKeys = value;
                break;
            case "federation":
                if (typeof value === "object" && value !== null) {
                    const fed = value;
                    if (fed.keys)
                        extensions.federationKeys = fed.keys;
                    if (fed.shareable)
                        extensions.federationShareable = fed.shareable;
                    if (fed.inaccessible)
                        extensions.federationInaccessible = fed.inaccessible;
                    if (fed.authenticated) {
                        // Add to directives if not handled by interface properties
                        const directives = extensions.typeDirectives || [];
                        if (Array.isArray(directives)) {
                            if (!directives.some((d) => typeof d === "string"
                                ? d.includes("authenticated")
                                : d.name === "authenticated")) {
                                // @ts-ignore
                                directives.push({ name: "authenticated" });
                                extensions.typeDirectives = directives;
                            }
                        }
                    }
                }
                else if (value === true) {
                    // Legacy check or simple verify
                }
                break;
            case "federation-shareable":
                extensions.federationShareable = value;
                break;
            case "federation-requires":
                extensions.federationRequires = value;
                break;
            case "federation-provides":
                extensions.federationProvides = value;
                break;
            case "federation-external":
                extensions.federationExternal = value;
                break;
            case "federation-override-from":
            case "federation-override":
                extensions.federationOverrideFrom = value;
                break;
            case "federation-inaccessible":
                extensions.federationInaccessible = value;
                break;
            case "federation-tag":
                extensions.federationTag = value;
                break;
            // Metadata
            case "scalar":
                extensions.scalar = value;
                break;
            case "enum-values":
            case "enum":
                extensions.enumValues = value;
                break;
            case "default":
            case "default-value":
                extensions.defaultValue = value;
                break;
            case "deprecated":
                extensions.deprecated = value;
                break;
            // Operations
            case "operations":
                extensions.operations = value;
                break;
            // Custom scalars
            case "scalars":
                extensions.scalars = value;
                break;
            // Also check for legacy x-graphql-type (could be string or object)
            case "type":
                if (typeof value === "string") {
                    extensions.fieldType = value;
                }
                else if (typeof value === "object" && value !== null) {
                    const typeObj = value;
                    if (typeObj.name) {
                        extensions.typeName = typeObj.name;
                    }
                }
                break;
        }
    }
    return extensions;
}
/**
 * Check if a field or type should be skipped from GraphQL generation
 */
export function shouldSkip(extensions) {
    return extensions.skip === true;
}
/**
 * Get the effective description for a field or type.
 * Priority: x-graphql-description > description (JSON Schema)
 */
export function getEffectiveDescription(extensions, fallbackDescription) {
    // x-graphql-description takes precedence
    if (extensions.description !== undefined && extensions.description !== "") {
        // Trim whitespace-only descriptions
        const trimmed = extensions.description.trim();
        return trimmed || undefined;
    }
    // Fall back to JSON Schema description
    if (fallbackDescription !== undefined && fallbackDescription !== "") {
        const trimmed = fallbackDescription.trim();
        return trimmed || undefined;
    }
    return undefined;
}
/**
 * Determine if a field should be nullable.
 * Priority: x-graphql-nullable > x-graphql-field-non-null > required array
 */
export function isFieldNullable(extensions, isRequired) {
    // x-graphql-nullable explicitly overrides everything
    if (extensions.nullable !== undefined) {
        return extensions.nullable;
    }
    // x-graphql-field-non-null explicitly sets non-null
    if (extensions.fieldNonNull !== undefined) {
        return !extensions.fieldNonNull;
    }
    // Default: nullable if not required, non-null if required
    return !isRequired;
}
/**
 * Get the effective field name
 * Priority: x-graphql-field-name > property name (camelCased)
 */
export function getEffectiveFieldName(extensions, propertyName) {
    return extensions.fieldName || propertyName;
}
/**
 * Get the effective type name
 * Priority: x-graphql-type-name > title > definition key
 */
export function getEffectiveTypeName(extensions, fallbackName) {
    return extensions.typeName || fallbackName;
}
/**
 * Format a GraphQL description as a block or single-line comment
 */
export function formatDescription(description, indent = "") {
    if (!description) {
        return "";
    }
    const lines = description.split("\n");
    // Single line description
    if (lines.length === 1 && description.length < 80) {
        return `${indent}"""${description}"""\n`;
    }
    // Multi-line description
    return `"""\n${lines.map((line) => `${indent}${line}`).join("\n")}\n${indent}"""\n`;
}
/**
 * Parse federation keys into a normalized array format
 */
export function parseFederationKeys(keys) {
    if (!keys) {
        return [];
    }
    if (Array.isArray(keys)) {
        return keys;
    }
    // Single string: could be space-separated fields
    return keys.split(/\s+/).filter((k) => k.length > 0);
}
/**
 * Build a federation directive string
 */
export function buildFederationDirective(directiveName, args) {
    if (!args || Object.keys(args).length === 0) {
        return `@${directiveName}`;
    }
    const argStrings = Object.entries(args).map(([key, value]) => {
        if (typeof value === "string") {
            return `${key}: "${value}"`;
        }
        if (Array.isArray(value)) {
            const items = value.map((v) => `"${v}"`).join(", ");
            return `${key}: [${items}]`;
        }
        return `${key}: ${JSON.stringify(value)}`;
    });
    return `@${directiveName}(${argStrings.join(", ")})`;
}
/**
 * Generate federation directives for a type
 */
export function generateTypeFederationDirectives(extensions) {
    const directives = [];
    // @key directive
    if (extensions.federationKeys) {
        const keys = parseFederationKeys(extensions.federationKeys);
        for (const keyFields of keys) {
            directives.push(buildFederationDirective("key", { fields: keyFields }));
        }
    }
    // @shareable directive
    if (extensions.federationShareable) {
        directives.push("@shareable");
    }
    // @inaccessible directive
    if (extensions.federationInaccessible) {
        directives.push("@inaccessible");
    }
    // @tag directive
    if (extensions.federationTag) {
        directives.push(buildFederationDirective("tag", { name: extensions.federationTag }));
    }
    return directives;
}
/**
 * Generate federation directives for a field
 */
export function generateFieldFederationDirectives(extensions) {
    const directives = [];
    // @external directive
    if (extensions.federationExternal) {
        directives.push("@external");
    }
    // @requires directive
    if (extensions.federationRequires) {
        const fields = Array.isArray(extensions.federationRequires)
            ? extensions.federationRequires.join(" ")
            : extensions.federationRequires;
        directives.push(buildFederationDirective("requires", { fields }));
    }
    // @provides directive
    if (extensions.federationProvides) {
        const fields = Array.isArray(extensions.federationProvides)
            ? extensions.federationProvides.join(" ")
            : extensions.federationProvides;
        directives.push(buildFederationDirective("provides", { fields }));
    }
    // @override directive
    if (extensions.federationOverrideFrom) {
        directives.push(buildFederationDirective("override", {
            from: extensions.federationOverrideFrom,
        }));
    }
    // @shareable directive (can be on fields too)
    if (extensions.federationShareable) {
        directives.push("@shareable");
    }
    return directives;
}
/**
 * Merge multiple extension objects (for allOf, anyOf, oneOf scenarios)
 */
export function mergeExtensions(...extensionsList) {
    const merged = {};
    const allImplements = [];
    const allUnionTypes = [];
    for (const extensions of extensionsList) {
        // Collect arrays first before overwriting
        if (extensions.implements) {
            allImplements.push(...extensions.implements);
        }
        if (extensions.unionTypes) {
            allUnionTypes.push(...extensions.unionTypes);
        }
        // Simple overwrite for most properties
        Object.assign(merged, extensions);
    }
    // Set concatenated and deduplicated arrays
    if (allImplements.length > 0) {
        merged.implements = [...new Set(allImplements)];
    }
    if (allUnionTypes.length > 0) {
        merged.unionTypes = [...new Set(allUnionTypes)];
    }
    return merged;
}
//# sourceMappingURL=x-graphql-extensions.js.map