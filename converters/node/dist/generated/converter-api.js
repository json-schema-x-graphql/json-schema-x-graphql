/**
 * This file mirrors the GraphQL SDL at schema/converter-api.graphql.
 * It is intended as a generated TypeScript declaration for consumers
 * of the converter API. Kept simple and explicit to avoid relying on
 * runtime codegen in this environment.
 */
/* Enums and related types */
/** Severity levels for diagnostics. */
export var DiagnosticSeverity;
(function (DiagnosticSeverity) {
  DiagnosticSeverity["INFO"] = "INFO";
  DiagnosticSeverity["WARNING"] = "WARNING";
  DiagnosticSeverity["ERROR"] = "ERROR";
})(DiagnosticSeverity || (DiagnosticSeverity = {}));
/** Categories for diagnostics to allow filtering and grouping. */
export var DiagnosticKind;
(function (DiagnosticKind) {
  DiagnosticKind["JSON_SCHEMA_VALIDATION"] = "JSON_SCHEMA_VALIDATION";
  DiagnosticKind["GRAPHQL_VALIDATION"] = "GRAPHQL_VALIDATION";
  DiagnosticKind["FEDERATION"] = "FEDERATION";
  DiagnosticKind["NAMING"] = "NAMING";
  DiagnosticKind["TRANSFORMATION"] = "TRANSFORMATION";
  DiagnosticKind["INTERNAL"] = "INTERNAL";
  DiagnosticKind["OTHER"] = "OTHER";
})(DiagnosticKind || (DiagnosticKind = {}));
/** Supported Apollo Federation versions. */
export var FederationVersion;
(function (FederationVersion) {
  FederationVersion["NONE"] = "NONE";
  FederationVersion["V1"] = "V1";
  FederationVersion["V2"] = "V2";
  FederationVersion["AUTO"] = "AUTO";
})(FederationVersion || (FederationVersion = {}));
/** Naming conventions for generated GraphQL artifacts. */
export var NamingConvention;
(function (NamingConvention) {
  NamingConvention["PRESERVE"] = "PRESERVE";
  NamingConvention["GRAPHQL_IDIOMATIC"] = "GRAPHQL_IDIOMATIC";
})(NamingConvention || (NamingConvention = {}));
/** Strategies for inferring ID fields from JSON Schema properties. */
export var IdInferenceStrategy;
(function (IdInferenceStrategy) {
  IdInferenceStrategy["NONE"] = "NONE";
  IdInferenceStrategy["COMMON_PATTERNS"] = "COMMON_PATTERNS";
  IdInferenceStrategy["ALL_STRINGS"] = "ALL_STRINGS";
})(IdInferenceStrategy || (IdInferenceStrategy = {}));
/** Output formats for the conversion result. */
export var OutputFormat;
(function (OutputFormat) {
  OutputFormat["SDL"] = "SDL";
  OutputFormat["SDL_WITH_FEDERATION_METADATA"] = "SDL_WITH_FEDERATION_METADATA";
  OutputFormat["AST_JSON"] = "AST_JSON";
})(OutputFormat || (OutputFormat = {}));
//# sourceMappingURL=converter-api.js.map
