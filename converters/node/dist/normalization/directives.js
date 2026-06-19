export function extractDirectives(schema, options) {
    const directives = [];
    const includeFederation = (options?.includeFederationDirectives ?? true) &&
        options?.federationVersion !== "NONE";
    // 1. Process explicit x-graphql-directives
    if (Array.isArray(schema["x-graphql-directives"])) {
        for (const dir of schema["x-graphql-directives"]) {
            if (typeof dir === "string") {
                const match = dir.match(/@(\w+)/);
                if (match) {
                    const name = match[1];
                    if (!includeFederation && isFederationDirective(name))
                        continue;
                    directives.push({ name, raw: dir });
                }
                continue;
            }
            if (!dir?.name)
                continue;
            if (!includeFederation && isFederationDirective(dir.name))
                continue;
            directives.push({ name: dir.name, args: dir.arguments });
        }
    }
    // 2. Process x-graphql-federation-* shortcuts
    if (includeFederation) {
        if (schema["x-graphql-federation-shareable"]) {
            directives.push({ name: "shareable" });
        }
        if (schema["x-graphql-federation-inaccessible"]) {
            directives.push({ name: "inaccessible" });
        }
        if (schema["x-graphql-federation-authenticated"]) {
            directives.push({ name: "authenticated" });
        }
        if (schema["x-graphql-federation-interface-object"]) {
            directives.push({ name: "interfaceObject" });
        }
        if (schema["x-graphql-federation-requires-scopes"]) {
            directives.push({
                name: "requiresScopes",
                args: { scopes: schema["x-graphql-federation-requires-scopes"] },
            });
        }
        if (schema["x-graphql-federation-policy"]) {
            directives.push({
                name: "policy",
                args: { policies: schema["x-graphql-federation-policy"] },
            });
        }
        // Only process federation-keys if it's an array (matching Rust behavior)
        if (Array.isArray(schema["x-graphql-federation-keys"])) {
            // Collect all keys into a single directive
            const keyFields = [];
            const keyConfigs = [];
            for (const key of schema["x-graphql-federation-keys"]) {
                if (typeof key === "string") {
                    keyFields.push(key);
                }
                else if (key && typeof key === "object" && key.fields) {
                    keyConfigs.push({
                        fields: key.fields,
                        resolvable: key.resolvable,
                    });
                }
            }
            // If we have string keys, combine them into a single directive
            if (keyFields.length > 0) {
                directives.push({
                    name: "key",
                    args: { fields: keyFields.join(" ") },
                });
            }
            // Add any object-format key configs as separate directives
            for (const config of keyConfigs) {
                directives.push({
                    name: "key",
                    args: {
                        fields: config.fields,
                        ...(config.resolvable !== undefined && {
                            resolvable: config.resolvable,
                        }),
                    },
                });
            }
        }
        if (schema["x-graphql-federation-requires"]) {
            directives.push({
                name: "requires",
                args: { fields: schema["x-graphql-federation-requires"] },
            });
        }
        if (schema["x-graphql-federation-provides"]) {
            directives.push({
                name: "provides",
                args: { fields: schema["x-graphql-federation-provides"] },
            });
        }
        if (schema["x-graphql-federation-external"]) {
            directives.push({ name: "external" });
        }
        if (schema["x-graphql-federation-extends"]) {
            directives.push({ name: "extends" });
        }
        if (schema["x-graphql-federation-override-from"]) {
            directives.push({
                name: "override",
                args: { from: schema["x-graphql-federation-override-from"] },
            });
        }
    }
    // 3. Process x-graphql-viaduct-* extensions
    if (schema["x-graphql-viaduct-resolver"] !== undefined) {
        directives.push({
            name: "resolver",
            args: typeof schema["x-graphql-viaduct-resolver"] === "object"
                ? schema["x-graphql-viaduct-resolver"]
                : undefined,
        });
    }
    if (schema["x-graphql-viaduct-backing-data"] !== undefined) {
        directives.push({
            name: "backingData",
            args: typeof schema["x-graphql-viaduct-backing-data"] === "object"
                ? schema["x-graphql-viaduct-backing-data"]
                : undefined,
        });
    }
    if (schema["x-graphql-viaduct-id-of"] !== undefined) {
        directives.push({
            name: "idOf",
            args: typeof schema["x-graphql-viaduct-id-of"] === "object"
                ? schema["x-graphql-viaduct-id-of"]
                : undefined,
        });
    }
    return directives;
}
export function printDirectives(directives) {
    if (directives.length === 0) {
        return "";
    }
    const parts = directives.map((dir) => {
        if (dir.raw)
            return dir.raw;
        if (!dir.name)
            return "";
        const args = dir.args && Object.keys(dir.args).length > 0
            ? `(${formatDirectiveArgs(dir.args)})`
            : "";
        return `@${dir.name}${args}`;
    });
    return parts
        .filter(Boolean)
        .map((p) => " " + p)
        .join("");
}
function formatDirectiveArgs(args) {
    return Object.entries(args)
        .map(([key, value]) => {
        // Handle array of scopes/policies specially (from existing logic)
        if ((key === "scopes" || key === "policies") && Array.isArray(value)) {
            return `${key}: [${value
                .map((v) => `[${(Array.isArray(v) ? v : [v]).map((s) => `"${s}"`).join(", ")}]`)
                .join(", ")}]`;
        }
        return `${key}: ${JSON.stringify(value)}`;
    })
        .join(", ");
}
function isFederationDirective(name) {
    const federationDirectives = new Set([
        "key",
        "shareable",
        "inaccessible",
        "override",
        "external",
        "provides",
        "requires",
        "tag",
        "extends",
        "authenticated",
        "requiresScopes",
        "policy",
        "interfaceObject",
    ]);
    return federationDirectives.has(name);
}
export function normalizeFederationExtensions(schema, warnedState = { warned: false }) {
    if (!schema || typeof schema !== "object") {
        return schema;
    }
    // Handle arrays recursively
    if (Array.isArray(schema)) {
        return schema.map((item) => normalizeFederationExtensions(item, warnedState));
    }
    const flat = { ...schema };
    if (schema["x-graphql-federation"] &&
        typeof schema["x-graphql-federation"] === "object") {
        const nested = schema["x-graphql-federation"];
        if (!warnedState.warned) {
            console.warn("The nested `x-graphql-federation` object format is deprecated and will be removed in v2.0. " +
                "Please migrate to the flat `x-graphql-federation-*` format. " +
                "See: https://github.com/json-schema-x-graphql/json-schema-x-graphql/blob/main/docs/adr/0013-federation-extension-format-recommendation.md");
            warnedState.warned = true;
        }
        if (nested.keys) {
            if (Array.isArray(nested.keys)) {
                flat["x-graphql-federation-keys"] = nested.keys.map((k) => {
                    if (typeof k === "string")
                        return k;
                    if (k && typeof k === "object" && k.fields) {
                        if (k.resolvable !== undefined) {
                            return { fields: k.fields, resolvable: k.resolvable };
                        }
                        return k.fields;
                    }
                    return k;
                });
            }
            else if (typeof nested.keys === "string") {
                flat["x-graphql-federation-keys"] = nested.keys;
            }
        }
        if (nested.external !== undefined)
            flat["x-graphql-federation-external"] = !!nested.external;
        if (nested.provides !== undefined)
            flat["x-graphql-federation-provides"] = nested.provides;
        if (nested.requires !== undefined)
            flat["x-graphql-federation-requires"] = nested.requires;
        if (nested.shareable !== undefined)
            flat["x-graphql-federation-shareable"] = !!nested.shareable;
        if (nested.inaccessible !== undefined)
            flat["x-graphql-federation-inaccessible"] = !!nested.inaccessible;
        if (nested.authenticated !== undefined)
            flat["x-graphql-federation-authenticated"] = !!nested.authenticated;
        if (nested.interfaceObject !== undefined)
            flat["x-graphql-federation-interface-object"] = !!nested.interfaceObject;
        if (nested.requiresScopes !== undefined)
            flat["x-graphql-federation-requires-scopes"] = nested.requiresScopes;
        if (nested.policy !== undefined)
            flat["x-graphql-federation-policy"] = nested.policy;
        if (nested.tags !== undefined)
            flat["x-graphql-federation-tags"] = nested.tags;
        if (nested.override && typeof nested.override === "object") {
            if (nested.override.from !== undefined) {
                flat["x-graphql-federation-override-from"] = nested.override.from;
            }
        }
        if (nested.extends !== undefined)
            flat["x-graphql-federation-extends"] = !!nested.extends;
        delete flat["x-graphql-federation"];
    }
    // Recursively normalize all properties/definitions/etc.
    for (const key of Object.keys(flat)) {
        if (key === "$defs" ||
            key === "definitions" ||
            key === "properties" ||
            key === "allOf" ||
            key === "anyOf" ||
            key === "oneOf" ||
            key === "items") {
            flat[key] = normalizeFederationExtensions(flat[key], warnedState);
        }
        else if (flat[key] && typeof flat[key] === "object") {
            if (key !== "enum" &&
                key !== "required" &&
                !key.startsWith("x-graphql-federation")) {
                flat[key] = normalizeFederationExtensions(flat[key], warnedState);
            }
        }
    }
    return flat;
}
//# sourceMappingURL=directives.js.map
