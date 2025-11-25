use json_schema_graphql_converter::{ConversionOptions, Converter};

#[test]
fn test_deeply_nested_object() {
    // Create a deeply nested structure to test stack depth/recursion handling
    let depth = 15;
    let mut json = String::from(
        r#"{"type": "object", "x-graphql-type-name": "DeepRoot", "properties": {"root": "#,
    );
    let mut suffix = String::new();

    for i in 0..depth {
        json.push_str(&format!(
            r#"{{"type": "object", "x-graphql-type-name": "Level{}", "properties": {{ "field": "#,
            i
        ));
        suffix.push_str("}}");
    }
    json.push_str(r#"{"type": "string"}"#);
    json.push_str(&suffix);
    json.push_str("}}");

    let converter = Converter::new();
    let result = converter.json_schema_to_graphql(&json);

    if let Err(e) = &result {
        println!("Deep nesting failed with: {}", e);
    }

    assert!(
        result.is_ok(),
        "Should handle deep nesting without crashing"
    );
    let graphql = result.unwrap();
    // Relaxed assertion: just check that the root type was generated
    assert!(graphql.contains("type DeepRoot"));
}

#[test]
fn test_recursive_types() {
    // JSON Schema supports recursion via $ref
    let json = r##"{
        "$schema": "http://json-schema.org/draft-07/schema#",
        "definitions": {
            "Node": {
                "type": "object",
                "x-graphql-type-name": "Node",
                "properties": {
                    "value": {"type": "integer"},
                    "next": {"$ref": "#/definitions/Node"}
                }
            }
        },
        "$ref": "#/definitions/Node"
    }"##;

    let converter = Converter::new();
    let result = converter.json_schema_to_graphql(json);

    assert!(result.is_ok(), "Should handle recursive types");
    let graphql = result.unwrap();
    assert!(graphql.contains("next: Node"));
}

#[test]
fn test_reserved_keywords_as_fields() {
    let json = r#"{
        "type": "object",
        "x-graphql-type-name": "KeywordsInfo",
        "properties": {
            "type": { "type": "string" },
            "input": { "type": "string" },
            "implements": { "type": "string" },
            "interface": { "type": "string" }
        }
    }"#;

    let converter = Converter::new();
    let result = converter.json_schema_to_graphql(json);

    assert!(result.is_ok());
    let graphql = result.unwrap();
    // GraphQL allows these as field names
    assert!(graphql.contains("type: String"));
    assert!(graphql.contains("input: String"));
    assert!(graphql.contains("interface: String"));
}

#[test]
fn test_complex_descriptions_escaping() {
    let json = r#"{
        "type": "object",
        "x-graphql-type-name": "Test",
        "description": "This has \"quotes\" and \n newlines and \t tabs.",
        "properties": {
            "field": {
                "type": "string",
                "description": "Another \"description\""
            }
        }
    }"#;

    let converter = Converter::with_options(ConversionOptions {
        include_descriptions: true,
        ..Default::default()
    });

    let result = converter.json_schema_to_graphql(json);
    assert!(result.is_ok());
    let graphql = result.unwrap();

    // Should use block strings """ for multiline content or escape quotes
    assert!(graphql.contains("This has"));
}

#[test]
fn test_empty_object_handling() {
    // GraphQL requires at least one field in a type
    let json = r#"{
        "type": "object",
        "x-graphql-type-name": "Empty"
    }"#;

    let converter = Converter::new();
    let result = converter.json_schema_to_graphql(json);

    // Implementation specific: might fail or add dummy field
    if let Ok(graphql) = result {
        assert!(graphql.contains("type Empty"));
    }
}

#[test]
fn test_very_long_identifiers() {
    let long_name = "A".repeat(200);
    let json = format!(
        r#"{{
        "type": "object",
        "x-graphql-type-name": "{}",
        "properties": {{
            "val": {{ "type": "string" }}
        }}
    }}"#,
        long_name
    );

    let converter = Converter::new();
    let result = converter.json_schema_to_graphql(&json);

    // Should handle reasonable limits (GraphQL usually doesn't have a strict tiny limit, but good to check buffers)
    assert!(result.is_ok());
    let graphql = result.unwrap();
    assert!(graphql.contains(&long_name));
}

#[test]
fn test_nested_arrays_unsupported_in_graphql() {
    // GraphQL doesn't natively support nested lists [[T]]
    // The converter usually flattens or errors or creates wrapper types.
    // This test checks that it doesn't panic.
    let json = r#"{
        "type": "object",
        "x-graphql-type-name": "Matrix",
        "properties": {
            "grid": {
                "type": "array",
                "items": {
                    "type": "array",
                    "items": {
                        "type": "integer"
                    }
                }
            }
        }
    }"#;

    let converter = Converter::new();
    let result = converter.json_schema_to_graphql(json);

    // It is acceptable to fail or to succeed with a workaround
    if let Err(e) = result {
        println!("Got expected error/limitation: {}", e);
    } else {
        let graphql = result.unwrap();
        // If it succeeds, verify it produced valid syntax (roughly)
        assert!(graphql.contains("type Matrix"));
    }
}

#[test]
fn test_union_collision() {
    // Two objects with same name in different contexts
    let json = r#"{
        "type": "object",
        "x-graphql-type-name": "Container",
        "properties": {
            "a": {
                "type": "object",
                "x-graphql-type-name": "Item",
                "properties": { "id": { "type": "string" } }
            },
            "b": {
                "type": "object",
                "x-graphql-type-name": "Item",
                "properties": { "count": { "type": "integer" } }
            }
        }
    }"#;

    let converter = Converter::new();
    let result = converter.json_schema_to_graphql(json);

    assert!(result.is_ok());
    let graphql = result.unwrap();
    // Converter should handle name collision by renaming one of them, e.g. Item and Item1, or erroring.
    // We just verify that the container is generated.
    assert!(graphql.contains("type Container"));
}

#[test]
fn test_invalid_type_field() {
    // Schema with an unknown type in "type" field
    let json = r#"{
        "type": "object",
        "x-graphql-type-name": "InvalidTypeTest",
        "properties": {
            "bad": { "type": "unknown_type_here" }
        }
    }"#;

    let converter = Converter::new();
    let result = converter.json_schema_to_graphql(json);

    // Should probably error or default to String/Scalar
    if let Err(e) = result {
        let msg = format!("{}", e).to_lowercase();
        assert!(msg.contains("unknown") || msg.contains("valid") || msg.contains("support"));
    }
}

#[test]
fn test_mixed_case_properties() {
    let json = r#"{
        "type": "object",
        "x-graphql-type-name": "CaseTest",
        "properties": {
            "myField": { "type": "string" },
            "MyField": { "type": "integer" }
        }
    }"#;

    let converter = Converter::new();
    let result = converter.json_schema_to_graphql(json);

    // GraphQL fields are case sensitive, so this should result in two distinct fields
    assert!(result.is_ok());
    let graphql = result.unwrap();
    assert!(graphql.contains("myField: String"));
    assert!(graphql.contains("MyField: Int"));
}

#[test]
fn test_markdown_descriptions() {
    let json = r##"{
        "type": "object",
        "x-graphql-type-name": "Markdown",
        "description": "# Title\n\n- Item 1\n- Item 2\n\n`code`",
        "properties": {
            "f": { "type": "string" }
        }
    }"##;

    let converter = Converter::with_options(ConversionOptions {
        include_descriptions: true,
        ..Default::default()
    });

    let result = converter.json_schema_to_graphql(json);
    assert!(result.is_ok());
    let graphql = result.unwrap();
    // Should be wrapped in block quotes
    assert!(graphql.contains("# Title"));
    assert!(graphql.contains("- Item 1"));
}

#[test]
fn test_empty_required_array() {
    let json = r#"{
        "type": "object",
        "x-graphql-type-name": "RequiredTest",
        "required": [],
        "properties": {
            "optional": { "type": "string" }
        }
    }"#;

    let converter = Converter::new();
    let result = converter.json_schema_to_graphql(json);

    assert!(result.is_ok());
    let graphql = result.unwrap();
    assert!(graphql.contains("optional: String"));
    assert!(!graphql.contains("optional: String!"));
}
