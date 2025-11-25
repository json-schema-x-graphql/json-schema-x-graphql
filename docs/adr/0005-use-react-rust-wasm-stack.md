# 0005: Use React, Rust, and WASM for Web Application

Date: 2024-07-29

## Status

Accepted

## Context

The project's primary goal is to provide a real-time, in-browser conversion between JSON Schema and GraphQL SDL. This presents two distinct technical challenges:

1.  **Front-End**: We need a modern, component-based framework to build a responsive and interactive user interface that includes complex elements like text editors and visual schema explorers.
2.  **Core Logic**: The conversion logic itself is complex, stateful, and performance-sensitive. Processing large schemas and reflecting changes instantly requires computational efficiency that can be challenging to achieve with traditional web technologies.

We need a technology stack that can effectively address both of these requirements, allowing for a high-performance core to be seamlessly integrated with a rich user interface.

## Decision

The application will be built using a hybrid technology stack:
*   **Front-End**: `React` will be used to build the user interface. Its component-based architecture and mature ecosystem are ideal for creating the required UI.
*   **Core Logic**: `Rust` will be used to implement the conversion engine, state management (with `loro`), and schema validation logic.
*   **Integration**: The Rust core will be compiled to `WebAssembly (WASM)` and consumed by the React application as a module. This allows us to run the high-performance Rust code directly in the browser.

## Consequences

### Positive

*   **Maximum Performance**: Compiling the computationally intensive conversion logic from Rust to WASM allows us to achieve near-native performance directly in the browser, which is essential for the real-time editing experience.
*   **Leverages Best-of-Breed Technologies**: We can leverage the strengths of the React ecosystem for building UIs while using Rust for its performance, memory safety, and strong type system in the core engine.
*   **Code Portability**: The core Rust logic is decoupled from the web front-end. It can be compiled to native binaries and reused in other contexts, such as a command-line interface or a server-side application, with minimal changes.
*   **Type Safety**: The combination of Rust's type system for the core logic and TypeScript for the React front-end provides end-to-end type safety, reducing the likelihood of runtime errors.

### Negative

*   **Build Complexity**: The toolchain is more complex than a pure JavaScript stack. It requires managing the Rust compiler (`rustc`), the WASM packager (`wasm-pack`), and the JavaScript bundler (`webpack` or similar) to work in concert.
*   **Debugging Challenges**: Debugging across the JavaScript/WASM boundary can be difficult. While tooling is improving, it is not yet as mature as debugging pure JavaScript applications.
*   **Increased Initial Bundle Size**: The WASM binary must be downloaded by the client, which increases the application's initial payload size and can affect the initial page load time.