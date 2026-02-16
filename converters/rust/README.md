# JSON Schema x GraphQL Rust Converter

Bidirectional, lossless converter between JSON Schema and GraphQL SDL using standardized `x-graphql-*` extensions.

## Features

- ✅ **Bidirectional Conversion**: JSON Schema ↔ GraphQL SDL
- ✅ **Lossless Round-Tripping**: Preserves all metadata via `x-graphql-*` extensions
- ✅ **Apollo Federation Support**: Full support for Federation v1 and v2 directives
- ✅ **WASM Compatible**: Run in browsers and Node.js
- ✅ **Type Safe**: Written in Rust with strong type guarantees
- ✅ **Fast**: Optimized for performance with optional LRU caching
- ✅ **Standards Compliant**: Follows JSON Schema 2020-12 and GraphQL spec

## Simplified Extension System & Type Inference

The converter favors **implicit first inferred schema**, handling inference automatically where possible, while allowing explicit overrides via extensions.

### Core Principles

1.  **Inference over Declaration** - Infer GraphQL types from JSON Schema wherever possible
2.  **Minimal Extensions** - Only add extensions when transformation is needed
3.  **Leverage JSON Schema Semantics** - Use `required`, property names, and types directly

### Automatic Type Mapping

| JSON Schema | GraphQL                    |
| ----------- | -------------------------- |
| `string`    | `String`                   |
| `integer`   | `Int`                      |
| `number`    | `Float`                    |
| `boolean`   | `Boolean`                  |
| `array`     | `[ItemType]`               |
| `object`    | Custom type or JSON scalar |

### Format-Based Inference

| JSON Format | GraphQL Type |
| ----------- | ------------ |
| `uuid`      | `ID`         |
| `date-time` | `DateTime`   |
| `date`      | `Date`       |
| `time`      | `Time`       |
| `email`     | `Email`      |
| `uri`       | `URL`        |

### Extension Usage

#### 1. Type Definition

Use `x-graphql-type-name` or `title` to name your types. `x-graphql-type-kind` is optional and inferred.

```json
{
  "title": "User",
  "type": "object",
  "properties": { ... }
}
```

#### 2. Field Type Override

Use `x-graphql-type` to override inferred types.

```json
"id": {
  "type": "string",
  "x-graphql-type": "ID" // Override only if needed (e.g. if format: uuid is missing)
}
```

#### 3. Unions and Interfaces

- **Unions**: Use `oneOf` to infer union types.
- **Interfaces**: Use `allOf` to infer interface implementation.

#### 4. Arguments

Use `x-graphql-args` for field arguments.

```json
"posts": {
  "type": "array",
  "items": { "$ref": "#/$defs/Post" },
  "x-graphql-args": {
    "limit": { "type": "integer", "default": 10 }
  }
}
```

## Installation

### As a Rust Library

Add to your `Cargo.toml`:

```toml
[dependencies]
json-schema-graphql-converter = "0.1.0"
```

### As WASM for JavaScript/TypeScript

```bash
npm install @json-schema-x-graphql/rust-converter
```

Or build from source:

```bash
wasm-pack build --target web
```

## Usage

### Rust

```rust
use json_schema_graphql_converter::{Converter, ConversionDirection};

fn main() {
    let converter = Converter::new();

    // JSON Schema to GraphQL
    let json_schema = r#"{
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "x-graphql-type-name": "User",
        "properties": {
            "id": {
                "type": "string",
                "x-graphql-type": "ID!"
            },
            "name": {
                "type": "string"
            }
        }
    }"#;

    let graphql = converter.json_schema_to_graphql(json_schema).unwrap();
    println!("{}", graphql);

    // GraphQL to JSON Schema
    let sdl = r#"
        type User {
            id: ID!
            name: String
        }
    "#;

    let json = converter.graphql_to_json_schema(sdl).unwrap();
    println!("{}", json);
}
```

### JavaScript/TypeScript (WASM)

```javascript
import init, { WasmConverter } from "./pkg/json_schema_graphql_converter.js";

async function main() {
  // Initialize WASM module
  await init();

  const converter = new WasmConverter();

  // JSON Schema to GraphQL
  const jsonSchema = JSON.stringify({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    "x-graphql-type-name": "User",
    properties: {
      id: {
        type: "string",
        "x-graphql-type": "ID!",
      },
    },
  });

  const graphql = converter.jsonSchemaToGraphQL(jsonSchema);
  console.log(graphql);

  // GraphQL to JSON Schema
  const sdl = `
        type User {
            id: ID!
            name: String
        }
    `;

  const json = converter.graphqlToJsonSchema(sdl);
  console.log(json);
}

main();
```

### Custom Options

```rust
use json_schema_graphql_converter::{Converter, ConversionOptions};

let options = ConversionOptions {
    validate: true,
    include_descriptions: true,
    preserve_field_order: true,
    federation_version: 2,
};

let converter = Converter::with_options(options);
```

### Command-Line (jxql)

Build the CLI and run it with the standardized flags:

```bash
cargo build --release --features cli
./target/release/jxql \
    --input schema.json \
    --output out.graphql \
    --id-strategy COMMON_PATTERNS \
    --output-format SDL \
    --fail-on-warning
```

Key flags:

- `--id-strategy` (`NONE` | `COMMON_PATTERNS` | `ALL_STRINGS`), with legacy `--infer-ids` mapping to `COMMON_PATTERNS`.
- `--output-format` (`SDL` | `SDL_WITH_FEDERATION_METADATA` | `AST_JSON`).
- `--fail-on-warning` to exit non-zero on warnings.

### WASM Advanced Options

`WasmConverter` covers the common options; for the full option surface (including `idStrategy`, `outputFormat`, and `failOnWarning`), use the `convert` export which mirrors the standardized API:

```javascript
import init, { convert } from "./pkg/json_schema_graphql_converter.js";

await init();

const result = convert({
  jsonSchema: JSON.stringify(mySchema),
  options: {
    idStrategy: "ALL_STRINGS",
    outputFormat: "AST_JSON",
    failOnWarning: true,
    includeFederationDirectives: true,
  },
});

console.log(result.output);
```

## Building

### Native Rust Library

```bash
cargo build --release
```

### WASM for Web

```bash
# Install wasm-pack if not already installed
cargo install wasm-pack

# Build for web
wasm-pack build --target web --out-dir pkg/web

# Build for Node.js
wasm-pack build --target nodejs --out-dir pkg/node

# Build for bundlers (webpack, rollup, etc.)
wasm-pack build --target bundler --out-dir pkg/bundler
```

### Development

```bash
# Run tests
cargo test

# Run tests with all features
cargo test --all-features

# Run benchmarks
cargo bench

# Check code
cargo clippy -- -D warnings

# Format code
cargo fmt
```

## Testing

```bash
# Run all tests
cargo test

# Run tests with output
cargo test -- --nocapture

# Run specific test
cargo test test_name

# Run integration tests
cargo test --test integration_tests

# Run tests with coverage (requires cargo-tarpaulin)
cargo tarpaulin --out Html
```

### Fuzzing

The project includes fuzzing targets to test the robustness of the parsers:

```bash
# Install cargo-fuzz (if not already installed)
cargo install cargo-fuzz

# List available fuzz targets
cargo fuzz list

# Run JSON to GraphQL fuzzing
cargo fuzz run json_to_graphql

# Run GraphQL to JSON fuzzing
cargo fuzz run graphql_to_json

# Run round-trip fuzzing
cargo fuzz run round_trip

# Run with specific time limit (e.g., 60 seconds)
cargo fuzz run json_to_graphql -- -max_total_time=60

# Run with specific number of jobs
cargo fuzz run json_to_graphql -- -jobs=4
```

Available fuzz targets:

- `json_to_graphql` - Tests JSON Schema parsing and conversion to GraphQL
- `graphql_to_json` - Tests GraphQL SDL parsing and conversion to JSON Schema
- `round_trip` - Tests bidirectional conversion for data integrity

## Performance

The converter is optimized for performance:

- **Zero-copy parsing** where possible
- **Optional LRU caching** for repeated conversions
- **Compiled to native code** via Rust
- **WASM optimizations** with `opt-level = "z"` and LTO

Enable caching feature for improved performance:

```toml
[dependencies]
json-schema-graphql-converter = { version = "0.1.0", features = ["caching"] }
```

## Features

- `default`: Includes WASM support
- `wasm`: WASM bindings for browser/Node.js
- `caching`: LRU cache for improved performance

## Architecture

The converter is organized into modules:

- `lib.rs` - Main converter interface
- `types.rs` - Core type definitions
- `error.rs` - Error types and handling
- `validator.rs` - Validation utilities
- `json_to_graphql.rs` - JSON Schema → GraphQL conversion
- `graphql_to_json.rs` - GraphQL → JSON Schema conversion
- `wasm.rs` - WASM bindings (feature-gated)

## Portability

This converter is designed to be portable and can be:

- Used as a standalone library
- Compiled to WASM for web/Node.js
- Extracted as a git submodule
- Published to crates.io
- Integrated into other projects

## Examples

See the `examples/` directory for more usage examples:

- `basic_conversion.rs` - Simple conversion examples
- `federation.rs` - Apollo Federation examples
- `custom_directives.rs` - Custom directive handling
- `validation.rs` - Validation examples

## Contributing

Contributions are welcome! Please see the main repository's CONTRIBUTING.md for guidelines.

## License

MIT License - see LICENSE file for details

## Links

- [Main Repository](https://github.com/json-schema-x-graphql/json-schema-x-graphql)
- [Documentation](https://docs.rs/json-schema-graphql-converter)
- [crates.io](https://crates.io/crates/json-schema-graphql-converter)
- [npm Package](https://www.npmjs.com/package/@json-schema-x-graphql/rust-converter)

## Support

- GitHub Issues: [Report bugs or request features](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues)
- GitHub Discussions: [Ask questions and share ideas](https://github.com/json-schema-x-graphql/json-schema-x-graphql/discussions)
