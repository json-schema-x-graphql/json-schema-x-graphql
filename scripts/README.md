# JSON Schema ↔ GraphQL Scripts

This directory contains scripted validation, integration testing, and benchmarking tools for the JSON Schema ↔ GraphQL converter project.

> **Design Philosophy**: These are **scripted validators** that import test data from files, not inline unit tests. All test data lives in `converters/test-data/` and can be easily extended.

## 📁 Directory Structure

```
scripts/
├── validation/           # Schema and SDL validation scripts
│   ├── validate-schemas.ts      # JSON Schema validator
│   └── validate-graphql.ts      # GraphQL SDL validator
├── integration/          # End-to-end integration tests
│   └── test-conversions.ts      # JSON→SDL conversion tests
├── benchmarks/          # Performance benchmarking
│   └── run-benchmarks.ts        # Conversion & validation benchmarks
├── run-all-validation.sh        # Master validation runner
├── run-integration-tests.sh     # Master integration test runner
├── run-benchmarks.sh            # Master benchmark runner
└── README.md                    # This file
```

## 🚀 Quick Start

### Prerequisites

```bash
# Install dependencies
cd converters/node
pnpm install
```

### Run All Validations

```bash
# From project root
./scripts/run-all-validation.sh
```

### Run Integration Tests

```bash
# From project root
./scripts/run-integration-tests.sh
```

### Run Benchmarks

```bash
# Quick benchmark (10 iterations)
./scripts/run-benchmarks.sh --quick

# Full benchmark (100 iterations, default)
./scripts/run-benchmarks.sh

# Full benchmark with baseline save (1000 iterations)
./scripts/run-benchmarks.sh --iterations=1000 --save-baseline
```

## 📋 Validation Scripts

### JSON Schema Validation (`validate-schemas.ts`)

Discovers and validates all JSON Schema files in `converters/test-data/`:

**Features:**

- ✅ Validates against JSON Schema meta-schemas (Draft 7, 2019-09, 2020-12)
- 🔧 Detects and validates x-graphql extensions
- ⚠️ Quality checks (missing descriptions, unused definitions)
- 📊 JSON report output for CI/CD

**Usage:**

```bash
cd converters/node

# Basic validation
pnpm tsx ../../scripts/validation/validate-schemas.ts

# Fail on errors (for CI)
pnpm tsx ../../scripts/validation/validate-schemas.ts --fail-on-error

# Output JSON report
pnpm tsx ../../scripts/validation/validate-schemas.ts --output=report.json

# Fail on warnings (strict mode)
pnpm tsx ../../scripts/validation/validate-schemas.ts --fail-on-warning
```

**Output:**

```
🔍 Discovered 15 schema files

✅ 🔧 converters/test-data/x-graphql/basic-types.json
✅ 🔧 converters/test-data/x-graphql/comprehensive.json
✅    converters/test-data/complex-schema.json
...

============================================================
VALIDATION SUMMARY
============================================================
Total schemas:    15
Valid schemas:    15 ✅
Invalid schemas:  0 ❌
x-graphql schemas: 7 🔧
```

### GraphQL SDL Validation (`validate-graphql.ts`)

Discovers and validates all GraphQL SDL files in `converters/test-data/`:

**Features:**

- ✅ Syntax validation (parsing)
- ✅ Semantic validation (schema building, GraphQL spec compliance)
- 🌐 Federation validation (Apollo subgraph schemas)
- ⚠️ Quality checks (missing descriptions, deprecated fields)
- 📊 Type and field counting

**Usage:**

```bash
cd converters/node

# Basic validation
pnpm tsx ../../scripts/validation/validate-graphql.ts

# Fail on errors (for CI)
pnpm tsx ../../scripts/validation/validate-graphql.ts --fail-on-error

# Output JSON report
pnpm tsx ../../scripts/validation/validate-graphql.ts --output=report.json
```

**Output:**

```
🔍 Discovered 8 GraphQL SDL files

✅ 🌐 converters/test-data/user-service.graphql
      5 types, 12 fields [Federation v2]
✅    converters/test-data/x-graphql/expected/basic-types.graphql
      3 types, 8 fields
...

============================================================
GRAPHQL SDL VALIDATION SUMMARY
============================================================
Total SDL files:     8
Valid files:         8 ✅
Federation schemas:  2 🌐
Total types:         45
Total fields:        128
```

## 🧪 Integration Tests (`test-conversions.ts`)

End-to-end tests that convert JSON Schemas to GraphQL SDL and compare against expected outputs:

**Features:**

- 🔄 Discovers JSON Schema files with optional expected SDL
- 📋 Compares generated SDL against expected outputs
- 📝 Shows diffs when outputs don't match
- ⏱️ Tracks conversion time and performance
- 🔧 Validates x-graphql extension application

**Usage:**

```bash
cd converters/node

# Run all integration tests
pnpm tsx ../../scripts/integration/test-conversions.ts

# Fail on any test failure (for CI)
pnpm tsx ../../scripts/integration/test-conversions.ts --fail-on-error

# Output JSON report
pnpm tsx ../../scripts/integration/test-conversions.ts --output=report.json

# Verbose mode (show more details)
pnpm tsx ../../scripts/integration/test-conversions.ts --verbose

# Update expected SDL files (use carefully!)
pnpm tsx ../../scripts/integration/test-conversions.ts --update-expected
```

**Output:**

```
🧪 Discovered 15 integration test cases

✅ 🔧📋 converters/test-data/x-graphql/basic-types.json
      8ms, 3 types (expected 3)
❌ 🔧📋 converters/test-data/x-graphql/comprehensive.json
      15ms, 12 types (expected 12)
   ❌ Generated SDL does not match expected SDL
   📝 Diff (first 10 lines):
      - type User {
      + type User implements Node {
      ...

============================================================
INTEGRATION TEST SUMMARY
============================================================
Total tests:     15
Passed:          14 ✅
Failed:          1 ❌
Skipped:         0 ⏭️
Avg conv time:   9.32ms
Total types:     58
```

### Test Data Organization

Integration tests follow this structure:

```
converters/test-data/
├── x-graphql/
│   ├── basic-types.json          # JSON Schema with x-graphql extensions
│   ├── comprehensive.json        # Complex schema
│   └── expected/
│       ├── basic-types.graphql   # Expected SDL output
│       └── comprehensive.graphql # Expected SDL output
└── *.json                        # Other test schemas (validated but not compared)
```

**To add a new integration test:**

1. Create `my-schema.json` in `converters/test-data/x-graphql/`
2. Optionally create `expected/my-schema.graphql` for comparison
3. The test will be automatically discovered and run

## 📊 Benchmarks (`run-benchmarks.ts`)

Performance benchmarking suite for conversion and validation operations:

**Features:**

- ⏱️ High-precision timing (using `process.hrtime.bigint()`)
- 📈 Statistical analysis (min, max, mean, median, stddev, p95, p99)
- 🧠 Memory usage tracking (heap delta)
- 🚀 Throughput calculations (conv/s, types/s)
- 📊 Comparison with baseline results
- 🔥 Warmup phase to stabilize JIT

**Usage:**

```bash
cd converters/node

# Quick benchmark (10 iterations, ~5 seconds)
pnpm tsx ../../scripts/benchmarks/run-benchmarks.ts --iterations=10

# Default benchmark (100 iterations, ~30 seconds)
pnpm tsx ../../scripts/benchmarks/run-benchmarks.ts

# Full benchmark (1000 iterations, ~5 minutes)
pnpm tsx ../../scripts/benchmarks/run-benchmarks.ts --iterations=1000

# Save as baseline
pnpm tsx ../../scripts/benchmarks/run-benchmarks.ts --output=baseline.json

# Compare with baseline
pnpm tsx ../../scripts/benchmarks/run-benchmarks.ts --compare=baseline.json --output=current.json

# Better memory measurements (run with --expose-gc)
node --expose-gc $(which tsx) ../../scripts/benchmarks/run-benchmarks.ts
```

**Output:**

```
📊 Starting benchmarks for 8 files
   Iterations per file: 100
   Node version: v20.11.0
   Platform: linux x64

🏃 Running benchmark: basic-types
   File: converters/test-data/x-graphql/basic-types.json
   Warmup: 10 iterations
   ⏳ Warming up...
   ⏱️  Benchmarking conversion...
   ⏱️  Benchmarking validation...
   ✅ Complete
      Conversion: 1.23ms avg (±0.15ms)
      Validation: 0.45ms avg (±0.08ms)
      Throughput: 813 conv/s, 2439 types/s
      Memory: 0.52MB delta
      Generated: 3 types, 8 fields

...

============================================================
BENCHMARK SUMMARY
============================================================
Environment:       linux x64
Node version:      v20.11.0
CPUs:              8
Total benchmarks:  8
Total iterations:  800
Avg conversion:    2.15ms
Fastest:           basic-types
Slowest:           comprehensive
Total types gen:   58

Per-file results:

  🔧 basic-types
     Conversion: 1.23ms (min: 1.05ms, max: 1.89ms, p95: 1.42ms)
     Validation: 0.45ms (min: 0.38ms, max: 0.67ms, p95: 0.52ms)
     Throughput: 813 conv/s
     Generated:  3 types, 8 fields
...
```

### Baseline Comparison

```bash
# Save current performance as baseline
./scripts/run-benchmarks.sh --save-baseline

# Later, compare with baseline
./scripts/run-benchmarks.sh --compare=baseline-benchmark.json
```

**Comparison Output:**

```
📊 Comparing with previous results...

🚀 basic-types: 1.18ms (-0.05ms, -4.1%)
🐌 comprehensive: 4.89ms (+0.22ms, +4.7%)
➡️  user-service: 2.31ms (+0.00ms, +0.0%)
```

## 🔧 Master Runner Scripts

### `run-all-validation.sh`

Runs all validation suites sequentially:

```bash
./scripts/run-all-validation.sh [OPTIONS]

Options:
  --fail-on-error       Exit with error if any validation fails
  --fail-on-warning     Exit with error if any warnings found
  --output-dir=DIR      Save reports to directory
  --json                Output results in JSON format
```

### `run-integration-tests.sh`

Runs all integration tests:

```bash
./scripts/run-integration-tests.sh [OPTIONS]

Options:
  --fail-on-error       Exit with error if any test fails
  --output-dir=DIR      Save reports to directory
  --json                Output results in JSON format
  --verbose             Show detailed output
  --update-expected     Update expected SDL files
```

### `run-benchmarks.sh`

Runs performance benchmarks:

```bash
./scripts/run-benchmarks.sh [OPTIONS]

Options:
  --iterations=N        Number of iterations (default: 100)
  --output-dir=DIR      Save reports to directory
  --json                Output results in JSON format
  --compare=FILE        Compare with baseline file
  --save-baseline       Save results as baseline
  --quick               Quick mode (10 iterations)
  --help                Show help message
```

## 📦 NPM Scripts (in converters/node/package.json)

For convenience, these scripts are also available as npm/pnpm commands:

```bash
# Validation
pnpm validate:schemas          # Validate JSON Schemas
pnpm validate:graphql          # Validate GraphQL SDL
pnpm validate:all              # Validate both

# Integration Tests
pnpm test:integration          # Run integration tests
pnpm test:integration:ci       # Run with --fail-on-error

# Benchmarks
pnpm benchmark                 # Default benchmark (100 iter)
pnpm benchmark:quick           # Quick benchmark (10 iter)
pnpm benchmark:full            # Full benchmark (1000 iter)
pnpm benchmark:compare         # Compare with baseline

# CI/CD
pnpm ci:validate               # Validation with reports
pnpm ci:test                   # All tests with reports
pnpm ci:benchmark              # Benchmarks with reports

# Pre-commit
pnpm precommit                 # Lint + validate
```

## 🤖 CI/CD Integration

### GitHub Actions Workflow

The project includes a comprehensive CI workflow at `.github/workflows/validation-and-testing.yml`:

**Jobs:**

1. ✅ **validate-schemas** - Validate all JSON Schemas
2. ✅ **validate-graphql** - Validate all GraphQL SDL files
3. 🧪 **integration-tests** - Run conversion integration tests
4. 🧪 **unit-tests-node** - Run Node.js unit tests with coverage
5. 🧪 **unit-tests-rust** - Run Rust unit tests with coverage
6. 📊 **benchmarks** - Run performance benchmarks (push/main only)
7. 📋 **summary** - Generate test summary report

**Artifacts:**

- `schema-validation-report.json` (30 days)
- `graphql-validation-report.json` (30 days)
- `integration-test-report.json` (30 days)
- `benchmark-results.json` (90 days)
- `baseline-benchmark.json` (365 days, main branch only)

**Triggers:**

- Push to `main` or `develop`
- Pull requests to `main` or `develop`
- Manual workflow dispatch

### Example CI Commands

```bash
# Validate all schemas (fail on error)
cd converters/node
pnpm tsx ../../scripts/validation/validate-schemas.ts \
  --fail-on-error \
  --output=schema-validation-report.json

# Run integration tests (fail on error)
pnpm tsx ../../scripts/integration/test-conversions.ts \
  --fail-on-error \
  --output=integration-test-report.json

# Run benchmarks with comparison
pnpm tsx ../../scripts/benchmarks/run-benchmarks.ts \
  --iterations=100 \
  --compare=baseline-benchmark.json \
  --output=current-benchmark.json
```

## 🎯 Best Practices

### Adding Test Data

1. **JSON Schemas**: Add to `converters/test-data/` or `converters/test-data/x-graphql/`
2. **Expected SDL**: Add to `converters/test-data/x-graphql/expected/`
3. **Naming**: Use descriptive names: `feature-name.json` → `expected/feature-name.graphql`

### Running Tests Locally

```bash
# Before committing
pnpm precommit                    # Lint + validate

# During development
pnpm validate:all                 # Quick validation
pnpm test:integration             # Test conversions

# Before pushing
pnpm ci:test                      # Full test suite
pnpm benchmark:quick              # Quick perf check
```

### Performance Optimization

```bash
# Establish baseline
pnpm benchmark:full --save-baseline

# After changes, compare
pnpm benchmark --compare=baseline-benchmark.json

# Look for regressions
# 🚀 = faster, 🐌 = slower, ➡️ = no change
```

### Debugging Failed Tests

1. **Validation Failures**:
   - Check error messages for specific schema issues
   - Validate against JSON Schema meta-schema manually
   - Check for unknown x-graphql extensions

2. **Integration Test Failures**:
   - Use `--verbose` flag for detailed output
   - Review diff output to see exact mismatches
   - Run converter manually to inspect generated SDL
   - Use `--update-expected` if change is intentional (after review!)

3. **Benchmark Regressions**:
   - Check for algorithmic changes
   - Profile with `node --prof` or Chrome DevTools
   - Look for memory leaks (heap delta)
   - Compare p95/p99 percentiles, not just mean

## 🔍 Report Formats

All scripts output JSON reports with consistent structure:

### Validation Report

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "totalSchemas": 15,
  "validSchemas": 14,
  "invalidSchemas": 1,
  "results": [
    {
      "file": "converters/test-data/x-graphql/basic-types.json",
      "valid": true,
      "warnings": [],
      "schemaVersion": "http://json-schema.org/draft-07/schema#",
      "hasXGraphQLExtensions": true
    }
  ],
  "summary": {
    "byDirectory": {},
    "xGraphQLSchemas": 7
  }
}
```

### Integration Test Report

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "totalTests": 15,
  "passedTests": 14,
  "failedTests": 1,
  "skippedTests": 0,
  "results": [
    {
      "schemaFile": "converters/test-data/x-graphql/basic-types.json",
      "expectedFile": "converters/test-data/x-graphql/expected/basic-types.graphql",
      "passed": true,
      "metadata": {
        "conversionTimeMs": 8,
        "generatedTypes": 3,
        "expectedTypes": 3,
        "hasXGraphQLExtensions": true
      }
    }
  ]
}
```

### Benchmark Report

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": {
    "nodeVersion": "v20.11.0",
    "platform": "linux",
    "arch": "x64",
    "cpus": 8
  },
  "totalBenchmarks": 8,
  "results": [
    {
      "name": "basic-types",
      "iterations": 100,
      "metrics": {
        "conversionTimeMs": {
          "min": 1.05,
          "max": 1.89,
          "mean": 1.23,
          "median": 1.21,
          "stdDev": 0.15,
          "p95": 1.42,
          "p99": 1.67
        },
        "throughput": {
          "conversionsPerSecond": 813,
          "typesPerSecond": 2439
        }
      }
    }
  ]
}
```

## 🚧 Future Enhancements

- [ ] Rust equivalents of all scripts (using same test data)
- [ ] Federation composition validation
- [ ] Schema diff/migration detection
- [ ] Performance regression detection in CI
- [ ] Test coverage for x-graphql attributes
- [ ] Fuzzing/property-based testing
- [ ] Load testing with large schemas (1000+ types)
- [ ] Historical benchmark tracking and visualization

## 📚 Related Documentation

- [X-GraphQL Implementation Plan](../docs/plans/X-GRAPHQL-NAMESPACE-IMPLEMENTATION-PLAN.md)
- [Implementation Status](../docs/IMPLEMENTATION_STATUS.md)
- [X-GraphQL Quick Reference](../docs/X-GRAPHQL-QUICK-REFERENCE.md)
- [Test Data README](../converters/test-data/x-graphql/README.md)

## 🤝 Contributing

When adding new features or x-graphql extensions:

1. Add test schemas to `converters/test-data/x-graphql/`
2. Add expected SDL to `converters/test-data/x-graphql/expected/`
3. Run validation: `pnpm validate:all`
4. Run integration tests: `pnpm test:integration`
5. Verify no performance regression: `pnpm benchmark:compare`
6. Update this README if adding new scripts

---

**Questions?** Check the [main README](../README.md) or open an issue.
