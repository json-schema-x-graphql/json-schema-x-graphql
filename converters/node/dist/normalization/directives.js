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
        // Handle array of scopes specially (from existing logic)
        if (key === "scopes" && Array.isArray(value)) {
            return `${key}: [${value
                .map((v) => `[${(Array.isArray(v) ? v : [v])
                .map((s) => `"${s}"`)
                .join(", ")}]`)
                .join(", ")} ]`;
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