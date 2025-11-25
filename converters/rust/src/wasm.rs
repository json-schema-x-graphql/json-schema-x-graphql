//! WASM bindings for JSON Schema x GraphQL converter

use crate::{ConversionDirection, ConversionOptions, Converter};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

/// Initialize panic hook for better error messages in browser
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

/// WASM-compatible conversion options
#[wasm_bindgen]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WasmConversionOptions {
    validate: bool,
    include_descriptions: bool,
    preserve_field_order: bool,
    federation_version: u8,
    infer_ids: bool,
}

#[wasm_bindgen]
impl WasmConversionOptions {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            validate: true,
            include_descriptions: true,
            preserve_field_order: true,
            federation_version: 2,
            infer_ids: false,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn validate(&self) -> bool {
        self.validate
    }

    #[wasm_bindgen(setter)]
    pub fn set_validate(&mut self, value: bool) {
        self.validate = value;
    }

    #[wasm_bindgen(getter)]
    pub fn include_descriptions(&self) -> bool {
        self.include_descriptions
    }

    #[wasm_bindgen(setter)]
    pub fn set_include_descriptions(&mut self, value: bool) {
        self.include_descriptions = value;
    }

    #[wasm_bindgen(getter)]
    pub fn preserve_field_order(&self) -> bool {
        self.preserve_field_order
    }

    #[wasm_bindgen(setter)]
    pub fn set_preserve_field_order(&mut self, value: bool) {
        self.preserve_field_order = value;
    }

    #[wasm_bindgen(getter)]
    pub fn federation_version(&self) -> u8 {
        self.federation_version
    }

    #[wasm_bindgen(setter)]
    pub fn set_federation_version(&mut self, value: u8) {
        self.federation_version = value;
    }

    #[wasm_bindgen(getter)]
    pub fn infer_ids(&self) -> bool {
        self.infer_ids
    }

    #[wasm_bindgen(setter)]
    pub fn set_infer_ids(&mut self, value: bool) {
        self.infer_ids = value;
    }

    /// Convert to internal options type
    fn to_internal(&self) -> ConversionOptions {
        ConversionOptions {
            validate: self.validate,
            include_descriptions: self.include_descriptions,
            preserve_field_order: self.preserve_field_order,
            federation_version: self.federation_version,
            infer_ids: self.infer_ids,
        }
    }
}

impl Default for WasmConversionOptions {
    fn default() -> Self {
        Self::new()
    }
}

/// WASM-compatible converter
#[wasm_bindgen]
pub struct WasmConverter {
    converter: Converter,
}

#[wasm_bindgen]
impl WasmConverter {
    /// Create a new converter with default options
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            converter: Converter::new(),
        }
    }

    /// Create a new converter with custom options
    #[wasm_bindgen(js_name = withOptions)]
    pub fn with_options(options: &WasmConversionOptions) -> Self {
        Self {
            converter: Converter::with_options(options.to_internal()),
        }
    }

    /// Convert JSON Schema to GraphQL SDL
    #[wasm_bindgen(js_name = jsonSchemaToGraphQL)]
    pub fn json_schema_to_graphql(&self, json_schema: &str) -> Result<String, JsValue> {
        self.converter
            .json_schema_to_graphql(json_schema)
            .map_err(Into::into)
    }

    /// Convert GraphQL SDL to JSON Schema
    #[wasm_bindgen(js_name = graphqlToJsonSchema)]
    pub fn graphql_to_json_schema(&self, graphql_sdl: &str) -> Result<String, JsValue> {
        self.converter
            .graphql_to_json_schema(graphql_sdl)
            .map_err(Into::into)
    }

    /// Convert between formats (bidirectional)
    pub fn convert(&self, input: &str, direction: &str) -> Result<String, JsValue> {
        let dir = match direction {
            "json-to-graphql" | "jsonToGraphQL" => ConversionDirection::JsonSchemaToGraphQL,
            "graphql-to-json" | "graphqlToJson" => ConversionDirection::GraphQLToJsonSchema,
            _ => {
                return Err(JsValue::from_str(&format!(
                    "Invalid direction: {}. Use 'json-to-graphql' or 'graphql-to-json'",
                    direction
                )))
            }
        };

        self.converter.convert(input, dir).map_err(Into::into)
    }

    /// Clear the conversion cache (if caching is enabled)
    #[cfg(feature = "caching")]
    #[wasm_bindgen(js_name = clearCache)]
    pub fn clear_cache(&self) {
        self.converter.clear_cache();
    }
}

impl Default for WasmConverter {
    fn default() -> Self {
        Self::new()
    }
}

/// Standalone function to convert JSON Schema to GraphQL SDL
#[wasm_bindgen(js_name = jsonSchemaToGraphQL)]
pub fn json_schema_to_graphql(json_schema: &str) -> Result<String, JsValue> {
    let converter = Converter::new();
    converter
        .json_schema_to_graphql(json_schema)
        .map_err(Into::into)
}

/// Standalone function to convert GraphQL SDL to JSON Schema
#[wasm_bindgen(js_name = graphqlToJsonSchema)]
pub fn graphql_to_json_schema(graphql_sdl: &str) -> Result<String, JsValue> {
    let converter = Converter::new();
    converter
        .graphql_to_json_schema(graphql_sdl)
        .map_err(Into::into)
}

/// Validate JSON Schema
#[wasm_bindgen(js_name = validateJsonSchema)]
pub fn validate_json_schema(json_schema: &str) -> Result<bool, JsValue> {
    use crate::error::ConversionError;
    use crate::validator;

    let schema: serde_json::Value =
        serde_json::from_str(json_schema).map_err(ConversionError::from)?;

    validator::validate_json_schema(&schema)
        .map(|_| true)
        .map_err(Into::into)
}

/// Validate GraphQL SDL
#[wasm_bindgen(js_name = validateGraphQLSdl)]
pub fn validate_graphql_sdl(graphql_sdl: &str) -> Result<bool, JsValue> {
    use crate::validator;

    validator::validate_graphql_sdl(graphql_sdl)
        .map(|_| true)
        .map_err(Into::into)
}

/// Validate a GraphQL name
#[wasm_bindgen(js_name = validateGraphQLName)]
pub fn validate_graphql_name(name: &str) -> Result<bool, JsValue> {
    use crate::validator;

    validator::validate_graphql_name(name)
        .map(|_| true)
        .map_err(Into::into)
}

/// Get library version
#[wasm_bindgen(js_name = getVersion)]
pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wasm_options() {
        let mut options = WasmConversionOptions::new();
        assert_eq!(options.validate(), true);

        options.set_validate(false);
        assert_eq!(options.validate(), false);

        options.set_federation_version(1);
        assert_eq!(options.federation_version(), 1);
    }

    #[test]
    fn test_wasm_converter() {
        let converter = WasmConverter::new();
        let json_schema = r#"{
            "type": "object",
            "x-graphql-type-name": "User",
            "properties": {
                "id": {
                    "type": "string",
                    "x-graphql-type": "ID!"
                }
            }
        }"#;

        let result = converter.json_schema_to_graphql(json_schema);
        assert!(result.is_ok());
    }

    #[test]
    #[cfg(target_arch = "wasm32")]
    fn test_direction_parsing() {
        let converter = WasmConverter::new();
        let input = r#"{"type": "object", "x-graphql-type-name": "Test"}"#;

        assert!(converter.convert(input, "json-to-graphql").is_ok());
        assert!(converter.convert(input, "jsonToGraphQL").is_ok());
        assert!(converter.convert(input, "invalid").is_err());
    }
}
