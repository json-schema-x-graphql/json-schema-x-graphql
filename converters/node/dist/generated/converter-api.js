"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NamingConvention = exports.FederationVersion = exports.DiagnosticSeverity = void 0;
/** Severity levels for diagnostics. */
var DiagnosticSeverity;
(function (DiagnosticSeverity) {
    DiagnosticSeverity["Error"] = "ERROR";
    DiagnosticSeverity["Info"] = "INFO";
    DiagnosticSeverity["Warning"] = "WARNING";
})(DiagnosticSeverity || (exports.DiagnosticSeverity = DiagnosticSeverity = {}));
/** Supported Apollo Federation versions. */
var FederationVersion;
(function (FederationVersion) {
    /** No federation support. Standard GraphQL SDL. */
    FederationVersion["None"] = "NONE";
    /** Apollo Federation v1. */
    FederationVersion["V1"] = "V1";
    /** Apollo Federation v2 (latest). */
    FederationVersion["V2"] = "V2";
})(FederationVersion || (exports.FederationVersion = FederationVersion = {}));
/** Naming conventions for generated GraphQL artifacts. */
var NamingConvention;
(function (NamingConvention) {
    /** Enforce GraphQL idioms: PascalCase for Types, camelCase for fields. */
    NamingConvention["GraphqlIdiomatic"] = "GRAPHQL_IDIOMATIC";
    /** Preserve the exact casing from the JSON Schema. */
    NamingConvention["Preserve"] = "PRESERVE";
})(NamingConvention || (exports.NamingConvention = NamingConvention = {}));
//# sourceMappingURL=converter-api.js.map