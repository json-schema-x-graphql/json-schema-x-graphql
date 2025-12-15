//! Converts GraphQL SDL to JSON Schema.
//!
//! This module uses `async-graphql` to parse the GraphQL SDL into an Abstract Syntax Tree (AST),
//! then traverses the AST to construct a corresponding JSON Schema.

use crate::error::ConversionError;
use crate::types::{ConversionOptions, GqlScalar, GqlType};
use async_graphql::parser::{
    parse_schema,
    types::{
        BaseType, ConstDirective, FieldDefinition, InputValueDefinition, Type, TypeDefinition,
        TypeKind as AsyncTypeKind, TypeSystemDefinition,
    },
    Positioned,
};
use indexmap::IndexMap;
use serde_json::{json, Value as JsonValue};

// --- Main Conversion Function ---

pub fn convert(sdl: &str, _options: &ConversionOptions) -> Result<String, ConversionError> {
    let doc = parse_schema(sdl).map_err(|e| ConversionError::InvalidGraphQLSdl(e.to_string()))?;
    let dummy_registry = IndexMap::new();
    let context = ConversionContext::new(sdl, &dummy_registry);

    let type_registry: IndexMap<String, TypeDef> = doc
        .definitions
        .into_iter()
        .filter_map(|def| {
            if let TypeSystemDefinition::Type(type_def) = def {
                convert_definition(type_def, &context)
            } else {
                None
            }
        })
        .collect();

    let context = ConversionContext::new(sdl, &type_registry);

    // Determine root type: prefer the type with most fields (excluding Query/Mutation)
    let root_ref_name = {
        let mut best_type = None;
        let mut max_fields = 0;
        
        for (name, type_def) in context.type_registry {
            if type_def.kind == TypeKind::Object && name != "Query" && name != "Mutation" {
                let field_count = type_def.fields.len();
                if field_count > max_fields {
                    max_fields = field_count;
                    best_type = Some(name.clone());
                }
            }
        }
        
        best_type.unwrap_or_else(|| {
            // Fallback: use Query, or first Object type, or first type
            if type_registry.contains_key("Query") {
                "Query".to_string()
            } else {
                type_registry
                    .values()
                    .find(|def| def.kind == TypeKind::Object)
                    .map(|def| def.name.clone())
                    .unwrap_or_else(|| type_registry.keys().next().map(|s| s.clone()).unwrap_or_default())
            }
        })
    };

    // Build schema with root type at top level
    let root_type_def = context.type_registry.get(root_ref_name.as_str()).cloned();
    
    let mut root_schema = if let Some(type_def) = root_type_def {
        convert_type_to_schema(&type_def, &context)
    } else {
        json!({
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object"
        })
    };
    
    // Ensure schema version is set
    if !root_schema.get("$schema").is_some() {
        root_schema["$schema"] = json!("http://json-schema.org/draft-07/schema#");
    }
    
    // Build definitions for non-root types
    let mut schema_defs = IndexMap::new();
    for (name, type_def) in context.type_registry {
        if name.as_str() != root_ref_name.as_str() {
            let schema = convert_type_to_schema(&type_def, &context);
            schema_defs.insert(name.clone(), schema);
        }
    }
    
    // Add definitions to root schema if there are any
    if !schema_defs.is_empty() {
        root_schema["definitions"] = json!(schema_defs);
    }

    serde_json::to_string_pretty(&root_schema).map_err(Into::into)
}

// --- Intermediate Representation ---

struct ConversionContext<'a> {
    #[allow(dead_code)]
    sdl: &'a str,
    type_registry: &'a IndexMap<String, TypeDef>,
}

impl<'a> ConversionContext<'a> {
    fn new(sdl: &'a str, type_registry: &'a IndexMap<String, TypeDef>) -> Self {
        Self { sdl, type_registry }
    }
}

#[derive(Debug, Clone)]
struct TypeDef {
    kind: TypeKind,
    name: String,
    description: Option<String>,
    fields: Vec<FieldDef>,
    enum_values: Vec<String>,
    union_types: Vec<String>,
    interfaces: Vec<String>,
    directives: Vec<DirectiveDef>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
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
    description: Option<String>,
    default_value: Option<String>,
}

#[derive(Debug, Clone)]
struct DirectiveDef {
    name: String,
    arguments: IndexMap<String, String>,
}

// --- CST to Intermediate Representation Conversion ---

fn get_description(desc: &Option<Positioned<String>>) -> Option<String> {
    desc.as_ref().map(|d| d.node.clone())
}

fn convert_definition<'a>(
    definition: Positioned<TypeDefinition>,
    context: &'a ConversionContext,
) -> Option<(String, TypeDef)> {
    let name = definition.node.name.node.to_string();
    let description = get_description(&definition.node.description);
    let directives = definition
        .node
        .directives
        .iter()
        .map(|d| convert_directive(d))
        .collect::<Vec<_>>();

    let type_def = match &definition.node.kind {
        AsyncTypeKind::Object(def) => Some((
            name.clone(),
            TypeDef {
                kind: TypeKind::Object,
                name: name.clone(),
                description: description.clone(),
                fields: def
                    .fields
                    .iter()
                    .map(|f| convert_field(f, context))
                    .collect(),
                enum_values: vec![],
                union_types: vec![],
                interfaces: def.implements.iter().map(|i| i.node.to_string()).collect(),
                directives,
            },
        )),
        AsyncTypeKind::Interface(def) => Some((
            name.clone(),
            TypeDef {
                kind: TypeKind::Interface,
                name: name.clone(),
                description: description.clone(),
                fields: def
                    .fields
                    .iter()
                    .map(|f| convert_field(f, context))
                    .collect(),
                enum_values: vec![],
                union_types: vec![],
                interfaces: def.implements.iter().map(|i| i.node.to_string()).collect(),
                directives,
            },
        )),
        AsyncTypeKind::Enum(def) => Some((
            name.clone(),
            TypeDef {
                kind: TypeKind::Enum,
                name: name.clone(),
                description: description.clone(),
                fields: vec![],
                enum_values: def
                    .values
                    .iter()
                    .map(|v| v.node.value.to_string())
                    .collect(),
                union_types: vec![],
                interfaces: vec![],
                directives,
            },
        )),
        AsyncTypeKind::Union(def) => Some((
            name.clone(),
            TypeDef {
                kind: TypeKind::Union,
                name: name.clone(),
                description: description.clone(),
                fields: vec![],
                enum_values: vec![],
                union_types: def.members.iter().map(|m| m.node.to_string()).collect(),
                interfaces: vec![],
                directives,
            },
        )),
        AsyncTypeKind::InputObject(def) => Some((
            name.clone(),
            TypeDef {
                kind: TypeKind::InputObject,
                name: name.clone(),
                description: description.clone(),
                fields: def
                    .fields
                    .iter()
                    .map(|f| convert_input_field(f, context))
                    .collect(),
                enum_values: vec![],
                union_types: vec![],
                interfaces: vec![],
                directives,
            },
        )),
        AsyncTypeKind::Scalar => Some((
            name.clone(),
            TypeDef {
                kind: TypeKind::Scalar,
                name: name.clone(),
                description: description.clone(),
                fields: vec![],
                enum_values: vec![],
                union_types: vec![],
                interfaces: vec![],
                directives,
            },
        )),
    };
    type_def
}

fn convert_field<'a>(
    field: &Positioned<FieldDefinition>,
    context: &'a ConversionContext,
) -> FieldDef {
    FieldDef {
        name: field.node.name.node.to_string(),
        field_type: convert_gql_type(&field.node.ty.node, context),
        description: get_description(&field.node.description),
        arguments: field
            .node
            .arguments
            .iter()
            .map(|a| ArgumentDef {
                name: a.node.name.node.to_string(),
                arg_type: convert_gql_type(&a.node.ty.node, context),
                description: get_description(&a.node.description),
                default_value: a.node.default_value.as_ref().map(|v| v.node.to_string()),
            })
            .collect(),
        directives: field
            .node
            .directives
            .iter()
            .map(|d| convert_directive(d))
            .collect(),
    }
}

fn convert_input_field<'a>(
    field: &Positioned<InputValueDefinition>,
    context: &'a ConversionContext,
) -> FieldDef {
    FieldDef {
        name: field.node.name.node.to_string(),
        field_type: convert_gql_type(&field.node.ty.node, context),
        description: get_description(&field.node.description),
        arguments: vec![], // Input fields don't have arguments
        directives: field
            .node
            .directives
            .iter()
            .map(|d| convert_directive(d))
            .collect(),
    }
}

fn convert_directive(directive: &Positioned<ConstDirective>) -> DirectiveDef {
    let mut arguments = IndexMap::new();
    for (name, value) in &directive.node.arguments {
        arguments.insert(name.node.to_string(), value.node.to_string());
    }
    DirectiveDef {
        name: directive.node.name.node.to_string(),
        arguments,
    }
}

fn convert_gql_type<'a>(gql_type: &Type, context: &'a ConversionContext) -> GqlType {
    let result = match &gql_type.base {
        BaseType::Named(name) => {
            let type_name = name.to_string();
            let scalar = match type_name.as_str() {
                "String" => GqlScalar::String,
                "Int" => GqlScalar::Int,
                "Float" => GqlScalar::Float,
                "Boolean" => GqlScalar::Boolean,
                "ID" => GqlScalar::Id,
                _ => GqlScalar::Custom(type_name),
            };
            GqlType::Scalar(scalar)
        }
        BaseType::List(inner) => GqlType::List(Box::new(convert_gql_type(inner, context))),
    };
    if gql_type.nullable {
        result
    } else {
        GqlType::NonNull(Box::new(result))
    }
}

// --- IR to JSON Schema Conversion ---

fn convert_type_to_schema(type_def: &TypeDef, context: &ConversionContext) -> JsonValue {
    let mut x_graphql = json!({
        "typeName": type_def.name,
        "kind": format!("{:?}", type_def.kind).to_lowercase(),
    });

    if !type_def.interfaces.is_empty() {
        x_graphql["implements"] = json!(type_def.interfaces);
    }

    if !type_def.directives.is_empty() {
        x_graphql["directives"] = json!(type_def
            .directives
            .iter()
            .map(|d| {
                let mut dir_json = json!({ "name": d.name });
                if !d.arguments.is_empty() {
                    dir_json["arguments"] = json!(d.arguments);
                }
                dir_json
            })
            .collect::<Vec<_>>());

        // Extract federation directives
        let mut federation = json!({});
        let mut has_federation = false;

        for dir in &type_def.directives {
            match dir.name.as_str() {
                "key" => {
                    if let Some(fields) = dir.arguments.get("fields") {
                        let fields_str = fields.trim_matches('"');
                        let resolvable = dir
                            .arguments
                            .get("resolvable")
                            .map(|v| v != "false")
                            .unwrap_or(true);

                        let key_obj = if resolvable {
                            json!({ "fields": fields_str, "resolvable": true })
                        } else {
                            json!({ "fields": fields_str, "resolvable": false })
                        };

                        if let Some(keys) =
                            federation.get_mut("keys").and_then(|v| v.as_array_mut())
                        {
                            keys.push(key_obj);
                        } else {
                            federation["keys"] = json!([key_obj]);
                        }
                        has_federation = true;
                    }
                }
                "shareable" => {
                    federation["shareable"] = json!(true);
                    has_federation = true;
                }
                "extends" => {
                    federation["extends"] = json!(true);
                    has_federation = true;
                }
                "interfaceObject" => {
                    federation["interfaceObject"] = json!(true);
                    has_federation = true;
                }
                "authenticated" => {
                    federation["authenticated"] = json!(true);
                    has_federation = true;
                }
                "requiresScopes" => {
                    if let Some(scopes) = dir.arguments.get("scopes") {
                        // scopes is usually a list of lists of strings, simplified here
                        federation["requiresScopes"] = json!(scopes);
                        has_federation = true;
                    }
                }
                _ => {}
            }
        }

        if has_federation {
            x_graphql["federation"] = federation;
        }
    }

    let mut schema = json!({
        "x-graphql": x_graphql
    });

    if let Some(description) = &type_def.description {
        schema["description"] = json!(description);
    }

    match type_def.kind {
        TypeKind::Object | TypeKind::Interface | TypeKind::InputObject => {
            schema["type"] = json!("object");
            let mut properties = IndexMap::new();
            let mut required = Vec::new();

            for field in &type_def.fields {
                let (prop_schema, is_req) = gql_type_to_json_schema(&field.field_type, context);
                let mut final_prop_schema = prop_schema;

                let mut field_x_graphql = json!({});
                if field.name != camel_to_snake(&field.name) {
                    field_x_graphql["fieldName"] = json!(field.name);
                }

                // Add arguments
                if !field.arguments.is_empty() {
                    let args: IndexMap<String, JsonValue> = field
                        .arguments
                        .iter()
                        .map(|a| {
                            let mut arg_schema = json!({
                                "type": gql_type_to_string(&a.arg_type)
                            });
                            if let Some(desc) = &a.description {
                                arg_schema["description"] = json!(desc);
                            }
                            if let Some(default) = &a.default_value {
                                arg_schema["default"] = json!(default);
                            }
                            (a.name.clone(), arg_schema)
                        })
                        .collect();
                    field_x_graphql["args"] = json!(args);
                }

                // Add directives
                if !field.directives.is_empty() {
                    field_x_graphql["directives"] = json!(field
                        .directives
                        .iter()
                        .map(|d| {
                            let mut dir_json = json!({ "name": d.name });
                            if !d.arguments.is_empty() {
                                dir_json["arguments"] = json!(d.arguments);
                            }
                            dir_json
                        })
                        .collect::<Vec<_>>());

                    // Handle federation field directives
                    let mut federation = json!({});
                    let mut has_federation = false;

                    for dir in &field.directives {
                        match dir.name.as_str() {
                            "external" => {
                                federation["external"] = json!(true);
                                has_federation = true;
                            }
                            "requires" => {
                                if let Some(fields) = dir.arguments.get("fields") {
                                    federation["requires"] = json!(fields.trim_matches('"'));
                                    has_federation = true;
                                }
                            }
                            "provides" => {
                                if let Some(fields) = dir.arguments.get("fields") {
                                    federation["provides"] = json!(fields.trim_matches('"'));
                                    has_federation = true;
                                }
                            }
                            "override" => {
                                if let Some(from) = dir.arguments.get("from") {
                                    federation["override"] =
                                        json!({ "from": from.trim_matches('"') });
                                    has_federation = true;
                                }
                            }
                            "shareable" => {
                                federation["shareable"] = json!(true);
                                has_federation = true;
                            }
                            _ => {}
                        }
                    }
                    if has_federation {
                        field_x_graphql["federation"] = federation;
                    }
                }

                if field_x_graphql
                    .as_object()
                    .map(|o| !o.is_empty())
                    .unwrap_or(false)
                {
                    final_prop_schema["x-graphql"] = field_x_graphql;
                }

                if let Some(desc) = &field.description {
                    final_prop_schema["description"] = json!(desc);
                }

                let prop_name = camel_to_snake(&field.name);
                if is_req {
                    required.push(prop_name.clone());
                }
                properties.insert(prop_name, final_prop_schema);
            }
            schema["properties"] = json!(properties);
            if !required.is_empty() {
                schema["required"] = json!(required);
            }
        }
        TypeKind::Enum => {
            schema["type"] = json!("string");
            schema["enum"] = json!(type_def.enum_values);
        }
        TypeKind::Union => {
            schema["oneOf"] = json!(type_def
                .union_types
                .iter()
                .map(|t| json!({ "$ref": format!("#/definitions/{}", t) }))
                .collect::<Vec<_>>());

            // Union specific x-graphql info
            if let Some(x) = schema.get_mut("x-graphql").and_then(|v| v.as_object_mut()) {
                x.insert("unionTypes".to_string(), json!(type_def.union_types));
            }
        }
        TypeKind::Scalar => {
            schema["type"] = json!("string"); // Default, can be overridden by user
        }
    }
    schema
}

fn gql_type_to_string(gql_type: &GqlType) -> String {
    match gql_type {
        GqlType::Scalar(scalar) => match scalar {
            GqlScalar::String => "String".to_string(),
            GqlScalar::Int => "Int".to_string(),
            GqlScalar::Float => "Float".to_string(),
            GqlScalar::Boolean => "Boolean".to_string(),
            GqlScalar::Id => "ID".to_string(),
            GqlScalar::Custom(name) => name.clone(),
        },
        GqlType::List(inner) => format!("[{}]", gql_type_to_string(inner)),
        GqlType::NonNull(inner) => format!("{}!", gql_type_to_string(inner)),
    }
}

fn gql_type_to_json_schema(gql_type: &GqlType, context: &ConversionContext) -> (JsonValue, bool) {
    match gql_type {
        GqlType::Scalar(scalar) => (
            match scalar {
                GqlScalar::String => json!({"type": "string"}),
                GqlScalar::Int => json!({"type": "integer"}),
                GqlScalar::Float => json!({"type": "number"}),
                GqlScalar::Boolean => json!({"type": "boolean"}),
                GqlScalar::Id => json!({"type": "string", "format": "uuid"}),
                GqlScalar::Custom(name) => json!({ "$ref": format!("#/definitions/{}", name) }),
            },
            false,
        ),
        GqlType::List(inner) => (
            json!({
                "type": "array",
                "items": gql_type_to_json_schema(inner, context).0,
            }),
            false,
        ),
        GqlType::NonNull(inner) => {
            let (schema, _) = gql_type_to_json_schema(inner, context);
            (schema, true)
        }
    }
}

// --- Utility Functions ---

fn camel_to_snake(s: &str) -> String {
    let mut snake = String::new();
    for (i, ch) in s.chars().enumerate() {
        if i > 0 && ch.is_uppercase() {
            snake.push('_');
        }
        snake.push(ch.to_ascii_lowercase());
    }
    snake
}

// --- Tests ---
#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    #[test]
    fn test_convert_simple_type() {
        let sdl = r#"
            """
            A user of the system.
            """
            type User {
                id: ID!
                name: String
                email: String!
            }
        "#;
        let options = ConversionOptions::default();
        let result = convert(sdl, &options).unwrap();

        let expected_str = serde_json::to_string_pretty(&json!({
          "$schema": "http://json-schema.org/draft-07/schema#",
          "$ref": "#/definitions/User",
          "definitions": {
            "User": {
              "description": "A user of the system.",
              "type": "object",
              "x-graphql": {
                "typeName": "User",
                "kind": "object"
              },
              "properties": {
                "id": {
                  "type": "string",
                  "format": "uuid"
                },
                "name": {
                  "type": "string"
                },
                "email": {
                  "type": "string"
                }
              },
              "required": [
                "id",
                "email"
              ]
            }
          }
        }))
        .unwrap();

        assert_eq!(result, expected_str);
    }
}
