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
//! use json_schema_x_graphql::{Converter, ConversionDirection};
//!
//! let converter = Converter::new();
//! let json_schema = r#"{"type": "object", "x-graphql-type-name": "User"}"#;
//!
//! let result = converter.convert(json_schema, ConversionDirection::JsonSchemaToGraphQL);
//! ```

pub mod analysis;
#[cfg(any(feature = "graphql-server", feature = "wasm"))]
pub mod api_types;
pub mod case_conversion;
pub mod datacontract;
pub mod ddl;
pub mod diagram;
pub mod directive_filter;
pub mod error;
pub mod federation;
pub mod graphql_ast_json;
pub mod graphql_to_json;
pub mod hints;
pub mod json_to_graphql;
pub mod mapping;
#[cfg(feature = "graphql-server")]
pub mod schema;
pub mod types;
pub mod validation;
pub mod validator;

#[cfg(feature = "wasm")]
pub mod wasm;

pub use error::{ConversionError, Result};
pub use types::{
    ConversionDirection, ConversionOptions, DirectiveFilterMode, IdInferenceStrategy,
    NamingConvention, OutputFormat,
};

#[cfg(feature = "caching")]
use indexmap::IndexMap;
use serde_json::Value as JsonValue;

#[cfg(feature = "caching")]
struct SimpleLruCache {
    capacity: usize,
    entries: IndexMap<String, String>,
}

#[cfg(feature = "caching")]
impl SimpleLruCache {
    fn new(capacity: usize) -> Self {
        assert!(capacity > 0, "cache capacity must be greater than zero");
        Self {
            capacity,
            entries: IndexMap::new(),
        }
    }

    fn get(&mut self, key: &str) -> Option<String> {
        let value = self.entries.shift_remove(key)?;
        let cached = value.clone();
        self.entries.insert(key.to_string(), value);
        Some(cached)
    }

    fn put(&mut self, key: String, value: String) {
        self.entries.shift_remove(&key);
        self.entries.insert(key, value);

        while self.entries.len() > self.capacity {
            if let Some(oldest_key) = self.entries.keys().next().cloned() {
                self.entries.shift_remove(&oldest_key);
            } else {
                break;
            }
        }
    }

    fn clear(&mut self) {
        self.entries.clear();
    }
}

/// Main converter struct
pub struct Converter {
    options: ConversionOptions,
    #[cfg(feature = "caching")]
    cache: std::sync::Mutex<SimpleLruCache>,
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
            cache: std::sync::Mutex::new(SimpleLruCache::new(100)),
        }
    }

    /// Convert between JSON Schema and GraphQL SDL
    pub fn convert(&self, input: &str, direction: ConversionDirection) -> Result<String> {
        #[cfg(feature = "caching")]
        {
            let cache_key = format!("{:?}:{}", direction, input);
            if let Ok(mut cache) = self.cache.lock() {
                if let Some(cached) = cache.get(&cache_key) {
                    return Ok(cached);
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
        #[cfg(feature = "telemetry")]
        let _span = {
            use opentelemetry::trace::Tracer;
            let tracer = opentelemetry::global::tracer("json-schema-x-graphql");
            tracer.start("json_schema_to_graphql")
        };

        #[cfg(not(target_arch = "wasm32"))]
        let mut schema: JsonValue = {
            let mut bytes = json_schema.as_bytes().to_vec();
            simd_json::from_slice(&mut bytes)
                .map_err(|e| ConversionError::InvalidJsonSchema(e.to_string()))?
        };

        #[cfg(target_arch = "wasm32")]
        let mut schema: JsonValue = serde_json::from_str(json_schema)
            .map_err(|e| ConversionError::InvalidJsonSchema(e.to_string()))?;

        let mut warned = false;
        json_to_graphql::normalize_federation_extensions(&mut schema, &mut warned);

        if self.options.validate {
            validator::validate_json_schema(&schema)?;
        }

        let graphql_sdl = json_to_graphql::convert(&schema, &self.options)?;

        // Apply directive filtering if mode is not All
        let graphql_sdl = if self.options.directive_filter_mode != types::DirectiveFilterMode::All {
            directive_filter::filter_sdl_directives(
                &graphql_sdl,
                &self.options.directive_filter_mode,
            )
        } else {
            graphql_sdl
        };

        // Apply x-graphql-* hint post-processing (scalars, operations, pagination)
        let graphql_sdl = hints::apply_hints(&graphql_sdl, &schema);

        match self.options.output_format {
            types::OutputFormat::AstJson => graphql_ast_json::sdl_to_ast_json(&graphql_sdl),
            types::OutputFormat::Mermaid => {
                // Route through DDL → diagram pipeline
                let root_def = schema
                    .get("$defs")
                    .or_else(|| schema.get("definitions"))
                    .and_then(|d| d.as_object())
                    .and_then(|obj| obj.keys().next().map(|s| s.as_str()))
                    .unwrap_or("contract");
                let relational = ddl::schema_to_relational(&schema, root_def);
                Ok(diagram::to_mermaid_er(
                    &relational.tables,
                    &relational.relations,
                ))
            }
            types::OutputFormat::DataContractYaml => {
                let shim = match &self.options.shim_path {
                    Some(path) => Some(
                        datacontract::shim::load_shim(path)
                            .map_err(ConversionError::InvalidJsonSchema)?,
                    ),
                    None => None,
                };
                Ok(datacontract::generate_data_contract_yaml(
                    &schema,
                    shim.as_ref(),
                    self.options.shim_path.as_deref(),
                ))
            }
            _ => Ok(graphql_sdl),
        }
    }

    /// Convert GraphQL SDL to JSON Schema
    pub fn graphql_to_json_schema(&self, graphql_sdl: &str) -> Result<String> {
        #[cfg(feature = "telemetry")]
        let _span = {
            use opentelemetry::trace::Tracer;
            let tracer = opentelemetry::global::tracer("json-schema-x-graphql");
            tracer.start("graphql_to_json_schema")
        };

        if self.options.validate {
            validator::validate_graphql_sdl(graphql_sdl)?;
        }

        // graphql_to_json::convert already returns a pretty-printed JSON string
        graphql_to_json::convert(graphql_sdl, &self.options)
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
        assert!(converter.options().validate);
    }

    #[test]
    fn test_converter_with_options() {
        let options = ConversionOptions {
            validate: false,
            include_descriptions: true,
            preserve_field_order: true,
            federation_version: 2,
            infer_ids: false,
            naming_convention: types::NamingConvention::GraphqlIdiomatic,
            exclude_types: vec![],
            exclude_patterns: vec![],
            ..Default::default()
        };
        let converter = Converter::with_options(options);
        assert!(!converter.options().validate);
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

    #[cfg(all(not(target_arch = "wasm32"), feature = "telemetry"))]
    #[test]
    fn test_opentelemetry_instrumentation() {
        use opentelemetry_sdk::trace::SdkTracerProvider;

        // Initialize a local trace provider
        let provider = SdkTracerProvider::builder().build();
        opentelemetry::global::set_tracer_provider(provider);

        let converter = Converter::new();
        let json_schema = r#"{
            "type": "object",
            "x-graphql-type-name": "User"
        }"#;

        let result = converter.json_schema_to_graphql(json_schema);
        assert!(result.is_ok());
    }

    #[test]
    fn test_mermaid_output_format() {
        let options = ConversionOptions {
            output_format: OutputFormat::Mermaid,
            validate: true,
            ..Default::default()
        };
        let converter = Converter::with_options(options);
        let json_schema = r#"{
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "type": "object",
            "$defs": {
                "User": {
                    "type": "object",
                    "properties": {
                        "id": { "type": "string" },
                        "name": { "type": "string" }
                    },
                    "required": ["id"]
                }
            }
        }"#;

        let result = converter.json_schema_to_graphql(json_schema);
        assert!(result.is_ok());
        let mermaid = result.unwrap();
        assert!(mermaid.starts_with("erDiagram"));
        assert!(mermaid.contains("User"));
    }

    #[test]
    fn test_datacontract_yaml_output_format() {
        let options = ConversionOptions {
            output_format: OutputFormat::DataContractYaml,
            validate: true,
            ..Default::default()
        };
        let converter = Converter::with_options(options);
        let json_schema = r#"{
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "title": "Test Schema",
            "type": "object",
            "$defs": {
                "User": {
                    "type": "object",
                    "properties": {
                        "id": { "type": "string", "description": "User ID" },
                        "name": { "type": "string" }
                    },
                    "required": ["id", "name"]
                }
            }
        }"#;

        let result = converter.json_schema_to_graphql(json_schema);
        assert!(result.is_ok());
        let yaml = result.unwrap();
        assert!(yaml.contains("# Data Contract"));
        assert!(yaml.contains("name: Test Schema"));
        assert!(yaml.contains("schema:"));
        assert!(yaml.contains("relational:"));
    }

    #[test]
    fn test_mermaid_output_without_defs() {
        let options = ConversionOptions {
            output_format: OutputFormat::Mermaid,
            validate: false,
            ..Default::default()
        };
        let converter = Converter::with_options(options);
        // Schema with $defs but no types that would create tables
        let json_schema = r#"{
            "type": "object",
            "$defs": {
                "Empty": {
                    "type": "object",
                    "properties": {}
                }
            }
        }"#;

        let result = converter.json_schema_to_graphql(json_schema);
        // Empty table list produces just "erDiagram" header
        assert!(result.is_ok(), "Error: {:?}", result.err());
        let mermaid = result.unwrap();
        assert!(mermaid.starts_with("erDiagram"));
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
