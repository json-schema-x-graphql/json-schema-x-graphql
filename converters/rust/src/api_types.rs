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
    #[serde(default)]
    #[graphql(default)]
    pub naming_convention: NamingConvention,
    #[serde(default)]
    #[graphql(default = false)]
    pub infer_ids: bool,
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

impl Default for ConverterOptions {
    fn default() -> Self {
        Self {
            validate: true,
            include_descriptions: true,
            preserve_field_order: true,
            federation_version: FederationVersion::default(),
            naming_convention: NamingConvention::default(),
            infer_ids: false,
            exclude_types: vec![],
            exclude_patterns: vec![],
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize, Enum)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[graphql(rename_items = "SCREAMING_SNAKE_CASE")]
pub enum FederationVersion {
    None,
    V1,
    V2,
}

impl Default for FederationVersion {
    fn default() -> Self {
        Self::V2
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize, Enum)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[graphql(rename_items = "SCREAMING_SNAKE_CASE")]
pub enum NamingConvention {
    Preserve,
    GraphqlIdiomatic,
}

impl Default for NamingConvention {
    fn default() -> Self {
        Self::GraphqlIdiomatic
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, SimpleObject)]
#[serde(rename_all = "camelCase")]
#[graphql(rename_fields = "camelCase")]
pub struct ConversionResult {
    pub sdl: Option<String>,
    pub diagnostics: Vec<Diagnostic>,
    pub success: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize, SimpleObject)]
#[serde(rename_all = "camelCase")]
#[graphql(rename_fields = "camelCase")]
pub struct Diagnostic {
    pub severity: DiagnosticSeverity,
    pub message: String,
    pub path: Option<Vec<String>>,
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

#[derive(Debug, Clone, Deserialize, Serialize, InputObject)]
#[serde(rename_all = "camelCase")]
#[graphql(rename_fields = "camelCase")]
pub struct ConvertInput {
    pub json_schema: String,
    pub options: Option<ConverterOptions>,
}
