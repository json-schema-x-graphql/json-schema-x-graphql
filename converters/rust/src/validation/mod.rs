//! Validation module for JSON Schema and GraphQL SDL
//!
//! This module provides comprehensive validation infrastructure:
//! - JSON Schema validation with dual validators (jsonschema + boon)
//! - GraphQL SDL validation (Apollo parser, compiler, spec, federation)
//! - Integration with CI/CD pipelines
//! - CLI tools for validation

pub mod graphql_sdl;
pub mod json_schema;

pub use json_schema::{
    ComprehensiveValidator as JsonSchemaValidator, ValidationError as JsonSchemaValidationError,
    ValidationIssue as JsonSchemaValidationIssue, ValidationResult as JsonSchemaValidationResult,
    ValidationSeverity as JsonSchemaValidationSeverity,
};

pub use graphql_sdl::{
    ApolloCompilerValidator, ApolloParserValidator, ComprehensiveGraphQLValidator,
    FederationCompositionValidator, GraphQLValidationError, GraphQLValidationIssue,
    GraphQLValidationReport, GraphQLValidationSeverity, SpecValidator,
};

/// Validate both JSON Schema and resulting GraphQL SDL
pub struct FullStackValidator {
    json_validator: JsonSchemaValidator,
    graphql_validator: ComprehensiveGraphQLValidator,
}

impl FullStackValidator {
    pub fn new(strict: bool) -> Self {
        Self {
            json_validator: JsonSchemaValidator::new(strict),
            graphql_validator: ComprehensiveGraphQLValidator::new(),
        }
    }

    /// Validate a JSON Schema and optionally its converted GraphQL SDL
    pub fn validate_conversion(
        &self,
        json_schema: &serde_json::Value,
        graphql_sdl: Option<&str>,
    ) -> Result<FullStackValidationReport, ValidationError> {
        let json_result = self.json_validator.validate(json_schema)?;

        let graphql_report = if let Some(sdl) = graphql_sdl {
            Some(self.graphql_validator.validate(sdl)?)
        } else {
            None
        };

        Ok(FullStackValidationReport {
            json_schema_result: json_result,
            graphql_report,
        })
    }
}

impl Default for FullStackValidator {
    fn default() -> Self {
        Self::new(false)
    }
}

#[derive(Debug)]
pub struct FullStackValidationReport {
    pub json_schema_result: JsonSchemaValidationResult,
    pub graphql_report: Option<GraphQLValidationReport>,
}

impl FullStackValidationReport {
    pub fn is_valid(&self) -> bool {
        self.json_schema_result.is_fully_valid()
            && self.graphql_report.as_ref().map_or(true, |r| r.is_valid())
    }

    pub fn total_errors(&self) -> usize {
        let json_errors = self.json_schema_result.errors.len();
        let graphql_errors = self.graphql_report.as_ref().map_or(0, |r| r.error_count());
        json_errors + graphql_errors
    }

    pub fn total_warnings(&self) -> usize {
        let json_warnings = self.json_schema_result.warnings.len();
        let graphql_warnings = self
            .graphql_report
            .as_ref()
            .map_or(0, |r| r.warning_count());
        json_warnings + graphql_warnings
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ValidationError {
    #[error("JSON Schema validation error: {0}")]
    JsonSchema(#[from] JsonSchemaValidationError),

    #[error("GraphQL SDL validation error: {0}")]
    GraphQL(#[from] GraphQLValidationError),
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_full_stack_validation() {
        let validator = FullStackValidator::new(false);

        let schema = json!({
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "x-graphql-type-name": "User",
            "properties": {
                "id": {
                    "type": "string",
                    "x-graphql-field-type": "ID!"
                },
                "name": {
                    "type": "string"
                }
            }
        });

        let sdl = r#"
            type User {
                id: ID!
                name: String
            }
        "#;

        let report = validator.validate_conversion(&schema, Some(sdl)).unwrap();
        assert!(report.is_valid());
    }
}
