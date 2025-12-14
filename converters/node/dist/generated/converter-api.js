"use strict";
/**
 * This file mirrors the GraphQL SDL at schema/converter-api.graphql.
 * It is intended as a generated TypeScript declaration for consumers
 * of the converter API. Kept simple and explicit to avoid relying on
 * runtime codegen in this environment.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutputFormat = exports.IdInferenceStrategy = exports.NamingConvention = exports.FederationVersion = exports.DiagnosticKind = exports.DiagnosticSeverity = void 0;
/* Enums and related types */
/** Severity levels for diagnostics. */
var DiagnosticSeverity;
(function (DiagnosticSeverity) {
    DiagnosticSeverity["INFO"] = "INFO";
    DiagnosticSeverity["WARNING"] = "WARNING";
    DiagnosticSeverity["ERROR"] = "ERROR";
})(DiagnosticSeverity || (exports.DiagnosticSeverity = DiagnosticSeverity = {}));
/** Categories for diagnostics to allow filtering and grouping. */
var DiagnosticKind;
(function (DiagnosticKind) {
    DiagnosticKind["JSON_SCHEMA_VALIDATION"] = "JSON_SCHEMA_VALIDATION";
    DiagnosticKind["GRAPHQL_VALIDATION"] = "GRAPHQL_VALIDATION";
    DiagnosticKind["FEDERATION"] = "FEDERATION";
    DiagnosticKind["NAMING"] = "NAMING";
    DiagnosticKind["TRANSFORMATION"] = "TRANSFORMATION";
    DiagnosticKind["INTERNAL"] = "INTERNAL";
    DiagnosticKind["OTHER"] = "OTHER";
})(DiagnosticKind || (exports.DiagnosticKind = DiagnosticKind = {}));
/** Supported Apollo Federation versions. */
var FederationVersion;
(function (FederationVersion) {
    FederationVersion["NONE"] = "NONE";
    FederationVersion["V1"] = "V1";
    FederationVersion["V2"] = "V2";
    FederationVersion["AUTO"] = "AUTO";
})(FederationVersion || (exports.FederationVersion = FederationVersion = {}));
/** Naming conventions for generated GraphQL artifacts. */
var NamingConvention;
(function (NamingConvention) {
    NamingConvention["PRESERVE"] = "PRESERVE";
    NamingConvention["GRAPHQL_IDIOMATIC"] = "GRAPHQL_IDIOMATIC";
})(NamingConvention || (exports.NamingConvention = NamingConvention = {}));
/** Strategies for inferring ID fields from JSON Schema properties. */
var IdInferenceStrategy;
(function (IdInferenceStrategy) {
    IdInferenceStrategy["NONE"] = "NONE";
    IdInferenceStrategy["COMMON_PATTERNS"] = "COMMON_PATTERNS";
    IdInferenceStrategy["ALL_STRINGS"] = "ALL_STRINGS";
})(IdInferenceStrategy || (exports.IdInferenceStrategy = IdInferenceStrategy = {}));
/** Output formats for the conversion result. */
var OutputFormat;
(function (OutputFormat) {
    OutputFormat["SDL"] = "SDL";
    OutputFormat["SDL_WITH_FEDERATION_METADATA"] = "SDL_WITH_FEDERATION_METADATA";
    OutputFormat["AST_JSON"] = "AST_JSON";
})(OutputFormat || (exports.OutputFormat = OutputFormat = {}));
//# sourceMappingURL=converter-api.js.map