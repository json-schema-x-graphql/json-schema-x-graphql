#!/usr/bin/env node
import {
  GraphQLList,
  GraphQLNonNull,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  isScalarType,
  isUnionType,
} from "graphql";

export { isScalarType };

// Scalar type factories
const scalarFactories = new Map([
  ["String", () => ({ type: "string" })],
  ["ID", () => ({ type: "string" })],
  ["Boolean", () => ({ type: "boolean" })],
  ["Int", () => ({ type: "integer" })],
  ["Float", () => ({ type: "number" })],
  ["Decimal", () => ({ type: "number" })],
  ["Date", () => ({ type: "string", format: "date" })],
  ["DateTime", () => ({ type: "string", format: "date-time" })],
  [
    "JSON",
    () => ({
      description: "Arbitrary JSON value",
      anyOf: [
        { type: "object", additionalProperties: true },
        { type: "array", items: {} },
        { type: "string" },
        { type: "number" },
        { type: "boolean" },
        { type: "null" },
      ],
    }),
  ],
]);
const scalarFallbackFactory = () => ({ type: "string" });
export const isBuiltInScalar = (name) => scalarFactories.has(name);

// Exclusion rules for types
const EXCLUDED_TYPE_NAMES = new Set(["Query", "Mutation", "Subscription", "PageInfo"]);
const EXCLUDED_TYPE_SUFFIXES = [
  "Filter",
  "Sort",
  "SortInput",
  "FilterInput",
  "Args",
  "Connection",
  "Edge",
  "Payload",
  "Result",
  "Response",
  "PaginationInput",
];
export const shouldIncludeType = (type) => {
  if (!type) return false;
  const name = type.name ?? "";
  if (!name) return false;
  if (name.startsWith("__")) return false;
  if (EXCLUDED_TYPE_NAMES.has(name)) return false;
  if (EXCLUDED_TYPE_SUFFIXES.some((suffix) => name.endsWith(suffix))) return false;
  if (isInputObjectType(type)) return false;
  return true;
};

// Utility to allow nulls
const makeNullable = (schema) => {
  if (!schema) return schema;
  if (schema.anyOf || schema.oneOf || schema.allOf || schema.$ref) {
    return {
      anyOf: [schema, { type: "null" }],
    };
  }
  if (schema.type === undefined) {
    return {
      anyOf: [schema, { type: "null" }],
    };
  }
  if (Array.isArray(schema.type)) {
    if (schema.type.includes("null")) {
      return schema;
    }
    return {
      ...schema,
      type: [...schema.type, "null"],
    };
  }
  if (schema.type === "null") {
    return schema;
  }
  return {
    ...schema,
    type: [schema.type, "null"],
  };
};

// Convert GraphQL scalar to JSON Schema
const convertScalar = (name) => {
  const factory = scalarFactories.get(name) ?? scalarFallbackFactory;
  return factory();
};

// Create a context object for schema conversion
export function createContext(schema) {
  return {
    schema,
    definitions: new Map(),
    building: new Set(),
  };
}

// Ensure a type definition exists in context
export function ensureDefinition(namedType, ctx) {
  const name = namedType.name;
  if (!name || name.startsWith("__")) return;
  if (!shouldIncludeType(namedType)) return;
  if (ctx.definitions.has(name) || ctx.building.has(name)) return;
  if (isScalarType(namedType)) {
    return;
  }
  ctx.building.add(name);
  let definition;
  if (isObjectType(namedType) || isInputObjectType(namedType) || isInterfaceType(namedType)) {
    definition = buildObjectDefinition(namedType, ctx);
  } else if (isEnumType(namedType)) {
    definition = buildEnumDefinition(namedType);
  } else if (isUnionType(namedType)) {
    definition = buildUnionDefinition(namedType, ctx);
  }
  if (definition) {
    ctx.definitions.set(name, definition);
  }
  ctx.building.delete(name);
}

// Build enum definitions
export function buildEnumDefinition(enumType) {
  const values = enumType.getValues();
  return {
    type: "string",
    enum: values.map((value) => value.name),
    ...(enumType.description ? { description: enumType.description } : {}),
  };
}

// Build union definitions
export function buildUnionDefinition(unionType, ctx) {
  const possibleTypes = unionType.getTypes?.() ?? ctx.schema.getPossibleTypes(unionType);
  const refs = possibleTypes.map((type) => {
    ensureDefinition(type, ctx);
    return { $ref: `#/definitions/${type.name}` };
  });
  return {
    anyOf: refs,
    ...(unionType.description ? { description: unionType.description } : {}),
  };
}

// Build object definitions
export function buildObjectDefinition(type, ctx) {
  const fields = type.getFields ? type.getFields() : {};
  const properties = {};
  const required = [];

  Object.keys(fields).forEach((fieldName) => {
    const field = fields[fieldName];
    const { schema, nullable } = convertGraphQLType(field.type, ctx);
    const fieldSchema = nullable ? makeNullable(schema) : schema;

    if (field.description && typeof fieldSchema === "object") {
      fieldSchema.description = fieldSchema.description
        ? `${field.description}\n\n${fieldSchema.description}`
        : field.description;
    }

    if ("deprecationReason" in field && field.deprecationReason) {
      fieldSchema.deprecated = true;
      fieldSchema.description = fieldSchema.description
        ? `${fieldSchema.description}\n\nDeprecated: ${field.deprecationReason}`
        : `Deprecated: ${field.deprecationReason}`;
    }

    if ("defaultValue" in field && field.defaultValue !== undefined) {
      fieldSchema.default = field.defaultValue;
    }

    properties[fieldName] = fieldSchema;
    if (!nullable) {
      required.push(fieldName);
    }
  });

  const base = {
    type: "object",
    properties,
    additionalProperties: false,
    ...(type.description ? { description: type.description } : {}),
  };

  if (required.length > 0) {
    base.required = required;
  }
  return base;
}

// Convert GraphQL type to JSON Schema
export function convertGraphQLType(graphqlType, ctx) {
  if (graphqlType instanceof GraphQLNonNull) {
    const inner = convertGraphQLType(graphqlType.ofType, ctx);
    return {
      schema: inner.schema,
      nullable: false,
    };
  }
  if (graphqlType instanceof GraphQLList) {
    const inner = convertGraphQLType(graphqlType.ofType, ctx);
    const itemsSchema = inner.nullable ? makeNullable(inner.schema) : inner.schema;
    return {
      schema: {
        type: "array",
        items: itemsSchema,
      },
      nullable: true,
    };
  }
  if (isScalarType(graphqlType)) {
    return {
      schema: convertScalar(graphqlType.name),
      nullable: true,
    };
  }
  if (
    isEnumType(graphqlType) ||
    isObjectType(graphqlType) ||
    isInterfaceType(graphqlType) ||
    isUnionType(graphqlType)
  ) {
    if (!shouldIncludeType(graphqlType)) {
      return {
        schema: convertScalar("String"),
        nullable: true,
      };
    }
    ensureDefinition(graphqlType, ctx);
    return {
      schema: { $ref: `#/definitions/${graphqlType.name}` },
      nullable: true,
    };
  }
  return {
    schema: convertScalar("String"),
    nullable: true,
  };
}
