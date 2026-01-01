//! Core types for JSON Schema x GraphQL conversion

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Direction of conversion
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ConversionDirection {
    /// Convert from JSON Schema to GraphQL SDL
    JsonSchemaToGraphQL,
    /// Convert from GraphQL SDL to JSON Schema
    GraphQLToJsonSchema,
}

/// Options for conversion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversionOptions {
    /// Whether to validate input before conversion
    pub validate: bool,
    /// Whether to include description fields
    pub include_descriptions: bool,
    /// Whether to preserve field order from source
    pub preserve_field_order: bool,
    /// Apollo Federation version (1 or 2)
    pub federation_version: u8,
    /// Whether to include federation directives in output
    pub include_federation_directives: bool,
    /// Whether to automatically infer ID scalar for fields named "id", "_id", etc.
    pub infer_ids: bool,
    /// Strategy for ID inference (supersedes infer_ids when not None)
    pub id_strategy: IdInferenceStrategy,
    /// Strategy for naming GraphQL types and fields
    pub naming_convention: NamingConvention,
    /// Desired output format
    pub output_format: OutputFormat,
    /// Treat warnings as errors
    pub fail_on_warning: bool,
    /// List of type names to exclude from generation
    pub exclude_types: Vec<String>,
    /// List of regex patterns to exclude fields or types
    pub exclude_patterns: Vec<String>,
    /// List of type suffixes to exclude (e.g. "Filter", "Connection")
    pub exclude_type_suffixes: Vec<String>,
    /// Whether to include operational types (Query, Mutation, Subscription) even if excluded by default
    pub include_operational_types: bool,
    /// Threshold in characters for descriptions to become block strings
    pub description_block_threshold: usize,
    /// Whether to emit empty object types (no fields)
    pub emit_empty_types: bool,
    /// Maximum number of properties for anonymous objects to be inlined as JSON
    pub inline_object_threshold: usize,
    /// Strategy for naming types derived from $ref values
    pub ref_naming: RefNaming,
}

impl Default for ConversionOptions {
    fn default() -> Self {
        Self {
            validate: true,
            include_descriptions: true,
            preserve_field_order: true,
            federation_version: 2,
            include_federation_directives: true,
            infer_ids: false,
            id_strategy: IdInferenceStrategy::None,
            naming_convention: NamingConvention::GraphqlIdiomatic,
            output_format: OutputFormat::Sdl,
            fail_on_warning: false,
            exclude_types: vec![
                "Query".to_string(),
                "Mutation".to_string(),
                "Subscription".to_string(),
                "PageInfo".to_string(),
            ],
            exclude_patterns: vec![],
            exclude_type_suffixes: vec![
                "Filter".to_string(),
                "Sort".to_string(),
                "SortInput".to_string(),
                "FilterInput".to_string(),
                "Connection".to_string(),
                "Edge".to_string(),
                "Payload".to_string(),
                "Args".to_string(),
            ],
            include_operational_types: false,
            description_block_threshold: 80,
            emit_empty_types: false,
            inline_object_threshold: 3,
            ref_naming: RefNaming::Basename,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum IdInferenceStrategy {
    None,
    CommonPatterns,
    AllStrings,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum OutputFormat {
    Sdl,
    SdlWithFederationMetadata,
    AstJson,
}

/// Strategies for deriving names from $ref values
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RefNaming {
    Basename,
    FileAndPath,
    Hash,
}

/// Naming conventions for generated GraphQL artifacts
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum NamingConvention {
    /// Preserve the exact casing from the JSON Schema
    Preserve,
    /// Enforce GraphQL idioms: PascalCase for Types, camelCase for fields
    GraphqlIdiomatic,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GqlScalar {
    String,
    Int,
    Float,
    Boolean,
    Id,
    Custom(String),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GqlType {
    Scalar(GqlScalar),
    List(Box<GqlType>),
    NonNull(Box<GqlType>),
}

#[derive(Debug, Clone, PartialEq)]
pub enum GqlValue {
    Variable(String),
    Int(i64),
    Float(f64),
    String(String),
    Boolean(bool),
    Null,
    Enum(String),
    List(Vec<GqlValue>),
    Object(HashMap<String, GqlValue>),
}

/// GraphQL type information
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct GraphQLType {
    /// Type name (e.g., "String", "User")
    pub name: String,
    /// Whether the type is required (non-null)
    pub required: bool,
    /// Whether the type is a list
    pub is_list: bool,
    /// Whether the list items are required (for lists only)
    pub list_item_required: bool,
}

impl GraphQLType {
    /// Create a new GraphQL type
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            required: false,
            is_list: false,
            list_item_required: false,
        }
    }

    /// Make this type required (non-null)
    pub fn required(mut self) -> Self {
        self.required = true;
        self
    }

    /// Make this type a list
    pub fn list(mut self) -> Self {
        self.is_list = true;
        self
    }

    /// Make list items required
    pub fn list_item_required(mut self) -> Self {
        self.list_item_required = true;
        self
    }

    /// Convert to GraphQL SDL notation
    pub fn to_sdl(&self) -> String {
        let mut result = String::new();

        if self.is_list {
            result.push('[');
            result.push_str(&self.name);
            if self.list_item_required {
                result.push('!');
            }
            result.push(']');
        } else {
            result.push_str(&self.name);
        }

        if self.required {
            result.push('!');
        }

        result
    }

    /// Parse from GraphQL SDL notation
    pub fn from_sdl(sdl: &str) -> Result<Self, String> {
        let mut chars = sdl.trim().chars().peekable();
        let mut is_list = false;
        let mut list_item_required = false;
        let mut name = String::new();
        let mut required = false;

        // Check for list
        if chars.peek() == Some(&'[') {
            is_list = true;
            chars.next(); // consume '['

            // Read type name
            while let Some(&ch) = chars.peek() {
                if ch == '!' {
                    list_item_required = true;
                    chars.next();
                } else if ch == ']' {
                    chars.next();
                    break;
                } else {
                    name.push(ch);
                    chars.next();
                }
            }
        } else {
            // Not a list, read type name
            while let Some(&ch) = chars.peek() {
                if ch == '!' {
                    break;
                } else {
                    name.push(ch);
                    chars.next();
                }
            }
        }

        // Check for required
        if chars.peek() == Some(&'!') {
            required = true;
        }

        if name.is_empty() {
            return Err("Empty type name".to_string());
        }

        Ok(Self {
            name: name.trim().to_string(),
            required,
            is_list,
            list_item_required,
        })
    }
}

/// GraphQL field argument
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphQLArgument {
    /// Argument name
    pub name: String,
    /// Argument type
    pub type_info: GraphQLType,
    /// Optional description
    pub description: Option<String>,
    /// Optional default value
    pub default_value: Option<String>,
}

/// GraphQL field definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphQLField {
    /// Field name
    pub name: String,
    /// Field type
    pub type_info: GraphQLType,
    /// Optional description
    pub description: Option<String>,
    /// Field arguments
    pub arguments: Vec<GraphQLArgument>,
    /// Directives applied to this field
    pub directives: Vec<GraphQLDirective>,
}

/// GraphQL directive
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphQLDirective {
    /// Directive name (without @)
    pub name: String,
    /// Directive arguments
    pub arguments: HashMap<String, String>,
}

impl GraphQLDirective {
    /// Create a new directive
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            arguments: HashMap::new(),
        }
    }

    /// Add an argument to the directive
    pub fn with_arg(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.arguments.insert(key.into(), value.into());
        self
    }

    /// Convert to SDL notation
    pub fn to_sdl(&self) -> String {
        let mut result = format!("@{}", self.name);

        if !self.arguments.is_empty() {
            result.push('(');
            let args: Vec<String> = self
                .arguments
                .iter()
                .map(|(k, v)| format!("{}: {}", k, v))
                .collect();
            result.push_str(&args.join(", "));
            result.push(')');
        }

        result
    }
}

/// GraphQL type definition (Object, Interface, etc.)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphQLTypeDefinition {
    /// Type kind
    pub kind: GraphQLTypeKind,
    /// Type name
    pub name: String,
    /// Optional description
    pub description: Option<String>,
    /// Fields (for objects and interfaces)
    pub fields: Vec<GraphQLField>,
    /// Interfaces this type implements
    pub implements: Vec<String>,
    /// Directives applied to this type
    pub directives: Vec<GraphQLDirective>,
    /// Enum values (for enums only)
    pub enum_values: Vec<GraphQLEnumValue>,
    /// Union member types (for unions only)
    pub union_types: Vec<String>,
}

/// GraphQL type kind
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum GraphQLTypeKind {
    Object,
    Interface,
    Enum,
    Union,
    InputObject,
    Scalar,
}

/// GraphQL enum value
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphQLEnumValue {
    /// Value name
    pub name: String,
    /// Optional description
    pub description: Option<String>,
    /// Directives applied to this enum value
    pub directives: Vec<GraphQLDirective>,
}

/// JSON Schema property definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonSchemaProperty {
    /// Property name (snake_case)
    pub name: String,
    /// JSON Schema type
    pub schema_type: JsonSchemaType,
    /// Optional description
    pub description: Option<String>,
    /// GraphQL field name (camelCase)
    pub graphql_name: Option<String>,
    /// GraphQL type override
    pub graphql_type: Option<String>,
    /// Whether this property is required
    pub required: bool,
}

/// JSON Schema type
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum JsonSchemaType {
    String,
    Number,
    Integer,
    Boolean,
    Object,
    Array,
    Null,
}

impl JsonSchemaType {
    /// Convert from JSON Schema type string
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "string" => Some(Self::String),
            "number" => Some(Self::Number),
            "integer" => Some(Self::Integer),
            "boolean" => Some(Self::Boolean),
            "object" => Some(Self::Object),
            "array" => Some(Self::Array),
            "null" => Some(Self::Null),
            _ => None,
        }
    }

    /// Convert to JSON Schema type string
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::String => "string",
            Self::Number => "number",
            Self::Integer => "integer",
            Self::Boolean => "boolean",
            Self::Object => "object",
            Self::Array => "array",
            Self::Null => "null",
        }
    }

    /// Get corresponding GraphQL scalar type
    pub fn to_graphql_scalar(&self) -> Option<&'static str> {
        match self {
            Self::String => Some("String"),
            Self::Number => Some("Float"),
            Self::Integer => Some("Int"),
            Self::Boolean => Some("Boolean"),
            Self::Object => None, // Objects are custom types
            Self::Array => None,  // Arrays are lists
            Self::Null => None,   // Null is not directly representable
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_graphql_type_to_sdl() {
        let type_info = GraphQLType::new("String").required();
        assert_eq!(type_info.to_sdl(), "String!");

        let list_type = GraphQLType::new("String").list().required();
        assert_eq!(list_type.to_sdl(), "[String]!");

        let required_list = GraphQLType::new("String")
            .list()
            .list_item_required()
            .required();
        assert_eq!(required_list.to_sdl(), "[String!]!");
    }

    #[test]
    fn test_graphql_type_from_sdl() {
        let result = GraphQLType::from_sdl("String!").unwrap();
        assert_eq!(result.name, "String");
        assert!(result.required);
        assert!(!result.is_list);

        let list_result = GraphQLType::from_sdl("[String]!").unwrap();
        assert_eq!(list_result.name, "String");
        assert!(list_result.required);
        assert!(list_result.is_list);
        assert!(!list_result.list_item_required);

        let required_list = GraphQLType::from_sdl("[String!]!").unwrap();
        assert_eq!(required_list.name, "String");
        assert!(required_list.required);
        assert!(required_list.is_list);
        assert!(required_list.list_item_required);
    }

    #[test]
    fn test_directive_to_sdl() {
        let directive = GraphQLDirective::new("key").with_arg("fields", "\"id\"");
        assert_eq!(directive.to_sdl(), "@key(fields: \"id\")");

        let simple = GraphQLDirective::new("deprecated");
        assert_eq!(simple.to_sdl(), "@deprecated");
    }

    #[test]
    fn test_json_schema_type_conversion() {
        assert_eq!(
            JsonSchemaType::from_str("string"),
            Some(JsonSchemaType::String)
        );
        assert_eq!(JsonSchemaType::String.as_str(), "string");
        assert_eq!(JsonSchemaType::String.to_graphql_scalar(), Some("String"));
        assert_eq!(JsonSchemaType::Number.to_graphql_scalar(), Some("Float"));
        assert_eq!(JsonSchemaType::Integer.to_graphql_scalar(), Some("Int"));
    }
}
