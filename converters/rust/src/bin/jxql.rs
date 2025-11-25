use anyhow::{Context, Result};
use clap::Parser;
use json_schema_graphql_converter::{ConversionOptions, Converter};
use std::fs;
use std::path::PathBuf;

/// JSON Schema to GraphQL SDL Converter CLI
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Path to local JSON schema file or URL to remote schema
    #[arg(short, long, value_name = "INPUT")]
    input: String,

    /// Output file path (defaults to stdout)
    #[arg(short, long)]
    output: Option<PathBuf>,

    /// Infer ID scalar from fields named "id" or "_id"
    #[arg(long, default_value_t = false)]
    infer_ids: bool,

    /// Disable schema validation
    #[arg(long, default_value_t = false)]
    no_validate: bool,

    /// Include descriptions in output
    #[arg(long, default_value_t = true)]
    descriptions: bool,

    /// Preserve field order
    #[arg(long, default_value_t = true)]
    preserve_order: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    // Fetch input content
    let json_content = if args.input.starts_with("http://") || args.input.starts_with("https://") {
        eprintln!("Fetching schema from {}...", args.input);
        reqwest::get(&args.input)
            .await
            .context("Failed to fetch remote schema")?
            .text()
            .await
            .context("Failed to read response text")?
    } else {
        fs::read_to_string(&args.input)
            .context(format!("Failed to read local file: {}", args.input))?
    };

    // Configure converter
    let options = ConversionOptions {
        validate: !args.no_validate,
        include_descriptions: args.descriptions,
        preserve_field_order: args.preserve_order,
        federation_version: 2,
        infer_ids: args.infer_ids,
    };

    let converter = Converter::with_options(options);

    // Convert
    let graphql_sdl = converter
        .json_schema_to_graphql(&json_content)
        .context("Conversion failed")?;

    // Output
    if let Some(output_path) = args.output {
        fs::write(&output_path, &graphql_sdl)
            .context(format!("Failed to write output to {:?}", output_path))?;
        eprintln!("Successfully converted and saved to {:?}", output_path);
    } else {
        println!("{}", graphql_sdl);
    }

    Ok(())
}
