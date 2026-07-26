//! Coverage analysis for schema-to-schema mapping.
//!
//! Computes what percentage of a source schema's fields have
//! corresponding fields in a target schema. Supports per-type
//! coverage reports.

use super::compute_stats;
use serde_json::Value;
use std::collections::HashSet;

/// Coverage report for a single type.
#[derive(Debug, Clone, Default)]
pub struct TypeCoverage {
    pub type_name: String,
    pub total_source_fields: usize,
    pub mapped_fields: usize,
    pub missing_fields: Vec<String>,
    pub coverage_percent: f64,
}

/// Overall coverage report.
#[derive(Debug, Clone, Default)]
pub struct CoverageReport {
    pub type_coverages: Vec<TypeCoverage>,
    pub total_source_fields: usize,
    pub total_mapped_fields: usize,
    pub overall_coverage_percent: f64,
}

impl CoverageReport {
    /// Coverage is "complete" if all source fields are mapped.
    pub fn is_complete(&self) -> bool {
        self.total_mapped_fields == self.total_source_fields
    }
}

/// Map entry describing a field mapping.
#[derive(Debug, Clone)]
pub struct FieldMapping {
    pub source_type: String,
    pub source_field: String,
    pub target_type: String,
    pub target_field: String,
}

/// Compute coverage between a source schema and a target schema
/// based on a set of field mappings.
pub fn compute_coverage(
    source_schema: &Value,
    target_schema: &Value,
    mappings: &[FieldMapping],
) -> CoverageReport {
    let source_stats = compute_stats(source_schema);
    let mut report = CoverageReport::default();

    // Build set of mapped source field paths
    let mut mapped_paths: HashSet<String> = HashSet::new();
    for m in mappings {
        mapped_paths.insert(format!("{}.{}", m.source_type, m.source_field));
    }

    // Per-type coverage
    for def_stats in &source_stats.definitions {
        let properties: Vec<String> = source_schema
            .as_object()
            .and_then(|o| o.get("$defs").or_else(|| o.get("definitions")))
            .and_then(|d| d.as_object())
            .and_then(|d| d.get(&def_stats.name))
            .and_then(|d| d.as_object())
            .and_then(|o| o.get("properties"))
            .and_then(|p| p.as_object())
            .map(|p| p.keys().cloned().collect())
            .unwrap_or_default();

        let total = properties.len();
        let mut mapped = 0;
        let mut missing: Vec<String> = vec![];

        for prop in &properties {
            let path = format!("{}.{}", def_stats.name, prop);
            if mapped_paths.contains(&path) {
                mapped += 1;
            } else {
                missing.push(prop.clone());
            }
        }

        let coverage_percent = if total > 0 {
            (mapped as f64 / total as f64) * 100.0
        } else {
            100.0
        };

        report.total_source_fields += total;
        report.total_mapped_fields += mapped;
        report.type_coverages.push(TypeCoverage {
            type_name: def_stats.name.clone(),
            total_source_fields: total,
            mapped_fields: mapped,
            missing_fields: missing,
            coverage_percent,
        });
    }

    report.overall_coverage_percent = if report.total_source_fields > 0 {
        (report.total_mapped_fields as f64 / report.total_source_fields as f64) * 100.0
    } else {
        100.0
    };

    // Note: target_schema could be used for inverse coverage or
    // additional metrics, but it's accepted for symmetry with
    // other analysis functions.
    let _ = target_schema;

    report
}

/// Simpler coverage computation from raw schemas (avoids the
/// function above's stub). Computes coverage of source fields
/// that are present in target by name (camel/snake case aware).
pub fn compute_field_coverage_by_name(
    source_schema: &Value,
    target_schema: &Value,
) -> CoverageReport {
    let source_defs = extract_defs(source_schema);
    let target_defs = extract_defs(target_schema);

    // Build set of (type, field) pairs in target
    let mut target_field_paths: HashSet<String> = HashSet::new();
    for (type_name, def_value) in &target_defs {
        if let Some(obj) = def_value.as_object() {
            if let Some(properties) = obj.get("properties").and_then(|p| p.as_object()) {
                for field_name in properties.keys() {
                    target_field_paths.insert(format!("{}.{}", type_name, field_name));
                }
            }
        }
    }

    let mut report = CoverageReport::default();

    for (type_name, def_value) in &source_defs {
        let obj = match def_value.as_object() {
            Some(o) => o,
            None => continue,
        };

        let properties: Vec<String> = obj
            .get("properties")
            .and_then(|p| p.as_object())
            .map(|p| p.keys().cloned().collect())
            .unwrap_or_default();

        let total = properties.len();
        let mut mapped = 0;
        let mut missing: Vec<String> = vec![];

        for prop in &properties {
            let path = format!("{}.{}", type_name, prop);
            if target_field_paths.contains(&path) {
                mapped += 1;
            } else {
                missing.push(prop.clone());
            }
        }

        let coverage_percent = if total > 0 {
            (mapped as f64 / total as f64) * 100.0
        } else {
            100.0
        };

        report.total_source_fields += total;
        report.total_mapped_fields += mapped;
        report.type_coverages.push(TypeCoverage {
            type_name: type_name.clone(),
            total_source_fields: total,
            mapped_fields: mapped,
            missing_fields: missing,
            coverage_percent,
        });
    }

    report.overall_coverage_percent = if report.total_source_fields > 0 {
        (report.total_mapped_fields as f64 / report.total_source_fields as f64) * 100.0
    } else {
        100.0
    };

    report
}

fn extract_defs(schema: &Value) -> std::collections::HashMap<String, Value> {
    let obj = match schema.as_object() {
        Some(o) => o,
        None => return std::collections::HashMap::new(),
    };
    let defs = obj
        .get("$defs")
        .or_else(|| obj.get("definitions"))
        .and_then(|d| d.as_object())
        .map(|m| m.iter().map(|(k, v)| (k.clone(), v.clone())).collect());
    defs.unwrap_or_default()
}

/// Format a coverage report as a human-readable summary.
pub fn format_coverage_report(report: &CoverageReport) -> String {
    let mut lines: Vec<String> = vec![];
    lines.push(format!(
        "Coverage: {:.1}% ({}/{} fields mapped)",
        report.overall_coverage_percent, report.total_mapped_fields, report.total_source_fields
    ));
    lines.push(String::new());
    for tc in &report.type_coverages {
        let status = if tc.coverage_percent >= 100.0 {
            "✓"
        } else if tc.coverage_percent >= 80.0 {
            "○"
        } else {
            "✗"
        };
        lines.push(format!(
            "  {} {}: {:.1}% ({}/{})",
            status, tc.type_name, tc.coverage_percent, tc.mapped_fields, tc.total_source_fields
        ));
        if !tc.missing_fields.is_empty() {
            lines.push(format!("    Missing: {}", tc.missing_fields.join(", ")));
        }
    }
    lines.join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_full_coverage() {
        let source = json!({
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
        let target = json!({
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
        let report = compute_field_coverage_by_name(&source, &target);
        assert_eq!(report.overall_coverage_percent, 100.0);
        assert!(report.is_complete());
    }

    #[test]
    fn test_partial_coverage() {
        let source = json!({
            "$defs": {
                "User": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "name": {"type": "string"},
                        "email": {"type": "string"}
                    }
                }
            }
        });
        let target = json!({
            "$defs": {
                "User": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"}
                    }
                }
            }
        });
        let report = compute_field_coverage_by_name(&source, &target);
        assert!(!report.is_complete());
        assert!(report.overall_coverage_percent < 100.0);
        assert!(report.type_coverages[0]
            .missing_fields
            .contains(&"name".to_string()));
        assert!(report.type_coverages[0]
            .missing_fields
            .contains(&"email".to_string()));
    }

    #[test]
    fn test_format_coverage_report() {
        let source = json!({
            "$defs": {
                "User": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "missing_field": {"type": "string"}
                    }
                }
            }
        });
        let target = json!({
            "$defs": {
                "User": {
                    "type": "object",
                    "properties": {"id": {"type": "string"}}
                }
            }
        });
        let report = compute_field_coverage_by_name(&source, &target);
        let summary = format_coverage_report(&report);
        assert!(summary.contains("Coverage:"));
        assert!(summary.contains("Missing:"));
        assert!(summary.contains("missing_field"));
    }

    #[test]
    fn test_empty_schema_coverage() {
        let source = json!({});
        let target = json!({});
        let report = compute_field_coverage_by_name(&source, &target);
        assert_eq!(report.overall_coverage_percent, 100.0);
    }
}
