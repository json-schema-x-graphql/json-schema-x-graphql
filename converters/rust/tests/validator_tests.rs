use json_schema_graphql_converter::validator;
use serde_json::json;

#[test]
fn test_validate_names() {
    let valid_names = vec!["Foo", "bar", "_baz", "FooBar", "foo_bar", "A123"];
    for name in valid_names {
        assert!(
            validator::validate_graphql_name(name).is_ok(),
            "Name '{}' should be valid",
            name
        );
    }

    let invalid_names = vec![
        "123Foo",  // Starts with number
        "foo-bar", // Hyphen
        "foo bar", // Space
        "foo.bar", // Dot
        "",        // Empty
        "__foo",   // Double underscore reserved
    ];
    for name in invalid_names {
        assert!(
            validator::validate_graphql_name(name).is_err(),
            "Name '{}' should be invalid",
            name
        );
    }
}

#[test]
fn test_validate_simple_sdl() {
    let valid_sdl = r#"
        type Query {
            me: User
        }
        type User {
            id: ID!
            username: String
        }
    "#;
    assert!(validator::validate_graphql_sdl(valid_sdl).is_ok());
}

#[test]
fn test_validate_malformed_sdl() {
    let invalid_sdl = r#"
        type Query {
            me:
        }
    "#; // Missing type
    assert!(validator::validate_graphql_sdl(invalid_sdl).is_err());
}

#[test]
fn test_validate_json_schema_types() {
    // Valid
    let valid = json!({"type": "string"});
    assert!(validator::validate_json_schema(&valid).is_ok());

    // Let's test a schema that is definitely valid structure
    let valid_complex = json!({
        "type": "object",
        "properties": {
            "arr": { "type": "array", "items": { "type": "integer" } }
        }
    });
    assert!(validator::validate_json_schema(&valid_complex).is_ok());
}
