//! JSON Schema x GraphQL - Root Library
//!
//! This is the root library file for the JSON Schema x GraphQL project.
//! The actual converter implementations are located in:
//! - `converters/rust/` - Rust converter with WASM support
//! - `converters/node/` - Node.js/TypeScript converter
//!
//! This file exists to satisfy the root Cargo.toml manifest.

#![warn(missing_docs)]
#![warn(clippy::all)]

/// Root module placeholder
pub mod root {
    /// Version information
    pub const VERSION: &str = env!("CARGO_PKG_VERSION");

    /// Project name
    pub const NAME: &str = env!("CARGO_PKG_NAME");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version() {
        assert!(!root::VERSION.is_empty());
    }

    #[test]
    fn test_name() {
        assert_eq!(root::NAME, "json-schema-x-graphql");
    }
}
