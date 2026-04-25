/**
 * X-GraphQL Extensions Handler
 *
 * This module provides utilities for extracting and applying x-graphql-* extensions
 * from JSON Schema to GraphQL SDL generation. It handles all x-graphql attributes
 * including P0 features: skip, nullable, description, and core type/field mapping.
 */
export interface XGraphQLExtensions {
  typeName?: string;
  typeKind?: "OBJECT" | "INTERFACE" | "UNION" | "ENUM" | "INPUT_OBJECT" | "SCALAR";
  implements?: string[];
  unionTypes?: string[];
  typeDirectives?:
    | string[]
    | Array<{
        name: string;
        arguments?: Record<string, unknown>;
      }>;
  fieldName?: string;
  fieldType?: string;
  fieldNonNull?: boolean;
  fieldListItemNonNull?: boolean;
  fieldDirectives?:
    | string[]
    | Array<{
        name: string;
        arguments?: Record<string, unknown>;
      }>;
  fieldArguments?: Record<string, FieldArgument>;
  skip?: boolean;
  nullable?: boolean;
  description?: string;
  federationKeys?: string[] | string;
  federationShareable?: boolean;
  federationRequires?: string[] | string;
  federationProvides?: string[] | string;
  federationExternal?: boolean;
  federationOverrideFrom?: string;
  federationInaccessible?: boolean;
  federationTag?: string;
  scalar?: string;
  enumValues?: Record<string, EnumValueConfig>;
  defaultValue?: unknown;
  deprecated?: boolean | string;
  operations?: GraphQLOperations;
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
export declare function extractExtensions(schema: Record<string, unknown>): XGraphQLExtensions;
/**
 * Check if a field or type should be skipped from GraphQL generation
 */
export declare function shouldSkip(extensions: XGraphQLExtensions): boolean;
/**
 * Get the effective description for a field or type.
 * Priority: x-graphql-description > description (JSON Schema)
 */
export declare function getEffectiveDescription(
  extensions: XGraphQLExtensions,
  fallbackDescription?: string,
): string | undefined;
/**
 * Determine if a field should be nullable.
 * Priority: x-graphql-nullable > x-graphql-field-non-null > required array
 */
export declare function isFieldNullable(
  extensions: XGraphQLExtensions,
  isRequired: boolean,
): boolean;
/**
 * Get the effective field name
 * Priority: x-graphql-field-name > property name (camelCased)
 */
export declare function getEffectiveFieldName(
  extensions: XGraphQLExtensions,
  propertyName: string,
): string;
/**
 * Get the effective type name
 * Priority: x-graphql-type-name > title > definition key
 */
export declare function getEffectiveTypeName(
  extensions: XGraphQLExtensions,
  fallbackName: string,
): string;
/**
 * Format a GraphQL description as a block or single-line comment
 */
export declare function formatDescription(description: string | undefined, indent?: string): string;
/**
 * Parse federation keys into a normalized array format
 */
export declare function parseFederationKeys(keys: string | string[] | undefined): string[];
/**
 * Build a federation directive string
 */
export declare function buildFederationDirective(
  directiveName: string,
  args?: Record<string, unknown>,
): string;
/**
 * Generate federation directives for a type
 */
export declare function generateTypeFederationDirectives(extensions: XGraphQLExtensions): string[];
/**
 * Generate federation directives for a field
 */
export declare function generateFieldFederationDirectives(extensions: XGraphQLExtensions): string[];
/**
 * Merge multiple extension objects (for allOf, anyOf, oneOf scenarios)
 */
export declare function mergeExtensions(
  ...extensionsList: XGraphQLExtensions[]
): XGraphQLExtensions;
