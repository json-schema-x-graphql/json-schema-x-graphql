/**
 * X-GraphQL Extensions Handler
 *
 * This module provides utilities for extracting and applying x-graphql-* extensions
 * from JSON Schema to GraphQL SDL generation. It handles all x-graphql attributes
 * including P0 features: skip, nullable, description, and core type/field mapping.
 */

export interface XGraphQLExtensions {
  // Type-level extensions
  typeName?: string;
  typeKind?:
    | "OBJECT"
    | "INTERFACE"
    | "UNION"
    | "ENUM"
    | "INPUT_OBJECT"
    | "SCALAR";
  implements?: string[];
  unionTypes?: string[];
  typeDirectives?:
    | string[]
    | Array<{ name: string; arguments?: Record<string, unknown> }>;

  // Field-level extensions
  fieldName?: string;
  fieldType?: string;
  fieldNonNull?: boolean;
  fieldListItemNonNull?: boolean;
  fieldDirectives?:
    | string[]
    | Array<{ name: string; arguments?: Record<string, unknown> }>;
  fieldArguments?: Record<string, FieldArgument>;

  // P0 Feature: Skip
  skip?: boolean;

  // P0 Feature: Nullable
  nullable?: boolean;

  // P0 Feature: Description
  description?: string;

  // Federation extensions
  federationKeys?: string[] | string;
  federationShareable?: boolean;
  federationRequires?: string[] | string;
  federationProvides?: string[] | string;
  federationExternal?: boolean;
  federationOverrideFrom?: string;
  federationInaccessible?: boolean;
  federationTag?: string;

  // Metadata extensions
  scalar?: string;
  enumValues?: Record<string, EnumValueConfig>;
  defaultValue?: unknown;
  deprecated?: boolean | string;

  // Operations (Query/Mutation/Subscription)
  operations?: GraphQLOperations;

  // Custom scalars definition
  scalars?: Record<string, GraphQLScalarConfig>;
}

export interface FieldArgument {
  type?: string;
  "x-graphql-type"?: string;
  description?: string;
  default?: unknown;
  [key: string]: unknown;
}

export interface EnumValueConfig {
  value?: string | number;
  description?: string;
  deprecated?: boolean | string;
}

export interface GraphQLOperations {
  queries?: Record<string, OperationConfig>;
  mutations?: Record<string, OperationConfig>;
  subscriptions?: Record<string, OperationConfig>;
}

export interface OperationConfig {
  type?: string;
  description?: string;
  arguments?: Record<string, FieldArgument>;
  deprecated?: boolean | string;
}

export interface GraphQLScalarConfig {
  description?: string;
  specifiedByURL?: string;
}

/**
 * Extracts all x-graphql-* extensions from a JSON Schema object
 */
export function extractExtensions(
  schema: Record<string, unknown>,
): XGraphQLExtensions {
  const extensions: XGraphQLExtensions = {};

  for (const [key, value] of Object.entries(schema)) {
    if (!key.startsWith("x-graphql-")) {
      continue;
    }

    const extensionKey = key.substring(10); // Remove 'x-graphql-' prefix

    switch (extensionKey) {
      // Type-level
      case "type-name":
        extensions.typeName = value as string;
        break;
      case "type-kind":
        extensions.typeKind = value as XGraphQLExtensions["typeKind"];
        break;
      case "implements":
      case "type-implements":
        extensions.implements = Array.isArray(value)
          ? value
          : [value as string];
        break;
      case "union-types":
        extensions.unionTypes = Array.isArray(value)
          ? value
          : [value as string];
        break;
      case "type-directives":
      case "directives":
        extensions.typeDirectives =
          value as XGraphQLExtensions["typeDirectives"];
        break;

      // Field-level
      case "field-name":
        extensions.fieldName = value as string;
        break;
      case "field-type":
        extensions.fieldType = value as string;
        break;
      case "field-non-null":
        extensions.fieldNonNull = value as boolean;
        break;
      case "field-list-item-non-null":
        extensions.fieldListItemNonNull = value as boolean;
        break;
      case "field-directives":
        extensions.fieldDirectives =
          value as XGraphQLExtensions["fieldDirectives"];
        break;
      case "field-arguments":
      case "arguments":
        extensions.fieldArguments = value as Record<string, FieldArgument>;
        break;

      // P0 Features
      case "skip":
        extensions.skip = value as boolean;
        break;
      case "nullable":
        extensions.nullable = value as boolean;
        break;
      case "description":
        extensions.description = value as string;
        break;

      // Federation
      case "federation-keys":
      case "federation-key":
        extensions.federationKeys = value as string | string[];
        break;
      case "federation-shareable":
        extensions.federationShareable = value as boolean;
        break;
      case "federation-requires":
        extensions.federationRequires = value as string | string[];
        break;
      case "federation-provides":
        extensions.federationProvides = value as string | string[];
        break;
      case "federation-external":
        extensions.federationExternal = value as boolean;
        break;
      case "federation-override-from":
      case "federation-override":
        extensions.federationOverrideFrom = value as string;
        break;
      case "federation-inaccessible":
        extensions.federationInaccessible = value as boolean;
        break;
      case "federation-tag":
        extensions.federationTag = value as string;
        break;

      // Metadata
      case "scalar":
        extensions.scalar = value as string;
        break;
      case "enum-values":
      case "enum":
        extensions.enumValues = value as Record<string, EnumValueConfig>;
        break;
      case "default":
      case "default-value":
        extensions.defaultValue = value;
        break;
      case "deprecated":
        extensions.deprecated = value as boolean | string;
        break;

      // Operations
      case "operations":
        extensions.operations = value as GraphQLOperations;
        break;

      // Custom scalars
      case "scalars":
        extensions.scalars = value as Record<string, GraphQLScalarConfig>;
        break;

      // Also check for legacy x-graphql-type (could be string or object)
      case "type":
        if (typeof value === "string") {
          extensions.fieldType = value;
        } else if (typeof value === "object" && value !== null) {
          const typeObj = value as Record<string, unknown>;
          if (typeObj.name) {
            extensions.typeName = typeObj.name as string;
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
export function shouldSkip(extensions: XGraphQLExtensions): boolean {
  return extensions.skip === true;
}

/**
 * Get the effective description for a field or type.
 * Priority: x-graphql-description > description (JSON Schema)
 */
export function getEffectiveDescription(
  extensions: XGraphQLExtensions,
  fallbackDescription?: string,
): string | undefined {
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
export function isFieldNullable(
  extensions: XGraphQLExtensions,
  isRequired: boolean,
): boolean {
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
export function getEffectiveFieldName(
  extensions: XGraphQLExtensions,
  propertyName: string,
): string {
  return extensions.fieldName || propertyName;
}

/**
 * Get the effective type name
 * Priority: x-graphql-type-name > title > definition key
 */
export function getEffectiveTypeName(
  extensions: XGraphQLExtensions,
  fallbackName: string,
): string {
  return extensions.typeName || fallbackName;
}

/**
 * Format a GraphQL description as a block or single-line comment
 */
export function formatDescription(
  description: string | undefined,
  indent: string = "",
): string {
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
export function parseFederationKeys(
  keys: string | string[] | undefined,
): string[] {
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
export function buildFederationDirective(
  directiveName: string,
  args?: Record<string, unknown>,
): string {
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
export function generateTypeFederationDirectives(
  extensions: XGraphQLExtensions,
): string[] {
  const directives: string[] = [];

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
    directives.push(
      buildFederationDirective("tag", { name: extensions.federationTag }),
    );
  }

  return directives;
}

/**
 * Generate federation directives for a field
 */
export function generateFieldFederationDirectives(
  extensions: XGraphQLExtensions,
): string[] {
  const directives: string[] = [];

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
    directives.push(
      buildFederationDirective("override", {
        from: extensions.federationOverrideFrom,
      }),
    );
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
export function mergeExtensions(
  ...extensionsList: XGraphQLExtensions[]
): XGraphQLExtensions {
  const merged: XGraphQLExtensions = {};
  const allImplements: string[] = [];
  const allUnionTypes: string[] = [];

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
