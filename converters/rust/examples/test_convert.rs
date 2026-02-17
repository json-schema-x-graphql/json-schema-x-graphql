use json_schema_x_graphql::{ConversionOptions, Converter};
use std::fs;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let input = fs::read_to_string(
        "/home/john/json-schema-x-graphql/converters/test-data/fuzz_edge_cases.json",
    )?;
    let converter = Converter::with_options(ConversionOptions::default());
    let output = converter.json_schema_to_graphql(&input)?;
    fs::write(
        "/home/john/json-schema-x-graphql/output/comparison/fuzz_edge_cases-rust.graphql",
        output,
    )?;
    Ok(())
}
