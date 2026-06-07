use crate::error::{ConversionError, Result};
use async_graphql_parser::{
    parse_schema,
    types::{
        BaseType, ConstDirective, FieldDefinition, InputValueDefinition, Type, TypeDefinition,
        TypeKind as AsyncTypeKind, TypeSystemDefinition,
    },
    Positioned,
};
use serde_json::{json, Map, Value as JsonValue};

pub fn sdl_to_ast_json(sdl: &str) -> Result<String> {
    if sdl.trim().is_empty() {
        return Ok("null".to_string());
    }

    let doc = parse_schema(sdl).map_err(|e| ConversionError::InvalidGraphQLSdl(e.to_string()))?;
    let definitions = doc
        .definitions
        .into_iter()
        .filter_map(type_system_definition_to_json)
        .collect::<Vec<_>>();

    serde_json::to_string(&json!({
        "kind": "Document",
        "definitions": definitions,
    }))
    .map_err(Into::into)
}

fn type_system_definition_to_json(def: TypeSystemDefinition) -> Option<JsonValue> {
    match def {
        TypeSystemDefinition::Type(type_def) => Some(type_definition_to_json(type_def)),
        _ => None,
    }
}

fn type_definition_to_json(definition: Positioned<TypeDefinition>) -> JsonValue {
    let mut object = Map::new();

    match definition.node.kind {
        AsyncTypeKind::Object(def) => {
            object.insert("kind".to_string(), json!("ObjectTypeDefinition"));
            insert_description(&mut object, &definition.node.description);
            object.insert(
                "name".to_string(),
                name_node(definition.node.name.node.to_string()),
            );
            object.insert(
                "interfaces".to_string(),
                JsonValue::Array(
                    def.implements
                        .iter()
                        .map(|i| named_type_node(i.node.to_string()))
                        .collect(),
                ),
            );
            object.insert(
                "directives".to_string(),
                JsonValue::Array(
                    definition
                        .node
                        .directives
                        .iter()
                        .filter_map(|d| directive_to_json(d).ok())
                        .collect(),
                ),
            );
            object.insert(
                "fields".to_string(),
                JsonValue::Array(def.fields.iter().map(field_definition_to_json).collect()),
            );
        }
        AsyncTypeKind::Interface(def) => {
            object.insert("kind".to_string(), json!("InterfaceTypeDefinition"));
            insert_description(&mut object, &definition.node.description);
            object.insert(
                "name".to_string(),
                name_node(definition.node.name.node.to_string()),
            );
            object.insert(
                "interfaces".to_string(),
                JsonValue::Array(
                    def.implements
                        .iter()
                        .map(|i| named_type_node(i.node.to_string()))
                        .collect(),
                ),
            );
            object.insert(
                "directives".to_string(),
                JsonValue::Array(
                    definition
                        .node
                        .directives
                        .iter()
                        .filter_map(|d| directive_to_json(d).ok())
                        .collect(),
                ),
            );
            object.insert(
                "fields".to_string(),
                JsonValue::Array(def.fields.iter().map(field_definition_to_json).collect()),
            );
        }
        AsyncTypeKind::Enum(def) => {
            object.insert("kind".to_string(), json!("EnumTypeDefinition"));
            insert_description(&mut object, &definition.node.description);
            object.insert(
                "name".to_string(),
                name_node(definition.node.name.node.to_string()),
            );
            object.insert(
                "directives".to_string(),
                JsonValue::Array(
                    definition
                        .node
                        .directives
                        .iter()
                        .filter_map(|d| directive_to_json(d).ok())
                        .collect(),
                ),
            );
            object.insert(
                "values".to_string(),
                JsonValue::Array(
                    def.values
                        .iter()
                        .map(|value| {
                            let mut enum_value = Map::new();
                            enum_value.insert("kind".to_string(), json!("EnumValueDefinition"));
                            insert_description(&mut enum_value, &value.node.description);
                            enum_value.insert(
                                "name".to_string(),
                                name_node(value.node.value.node.to_string()),
                            );
                            enum_value.insert(
                                "directives".to_string(),
                                JsonValue::Array(
                                    value
                                        .node
                                        .directives
                                        .iter()
                                        .filter_map(|d| directive_to_json(d).ok())
                                        .collect(),
                                ),
                            );
                            JsonValue::Object(enum_value)
                        })
                        .collect(),
                ),
            );
        }
        AsyncTypeKind::Union(def) => {
            object.insert("kind".to_string(), json!("UnionTypeDefinition"));
            insert_description(&mut object, &definition.node.description);
            object.insert(
                "name".to_string(),
                name_node(definition.node.name.node.to_string()),
            );
            object.insert(
                "directives".to_string(),
                JsonValue::Array(
                    definition
                        .node
                        .directives
                        .iter()
                        .filter_map(|d| directive_to_json(d).ok())
                        .collect(),
                ),
            );
            object.insert(
                "types".to_string(),
                JsonValue::Array(
                    def.members
                        .iter()
                        .map(|m| named_type_node(m.node.to_string()))
                        .collect(),
                ),
            );
        }
        AsyncTypeKind::InputObject(def) => {
            object.insert("kind".to_string(), json!("InputObjectTypeDefinition"));
            insert_description(&mut object, &definition.node.description);
            object.insert(
                "name".to_string(),
                name_node(definition.node.name.node.to_string()),
            );
            object.insert(
                "directives".to_string(),
                JsonValue::Array(
                    definition
                        .node
                        .directives
                        .iter()
                        .filter_map(|d| directive_to_json(d).ok())
                        .collect(),
                ),
            );
            object.insert(
                "fields".to_string(),
                JsonValue::Array(
                    def.fields
                        .iter()
                        .map(input_value_definition_to_json)
                        .collect(),
                ),
            );
        }
        AsyncTypeKind::Scalar => {
            object.insert("kind".to_string(), json!("ScalarTypeDefinition"));
            insert_description(&mut object, &definition.node.description);
            object.insert(
                "name".to_string(),
                name_node(definition.node.name.node.to_string()),
            );
            object.insert(
                "directives".to_string(),
                JsonValue::Array(
                    definition
                        .node
                        .directives
                        .iter()
                        .filter_map(|d| directive_to_json(d).ok())
                        .collect(),
                ),
            );
        }
    }

    JsonValue::Object(object)
}

fn field_definition_to_json(field: &Positioned<FieldDefinition>) -> JsonValue {
    let mut object = Map::new();
    object.insert("kind".to_string(), json!("FieldDefinition"));
    insert_description(&mut object, &field.node.description);
    object.insert(
        "name".to_string(),
        name_node(field.node.name.node.to_string()),
    );
    object.insert(
        "arguments".to_string(),
        JsonValue::Array(
            field
                .node
                .arguments
                .iter()
                .map(input_value_definition_to_json)
                .collect(),
        ),
    );
    object.insert("type".to_string(), type_to_json(&field.node.ty.node));
    object.insert(
        "directives".to_string(),
        JsonValue::Array(
            field
                .node
                .directives
                .iter()
                .filter_map(|d| directive_to_json(d).ok())
                .collect(),
        ),
    );
    JsonValue::Object(object)
}

fn input_value_definition_to_json(field: &Positioned<InputValueDefinition>) -> JsonValue {
    let mut object = Map::new();
    object.insert("kind".to_string(), json!("InputValueDefinition"));
    insert_description(&mut object, &field.node.description);
    object.insert(
        "name".to_string(),
        name_node(field.node.name.node.to_string()),
    );
    object.insert("type".to_string(), type_to_json(&field.node.ty.node));
    if let Some(default_value) = &field.node.default_value {
        if let Ok(value) = parse_const_value(&default_value.node.to_string()) {
            object.insert("defaultValue".to_string(), value);
        }
    }
    object.insert(
        "directives".to_string(),
        JsonValue::Array(
            field
                .node
                .directives
                .iter()
                .filter_map(|d| directive_to_json(d).ok())
                .collect(),
        ),
    );
    JsonValue::Object(object)
}

fn directive_to_json(directive: &Positioned<ConstDirective>) -> Result<JsonValue> {
    let mut object = Map::new();
    object.insert("kind".to_string(), json!("Directive"));
    object.insert(
        "name".to_string(),
        name_node(directive.node.name.node.to_string()),
    );
    object.insert(
        "arguments".to_string(),
        JsonValue::Array(
            directive
                .node
                .arguments
                .iter()
                .map(|(name, value)| {
                    Ok(JsonValue::Object(Map::from_iter([
                        ("kind".to_string(), json!("Argument")),
                        ("name".to_string(), name_node(name.node.to_string())),
                        (
                            "value".to_string(),
                            parse_const_value(&value.node.to_string())?,
                        ),
                    ])))
                })
                .collect::<Result<Vec<_>>>()?,
        ),
    );
    Ok(JsonValue::Object(object))
}

fn type_to_json(ty: &Type) -> JsonValue {
    let base = match &ty.base {
        BaseType::Named(name) => named_type_node(name.to_string()),
        BaseType::List(inner) => json!({
            "kind": "ListType",
            "type": type_to_json(inner),
        }),
    };

    if ty.nullable {
        base
    } else {
        json!({
            "kind": "NonNullType",
            "type": base,
        })
    }
}

fn name_node(name: impl Into<String>) -> JsonValue {
    json!({
        "kind": "Name",
        "value": name.into(),
    })
}

fn named_type_node(name: impl Into<String>) -> JsonValue {
    json!({
        "kind": "NamedType",
        "name": name_node(name.into()),
    })
}

fn string_value_node(value: impl Into<String>) -> JsonValue {
    json!({
        "kind": "StringValue",
        "value": value.into(),
    })
}

fn insert_description(
    target: &mut Map<String, JsonValue>,
    description: &Option<Positioned<String>>,
) {
    if let Some(description) = description {
        target.insert(
            "description".to_string(),
            string_value_node(description.node.clone()),
        );
    }
}

fn parse_const_value(raw: &str) -> Result<JsonValue> {
    GraphqlValueParser::new(raw).parse()
}

struct GraphqlValueParser {
    chars: Vec<char>,
    pos: usize,
}

impl GraphqlValueParser {
    fn new(input: &str) -> Self {
        Self {
            chars: input.chars().collect(),
            pos: 0,
        }
    }

    fn parse(mut self) -> Result<JsonValue> {
        let value = self.parse_value()?;
        self.skip_ws_and_commas();
        if self.pos < self.chars.len() {
            return Err(ConversionError::InvalidGraphQLSdl(format!(
                "Unexpected trailing GraphQL value content: {}",
                self.chars[self.pos..].iter().collect::<String>()
            )));
        }
        Ok(value)
    }

    fn parse_value(&mut self) -> Result<JsonValue> {
        self.skip_ws_and_commas();
        match self.peek() {
            Some('"') => Ok(string_value_node(self.parse_string()?)),
            Some('[') => self.parse_list(),
            Some('{') => self.parse_object(),
            Some('-') => self.parse_number(),
            Some(c) if c.is_ascii_digit() => self.parse_number(),
            Some(_) => self.parse_name_like_value(),
            None => Err(ConversionError::InvalidGraphQLSdl(
                "Unexpected end of GraphQL value".to_string(),
            )),
        }
    }

    fn parse_list(&mut self) -> Result<JsonValue> {
        self.expect('[')?;
        let mut values = Vec::new();
        loop {
            self.skip_ws_and_commas();
            if self.peek() == Some(']') {
                self.pos += 1;
                break;
            }
            values.push(self.parse_value()?);
            self.skip_ws_and_commas();
            if self.peek() == Some(']') {
                self.pos += 1;
                break;
            }
        }
        Ok(json!({
            "kind": "ListValue",
            "values": values,
        }))
    }

    fn parse_object(&mut self) -> Result<JsonValue> {
        self.expect('{')?;
        let mut fields = Vec::new();
        loop {
            self.skip_ws_and_commas();
            if self.peek() == Some('}') {
                self.pos += 1;
                break;
            }
            let name = self.parse_name()?;
            self.skip_ws_and_commas();
            self.expect(':')?;
            let value = self.parse_value()?;
            fields.push(json!({
                "kind": "ObjectField",
                "name": name_node(name),
                "value": value,
            }));
            self.skip_ws_and_commas();
            if self.peek() == Some('}') {
                self.pos += 1;
                break;
            }
        }
        Ok(json!({
            "kind": "ObjectValue",
            "fields": fields,
        }))
    }

    fn parse_number(&mut self) -> Result<JsonValue> {
        let start = self.pos;
        if self.peek() == Some('-') {
            self.pos += 1;
        }
        while matches!(self.peek(), Some(c) if c.is_ascii_digit()) {
            self.pos += 1;
        }
        if self.peek() == Some('.') {
            self.pos += 1;
            while matches!(self.peek(), Some(c) if c.is_ascii_digit()) {
                self.pos += 1;
            }
        }
        if matches!(self.peek(), Some('e') | Some('E')) {
            self.pos += 1;
            if matches!(self.peek(), Some('+') | Some('-')) {
                self.pos += 1;
            }
            while matches!(self.peek(), Some(c) if c.is_ascii_digit()) {
                self.pos += 1;
            }
        }

        let value = self.chars[start..self.pos].iter().collect::<String>();
        let kind = if value.contains('.') || value.contains('e') || value.contains('E') {
            "FloatValue"
        } else {
            "IntValue"
        };

        Ok(json!({
            "kind": kind,
            "value": value,
        }))
    }

    fn parse_name_like_value(&mut self) -> Result<JsonValue> {
        let value = self.parse_name()?;
        match value.as_str() {
            "true" => Ok(json!({ "kind": "BooleanValue", "value": true })),
            "false" => Ok(json!({ "kind": "BooleanValue", "value": false })),
            "null" => Ok(json!({ "kind": "NullValue" })),
            _ => Ok(json!({ "kind": "EnumValue", "value": value })),
        }
    }

    fn parse_name(&mut self) -> Result<String> {
        let start = self.pos;
        while matches!(self.peek(), Some(c) if c.is_ascii_alphanumeric() || c == '_') {
            self.pos += 1;
        }
        if start == self.pos {
            return Err(ConversionError::InvalidGraphQLSdl(
                "Expected GraphQL name".to_string(),
            ));
        }
        Ok(self.chars[start..self.pos].iter().collect())
    }

    fn parse_string(&mut self) -> Result<String> {
        self.expect('"')?;
        let mut value = String::new();

        while let Some(ch) = self.peek() {
            self.pos += 1;
            match ch {
                '"' => return Ok(value),
                '\\' => {
                    let escaped = self.peek().ok_or_else(|| {
                        ConversionError::InvalidGraphQLSdl(
                            "Unterminated GraphQL string escape".to_string(),
                        )
                    })?;
                    self.pos += 1;
                    match escaped {
                        '"' => value.push('"'),
                        '\\' => value.push('\\'),
                        '/' => value.push('/'),
                        'b' => value.push('\u{0008}'),
                        'f' => value.push('\u{000C}'),
                        'n' => value.push('\n'),
                        'r' => value.push('\r'),
                        't' => value.push('\t'),
                        'u' => {
                            let hex = self.take_n(4)?;
                            let code = u32::from_str_radix(&hex, 16).map_err(|_| {
                                ConversionError::InvalidGraphQLSdl(format!(
                                    "Invalid unicode escape: {}",
                                    hex
                                ))
                            })?;
                            let decoded = char::from_u32(code).ok_or_else(|| {
                                ConversionError::InvalidGraphQLSdl(format!(
                                    "Invalid unicode code point: {}",
                                    code
                                ))
                            })?;
                            value.push(decoded);
                        }
                        other => value.push(other),
                    }
                }
                other => value.push(other),
            }
        }

        Err(ConversionError::InvalidGraphQLSdl(
            "Unterminated GraphQL string literal".to_string(),
        ))
    }

    fn take_n(&mut self, count: usize) -> Result<String> {
        if self.pos + count > self.chars.len() {
            return Err(ConversionError::InvalidGraphQLSdl(
                "Unexpected end of unicode escape".to_string(),
            ));
        }
        let value = self.chars[self.pos..self.pos + count].iter().collect();
        self.pos += count;
        Ok(value)
    }

    fn skip_ws_and_commas(&mut self) {
        while matches!(self.peek(), Some(c) if c.is_whitespace() || c == ',') {
            self.pos += 1;
        }
    }

    fn expect(&mut self, expected: char) -> Result<()> {
        match self.peek() {
            Some(actual) if actual == expected => {
                self.pos += 1;
                Ok(())
            }
            Some(actual) => Err(ConversionError::InvalidGraphQLSdl(format!(
                "Expected '{}' but found '{}'",
                expected, actual
            ))),
            None => Err(ConversionError::InvalidGraphQLSdl(format!(
                "Expected '{}' but reached end of input",
                expected
            ))),
        }
    }

    fn peek(&self) -> Option<char> {
        self.chars.get(self.pos).copied()
    }
}
