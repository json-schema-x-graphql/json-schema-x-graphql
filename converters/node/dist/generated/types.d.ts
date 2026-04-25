export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<
  T extends {
    [key: string]: unknown;
  },
> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: {
    input: string;
    output: string;
  };
  String: {
    input: string;
    output: string;
  };
  Boolean: {
    input: boolean;
    output: boolean;
  };
  Int: {
    input: number;
    output: number;
  };
  Float: {
    input: number;
    output: number;
  };
};
/** The result of a conversion operation. */
export type ConversionResult = {
  __typename?: "ConversionResult";
  /**
   * The generated output string.
   * This contains the SDL string if outputFormat is SDL or SDL_WITH_FEDERATION_METADATA.
   * This contains a JSON string if outputFormat is AST_JSON.
   * Null if conversion failed completely.
   */
  output?: Maybe<Scalars["String"]["output"]>;
  /** A list of warnings or errors encountered during conversion. */
  diagnostics: Array<Diagnostic>;
  /** Whether the conversion was successful. */
  success: Scalars["Boolean"]["output"];
  /** Total number of errors encountered. */
  errorCount: Scalars["Int"]["output"];
  /** Total number of warnings encountered. */
  warningCount: Scalars["Int"]["output"];
};
/** A diagnostic message (error or warning). */
export type Diagnostic = {
  __typename?: "Diagnostic";
  /** The severity of the diagnostic. */
  severity: DiagnosticSeverity;
  /** The category or kind of the diagnostic. */
  kind?: Maybe<DiagnosticKind>;
  /** The message describing the issue. */
  message: Scalars["String"]["output"];
  /** The path in the JSON schema where the issue occurred (if applicable). */
  path?: Maybe<Array<Scalars["String"]["output"]>>;
  /** The error code or category. Intended to be stable for programmatic handling. */
  code?: Maybe<Scalars["String"]["output"]>;
};
/** Severity levels for diagnostics. */
export type DiagnosticSeverity = "INFO" | "WARNING" | "ERROR";
/** Categories for diagnostics to allow filtering and grouping. */
export type DiagnosticKind =
  | "JSON_SCHEMA_VALIDATION"
  | "GRAPHQL_VALIDATION"
  | "FEDERATION"
  | "NAMING"
  | "TRANSFORMATION"
  | "INTERNAL"
  | "OTHER";
/** Configuration options for the JSON Schema to GraphQL converter. */
export type ConverterOptions = {
  /** Whether to validate the input JSON Schema before conversion. Default: true */
  validate?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Whether to include descriptions (docstrings) in the output SDL. Default: true */
  includeDescriptions?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Whether to preserve the order of fields from the source JSON Schema. Default: true */
  preserveFieldOrder?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** The version of Apollo Federation to target. */
  federationVersion?: InputMaybe<FederationVersion>;
  /**
   * Whether to emit federation directives (e.g. @key, @shareable) in the output.
   * If false, federation-specific directives are stripped even if federationVersion is set.
   */
  includeFederationDirectives?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Strategy for naming GraphQL types and fields. */
  namingConvention?: InputMaybe<NamingConvention>;
  /** If true, attempts to infer the ID scalar for fields named 'id', '_id', etc. (Deprecated: use idStrategy). If both `idStrategy` and `inferIds` are provided, `idStrategy` takes precedence. */
  inferIds?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Strategy for inferring ID fields. Default: NONE */
  idStrategy?: InputMaybe<IdInferenceStrategy>;
  /** The format of the output. Default: SDL */
  outputFormat?: InputMaybe<OutputFormat>;
  /** If true, treats warnings as errors and fails the conversion. Default: false */
  failOnWarning?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** List of type names to exclude from generation. */
  excludeTypes?: InputMaybe<Array<Scalars["String"]["input"]>>;
  /** List of regex patterns to exclude fields or types. */
  excludePatterns?: InputMaybe<Array<Scalars["String"]["input"]>>;
  /** Threshold at which descriptions become block strings (characters). Default: 80 */
  descriptionBlockThreshold?: InputMaybe<Scalars["Int"]["input"]>;
  /** When false, do not emit empty object types (no fields). Default: false */
  emitEmptyTypes?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Maximum number of properties for an anonymous object to be inlined as `JSON`. Default: 3 */
  inlineObjectThreshold?: InputMaybe<Scalars["Int"]["input"]>;
  /** Strategy for naming types derived from $ref values */
  refNaming?: InputMaybe<"basename" | "file_and_path" | "hash">;
};
/** Strategies for inferring ID fields from JSON Schema properties. */
export type IdInferenceStrategy = "NONE" | "COMMON_PATTERNS" | "ALL_STRINGS";
/** Supported Apollo Federation versions. */
export type FederationVersion = "NONE" | "V1" | "V2" | "AUTO";
/** Naming conventions for generated GraphQL artifacts. */
export type NamingConvention = "PRESERVE" | "GRAPHQL_IDIOMATIC";
/** Output formats for the conversion result. */
export type OutputFormat =
  | "SDL"
  | "SDL_WITH_FEDERATION_METADATA"
  /**
   * JSON representation of the GraphQL AST.
   * The JSON format is stable and versioned according to this library's semantic version, making it suitable as a stable interface boundary for downstream tooling.
   */
  | "AST_JSON";
/** Input payload for the conversion mutation. */
export type ConvertInput = {
  /** The JSON Schema to convert. Must be a valid JSON string. */
  jsonSchema: Scalars["String"]["input"];
  /** Optional name or identifier for the source schema (e.g. filename). Useful for diagnostics. */
  sourceName?: InputMaybe<Scalars["String"]["input"]>;
  /** Configuration options for this conversion run. */
  options?: InputMaybe<ConverterOptions>;
};
export type Mutation = {
  __typename?: "Mutation";
  /** Converts a JSON Schema string into GraphQL SDL. */
  convertJsonToGraphql: ConversionResult;
};
export type MutationConvertJsonToGraphqlArgs = {
  input: ConvertInput;
};
export type Query = {
  __typename?: "Query";
  /** Returns the version of the converter service/library. */
  version: Scalars["String"]["output"];
};
