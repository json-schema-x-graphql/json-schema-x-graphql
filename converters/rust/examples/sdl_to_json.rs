//! Example: Convert GraphQL SDL to JSON Schema
//!
//! Usage:
//!   cargo run --example sdl_to_json -- <input.graphql>
//!   cargo run --example sdl_to_json -- <input.graphql> > output.json

use json_schema_x_graphql::{ConversionOptions, Converter, NamingConvention};
use std::env;
use std::fs;
use std::process;

fn main() {
    let args: Vec<String> = env::args().collect();

    if args.len() < 2 {
        eprintln!("Usage: {} <input.graphql>", args[0]);
        eprintln!("Example: {} schema/user.graphql", args[0]);
        process::exit(1);
    }

    let input_file = &args[1];

    // Read input GraphQL SDL
    let sdl_content = match fs::read_to_string(input_file) {
        Ok(content) => content,
        Err(e) => {
            eprintln!("Error reading file '{}': {}", input_file, e);
            process::exit(1);
        }
    };

    // Create converter with options
    let options = ConversionOptions {
        validate: false,
        include_descriptions: true,
        preserve_field_order: true,
        federation_version: 2,
        infer_ids: false,
        naming_convention: NamingConvention::GraphqlIdiomatic,
        exclude_types: vec![],
        exclude_patterns: vec![],
        ..Default::default()
    };

    let converter = Converter::with_options(options);

    // Convert GraphQL SDL to JSON Schema
    match converter.graphql_to_json_schema(&sdl_content) {
        Ok(json_schema) => {
            println!("{}", json_schema);
        }
        Err(e) => {
            eprintln!("Conversion error: {:?}", e);
            process::exit(1);
        }
    }
}
