//! Example: Convert JSON Schema to GraphQL SDL
//!
//! Usage:
//!   cargo run --example json_to_sdl -- <input.json>
//!   cargo run --example json_to_sdl -- <input.json> > output.graphql

use json_schema_graphql_converter::{ConversionOptions, Converter};
use std::env;
use std::fs;
use std::process;

fn main() {
    let args: Vec<String> = env::args().collect();

    if args.len() < 2 {
        eprintln!("Usage: {} <input.json>", args[0]);
        eprintln!("Example: {} schema/user.json", args[0]);
        process::exit(1);
    }

    let input_file = &args[1];

    // Read input JSON Schema
    let json_content = match fs::read_to_string(input_file) {
        Ok(content) => content,
        Err(e) => {
            eprintln!("Error reading file '{}': {}", input_file, e);
            process::exit(1);
        }
    };

    // Create converter with options
    let options = ConversionOptions {
        validate: false, // Set to false to see conversion errors more clearly
        include_descriptions: true,
        preserve_field_order: true,
        federation_version: 2,
        infer_ids: false,
    };

    let converter = Converter::with_options(options);

    // Convert JSON Schema to GraphQL SDL
    match converter.json_schema_to_graphql(&json_content) {
        Ok(sdl) => {
            println!("{}", sdl);
        }
        Err(e) => {
            eprintln!("Conversion error: {:?}", e);
            process::exit(1);
        }
    }
}
