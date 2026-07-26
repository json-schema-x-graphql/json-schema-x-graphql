//! Mermaid ER diagram generation from a relational schema.
//!
//! Ported from TTSE-petrified-forest's `petrified_schema.mermaid` module.

use crate::ddl::{RelationDef, TableDef};

/// Sanitize a name for Mermaid entity (alphanumeric and underscore only).
pub fn mermaid_entity_name(name: &str) -> String {
    let sanitized: String = name
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect();
    sanitized.trim_matches('_').to_string()
}

/// Ensure a type is valid for Mermaid (alphanumeric only).
pub fn mermaid_type(t: &str) -> String {
    // Normalize known compound types first
    let normalized = match t {
        "date-time" => "datetime".to_string(),
        other => other.to_string(),
    };
    let sanitized: String = normalized
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '_')
        .collect();
    if !sanitized.is_empty() && sanitized.chars().next().is_some_and(|c| c.is_alphabetic()) {
        sanitized
    } else {
        "string".to_string()
    }
}

/// Build a Mermaid ER diagram string from tables and relations.
pub fn to_mermaid_er(tables: &[TableDef], relations: &[RelationDef]) -> String {
    let mut lines: Vec<String> = vec!["erDiagram".to_string()];
    let entity_names: std::collections::HashMap<String, String> = tables
        .iter()
        .map(|t| (t.name.clone(), mermaid_entity_name(&t.name)))
        .collect();

    let fk_columns: std::collections::HashSet<(String, String)> = relations
        .iter()
        .map(|r| (r.child_table.clone(), r.fk_column.clone()))
        .collect();

    for table in tables {
        let eid = entity_names
            .get(&table.name)
            .cloned()
            .unwrap_or_else(|| mermaid_entity_name(&table.name));

        if !table.columns.is_empty() {
            lines.push(format!("    {} {{", eid));
            for col in &table.columns {
                let mut suffix = String::new();
                if let Some(ref pk) = table.primary_key {
                    if col.name == *pk {
                        suffix = " PK".to_string();
                    }
                }
                if fk_columns.contains(&(table.name.clone(), col.name.clone())) {
                    suffix = " FK".to_string();
                }
                let mtype = mermaid_type(&col.sql_type);
                lines.push(format!("        {} {}{}", mtype, col.name, suffix));
            }
            lines.push("    }".to_string());
        } else {
            lines.push(format!("    {}", eid));
        }
    }

    for rel in relations {
        let parent_id = entity_names
            .get(&rel.parent_table)
            .cloned()
            .unwrap_or_else(|| mermaid_entity_name(&rel.parent_table));
        let child_id = entity_names
            .get(&rel.child_table)
            .cloned()
            .unwrap_or_else(|| mermaid_entity_name(&rel.child_table));
        lines.push(format!(
            "    {} ||--o{{ {} : \"{}\"",
            parent_id, child_id, rel.fk_column
        ));
    }

    lines.join("\n")
}

/// Build a full markdown document with the Mermaid ER diagram.
pub fn to_mermaid_markdown(
    tables: &[TableDef],
    relations: &[RelationDef],
    title: Option<&str>,
) -> String {
    let diagram = to_mermaid_er(tables, relations);
    let mut parts: Vec<String> = vec![];

    if let Some(t) = title {
        parts.push(format!("# {}", t));
        parts.push(String::new());
    }

    parts.push("```mermaid".to_string());
    parts.push(diagram);
    parts.push("```".to_string());
    parts.join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ddl::{ColumnDef, RelationDef, TableDef};

    fn sample_tables() -> Vec<TableDef> {
        vec![
            TableDef {
                name: "contract".to_string(),
                columns: vec![
                    ColumnDef {
                        name: "id".to_string(),
                        sql_type: "STRING".to_string(),
                        nullable: false,
                        description: None,
                        enum_values: None,
                    },
                    ColumnDef {
                        name: "name".to_string(),
                        sql_type: "STRING".to_string(),
                        nullable: true,
                        description: None,
                        enum_values: None,
                    },
                ],
                primary_key: Some("id".to_string()),
                description: None,
            },
            TableDef {
                name: "contract_vendor".to_string(),
                columns: vec![
                    ColumnDef {
                        name: "contract_id".to_string(),
                        sql_type: "STRING".to_string(),
                        nullable: false,
                        description: None,
                        enum_values: None,
                    },
                    ColumnDef {
                        name: "name".to_string(),
                        sql_type: "STRING".to_string(),
                        nullable: true,
                        description: None,
                        enum_values: None,
                    },
                ],
                primary_key: None,
                description: None,
            },
        ]
    }

    fn sample_relations() -> Vec<RelationDef> {
        vec![RelationDef {
            parent_table: "contract".to_string(),
            child_table: "contract_vendor".to_string(),
            fk_column: "contract_id".to_string(),
        }]
    }

    #[test]
    fn test_mermaid_entity_name() {
        assert_eq!(mermaid_entity_name("contract-vendor"), "contract_vendor");
        assert_eq!(mermaid_entity_name("simple"), "simple");
        assert_eq!(mermaid_entity_name("_test_"), "test");
    }

    #[test]
    fn test_mermaid_type() {
        assert_eq!(mermaid_type("STRING"), "STRING");
        assert_eq!(mermaid_type("date-time"), "datetime");
        assert_eq!(mermaid_type("123_invalid"), "string");
    }

    #[test]
    fn test_to_mermaid_er() {
        let diagram = to_mermaid_er(&sample_tables(), &sample_relations());
        assert!(diagram.contains("erDiagram"));
        assert!(diagram.contains("contract"));
        assert!(diagram.contains("contract_vendor"));
        assert!(diagram.contains("||--o{"));
        assert!(diagram.contains("PK"));
        assert!(diagram.contains("FK"));
    }

    #[test]
    fn test_to_mermaid_markdown() {
        let md = to_mermaid_markdown(&sample_tables(), &sample_relations(), Some("Test Schema"));
        assert!(md.contains("# Test Schema"));
        assert!(md.contains("```mermaid"));
        assert!(md.contains("erDiagram"));
    }
}
