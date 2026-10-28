use json_schema_x_graphql::{ConversionError, Converter};
use serde_json::json;

#[test]
fn dangling_internal_ref_returns_invalid_reference_with_path() {
    let schema = json!({
        "type": "object",
        "x-graphql-type-name": "Root",
        "$defs": {},
        "properties": {
            "missing": {
                "$ref": "#/$defs/Missing"
            }
        }
    });

    let result = Converter::new().json_schema_to_graphql(&schema.to_string());

    let Err(ConversionError::InvalidReference(message)) = result else {
        panic!("expected InvalidReference for dangling internal ref, got {result:?}");
    };
    assert!(
        message.contains("#/$defs/Missing"),
        "error should identify the missing reference path: {message}"
    );
}

#[test]
fn valid_internal_ref_still_converts() {
    let schema = json!({
        "type": "object",
        "x-graphql-type-name": "Root",
        "$defs": {
            "Present": {
                "type": "object",
                "x-graphql-type-name": "Present",
                "properties": {
                    "value": { "type": "string" }
                }
            }
        },
        "properties": {
            "present": {
                "$ref": "#/$defs/Present"
            }
        }
    });

    let result = Converter::new().json_schema_to_graphql(&schema.to_string());

    let sdl = result.expect("valid internal reference should convert");
    assert!(sdl.contains("type Present"), "SDL was:\n{sdl}");
    assert!(sdl.contains("present: Present"), "SDL was:\n{sdl}");
}

#[test]
fn external_ref_still_uses_placeholder_schema() {
    let schema = json!({
        "type": "object",
        "x-graphql-type-name": "Root",
        "properties": {
            "external": {
                "$ref": "https://example.com/schema.json"
            }
        }
    });

    let result = Converter::new().json_schema_to_graphql(&schema.to_string());

    let sdl = result.expect("external reference should convert using its placeholder");
    assert!(sdl.contains("externalRef: String"), "SDL was:\n{sdl}");
    assert!(
        sdl.contains("Placeholder for external reference"),
        "SDL was:\n{sdl}"
    );
}
