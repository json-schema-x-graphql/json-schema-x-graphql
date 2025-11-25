//! JSON Schema x GraphQL Converter
//!
//! Bidirectional, lossless converter between JSON Schema and GraphQL SDL
//! using standardized `x-graphql-*` extensions.
//!
//! # Features
//!
//! - Convert JSON Schema to GraphQL SDL
//! - Convert GraphQL SDL to JSON Schema
//! - Preserve all metadata via `x-graphql-*` extensions
//! - Support for Apollo Federation directives
//! - WASM-compatible for browser usage
//! - Optional LRU caching for performance
//!
//! # Example
//!
//! ```rust
//! use json_schema_graphql_converter::{Converter, ConversionDirection};
//!
//! let converter = Converter::new();
//! let json_schema = r#"{"type": "object", "x-graphql-type-name": "User"}"#;
//!
//! let result = converter.convert(json_schema, ConversionDirection::JsonSchemaToGraphQL);
//! ```

pub mod error;
pub mod graphql_to_json;
pub mod json_to_graphql;
pub mod types;
pub mod validator;

#[cfg(feature = "wasm")]
pub mod wasm;

pub use error::{ConversionError, Result};
pub use types::{ConversionDirection, ConversionOptions};

use serde_json::Value as JsonValue;

/// Main converter struct
pub struct Converter {
    options: ConversionOptions,
    #[cfg(feature = "caching")]
    cache: std::sync::Mutex<lru::LruCache<String, String>>,
}

impl Converter {
    /// Create a new converter with default options
    pub fn new() -> Self {
        Self::with_options(ConversionOptions::default())
    }

    /// Create a new converter with custom options
    pub fn with_options(options: ConversionOptions) -> Self {
        Self {
            options,
            #[cfg(feature = "caching")]
            cache: std::sync::Mutex::new(lru::LruCache::new(
                std::num::NonZeroUsize::new(100).unwrap(),
            )),
        }
    }

    /// Convert between JSON Schema and GraphQL SDL
    pub fn convert(&self, input: &str, direction: ConversionDirection) -> Result<String> {
        #[cfg(feature = "caching")]
        {
            let cache_key = format!("{:?}:{}", direction, input);
            if let Ok(mut cache) = self.cache.lock() {
                if let Some(cached) = cache.get(&cache_key) {
                    return Ok(cached.clone());
                }
            }
        }

        let result = match direction {
            ConversionDirection::JsonSchemaToGraphQL => self.json_schema_to_graphql(input)?,
            ConversionDirection::GraphQLToJsonSchema => self.graphql_to_json_schema(input)?,
        };

        #[cfg(feature = "caching")]
        {
            let cache_key = format!("{:?}:{}", direction, input);
            if let Ok(mut cache) = self.cache.lock() {
                cache.put(cache_key, result.clone());
            }
        }

        Ok(result)
    }

    /// Convert JSON Schema to GraphQL SDL
    pub fn json_schema_to_graphql(&self, json_schema: &str) -> Result<String> {
        let schema: JsonValue = serde_json::from_str(json_schema)
            .map_err(|e| ConversionError::InvalidJsonSchema(e.to_string()))?;

        if self.options.validate {
            validator::validate_json_schema(&schema)?;
        }

        json_to_graphql::convert(&schema, &self.options)
    }

    /// Convert GraphQL SDL to JSON Schema
    pub fn graphql_to_json_schema(&self, graphql_sdl: &str) -> Result<String> {
        if self.options.validate {
            validator::validate_graphql_sdl(graphql_sdl)?;
        }

        let schema = graphql_to_json::convert(graphql_sdl, &self.options)?;
        serde_json::to_string_pretty(&schema).map_err(Into::into)
    }

    /// Get current options
    pub fn options(&self) -> &ConversionOptions {
        &self.options
    }

    /// Clear cache (only available with caching feature)
    #[cfg(feature = "caching")]
    pub fn clear_cache(&self) {
        if let Ok(mut cache) = self.cache.lock() {
            cache.clear();
        }
    }
}

impl Default for Converter {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_converter_creation() {
        let converter = Converter::new();
        assert_eq!(converter.options().validate, true);
    }

    #[test]
    fn test_converter_with_options() {
        let options = ConversionOptions {
            validate: false,
            include_descriptions: true,
            preserve_field_order: true,
            federation_version: 2,
            infer_ids: false,
        };
        let converter = Converter::with_options(options);
        assert_eq!(converter.options().validate, false);
    }

    #[test]
    fn test_simple_json_to_graphql() {
        let converter = Converter::new();
        let json_schema = r#"{
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "type": "object",
            "x-graphql-type-name": "User",
            "properties": {
                "id": {
                    "type": "string",
                    "x-graphql-type": "ID!"
                },
                "name": {
                    "type": "string"
                }
            }
        }"#;

        let result = converter.json_schema_to_graphql(json_schema);
        assert!(result.is_ok());
        let graphql = result.unwrap();
        assert!(graphql.contains("type User"));
        assert!(graphql.contains("id: ID!"));
    }

    #[test]
    fn test_invalid_json_schema() {
        let converter = Converter::new();
        let invalid_json = "not valid json{";

        let result = converter.json_schema_to_graphql(invalid_json);
        assert!(result.is_err());
    }

    #[cfg(feature = "caching")]
    #[test]
    fn test_caching() {
        let converter = Converter::new();
        let json_schema = r#"{
            "type": "object",
            "x-graphql-type-name": "User"
        }"#;

        // First call
        let result1 = converter.convert(json_schema, ConversionDirection::JsonSchemaToGraphQL);
        assert!(result1.is_ok());

        // Second call should hit cache
        let result2 = converter.convert(json_schema, ConversionDirection::JsonSchemaToGraphQL);
        assert!(result2.is_ok());
        assert_eq!(result1.unwrap(), result2.unwrap());

        // Clear cache
        converter.clear_cache();
    }
}
