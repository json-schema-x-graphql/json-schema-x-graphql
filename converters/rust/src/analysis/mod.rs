//! Schema analysis module.
//!
//! Computes statistics, structural metrics, reference graphs,
//! diffs, and coverage reports for JSON Schemas. Used for schema
//! governance, multi-source unification, and CI/CD validation.

pub mod coverage;
pub mod diff;

use serde_json::Value;
use std::collections::{HashMap, HashSet};

/// Statistics for a single definition in a JSON Schema.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct DefinitionStats {
    pub name: String,
    pub kind: String, // object, array, string, number, etc.
    pub field_count: usize,
    pub required_count: usize,
    pub nullable_count: usize,
    pub description: Option<String>,
    pub has_federation_key: bool,
    pub has_skip_fields: bool,
}

/// Summary statistics for a JSON Schema.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct SchemaStats {
    /// Total number of definitions in $defs/definitions
    pub total_definitions: usize,
    /// Definitions grouped by kind (object, array, enum, etc.)
    pub by_kind: HashMap<String, usize>,
    /// Per-definition statistics
    pub definitions: Vec<DefinitionStats>,
    /// Total field count across all object definitions
    pub total_fields: usize,
    /// Maximum nesting depth observed
    pub max_depth: usize,
    /// Definitions with federation keys
    pub federated_types: Vec<String>,
    /// All field names across all object types
    pub all_field_names: HashSet<String>,
    /// Number of unique field names
    pub unique_field_count: usize,
    /// Total $ref count
    pub ref_count: usize,
}

/// Compute statistics for a JSON Schema.
pub fn compute_stats(schema: &Value) -> SchemaStats {
    let mut stats = SchemaStats::default();
    let obj = match schema.as_object() {
        Some(o) => o,
        None => return stats,
    };

    let defs = obj
        .get("$defs")
        .or_else(|| obj.get("definitions"))
        .and_then(|d| d.as_object());

    let defs_obj = match defs {
        Some(d) => d,
        None => return stats,
    };

    stats.total_definitions = defs_obj.len();

    for (name, def_schema) in defs_obj {
        let def_stats = compute_definition_stats(name, def_schema);
        *stats.by_kind.entry(def_stats.kind.clone()).or_insert(0) += 1;
        stats.total_fields += def_stats.field_count;
        if def_stats.has_federation_key {
            stats.federated_types.push(name.clone());
        }
        for field_name in collect_field_names(def_schema) {
            stats.all_field_names.insert(field_name);
        }
        stats.definitions.push(def_stats);
    }

    stats.unique_field_count = stats.all_field_names.len();
    stats.ref_count = count_refs(schema);
    stats.max_depth = compute_max_depth(schema, 0);

    stats
}

fn compute_definition_stats(name: &str, def_schema: &Value) -> DefinitionStats {
    let mut stats = DefinitionStats {
        name: name.to_string(),
        ..Default::default()
    };

    if let Value::Object(obj) = def_schema {
        stats.description = obj
            .get("description")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        // Determine kind
        stats.kind = determine_kind(obj);

        // Federation key presence
        stats.has_federation_key = obj.contains_key("x-graphql-federation-keys")
            || obj.contains_key("x-graphql-federation-key")
            || obj
                .get("x-graphql-federation")
                .and_then(|f| f.as_object())
                .is_some_and(|f| f.contains_key("keys"));

        // Field-level stats
        if let Some(properties) = obj.get("properties").and_then(|p| p.as_object()) {
            stats.field_count = properties.len();
            let required = obj
                .get("required")
                .and_then(|r| r.as_array())
                .map(|arr| arr.len())
                .unwrap_or(0);
            stats.required_count = required;

            // Count nullable (non-required) fields
            stats.nullable_count = properties.len().saturating_sub(required);

            // Skip field check
            stats.has_skip_fields = properties
                .iter()
                .any(|(_, v)| v.get("x-graphql-skip").and_then(|s| s.as_bool()) == Some(true));
        }
    }

    stats
}

fn determine_kind(obj: &serde_json::Map<String, Value>) -> String {
    // x-graphql-type-kind takes precedence
    if let Some(kind) = obj.get("x-graphql-type-kind").and_then(|v| v.as_str()) {
        return kind.to_string();
    }
    // x-graphql-enum indicates enum
    if obj.contains_key("x-graphql-enum") {
        return "ENUM".to_string();
    }
    // x-graphql-scalar indicates scalar
    if obj.contains_key("x-graphql-scalar") {
        return "SCALAR".to_string();
    }
    // x-graphql-union indicates union
    if obj.contains_key("x-graphql-union") {
        return "UNION".to_string();
    }
    // Standard JSON Schema type
    if let Some(t) = obj.get("type") {
        match t {
            Value::String(s) => return s.to_uppercase(),
            Value::Array(arr) => {
                if let Some(first) = arr.iter().find(|v| v.as_str() != Some("null")) {
                    if let Some(s) = first.as_str() {
                        return s.to_uppercase();
                    }
                }
            }
            _ => {}
        }
    }
    "UNKNOWN".to_string()
}

fn collect_field_names(def_schema: &Value) -> HashSet<String> {
    let mut names = HashSet::new();
    if let Value::Object(obj) = def_schema {
        if let Some(properties) = obj.get("properties").and_then(|p| p.as_object()) {
            for key in properties.keys() {
                names.insert(key.clone());
            }
        }
    }
    names
}

fn count_refs(schema: &Value) -> usize {
    let mut count = 0;
    count_refs_recursive(schema, &mut count);
    count
}

fn count_refs_recursive(value: &Value, count: &mut usize) {
    match value {
        Value::Object(obj) => {
            if obj.contains_key("$ref") {
                *count += 1;
            }
            for v in obj.values() {
                count_refs_recursive(v, count);
            }
        }
        Value::Array(arr) => {
            for v in arr {
                count_refs_recursive(v, count);
            }
        }
        _ => {}
    }
}

fn compute_max_depth(value: &Value, current: usize) -> usize {
    match value {
        Value::Object(obj) => {
            let mut max = current;
            for v in obj.values() {
                let d = compute_max_depth(v, current + 1);
                if d > max {
                    max = d;
                }
            }
            max
        }
        Value::Array(arr) => {
            let mut max = current;
            for v in arr {
                let d = compute_max_depth(v, current + 1);
                if d > max {
                    max = d;
                }
            }
            max
        }
        _ => current,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_compute_stats_empty_schema() {
        let schema = json!({});
        let stats = compute_stats(&schema);
        assert_eq!(stats.total_definitions, 0);
        assert_eq!(stats.total_fields, 0);
    }

    #[test]
    fn test_compute_stats_basic() {
        let schema = json!({
            "$defs": {
                "User": {
                    "type": "object",
                    "description": "A user",
                    "x-graphql-type-name": "User",
                    "required": ["id"],
                    "properties": {
                        "id": {"type": "string"},
                        "name": {"type": "string"},
                        "email": {"type": "string"}
                    }
                },
                "Status": {
                    "type": "string",
                    "enum": ["ACTIVE", "INACTIVE"]
                }
            }
        });
        let stats = compute_stats(&schema);
        assert_eq!(stats.total_definitions, 2);
        assert_eq!(stats.total_fields, 3);
        assert_eq!(stats.by_kind.get("OBJECT").copied().unwrap_or(0), 1);
        assert_eq!(stats.by_kind.get("STRING").copied().unwrap_or(0), 1);
    }

    #[test]
    fn test_federation_key_detection() {
        let schema = json!({
            "$defs": {
                "User": {
                    "type": "object",
                    "x-graphql-federation-keys": ["id"]
                },
                "Order": {
                    "type": "object",
                    "x-graphql-federation": {
                        "keys": ["orderId"]
                    }
                },
                "Product": {
                    "type": "object"
                }
            }
        });
        let stats = compute_stats(&schema);
        assert_eq!(stats.federated_types.len(), 2);
        assert!(stats.federated_types.contains(&"User".to_string()));
        assert!(stats.federated_types.contains(&"Order".to_string()));
    }

    #[test]
    fn test_unique_field_count() {
        let schema = json!({
            "$defs": {
                "User": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "name": {"type": "string"}
                    }
                },
                "Order": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "total": {"type": "number"}
                    }
                }
            }
        });
        let stats = compute_stats(&schema);
        assert_eq!(stats.unique_field_count, 3); // id, name, total
    }

    #[test]
    fn test_count_refs() {
        let schema = json!({
            "$defs": {
                "User": {
                    "type": "object",
                    "properties": {
                        "address": {"$ref": "#/$defs/Address"},
                        "orders": {
                            "type": "array",
                            "items": {"$ref": "#/$defs/Order"}
                        }
                    }
                }
            }
        });
        let stats = compute_stats(&schema);
        assert_eq!(stats.ref_count, 2);
    }
}
