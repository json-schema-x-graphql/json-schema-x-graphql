//! Schema diff engine.
//!
//! Compares two JSON Schemas and reports differences in types,
//! fields, and metadata.

use serde_json::Value;
use std::collections::{HashMap, HashSet};

/// Severity of a schema difference.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum DiffSeverity {
    /// Type or field added (informational)
    Added,
    /// Type or field removed (potential breaking change)
    Removed,
    /// Type or field changed in a non-breaking way
    Modified,
}

/// Category of schema difference.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum DiffCategory {
    Type,
    Field,
    FieldType,
    FieldRequired,
    Federation,
    Metadata,
}

/// A single schema difference.
#[derive(Debug, Clone)]
pub struct Diff {
    pub category: DiffCategory,
    pub severity: DiffSeverity,
    pub path: String,
    pub message: String,
}

/// Overall diff result.
#[derive(Debug, Clone, Default)]
pub struct DiffResult {
    pub diffs: Vec<Diff>,
    pub breaking_changes: usize,
    pub non_breaking_changes: usize,
}

impl DiffResult {
    pub fn is_compatible(&self) -> bool {
        self.breaking_changes == 0
    }

    pub fn total(&self) -> usize {
        self.diffs.len()
    }
}

/// Compare two JSON Schemas and return differences.
///
/// Uses $defs/definitions as the comparison basis.
pub fn diff_schemas(old: &Value, new: &Value) -> DiffResult {
    let mut diffs = Vec::new();
    let old_defs = extract_defs_map(old);
    let new_defs = extract_defs_map(new);

    let old_names: HashSet<&String> = old_defs.keys().collect();
    let new_names: HashSet<&String> = new_defs.keys().collect();

    // Added types
    for added in new_names.difference(&old_names) {
        diffs.push(Diff {
            category: DiffCategory::Type,
            severity: DiffSeverity::Added,
            path: format!("$.$defs.{}", added),
            message: format!("Type '{}' was added", added),
        });
    }

    // Removed types
    for removed in old_names.difference(&new_names) {
        diffs.push(Diff {
            category: DiffCategory::Type,
            severity: DiffSeverity::Removed,
            path: format!("$.$defs.{}", removed),
            message: format!("Type '{}' was removed", removed),
        });
    }

    // Modified types
    for common in old_names.intersection(&new_names) {
        let old_def = &old_defs[*common];
        let new_def = &new_defs[*common];
        diff_type_definition(common, old_def, new_def, &mut diffs);
    }

    // Compute severity counts
    let breaking = diffs
        .iter()
        .filter(|d| matches!(d.severity, DiffSeverity::Removed))
        .count();
    let non_breaking = diffs
        .iter()
        .filter(|d| !matches!(d.severity, DiffSeverity::Removed))
        .count();

    DiffResult {
        diffs,
        breaking_changes: breaking,
        non_breaking_changes: non_breaking,
    }
}

fn extract_defs_map(schema: &Value) -> HashMap<String, Value> {
    let obj = match schema.as_object() {
        Some(o) => o,
        None => return HashMap::new(),
    };
    let defs = obj
        .get("$defs")
        .or_else(|| obj.get("definitions"))
        .and_then(|d| d.as_object())
        .map(|m| m.iter().map(|(k, v)| (k.clone(), v.clone())).collect());
    defs.unwrap_or_default()
}

fn diff_type_definition(name: &str, old: &Value, new: &Value, diffs: &mut Vec<Diff>) {
    let old_obj = match old.as_object() {
        Some(o) => o,
        None => return,
    };
    let new_obj = match new.as_object() {
        Some(o) => o,
        None => return,
    };

    // Check kind change
    let old_kind = old_obj
        .get("type")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");
    let new_kind = new_obj
        .get("type")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");
    if old_kind != new_kind {
        diffs.push(Diff {
            category: DiffCategory::FieldType,
            severity: DiffSeverity::Modified,
            path: format!("$.$defs.{}.type", name),
            message: format!(
                "Type '{}' changed kind: '{}' → '{}'",
                name, old_kind, new_kind
            ),
        });
    }

    // Check field additions/removals
    let old_props: HashSet<String> = old_obj
        .get("properties")
        .and_then(|p| p.as_object())
        .map(|p| p.keys().cloned().collect())
        .unwrap_or_default();
    let new_props: HashSet<String> = new_obj
        .get("properties")
        .and_then(|p| p.as_object())
        .map(|p| p.keys().cloned().collect())
        .unwrap_or_default();

    for added in new_props.difference(&old_props) {
        diffs.push(Diff {
            category: DiffCategory::Field,
            severity: DiffSeverity::Added,
            path: format!("$.$defs.{}.properties.{}", name, added),
            message: format!("Type '{}': field '{}' was added", name, added),
        });
    }

    for removed in old_props.difference(&new_props) {
        diffs.push(Diff {
            category: DiffCategory::Field,
            severity: DiffSeverity::Removed,
            path: format!("$.$defs.{}.properties.{}", name, removed),
            message: format!("Type '{}': field '{}' was removed", name, removed),
        });
    }

    // Check required field changes
    let old_required: HashSet<String> = old_obj
        .get("required")
        .and_then(|r| r.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();
    let new_required: HashSet<String> = new_obj
        .get("required")
        .and_then(|r| r.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();

    // Required → optional (non-breaking)
    for optional in old_required.difference(&new_required) {
        if new_props.contains(optional) {
            diffs.push(Diff {
                category: DiffCategory::FieldRequired,
                severity: DiffSeverity::Modified,
                path: format!("$.$defs.{}.required", name),
                message: format!("Type '{}': field '{}' is now optional", name, optional),
            });
        }
    }

    // Optional → required (breaking for clients)
    for required in new_required.difference(&old_required) {
        diffs.push(Diff {
            category: DiffCategory::FieldRequired,
            severity: DiffSeverity::Removed,
            path: format!("$.$defs.{}.required", name),
            message: format!(
                "Type '{}': field '{}' is now required (breaking change)",
                name, required
            ),
        });
    }

    // Federation key changes
    let old_fed = old_obj.contains_key("x-graphql-federation-keys")
        || old_obj.contains_key("x-graphql-federation-key");
    let new_fed = new_obj.contains_key("x-graphql-federation-keys")
        || new_obj.contains_key("x-graphql-federation-key");

    if old_fed && !new_fed {
        diffs.push(Diff {
            category: DiffCategory::Federation,
            severity: DiffSeverity::Removed,
            path: format!("$.$defs.{}.x-graphql-federation-keys", name),
            message: format!(
                "Type '{}': federation key was removed (breaking change)",
                name
            ),
        });
    }
}

/// Generate a human-readable summary of a diff.
pub fn format_diff_summary(result: &DiffResult) -> String {
    let mut lines: Vec<String> = vec![];
    lines.push(format!("Schema diff: {} total changes", result.total()));
    lines.push(format!("  Breaking changes: {}", result.breaking_changes));
    lines.push(format!(
        "  Non-breaking changes: {}",
        result.non_breaking_changes
    ));
    lines.push(String::new());
    for diff in &result.diffs {
        let marker = match diff.severity {
            DiffSeverity::Added => "+",
            DiffSeverity::Removed => "-",
            DiffSeverity::Modified => "~",
        };
        lines.push(format!("[{}] {}: {}", marker, diff.path, diff.message));
    }
    lines.join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_no_diff_identical() {
        let schema = json!({
            "$defs": {
                "User": {
                    "type": "object",
                    "properties": {"id": {"type": "string"}}
                }
            }
        });
        let result = diff_schemas(&schema, &schema);
        assert_eq!(result.total(), 0);
    }

    #[test]
    fn test_added_type() {
        let old = json!({"$defs": {"User": {"type": "object"}}});
        let new = json!({
            "$defs": {
                "User": {"type": "object"},
                "Order": {"type": "object"}
            }
        });
        let result = diff_schemas(&old, &new);
        assert!(result
            .diffs
            .iter()
            .any(|d| d.message.contains("Order") && matches!(d.severity, DiffSeverity::Added)));
    }

    #[test]
    fn test_removed_type_breaking() {
        let old = json!({
            "$defs": {
                "User": {"type": "object"},
                "Order": {"type": "object"}
            }
        });
        let new = json!({"$defs": {"User": {"type": "object"}}});
        let result = diff_schemas(&old, &new);
        assert_eq!(result.breaking_changes, 1);
        assert!(!result.is_compatible());
    }

    #[test]
    fn test_added_field_non_breaking() {
        let old = json!({
            "$defs": {
                "User": {
                    "type": "object",
                    "properties": {"id": {"type": "string"}}
                }
            }
        });
        let new = json!({
            "$defs": {
                "User": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "name": {"type": "string"}
                    }
                }
            }
        });
        let result = diff_schemas(&old, &new);
        assert!(result.is_compatible());
        assert!(result
            .diffs
            .iter()
            .any(|d| d.message.contains("name") && matches!(d.severity, DiffSeverity::Added)));
    }

    #[test]
    fn test_required_change_breaking() {
        let old = json!({
            "$defs": {
                "User": {
                    "type": "object",
                    "required": ["id"],
                    "properties": {"id": {"type": "string"}}
                }
            }
        });
        let new = json!({
            "$defs": {
                "User": {
                    "type": "object",
                    "required": ["id", "email"],
                    "properties": {
                        "id": {"type": "string"},
                        "email": {"type": "string"}
                    }
                }
            }
        });
        let result = diff_schemas(&old, &new);
        // Adding new field and making it required is breaking
        assert!(!result.is_compatible());
    }

    #[test]
    fn test_format_diff_summary() {
        let old = json!({"$defs": {"A": {"type": "object"}}});
        let new = json!({"$defs": {"B": {"type": "object"}}});
        let result = diff_schemas(&old, &new);
        let summary = format_diff_summary(&result);
        assert!(summary.contains("Breaking changes"));
        assert!(summary.contains("Type 'A' was removed"));
        assert!(summary.contains("Type 'B' was added"));
    }
}
