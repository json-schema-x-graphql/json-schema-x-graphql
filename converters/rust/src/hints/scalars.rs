//! Custom scalar type generation from x-graphql-scalars extension.
//!
//! Handles the `x-graphql-scalars` top-level schema extension that
//! defines custom scalar types to be emitted in the SDL.

use serde_json::Value as JsonValue;
use std::collections::HashMap;

/// Configuration for a custom scalar type.
#[derive(Debug, Clone)]
pub struct ScalarConfig {
    pub name: String,
    pub description: Option<String>,
    pub specified_by_url: Option<String>,
}

/// Parse `x-graphql-scalars` from the top-level schema object.
///
/// Accepts both an object format (keys are scalar names) and an
/// array format (each entry has `name` and optional `description`).
pub fn parse_custom_scalars(schema: &JsonValue) -> Vec<ScalarConfig> {
    let obj = match schema.as_object() {
        Some(o) => o,
        None => return vec![],
    };

    // Top-level x-graphql-scalars
    if let Some(scalars) = obj.get("x-graphql-scalars") {
        if let Some(scalars_obj) = scalars.as_object() {
            return scalars_obj
                .iter()
                .map(|(name, config)| {
                    let description = config
                        .get("description")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    let specified_by_url = config
                        .get("specifiedByURL")
                        .or_else(|| config.get("specifiedByUrl"))
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    ScalarConfig {
                        name: name.clone(),
                        description,
                        specified_by_url,
                    }
                })
                .collect();
        }
        if let Some(scalars_arr) = scalars.as_array() {
            return scalars_arr
                .iter()
                .filter_map(|entry| {
                    let name = entry.get("name")?.as_str()?;
                    let description = entry
                        .get("description")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    let specified_by_url = entry
                        .get("specifiedByURL")
                        .or_else(|| entry.get("specifiedByUrl"))
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    Some(ScalarConfig {
                        name: name.to_string(),
                        description,
                        specified_by_url,
                    })
                })
                .collect();
        }
    }

    // Per-definition x-graphql-scalar
    let defs = obj
        .get("$defs")
        .or_else(|| obj.get("definitions"))
        .and_then(|d| d.as_object());

    if let Some(defs_obj) = defs {
        for (_def_key, def_schema) in defs_obj {
            if let Some(def_obj) = def_schema.as_object() {
                // Check if this definition is a scalar type
                if def_obj.get("x-graphql-type-kind").and_then(|v| v.as_str()) == Some("SCALAR")
                    || def_obj.contains_key("x-graphql-scalar")
                {
                    let name = def_obj
                        .get("x-graphql-type-name")
                        .or_else(|| def_obj.get("title"))
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());

                    if let Some(name) = name {
                        let description = def_obj
                            .get("description")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());
                        let specified_by_url = def_obj
                            .get("specifiedByURL")
                            .or_else(|| def_obj.get("specifiedByUrl"))
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());
                        return vec![ScalarConfig {
                            name,
                            description,
                            specified_by_url,
                        }];
                    }
                }
            }
        }
    }

    vec![]
}

/// Generate SDL for a list of custom scalars.
///
/// Skips scalars that already appear in the base SDL (idempotent).
pub fn generate_scalars_sdl(scalars: &[ScalarConfig], existing_sdl: &str) -> String {
    let mut lines: Vec<String> = vec![];

    for scalar in scalars {
        // Skip if already present
        if existing_sdl.contains(&format!("scalar {}", scalar.name)) {
            continue;
        }

        if let Some(ref desc) = scalar.description {
            let trimmed = desc.trim();
            if trimmed.contains('\n') {
                lines.push("\"\"\"".to_string());
                lines.push(trimmed.to_string());
                lines.push("\"\"\"".to_string());
            } else {
                lines.push(format!("\"\"\"{}\"\"\"", trimmed));
            }
        }

        if let Some(ref url) = scalar.specified_by_url {
            lines.push(format!(
                "scalar {} @specifiedBy(url: \"{}\")",
                scalar.name, url
            ));
        } else {
            lines.push(format!("scalar {}", scalar.name));
        }
    }

    if lines.is_empty() {
        return String::new();
    }

    lines.push(String::new()); // trailing newline
    lines.join("\n")
}

/// Prepend custom scalar declarations to existing SDL.
pub fn inject_custom_scalars(sdl: &str, scalars: &[ScalarConfig]) -> String {
    let scalar_block = generate_scalars_sdl(scalars, sdl);
    if scalar_block.is_empty() {
        return sdl.to_string();
    }
    format!("{}{}", scalar_block, sdl)
}

/// Build a map of type.field → scalar name for property-level
/// x-graphql-scalar overrides.
pub fn build_scalar_field_map(schema: &JsonValue) -> HashMap<String, String> {
    let mut map = HashMap::new();
    let obj = match schema.as_object() {
        Some(o) => o,
        None => return map,
    };

    let defs = obj
        .get("$defs")
        .or_else(|| obj.get("definitions"))
        .and_then(|d| d.as_object());

    if let Some(defs_obj) = defs {
        for (type_name, def_schema) in defs_obj {
            if let Some(def_obj) = def_schema.as_object() {
                if let Some(properties) = def_obj.get("properties").and_then(|p| p.as_object()) {
                    for (prop_name, prop_schema) in properties {
                        if let Some(scalar) =
                            prop_schema.get("x-graphql-scalar").and_then(|v| v.as_str())
                        {
                            map.insert(format!("{}.{}", type_name, prop_name), scalar.to_string());
                        }
                    }
                }
            }
        }
    }

    map
}

/// Apply field-level scalar replacements to SDL.
///
/// Replaces standard type names (String, Float, Int, Boolean) with
/// custom scalar names based on the field map.
pub fn apply_scalar_field_replacements(sdl: &str, field_map: &HashMap<String, String>) -> String {
    if field_map.is_empty() {
        return sdl.to_string();
    }

    let mut current_type: Option<String> = None;
    let lines: Vec<String> = sdl
        .lines()
        .map(|line| {
            let trimmed = line.trim();

            // Track current type
            if let Some(type_match) = trimmed.strip_prefix("type ") {
                if let Some(name) = type_match
                    .split(|c: char| c.is_whitespace() || c == '{' || c == '(')
                    .next()
                {
                    current_type = Some(name.to_string());
                }
            } else if trimmed == "}"
                || trimmed.starts_with("input ")
                || trimmed.starts_with("enum ")
            {
                current_type = None;
            }

            // Apply scalar replacement in current type
            if let Some(ref type_name) = current_type {
                for (key, scalar_name) in field_map {
                    let (map_type, map_field) = key.split_once('.').unwrap_or((key, ""));
                    if map_type != type_name {
                        continue;
                    }
                    // Match field declaration: `  fieldName: StandardType`
                    let pattern = format!("  {}: ", map_field);
                    if let Some(pos) = line.find(&pattern) {
                        let after_pattern = &line[pos + pattern.len()..];
                        // Replace the standard type with the custom scalar
                        let standard_types = ["String", "Float", "Int", "Boolean", "ID"];
                        for st in &standard_types {
                            if let Some(after_stripped) = after_pattern.strip_prefix(st) {
                                let mut new_line = line[..pos + pattern.len()].to_string();
                                new_line.push_str(scalar_name);
                                new_line.push_str(after_stripped);
                                return new_line;
                            }
                        }
                    }
                }
            }

            line.to_string()
        })
        .collect();

    lines.join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_parse_custom_scalars_top_level_object() {
        let schema = json!({
            "x-graphql-scalars": {
                "DateTime": {
                    "description": "ISO 8601 date-time string",
                    "specifiedByURL": "https://example.com/datetime"
                },
                "JSON": {
                    "description": "Arbitrary JSON value"
                }
            }
        });
        let scalars = parse_custom_scalars(&schema);
        assert_eq!(scalars.len(), 2);
        assert_eq!(scalars[0].name, "DateTime");
        assert_eq!(scalars[1].name, "JSON");
    }

    #[test]
    fn test_generate_scalars_sdl() {
        let scalars = vec![ScalarConfig {
            name: "DateTime".to_string(),
            description: Some("ISO 8601 date-time string".to_string()),
            specified_by_url: Some("https://example.com/datetime".to_string()),
        }];
        let sdl = generate_scalars_sdl(&scalars, "");
        assert!(sdl.contains("scalar DateTime"));
        assert!(sdl.contains("@specifiedBy"));
        assert!(sdl.contains("ISO 8601"));
    }

    #[test]
    fn test_build_scalar_field_map() {
        let schema = json!({
            "$defs": {
                "User": {
                    "properties": {
                        "created_at": {
                            "type": "string",
                            "x-graphql-scalar": "DateTime"
                        }
                    }
                }
            }
        });
        let map = build_scalar_field_map(&schema);
        assert_eq!(map.get("User.created_at").unwrap(), "DateTime");
    }

    #[test]
    fn test_apply_scalar_field_replacements() {
        let sdl = "type User {\n  created_at: String\n}";
        let mut map = HashMap::new();
        map.insert("User.created_at".to_string(), "DateTime".to_string());
        let result = apply_scalar_field_replacements(sdl, &map);
        assert!(result.contains("created_at: DateTime"));
        assert!(!result.contains("created_at: String"));
    }
}
