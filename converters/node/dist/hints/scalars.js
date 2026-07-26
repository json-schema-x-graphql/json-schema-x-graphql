/**
 * Custom scalar type generation from x-graphql-scalars extension.
 *
 * Mirrors the Rust implementation in
 * `converters/rust/src/hints/scalars.rs`.
 */
/**
 * Parse `x-graphql-scalars` from the top-level schema object.
 * Accepts both an object format (keys are scalar names) and an
 * array format (each entry has `name` and optional `description`).
 */
export function parseCustomScalars(schema) {
    const obj = schema;
    if (!obj || typeof obj !== "object") {
        return [];
    }
    const scalars = obj["x-graphql-scalars"];
    if (scalars && typeof scalars === "object" && !Array.isArray(scalars)) {
        return Object.entries(scalars).map(([name, config]) => {
            const c = config;
            return {
                name,
                description: c.description,
                specifiedByURL: c.specifiedByURL ?? c.specifiedByUrl,
            };
        });
    }
    if (Array.isArray(scalars)) {
        const result = [];
        for (const entry of scalars) {
            const c = entry;
            if (!c.name)
                continue;
            result.push({
                name: c.name,
                description: c.description,
                specifiedByURL: c.specifiedByURL ?? c.specifiedByUrl,
            });
        }
        return result;
    }
    // Per-definition x-graphql-scalar / x-graphql-type-kind=SCALAR
    const defs = (obj["$defs"] ??
        obj["definitions"]);
    if (defs) {
        for (const defSchema of Object.values(defs)) {
            if (!defSchema || typeof defSchema !== "object")
                continue;
            const defObj = defSchema;
            if (defObj["x-graphql-type-kind"] === "SCALAR" ||
                defObj["x-graphql-scalar"]) {
                const name = defObj["x-graphql-type-name"] ??
                    defObj["title"];
                if (name) {
                    return [
                        {
                            name,
                            description: defObj["description"],
                            specifiedByURL: defObj["specifiedByURL"] ??
                                defObj["specifiedByUrl"],
                        },
                    ];
                }
            }
        }
    }
    return [];
}
/** Generate SDL for a list of custom scalars. */
export function generateScalarsSdl(scalars, existingSdl) {
    const lines = [];
    for (const scalar of scalars) {
        // Skip if already present
        if (existingSdl.includes(`scalar ${scalar.name}`)) {
            continue;
        }
        if (scalar.description) {
            const trimmed = scalar.description.trim();
            if (trimmed.includes("\n")) {
                lines.push('"""');
                lines.push(trimmed);
                lines.push('"""');
            }
            else {
                lines.push(`"""${trimmed}"""`);
            }
        }
        if (scalar.specifiedByURL) {
            lines.push(`scalar ${scalar.name} @specifiedBy(url: "${scalar.specifiedByURL}")`);
        }
        else {
            lines.push(`scalar ${scalar.name}`);
        }
    }
    if (lines.length === 0) {
        return "";
    }
    lines.push("");
    return lines.join("\n");
}
/** Prepend custom scalar declarations to existing SDL. */
export function injectCustomScalars(sdl, scalars) {
    const scalarBlock = generateScalarsSdl(scalars, sdl);
    if (!scalarBlock) {
        return sdl;
    }
    return `${scalarBlock}${sdl}`;
}
/** Build a map of type.field → scalar name for property-level x-graphql-scalar overrides. */
export function buildScalarFieldMap(schema) {
    const map = new Map();
    const obj = schema;
    if (!obj || typeof obj !== "object")
        return map;
    const defs = (obj["$defs"] ??
        obj["definitions"]);
    if (!defs)
        return map;
    for (const [typeName, defSchema] of Object.entries(defs)) {
        if (!defSchema || typeof defSchema !== "object")
            continue;
        const defObj = defSchema;
        const properties = defObj["properties"];
        if (!properties)
            continue;
        for (const [propName, propSchema] of Object.entries(properties)) {
            if (!propSchema || typeof propSchema !== "object")
                continue;
            const scalar = propSchema["x-graphql-scalar"];
            if (scalar) {
                map.set(`${typeName}.${propName}`, scalar);
            }
        }
    }
    return map;
}
/** Apply field-level scalar replacements to SDL. */
export function applyScalarFieldReplacements(sdl, fieldMap) {
    if (fieldMap.size === 0)
        return sdl;
    let currentType = null;
    const lines = sdl.split("\n").map((line) => {
        const trimmed = line.trim();
        // Track current type
        const typeMatch = trimmed.match(/^type\s+(\w+)/);
        if (typeMatch) {
            currentType = typeMatch[1];
            return line;
        }
        if (trimmed === "}" ||
            trimmed.startsWith("input ") ||
            trimmed.startsWith("enum ")) {
            currentType = null;
            return line;
        }
        if (currentType) {
            for (const [key, scalarName] of fieldMap) {
                const dotIndex = key.indexOf(".");
                if (dotIndex < 0)
                    continue;
                const mapType = key.substring(0, dotIndex);
                const mapField = key.substring(dotIndex + 1);
                if (mapType !== currentType)
                    continue;
                const pattern = `  ${mapField}: `;
                const pos = line.indexOf(pattern);
                if (pos < 0)
                    continue;
                const afterPattern = line.substring(pos + pattern.length);
                const standardTypes = ["String", "Float", "Int", "Boolean", "ID"];
                for (const st of standardTypes) {
                    if (afterPattern.startsWith(st)) {
                        return (line.substring(0, pos + pattern.length) +
                            scalarName +
                            afterPattern.substring(st.length));
                    }
                }
            }
        }
        return line;
    });
    return lines.join("\n");
}
//# sourceMappingURL=scalars.js.map