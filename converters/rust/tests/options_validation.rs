//! Tests for `ConversionOptions::validate()` contract enforcement.
//!
//! Verifies that invalid option values are rejected at conversion time
//! rather than silently producing incorrect output.

use json_schema_x_graphql::{ConversionDirection, ConversionOptions, Converter};

// --- Unit tests: validate() directly ---

#[test]
fn validate_default_options_is_ok() {
    let opts = ConversionOptions::default();
    assert!(opts.validate().is_ok());
}

#[test]
fn validate_federation_version_0_is_ok() {
    let opts = ConversionOptions {
        federation_version: 0,
        ..ConversionOptions::default()
    };
    assert!(
        opts.validate().is_ok(),
        "federation_version 0 should be valid"
    );
}

#[test]
fn validate_federation_version_1_is_ok() {
    let opts = ConversionOptions {
        federation_version: 1,
        ..ConversionOptions::default()
    };
    assert!(opts.validate().is_ok());
}

#[test]
fn validate_federation_version_2_is_ok() {
    let opts = ConversionOptions {
        federation_version: 2,
        ..ConversionOptions::default()
    };
    assert!(opts.validate().is_ok());
}

#[test]
fn validate_federation_version_3_is_err() {
    let opts = ConversionOptions {
        federation_version: 3,
        ..ConversionOptions::default()
    };
    let err = opts.validate().unwrap_err();
    let msg = err.to_string();
    assert!(
        msg.contains("federation_version"),
        "error message should name the field, got: {msg}"
    );
    assert!(
        msg.contains('3'),
        "error message should include the offending value, got: {msg}"
    );
}

#[test]
fn validate_federation_version_255_is_err() {
    let opts = ConversionOptions {
        federation_version: 255,
        ..ConversionOptions::default()
    };
    let err = opts.validate().unwrap_err();
    let msg = err.to_string();
    assert!(msg.contains("federation_version"));
    assert!(msg.contains("255"));
}

// --- End-to-end: validation triggers at convert time, not construction ---

#[test]
fn converter_with_bad_federation_version_rejects_at_convert() {
    let opts = ConversionOptions {
        federation_version: 99,
        ..ConversionOptions::default()
    };
    let converter = Converter::with_options(opts);
    // Construction succeeds — validation is deferred to convert time

    let json_schema = r#"{
        "type": "object",
        "x-graphql-type-name": "User"
    }"#;

    let result = converter.convert(json_schema, ConversionDirection::JsonSchemaToGraphQL);
    assert!(result.is_err(), "expected convert to fail on bad options");
    let msg = result.unwrap_err().to_string();
    assert!(
        msg.contains("federation_version"),
        "error message should name the field, got: {msg}"
    );
    assert!(
        msg.contains("99"),
        "error message should include the offending value, got: {msg}"
    );
}

#[test]
fn converter_with_good_options_works_end_to_end() {
    let opts = ConversionOptions {
        federation_version: 1,
        ..ConversionOptions::default()
    };
    let converter = Converter::with_options(opts);

    let json_schema = r#"{
        "type": "object",
        "x-graphql-type-name": "User"
    }"#;

    let result = converter.convert(json_schema, ConversionDirection::JsonSchemaToGraphQL);
    assert!(
        result.is_ok(),
        "expected convert to succeed: {:?}",
        result.err()
    );
}
