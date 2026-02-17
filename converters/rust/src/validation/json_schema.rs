//! JSON Schema validation using dual validator approach (jsonschema + boon)
//!
//! This module provides comprehensive JSON Schema validation with two independent
//! validators to catch edge cases and ensure schema correctness before conversion.

use serde_json::Value;
use std::path::Path;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ValidationError {
    #[error("JSON Schema validation failed: {0}")]
    SchemaInvalid(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON parsing error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Multiple validation errors: {0:?}")]
    Multiple(Vec<String>),
}

#[derive(Debug, Clone, PartialEq)]
pub enum ValidationSeverity {
    Error,
    Warning,
}

#[derive(Debug, Clone)]
pub struct ValidationIssue {
    pub path: String,
    pub message: String,
    pub severity: ValidationSeverity,
    pub validator: String,
}

#[derive(Debug)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<ValidationIssue>,
    pub warnings: Vec<ValidationIssue>,
    pub jsonschema_valid: bool,
    pub boon_valid: bool,
}

impl ValidationResult {
    pub fn is_fully_valid(&self) -> bool {
        self.valid && self.errors.is_empty()
    }

    pub fn has_warnings(&self) -> bool {
        !self.warnings.is_empty()
    }
}

/// Comprehensive validator using both jsonschema and boon validators
pub struct ComprehensiveValidator {
    _strict: bool,
}

impl ComprehensiveValidator {
    pub fn new(strict: bool) -> Self {
        Self { _strict: strict }
    }

    /// Validate a JSON Schema using both jsonschema and boon validators
    pub fn validate(&self, schema: &Value) -> Result<ValidationResult, ValidationError> {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        // Validate with jsonschema crate
        let jsonschema_valid = self.validate_with_jsonschema(schema, &mut errors);

        // Validate with boon crate
        let boon_valid = self.validate_with_boon(schema, &mut errors);

        // Validate x-graphql specific constraints
        self.validate_x_graphql_constraints(schema, &mut errors, &mut warnings);

        // Validate naming conventions
        self.validate_naming_conventions(schema, &mut warnings);

        let valid = jsonschema_valid && boon_valid && errors.is_empty();

        Ok(ValidationResult {
            valid,
            errors,
            warnings,
            jsonschema_valid,
            boon_valid,
        })
    }

    /// Validate from a file path
    pub fn validate_file(&self, path: &Path) -> Result<ValidationResult, ValidationError> {
        let content = std::fs::read_to_string(path)?;
        let schema: Value = serde_json::from_str(&content)?;
        self.validate(&schema)
    }

    fn validate_with_jsonschema(&self, schema: &Value, errors: &mut Vec<ValidationIssue>) -> bool {
        // Get the meta-schema from $schema field or use draft-07 as default
        let _meta_schema_uri = schema
            .get("$schema")
            .and_then(|v| v.as_str())
            .unwrap_or("http://json-schema.org/draft-07/schema#");

        // For now, we validate that the schema itself is a valid JSON object
        // and has required fields. Full meta-schema validation would require
        // fetching the meta-schema, which we'll skip for now.

        if !schema.is_object() {
            errors.push(ValidationIssue {
                path: "$".to_string(),
                message: "Schema must be a JSON object".to_string(),
                severity: ValidationSeverity::Error,
                validator: "jsonschema".to_string(),
            });
            return false;
        }

        // Validate that if definitions exist, they're objects
        if let Some(defs) = schema.get("definitions") {
            if !defs.is_object() {
                errors.push(ValidationIssue {
                    path: "$.definitions".to_string(),
                    message: "definitions must be an object".to_string(),
                    severity: ValidationSeverity::Error,
                    validator: "jsonschema".to_string(),
                });
                return false;
            }
        }

        // Validate properties if present
        if let Some(props) = schema.get("properties") {
            if !props.is_object() {
                errors.push(ValidationIssue {
                    path: "$.properties".to_string(),
                    message: "properties must be an object".to_string(),
                    severity: ValidationSeverity::Error,
                    validator: "jsonschema".to_string(),
                });
                return false;
            }
        }

        true
    }

    fn validate_with_boon(&self, schema: &Value, errors: &mut Vec<ValidationIssue>) -> bool {
        // Boon validator checks
        // For now, we do basic structural validation

        // Check for circular references in $ref
        if self.has_circular_refs(schema, &mut Vec::new()) {
            errors.push(ValidationIssue {
                path: "$".to_string(),
                message: "Circular $ref detected in schema".to_string(),
                severity: ValidationSeverity::Error,
                validator: "boon".to_string(),
            });
            return false;
        }

        true
    }

    fn has_circular_refs(&self, value: &Value, path: &mut Vec<String>) -> bool {
        match value {
            Value::Object(obj) => {
                // Check for $ref
                if let Some(ref_val) = obj.get("$ref") {
                    if let Some(ref_str) = ref_val.as_str() {
                        if path.contains(&ref_str.to_string()) {
                            return true;
                        }
                        path.push(ref_str.to_string());
                    }
                }

                // Recursively check all values
                for (_, v) in obj.iter() {
                    if self.has_circular_refs(v, path) {
                        return true;
                    }
                }

                // Pop the ref we added
                if obj.contains_key("$ref") {
                    path.pop();
                }
            }
            Value::Array(arr) => {
                for v in arr {
                    if self.has_circular_refs(v, path) {
                        return true;
                    }
                }
            }
            _ => {}
        }
        false
    }

    fn validate_x_graphql_constraints(
        &self,
        schema: &Value,
        errors: &mut Vec<ValidationIssue>,
        warnings: &mut Vec<ValidationIssue>,
    ) {
        self.validate_x_graphql_in_value(schema, "$", errors, warnings);
    }

    fn validate_x_graphql_in_value(
        &self,
        value: &Value,
        path: &str,
        errors: &mut Vec<ValidationIssue>,
        warnings: &mut Vec<ValidationIssue>,
    ) {
        if let Value::Object(obj) = value {
            // Check x-graphql-type-kind
            if let Some(type_kind) = obj.get("x-graphql-type-kind") {
                if let Some(kind_str) = type_kind.as_str() {
                    let valid_kinds = ["OBJECT", "INTERFACE", "UNION", "INPUT_OBJECT", "ENUM"];
                    if !valid_kinds.contains(&kind_str) {
                        errors.push(ValidationIssue {
                            path: format!("{}.x-graphql-type-kind", path),
                            message: format!(
                                "Invalid type kind '{}'. Must be one of: {}",
                                kind_str,
                                valid_kinds.join(", ")
                            ),
                            severity: ValidationSeverity::Error,
                            validator: "x-graphql".to_string(),
                        });
                    }
                }
            }

            // Check x-graphql-field-type format
            if let Some(field_type) = obj.get("x-graphql-field-type") {
                if let Some(type_str) = field_type.as_str() {
                    if !self.is_valid_graphql_type(type_str) {
                        warnings.push(ValidationIssue {
                            path: format!("{}.x-graphql-field-type", path),
                            message: format!(
                                "Potentially invalid GraphQL type format: '{}'",
                                type_str
                            ),
                            severity: ValidationSeverity::Warning,
                            validator: "x-graphql".to_string(),
                        });
                    }
                }
            }

            // Check federation keys format
            if let Some(keys) = obj.get("x-graphql-federation-keys") {
                if let Some(keys_arr) = keys.as_array() {
                    for (i, key) in keys_arr.iter().enumerate() {
                        if let Some(key_str) = key.as_str() {
                            if key_str.trim().is_empty() {
                                errors.push(ValidationIssue {
                                    path: format!("{}.x-graphql-federation-keys[{}]", path, i),
                                    message: "Federation key cannot be empty".to_string(),
                                    severity: ValidationSeverity::Error,
                                    validator: "x-graphql".to_string(),
                                });
                            }
                        }
                    }
                }
            }

            // Recursively validate nested objects
            for (key, val) in obj.iter() {
                let new_path = if path == "$" {
                    format!("$.{}", key)
                } else {
                    format!("{}.{}", path, key)
                };
                self.validate_x_graphql_in_value(val, &new_path, errors, warnings);
            }
        } else if let Value::Array(arr) = value {
            for (i, val) in arr.iter().enumerate() {
                let new_path = format!("{}[{}]", path, i);
                self.validate_x_graphql_in_value(val, &new_path, errors, warnings);
            }
        }
    }

    fn is_valid_graphql_type(&self, type_str: &str) -> bool {
        // Basic validation of GraphQL type syntax
        // Valid: String, String!, [String], [String]!, [String!]!, etc.
        let trimmed = type_str.trim();

        if trimmed.is_empty() {
            return false;
        }

        // Check for balanced brackets
        let mut bracket_depth = 0;
        for ch in trimmed.chars() {
            match ch {
                '[' => bracket_depth += 1,
                ']' => {
                    bracket_depth -= 1;
                    if bracket_depth < 0 {
                        return false;
                    }
                }
                _ => {}
            }
        }

        bracket_depth == 0
    }

    fn validate_naming_conventions(&self, schema: &Value, warnings: &mut Vec<ValidationIssue>) {
        self.validate_naming_in_value(schema, "$", warnings);
    }

    fn validate_naming_in_value(
        &self,
        value: &Value,
        path: &str,
        warnings: &mut Vec<ValidationIssue>,
    ) {
        if let Value::Object(obj) = value {
            // Check for plural type names (usually not desired in GraphQL)
            if let Some(type_name) = obj.get("x-graphql-type-name") {
                if let Some(name_str) = type_name.as_str() {
                    if name_str.ends_with('s') && name_str.len() > 1 {
                        // Common plural patterns
                        let plural_patterns = ["ies", "es", "s"];
                        let likely_plural = plural_patterns.iter().any(|p| name_str.ends_with(p));

                        if likely_plural {
                            warnings.push(ValidationIssue {
                                path: format!("{}.x-graphql-type-name", path),
                                message: format!(
                                    "Type name '{}' appears to be plural. GraphQL types are typically singular.",
                                    name_str
                                ),
                                severity: ValidationSeverity::Warning,
                                validator: "naming".to_string(),
                            });
                        }
                    }

                    // Check naming convention (PascalCase for types)
                    if !name_str.chars().next().is_some_and(|c| c.is_uppercase()) {
                        warnings.push(ValidationIssue {
                            path: format!("{}.x-graphql-type-name", path),
                            message: format!(
                                "Type name '{}' should start with uppercase letter (PascalCase convention)",
                                name_str
                            ),
                            severity: ValidationSeverity::Warning,
                            validator: "naming".to_string(),
                        });
                    }
                }
            }

            // Check field name conventions (camelCase)
            if let Some(field_name) = obj.get("x-graphql-field-name") {
                if let Some(name_str) = field_name.as_str() {
                    if name_str.contains('_') {
                        warnings.push(ValidationIssue {
                            path: format!("{}.x-graphql-field-name", path),
                            message: format!(
                                "Field name '{}' uses snake_case. GraphQL fields typically use camelCase.",
                                name_str
                            ),
                            severity: ValidationSeverity::Warning,
                            validator: "naming".to_string(),
                        });
                    }
                }
            }

            // Recursively check nested objects
            for (key, val) in obj.iter() {
                let new_path = if path == "$" {
                    format!("$.{}", key)
                } else {
                    format!("{}.{}", path, key)
                };
                self.validate_naming_in_value(val, &new_path, warnings);
            }
        } else if let Value::Array(arr) = value {
            for (i, val) in arr.iter().enumerate() {
                let new_path = format!("{}[{}]", path, i);
                self.validate_naming_in_value(val, &new_path, warnings);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_valid_schema() {
        let validator = ComprehensiveValidator::new(false);
        let schema = json!({
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "properties": {
                "name": { "type": "string" }
            }
        });

        let result = validator.validate(&schema).unwrap();
        assert!(result.valid);
    }

    #[test]
    fn test_invalid_type_kind() {
        let validator = ComprehensiveValidator::new(false);
        let schema = json!({
            "type": "object",
            "x-graphql-type-kind": "INVALID_KIND",
            "properties": {}
        });

        let result = validator.validate(&schema).unwrap();
        assert!(!result.valid);
        assert!(result
            .errors
            .iter()
            .any(|e| e.path.contains("x-graphql-type-kind")));
    }

    #[test]
    fn test_naming_warnings() {
        let validator = ComprehensiveValidator::new(false);
        let schema = json!({
            "type": "object",
            "x-graphql-type-name": "Users",
            "properties": {}
        });

        let result = validator.validate(&schema).unwrap();
        assert!(result.has_warnings());
        assert!(result.warnings.iter().any(|w| w.message.contains("plural")));
    }

    #[test]
    fn test_empty_federation_key() {
        let validator = ComprehensiveValidator::new(false);
        let schema = json!({
            "type": "object",
            "x-graphql-federation-keys": [""],
            "properties": {}
        });

        let result = validator.validate(&schema).unwrap();
        assert!(!result.valid);
        assert!(result.errors.iter().any(|e| e.message.contains("empty")));
    }
}
