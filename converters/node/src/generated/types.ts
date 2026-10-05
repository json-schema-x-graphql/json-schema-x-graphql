export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
};

/** The result of a conversion operation. */
export type ConversionResult = {
  __typename?: "ConversionResult";
  /** A list of warnings or errors encountered during conversion. */
  diagnostics: Array<Diagnostic>;
  /** Total number of errors encountered. */
  errorCount: Scalars["Int"]["output"];
  /**
   * The generated output string.
   * This contains the SDL string if outputFormat is SDL or SDL_WITH_FEDERATION_METADATA.
   * This contains a JSON string if outputFormat is AST_JSON.
   * Null if conversion failed completely.
   */
  output?: Maybe<Scalars["String"]["output"]>;
  /** Whether the conversion was successful. */
  success: Scalars["Boolean"]["output"];
  /** Total number of warnings encountered. */
  warningCount: Scalars["Int"]["output"];
};

/** Input payload for the conversion mutation. */
export type ConvertInput = {
  /**
   * The JSON Schema to convert.
   * Must be a valid JSON string.
   */
  jsonSchema: Scalars["String"]["input"];
  /** Configuration options for this conversion run. */
  options?: InputMaybe<ConverterOptions>;
  /**
   * Optional name or identifier for the source schema (e.g. filename).
   * Useful for diagnostics.
   */
  sourceName?: InputMaybe<Scalars["String"]["input"]>;
};

/** Configuration options for the JSON Schema to GraphQL converter. */
export type ConverterOptions = {
  /** Threshold at which descriptions become block strings (characters). Default: 80 */
  descriptionBlockThreshold?: InputMaybe<Scalars["Int"]["input"]>;
  /**
   * Filter mode for GraphQL directives in SDL output.
   * Controls which directives are included in generated SDL.
   */
  directiveFilterMode?: InputMaybe<DirectiveFilterMode>;
  /** When false, do not emit empty object types (no fields). Default: false */
  emitEmptyTypes?: InputMaybe<Scalars["Boolean"]["input"]>;
  /**
   * List of regex patterns to exclude fields or types.
   * Patterns are applied to Type names and Field names individually.
   */
  excludePatterns?: InputMaybe<Array<Scalars["String"]["input"]>>;
  /** List of type names to exclude from generation. */
  excludeTypes?: InputMaybe<Array<Scalars["String"]["input"]>>;
  /**
   * If true, treats warnings as errors and fails the conversion.
   * Default: false
   */
  failOnWarning?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** The version of Apollo Federation to target. */
  federationVersion?: InputMaybe<FederationVersion>;
  /**
   * Strategy for inferring ID fields.
   * Default: NONE
   */
  idStrategy?: InputMaybe<IdInferenceStrategy>;
  /**
   * Whether to include descriptions (docstrings) in the output SDL.
   * Default: true
   */
  includeDescriptions?: InputMaybe<Scalars["Boolean"]["input"]>;
  /**
   * Whether to emit federation directives (e.g. @key, @shareable) in the output.
   * If false, federation-specific directives are stripped even if federationVersion is set.
   * Note: If federationVersion is NONE, this flag is ignored and no federation directives are emitted.
   * Default: true
   */
  includeFederationDirectives?: InputMaybe<Scalars["Boolean"]["input"]>;
  /**
   * If true, attempts to infer the ID scalar for fields named 'id', '_id', etc.
   * Deprecated: Use idStrategy instead.
   * If both `inferIds` and `idStrategy` are provided, `idStrategy` takes precedence.
   */
  inferIds?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Maximum number of properties for an anonymous object to be inlined as `JSON`. Default: 3 */
  inlineObjectThreshold?: InputMaybe<Scalars["Int"]["input"]>;
  /** Strategy for naming GraphQL types and fields. */
  namingConvention?: InputMaybe<NamingConvention>;
  /**
   * The format of the output.
   * Default: SDL
   */
  outputFormat?: InputMaybe<OutputFormat>;
  /**
   * Whether to preserve the order of fields from the source JSON Schema.
   * If false, fields may be sorted alphabetically.
   * Default: true
   */
  preserveFieldOrder?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Strategy for naming types derived from $ref values */
  refNaming?: InputMaybe<RefNaming>;
  /**
   * Whether to validate the input JSON Schema before conversion.
   * Default: true
   */
  validate?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** A diagnostic message (error or warning). */
export type Diagnostic = {
  __typename?: "Diagnostic";
  /**
   * The error code or category.
   * Intended to be stable for programmatic handling (e.g. JSON_SCHEMA_INVALID_REF).
   */
  code?: Maybe<Scalars["String"]["output"]>;
  /** The category or kind of the diagnostic. */
  kind?: Maybe<DiagnosticKind>;
  /** The message describing the issue. */
  message: Scalars["String"]["output"];
  /** The path in the JSON schema where the issue occurred (if applicable). */
  path?: Maybe<Array<Scalars["String"]["output"]>>;
  /** The severity of the diagnostic. */
  severity: DiagnosticSeverity;
};

/** Categories for diagnostics to allow filtering and grouping. */
export type DiagnosticKind =
  | "FEDERATION"
  | "GRAPHQL_VALIDATION"
  | "INTERNAL"
  | "JSON_SCHEMA_VALIDATION"
  | "NAMING"
  /** Catch-all for diagnostics that do not fit into other categories. */
  | "OTHER"
  | "TRANSFORMATION";

/** Severity levels for diagnostics. */
export type DiagnosticSeverity = "ERROR" | "INFO" | "WARNING";

/** Filter modes for GraphQL directives in SDL output. */
export type DirectiveFilterMode =
  /** Include all directives. */
  | "ALL"
  /** Include everything except draft/unstable directives. */
  | "EXCLUDE_DRAFT"
  /**
   * Only include GraphQL spec-level directives (@deprecated, @skip, @include).
   * Strips federation, custom, and infrastructure directives.
   */
  | "VIEWER_FRIENDLY";

/** Supported Apollo Federation versions. */
export type FederationVersion =
  /** Automatically detect federation version based on directives (e.g. @key, @shareable) present in the source schema. */
  | "AUTO"
  /** No federation support. Standard GraphQL SDL. */
  | "NONE"
  /** Apollo Federation v1. */
  | "V1"
  /** Apollo Federation v2 (latest). */
  | "V2";

/** Strategies for inferring ID fields from JSON Schema properties. */
export type IdInferenceStrategy =
  /** Infer IDs for any string field that looks like an identifier (e.g. UUIDs). */
  | "ALL_STRINGS"
  /** Infer IDs for fields with common names like 'id', '_id'. */
  | "COMMON_PATTERNS"
  /** Do not infer IDs; use the type defined in JSON Schema (usually String). */
  | "NONE";

export type Mutation = {
  __typename?: "Mutation";
  /** Converts a JSON Schema string into GraphQL SDL. */
  convertJsonToGraphql: ConversionResult;
};

export type MutationConvertJsonToGraphqlArgs = {
  input: ConvertInput;
};

/** Naming conventions for generated GraphQL artifacts. */
export type NamingConvention =
  /** Enforce GraphQL idioms: PascalCase for Types, camelCase for fields. */
  | "GRAPHQL_IDIOMATIC"
  /** Preserve the exact casing from the JSON Schema. */
  | "PRESERVE";

/** Output formats for the conversion result. */
export type OutputFormat =
  /**
   * JSON representation of the GraphQL AST.
   * The JSON format is stable and versioned according to this library's semantic version, making it suitable as an interface boundary for downstream tooling.
   */
  | "AST_JSON"
  /** Standard GraphQL SDL string. */
  | "SDL"
  /**
   * GraphQL SDL with additional federation metadata comments or structures.
   * Includes federation directives which may not be valid in a standard GraphQL server without federation support.
   */
  | "SDL_WITH_FEDERATION_METADATA";

export type Query = {
  __typename?: "Query";
  /** Returns the version of the converter service/library. */
  version: Scalars["String"]["output"];
};

/** Strategies for naming types derived from $ref values. */
export type RefNaming =
  /** Use the last path segment of the reference (default). */
  | "BASENAME"
  /** Combine the file name and path segments for external references. */
  | "FILE_AND_PATH"
  /** Derive a compact, collision-resistant hash identifier. */
  | "HASH";
