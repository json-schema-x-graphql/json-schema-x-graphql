# Dependency Reduction Baseline & Post-Implementation Measurements
# Date: 2026-06-06
# State: After Phases 1A-1E, 2, 6 implemented

## Previous Baseline (before any changes)

| Metric                                | Before            |
| ------------------------------------- | ----------------- |
| Target dir (all features)             | 2.1 GB            |
| Target dir (default features)         | 687 MB            |
| Unique crates (default)               | 231               |
| Unique crates (all features)           | 247               |
| libjson_schema_x_graphql.so           | 7.1 MB            |
| libjson_schema_x_graphql.rlib         | 9.7 MB            |
| jxql (debug)                           | 27 MB             |

## Current State (after implemented phases)

| Metric                                | After (default)   | Change            |
| ------------------------------------- | ----------------- | ----------------- |
| Target dir (all features)             | 747 MB            | **-64%**          |
| Target dir (default features)         | 212 MB            | **-69%**          |
| Unique crates (default)               | 43                | **-81%**          |
| Unique crates (all features)           | 181               | **-27%**          |
| libjson_schema_x_graphql.so           | 6.5 MB            | -8%               |
| libjson_schema_x_graphql.rlib         | 9.0 MB            | -7%               |
| jxql (debug)                           | 26 MB             | -4%               |
| json_schema_to_graphql (bench)         | 13.5 µs           | ~same             |
| graphql_to_json_schema (bench)         | 37.7 µs           | -4%               |
| cached_json_to_graphql (bench)         | 317 ns            | -5%               |
| json_to_graphql_no_validation (bench)  | 12.9 µs           | ~same             |

## Rust Criterion Benchmarks (final)

| Benchmark                            | Before (µs) | After (µs) | Change |
| ------------------------------------- | ----------- | ---------- | ------ |
| json_schema_to_graphql_small          | 13.7            | 13.8       | +1%    |
| graphql_to_json_schema_small          | 39.1            | 37.4       | -4%    |
| cached_json_to_graphql               | 336 ns          | 319 ns     | -5%    |
| json_to_graphql_no_validation         | 12.9            | 13.2       | +2%    |

## Node Baseline

### Dependencies (before)
- Runtime: 2 (graphql, @opentelemetry/api)
- Dev: 18 (including @opentelemetry/sdk-trace-base, @opentelemetry/sdk-trace-node as hardcoded imports)
## Node Baseline

### Dependencies (after changes)
- Runtime: 2 (`graphql`, `@opentelemetry/api`)
- Dev: 10 (`@eslint/js`, `@graphql-codegen/cli`, `@graphql-codegen/typescript`, `@types/jest`, `@types/node`, `eslint`, `jest`, `ts-jest`, `tsx`, `typescript`, `typescript-eslint`)
- Optional: 2 (`@opentelemetry/sdk-trace-base`, `@opentelemetry/sdk-trace-node`)

### Key changes from review feedback
- `@apollo/subgraph` and `graphql-tag` removed from core package (moved to CLI package)
- `ajv` and `ajv-formats` removed from core package (moved to CLI package)
- `@opentelemetry/sdk-trace-*` moved from devDependencies to optionalDependencies
- OTel SDK now loaded via dynamic `import()` for WASM/browser compatibility
- `indexmap` kept (required for `preserve_order` feature and LRU cache)
- `regex` kept (required for URL validation and dynamic exclude patterns)
- `opentelemetry` gated behind `telemetry` feature (not replaced with `tracing`)