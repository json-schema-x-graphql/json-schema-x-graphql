#![no_main]

use json_schema_graphql_converter::{ConversionOptions, Converter};
use libfuzzer_sys::fuzz_target;

fuzz_target!(|data: &[u8]| {
    // Try to parse the input as a UTF-8 string
    if let Ok(input_str) = std::str::from_utf8(data) {
        // Create converter with validation disabled for fuzzing
        let options = ConversionOptions {
            validate: false,
            include_descriptions: true,
            preserve_field_order: true,
            federation_version: 2,
        };
        let converter = Converter::with_options(options);

        // Try JSON Schema -> GraphQL -> JSON Schema round trip
        if let Ok(graphql) = converter.json_schema_to_graphql(input_str) {
            // If first conversion succeeded, try converting back
            let _ = converter.graphql_to_json_schema(&graphql);
        }

        // Also try GraphQL -> JSON Schema -> GraphQL round trip
        if let Ok(json_schema) = converter.graphql_to_json_schema(input_str) {
            // If first conversion succeeded, try converting back
            let _ = converter.json_schema_to_graphql(&json_schema);
        }
    }
});
