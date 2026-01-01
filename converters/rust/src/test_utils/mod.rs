//! Test Utilities Module
//!
//! This module provides comprehensive testing utilities for validating
//! JSON Schemas and GraphQL SDL, including federation support.
//!
//! ## Modules
//!
//! - `schema_validation`: JSON Schema validation using jsonschema and boon
//! - `graphql_validation`: GraphQL SDL validation using Apollo and other tools
//!
//! ## Usage
//!
//! ```rust,ignore
//! use test_utils::schema_validation::ComprehensiveValidator;
//! use test_utils::graphql_validation::ComprehensiveGraphQLValidator;
//!
//! // Validate JSON Schema
//! let schema = serde_json::json!({
//!     "$schema": "http://json-schema.org/draft-07/schema#",
//!     "type": "object",
//!     "properties": {
//!         "name": { "type": "string" }
//!     }
//! });
//! let report = ComprehensiveValidator::validate(&schema, "test.json");
//! assert!(report.is_valid());
//!
//! // Validate GraphQL SDL
//! let sdl = r#"
//!     type Query {
//!         hello: String
//!     }
//! "#;
//! let report = ComprehensiveGraphQLValidator::validate(sdl, "test.graphql");
//! assert!(report.is_valid());
//! ```

#[cfg(test)]
pub mod schema_validation;

#[cfg(test)]
pub mod graphql_validation;

#[cfg(test)]
pub use schema_validation::{
    ComprehensiveValidator, JsonSchemaValidator, BoonValidator,
    ValidationReport, ValidationError as SchemaValidationError,
    SchemaValidation,
};

#[cfg(test)]
pub use graphql_validation::{
    ComprehensiveGraphQLValidator, ApolloParserValidator, ApolloCompilerValidator,
    SpecValidator, FederationCompositionValidator,
    GraphQLValidationReport, ValidationError as GraphQLValidationError,
    ValidationBenchmark, ValidationBenchmarker,
};
