/**
 * Schema analysis module.
 *
 * Computes statistics, structural metrics, diffs, and coverage
 * reports for JSON Schemas. Mirrors the Rust implementation in
 * `converters/rust/src/analysis/mod.rs`.
 */
/** Compute statistics for a JSON Schema. */
export function computeStats(schema) {
    const stats = {
        totalDefinitions: 0,
        byKind: {},
        definitions: [],
        totalFields: 0,
        maxDepth: 0,
        federatedTypes: [],
        allFieldNames: new Set(),
        uniqueFieldCount: 0,
        refCount: 0,
    };
    if (!schema || typeof schema !== "object")
        return stats;
    const obj = schema;
    const defs = (obj["$defs"] ?? obj["definitions"]);
    if (!defs)
        return stats;
    stats.totalDefinitions = Object.keys(defs).length;
    for (const [name, defSchema] of Object.entries(defs)) {
        const defStats = computeDefinitionStats(name, defSchema);
        stats.byKind[defStats.kind] = (stats.byKind[defStats.kind] ?? 0) + 1;
        stats.totalFields += defStats.fieldCount;
        if (defStats.hasFederationKey) {
            stats.federatedTypes.push(name);
        }
        for (const fieldName of collectFieldNames(defSchema)) {
            stats.allFieldNames.add(fieldName);
        }
        stats.definitions.push(defStats);
    }
    stats.uniqueFieldCount = stats.allFieldNames.size;
    stats.refCount = countRefs(schema);
    stats.maxDepth = computeMaxDepth(schema, 0);
    return stats;
}
function computeDefinitionStats(name, defSchema) {
    const stats = {
        name,
        kind: "UNKNOWN",
        fieldCount: 0,
        requiredCount: 0,
        nullableCount: 0,
        description: undefined,
        hasFederationKey: false,
        hasSkipFields: false,
    };
    if (!defSchema || typeof defSchema !== "object")
        return stats;
    const obj = defSchema;
    stats.description = obj.description;
    // Determine kind
    stats.kind = determineKind(obj);
    // Federation key presence
    const federation = obj["x-graphql-federation"];
    stats.hasFederationKey =
        "x-graphql-federation-keys" in obj ||
            "x-graphql-federation-key" in obj ||
            !!(federation && "keys" in federation);
    // Field-level stats
    const properties = obj["properties"];
    if (properties) {
        stats.fieldCount = Object.keys(properties).length;
        const required = obj["required"] ?? [];
        stats.requiredCount = Array.isArray(required) ? required.length : 0;
        stats.nullableCount = Math.max(0, stats.fieldCount - stats.requiredCount);
        // Skip field check
        stats.hasSkipFields = Object.values(properties).some((v) => v["x-graphql-skip"] === true);
    }
    return stats;
}
function determineKind(obj) {
    // x-graphql-type-kind takes precedence
    const explicitKind = obj["x-graphql-type-kind"];
    if (explicitKind)
        return explicitKind;
    // x-graphql-enum indicates enum
    if ("x-graphql-enum" in obj)
        return "ENUM";
    // x-graphql-scalar indicates scalar
    if ("x-graphql-scalar" in obj)
        return "SCALAR";
    // x-graphql-union indicates union
    if ("x-graphql-union" in obj)
        return "UNION";
    // Standard JSON Schema type
    const t = obj["type"];
    if (typeof t === "string")
        return t.toUpperCase();
    if (Array.isArray(t)) {
        for (const v of t) {
            if (v !== "null" && typeof v === "string")
                return v.toUpperCase();
        }
    }
    return "UNKNOWN";
}
function collectFieldNames(defSchema) {
    const names = new Set();
    if (!defSchema || typeof defSchema !== "object")
        return names;
    const properties = defSchema["properties"];
    if (!properties)
        return names;
    for (const key of Object.keys(properties)) {
        names.add(key);
    }
    return names;
}
function countRefs(value) {
    let count = 0;
    countRefsRecursive(value, (c) => (count += c));
    return count;
}
function countRefsRecursive(value, increment) {
    if (!value)
        return;
    if (Array.isArray(value)) {
        for (const v of value) {
            countRefsRecursive(v, increment);
        }
        return;
    }
    if (typeof value === "object") {
        if ("$ref" in value)
            increment(1);
        for (const v of Object.values(value)) {
            countRefsRecursive(v, increment);
        }
    }
}
function computeMaxDepth(value, current) {
    if (!value)
        return current;
    if (Array.isArray(value)) {
        let max = current;
        for (const v of value) {
            const d = computeMaxDepth(v, current + 1);
            if (d > max)
                max = d;
        }
        return max;
    }
    if (typeof value === "object") {
        let max = current;
        for (const v of Object.values(value)) {
            const d = computeMaxDepth(v, current + 1);
            if (d > max)
                max = d;
        }
        return max;
    }
    return current;
}
export function diffSchemas(oldSchema, newSchema) {
    const diffs = [];
    const oldDefs = extractDefsMap(oldSchema);
    const newDefs = extractDefsMap(newSchema);
    const oldNames = new Set(Object.keys(oldDefs));
    const newNames = new Set(Object.keys(newDefs));
    // Added types
    for (const added of newNames) {
        if (!oldNames.has(added)) {
            diffs.push({
                category: "type",
                severity: "added",
                path: `$.$defs.${added}`,
                message: `Type '${added}' was added`,
            });
        }
    }
    // Removed types
    for (const removed of oldNames) {
        if (!newNames.has(removed)) {
            diffs.push({
                category: "type",
                severity: "removed",
                path: `$.$defs.${removed}`,
                message: `Type '${removed}' was removed`,
            });
        }
    }
    // Modified types
    for (const common of oldNames) {
        if (newNames.has(common)) {
            diffTypeDefinition(common, oldDefs[common], newDefs[common], diffs);
        }
    }
    const breaking = diffs.filter((d) => d.severity === "removed").length;
    const nonBreaking = diffs.filter((d) => d.severity !== "removed").length;
    return { diffs, breakingChanges: breaking, nonBreakingChanges: nonBreaking };
}
function extractDefsMap(schema) {
    const obj = schema;
    if (!obj || typeof obj !== "object")
        return {};
    const defs = (obj["$defs"] ?? obj["definitions"]);
    if (!defs)
        return {};
    return { ...defs };
}
function diffTypeDefinition(name, old, newDef, diffs) {
    const oldObj = (old ?? {});
    const newObj = (newDef ?? {});
    // Check kind change
    const oldKind = String(oldObj.type ?? "unknown");
    const newKind = String(newObj.type ?? "unknown");
    if (oldKind !== newKind) {
        diffs.push({
            category: "fieldType",
            severity: "modified",
            path: `$.$defs.${name}.type`,
            message: `Type '${name}' changed kind: '${oldKind}' → '${newKind}'`,
        });
    }
    // Field additions/removals
    const oldProps = new Set(Object.keys((oldObj.properties ?? {})));
    const newProps = new Set(Object.keys((newObj.properties ?? {})));
    for (const added of newProps) {
        if (!oldProps.has(added)) {
            diffs.push({
                category: "field",
                severity: "added",
                path: `$.$defs.${name}.properties.${added}`,
                message: `Type '${name}': field '${added}' was added`,
            });
        }
    }
    for (const removed of oldProps) {
        if (!newProps.has(removed)) {
            diffs.push({
                category: "field",
                severity: "removed",
                path: `$.$defs.${name}.properties.${removed}`,
                message: `Type '${name}': field '${removed}' was removed`,
            });
        }
    }
    // Required transitions
    const oldRequired = new Set(Array.isArray(oldObj.required) ? oldObj.required : []);
    const newRequired = new Set(Array.isArray(newObj.required) ? newObj.required : []);
    for (const opt of oldRequired) {
        if (!newRequired.has(opt) && newProps.has(opt)) {
            diffs.push({
                category: "fieldRequired",
                severity: "modified",
                path: `$.$defs.${name}.required`,
                message: `Type '${name}': field '${opt}' is now optional`,
            });
        }
    }
    for (const req of newRequired) {
        if (!oldRequired.has(req)) {
            diffs.push({
                category: "fieldRequired",
                severity: "removed",
                path: `$.$defs.${name}.required`,
                message: `Type '${name}': field '${req}' is now required (breaking change)`,
            });
        }
    }
    // Federation key changes
    const oldFed = "x-graphql-federation-keys" in oldObj ||
        "x-graphql-federation-key" in oldObj;
    const newFed = "x-graphql-federation-keys" in newObj ||
        "x-graphql-federation-key" in newObj;
    if (oldFed && !newFed) {
        diffs.push({
            category: "federation",
            severity: "removed",
            path: `$.$defs.${name}.x-graphql-federation-keys`,
            message: `Type '${name}': federation key was removed (breaking change)`,
        });
    }
}
export function computeFieldCoverageByName(sourceSchema, targetSchema) {
    const sourceDefs = extractDefsMap(sourceSchema);
    const targetDefs = extractDefsMap(targetSchema);
    // Build set of (type, field) pairs in target
    const targetFieldPaths = new Set();
    for (const [typeName, defValue] of Object.entries(targetDefs)) {
        if (!defValue || typeof defValue !== "object")
            continue;
        const properties = defValue["properties"];
        if (!properties)
            continue;
        for (const fieldName of Object.keys(properties)) {
            targetFieldPaths.add(`${typeName}.${fieldName}`);
        }
    }
    const report = {
        typeCoverages: [],
        totalSourceFields: 0,
        totalMappedFields: 0,
        overallCoveragePercent: 100,
    };
    for (const [typeName, defValue] of Object.entries(sourceDefs)) {
        const obj = (defValue ?? {});
        const properties = (obj["properties"] ?? {});
        const fieldNames = Object.keys(properties);
        const total = fieldNames.length;
        let mapped = 0;
        const missing = [];
        for (const prop of fieldNames) {
            if (targetFieldPaths.has(`${typeName}.${prop}`)) {
                mapped++;
            }
            else {
                missing.push(prop);
            }
        }
        const coveragePercent = total > 0 ? (mapped / total) * 100 : 100;
        report.totalSourceFields += total;
        report.totalMappedFields += mapped;
        report.typeCoverages.push({
            typeName,
            totalSourceFields: total,
            mappedFields: mapped,
            missingFields: missing,
            coveragePercent,
        });
    }
    report.overallCoveragePercent =
        report.totalSourceFields > 0
            ? (report.totalMappedFields / report.totalSourceFields) * 100
            : 100;
    return report;
}
//# sourceMappingURL=index.js.map