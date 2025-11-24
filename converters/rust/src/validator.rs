//! Validation utilities for JSON Schema and GraphQL SDL

use crate::error::{ConversionError, Result};
use regex::Regex;
use serde_json::Value as JsonValue;
use std::sync::OnceLock;

/// Regex for valid GraphQL names: /^[_A-Za-z][_0-9A-Za-z]*$/
fn graphql_name_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| Regex::new(r"^[_A-Za-z][_0-9A-Za-z]*$").unwrap())
}

/// Regex for valid GraphQL type references (including lists and non-null)
fn graphql_type_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| Regex::new(r"^(\[)?[_A-Za-z][_0-9A-Za-z]*!?(\])?!?$").unwrap())
}

/// Regex for valid federation field selections: fields(id, "name")
fn federation_fields_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| {
        Regex::new(r#"^[_A-Za-z][_0-9A-Za-z]*(\s+[_A-Za-z][_0-9A-Za-z]*|\s+"[^"]+")*(,\s*[_A-Za-z][_0-9A-Za-z]*(\s+[_A-Za-z][_0-9A-Za-z]*|\s+"[^"]+"))*$"#).unwrap()
    })
}

/// Regex for valid URLs
fn url_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| Regex::new(r"^https?://[^\s/$.?#].[^\s]*$").unwrap())
}

/// Validate a GraphQL name
pub fn validate_graphql_name(name: &str) -> Result<()> {
    if name.is_empty() {
        return Err(ConversionError::invalid_name(name, "name cannot be empty"));
    }

    if !graphql_name_regex().is_match(name) {
        return Err(ConversionError::invalid_name(
            name,
            "name must match /^[_A-Za-z][_0-9A-Za-z]*$/",
        ));
    }

    // Check for GraphQL reserved names
    if is_reserved_name(name) {
        return Err(ConversionError::invalid_name(
            name,
            "name is reserved by GraphQL specification",
        ));
    }

    Ok(())
}

/// Check if a name is reserved by GraphQL
fn is_reserved_name(name: &str) -> bool {
    // Names starting with __ are reserved
    name.starts_with("__")
}

/// Validate a GraphQL type reference
pub fn validate_graphql_type(type_str: &str) -> Result<()> {
    if type_str.is_empty() {
        return Err(ConversionError::InvalidType(
            "type cannot be empty".to_string(),
        ));
    }

    if !graphql_type_regex().is_match(type_str) {
        return Err(ConversionError::InvalidType(format!(
            "invalid GraphQL type format: {}",
            type_str
        )));
    }

    Ok(())
}

/// Validate federation field selection syntax
pub fn validate_federation_fields(fields: &str) -> Result<()> {
    if fields.is_empty() {
        return Err(ConversionError::FederationError(
            "fields selection cannot be empty".to_string(),
        ));
    }

    // Basic validation - more complex parsing would be needed for full support
    if !fields.chars().all(|c| {
        c.is_alphanumeric() || c == '_' || c == ' ' || c == '"' || c == ',' || c == '{' || c == '}'
    }) {
        return Err(ConversionError::FederationError(format!(
            "invalid characters in fields selection: {}",
            fields
        )));
    }

    Ok(())
}

/// Validate a URL
pub fn validate_url(url: &str) -> Result<()> {
    if !url_regex().is_match(url) {
        return Err(ConversionError::ValidationError(format!(
            "invalid URL format: {}",
            url
        )));
    }
    Ok(())
}

/// Validate JSON Schema structure
pub fn validate_json_schema(schema: &JsonValue) -> Result<()> {
    let mut errors = Vec::new();

    // Check if it's an object
    if !schema.is_object() {
        return Err(ConversionError::InvalidJsonSchema(
            "schema must be an object".to_string(),
        ));
    }

    let obj = schema.as_object().unwrap();

    // Validate $schema if present
    if let Some(schema_version) = obj.get("$schema") {
        if let Some(version_str) = schema_version.as_str() {
            if !version_str.contains("json-schema.org") {
                errors.push(ConversionError::validation(format!(
                    "invalid $schema URL: {}",
                    version_str
                )));
            }
        }
    }

    // Validate x-graphql-type-name if present
    if let Some(type_name) = obj.get("x-graphql-type-name") {
        if let Some(name) = type_name.as_str() {
            if let Err(e) = validate_graphql_name(name) {
                errors.push(e);
            }
        } else {
            errors.push(ConversionError::invalid_extension(
                "x-graphql-type-name must be a string",
            ));
        }
    }

    // Validate x-graphql-type if present
    if let Some(gql_type) = obj.get("x-graphql-type") {
        if let Some(type_str) = gql_type.as_str() {
            if let Err(e) = validate_graphql_type(type_str) {
                errors.push(e);
            }
        } else {
            errors.push(ConversionError::invalid_extension(
                "x-graphql-type must be a string",
            ));
        }
    }

    // Validate properties recursively
    if let Some(properties) = obj.get("properties") {
        if let Some(props_obj) = properties.as_object() {
            for (prop_name, prop_schema) in props_obj {
                // Validate property name format
                if prop_name.is_empty() {
                    errors.push(ConversionError::validation(
                        "property name cannot be empty".to_string(),
                    ));
                }

                // Recursively validate nested schemas
                if let Err(e) = validate_json_schema(prop_schema) {
                    errors.push(e);
                }
            }
        }
    }

    // Validate items for arrays
    if let Some(items) = obj.get("items") {
        if let Err(e) = validate_json_schema(items) {
            errors.push(e);
        }
    }

    // Validate x-graphql-directives if present
    if let Some(directives) = obj.get("x-graphql-directives") {
        if let Some(dir_array) = directives.as_array() {
            for directive in dir_array {
                if let Err(e) = validate_directive(directive) {
                    errors.push(e);
                }
            }
        } else {
            errors.push(ConversionError::invalid_extension(
                "x-graphql-directives must be an array",
            ));
        }
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(ConversionError::combine(errors))
    }
}

/// Validate a directive definition
fn validate_directive(directive: &JsonValue) -> Result<()> {
    let obj = directive.as_object().ok_or_else(|| {
        ConversionError::InvalidDirective("directive must be an object".to_string())
    })?;

    // Validate directive name
    if let Some(name) = obj.get("name") {
        if let Some(name_str) = name.as_str() {
            validate_graphql_name(name_str)?;
        } else {
            return Err(ConversionError::InvalidDirective(
                "directive name must be a string".to_string(),
            ));
        }
    } else {
        return Err(ConversionError::InvalidDirective(
            "directive must have a name".to_string(),
        ));
    }

    // Validate arguments if present
    if let Some(args) = obj.get("arguments") {
        if !args.is_object() {
            return Err(ConversionError::InvalidDirective(
                "directive arguments must be an object".to_string(),
            ));
        }
    }

    Ok(())
}

/// Validate GraphQL SDL syntax (basic validation)
pub fn validate_graphql_sdl(sdl: &str) -> Result<()> {
    if sdl.trim().is_empty() {
        return Err(ConversionError::InvalidGraphQLSdl(
            "SDL cannot be empty".to_string(),
        ));
    }

    // Basic syntax checks
    let lines: Vec<&str> = sdl.lines().collect();
    let mut errors = Vec::new();
    let mut brace_count = 0;
    let mut in_type_definition = false;

    for (line_num, line) in lines.iter().enumerate() {
        let trimmed = line.trim();

        // Skip empty lines and comments
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        // Count braces for matching
        brace_count += trimmed.matches('{').count() as i32;
        brace_count -= trimmed.matches('}').count() as i32;

        // Check for type definition keywords
        if trimmed.starts_with("type ")
            || trimmed.starts_with("interface ")
            || trimmed.starts_with("enum ")
            || trimmed.starts_with("union ")
            || trimmed.starts_with("input ")
            || trimmed.starts_with("scalar ")
        {
            in_type_definition = true;

            // Extract type name after keyword
            let parts: Vec<&str> = trimmed.split_whitespace().collect();
            if parts.len() >= 2 {
                let type_name = parts[1].trim_end_matches('{').trim();
                if let Err(e) = validate_graphql_name(type_name) {
                    errors.push(ConversionError::InvalidGraphQLSdl(format!(
                        "Line {}: {}",
                        line_num + 1,
                        e
                    )));
                }
            }
        }

        // Check for field syntax inside type definitions
        if in_type_definition && brace_count > 0 && trimmed.contains(':') {
            // Basic field validation: should have "name: Type" format
            if !trimmed.starts_with("type ")
                && !trimmed.starts_with("interface ")
                && !trimmed.starts_with("enum ")
                && !trimmed.starts_with("union ")
                && !trimmed.starts_with("input ")
            {
                let parts: Vec<&str> = trimmed.split(':').collect();
                if parts.len() < 2 {
                    errors.push(ConversionError::InvalidGraphQLSdl(format!(
                        "Line {}: Invalid field syntax",
                        line_num + 1
                    )));
                }
            }
        }

        // Check for text without colons inside type bodies (likely invalid)
        if in_type_definition
            && brace_count > 0
            && !trimmed.is_empty()
            && !trimmed.contains(':')
            && !trimmed.starts_with('@')
            && !trimmed.contains('{')
            && !trimmed.contains('}')
            && !trimmed.starts_with("\"")
            && !trimmed.starts_with("type ")
            && !trimmed.starts_with("interface ")
            && !trimmed.starts_with("enum ")
            && !trimmed.starts_with("union ")
            && !trimmed.starts_with("input ")
        {
            // Check if it looks like it should be a field (has alphanumeric chars)
            if trimmed.chars().any(|c| c.is_alphanumeric()) {
                errors.push(ConversionError::InvalidGraphQLSdl(format!(
                    "Line {}: Invalid field syntax - missing colon or type",
                    line_num + 1
                )));
            }
        }

        if brace_count == 0 && in_type_definition {
            in_type_definition = false;
        }
    }

    // Check for unmatched braces
    if brace_count != 0 {
        errors.push(ConversionError::InvalidGraphQLSdl(
            "Unmatched braces in SDL".to_string(),
        ));
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(ConversionError::combine(errors))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_validate_graphql_name() {
        assert!(validate_graphql_name("User").is_ok());
        assert!(validate_graphql_name("_privateField").is_ok());
        assert!(validate_graphql_name("field123").is_ok());

        assert!(validate_graphql_name("").is_err());
        assert!(validate_graphql_name("123invalid").is_err());
        assert!(validate_graphql_name("invalid-name").is_err());
        assert!(validate_graphql_name("__reserved").is_err());
    }

    #[test]
    fn test_validate_graphql_type() {
        assert!(validate_graphql_type("String").is_ok());
        assert!(validate_graphql_type("String!").is_ok());
        assert!(validate_graphql_type("[String]").is_ok());
        assert!(validate_graphql_type("[String!]!").is_ok());

        assert!(validate_graphql_type("").is_err());
        assert!(validate_graphql_type("123Invalid").is_err());
    }

    #[test]
    fn test_validate_url() {
        assert!(validate_url("https://example.com").is_ok());
        assert!(validate_url("http://localhost:8080/path").is_ok());

        assert!(validate_url("not-a-url").is_err());
        assert!(validate_url("ftp://example.com").is_err());
    }

    #[test]
    fn test_validate_json_schema() {
        let valid_schema = json!({
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "type": "object",
            "x-graphql-type-name": "User",
            "properties": {
                "id": {
                    "type": "string",
                    "x-graphql-type": "ID!"
                }
            }
        });

        assert!(validate_json_schema(&valid_schema).is_ok());

        let invalid_schema = json!({
            "type": "object",
            "x-graphql-type-name": "123Invalid"
        });

        assert!(validate_json_schema(&invalid_schema).is_err());
    }

    #[test]
    fn test_validate_directive() {
        let valid_directive = json!({
            "name": "key",
            "arguments": {
                "fields": "id"
            }
        });

        assert!(validate_directive(&valid_directive).is_ok());

        let invalid_directive = json!({
            "arguments": {}
        });

        assert!(validate_directive(&invalid_directive).is_err());
    }

    #[test]
    fn test_validate_graphql_sdl() {
        let valid_sdl = r#"
            type User {
                id: ID!
                name: String
            }
        "#;

        assert!(validate_graphql_sdl(valid_sdl).is_ok());

        let invalid_sdl = "";
        assert!(validate_graphql_sdl(invalid_sdl).is_err());
    }

    #[test]
    fn test_reserved_names() {
        assert!(is_reserved_name("__typename"));
        assert!(is_reserved_name("__schema"));
        assert!(!is_reserved_name("_privateField"));
        assert!(!is_reserved_name("User"));
    }
}
