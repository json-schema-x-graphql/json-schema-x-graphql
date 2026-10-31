//! Lint JSON Schema values for X-GraphQL attribute and naming issues.

use std::fmt;
use std::str::FromStr;

use serde_json::Value;

const VALIDATOR: &str = "x-graphql-lint";
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
const ALLOWED_NON_GRAPHQL: &[&str] = &[
    "x-request-id",
    "x-correlation-id",
    "x-trace-id",
    "x-original-type",
    "x-schema-version",
    "x-last-updated",
    "x-source-path",
];

/// A lint finding produced while inspecting a JSON Schema value.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ValidationIssue {
    /// Path to the schema value or attribute associated with the finding.
    pub path: String,
    /// Human-readable description of the finding.
    pub message: String,
    /// Whether the finding is an error or a warning.
    pub severity: ValidationSeverity,
    /// Name of the lint validator that produced the finding.
    pub validator: String,
}

/// Severity assigned to a [`ValidationIssue`].
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ValidationSeverity {
    /// A deprecated attribute or another error-level finding.
    Error,
    /// A convention violation or incomplete annotation.
    Warning,
}

impl fmt::Display for ValidationSeverity {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        let text = match self {
            Self::Error => "error",
            Self::Warning => "warning",
        };
        formatter.write_str(text)
    }
}

/// Error returned when parsing an unknown validation severity.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ParseValidationSeverityError;

impl fmt::Display for ParseValidationSeverityError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("unknown validation severity")
    }
}

impl std::error::Error for ParseValidationSeverityError {}

impl FromStr for ValidationSeverity {
    type Err = ParseValidationSeverityError;

    fn from_str(text: &str) -> Result<Self, Self::Err> {
        match text {
            "error" => Ok(Self::Error),
            "warning" => Ok(Self::Warning),
            _ => Err(ParseValidationSeverityError),
        }
    }
}

/// Lints a JSON Schema value for deprecated and non-standard X-GraphQL attributes.
#[must_use]
pub fn lint_schema(schema: &Value) -> Vec<ValidationIssue> {
    let mut issues = Vec::new();
    lint_value(schema, "$", &mut issues);
    issues
}

fn lint_value(value: &Value, path: &str, issues: &mut Vec<ValidationIssue>) {
    match value {
        Value::Object(object) => {
            for &(deprecated, replacement) in DEPRECATED_ATTRIBUTES {
                if object.contains_key(deprecated) {
                    issues.push(ValidationIssue {
                        path: format!("{path}.{deprecated}"),
                        message: format!(
                            "Deprecated attribute '{deprecated}' found. Use '{replacement}' instead."
                        ),
                        severity: ValidationSeverity::Error,
                        validator: VALIDATOR.to_owned(),
                    });
                }
            }

            for key in object.keys() {
                if key.starts_with("x-")
                    && !key.starts_with("x-graphql-")
                    && !key.starts_with("x-viaduct-")
                    && !ALLOWED_NON_GRAPHQL.contains(&key.as_str())
                {
                    issues.push(ValidationIssue {
                        path: format!("{path}.{key}"),
                        message: format!(
                            "Non-standard x-* attribute '{key}'. Consider using x-graphql-* namespace."
                        ),
                        severity: ValidationSeverity::Warning,
                        validator: VALIDATOR.to_owned(),
                    });
                }
            }

            for (key, child) in object {
                lint_value(child, &format!("{path}.{key}"), issues);
            }
        }
        Value::Array(values) => {
            for (index, child) in values.iter().enumerate() {
                lint_value(child, &format!("{path}[{index}]"), issues);
            }
        }
        _ => {}
    }
}

/// Lints definitions for missing type names and GraphQL naming violations.
#[must_use]
pub fn lint_definitions_completeness(schema: &Value) -> Vec<ValidationIssue> {
    let Some(schema) = schema.as_object() else {
        return Vec::new();
    };
    let definitions = match schema.get("$defs") {
        None | Some(Value::Null) => schema.get("definitions"),
        Some(definitions) => Some(definitions),
    };
    let Some(definitions) = definitions.and_then(Value::as_object) else {
        return Vec::new();
    };

    let mut issues = Vec::new();
    for (definition_name, definition_schema) in definitions {
        let Some(definition) = definition_schema.as_object() else {
            continue;
        };

        if definition
            .get("x-graphql-type-kind")
            .and_then(Value::as_str)
            == Some("SCALAR")
            || definition
                .get("x-graphql-enum")
                .is_some_and(is_javascript_truthy)
        {
            continue;
        }

        let has_type_name = definition.contains_key("x-graphql-type-name");
        let has_title = definition.contains_key("title");
        let is_object = definition.get("type").and_then(Value::as_str) == Some("object");
        if is_object && !has_type_name && !has_title {
            issues.push(ValidationIssue {
                path: format!("$.$defs.{definition_name}"),
                message: format!(
                    "Object definition '{definition_name}' missing x-graphql-type-name. Consider adding one for explicit type naming."
                ),
                severity: ValidationSeverity::Warning,
                validator: VALIDATOR.to_owned(),
            });
        }

        if let Some(type_name) = definition
            .get("x-graphql-type-name")
            .and_then(Value::as_str)
            && let Some(first_char) = type_name.chars().next()
        {
            let uppercase: String = first_char.to_uppercase().collect();
            if uppercase != first_char.to_string() {
                issues.push(ValidationIssue {
                    path: format!("$.$defs.{definition_name}.x-graphql-type-name"),
                    message: format!(
                        "Type name '{type_name}' should use PascalCase (start with uppercase)."
                    ),
                    severity: ValidationSeverity::Warning,
                    validator: VALIDATOR.to_owned(),
                });
            }
        }

        if let Some(properties) = definition.get("properties").and_then(Value::as_object) {
            for (property_name, property_schema) in properties {
                let Some(property) = property_schema.as_object() else {
                    continue;
                };
                if let Some(field_name) = property
                    .get("x-graphql-field-name")
                    .and_then(Value::as_str)
                    .filter(|field_name| field_name.contains('_'))
                {
                    issues.push(ValidationIssue {
                        path: format!(
                            "$.$defs.{definition_name}.properties.{property_name}.x-graphql-field-name"
                        ),
                        message: format!(
                            "Field name '{field_name}' uses snake_case. GraphQL fields should use camelCase."
                        ),
                        severity: ValidationSeverity::Warning,
                        validator: VALIDATOR.to_owned(),
                    });
                }
            }
        }
    }

    issues
}

fn is_javascript_truthy(value: &Value) -> bool {
    match value {
        Value::Null => false,
        Value::Bool(value) => *value,
        Value::Number(value) => value.as_f64().is_some_and(|value| value != 0.0),
        Value::String(value) => !value.is_empty(),
        Value::Array(_) | Value::Object(_) => true,
    }
}

/// Runs both lint passes, with schema-attribute findings before completeness findings.
#[must_use]
pub fn lint_all(schema: &Value) -> Vec<ValidationIssue> {
    let mut issues = lint_schema(schema);
    issues.extend(lint_definitions_completeness(schema));
    issues
}
