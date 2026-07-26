//! Relay-style pagination type generation from x-graphql-pagination extension.
//!
//! Handles the `x-graphql-pagination` top-level schema extension that
//! triggers automatic generation of Connection, Edge, and PageInfo types.

use serde_json::Value as JsonValue;

/// Configuration for pagination type generation.
#[derive(Debug, Clone, Default)]
pub struct PaginationConfig {
    pub enabled: bool,
    /// Per-type pagination overrides.
    pub types: Vec<PaginationTypeConfig>,
}

/// Per-type pagination configuration.
#[derive(Debug, Clone)]
pub struct PaginationTypeConfig {
    /// The base type name (e.g., "Contract")
    pub type_name: String,
    /// Connection type name override
    pub connection_name: String,
    /// Edge type name override
    pub edge_name: String,
}

/// Parse `x-graphql-pagination` from the schema root.
pub fn parse_pagination(schema: &JsonValue) -> PaginationConfig {
    let obj = match schema.as_object() {
        Some(o) => o,
        None => return PaginationConfig::default(),
    };

    let pagination = match obj.get("x-graphql-pagination") {
        Some(v) => v,
        None => return PaginationConfig::default(),
    };

    let enabled = pagination
        .get("enabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    if !enabled {
        return PaginationConfig::default();
    }

    let types = parse_pagination_types(pagination);

    PaginationConfig { enabled, types }
}

fn parse_pagination_types(pagination: &JsonValue) -> Vec<PaginationTypeConfig> {
    let types_obj = match pagination.get("types").and_then(|v| v.as_object()) {
        Some(o) => o,
        None => return vec![],
    };

    types_obj
        .iter()
        .map(|(type_name, config)| {
            let connection_name = config
                .get("connection")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| format!("{}Connection", pascal_case(type_name)));
            let edge_name = config
                .get("edge")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| format!("{}Edge", pascal_case(type_name)));

            PaginationTypeConfig {
                type_name: pascal_case(type_name),
                connection_name,
                edge_name,
            }
        })
        .collect()
}

fn pascal_case(s: &str) -> String {
    s.split(|c: char| !c.is_alphanumeric())
        .filter(|w| !w.is_empty())
        .map(|w| {
            let mut chars = w.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => {
                    let mut result: String = first.to_uppercase().collect();
                    result.extend(chars.flat_map(|c| c.to_lowercase()));
                    result
                }
            }
        })
        .collect()
}

/// Generate the PageInfo type SDL.
pub fn generate_page_info_sdl(existing_sdl: &str) -> Option<String> {
    if existing_sdl.contains("type PageInfo") {
        return None;
    }

    Some(
        r#""""""
Information about pagination in a connection.
""""""
type PageInfo {
  """When paginating forwards, are there more items?"""
  hasNextPage: Boolean!
  """When paginating backwards, are there more items?"""
  hasPreviousPage: Boolean!
  """When paginating backwards, the cursor to continue."""
  startCursor: String
  """When paginating forwards, the cursor to continue."""
  endCursor: String
}"#
        .to_string(),
    )
}

/// Generate Relay Connection and Edge types for a pagination config.
pub fn generate_pagination_types_sdl(config: &PaginationConfig, existing_sdl: &str) -> String {
    if !config.enabled || config.types.is_empty() {
        return String::new();
    }

    let mut blocks: Vec<String> = vec![];

    // PageInfo (shared)
    if let Some(page_info) = generate_page_info_sdl(existing_sdl) {
        blocks.push(page_info);
    }

    for type_config in &config.types {
        // Skip if already present
        if existing_sdl.contains(&format!("type {}", type_config.connection_name))
            && existing_sdl.contains(&format!("type {}", type_config.edge_name))
        {
            continue;
        }

        // Edge type
        if !existing_sdl.contains(&format!("type {}", type_config.edge_name)) {
            blocks.push(format!(
                r#""""""
Edge linking a cursor to a {node_name} node.
""""""
type {edge_name} {{
  cursor: String!
  node: {node_name}!
}}"#,
                node_name = type_config.type_name,
                edge_name = type_config.edge_name,
            ));
        }

        // Connection type
        if !existing_sdl.contains(&format!("type {}", type_config.connection_name)) {
            blocks.push(format!(
                r#""""""
Paginated list of {node_name} items.
""""""
type {connection_name} {{
  edges: [{edge_name}!]!
  pageInfo: PageInfo!
  totalCount: Int
}}"#,
                node_name = type_config.type_name,
                connection_name = type_config.connection_name,
                edge_name = type_config.edge_name,
            ));
        }
    }

    if blocks.is_empty() {
        return String::new();
    }

    blocks.push(String::new()); // trailing newline
    blocks.join("\n\n")
}

/// Append pagination types to existing SDL.
pub fn inject_pagination_types(sdl: &str, config: &PaginationConfig) -> String {
    let pagination_sdl = generate_pagination_types_sdl(config, sdl);
    if pagination_sdl.is_empty() {
        return sdl.to_string();
    }
    format!("{}\n{}", sdl.trim_end(), pagination_sdl)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_parse_pagination_disabled() {
        let schema = json!({
            "x-graphql-pagination": {
                "enabled": false
            }
        });
        let config = parse_pagination(&schema);
        assert!(!config.enabled);
    }

    #[test]
    fn test_parse_pagination_enabled() {
        let schema = json!({
            "x-graphql-pagination": {
                "enabled": true,
                "types": {
                    "contract": {
                        "connection": "ContractConnection",
                        "edge": "ContractEdge"
                    }
                }
            }
        });
        let config = parse_pagination(&schema);
        assert!(config.enabled);
        assert_eq!(config.types.len(), 1);
        assert_eq!(config.types[0].type_name, "Contract");
        assert_eq!(config.types[0].connection_name, "ContractConnection");
        assert_eq!(config.types[0].edge_name, "ContractEdge");
    }

    #[test]
    fn test_generate_pagination_types_sdl() {
        let config = PaginationConfig {
            enabled: true,
            types: vec![PaginationTypeConfig {
                type_name: "Contract".to_string(),
                connection_name: "ContractConnection".to_string(),
                edge_name: "ContractEdge".to_string(),
            }],
        };
        let sdl = generate_pagination_types_sdl(&config, "");
        assert!(sdl.contains("type PageInfo"));
        assert!(sdl.contains("type ContractConnection"));
        assert!(sdl.contains("type ContractEdge"));
        assert!(sdl.contains("hasNextPage: Boolean!"));
    }

    #[test]
    fn test_inject_pagination_types_noop_when_disabled() {
        let config = PaginationConfig::default();
        let sdl = inject_pagination_types("type User { id: ID! }", &config);
        assert_eq!(sdl, "type User { id: ID! }");
    }
}
