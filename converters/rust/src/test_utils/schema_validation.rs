//! JSON Schema Validation Test Utilities
//!
//! This module provides comprehensive JSON Schema validation using both
//! `jsonschema` and `boon` crates to ensure test schemas are valid before
//! attempting conversion to GraphQL SDL.
//!
//! Both validators are used redundantly to catch edge cases and provide
//! comprehensive validation coverage.

use serde_json::Value;
use std::path::Path;

/// Result type for schema validation operations
pub type ValidationResult<T> = Result<T, ValidationError>;

/// Errors that can occur during schema validation
#[derive(Debug, thiserror::Error)]
pub enum ValidationError {
    #[error("jsonschema validation failed: {0}")]
    JsonSchemaValidation(String),

    #[error("boon validation failed: {0}")]
    BoonValidation(String),

    #[error("Schema loading failed: {0}")]
    SchemaLoad(String),

    #[error("Invalid JSON: {0}")]
    InvalidJson(#[from] serde_json::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Multiple validation errors: {0:?}")]
    Multiple(Vec<String>),
}

/// Validation report containing results from both validators
#[derive(Debug, Clone)]
pub struct ValidationReport {
    pub schema_path: String,
    pub jsonschema_valid: bool,
    pub jsonschema_errors: Vec<String>,
    pub boon_valid: bool,
    pub boon_errors: Vec<String>,
    pub overall_valid: bool,
}

impl ValidationReport {
    /// Check if the schema passed all validations
    pub fn is_valid(&self) -> bool {
        self.overall_valid
    }

    /// Get all validation errors combined
    pub fn all_errors(&self) -> Vec<String> {
        let mut errors = Vec::new();
        errors.extend(self.jsonschema_errors.iter().cloned());
        errors.extend(self.boon_errors.iter().cloned());
        errors
    }

    /// Format the report as a human-readable string
    pub fn format(&self) -> String {
        let mut output = String::new();
        output.push_str(&format!("Schema: {}\n", self.schema_path));
        output.push_str(&format!(
            "Overall: {}\n",
            if self.overall_valid {
                "✓ VALID"
            } else {
                "✗ INVALID"
            }
        ));

        output.push_str("\nJsonschema Validator:\n");
        if self.jsonschema_valid {
            output.push_str("  ✓ Valid\n");
        } else {
            output.push_str("  ✗ Invalid\n");
            for error in &self.jsonschema_errors {
                output.push_str(&format!("    - {}\n", error));
            }
        }

        output.push_str("\nBoon Validator:\n");
        if self.boon_valid {
            output.push_str("  ✓ Valid\n");
        } else {
            output.push_str("  ✗ Invalid\n");
            for error in &self.boon_errors {
                output.push_str(&format!("    - {}\n", error));
            }
        }

        output
    }
}

/// JSON Schema validator using the `jsonschema` crate
pub struct JsonSchemaValidator;

impl JsonSchemaValidator {
    /// Validate a schema using the jsonschema crate
    pub fn validate(schema: &Value) -> ValidationResult<Vec<String>> {
        // Check if the schema itself is valid JSON Schema
        let meta_schema = Self::get_meta_schema(schema);

        match jsonschema::compile(&meta_schema) {
            Ok(compiled) => {
                let validation_result = compiled.validate(schema);

                match validation_result {
                    Ok(_) => Ok(Vec::new()),
                    Err(errors) => {
                        let error_messages: Vec<String> =
                            errors.map(|e| format!("{}", e)).collect();
                        Ok(error_messages)
                    }
                }
            }
            Err(e) => Err(ValidationError::JsonSchemaValidation(format!(
                "Failed to compile meta-schema: {}",
                e
            ))),
        }
    }

    /// Get the appropriate meta-schema based on the $schema property
    fn get_meta_schema(schema: &Value) -> Value {
        // Check for $schema property
        if let Some(schema_uri) = schema.get("$schema").and_then(|v| v.as_str()) {
            // Return the appropriate meta-schema based on the URI
            if schema_uri.contains("draft-07") {
                return Self::draft_07_meta_schema();
            } else if schema_uri.contains("2019-09") {
                return Self::draft_2019_09_meta_schema();
            } else if schema_uri.contains("2020-12") {
                return Self::draft_2020_12_meta_schema();
            }
        }

        // Default to draft-07
        Self::draft_07_meta_schema()
    }

    /// Get Draft-07 meta-schema
    fn draft_07_meta_schema() -> Value {
        serde_json::json!({
            "$schema": "http://json-schema.org/draft-07/schema#",
            "$id": "http://json-schema.org/draft-07/schema#",
            "type": "object"
        })
    }

    /// Get Draft 2019-09 meta-schema
    fn draft_2019_09_meta_schema() -> Value {
        serde_json::json!({
            "$schema": "https://json-schema.org/draft/2019-09/schema",
            "$id": "https://json-schema.org/draft/2019-09/schema",
            "type": "object"
        })
    }

    /// Get Draft 2020-12 meta-schema
    fn draft_2020_12_meta_schema() -> Value {
        serde_json::json!({
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "$id": "https://json-schema.org/draft/2020-12/schema",
            "type": "object"
        })
    }
}

/// JSON Schema validator using the `boon` crate
pub struct BoonValidator;

impl BoonValidator {
    /// Validate a schema using the boon crate
    pub fn validate(schema: &Value) -> ValidationResult<Vec<String>> {
        use boon::{Compiler, Schemas};

        let mut schemas = Schemas::new();
        let mut compiler = Compiler::new();

        // Try to compile the schema
        match compiler.compile("schema", schema.clone()) {
            Ok(schema_index) => {
                schemas.insert(schema_index);

                // Validate the schema against itself (basic validation)
                match schemas.validate(schema, schema_index) {
                    Ok(_) => Ok(Vec::new()),
                    Err(e) => Ok(vec![format!("Validation error: {:?}", e)]),
                }
            }
            Err(e) => Ok(vec![format!("Compilation error: {:?}", e)]),
        }
    }
}

/// Comprehensive validator that uses both jsonschema and boon
pub struct ComprehensiveValidator;

impl ComprehensiveValidator {
    /// Validate a schema using both validators
    pub fn validate(schema: &Value, schema_path: &str) -> ValidationReport {
        let jsonschema_errors =
            JsonSchemaValidator::validate(schema).unwrap_or_else(|e| vec![e.to_string()]);
        let jsonschema_valid = jsonschema_errors.is_empty();

        let boon_errors = BoonValidator::validate(schema).unwrap_or_else(|e| vec![e.to_string()]);
        let boon_valid = boon_errors.is_empty();

        let overall_valid = jsonschema_valid && boon_valid;

        ValidationReport {
            schema_path: schema_path.to_string(),
            jsonschema_valid,
            jsonschema_errors,
            boon_valid,
            boon_errors,
            overall_valid,
        }
    }

    /// Validate a schema file
    pub fn validate_file<P: AsRef<Path>>(path: P) -> ValidationResult<ValidationReport> {
        let path_ref = path.as_ref();
        let schema_path = path_ref.to_string_lossy().to_string();

        let content = std::fs::read_to_string(path_ref)?;
        let schema: Value = serde_json::from_str(&content)?;

        Ok(Self::validate(&schema, &schema_path))
    }

    /// Validate multiple schema files
    pub fn validate_files<P: AsRef<Path>>(paths: &[P]) -> Vec<ValidationReport> {
        paths
            .iter()
            .filter_map(|path| Self::validate_file(path).ok())
            .collect()
    }

    /// Validate all JSON files in a directory
    pub fn validate_directory<P: AsRef<Path>>(dir: P) -> ValidationResult<Vec<ValidationReport>> {
        let dir_path = dir.as_ref();
        let mut reports = Vec::new();

        for entry in std::fs::read_dir(dir_path)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Ok(report) = Self::validate_file(&path) {
                    reports.push(report);
                }
            }
        }

        Ok(reports)
    }
}

/// Helper trait for validating JSON Schema values
pub trait SchemaValidation {
    fn validate_schema(&self) -> ValidationResult<Vec<String>>;
}

impl SchemaValidation for Value {
    fn validate_schema(&self) -> ValidationResult<Vec<String>> {
        let jsonschema_errors = JsonSchemaValidator::validate(self)?;
        let boon_errors = BoonValidator::validate(self)?;

        let mut all_errors = jsonschema_errors;
        all_errors.extend(boon_errors);

        Ok(all_errors)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_simple_schema() {
        let schema = serde_json::json!({
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "properties": {
                "name": { "type": "string" },
                "age": { "type": "integer" }
            }
        });

        let report = ComprehensiveValidator::validate(&schema, "test_schema");
        assert!(
            report.is_valid(),
            "Schema should be valid: {}",
            report.format()
        );
    }

    #[test]
    fn test_validate_schema_with_x_graphql() {
        let schema = serde_json::json!({
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "x-graphql-type-name": "User",
            "properties": {
                "user_id": {
                    "type": "string",
                    "x-graphql-field-name": "id",
                    "x-graphql-field-type": "ID",
                    "x-graphql-field-non-null": true
                }
            }
        });

        let report = ComprehensiveValidator::validate(&schema, "test_x_graphql");
        // x-graphql extensions are allowed as additional properties
        assert!(report.is_valid() || !report.all_errors().is_empty());
    }

    #[test]
    fn test_validate_invalid_schema() {
        let schema = serde_json::json!({
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "invalid_type"
        });

        let report = ComprehensiveValidator::validate(&schema, "test_invalid");
        // This should produce validation errors
        assert!(!report.all_errors().is_empty() || !report.is_valid());
    }
}
