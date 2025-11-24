//! Converts GraphQL SDL to JSON Schema.
//!
//! This module uses `apollo-parser` to parse the GraphQL SDL into an Abstract Syntax Tree (AST),
//! then traverses the AST to construct a corresponding JSON Schema.

use crate::error::ValidationError;
use crate::types::{ConversionOptions, GqlScalar, GqlType, GqlValue};
use apollo_parser::{ast, Parser};
use indexmap::IndexMap;
use serde_json::{json, Value as JsonValue};

// Main conversion function
pub fn convert(sdl: &str, options: &ConversionOptions) -> Result<JsonValue, ValidationError> {
    let parser = Parser::new(sdl);
    let ast = parser.parse();

    if !ast.errors().is_empty() {
        let errors = ast
            .errors()
            .map(|e| e.to_string())
            .collect::<Vec<String>>()
            .join("\n");
        return Err(ValidationError::InvalidGraphQL(errors));
    }

    let doc = ast.document();
    let mut type_registry = IndexMap::new();

    for definition in doc.definitions() {
        if let ast::Definition::TypeDefinition(type_definition) = definition {
            let (name, type_def) = convert_type_definition(&type_definition);
            type_registry.insert(name, type_def);
        }
    }

    let context = ConversionContext::new(options, &type_registry);

    let mut schema_defs = IndexMap::new();
    for (name, type_def) in &context.type_registry {
        let schema = convert_type_to_schema(&type_def, &context);
        schema_defs.insert(name.clone(), schema);
    }

    // Determine the root type for the schema's main entry point.
    let root_ref_name = if type_registry.contains_key("Query") {
        "Query"
    } else {
        type_registry
            .values()
            .find(|def| def.kind == TypeKind::Object)
            .map(|def| def.name.as_str())
            .unwrap_or_else(|| {
                type_registry
                    .keys()
                    .next()
                    .map(|s| s.as_str())
                    .unwrap_or("")
            })
    };

    Ok(json!({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$ref": format!("#/definitions/{}", root_ref_name),
        "definitions": schema_defs,
    }))
}

// Conversion context and intermediate representation (IR) structs.
struct ConversionContext<'a> {
    options: &'a ConversionOptions,
    type_registry: &'a IndexMap<String, TypeDef>,
}

impl<'a> ConversionContext<'a> {
    fn new(options: &'a ConversionOptions, type_registry: &'a IndexMap<String, TypeDef>) -> Self {
        Self {
            options,
            type_registry,
        }
    }
}

#[derive(Debug, Clone)]
struct TypeDef {
    kind: TypeKind,
    name: String,
    description: Option<String>,
    fields: Vec<FieldDef>,
    directives: Vec<DirectiveDef>,
    interfaces: Vec<String>,
    enum_values: Vec<String>,
    union_types: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum TypeKind {
    Object,
    Interface,
    Enum,
    Union,
    InputObject,
    Scalar,
}

#[derive(Debug, Clone)]
struct FieldDef {
    name: String,
    field_type: GqlType,
    description: Option<String>,
    arguments: Vec<ArgumentDef>,
    directives: Vec<DirectiveDef>,
}

#[derive(Debug, Clone)]
struct ArgumentDef {
    name: String,
    arg_type: GqlType,
    default_value: Option<GqlValue>,
}

#[derive(Debug, Clone)]
struct DirectiveDef {
    name: String,
    arguments: IndexMap<String, GqlValue>,
}

// --- AST to Intermediate Representation Conversion ---

fn convert_type_definition(type_definition: &ast::TypeDefinition) -> (String, TypeDef) {
    let (kind, name, description, directives) = match type_definition {
        ast::TypeDefinition::ObjectTypeDefinition(def) => (
            TypeKind::Object,
            def.name().unwrap().text().to_string(),
            def.description().map(|d| d.string_value().unwrap()),
            def.directives()
                .map(|d| d.directives().map(convert_directive).collect())
                .unwrap_or_default(),
        ),
        ast::TypeDefinition::InterfaceTypeDefinition(def) => (
            TypeKind::Interface,
            def.name().unwrap().text().to_string(),
            def.description().map(|d| d.string_value().unwrap()),
            def.directives()
                .map(|d| d.directives().map(convert_directive).collect())
                .unwrap_or_default(),
        ),
        ast::TypeDefinition::EnumTypeDefinition(def) => (
            TypeKind::Enum,
            def.name().unwrap().text().to_string(),
            def.description().map(|d| d.string_value().unwrap()),
            def.directives()
                .map(|d| d.directives().map(convert_directive).collect())
                .unwrap_or_default(),
        ),
        ast::TypeDefinition::UnionTypeDefinition(def) => (
            TypeKind::Union,
            def.name().unwrap().text().to_string(),
            def.description().map(|d| d.string_value().unwrap()),
            def.directives()
                .map(|d| d.directives().map(convert_directive).collect())
                .unwrap_or_default(),
        ),
        ast::TypeDefinition::InputObjectTypeDefinition(def) => (
            TypeKind::InputObject,
            def.name().unwrap().text().to_string(),
            def.description().map(|d| d.string_value().unwrap()),
            def.directives()
                .map(|d| d.directives().map(convert_directive).collect())
                .unwrap_or_default(),
        ),
        ast::TypeDefinition::ScalarTypeDefinition(def) => (
            TypeKind::Scalar,
            def.name().unwrap().text().to_string(),
            def.description().map(|d| d.string_value().unwrap()),
            def.directives()
                .map(|d| d.directives().map(convert_directive).collect())
                .unwrap_or_default(),
        ),
    };

    let mut type_def = TypeDef {
        kind,
        name: name.clone(),
        description,
        fields: Vec::new(),
        directives,
        interfaces: Vec::new(),
        enum_values: Vec::new(),
        union_types: Vec::new(),
    };

    match type_definition {
        ast::TypeDefinition::ObjectTypeDefinition(def) => {
            if let Some(fields) = def.fields_definition() {
                type_def.fields = fields.field_definitions().map(convert_field).collect();
            }
            if let Some(interfaces) = def.implements_interfaces() {
                type_def.interfaces = interfaces
                    .named_types()
                    .map(|n| n.name().unwrap().text().to_string())
                    .collect();
            }
        }
        ast::TypeDefinition::InterfaceTypeDefinition(def) => {
            if let Some(fields) = def.fields_definition() {
                type_def.fields = fields.field_definitions().map(convert_field).collect();
            }
        }
        ast::TypeDefinition::InputObjectTypeDefinition(def) => {
            if let Some(fields) = def.input_fields_definition() {
                type_def.fields = fields
                    .input_value_definitions()
                    .map(convert_input_field)
                    .collect();
            }
        }
        ast::TypeDefinition::EnumTypeDefinition(def) => {
            if let Some(values) = def.enum_values_definition() {
                type_def.enum_values = values
                    .enum_value_definitions()
                    .map(|v| v.enum_value().unwrap().name().unwrap().text().to_string())
                    .collect();
            }
        }
        ast::TypeDefinition::UnionTypeDefinition(def) => {
            if let Some(members) = def.union_member_types() {
                type_def.union_types = members
                    .named_types()
                    .map(|t| t.name().unwrap().text().to_string())
                    .collect();
            }
        }
        _ => {}
    }

    (name, type_def)
}

fn convert_field(field: ast::FieldDefinition) -> FieldDef {
    FieldDef {
        name: field.name().unwrap().text().to_string(),
        field_type: convert_gql_type(field.ty().unwrap()),
        description: field.description().map(|d| d.string_value().unwrap()),
        arguments: field
            .arguments_definition()
            .map(|args| {
                args.input_value_definitions()
                    .map(convert_argument)
                    .collect()
            })
            .unwrap_or_default(),
        directives: field
            .directives()
            .map(|d| d.directives().map(convert_directive).collect())
            .unwrap_or_default(),
    }
}

fn convert_input_field(field: ast::InputValueDefinition) -> FieldDef {
    FieldDef {
        name: field.name().unwrap().text().to_string(),
        field_type: convert_gql_type(field.ty().unwrap()),
        description: field.description().map(|d| d.string_value().unwrap()),
        arguments: Vec::new(), // Input fields do not have arguments
        directives: field
            .directives()
            .map(|d| d.directives().map(convert_directive).collect())
            .unwrap_or_default(),
    }
}

fn convert_argument(arg: ast::InputValueDefinition) -> ArgumentDef {
    ArgumentDef {
        name: arg.name().unwrap().text().to_string(),
        arg_type: convert_gql_type(arg.ty().unwrap()),
        default_value: arg
            .default_value()
            .and_then(|v| v.value())
            .map(convert_value),
    }
}

fn convert_directive(directive: ast::Directive) -> DirectiveDef {
    DirectiveDef {
        name: directive.name().unwrap().text().to_string(),
        arguments: directive
            .arguments()
            .map(|args| {
                args.arguments()
                    .map(|arg| {
                        (
                            arg.name().unwrap().text().to_string(),
                            convert_value(arg.value().unwrap()),
                        )
                    })
                    .collect()
            })
            .unwrap_or_default(),
    }
}

fn convert_gql_type(gql_type: ast::Type) -> GqlType {
    match gql_type {
        ast::Type::NamedType(name) => {
            let type_name = name.name().unwrap().text().to_string();
            let scalar = match type_name.as_str() {
                "String" => GqlScalar::String,
                "ID" => GqlScalar::ID,
                "Int" => GqlScalar::Int,
                "Float" => GqlScalar::Float,
                "Boolean" => GqlScalar::Boolean,
                _ => return GqlType::Object(type_name),
            };
            GqlType::Scalar(scalar)
        }
        ast::Type::ListType(list) => GqlType::List(Box::new(convert_gql_type(list.ty().unwrap()))),
        ast::Type::NonNullType(non_null) => {
            GqlType::NonNull(Box::new(if let Some(t) = non_null.named_type() {
                convert_gql_type(ast::Type::NamedType(t))
            } else {
                convert_gql_type(ast::Type::ListType(non_null.list_type().unwrap()))
            }))
        }
    }
}

fn convert_value(value: ast::Value) -> GqlValue {
    match value {
        ast::Value::Variable(var) => GqlValue::Variable(var.name().unwrap().text().to_string()),
        ast::Value::IntValue(int) => GqlValue::Int(int.parse().unwrap_or(0)),
        ast::Value::FloatValue(float) => GqlValue::Float(float.parse().unwrap_or(0.0)),
        ast::Value::StringValue(string) => GqlValue::String(string.string_value().unwrap()),
        ast::Value::BooleanValue(b) => GqlValue::Boolean(b.value()),
        ast::Value::NullValue(_) => GqlValue::Null,
        ast::Value::EnumValue(e) => GqlValue::Enum(e.name().unwrap().text().to_string()),
        ast::Value::ListValue(list) => GqlValue::List(list.values().map(convert_value).collect()),
        ast::Value::ObjectValue(obj) => GqlValue::Object(
            obj.object_fields()
                .map(|f| {
                    (
                        f.name().unwrap().text().to_string(),
                        convert_value(f.value().unwrap()),
                    )
                })
                .collect(),
        ),
    }
}

// --- Intermediate Representation to JSON Schema Conversion ---

fn convert_type_to_schema(type_def: &TypeDef, context: &ConversionContext) -> JsonValue {
    let mut schema = IndexMap::new();

    if let Some(desc) = &type_def.description {
        schema.insert("description".to_string(), json!(desc));
    }

    match type_def.kind {
        TypeKind::Object | TypeKind::InputObject | TypeKind::Interface => {
            schema.insert("type".to_string(), json!("object"));
            let mut properties = IndexMap::new();
            let mut required = Vec::new();

            for field in &type_def.fields {
                let (prop_name, prop_schema) = convert_field_to_property(field, context);
                if is_required(&field.field_type) {
                    required.push(json!(prop_name.clone()));
                }
                properties.insert(prop_name, prop_schema);
            }

            if !properties.is_empty() {
                schema.insert("properties".to_string(), json!(properties));
            }
            if !required.is_empty() {
                schema.insert("required".to_string(), json!(required));
            }
        }
        TypeKind::Enum => {
            schema.insert("type".to_string(), json!("string"));
            if !type_def.enum_values.is_empty() {
                schema.insert("enum".to_string(), json!(type_def.enum_values));
            }
        }
        TypeKind::Union => {
            if !type_def.union_types.is_empty() {
                let any_of: Vec<JsonValue> = type_def
                    .union_types
                    .iter()
                    .map(|t| json!({ "$ref": format!("#/definitions/{}", t) }))
                    .collect();
                schema.insert("anyOf".to_string(), json!(any_of));
            }
        }
        TypeKind::Scalar => {
            let (json_type, format) = map_scalar_type(&type_def.name);
            schema.insert("type".to_string(), json!(json_type));
            if let Some(format) = format {
                schema.insert("format".to_string(), json!(format));
            }
        }
    }

    JsonValue::Object(schema.into_iter().collect())
}

fn convert_field_to_property(field: &FieldDef, context: &ConversionContext) -> (String, JsonValue) {
    let prop_name = camel_to_snake(&field.name);
    let mut prop_schema = gql_type_to_json_schema(&field.field_type, context);

    if let JsonValue::Object(map) = &mut prop_schema {
        if let Some(desc) = &field.description {
            map.insert("description".to_string(), json!(desc));
        }

        let directives_json: IndexMap<String, JsonValue> = field
            .directives
            .iter()
            .map(|d| (d.name.clone(), gql_value_to_json(&d.arguments)))
            .collect();

        if !directives_json.is_empty() {
            map.insert("x-graphql-directives".to_string(), json!(directives_json));
        }
    }

    (prop_name, prop_schema)
}

fn gql_type_to_json_schema(gql_type: &GqlType, context: &ConversionContext) -> JsonValue {
    match gql_type {
        GqlType::NonNull(inner) => gql_type_to_json_schema(inner, context),
        GqlType::List(inner) => json!({
            "type": "array",
            "items": gql_type_to_json_schema(inner, context)
        }),
        GqlType::Scalar(scalar) => match scalar {
            GqlScalar::Int => json!({"type": "integer"}),
            GqlScalar::Float => json!({"type": "number"}),
            GqlScalar::String => json!({"type": "string"}),
            GqlScalar::ID => json!({"type": "string"}),
            GqlScalar::Boolean => json!({"type": "boolean"}),
        },
        GqlType::Object(name) => {
            if context.type_registry.contains_key(name) {
                json!({ "$ref": format!("#/definitions/{}", name) })
            } else {
                let (json_type, format) = map_scalar_type(name);
                if let Some(format) = format {
                    json!({ "type": json_type, "format": format })
                } else {
                    json!({ "type": json_type })
                }
            }
        }
    }
}

fn gql_value_to_json(args: &IndexMap<String, GqlValue>) -> JsonValue {
    if args.is_empty() {
        return JsonValue::Bool(true);
    }
    let map: serde_json::Map<String, JsonValue> = args
        .iter()
        .map(|(k, v)| (k.clone(), gql_value_to_json_value(v)))
        .collect();
    JsonValue::Object(map)
}

fn gql_value_to_json_value(val: &GqlValue) -> JsonValue {
    match val {
        GqlValue::Int(i) => json!(i),
        GqlValue::Float(f) => json!(f),
        GqlValue::String(s) => json!(s.clone()),
        GqlValue::Boolean(b) => json!(b),
        GqlValue::Null => JsonValue::Null,
        GqlValue::Enum(e) => json!(e),
        GqlValue::List(l) => JsonValue::Array(l.iter().map(gql_value_to_json_value).collect()),
        GqlValue::Object(o) => JsonValue::Object(
            o.iter()
                .map(|(k, v)| (k.clone(), gql_value_to_json_value(v)))
                .collect(),
        ),
        GqlValue::Variable(v) => json!(format!("<variable: {}>", v)),
    }
}

fn is_required(gql_type: &GqlType) -> bool {
    matches!(gql_type, GqlType::NonNull(_))
}

fn map_scalar_type(scalar_name: &str) -> (&'static str, Option<&'static str>) {
    match scalar_name {
        "Int" => ("integer", None),
        "Float" => ("number", None),
        "String" => ("string", None),
        "ID" => ("string", None),
        "Boolean" => ("boolean", None),
        "Date" => ("string", Some("date")),
        "DateTime" => ("string", Some("date-time")),
        "Time" => ("string", Some("time")),
        "JSON" => ("object", None),
        _ => ("string", None), // Default for custom scalars
    }
}

fn camel_to_snake(s: &str) -> String {
    let mut snake = String::new();
    for (i, ch) in s.char_indices() {
        if i > 0 && ch.is_uppercase() {
            snake.push('_');
        }
        snake.push(ch.to_ascii_lowercase());
    }
    snake
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    #[test]
    fn test_convert_simple_type() {
        let sdl = r#"
            type User {
                id: ID!
                name: String
                age: Int
            }
        "#;
        let result = convert(sdl, &ConversionOptions::default()).unwrap();
        let expected = json!({
            "$schema": "http://json-schema.org/draft-07/schema#",
            "$ref": "#/definitions/User",
            "definitions": {
                "User": {
                    "type": "object",
                    "properties": {
                        "id": { "type": "string" },
                        "name": { "type": "string" },
                        "age": { "type": "integer" }
                    },
                    "required": ["id"]
                }
            }
        });
        assert_eq!(result, expected);
    }

    #[test]
    fn test_convert_with_directives() {
        let sdl = r#"
            type Product @key(fields: "id") {
                id: ID!
                sku: String @deprecated(reason: "Use id instead")
            }
        "#;
        let result = convert(sdl, &ConversionOptions::default()).unwrap();
        let product_def = &result["definitions"]["Product"];
        let sku_props = &product_def["properties"]["sku"];
        assert_eq!(
            sku_props["x-graphql-directives"]["deprecated"]["reason"],
            "Use id instead"
        );
    }

    #[test]
    fn test_convert_input_object() {
        let sdl = r#"
            input UserInput {
                name: String!
                email: String
            }
        "#;
        let result = convert(sdl, &ConversionOptions::default()).unwrap();
        let expected = json!({
            "$schema": "http://json-schema.org/draft-07/schema#",
            "$ref": "#/definitions/UserInput",
            "definitions": {
                "UserInput": {
                    "type": "object",
                    "properties": {
                        "name": { "type": "string" },
                        "email": { "type": "string" }
                    },
                    "required": ["name"]
                }
            }
        });
        assert_eq!(result, expected);
    }

    #[test]
    fn test_input_object_with_directives() {
        let sdl = r#"
            input UserInput {
                name: String! @constraint(maxLength: 50)
            }
        "#;
        let result = convert(sdl, &ConversionOptions::default()).unwrap();
        let user_input_def = &result["definitions"]["UserInput"];
        let name_props = &user_input_def["properties"]["name"];
        assert_eq!(
            name_props["x-graphql-directives"]["constraint"]["maxLength"],
            50
        );
    }
}
