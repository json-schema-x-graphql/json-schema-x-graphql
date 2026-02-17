use async_graphql::{Enum, InputObject, SimpleObject};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize, InputObject)]
#[serde(rename_all = "camelCase")]
#[graphql(rename_fields = "camelCase")]
pub struct ConverterOptions {
    #[serde(default = "default_true")]
    #[graphql(default = true)]
    pub validate: bool,

    #[serde(default = "default_true")]
    #[graphql(default = true)]
    pub include_descriptions: bool,

    #[serde(default = "default_true")]
    #[graphql(default = true)]
    pub preserve_field_order: bool,

    #[serde(default)]
    #[graphql(default)]
    pub federation_version: FederationVersion,

    #[serde(default = "default_true")]
    #[graphql(default = true)]
    pub include_federation_directives: bool,

    #[serde(default)]
    #[graphql(default)]
    pub naming_convention: NamingConvention,

    #[serde(default)]
    #[graphql(default = false)]
    pub infer_ids: bool,

    #[serde(default)]
    #[graphql(default)]
    pub id_strategy: IdInferenceStrategy,

    #[serde(default)]
    #[graphql(default)]
    pub output_format: OutputFormat,

    #[serde(default = "default_false")]
    #[graphql(default = false)]
    pub fail_on_warning: bool,

    #[serde(default)]
    #[graphql(default)]
    pub exclude_types: Vec<String>,

    #[serde(default)]
    #[graphql(default)]
    pub exclude_patterns: Vec<String>,
}

fn default_true() -> bool {
    true
}

fn default_false() -> bool {
    false
}

impl Default for ConverterOptions {
    fn default() -> Self {
        Self {
            validate: true,
            include_descriptions: true,
            preserve_field_order: true,
            federation_version: FederationVersion::default(),
            include_federation_directives: true,
            naming_convention: NamingConvention::default(),
            infer_ids: false,
            id_strategy: IdInferenceStrategy::default(),
            output_format: OutputFormat::default(),
            fail_on_warning: false,
            exclude_types: vec![],
            exclude_patterns: vec![],
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize, Enum, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[graphql(rename_items = "SCREAMING_SNAKE_CASE")]
pub enum FederationVersion {
    None,
    V1,
    #[default]
    V2,
    Auto,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize, Enum, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[graphql(rename_items = "SCREAMING_SNAKE_CASE")]
pub enum NamingConvention {
    Preserve,
    #[default]
    GraphqlIdiomatic,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize, Enum, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[graphql(rename_items = "SCREAMING_SNAKE_CASE")]
pub enum IdInferenceStrategy {
    #[default]
    None,
    CommonPatterns,
    AllStrings,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize, Enum, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[graphql(rename_items = "SCREAMING_SNAKE_CASE")]
pub enum OutputFormat {
    #[default]
    Sdl,
    SdlWithFederationMetadata,
    AstJson,
}

#[derive(Debug, Clone, Deserialize, Serialize, SimpleObject)]
#[serde(rename_all = "camelCase")]
#[graphql(rename_fields = "camelCase")]
pub struct ConversionResult {
    /// The generated output string.
    /// This contains the SDL string if outputFormat is SDL or SDL_WITH_FEDERATION_METADATA.
    /// This contains a JSON string if outputFormat is AST_JSON.
    pub output: Option<String>,

    pub diagnostics: Vec<Diagnostic>,

    pub success: bool,

    pub error_count: i32,

    pub warning_count: i32,
}

#[derive(Debug, Clone, Deserialize, Serialize, SimpleObject)]
#[serde(rename_all = "camelCase")]
#[graphql(rename_fields = "camelCase")]
pub struct Diagnostic {
    pub severity: DiagnosticSeverity,

    pub kind: Option<DiagnosticKind>,

    pub message: String,

    pub path: Option<Vec<String>>,

    /// The error code or category.
    /// Intended to be stable for programmatic handling (e.g. JSON_SCHEMA_INVALID_REF).
    pub code: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize, Enum)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[graphql(rename_items = "SCREAMING_SNAKE_CASE")]
pub enum DiagnosticSeverity {
    Info,
    Warning,
    Error,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize, Enum)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[graphql(rename_items = "SCREAMING_SNAKE_CASE")]
pub enum DiagnosticKind {
    JsonSchemaValidation,
    GraphqlValidation,
    Federation,
    Naming,
    Transformation,
    Internal,
    Other,
}

#[derive(Debug, Clone, Deserialize, Serialize, InputObject)]
#[serde(rename_all = "camelCase")]
#[graphql(rename_fields = "camelCase")]
pub struct ConvertInput {
    pub json_schema: String,

    pub source_name: Option<String>,

    pub options: Option<ConverterOptions>,
}
