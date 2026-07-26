//! GraphQL hints post-processing module.
//!
//! Applies x-graphql-* extension data that cannot be expressed during
//! the core conversion pass. Handles:
//!
//! - Custom scalar declarations (`x-graphql-scalars`)
//! - Custom scalar field-level replacements (`x-graphql-scalar`)
//! - Operation types (`x-graphql-operations`: Query/Mutation/Subscription)
//! - Relay pagination types (`x-graphql-pagination`)

pub mod operations;
pub mod pagination;
pub mod scalars;

use serde_json::Value as JsonValue;

use self::operations::OperationsConfig;
use self::pagination::PaginationConfig;
use self::scalars::ScalarConfig;

/// Collected hint data extracted from the JSON Schema.
#[derive(Debug, Clone, Default)]
pub struct HintData {
    pub scalars: Vec<ScalarConfig>,
    pub operations: OperationsConfig,
    pub pagination: PaginationConfig,
    /// Type.field → scalar name for field-level overrides
    pub scalar_field_map: std::collections::HashMap<String, String>,
}

/// Parse all hint extensions from the schema.
pub fn parse_hints(schema: &JsonValue) -> HintData {
    HintData {
        scalars: scalars::parse_custom_scalars(schema),
        operations: operations::parse_operations(schema),
        pagination: pagination::parse_pagination(schema),
        scalar_field_map: scalars::build_scalar_field_map(schema),
    }
}

/// Apply all hint post-processing steps to SDL.
///
/// Order matters:
/// 1. Inject custom scalar declarations (must come first)
/// 2. Apply field-level scalar replacements
/// 3. Inject operation types
/// 4. Inject pagination types
pub fn apply_hints(sdl: &str, schema: &JsonValue) -> String {
    let hints = parse_hints(schema);

    let mut result = sdl.to_string();

    // 1. Custom scalar declarations
    if !hints.scalars.is_empty() {
        result = scalars::inject_custom_scalars(&result, &hints.scalars);
    }

    // 2. Field-level scalar replacements
    if !hints.scalar_field_map.is_empty() {
        result = scalars::apply_scalar_field_replacements(&result, &hints.scalar_field_map);
    }

    // 3. Operation types
    if !hints.operations.queries.is_empty()
        || !hints.operations.mutations.is_empty()
        || !hints.operations.subscriptions.is_empty()
    {
        result = operations::inject_operations(&result, &hints.operations);
    }

    // 4. Pagination types
    if hints.pagination.enabled {
        result = pagination::inject_pagination_types(&result, &hints.pagination);
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_parse_hints_empty_schema() {
        let schema = json!({});
        let hints = parse_hints(&schema);
        assert!(hints.scalars.is_empty());
        assert!(hints.operations.queries.is_empty());
        assert!(!hints.pagination.enabled);
    }

    #[test]
    fn test_parse_hints_full() {
        let schema = json!({
            "x-graphql-scalars": {
                "DateTime": {
                    "description": "ISO 8601 date-time"
                }
            },
            "x-graphql-operations": {
                "queries": {
                    "users": {
                        "type": "[User!]!",
                        "description": "Get all users"
                    }
                }
            },
            "x-graphql-pagination": {
                "enabled": true,
                "types": {
                    "user": {}
                }
            },
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
        let hints = parse_hints(&schema);
        assert_eq!(hints.scalars.len(), 1);
        assert_eq!(hints.operations.queries.len(), 1);
        assert!(hints.pagination.enabled);
        assert_eq!(
            hints.scalar_field_map.get("User.created_at").unwrap(),
            "DateTime"
        );
    }

    #[test]
    fn test_apply_hints_injects_scalars_and_operations() {
        let schema = json!({
            "x-graphql-scalars": {
                "DateTime": {
                    "description": "ISO 8601 date-time"
                }
            },
            "x-graphql-operations": {
                "queries": {
                    "users": {
                        "type": "[User!]!",
                        "description": "Get all users"
                    }
                }
            }
        });
        let base_sdl = "type User {\n  id: ID!\n  name: String\n}";
        let result = apply_hints(base_sdl, &schema);
        assert!(result.contains("scalar DateTime"));
        assert!(result.contains("type Query"));
        assert!(result.contains("users: [User!]!"));
        assert!(result.contains("type User"));
    }
}
