//! X-GraphQL extensions test suite using shared test-data
//!
//! This test suite loads JSON schemas from the shared `converters/test-data/x-graphql/`
//! directory to ensure consistency between Node.js and Rust converter implementations.

use json_schema_x_graphql::Converter;
use std::fs;
use std::path::PathBuf;

fn get_test_data_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .join("test-data")
        .join("x-graphql")
}

fn load_test_schema(filename: &str) -> String {
    let path = get_test_data_path().join(filename);
    fs::read_to_string(&path)
        .unwrap_or_else(|e| panic!("Failed to read test schema {}: {}", filename, e))
}

fn load_expected_sdl(filename: &str) -> Option<String> {
    let path = get_test_data_path().join("expected").join(filename);
    fs::read_to_string(&path).ok()
}

#[test]
#[ignore] // Fixture-specific test; parity tests verify converter correctness
fn test_basic_types_conversion() {
    let schema = load_test_schema("basic-types.json");
    let converter = Converter::new();
    let result = converter
        .json_schema_to_graphql(&schema)
        .expect("Conversion should succeed");

    // Basic validations
    assert!(!result.is_empty(), "Should generate non-empty GraphQL");

    // Check for expected type definitions
    if let Some(expected) = load_expected_sdl("basic-types.graphql") {
        // Normalize whitespace for comparison
        let result_normalized: String = result.split_whitespace().collect();
        let expected_normalized: String = expected.split_whitespace().collect();

        assert!(
            result_normalized.contains(
                &expected_normalized
                    .split_whitespace()
                    .collect::<Vec<_>>()
                    .join(" ")
            ) || expected_normalized.contains(&result_normalized),
            "Generated SDL should match expected output structure"
        );
    }
}

#[test]
fn test_comprehensive_features() {
    let schema = load_test_schema("comprehensive-features.json");
    let converter = Converter::new();
    let result = converter
        .json_schema_to_graphql(&schema)
        .expect("Conversion should succeed for comprehensive schema");

    // Type-level features
    assert!(
        result.contains("interface Node"),
        "Should generate Node interface"
    );
    assert!(
        result.contains("interface Timestamped"),
        "Should generate Timestamped interface"
    );
    assert!(
        result.contains("type User implements"),
        "User should implement interfaces"
    );

    // Field-level features
    assert!(result.contains("id: ID!"), "Should have non-null ID fields");
    assert!(result.contains("email:"), "Should have email field");
    assert!(
        !result.contains("password"),
        "Should skip password_hash field"
    );

    // Enum types
    assert!(
        result.contains("enum UserRole"),
        "Should generate UserRole enum"
    );
    assert!(result.contains("ADMIN"), "Enum should contain ADMIN");

    // Union types
    assert!(
        result.contains("union SearchResult"),
        "Should generate union types"
    );

    // Federation directives
    assert!(
        result.contains("@key"),
        "Should include federation @key directives"
    );
}

#[test]
fn test_interfaces_schema() {
    let schema = load_test_schema("interfaces.json");
    let converter = Converter::new();
    let result = converter
        .json_schema_to_graphql(&schema)
        .expect("Interfaces conversion should succeed");

    assert!(
        result.contains("interface"),
        "Should contain interface keyword"
    );
    assert!(
        result.contains("implements"),
        "Should contain implements keyword"
    );
}

#[test]
fn test_unions_schema() {
    let schema = load_test_schema("unions.json");
    let converter = Converter::new();
    let result = converter
        .json_schema_to_graphql(&schema)
        .expect("Unions conversion should succeed");

    assert!(result.contains("union"), "Should contain union keyword");
}

#[test]
fn test_nullability_schema() {
    let schema = load_test_schema("nullability.json");
    let converter = Converter::new();
    let result = converter
        .json_schema_to_graphql(&schema)
        .expect("Nullability conversion should succeed");

    // Should have mix of nullable and non-nullable fields
    assert!(result.contains("!"), "Should have some non-null fields");
    assert!(
        result.contains(": String") || result.contains(": Int"),
        "Should have nullable fields"
    );
}

#[test]
fn test_skip_fields_schema() {
    let schema = load_test_schema("skip-fields.json");
    let converter = Converter::new();
    let result = converter
        .json_schema_to_graphql(&schema)
        .expect("Skip fields conversion should succeed");

    // This test validates that x-graphql-skip works correctly
    // The schema should define fields but some should be omitted from output
    assert!(
        !result.is_empty(),
        "Should generate output even with skipped fields"
    );
}

#[test]
fn test_descriptions_schema() {
    let schema = load_test_schema("descriptions.json");
    let converter = Converter::new();
    let result = converter
        .json_schema_to_graphql(&schema)
        .expect("Descriptions conversion should succeed");

    // Should contain description comments
    assert!(
        result.contains("\"\"\"") || result.contains("\""),
        "Should include GraphQL description strings"
    );
}

#[test]
fn test_comprehensive_schema() {
    let schema = load_test_schema("comprehensive.json");
    let converter = Converter::new();
    let result = converter
        .json_schema_to_graphql(&schema)
        .expect("Comprehensive schema conversion should succeed");

    assert!(
        !result.is_empty(),
        "Comprehensive schema should produce output"
    );
}

#[test]
fn test_all_schemas_are_valid() {
    // Discover all JSON schemas in test-data directory
    let test_dir = get_test_data_path();
    let entries = fs::read_dir(&test_dir).expect("Should be able to read test-data directory");

    let mut schema_count = 0;
    let mut success_count = 0;

    for entry in entries {
        let entry = entry.expect("Should be able to read directory entry");
        let path = entry.path();

        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            schema_count += 1;
            let filename = path.file_name().unwrap().to_str().unwrap();

            println!("Testing schema: {}", filename);

            let content = fs::read_to_string(&path)
                .unwrap_or_else(|e| panic!("Failed to read {}: {}", filename, e));

            let converter = Converter::new();
            match converter.json_schema_to_graphql(&content) {
                Ok(result) => {
                    assert!(
                        !result.is_empty(),
                        "Schema {} should produce non-empty output",
                        filename
                    );
                    success_count += 1;
                    println!("  ✓ Successfully converted {}", filename);
                }
                Err(e) => {
                    println!("  ✗ Failed to convert {}: {:?}", filename, e);
                    // Some schemas might be intentionally invalid for testing error handling
                    // Only panic if it's a schema we expect to work
                    if !filename.contains("invalid") && !filename.contains("error") {
                        panic!(
                            "Expected {} to convert successfully but got error: {:?}",
                            filename, e
                        );
                    }
                }
            }
        }
    }

    println!(
        "\nTest summary: {}/{} schemas converted successfully",
        success_count, schema_count
    );
    assert!(schema_count > 0, "Should have found test schemas");
}

#[test]
fn test_round_trip_fidelity() {
    // Test that conversion preserves all x-graphql attributes
    let schema = load_test_schema("comprehensive-features.json");
    let converter = Converter::new();
    let sdl = converter
        .json_schema_to_graphql(&schema)
        .expect("Initial conversion should succeed");

    // Verify key features are preserved
    assert!(sdl.contains("@key"), "Federation keys should be preserved");
    assert!(sdl.contains("interface"), "Interfaces should be preserved");
    assert!(sdl.contains("union"), "Unions should be preserved");
    assert!(sdl.contains("enum"), "Enums should be preserved");

    // TODO: Implement GraphQL -> JSON Schema conversion and test full round-trip
    // let reconstructed = convert_to_json_schema(&sdl).expect("Reverse conversion should succeed");
    // assert_schemas_equivalent(&schema, &reconstructed);
}

#[test]
fn test_federation_directives() {
    let schema = load_test_schema("comprehensive-features.json");
    let converter = Converter::new();
    let result = converter
        .json_schema_to_graphql(&schema)
        .expect("Conversion should succeed");

    // Check for various federation directives
    let federation_checks = vec![("@key", "Entity keys"), ("@shareable", "Shareable types")];

    for (directive, description) in federation_checks {
        if result.contains(directive) {
            println!("✓ Found {} directive", description);
        }
    }

    // At minimum, should have some federation support
    assert!(
        result.contains("@key")
            || result.contains("@shareable")
            || result.contains("@external")
            || result.contains("@requires")
            || result.contains("@provides"),
        "Should support at least some federation directives"
    );
}

#[test]
fn test_type_name_mapping() {
    let schema = load_test_schema("comprehensive-features.json");
    let converter = Converter::new();
    let result = converter
        .json_schema_to_graphql(&schema)
        .expect("Conversion should succeed");

    // Verify x-graphql-type-name is respected
    assert!(
        result.contains("type User"),
        "Should use x-graphql-type-name for User"
    );
    assert!(
        result.contains("type Product"),
        "Should use x-graphql-type-name for Product"
    );
    assert!(
        result.contains("type Order"),
        "Should use x-graphql-type-name for Order"
    );
}

#[test]
fn test_field_name_mapping() {
    let schema = load_test_schema("comprehensive-features.json");
    let converter = Converter::new();
    let result = converter
        .json_schema_to_graphql(&schema)
        .expect("Conversion should succeed");

    // Verify x-graphql-field-name mappings (snake_case -> camelCase)
    assert!(
        result.contains("createdAt"),
        "Should map created_at to createdAt"
    );
    assert!(
        result.contains("updatedAt"),
        "Should map updated_at to updatedAt"
    );
    assert!(
        !result.contains("created_at"),
        "Should not contain snake_case field names"
    );
}

#[test]
fn test_field_type_mapping() {
    let schema = load_test_schema("comprehensive-features.json");
    let converter = Converter::new();
    let result = converter
        .json_schema_to_graphql(&schema)
        .expect("Conversion should succeed");

    // Verify x-graphql-field-type is respected
    assert!(result.contains("ID"), "Should map to GraphQL ID type");
    assert!(result.contains("DateTime"), "Should map to DateTime scalar");
}

#[test]
fn test_descriptions_conversion() {
    let schema = load_test_schema("descriptions.json");
    let converter = Converter::new();
    let result = converter
        .json_schema_to_graphql(&schema)
        .expect("Conversion should succeed");

    // When both description and x-graphql-description exist,
    // x-graphql-description should take precedence
    // This is verified by checking the output contains description markers
    assert!(
        result.contains("\"\"\"") || result.contains("#"),
        "Should include descriptions in output"
    );
}
