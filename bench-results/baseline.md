# Dependency Reduction Baseline Measurements

# Date: 2026-06-06

# State: All features enabled, debug profile with reduced debug info (debug=1 for crate, debug=0 for deps)

## Rust Baseline

### Build Metrics

- Target dir (all features, debug): 885 MB
- Target dir (default features, debug): 687 MB
- Unique crates (all features): 247
- Unique crates (default features): 231
- Clean build time (all features): ~12.4s elapsed (with cached deps)
- Clean build time (default features): ~11.4s elapsed (with cached deps)

### Binary Sizes (debug, all features)

- libjson_schema_x_graphql.so: 7.1 MB
- libjson_schema_x_graphql.rlib: 9.7 MB
- jxql (debug): 27 MB
- jxql (release): 3.5 MB

### Top Contributing Dependencies by Compiled Size

1. async_graphql: 41 MB
2. apollo_compiler: 25 MB
3. tokio: 15 MB
4. jsonschema: 13 MB
5. criterion: 11 MB
6. reqwest: 9.4 MB
7. boon: 7.7 MB
8. opentelemetry_sdk: 5.2 MB
9. serde_json: 4.8 MB
10. apollo_parser: 4.6 MB
11. clap_builder: 7.0 MB
12. openssl: 7.3 MB
13. wasm_bindgen: 2.8 MB
14. graphql_composition: 2.8 MB
15. opentelemetry: 1.8 MB
16. apollo_encoder: 1.6 MB
17. graphql_schema_validation: 1.4 MB
18. indexmap: 1.3 MB
19. regex_automata: 11 MB
20. regex_syntax: 7.8 MB

### Criterion Benchmark Results (all features, debug)

| Benchmark                     | Mean Time |
| ----------------------------- | --------- |
| json_schema_to_graphql_small  | 13.691 µs |
| graphql_to_json_schema_small  | 39.082 µs |
| cached_json_to_graphql        | 335.71 ns |
| json_to_graphql_no_validation | 12.904 µs |

## Node Baseline

### Dependencies

- Runtime: 2 (graphql, @opentelemetry/api)
- Dev: 18

### Package Size

- dist/: 436 KB
