# Project Context and Plan

## Overview

This project establishes a **canonical pattern** for bidirectional conversion between JSON Schema and GraphQL SDL using standardized `x-graphql-*` vendor extensions. It addresses the fundamental impedance mismatch between JSON Schema's validation-first model and GraphQL's type system, enabling a validation-first workflow while maintaining full GraphQL expressiveness.

## Problem Statement

### Current State Challenges

1. **No Established Standard**: No open-source projects define a canonical pattern for extending JSON Schema with GraphQL-specific metadata
2. **Lossy Conversions**: Existing tools (like `jsonschema2graphql`) lose critical information:
   - All directive applications (federation, deprecation, custom)
   - Field arguments and default values
   - Type-level metadata
   - Enum value configurations
3. **One-Way Workflows**: Most tooling assumes SDL as the source of truth, forcing teams to choose between:
   - Schema-first (SDL) → lose data validation capabilities
   - Code-first → lose declarative schema benefits
4. **Federation Gap**: No tooling supports Apollo Federation directives in JSON Schema

### Why This Matters

Organizations with data validation pipelines need to:
- Validate incoming data against JSON Schema **before** it hits databases
- Expose the same data through GraphQL APIs with rich type information
- Maintain a single source of truth for both validation and API schemas
- Support Apollo Federation for microservices architectures

## Solution Architecture

### Core Design Principles

1. **JSON Schema as Canonical Source**: Validation happens first, API exposure second
2. **Lossless Round-Tripping**: SDL → JSON Schema → SDL preserves 100% of metadata
3. **Namespace Isolation**: Three distinct naming conventions:
   - `snake_case` for JSON Schema/database fields
   - `camelCase` for GraphQL SDL fields  
   - `hyphen-case` for all `x-graphql-*` extension keys
4. **Minimal Required Fields**: Only 15 core extension fields needed for round-trip fidelity
5. **Standards Compliance**: 
   - JSON Schema 2020-12 specification
   - GraphQL October 2021 specification
   - Apollo Federation v2.9 specification

### Extension Strategy

All GraphQL metadata is captured via globally-unique `x-graphql-*` extensions that:
- Don't interfere with standard JSON Schema validation
- Are ignored by standard validators (AJV, fastjsonschema)
- Can be applied at any schema level (type, field, argument, enum value)
- Use deterministic transformation rules for case conversion

## Technical Specifications

### Minimal Required Extensions (15 Core Fields)

**Always Required (Core Identity)**:
- `x-graphql-type-name` - GraphQL type name (PascalCase)
- `x-graphql-type-kind` - Type kind (OBJECT, INTERFACE, UNION, ENUM, INPUT_OBJECT, SCALAR)
- `x-graphql-field-name` - Field name (camelCase)
- `x-graphql-field-type` - GraphQL type reference

**Required When Applicable (Prevents Ambiguity)**:
- `x-graphql-field-non-null` - Field is non-nullable (adds `!`)
- `x-graphql-field-list-item-non-null` - List items are non-nullable (`[Item!]`)
- `x-graphql-argument-default-value` - Argument default value

**Required for Federation**:
- `x-graphql-federation-keys` - Entity keys (`@key` directive)
- `x-graphql-federation-requires` - Required fields (`@requires`)
- `x-graphql-federation-provides` - Provided fields (`@provides`)
- `x-graphql-federation-external` - External field marker
- `x-graphql-federation-shareable` - Shareable field/type marker
- `x-graphql-federation-override-from` - Field migration source

**Optional (Arrays for Multiple)**:
- `x-graphql-type-directives` - Type-level directives
- `x-graphql-field-directives` - Field-level directives
- `x-graphql-field-arguments` - Field arguments
- `x-graphql-enum-value-configs` - Per-value enum configuration

**Optional Metadata (Tooling Hints)**:
- `x-graphql-resolver-*` - Resolver configuration hints
- `x-graphql-subscription-*` - Subscription transport config
- `x-graphql-federation-tags` - Metadata tags

### Implementation Components

#### 1. Meta-Schema Definition
- JSON Schema 2020-12 meta-schema defining all `x-graphql-*` extensions
- Strict validation patterns for GraphQL naming conventions
- Support for all Apollo Federation v2.9 features
- Location: `/schema/x-graphql-extensions.schema.json`

#### 2. Rust WASM Converter (Core Engine)
- Bidirectional SDL ↔ JSON Schema conversion
- Uses `apollo-parser` for SDL parsing
- Uses `serde` for JSON serialization
- LRU cache for performance optimization
- Target: <150KB gzipped WASM binary
- Sub-5ms conversion time for typical schemas
- Location: `/src/lib.rs`

#### 3. React Editor (Frontend Interface)
- Split-pane editor with live sync
- Debounced conversion (300ms)
- Real-time validation feedback
- Syntax highlighting for both formats
- Conversion performance metrics
- Location: `/frontend/src/SchemaEditor.tsx`

#### 4. Example Schemas
- Comprehensive test cases covering all type kinds
- Federation entity examples
- Custom directive examples
- Validation pattern examples
- Location: `/examples/`

#### 5. Documentation
- Specification document
- API reference
- Integration guides
- Best practices
- Location: `/docs/`

## Development Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [x] Define meta-schema with strict validation
- [x] Create comprehensive example schemas
- [ ] Document architectural decisions
- [ ] Set up repository structure
- [ ] Create build infrastructure

### Phase 2: Core Converter (Weeks 3-5)
- [ ] Implement SDL → JSON Schema converter
- [ ] Implement JSON Schema → SDL converter
- [ ] Add LRU caching layer
- [ ] Write unit tests for all type kinds
- [ ] Validate round-trip fidelity
- [ ] Optimize WASM binary size

### Phase 3: Frontend Editor (Weeks 6-7)
- [ ] Build React split-pane editor
- [ ] Integrate WASM converter
- [ ] Add syntax highlighting
- [ ] Implement debouncing and error handling
- [ ] Add conversion metrics display
- [ ] Create responsive UI

### Phase 4: Validation & Testing (Week 8)
- [ ] Add comprehensive test suite
- [ ] Test federation directive handling
- [ ] Validate against Apollo Router
- [ ] Performance benchmarking
- [ ] Cross-browser WASM testing

### Phase 5: Documentation & Release (Weeks 9-10)
- [ ] Write specification document
- [ ] Create API documentation
- [ ] Write integration guides
- [ ] Add example use cases
- [ ] Create demo video
- [ ] Publish to npm/crates.io

## Success Metrics

### Technical Metrics
- **Round-trip fidelity**: 100% preservation of all SDL constructs
- **Conversion performance**: <5ms for schemas <1000 lines
- **Binary size**: <150KB gzipped WASM
- **Test coverage**: >95% for core converter
- **Browser support**: All modern browsers (Chrome, Firefox, Safari, Edge)

### Adoption Metrics
- GitHub stars: Target 500+ in first year
- NPM downloads: Target 1000+/month after 6 months
- Documentation completeness: 100% API coverage
- Community feedback: Active issue/PR engagement

## Key Differentiators

### vs. Existing Solutions

1. **vs. jsonschema2graphql**:
   - ✅ Supports directives (they don't)
   - ✅ Bidirectional conversion (they're one-way)
   - ✅ Federation support (they don't have it)
   - ✅ Field arguments (missing in their tool)

2. **vs. GraphQL Introspection JSON**:
   - ✅ Preserves directives (introspection loses them)
   - ✅ Validation-first workflow (introspection is API-first)
   - ✅ Git-friendly format (introspection JSON is verbose)

3. **vs. Code-First Approaches**:
   - ✅ Declarative schema definition
   - ✅ Language-agnostic
   - ✅ Separates data validation from resolver logic

## Community & Ecosystem

### Target Audiences

1. **Data Engineers**: Building validation pipelines with GraphQL APIs
2. **API Architects**: Managing federated GraphQL architectures
3. **Full-Stack Teams**: Need single source of truth for validation + API
4. **Tool Builders**: Creating GraphQL/JSON Schema tooling

### Integration Points

- **AJV**: Standard JSON Schema validator
- **Apollo Router**: Federation gateway
- **GraphQL Code Generator**: Type generation
- **Prisma**: Database schema management
- **OpenAPI**: Potential bridge to REST APIs

### Contribution Model

- MIT License for maximum adoption
- Clear contribution guidelines
- RFC process for major changes
- Regular maintainer office hours
- Transparent roadmap via GitHub Projects

## Technical Constraints & Trade-offs

### What We Include

✅ All standard GraphQL types (Object, Interface, Union, Enum, Input, Scalar)
✅ All Apollo Federation v2.9 directives
✅ Custom directive definitions
✅ Field arguments with defaults
✅ Enum value metadata
✅ Subscription configuration
✅ Resolver hints (non-normative)

### What We Exclude

❌ Runtime value transformation (belongs in resolvers)
❌ Template engines (too complex, security risk)
❌ Arbitrary computed fields (schema transformation, not representation)
❌ Business logic (belongs in application code)

### Explicit Non-Goals

- **Not a resolver framework**: We define schemas, not execution logic
- **Not a validation engine**: Use AJV or similar for JSON Schema validation
- **Not a GraphQL server**: Use Apollo Server, gqlgen, etc.
- **Not an ORM**: Use Prisma, TypeORM, etc. for database access

## Open Questions & Future Work

### Research Areas

1. **JSONPath Integration**: Should we support JSONPath for complex field references?
2. **OpenAPI Bridge**: Can we extend this pattern to OpenAPI 3.1 (which uses JSON Schema)?
3. **Code Generation**: Should we provide code generators for common languages?
4. **Schema Evolution**: How to handle schema versioning and migration?

### Potential Extensions

- **Schema Composition**: Merge multiple JSON Schemas with conflict resolution
- **Validation Directives**: Map JSON Schema validation to GraphQL directives
- **Cost Analysis**: Integrate with GraphQL query cost calculation
- **Performance Profiling**: Track schema complexity metrics

## References & Related Work

### Standards
- [JSON Schema 2020-12](https://json-schema.org/draft/2020-12/json-schema-core.html)
- [GraphQL Specification](https://spec.graphql.org/October2021/)
- [Apollo Federation v2.9](https://www.apollographql.com/docs/federation/federation-2/federation-versions/)

### Prior Art
- [jsonschema2graphql](https://github.com/lifeomic/json-schema-to-graphql-types)
- [graphql-json-to-sdl](https://github.com/charlypoly/graphql-json-to-sdl)
- [OpenAPI x- vendor extensions](https://swagger.io/docs/specification/openapi-extensions/)

### Inspiration
- UML round-trip engineering (lessons on what NOT to do)
- Prisma schema as single source of truth
- OpenAPI's successful extension pattern

---

**Document Status**: Living document, updated as project evolves
**Last Updated**: 2024-01-20
**Maintainers**: Project team
**License**: MIT