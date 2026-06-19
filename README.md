# JSON Schema x GraphQL

> **The canonical pattern for bidirectional conversion between JSON Schema and GraphQL SDL.**

![Project Status](https://img.shields.io/badge/status-beta-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-0.4.0-green)
[![Comprehensive Tests](https://github.com/json-schema-x-graphql/json-schema-x-graphql/actions/workflows/comprehensive-tests.yml/badge.svg?branch=main)](https://github.com/json-schema-x-graphql/json-schema-x-graphql/actions/workflows/comprehensive-tests.yml)
[![Security Audit](https://github.com/json-schema-x-graphql/json-schema-x-graphql/actions/workflows/security-audit.yml/badge.svg?branch=main)](https://github.com/json-schema-x-graphql/json-schema-x-graphql/actions/workflows/security-audit.yml)
[![Docs Site](https://github.com/json-schema-x-graphql/json-schema-x-graphql/actions/workflows/docs.yml/badge.svg?branch=main)](https://github.com/json-schema-x-graphql/json-schema-x-graphql/actions/workflows/docs.yml)
[![Deploy to GitHub Pages](https://github.com/json-schema-x-graphql/json-schema-x-graphql/actions/workflows/deploy-pages.yml/badge.svg?branch=main)](https://github.com/json-schema-x-graphql/json-schema-x-graphql/actions/workflows/deploy-pages.yml)
[![Composition Pipeline](https://github.com/json-schema-x-graphql/json-schema-x-graphql/actions/workflows/composition-pipeline.yml/badge.svg?branch=main)](https://github.com/json-schema-x-graphql/json-schema-x-graphql/actions/workflows/composition-pipeline.yml)
[![codecov](https://codecov.io/gh/json-schema-x-graphql/json-schema-x-graphql/graph/badge.svg?token=502P8OW59D)](https://codecov.io/gh/json-schema-x-graphql/json-schema-x-graphql)

## Overview

This project establishes a standard for extending JSON Schema with GraphQL-specific metadata using `x-graphql-*` vendor extensions. It addresses the fundamental impedance mismatch between JSON Schema's validation-first model and GraphQL's type system, enabling a **validation-first workflow** while maintaining full GraphQL expressiveness.

### The Problem

Organizations often have to choose between:

1. **Schema-first (SDL)**: Great for API design, but lacks robust data validation capabilities.
2. **Code-first**: flexible, but loses the benefits of a declarative schema.
3. **JSON Schema-first**: Great for validation, but difficult to expose as a GraphQL API without data loss.

Existing tools often perform "lossy" conversions, dropping directives, arguments, and type metadata.

### The Solution

We define a **lossless** mapping strategy using standard JSON Schema extensions.

- **Single Source of Truth**: JSON Schema defines both validation logic and API structure.
- **Bidirectional**: Convert JSON Schema ↔ GraphQL SDL without losing metadata.
- **Upstream Interop**: Bridge directly from Zod or Standard Schema using `@standard-schema/spec`.
- **Downstream Codegen**: Automatically pipe SDL outputs into `@graphql-codegen` for end-to-end TS interfaces.
- **Federation-Ready**: Full support for Apollo Federation v2.9 directives.
- **Strict Governance**: Meta-schema rejects unknown `x-graphql` keywords to prevent configuration drift.

## Quick Start

### 1. Define your Schema

Create a JSON Schema with `x-graphql` extensions:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$defs": {
    "User": {
      "type": "object",
      "x-graphql-type-name": "User",
      "x-graphql-type-kind": "OBJECT",
      "x-graphql-federation-keys": [{ "fields": "id" }],
      "properties": {
        "user_id": {
          "type": "string",
          "x-graphql-field-name": "id",
          "x-graphql-field-type": "ID",
          "x-graphql-field-non-null": true
        },
        "username": {
          "type": "string",
          "minLength": 3,
          "x-graphql-field-name": "username",
          "x-graphql-field-type": "String"
        }
      }
    }
  }
}
```

### 2. Convert to GraphQL

Using our converter, this generates the following SDL:

```graphql
type User @key(fields: "id") {
  id: ID!
  username: String
}
```

### 3. CLI Usage (Standardized Options)

Node CLI (built output):

```bash
node converters/cli/dist/index.js \
  --input examples/user-service.schema.json \
  --output output/user-service.graphql \
  --types output/user-service.d.ts \
  --descriptions \
  --preserve-order \
  --include-federation-directives \
  --federation-version V2 \
  --naming-convention GRAPHQL_IDIOMATIC \
  --id-strategy COMMON_PATTERNS \
  --output-format SDL
```

Rust CLI (release binary `jxql`):

```bash
converters/rust/target/release/jxql \
  --input examples/user-service.schema.json \
  --output output/user-service.graphql \
  --descriptions \
  --preserve-order \
  --include-federation-directives \
  --federation-version V2 \
  --naming-convention GRAPHQL_IDIOMATIC \
  --id-strategy COMMON_PATTERNS \
  --output-format SDL
```

Notes:

- `--output-format AST_JSON` emits the AST as JSON instead of SDL.
- `--fail-on-warning` exits non-zero if any warnings are produced.
- `--id-strategy` accepts `NONE`, `COMMON_PATTERNS`, or `ALL_STRINGS` (legacy `--infer-ids` maps to `COMMON_PATTERNS`).
- `--types <path>` enables automatic TypeScript typings generation via `@graphql-codegen/core`.

Example AST_JSON output (truncated):

```json
{
  "kind": "Document",
  "definitions": [
    {
      "kind": "ObjectTypeDefinition",
      "name": { "kind": "Name", "value": "User" },
      "fields": [
        {
          "kind": "FieldDefinition",
          "name": { "kind": "Name", "value": "id" },
          "type": {
            "kind": "NonNullType",
            "type": {
              "kind": "NamedType",
              "name": { "kind": "Name", "value": "ID" }
            }
          }
        }
      ]
    }
  ]
}
```

## Features

### Core Capabilities

- **Bidirectional Conversion**: Lossless round-tripping between formats.
- **Type System Complete**: Supports Objects, Interfaces, Unions, Enums, Inputs, and Scalars.
- **Field Arguments**: Define arguments with default values in JSON Schema.
- **Documentation**: Preserves descriptions and deprecation reasons.
- **Performance**: Rust backend relies on `simd-json` for ultra-fast native SIMD processing.
- **Ecosystem Bridges**: Built-in support for Zod and Standard Schema.

### Apollo Federation Support (v2.9)

Fully supports the Apollo Federation specification:

- **Entities**: `@key`, `@shareable`, `@interfaceObject`
- **Field Directives**: `@external`, `@requires`, `@provides`, `@override`
- **Authorization**: `@authenticated`, `@requiresScopes`, `@policy`
- **Viaduct Support**: Deep integration with `@resolver`, `@backingData`, and `@idOf`.

### Federated REST Emulation & API Stitching Gateway

A major production application of the `json-schema-x-graphql` standard is emulating legacy or remote REST APIs as federated subgraphs to form a stitched API gateway. By combining lightweight registration manifests (`endpoints-config.yaml`) and extended JSON Schemas, you can unify separate microservices (e.g., forward geocoding, reverse coordinates lookup, IP routing, and ZIP code services) into a single, cohesive federated schema.

The emulation proxy engine performs two core translation phases during query execution:

- **Request Translation**: The engine reads the incoming GraphQL queries, fields, arguments, or federation entity representations (e.g., `{ args: { q: "Berlin" } }` or `{ representations: { latitude: "52.51", longitude: "13.39" } }`). It dynamically interpolates these parameters into the registered endpoint templates in `endpoints-config.yaml` to fire downstream requests to the remote REST endpoints.
- **Response Translation**: The engine intercepts raw REST JSON response payloads and routes them through a recursive adapter. The adapter leverages the `x-graphql-field-name` and `x-graphql-type-name` rules declared in our JSON Schemas (automatically applying IDIOMATIC camelCase field formatting and type conversions, and resolving local `$ref` pointers) to map raw keys into clean, typed camelCase GraphQL objects.

A complete runnable implementation orchestrating four live geocoding REST microservices using this pattern is available in our [mesh-gateway workspace package](examples/mesh-gateway).

### Visual Editor

The project includes a powerful web-based editor featuring:

- **Three-Panel Layout**: Simultaneous view of JSON Schema, GraphQL SDL, and Visual Graph.
- **Real-time Sync**: Changes in one view instantly propagate to others.
- **Visual Graph**: Interactive node-link diagram of your schema structure.

## Architecture

### Three-Namespace Design

To handle naming conflicts and conventions cleanly, we use three distinct namespaces:

1. **`snake_case`**: JSON Schema properties (optimized for database/backend).
2. **`camelCase`**: GraphQL fields (optimized for API consumers).
3. **`hyphen-case`**: Extension keys (e.g., `x-graphql-field-name`).

### Tech Stack

- **Core Converters**: Implemented in **Rust** (for WASM/Performance) and **Node.js** (for ease of use).
- **Frontend**: React-based editor using Monaco Editor and `graphql-editor` for visualization.
- **Collaboration**: Built with Yjs/Loro architecture for future multi-user editing.

## Project Status

**Current Version**: 0.4.0 (Beta)
**Status**: Core Implementation & Web Editor Complete

### Completed ✅

- **Phase 1: Foundation**
  - Meta-schema definition (JSON Schema 2020-12)
  - Comprehensive example schemas
  - Architecture documentation
- **Phase 2: Core Converters**
  - ✅ Rust converter (WASM-ready, SIMD optimized)
  - ✅ Node.js converter (TypeScript, Codegen/Zod interop)
  - ✅ Bidirectional fidelity verification
- **Phase 3: Web Editor**
  - ✅ React split-pane editor
  - ✅ Visual Graph integration
  - ✅ Real-time bidirectional conversion
- **Phase 4: Architecture Governance**
  - ✅ Strict Meta-Schema closures
  - ✅ Native Zod and Standard Schema integrations
  - ✅ Seamless GraphQL-Codegen output pipeline

### In Progress 🚧

- **Performance Benchmarking**
  - Rust SIMD benchmark suite calibration
- **Cross-browser validation**

### Future Roadmap 📋

- **Phase 5: Release**
  - npm/crates.io publication
  - Public demo deployment

## Installation & Usage

### Node.js

```bash
npm install @json-schema-x-graphql/core
```

```javascript
import { jsonSchemaToGraphQL } from "@json-schema-x-graphql/core";

const sdl = jsonSchemaToGraphQL(myJsonSchema);
console.log(sdl);
```

### Rust

```toml
[dependencies]
json-schema-x-graphql = "0.4.0"
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to get started.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.
