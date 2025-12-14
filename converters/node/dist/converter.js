"use strict";
/**
 * JSON Schema <-> GraphQL Converter with deep $ref resolution.
 *
 * This module normalizes converter options, resolves nested JSON Pointer references,
 * and produces deterministic GraphQL SDL output that mirrors the behavior of the
 * Rust implementation as closely as possible.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Converter = exports.graphqlToJsonSchema = exports.jsonSchemaToGraphQL = void 0;
class ConversionError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = "ConversionError";
    }
}
// --- Public API ----------------------------------------------------------------
function jsonSchemaToGraphQL(jsonSchemaInput, options = {}) {
    const schema = typeof jsonSchemaInput === "string"
        ? JSON.parse(jsonSchemaInput)
        : jsonSchemaInput;
    const normalized = normalizeOptions(options);
    const context = {
        rootSchema: schema,
        options: normalized,
        generatedTypes: new Set(),
        generating: new Set(),
        output: [],
    };
    emitCustomScalars(schema, context);
    const definitions = schema.$defs || schema.definitions;
    if (definitions) {
        const entries = normalized.preserveFieldOrder
            ? Object.entries(definitions)
            : Object.entries(definitions).sort(([a], [b]) => a.localeCompare(b));
        for (const [defKey, defSchema] of entries) {
            const typeName = getTypeName(defSchema, context, defKey);
            convertTypeDefinition(defSchema, typeName, context);
        }
    }
    const rootTypeName = getTypeName(schema, context, schema.title ?? "Root");
    convertTypeDefinition(schema, rootTypeName, context);
    emitOperations(schema, context);
    const finalSDL = context.output
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    if (!finalSDL) {
        throw new ConversionError("No GraphQL types found in schema. Provide x-graphql-type-name or $defs entries.", "NO_TYPES");
    }
    return finalSDL;
}
exports.jsonSchemaToGraphQL = jsonSchemaToGraphQL;
function graphqlToJsonSchema(graphqlSdl, options = {}) {
    const normalized = normalizeOptions(options);
    const schema = {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        properties: {},
        required: [],
    };
    const lines = graphqlSdl.split("\n");
    let currentType = null;
    let description = null;
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#"))
            continue;
        if (line.startsWith('"""')) {
            description = line.replace(/"""?/g, "").trim();
            continue;
        }
        if (line.startsWith('"') && line.endsWith('"')) {
            description = line.slice(1, -1);
            continue;
        }
        if (line.startsWith("type ") &&
            !line.includes("Query") &&
            !line.includes("Mutation")) {
            currentType = line.split(/\s+/)[1];
            schema["x-graphql-type-name"] = currentType;
            if (description) {
                schema.description = description;
                description = null;
            }
            continue;
        }
        if (line === "}") {
            currentType = null;
            continue;
        }
        if (currentType && line.includes(":")) {
            const [field, typePart] = line
                .split(":")
                .map((segment) => segment.trim());
            const fieldSchema = convertGqlTypeToJson(typePart, normalized.maxDepth);
            if (description) {
                fieldSchema.description = description;
                description = null;
            }
            schema.properties[field] = fieldSchema;
            if (typePart.endsWith("!")) {
                schema.required.push(field);
            }
        }
    }
    return JSON.stringify(schema, null, 2);
}
exports.graphqlToJsonSchema = graphqlToJsonSchema;
// --- Core Conversion ------------------------------------------------------------
function convertTypeDefinition(schema, typeName, context) {
    if (!typeName)
        return;
    if (!shouldIncludeType(typeName, context.options))
        return;
    if (context.generatedTypes.has(typeName))
        return;
    if (context.generating.has(typeName)) {
        throw new ConversionError(`Circular type resolution detected for ${typeName}`, "CIRCULAR_TYPE");
    }
    context.generating.add(typeName);
    const { options } = context;
    if (schema["x-graphql-enum"] || schema.enum) {
        context.output.push(renderEnum(typeName, schema, options));
    }
    else if (schema.oneOf || schema["x-graphql-union-types"]) {
        context.output.push(renderUnion(typeName, schema, context));
    }
    else if (schema.type === "object" || schema.properties || schema.allOf) {
        context.output.push(renderObject(typeName, schema, context));
    }
    else if (schema["x-graphql-type"] === "scalar") {
        context.output.push(`scalar ${typeName}\n`);
    }
    context.generating.delete(typeName);
    context.generatedTypes.add(typeName);
}
function renderEnum(typeName, schema, options) {
    const lines = [];
    if (options.includeDescriptions && schema.description) {
        lines.push(formatDescription(schema.description));
    }
    lines.push(`enum ${typeName}${formatDirectives(schema)} {`);
    let values = [];
    const enumConfig = schema["x-graphql-enum"];
    if (enumConfig?.values) {
        if (Array.isArray(enumConfig.values)) {
            values = enumConfig.values;
        }
        else if (typeof enumConfig.values === "object") {
            values = Object.entries(enumConfig.values).map(([k, v]) => {
                if (typeof v === "string") {
                    return { name: v, value: k };
                }
                return { value: k, ...v };
            });
        }
    }
    else {
        values = schema.enum ?? [];
    }
    for (const raw of values) {
        if (typeof raw === "object" && raw !== null) {
            const valName = raw.name ?? raw.value;
            if (!valName)
                continue;
            if (raw.description && options.includeDescriptions) {
                lines.push(`  ${formatDescription(raw.description).trim()}`);
            }
            lines.push(`  ${valName}`);
        }
        else {
            lines.push(`  ${String(raw)
                .replace(/[^_a-zA-Z0-9]/g, "_")
                .toUpperCase()}`);
        }
    }
    lines.push("}\n");
    return lines.join("\n");
}
function renderUnion(typeName, schema, context) {
    const members = new Set();
    const explicit = schema["x-graphql-union-types"];
    if (Array.isArray(explicit)) {
        explicit.forEach((t) => members.add(t));
    }
    if (schema.oneOf) {
        for (const memberSchema of schema.oneOf) {
            if (memberSchema.$ref) {
                const memberName = ensureReferencedType(memberSchema.$ref, context);
                if (memberName)
                    members.add(memberName);
            }
            else {
                const inferred = getTypeName(memberSchema, undefined);
                if (inferred) {
                    convertTypeDefinition(memberSchema, inferred, context);
                    members.add(inferred);
                }
            }
        }
    }
    if (!members.size) {
        throw new ConversionError(`Union ${typeName} must have at least one member`, "EMPTY_UNION");
    }
    const description = context.options.includeDescriptions && schema.description
        ? `${formatDescription(schema.description)}\n`
        : "";
    return `${description}union ${typeName}${formatDirectives(schema)} = ${[
        ...members,
    ].join(" | ")}\n`;
}
function renderObject(typeName, schema, context) {
    const { options } = context;
    const lines = [];
    if (options.includeDescriptions && schema.description) {
        lines.push(formatDescription(schema.description));
    }
    const implementsList = collectInterfaces(schema, context);
    const header = [
        schema["x-graphql-type"] === "interface" ? "interface" : "type",
        typeName,
        implementsList.length ? `implements ${implementsList.join(" & ")}` : "",
        formatDirectives(schema),
    ]
        .filter(Boolean)
        .join(" ");
    lines.push(`${header} {`);
    const properties = schema.properties ?? {};
    const propEntries = options.preserveFieldOrder
        ? Object.entries(properties)
        : Object.entries(properties).sort(([a], [b]) => a.localeCompare(b));
    const required = new Set(schema.required ?? []);
    for (const [propName, propSchema] of propEntries) {
        const field = convertField(propName, propSchema, required.has(propName), context);
        if (field) {
            lines.push(`  ${field}`);
        }
    }
    lines.push("}\n");
    return lines.join("\n");
}
function toCamelCase(str) {
    return str
        .replace(/[-_]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
        .replace(/^[A-Z]/, (c) => c.toLowerCase());
}
function convertField(propName, schema, isRequired, context) {
    const { options } = context;
    const description = options.includeDescriptions && schema.description
        ? `${formatDescription(schema.description)}\n  `
        : "";
    const fieldName = schema["x-graphql-field-name"] ||
        (options.namingConvention === "PRESERVE"
            ? propName
            : toCamelCase(propName));
    const args = formatArgs(schema);
    const typeRef = inferGraphQLType(schema, isRequired, context);
    if (!typeRef)
        return null;
    const directives = formatDirectives(schema);
    return `${description}${fieldName}${args}: ${typeRef}${directives}`;
}
// --- Type inference & $ref resolution ------------------------------------------
function inferGraphQLType(schema, isRequired, context, depth = 0) {
    const { options } = context;
    if (depth > options.maxDepth) {
        return isRequired ? "JSON!" : "JSON";
    }
    const explicitType = typeof schema["x-graphql-type"] === "string"
        ? schema["x-graphql-type"]
        : schema["x-graphql-type"]?.name;
    if (explicitType) {
        return finalizeType(explicitType, isRequired);
    }
    if (schema["x-graphql-scalar"]) {
        return finalizeType(sanitizeTypeName(schema["x-graphql-scalar"], options.namingConvention), isRequired);
    }
    if (schema.$ref) {
        const typeName = ensureReferencedType(schema.$ref, context);
        const fallback = pointerLastSegment(schema.$ref);
        const resolvedName = typeName ?? sanitizeTypeName(fallback, options.namingConvention);
        return finalizeType(resolvedName, isRequired);
    }
    const typeValue = Array.isArray(schema.type) ? schema.type[0] : schema.type;
    switch (typeValue) {
        case "string":
            return finalizeType(mapStringFormat(schema.format), isRequired);
        case "integer":
            return finalizeType("Int", isRequired);
        case "number":
            return finalizeType(schema.format === "float" ? "Float" : "Float", isRequired);
        case "boolean":
            return finalizeType("Boolean", isRequired);
        case "array": {
            const items = schema.items ?? {};
            const itemType = inferGraphQLType(items, false, context, depth + 1);
            return finalizeType(`[${itemType}]`, isRequired);
        }
        case "object": {
            const fallback = propFallbackName(schema);
            const typeName = getTypeName(schema, context, fallback);
            if (typeName) {
                convertTypeDefinition(schema, typeName, context);
                return finalizeType(typeName, isRequired);
            }
            return finalizeType("JSON", isRequired);
        }
        default:
            return finalizeType("String", isRequired);
    }
}
function ensureReferencedType(refPath, context) {
    const { schema: target } = resolveRef(refPath, context);
    if (!target || typeof target !== "object") {
        return null;
    }
    const primitive = derivePrimitiveGraphQLType(target);
    if (primitive) {
        return primitive;
    }
    const fallback = pointerLastSegment(refPath);
    const inferredName = getTypeName(target, context, fallback);
    if (!inferredName) {
        return null;
    }
    convertTypeDefinition(target, inferredName, context);
    return inferredName;
}
function resolveRef(refPath, context, visited = new Set()) {
    if (!refPath.startsWith("#")) {
        // Treat external refs as opaque objects for now to avoid crashing
        const name = refPath
            .split("/")
            .pop()
            ?.replace(".schema.json", "")
            .replace(/[^a-zA-Z0-9]/g, "_") || "ExternalType";
        const pascalName = name.charAt(0).toUpperCase() + name.slice(1);
        return {
            schema: {
                type: "object",
                description: `External reference to ${refPath}`,
                "x-graphql-type-name": pascalName,
                properties: {
                    _external_ref: {
                        type: "string",
                        description: "Placeholder for external reference",
                    },
                },
            },
            pointer: "",
        };
    }
    if (visited.has(refPath)) {
        throw new ConversionError(`Circular $ref detected: ${refPath}`, "CIRCULAR_REF");
    }
    visited.add(refPath);
    const pointer = refPath.slice(1);
    if (!pointer) {
        return { schema: context.rootSchema, pointer: "" };
    }
    const parts = pointer.split("/").filter(Boolean).map(decodePointerSegment);
    let current = context.rootSchema;
    for (const part of parts) {
        if (current && typeof current === "object" && current.$ref) {
            const resolved = resolveRef(current.$ref, context, visited);
            current = resolved.schema;
        }
        current = accessChild(current, part);
        if (current === undefined) {
            throw new ConversionError(`Failed to resolve $ref segment '${part}' in ${refPath}`, "INVALID_REF");
        }
    }
    return { schema: current, pointer };
}
// --- Operations & Scalars ------------------------------------------------------
function emitCustomScalars(schema, context) {
    const scalars = schema["x-graphql-scalars"];
    if (!scalars || typeof scalars !== "object")
        return;
    context.output.push("# Custom Scalars");
    for (const [scalarName, scalarDef] of Object.entries(scalars)) {
        if (scalarDef.description && context.options.includeDescriptions) {
            context.output.push(formatDescription(scalarDef.description));
        }
        context.output.push(`scalar ${toPascalCase(scalarName)}\n`);
    }
}
function emitOperations(schema, context) {
    const ops = schema["x-graphql-operations"];
    if (!ops)
        return;
    if (ops.queries && !shouldIncludeType("Query", context.options)) {
        // Skip if filtered
    }
    else if (ops.queries) {
        const lines = ["type Query {"];
        for (const [name, def] of Object.entries(ops.queries)) {
            if (def.description && context.options.includeDescriptions) {
                lines.push(`  ${formatDescription(def.description).trim()}`);
            }
            const args = formatOperationArgs(def.args);
            const resultType = def.type ?? "String";
            lines.push(`  ${name}${args}: ${resultType}`);
        }
        lines.push("}\n");
        context.output.push(lines.join("\n"));
    }
    if (ops.mutations && !shouldIncludeType("Mutation", context.options)) {
        return;
    }
    else if (ops.mutations) {
        const lines = ["type Mutation {"];
        for (const [name, def] of Object.entries(ops.mutations)) {
            if (def.description && context.options.includeDescriptions) {
                lines.push(`  ${formatDescription(def.description).trim()}`);
            }
            const args = formatOperationArgs(def.args);
            const resultType = def.type ?? "String";
            lines.push(`  ${name}${args}: ${resultType}`);
        }
        lines.push("}\n");
        context.output.push(lines.join("\n"));
    }
}
// --- Helpers -------------------------------------------------------------------
function normalizeOptions(options) {
    let federationVersion = 2;
    if (options.federationVersion === 'V1') {
        federationVersion = 1;
    }
    else if (options.federationVersion === 'NONE') {
        federationVersion = 0;
    }
    const validate = options.validate ?? true;
    const includeDescriptions = options.includeDescriptions ?? true;
    const preserveFieldOrder = options.preserveFieldOrder ?? true;
    const namingConvention = options.namingConvention ?? 'GRAPHQL_IDIOMATIC';
    const inferIds = options.inferIds ?? false;
    const maxDepth = options.maxDepth ?? 25;
    const excludeTypes = Array.from(new Set(options.excludeTypes ?? []));
    const excludePatterns = Array.from(new Set(options.excludePatterns ?? []));
    const excludeRegexes = excludePatterns.map((pattern) => new RegExp(pattern));
    return {
        validate,
        includeDescriptions,
        preserveFieldOrder,
        namingConvention,
        inferIds,
        maxDepth,
        federationVersion,
        excludeTypes,
        excludePatterns,
        excludeRegexes,
    };
}
class Converter {
    async convert(input) {
        try {
            const jsonSchema = typeof input.jsonSchema === 'string'
                ? JSON.parse(input.jsonSchema)
                : input.jsonSchema;
            const sdl = jsonSchemaToGraphQL(jsonSchema, input.options || {});
            return {
                sdl,
                diagnostics: [],
                success: true
            };
        }
        catch (error) {
            return {
                sdl: null,
                diagnostics: [{
                        severity: 'ERROR',
                        message: error.message || String(error),
                        path: null,
                        code: 'CONVERSION_ERROR'
                    }],
                success: false
            };
        }
    }
}
exports.Converter = Converter;
function shouldIncludeType(typeName, options) {
    if (!typeName)
        return false;
    if (options.excludeTypes.includes(typeName))
        return false;
    return !options.excludeRegexes.some((regex) => regex.test(typeName));
}
function getTypeName(schema, contextOrFallback, fallbackArg) {
    let context;
    let fallback;
    if (contextOrFallback &&
        typeof contextOrFallback.options === "object") {
        context = contextOrFallback;
        fallback = fallbackArg;
    }
    else {
        fallback = contextOrFallback;
    }
    const namingConvention = context?.options.namingConvention ?? "GRAPHQL_IDIOMATIC";
    const explicitName = schema["x-graphql-type-name"];
    if (typeof explicitName === "string" && explicitName.trim()) {
        return explicitName.trim();
    }
    const typeOverride = schema["x-graphql-type"];
    if (typeof typeOverride === "string" && typeOverride.trim()) {
        return sanitizeTypeName(typeOverride, namingConvention);
    }
    if (typeof typeOverride === "object" &&
        typeOverride !== null &&
        typeof typeOverride.name === "string" &&
        typeOverride.name.trim()) {
        return sanitizeTypeName(typeOverride.name, namingConvention);
    }
    if (schema.title) {
        return sanitizeTypeName(schema.title, namingConvention);
    }
    if (fallback)
        return sanitizeTypeName(fallback, namingConvention);
    return null;
}
function sanitizeTypeName(value, namingConvention = "GRAPHQL_IDIOMATIC") {
    if (namingConvention === "PRESERVE") {
        return value.replace(/[^a-zA-Z0-9_]/g, "_");
    }
    return value
        .replace(/[^a-zA-Z0-9_]/g, " ")
        .split(" ")
        .map(toPascalCase)
        .join("");
}
function propFallbackName(schema) {
    if (schema["$id"])
        return schema["$id"];
    return "NestedObject";
}
function pointerLastSegment(refPath) {
    const parts = refPath.split("/").filter(Boolean);
    return decodePointerSegment(parts[parts.length - 1] ?? "Unknown");
}
function decodePointerSegment(segment) {
    return segment.replace(/~1/g, "/").replace(/~0/g, "~");
}
function accessChild(node, key) {
    if (Array.isArray(node)) {
        const index = Number(key);
        if (Number.isNaN(index))
            return undefined;
        return node[index];
    }
    return node?.[key];
}
function derivePrimitiveGraphQLType(schema) {
    if (!schema || typeof schema !== "object") {
        return null;
    }
    const explicit = typeof schema["x-graphql-type"] === "string"
        ? schema["x-graphql-type"]
        : schema["x-graphql-type"]?.name;
    if (explicit) {
        return explicit;
    }
    if (schema["x-graphql-scalar"]) {
        return toPascalCase(schema["x-graphql-scalar"]);
    }
    const schemaType = Array.isArray(schema.type) ? schema.type[0] : schema.type;
    switch (schemaType) {
        case "string":
            return mapStringFormat(schema.format);
        case "integer":
            return "Int";
        case "number":
            return schema.format === "float" ? "Float" : "Float";
        case "boolean":
            return "Boolean";
        case "array": {
            const itemType = derivePrimitiveGraphQLType(schema.items ?? {});
            return itemType ? `[${itemType}]` : null;
        }
        default:
            return null;
    }
}
function mapStringFormat(format) {
    switch (format) {
        case "date-time":
            return "DateTime";
        case "date":
            return "Date";
        case "time":
            return "Time";
        case "email":
            return "Email";
        case "uuid":
            return "ID";
        case "uri":
            return "URL";
        default:
            return "String";
    }
}
function finalizeType(typeName, required) {
    if (!typeName)
        return required ? "String!" : "String";
    if (required && !typeName.endsWith("!")) {
        return `${typeName}!`;
    }
    return typeName;
}
function collectInterfaces(schema, context) {
    const implementsList = new Set();
    const explicit = schema["x-graphql-implements"] ?? schema["x-graphql-type-implements"];
    if (Array.isArray(explicit)) {
        explicit.forEach((iface) => implementsList.add(iface));
    }
    if (Array.isArray(schema.allOf)) {
        for (const entry of schema.allOf) {
            if (entry.$ref) {
                const iface = ensureReferencedType(entry.$ref, context);
                if (iface)
                    implementsList.add(iface);
            }
        }
    }
    return [...implementsList];
}
function formatDescription(description) {
    if (description.includes("\n")) {
        return `"""${description.replace(/"""/g, '\\"""')}"""`;
    }
    return `"${description.replace(/"/g, '\\"')}"`;
}
function formatDirectives(schema) {
    const directives = [];
    if (Array.isArray(schema["x-graphql-directives"])) {
        directives.push(...schema["x-graphql-directives"]);
    }
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
            arguments: { scopes: schema["x-graphql-federation-requires-scopes"] },
        });
    }
    if (Array.isArray(schema["x-graphql-federation-keys"])) {
        for (const key of schema["x-graphql-federation-keys"]) {
            if (typeof key === "string") {
                directives.push({ name: "key", arguments: { fields: key } });
            }
            else if (key && typeof key === "object" && key.fields) {
                directives.push({
                    name: "key",
                    arguments: { fields: key.fields, resolvable: key.resolvable },
                });
            }
        }
    }
    if (directives.length === 0) {
        return "";
    }
    const parts = directives.map((dir) => {
        if (!dir?.name)
            return "";
        const args = dir.arguments
            ? `(${Object.entries(dir.arguments)
                .map(([key, value]) => {
                if (key === "scopes" && Array.isArray(value)) {
                    return `${key}: [${value
                        .map((v) => `[${(Array.isArray(v) ? v : [v])
                        .map((s) => `"${s}"`)
                        .join(", ")}]`)
                        .join(", ")}]`;
                }
                return `${key}: ${JSON.stringify(value)}`;
            })
                .join(", ")})`
            : "";
        return `@${dir.name}${args}`;
    });
    const joined = parts.filter(Boolean).join(" ");
    return joined ? ` ${joined}` : "";
}
function formatArgs(schema) {
    const args = schema["x-graphql-arguments"];
    if (!args)
        return "";
    const entries = Object.entries(args).map(([name, def]) => {
        const configuredType = def.type ??
            (typeof def["x-graphql-type"] === "string"
                ? def["x-graphql-type"]
                : undefined);
        const argType = configuredType ?? "String";
        const defaultValue = def.default !== undefined ? ` = ${JSON.stringify(def.default)}` : "";
        return `${name}: ${argType}${defaultValue}`;
    });
    return entries.length ? `(${entries.join(", ")})` : "";
}
function formatOperationArgs(args) {
    if (!args)
        return "";
    const rendered = Object.entries(args).map(([name, def]) => {
        const configuredType = def.type ??
            (typeof def["x-graphql-type"] === "string"
                ? def["x-graphql-type"]
                : undefined);
        const type = configuredType ?? "String";
        const defaultValue = def.default !== undefined ? ` = ${JSON.stringify(def.default)}` : "";
        return `${name}: ${type}${defaultValue}`;
    });
    return rendered.length ? `(${rendered.join(", ")})` : "";
}
// --- GraphQL -> JSON helpers ---------------------------------------------------
function convertGqlTypeToJson(type, maxDepth, depth = 0) {
    if (depth > maxDepth) {
        return { type: "object", "x-graphql-scalar": "JSON" };
    }
    let working = type.trim();
    const schema = {};
    if (working.endsWith("!")) {
        working = working.slice(0, -1);
    }
    if (working.startsWith("[") && working.endsWith("]")) {
        const inner = working.slice(1, -1);
        schema.type = "array";
        schema.items = convertGqlTypeToJson(inner, maxDepth, depth + 1);
        return schema;
    }
    switch (working) {
        case "String":
            schema.type = "string";
            break;
        case "Int":
        case "Float":
            schema.type = "number";
            break;
        case "Boolean":
            schema.type = "boolean";
            break;
        case "ID":
            schema.type = "string";
            schema["x-graphql-type"] = "ID";
            break;
        case "DateTime":
        case "Date":
        case "Time":
            schema.type = "string";
            schema.format = working.toLowerCase();
            schema["x-graphql-scalar"] = working;
            break;
        default:
            schema.$ref = `#/$defs/${toSnakeCase(working)}`;
            schema["x-graphql-type"] = working;
    }
    return schema;
}
function toPascalCase(value) {
    return value
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
        .join("");
}
function toSnakeCase(value) {
    return value
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .replace(/[-\s]+/g, "_")
        .toLowerCase();
}
//# sourceMappingURL=converter.js.map