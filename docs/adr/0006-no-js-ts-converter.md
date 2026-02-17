# 0006: Do Not Support a JavaScript/TypeScript Converter

Date: 2024-07-29

## Status

Accepted

## Context

For any web-based application, using JavaScript (or TypeScript) as the primary language for all logic is the default and simplest path. It avoids complex build toolchains, cross-language communication overhead, and ensures the widest pool of potential contributors.

The core feature of this application is the real-time, bidirectional conversion between JSON Schema and GraphQL SDL. As a user types in one editor, the other must update instantly. This requirement puts significant performance demands on the conversion engine, especially when dealing with large and complex schemas that are common in enterprise environments.

An implementation in JavaScript/TypeScript was considered as the baseline approach. However, preliminary analysis and prototyping raised concerns about its ability to consistently deliver the required performance for a fluid, real-time user experience without blocking the UI thread.

## Decision

We will not implement or support a JSON Schema-to-GraphQL converter written in JavaScript or TypeScript. The official and sole implementation of the conversion logic will be the Rust-based engine, which is compiled to WebAssembly (WASM) for use in the browser.

This is a strategic decision to prioritize performance and responsiveness above the development convenience of a pure JavaScript stack.

## Consequences

### Positive

- **Guaranteed Performance**: By committing to Rust and WASM, we can ensure that the computationally intensive conversion logic meets the performance standards required for a real-time, lag-free user experience. This was deemed the most critical factor.
- **Simplified Core Logic**: We avoid the significant overhead of maintaining two separate implementations (one in Rust, one in TS/JS) of the same complex conversion logic. This prevents bugs, reduces testing complexity, and ensures a single source of truth.
- **Focused Effort**: All development effort for the core engine can be concentrated on optimizing and improving the single Rust codebase.

### Negative

- **Higher Barrier to Contribution**: The project's core logic will be less accessible to the broad community of JavaScript/TypeScript developers. Contributing to the converter will require knowledge of Rust.
- **WASM Integration Complexity**: This decision necessitates the use of a more complex build pipeline involving `wasm-pack` and careful management of the interface between JavaScript and the WASM module.
- **Exclusion of JS/TS Ecosystem**: We cannot leverage the rich ecosystem of JavaScript libraries for schema parsing, validation, or transformation directly within our core conversion logic. We are reliant on the Rust ecosystem (crates) for these needs.
