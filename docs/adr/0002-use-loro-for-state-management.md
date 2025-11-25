# 0002: Use Loro for State Management

Date: 2024-07-29

## Status

Accepted

## Context

The application requires a robust state management solution to synchronize the JSON Schema and GraphQL SDL representations. As users edit one representation, the changes must be reflected in the other in real-time. Looking ahead, a primary goal is to support concurrent editing by multiple users, enabling real-time collaboration.

This requires a state management model that can handle distributed changes without a central server, merge concurrent edits without data loss, and maintain a consistent state across all clients. Traditional state management approaches often struggle with the complexity of real-time multi-user synchronization and conflict resolution.

## Decision

We will adopt the `loro` library for state management. `Loro` is a high-performance, local-first CRDT (Conflict-free Replicated Data Type) library written in Rust. It will be used to manage the document state for both the JSON Schema and GraphQL SDL.

The core of the application will use `loro`'s data structures to represent the documents. Changes from the UI will be applied as operations to the `loro` document, and the resulting state changes will be used to update the converted representation.

## Consequences

### Positive

*   **Future-Proofing for Collaboration**: By building on a CRDT foundation from the start, we are architecturally prepared for future multi-user, real-time collaboration features. CRDTs are specifically designed to handle concurrent edits from multiple sources without requiring complex conflict resolution logic.
*   **Performance**: `Loro` is implemented in Rust and is designed for high performance, which is crucial for a responsive user experience, especially when dealing with large schemas.
*   **Offline Support (Local-First)**: The local-first nature of `loro` means the application can work seamlessly offline. State is managed locally, and synchronization can happen whenever a network connection is available.
*   **Unified Data Model**: It provides a single, reliable source of truth for the application state that can be easily synchronized between the Rust back end (WASM) and the front-end UI.

### Negative

*   **Learning Curve**: CRDTs are a specialized data structure. The team may need to invest time in understanding their concepts and the specifics of the `loro` library to use it effectively.
*   **Increased Complexity**: Integrating a CRDT library adds a layer of abstraction compared to simpler state management solutions. This introduces some initial complexity to the codebase.
*   **Dependency**: We are adding a significant external dependency. While `loro` is a well-regarded project, we will be reliant on its continued maintenance and development.