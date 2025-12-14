# Comprehensive Testing Guide

## JSON Schema x GraphQL - Testing & Quality Assurance

This guide covers the complete testing strategy for the JSON Schema x GraphQL project, including unit tests, integration tests, security scanning, and 3-cycle round-trip validation to ensure lossless bidirectional conversion.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Test Categories](#test-categories)
4. [Running Tests](#running-tests)
5. [Security Scanning](#security-scanning)
6. [Round-Trip Validation](#round-trip-validation)
7. [Coverage Reports](#coverage-reports)
8. [CI/CD Integration](#cicd-integration)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The testing suite ensures:

- ✅ **Code Quality**: Linting, formatting, and best practices
- ✅ **Security**: Vulnerability scanning and dependency auditing
- ✅ **Correctness**: Unit and integration tests
- ✅ **Lossless Conversion**: 3-cycle round-trip validation
- ✅ **Parity**: Rust and Node.js implementations produce identical results
- ✅ **Performance**: Benchmarking and optimization validation

---

## Quick Start

### Run All Tests

```bash
# Comprehensive test suite (recommended)
./scripts/comprehensive-test-suite.sh

# Individual environments
./scripts/comprehensive-test-suite.sh rust
./scripts/comprehensive-test-suite.sh node
```

### Basic Test Suite

```bash
# Quick test run (no security scanning)
./scripts/run-tests.sh
```

---

## Test Categories

### 1. Unit Tests

Test individual functions and modules in isolation.

**Rust:**
```bash
cd converters/rust
cargo test --lib
```

**Node.js:**
```bash
cd converters/node
pnpm test
```

### 2. Integration Tests

Test complete conversion workflows with real schemas.

**Rust:**
```bash
cd converters/rust
cargo test --test '*'
```

**Node.js:**
```bash
cd converters/node
pnpm test tests/integration
```

### 3. Round-Trip Tests

Validate that conversions are truly lossless by converting back and forth multiple times.

```bash
# Included in comprehensive suite
./scripts/comprehensive-test-suite.sh
```

**What it tests:**
- JSON Schema → GraphQL SDL → JSON Schema (Cycle 1)
- Repeat 2 more times (Cycles 2 & 3)
- Verify no drift between cycles
- Ensures no data loss or simplification

### 4. Parity Tests

Ensure Rust and Node.js implementations produce identical output.

```bash
./scripts/test-parity.sh
```

---

## Running Tests

### Prerequisites

**Rust:**
- Rust 1.70+ installed via [rustup](https://rustup.rs/)
- `cargo-audit`: `cargo install cargo-audit`
- `cargo-tarpaulin`: `cargo install cargo-tarpaulin` (Linux only, optional)
- `cargo-deny`: `cargo install cargo-deny` (optional)

**Node.js:**
- Node.js 18+ from [nodejs.org](https://nodejs.org/)
- pnpm: `npm install -g pnpm`

### Comprehensive Test Suite

The comprehensive test suite runs:

1. **Security Audit**
   - Rust: `cargo audit`
   - Node: `pnpm audit`

2. **Code Quality**
   - Rust: `cargo clippy`, `cargo fmt --check`
   - Node: `eslint`, `prettier --check`

3. **Build**
   - Rust: `cargo build --release`
   - Node: `pnpm run build`

4. **Unit & Integration Tests**
   - Rust: `cargo test --all-features`
   - Node: `pnpm test`

5. **Coverage Analysis**
   - Rust: `cargo tarpaulin`
   - Node: `pnpm run test:coverage`

6. **Documentation Check**
   - Rust: `cargo doc`

7. **Round-Trip Validation (3 cycles)**
   - Validates no drift or data loss

### Run Specific Test Categories

```bash
# Rust tests only
./scripts/comprehensive-test-suite.sh rust

# Node.js tests only
./scripts/comprehensive-test-suite.sh node

# All tests
./scripts/comprehensive-test-suite.sh all
```

---

## Security Scanning

### Rust Security Audit

**Using cargo-audit:**
```bash
cd converters/rust
cargo audit --deny warnings
```

**Using cargo-deny:**
```bash
cd converters/rust
cargo deny check advisories
cargo deny check licenses
cargo deny check bans
cargo deny check sources
```

**What it checks:**
- Known security vulnerabilities (RustSec Advisory Database)
- Unmaintained dependencies
- Yanked crates
- License compliance
- Dependency sources

### Node.js Security Audit

**Using npm/pnpm audit:**
```bash
cd converters/node
pnpm audit --audit-level=moderate
```

**Using Snyk (optional):**
```bash
cd converters/node
npm install -g snyk
snyk test
snyk monitor
```

**What it checks:**
- Known vulnerabilities (npm Advisory Database)
- Outdated packages with security issues
- License compliance
- Dependency health

### Security Configuration

**Rust:** See `converters/rust/deny.toml` for cargo-deny configuration

**Node.js:** Security policies in `package.json`:
- Audit level: `moderate` (blocks medium+ severity)
- Auto-fix: `pnpm audit fix`

---

## Round-Trip Validation

Round-trip testing is critical for ensuring lossless conversion. The test performs 3 complete cycles:

```
JSON Schema → GraphQL SDL → JSON Schema (Cycle 1)
     ↓
JSON Schema → GraphQL SDL → JSON Schema (Cycle 2)
     ↓
JSON Schema → GraphQL SDL → JSON Schema (Cycle 3)
```

Then validates:
- JSON output from Cycle 1 === Cycle 2 === Cycle 3
- GraphQL output from Cycle 1 === Cycle 2 === Cycle 3

### Why 3 Cycles?

- **Cycle 1**: Initial conversion, may normalize input
- **Cycle 2**: Tests stability of normalized form
- **Cycle 3**: Confirms no progressive drift

If all 3 cycles produce identical output, the conversion is truly lossless.

### Running Round-Trip Tests Manually

**Rust:**
```bash
cd converters/rust

# Create test output directory
mkdir -p target/roundtrip-test

# Cycle 1
cargo run --example json_to_graphql -- ../test-data/complex-schema.json > target/roundtrip-test/cycle1.graphql
cargo run --example graphql_to_json -- target/roundtrip-test/cycle1.graphql > target/roundtrip-test/cycle1.json

# Cycle 2
cargo run --example json_to_graphql -- target/roundtrip-test/cycle1.json > target/roundtrip-test/cycle2.graphql
cargo run --example graphql_to_json -- target/roundtrip-test/cycle2.graphql > target/roundtrip-test/cycle2.json

# Cycle 3
cargo run --example json_to_graphql -- target/roundtrip-test/cycle2.json > target/roundtrip-test/cycle3.graphql
cargo run --example graphql_to_json -- target/roundtrip-test/cycle3.graphql > target/roundtrip-test/cycle3.json

# Validate (no output = success)
diff target/roundtrip-test/cycle1.json target/roundtrip-test/cycle2.json
diff target/roundtrip-test/cycle2.json target/roundtrip-test/cycle3.json
diff target/roundtrip-test/cycle1.graphql target/roundtrip-test/cycle2.graphql
diff target/roundtrip-test/cycle2.graphql target/roundtrip-test/cycle3.graphql
```

**Node.js:**
```bash
cd converters/node

# Build first
pnpm run build

# Create test script (see comprehensive-test-suite.sh for example)
# Or use the automated script
node tests/roundtrip.test.js
```

### Common Round-Trip Issues

**Silent field dropping:**
- Fields present in input but missing in output
- Detection: Compare field counts and keys

**Type simplification:**
- Complex types reduced to simpler forms
- Example: `["string", "null"]` → `string?`
- Detection: Deep equality checks

**Metadata loss:**
- Loss of `x-graphql-*` extensions
- Loss of descriptions, examples
- Detection: Full schema comparison

**Normalization drift:**
- Output format differs but semantically equivalent
- Example: Property order changes
- Solution: Canonical JSON serialization

---

## Coverage Reports

### Rust Coverage

**Using cargo-tarpaulin (Linux/macOS):**
```bash
cd converters/rust
cargo tarpaulin --out Html --out Lcov --output-dir coverage
# Open coverage/index.html in browser
```

**Using cargo-llvm-cov (all platforms):**
```bash
cargo install cargo-llvm-cov
cd converters/rust
cargo llvm-cov --html --open
```

### Node.js Coverage

```bash
cd converters/node
pnpm run test:coverage
# Open coverage/lcov-report/index.html in browser
```

### Coverage Thresholds

Minimum required coverage (enforced in CI):

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

---

## CI/CD Integration

### GitHub Actions Workflows

**1. Comprehensive Tests** (`.github/workflows/comprehensive-tests.yml`)
- Runs on: Push to main/develop, PRs
- Tests: All platforms (Linux, macOS, Windows)
- Includes: Unit, integration, round-trip, parity tests

**2. Security Audit** (`.github/workflows/security-audit.yml`)
- Runs on: Push, PRs, daily schedule (2 AM UTC)
- Scans: Dependencies, licenses, vulnerabilities
- Tools: cargo-audit, cargo-deny, npm audit, CodeQL

**3. Coverage Report** (included in comprehensive-tests.yml)
- Uploads to Codecov
- Separate reports for Rust and Node.js

### Running CI Checks Locally

```bash
# Install act (GitHub Actions local runner)
# https://github.com/nektos/act

# Run all workflows
act

# Run specific workflow
act -W .github/workflows/comprehensive-tests.yml
act -W .github/workflows/security-audit.yml
```

---

## Troubleshooting

### Rust Tests Failing

**Issue: Cargo not found**
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

**Issue: Clippy warnings**
```bash
cd converters/rust
cargo clippy --fix --allow-dirty
cargo fmt
```

**Issue: Test compilation errors**
```bash
# Clean and rebuild
cargo clean
cargo build --all-features
cargo test
```

### Node.js Tests Failing

**Issue: TypeScript compilation errors**
```bash
cd converters/node
pnpm run lint:fix
pnpm run format
pnpm run build
```

**Issue: Module not found**
```bash
cd converters/node
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm run build
```

**Issue: ESM import errors**
- Ensure `"type": "module"` in `package.json`
- Use `.js` extensions in imports
- Check Jest ESM configuration

### Round-Trip Tests Failing

**Drift detected between cycles:**

1. **Examine the diff:**
   ```bash
   diff -u test-output/cycle1.json test-output/cycle2.json
   ```

2. **Common causes:**
   - Missing field preservation
   - Extension stripping
   - Type normalization
   - Order changes (use canonical JSON)

3. **Debug approach:**
   - Add logging to conversion functions
   - Validate intermediate steps
   - Check for conditional logic

**Example output not matching:**
- Verify examples are in test-data directory
- Check file paths in scripts
- Ensure converters are built

### Security Audit Failures

**Rust vulnerability found:**
```bash
cd converters/rust
cargo audit
# Review advisories
# Update dependencies: cargo update
# Or add to ignore list in deny.toml if false positive
```

**Node.js vulnerability found:**
```bash
cd converters/node
pnpm audit
pnpm audit fix  # Attempt automatic fix
# Manual fix: update package.json versions
```

---

## Performance Testing

### Benchmarking

**Rust:**
```bash
cd converters/rust
cargo bench
```

**Node.js:**
```bash
cd converters/node
pnpm run bench
```

### Profiling

**Rust:**
```bash
# CPU profiling
cargo install flamegraph
cargo flamegraph --bench conversion_bench

# Memory profiling
cargo install cargo-instruments
cargo instruments -t time --bench conversion_bench
```

**Node.js:**
```bash
# CPU profiling
node --prof tests/benchmark.js
node --prof-process isolate-*.log

# Memory profiling
node --inspect tests/benchmark.js
# Open chrome://inspect in Chrome
```

---

## Test Data

Test schemas are located in `converters/test-data/`:

- `complex-schema.json`: Comprehensive schema covering all features
- `user-service.json`: Real-world user service example
- `user-service.graphql`: Corresponding GraphQL SDL

### Adding New Test Cases

1. Add schema to `converters/test-data/`
2. Add test case to:
   - `converters/rust/tests/integration_tests.rs`
   - `converters/node/tests/integration.test.ts`
3. Update round-trip validation script if needed

---

## Best Practices

### Writing Tests

1. **Use descriptive test names**
   ```rust
   #[test]
   fn test_json_to_graphql_preserves_all_fields() { }
   ```

2. **Test edge cases**
   - Empty objects/arrays
   - Null/undefined values
   - Maximum/minimum values
   - Unicode characters

3. **Use fixtures**
   - Keep test data in separate files
   - Reuse across tests
   - Version control test data

4. **Assert completely**
   ```rust
   assert_eq!(result.fields.len(), expected.fields.len());
   assert_eq!(result.fields, expected.fields);
   ```

### Code Quality

1. **Run linters before commit**
   ```bash
   # Rust
   cargo clippy && cargo fmt --check
   
   # Node.js
   pnpm run lint && pnpm run format:check
   ```

2. **Fix warnings immediately**
   - Don't accumulate technical debt
   - Warnings = future bugs

3. **Maintain coverage**
   - Add tests for new features
   - Don't reduce coverage percentage

### Security

1. **Update dependencies regularly**
   ```bash
   # Weekly dependency updates
   cargo update
   pnpm update
   ```

2. **Review security advisories**
   - Subscribe to RustSec
   - Enable GitHub Dependabot

3. **Audit before release**
   ```bash
   ./scripts/comprehensive-test-suite.sh
   ```

---

## Continuous Improvement

### Metrics to Track

- Test coverage percentage
- Test execution time
- Security vulnerabilities found
- Round-trip success rate
- Parity test pass rate

### Regular Tasks

- **Daily**: Run tests during development
- **Weekly**: Full test suite + security audit
- **Monthly**: Dependency updates
- **Quarterly**: Performance benchmarking

---

## Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review existing GitHub issues
3. Create new issue with:
   - Test output/logs
   - Environment details
   - Steps to reproduce

---

## Summary Checklist

Before committing code:

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Linting passes (no warnings)
- [ ] Formatting is correct
- [ ] Security audit passes
- [ ] Round-trip validation succeeds (3 cycles)
- [ ] Coverage meets thresholds (80%+)
- [ ] Documentation updated

Before relintake_processng:

- [ ] All tests pass on all platforms
- [ ] No known security vulnerabilities
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Git tagged

---

**Last Updated**: 2024-01-09

**Maintained By**: JSON Schema x GraphQL Contributors