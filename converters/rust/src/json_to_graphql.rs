//! JSON Schema to GraphQL SDL conversion

use crate::case_conversion::{camel_to_snake, snake_to_camel};
use crate::error::{ConversionError, Result};
use crate::types::{ConversionOptions, NamingConvention};
use serde_json::Value as JsonValue;
use std::collections::{HashMap, HashSet};

fn should_include_type(type_name: &str, options: &ConversionOptions) -> bool {
    // Always exclude introspection types
    if type_name.starts_with("__") {
        return false;
    }

    // Check operational types
    if !options.include_operational_types && options.exclude_types.contains(&type_name.to_string())
    {
        return false;
    }

    // Check suffixes
    for suffix in &options.exclude_type_suffixes {
        if type_name.ends_with(suffix) {
            return false;
        }
    }

    // Check regexes
    if is_excluded(type_name, &options.exclude_patterns) {
        return false;
    }

    true
}

/// Convert JSON Schema to GraphQL SDL
pub fn convert(schema: &JsonValue, options: &ConversionOptions) -> Result<String> {
    let mut context = ConversionContext::with_root(options, schema);

    // Process the schema
    if let Some(obj) = schema.as_object() {
        // Check for $defs/definitions section
        if let Some(defs) = obj.get("$defs").or_else(|| obj.get("definitions")) {
            if let Some(defs_obj) = defs.as_object() {
                // First pass: assign names and populate type_names
                for (def_key, def_schema) in defs_obj {
                    // Determine type name: x-graphql-type-name > x-graphql-type.name > title > def_key
                    let explicit_type_name = def_schema
                        .get("x-graphql-type-name")
                        .and_then(|v| v.as_str())
                        .or_else(|| {
                            def_schema.get("x-graphql-type").and_then(|v| {
                                v.as_str()
                                    .or_else(|| v.get("name").and_then(|n| n.as_str()))
                            })
                        });

                    let raw_type_name = explicit_type_name
                        .or_else(|| def_schema.get("title").and_then(|v| v.as_str()))
                        .unwrap_or(def_key);

                    // Only apply naming convention if x-graphql-type-name is NOT explicitly set
                    let type_name = if explicit_type_name.is_some() {
                        sanitize_type_name(raw_type_name, NamingConvention::Preserve)
                    } else {
                        sanitize_type_name(raw_type_name, options.naming_convention)
                    };

                    // Ensure uniqueness of top-level definition type names
                    let mut unique_type_name = type_name.clone();
                    let mut idx = 1;
                    while context.type_names.values().any(|v| v == &unique_type_name) {
                        unique_type_name = format!("{}{}", type_name, idx);
                        idx += 1;
                    }

                    if !should_include_type(&unique_type_name, options) {
                        continue;
                    }

                    // Record mapping from definition path to resolved type name so
                    // that references can be resolved deterministically.
                    context
                        .type_names
                        .insert(format!("#/$defs/{}", def_key), unique_type_name.clone());
                    context.type_names.insert(
                        format!("#/definitions/{}", def_key),
                        unique_type_name.clone(),
                    );
                }

                // Second pass: convert definitions
                for (def_key, def_schema) in defs_obj {
                    let unique_type_name = context
                        .type_names
                        .get(&format!("#/$defs/{}", def_key))
                        .or_else(|| {
                            context
                                .type_names
                                .get(&format!("#/definitions/{}", def_key))
                        })
                        .cloned();

                    if let Some(name) = unique_type_name {
                        convert_type_definition(def_schema, &name, &mut context)?;
                    }
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

            if should_include_type(&sanitized_name, options) {
                convert_type_definition(schema, &sanitized_name, &mut context)?;
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

    // Emit implied scalars
    // Check defined scalars from x-graphql-scalars first to avoid duplicates
    let defined_scalars = if let Some(root) = context.root_schema {
        if let Some(scalars) = root.get("x-graphql-scalars").and_then(|v| v.as_object()) {
            scalars.keys().cloned().collect::<HashSet<_>>()
        } else {
            HashSet::new()
        }
    } else {
        HashSet::new()
    };

    let standard_scalars: HashSet<&str> = ["String", "Int", "Float", "Boolean", "ID"]
        .iter()
        .cloned()
        .collect();

    let mut scalars_to_emit: Vec<_> = context
        .used_scalars
        .iter()
        .filter(|s| !defined_scalars.contains(*s))
        .filter(|s| !standard_scalars.contains(s.as_str()))
        .cloned()
        .collect();

    scalars_to_emit.sort();

    if !scalars_to_emit.is_empty() {
        // Prepend to output or append?
        // Node implementation appends.
        context.output.push("# Implied Scalars\n".to_string());
        for scalar in scalars_to_emit {
            context.output.push(format!("scalar {}\n", scalar));
        }
        context.output.push("\n".to_string());
    }

    // If there are no types rendered, return an empty SDL string rather than an error
    // so the parity harness can compare empty outputs deterministically.
    let final_output = context.output.join("");
    Ok(final_output)
}

struct ConversionContext<'a> {
    options: &'a ConversionOptions,
    type_names: HashMap<String, String>,
    root_schema: Option<&'a JsonValue>,
    external_schemas: HashMap<String, JsonValue>,
    generated_types: HashSet<String>,
    building: HashSet<String>,
    used_scalars: HashSet<String>,
    output: Vec<String>,
}

impl<'a> ConversionContext<'a> {
    fn with_root(options: &'a ConversionOptions, root_schema: &'a JsonValue) -> Self {
        Self {
            options,
            type_names: HashMap::new(),
            root_schema: Some(root_schema),
            external_schemas: HashMap::new(),
            generated_types: HashSet::new(),
            building: HashSet::new(),
            used_scalars: HashSet::new(),
            output: Vec::new(),
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
            .or_else(|| {
                extract_type_name_from_ref(
                    ref_path,
                    self.options.naming_convention,
                    self.options.ref_naming,
                )
            })?;

        // Ensure uniqueness of the derived type name to avoid collisions.
        let mut candidate = type_name.clone();
        let mut i = 1;
        while self.type_names.values().any(|v| v == &candidate) {
            candidate = format!("{}{}", type_name, i);
            i += 1;
        }
        self.type_names
            .insert(ref_path.to_string(), candidate.clone());

        Some(candidate)
    }

    fn resolve_ref(
        root_schema: Option<&'a JsonValue>,
        ref_path: &str,
        visited: &mut HashSet<String>,
    ) -> Result<Option<&'a JsonValue>> {
        if !ref_path.starts_with('#') {
            // External references are handled by resolve_ref_schema wrapper or caller
            return Ok(None);
        }

        // Check for circular $ref
        if visited.contains(ref_path) {
            return Err(ConversionError::CircularReference(format!(
                "Circular $ref detected: {}",
                ref_path
            )));
        }
        visited.insert(ref_path.to_string());

        let root = match root_schema {
            Some(r) => r,
            None => return Ok(None),
        };

        // Parse the JSON pointer path (e.g., "#/$defs/system_metadata")
        let path = ref_path.trim_start_matches('#').trim_start_matches('/');
        if path.is_empty() {
            return Ok(Some(root));
        }

        let parts: Vec<&str> = path.split('/').collect();
        let mut current = root;

        for part in parts {
            if part.is_empty() {
                continue;
            }

            // If current node has a $ref, resolve it first (recursive)
            if let Some(nested_ref) = current.get("$ref").and_then(|v| v.as_str()) {
                if let Some(resolved) = Self::resolve_ref(root_schema, nested_ref, visited)? {
                    current = resolved;
                }
            }

            // Try to get the part with multiple strategies
            current = Self::try_get_property(current, part)?;
        }

        Ok(Some(current))
    }

    /// Try to get a property with case conversion fallbacks
    fn try_get_property(node: &'a JsonValue, key: &str) -> Result<&'a JsonValue> {
        // Direct match
        if let Some(val) = node.get(key) {
            return Ok(val);
        }

        // Try snake_case conversion
        let snake = camel_to_snake(key);
        if let Some(val) = node.get(&snake) {
            return Ok(val);
        }

        // Try camelCase conversion
        let camel = snake_to_camel(key);
        if let Some(val) = node.get(&camel) {
            return Ok(val);
        }

        Err(ConversionError::InvalidReference(format!(
            "Property '{}' not found (tried: {}, {}, {})",
            key, key, snake, camel
        )))
    }

    fn resolve_ref_schema(&mut self, ref_path: &str) -> Option<&JsonValue> {
        // Try recursive resolution first
        let mut visited = HashSet::new();
        if let Ok(Some(resolved)) = Self::resolve_ref(self.root_schema, ref_path, &mut visited) {
            return Some(resolved);
        }

        // Fallback to external schema handling (existing logic)
        if !ref_path.starts_with('#') {
            if !self.external_schemas.contains_key(ref_path) {
                let type_name = extract_type_name_from_ref(
                    ref_path,
                    self.options.naming_convention,
                    self.options.ref_naming,
                )
                .unwrap_or_else(|| "ExternalType".to_string());

                let placeholder = serde_json::json!({
                    "type": "object",
                    "description": format!("External reference to {}", ref_path),
                    "x-graphql-type-name": type_name,
                    "properties": {
                        "_external_ref": {
                            "type": "string",
                            "description": "Placeholder for external reference"
                        }
                    }
                });
                self.external_schemas
                    .insert(ref_path.to_string(), placeholder);
            }
            return self.external_schemas.get(ref_path);
        }

        None
    }
}

fn convert_type_definition(
    schema: &JsonValue,
    type_name: &str,
    context: &mut ConversionContext,
) -> Result<()> {
    if context.generated_types.contains(type_name) {
        return Ok(());
    }

    // Check for circular type resolution
    if context.building.contains(type_name) {
        return Err(ConversionError::CircularReference(format!(
            "Circular type resolution detected for {}",
            type_name
        )));
    }

    context.building.insert(type_name.to_string());
    context.generated_types.insert(type_name.to_string());

    let obj = schema.as_object().ok_or_else(|| {
        ConversionError::InvalidJsonSchema("schema must be an object".to_string())
    })?;

    // Skip types marked with x-graphql-skip
    if obj.get("x-graphql-skip").and_then(|v| v.as_bool()) == Some(true) {
        context.building.remove(type_name);
        return Ok(());
    }

    let mut output = String::new();

    // Description is emitted per-kind where appropriate. For object types we
    // delay emitting the description until we know we will render the type
    // (i.e., it has fields) to avoid orphaned description strings when the
    // type is omitted due to having no properties.

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

    // Fix 1: Check for INTERFACE (uppercase) as well as interface (lowercase)
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
            // Handle both string values and object values
            if let Some(fields) = key.as_str() {
                // Direct string value: "id" or "email"
                directives_json
                    .push(serde_json::json!({ "name": "key", "arguments": { "fields": fields } }));
            } else if let Some(fields) = key.get("fields") {
                // Object with fields property: {"fields": "id"}
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
            // Description for enum
            if context.options.include_descriptions {
                if let Some(description) = obj.get("description").and_then(|v| v.as_str()) {
                    output.push_str(&format_description(description, context.options));
                }
            }
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
            // Description for union
            if context.options.include_descriptions {
                if let Some(description) = obj.get("description").and_then(|v| v.as_str()) {
                    output.push_str(&format_description(description, context.options));
                }
            }
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
                        } else if let Some(name) = extract_type_name_from_ref(
                            ref_path,
                            context.options.naming_convention,
                            context.options.ref_naming,
                        ) {
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
            // Description for scalar
            if context.options.include_descriptions {
                if let Some(description) = obj.get("description").and_then(|v| v.as_str()) {
                    output.push_str(&format_description(description, context.options));
                }
            }
            output.push_str(&format!("scalar {}{}\n\n", type_name, directives_str));
        }
        _ => {
            // Object, Interface, Input
            // Build fields first, then emit the type only if there are fields
            let mut field_lines: Vec<String> = Vec::new();

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
                        } else if let Some(name) = extract_type_name_from_ref(
                            ref_path,
                            context.options.naming_convention,
                            context.options.ref_naming,
                        ) {
                            implements.push(name);
                        }
                    }
                }
            }

            // Properties
            if let Some(properties) = obj.get("properties").and_then(|v| v.as_object()) {
                let required_fields = obj
                    .get("required")
                    .and_then(|v| v.as_array())
                    .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect::<Vec<_>>())
                    .unwrap_or_default();

                let mut prop_names: Vec<_> = properties.keys().collect();

                if context.options.preserve_field_order {
                    // Mirror JS property enumeration: integer-like keys first (ascending),
                    // then the remaining keys in insertion order.
                    let mut numeric_keys: Vec<(u64, &String)> = Vec::new();
                    let mut other_keys: Vec<&String> = Vec::new();

                    for key in properties.keys() {
                        if let Ok(n) = key.parse::<u64>() {
                            numeric_keys.push((n, key));
                        } else {
                            other_keys.push(key);
                        }
                    }

                    numeric_keys.sort_by_key(|(n, _)| *n);
                    prop_names = numeric_keys
                        .into_iter()
                        .map(|(_, k)| k)
                        .chain(other_keys)
                        .collect();
                } else {
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
                            let indented = field_def
                                .lines()
                                .map(|line| format!("  {}", line))
                                .collect::<Vec<_>>()
                                .join("\n");
                            field_lines.push(format!("{}\n", indented));
                        }
                    }
                }
            }

            // Only emit the type declaration if there are fields to render.
            if !field_lines.is_empty() {
                // Emit the description for object-like kinds now that we know
                // the type will be rendered.
                if context.options.include_descriptions {
                    if let Some(description) = obj.get("description").and_then(|v| v.as_str()) {
                        output.push_str(&format_description(description, context.options));
                    }
                }
                output.push_str(&format!("{} {}", kind, type_name));
                if !implements.is_empty() {
                    output.push_str(&format!(" implements {}", implements.join(" & ")));
                }
                output.push_str(&directives_str);
                output.push_str(" {\n");
                for line in field_lines {
                    output.push_str(&line);
                }
                output.push_str("}\n\n");
            }
        }
    }

    context.output.push(output);
    context.building.remove(type_name);
    Ok(())
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

    // Fix 3: Skip field if x-graphql-skip is true
    if obj.get("x-graphql-skip").and_then(|v| v.as_bool()) == Some(true) {
        return Ok(String::new());
    }

    let mut output = String::new();

    // Description
    if context.options.include_descriptions {
        if let Some(description) = obj.get("description").and_then(|v| v.as_str()) {
            output.push_str(&format_description(description, context.options));
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

    // Fix 5: Check for explicit field nullability override
    let field_non_null = obj
        .get("x-graphql-field-non-null")
        .and_then(|v| v.as_bool());
    let field_nullable = obj.get("x-graphql-nullable").and_then(|v| v.as_bool());

    let mut effective_required = is_required;
    if let Some(non_null) = field_non_null {
        effective_required = non_null;
    } else if let Some(nullable) = field_nullable {
        effective_required = !nullable;
    }

    // Type
    let mut field_type = infer_graphql_type(schema, effective_required, context, Some(field_name))?;

    // ID inference aligns with Node converter behavior.
    // Legacy `infer_ids` maps to the COMMON_PATTERNS strategy when set.
    let effective_id_strategy = match context.options.id_strategy {
        crate::types::IdInferenceStrategy::CommonPatterns
        | crate::types::IdInferenceStrategy::AllStrings => context.options.id_strategy,
        crate::types::IdInferenceStrategy::None => {
            if context.options.infer_ids {
                crate::types::IdInferenceStrategy::CommonPatterns
            } else {
                crate::types::IdInferenceStrategy::None
            }
        }
    };

    if field_type == "String" || field_type == "String!" {
        let name_lower = field_name.to_ascii_lowercase();
        let promote = match effective_id_strategy {
            crate::types::IdInferenceStrategy::CommonPatterns => {
                name_lower == "id" || name_lower == "_id" || name_lower.ends_with("id")
            }
            crate::types::IdInferenceStrategy::AllStrings => true,
            crate::types::IdInferenceStrategy::None => false,
        };

        if promote {
            field_type = if effective_required {
                "ID!".to_string()
            } else {
                "ID".to_string()
            };
        }
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
    name_hint: Option<&str>,
) -> Result<String> {
    // Be lenient with tuple/boolean schemas: treat arrays/booleans as generic JSON
    if schema.is_boolean() {
        return Ok(if is_required {
            "JSON!".to_string()
        } else {
            "JSON".to_string()
        });
    }

    // Tuple validation (`items` as array) – use the first entry to infer a representative type,
    // otherwise fall back to JSON so we don't hard-fail on empty tuples.
    if let Some(items) = schema.as_array() {
        if let Some(first) = items.first() {
            let t = infer_graphql_type(first, false, context, name_hint)?;
            return Ok(if is_required && !t.ends_with('!') {
                format!("{}!", t)
            } else {
                t
            });
        }
        return Ok(if is_required {
            "JSON!".to_string()
        } else {
            "JSON".to_string()
        });
    }

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
    // Fix 2: Check for field-level type override first (x-graphql-field-type)
    let explicit_type = obj
        .get("x-graphql-field-type")
        .and_then(|v| v.as_str())
        .or_else(|| x_graphql.and_then(|x| x.get("type").and_then(|v| v.as_str())))
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
        // Check if the referenced schema is a primitive type
        if let Some(schema) = context.resolve_ref_schema(ref_path) {
            // Clone schema to avoid borrow checker issues
            let schema_clone = schema.clone();

            // Check if it's a primitive
            let is_primitive = schema_clone
                .get("type")
                .and_then(|v| v.as_str())
                .map(|t| matches!(t, "string" | "integer" | "number" | "boolean"))
                .unwrap_or(false);

            if is_primitive {
                // If it's a primitive, infer its type directly
                if let Ok(primitive_type) =
                    infer_graphql_type(&schema_clone, false, context, name_hint)
                {
                    return Ok(finalize(primitive_type));
                }
            }
        }

        let is_top_level_def = |path: &str| {
            if let Some(rest) = path.strip_prefix("#/definitions/") {
                !rest.contains('/')
            } else if let Some(rest) = path.strip_prefix("#/$defs/") {
                !rest.contains('/')
            } else {
                false
            }
        };

        if let Some(type_name) = context.resolve_ref_type_name(ref_path) {
            if !context.generated_types.contains(&type_name) && !is_top_level_def(ref_path) {
                if let Some(s) = context.resolve_ref_schema(ref_path) {
                    let schema_clone = s.clone();
                    convert_type_definition(&schema_clone, &type_name, context)?;
                }
            }
            return Ok(finalize(type_name));
        } else if let Some(type_name) = extract_type_name_from_ref(
            ref_path,
            context.options.naming_convention,
            context.options.ref_naming,
        ) {
            if !context.generated_types.contains(&type_name) && !is_top_level_def(ref_path) {
                if let Some(s) = context.resolve_ref_schema(ref_path) {
                    let schema_clone = s.clone();
                    convert_type_definition(&schema_clone, &type_name, context)?;
                }
            }
            return Ok(finalize(type_name));
        }
    }

    // 3. Format Hints
    if let Some(format) = obj.get("format").and_then(|v| v.as_str()) {
        let mapped = match format {
            "uuid" => Some("ID"),
            "date-time" => {
                context.used_scalars.insert("DateTime".to_string());
                Some("DateTime")
            }
            "date" => {
                context.used_scalars.insert("Date".to_string());
                Some("Date")
            }
            "time" => {
                context.used_scalars.insert("Time".to_string());
                Some("Time")
            }
            "email" => {
                context.used_scalars.insert("Email".to_string());
                Some("Email")
            }
            "uri" | "url" => {
                context.used_scalars.insert("URI".to_string());
                Some("URI")
            }
            _ => None,
        };
        if let Some(t) = mapped {
            return Ok(finalize(t.to_string()));
        }
    }

    // 3a. Combinators map to JSON in GraphQL
    if obj.get("oneOf").is_some() || obj.get("anyOf").is_some() || obj.get("allOf").is_some() {
        return Ok(finalize("JSON".to_string()));
    }

    // 4. Type Mapping
    let mut schema_type: Option<String> = obj
        .get("type")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    if let Some(type_array) = obj.get("type").and_then(|v| v.as_array()) {
        if type_array.len() > 1 {
            return Ok(finalize("JSON".to_string()));
        }

        if let Some(first) = type_array.first().and_then(|v| v.as_str()) {
            schema_type = Some(first.to_string());
        }
    }

    let gql_type = match schema_type.as_deref() {
        Some("string") => "String".to_string(),
        Some("integer") => "Int".to_string(),
        Some("number") => "Float".to_string(),
        Some("boolean") => "Boolean".to_string(),
        Some("null") => "JSON".to_string(),
        Some("array") => {
            if let Some(items) = obj.get("items") {
                // Fix 6: Check for x-graphql-field-list-item-non-null
                let list_item_non_null = obj
                    .get("x-graphql-field-list-item-non-null")
                    .and_then(|v| v.as_bool());

                // Check for nullableItems override (legacy support)
                let items_nullable =
                    x_graphql.and_then(|x| x.get("nullableItems").and_then(|v| v.as_bool()));

                let item_is_required = if let Some(non_null) = list_item_non_null {
                    non_null
                } else if let Some(nullable) = items_nullable {
                    !nullable
                } else {
                    false
                };

                let item_type = infer_graphql_type(items, item_is_required, context, name_hint)?;
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
                let name_str = name.to_string();

                if !context.generated_types.contains(&name_str) {
                    convert_type_definition(schema, &name_str, context)?;
                }

                name_str
            } else if let Some(hint) = name_hint {
                // Generate inline type
                let raw_name = sanitize_type_name(hint, context.options.naming_convention);
                let mut unique_name = raw_name.clone();
                let mut idx = 1;

                while context.type_names.values().any(|v| v == &unique_name)
                    || context.generated_types.contains(&unique_name)
                {
                    unique_name = format!("{}{}", raw_name, idx);
                    idx += 1;
                }

                // Eagerly materialize inline object types so they appear before
                // the parent type, matching the Node converter's depth-first order.
                if !context.generated_types.contains(&unique_name) {
                    convert_type_definition(schema, &unique_name, context)?;
                }

                unique_name
            } else {
                "JSON".to_string()
            }
        }
        _ => "String".to_string(),
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

            let arg_type = infer_graphql_type(arg_schema, false, context, Some(arg_name))?;
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

fn format_description(description: &str, options: &crate::types::ConversionOptions) -> String {
    // Use block-style (triple-quoted) format if description exceeds threshold or contains newlines
    let should_block =
        description.contains('\n') || description.len() >= options.description_block_threshold;

    if should_block {
        // Format as block string without extra newlines: """description"""
        // The calling context will add newlines as needed
        format!(
            "\"\"\"{}\"\"\"\n",
            description.replace("\"\"\"", "\\\"\"\"")
        )
    } else {
        // Format as inline string without extra newlines: "description"
        format!("\"{}\"\n", description.replace('"', "\\\""))
    }
}

fn sanitize_type_name(value: &str, naming: NamingConvention) -> String {
    use NamingConvention::*;
    match naming {
        Preserve => {
            let mut v = value
                .chars()
                .map(|c| {
                    if c.is_ascii_alphanumeric() || c == '_' {
                        c
                    } else {
                        '_'
                    }
                })
                .collect::<String>();
            if v.chars()
                .next()
                .map(|c| c.is_ascii_digit())
                .unwrap_or(false)
            {
                v = format!("_{}", v);
            }
            v
        }
        _ => {
            // Replace non-alnum/_ with space, split, pascal-case each segment
            let replaced = value
                .chars()
                .map(|c| {
                    if c.is_ascii_alphanumeric() || c == '_' {
                        c
                    } else {
                        ' '
                    }
                })
                .collect::<String>();
            let mut parts: Vec<String> = Vec::new();
            for s in replaced.split_whitespace() {
                for p in s.split(|c: char| !c.is_ascii_alphanumeric()) {
                    if p.is_empty() {
                        continue;
                    }
                    let mut cs = p.chars();
                    let first = cs.next().unwrap_or(' ');
                    let rest = cs.as_str().to_lowercase();
                    parts.push(format!("{}{}", first.to_ascii_uppercase(), rest));
                }
            }
            let joined = parts.join("");
            let cleaned = joined
                .chars()
                .map(|c| {
                    if c.is_ascii_alphanumeric() || c == '_' {
                        c
                    } else {
                        '_'
                    }
                })
                .collect::<String>();
            if cleaned
                .chars()
                .next()
                .map(|c| c.is_ascii_digit())
                .unwrap_or(false)
            {
                format!("_{}", cleaned)
            } else {
                cleaned
            }
        }
    }
}

fn to_camel_case(value: &str) -> String {
    let mut result = String::new();
    let mut capitalize_next = false;
    for c in value.chars() {
        if c == '_' || c == '-' || c == '.' || c.is_whitespace() {
            capitalize_next = true;
            continue;
        }
        if capitalize_next {
            result.push(c.to_ascii_uppercase());
            capitalize_next = false;
        } else {
            result.push(c);
        }
    }
    // lowercase first char
    if let Some(first) = result.chars().next() {
        let mut chars = result.chars();
        chars.next();
        return format!("{}{}", first.to_ascii_lowercase(), chars.as_str());
    }
    result
}

fn sanitize_field_name(name: &str, naming: NamingConvention) -> String {
    use NamingConvention::*;
    match naming {
        Preserve => {
            let cleaned = name
                .chars()
                .map(|c| {
                    if c.is_ascii_alphanumeric() || c == '_' {
                        c
                    } else {
                        '_'
                    }
                })
                .collect::<String>();
            if cleaned
                .chars()
                .next()
                .map(|c| c.is_ascii_alphabetic() || c == '_')
                .unwrap_or(false)
            {
                cleaned
            } else {
                format!("_{}", cleaned)
            }
        }
        _ => {
            // Align with Node: replace non-alphanumeric with space, then camelCase
            let pre_processed = name
                .chars()
                .map(|c| if c.is_ascii_alphanumeric() { c } else { ' ' })
                .collect::<String>();

            let base = to_camel_case(&pre_processed);

            let cleaned = base
                .chars()
                .map(|c| {
                    if c.is_ascii_alphanumeric() || c == '_' {
                        c
                    } else {
                        '_'
                    }
                })
                .collect::<String>();

            if cleaned
                .chars()
                .next()
                .map(|c| c.is_ascii_alphabetic() || c == '_')
                .unwrap_or(false)
            {
                cleaned
            } else {
                format!("_{}", cleaned)
            }
        }
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

fn extract_type_name_from_ref(
    ref_path: &str,
    convention: NamingConvention,
    strategy: crate::types::RefNaming,
) -> Option<String> {
    let parts: Vec<&str> = ref_path.split('/').filter(|s| !s.is_empty()).collect();
    if parts.is_empty() {
        return None;
    }

    let mut raw = parts.last().copied().unwrap_or("ExternalType").to_string();
    match strategy {
        crate::types::RefNaming::Basename => {
            // keep last segment
        }
        crate::types::RefNaming::FileAndPath => {
            let take = if parts.len() >= 2 { 2 } else { parts.len() };
            raw = parts[parts.len().saturating_sub(take)..].join("_");
        }
        crate::types::RefNaming::Hash => {
            // FNV-1a 32-bit
            let mut h: u32 = 2166136261;
            for b in ref_path.as_bytes() {
                h ^= *b as u32;
                h = h.wrapping_mul(16777619);
            }
            raw = format!("H{:x}", h);
        }
    }

    // strip common suffix
    raw = raw.replace(".schema.json", "");

    Some(sanitize_type_name(&raw, convention))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_infer_graphql_type() {
        let options = ConversionOptions::default();
        let root_schema = json!({});
        let mut context = ConversionContext::with_root(&options, &root_schema);

        let schema = json!({"type": "string"});
        assert_eq!(
            infer_graphql_type(&schema, false, &mut context, None).unwrap(),
            "String"
        );
        assert_eq!(
            infer_graphql_type(&schema, true, &mut context, None).unwrap(),
            "String!"
        );

        let schema_uuid = json!({"type": "string", "format": "uuid"});
        assert_eq!(
            infer_graphql_type(&schema_uuid, false, &mut context, None).unwrap(),
            "ID"
        );

        let schema_override = json!({"type": "string", "x-graphql-type": "MyScalar"});
        assert_eq!(
            infer_graphql_type(&schema_override, false, &mut context, None).unwrap(),
            "MyScalar"
        );
        // Test double-bang prevention
        assert_eq!(
            infer_graphql_type(&schema_override, true, &mut context, None).unwrap(),
            "MyScalar!"
        );
        let schema_override_bang = json!({"type": "string", "x-graphql-type": "MyScalar!"});
        assert_eq!(
            infer_graphql_type(&schema_override_bang, true, &mut context, None).unwrap(),
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
        assert!(
            result
                .to_lowercase()
                .contains("union searchresult = user | post"),
            "SDL: {}",
            result
        );
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
        let field_type = infer_graphql_type(deep_schema, false, &mut context, None).unwrap();
        assert_eq!(field_type, "DeepData");
    }

    #[test]
    #[allow(clippy::field_reassign_with_default)]
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
        // With infer_ids enabled we use COMMON_PATTERNS: fields ending with "id" are promoted
        assert!(result.contains("otherId: ID"));
        assert!(result.contains("name: String"));
    }

    #[test]
    #[allow(clippy::field_reassign_with_default)]
    fn test_all_strings_id_strategy() {
        let mut options = ConversionOptions::default();
        options.id_strategy = crate::types::IdInferenceStrategy::AllStrings;

        let schema = json!({
            "title": "Document",
            "type": "object",
            "properties": {
                "email": { "type": "string" },
                "count": { "type": "integer" }
            }
        });

        let result = convert(&schema, &options).unwrap();
        assert!(result.contains("email: ID"));
        assert!(result.contains("count: Int"));
    }

    #[test]
    fn test_circular_reference_self_referencing() {
        let options = ConversionOptions::default();
        let schema = json!({
            "$defs": {
                "Node": {
                    "type": "object",
                    "x-graphql-type-name": "Node",
                    "properties": {
                        "id": { "type": "string" },
                        "value": { "type": "string" },
                        "next": { "$ref": "#/$defs/Node" }
                    }
                }
            }
        });

        let result = convert(&schema, &options).unwrap();
        assert!(result.contains("type Node"));
        assert!(result.contains("next: Node"));
    }

    #[test]
    fn test_circular_reference_mutual() {
        let options = ConversionOptions::default();
        let schema = json!({
            "$defs": {
                "Person": {
                    "type": "object",
                    "x-graphql-type-name": "Person",
                    "properties": {
                        "id": { "type": "string" },
                        "name": { "type": "string" },
                        "company": { "$ref": "#/$defs/Company" }
                    }
                },
                "Company": {
                    "type": "object",
                    "x-graphql-type-name": "Company",
                    "properties": {
                        "id": { "type": "string" },
                        "name": { "type": "string" },
                        "employees": {
                            "type": "array",
                            "items": { "$ref": "#/$defs/Person" }
                        }
                    }
                }
            }
        });

        let result = convert(&schema, &options).unwrap();
        assert!(result.contains("type Person"));
        assert!(result.contains("type Company"));
        assert!(result.contains("company: Company"));
        assert!(result.contains("employees: [Person]"));
    }

    #[test]
    fn test_circular_reference_tree_structure() {
        let options = ConversionOptions::default();
        let schema = json!({
            "$defs": {
                "Tree": {
                    "type": "object",
                    "x-graphql-type-name": "Tree",
                    "properties": {
                        "value": { "type": "string" },
                        "children": {
                            "type": "array",
                            "items": { "$ref": "#/$defs/Tree" }
                        }
                    }
                }
            }
        });

        let result = convert(&schema, &options).unwrap();
        assert!(result.contains("type Tree"));
        assert!(result.contains("children: [Tree]"));
    }

    #[test]
    fn test_type_filtering_excludes_query_mutation() {
        let options = ConversionOptions::default();
        let schema = json!({
            "$defs": {
                "Query": {
                    "type": "object",
                    "x-graphql-type-name": "Query",
                    "properties": {
                        "hello": { "type": "string" }
                    }
                },
                "Mutation": {
                    "type": "object",
                    "x-graphql-type-name": "Mutation",
                    "properties": {
                        "updateUser": { "type": "string" }
                    }
                },
                "User": {
                    "type": "object",
                    "x-graphql-type-name": "User",
                    "properties": {
                        "id": { "type": "string" }
                    }
                }
            }
        });

        let result = convert(&schema, &options).unwrap();
        assert!(!result.contains("type Query"));
        assert!(!result.contains("type Mutation"));
        assert!(result.contains("type User"));
    }

    #[test]
    #[allow(clippy::field_reassign_with_default)]
    fn test_type_filtering_includes_operational_when_configured() {
        let mut options = ConversionOptions::default();
        options.include_operational_types = true;

        let schema = json!({
            "$defs": {
                "Query": {
                    "type": "object",
                    "x-graphql-type-name": "Query",
                    "properties": {
                        "hello": { "type": "string" }
                    }
                },
                "User": {
                    "type": "object",
                    "x-graphql-type-name": "User",
                    "properties": {
                        "id": { "type": "string" }
                    }
                }
            }
        });

        let result = convert(&schema, &options).unwrap();
        assert!(result.contains("type Query"));
        assert!(result.contains("type User"));
    }

    #[test]
    fn test_type_filtering_excludes_filter_suffix() {
        let options = ConversionOptions::default();
        let schema = json!({
            "$defs": {
                "User": {
                    "type": "object",
                    "x-graphql-type-name": "User",
                    "properties": {
                        "id": { "type": "string" }
                    }
                },
                "UserFilter": {
                    "type": "object",
                    "x-graphql-type-name": "UserFilter",
                    "properties": {
                        "name": { "type": "string" }
                    }
                }
            }
        });

        let result = convert(&schema, &options).unwrap();
        assert!(result.contains("type User"));
        assert!(!result.contains("type UserFilter"));
    }

    #[test]
    fn test_type_filtering_excludes_connection_suffix() {
        let options = ConversionOptions::default();
        let schema = json!({
            "$defs": {
                "User": {
                    "type": "object",
                    "x-graphql-type-name": "User",
                    "properties": {
                        "id": { "type": "string" }
                    }
                },
                "UserConnection": {
                    "type": "object",
                    "x-graphql-type-name": "UserConnection",
                    "properties": {
                        "edges": { "type": "array" }
                    }
                }
            }
        });

        let result = convert(&schema, &options).unwrap();
        assert!(result.contains("type User"));
        assert!(!result.contains("type UserConnection"));
    }

    #[test]
    fn test_type_filtering_excludes_payload_suffix() {
        let options = ConversionOptions::default();
        let schema = json!({
            "$defs": {
                "User": {
                    "type": "object",
                    "x-graphql-type-name": "User",
                    "properties": {
                        "id": { "type": "string" }
                    }
                },
                "CreateUserPayload": {
                    "type": "object",
                    "x-graphql-type-name": "CreateUserPayload",
                    "properties": {
                        "user": { "$ref": "#/$defs/User" }
                    }
                }
            }
        });

        let result = convert(&schema, &options).unwrap();
        assert!(result.contains("type User"));
        assert!(!result.contains("type CreateUserPayload"));
    }

    #[test]
    fn test_case_conversion_utilities() {
        assert_eq!(camel_to_snake("camelCase"), "camel_case");
        assert_eq!(camel_to_snake("PascalCase"), "pascal_case");
        assert_eq!(camel_to_snake("HTTPResponse"), "http_response");
        assert_eq!(snake_to_camel("snake_case"), "snakeCase");
        assert_eq!(snake_to_camel("http_response"), "httpResponse");
    }

    #[test]
    fn test_defs_extraction_all_types() {
        let options = ConversionOptions::default();
        let schema = json!({
            "$defs": {
                "User": {
                    "type": "object",
                    "x-graphql-type-name": "User",
                    "properties": {
                        "id": { "type": "string" }
                    }
                },
                "Post": {
                    "type": "object",
                    "x-graphql-type-name": "Post",
                    "properties": {
                        "title": { "type": "string" }
                    }
                },
                "Comment": {
                    "type": "object",
                    "x-graphql-type-name": "Comment",
                    "properties": {
                        "text": { "type": "string" }
                    }
                }
            }
        });

        let result = convert(&schema, &options).unwrap();
        assert!(result.contains("type User"));
        assert!(result.contains("type Post"));
        assert!(result.contains("type Comment"));
    }

    #[test]
    fn test_defs_with_references() {
        let options = ConversionOptions::default();
        let schema = json!({
            "$defs": {
                "Author": {
                    "type": "object",
                    "x-graphql-type-name": "Author",
                    "properties": {
                        "id": { "type": "string" },
                        "name": { "type": "string" }
                    }
                },
                "Book": {
                    "type": "object",
                    "x-graphql-type-name": "Book",
                    "properties": {
                        "id": { "type": "string" },
                        "title": { "type": "string" },
                        "author": { "$ref": "#/$defs/Author" }
                    }
                }
            }
        });

        let result = convert(&schema, &options).unwrap();
        assert!(result.contains("type Author"));
        assert!(result.contains("type Book"));
        assert!(result.contains("author: Author"));
    }

    #[test]
    fn test_defs_respects_filtering() {
        let options = ConversionOptions::default();
        let schema = json!({
            "$defs": {
                "User": {
                    "type": "object",
                    "x-graphql-type-name": "User",
                    "properties": {
                        "id": { "type": "string" }
                    }
                },
                "UserFilter": {
                    "type": "object",
                    "x-graphql-type-name": "UserFilter",
                    "properties": {
                        "name": { "type": "string" }
                    }
                },
                "Query": {
                    "type": "object",
                    "x-graphql-type-name": "Query",
                    "properties": {
                        "user": { "$ref": "#/$defs/User" }
                    }
                }
            }
        });

        let result = convert(&schema, &options).unwrap();
        assert!(result.contains("type User"));
        assert!(!result.contains("type UserFilter"));
        assert!(!result.contains("type Query"));
    }
}
