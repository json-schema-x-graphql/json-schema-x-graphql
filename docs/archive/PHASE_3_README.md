# Phase 3: Testing & Web UI Implementation

**Status**: 🚧 In Progress  
**Current Phase**: 3A - Local Testing Infrastructure  
**Next Phase**: 3B - Web UI Editor with GraphQL Editor Integration

---

## Overview

Phase 3 consists of two sub-phases:

1. **Phase 3A**: Comprehensive local testing infrastructure for Rust and Node.js converters
2. **Phase 3B**: Web-based three-panel editor with [GraphQL Editor](https://github.com/graphql-editor/graphql-editor) integration

---

## Phase 3A: Local Testing (Current)

### Goals

- ✅ Validate both converters produce correct results
- ✅ Ensure bidirectional conversion fidelity
- ✅ Test Apollo Federation support
- ✅ Achieve 80%+ code coverage
- ✅ Establish parity between Rust and Node.js implementations

### Quick Start

```bash
# Run all tests (Rust + Node.js)
./scripts/run-tests.sh

# Run only Rust tests
./scripts/run-tests.sh rust

# Run only Node.js tests
./scripts/run-tests.sh node

# Test converter parity
./scripts/test-parity.sh
```

### What's Included

#### Test Files

- **Rust**: `converters/rust/tests/integration_tests.rs` (603 lines)
  - Object, Interface, Union, Enum, Input types
  - Federation directives (@key, @external, @requires, @provides, @shareable, @authenticated)
  - Field arguments with defaults
  - Bidirectional conversion tests
  - Error handling and edge cases

- **Node.js**: `converters/node/tests/integration.test.ts` (712 lines)
  - Complete type system coverage
  - All Apollo Federation v2.9 directives
  - Round-trip conversion validation
  - Performance benchmarks
  - Complex federated schemas

#### Test Data

- `converters/test-data/user-service.json` - Complete federated schema example
- `converters/test-data/user-service.graphql` - Corresponding GraphQL SDL

#### Test Scripts

- `scripts/run-tests.sh` - Run all tests with coverage
- `scripts/test-parity.sh` - Validate Rust/Node.js output parity

### Running Tests

#### Rust Tests

```bash
cd converters/rust

# Run all tests
cargo test

# Run with output
cargo test -- --nocapture

# Run integration tests only
cargo test --test integration_tests

# Run specific test
cargo test test_simple_object_type

# Generate coverage
cargo install cargo-tarpaulin
cargo tarpaulin --out Html --output-dir coverage
open coverage/index.html

# Lint
cargo clippy -- -D warnings

# Format
cargo fmt
```

#### Node.js Tests

```bash
cd converters/node

# Install dependencies
npm install

# Run all tests
npm test

# Run with coverage
npm run test:coverage
open coverage/lcov-report/index.html

# Watch mode
npm run test:watch

# Lint
npm run lint

# Format
npm run format
```

### Test Coverage

Current test suite covers:

- ✅ Basic type conversion (Object, Enum, Interface, Union, Input, Scalar)
- ✅ Apollo Federation directives (all v2.9 directives)
- ✅ Field arguments with default values
- ✅ Bidirectional conversion (SDL ↔ JSON)
- ✅ List types with nullable modifiers
- ✅ Deprecated fields and enum values
- ✅ Custom scalars
- ✅ Complex nested schemas
- ✅ Error handling and validation
- ✅ Performance metrics

### Success Criteria

Phase 3A is complete when:

- [x] Rust integration tests implemented
- [x] Node.js integration tests implemented
- [ ] All tests passing (Rust)
- [ ] All tests passing (Node.js)
- [ ] 80%+ code coverage achieved
- [ ] Parity tests passing
- [ ] Linting passing (both)
- [ ] Documentation complete

---

## Phase 3B: Web UI Editor (Next)

### Goals

Build an interactive web-based editor that:

1. Provides three-panel layout (JSON Schema | Controls | GraphQL SDL)
2. Integrates [GraphQL Editor](https://github.com/graphql-editor/graphql-editor) for visualization
3. Supports toggling between Node.js and Rust/WASM converters
4. Enables real-time bidirectional conversion
5. Includes sample schemas and import/export functionality

### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    JSON Schema x GraphQL Editor                  │
├──────────────────────┬────────────┬─────────────────────────────┤
│  JSON Schema Editor  │ Converter  │  GraphQL SDL + Visualization │
│                      │  Controls  │                              │
│  Monaco Editor       │            │  GraphQL Editor              │
│  - Syntax highlight  │ Mode:      │  - SDL Editor                │
│  - Validation        │ ○ Node.js  │  - Visual Graph              │
│  - Auto-complete     │ ● WASM     │  - Type Inspector            │
│  - Error markers     │            │  - Federation Support        │
│                      │ [Convert→] │                              │
│  [Import] [Export]   │ [Validate] │  [Download] [Share]          │
└──────────────────────┴────────────┴─────────────────────────────┘
```

### Technology Stack

- **Framework**: React 18 + TypeScript
- **JSON Editor**: Monaco Editor
- **GraphQL Editor**: [graphql-editor](https://github.com/graphql-editor/graphql-editor)
- **Styling**: TailwindCSS + shadcn/ui
- **State**: Zustand
- **Build**: Vite
- **Testing**: Vitest + Playwright

### Key Features

1. **Three-Panel Layout**
   - Left: JSON Schema editor with Monaco
   - Center: Converter controls with mode toggle
   - Right: GraphQL Editor with visual graph

2. **Real-Time Conversion**
   - Auto-convert on input (debounced)
   - Manual convert buttons (both directions)
   - Show conversion statistics

3. **Converter Toggle**
   - Switch between Node.js and Rust/WASM
   - Compare performance
   - Validate parity

4. **Import/Export**
   - Load sample schemas
   - Upload user files
   - Export results (JSON/SDL/both)
   - Copy to clipboard
   - Share via URL

5. **Validation**
   - Real-time JSON Schema validation
   - GraphQL SDL validation
   - Federation directive validation
   - Inline error markers

### Implementation Timeline

- **Week 1**: Project setup, WASM build, base layout
- **Week 2**: Editor integration (Monaco + GraphQL Editor)
- **Week 3**: Converter integration (Node.js + WASM)
- **Week 4**: Features & polish (import/export, samples, UX)
- **Week 5**: Testing, documentation, deployment

### Directory Structure

```
web-ui/
├── src/
│   ├── components/
│   │   ├── editors/
│   │   │   ├── JsonSchemaEditor.tsx
│   │   │   └── GraphQLEditor.tsx
│   │   ├── converter/
│   │   │   ├── ConverterToggle.tsx
│   │   │   ├── ConvertButton.tsx
│   │   │   └── ConversionStats.tsx
│   │   └── layout/
│   │       └── ThreePanel.tsx
│   ├── converters/
│   │   ├── nodeConverter.ts
│   │   └── wasmConverter.ts
│   ├── hooks/
│   │   └── useConverter.ts
│   ├── store/
│   │   └── editorStore.ts
│   └── wasm/
│       └── (Rust WASM build output)
├── public/
│   └── samples/
│       └── (Sample schemas)
├── package.json
└── vite.config.ts
```

### Getting Started (Phase 3B)

Once Phase 3A is complete:

```bash
# Create web UI project
mkdir web-ui
cd web-ui

# Initialize Vite + React + TypeScript
npm create vite@latest . -- --template react-ts

# Install dependencies
npm install @monaco-editor/react graphql-editor zustand
npm install -D tailwindcss postcss autoprefixer

# Build Rust WASM
cd ../converters/rust
wasm-pack build --target web --out-dir ../../web-ui/src/wasm

# Start development server
cd ../../web-ui
npm run dev
```

---

## Documentation

- **[PHASE_3_TESTING.md](./PHASE_3_TESTING.md)** - Detailed testing guide (Phase 3A)
- **[PHASE_3B_WEB_UI.md](./PHASE_3B_WEB_UI.md)** - Web UI implementation plan (Phase 3B)
- **Converter READMEs**:
  - [converters/rust/README.md](./converters/rust/README.md)
  - [converters/node/README.md](./converters/node/README.md)

---

## Current Status

### Completed ✅

- [x] Rust integration test suite (603 lines)
- [x] Node.js integration test suite (712 lines)
- [x] Test data (user-service schema)
- [x] Test runner scripts
- [x] Parity validation script
- [x] Phase 3A documentation
- [x] Phase 3B implementation plan

### In Progress 🚧

- [ ] Running all tests
- [ ] Achieving 80%+ coverage
- [ ] Fixing any failing tests
- [ ] Validating converter parity

### Next Steps 📋

1. **Complete Phase 3A**:
   ```bash
   ./scripts/run-tests.sh
   ./scripts/test-parity.sh
   ```

2. **Review Results**:
   - Check coverage reports
   - Fix any failing tests
   - Validate parity between converters

3. **Begin Phase 3B**:
   - Initialize web UI project
   - Build Rust WASM module
   - Integrate GraphQL Editor

---

## Troubleshooting

### Rust Tests Failing

```bash
# Clean and rebuild
cd converters/rust
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
cd converters/node
rm -rf node_modules package-lock.json
npm install

# Clear Jest cache
npm test -- --clearCache
```

### WASM Build Issues

```bash
# Reinstall wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Build with verbose output
wasm-pack build --target web --dev -- --verbose
```

---

## Contributing

We welcome contributions to Phase 3! Here's how to help:

### Testing

- Run test suite and report issues
- Add test cases for edge cases
- Improve test coverage

### Documentation

- Fix typos or unclear instructions
- Add examples
- Improve guides

### Code

- Fix failing tests
- Optimize performance
- Add new features (Phase 3B)

### Process

1. Fork the repository
2. Create a feature branch
3. Run tests: `./scripts/run-tests.sh`
4. Submit a pull request

---

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Rust conversion time | < 5ms | 🚧 TBD |
| Node.js conversion time | < 10ms | 🚧 TBD |
| WASM conversion time | < 5ms | 📋 Not started |
| Test coverage (Rust) | 80%+ | 🚧 TBD |
| Test coverage (Node.js) | 80%+ | 🚧 TBD |
| Parity tests | 100% pass | 📋 Not started |

---

## Resources

### Phase 3A (Testing)

- [Rust Testing Guide](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [Jest Documentation](https://jestjs.io/)
- [Cargo Tarpaulin](https://github.com/xd009642/tarpaulin)

### Phase 3B (Web UI)

- [GraphQL Editor GitHub](https://github.com/graphql-editor/graphql-editor)
- [GraphQL Editor Demo](https://graphqleditor.com/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Vite Guide](https://vitejs.dev/guide/)
- [React Documentation](https://react.dev/)
- [Zustand](https://docs.pmnd.rs/zustand/)
- [TailwindCSS](https://tailwindcss.com/)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/)

---

## Questions?

- Open an [issue](https://github.com/JJediny/json-schema-x-graphql/issues)
- Start a [discussion](https://github.com/JJediny/json-schema-x-graphql/discussions)
- Check existing documentation

---

## License

[MIT License](LICENSE) - Use freely in commercial and open-source projects.

---

**Let's build the future of JSON Schema ↔ GraphQL conversion! 🚀**