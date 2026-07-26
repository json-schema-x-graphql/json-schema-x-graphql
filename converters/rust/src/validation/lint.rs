//! X-GraphQL attribute linting and completeness validation.
//!
//! Validates naming conventions, deprecated attributes, required field
//! completeness, and federation key presence.

use serde_json::Value;

use super::json_schema::{ValidationIssue, ValidationSeverity};

/// Deprecated x-* attribute mappings (old → new).
const DEPRECATED_ATTRIBUTES: &[(&str, &str)] = &[
    ("x-fpds-source", "x-graphql-source-reference"),
    ("x-fpds-mapping-type", "x-graphql-source-mapping-type"),
    ("x-mapping-notes", "x-graphql-mapping-notes"),
    ("x-source-table", "x-graphql-source-table"),
    ("x-source-field-name", "x-graphql-source-field-name"),
    ("x-update-note", "x-graphql-update-note"),
    ("x-sensitive", "x-graphql-sensitive-data"),
    ("x-cost", "x-graphql-query-cost"),
    ("x-complexity", "x-graphql-query-complexity"),
];

/// Allowed non-graphql x-* prefixes (project-specific).
const ALLOWED_NON_GRAPHQL: &[&str] = &[
    "x-request-id",
    "x-correlation-id",
    "x-trace-id",
    "x-original-type",
    "x-schema-version",
    "x-last-updated",
    "x-source-path",
];

/// Lint a JSON Schema value for x-graphql attribute issues.
///
/// Returns a list of warnings (non-fatal) and errors (fatal).
pub fn lint_schema(schema: &Value) -> Vec<ValidationIssue> {
    let mut issues = Vec::new();
    lint_value(schema, "$", &mut issues);
    issues
}

fn lint_value(value: &Value, path: &str, issues: &mut Vec<ValidationIssue>) {
    if let Value::Object(obj) = value {
        // Check for deprecated x-* attributes
        for (deprecated, replacement) in DEPRECATED_ATTRIBUTES {
            if obj.contains_key(*deprecated) {
                issues.push(ValidationIssue {
                    path: format!("{}.{}", path, deprecated),
                    message: format!(
                        "Deprecated attribute '{}' found. Use '{}' instead.",
                        deprecated, replacement
                    ),
                    severity: ValidationSeverity::Error,
                    validator: "x-graphql-lint".to_string(),
                });
            }
        }

        // Check for invalid x-* prefixes (non-standard, non-graphql, non-allowed)
        for key in obj.keys() {
            if key.starts_with("x-")
                && !key.starts_with("x-graphql-")
                && !key.starts_with("x-viaduct-")
                && !ALLOWED_NON_GRAPHQL.contains(&key.as_str())
            {
                issues.push(ValidationIssue {
                    path: format!("{}.{}", path, key),
                    message: format!(
                        "Non-standard x-* attribute '{}'. Consider using x-graphql-* namespace.",
                        key
                    ),
                    severity: ValidationSeverity::Warning,
                    validator: "x-graphql-lint".to_string(),
                });
            }
        }

        // Recurse into nested objects
        for (key, val) in obj.iter() {
            let new_path = if path == "$" {
                format!("$.{}", key)
            } else {
                format!("{}.{}", path, key)
            };
            lint_value(val, &new_path, issues);
        }
    } else if let Value::Array(arr) = value {
        for (i, val) in arr.iter().enumerate() {
            let new_path = format!("{}[{}]", path, i);
            lint_value(val, &new_path, issues);
        }
    }
}

/// Validate completeness of x-graphql annotations on definitions.
///
/// Checks:
/// - Missing `x-graphql-type-name` on object definitions
/// - Missing federation keys on types with `x-graphql-federation`
pub fn lint_definitions_completeness(schema: &Value) -> Vec<ValidationIssue> {
    let mut issues = Vec::new();
    let obj = match schema.as_object() {
        Some(o) => o,
        None => return issues,
    };

    let defs = obj
        .get("$defs")
        .or_else(|| obj.get("definitions"))
        .and_then(|d| d.as_object());

    if let Some(defs_obj) = defs {
        for (def_name, def_schema) in defs_obj {
            if let Some(def_obj) = def_schema.as_object() {
                // Skip scalar/enum-only definitions
                if def_obj.get("x-graphql-type-kind").and_then(|v| v.as_str()) == Some("SCALAR") {
                    continue;
                }
                if def_obj.contains_key("x-graphql-enum") {
                    continue;
                }

                // Check for type-name
                let has_type_name = def_obj.contains_key("x-graphql-type-name");
                let has_title = def_obj.contains_key("title");
                let is_object = def_obj.get("type").and_then(|v| v.as_str()) == Some("object");

                if is_object && !has_type_name && !has_title {
                    issues.push(ValidationIssue {
                        path: format!("$.$defs.{}", def_name),
                        message: format!(
                            "Object definition '{}' missing x-graphql-type-name. Consider adding one for explicit type naming.",
                            def_name
                        ),
                        severity: ValidationSeverity::Warning,
                        validator: "x-graphql-lint".to_string(),
                    });
                }

                // Check federation key presence
                let _has_federation = def_obj.contains_key("x-graphql-federation")
                    || def_obj.contains_key("x-graphql-federation-keys")
                    || def_obj.contains_key("x-graphql-federation-key");

                let is_entity = def_obj
                    .get("x-graphql-federation")
                    .and_then(|f| f.as_object())
                    .is_some_and(|f| f.contains_key("keys"));

                if is_entity
                    && !def_obj.contains_key("x-graphql-federation-keys")
                    && !def_obj.contains_key("x-graphql-federation-key")
                {
                    // Has federation but no explicit keys field
                    let keys = def_obj
                        .get("x-graphql-federation")
                        .and_then(|f| f.get("keys"));
                    if keys.is_none() {
                        issues.push(ValidationIssue {
                            path: format!("$.$defs.{}", def_name),
                            message: format!(
                                "Definition '{}' has x-graphql-federation but no keys specified. Add x-graphql-federation-keys or x-graphql-federation.keys.",
                                def_name
                            ),
                            severity: ValidationSeverity::Warning,
                            validator: "x-graphql-lint".to_string(),
                        });
                    }
                }

                // Check type-name PascalCase convention
                if let Some(type_name) = def_obj.get("x-graphql-type-name").and_then(|v| v.as_str())
                {
                    if let Some(first_char) = type_name.chars().next() {
                        if !first_char.is_uppercase() {
                            issues.push(ValidationIssue {
                                path: format!("$.$defs.{}.x-graphql-type-name", def_name),
                                message: format!(
                                    "Type name '{}' should use PascalCase (start with uppercase).",
                                    type_name
                                ),
                                severity: ValidationSeverity::Warning,
                                validator: "x-graphql-lint".to_string(),
                            });
                        }
                    }
                }

                // Check field names in properties
                if let Some(properties) = def_obj.get("properties").and_then(|p| p.as_object()) {
                    for (prop_name, prop_schema) in properties {
                        if let Some(prop_obj) = prop_schema.as_object() {
                            // Check field-name camelCase convention
                            if let Some(field_name) = prop_obj
                                .get("x-graphql-field-name")
                                .and_then(|v| v.as_str())
                            {
                                if field_name.contains('_') {
                                    issues.push(ValidationIssue {
                                        path: format!(
                                            "$.${}.properties.{}.x-graphql-field-name",
                                            def_name, prop_name
                                        ),
                                        message: format!(
                                            "Field name '{}' uses snake_case. GraphQL fields should use camelCase.",
                                            field_name
                                        ),
                                        severity: ValidationSeverity::Warning,
                                        validator: "x-graphql-lint".to_string(),
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    issues
}

/// Run all linting rules and return combined issues.
pub fn lint_all(schema: &Value) -> Vec<ValidationIssue> {
    let mut issues = lint_schema(schema);
    issues.extend(lint_definitions_completeness(schema));
    issues
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_detect_deprecated_attribute() {
        let schema = json!({
            "$defs": {
                "Contract": {
                    "type": "object",
                    "x-fpds-source": "some_value",
                    "x-graphql-type-name": "Contract"
                }
            }
        });
        let issues = lint_schema(&schema);
        assert!(issues.iter().any(|i| i.message.contains("x-fpds-source")));
    }

    #[test]
    fn test_detect_invalid_x_prefix() {
        let schema = json!({
            "$defs": {
                "Contract": {
                    "type": "object",
                    "x-custom-thing": "value",
                    "x-graphql-type-name": "Contract"
                }
            }
        });
        let issues = lint_schema(&schema);
        assert!(issues.iter().any(|i| i.message.contains("x-custom-thing")));
    }

    #[test]
    fn test_allowed_x_prefix_no_warning() {
        let schema = json!({
            "x-request-id": "abc123"
        });
        let issues = lint_schema(&schema);
        assert!(!issues.iter().any(|i| i.message.contains("x-request-id")));
    }

    #[test]
    fn test_missing_type_name_warning() {
        let schema = json!({
            "$defs": {
                "no_name": {
                    "type": "object",
                    "properties": {
                        "id": { "type": "string" }
                    }
                }
            }
        });
        let issues = lint_definitions_completeness(&schema);
        assert!(issues
            .iter()
            .any(|i| i.message.contains("missing x-graphql-type-name")));
    }

    #[test]
    fn test_type_name_pascal_case_warning() {
        let schema = json!({
            "$defs": {
                "lowercase": {
                    "type": "object",
                    "x-graphql-type-name": "lowercaseType"
                }
            }
        });
        let issues = lint_definitions_completeness(&schema);
        assert!(issues.iter().any(|i| i.message.contains("PascalCase")));
    }

    #[test]
    fn test_field_name_snake_case_warning() {
        let schema = json!({
            "$defs": {
                "Test": {
                    "type": "object",
                    "x-graphql-type-name": "Test",
                    "properties": {
                        "snake_field": {
                            "type": "string",
                            "x-graphql-field-name": "snake_field"
                        }
                    }
                }
            }
        });
        let issues = lint_definitions_completeness(&schema);
        assert!(issues.iter().any(|i| i.message.contains("snake_case")));
    }

    #[test]
    fn test_clean_schema_no_issues() {
        let schema = json!({
            "$defs": {
                "User": {
                    "type": "object",
                    "x-graphql-type-name": "User",
                    "x-graphql-federation-keys": ["id"],
                    "properties": {
                        "user_id": {
                            "type": "string",
                            "x-graphql-field-name": "id"
                        }
                    }
                }
            }
        });
        let issues = lint_all(&schema);
        // Should have no errors, potentially some warnings
        assert!(!issues
            .iter()
            .any(|i| i.severity == ValidationSeverity::Error));
    }
}
