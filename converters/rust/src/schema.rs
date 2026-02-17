use crate::api_types::{
    ConversionResult, ConvertInput, Diagnostic, DiagnosticSeverity, FederationVersion,
};
use crate::types::{
    ConversionDirection, ConversionOptions, IdInferenceStrategy as InternalIdInferenceStrategy,
    NamingConvention as InternalNamingConvention, OutputFormat as InternalOutputFormat,
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
        let mut internal_options = ConversionOptions::default();

        // Map API options to internal options
        internal_options.validate = options.validate;
        internal_options.include_descriptions = options.include_descriptions;
        internal_options.preserve_field_order = options.preserve_field_order;
        internal_options.federation_version = match options.federation_version {
            FederationVersion::None => 0,
            FederationVersion::V1 => 1,
            FederationVersion::V2 => 2,
            FederationVersion::Auto => 2,
        };
        internal_options.include_federation_directives = options.include_federation_directives;
        internal_options.infer_ids = options.infer_ids;
        internal_options.id_strategy = match options.id_strategy {
            crate::api_types::IdInferenceStrategy::None => InternalIdInferenceStrategy::None,
            crate::api_types::IdInferenceStrategy::CommonPatterns => {
                InternalIdInferenceStrategy::CommonPatterns
            }
            crate::api_types::IdInferenceStrategy::AllStrings => {
                InternalIdInferenceStrategy::AllStrings
            }
        };
        internal_options.naming_convention = match options.naming_convention {
            crate::api_types::NamingConvention::Preserve => InternalNamingConvention::Preserve,
            crate::api_types::NamingConvention::GraphqlIdiomatic => {
                InternalNamingConvention::GraphqlIdiomatic
            }
        };
        internal_options.output_format = match options.output_format {
            crate::api_types::OutputFormat::Sdl => InternalOutputFormat::Sdl,
            crate::api_types::OutputFormat::SdlWithFederationMetadata => {
                InternalOutputFormat::SdlWithFederationMetadata
            }
            crate::api_types::OutputFormat::AstJson => InternalOutputFormat::AstJson,
        };
        internal_options.fail_on_warning = options.fail_on_warning;
        internal_options.exclude_types = options.exclude_types;
        internal_options.exclude_patterns = options.exclude_patterns;

        let converter = Converter::with_options(internal_options);

        match converter.convert(&input.json_schema, ConversionDirection::JsonSchemaToGraphQL) {
            Ok(sdl) => Ok(ConversionResult {
                output: Some(sdl),
                diagnostics: vec![], // TODO: Capture actual diagnostics if converter supports them
                success: true,
                error_count: 0,
                warning_count: 0,
            }),
            Err(e) => Ok(ConversionResult {
                output: None,
                diagnostics: vec![Diagnostic {
                    severity: DiagnosticSeverity::Error,
                    kind: None,
                    message: e.to_string(),
                    path: None,
                    code: None,
                }],
                success: false,
                error_count: 1,
                warning_count: 0,
            }),
        }
    }
}

pub type ConverterSchema = Schema<QueryRoot, MutationRoot, EmptySubscription>;

pub fn create_schema() -> ConverterSchema {
    Schema::build(QueryRoot, MutationRoot, EmptySubscription).finish()
}
