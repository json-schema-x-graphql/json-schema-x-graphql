//! Error types for JSON Schema x GraphQL conversion

use serde::Serialize;
use std::error::Error as StdError;
use std::fmt;
use thiserror::Error;

/// Result type for conversion operations
pub type Result<T> = std::result::Result<T, ConversionError>;

/// Payload for JSON errors that preserves the original error chain
#[derive(Debug)]
pub struct JsonErrorPayload {
    inner: serde_json::Error,
}

impl JsonErrorPayload {
    pub fn new(err: serde_json::Error) -> Self {
        Self { inner: err }
    }
}

impl fmt::Display for JsonErrorPayload {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.inner)
    }
}

impl StdError for JsonErrorPayload {
    fn source(&self) -> Option<&(dyn StdError + 'static)> {
        Some(&self.inner)
    }
}

impl Serialize for JsonErrorPayload {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        // Serialize as the display string to preserve wire format
        serializer.serialize_str(&self.to_string())
    }
}

/// Payload for regex errors that preserves the original error chain
#[derive(Debug, Clone)]
pub struct RegexErrorPayload {
    inner: regex::Error,
}

impl RegexErrorPayload {
    pub fn new(err: regex::Error) -> Self {
        Self { inner: err }
    }
}

impl fmt::Display for RegexErrorPayload {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.inner)
    }
}

impl StdError for RegexErrorPayload {
    fn source(&self) -> Option<&(dyn StdError + 'static)> {
        Some(&self.inner)
    }
}

impl Serialize for RegexErrorPayload {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        // Serialize as the display string to preserve wire format
        serializer.serialize_str(&self.to_string())
    }
}

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

    /// Invalid reference
    #[error("Invalid reference: {0}")]
    InvalidReference(String),

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
    #[serde(serialize_with = "serialize_json_error_payload")]
    JsonError(#[source] JsonErrorPayload),

    /// Regex error
    #[error("Regex error: {0}")]
    #[serde(serialize_with = "serialize_regex_error_payload")]
    RegexError(#[source] RegexErrorPayload),

    /// Internal conversion error
    #[error("Internal error: {0}")]
    InternalError(String),

    /// Multiple errors occurred
    #[error("Multiple errors: {0:?}")]
    MultipleErrors(Vec<ConversionError>),
}

/// Serialize JsonErrorPayload as a string to preserve wire format
fn serialize_json_error_payload<S>(
    payload: &JsonErrorPayload,
    serializer: S,
) -> std::result::Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    payload.serialize(serializer)
}

/// Serialize RegexErrorPayload as a string to preserve wire format
fn serialize_regex_error_payload<S>(
    payload: &RegexErrorPayload,
    serializer: S,
) -> std::result::Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    payload.serialize(serializer)
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
        ConversionError::JsonError(JsonErrorPayload::new(err))
    }
}

impl From<regex::Error> for ConversionError {
    fn from(err: regex::Error) -> Self {
        ConversionError::RegexError(RegexErrorPayload::new(err))
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

    #[test]
    fn test_from_serde_json_error_preserves_source_chain() {
        let json_err = serde_json::from_str::<serde_json::Value>("{").unwrap_err();
        let err: ConversionError = json_err.into();

        // Check that source() returns Some
        assert!(
            err.source().is_some(),
            "source() should be Some for JsonError"
        );

        // Check that the source chain contains the original error message
        let source = err.source().unwrap();
        let source_str = source.to_string();
        assert!(
            source_str.contains("EOF") || source_str.contains("end of input"),
            "source chain should contain original error message, got: {}",
            source_str
        );
    }

    #[test]
    fn test_json_error_display_format() {
        let json_err = serde_json::from_str::<serde_json::Value>("{").unwrap_err();
        let err: ConversionError = json_err.into();

        // Display output should be byte-identical to old format: "JSON error: <msg>"
        let display_str = err.to_string();
        assert!(display_str.starts_with("JSON error: "));
        assert!(
            display_str.contains("EOF") || display_str.contains("end of input"),
            "display should contain original error message"
        );
    }

    #[test]
    fn test_json_error_serde_wire_format() {
        let json_err = serde_json::from_str::<serde_json::Value>("{").unwrap_err();
        let err: ConversionError = json_err.into();

        // Serialize to value and check wire format
        let value = serde_json::to_value(&err).expect("serialization should succeed");

        // Should match old format: {"type":"JsonError","details":"<display string>"}
        assert_eq!(value["type"], "JsonError");
        assert!(value["details"].is_string());
        let details = value["details"].as_str().unwrap();
        assert!(details.starts_with("EOF") || details.contains("end of input"));
    }

    #[test]
    #[allow(clippy::invalid_regex)]
    fn test_from_regex_error_preserves_source_chain() {
        // Create an invalid regex to trigger an error
        let regex_err = regex::Regex::new("*").unwrap_err();
        let err: ConversionError = regex_err.into();

        // Check that source() returns Some
        assert!(
            err.source().is_some(),
            "source() should be Some for RegexError"
        );

        // Check that the source chain contains the original error message
        let source = err.source().unwrap();
        let source_str = source.to_string();
        assert!(
            !source_str.is_empty(),
            "source chain should contain original error message, got: {}",
            source_str
        );
    }

    #[test]
    #[allow(clippy::invalid_regex)]
    fn test_regex_error_display_format() {
        let regex_err = regex::Regex::new("*").unwrap_err();
        let err: ConversionError = regex_err.into();

        // Display output should be byte-identical to old format: "Regex error: <msg>"
        let display_str = err.to_string();
        assert!(display_str.starts_with("Regex error: "));
        assert!(!display_str.is_empty());
    }

    #[test]
    #[allow(clippy::invalid_regex)]
    fn test_regex_error_serde_wire_format() {
        let regex_err = regex::Regex::new("*").unwrap_err();
        let err: ConversionError = regex_err.into();

        // Serialize to value and check wire format
        let value = serde_json::to_value(&err).expect("serialization should succeed");

        // Should match old format: {"type":"RegexError","details":"<display string>"}
        assert_eq!(value["type"], "RegexError");
        assert!(value["details"].is_string());
        let details = value["details"].as_str().unwrap();
        assert!(!details.is_empty());
    }

    #[test]
    fn test_json_error_payload_direct_construction() {
        let json_err = serde_json::from_str::<serde_json::Value>("{").unwrap_err();
        let payload = JsonErrorPayload::new(json_err);

        // Test Display
        let display_str = payload.to_string();
        assert!(display_str.contains("EOF") || display_str.contains("end of input"));

        // Test source()
        let source = payload.source();
        assert!(source.is_some());

        // Test Serialize
        let value = serde_json::to_value(&payload).expect("serialization should succeed");
        assert!(value.is_string());
    }

    #[test]
    #[allow(clippy::invalid_regex)]
    fn test_regex_error_payload_direct_construction() {
        let regex_err = regex::Regex::new("*").unwrap_err();
        let payload = RegexErrorPayload::new(regex_err);

        // Test Display
        let display_str = payload.to_string();
        assert!(!display_str.is_empty());

        // Test source()
        let source = payload.source();
        assert!(source.is_some());

        // Test Serialize
        let value = serde_json::to_value(&payload).expect("serialization should succeed");
        assert!(value.is_string());
    }
}
