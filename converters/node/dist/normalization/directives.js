export function extractDirectives(schema, options) {
    const directives = [];
    const includeFederation = (options?.includeFederationDirectives ?? true) &&
        options?.federationVersion !== "NONE";
    // 1. Process explicit x-graphql-directives
    if (Array.isArray(schema["x-graphql-directives"])) {
        for (const dir of schema["x-graphql-directives"]) {
            if (typeof dir === "string") {
                // Parse string directives like "@key(fields: \"id\")"
                // For now, we support raw strings by wrapping them in a special way or just parsing names
                // But to keep it structured, let's just support object style directives primarily.
                // If it's a string, we might need to parse it or just pass it through if the caller handles it.
                // However, this function returns GeneralizedDirective objects.
                // Let's assume for now mixed usage is rare or we can parse simple ones.
                const match = dir.match(/@(\w+)(?:\((.*)\))?/);
                if (match) {
                    const name = match[1];
                    if (!includeFederation && isFederationDirective(name))
                        continue;
                    // Todo: robust argument parsing for string directives
                    // For now, we might need to keep raw string support or just ignore complex string directives here
                    // This is a limitation of strictly structured internal representation.
                    // Let's defer string directives to a "raw" property or similar if needed.
                    directives.push({ name, args: {} }); // Placeholder for string parsing
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
        if (Array.isArray(schema["x-graphql-federation-keys"])) {
            for (const key of schema["x-graphql-federation-keys"]) {
                if (typeof key === "string") {
                    directives.push({ name: "key", args: { fields: key } });
                }
                else if (key && typeof key === "object" && key.fields) {
                    directives.push({
                        name: "key",
                        args: { fields: key.fields, resolvable: key.resolvable },
                    });
                }
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
        if (schema["x-graphql-federation-override-from"]) {
            directives.push({
                name: "override",
                args: { from: schema["x-graphql-federation-override-from"] },
            });
        }
    }
    return directives;
}
export function printDirectives(directives) {
    if (directives.length === 0) {
        return "";
    }
    const parts = directives.map((dir) => {
        if (!dir.name)
            return "";
        const args = dir.args && Object.keys(dir.args).length > 0
            ? `(${formatDirectiveArgs(dir.args)})`
            : "";
        return `@${dir.name}${args}`;
    });
    return parts.filter(Boolean).map(p => " " + p).join("");
}
function formatDirectiveArgs(args) {
    return Object.entries(args)
        .map(([key, value]) => {
        // Handle array of scopes specially (from existing logic)
        if (key === "scopes" && Array.isArray(value)) {
            return `${key}: [${value
                .map((v) => `[${(Array.isArray(v) ? v : [v])
                .map((s) => `"${s}"`)
                .join(", ")}]`)
                .join(", ")} ]`;
        }
        // Handle array of fields for @key
        if (key === "fields" && Array.isArray(value)) {
            // Wait, earlier logic output raw string if it was a string directive, but here we normalized it.
            // Is `fields` used in @key(fields: "id")? Yes.
            // Is existing logic doing something special?
            // Existing logic: arguments: { fields: key } where key is string.
            // Or arguments: { fields: key.fields } where key.fields might be string.
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
//# sourceMappingURL=directives.js.map