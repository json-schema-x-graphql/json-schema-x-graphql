# Rust Testing Quick Start Guide
## JSON Schema x GraphQL Converter

This guide provides quick commands to run tests and security audits on the Rust converter.

---

## Prerequisites

Ensure Rust is installed and available:

```bash
# Check Rust installation
rustc --version
cargo --version

# If not available, source cargo environment
source ~/.cargo/env
```

---

## Quick Commands

### 1. Build the Project

```bash
cd converters/rust
cargo build
```

### 2. Run Unit Tests

```bash
cargo test --lib
```

### 3. Run All Tests

```bash
cargo test --all-features
```

### 4. Check Code (Fast)

```bash
cargo check --all-features
```

### 5. Lint with Clippy

```bash
cargo clippy --all-features -- -D warnings
```

---

## Security Testing

### Run Complete Security Audit

From the project root:

```bash
./scripts/rust-security-audit.sh
```

This runs:
- `cargo check` - Compilation validation
- `cargo audit` - Dependency vulnerability scan
- `cargo geiger` - Unsafe code detection
- `cargo deny` - License and security compliance

### Manual Security Commands

```bash
cd converters/rust

# Security vulnerability scan
cargo audit

# Unsafe code detection
cargo geiger --all-features

# License checking (if deny.toml is configured)
cargo deny check
```

---

## Installing Security Tools

### One-time Setup

```bash
# Install cargo-audit
cargo install cargo-audit

# Install cargo-geiger
cargo install cargo-geiger

# Install cargo-deny
cargo install cargo-deny

# Install cargo-fuzz (optional)
cargo install cargo-fuzz
```

---

## Viewing Security Reports

After running the security audit script, reports are saved to:

```
converters/rust/security-reports/
├── cargo-audit-TIMESTAMP.log
├── cargo-check-TIMESTAMP.log
├── cargo-geiger-TIMESTAMP.log
├── cargo-deny-TIMESTAMP.log
└── security-summary-TIMESTAMP.txt
```

View the summary:

```bash
cat converters/rust/security-reports/security-summary-*.txt
```

---

## Common Issues

### Issue: `rustc: command not found`

**Solution:**
```bash
source ~/.cargo/env
```

### Issue: Security tools not found

**Solution:**
```bash
cargo install cargo-audit cargo-geiger cargo-deny
```

### Issue: Tests fail to compile

**Solution:**
1. Check that you're in the correct directory: `converters/rust`
2. Ensure dependencies are up to date: `cargo update`
3. Clean and rebuild: `cargo clean && cargo build`

---

## Development Workflow

### Before Committing

```bash
# 1. Format code
cargo fmt

# 2. Run clippy
cargo clippy --all-features -- -D warnings

# 3. Run tests
cargo test --all-features

# 4. Security audit
cargo audit

# 5. Check unsafe code
cargo geiger --all-features
```

### Continuous Integration

The project includes automated workflows in `.github/workflows/` that run:
- Tests on every push
- Security audits on schedule
- Clippy linting
- Format checking

---

## Advanced Testing

### Fuzzing

```bash
# Initialize fuzzing (first time)
cargo fuzz init

# Create a fuzz target
cargo fuzz add json_to_graphql

# Run fuzzing
cargo fuzz run json_to_graphql
```

### Code Coverage (Linux/macOS)

```bash
# Install tarpaulin
cargo install cargo-tarpaulin

# Generate coverage report
cargo tarpaulin --out Html
```

### Benchmarking

```bash
# Run benchmarks
cargo bench
```

---

## Test Status

### Current Status (as of November 24, 2025)

- ✅ Build: PASSING
- ✅ Unit tests: PASSING (5/5 in lib.rs)
- ⚠️ Integration tests: PARTIAL (needs implementation)
- ✅ Security: NO VULNERABILITIES FOUND
- ✅ Unsafe code: NONE in main crate
- ⚠️ Code coverage: Not yet measured

### What Works

- Type system and data structures
- Error handling
- WASM bindings (feature-gated)
- Validator infrastructure
- Converter API interface

### What Needs Work

- Complete JSON Schema → GraphQL conversion logic
- Complete GraphQL → JSON Schema conversion logic
- Integration test implementation
- Fuzzing targets
- Benchmarks

---

## Getting Help

### Documentation

- Main README: `../../README.md`
- Full Testing Report: `../../RUST_TESTING_REPORT.md`
- API docs: `cargo doc --open`

### Useful Links

- Rust Book: https://doc.rust-lang.org/book/
- Cargo Guide: https://doc.rust-lang.org/cargo/
- Testing Guide: https://doc.rust-lang.org/book/ch11-00-testing.html
- Security Tools: https://rustsec.org/

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `cargo build` | Compile the project |
| `cargo test` | Run all tests |
| `cargo check` | Quick validation |
| `cargo clippy` | Lint code |
| `cargo fmt` | Format code |
| `cargo audit` | Security scan |
| `cargo geiger` | Unsafe code check |
| `cargo doc --open` | Generate and view docs |
| `cargo clean` | Remove build artifacts |
| `cargo update` | Update dependencies |

---

**Last Updated:** November 24, 2025  
**Status:** ✅ Security tools installed and operational  
**Next:** Complete converter implementation and run integration tests