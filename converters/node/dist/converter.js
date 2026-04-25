/**
 * JSON Schema <-> GraphQL Converter with deep $ref resolution.
 *
 * This module normalizes converter options, resolves nested JSON Pointer references,
 * and produces deterministic GraphQL SDL output that mirrors the behavior of the
 * Rust implementation as closely as possible.
 */
import { parse, print } from "graphql";
import { camelToSnake, snakeToCamel } from "./case-conversion.js";
import { extractDirectives, printDirectives, } from "./normalization/directives.js";
import { ensureConnectionType } from "./features/relay.js";
// ExtendedConverterOptions and others moved to interfaces.ts
// NormalizedConverterOptions moved to interfaces.ts
// JsonSchema moved to interfaces.ts
// Helper interfaces moved to interfaces.ts
// ConversionContext and JsonSchemaInput moved to interfaces.ts
class ConversionError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = "ConversionError";
    }
}
function shouldExcludeType(typeName, options) {
    if (!typeName)
        return true;
    // Debug filtering
    if (typeName === "Mutation" || typeName === "Query" || typeName === "PageInfo") {
        console.log(`Checking exclusion for ${typeName}: includeOps=${options.includeOperationalTypes}, inList=${options.excludeTypes?.includes(typeName)}, list=${JSON.stringify(options.excludeTypes)}`);
    }
    // Always exclude introspection types
    if (typeName.startsWith("__")) {
        return true;
    }
    // Check if type is in explicit exclude list
    // When includeOperationalTypes is false, operational types in the list are excluded
    // When includeOperationalTypes is true, operational types are NOT excluded, but other custom types still are
    if (options.excludeTypes?.includes(typeName)) {
        // If includeOperationalTypes is true, don't exclude operational types even if they're in the list
        if (options.includeOperationalTypes) {
            const operationalTypes = ["Query", "Mutation", "Subscription"];
            if (operationalTypes.includes(typeName)) {
                // Skip exclusion for operational types when includeOperationalTypes is true
            }
            else {
                return true;
            }
        }
        else {
            return true;
        }
    }
    // Check suffixes
    if (options.excludeTypeSuffixes) {
        for (const suffix of options.excludeTypeSuffixes) {
            if (typeName.endsWith(suffix)) {
                return true;
            }
        }
    }
    // Check regexes
    if (options.excludeRegexes && options.excludeRegexes.some((regex) => regex.test(typeName))) {
        return true;
    }
    return false;
}
// --- Public API ----------------------------------------------------------------
export function jsonSchemaToGraphQL(jsonSchemaInput, options = {}) {
    const schema = typeof jsonSchemaInput === "string"
        ? JSON.parse(jsonSchemaInput)
        : jsonSchemaInput;
    const normalized = normalizeOptions(options);
    const resolvedFederation = normalized.federationVersion === "AUTO"
        ? detectFederationVersion(schema)
        : normalized.federationVersion;
    const resolvedOptions = {
        ...normalized,
        federationVersion: resolvedFederation,
    };
    const context = {
        rootSchema: schema,
        options: resolvedOptions,
        generatedTypes: new Set(),
        generating: new Set(),
        building: new Set(),
        usedScalars: new Set(),
        output: [],
        typeNames: new Map(),
    };
    emitCustomScalars(schema, context);
    const definitions = schema.$defs || schema.definitions;
    if (definitions) {
        const entries = normalized.preserveFieldOrder
            ? Object.entries(definitions)
            : Object.entries(definitions).sort(([a], [b]) => a.localeCompare(b));
        // First pass: assign names to all definitions to handle collisions
        const assignedNames = new Set(context.generatedTypes);
        for (const [defKey, defSchema] of entries) {
            const rawTypeName = getTypeName(defSchema, context, defKey) || defKey;
            let uniqueName = rawTypeName;
            let idx = 1;
            while (assignedNames.has(uniqueName)) {
                uniqueName = `${rawTypeName}${idx}`;
                idx++;
            }
            assignedNames.add(uniqueName);
            context.typeNames.set(`/$defs/${defKey}`, uniqueName);
            context.typeNames.set(`/definitions/${defKey}`, uniqueName);
        }
        // Second pass: generate types
        for (const [defKey, defSchema] of entries) {
            const typeName = context.typeNames.get(`/$defs/${defKey}`) ||
                context.typeNames.get(`/definitions/${defKey}`);
            // Debug logging
            if (typeName === "Mutation") {
                console.log(`Processing def Mutation. Should exclude? ${shouldExcludeType(typeName, context.options)}`);
            }
            if (typeName && !shouldExcludeType(typeName, context.options)) {
                convertTypeDefinition(defSchema, typeName, context);
            }
        }
    }
    const rootTypeName = getTypeName(schema, context, schema.title ?? "Root");
    if (rootTypeName && !shouldExcludeType(rootTypeName, context.options)) {
        convertTypeDefinition(schema, rootTypeName, context);
    }
    emitImpliedScalars(context);
    emitOperations(schema, context);
    const finalSDL = context.output
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    // If no types are generated, return empty string instead of throwing,
    // to allow for deterministic comparison of empty outputs (e.g. adr_empty_object).
    if (!finalSDL) {
        return "";
    }
    return finalSDL;
}
export function graphqlToJsonSchema(graphqlSdl, options = {}) {
    const normalized = normalizeOptions(options);
    try {
        // Parse GraphQL SDL into AST
        const doc = parse(graphqlSdl);
        // Build type registry from definitions
        const typeRegistry = new Map();
        const rootTypes = {
            query: null,
            mutation: null,
        };
        for (const def of doc.definitions) {
            if (def.kind === "ObjectTypeDefinition" || def.kind === "InterfaceTypeDefinition") {
                const typeName = def.name?.value;
                if (typeName && typeName !== "Query" && typeName !== "Mutation") {
                    typeRegistry.set(typeName, {
                        kind: def.kind,
                        name: typeName,
                        description: def.description?.value,
                        fields: def.fields || [],
                        interfaces: def.interfaces || [],
                        directives: def.directives || [],
                    });
                }
                if (typeName === "Query")
                    rootTypes.query = typeName;
                if (typeName === "Mutation")
                    rootTypes.mutation = typeName;
            }
            else if (def.kind === "EnumTypeDefinition") {
                const enumName = def.name?.value;
                if (enumName) {
                    typeRegistry.set(enumName, {
                        kind: "EnumTypeDefinition",
                        name: enumName,
                        description: def.description?.value,
                        enumValues: def.values || [],
                        directives: def.directives || [],
                    });
                }
            }
            else if (def.kind === "UnionTypeDefinition") {
                const unionName = def.name?.value;
                if (unionName) {
                    typeRegistry.set(unionName, {
                        kind: "UnionTypeDefinition",
                        name: unionName,
                        description: def.description?.value,
                        types: def.types || [],
                        directives: def.directives || [],
                    });
                }
            }
            else if (def.kind === "ScalarTypeDefinition") {
                const scalarName = def.name?.value;
                if (scalarName && !["String", "Int", "Float", "Boolean", "ID"].includes(scalarName)) {
                    typeRegistry.set(scalarName, {
                        kind: "ScalarTypeDefinition",
                        name: scalarName,
                        description: def.description?.value,
                        directives: def.directives || [],
                    });
                }
            }
        }
        // Determine root type: prefer the type with most fields that's not Query/Mutation
        let rootTypeName = "Root";
        let maxFields = 0;
        for (const [typeName, typeDef] of typeRegistry.entries()) {
            const fieldCount = (typeDef.fields || []).length;
            if (fieldCount > maxFields &&
                (typeDef.kind === "ObjectTypeDefinition" || typeDef.kind === "InterfaceTypeDefinition")) {
                maxFields = fieldCount;
                rootTypeName = typeName;
            }
        }
        // Build schema with root type at top level and other types in $defs
        const rootTypeDef = typeRegistry.get(rootTypeName);
        const rootSchema = rootTypeDef
            ? convertGraphQLTypeToSchema(rootTypeDef, typeRegistry, normalized)
            : {};
        // Build definitions for referenced types
        const definitions = {};
        for (const [typeName, typeDef] of typeRegistry.entries()) {
            if (typeName !== rootTypeName) {
                definitions[typeName] = convertGraphQLTypeToSchema(typeDef, typeRegistry, normalized);
            }
        }
        // Create root schema with root type properties at top level
        const schema = {
            ...rootSchema,
            $schema: "https://json-schema.org/draft/2020-12/schema",
        };
        // Only include $defs if there are referenced types
        if (Object.keys(definitions).length > 0) {
            schema.$defs = definitions;
        }
        return JSON.stringify(schema, null, 2);
    }
    catch {
        // Fallback to simple parsing if AST parsing fails
        return fallbackGraphqlToJsonSchema(graphqlSdl, normalized);
    }
}
function convertGraphQLTypeToSchema(typeDef, typeRegistry, options) {
    const schema = {
        type: "object",
    };
    if (typeDef.description && options.includeDescriptions) {
        schema.description = typeDef.description;
    }
    schema["x-graphql-type"] = typeDef.name;
    if (typeDef.directives && typeDef.directives.length > 0) {
        schema["x-graphql-directives"] = typeDef.directives.map((d) => print(d));
    }
    if (typeDef.kind === "EnumTypeDefinition") {
        schema.type = "string";
        schema.enum = typeDef.enumValues?.map((v) => v.name?.value) || [];
        if (typeDef.description) {
            schema.description = typeDef.description;
        }
        return schema;
    }
    if (typeDef.kind === "UnionTypeDefinition") {
        schema.oneOf = (typeDef.types || []).map((t) => ({
            $ref: `#/$defs/${t.name?.value}`,
        }));
        return schema;
    }
    if (typeDef.kind === "ScalarTypeDefinition") {
        schema.type = "string";
        schema["x-graphql-scalar"] = typeDef.name;
        return schema;
    }
    // Object type
    schema.properties = {};
    const required = [];
    for (const field of typeDef.fields || []) {
        const fieldName = field.name?.value;
        if (!fieldName)
            continue;
        const fieldSchema = convertGraphQLFieldToSchema(field, typeRegistry, options);
        schema.properties[fieldName] = fieldSchema;
        // Check if field is non-null (required)
        if (field.type?.kind === "NonNullType") {
            required.push(fieldName);
        }
    }
    if (required.length > 0) {
        schema.required = required;
    }
    return schema;
}
function convertGraphQLFieldToSchema(field, typeRegistry, options) {
    const typeSchema = convertGraphQLTypeToJsonSchema(field.type, typeRegistry, options);
    // Merge description if present
    if (field.description?.value && options.includeDescriptions) {
        typeSchema.description = field.description.value;
    }
    if (field.directives && field.directives.length > 0) {
        typeSchema["x-graphql-directives"] = field.directives.map((d) => print(d));
    }
    return typeSchema;
}
function convertGraphQLTypeToJsonSchema(gqlType, typeRegistry, options) {
    const _schema = {};
    // Unwrap NonNull
    let currentType = gqlType;
    if (currentType?.kind === "NonNullType") {
        currentType = currentType.type;
    }
    // Unwrap List
    if (currentType?.kind === "ListType") {
        return {
            type: "array",
            items: convertGraphQLTypeToJsonSchema(currentType.type, typeRegistry, options),
        };
    }
    // Named type
    if (currentType?.kind === "NamedType") {
        const typeName = currentType.name?.value;
        // Built-in scalar types
        if (typeName === "String") {
            return { type: "string" };
        }
        else if (typeName === "Int") {
            return { type: "integer" };
        }
        else if (typeName === "Float") {
            return { type: "number" };
        }
        else if (typeName === "Boolean") {
            return { type: "boolean" };
        }
        else if (typeName === "ID") {
            return { type: "string", ["x-graphql-type"]: "ID" };
        }
        // Custom types
        if (typeRegistry.has(typeName)) {
            return { $ref: `#/$defs/${typeName}` };
        }
        // Unknown custom type
        return { type: "object", ["x-graphql-type"]: typeName };
    }
    return { type: "string" };
}
function fallbackGraphqlToJsonSchema(graphqlSdl, options) {
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
        if (line.startsWith("type ") && !line.includes("Query") && !line.includes("Mutation")) {
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
            const [field, typePart] = line.split(":").map((segment) => segment.trim());
            const fieldSchema = convertGqlTypeToJson(typePart, options.maxDepth);
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
// --- Core Conversion ------------------------------------------------------------
function convertTypeDefinition(schema, typeName, context) {
    if (!typeName)
        return;
    if (shouldExcludeType(typeName, context.options))
        return;
    if (context.generatedTypes.has(typeName))
        return;
    // Skip types marked with x-graphql-skip
    if (schema["x-graphql-skip"] === true)
        return;
    if (context.generating.has(typeName)) {
        throw new ConversionError(`Circular type resolution detected for ${typeName}`, "CIRCULAR_TYPE");
    }
    context.generating.add(typeName);
    context.building.add(typeName);
    const { options } = context;
    // Handle Relay Connection generation
    if (schema["x-graphql-connection"]) {
        const connectionBase = typeof schema["x-graphql-connection"] === "string"
            ? schema["x-graphql-connection"]
            : typeName;
        ensureConnectionType(connectionBase, context);
    }
    if (schema["x-graphql-enum"] || schema.enum || schema["x-graphql-type"] === "enum") {
        const r = renderEnum(typeName, schema, options);
        if (r)
            context.output.push(r);
    }
    else if (schema.oneOf ||
        schema["x-graphql-union-types"] ||
        schema["x-graphql-type"] === "union") {
        const r = renderUnion(typeName, schema, context);
        if (r)
            context.output.push(r);
    }
    else if (schema.type === "object" ||
        schema.properties ||
        schema.allOf ||
        schema["x-graphql-type"] === "interface" ||
        schema["x-graphql-type"] === "input") {
        const r = renderObject(typeName, schema, context);
        if (r)
            context.output.push(r);
    }
    else if (schema["x-graphql-scalar"] || schema["x-graphql-type"] === "scalar") {
        // Emit scalar declaration for custom scalar types, including $defs entries
        // produced by graphqlToJsonSchema (which annotates scalars with x-graphql-scalar).
        context.output.push(`scalar ${typeName}\n`);
    }
    context.generating.delete(typeName);
    context.building.delete(typeName);
    context.generatedTypes.add(typeName);
}
function renderEnum(typeName, schema, options) {
    const lines = [];
    if (options.includeDescriptions && schema.description) {
        lines.push(formatDescription(schema.description, options));
    }
    lines.push(`enum ${typeName}${formatDirectives(schema, options)} {`);
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
                lines.push(`  ${formatDescription(raw.description, options).trim()}`);
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
        ? `${formatDescription(schema.description, context.options)}\n`
        : "";
    return `${description}union ${typeName}${formatDirectives(schema, context.options)} = ${[
        ...members,
    ].join(" | ")}\n`;
}
function renderObject(typeName, schema, context) {
    const { options } = context;
    const fields = [];
    const properties = schema.properties ?? {};
    const propEntries = options.preserveFieldOrder
        ? Object.entries(properties)
        : Object.entries(properties).sort(([a], [b]) => a.localeCompare(b));
    const required = new Set(schema.required ?? []);
    for (const [propName, propSchema] of propEntries) {
        const field = convertField(propName, propSchema, required.has(propName), context);
        if (field) {
            fields.push(`  ${field}`);
        }
    }
    // If there are no rendered fields, respect the emitEmptyTypes option to
    // avoid emitting empty GraphQL type declarations which are invalid and
    // cause parse errors.
    if (fields.length === 0 && !options.emitEmptyTypes)
        return "";
    const lines = [];
    if (options.includeDescriptions && schema.description) {
        lines.push(formatDescription(schema.description, options));
    }
    const implementsList = collectInterfaces(schema, context);
    const typeKind = (schema["x-graphql-type-kind"] || "").toUpperCase();
    const isInterface = typeKind === "INTERFACE" || schema["x-graphql-type"] === "interface";
    const header = [
        isInterface ? "interface" : "type",
        typeName,
        implementsList.length ? `implements ${implementsList.join(" & ")}` : "",
        formatDirectives(schema, context.options),
    ]
        .filter(Boolean)
        .join(" ");
    lines.push(`${header.replace(/\s+/g, " ").trim()} {`);
    lines.push(...fields);
    lines.push("}\n");
    return lines.join("\n");
}
function toCamelCase(str) {
    return str
        .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
        .replace(/^[A-Z]/, (c) => c.toLowerCase());
}
function convertField(propName, schema, isRequired, context) {
    const { options } = context;
    const description = options.includeDescriptions && schema.description
        ? `${formatDescription(schema.description, options)}\n  `
        : "";
    const fieldName = schema["x-graphql-field-name"] ||
        (options.namingConvention === "PRESERVE" ? propName : toCamelCase(propName));
    const safeFieldName = sanitizeFieldName(fieldName, options.namingConvention);
    const args = formatArgs(schema);
    // Skip field if x-graphql-skip is true
    if (schema["x-graphql-skip"] === true) {
        return null;
    }
    // Check for explicit field nullability override
    const fieldNonNull = schema["x-graphql-field-non-null"];
    const fieldNullable = schema["x-graphql-nullable"];
    let effectiveRequired = isRequired;
    if (typeof fieldNullable === "boolean") {
        effectiveRequired = !fieldNullable;
    }
    else if (typeof fieldNonNull === "boolean") {
        effectiveRequired = fieldNonNull;
    }
    let typeRef = inferGraphQLType(schema, effectiveRequired, context, 0, propName);
    const baseType = stripNonNull(typeRef);
    if (shouldPromoteToId(propName, baseType, schema, options)) {
        typeRef = effectiveRequired ? "ID!" : "ID";
    }
    if (!typeRef)
        return null;
    const directives = formatDirectives(schema, context.options);
    return `${description}${safeFieldName}${args}: ${typeRef}${directives}`;
}
// --- Type inference & $ref resolution ------------------------------------------
function inferGraphQLType(schema, isRequired, context, depth = 0, nameHint) {
    const { options } = context;
    if (depth > options.maxDepth) {
        return isRequired ? "JSON!" : "JSON";
    }
    // Check for field-level type override first, then type-level
    const explicitType = schema["x-graphql-field-type"] ||
        (typeof schema["x-graphql-type"] === "string"
            ? schema["x-graphql-type"]
            : schema["x-graphql-type"]?.name);
    if (explicitType) {
        return finalizeType(explicitType, isRequired);
    }
    if (schema["x-graphql-scalar"]) {
        return finalizeType(sanitizeTypeName(schema["x-graphql-scalar"], options.namingConvention), isRequired);
    }
    const multiType = Array.isArray(schema.type) ? schema.type : null;
    if (multiType && multiType.length > 1) {
        return finalizeType("JSON", isRequired);
    }
    if (schema.oneOf || schema.anyOf || schema.allOf) {
        return finalizeType("JSON", isRequired);
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
            return finalizeType(mapStringFormat(schema.format, context), isRequired);
        case "integer":
            return finalizeType("Int", isRequired);
        case "number":
            return finalizeType(schema.format === "float" ? "Float" : "Float", isRequired);
        case "boolean":
            return finalizeType("Boolean", isRequired);
        case "null":
            return finalizeType("JSON", isRequired);
        case "array": {
            const items = schema.items ?? {};
            // Check for explicit list item nullability
            const listItemNonNull = schema["x-graphql-field-list-item-non-null"];
            const itemRequired = typeof listItemNonNull === "boolean" ? listItemNonNull : false;
            const itemType = inferGraphQLType(items, itemRequired, context, depth + 1, nameHint);
            return finalizeType(`[${itemType}]`, isRequired);
        }
        case "object": {
            const fallback = nameHint ?? propFallbackName(schema);
            const isAnonymous = !schema.title && !schema["x-graphql-type-name"] && !schema["x-graphql-type"];
            const propCount = Object.keys(schema.properties ?? {}).length;
            const inlineThreshold = typeof schema["x-graphql-inline-object-threshold"] === "number"
                ? schema["x-graphql-inline-object-threshold"]
                : options.inlineObjectThreshold;
            // Only inline anonymous objects without name hints when explicitly allowed by threshold.
            const shouldInline = !nameHint &&
                isAnonymous &&
                inlineThreshold > 0 &&
                propCount <= inlineThreshold &&
                !(schema.required && schema.required.length > 0) &&
                !schema.oneOf &&
                !schema.anyOf &&
                !schema.allOf;
            if (shouldInline) {
                return finalizeType("JSON", isRequired);
            }
            let typeName = getTypeName(schema, context, fallback);
            // If this is an anonymous nested object (uses the generic fallback),
            // generate a unique inline type name to avoid collisions and circular
            // resolution when the same fallback name would otherwise be reused.
            if (typeName && fallback === "NestedObject") {
                typeName = uniqueInlineTypeName(fallback, context, options.namingConvention);
            }
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
    const { schema: target, pointer } = resolveRef(refPath, context);
    if (!target || typeof target !== "object") {
        return null;
    }
    const primitive = derivePrimitiveGraphQLType(target, context);
    if (primitive) {
        return primitive;
    }
    if (context.typeNames.has(pointer)) {
        return context.typeNames.get(pointer);
    }
    const fallback = pointerLastSegment(refPath);
    const inferredName = getTypeName(target, context, fallback);
    if (!inferredName) {
        return null;
    }
    // If the type is currently being generated, we have a circular reference.
    // We can just return the inferred name instead of trying to generate it again.
    if (context.generating.has(inferredName)) {
        return inferredName;
    }
    convertTypeDefinition(target, inferredName, context);
    return inferredName;
}
function resolveRef(refPath, context, visited = new Set()) {
    if (!refPath.startsWith("#")) {
        // Treat external refs as opaque objects; derive a stable name according
        // to the configured `refNaming` strategy to avoid collisions.
        const strategy = context.options.refNaming || "basename";
        const rawSegments = refPath.split("/").filter(Boolean);
        let rawName = rawSegments[rawSegments.length - 1] ?? "ExternalType";
        if (strategy === "file_and_path") {
            rawName = rawSegments.slice(Math.max(0, rawSegments.length - 2)).join("_");
        }
        else if (strategy === "hash") {
            // FNV-1a 32-bit hash, base36 encoded for compactness
            let h = 2166136261 >>> 0;
            for (let i = 0; i < refPath.length; i++) {
                h ^= refPath.charCodeAt(i);
                h = Math.imul(h, 16777619) >>> 0;
            }
            rawName = `H${h.toString(36)}`;
        }
        rawName = rawName.replace(/\.schema\.json$/i, "");
        const pascalName = sanitizeTypeName(rawName, context.options.namingConvention);
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
        if (!part)
            continue;
        // If current node has $ref, resolve it first (recursive)
        if (current && typeof current === "object" && current.$ref) {
            const resolved = resolveRef(current.$ref, context, visited);
            current = resolved.schema;
        }
        // Try to get property with fallbacks
        let next = accessChild(current, part);
        if (next === undefined && current && typeof current === "object") {
            // Try snake_case
            const snake = camelToSnake(part);
            next = accessChild(current, snake);
            // Try camelCase
            if (next === undefined) {
                const camel = snakeToCamel(part);
                next = accessChild(current, camel);
            }
        }
        current = next;
        if (current === undefined) {
            throw new ConversionError(`Failed to resolve $ref segment '${part}' in ${refPath}`, "INVALID_REF");
        }
    }
    return { schema: current, pointer };
}
// --- Operations & Scalars ------------------------------------------------------
function emitImpliedScalars(context) {
    if (context.usedScalars.size === 0)
        return;
    const scalars = context.rootSchema["x-graphql-scalars"];
    const existing = new Set(Object.keys(scalars || {}));
    // Standard GraphQL scalars to exclude
    const standardScalars = new Set(["String", "Int", "Float", "Boolean", "ID"]);
    const lines = [];
    let addedHeader = false;
    for (const scalar of context.usedScalars) {
        if (existing.has(scalar))
            continue;
        if (context.generatedTypes.has(scalar))
            continue;
        if (standardScalars.has(scalar))
            continue;
        if (!addedHeader) {
            lines.push("# Implied Scalars");
            addedHeader = true;
        }
        lines.push(`scalar ${scalar}`);
    }
    if (lines.length > 0) {
        // Determine where to insert:
        // If Custom Scalars are emitted first, append after them.
        // However, context.output has everything mixed.
        // Simple approach: unshift to top, or append to end.
        // Appending to end is safer for now.
        context.output.push(lines.join("\n") + "\n");
    }
}
function emitCustomScalars(schema, context) {
    const scalars = schema["x-graphql-scalars"];
    if (!scalars || typeof scalars !== "object")
        return;
    context.output.push("# Custom Scalars");
    for (const [scalarName, scalarDef] of Object.entries(scalars)) {
        if (scalarDef.description && context.options.includeDescriptions) {
            context.output.push(formatDescription(scalarDef.description, context.options));
        }
        context.output.push(`scalar ${toPascalCase(scalarName)}\n`);
    }
}
function emitOperations(schema, context) {
    const ops = schema["x-graphql-operations"];
    if (!ops)
        return;
    if (ops.queries && shouldExcludeType("Query", context.options)) {
        // Skip if filtered
    }
    else if (ops.queries) {
        const lines = ["type Query {"];
        for (const [name, def] of Object.entries(ops.queries)) {
            if (def.description && context.options.includeDescriptions) {
                lines.push(`  ${formatDescription(def.description, context.options).trim()}`);
            }
            const args = formatOperationArgs(def.args);
            const resultType = def.type ?? "String";
            lines.push(`  ${name}${args}: ${resultType}`);
        }
        lines.push("}\n");
        context.output.push(lines.join("\n"));
    }
    if (ops.mutations && shouldExcludeType("Mutation", context.options)) {
        // Skip if filtered
    }
    else if (ops.mutations) {
        const lines = ["type Mutation {"];
        for (const [name, def] of Object.entries(ops.mutations)) {
            if (def.description && context.options.includeDescriptions) {
                lines.push(`  ${formatDescription(def.description, context.options).trim()}`);
            }
            const args = formatOperationArgs(def.args);
            const resultType = def.type ?? "String";
            lines.push(`  ${name}${args}: ${resultType}`);
        }
        lines.push("}\n");
        context.output.push(lines.join("\n"));
    }
    if (ops.subscriptions && shouldExcludeType("Subscription", context.options)) {
        // Skip if filtered
    }
    else if (ops.subscriptions) {
        const lines = ["type Subscription {"];
        for (const [name, rawDef] of Object.entries(ops.subscriptions)) {
            const def = rawDef;
            if (def.description && context.options.includeDescriptions) {
                lines.push(`  ${formatDescription(def.description, context.options).trim()}`);
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
    const validate = options.validate ?? true;
    const includeDescriptions = options.includeDescriptions ?? true;
    const preserveFieldOrder = options.preserveFieldOrder ?? true;
    const namingConvention = options.namingConvention ?? "GRAPHQL_IDIOMATIC";
    const inferIds = options.inferIds ?? false;
    const requestedIdStrategy = options.idStrategy ?? "NONE";
    const idStrategy = requestedIdStrategy !== "NONE" ? requestedIdStrategy : inferIds ? "COMMON_PATTERNS" : "NONE";
    const outputFormat = options.outputFormat ?? "SDL";
    const failOnWarning = options.failOnWarning ?? false;
    const includeFederationDirectives = options.includeFederationDirectives ?? true;
    const federationVersion = options.federationVersion ?? "V2";
    const maxDepth = options.maxDepth ?? 25;
    const excludeTypes = Array.from(new Set(options.excludeTypes ?? ["Query", "Mutation", "Subscription", "PageInfo"]));
    const excludePatterns = Array.from(new Set(options.excludePatterns ?? []));
    const excludeRegexes = excludePatterns.map((pattern) => new RegExp(pattern));
    const descriptionBlockThreshold = options.descriptionBlockThreshold ?? 80;
    const emitEmptyTypes = options.emitEmptyTypes ?? false;
    const inlineObjectThreshold = options.inlineObjectThreshold ?? 3;
    const refNaming = options.refNaming ?? "basename";
    const excludeTypeSuffixes = options.excludeTypeSuffixes ?? [
        "Filter",
        "Sort",
        "SortInput",
        "FilterInput",
        "Connection",
        "Edge",
        "Payload",
        "Args",
    ];
    const includeOperationalTypes = options.includeOperationalTypes ?? false;
    return {
        excludeTypeSuffixes,
        includeOperationalTypes,
        validate,
        includeDescriptions,
        preserveFieldOrder,
        namingConvention,
        inferIds,
        idStrategy,
        outputFormat,
        failOnWarning,
        includeFederationDirectives,
        maxDepth,
        federationVersion,
        excludeTypes,
        excludePatterns,
        excludeRegexes,
        descriptionBlockThreshold,
        emitEmptyTypes,
        inlineObjectThreshold,
        refNaming,
    };
}
function detectFederationVersion(schema) {
    const stack = [schema];
    while (stack.length) {
        const current = stack.pop();
        if (!current || typeof current !== "object")
            continue;
        if (current["x-graphql-federation-keys"] ||
            current["x-graphql-federation-shareable"] ||
            current["x-graphql-federation-inaccessible"] ||
            current["x-graphql-federation-authenticated"] ||
            current["x-graphql-federation-interface-object"] ||
            current["x-graphql-federation-requires-scopes"]) {
            return "V2";
        }
        const directives = current["x-graphql-directives"];
        if (Array.isArray(directives)) {
            for (const dir of directives) {
                const name = dir?.name;
                if (name === "key" ||
                    name === "shareable" ||
                    name === "inaccessible" ||
                    name === "extends") {
                    return "V2";
                }
            }
        }
        if (current.properties) {
            stack.push(...Object.values(current.properties));
        }
        if (current.items && typeof current.items === "object") {
            stack.push(current.items);
        }
        if (Array.isArray(current.oneOf))
            stack.push(...current.oneOf);
        if (Array.isArray(current.anyOf))
            stack.push(...current.anyOf);
        if (Array.isArray(current.allOf))
            stack.push(...current.allOf);
        if (current.$defs)
            stack.push(...Object.values(current.$defs));
        if (current.definitions)
            stack.push(...Object.values(current.definitions));
    }
    return "NONE";
}
export class Converter {
    async convert(input) {
        try {
            const jsonSchema = typeof input.jsonSchema === "string" ? JSON.parse(input.jsonSchema) : input.jsonSchema;
            const rawOptions = (input.options ?? {});
            const normalized = normalizeOptions(rawOptions);
            const resolvedFederation = normalized.federationVersion === "AUTO"
                ? detectFederationVersion(jsonSchema)
                : normalized.federationVersion;
            const resolvedOptions = {
                ...normalized,
                federationVersion: resolvedFederation,
            };
            const sdl = jsonSchemaToGraphQL(jsonSchema, resolvedOptions);
            let output = sdl;
            if (resolvedOptions.outputFormat === "AST_JSON") {
                if (!sdl) {
                    output = "null";
                }
                else {
                    const ast = parse(sdl, { noLocation: true });
                    output = JSON.stringify(ast);
                }
            }
            const diagnostics = [];
            const warningCount = diagnostics.filter((d) => d.severity === "WARNING").length;
            const errorCount = diagnostics.filter((d) => d.severity === "ERROR").length;
            const success = errorCount === 0 && (!resolvedOptions.failOnWarning || warningCount === 0);
            return {
                output,
                diagnostics,
                success,
                errorCount,
                warningCount,
            };
        }
        catch (error) {
            const diagnostic = {
                severity: "ERROR",
                kind: "OTHER",
                message: error.message || String(error),
                path: null,
                code: "CONVERSION_ERROR",
            };
            return {
                output: null,
                diagnostics: [diagnostic],
                success: false,
                errorCount: 1,
                warningCount: 0,
            };
        }
    }
}
function getTypeName(schema, contextOrFallback, fallbackArg) {
    let context;
    let fallback;
    if (contextOrFallback && typeof contextOrFallback.options === "object") {
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
        // If explicit type is "scalar", don't treat it as the name.
        // This allows x-graphql-type: "scalar" to indicate kind only.
        if (typeOverride.trim() !== "scalar") {
            const name = typeOverride.trim();
            // Trust x-graphql-type as-is when it's already a valid GraphQL identifier
            // (only letters, digits, underscores). This prevents toPascalCase from
            // mangling internal capitalisation such as "DateTime" → "Datetime".
            if (/^[_a-zA-Z][_a-zA-Z0-9]*$/.test(name))
                return name;
            return sanitizeTypeName(name, namingConvention);
        }
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
// Generate a unique type name for anonymous inlined objects when the
// fallback is the generic `NestedObject` to avoid accidental name
// collisions which can lead to circular resolution during conversion.
function uniqueInlineTypeName(fallback, context, namingConvention = "GRAPHQL_IDIOMATIC") {
    const base = sanitizeTypeName(fallback, namingConvention);
    if (!context)
        return base;
    let candidate = base;
    let i = 1;
    while (context.generatedTypes.has(candidate) || context.generating.has(candidate)) {
        candidate = `${base}${i}`;
        i += 1;
    }
    return candidate;
}
function sanitizeTypeName(value, namingConvention = "GRAPHQL_IDIOMATIC") {
    if (namingConvention === "PRESERVE") {
        let v = value.replace(/[^a-zA-Z0-9_]/g, "_");
        if (/^[0-9]/.test(v))
            v = `_${v}`;
        return v;
    }
    return value
        .replace(/[_]+/g, " ")
        .replace(/[^a-zA-Z0-9]+/g, " ")
        .split(" ")
        .filter(Boolean)
        .map(toPascalCase)
        .join("")
        .replace(/[^_0-9A-Za-z]/g, "_")
        .replace(/^([0-9]+)/, "_$1");
}
function sanitizeFieldName(name, namingConvention) {
    let base;
    if (namingConvention === "PRESERVE") {
        base = name.replace(/[^a-zA-Z0-9_]/g, "_");
    }
    else {
        // Replace non alphanumeric chunks with spaces so toCamelCase converts them
        base = toCamelCase(name.replace(/[^a-zA-Z0-9]+/g, " "));
    }
    // Ensure it starts with a letter or underscore and contains only valid chars
    const cleaned = base.replace(/[^_0-9A-Za-z]/g, "_");
    return /^[A-Za-z_]/.test(cleaned) ? cleaned : `_${cleaned}`;
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
function derivePrimitiveGraphQLType(schema, context) {
    if (!schema || typeof schema !== "object") {
        return null;
    }
    const explicit = typeof schema["x-graphql-type"] === "string"
        ? schema["x-graphql-type"]
        : schema["x-graphql-type"]?.name;
    if (explicit) {
        if (context && context.generatedTypes.has(explicit)) {
            // It's a type we generated, not a primitive/scalar necessarily
            // But if it IS a scalar type we generated, we might want to track it?
            // For now, assume explicit types are handled.
        }
        return explicit;
    }
    if (schema["x-graphql-scalar"]) {
        const sName = toPascalCase(schema["x-graphql-scalar"]);
        if (context)
            context.usedScalars.add(sName);
        return sName;
    }
    const schemaType = Array.isArray(schema.type)
        ? schema.type.length > 1
            ? null
            : schema.type[0]
        : schema.type;
    switch (schemaType) {
        case "string":
            return mapStringFormat(schema.format, context);
        case "integer":
            return "Int";
        case "number":
            return schema.format === "float" ? "Float" : "Float";
        case "boolean":
            return "Boolean";
        case "array": {
            const itemType = derivePrimitiveGraphQLType(schema.items ?? {}, context);
            return itemType ? `[${itemType}]` : null;
        }
        default:
            return null;
    }
}
function mapStringFormat(format, context) {
    switch (format) {
        case "date-time":
            if (context)
                context.usedScalars.add("DateTime");
            return "DateTime";
        case "date":
            if (context)
                context.usedScalars.add("Date");
            return "Date";
        case "time":
            if (context)
                context.usedScalars.add("Time");
            return "Time";
        case "email":
            if (context)
                context.usedScalars.add("Email");
            return "Email";
        case "uuid":
            return "ID";
        case "uri":
        case "url":
            if (context)
                context.usedScalars.add("URI");
            return "URI";
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
function stripNonNull(typeName) {
    return typeName.endsWith("!") ? typeName.slice(0, -1) : typeName;
}
function shouldPromoteToId(propName, baseType, schema, options) {
    const strategy = options.idStrategy;
    if (strategy === "NONE")
        return false;
    if (baseType !== "String")
        return false;
    const nameLower = propName.toLowerCase();
    if (strategy === "COMMON_PATTERNS") {
        return nameLower === "id" || nameLower === "_id" || nameLower.endsWith("id");
    }
    // ALL_STRINGS: any string-like field qualifies unless explicitly typed otherwise
    return (schema.type === undefined ||
        schema.type === "string" ||
        (Array.isArray(schema.type) && schema.type.includes("string")));
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
function formatDescription(description, options) {
    const BLOCK_THRESHOLD = options?.descriptionBlockThreshold ?? 80;
    const shouldBlock = description.includes("\n") || description.length >= BLOCK_THRESHOLD;
    if (shouldBlock) {
        return `"""${description.replace(/"""/g, '\\"""')}"""`;
    }
    return `"${description.replace(/"/g, '\\"')}"`;
}
function formatDirectives(schema, options) {
    const directives = extractDirectives(schema, options);
    return printDirectives(directives);
}
// oxlint-disable-next-line no-unused-vars
function isFederationDirective(name) {
    return (name === "key" ||
        name === "shareable" ||
        name === "inaccessible" ||
        name === "requiresScopes" ||
        name === "authenticated" ||
        name === "interfaceObject");
}
function formatArgs(schema) {
    const args = schema["x-graphql-args"] ||
        schema["x-graphql-arguments"] ||
        schema["x-graphql-field-arguments"];
    if (!args)
        return "";
    const entries = Object.entries(args).map(([name, rawDef]) => {
        const def = rawDef;
        const configuredType = def.type ?? (typeof def["x-graphql-type"] === "string" ? def["x-graphql-type"] : undefined);
        const argType = configuredType ?? "String";
        const defaultValue = def.default !== undefined ? ` = ${JSON.stringify(def.default)}` : "";
        return `${name}: ${argType}${defaultValue}`;
    });
    return entries.length ? `(${entries.join(", ")})` : "";
}
function formatOperationArgs(args) {
    if (!args)
        return "";
    const rendered = Object.entries(args).map(([name, rawDef]) => {
        const def = rawDef;
        const configuredType = def.type ?? (typeof def["x-graphql-type"] === "string" ? def["x-graphql-type"] : undefined);
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