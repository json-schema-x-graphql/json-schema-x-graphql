/**
 * Directive Filter Framework for GraphQL SDL generation.
 *
 * Configuration-driven filtering of GraphQL directives during SDL output,
 * supporting modes like "viewer-friendly" (strip all infrastructure
 * directives) and "exclude-draft" (omit draft/unstable directives).
 *
 * Mirrors the Rust implementation in `converters/rust/src/directive_filter.rs`.
 */
export type DirectiveTier = "spec" | "federation" | "custom" | "draft";
/**
 * Public filter mode. Uses the same enum values as the GraphQL API
 * schema (ALL, VIEWER_FRIENDLY, EXCLUDE_DRAFT) plus a `Custom` variant
 * with a list of directive names to exclude.
 */
export type DirectiveFilterMode = "ALL" | "VIEWER_FRIENDLY" | "EXCLUDE_DRAFT" | {
    CUSTOM: string[];
};
/** Classify a directive by its tier. */
export declare function classifyDirective(name: string): DirectiveTier;
/** Determine if a directive should be included given the active mode. */
export declare function shouldIncludeDirective(name: string, mode: DirectiveFilterMode): boolean;
/** Filter an array of directive strings based on the mode. */
export declare function filterDirectiveList(directives: string[], mode: DirectiveFilterMode): string[];
/** Filter directive tokens from a single line of SDL output. */
export declare function filterLineDirectives(line: string, mode: DirectiveFilterMode): string;
/** Apply directive filtering to an entire SDL string. */
export declare function filterSdlDirectives(sdl: string, mode: DirectiveFilterMode): string;
export declare const FEDERATION_VERSION = "2.9";
export declare const FEDERATION_IMPORTS: string[];
/** Build the @link extend schema directive line. */
export declare function federationLinkDirective(): string;
/** Complete Federation v2.9 directive SDL definitions. */
export declare const FEDERATION_DIRECTIVES_SDL = "\nscalar FieldSet\nscalar link__Import\n\nenum link__Purpose {\n  \"\"\"\n  `SECURITY` features provide metadata necessary to securely resolve fields.\n  \"\"\"\n  SECURITY\n\n  \"\"\"\n  `EXECUTION` features provide metadata necessary for operation execution.\n  \"\"\"\n  EXECUTION\n}\n\ndirective @key(fields: FieldSet!, resolvable: Boolean = true) repeatable on OBJECT | INTERFACE\ndirective @requires(fields: FieldSet!) on FIELD_DEFINITION\ndirective @provides(fields: FieldSet!) on FIELD_DEFINITION\ndirective @external(reason: String) on FIELD_DEFINITION | OBJECT\ndirective @shareable on FIELD_DEFINITION | OBJECT\ndirective @link(url: String!, as: String, for: link__Purpose, import: [link__Import]) repeatable on SCHEMA\ndirective @tag(name: String!) repeatable on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION\ndirective @override(from: String!, label: String) on FIELD_DEFINITION\ndirective @inaccessible on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION\ndirective @interfaceObject on OBJECT\ndirective @composeDirective(name: String) repeatable on SCHEMA\ndirective @authenticated on FIELD_DEFINITION | OBJECT | INTERFACE | SCALAR | ENUM\ndirective @requiresScopes(scopes: [[String!]!]!) on FIELD_DEFINITION | OBJECT | INTERFACE | SCALAR | ENUM\ndirective @policy(policies: [[String!]!]!) on FIELD_DEFINITION | OBJECT | INTERFACE | SCALAR | ENUM\ndirective @cost(weight: Int!) on ARGUMENT_DEFINITION | ENUM | FIELD_DEFINITION | INPUT_FIELD_DEFINITION | OBJECT | SCALAR\ndirective @listSize(assumedSize: Int, slicingArguments: [String!], sizedFields: [String!], requireOneSlicingArgument: Boolean = true) on FIELD_DEFINITION\n\n# Custom validation and performance directives\ndirective @constraint(pattern: String, min: Int, max: Int, minLength: Int, maxLength: Int) on FIELD_DEFINITION | ARGUMENT_DEFINITION\ndirective @cache(ttl: Int, scope: String) on FIELD_DEFINITION | OBJECT\ndirective @authorize(requires: String, roles: [String], scopes: [String]) on FIELD_DEFINITION | OBJECT | INTERFACE\ndirective @mask(pattern: String, if: String, value: String, maskLevel: String, maskFor: [String]) on FIELD_DEFINITION\ndirective @rateLimit(limit: Int, window: String, roles: [String]) on FIELD_DEFINITION\n";
/** Check whether an SDL string already contains federation directive definitions. */
export declare function sdlHasFederationDirectives(sdl: string): boolean;
/** Inject federation directive definitions into an SDL string if missing. */
export declare function ensureFederationDirectives(sdl: string): string;
