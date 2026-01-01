//! Performance benchmarks for JSON Schema and GraphQL validation and conversion
//!
//! This benchmark suite measures:
//! - JSON Schema validation performance (dual validator approach)
//! - GraphQL SDL validation performance (Apollo validators)
//! - Conversion performance (JSON Schema ↔ GraphQL)
//! - Memory usage and optimization opportunities

use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};
use json_schema_x_graphql::{
    validation::{ComprehensiveGraphQLValidator, FullStackValidator, JsonSchemaValidator},
    ConversionDirection, Converter,
};
use serde_json::json;
use std::fs;
use std::path::PathBuf;

fn get_test_data_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .join("test-data")
}

fn get_x_graphql_test_data_path() -> PathBuf {
    get_test_data_path().join("x-graphql")
}

// Benchmark JSON Schema validation
fn bench_json_schema_validation(c: &mut Criterion) {
    let mut group = c.benchmark_group("json_schema_validation");

    let validator = JsonSchemaValidator::new(false);

    // Small schema benchmark
    let small_schema = json!({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "x-graphql-type-name": "User",
        "properties": {
            "id": {
                "type": "string",
                "x-graphql-field-type": "ID!"
            },
            "name": {
                "type": "string"
            }
        }
    });

    group.throughput(Throughput::Elements(1));
    group.bench_function("small_schema", |b| {
        b.iter(|| validator.validate(black_box(&small_schema)).unwrap())
    });

    // Medium schema benchmark
    let medium_schema = json!({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "x-graphql-type-name": "Product",
        "properties": {
            "id": { "type": "string", "x-graphql-field-type": "ID!" },
            "name": { "type": "string" },
            "description": { "type": "string" },
            "price": { "type": "number" },
            "inStock": { "type": "boolean" },
            "category": { "type": "string" },
            "tags": { "type": "array", "items": { "type": "string" } },
            "metadata": {
                "type": "object",
                "properties": {
                    "created": { "type": "string", "format": "date-time" },
                    "updated": { "type": "string", "format": "date-time" }
                }
            }
        }
    });

    group.bench_function("medium_schema", |b| {
        b.iter(|| validator.validate(black_box(&medium_schema)).unwrap())
    });

    // Large schema from test-data
    let basic_types_path = get_x_graphql_test_data_path().join("basic-types.json");
    if basic_types_path.exists() {
        let content = fs::read_to_string(&basic_types_path).unwrap();
        let large_schema: serde_json::Value = serde_json::from_str(&content).unwrap();

        group.bench_function("large_schema_from_file", |b| {
            b.iter(|| validator.validate(black_box(&large_schema)).unwrap())
        });
    }

    group.finish();
}

// Benchmark GraphQL SDL validation
fn bench_graphql_validation(c: &mut Criterion) {
    let mut group = c.benchmark_group("graphql_validation");

    let validator = ComprehensiveGraphQLValidator::new();

    // Simple SDL
    let simple_sdl = r#"
        type User {
            id: ID!
            name: String!
        }

        type Query {
            user(id: ID!): User
        }
    "#;

    group.throughput(Throughput::Elements(1));
    group.bench_function("simple_sdl", |b| {
        b.iter(|| validator.validate(black_box(simple_sdl)).unwrap())
    });

    // Complex SDL with interfaces and unions
    let complex_sdl = r#"
        interface Node {
            id: ID!
        }

        type User implements Node {
            id: ID!
            name: String!
            email: String!
            posts: [Post!]!
        }

        type Post implements Node {
            id: ID!
            title: String!
            content: String!
            author: User!
        }

        union SearchResult = User | Post

        type Query {
            node(id: ID!): Node
            search(query: String!): [SearchResult!]!
        }
    "#;

    group.bench_function("complex_sdl", |b| {
        b.iter(|| validator.validate(black_box(complex_sdl)).unwrap())
    });

    // Federation SDL
    let federation_sdl = r#"
        extend schema
            @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable"])

        type User @key(fields: "id") {
            id: ID!
            name: String!
            email: String! @shareable
        }

        type Query {
            user(id: ID!): User
        }
    "#;

    group.bench_function("federation_sdl", |b| {
        b.iter(|| validator.validate(black_box(federation_sdl)).unwrap())
    });

    group.finish();
}

// Benchmark JSON Schema to GraphQL conversion
fn bench_json_to_graphql_conversion(c: &mut Criterion) {
    let mut group = c.benchmark_group("json_to_graphql_conversion");

    let converter = Converter::new();

    let schemas = vec![
        (
            "small",
            json!({
                "type": "object",
                "x-graphql-type-name": "User",
                "properties": {
                    "id": { "type": "string" },
                    "name": { "type": "string" }
                }
            }),
        ),
        (
            "medium",
            json!({
                "type": "object",
                "x-graphql-type-name": "Product",
                "properties": {
                    "id": { "type": "string", "x-graphql-field-type": "ID!" },
                    "name": { "type": "string" },
                    "description": { "type": "string" },
                    "price": { "type": "number" },
                    "inStock": { "type": "boolean" },
                    "category": { "type": "string" },
                    "tags": {
                        "type": "array",
                        "items": { "type": "string" }
                    }
                }
            }),
        ),
    ];

    for (name, schema) in schemas {
        let json_str = serde_json::to_string(&schema).unwrap();
        group.throughput(Throughput::Bytes(json_str.len() as u64));
        group.bench_with_input(BenchmarkId::from_parameter(name), &json_str, |b, input| {
            b.iter(|| {
                converter
                    .convert(black_box(input), ConversionDirection::JsonSchemaToGraphQL)
                    .unwrap()
            })
        });
    }

    group.finish();
}

// Benchmark GraphQL to JSON Schema conversion
fn bench_graphql_to_json_conversion(c: &mut Criterion) {
    let mut group = c.benchmark_group("graphql_to_json_conversion");

    let converter = Converter::new();

    let sdls = vec![
        (
            "small",
            r#"
                type User {
                    id: ID!
                    name: String!
                }
            "#,
        ),
        (
            "medium",
            r#"
                type Product {
                    id: ID!
                    name: String!
                    description: String
                    price: Float!
                    inStock: Boolean!
                    category: String
                    tags: [String!]!
                }

                type Query {
                    product(id: ID!): Product
                }
            "#,
        ),
    ];

    for (name, sdl) in sdls {
        group.throughput(Throughput::Bytes(sdl.len() as u64));
        group.bench_with_input(BenchmarkId::from_parameter(name), sdl, |b, input| {
            b.iter(|| {
                converter
                    .convert(black_box(input), ConversionDirection::GraphQLToJsonSchema)
                    .unwrap()
            })
        });
    }

    group.finish();
}

// Benchmark full-stack validation (JSON Schema + GraphQL SDL)
fn bench_full_stack_validation(c: &mut Criterion) {
    let mut group = c.benchmark_group("full_stack_validation");

    let validator = FullStackValidator::new(false);

    let schema = json!({
        "type": "object",
        "x-graphql-type-name": "User",
        "properties": {
            "id": { "type": "string", "x-graphql-field-type": "ID!" },
            "name": { "type": "string" }
        }
    });

    let sdl = r#"
        type User {
            id: ID!
            name: String
        }
    "#;

    group.bench_function("validate_both", |b| {
        b.iter(|| {
            validator
                .validate_conversion(black_box(&schema), Some(black_box(sdl)))
                .unwrap()
        })
    });

    group.finish();
}

// Benchmark round-trip conversion
fn bench_round_trip_conversion(c: &mut Criterion) {
    let mut group = c.benchmark_group("round_trip_conversion");

    let converter = Converter::new();

    let original_schema = json!({
        "type": "object",
        "x-graphql-type-name": "User",
        "x-graphql-type-kind": "OBJECT",
        "properties": {
            "id": {
                "type": "string",
                "x-graphql-field-name": "id",
                "x-graphql-field-type": "ID!",
                "x-graphql-field-non-null": true
            },
            "name": {
                "type": "string",
                "x-graphql-field-name": "name"
            }
        }
    });

    group.bench_function("json_to_graphql_to_json", |b| {
        b.iter(|| {
            let json_str = serde_json::to_string(&original_schema).unwrap();

            // JSON → GraphQL
            let graphql = converter
                .convert(
                    black_box(&json_str),
                    ConversionDirection::JsonSchemaToGraphQL,
                )
                .unwrap();

            // GraphQL → JSON
            let _json_back = converter
                .convert(
                    black_box(&graphql),
                    ConversionDirection::GraphQLToJsonSchema,
                )
                .unwrap();
        })
    });

    group.finish();
}

// Benchmark validation of real test-data files
fn bench_real_world_schemas(c: &mut Criterion) {
    let mut group = c.benchmark_group("real_world_schemas");

    let json_validator = JsonSchemaValidator::new(false);
    let test_data_path = get_x_graphql_test_data_path();

    if !test_data_path.exists() {
        return;
    }

    // Find all JSON schema files
    let schema_files: Vec<_> = fs::read_dir(&test_data_path)
        .unwrap()
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.is_file() && p.extension().map_or(false, |ext| ext == "json"))
        .take(5) // Limit to 5 files for benchmark
        .collect();

    for schema_file in schema_files {
        let file_name = schema_file
            .file_name()
            .unwrap()
            .to_string_lossy()
            .to_string();
        let content = fs::read_to_string(&schema_file).unwrap();
        let schema: serde_json::Value = serde_json::from_str(&content).unwrap();

        group.bench_with_input(
            BenchmarkId::from_parameter(&file_name),
            &schema,
            |b, schema| b.iter(|| json_validator.validate(black_box(schema)).unwrap()),
        );
    }

    group.finish();
}

// Benchmark memory allocation patterns
fn bench_memory_allocation(c: &mut Criterion) {
    let mut group = c.benchmark_group("memory_allocation");

    let validator = JsonSchemaValidator::new(false);

    // Test with increasing schema sizes
    for size in [10, 50, 100, 200].iter() {
        let mut properties = serde_json::Map::new();
        for i in 0..*size {
            properties.insert(
                format!("field_{}", i),
                json!({
                    "type": "string",
                    "x-graphql-field-name": format!("field{}", i)
                }),
            );
        }

        let schema = json!({
            "type": "object",
            "x-graphql-type-name": "LargeType",
            "properties": properties
        });

        group.bench_with_input(
            BenchmarkId::from_parameter(format!("{}_fields", size)),
            &schema,
            |b, schema| b.iter(|| validator.validate(black_box(schema)).unwrap()),
        );
    }

    group.finish();
}

criterion_group!(
    benches,
    bench_json_schema_validation,
    bench_graphql_validation,
    bench_json_to_graphql_conversion,
    bench_graphql_to_json_conversion,
    bench_full_stack_validation,
    bench_round_trip_conversion,
    bench_real_world_schemas,
    bench_memory_allocation
);

criterion_main!(benches);
