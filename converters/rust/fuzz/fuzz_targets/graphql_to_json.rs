#![no_main]

use json_schema_graphql_converter::{ConversionOptions, Converter};
use libfuzzer_sys::fuzz_target;

fuzz_target!(|data: &[u8]| {
    // Try to parse the input as a UTF-8 string
    if let Ok(input_str) = std::str::from_utf8(data) {
        // Create converter with validation disabled for fuzzing
        // (we want to test the parser's robustness, not validation logic)
        let options = ConversionOptions {
            validate: false,
            include_descriptions: true,
            preserve_field_order: true,
            federation_version: 2,
            ..Default::default()
        };
        let converter = Converter::with_options(options);

        // Try to convert - we don't care if it fails, we just want to ensure
        // it doesn't panic or cause undefined behavior
        let _ = converter.graphql_to_json_schema(input_str);
    }
});
