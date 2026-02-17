# Phase 3: Local Testing & Validation - Implementation Guide

**Status**: 🚧 In Progress  
**Goal**: Comprehensive local testing infrastructure before Web UI implementation  
**Date Started**: 2024-01-15

---

## Table of Contents

1. [Overview](#overview)
2. [Testing Infrastructure Setup](#testing-infrastructure-setup)
3. [Running Tests](#running-tests)
4. [Test Coverage](#test-coverage)
5. [Next Phase: Web UI Editor](#next-phase-web-ui-editor)

---

## Overview

Phase 3 establishes a robust local testing infrastructure for both Rust and Node.js converters before implementing the web-based editor UI. This ensures:

- ✅ **Correctness**: All conversion logic is validated
- ✅ **Reliability**: Edge cases and error handling are tested
- ✅ **Performance**: Conversion speed meets requirements
- ✅ **Confidence**: Web UI will work with battle-tested converters

### Testing Strategy

```
Phase 3A: Local Testing (Current)
├── Rust Converter Tests
│   ├── Unit tests for each module
│   ├── Integration tests for full workflows
│   └── Performance benchmarks
├── Node.js Converter Tests
│   ├── Unit tests with Jest
│   ├── Integration tests with real schemas
│   └── Coverage reporting
└── Test Data Validation
    ├── user-service.json/graphql
    └── Additional test schemas

Phase 3B: Web UI Editor (Next)
├── Three-panel editor layout
├── GraphQL Editor integration
├── Converter toggle (Node.js/WASM)
└── Real-time conversion
```

---

## Testing Infrastructure Setup

### Prerequisites

**Rust Environment**:

```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install WASM target
rustup target add wasm32-unknown-unknown

# Install wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

**Node.js Environment**:

```bash
# Install Node.js 18+ (using nvm)
nvm install 18
nvm use 18

# Or verify existing installation
node --version  # Should be >= 18.0.0
```

### Install Dependencies

**Rust Converter**:

```bash
cd converters/rust

# Install dependencies and run tests
cargo test

# Run with output
cargo test -- --nocapture

# Run specific test
cargo test test_simple_object_type

# Run integration tests only
cargo test --test integration_tests
```

**Node.js Converter**:

```bash
cd converters/node

# Install dependencies
npm install

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode (for development)
npm run test:watch

# Run specific test file
npm test -- integration.test.ts
```

---

## Running Tests

### Rust Tests

#### Unit Tests (Module-Level)

```bash
cd converters/rust

# Test JSON to SDL conversion
cargo test json_to_sdl

# Test SDL to JSON conversion
cargo test sdl_to_json

# Test federation support
cargo test federation

# Test with verbose output
cargo test -- --show-output
```

#### Integration Tests (Full Workflows)

```bash
# Run all integration tests
cargo test --test integration_tests

# Run specific integration test
cargo test --test integration_tests -- test_simple_object_type

# Run tests with pretty output
cargo test --test integration_tests -- --nocapture --test-threads=1
```

#### Performance Benchmarks

```bash
# Run benchmarks (requires nightly Rust)
cargo +nightly bench

# Or with criterion (stable Rust)
cargo bench
```

#### Test with Real Data

```bash
# Run converter with test data
cargo run --example convert_file -- ../test-data/user-service.json

# Test round-trip conversion
cargo run --example round_trip -- ../test-data/user-service.graphql
```

### Node.js Tests

#### Unit Tests

```bash
cd converters/node

# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

#### Integration Tests

```bash
# Run only integration tests
npm test -- --testPathPattern=integration

# Run with verbose output
npm test -- --verbose

# Run specific test suite
npm test -- --testNamePattern="Basic Type Conversion"
```

#### Test with Real Data

```bash
# Build the converter first
npm run build

# Test with user-service schema
node dist/examples/convert-file.js ../test-data/user-service.json

# Test round-trip
node dist/examples/round-trip.js ../test-data/user-service.graphql
```

### Cross-Converter Testing

Test that both converters produce identical results:

```bash
# From project root
./scripts/test-parity.sh

# This script:
# 1. Converts user-service.json with Rust
# 2. Converts user-service.json with Node.js
# 3. Compares SDL output
# 4. Converts back to JSON with both
# 5. Validates round-trip fidelity
```

---

## Test Coverage

### Current Test Suite

**Rust Tests** (`converters/rust/tests/integration_tests.rs`):

- ✅ Basic type conversion (Object, Enum, Interface, Union, Input)
- ✅ Apollo Federation directives (@key, @external, @requires, @provides, @shareable, @authenticated)
- ✅ Field arguments with defaults
- ✅ Bidirectional conversion (SDL ↔ JSON)
- ✅ Edge cases (invalid schemas, empty schemas, list types)
- ✅ Custom scalars
- ✅ Deprecation handling
- ✅ Conversion statistics

**Node.js Tests** (`converters/node/tests/integration.test.ts`):

- ✅ Basic type conversion (Object, Enum, Interface, Union, Input)
- ✅ Apollo Federation directives (all v2.9 directives)
- ✅ Field arguments with defaults
- ✅ Bidirectional conversion (SDL ↔ JSON)
- ✅ Edge cases and error handling
- ✅ Performance benchmarks
- ✅ Custom scalars
- ✅ Complex federated schemas

### Coverage Goals

| Component                   | Target | Current |
| --------------------------- | ------ | ------- |
| Rust - Line Coverage        | 80%    | 🚧 TBD  |
| Rust - Function Coverage    | 80%    | 🚧 TBD  |
| Node.js - Line Coverage     | 80%    | 🚧 TBD  |
| Node.js - Function Coverage | 80%    | 🚧 TBD  |
| Integration Tests           | 100%   | ✅ 100% |

### Running Coverage Reports

**Rust**:

```bash
# Install tarpaulin for coverage
cargo install cargo-tarpaulin

# Run tests with coverage
cargo tarpaulin --out Html --output-dir coverage

# View report
open coverage/index.html
```

**Node.js**:

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html

# View summary
cat coverage/coverage-summary.json
```

---

## Test Data

### Included Test Schemas

**1. User Service Schema** (`converters/test-data/user-service.{json,graphql}`):

- Federated entity with @key
- Multiple field types (ID, String, Int, custom scalars)
- Federation directives (@shareable, @authenticated)
- Enum types with descriptions
- Field arguments
- Demonstrates complete feature set

### Adding Custom Test Schemas

Create new test schemas in `converters/test-data/`:

```bash
# Create new schema pair
cd converters/test-data

# JSON Schema
cat > product-service.json << 'EOF'
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$defs": {
    "Product": {
      "type": "object",
      "properties": {
        "product_id": {
          "type": "string",
          "x-graphql-field-name": "id",
          "x-graphql-field-type": "ID!",
          "x-graphql-field-non-null": true
        }
      },
      "x-graphql-type-name": "Product",
      "x-graphql-type-kind": "OBJECT"
    }
  }
}
EOF

# GraphQL SDL
cat > product-service.graphql << 'EOF'
type Product {
  id: ID!
  name: String!
  price: Float
}
EOF

# Test conversion
cd ../rust
cargo run --example convert_file -- ../test-data/product-service.json

cd ../node
npm run build
node dist/examples/convert-file.js ../test-data/product-service.json
```

---

## Linting & Code Quality

### Rust

```bash
cd converters/rust

# Run clippy (Rust linter)
cargo clippy -- -D warnings

# Format code
cargo fmt

# Check formatting without modifying
cargo fmt -- --check
```

### Node.js

```bash
cd converters/node

# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Format with Prettier
npm run format

# Check formatting
npm run format:check
```

---

## CI/CD Integration (Future)

### GitHub Actions Workflow

```yaml
name: Test & Validate Converters

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  rust:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - name: Run tests
        run: |
          cd converters/rust
          cargo test --verbose
      - name: Run clippy
        run: cargo clippy -- -D warnings

  node:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - name: Install dependencies
        run: |
          cd converters/node
          npm ci
      - name: Run tests
        run: npm test
      - name: Coverage
        run: npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  parity:
    runs-on: ubuntu-latest
    needs: [rust, node]
    steps:
      - uses: actions/checkout@v3
      - name: Test converter parity
        run: ./scripts/test-parity.sh
```

---

## Next Phase: Web UI Editor

### Phase 3B: Web-Based Editor Implementation

Once local testing is complete and validated, we'll implement the web UI:

#### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Web UI Editor                          │
├────────────────┬────────────────┬───────────────────────────┤
│  JSON Schema   │   Converter    │   GraphQL SDL + Editor    │
│    Editor      │    Toggle      │      Visualization        │
│                │                │                           │
│  Monaco Editor │  ○ Node.js     │  GraphQL Editor           │
│  - Syntax HL   │  ○ Rust/WASM   │  - SDL Editor             │
│  - Validation  │                │  - Visual Graph           │
│  - Auto-format │  [Convert →]   │  - Schema Introspection   │
│                │  [← Convert]   │                           │
└────────────────┴────────────────┴───────────────────────────┘
```

#### Technology Stack

**Framework**: React 18+ with TypeScript
**JSON Schema Editor**: Monaco Editor or Ace Editor
**GraphQL Editor**: [graphql-editor](https://github.com/graphql-editor/graphql-editor)
**Styling**: TailwindCSS
**State Management**: Zustand or React Context
**Build Tool**: Vite

#### Key Features

1. **Three-Panel Layout**:
   - Left: JSON Schema editor with syntax highlighting
   - Center: Converter controls with Node.js/WASM toggle
   - Right: GraphQL Editor with visual graph

2. **Real-Time Conversion**:
   - Auto-convert on schema changes (debounced)
   - Show conversion statistics
   - Display errors inline

3. **Converter Toggle**:
   - Switch between Node.js and Rust/WASM
   - Compare performance
   - Validate parity

4. **Import/Export**:
   - Load sample schemas
   - Import user schemas
   - Export results (JSON/SDL/both)

5. **Validation**:
   - Real-time JSON Schema validation
   - GraphQL SDL validation
   - Federation directive validation

#### Directory Structure

```
web-ui/
├── public/
│   └── samples/              # Sample schemas
├── src/
│   ├── components/
│   │   ├── JsonSchemaEditor.tsx
│   │   ├── GraphQLEditor.tsx
│   │   ├── ConverterToggle.tsx
│   │   └── Layout.tsx
│   ├── converters/
│   │   ├── nodeConverter.ts
│   │   └── wasmConverter.ts  # Rust WASM bindings
│   ├── hooks/
│   │   ├── useConverter.ts
│   │   └── useValidation.ts
│   ├── store/
│   │   └── editorStore.ts
│   └── App.tsx
├── package.json
├── vite.config.ts
└── tsconfig.json
```

#### Implementation Steps

1. **Setup (Week 1)**:
   - Initialize Vite + React + TypeScript
   - Install dependencies (Monaco, GraphQL Editor, converters)
   - Build Rust WASM module
   - Configure build pipeline

2. **Core Editor (Week 2)**:
   - Implement JSON Schema editor panel
   - Implement GraphQL editor panel
   - Add basic layout and styling

3. **Converter Integration (Week 3)**:
   - Integrate Node.js converter
   - Integrate Rust WASM converter
   - Implement toggle and comparison

4. **Features & Polish (Week 4)**:
   - Add import/export functionality
   - Implement sample schemas
   - Add error handling and validation
   - Performance optimization

5. **Testing & Documentation (Week 5)**:
   - E2E tests with Playwright
   - Component tests with React Testing Library
   - User documentation
   - Deployment configuration

#### GraphQL Editor Integration

```typescript
import { GraphQLEditor } from 'graphql-editor';

const GraphQLPanel = ({ sdl, onChange }) => {
  return (
    <GraphQLEditor
      schema={sdl}
      onChange={(newSdl) => onChange(newSdl)}
      options={{
        theme: 'dark',
        readonly: false,
        federation: true,
      }}
    />
  );
};
```

#### WASM Converter Integration

```typescript
// Load WASM module
import init, { convert_json_to_sdl } from "./wasm/converter";

let wasmInitialized = false;

export async function convertWithWasm(jsonSchema: any) {
  if (!wasmInitialized) {
    await init();
    wasmInitialized = true;
  }

  const result = convert_json_to_sdl(
    JSON.stringify(jsonSchema),
    JSON.stringify({ validate: true, prettyPrint: true }),
  );

  return JSON.parse(result);
}
```

#### Converter Toggle Component

```typescript
const ConverterToggle = ({ mode, onChange, onConvert }) => {
  return (
    <div className="converter-controls">
      <div className="toggle">
        <button
          className={mode === 'node' ? 'active' : ''}
          onClick={() => onChange('node')}
        >
          Node.js
        </button>
        <button
          className={mode === 'wasm' ? 'active' : ''}
          onClick={() => onChange('wasm')}
        >
          Rust/WASM
        </button>
      </div>

      <button
        className="convert-btn"
        onClick={onConvert}
      >
        Convert →
      </button>

      <ConversionStats />
    </div>
  );
};
```

---

## Success Criteria

### Phase 3A: Local Testing (Current)

- [x] Rust integration tests implemented (603 lines)
- [x] Node.js integration tests implemented (712 lines)
- [ ] All tests passing (Rust)
- [ ] All tests passing (Node.js)
- [ ] Coverage reports generated
- [ ] 80%+ code coverage achieved
- [ ] Test data validated
- [ ] Linting passing (Rust)
- [ ] Linting passing (Node.js)
- [ ] Documentation complete

### Phase 3B: Web UI Editor (Next)

- [ ] Project setup complete
- [ ] JSON Schema editor functional
- [ ] GraphQL Editor integrated
- [ ] Node.js converter integrated
- [ ] Rust WASM converter integrated
- [ ] Converter toggle working
- [ ] Real-time conversion working
- [ ] Import/export implemented
- [ ] Error handling robust
- [ ] E2E tests passing
- [ ] Deployed and accessible

---

## Running the Complete Test Suite

```bash
# From project root

# 1. Test Rust converter
cd converters/rust
cargo test --verbose
cargo clippy -- -D warnings
cargo fmt -- --check

# 2. Test Node.js converter
cd ../node
npm ci
npm test
npm run lint
npm run format:check

# 3. Validate test data
cd ../test-data
# Ensure user-service files exist and are valid

# 4. Run parity tests (once script is created)
cd ../..
./scripts/test-parity.sh

# 5. Generate coverage reports
cd converters/rust
cargo tarpaulin --out Html --output-dir coverage

cd ../node
npm run test:coverage
```

---

## Troubleshooting

### Rust Tests Failing

```bash
# Clean build
cargo clean
cargo build

# Run with backtrace
RUST_BACKTRACE=1 cargo test

# Update dependencies
cargo update
```

### Node.js Tests Failing

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Clear Jest cache
npm test -- --clearCache

# Run with debugging
node --inspect-brk node_modules/.bin/jest --runInBand
```

### WASM Build Issues

```bash
# Reinstall wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Build with verbose output
wasm-pack build --target web --dev -- --verbose
```

---

## Conclusion

Phase 3A establishes a comprehensive local testing infrastructure that ensures:

1. **Correctness**: All conversion logic is thoroughly tested
2. **Reliability**: Edge cases and error scenarios are handled
3. **Performance**: Conversion speed meets requirements (<5ms)
4. **Confidence**: Web UI can be built on battle-tested converters

Once all tests pass and coverage goals are met, we'll proceed to Phase 3B: Web UI Editor implementation with the GraphQL Editor integration.

---

**Next Steps**:

1. Run all tests: `cargo test && npm test`
2. Generate coverage reports
3. Fix any failing tests
4. Achieve 80%+ coverage
5. Proceed to Web UI implementation

---

**Questions or Issues?**

Open an issue: https://github.com/JJediny/json-schema-x-graphql/issues
