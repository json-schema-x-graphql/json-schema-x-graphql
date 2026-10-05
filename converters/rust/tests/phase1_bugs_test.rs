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
        .convert(
            &schema.to_string(),
            ConversionDirection::JsonSchemaToGraphQL,
        )
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
        .convert(
            &schema.to_string(),
            ConversionDirection::JsonSchemaToGraphQL,
        )
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
        .convert(
            &schema.to_string(),
            ConversionDirection::JsonSchemaToGraphQL,
        )
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
        .convert(
            &schema.to_string(),
            ConversionDirection::JsonSchemaToGraphQL,
        )
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
        .convert(
            &schema.to_string(),
            ConversionDirection::JsonSchemaToGraphQL,
        )
        .expect("Conversion failed");

    assert!(result.contains("type DcatCatalog"));
    assert!(result.contains("subCatalogs: [DcatCatalog]"));
    assert!(!result.contains("type Catalog"));
    assert!(!result.contains("type DcatCatalog1"));
}

#[test]
fn test_phase1_issue_232_vocabulary_concept() {
    let schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$defs": {
            "Concept": {
                "type": "object",
                "x-graphql-type-name": "DcatConcept",
                "properties": {
                    "prefLabel": { "type": "string" }
                }
            }
        },
        "type": "object",
        "title": "Agent",
        "properties": {
            "hadRole": {
                "$ref": "#/$defs/Concept",
                "x-graphql-field-vocabulary": "http://www.w3.org/ns/dcat#hadRole"
            }
        }
    });

    let converter = Converter::new();
    let result = converter
        .convert(
            &schema.to_string(),
            ConversionDirection::JsonSchemaToGraphQL,
        )
        .expect("Conversion failed");

    assert!(result
        .contains("hadRole: String @vocabulary(concept: \"http://www.w3.org/ns/dcat#hadRole\")"));
    assert!(!result.contains("hadRole: DcatConcept"));
}

#[test]
fn test_phase1_issue_235_query_arg_formatting() {
    let schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "title": "Dataset",
        "x-graphql-operations": {
            "queries": {
                "dcatDataset": {
                    "type": "DcatDataset",
                    "description": "Fetch a dataset by ID",
                    "args": {
                        "id": {
                            "type": "ID!",
                            "description": "@id IRI of the dataset."
                        }
                    }
                }
            }
        }
    });

    let converter = Converter::new();
    let result = converter
        .convert(
            &schema.to_string(),
            ConversionDirection::JsonSchemaToGraphQL,
        )
        .expect("Conversion failed");

    assert!(result.contains("\"\"\"@id IRI of the dataset.\"\"\""));
    assert!(result.contains("id: ID!"));
    // Verify docstring is followed by a newline, not on the same line with excessive spaces
    assert!(!result.contains("\"\"\"    id: ID!"));
}

#[test]
fn test_custom_enum_registry_emission() {
    let schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "title": "Agent",
        "x-graphql-enums": {
            "SystemName": {
                "description": "Enumeration of system identifiers",
                "values": ["Legacy Procurement", "PRISM"]
            }
        },
        "properties": {
            "systemName": { "x-graphql-field-type": "SystemName" }
        }
    });

    let converter = Converter::new();
    let result = converter
        .convert(
            &schema.to_string(),
            ConversionDirection::JsonSchemaToGraphQL,
        )
        .expect("Conversion failed");

    assert!(result.contains("enum SystemName {"));
    assert!(result.contains("LEGACY_PROCUREMENT"));
    assert!(result.contains("PRISM"));
}

#[test]
fn test_explicit_scalar_verbatim_resolution() {
    let schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "title": "Span",
        "x-graphql-scalars": {
            "DateTime": { "description": "ISO 8601 date-time string" }
        },
        "$defs": {
            "CreatedTs": {
                "description": "Creation timestamp",
                "x-graphql-scalar": "EpochMs"
            }
        },
        "properties": {
            "stamp": { "type": "string", "x-graphql-scalar": "my_ts" },
            "createdAt": { "type": "string", "x-graphql-scalar": "DateTime" },
            "updatedAt": { "$ref": "#/$defs/CreatedTs" }
        }
    });

    let converter = Converter::new();
    let result = converter
        .convert(
            &schema.to_string(),
            ConversionDirection::JsonSchemaToGraphQL,
        )
        .expect("Conversion failed");

    // Explicitly declared scalar names are used verbatim (no case
    // transformation), including for root-level properties that the hints
    // scalar-field replacement previously missed.
    assert!(result.contains("stamp: my_ts"));
    assert!(result.contains("scalar my_ts"));
    assert!(!result.contains("MyTs"));

    // $ref targets that declare a scalar resolve to that scalar.
    assert!(result.contains("updatedAt: EpochMs"));

    // Registry scalars are injected verbatim by the hints pipeline.
    assert!(result.contains("scalar DateTime"));
    assert!(!result.contains("scalar Datetime"));
    assert!(result.contains("createdAt: DateTime"));
}

#[test]
fn test_enum_value_sanitization() {
    let schema = json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "title": "Ticket",
        "$defs": {
            "Status": {
                "enum": ["in progress", "on hold", "DONE"]
            }
        },
        "properties": {
            "status": { "$ref": "#/$defs/Status" }
        }
    });

    let converter = Converter::new();
    let result = converter
        .convert(
            &schema.to_string(),
            ConversionDirection::JsonSchemaToGraphQL,
        )
        .expect("Conversion failed");

    assert!(result.contains("enum Status {"));
    assert!(result.contains("IN_PROGRESS"));
    assert!(result.contains("ON_HOLD"));
    assert!(result.contains("DONE"));
}
