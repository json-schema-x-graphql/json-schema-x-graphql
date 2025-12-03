/**
 * JSON Schema <-> GraphQL Converter with deep $ref resolution.
 *
 * This module normalizes converter options, resolves nested JSON Pointer references,
 * and produces deterministic GraphQL SDL output that mirrors the behavior of the
 * Rust implementation as closely as possible.
 */

export interface ConverterOptions {
  validate?: boolean;
  includeDescriptions?: boolean;
  preserveFieldOrder?: boolean;
  federationVersion?: number;
  maxDepth?: number;
  excludeTypes?: string[];
  excludePatterns?: string[];
}

interface NormalizedConverterOptions extends Required<ConverterOptions> {
  excludeTypes: string[];
  excludePatterns: string[];
  excludeRegexes: RegExp[];
}

interface JsonSchema {
  $schema?: string;
  title?: string;
  description?: string;
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  $ref?: string;
  enum?: (string | number)[];
  format?: string;
  $defs?: Record<string, JsonSchema>;
  definitions?: Record<string, JsonSchema>;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  "x-graphql-arguments"?: Record<string, GraphQLArgumentConfig>;
  "x-graphql-directives"?: GraphQLDirective[];
  "x-graphql-enum"?: GraphQLEnumConfig;
  "x-graphql-field-name"?: string;
  "x-graphql-implements"?: string[];
  "x-graphql-operations"?: GraphQLOperations;
  "x-graphql-scalar"?: string;
  "x-graphql-scalars"?: Record<string, GraphQLScalarConfig>;
  "x-graphql-type"?: string | { name?: string };
  "x-graphql-type-implements"?: string[];
  "x-graphql-type-name"?: string;
  "x-graphql-union-types"?: string[];
  [key: string]: any;
}

interface GraphQLArgumentConfig {
  type?: string;
  "x-graphql-type"?: string;
  default?: unknown;
  [key: string]: unknown;
}

interface GraphQLOperationArg extends GraphQLArgumentConfig {}

interface GraphQLDirective {
  name?: string;
  arguments?: Record<string, unknown>;
}

interface GraphQLEnumValue {
  name?: string;
  value?: string | number;
  description?: string;
}

interface GraphQLEnumConfig {
  values?: Array<string | number | GraphQLEnumValue>;
}

interface GraphQLOperationField {
  description?: string;
  type?: string;
  args?: Record<string, GraphQLOperationArg>;
}

interface GraphQLOperations {
  queries?: Record<string, GraphQLOperationField>;
  mutations?: Record<string, GraphQLOperationField>;
}

interface GraphQLScalarConfig {
  description?: string;
  [key: string]: unknown;
}

interface ConversionContext {
  rootSchema: JsonSchema;
  options: NormalizedConverterOptions;
  generatedTypes: Set<string>;
  generating: Set<string>;
  output: string[];
}

type JsonSchemaInput = string | JsonSchema;

class ConversionError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ConversionError";
  }
}

// --- Public API ----------------------------------------------------------------

export function jsonSchemaToGraphQL(
  jsonSchemaInput: JsonSchemaInput,
  options: ConverterOptions = {},
): string {
  const schema =
    typeof jsonSchemaInput === "string"
      ? (JSON.parse(jsonSchemaInput) as JsonSchema)
      : jsonSchemaInput;

  const normalized = normalizeOptions(options);
  const context: ConversionContext = {
    rootSchema: schema,
    options: normalized,
    generatedTypes: new Set<string>(),
    generating: new Set<string>(),
    output: [],
  };

  emitCustomScalars(schema, context);

  const definitions = schema.$defs || schema.definitions;
  if (definitions) {
    const entries = normalized.preserveFieldOrder
      ? Object.entries(definitions)
      : Object.entries(definitions).sort(([a], [b]) => a.localeCompare(b));

    for (const [defKey, defSchema] of entries) {
      const typeName = getTypeName(defSchema, defKey);
      convertTypeDefinition(defSchema, typeName, context);
    }
  }

  const rootTypeName = getTypeName(schema, schema.title ?? "Root");
  convertTypeDefinition(schema, rootTypeName, context);

  emitOperations(schema, context);

  const finalSDL = context.output
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!finalSDL) {
    throw new ConversionError(
      "No GraphQL types found in schema. Provide x-graphql-type-name or $defs entries.",
      "NO_TYPES",
    );
  }

  return finalSDL;
}

export function graphqlToJsonSchema(
  graphqlSdl: string,
  options: ConverterOptions = {},
): string {
  const normalized = normalizeOptions(options);
  const schema: JsonSchema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: {},
    required: [],
  };

  const lines = graphqlSdl.split("\n");
  let currentType: string | null = null;
  let description: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    if (line.startsWith('"""')) {
      description = line.replace(/"""?/g, "").trim();
      continue;
    }

    if (line.startsWith('"') && line.endsWith('"')) {
      description = line.slice(1, -1);
      continue;
    }

    if (
      line.startsWith("type ") &&
      !line.includes("Query") &&
      !line.includes("Mutation")
    ) {
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
      schema.properties![field] = fieldSchema;
      if (typePart.endsWith("!")) {
        schema.required!.push(field);
      }
    }
  }

  return JSON.stringify(schema, null, 2);
}

// --- Core Conversion ------------------------------------------------------------

function convertTypeDefinition(
  schema: JsonSchema,
  typeName: string | null,
  context: ConversionContext,
) {
  if (!typeName) return;
  if (!shouldIncludeType(typeName, context.options)) return;
  if (context.generatedTypes.has(typeName)) return;

  if (context.generating.has(typeName)) {
    throw new ConversionError(
      `Circular type resolution detected for ${typeName}`,
      "CIRCULAR_TYPE",
    );
  }

  context.generating.add(typeName);
  const { options } = context;

  if (schema["x-graphql-enum"] || schema.enum) {
    context.output.push(renderEnum(typeName, schema, options));
  } else if (schema.oneOf || schema["x-graphql-union-types"]) {
    context.output.push(renderUnion(typeName, schema, context));
  } else if (schema.type === "object" || schema.properties || schema.allOf) {
    context.output.push(renderObject(typeName, schema, context));
  } else if (schema["x-graphql-type"] === "scalar") {
    context.output.push(`scalar ${typeName}\n`);
  }

  context.generating.delete(typeName);
  context.generatedTypes.add(typeName);
}

function renderEnum(
  typeName: string,
  schema: JsonSchema,
  options: NormalizedConverterOptions,
): string {
  const lines: string[] = [];
  if (options.includeDescriptions && schema.description) {
    lines.push(formatDescription(schema.description));
  }

  lines.push(`enum ${typeName}${formatDirectives(schema)} {`);
  const values = schema["x-graphql-enum"]?.values ?? schema.enum ?? [];
  for (const raw of values) {
    if (typeof raw === "object" && raw !== null) {
      const valName = raw.name ?? raw.value;
      if (!valName) continue;
      if (raw.description && options.includeDescriptions) {
        lines.push(`  ${formatDescription(raw.description).trim()}`);
      }
      lines.push(`  ${valName}`);
    } else {
      lines.push(
        `  ${String(raw)
          .replace(/[^_a-zA-Z0-9]/g, "_")
          .toUpperCase()}`,
      );
    }
  }
  lines.push("}\n");
  return lines.join("\n");
}

function renderUnion(
  typeName: string,
  schema: JsonSchema,
  context: ConversionContext,
): string {
  const members = new Set<string>();

  const explicit = schema["x-graphql-union-types"];
  if (Array.isArray(explicit)) {
    explicit.forEach((t: string) => members.add(t));
  }

  if (schema.oneOf) {
    for (const memberSchema of schema.oneOf) {
      if (memberSchema.$ref) {
        const memberName = ensureReferencedType(memberSchema.$ref, context);
        if (memberName) members.add(memberName);
      } else {
        const inferred = getTypeName(memberSchema, undefined);
        if (inferred) {
          convertTypeDefinition(memberSchema, inferred, context);
          members.add(inferred);
        }
      }
    }
  }

  if (!members.size) {
    throw new ConversionError(
      `Union ${typeName} must have at least one member`,
      "EMPTY_UNION",
    );
  }

  const description =
    context.options.includeDescriptions && schema.description
      ? `${formatDescription(schema.description)}\n`
      : "";

  return `${description}union ${typeName}${formatDirectives(schema)} = ${[
    ...members,
  ].join(" | ")}\n`;
}

function renderObject(
  typeName: string,
  schema: JsonSchema,
  context: ConversionContext,
): string {
  const { options } = context;
  const lines: string[] = [];

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
    const field = convertField(
      propName,
      propSchema,
      required.has(propName),
      context,
    );
    if (field) {
      lines.push(`  ${field}`);
    }
  }

  lines.push("}\n");
  return lines.join("\n");
}

function convertField(
  propName: string,
  schema: JsonSchema,
  isRequired: boolean,
  context: ConversionContext,
): string | null {
  const { options } = context;
  const description =
    options.includeDescriptions && schema.description
      ? `${formatDescription(schema.description)}\n  `
      : "";

  const fieldName = schema["x-graphql-field-name"] ?? propName;
  const args = formatArgs(schema);
  const typeRef = inferGraphQLType(schema, isRequired, context);
  if (!typeRef) return null;

  const directives = formatDirectives(schema);
  return `${description}${fieldName}${args}: ${typeRef}${directives}`;
}

// --- Type inference & $ref resolution ------------------------------------------

function inferGraphQLType(
  schema: JsonSchema,
  isRequired: boolean,
  context: ConversionContext,
  depth = 0,
): string {
  const { options } = context;
  if (depth > options.maxDepth) {
    return isRequired ? "JSON!" : "JSON";
  }

  const explicitType =
    typeof schema["x-graphql-type"] === "string"
      ? schema["x-graphql-type"]
      : schema["x-graphql-type"]?.name;

  if (explicitType) {
    return finalizeType(explicitType, isRequired);
  }

  if (schema["x-graphql-scalar"]) {
    return finalizeType(toPascalCase(schema["x-graphql-scalar"]), isRequired);
  }

  if (schema.$ref) {
    const typeName = ensureReferencedType(schema.$ref, context);
    const fallback = pointerLastSegment(schema.$ref);
    const resolvedName = typeName ?? toPascalCase(fallback);
    return finalizeType(resolvedName, isRequired);
  }

  const typeValue = Array.isArray(schema.type) ? schema.type[0] : schema.type;

  switch (typeValue) {
    case "string":
      return finalizeType(mapStringFormat(schema.format), isRequired);
    case "integer":
      return finalizeType("Int", isRequired);
    case "number":
      return finalizeType(
        schema.format === "float" ? "Float" : "Float",
        isRequired,
      );
    case "boolean":
      return finalizeType("Boolean", isRequired);
    case "array": {
      const items = schema.items ?? {};
      const itemType = inferGraphQLType(items, false, context, depth + 1);
      return finalizeType(`[${itemType}]`, isRequired);
    }
    case "object": {
      const typeName =
        schema["x-graphql-type-name"] ??
        schema.title ??
        toPascalCase(propFallbackName(schema));
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

function ensureReferencedType(
  refPath: string,
  context: ConversionContext,
): string | null {
  const { schema: target } = resolveRef(refPath, context);
  if (!target || typeof target !== "object") {
    return null;
  }

  const primitive = derivePrimitiveGraphQLType(target);
  if (primitive) {
    return primitive;
  }

  const fallback = pointerLastSegment(refPath);
  const inferredName = getTypeName(target, fallback);
  if (!inferredName) {
    return null;
  }

  convertTypeDefinition(target, inferredName, context);
  return inferredName;
}

function resolveRef(
  refPath: string,
  context: ConversionContext,
  visited: Set<string> = new Set(),
): { schema: JsonSchema; pointer: string } {
  if (!refPath.startsWith("#")) {
    throw new ConversionError(
      `External $ref not supported: ${refPath}`,
      "UNSUPPORTED_REF",
    );
  }

  if (visited.has(refPath)) {
    throw new ConversionError(
      `Circular $ref detected: ${refPath}`,
      "CIRCULAR_REF",
    );
  }

  visited.add(refPath);

  const pointer = refPath.slice(1);
  if (!pointer) {
    return { schema: context.rootSchema, pointer: "" };
  }

  const parts = pointer.split("/").filter(Boolean).map(decodePointerSegment);
  let current: any = context.rootSchema;

  for (const part of parts) {
    if (current && typeof current === "object" && current.$ref) {
      const resolved = resolveRef(current.$ref, context, visited);
      current = resolved.schema;
    }

    current = accessChild(current, part);
    if (current === undefined) {
      throw new ConversionError(
        `Failed to resolve $ref segment '${part}' in ${refPath}`,
        "INVALID_REF",
      );
    }
  }

  return { schema: current as JsonSchema, pointer };
}

// --- Operations & Scalars ------------------------------------------------------

function emitCustomScalars(schema: JsonSchema, context: ConversionContext) {
  const scalars = schema["x-graphql-scalars"];
  if (!scalars || typeof scalars !== "object") return;

  context.output.push("# Custom Scalars");
  for (const [scalarName, scalarDef] of Object.entries(scalars)) {
    if (scalarDef.description && context.options.includeDescriptions) {
      context.output.push(formatDescription(scalarDef.description));
    }
    context.output.push(`scalar ${toPascalCase(scalarName)}\n`);
  }
}

function emitOperations(schema: JsonSchema, context: ConversionContext) {
  const ops = schema["x-graphql-operations"];
  if (!ops) return;

  if (ops.queries && !shouldIncludeType("Query", context.options)) {
    // Skip if filtered
  } else if (ops.queries) {
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
  } else if (ops.mutations) {
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

function normalizeOptions(
  options: ConverterOptions,
): NormalizedConverterOptions {
  const defaults: Required<ConverterOptions> = {
    validate: false,
    includeDescriptions: true,
    preserveFieldOrder: true,
    federationVersion: 2,
    maxDepth: 25,
    excludeTypes: [],
    excludePatterns: [],
  };

  const merged = { ...defaults, ...options };
  const excludeTypes = Array.from(new Set(merged.excludeTypes ?? []));
  const excludePatterns = Array.from(new Set(merged.excludePatterns ?? []));
  const excludeRegexes = excludePatterns.map((pattern) => new RegExp(pattern));

  return {
    ...merged,
    excludeTypes,
    excludePatterns,
    excludeRegexes,
  };
}

function shouldIncludeType(
  typeName: string,
  options: NormalizedConverterOptions,
): boolean {
  if (!typeName) return false;
  if (options.excludeTypes.includes(typeName)) return false;
  return !options.excludeRegexes.some((regex) => regex.test(typeName));
}

function getTypeName(schema: JsonSchema, fallback?: string): string | null {
  const explicitName = schema["x-graphql-type-name"];
  if (typeof explicitName === "string" && explicitName.trim()) {
    return explicitName.trim();
  }

  const typeOverride = schema["x-graphql-type"];
  if (typeof typeOverride === "string" && typeOverride.trim()) {
    return sanitizeTypeName(typeOverride);
  }
  if (
    typeof typeOverride === "object" &&
    typeOverride !== null &&
    typeof typeOverride.name === "string" &&
    typeOverride.name.trim()
  ) {
    return sanitizeTypeName(typeOverride.name);
  }

  if (schema.title) {
    return sanitizeTypeName(schema.title);
  }

  if (fallback) return sanitizeTypeName(fallback);
  return null;
}

function sanitizeTypeName(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9_]/g, " ")
    .split(" ")
    .map(toPascalCase)
    .join("");
}

function propFallbackName(schema: JsonSchema): string {
  if (schema["$id"]) return schema["$id"];
  return "NestedObject";
}

function pointerLastSegment(refPath: string): string {
  const parts = refPath.split("/").filter(Boolean);
  return decodePointerSegment(parts[parts.length - 1] ?? "Unknown");
}

function decodePointerSegment(segment: string): string {
  return segment.replace(/~1/g, "/").replace(/~0/g, "~");
}

function accessChild(node: any, key: string): any {
  if (Array.isArray(node)) {
    const index = Number(key);
    if (Number.isNaN(index)) return undefined;
    return node[index];
  }
  return node?.[key];
}

function derivePrimitiveGraphQLType(schema: JsonSchema): string | null {
  if (!schema || typeof schema !== "object") {
    return null;
  }

  const explicit =
    typeof schema["x-graphql-type"] === "string"
      ? (schema["x-graphql-type"] as string)
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

function mapStringFormat(format?: string): string {
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

function finalizeType(typeName: string, required: boolean): string {
  if (!typeName) return required ? "String!" : "String";
  if (required && !typeName.endsWith("!")) {
    return `${typeName}!`;
  }
  return typeName;
}

function collectInterfaces(
  schema: JsonSchema,
  context: ConversionContext,
): string[] {
  const implementsList = new Set<string>();

  const explicit =
    schema["x-graphql-implements"] ?? schema["x-graphql-type-implements"];
  if (Array.isArray(explicit)) {
    explicit.forEach((iface: string) => implementsList.add(iface));
  }

  if (Array.isArray(schema.allOf)) {
    for (const entry of schema.allOf) {
      if (entry.$ref) {
        const iface = ensureReferencedType(entry.$ref, context);
        if (iface) implementsList.add(iface);
      }
    }
  }

  return [...implementsList];
}

function formatDescription(description: string): string {
  if (description.includes("\n")) {
    return `"""${description.replace(/"""/g, '\\"""')}"""`;
  }
  return `"${description.replace(/"/g, '\\"')}"`;
}

function formatDirectives(schema: JsonSchema): string {
  const directives = schema["x-graphql-directives"];
  if (!Array.isArray(directives) || directives.length === 0) {
    return "";
  }

  const parts = directives.map((dir) => {
    if (!dir?.name) return "";
    const args = dir.arguments
      ? `(${Object.entries(dir.arguments)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join(", ")})`
      : "";
    return `@${dir.name}${args}`;
  });

  const joined = parts.filter(Boolean).join(" ");
  return joined ? ` ${joined}` : "";
}

function formatArgs(schema: JsonSchema): string {
  const args = schema["x-graphql-arguments"];
  if (!args) return "";

  const entries = Object.entries(args).map(([name, def]) => {
    const configuredType =
      def.type ??
      (typeof def["x-graphql-type"] === "string"
        ? def["x-graphql-type"]
        : undefined);
    const argType = configuredType ?? "String";
    const defaultValue =
      def.default !== undefined ? ` = ${JSON.stringify(def.default)}` : "";
    return `${name}: ${argType}${defaultValue}`;
  });

  return entries.length ? `(${entries.join(", ")})` : "";
}

function formatOperationArgs(
  args?: Record<string, GraphQLOperationArg>,
): string {
  if (!args) return "";
  const rendered = Object.entries(args).map(([name, def]) => {
    const configuredType =
      def.type ??
      (typeof def["x-graphql-type"] === "string"
        ? def["x-graphql-type"]
        : undefined);
    const type = configuredType ?? "String";
    const defaultValue =
      def.default !== undefined ? ` = ${JSON.stringify(def.default)}` : "";
    return `${name}: ${type}${defaultValue}`;
  });
  return rendered.length ? `(${rendered.join(", ")})` : "";
}

// --- GraphQL -> JSON helpers ---------------------------------------------------

function convertGqlTypeToJson(
  type: string,
  maxDepth: number,
  depth = 0,
): JsonSchema {
  if (depth > maxDepth) {
    return { type: "object", "x-graphql-scalar": "JSON" };
  }

  let working = type.trim();
  const schema: JsonSchema = {};

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

function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(
      (segment) =>
        segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase(),
    )
    .join("");
}

function toSnakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}
