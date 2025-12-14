
use std::fs;
use json_schema_graphql_converter::*;

fn main() {
    let json_content = fs::read_to_string("/home/john/json-schema-x-graphql/converters/test-data/user-service.json").expect("Failed to read file");

    match json_to_graphql(&json_content, &ConversionOptions::default()) {
        Ok(sdl) => {
            fs::write("/home/john/json-schema-x-graphql/output/comparison/user-service-rust.graphql", sdl).expect("Failed to write output");
            println!("SUCCESS");
        }
        Err(e) => {
            eprintln!("ERROR: {:?}", e);
            std::process::exit(1);
        }
    }
}
