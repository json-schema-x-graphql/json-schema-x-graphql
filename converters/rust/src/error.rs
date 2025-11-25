//! Error types for JSON Schema x GraphQL conversion

use serde::Serialize;
use thiserror::Error;

/// Result type for conversion operations
pub type Result<T> = std::result::Result<T, ConversionError>;

/// Errors that can occur during conversion
#[derive(Error, Debug, Serialize)]
#[serde(tag = "type", content = "details")]
pub enum ConversionError {
    /// Invalid JSON Schema input
    #[error("Invalid JSON Schema: {0}")]
    InvalidJsonSchema(String),

    /// Invalid GraphQL SDL input
    #[error("Invalid GraphQL SDL: {0}")]
    InvalidGraphQLSdl(String),

    /// Missing required field or extension
    #[error("Missing required field: {0}")]
    MissingRequiredField(String),

    /// Invalid type definition
    #[error("Invalid type definition: {0}")]
    InvalidType(String),

    /// Invalid field definition
    #[error("Invalid field definition: {0}")]
    InvalidField(String),

    /// Invalid directive
    #[error("Invalid directive: {0}")]
    InvalidDirective(String),

    /// Invalid GraphQL name (must match /^[_A-Za-z][_0-9A-Za-z]*$/)
    #[error("Invalid GraphQL name '{0}': {1}")]
    InvalidGraphQLName(String, String),

    /// Invalid x-graphql extension
    #[error("Invalid x-graphql-* extension: {0}")]
    InvalidExtension(String),

    /// Validation error
    #[error("Validation error: {0}")]
    ValidationError(String),

    /// Federation error
    #[error("Federation error: {0}")]
    FederationError(String),

    /// Unsupported feature
    #[error("Unsupported feature: {0}")]
    UnsupportedFeature(String),

    /// Type mismatch between JSON Schema and GraphQL
    #[error("Type mismatch: {0}")]
    TypeMismatch(String),

    /// Circular reference detected
    #[error("Circular reference detected: {0}")]
    CircularReference(String),

    /// JSON serialization/deserialization error
    #[error("JSON error: {0}")]
    JsonError(String),

    /// Regex error
    #[error("Regex error: {0}")]
    RegexError(String),

    /// Internal conversion error
    #[error("Internal error: {0}")]
    InternalError(String),

    /// Multiple errors occurred
    #[error("Multiple errors: {0:?}")]
    MultipleErrors(Vec<ConversionError>),
}

impl ConversionError {
    /// Create a validation error
    pub fn validation(msg: impl Into<String>) -> Self {
        Self::ValidationError(msg.into())
    }

    /// Create an invalid GraphQL name error
    pub fn invalid_name(name: impl Into<String>, reason: impl Into<String>) -> Self {
        Self::InvalidGraphQLName(name.into(), reason.into())
    }

    /// Create a missing field error
    pub fn missing_field(field: impl Into<String>) -> Self {
        Self::MissingRequiredField(field.into())
    }

    /// Create an invalid extension error
    pub fn invalid_extension(msg: impl Into<String>) -> Self {
        Self::InvalidExtension(msg.into())
    }

    /// Create a type mismatch error
    pub fn type_mismatch(msg: impl Into<String>) -> Self {
        Self::TypeMismatch(msg.into())
    }

    /// Create an unsupported feature error
    pub fn unsupported(msg: impl Into<String>) -> Self {
        Self::UnsupportedFeature(msg.into())
    }

    /// Combine multiple errors into one
    pub fn combine(errors: Vec<ConversionError>) -> Self {
        if errors.len() == 1 {
            errors.into_iter().next().unwrap()
        } else {
            Self::MultipleErrors(errors)
        }
    }
}

impl From<serde_json::Error> for ConversionError {
    fn from(err: serde_json::Error) -> Self {
        ConversionError::JsonError(err.to_string())
    }
}

impl From<regex::Error> for ConversionError {
    fn from(err: regex::Error) -> Self {
        ConversionError::RegexError(err.to_string())
    }
}

#[cfg(feature = "wasm")]
impl From<ConversionError> for wasm_bindgen::JsValue {
    fn from(err: ConversionError) -> Self {
        serde_wasm_bindgen::to_value(&err)
            .unwrap_or_else(|_| wasm_bindgen::JsValue::from_str(&err.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_creation() {
        let err = ConversionError::validation("test error");
        assert!(matches!(err, ConversionError::ValidationError(_)));
        assert_eq!(err.to_string(), "Validation error: test error");
    }

    #[test]
    fn test_invalid_name_error() {
        let err = ConversionError::invalid_name("123invalid", "must start with letter");
        assert!(matches!(err, ConversionError::InvalidGraphQLName(_, _)));
        assert!(err.to_string().contains("123invalid"));
        assert!(err.to_string().contains("must start with letter"));
    }

    #[test]
    fn test_combine_errors() {
        let errors = vec![
            ConversionError::validation("error 1"),
            ConversionError::validation("error 2"),
        ];
        let combined = ConversionError::combine(errors);
        assert!(matches!(combined, ConversionError::MultipleErrors(_)));
    }

    #[test]
    fn test_combine_single_error() {
        let errors = vec![ConversionError::validation("single error")];
        let combined = ConversionError::combine(errors);
        assert!(matches!(combined, ConversionError::ValidationError(_)));
    }
}
