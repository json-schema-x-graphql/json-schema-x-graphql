# Getting Started with JSON Schema x GraphQL

Welcome! This guide will help you get up and running with the JSON Schema x GraphQL project, whether you're using it in your own projects or contributing to the codebase.

## Table of Contents

- [Quick Start (5 minutes)](#quick-start-5-minutes)
- [Understanding the Project](#understanding-the-project)
- [Setting Up for Development](#setting-up-for-development)
- [Your First Contribution](#your-first-contribution)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

---

## Quick Start (5 minutes)

### For Users

If you just want to use the converter:

```bash
# Install via npm
npm install json-schema-x-graphql

# Or via yarn
yarn add json-schema-x-graphql
```

**Basic usage**:

```typescript
import { convertSdlToJson, convertJsonToSdl } from 'json-schema-x-graphql';

// Convert GraphQL SDL to JSON Schema
const jsonSchema = await convertSdlToJson(`
  type User @key(fields: "id") {
    id: ID!
    name: String!
  }
`);

// Convert JSON Schema back to SDL
const sdl = await convertJsonToSdl(jsonSchema);
console.log(sdl);
```

### For Contributors

If you want to contribute to the project:

```bash
# Clone the repository
git clone https://github.com/JJediny/json-schema-x-graphql.git
cd json-schema-x-graphql

# Install dependencies
cargo build
npm install

# Run tests
cargo test
npm test
```

---

## Understanding the Project

### What Problem Does This Solve?

Organizations often need to:
1. **Validate data** before it enters their systems (JSON Schema)
2. **Expose that data** via GraphQL APIs (GraphQL SDL)
3. **Maintain a single source of truth** for both

This project enables exactly that using `x-graphql-*` extensions.

### Key Concepts

#### 1. Three Namespaces

The project uses three distinct naming conventions:

```json
{
  "user_id": "123",                           // snake_case (database/JSON Schema)
  "x-graphql-field-name": "userId",          // camelCase (GraphQL API)
  "x-graphql-federation-requires": "email"   // hyphen-case (metadata)
}
```

#### 2. Minimal Extensions

Only **15 core fields** are required for lossless conversion:
- 4 always required (type-name, type-kind, field-name, field-type)
- 3 when applicable (field-non-null, list-item-non-null, argument-default-value)
- 6 for federation (keys, requires, provides, external, shareable, override-from)
- 2 optional arrays (directives, arguments)

#### 3. Lossless Round-Tripping

```
SDL → JSON Schema → SDL
```

No information is lost. All directives, arguments, and metadata are preserved.

### Architecture Overview

```
┌─────────────────────┐
│   JSON Schema       │
│   (Validation)      │
│                     │
│   snake_case fields │
│   + x-graphql-*     │
└──────────┬──────────┘
           │
           │ Rust WASM Converter
           ▼
┌─────────────────────┐
│   GraphQL SDL       │
│   (API)             │
│                     │
│   camelCase fields  │
│   + directives      │
└─────────────────────┘
```

---

## Setting Up for Development

### Prerequisites

Make sure you have these installed:

- **Rust** 1.70+ ([install](https://rustup.rs/))
- **Node.js** 16+ ([install](https://nodejs.org/))
- **wasm-pack** ([install](https://rustwasm.github.io/wasm-pack/installer/))
- **Git** ([install](https://git-scm.com/))

### Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/JJediny/json-schema-x-graphql.git
cd json-schema-x-graphql

# Install Rust dependencies
cargo build

# Install Node.js dependencies
npm install
```

### Step 2: Verify Installation

```bash
# Run Rust tests
cargo test

# Run JavaScript tests (when available)
npm test

# Check formatting
cargo fmt --check
npm run lint
```

### Step 3: Build WASM Module

```bash
# Build the WASM module
npm run build:wasm

# This creates pkg/ directory with:
# - graphql_json_schema_wasm_bg.wasm
# - graphql_json_schema_wasm.js
# - graphql_json_schema_wasm.d.ts
```

### Step 4: Run the Frontend (when available)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 to see the live editor.

---

## Your First Contribution

### Option 1: Fix a Typo or Improve Docs

The intake_processest way to contribute!

1. Find a typo or unclear section
2. Click "Edit" on GitHub or clone the repo
3. Make your change
4. Submit a PR

**Files to check**:
- README.md
- CONTEXT.md
- CONTRIBUTING.md
- examples/*.schema.json

### Option 2: Add a Test Case

Help us improve coverage!

1. Look at `src/lib.rs` (or `tests/` directory when created)
2. Find a function without tests
3. Write a test case
4. Submit a PR

**Example**:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_enum_with_deprecated_values() {
        let sdl = r#"
            enum Status {
                ACTIVE
                DISABLED @deprecated(reason: "Use ARCHIVED")
                ARCHIVED
            }
        "#;
        
        let json_schema = sdl_to_json(sdl).unwrap();
        
        let status_def = &json_schema.definitions["Status"];
        assert_eq!(status_def.x_graphql_type_kind, GraphQLKind::Enum);
        
        let configs = status_def.x_graphql_enum_value_configs.unwrap();
        assert!(configs["DISABLED"].deprecated.unwrap());
    }
}
```

### Option 3: Implement a Feature

Ready for more?

1. Check [Good First Issues](https://github.com/JJediny/json-schema-x-graphql/labels/good%20first%20issue)
2. Comment on the issue to claim it
3. Create a branch: `git checkout -b feature/your-feature`
4. Implement the feature
5. Add tests
6. Submit a PR

---

## Common Tasks

### Task 1: Validate a JSON Schema

```bash
# Using a JSON Schema validator like AJV
npm install -g ajv-cli

# Validate your schema against the meta-schema
ajv validate \
  -s schema/x-graphql-extensions.schema.json \
  -d examples/user-service.schema.json
```

### Task 2: Add a New Example

1. Create a new file in `examples/`
2. Follow the structure of `user-service.schema.json`
3. Include:
   - At least one entity type with `@key`
   - Federation directives
   - Field arguments
   - Enum types
4. Validate it against the meta-schema
5. Add documentation in the file's description

### Task 3: Test Round-Trip Conversion

```rust
// In your test file
#[test]
fn test_round_trip() {
    let original_sdl = r#"
        type Product @key(fields: "id") {
            id: ID!
            name: String!
            price: Float
        }
    "#;
    
    // SDL → JSON
    let json_schema = sdl_to_json(original_sdl).unwrap();
    
    // JSON → SDL
    let regenerated_sdl = json_to_sdl(&json_schema).unwrap();
    
    // Parse both and compare ASTs
    let original_ast = parse_sdl(original_sdl);
    let regenerated_ast = parse_sdl(&regenerated_sdl);
    
    assert_eq!(original_ast, regenerated_ast);
}
```

### Task 4: Profile WASM Performance

```bash
# Build with profiling
cargo build --release --features wasm

# Use browser DevTools Performance tab
# Or use criterion for benchmarking
cargo bench
```

### Task 5: Update Meta-Schema

If you need to add a new `x-graphql-*` extension:

1. Add the pattern to `schema/x-graphql-extensions.schema.json`
2. Add validation rules (type, pattern, etc.)
3. Update `examples/user-service.schema.json` to demonstrate usage
4. Update `docs/SPECIFICATION.md` with documentation
5. Add tests for the new extension

---

## Troubleshooting

### Problem: Rust compilation fails

**Solution**:
```bash
# Update Rust
rustup update

# Clean and rebuild
cargo clean
cargo build
```

### Problem: WASM build fails

**Solution**:
```bash
# Reinstall wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Try building again
wasm-pack build --target web --release
```

### Problem: Tests fail

**Solution**:
```bash
# Run tests with output
cargo test -- --nocapture

# Run specific test
cargo test test_name -- --nocapture

# Check for formatting issues
cargo fmt
cargo clippy
```

### Problem: JSON Schema validation fails

**Solution**:
1. Check that `$schema` points to `https://json-schema.org/draft/2020-12/schema`
2. Ensure all `x-graphql-*` keys use `hyphen-case`
3. Verify GraphQL type names use `PascalCase`
4. Verify GraphQL field names use `camelCase`
5. Check that patterns match (e.g., federation URLs)

### Problem: Round-trip conversion loses data

**Solution**:
1. Check if you're using a required extension field
2. Verify directive arguments are preserved
3. Ensure enum value configs are included
4. Check if field arguments have default values

---

## Next Steps

### Learn More

- **Read the specs**: [docs/SPECIFICATION.md](docs/SPECIFICATION.md)
- **Study examples**: Look at files in `examples/`
- **Explore architecture**: Read [CONTEXT.md](CONTEXT.md)
- **API reference**: [docs/API.md](docs/API.md)

### Join the Community

- **GitHub Discussions**: Ask questions, share ideas
- **Discord**: Real-time chat (link in README)
- **Office Hours**: Friday 3-4pm UTC on Discord

### Suggested Learning Path

1. **Week 1**: Read documentation, understand concepts
2. **Week 2**: Fix typos, improve docs, validate examples
3. **Week 3**: Add test cases, explore codebase
4. **Week 4**: Implement small features
5. **Week 5+**: Tackle larger features, review PRs

### Resources

- [JSON Schema 2020-12 Spec](https://json-schema.org/draft/2020-12/json-schema-core.html)
- [GraphQL Spec](https://spec.graphql.org/October2021/)
- [Apollo Federation Docs](https://www.apollographql.com/docs/federation/)
- [Rust WASM Book](https://rustwasm.github.io/docs/book/)

---

## Quick Reference

### Key Files

- `schema/x-graphql-extensions.schema.json` - Meta-schema definition
- `examples/user-service.schema.json` - Comprehensive example
- `src/lib.rs` - Core converter logic
- `Cargo.toml` - Rust project config
- `package.json` - npm package config

### Key Commands

```bash
# Development
cargo build              # Build Rust project
cargo test              # Run Rust tests
cargo fmt               # Format Rust code
cargo clippy            # Lint Rust code

npm install             # Install Node dependencies
npm test                # Run JavaScript tests
npm run build           # Build everything
npm run build:wasm      # Build WASM module

# Git workflow
git checkout -b feature/name   # Create feature branch
git add .                      # Stage changes
git commit -m "message"        # Commit changes
git push origin feature/name   # Push to GitHub
```

### Getting Help

- 📖 Read: [CONTRIBUTING.md](CONTRIBUTING.md)
- 💬 Ask: [GitHub Discussions](https://github.com/JJediny/json-schema-x-graphql/discussions)
- 🐛 Report: [GitHub Issues](https://github.com/JJediny/json-schema-x-graphql/issues)
- 👥 Chat: Discord server (link in README)

---

**Welcome to the project! We're excited to have you here.** 🎉

If you have any questions, don't hesitate to ask in Discussions or reach out to the maintainers.

Happy coding! 🚀