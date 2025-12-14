use crate::api_types::{
    ConversionResult, ConvertInput, Diagnostic, DiagnosticSeverity, FederationVersion,
};
use crate::types::{
    ConversionDirection, ConversionOptions, NamingConvention as InternalNamingConvention,
};
use crate::Converter;
use async_graphql::{EmptySubscription, Object, Result as GqlResult, Schema};

pub struct QueryRoot;

#[Object]
impl QueryRoot {
    /// Returns the version of the converter service/library.
    async fn version(&self) -> String {
        env!("CARGO_PKG_VERSION").to_string()
    }
}

pub struct MutationRoot;

#[Object]
impl MutationRoot {
    /// Converts a JSON Schema string into GraphQL SDL.
    async fn convert_json_to_graphql(&self, input: ConvertInput) -> GqlResult<ConversionResult> {
        let options = input.options.unwrap_or_default();

        // Map API options to internal options
        let internal_options = ConversionOptions {
            validate: options.validate,
            include_descriptions: options.include_descriptions,
            preserve_field_order: options.preserve_field_order,
            federation_version: match options.federation_version {
                FederationVersion::None => 0,
                FederationVersion::V1 => 1,
                FederationVersion::V2 => 2,
            },
            infer_ids: options.infer_ids,
            naming_convention: match options.naming_convention {
                crate::api_types::NamingConvention::Preserve => InternalNamingConvention::Preserve,
                crate::api_types::NamingConvention::GraphqlIdiomatic => {
                    InternalNamingConvention::GraphqlIdiomatic
                }
            },
            exclude_types: options.exclude_types,
            exclude_patterns: options.exclude_patterns,
        };

        let converter = Converter::with_options(internal_options);

        match converter.convert(&input.json_schema, ConversionDirection::JsonSchemaToGraphQL) {
            Ok(sdl) => Ok(ConversionResult {
                sdl: Some(sdl),
                diagnostics: vec![], // TODO: Capture actual diagnostics if converter supports them
                success: true,
            }),
            Err(e) => Ok(ConversionResult {
                sdl: None,
                diagnostics: vec![Diagnostic {
                    severity: DiagnosticSeverity::Error,
                    message: e.to_string(),
                    path: None,
                    code: None,
                }],
                success: false,
            }),
        }
    }
}

pub type ConverterSchema = Schema<QueryRoot, MutationRoot, EmptySubscription>;

pub fn create_schema() -> ConverterSchema {
    Schema::build(QueryRoot, MutationRoot, EmptySubscription).finish()
}
