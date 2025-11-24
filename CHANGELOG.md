# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Core Rust WASM converter implementation
- React editor frontend
- Comprehensive test suite
- API documentation
- npm and crates.io publication

## [0.1.0] - 2024-01-20

### Added
- Initial project structure and repository setup
- Comprehensive README.md with project overview and quick start
- CONTEXT.md with detailed architecture and roadmap
- CONTRIBUTING.md with contribution guidelines
- JSON Schema 2020-12 meta-schema defining all `x-graphql-*` extensions
- Example user-service schema demonstrating all features
- Cargo.toml for Rust/WASM project configuration
- package.json for npm distribution
- .gitignore for clean version control
- PROJECT_SUMMARY.md documenting repository structure
- MIT License

### Features
- Meta-schema with strict validation patterns for:
  - GraphQL naming conventions (PascalCase types, camelCase fields)
  - Apollo Federation v2.9 directives
  - Custom directive definitions
  - Field arguments with defaults
  - Enum value configurations
  - Resolver metadata hints
  - Subscription configuration
- Comprehensive example schema demonstrating:
  - Entity configuration with @key directives
  - Federation directives (@requires, @provides, @external, @shareable)
  - Authorization directives (@authenticated, @requiresScopes, @policy)
  - Root operation types (Query, Mutation)
  - All GraphQL type kinds (Object, Enum, Input, Scalar)

### Documentation
- Complete architectural documentation
- Three-namespace design (snake_case, camelCase, hyphen-case)
- 15 core extension fields specification
- Development roadmap (5 phases)
- Coding standards for Rust and TypeScript
- Testing guidelines with examples
- RFC process for major changes

### Standards Compliance
- JSON Schema 2020-12 specification
- GraphQL October 2021 specification
- Apollo Federation v2.9 support
- MIT License

## Version History

### Version Numbering

This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR** version: Incompatible API changes or breaking changes
- **MINOR** version: New functionality in a backward compatible manner
- **PATCH** version: Backward compatible bug fixes

### Release Process

1. Update this CHANGELOG.md with new version
2. Update version in Cargo.toml and package.json
3. Create git tag: `git tag -a v0.1.0 -m "Release v0.1.0"`
4. Push tag: `git push origin v0.1.0`
5. Publish to crates.io: `cargo publish`
6. Publish to npm: `npm publish`
7. Create GitHub release with release notes

## Links

- [Repository](https://github.com/JJediny/json-schema-x-graphql)
- [Issues](https://github.com/JJediny/json-schema-x-graphql/issues)
- [Pull Requests](https://github.com/JJediny/json-schema-x-graphql/pulls)
- [Discussions](https://github.com/JJediny/json-schema-x-graphql/discussions)

---

**Maintained by**: @JJediny and contributors  
**License**: MIT