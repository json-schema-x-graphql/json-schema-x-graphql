export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends {
    [key: string]: unknown;
}> = {
    [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
    [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
    [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<T extends {
    [key: string]: unknown;
}, K extends keyof T> = {
    [_ in K]?: never;
};
export type Incremental<T> = T | {
    [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never;
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
    __typename?: 'ConversionResult';
    /** A list of warnings or errors encountered during conversion. */
    diagnostics: Array<Diagnostic>;
    /**
     * The generated GraphQL SDL string.
     * Null if conversion failed completely.
     */
    sdl?: Maybe<Scalars['String']['output']>;
    /** Whether the conversion was successful. */
    success: Scalars['Boolean']['output'];
};
/** Input payload for the conversion mutation. */
export type ConvertInput = {
    /**
     * The JSON Schema to convert.
     * Must be a valid JSON string.
     */
    jsonSchema: Scalars['String']['input'];
    /** Configuration options for this conversion run. */
    options?: InputMaybe<ConverterOptions>;
};
/** Configuration options for the JSON Schema to GraphQL converter. */
export type ConverterOptions = {
    /** List of regex patterns to exclude fields or types. */
    excludePatterns?: InputMaybe<Array<Scalars['String']['input']>>;
    /** List of type names to exclude from generation. */
    excludeTypes?: InputMaybe<Array<Scalars['String']['input']>>;
    /** The version of Apollo Federation to target. */
    federationVersion?: InputMaybe<FederationVersion>;
    /**
     * Whether to include descriptions (docstrings) in the output SDL.
     * Default: true
     */
    includeDescriptions?: InputMaybe<Scalars['Boolean']['input']>;
    /** If true, attempts to infer the ID scalar for fields named 'id', '_id', etc. */
    inferIds?: InputMaybe<Scalars['Boolean']['input']>;
    /** Strategy for naming GraphQL types and fields. */
    namingConvention?: InputMaybe<NamingConvention>;
    /**
     * Whether to preserve the order of fields from the source JSON Schema.
     * If false, fields may be sorted alphabetically.
     * Default: true
     */
    preserveFieldOrder?: InputMaybe<Scalars['Boolean']['input']>;
    /**
     * Whether to validate the input JSON Schema before conversion.
     * Default: true
     */
    validate?: InputMaybe<Scalars['Boolean']['input']>;
};
/** A diagnostic message (error or warning). */
export type Diagnostic = {
    __typename?: 'Diagnostic';
    /** The error code or category. */
    code?: Maybe<Scalars['String']['output']>;
    /** The message describing the issue. */
    message: Scalars['String']['output'];
    /** The path in the JSON schema where the issue occurred (if applicable). */
    path?: Maybe<Array<Scalars['String']['output']>>;
    /** The severity of the diagnostic. */
    severity: DiagnosticSeverity;
};
/** Severity levels for diagnostics. */
export type DiagnosticSeverity = 'ERROR' | 'INFO' | 'WARNING';
/** Supported Apollo Federation versions. */
export type FederationVersion = 
/** No federation support. Standard GraphQL SDL. */
'NONE'
/** Apollo Federation v1. */
 | 'V1'
/** Apollo Federation v2 (latest). */
 | 'V2';
export type Mutation = {
    __typename?: 'Mutation';
    /** Converts a JSON Schema string into GraphQL SDL. */
    convertJsonToGraphql: ConversionResult;
};
export type MutationConvertJsonToGraphqlArgs = {
    input: ConvertInput;
};
/** Naming conventions for generated GraphQL artifacts. */
export type NamingConvention = 
/** Enforce GraphQL idioms: PascalCase for Types, camelCase for fields. */
'GRAPHQL_IDIOMATIC'
/** Preserve the exact casing from the JSON Schema. */
 | 'PRESERVE';
export type Query = {
    __typename?: 'Query';
    /** Returns the version of the converter service/library. */
    version: Scalars['String']['output'];
};
