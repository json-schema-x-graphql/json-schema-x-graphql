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

/// A schema that falls back to the `JSON` scalar must also declare it.
///
/// Emitting `field: JSON` without a `scalar JSON` declaration produced invalid
/// GraphQL (`Unknown type "JSON"`), and converting that SDL back to JSON Schema
/// yielded a `$ref` to a definition that was never created — which the stricter
/// reference resolution above then (correctly) rejected on the next cycle.
#[test]
fn json_fallback_scalar_is_declared() {
    let schema = json!({
        "type": "object",
        "x-graphql-type-name": "Root",
        "properties": {
            "anything": { "oneOf": [{ "type": "string" }, { "type": "integer" }] }
        }
    });

    let sdl = Converter::new()
        .json_schema_to_graphql(&schema.to_string())
        .expect("schema should convert");

    assert!(sdl.contains("anything: JSON"), "SDL was:\n{sdl}");
    assert!(
        sdl.lines().any(|line| line.trim() == "scalar JSON"),
        "SDL should declare the JSON scalar it references:\n{sdl}"
    );
}

/// The exact round-trip the `3-Cycle Round-Trip Validation` job performs:
/// JSON Schema → SDL → JSON Schema → SDL must not fail on a self-produced
/// `#/definitions/JSON` reference.
#[test]
fn json_scalar_round_trips_without_dangling_reference() {
    let schema = json!({
        "type": "object",
        "x-graphql-type-name": "Root",
        "properties": {
            "anything": { "anyOf": [{ "type": "string" }, { "type": "integer" }] },
            "mixed": { "type": "array" }
        }
    });

    let converter = Converter::new();

    let sdl1 = converter
        .json_schema_to_graphql(&schema.to_string())
        .expect("cycle 1: JSON Schema -> SDL");
    let json1 = converter
        .graphql_to_json_schema(&sdl1)
        .expect("cycle 1: SDL -> JSON Schema");

    // The regenerated JSON Schema must not reference an undefined definition.
    let definitions = serde_json::from_str::<serde_json::Value>(&json1)
        .expect("cycle 1 JSON Schema should parse")
        .get("definitions")
        .cloned()
        .unwrap_or_else(|| json!({}));
    assert!(
        definitions.get("JSON").is_some(),
        "definitions should contain JSON; got {definitions}"
    );

    let sdl2 = converter
        .json_schema_to_graphql(&json1)
        .expect("cycle 2: JSON Schema -> SDL should not hit a dangling #/definitions/JSON");
    assert!(sdl2.contains("anything: JSON"), "SDL was:\n{sdl2}");
}
