//! JSON Schema to GraphQL SDL conversion

use crate::error::{ConversionError, Result};
use crate::types::ConversionOptions;
use serde_json::Value as JsonValue;
use std::collections::HashMap;

/// Convert JSON Schema to GraphQL SDL
pub fn convert(schema: &JsonValue, options: &ConversionOptions) -> Result<String> {
    let mut output = String::new();
    let mut context = ConversionContext::with_root(options, schema);

    // Process the schema
    if let Some(obj) = schema.as_object() {
        // Check for $defs section first
        if let Some(defs) = obj.get("$defs").or_else(|| obj.get("definitions")) {
            if let Some(defs_obj) = defs.as_object() {
                for (_def_name, def_schema) in defs_obj {
                    if let Some(type_name) = def_schema
                        .get("x-graphql-type-name")
                        .and_then(|v| v.as_str())
                    {
                        let type_def =
                            convert_type_definition(def_schema, type_name, &mut context)?;
                        output.push_str(&type_def);
                    }
                }
            }
        }

        // Check for direct type definition
        if let Some(type_name) = obj.get("x-graphql-type-name").and_then(|v| v.as_str()) {
            let type_def = convert_type_definition(schema, type_name, &mut context)?;
            output.push_str(&type_def);
        } else if obj.contains_key("properties")
            && !obj.contains_key("$defs")
            && !obj.contains_key("definitions")
        {
            // Anonymous object - needs a type name (but only if not a container with $defs)
            return Err(ConversionError::missing_field(
                "x-graphql-type-name (required for object types)",
            ));
        }
    }

    if output.is_empty() {
        return Err(ConversionError::InvalidJsonSchema(
            "No GraphQL types found in schema".to_string(),
        ));
    }

    Ok(output)
}

/// Context for conversion process
struct ConversionContext<'a> {
    options: &'a ConversionOptions,
    type_names: HashMap<String, usize>,
    root_schema: Option<&'a JsonValue>,
}

impl<'a> ConversionContext<'a> {
    fn new(options: &'a ConversionOptions) -> Self {
        Self {
            options,
            type_names: HashMap::new(),
            root_schema: None,
        }
    }

    fn with_root(options: &'a ConversionOptions, root_schema: &'a JsonValue) -> Self {
        Self {
            options,
            type_names: HashMap::new(),
            root_schema: Some(root_schema),
        }
    }

    /// Resolve a $ref reference
    fn resolve_ref(&self, ref_path: &str) -> Result<Option<&JsonValue>> {
        if !ref_path.starts_with('#') {
            // External references not supported yet
            return Ok(None);
        }

        let root = match self.root_schema {
            Some(r) => r,
            None => return Ok(None),
        };

        // Parse the JSON pointer path (e.g., "#/$defs/system_metadata")
        let path = ref_path.trim_start_matches('#').trim_start_matches('/');
        let parts: Vec<&str> = path.split('/').collect();

        let mut current = root;
        for part in parts {
            if part.is_empty() {
                continue;
            }
            current = match current.get(part) {
                Some(val) => val,
                None => return Ok(None),
            };
        }

        Ok(Some(current))
    }
}

/// Convert a JSON Schema object to a GraphQL type definition
fn convert_type_definition(
    schema: &JsonValue,
    type_name: &str,
    context: &mut ConversionContext,
) -> Result<String> {
    let obj = schema.as_object().ok_or_else(|| {
        ConversionError::InvalidJsonSchema("schema must be an object".to_string())
    })?;

    let mut output = String::new();

    // Add description if present
    if context.options.include_descriptions {
        if let Some(description) = obj.get("description").and_then(|v| v.as_str()) {
            output.push_str(&format_description(description));
        }
    }

    // Collect and format directives
    let mut directives_json: Vec<JsonValue> = obj
        .get("x-graphql-directives")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    if let Some(keys) = obj
        .get("x-graphql-federation-keys")
        .and_then(|v| v.as_array())
    {
        for key in keys {
            if let Some(fields) = key.get("fields") {
                directives_json
                    .push(serde_json::json!({ "name": "key", "arguments": { "fields": fields } }));
            }
        }
    }

    output.push_str(&format_directives(&JsonValue::Array(directives_json))?);

    // Determine type kind and map to GraphQL SDL keyword
    let has_enum_keyword = obj.contains_key("enum");
    let raw_type_kind = obj
        .get("x-graphql-type-kind")
        .and_then(|v| v.as_str())
        .unwrap_or_else(|| if has_enum_keyword { "ENUM" } else { "OBJECT" });

    let type_kind = match raw_type_kind {
        "OBJECT" => "type",
        "INTERFACE" => "interface",
        "UNION" => "type",
        "ENUM" => "enum",
        "INPUT_OBJECT" => "input",
        "SCALAR" => "scalar",
        _ => "type",
    };

    // Start type definition
    output.push_str(&format!("{} {}", type_kind, type_name));

    // Add interfaces if present (use x-graphql-type-implements for correct property name)
    if let Some(interfaces) = obj
        .get("x-graphql-type-implements")
        .or_else(|| obj.get("x-graphql-implements"))
    {
        if let Some(impl_array) = interfaces.as_array() {
            let impl_names: Vec<String> = impl_array
                .iter()
                .filter_map(|v| v.as_str())
                .map(|s| s.to_string())
                .collect();
            if !impl_names.is_empty() {
                output.push_str(&format!(" implements {}", impl_names.join(" & ")));
            }
        }
    }

    // Handle enum types
    if raw_type_kind == "ENUM" {
        output.push_str(" {\n");
        if let Some(enum_vals) = obj.get("enum") {
            if let Some(values) = enum_vals.as_array() {
                for value in values {
                    if let Some(val_str) = value.as_str() {
                        // Add description for enum value if present
                        output.push_str(&format!("  {}\n", val_str));
                    }
                }
            }
        } else {
            return Err(ConversionError::InvalidType(
                "enum type must have 'enum' field with values".to_string(),
            ));
        }
        output.push_str("}\n\n");
        return Ok(output);
    }

    // Handle union types
    if raw_type_kind == "UNION" {
        if let Some(union_types) = obj.get("x-graphql-union-types") {
            if let Some(types_array) = union_types.as_array() {
                let type_names: Vec<String> = types_array
                    .iter()
                    .filter_map(|v| v.as_str())
                    .map(|s| s.to_string())
                    .collect();
                if type_names.is_empty() {
                    return Err(ConversionError::InvalidType(
                        "union type must have at least one member type".to_string(),
                    ));
                }
                output.push_str(&format!(" = {}\n\n", type_names.join(" | ")));
                return Ok(output);
            }
        } else {
            return Err(ConversionError::InvalidType(
                "union type must have 'x-graphql-union-types' field".to_string(),
            ));
        }
    }

    // Handle scalar types
    if raw_type_kind == "SCALAR" {
        output.push_str("\n\n");
        return Ok(output);
    }

    // Handle object/interface/input types with fields
    output.push_str(" {\n");

    if let Some(properties) = obj.get("properties") {
        if let Some(props_obj) = properties.as_object() {
            let required_fields = obj
                .get("required")
                .and_then(|v| v.as_array())
                .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect::<Vec<_>>())
                .unwrap_or_default();

            // Preserve field order if requested
            let mut prop_names: Vec<_> = props_obj.keys().collect();
            if !context.options.preserve_field_order {
                prop_names.sort();
            }

            for prop_name in prop_names {
                if let Some(prop_schema) = props_obj.get(prop_name) {
                    let field_def = convert_field(
                        prop_name,
                        prop_schema,
                        required_fields.contains(&prop_name.as_str()),
                        context,
                    )?;
                    output.push_str(&format!("  {}\n", field_def));
                }
            }
        }
    }

    output.push_str("}\n\n");

    Ok(output)
}

/// Convert a JSON Schema property to a GraphQL field
fn convert_field(
    field_name: &str,
    schema: &JsonValue,
    is_required: bool,
    context: &mut ConversionContext,
) -> Result<String> {
    let obj = schema.as_object().ok_or_else(|| {
        ConversionError::InvalidField(format!("field '{}' schema must be an object", field_name))
    })?;

    let mut output = String::new();

    // Add description if present
    if context.options.include_descriptions {
        if let Some(description) = obj.get("description").and_then(|v| v.as_str()) {
            output.push_str(&format_description(description));
        }
    }

    // Get GraphQL field name
    let gql_field_name = obj
        .get("x-graphql-field-name")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| snake_to_camel(field_name));

    output.push_str(&gql_field_name);

    // Add field arguments if present
    if let Some(args) = obj.get("x-graphql-arguments") {
        output.push_str(&format_field_arguments(args)?);
    }

    // Determine field type
    let field_type = infer_graphql_type(schema, is_required, context)?;
    output.push_str(&format!(": {}", field_type));

    // Collect and format directives
    let mut directives_json: Vec<JsonValue> = obj
        .get("x-graphql-directives")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    if obj
        .get("x-graphql-federation-external")
        .and_then(|v| v.as_bool())
        == Some(true)
    {
        directives_json.push(serde_json::json!({ "name": "external" }));
    }
    if let Some(fields) = obj
        .get("x-graphql-federation-requires")
        .and_then(|v| v.as_str())
    {
        directives_json
            .push(serde_json::json!({ "name": "requires", "arguments": { "fields": fields } }));
    }
    if let Some(fields) = obj
        .get("x-graphql-federation-provides")
        .and_then(|v| v.as_str())
    {
        directives_json
            .push(serde_json::json!({ "name": "provides", "arguments": { "fields": fields } }));
    }
    if obj
        .get("x-graphql-federation-shareable")
        .and_then(|v| v.as_bool())
        == Some(true)
    {
        directives_json.push(serde_json::json!({ "name": "shareable" }));
    }
    if obj
        .get("x-graphql-federation-authenticated")
        .and_then(|v| v.as_bool())
        == Some(true)
    {
        directives_json.push(serde_json::json!({ "name": "authenticated" }));
    }
    if let Some(scopes) = obj.get("x-graphql-federation-requires-scopes") {
        directives_json.push(
            serde_json::json!({ "name": "requiresScopes", "arguments": { "scopes": scopes } }),
        );
    }
    if obj
        .get("x-graphql-field-deprecated")
        .and_then(|v| v.as_bool())
        == Some(true)
    {
        let mut directive = serde_json::json!({ "name": "deprecated" });
        if let Some(reason) = obj.get("x-graphql-field-deprecation-reason") {
            let args = serde_json::json!({ "reason": reason });
            directive
                .as_object_mut()
                .unwrap()
                .insert("arguments".to_string(), args);
        }
        directives_json.push(directive);
    }

    output.push_str(&format_directives(&JsonValue::Array(directives_json))?);

    Ok(output)
}

/// Infer GraphQL type from JSON Schema
fn infer_graphql_type(schema: &JsonValue, is_required: bool) -> Result<String> {
    let obj = schema
        .as_object()
        .ok_or_else(|| ConversionError::InvalidType("schema must be an object".to_string()))?;

    // Check for $ref first
    if let Some(ref_path) = obj.get("$ref").and_then(|v| v.as_str()) {
        // Extract type name from $ref path
        // e.g., "#/$defs/system_metadata" -> "SystemMetadata"
        if let Some(type_name) = extract_type_name_from_ref(ref_path) {
            return Ok(if is_required {
                format!("{}!", type_name)
            } else {
                type_name
            });
        }
    }

    // Check for explicit GraphQL type override
    if let Some(gql_type) = obj.get("x-graphql-type").and_then(|v| v.as_str()) {
        return Ok(gql_type.to_string());
    }

    // Try to get the type field, but make it optional if we have x-graphql-type-name
    let schema_type = match obj.get("type").and_then(|v| v.as_str()) {
        Some(t) => t,
        None => {
            // If no type field, check if this is a named type
            if let Some(type_name) = obj.get("x-graphql-type-name").and_then(|v| v.as_str()) {
                return Ok(if is_required {
                    format!("{}!", type_name)
                } else {
                    type_name.to_string()
                });
            }
            return Err(ConversionError::InvalidType(
                "missing 'type' field (required unless $ref or x-graphql-type-name is present)"
                    .to_string(),
            ));
        }
    };

    let gql_type = match schema_type {
        "string" => {
            // Check for format hints
            if let Some(format) = obj.get("format").and_then(|v| v.as_str()) {
                match format {
                    "date-time" => "DateTime",
                    "date" => "Date",
                    "uri" => "URL",
                    _ => "String",
                }
            } else {
                "String"
            }
        }
        "integer" => "Int",
        "number" => "Float",
        "boolean" => "Boolean",
        "array" => {
            // Handle array types
            if let Some(items) = obj.get("items") {
                let item_type = infer_graphql_type(items, false)?;
                return Ok(format!(
                    "[{}]{}",
                    item_type,
                    if is_required { "!" } else { "" }
                ));
            } else {
                return Err(ConversionError::InvalidType(
                    "array type must have 'items'".to_string(),
                ));
            }
        }
        "object" => {
            // Object types should have x-graphql-type-name
            if let Some(type_name) = obj.get("x-graphql-type-name").and_then(|v| v.as_str()) {
                type_name
            } else {
                return Err(ConversionError::InvalidType(
                    "object type must have 'x-graphql-type-name'".to_string(),
                ));
            }
        }
        _ => {
            return Err(ConversionError::InvalidType(format!(
                "unsupported JSON Schema type: {}",
                schema_type
            )))
        }
    };

    // Add non-null modifier if required
    if is_required {
        Ok(format!("{}!", gql_type))
    } else {
        Ok(gql_type.to_string())
    }
}

/// Format field arguments
fn format_field_arguments(args: &JsonValue) -> Result<String> {
    // Handle both array and object formats
    let mut output = String::from("(");
    let mut first = true;

    if let Some(args_array) = args.as_array() {
        // Array format: [{"name": "id", "type": "ID!"}]
        for arg in args_array {
            let arg_obj = arg.as_object().ok_or_else(|| {
                ConversionError::InvalidField("argument must be an object".to_string())
            })?;

            if !first {
                output.push_str(", ");
            }
            first = false;

            let arg_name = arg_obj
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or_else(|| {
                    ConversionError::InvalidField("argument must have a name".to_string())
                })?;

            output.push_str(arg_name);
            output.push_str(": ");

            // Get argument type
            if let Some(arg_type) = arg_obj.get("type").and_then(|v| v.as_str()) {
                output.push_str(arg_type);
            } else if let Some(arg_type) = arg_obj.get("x-graphql-type").and_then(|v| v.as_str()) {
                output.push_str(arg_type);
            } else {
                output.push_str("String"); // Default type
            }

            // Add default value if present
            if let Some(default) = arg_obj.get("default") {
                output.push_str(" = ");
                output.push_str(&format_value(default));
            }
        }
    } else if let Some(args_obj) = args.as_object() {
        // Object format: {"id": {"x-graphql-type": "ID!"}}
        if args_obj.is_empty() {
            return Ok(String::new());
        }

        for (arg_name, arg_schema) in args_obj {
            if !first {
                output.push_str(", ");
            }
            first = false;

            output.push_str(arg_name);
            output.push_str(": ");

            // Get argument type
            if let Some(arg_type) = arg_schema.get("x-graphql-type").and_then(|v| v.as_str()) {
                output.push_str(arg_type);
            } else if let Some(arg_type) = arg_schema.get("type").and_then(|v| v.as_str()) {
                output.push_str(arg_type);
            } else {
                output.push_str("String"); // Default type
            }

            // Add default value if present
            if let Some(default) = arg_schema.get("default") {
                output.push_str(" = ");
                output.push_str(&format_value(default));
            }
        }
    } else {
        return Err(ConversionError::InvalidField(
            "x-graphql-arguments must be an array or object".to_string(),
        ));
    }

    if first {
        // No arguments were added
        return Ok(String::new());
    }

    output.push(')');
    Ok(output)
}

/// Format a JSON value for GraphQL
fn format_value(value: &JsonValue) -> String {
    match value {
        JsonValue::String(s) => format!("\"{}\"", s.replace("\"", "\\\"")),
        JsonValue::Number(n) => n.to_string(),
        JsonValue::Bool(b) => b.to_string(),
        JsonValue::Null => "null".to_string(),
        _ => "null".to_string(),
    }
}

/// Format directives
fn format_directives(directives: &JsonValue) -> Result<String> {
    let dir_array = directives.as_array().ok_or_else(|| {
        ConversionError::InvalidDirective("x-graphql-directives must be an array".to_string())
    })?;

    let mut output = String::new();

    for directive in dir_array {
        let dir_obj = directive.as_object().ok_or_else(|| {
            ConversionError::InvalidDirective("directive must be an object".to_string())
        })?;

        let dir_name = dir_obj
            .get("name")
            .and_then(|v| v.as_str())
            .ok_or_else(|| {
                ConversionError::InvalidDirective("directive must have a name".to_string())
            })?;

        output.push_str(&format!("@{}", dir_name));

        // Add directive arguments if present
        if let Some(args) = dir_obj.get("arguments") {
            if let Some(args_obj) = args.as_object() {
                if !args_obj.is_empty() {
                    output.push('(');
                    let mut first = true;
                    for (key, value) in args_obj {
                        if !first {
                            output.push_str(", ");
                        }
                        first = false;
                        output.push_str(&format!("{}: {}", key, format_value(value)));
                    }
                    output.push(')');
                }
            }
        }

        output.push(' ');
    }

    Ok(output.trim_end().to_string())
}

/// Format a description as a GraphQL comment or doc string
fn format_description(description: &str) -> String {
    if description.contains('\n') {
        // Multi-line description
        format!("\"\"\"\n{}\n\"\"\"\n", description)
    } else {
        // Single-line description
        format!("\"{}\"\n", description.replace("\"", "\\\""))
    }
}

/// Convert snake_case to camelCase
fn snake_to_camel(snake: &str) -> String {
    let mut result = String::new();
    let mut capitalize_next = false;

    for c in snake.chars() {
        if c == '_' {
            capitalize_next = true;
        } else if capitalize_next {
            result.push(c.to_ascii_uppercase());
            capitalize_next = false;
        } else {
            result.push(c);
        }
    }

    result
}

/// Extract type name from a $ref path
/// e.g., "#/$defs/system_metadata" -> "SystemMetadata"
fn extract_type_name_from_ref(ref_path: &str) -> Option<String> {
    // Extract the last segment from the ref path
    let path = ref_path.trim_start_matches('#').trim_start_matches('/');
    let segments: Vec<&str> = path.split('/').collect();
    let last_segment = segments.last()?;

    // Convert snake_case to PascalCase
    Some(snake_to_pascal(last_segment))
}

/// Convert snake_case to PascalCase
fn snake_to_pascal(snake: &str) -> String {
    let mut result = String::new();
    let mut capitalize_next = true;

    for c in snake.chars() {
        if c == '_' {
            capitalize_next = true;
        } else if capitalize_next {
            result.push(c.to_ascii_uppercase());
            capitalize_next = false;
        } else {
            result.push(c);
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_snake_to_camel() {
        assert_eq!(snake_to_camel("user_id"), "userId");
        assert_eq!(snake_to_camel("first_name"), "firstName");
        assert_eq!(snake_to_camel("simple"), "simple");
    }

    #[test]
    fn test_infer_graphql_type() {
        let schema = json!({"type": "string"});
        assert_eq!(infer_graphql_type(&schema, false).unwrap(), "String");
        assert_eq!(infer_graphql_type(&schema, true).unwrap(), "String!");

        let int_schema = json!({"type": "integer"});
        assert_eq!(infer_graphql_type(&int_schema, false).unwrap(), "Int");
    }

    #[test]
    fn test_convert_simple_type() {
        let options = ConversionOptions::default();
        let schema = json!({
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
            },
            "required": ["id"]
        });

        let result = convert(&schema, &options);
        assert!(result.is_ok());
        let graphql = result.unwrap();
        assert!(graphql.contains("type User"));
        assert!(graphql.contains("id: ID!"));
        assert!(graphql.contains("name: String"));
    }

    #[test]
    fn test_convert_with_directives() {
        let options = ConversionOptions::default();
        let schema = json!({
            "type": "object",
            "x-graphql-type-name": "User",
            "x-graphql-directives": [
                {
                    "name": "key",
                    "arguments": {
                        "fields": "\"id\""
                    }
                }
            ],
            "properties": {
                "id": {
                    "type": "string",
                    "x-graphql-type": "ID!"
                }
            }
        });

        let result = convert(&schema, &options);
        assert!(result.is_ok());
        let graphql = result.unwrap();
        assert!(graphql.contains("@key"));
    }

    #[test]
    fn test_format_value() {
        assert_eq!(format_value(&json!("test")), "\"test\"");
        assert_eq!(format_value(&json!(42)), "42");
        assert_eq!(format_value(&json!(true)), "true");
        assert_eq!(format_value(&json!(null)), "null");
    }

    #[test]
    fn test_convert_with_defs() {
        let options = ConversionOptions::default();
        let schema = json!({
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "$defs": {
                "User": {
                    "type": "object",
                    "x-graphql-type-name": "User",
                    "properties": {
                        "id": {
                            "type": "string",
                            "x-graphql-type": "ID!"
                        }
                    }
                }
            }
        });

        let result = convert(&schema, &options);
        assert!(result.is_ok());
        let graphql = result.unwrap();
        assert!(graphql.contains("type User"));
        assert!(graphql.contains("id: ID!"));
    }

    #[test]
    fn test_convert_enum() {
        let options = ConversionOptions::default();
        let schema = json!({
            "type": "string",
            "enum": ["ACTIVE", "INACTIVE"],
            "x-graphql-type-name": "Status",
            "x-graphql-type-kind": "enum"
        });

        let result = convert(&schema, &options);
        assert!(result.is_ok());
        let graphql = result.unwrap();
        assert!(graphql.contains("enum Status"));
        assert!(graphql.contains("ACTIVE"));
        assert!(graphql.contains("INACTIVE"));
    }

    #[test]
    fn test_convert_union() {
        let options = ConversionOptions::default();
        let schema = json!({
            "x-graphql-type-name": "SearchResult",
            "x-graphql-type-kind": "union",
            "x-graphql-union-types": ["User", "Post"]
        });

        let result = convert(&schema, &options);
        assert!(result.is_ok());
        let graphql = result.unwrap();
        assert!(graphql.contains("union SearchResult"));
        assert!(graphql.contains("User | Post"));
    }

    #[test]
    fn test_convert_interface() {
        let options = ConversionOptions::default();
        let schema = json!({
            "type": "object",
            "x-graphql-type-name": "Node",
            "x-graphql-type-kind": "interface",
            "properties": {
                "id": {
                    "type": "string",
                    "x-graphql-type": "ID!"
                }
            }
        });

        let result = convert(&schema, &options);
        assert!(result.is_ok());
        let graphql = result.unwrap();
        assert!(graphql.contains("interface Node"));
        assert!(graphql.contains("id: ID!"));
    }
}
