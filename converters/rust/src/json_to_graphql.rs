//! JSON Schema to GraphQL SDL conversion

use crate::error::{ConversionError, Result};
use crate::types::{ConversionOptions, NamingConvention};
use serde_json::Value as JsonValue;
use std::collections::HashMap;

/// Convert JSON Schema to GraphQL SDL
pub fn convert(schema: &JsonValue, options: &ConversionOptions) -> Result<String> {
    let mut output = String::new();
    let mut context = ConversionContext::with_root(options, schema);

    // Process the schema
    if let Some(obj) = schema.as_object() {
        // Check for $defs/definitions section
        if let Some(defs) = obj.get("$defs").or_else(|| obj.get("definitions")) {
            if let Some(defs_obj) = defs.as_object() {
                for (def_key, def_schema) in defs_obj {
                    // Determine type name: x-graphql-type-name > x-graphql-type.name > title > def_key
                    let raw_type_name = def_schema
                        .get("x-graphql-type-name")
                        .and_then(|v| v.as_str())
                        .or_else(|| {
                            def_schema.get("x-graphql-type").and_then(|v| {
                                v.as_str()
                                    .or_else(|| v.get("name").and_then(|n| n.as_str()))
                            })
                        })
                        .or_else(|| def_schema.get("title").and_then(|v| v.as_str()))
                        .unwrap_or(def_key);

                    let type_name = sanitize_type_name(raw_type_name, options.naming_convention);

                    if options.exclude_types.contains(&type_name)
                        || is_excluded(&type_name, &options.exclude_patterns)
                    {
                        continue;
                    }

                    let type_def = convert_type_definition(def_schema, &type_name, &mut context)?;
                    output.push_str(&type_def);
                }
            }
        }

        // Check for root type definition
        let root_type_name = obj
            .get("x-graphql-type-name")
            .and_then(|v| v.as_str())
            .or_else(|| obj.get("title").and_then(|v| v.as_str()));

        if let Some(name) = root_type_name {
            let sanitized_name = sanitize_type_name(name, options.naming_convention);

            if !options.exclude_types.contains(&sanitized_name)
                && !is_excluded(&sanitized_name, &options.exclude_patterns)
            {
                let type_def = convert_type_definition(schema, &sanitized_name, &mut context)?;
                output.push_str(&type_def);
            }
        } else if obj.contains_key("properties")
            && !obj.contains_key("$defs")
            && !obj.contains_key("definitions")
        {
            return Err(ConversionError::missing_field(
                "title or x-graphql-type-name (required for root object type)",
            ));
        }
    }

    if output.is_empty() {
        return Err(ConversionError::InvalidJsonSchema(
            "No GraphQL types found in schema. Ensure types have 'title' or 'x-graphql-type-name' or are in '$defs'.".to_string(),
        ));
    }

    Ok(output)
}

struct ConversionContext<'a> {
    options: &'a ConversionOptions,
    type_names: HashMap<String, String>,
    root_schema: Option<&'a JsonValue>,
}

impl<'a> ConversionContext<'a> {
    fn with_root(options: &'a ConversionOptions, root_schema: &'a JsonValue) -> Self {
        Self {
            options,
            type_names: HashMap::new(),
            root_schema: Some(root_schema),
        }
    }

    fn resolve_ref_type_name(&mut self, ref_path: &str) -> Option<String> {
        if let Some(name) = self.type_names.get(ref_path) {
            return Some(name.clone());
        }

        let schema = self.resolve_ref_schema(ref_path)?;
        let type_name = schema
            .as_object()
            .and_then(|obj| {
                obj.get("x-graphql-type-name")
                    .and_then(|v| v.as_str())
                    .or_else(|| {
                        obj.get("x-graphql-type").and_then(|v| {
                            v.as_str()
                                .or_else(|| v.get("name").and_then(|n| n.as_str()))
                        })
                    })
                    .or_else(|| obj.get("title").and_then(|v| v.as_str()))
                    .or_else(|| {
                        obj.get("x-graphql")
                            .and_then(|x| x.as_object())
                            .and_then(|x| x.get("typeName"))
                            .and_then(|v| v.as_str())
                    })
            })
            .map(|value| value.to_string())
            .or_else(|| extract_type_name_from_ref(ref_path, self.options.naming_convention))?;

        self.type_names
            .insert(ref_path.to_string(), type_name.clone());
        Some(type_name)
    }

    fn resolve_ref_schema(&self, ref_path: &str) -> Option<&'a JsonValue> {
        let root = self.root_schema?;
        let pointer = Self::normalize_ref_path(ref_path)?;
        if pointer.is_empty() {
            Some(root)
        } else {
            root.pointer(&pointer)
        }
    }

    fn normalize_ref_path(ref_path: &str) -> Option<String> {
        let trimmed = ref_path.trim();
        if trimmed.is_empty() {
            return Some(String::new());
        }

        if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
            return None;
        }

        if let Some(stripped) = trimmed.strip_prefix('#') {
            if stripped.is_empty() {
                Some(String::new())
            } else if stripped.starts_with('/') {
                Some(stripped.to_string())
            } else {
                Some(format!("/{}", stripped))
            }
        } else if trimmed.starts_with('/') {
            Some(trimmed.to_string())
        } else {
            Some(format!("/{}", trimmed))
        }
    }
}

fn convert_type_definition(
    schema: &JsonValue,
    type_name: &str,
    context: &mut ConversionContext,
) -> Result<String> {
    let obj = schema.as_object().ok_or_else(|| {
        ConversionError::InvalidJsonSchema("schema must be an object".to_string())
    })?;

    let mut output = String::new();

    // Description
    if context.options.include_descriptions {
        if let Some(description) = obj.get("description").and_then(|v| v.as_str()) {
            output.push_str(&format_description(description));
        }
    }

    // Determine Type Kind
    let x_graphql = obj.get("x-graphql").and_then(|v| v.as_object());

    let explicit_kind = x_graphql
        .and_then(|x| x.get("type").and_then(|v| v.as_str()))
        .or_else(|| {
            obj.get("x-graphql-type").and_then(|v| {
                v.as_str()
                    .or_else(|| v.get("kind").and_then(|n| n.as_str()))
            })
        })
        .or_else(|| obj.get("x-graphql-type-kind").and_then(|v| v.as_str()));

    // Check for "enum", "union", "interface" keywords
    let kind_hint = explicit_kind.map(|s| s.to_lowercase()).unwrap_or_default();

    let kind = if kind_hint == "enum" || obj.contains_key("enum") {
        "enum"
    } else if kind_hint == "union" || obj.contains_key("oneOf") {
        "union"
    } else if kind_hint == "interface" {
        "interface"
    } else if kind_hint == "input" || kind_hint == "input_object" {
        "input"
    } else if kind_hint == "scalar" {
        "scalar"
    } else {
        "type"
    };

    // Collect Directives
    let mut directives_json: Vec<JsonValue> = x_graphql
        .and_then(|x| x.get("directives"))
        .or_else(|| obj.get("x-graphql-directives"))
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    // Federation support (Legacy & New)
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

    // Comprehensive Federation Support
    let fed = x_graphql.and_then(|x| x.get("federation").and_then(|v| v.as_object()));

    if let Some(fed) = fed {
        // @key
        if let Some(keys) = fed.get("keys").and_then(|v| v.as_array()) {
            for key_val in keys {
                if let Some(fields) = key_val.as_str() {
                    directives_json.push(
                        serde_json::json!({ "name": "key", "arguments": { "fields": fields } }),
                    );
                } else if let Some(key_obj) = key_val.as_object() {
                    if let Some(fields) = key_obj.get("fields") {
                        let mut args = serde_json::json!({ "fields": fields });
                        if let Some(resolvable) = key_obj.get("resolvable") {
                            args.as_object_mut()
                                .unwrap()
                                .insert("resolvable".to_string(), resolvable.clone());
                        }
                        directives_json
                            .push(serde_json::json!({ "name": "key", "arguments": args }));
                    }
                }
            }
        }
    }

    // @shareable
    if obj
        .get("x-graphql-federation-shareable")
        .and_then(|v| v.as_bool())
        == Some(true)
        || fed.and_then(|f| f.get("shareable").and_then(|v| v.as_bool())) == Some(true)
    {
        directives_json.push(serde_json::json!({ "name": "shareable" }));
    }

    // @inaccessible
    if obj
        .get("x-graphql-federation-inaccessible")
        .and_then(|v| v.as_bool())
        == Some(true)
        || fed.and_then(|f| f.get("inaccessible").and_then(|v| v.as_bool())) == Some(true)
    {
        directives_json.push(serde_json::json!({ "name": "inaccessible" }));
    }

    // @extends
    if fed.and_then(|f| f.get("extends").and_then(|v| v.as_bool())) == Some(true) {
        directives_json.push(serde_json::json!({ "name": "extends" }));
    }

    // @interfaceObject
    if obj
        .get("x-graphql-federation-interface-object")
        .and_then(|v| v.as_bool())
        == Some(true)
        || fed.and_then(|f| f.get("interfaceObject").and_then(|v| v.as_bool())) == Some(true)
    {
        directives_json.push(serde_json::json!({ "name": "interfaceObject" }));
    }

    // @authenticated
    if obj
        .get("x-graphql-federation-authenticated")
        .and_then(|v| v.as_bool())
        == Some(true)
        || fed.and_then(|f| f.get("authenticated").and_then(|v| v.as_bool())) == Some(true)
    {
        directives_json.push(serde_json::json!({ "name": "authenticated" }));
    }

    // @requiresScopes
    if let Some(scopes) = obj
        .get("x-graphql-federation-requires-scopes")
        .and_then(|v| v.as_array())
        .or_else(|| fed.and_then(|f| f.get("requiresScopes").and_then(|v| v.as_array())))
    {
        directives_json.push(
            serde_json::json!({ "name": "requiresScopes", "arguments": { "scopes": scopes } }),
        );
    }

    // @composeDirective
    if let Some(cd) = fed.and_then(|f| f.get("composeDirective").and_then(|v| v.as_str())) {
        directives_json
            .push(serde_json::json!({ "name": "composeDirective", "arguments": { "name": cd } }));
    }

    // @tag
    if let Some(tags) = obj
        .get("x-graphql-federation-tags")
        .and_then(|v| v.as_array())
    {
        for tag in tags {
            if let Some(name) = tag.as_str() {
                directives_json
                    .push(serde_json::json!({ "name": "tag", "arguments": { "name": name } }));
            }
        }
    }

    if let Some(fed) = fed {
        if let Some(tags) = fed.get("tags").and_then(|v| v.as_array()) {
            for tag in tags {
                if let Some(tag_obj) = tag.as_object() {
                    if let Some(name) = tag_obj.get("name") {
                        directives_json.push(
                            serde_json::json!({ "name": "tag", "arguments": { "name": name } }),
                        );
                    }
                }
            }
        }
    }

    let directives_str = format_directives(&JsonValue::Array(directives_json))?;

    // Generate SDL based on kind
    match kind {
        "enum" => {
            output.push_str(&format!("enum {}{} {{\n", type_name, directives_str));
            if let Some(enum_vals) = obj.get("enum").and_then(|v| v.as_array()) {
                for value in enum_vals {
                    if let Some(val_str) = value.as_str() {
                        output.push_str(&format!("  {}\n", val_str));
                    }
                }
            } else {
                return Err(ConversionError::InvalidType(
                    "enum type must have 'enum' field".to_string(),
                ));
            }
            output.push_str("}\n\n");
        }
        "union" => {
            output.push_str(&format!("union {}{} = ", type_name, directives_str));
            let mut members = Vec::new();

            // Try explicit list first
            if let Some(types) = obj.get("x-graphql-union-types").and_then(|v| v.as_array()) {
                for t in types {
                    if let Some(s) = t.as_str() {
                        members.push(s.to_string());
                    }
                }
            }
            // Try oneOf
            else if let Some(one_of) = obj.get("oneOf").and_then(|v| v.as_array()) {
                for item in one_of {
                    // Extract ref
                    if let Some(ref_path) = item.get("$ref").and_then(|v| v.as_str()) {
                        if let Some(name) = context.resolve_ref_type_name(ref_path) {
                            members.push(name);
                        } else if let Some(name) =
                            extract_type_name_from_ref(ref_path, context.options.naming_convention)
                        {
                            members.push(name);
                        }
                    } else if let Some(title) = item.get("title").and_then(|v| v.as_str()) {
                        members.push(title.to_string());
                    }
                }
            }

            if members.is_empty() {
                return Err(ConversionError::InvalidType(
                    "union type must have members".to_string(),
                ));
            }
            output.push_str(&members.join(" | "));
            output.push_str("\n\n");
        }
        "scalar" => {
            output.push_str(&format!("scalar {}{}\n\n", type_name, directives_str));
        }
        _ => {
            // Object, Interface, Input
            output.push_str(&format!("{} {}", kind, type_name));

            // Interfaces (implements)
            let mut implements = Vec::new();
            // Legacy
            if let Some(impl_array) = obj
                .get("x-graphql-implements")
                .or_else(|| obj.get("x-graphql-type-implements"))
                .or_else(|| obj.get("x-graphql-type").and_then(|v| v.get("implements")))
                .and_then(|v| v.as_array())
            {
                for v in impl_array {
                    if let Some(s) = v.as_str() {
                        implements.push(s.to_string());
                    }
                }
            }
            // allOf inference
            if let Some(all_of) = obj.get("allOf").and_then(|v| v.as_array()) {
                for item in all_of {
                    if let Some(ref_path) = item.get("$ref").and_then(|v| v.as_str()) {
                        if let Some(name) = context.resolve_ref_type_name(ref_path) {
                            // Assuming all refs in allOf are interfaces if this is an object type
                            implements.push(name);
                        } else if let Some(name) =
                            extract_type_name_from_ref(ref_path, context.options.naming_convention)
                        {
                            implements.push(name);
                        }
                    }
                }
            }

            if !implements.is_empty() {
                output.push_str(&format!(" implements {}", implements.join(" & ")));
            }

            output.push_str(&directives_str);
            output.push_str(" {\n");

            // Properties
            if let Some(properties) = obj.get("properties").and_then(|v| v.as_object()) {
                let required_fields = obj
                    .get("required")
                    .and_then(|v| v.as_array())
                    .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect::<Vec<_>>())
                    .unwrap_or_default();

                let mut prop_names: Vec<_> = properties.keys().collect();
                if !context.options.preserve_field_order {
                    prop_names.sort();
                }

                for prop_name in prop_names {
                    if let Some(prop_schema) = properties.get(prop_name) {
                        let field_def = convert_field(
                            prop_name,
                            prop_schema,
                            required_fields.contains(&prop_name.as_str()),
                            context,
                        )?;
                        if !field_def.is_empty() {
                            output.push_str(&format!("  {}\n", field_def));
                        }
                    }
                }
            }

            output.push_str("}\n\n");
        }
    }

    Ok(output)
}

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

    // Description
    if context.options.include_descriptions {
        if let Some(description) = obj.get("description").and_then(|v| v.as_str()) {
            output.push_str(&format_description(description));
        }
    }

    // Check x-graphql object
    let x_graphql = obj.get("x-graphql").and_then(|v| v.as_object());

    // Field Name
    let gql_field_name = x_graphql
        .and_then(|x| x.get("fieldName"))
        .or_else(|| obj.get("x-graphql-field-name"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| sanitize_field_name(field_name, context.options.naming_convention));

    if is_excluded(&gql_field_name, &context.options.exclude_patterns) {
        return Ok(String::new());
    }

    output.push_str(&gql_field_name);

    // Arguments
    if let Some(args) = x_graphql
        .and_then(|x| x.get("args").or_else(|| x.get("arguments")))
        .or_else(|| obj.get("x-graphql-args"))
        .or_else(|| obj.get("x-graphql-arguments"))
    {
        output.push_str(&format_field_arguments(args, context)?);
    }

    // Type
    let mut field_type = infer_graphql_type(schema, is_required, context)?;

    if context.options.infer_ids
        && (field_name == "id" || field_name == "_id")
        && (field_type == "String" || field_type == "String!")
    {
        field_type = if is_required {
            "ID!".to_string()
        } else {
            "ID".to_string()
        };
    }

    output.push_str(&format!(": {}", field_type));

    // Directives
    let mut directives_json: Vec<JsonValue> = x_graphql
        .and_then(|x| x.get("directives"))
        .or_else(|| obj.get("x-graphql-directives"))
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    // Deprecation
    let is_deprecated = obj
        .get("deprecated")
        .and_then(|v| v.as_bool())
        .or_else(|| {
            obj.get("x-graphql-field-deprecated")
                .and_then(|v| v.as_bool())
        })
        .unwrap_or(false);

    if is_deprecated {
        let mut directive = serde_json::json!({ "name": "deprecated" });

        let reason = x_graphql
            .and_then(|x| x.get("deprecation"))
            .and_then(|d| {
                if let Some(s) = d.as_str() {
                    Some(s)
                } else {
                    d.get("reason").and_then(|v| v.as_str())
                }
            })
            .or_else(|| obj.get("x-graphql-deprecation").and_then(|v| v.as_str()))
            .or_else(|| {
                obj.get("x-graphql-field-deprecation-reason")
                    .and_then(|v| v.as_str())
            });

        if let Some(reason) = reason {
            let args = serde_json::json!({ "reason": reason });
            directive
                .as_object_mut()
                .unwrap()
                .insert("arguments".to_string(), args);
        }
        directives_json.push(directive);
    }

    // Federation directives
    let fed = x_graphql.and_then(|x| x.get("federation").and_then(|v| v.as_object()));

    if obj
        .get("x-graphql-federation-external")
        .and_then(|v| v.as_bool())
        == Some(true)
        || fed.and_then(|f| f.get("external").and_then(|v| v.as_bool())) == Some(true)
    {
        directives_json.push(serde_json::json!({ "name": "external" }));
    }

    if obj
        .get("x-graphql-federation-authenticated")
        .and_then(|v| v.as_bool())
        == Some(true)
        || fed.and_then(|f| f.get("authenticated").and_then(|v| v.as_bool())) == Some(true)
    {
        directives_json.push(serde_json::json!({ "name": "authenticated" }));
    }

    if obj
        .get("x-graphql-federation-inaccessible")
        .and_then(|v| v.as_bool())
        == Some(true)
        || fed.and_then(|f| f.get("inaccessible").and_then(|v| v.as_bool())) == Some(true)
    {
        directives_json.push(serde_json::json!({ "name": "inaccessible" }));
    }

    if let Some(fields) = obj
        .get("x-graphql-federation-requires")
        .and_then(|v| v.as_str())
        .or_else(|| fed.and_then(|f| f.get("requires").and_then(|v| v.as_str())))
    {
        directives_json
            .push(serde_json::json!({ "name": "requires", "arguments": { "fields": fields } }));
    }

    if let Some(fields) = obj
        .get("x-graphql-federation-provides")
        .and_then(|v| v.as_str())
        .or_else(|| fed.and_then(|f| f.get("provides").and_then(|v| v.as_str())))
    {
        directives_json
            .push(serde_json::json!({ "name": "provides", "arguments": { "fields": fields } }));
    }

    if let Some(override_from) = obj
        .get("x-graphql-federation-override-from")
        .and_then(|v| v.as_str())
        .or_else(|| {
            fed.and_then(|f| {
                f.get("override")
                    .and_then(|o| o.get("from").and_then(|v| v.as_str()))
            })
        })
    {
        directives_json.push(
            serde_json::json!({ "name": "override", "arguments": { "from": override_from } }),
        );
    }

    if obj
        .get("x-graphql-federation-shareable")
        .and_then(|v| v.as_bool())
        == Some(true)
        || fed.and_then(|f| f.get("shareable").and_then(|v| v.as_bool())) == Some(true)
    {
        directives_json.push(serde_json::json!({ "name": "shareable" }));
    }

    output.push_str(&format_directives(&JsonValue::Array(directives_json))?);

    Ok(output)
}

fn infer_graphql_type(
    schema: &JsonValue,
    is_required: bool,
    context: &mut ConversionContext,
) -> Result<String> {
    let obj = schema
        .as_object()
        .ok_or_else(|| ConversionError::InvalidType("schema must be an object".to_string()))?;

    let x_graphql = obj.get("x-graphql").and_then(|v| v.as_object());

    // Check for nullable override
    let explicit_nullable = x_graphql.and_then(|x| x.get("nullable").and_then(|v| v.as_bool()));
    let should_be_required = if let Some(nullable) = explicit_nullable {
        !nullable
    } else {
        is_required
    };

    // Helper to ensure we don't double-bang (e.g. "ID!!" -> "ID!")
    let finalize = move |t: String| {
        if should_be_required && !t.ends_with('!') {
            format!("{}!", t)
        } else {
            t
        }
    };

    // 1. Explicit override
    let explicit_type = x_graphql
        .and_then(|x| x.get("type").and_then(|v| v.as_str()))
        .or_else(|| {
            obj.get("x-graphql-type").and_then(|v| {
                v.as_str()
                    .or_else(|| v.get("name").and_then(|n| n.as_str()))
            })
        });

    if let Some(gql_type) = explicit_type {
        return Ok(finalize(gql_type.to_string()));
    }

    // 2. Reference
    if let Some(ref_path) = obj.get("$ref").and_then(|v| v.as_str()) {
        if let Some(type_name) = context.resolve_ref_type_name(ref_path) {
            return Ok(finalize(type_name));
        } else if let Some(type_name) =
            extract_type_name_from_ref(ref_path, context.options.naming_convention)
        {
            return Ok(finalize(type_name));
        }
    }

    // 3. Format Hints
    if let Some(format) = obj.get("format").and_then(|v| v.as_str()) {
        let mapped = match format {
            "date-time" => Some("DateTime"),
            "date" => Some("Date"),
            "time" => Some("Time"),
            "email" => Some("Email"),
            "uri" => Some("URL"),
            "uuid" => Some("ID"),
            _ => None,
        };
        if let Some(t) = mapped {
            return Ok(finalize(t.to_string()));
        }
    }

    // 4. Type Mapping
    let schema_type = obj.get("type").and_then(|v| v.as_str());

    let gql_type = match schema_type {
        Some("string") => "String".to_string(),
        Some("integer") => "Int".to_string(),
        Some("number") => "Float".to_string(),
        Some("boolean") => "Boolean".to_string(),
        Some("array") => {
            if let Some(items) = obj.get("items") {
                // Check for nullableItems override
                let items_nullable =
                    x_graphql.and_then(|x| x.get("nullableItems").and_then(|v| v.as_bool()));

                let item_is_required = if let Some(nullable) = items_nullable {
                    !nullable
                } else {
                    false
                };

                let item_type = infer_graphql_type(items, item_is_required, context)?;
                format!("[{}]", item_type)
            } else {
                "JSON".to_string()
            }
        }
        Some("object") => {
            if let Some(name) = x_graphql
                .and_then(|x| x.get("typeName"))
                .or_else(|| obj.get("x-graphql-type-name"))
                .and_then(|v| v.as_str())
            {
                name.to_string()
            } else {
                "JSON".to_string()
            }
        }
        _ => "JSON".to_string(),
    };

    Ok(finalize(gql_type))
}

fn format_field_arguments(args: &JsonValue, context: &mut ConversionContext) -> Result<String> {
    let mut output = String::new();
    output.push('(');

    let mut first = true;

    if let Some(args_obj) = args.as_object() {
        if args_obj.is_empty() {
            return Ok(String::new());
        }
        // Object format: {"limit": { "type": "integer", "default": 10 }}
        for (arg_name, arg_schema) in args_obj {
            if !first {
                output.push_str(", ");
            }
            first = false;

            output.push_str(arg_name);
            output.push_str(": ");

            let arg_type = infer_graphql_type(arg_schema, false, context)?;
            output.push_str(&arg_type);

            if let Some(default) = arg_schema.get("default") {
                output.push_str(" = ");
                output.push_str(&format_value(default));
            }
        }
    } else if let Some(args_array) = args.as_array() {
        // Legacy array format
        for arg in args_array {
            if let Some(arg_obj) = arg.as_object() {
                let name = arg_obj
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("arg");
                if !first {
                    output.push_str(", ");
                }
                first = false;
                output.push_str(name);
                output.push_str(": ");

                let type_str = arg_obj
                    .get("type")
                    .and_then(|v| v.as_str())
                    .unwrap_or("String");
                output.push_str(type_str);

                if let Some(default) = arg_obj.get("default") {
                    output.push_str(" = ");
                    output.push_str(&format_value(default));
                }
            }
        }
    }

    if first {
        return Ok(String::new());
    }

    output.push(')');
    Ok(output)
}

fn format_value(value: &JsonValue) -> String {
    match value {
        JsonValue::String(s) => format!("\"{}\"", s.replace("\"", "\\\"")),
        JsonValue::Number(n) => n.to_string(),
        JsonValue::Bool(b) => b.to_string(),
        JsonValue::Null => "null".to_string(),
        _ => "null".to_string(),
    }
}

fn format_directives(directives: &JsonValue) -> Result<String> {
    let dir_array = match directives.as_array() {
        Some(arr) => arr,
        None => return Ok(String::new()),
    };

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

        output.push_str(&format!(" @{}", dir_name));

        if let Some(args) = dir_obj.get("arguments").and_then(|v| v.as_object()) {
            if !args.is_empty() {
                output.push('(');
                let mut first = true;
                for (key, value) in args {
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

    Ok(output)
}

fn format_description(description: &str) -> String {
    format!(
        "\"\"\"\n{}\n\"\"\"\n",
        description.replace("\"\"\"", "\\\"\"\"")
    )
}

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

fn sanitize_type_name(name: &str, convention: NamingConvention) -> String {
    match convention {
        NamingConvention::Preserve => name.to_string(),
        NamingConvention::GraphqlIdiomatic => snake_to_pascal(name),
    }
}

fn sanitize_field_name(name: &str, convention: NamingConvention) -> String {
    match convention {
        NamingConvention::Preserve => name.to_string(),
        NamingConvention::GraphqlIdiomatic => snake_to_camel(name),
    }
}

fn is_excluded(name: &str, patterns: &[String]) -> bool {
    for pattern in patterns {
        if let Ok(re) = regex::Regex::new(pattern) {
            if re.is_match(name) {
                return true;
            }
        }
    }
    false
}

fn extract_type_name_from_ref(ref_path: &str, convention: NamingConvention) -> Option<String> {
    let parts: Vec<&str> = ref_path.split('/').collect();
    if let Some(last) = parts.last() {
        return Some(sanitize_type_name(last, convention));
    }
    None
}

fn snake_to_pascal(snake: &str) -> String {
    let mut result = String::new();
    let mut capitalize_next = true;
    for c in snake.chars() {
        if c == '_' || c == ' ' || c == '-' {
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
    }

    #[test]
    fn test_infer_graphql_type() {
        let options = ConversionOptions::default();
        let root_schema = json!({});
        let mut context = ConversionContext::with_root(&options, &root_schema);

        let schema = json!({"type": "string"});
        assert_eq!(
            infer_graphql_type(&schema, false, &mut context).unwrap(),
            "String"
        );
        assert_eq!(
            infer_graphql_type(&schema, true, &mut context).unwrap(),
            "String!"
        );

        let schema_uuid = json!({"type": "string", "format": "uuid"});
        assert_eq!(
            infer_graphql_type(&schema_uuid, false, &mut context).unwrap(),
            "ID"
        );

        let schema_override = json!({"type": "string", "x-graphql-type": "MyScalar"});
        assert_eq!(
            infer_graphql_type(&schema_override, false, &mut context).unwrap(),
            "MyScalar"
        );
        // Test double-bang prevention
        assert_eq!(
            infer_graphql_type(&schema_override, true, &mut context).unwrap(),
            "MyScalar!"
        );
        let schema_override_bang = json!({"type": "string", "x-graphql-type": "MyScalar!"});
        assert_eq!(
            infer_graphql_type(&schema_override_bang, true, &mut context).unwrap(),
            "MyScalar!"
        );
    }

    #[test]
    fn test_convert_simple_type() {
        let options = ConversionOptions::default();
        let schema = json!({
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "title": "User",
            "type": "object",
            "properties": {
                "id": { "type": "string", "format": "uuid" },
                "name": { "type": "string" }
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
    fn test_convert_union_from_oneof() {
        let options = ConversionOptions::default();
        let schema = json!({
            "title": "SearchResult",
            "oneOf": [
                { "$ref": "#/$defs/User" },
                { "$ref": "#/$defs/Post" }
            ],
            "$defs": {
                "User": { "title": "User", "type": "object" },
                "Post": { "title": "Post", "type": "object" }
            }
        });
        let result = convert(&schema, &options).unwrap();
        assert!(result.contains("union SearchResult = User | Post"));
    }

    #[test]
    fn test_nested_ref_uses_explicit_name() {
        let options = ConversionOptions::default();
        let schema = json!({
            "title": "Root",
            "type": "object",
            "x-graphql-type-name": "Root",
            "properties": {
                "deep": { "$ref": "#/$defs/Structure/properties/data" }
            },
            "$defs": {
                "Structure": {
                    "type": "object",
                    "properties": {
                        "data": {
                            "type": "object",
                            "properties": {
                                "value": { "type": "integer" }
                            },
                            "x-graphql-type-name": "DeepData"
                        }
                    }
                }
            }
        });

        let mut context = ConversionContext::with_root(&options, &schema);
        let deep_schema = schema
            .get("properties")
            .and_then(|props| props.get("deep"))
            .expect("deep property");
        let field_type = infer_graphql_type(deep_schema, false, &mut context).unwrap();
        assert_eq!(field_type, "DeepData");
    }

    #[test]
    fn test_infer_ids_option() {
        let mut options = ConversionOptions::default();
        options.infer_ids = true;

        let schema = json!({
            "title": "User",
            "type": "object",
            "properties": {
                "id": { "type": "string" },
                "_id": { "type": "string" },
                "other_id": { "type": "string" },
                "name": { "type": "string" }
            }
        });

        let result = convert(&schema, &options).unwrap();
        assert!(result.contains("id: ID"));
        assert!(result.contains("Id: ID"));
        // Should only affect "id" and "_id", not fields ending in id
        assert!(result.contains("otherId: String"));
        assert!(result.contains("name: String"));
    }
}
