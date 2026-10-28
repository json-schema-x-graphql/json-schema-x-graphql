use serde_json::json;
use validation_lint::{ValidationSeverity, lint_all, lint_definitions_completeness, lint_schema};

#[test]
fn detects_deprecated_x_attributes() {
    let schema = json!({
        "$defs": {
            "Contract": {
                "type": "object",
                "x-fpds-source": "some_value",
                "x-graphql-type-name": "Contract"
            }
        }
    });

    let issues = lint_schema(&schema);

    assert!(
        issues
            .iter()
            .any(|issue| issue.message.contains("x-fpds-source"))
    );
}

#[test]
fn detects_invalid_x_prefixes() {
    let schema = json!({
        "$defs": {
            "Contract": {
                "type": "object",
                "x-custom-thing": "value",
                "x-graphql-type-name": "Contract"
            }
        }
    });

    let issues = lint_schema(&schema);

    assert!(
        issues
            .iter()
            .any(|issue| issue.message.contains("x-custom-thing"))
    );
}

#[test]
fn allows_permitted_non_graphql_x_attributes() {
    let schema = json!({ "x-request-id": "abc123" });

    let issues = lint_schema(&schema);

    assert!(
        !issues
            .iter()
            .any(|issue| issue.message.contains("x-request-id"))
    );
}

#[test]
fn allows_x_graphql_and_x_viaduct() {
    let schema = json!({
        "x-graphql-type-name": "X",
        "x-viaduct-resolver": true
    });

    let issues = lint_schema(&schema);

    assert!(issues.is_empty());
}

#[test]
fn warns_on_missing_x_graphql_type_name_for_object_definitions() {
    let schema = json!({
        "$defs": {
            "noName": {
                "type": "object",
                "properties": {
                    "id": { "type": "string" }
                }
            }
        }
    });

    let issues = lint_definitions_completeness(&schema);

    assert!(
        issues
            .iter()
            .any(|issue| issue.message.contains("missing x-graphql-type-name"))
    );
}

#[test]
fn warns_on_type_name_not_in_pascal_case() {
    let schema = json!({
        "$defs": {
            "Test": {
                "type": "object",
                "x-graphql-type-name": "lowercaseType"
            }
        }
    });

    let issues = lint_definitions_completeness(&schema);

    assert!(
        issues
            .iter()
            .any(|issue| issue.message.contains("PascalCase"))
    );
}

#[test]
fn warns_on_field_name_using_snake_case() {
    let schema = json!({
        "$defs": {
            "Test": {
                "type": "object",
                "x-graphql-type-name": "Test",
                "properties": {
                    "snake_field": {
                        "type": "string",
                        "x-graphql-field-name": "snake_field"
                    }
                }
            }
        }
    });

    let issues = lint_definitions_completeness(&schema);

    assert!(
        issues
            .iter()
            .any(|issue| issue.message.contains("snake_case"))
    );
}

#[test]
fn does_not_warn_on_clean_schema() {
    let schema = json!({
        "$defs": {
            "User": {
                "type": "object",
                "x-graphql-type-name": "User",
                "properties": {
                    "userId": {
                        "type": "string",
                        "x-graphql-field-name": "userId"
                    }
                }
            }
        }
    });

    let issues = lint_definitions_completeness(&schema);

    assert!(
        !issues
            .iter()
            .any(|issue| issue.severity == ValidationSeverity::Error)
    );
}

#[test]
fn returns_empty_for_a_clean_schema() {
    let schema = json!({
        "$defs": {
            "User": {
                "type": "object",
                "x-graphql-type-name": "User",
                "x-graphql-federation-keys": ["id"]
            }
        }
    });

    let issues = lint_all(&schema);

    assert!(
        !issues
            .iter()
            .any(|issue| issue.severity == ValidationSeverity::Error)
    );
}

#[test]
fn combines_issues_from_both_linters() {
    let schema = json!({
        "$defs": {
            "Test": {
                "type": "object",
                "x-fpds-source": "x",
                "x-graphql-type-name": "Test"
            }
        }
    });

    let issues = lint_all(&schema);

    assert!(!issues.is_empty());
}
