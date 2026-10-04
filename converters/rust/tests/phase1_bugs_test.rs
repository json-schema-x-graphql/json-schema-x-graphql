use json_schema_x_graphql::{ConversionDirection, Converter};
use serde_json::json;

#[test]
fn test_phase1_issue_245_one_of_null_union() {
    let schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$defs": {
            "AnchorReceipt": {
                "type": "object",
                "x-graphql-type-name": "AnchorReceipt",
                "properties": {
                    "contentHash": { "type": "string" }
                }
            }
        },
        "type": "object",
        "title": "Contract",
        "properties": {
            "anchorReceipt": {
                "oneOf": [
                    { "type": "null" },
                    { "$ref": "#/$defs/AnchorReceipt" }
                ]
            }
        }
    });

    let converter = Converter::new();
    let result = converter
        .convert(&schema.to_string(), ConversionDirection::JsonSchemaToGraphQL)
        .expect("Conversion failed");

    assert!(result.contains("anchorReceipt: AnchorReceipt"));
    assert!(!result.contains("anchorReceipt: JSON"));
    assert!(result.contains("type AnchorReceipt"));
}

#[test]
fn test_phase1_issue_234_null_primitive_unions() {
    let schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "title": "Dataset",
        "properties": {
            "title": {
                "type": ["null", "string"]
            },
            "count": {
                "type": ["integer", "null"]
            }
        }
    });

    let converter = Converter::new();
    let result = converter
        .convert(&schema.to_string(), ConversionDirection::JsonSchemaToGraphQL)
        .expect("Conversion failed");

    assert!(result.contains("title: String"));
    assert!(result.contains("count: Int"));
    assert!(!result.contains("title: JSON"));
    assert!(!result.contains("count: JSON"));
}

#[test]
fn test_phase1_issue_233_explicit_field_type_array() {
    let schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "title": "Catalog",
        "properties": {
            "hasPart": {
                "type": "array",
                "items": { "type": "object" },
                "x-graphql-field-type": "DcatCatalog"
            }
        }
    });

    let converter = Converter::new();
    let result = converter
        .convert(&schema.to_string(), ConversionDirection::JsonSchemaToGraphQL)
        .expect("Conversion failed");

    assert!(result.contains("hasPart: [DcatCatalog]"));
}

#[test]
fn test_phase1_issue_231_root_type_name_respected() {
    let schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": "https://example.com/schemas/dcat-us-catalog.template.schema.json",
        "type": "object",
        "x-graphql-type-name": "DcatCatalog",
        "properties": {
            "name": { "type": "string" }
        }
    });

    let converter = Converter::new();
    let result = converter
        .convert(&schema.to_string(), ConversionDirection::JsonSchemaToGraphQL)
        .expect("Conversion failed");

    assert!(result.contains("type DcatCatalog"));
    assert!(!result.contains("type Dcatcatalog"));
}

#[test]
fn test_phase1_issue_236_237_root_self_reference() {
    let schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "title": "Catalog",
        "x-graphql-type-name": "DcatCatalog",
        "properties": {
            "subCatalogs": {
                "type": "array",
                "items": {
                    "$ref": "#"
                }
            }
        }
    });

    let converter = Converter::new();
    let result = converter
        .convert(&schema.to_string(), ConversionDirection::JsonSchemaToGraphQL)
        .expect("Conversion failed");

    assert!(result.contains("type DcatCatalog"));
    assert!(result.contains("subCatalogs: [DcatCatalog]"));
    assert!(!result.contains("type Catalog"));
    assert!(!result.contains("type DcatCatalog1"));
}
