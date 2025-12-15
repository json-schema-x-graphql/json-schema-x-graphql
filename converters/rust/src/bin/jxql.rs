use anyhow::{Context, Result};
use clap::Parser;
use json_schema_graphql_converter::{
    ConversionOptions, Converter, IdInferenceStrategy, NamingConvention, OutputFormat,
};
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

    /// Federation version target (1 or 2)
    #[arg(long, default_value_t = 2)]
    federation_version: u8,

    /// Naming convention (preserve, graphql-idiomatic)
    #[arg(long, default_value = "GRAPHQL_IDIOMATIC")]
    naming_convention: String,

    /// ID inference strategy (NONE, COMMON_PATTERNS, ALL_STRINGS)
    #[arg(long, default_value = "NONE")]
    id_strategy: String,

    /// Output format (SDL, SDL_WITH_FEDERATION_METADATA, AST_JSON)
    #[arg(long, default_value = "SDL")]
    output_format: String,

    /// Treat warnings as errors
    #[arg(long, default_value_t = false)]
    fail_on_warning: bool,

    /// Types to exclude (comma separated)
    #[arg(long, value_delimiter = ',')]
    exclude_types: Vec<String>,

    /// Regex patterns to exclude (comma separated)
    #[arg(long, value_delimiter = ',')]
    exclude_patterns: Vec<String>,

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

    let naming_convention = match args.naming_convention.to_uppercase().as_str() {
        "PRESERVE" => NamingConvention::Preserve,
        _ => NamingConvention::GraphqlIdiomatic,
    };

    let id_strategy = match args.id_strategy.to_uppercase().as_str() {
        "COMMON_PATTERNS" => IdInferenceStrategy::CommonPatterns,
        "ALL_STRINGS" => IdInferenceStrategy::AllStrings,
        _ => {
            if args.infer_ids {
                IdInferenceStrategy::CommonPatterns
            } else {
                IdInferenceStrategy::None
            }
        }
    };

    let output_format = match args.output_format.to_uppercase().as_str() {
        "SDL_WITH_FEDERATION_METADATA" => OutputFormat::SdlWithFederationMetadata,
        "AST_JSON" => OutputFormat::AstJson,
        _ => OutputFormat::Sdl,
    };

    // Configure converter
    let options = ConversionOptions {
        validate: !args.no_validate,
        include_descriptions: args.descriptions,
        preserve_field_order: args.preserve_order,
        federation_version: args.federation_version,
        include_federation_directives: true,
        infer_ids: args.infer_ids,
        id_strategy,
        naming_convention,
        output_format,
        fail_on_warning: args.fail_on_warning,
        exclude_types: args.exclude_types,
        exclude_patterns: args.exclude_patterns,
        ..Default::default()
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
