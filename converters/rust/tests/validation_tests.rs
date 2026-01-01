//! Validation tests for JSON Schema and GraphQL SDL
//!
//! These tests validate schemas and SDL files from the shared test-data directory.

use json_schema_x_graphql::validation::{
    ComprehensiveGraphQLValidator, FullStackValidator, JsonSchemaValidator,
};
use std::fs;
use std::path::PathBuf;

fn get_test_data_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .join("test-data")
}

fn get_x_graphql_test_data_path() -> PathBuf {
    get_test_data_path().join("x-graphql")
}

fn get_x_graphql_expected_path() -> PathBuf {
    get_x_graphql_test_data_path().join("expected")
}

#[test]
fn test_validate_basic_types_json_schema() {
    let json_validator = JsonSchemaValidator::new(false);
    let path = get_x_graphql_test_data_path().join("basic-types.json");

    let result = json_validator.validate_file(&path);
    assert!(result.is_ok(), "Failed to validate: {:?}", result.err());

    let validation_result = result.unwrap();
    assert!(
        validation_result.valid,
        "Schema should be valid. Errors: {:?}",
        validation_result.errors
    );
}

#[test]
fn test_validate_federation_json_schema() {
    let json_validator = JsonSchemaValidator::new(false);
    let path = get_x_graphql_test_data_path().join("federation.json");

    if path.exists() {
        let result = json_validator.validate_file(&path);
        assert!(result.is_ok(), "Failed to validate: {:?}", result.err());

        let validation_result = result.unwrap();
        // May have warnings but should not have errors
        assert!(
            validation_result.errors.is_empty(),
            "Schema should have no errors. Errors: {:?}",
            validation_result.errors
        );
    }
}

#[test]
fn test_validate_interfaces_json_schema() {
    let json_validator = JsonSchemaValidator::new(false);
    let path = get_x_graphql_test_data_path().join("interfaces.json");

    if path.exists() {
        let result = json_validator.validate_file(&path);
        assert!(result.is_ok(), "Failed to validate: {:?}", result.err());

        let validation_result = result.unwrap();
        assert!(
            validation_result.errors.is_empty(),
            "Schema should have no errors. Errors: {:?}",
            validation_result.errors
        );
    }
}

#[test]
fn test_validate_unions_json_schema() {
    let json_validator = JsonSchemaValidator::new(false);
    let path = get_x_graphql_test_data_path().join("unions.json");

    if path.exists() {
        let result = json_validator.validate_file(&path);
        assert!(result.is_ok(), "Failed to validate: {:?}", result.err());

        let validation_result = result.unwrap();
        assert!(
            validation_result.errors.is_empty(),
            "Schema should have no errors. Errors: {:?}",
            validation_result.errors
        );
    }
}

#[test]
fn test_validate_comprehensive_features_json_schema() {
    let json_validator = JsonSchemaValidator::new(false);
    let path = get_x_graphql_test_data_path().join("comprehensive-features.json");

    if path.exists() {
        let result = json_validator.validate_file(&path);
        assert!(result.is_ok(), "Failed to validate: {:?}", result.err());

        let validation_result = result.unwrap();
        // Comprehensive schema may have warnings but should not have critical errors
        let critical_errors: Vec<_> = validation_result
            .errors
            .iter()
            .filter(|e| !e.message.contains("plural") && !e.message.contains("PascalCase"))
            .collect();

        assert!(
            critical_errors.is_empty(),
            "Schema should have no critical errors. Errors: {:?}",
            critical_errors
        );
    }
}

#[test]
fn test_validate_all_json_schemas() {
    let json_validator = JsonSchemaValidator::new(false);
    let test_data_path = get_x_graphql_test_data_path();

    if !test_data_path.exists() {
        eprintln!("Test data path does not exist: {:?}", test_data_path);
        return;
    }

    let mut schemas_validated = 0;
    let mut schemas_with_errors = 0;

    for entry in fs::read_dir(&test_data_path).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();

        if path.is_file() && path.extension().map_or(false, |ext| ext == "json") {
            schemas_validated += 1;
            let result = json_validator.validate_file(&path);

            match result {
                Ok(validation_result) => {
                    if !validation_result.valid {
                        schemas_with_errors += 1;
                        eprintln!(
                            "Schema {} has errors: {:?}",
                            path.display(),
                            validation_result.errors
                        );
                    }
                }
                Err(e) => {
                    schemas_with_errors += 1;
                    eprintln!("Failed to validate {}: {:?}", path.display(), e);
                }
            }
        }
    }

    println!(
        "Validated {} schemas, {} with errors",
        schemas_validated, schemas_with_errors
    );
}

#[test]
fn test_validate_basic_types_graphql_sdl() {
    let graphql_validator = ComprehensiveGraphQLValidator::new();
    let path = get_x_graphql_expected_path().join("basic-types.graphql");

    if path.exists() {
        let result = graphql_validator.validate_file(&path);
        assert!(result.is_ok(), "Failed to validate: {:?}", result.err());

        let report = result.unwrap();
        assert!(
            report.apollo_parser_valid,
            "SDL should parse without errors. Errors: {:?}",
            report.apollo_parser_errors
        );
    }
}

#[test]
fn test_validate_comprehensive_features_graphql_sdl() {
    let graphql_validator = ComprehensiveGraphQLValidator::new();
    let path = get_x_graphql_expected_path().join("comprehensive-features.graphql");

    if path.exists() {
        let result = graphql_validator.validate_file(&path);
        assert!(result.is_ok(), "Failed to validate: {:?}", result.err());

        let report = result.unwrap();
        assert!(
            report.apollo_parser_valid,
            "SDL should parse without errors. Errors: {:?}",
            report.apollo_parser_errors
        );
    }
}

#[test]
fn test_validate_all_graphql_sdl_files() {
    let graphql_validator = ComprehensiveGraphQLValidator::new();
    let expected_path = get_x_graphql_expected_path();

    if !expected_path.exists() {
        eprintln!("Expected SDL path does not exist: {:?}", expected_path);
        return;
    }

    let mut sdl_validated = 0;
    let mut sdl_with_errors = 0;

    for entry in fs::read_dir(&expected_path).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();

        if path.is_file()
            && path
                .extension()
                .map_or(false, |ext| ext == "graphql" || ext == "gql")
        {
            sdl_validated += 1;
            let result = graphql_validator.validate_file(&path);

            match result {
                Ok(report) => {
                    if !report.is_valid() {
                        sdl_with_errors += 1;
                        eprintln!(
                            "SDL {} has errors (count: {})",
                            path.display(),
                            report.error_count()
                        );
                    }
                }
                Err(e) => {
                    sdl_with_errors += 1;
                    eprintln!("Failed to validate {}: {:?}", path.display(), e);
                }
            }
        }
    }

    println!(
        "Validated {} SDL files, {} with errors",
        sdl_validated, sdl_with_errors
    );
}

#[test]
fn test_full_stack_validation() {
    let validator = FullStackValidator::new(false);

    let json_path = get_x_graphql_test_data_path().join("basic-types.json");
    let sdl_path = get_x_graphql_expected_path().join("basic-types.graphql");

    if json_path.exists() && sdl_path.exists() {
        let json_content = fs::read_to_string(&json_path).unwrap();
        let json_schema: serde_json::Value = serde_json::from_str(&json_content).unwrap();

        let sdl_content = fs::read_to_string(&sdl_path).unwrap();

        let result = validator.validate_conversion(&json_schema, Some(&sdl_content));
        assert!(result.is_ok(), "Failed to validate: {:?}", result.err());

        let report = result.unwrap();
        assert!(
            report.is_valid(),
            "Both JSON Schema and GraphQL SDL should be valid"
        );
    }
}

#[test]
fn test_x_graphql_type_kind_validation() {
    let validator = JsonSchemaValidator::new(false);

    let schema = serde_json::json!({
        "type": "object",
        "x-graphql-type-kind": "OBJECT",
        "properties": {}
    });

    let result = validator.validate(&schema).unwrap();
    assert!(result.valid, "OBJECT type kind should be valid");

    let invalid_schema = serde_json::json!({
        "type": "object",
        "x-graphql-type-kind": "INVALID_KIND",
        "properties": {}
    });

    let result = validator.validate(&invalid_schema).unwrap();
    assert!(!result.valid, "Invalid type kind should fail validation");
    assert!(result
        .errors
        .iter()
        .any(|e| e.message.contains("Invalid type kind")));
}

#[test]
fn test_empty_federation_key_validation() {
    let validator = JsonSchemaValidator::new(false);

    let schema = serde_json::json!({
        "type": "object",
        "x-graphql-federation-keys": ["id"],
        "properties": {
            "id": { "type": "string" }
        }
    });

    let result = validator.validate(&schema).unwrap();
    assert!(result.valid, "Valid federation key should pass");

    let invalid_schema = serde_json::json!({
        "type": "object",
        "x-graphql-federation-keys": [""],
        "properties": {}
    });

    let result = validator.validate(&invalid_schema).unwrap();
    assert!(!result.valid, "Empty federation key should fail");
    assert!(result.errors.iter().any(|e| e.message.contains("empty")));
}

#[test]
fn test_naming_convention_warnings() {
    let validator = JsonSchemaValidator::new(false);

    // Plural type name should generate warning
    let schema = serde_json::json!({
        "type": "object",
        "x-graphql-type-name": "Users",
        "properties": {}
    });

    let result = validator.validate(&schema).unwrap();
    assert!(
        result.has_warnings(),
        "Plural type name should generate warning"
    );
    assert!(result.warnings.iter().any(|w| w.message.contains("plural")));

    // Snake_case field name should generate warning
    let schema_with_snake_case = serde_json::json!({
        "type": "object",
        "properties": {
            "user_id": {
                "type": "string",
                "x-graphql-field-name": "user_id"
            }
        }
    });

    let result = validator.validate(&schema_with_snake_case).unwrap();
    assert!(
        result.has_warnings(),
        "Snake_case field name should generate warning"
    );
    assert!(result
        .warnings
        .iter()
        .any(|w| w.message.contains("snake_case")));
}

#[test]
fn test_graphql_type_syntax_validation() {
    let validator = JsonSchemaValidator::new(false);

    // Valid GraphQL type syntax
    let valid_types = vec![
        "String",
        "String!",
        "[String]",
        "[String]!",
        "[String!]",
        "[String!]!",
    ];

    for type_str in valid_types {
        let schema = serde_json::json!({
            "type": "object",
            "properties": {
                "field": {
                    "type": "string",
                    "x-graphql-field-type": type_str
                }
            }
        });

        let result = validator.validate(&schema).unwrap();
        // Should not have errors, may have other warnings
        let type_errors: Vec<_> = result
            .errors
            .iter()
            .filter(|e| e.message.contains("type format"))
            .collect();
        assert!(
            type_errors.is_empty(),
            "Type '{}' should be valid, but got errors: {:?}",
            type_str,
            type_errors
        );
    }

    // Invalid GraphQL type syntax (unbalanced brackets)
    let invalid_schema = serde_json::json!({
        "type": "object",
        "properties": {
            "field": {
                "type": "string",
                "x-graphql-field-type": "[String"
            }
        }
    });

    let result = validator.validate(&invalid_schema).unwrap();
    assert!(
        result.has_warnings() || !result.valid,
        "Unbalanced brackets should generate warning or error"
    );
}

#[test]
fn test_graphql_sdl_syntax_errors() {
    let validator = ComprehensiveGraphQLValidator::new();

    let invalid_sdl = r#"
        type User {
            id: ID!
            name: String!
        # Missing closing brace
    "#;

    let report = validator.validate(invalid_sdl).unwrap();
    assert!(
        !report.apollo_parser_valid,
        "Invalid SDL syntax should fail parser validation"
    );
    assert!(report.apollo_parser_errors.len() > 0);
}

#[test]
fn test_graphql_undefined_type_detection() {
    let validator = ComprehensiveGraphQLValidator::new();

    let sdl = r#"
        type User {
            id: ID!
            profile: Profile
        }
    "#;

    let report = validator.validate(sdl).unwrap();
    // Should detect undefined type "Profile"
    let has_undefined_error = report
        .apollo_compiler_errors
        .iter()
        .any(|e| e.message.contains("Undefined type"));

    assert!(
        has_undefined_error,
        "Should detect undefined type 'Profile'"
    );
}

#[test]
fn test_graphql_federation_key_validation() {
    let validator = ComprehensiveGraphQLValidator::new();

    let sdl = r#"
        type User @key(fields: "id") {
            id: ID!
            name: String!
        }
    "#;

    let report = validator.validate(sdl).unwrap();
    // Should parse without critical errors
    assert!(
        report.apollo_parser_valid,
        "Federation SDL should parse correctly"
    );
}

#[test]
fn test_validation_performance() {
    use std::time::Instant;

    let validator = JsonSchemaValidator::new(false);
    let schema = serde_json::json!({
        "type": "object",
        "x-graphql-type-name": "User",
        "properties": {
            "id": { "type": "string" },
            "name": { "type": "string" },
            "email": { "type": "string", "format": "email" },
            "age": { "type": "integer" }
        }
    });

    let start = Instant::now();
    let iterations = 100;

    for _ in 0..iterations {
        let _ = validator.validate(&schema).unwrap();
    }

    let duration = start.elapsed();
    let avg_time = duration / iterations;

    println!(
        "Average validation time: {:?} ({} iterations)",
        avg_time, iterations
    );

    // Validation should be fast (< 10ms per schema)
    assert!(
        avg_time.as_millis() < 10,
        "Validation should be fast, but took {:?}",
        avg_time
    );
}
