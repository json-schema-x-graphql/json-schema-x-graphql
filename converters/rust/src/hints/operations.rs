//! GraphQL operation type generation from x-graphql-operations extension.
//!
//! Parses the `x-graphql-operations` top-level schema extension and
//! generates `type Query`, `type Mutation`, and `type Subscription`
//! blocks in the output SDL.

use serde_json::Value as JsonValue;

/// Configuration for a single operation argument.
#[derive(Debug, Clone)]
pub struct OperationArgument {
    pub name: String,
    pub graphql_type: String,
    pub description: Option<String>,
    pub default_value: Option<String>,
}

/// Configuration for a single operation field (query/mutation/subscription).
#[derive(Debug, Clone)]
pub struct OperationField {
    pub name: String,
    pub graphql_type: String,
    pub description: Option<String>,
    pub arguments: Vec<OperationArgument>,
    pub deprecated: Option<String>, // deprecation reason
}

/// Container for all operation types.
#[derive(Debug, Clone, Default)]
pub struct OperationsConfig {
    pub queries: Vec<OperationField>,
    pub mutations: Vec<OperationField>,
    pub subscriptions: Vec<OperationField>,
}

/// Parse `x-graphql-operations` from the schema root.
///
/// Supports both formats:
/// ```json
/// {
///   "x-graphql-operations": {
///     "queries": {
///       "users": { "type": "[User!]!", "description": "..." }
///     }
///   }
/// }
/// ```
pub fn parse_operations(schema: &JsonValue) -> OperationsConfig {
    let obj = match schema.as_object() {
        Some(o) => o,
        None => return OperationsConfig::default(),
    };

    let ops = match obj.get("x-graphql-operations").and_then(|v| v.as_object()) {
        Some(o) => o,
        None => return OperationsConfig::default(),
    };

    OperationsConfig {
        queries: parse_operation_group(ops.get("queries")),
        mutations: parse_operation_group(ops.get("mutations")),
        subscriptions: parse_operation_group(ops.get("subscriptions")),
    }
}

fn parse_operation_group(group: Option<&JsonValue>) -> Vec<OperationField> {
    let fields_obj = match group.and_then(|v| v.as_object()) {
        Some(o) => o,
        None => return vec![],
    };

    fields_obj
        .iter()
        .filter_map(|(name, field_config)| {
            let field_obj = field_config.as_object()?;
            let graphql_type = field_obj
                .get("type")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| "String".to_string());
            let description = field_obj
                .get("description")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let deprecated = field_obj
                .get("deprecated")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            let arguments =
                parse_arguments(field_obj.get("args").or_else(|| field_obj.get("arguments")));

            Some(OperationField {
                name: name.clone(),
                graphql_type,
                description,
                arguments,
                deprecated,
            })
        })
        .collect()
}

fn parse_arguments(args_value: Option<&JsonValue>) -> Vec<OperationArgument> {
    let args_obj = match args_value.and_then(|v| v.as_object()) {
        Some(o) => o,
        None => return vec![],
    };

    args_obj
        .iter()
        .filter_map(|(name, arg_config)| {
            let arg_obj = arg_config.as_object()?;
            let graphql_type = arg_obj
                .get("type")
                .or_else(|| arg_obj.get("x-graphql-type"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| "String".to_string());
            let description = arg_obj
                .get("description")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let default_value = arg_obj.get("default").map(|v| match v {
                JsonValue::String(s) => format!("\"{}\"", s),
                JsonValue::Bool(b) => b.to_string(),
                JsonValue::Number(n) => n.to_string(),
                JsonValue::Null => "null".to_string(),
                other => other.to_string(),
            });

            Some(OperationArgument {
                name: name.clone(),
                graphql_type,
                description,
                default_value,
            })
        })
        .collect()
}

/// Format a description as a GraphQL block string or single-line string.
fn format_description(desc: &str, indent: &str) -> String {
    let trimmed = desc.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    if trimmed.contains('\n') {
        format!("\"\"\"\n{}\n\"\"\"", trimmed)
    } else {
        format!("{}\"\"\"{}\"\"\"", indent, trimmed)
    }
}

/// Generate SDL for an operation type (Query, Mutation, or Subscription).
pub fn generate_operation_type(
    type_name: &str,
    fields: &[OperationField],
    _existing_sdl: &str,
) -> Option<String> {
    if fields.is_empty() {
        return None;
    }

    let mut lines: Vec<String> = vec![];
    lines.push(format!("type {} {{", type_name));

    for field in fields {
        // Description
        if let Some(ref desc) = field.description {
            lines.push(format!("  {}", format_description(desc, "  ")));
        }

        // Build arguments
        let args_str = if field.arguments.is_empty() {
            String::new()
        } else {
            let arg_parts: Vec<String> = field
                .arguments
                .iter()
                .map(|arg| {
                    let mut arg_str = String::new();
                    if let Some(ref desc) = arg.description {
                        arg_str.push_str(&format!("\n    {}", format_description(desc, "    ")));
                    }
                    arg_str.push_str(&format!("    {}: {}", arg.name, arg.graphql_type));
                    if let Some(ref default) = arg.default_value {
                        arg_str.push_str(&format!(" = {}", default));
                    }
                    arg_str
                })
                .collect();
            if field.arguments.iter().any(|a| a.description.is_some()) {
                format!("(\n{}\n  )", arg_parts.join("\n"))
            } else {
                format!("({})", arg_parts.join(", "))
            }
        };

        // Field declaration
        let mut field_line = format!("  {}{}: {}", field.name, args_str, field.graphql_type);

        // Deprecated directive
        if let Some(ref reason) = field.deprecated {
            if reason.is_empty() {
                field_line.push_str(" @deprecated");
            } else {
                field_line.push_str(&format!(" @deprecated(reason: \"{}\")", reason));
            }
        }

        lines.push(field_line);
    }

    lines.push("}".to_string());
    Some(lines.join("\n"))
}

/// Generate all operation type SDL blocks.
pub fn generate_operations_sdl(config: &OperationsConfig, existing_sdl: &str) -> String {
    let mut blocks: Vec<String> = vec![];

    let query_sdl = generate_operation_type("Query", &config.queries, existing_sdl);
    let mutation_sdl = generate_operation_type("Mutation", &config.mutations, existing_sdl);
    let subscription_sdl =
        generate_operation_type("Subscription", &config.subscriptions, existing_sdl);

    if let Some(sdl) = query_sdl {
        blocks.push(sdl);
    }
    if let Some(sdl) = mutation_sdl {
        blocks.push(sdl);
    }
    if let Some(sdl) = subscription_sdl {
        blocks.push(sdl);
    }

    if blocks.is_empty() {
        return String::new();
    }

    blocks.push(String::new()); // trailing newline
    blocks.join("\n\n")
}

/// Append operation types to existing SDL.
pub fn inject_operations(sdl: &str, config: &OperationsConfig) -> String {
    let ops_sdl = generate_operations_sdl(config, sdl);
    if ops_sdl.is_empty() {
        return sdl.to_string();
    }
    format!("{}\n{}", sdl.trim_end(), ops_sdl)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_parse_operations() {
        let schema = json!({
            "x-graphql-operations": {
                "queries": {
                    "user": {
                        "type": "User",
                        "description": "Get a user by ID",
                        "args": {
                            "id": {
                                "type": "ID!",
                                "description": "User identifier"
                            }
                        }
                    }
                },
                "mutations": {
                    "createUser": {
                        "type": "User!",
                        "description": "Create a new user"
                    }
                }
            }
        });
        let config = parse_operations(&schema);
        assert_eq!(config.queries.len(), 1);
        assert_eq!(config.queries[0].name, "user");
        assert_eq!(config.queries[0].graphql_type, "User");
        assert_eq!(config.queries[0].arguments.len(), 1);
        assert_eq!(config.mutations.len(), 1);
        assert_eq!(config.subscriptions.len(), 0);
    }

    #[test]
    fn test_generate_operation_type() {
        let fields = vec![OperationField {
            name: "user".to_string(),
            graphql_type: "User".to_string(),
            description: Some("Get a user by ID".to_string()),
            arguments: vec![OperationArgument {
                name: "id".to_string(),
                graphql_type: "ID!".to_string(),
                description: Some("User identifier".to_string()),
                default_value: None,
            }],
            deprecated: None,
        }];
        let sdl = generate_operation_type("Query", &fields, "").unwrap();
        assert!(sdl.contains("type Query {"));
        assert!(sdl.contains("user("));
        assert!(sdl.contains("id: ID!"));
        assert!(sdl.contains("): User"));
        assert!(sdl.contains("Get a user by ID"));
    }

    #[test]
    fn test_generate_operations_sdl_empty_when_no_fields() {
        let config = OperationsConfig::default();
        let sdl = generate_operations_sdl(&config, "");
        assert!(sdl.is_empty());
    }
}
