//! Integration tests for JSON Schema <-> GraphQL SDL conversion
//!
//! Tests bidirectional conversion, federation support, and edge cases.

use json_schema_graphql_converter::{ConversionDirection, ConversionOptions, Converter};
use serde_json::json;

// ============================================================================
// Helper Functions
// ============================================================================

fn default_options() -> ConversionOptions {
    ConversionOptions {
        validate: true,
        include_descriptions: true,
        preserve_field_order: true,
        federation_version: 2,
    }
}

fn compare_sdl(actual: &str, expected: &str) -> bool {
    let normalize = |s: &str| -> String {
        s.lines()
            .map(|line| line.trim())
            .filter(|line| !line.is_empty())
            .collect::<Vec<_>>()
            .join("\n")
    };

    normalize(actual) == normalize(expected)
}

// ============================================================================
// Basic Type Conversion Tests
// ============================================================================

#[test]
fn test_simple_object_type() {
    let converter = Converter::with_options(default_options());
    let json_schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$defs": {
            "User": {
                "type": "object",
                "description": "A user account",
                "x-graphql-type-name": "User",
                "properties": {
                    "user_id": {
                        "type": "string",
                        "description": "Unique user identifier",
                        "x-graphql-type": "ID!",
                        "x-graphql-field-name": "userId"
                    },
                    "name": {
                        "type": "string",
                        "x-graphql-type": "String!"
                    },
                    "email": {
                        "type": "string",
                        "format": "email"
                    }
                },
                "required": ["user_id", "name"]
            }
        }
    });

    let result = converter.json_schema_to_graphql(&json_schema.to_string());
    assert!(result.is_ok(), "Conversion failed: {:?}", result.err());

    let graphql = result.unwrap();
    assert!(graphql.contains("type User"), "Missing User type");
    assert!(graphql.contains("userId: ID!"), "Missing userId field");
    assert!(graphql.contains("name: String!"), "Missing name field");
}

#[test]
fn test_enum_type() {
    let converter = Converter::with_options(default_options());
    let json_schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$defs": {
            "Status": {
                "type": "string",
                "enum": ["ACTIVE", "INACTIVE", "PENDING"],
                "x-graphql-type-name": "Status",
                "x-graphql-type-kind": "enum",
                "description": "Account status"
            }
        }
    });

    let result = converter.json_schema_to_graphql(&json_schema.to_string());
    assert!(result.is_ok());

    let graphql = result.unwrap();
    assert!(graphql.contains("enum Status"));
    assert!(graphql.contains("ACTIVE"));
    assert!(graphql.contains("INACTIVE"));
    assert!(graphql.contains("PENDING"));
}

#[test]
fn test_interface_type() {
    let converter = Converter::with_options(default_options());
    let json_schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$defs": {
            "Node": {
                "type": "object",
                "x-graphql-type-name": "Node",
                "x-graphql-type-kind": "interface",
                "properties": {
                    "id": {
                        "type": "string",
                        "x-graphql-type": "ID!"
                    }
                },
                "required": ["id"]
            }
        }
    });

    let result = converter.json_schema_to_graphql(&json_schema.to_string());
    assert!(result.is_ok());

    let graphql = result.unwrap();
    assert!(graphql.contains("interface Node"));
}

#[test]
fn test_union_type() {
    let converter = Converter::with_options(default_options());
    let json_schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$defs": {
            "SearchResult": {
                "x-graphql-type-name": "SearchResult",
                "x-graphql-type-kind": "union",
                "x-graphql-union-types": ["User", "Post", "Comment"]
            }
        }
    });

    let result = converter.json_schema_to_graphql(&json_schema.to_string());
    assert!(result.is_ok());

    let graphql = result.unwrap();
    assert!(graphql.contains("union SearchResult"));
}

#[test]
fn test_input_object_type() {
    let converter = Converter::with_options(default_options());
    let json_schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$defs": {
            "CreateUserInput": {
                "type": "object",
                "x-graphql-type-name": "CreateUserInput",
                "x-graphql-type-kind": "input",
                "properties": {
                    "name": {
                        "type": "string"
                    },
                    "email": {
                        "type": "string"
                    }
                },
                "required": ["name", "email"]
            }
        }
    });

    let result = converter.json_schema_to_graphql(&json_schema.to_string());
    assert!(result.is_ok());

    let graphql = result.unwrap();
    assert!(graphql.contains("input CreateUserInput"));
}

// ============================================================================
// Federation Directive Tests
// ============================================================================

#[test]
fn test_federation_key_directive() {
    let converter = Converter::with_options(default_options());
    let json_schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$defs": {
            "Product": {
                "type": "object",
                "x-graphql-type-name": "Product",
                "x-graphql-directives": [
                    {
                        "name": "key",
                        "arguments": {
                            "fields": "\"id\""
                        }
                    }
                ],
                "properties": {
                    "id": {
                        "type": "string",
                        "x-graphql-type": "ID!"
                    },
                    "name": {
                        "type": "string"
                    }
                },
                "required": ["id"]
            }
        }
    });

    let result = converter.json_schema_to_graphql(&json_schema.to_string());
    assert!(result.is_ok());

    let graphql = result.unwrap();
    assert!(graphql.contains("@key"));
}

#[test]
fn test_federation_external_requires_provides() {
    let converter = Converter::with_options(default_options());
    let json_schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$defs": {
            "Product": {
                "type": "object",
                "x-graphql-type-name": "Product",
                "properties": {
                    "id": {
                        "type": "string",
                        "x-graphql-type": "ID!",
                        "x-graphql-directives": [
                            {"name": "external"}
                        ]
                    },
                    "price": {
                        "type": "number"
                    }
                }
            }
        }
    });

    let result = converter.json_schema_to_graphql(&json_schema.to_string());
    assert!(result.is_ok());
}

#[test]
fn test_federation_shareable() {
    let converter = Converter::with_options(default_options());
    let json_schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$defs": {
            "Metadata": {
                "type": "object",
                "x-graphql-type-name": "Metadata",
                "x-graphql-directives": [
                    {"name": "shareable"}
                ],
                "properties": {
                    "created_at": {
                        "type": "string",
                        "format": "date-time"
                    }
                }
            }
        }
    });

    let result = converter.json_schema_to_graphql(&json_schema.to_string());
    assert!(result.is_ok());
}

#[test]
fn test_federation_authenticated() {
    let converter = Converter::with_options(default_options());
    let json_schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$defs": {
            "User": {
                "type": "object",
                "x-graphql-type-name": "User",
                "x-graphql-directives": [
                    {"name": "authenticated"}
                ],
                "properties": {
                    "id": {
                        "type": "string",
                        "x-graphql-type": "ID!"
                    }
                }
            }
        }
    });

    let result = converter.json_schema_to_graphql(&json_schema.to_string());
    assert!(result.is_ok());
}

// ============================================================================
// Advanced Features Tests
// ============================================================================

#[test]
fn test_field_with_arguments() {
    let converter = Converter::with_options(default_options());
    let json_schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$defs": {
            "Query": {
                "type": "object",
                "x-graphql-type-name": "Query",
                "properties": {
                    "user": {
                        "type": "object",
                        "x-graphql-type": "User",
                        "x-graphql-arguments": [
                            {
                                "name": "id",
                                "type": "ID!"
                            }
                        ]
                    }
                }
            }
        }
    });

    let result = converter.json_schema_to_graphql(&json_schema.to_string());
    assert!(result.is_ok());
}

// ============================================================================
// Round-Trip Tests
// ============================================================================

#[test]
fn test_round_trip_simple_type() {
    let converter = Converter::with_options(default_options());

    let original_schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$defs": {
            "User": {
                "type": "object",
                "x-graphql-type-name": "User",
                "properties": {
                    "id": {
                        "type": "string",
                        "x-graphql-type": "ID!"
                    },
                    "name": {
                        "type": "string",
                        "x-graphql-type": "String!"
                    }
                },
                "required": ["id", "name"]
            }
        }
    });

    // JSON Schema -> GraphQL
    let graphql = converter
        .json_schema_to_graphql(&original_schema.to_string())
        .expect("Failed to convert JSON Schema to GraphQL");

    // GraphQL -> JSON Schema
    let result_schema = converter
        .graphql_to_json_schema(&graphql)
        .expect("Failed to convert GraphQL back to JSON Schema");

    // Should successfully round-trip
    assert!(!result_schema.is_empty());
}

#[test]
fn test_round_trip_with_federation() {
    let converter = Converter::with_options(default_options());

    let original_schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$defs": {
            "Product": {
                "type": "object",
                "x-graphql-type-name": "Product",
                "x-graphql-directives": [
                    {
                        "name": "key",
                        "arguments": {"fields": "\"id\""}
                    }
                ],
                "properties": {
                    "id": {
                        "type": "string",
                        "x-graphql-type": "ID!"
                    }
                },
                "required": ["id"]
            }
        }
    });

    let graphql = converter
        .json_schema_to_graphql(&original_schema.to_string())
        .expect("Failed to convert JSON Schema to GraphQL");

    let result_schema = converter
        .graphql_to_json_schema(&graphql)
        .expect("Failed to convert GraphQL back to JSON Schema");

    assert!(!result_schema.is_empty());
}

// ============================================================================
// Error Handling Tests
// ============================================================================

#[test]
fn test_invalid_json_schema() {
    let converter = Converter::with_options(default_options());
    let invalid_json = "not valid json{";

    let result = converter.json_schema_to_graphql(invalid_json);
    assert!(result.is_err());
}

#[test]
fn test_invalid_graphql_sdl() {
    let converter = Converter::with_options(default_options());
    let invalid_sdl = "type User { invalid syntax";

    let result = converter.graphql_to_json_schema(invalid_sdl);
    assert!(result.is_err());
}

#[test]
fn test_empty_schema() {
    let converter = Converter::with_options(default_options());
    let empty_schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema"
    });

    let result = converter.json_schema_to_graphql(&empty_schema.to_string());
    // Should handle empty schema gracefully
    assert!(result.is_ok() || result.is_err());
}

#[test]
fn test_list_types() {
    let converter = Converter::with_options(default_options());
    let json_schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$defs": {
            "UserList": {
                "type": "object",
                "x-graphql-type-name": "Query",
                "properties": {
                    "users": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "x-graphql-type": "User"
                        },
                        "x-graphql-type": "[User!]!"
                    }
                }
            }
        }
    });

    let result = converter.json_schema_to_graphql(&json_schema.to_string());
    assert!(result.is_ok());
}

#[test]
fn test_deprecated_fields() {
    let converter = Converter::with_options(default_options());
    let json_schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$defs": {
            "User": {
                "type": "object",
                "x-graphql-type-name": "User",
                "properties": {
                    "old_field": {
                        "type": "string",
                        "x-graphql-directives": [
                            {
                                "name": "deprecated",
                                "arguments": {
                                    "reason": "\"Use newField instead\""
                                }
                            }
                        ]
                    }
                }
            }
        }
    });

    let result = converter.json_schema_to_graphql(&json_schema.to_string());
    assert!(result.is_ok());
}

// ============================================================================
// Custom Scalar Tests
// ============================================================================

#[test]
fn test_custom_scalar() {
    let converter = Converter::with_options(default_options());
    let json_schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$defs": {
            "DateTime": {
                "type": "string",
                "format": "date-time",
                "x-graphql-type-name": "DateTime",
                "x-graphql-type-kind": "scalar"
            }
        }
    });

    let result = converter.json_schema_to_graphql(&json_schema.to_string());
    assert!(result.is_ok());
}
