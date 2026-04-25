use criterion::{black_box, criterion_group, criterion_main, Criterion};
use json_schema_x_graphql::{ConversionOptions, Converter};

const JSON_SCHEMA: &str = r#"{
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
        },
        "email": {
            "type": "string"
        },
        "age": {
            "type": "integer"
        },
        "tags": {
            "type": "array",
            "items": {
                "type": "string"
            }
        },
        "address": {
            "type": "object",
            "properties": {
                "street": { "type": "string" },
                "city": { "type": "string" },
                "zip": { "type": "string" }
            }
        }
    }
}"#;

const GRAPHQL_SDL: &str = r#"
type Address {
    street: String
    city: String
    zip: String
}

type User {
    id: ID!
    name: String
    email: String
    age: Int
    tags: [String]
    address: Address
}

type Query {
    user(id: ID!): User
    users: [User]
}
"#;

fn bench_json_to_graphql(c: &mut Criterion) {
    let converter = Converter::new();

    c.bench_function("json_schema_to_graphql_small", |b| {
        b.iter(|| {
            converter
                .json_schema_to_graphql(black_box(JSON_SCHEMA))
                .unwrap()
        })
    });
}

fn bench_graphql_to_json(c: &mut Criterion) {
    let converter = Converter::new();

    c.bench_function("graphql_to_json_schema_small", |b| {
        b.iter(|| {
            converter
                .graphql_to_json_schema(black_box(GRAPHQL_SDL))
                .unwrap()
        })
    });
}

fn bench_cached_conversion(c: &mut Criterion) {
    // Only works if caching feature is enabled, but we can benchmark the logic anyway
    // (If feature is disabled, it just won't cache, effectively benchmarking the uncached path again but calling .convert)
    let converter = Converter::new();

    c.bench_function("cached_json_to_graphql", |b| {
        b.iter(|| {
            converter
                .convert(
                    black_box(JSON_SCHEMA),
                    json_schema_x_graphql::ConversionDirection::JsonSchemaToGraphQL,
                )
                .unwrap()
        })
    });
}

fn bench_with_validation_disabled(c: &mut Criterion) {
    let options = ConversionOptions {
        validate: false,
        ..Default::default()
    };
    let converter = Converter::with_options(options);

    c.bench_function("json_to_graphql_no_validation", |b| {
        b.iter(|| {
            converter
                .json_schema_to_graphql(black_box(JSON_SCHEMA))
                .unwrap()
        })
    });
}

criterion_group!(
    benches,
    bench_json_to_graphql,
    bench_graphql_to_json,
    bench_cached_conversion,
    bench_with_validation_disabled
);
criterion_main!(benches);
