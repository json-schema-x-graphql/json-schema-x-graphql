//! Schema → Relational DDL pipeline.
//!
//! Decomposes a JSON Schema into relational tables and parent/child
//! relations, then emits Spark/Delta-compatible `CREATE TABLE` DDL.

use serde_json::Value;
use std::collections::HashSet;

/// Definition of a single column in a table.
#[derive(Debug, Clone, PartialEq)]
pub struct ColumnDef {
    pub name: String,
    pub sql_type: String, // STRING, BIGINT, DOUBLE, BOOLEAN, TIMESTAMP, DATE
    pub nullable: bool,
    pub description: Option<String>,
    pub enum_values: Option<Vec<String>>,
}

/// Definition of a single table.
#[derive(Debug, Clone)]
pub struct TableDef {
    pub name: String,
    pub columns: Vec<ColumnDef>,
    pub primary_key: Option<String>,
    pub description: Option<String>,
}

/// Parent/child relation: child table has FK column pointing to parent.
#[derive(Debug, Clone)]
pub struct RelationDef {
    pub parent_table: String,
    pub child_table: String,
    pub fk_column: String,
}

/// Result of decomposing a schema into tables and relations.
#[derive(Debug, Clone, Default)]
pub struct RelationalSchema {
    pub tables: Vec<TableDef>,
    pub relations: Vec<RelationDef>,
}

/// Decompose a JSON Schema into relational tables.
///
/// Reads the schema's `root_def` definition (default: `contract`) and
/// walks its object/array structure to produce tables and relations.
///
/// Objects become tables. Arrays of objects become child tables (1:N).
/// Arrays of scalars become tables with `value` and `ordinal` columns.
/// Nested objects become 1:1 child tables with FK.
pub fn schema_to_relational(schema: &Value, root_def: &str) -> RelationalSchema {
    let mut result = RelationalSchema::default();

    let obj = match schema.as_object() {
        Some(o) => o,
        None => return result,
    };

    let defs = obj
        .get("$defs")
        .or_else(|| obj.get("definitions"))
        .and_then(|d| d.as_object());

    let defs_obj = match defs {
        Some(d) => d,
        None => return result,
    };

    let root_node = match defs_obj.get(root_def) {
        Some(n) => n,
        None => return result,
    };

    let required: HashSet<String> = root_node
        .get("required")
        .and_then(|r| r.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();

    walk_node(
        root_node,
        root_def,
        &[root_def.to_string()],
        &required,
        &mut result,
    );

    // Ensure top-level FK relations are properly set up
    result
}

/// Walk a schema node and produce tables/relations.
///
/// Returns the table name for this node (if it created a table) or None.
fn walk_node(
    node: &Value,
    table_name: &str,
    path: &[String],
    required: &HashSet<String>,
    result: &mut RelationalSchema,
) -> Option<String> {
    if !is_object(node) {
        return None;
    }

    let obj = node.as_object().unwrap();
    let mut columns: Vec<ColumnDef> = vec![];

    let properties = obj.get("properties").and_then(|p| p.as_object());

    if let Some(props) = properties {
        for (prop_name, prop_schema) in props {
            let prop_required = required.contains(prop_name);
            let nullable = !prop_required;

            if is_scalar_or_enum(prop_schema) {
                let sql_type = map_json_type_to_sql(prop_schema);
                let enum_values = get_enum_values(prop_schema);
                let description = prop_schema
                    .get("description")
                    .and_then(|v| v.as_str())
                    .map(String::from);
                columns.push(ColumnDef {
                    name: prop_name.clone(),
                    sql_type,
                    nullable,
                    description,
                    enum_values,
                });
            } else if is_object(prop_schema) {
                // Nested object → child table (1:1)
                let mut child_path = path.to_vec();
                child_path.push(prop_name.clone());
                let child_table_name = child_path.join("_");
                let child_required: HashSet<String> = prop_schema
                    .get("required")
                    .and_then(|r| r.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|v| v.as_str().map(String::from))
                            .collect()
                    })
                    .unwrap_or_default();

                if let Some(child_table) = walk_node(
                    prop_schema,
                    &child_table_name,
                    &child_path,
                    &child_required,
                    result,
                ) {
                    // Add FK column to child table
                    let fk_col = format!("{}_id", table_name);
                    result.relations.push(RelationDef {
                        parent_table: table_name.to_string(),
                        child_table: child_table.clone(),
                        fk_column: fk_col.clone(),
                    });

                    // Add the FK column to the child table definition
                    if let Some(td) = result.tables.iter_mut().find(|t| t.name == child_table) {
                        // Only add if not already present
                        if !td.columns.iter().any(|c| c.name == fk_col) {
                            td.columns.insert(
                                0,
                                ColumnDef {
                                    name: fk_col,
                                    sql_type: "STRING".to_string(),
                                    nullable: false,
                                    description: Some("FK to parent".to_string()),
                                    enum_values: None,
                                },
                            );
                        }
                    }
                }
            } else if is_array(prop_schema) {
                // Array → child table (1:N)
                let items = prop_schema.get("items");
                if let Some(items) = items {
                    let mut child_path = path.to_vec();
                    child_path.push(prop_name.clone());
                    let child_table_name = child_path.join("_");
                    let fk_col = format!("{}_id", table_name);

                    if is_scalar_or_enum(items) {
                        // Array of scalars
                        let sql_type = map_json_type_to_sql(items);
                        result.tables.push(TableDef {
                            name: child_table_name.clone(),
                            columns: vec![
                                ColumnDef {
                                    name: fk_col.clone(),
                                    sql_type: "STRING".to_string(),
                                    nullable: false,
                                    description: Some("FK to parent".to_string()),
                                    enum_values: None,
                                },
                                ColumnDef {
                                    name: "value".to_string(),
                                    sql_type,
                                    nullable: true,
                                    description: None,
                                    enum_values: None,
                                },
                                ColumnDef {
                                    name: "ordinal".to_string(),
                                    sql_type: "BIGINT".to_string(),
                                    nullable: false,
                                    description: None,
                                    enum_values: None,
                                },
                            ],
                            primary_key: None,
                            description: prop_schema
                                .get("description")
                                .and_then(|v| v.as_str())
                                .map(String::from),
                        });
                        result.relations.push(RelationDef {
                            parent_table: table_name.to_string(),
                            child_table: child_table_name,
                            fk_column: fk_col,
                        });
                    } else if is_object(items) {
                        // Array of objects
                        let child_required: HashSet<String> = items
                            .get("required")
                            .and_then(|r| r.as_array())
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|v| v.as_str().map(String::from))
                                    .collect()
                            })
                            .unwrap_or_default();
                        if let Some(child_table) = walk_node(
                            items,
                            &child_table_name,
                            &child_path,
                            &child_required,
                            result,
                        ) {
                            if let Some(td) =
                                result.tables.iter_mut().find(|t| t.name == child_table)
                            {
                                if !td.columns.iter().any(|c| c.name == fk_col) {
                                    td.columns.insert(
                                        0,
                                        ColumnDef {
                                            name: fk_col.clone(),
                                            sql_type: "STRING".to_string(),
                                            nullable: false,
                                            description: Some("FK to parent".to_string()),
                                            enum_values: None,
                                        },
                                    );
                                }
                            }
                            result.relations.push(RelationDef {
                                parent_table: table_name.to_string(),
                                child_table: child_table.clone(),
                                fk_column: fk_col,
                            });
                        }
                    }
                }
            }
        }
    }

    // Infer primary key
    let pk = infer_primary_key(&columns);
    let description = obj
        .get("description")
        .and_then(|v| v.as_str())
        .map(String::from);

    result.tables.push(TableDef {
        name: table_name.to_string(),
        columns,
        primary_key: pk,
        description,
    });

    Some(table_name.to_string())
}

fn is_object(v: &Value) -> bool {
    v.get("type").and_then(|t| t.as_str()) == Some("object")
        || (v.get("type").is_none() && v.get("properties").is_some())
}

fn is_array(v: &Value) -> bool {
    v.get("type").and_then(|t| t.as_str()) == Some("array")
}

fn is_scalar_or_enum(v: &Value) -> bool {
    let kind = v
        .get("type")
        .and_then(|t| t.as_str())
        .or_else(|| {
            // Handle type arrays like ["string", "null"]
            v.get("type").and_then(|t| t.as_array()).and_then(|arr| {
                arr.iter()
                    .find(|t| t.as_str() != Some("null"))
                    .and_then(|t| t.as_str())
            })
        })
        .unwrap_or("");
    matches!(
        kind,
        "string" | "number" | "integer" | "boolean" | "date-time" | "date" | "enum"
    )
}

fn map_json_type_to_sql(v: &Value) -> String {
    // Check for explicit format first
    if let Some(format) = v.get("format").and_then(|f| f.as_str()) {
        if format == "date-time" {
            return "TIMESTAMP".to_string();
        }
        if format == "date" {
            return "DATE".to_string();
        }
    }

    // Check for enum
    if v.get("enum").is_some() {
        return "STRING".to_string();
    }

    let kind = v
        .get("type")
        .and_then(|t| t.as_str())
        .or_else(|| {
            v.get("type").and_then(|t| t.as_array()).and_then(|arr| {
                arr.iter()
                    .find(|t| t.as_str() != Some("null"))
                    .and_then(|t| t.as_str())
            })
        })
        .unwrap_or("string");

    match kind {
        "string" => "STRING".to_string(),
        "integer" => "BIGINT".to_string(), // unbounded → BIGINT
        "number" => "DOUBLE".to_string(),
        "boolean" => "BOOLEAN".to_string(),
        "date-time" => "TIMESTAMP".to_string(),
        "date" => "DATE".to_string(),
        _ => "STRING".to_string(),
    }
}

fn get_enum_values(v: &Value) -> Option<Vec<String>> {
    v.get("enum").and_then(|e| e.as_array()).map(|arr| {
        arr.iter()
            .filter_map(|x| match x {
                Value::String(s) => Some(s.clone()),
                Value::Number(n) => Some(n.to_string()),
                _ => None,
            })
            .collect()
    })
}

fn infer_primary_key(columns: &[ColumnDef]) -> Option<String> {
    // Prefer non-nullable `id` or `global_record_id`
    for preferred in &["id", "global_record_id"] {
        if let Some(col) = columns.iter().find(|c| c.name == *preferred) {
            if !col.nullable {
                return Some(preferred.to_string());
            }
        }
    }
    // Otherwise, sole non-nullable column
    let non_nullable: Vec<&ColumnDef> = columns.iter().filter(|c| !c.nullable).collect();
    if non_nullable.len() == 1 {
        Some(non_nullable[0].name.clone())
    } else {
        None
    }
}

/// Generate Spark/Delta DDL for a relational schema.
pub fn generate_ddl(schema: &RelationalSchema, using_delta: bool) -> String {
    let mut out = String::new();

    for table in &schema.tables {
        out.push_str(&format!("CREATE TABLE IF NOT EXISTS {} (\n", table.name));
        let col_strs: Vec<String> = table
            .columns
            .iter()
            .map(|c| format!("  {} {}", c.name, c.sql_type,))
            .collect();
        out.push_str(&col_strs.join(",\n"));
        out.push_str("\n)");

        if using_delta {
            out.push_str(" USING DELTA");
        }
        out.push_str(";\n\n");
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_schema_to_relational_simple() {
        let schema = json!({
            "$defs": {
                "contract": {
                    "type": "object",
                    "description": "A contract",
                    "required": ["id", "name"],
                    "properties": {
                        "id": {"type": "string", "format": "uuid"},
                        "name": {"type": "string"},
                        "amount": {"type": "number"}
                    }
                }
            }
        });
        let rel = schema_to_relational(&schema, "contract");
        assert_eq!(rel.tables.len(), 1);
        assert_eq!(rel.tables[0].name, "contract");
        assert_eq!(rel.tables[0].columns.len(), 3);
        assert_eq!(rel.tables[0].primary_key, Some("id".to_string()));
    }

    #[test]
    fn test_schema_to_relational_nested_object() {
        let schema = json!({
            "$defs": {
                "contract": {
                    "type": "object",
                    "required": ["id"],
                    "properties": {
                        "id": {"type": "string"},
                        "vendor": {
                            "type": "object",
                            "required": ["name"],
                            "properties": {
                                "name": {"type": "string"},
                                "uei": {"type": "string"}
                            }
                        }
                    }
                }
            }
        });
        let rel = schema_to_relational(&schema, "contract");
        assert_eq!(rel.tables.len(), 2);
        assert!(rel.tables.iter().any(|t| t.name == "contract"));
        assert!(rel.tables.iter().any(|t| t.name == "contract_vendor"));
        assert_eq!(rel.relations.len(), 1);
        assert_eq!(rel.relations[0].parent_table, "contract");
        assert_eq!(rel.relations[0].child_table, "contract_vendor");
    }

    #[test]
    fn test_schema_to_relational_array_of_objects() {
        let schema = json!({
            "$defs": {
                "contract": {
                    "type": "object",
                    "required": ["id"],
                    "properties": {
                        "id": {"type": "string"},
                        "line_items": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "required": ["amount"],
                                "properties": {
                                    "amount": {"type": "number"},
                                    "description": {"type": "string"}
                                }
                            }
                        }
                    }
                }
            }
        });
        let rel = schema_to_relational(&schema, "contract");
        assert!(rel.tables.iter().any(|t| t.name == "contract_line_items"));
    }

    #[test]
    fn test_schema_to_relational_array_of_scalars() {
        let schema = json!({
            "$defs": {
                "contract": {
                    "type": "object",
                    "required": ["id"],
                    "properties": {
                        "id": {"type": "string"},
                        "tags": {
                            "type": "array",
                            "items": {"type": "string"}
                        }
                    }
                }
            }
        });
        let rel = schema_to_relational(&schema, "contract");
        let tags_table = rel
            .tables
            .iter()
            .find(|t| t.name == "contract_tags")
            .unwrap();
        // Should have FK, value, ordinal columns
        assert!(tags_table.columns.iter().any(|c| c.name == "value"));
        assert!(tags_table.columns.iter().any(|c| c.name == "ordinal"));
    }

    #[test]
    fn test_map_json_type_to_sql() {
        assert_eq!(map_json_type_to_sql(&json!({"type": "string"})), "STRING");
        assert_eq!(map_json_type_to_sql(&json!({"type": "integer"})), "BIGINT");
        assert_eq!(map_json_type_to_sql(&json!({"type": "number"})), "DOUBLE");
        assert_eq!(map_json_type_to_sql(&json!({"type": "boolean"})), "BOOLEAN");
        assert_eq!(
            map_json_type_to_sql(&json!({"type": "string", "format": "date-time"})),
            "TIMESTAMP"
        );
        assert_eq!(
            map_json_type_to_sql(&json!({"type": "string", "format": "date"})),
            "DATE"
        );
    }

    #[test]
    fn test_generate_ddl() {
        let schema = json!({
            "$defs": {
                "User": {
                    "type": "object",
                    "required": ["id"],
                    "properties": {
                        "id": {"type": "string"},
                        "name": {"type": "string"}
                    }
                }
            }
        });
        let rel = schema_to_relational(&schema, "User");
        let ddl = generate_ddl(&rel, true);
        assert!(ddl.contains("CREATE TABLE"));
        assert!(ddl.contains("USING DELTA"));
        assert!(ddl.contains("id STRING"));
    }

    #[test]
    fn test_infer_primary_key() {
        let columns = vec![
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
        ];
        assert_eq!(infer_primary_key(&columns), Some("id".to_string()));
    }
}
