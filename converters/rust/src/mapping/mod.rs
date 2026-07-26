//! Field mapping system for multi-source schema unification.
//!
//! Maps fields between source systems and a canonical schema. Supports
//! multiple candidate locations per field (JSON pointers) and pointer
//! resolution that prefers mapped locations before falling back to
//! direct resolution.
//!
//! Ported from TTSE-petrified-forest's `field-mapping-helper.mjs` and
//! the `fieldMapping` parameter in `ir-to-graphql.mjs`.

use serde_json::Value;
use std::collections::HashMap;

use crate::case_conversion::{camel_to_snake, snake_to_camel};

/// Mapping entry for a single field in a source system.
#[derive(Debug, Clone, Default, serde::Deserialize, serde::Serialize)]
pub struct FieldMappingEntry {
    /// The field name as it appears in the source (snake_case)
    #[serde(default)]
    pub snake: Option<String>,
    /// The field name as it appears in GraphQL (camelCase)
    #[serde(default)]
    pub camel: Option<String>,
    /// Possible JSON pointer locations where this field may exist
    /// (e.g., `/properties/contract_id` or `properties/contract_id`)
    #[serde(default)]
    pub locations: Vec<String>,
}

/// A field mapping indexed by GraphQL field name.
pub type FieldMapping = HashMap<String, FieldMappingEntry>;

/// Build a FieldMapping from a JSON object (e.g., loaded from
/// `field-mapping.json`).
pub fn parse_field_mapping(value: &Value) -> FieldMapping {
    let mut map = FieldMapping::new();
    if let Some(obj) = value.as_object() {
        for (key, entry_value) in obj {
            if let Some(entry_obj) = entry_value.as_object() {
                let entry = FieldMappingEntry {
                    snake: entry_obj
                        .get("snake")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                    camel: entry_obj
                        .get("camel")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                    locations: entry_obj
                        .get("locations")
                        .and_then(|v| v.as_array())
                        .map(|arr| {
                            arr.iter()
                                .filter_map(|v| v.as_str().map(String::from))
                                .collect()
                        })
                        .unwrap_or_default(),
                };
                map.insert(key.clone(), entry);
            } else if let Some(locations) = entry_value.as_array() {
                // Shorthand: just an array of locations
                let entry = FieldMappingEntry {
                    snake: None,
                    camel: None,
                    locations: locations
                        .iter()
                        .filter_map(|v| v.as_str().map(String::from))
                        .collect(),
                };
                map.insert(key.clone(), entry);
            } else if let Some(s) = entry_value.as_str() {
                // Even shorter: just a single location string
                let entry = FieldMappingEntry {
                    snake: None,
                    camel: None,
                    locations: vec![s.to_string()],
                };
                map.insert(key.clone(), entry);
            }
        }
    }
    map
}

/// Walk a JSON pointer path through a schema.
///
/// Accepts both `/foo/bar` and `foo/bar` formats. Tries direct
/// key access, then camelCase/snake_case variants.
pub fn resolve_pointer<'a>(schema: &'a Value, pointer: &str) -> Option<&'a Value> {
    if pointer.is_empty() || pointer == "/" {
        return Some(schema);
    }

    let parts: Vec<&str> = pointer
        .trim_start_matches('/')
        .split('/')
        .filter(|p| !p.is_empty())
        .collect();

    let mut current = schema;
    for part in parts {
        if let Some(obj) = current.as_object() {
            // Direct match
            if let Some(v) = obj.get(part) {
                current = v;
                continue;
            }
            // Snake case match
            if let Some(v) = obj.get(camel_to_snake(part).as_str()) {
                current = v;
                continue;
            }
            // Camel case match
            if let Some(v) = obj.get(snake_to_camel(part).as_str()) {
                current = v;
                continue;
            }
            return None;
        } else {
            let arr = current.as_array()?;
            if let Ok(idx) = part.parse::<usize>() {
                if let Some(v) = arr.get(idx) {
                    current = v;
                    continue;
                }
            }
            return None;
        }
    }
    Some(current)
}

/// Resolve a pointer using a field mapping as a hint.
///
/// Tries direct resolution first, then falls back to any of the
/// mapping's location candidates. Returns the resolved node and
/// the path that was actually used.
pub fn resolve_pointer_with_mapping(
    schema: &Value,
    pointer: &str,
    mapping: &FieldMapping,
) -> Option<(Value, String)> {
    // Try direct resolution first
    if let Some(node) = resolve_pointer(schema, pointer) {
        if !node.is_null() {
            return Some((node.clone(), pointer.to_string()));
        }
    }

    // Try each path component as a mapping key
    let parts: Vec<&str> = pointer
        .trim_start_matches('/')
        .split('/')
        .filter(|p| !p.is_empty())
        .collect();

    for (i, part) in parts.iter().enumerate() {
        if let Some(entry) = mapping.get(*part) {
            for location in &entry.locations {
                let location_clean = location.trim_start_matches('#').trim_start_matches('/');
                // Try the location directly
                if let Some(node) = resolve_pointer(schema, location_clean) {
                    return Some((node.clone(), location_clean.to_string()));
                }
                // Try the location with the remaining path appended
                if i < parts.len() - 1 {
                    let remaining = parts[i + 1..].join("/");
                    let combined = format!("{}/{}", location_clean, remaining);
                    if let Some(node) = resolve_pointer(schema, &combined) {
                        return Some((node.clone(), combined));
                    }
                }
            }
        }
    }

    None
}

/// Translate a federation field set (e.g., `"id contractId"`) by
/// applying the field mapping to each token.
///
/// Federation keys reference fields in their source-form; this
/// function maps source field names to their GraphQL equivalents.
pub fn translate_federation_field_set(
    field_set: &str,
    mapping: &FieldMapping,
    transform: Option<&dyn Fn(&str) -> String>,
) -> String {
    field_set
        .split_whitespace()
        .map(|token| {
            // Check the mapping first
            if let Some(entry) = mapping.get(token) {
                if let Some(ref camel) = entry.camel {
                    return camel.clone();
                }
            }
            // Apply optional transform
            if let Some(t) = transform {
                t(token)
            } else {
                token.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// Get all mapped locations for a given field name.
pub fn locations_for(mapping: &FieldMapping, field_name: &str) -> Vec<String> {
    mapping
        .get(field_name)
        .map(|e| e.locations.clone())
        .unwrap_or_default()
}

/// Build an inverse mapping (GraphQL field name → snake_case source field).
pub fn inverse_mapping(mapping: &FieldMapping) -> FieldMapping {
    let mut inverse = FieldMapping::new();
    for (key, entry) in mapping {
        let mut inv = entry.clone();
        // Swap snake and camel
        inv.snake = entry.camel.clone().or_else(|| Some(key.clone()));
        inv.camel = entry.snake.clone().or_else(|| Some(key.clone()));
        inverse.insert(entry.camel.clone().unwrap_or_else(|| key.clone()), inv);
    }
    inverse
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_resolve_pointer_direct() {
        let schema = json!({
            "properties": {
                "user_id": {"type": "string"}
            }
        });
        let result = resolve_pointer(&schema, "/properties/user_id").unwrap();
        assert_eq!(result.get("type").and_then(|v| v.as_str()), Some("string"));
    }

    #[test]
    fn test_resolve_pointer_camel_snake_variants() {
        let schema = json!({
            "properties": {
                "user_id": {"type": "string"}
            }
        });
        let result = resolve_pointer(&schema, "/properties/userId").unwrap();
        assert_eq!(result.get("type").and_then(|v| v.as_str()), Some("string"));
    }

    #[test]
    fn test_parse_field_mapping_object_form() {
        let json = json!({
            "userId": {
                "snake": "user_id",
                "locations": ["/properties/user_id", "/$defs/User/properties/user_id"]
            }
        });
        let mapping = parse_field_mapping(&json);
        assert!(mapping.contains_key("userId"));
        assert_eq!(mapping["userId"].snake, Some("user_id".to_string()));
        assert_eq!(mapping["userId"].locations.len(), 2);
    }

    #[test]
    fn test_parse_field_mapping_shorthand() {
        let json = json!({
            "id": "/properties/id"
        });
        let mapping = parse_field_mapping(&json);
        assert_eq!(mapping["id"].locations, vec!["/properties/id"]);
    }

    #[test]
    fn test_resolve_pointer_with_mapping() {
        let schema = json!({
            "properties": {
                "user_id": {"type": "string"}
            }
        });
        let mut mapping = FieldMapping::new();
        mapping.insert(
            "userId".to_string(),
            FieldMappingEntry {
                snake: Some("user_id".to_string()),
                camel: Some("userId".to_string()),
                locations: vec!["properties/user_id".to_string()],
            },
        );
        let (node, _path) =
            resolve_pointer_with_mapping(&schema, "/properties/userId", &mapping).unwrap();
        assert_eq!(node.get("type").and_then(|v| v.as_str()), Some("string"));
    }

    #[test]
    fn test_translate_federation_field_set() {
        let mut mapping = FieldMapping::new();
        mapping.insert(
            "user_id".to_string(),
            FieldMappingEntry {
                snake: Some("user_id".to_string()),
                camel: Some("userId".to_string()),
                locations: vec![],
            },
        );
        let result = translate_federation_field_set("user_id email", &mapping, None);
        assert_eq!(result, "userId email");
    }

    #[test]
    fn test_locations_for() {
        let mut mapping = FieldMapping::new();
        mapping.insert(
            "id".to_string(),
            FieldMappingEntry {
                snake: None,
                camel: None,
                locations: vec!["/a".to_string(), "/b".to_string()],
            },
        );
        assert_eq!(locations_for(&mapping, "id").len(), 2);
        assert_eq!(locations_for(&mapping, "missing").len(), 0);
    }

    #[test]
    fn test_inverse_mapping() {
        let mut mapping = FieldMapping::new();
        mapping.insert(
            "userId".to_string(),
            FieldMappingEntry {
                snake: Some("user_id".to_string()),
                camel: Some("userId".to_string()),
                locations: vec![],
            },
        );
        let inv = inverse_mapping(&mapping);
        // After inverse, the key is the camel form, and snake becomes "userId"
        assert!(inv.contains_key("userId"));
    }
}
