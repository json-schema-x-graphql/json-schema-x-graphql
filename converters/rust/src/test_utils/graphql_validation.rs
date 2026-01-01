//! GraphQL SDL and Federation Validation Test Utilities
//!
//! This module provides comprehensive GraphQL SDL validation and Federation
//! validation using multiple Rust crates:
//! - apollo-parser: Parse GraphQL SDL
//! - apollo-encoder: Encode GraphQL AST
//! - apollo-compiler: Comprehensive validation including federation
//! - graphql-composition: Federation composition and validation
//! - graphql-schema-validation: General GraphQL spec validation
//!
//! These validators ensure that generated GraphQL SDL is spec-compliant and
//! federation-ready.

use serde_json::Value;
use std::path::Path;

/// Result type for GraphQL validation operations
pub type ValidationResult<T> = Result<T, ValidationError>;

/// Errors that can occur during GraphQL validation
#[derive(Debug, thiserror::Error)]
pub enum ValidationError {
    #[error("Apollo parser error: {0}")]
    ApolloParser(String),

    #[error("Apollo compiler error: {0}")]
    ApolloCompiler(String),

    #[error("Federation composition error: {0}")]
    FederationComposition(String),

    #[error("Schema validation error: {0}")]
    SchemaValidation(String),

    #[error("Invalid SDL: {0}")]
    InvalidSdl(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Multiple validation errors: {0:?}")]
    Multiple(Vec<String>),
}

/// Validation report for GraphQL SDL
#[derive(Debug, Clone)]
pub struct GraphQLValidationReport {
    pub sdl_path: String,
    pub apollo_parser_valid: bool,
    pub apollo_parser_errors: Vec<String>,
    pub apollo_compiler_valid: bool,
    pub apollo_compiler_errors: Vec<String>,
    pub spec_validation_valid: bool,
    pub spec_validation_errors: Vec<String>,
    pub federation_valid: Option<bool>,
    pub federation_errors: Vec<String>,
    pub overall_valid: bool,
}

impl GraphQLValidationReport {
    /// Check if the SDL passed all validations
    pub fn is_valid(&self) -> bool {
        self.overall_valid
    }

    /// Get all validation errors combined
    pub fn all_errors(&self) -> Vec<String> {
        let mut errors = Vec::new();
        errors.extend(self.apollo_parser_errors.iter().cloned());
        errors.extend(self.apollo_compiler_errors.iter().cloned());
        errors.extend(self.spec_validation_errors.iter().cloned());
        errors.extend(self.federation_errors.iter().cloned());
        errors
    }

    /// Check if federation validation was performed
    pub fn has_federation_validation(&self) -> bool {
        self.federation_valid.is_some()
    }

    /// Format the report as a human-readable string
    pub fn format(&self) -> String {
        let mut output = String::new();
        output.push_str(&format!("SDL: {}\n", self.sdl_path));
        output.push_str(&format!(
            "Overall: {}\n",
            if self.overall_valid {
                "✓ VALID"
            } else {
                "✗ INVALID"
            }
        ));

        output.push_str("\nApollo Parser:\n");
        if self.apollo_parser_valid {
            output.push_str("  ✓ Valid\n");
        } else {
            output.push_str("  ✗ Invalid\n");
            for error in &self.apollo_parser_errors {
                output.push_str(&format!("    - {}\n", error));
            }
        }

        output.push_str("\nApollo Compiler:\n");
        if self.apollo_compiler_valid {
            output.push_str("  ✓ Valid\n");
        } else {
            output.push_str("  ✗ Invalid\n");
            for error in &self.apollo_compiler_errors {
                output.push_str(&format!("    - {}\n", error));
            }
        }

        output.push_str("\nGraphQL Spec Validation:\n");
        if self.spec_validation_valid {
            output.push_str("  ✓ Valid\n");
        } else {
            output.push_str("  ✗ Invalid\n");
            for error in &self.spec_validation_errors {
                output.push_str(&format!("    - {}\n", error));
            }
        }

        if let Some(federation_valid) = self.federation_valid {
            output.push_str("\nFederation Validation:\n");
            if federation_valid {
                output.push_str("  ✓ Valid\n");
            } else {
                output.push_str("  ✗ Invalid\n");
                for error in &self.federation_errors {
                    output.push_str(&format!("    - {}\n", error));
                }
            }
        }

        output
    }
}

/// GraphQL SDL validator using apollo-parser
pub struct ApolloParserValidator;

impl ApolloParserValidator {
    /// Parse and validate GraphQL SDL using apollo-parser
    pub fn validate(sdl: &str) -> ValidationResult<Vec<String>> {
        use apollo_parser::Parser;

        let parser = Parser::new(sdl);
        let ast = parser.parse();

        let errors: Vec<String> = ast.errors().map(|error| format!("{}", error)).collect();

        if errors.is_empty() {
            Ok(Vec::new())
        } else {
            Ok(errors)
        }
    }

    /// Check if SDL can be parsed
    pub fn can_parse(sdl: &str) -> bool {
        use apollo_parser::Parser;

        let parser = Parser::new(sdl);
        let ast = parser.parse();
        ast.errors().count() == 0
    }
}

/// GraphQL SDL validator using apollo-compiler
pub struct ApolloCompilerValidator;

impl ApolloCompilerValidator {
    /// Validate GraphQL SDL using apollo-compiler
    pub fn validate(sdl: &str) -> ValidationResult<Vec<String>> {
        use apollo_compiler::{ApolloCompiler, InputDatabase};

        let mut compiler = ApolloCompiler::new();

        // Add the SDL as input
        compiler.add_type_system(sdl, "schema.graphql");

        // Get diagnostics
        let db = compiler.db.snapshot();
        let diagnostics = db.all_diagnostics();

        let errors: Vec<String> = diagnostics.iter().map(|diag| format!("{}", diag)).collect();

        Ok(errors)
    }

    /// Validate with federation support
    pub fn validate_with_federation(sdl: &str) -> ValidationResult<Vec<String>> {
        use apollo_compiler::{ApolloCompiler, InputDatabase};

        let mut compiler = ApolloCompiler::new();

        // Add federation directives
        let federation_sdl = format!(
            r#"
            {}

            directive @key(fields: String!, resolvable: Boolean = true) repeatable on OBJECT | INTERFACE
            directive @requires(fields: String!) on FIELD_DEFINITION
            directive @provides(fields: String!) on FIELD_DEFINITION
            directive @external on FIELD_DEFINITION
            directive @shareable on OBJECT | FIELD_DEFINITION
            directive @inaccessible on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION
            directive @tag(name: String!) repeatable on FIELD_DEFINITION | INTERFACE | OBJECT | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION
            directive @override(from: String!) on FIELD_DEFINITION
            "#,
            sdl
        );

        compiler.add_type_system(&federation_sdl, "schema.graphql");

        let db = compiler.db.snapshot();
        let diagnostics = db.all_diagnostics();

        let errors: Vec<String> = diagnostics.iter().map(|diag| format!("{}", diag)).collect();

        Ok(errors)
    }
}

/// GraphQL spec validator using graphql-schema-validation
pub struct SpecValidator;

impl SpecValidator {
    /// Validate GraphQL SDL against the specification
    pub fn validate(sdl: &str) -> ValidationResult<Vec<String>> {
        use graphql_schema_validation::validate_schema;

        match validate_schema(sdl) {
            Ok(_) => Ok(Vec::new()),
            Err(errors) => {
                let error_messages = errors.iter().map(|e| format!("{}", e)).collect();
                Ok(error_messages)
            }
        }
    }
}

/// Federation composition validator using graphql-composition
pub struct FederationCompositionValidator;

impl FederationCompositionValidator {
    /// Validate federation composition
    pub fn validate(subgraphs: Vec<(&str, &str)>) -> ValidationResult<Vec<String>> {
        use graphql_composition::{compose, ComposeOptions};

        let mut schemas = Vec::new();
        for (name, sdl) in subgraphs {
            schemas.push((name.to_string(), sdl.to_string()));
        }

        let options = ComposeOptions::default();

        match compose(&schemas, options) {
            Ok(_supergraph) => Ok(Vec::new()),
            Err(errors) => {
                let error_messages = errors.iter().map(|e| format!("{}", e)).collect();
                Ok(error_messages)
            }
        }
    }

    /// Check if SDL contains federation directives
    pub fn has_federation_directives(sdl: &str) -> bool {
        sdl.contains("@key")
            || sdl.contains("@requires")
            || sdl.contains("@provides")
            || sdl.contains("@external")
            || sdl.contains("@shareable")
    }
}

/// Comprehensive GraphQL validator
pub struct ComprehensiveGraphQLValidator;

impl ComprehensiveGraphQLValidator {
    /// Validate GraphQL SDL using all validators
    pub fn validate(sdl: &str, sdl_path: &str) -> GraphQLValidationReport {
        // Apollo Parser validation
        let apollo_parser_errors =
            ApolloParserValidator::validate(sdl).unwrap_or_else(|e| vec![e.to_string()]);
        let apollo_parser_valid = apollo_parser_errors.is_empty();

        // Apollo Compiler validation
        let apollo_compiler_errors =
            if FederationCompositionValidator::has_federation_directives(sdl) {
                ApolloCompilerValidator::validate_with_federation(sdl)
            } else {
                ApolloCompilerValidator::validate(sdl)
            }
            .unwrap_or_else(|e| vec![e.to_string()]);
        let apollo_compiler_valid = apollo_compiler_errors.is_empty();

        // Spec validation
        let spec_validation_errors =
            SpecValidator::validate(sdl).unwrap_or_else(|e| vec![e.to_string()]);
        let spec_validation_valid = spec_validation_errors.is_empty();

        // Federation validation (only if federation directives are present)
        let (federation_valid, federation_errors) =
            if FederationCompositionValidator::has_federation_directives(sdl) {
                let errors = FederationCompositionValidator::validate(vec![("subgraph", sdl)])
                    .unwrap_or_else(|e| vec![e.to_string()]);
                (Some(errors.is_empty()), errors)
            } else {
                (None, Vec::new())
            };

        let overall_valid = apollo_parser_valid
            && apollo_compiler_valid
            && spec_validation_valid
            && federation_valid.unwrap_or(true);

        GraphQLValidationReport {
            sdl_path: sdl_path.to_string(),
            apollo_parser_valid,
            apollo_parser_errors,
            apollo_compiler_valid,
            apollo_compiler_errors,
            spec_validation_valid,
            spec_validation_errors,
            federation_valid,
            federation_errors,
            overall_valid,
        }
    }

    /// Validate a GraphQL SDL file
    pub fn validate_file<P: AsRef<Path>>(path: P) -> ValidationResult<GraphQLValidationReport> {
        let path_ref = path.as_ref();
        let sdl_path = path_ref.to_string_lossy().to_string();

        let sdl = std::fs::read_to_string(path_ref)?;

        Ok(Self::validate(&sdl, &sdl_path))
    }

    /// Validate multiple GraphQL SDL files
    pub fn validate_files<P: AsRef<Path>>(paths: &[P]) -> Vec<GraphQLValidationReport> {
        paths
            .iter()
            .filter_map(|path| Self::validate_file(path).ok())
            .collect()
    }

    /// Validate all .graphql files in a directory
    pub fn validate_directory<P: AsRef<Path>>(
        dir: P,
    ) -> ValidationResult<Vec<GraphQLValidationReport>> {
        let dir_path = dir.as_ref();
        let mut reports = Vec::new();

        for entry in std::fs::read_dir(dir_path)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_file() {
                if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                    if ext == "graphql" || ext == "gql" {
                        if let Ok(report) = Self::validate_file(&path) {
                            reports.push(report);
                        }
                    }
                }
            }
        }

        Ok(reports)
    }
}

/// Benchmark results for GraphQL validation
#[derive(Debug, Clone)]
pub struct ValidationBenchmark {
    pub apollo_parser_duration_us: u64,
    pub apollo_compiler_duration_us: u64,
    pub spec_validation_duration_us: u64,
    pub federation_duration_us: Option<u64>,
    pub total_duration_us: u64,
}

impl ValidationBenchmark {
    /// Format benchmark results
    pub fn format(&self) -> String {
        let mut output = String::new();
        output.push_str("Validation Benchmark Results:\n");
        output.push_str(&format!(
            "  Apollo Parser:    {:>8} μs\n",
            self.apollo_parser_duration_us
        ));
        output.push_str(&format!(
            "  Apollo Compiler:  {:>8} μs\n",
            self.apollo_compiler_duration_us
        ));
        output.push_str(&format!(
            "  Spec Validation:  {:>8} μs\n",
            self.spec_validation_duration_us
        ));

        if let Some(federation_duration) = self.federation_duration_us {
            output.push_str(&format!(
                "  Federation:       {:>8} μs\n",
                federation_duration
            ));
        }

        output.push_str(&format!(
            "  Total:            {:>8} μs\n",
            self.total_duration_us
        ));
        output
    }
}

/// Benchmark GraphQL validation performance
pub struct ValidationBenchmarker;

impl ValidationBenchmarker {
    /// Benchmark validation performance
    pub fn benchmark(sdl: &str) -> ValidationBenchmark {
        use std::time::Instant;

        let total_start = Instant::now();

        // Apollo Parser
        let parser_start = Instant::now();
        let _ = ApolloParserValidator::validate(sdl);
        let apollo_parser_duration_us = parser_start.elapsed().as_micros() as u64;

        // Apollo Compiler
        let compiler_start = Instant::now();
        let _ = if FederationCompositionValidator::has_federation_directives(sdl) {
            ApolloCompilerValidator::validate_with_federation(sdl)
        } else {
            ApolloCompilerValidator::validate(sdl)
        };
        let apollo_compiler_duration_us = compiler_start.elapsed().as_micros() as u64;

        // Spec Validation
        let spec_start = Instant::now();
        let _ = SpecValidator::validate(sdl);
        let spec_validation_duration_us = spec_start.elapsed().as_micros() as u64;

        // Federation (if applicable)
        let federation_duration_us =
            if FederationCompositionValidator::has_federation_directives(sdl) {
                let federation_start = Instant::now();
                let _ = FederationCompositionValidator::validate(vec![("subgraph", sdl)]);
                Some(federation_start.elapsed().as_micros() as u64)
            } else {
                None
            };

        let total_duration_us = total_start.elapsed().as_micros() as u64;

        ValidationBenchmark {
            apollo_parser_duration_us,
            apollo_compiler_duration_us,
            spec_validation_duration_us,
            federation_duration_us,
            total_duration_us,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SIMPLE_SDL: &str = r#"
        type Query {
            hello: String
        }
    "#;

    const FEDERATION_SDL: &str = r#"
        type User @key(fields: "id") {
            id: ID!
            name: String!
        }

        type Query {
            user(id: ID!): User
        }
    "#;

    #[test]
    fn test_validate_simple_sdl() {
        let report = ComprehensiveGraphQLValidator::validate(SIMPLE_SDL, "test_simple");
        assert!(
            report.apollo_parser_valid,
            "Apollo parser should validate simple SDL: {:?}",
            report.apollo_parser_errors
        );
    }

    #[test]
    fn test_apollo_parser_can_parse() {
        assert!(ApolloParserValidator::can_parse(SIMPLE_SDL));
    }

    #[test]
    fn test_detect_federation_directives() {
        assert!(!FederationCompositionValidator::has_federation_directives(
            SIMPLE_SDL
        ));
        assert!(FederationCompositionValidator::has_federation_directives(
            FEDERATION_SDL
        ));
    }

    #[test]
    fn test_validation_benchmark() {
        let benchmark = ValidationBenchmarker::benchmark(SIMPLE_SDL);
        assert!(benchmark.total_duration_us > 0);
        assert!(benchmark.apollo_parser_duration_us > 0);
        println!("{}", benchmark.format());
    }

    #[test]
    fn test_federation_validation_report() {
        let report = ComprehensiveGraphQLValidator::validate(FEDERATION_SDL, "test_federation");
        assert!(report.has_federation_validation());
        println!("{}", report.format());
    }
}
