/**
 * This file mirrors the GraphQL SDL at schema/converter-api.graphql.
 * It is intended as a generated TypeScript declaration for consumers
 * of the converter API. Kept simple and explicit to avoid relying on
 * runtime codegen in this environment.
 */

/* Utility types */
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };

/* Scalars */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
};

/* Enums and related types */

/** Severity levels for diagnostics. */
export enum DiagnosticSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

/** Categories for diagnostics to allow filtering and grouping. */
export enum DiagnosticKind {
  JSON_SCHEMA_VALIDATION = 'JSON_SCHEMA_VALIDATION',
  GRAPHQL_VALIDATION = 'GRAPHQL_VALIDATION',
  FEDERATION = 'FEDERATION',
  NAMING = 'NAMING',
  TRANSFORMATION = 'TRANSFORMATION',
  INTERNAL = 'INTERNAL',
  OTHER = 'OTHER',
}

/** Supported Apollo Federation versions. */
export enum FederationVersion {
  NONE = 'NONE',
  V1 = 'V1',
  V2 = 'V2',
  AUTO = 'AUTO',
}

/** Naming conventions for generated GraphQL artifacts. */
export enum NamingConvention {
  PRESERVE = 'PRESERVE',
  GRAPHQL_IDIOMATIC = 'GRAPHQL_IDIOMATIC',
}

/** Strategies for inferring ID fields from JSON Schema properties. */
export enum IdInferenceStrategy {
  NONE = 'NONE',
  COMMON_PATTERNS = 'COMMON_PATTERNS',
  ALL_STRINGS = 'ALL_STRINGS',
}

/** Output formats for the conversion result. */
export enum OutputFormat {
  SDL = 'SDL',
  SDL_WITH_FEDERATION_METADATA = 'SDL_WITH_FEDERATION_METADATA',
  AST_JSON = 'AST_JSON',
}

/* Core types */

/** A diagnostic message (error or warning). */
export type Diagnostic = {
  /** The severity of the diagnostic. */
  severity: DiagnosticSeverity;
  /** The category or kind of the diagnostic. */
  kind?: Maybe<DiagnosticKind>;
  /** The message describing the issue. */
  message: Scalars['String'];
  /** The path in the JSON schema where the issue occurred (if applicable). */
  path?: Maybe<Array<Scalars['String']>>;
  /**
   * The error code or category.
   * Intended to be stable for programmatic handling (e.g. JSON_SCHEMA_INVALID_REF).
   */
  code?: Maybe<Scalars['String']>;
};

/** The result of a conversion operation. */
export type ConversionResult = {
  /** The generated output string. This contains the SDL string if outputFormat is SDL or SDL_WITH_FEDERATION_METADATA. This contains a JSON string if outputFormat is AST_JSON. Null if conversion failed completely. */
  output?: Maybe<Scalars['String']>;
  /** A list of warnings or errors encountered during conversion. */
  diagnostics: Array<Diagnostic>;
  /** Whether the conversion was successful. */
  success: Scalars['Boolean'];
  /** Total number of errors encountered. */
  errorCount: Scalars['Int'];
  /** Total number of warnings encountered. */
  warningCount: Scalars['Int'];
};

/** Configuration options for the JSON Schema to GraphQL converter. */
export type ConverterOptions = {
  /** Whether to validate the input JSON Schema before conversion. Default: true */
  validate?: InputMaybe<Scalars['Boolean']>;
  /** Whether to include descriptions (docstrings) in the output SDL. Default: true */
  includeDescriptions?: InputMaybe<Scalars['Boolean']>;
  /** Whether to preserve the order of fields from the source JSON Schema. If false, fields may be sorted alphabetically. Default: true */
  preserveFieldOrder?: InputMaybe<Scalars['Boolean']>;
  /** The version of Apollo Federation to target. */
  federationVersion?: InputMaybe<FederationVersion>;
  /**
   * Whether to emit federation directives (e.g. @key, @shareable) in the output.
   * If false, federation-specific directives are stripped even if federationVersion is set.
   * Note: If federationVersion is NONE, this flag is ignored and no federation directives are emitted.
   */
  includeFederationDirectives?: InputMaybe<Scalars['Boolean']>;
  /** Strategy for naming GraphQL types and fields. */
  namingConvention?: InputMaybe<NamingConvention>;
  /** If true, attempts to infer the ID scalar for fields named 'id', '_id', etc. Deprecated: Use idStrategy instead. */
  inferIds?: InputMaybe<Scalars['Boolean']>;
  /** Strategy for inferring ID fields. Default: NONE */
  idStrategy?: InputMaybe<IdInferenceStrategy>;
  /** The format of the output. Default: SDL */
  outputFormat?: InputMaybe<OutputFormat>;
  /** If true, treats warnings as errors and fails the conversion. Default: false */
  failOnWarning?: InputMaybe<Scalars['Boolean']>;
  /** List of type names to exclude from generation. */
  excludeTypes?: InputMaybe<Array<Scalars['String']>>;
  /** List of regex patterns to exclude fields or types. Patterns are applied to Type names and Field names individually. */
  excludePatterns?: InputMaybe<Array<Scalars['String']>>;
};

/** Input payload for the conversion mutation. */
export type ConvertInput = {
  /** The JSON Schema to convert. Must be a valid JSON string. */
  jsonSchema: Scalars['String'];
  /** Optional name or identifier for the source schema (e.g. filename). Useful for diagnostics. */
  sourceName?: InputMaybe<Scalars['String']>;
  /** Configuration options for this conversion run. */
  options?: InputMaybe<ConverterOptions>;
};

/* GraphQL operation types (typed shapes for client/server boundaries) */

export type Mutation = {
  /** Converts a JSON Schema string into GraphQL SDL. */
  convertJsonToGraphql: ConversionResult;
};

export type MutationConvertJsonToGraphqlArgs = {
  input: ConvertInput;
};

export type Query = {
  /** Returns the version of the converter service/library. */
  version: Scalars['String'];
};
