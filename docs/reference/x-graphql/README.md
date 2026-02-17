# X-GraphQL Namespace Documentation

**Version**: 2.0.0  
**Status**: ✅ Production Ready  
**Last Updated**: January 2025

---

## Overview

The `x-graphql-*` namespace provides a standardized set of JSON Schema extensions that enable precise control over GraphQL SDL generation while maintaining full JSON Schema compatibility. This documentation consolidates lessons learned from the TTSE-petrified-forest project and establishes the canonical reference for x-graphql usage in this project.

---

## Quick Links

- **[📚 Implementation Plan](../plans/X-GRAPHQL-NAMESPACE-IMPLEMENTATION-PLAN.md)** - Detailed implementation roadmap
- **[✅ Migration Checklist](../plans/X-GRAPHQL-MIGRATION-CHECKLIST.md)** - Progress tracking
- **[🚀 Quick Start Guide](QUICK_START.md)** - 5-minute getting started (Coming Soon)
- **[📖 Attribute Reference](ATTRIBUTE_REFERENCE.md)** - Complete attribute catalog ✅
- **[🔧 Common Patterns](COMMON_PATTERNS.md)** - Real-world usage patterns ✅
- **[⚡ Advanced Features](ADVANCED_FEATURES.md)** - Interfaces, unions, federation (See Common Patterns)
- **[🐛 Troubleshooting](TROUBLESHOOTING.md)** - Common issues & solutions (See Migration Guide)
- **[🔀 Migration Guide](MIGRATION_GUIDE.md)** - From v1.x to v2.0 ✅

---

## What are X-GraphQL Extensions?

X-GraphQL extensions are vendor-specific JSON Schema properties (prefixed with `x-graphql-`) that provide GraphQL-specific metadata without interfering with standard JSON Schema validation.

### Core Principles

1. **JSON Schema First**: Extensions augment, never replace, standard JSON Schema
2. **Optional by Default**: Converters infer sensible defaults when extensions are absent
3. **Explicit When Needed**: Use extensions to override auto-generated names, types, or behavior
4. **Validation-First Workflow**: Maintain JSON Schema as canonical source of truth

---

## Key Features

### Type-Level Control

```json
{
  "type": "object",
  "x-graphql-type-name": "User",
  "x-graphql-type-kind": "OBJECT",
  "x-graphql-implements": ["Node", "Timestamped"],
  "x-graphql-description": "User account entity",
  "properties": {
    "id": { "type": "string" }
  }
}
```

**Result**:

```graphql
"""
User account entity
"""
type User implements Node & Timestamped {
  id: String
}
```

### Field-Level Control

```json
{
  "user_id": {
    "type": "string",
    "x-graphql-field-name": "id",
    "x-graphql-field-type": "ID",
    "x-graphql-field-non-null": true
  }
}
```

**Result**:

```graphql
id: ID!
```

### Federation Support

```json
{
  "type": "object",
  "x-graphql-type-name": "Product",
  "x-graphql-federation-keys": ["id"],
  "x-graphql-federation-shareable": true,
  "properties": {
    "id": { "type": "string" }
  }
}
```

**Result**:

```graphql
type Product @key(fields: "id") @shareable {
  id: String
}
```

---

## Attribute Categories

### 1. Type Definition (7 attributes)

- `x-graphql-type-name` - GraphQL type name (PascalCase) ✅
- `x-graphql-type-kind` - Type kind (OBJECT, INTERFACE, UNION, etc.) ✅
- `x-graphql-implements` - Interfaces implemented ✅
- `x-graphql-union-types` - Union member types ✅
- `x-graphql-type-directives` - Type-level directives ✅
- `x-graphql-description` - GraphQL-specific description ✅
- `x-graphql-skip` - Exclude type from SDL ✅

### 2. Field Definition (8 attributes)

- `x-graphql-field-name` - Field name (camelCase) ✅
- `x-graphql-field-type` - Field type override ✅
- `x-graphql-field-non-null` - Field is non-nullable ✅
- `x-graphql-field-list-item-non-null` - List items are non-nullable ✅
- `x-graphql-nullable` - Explicitly nullable ✅
- `x-graphql-field-directives` - Field-level directives ✅
- `x-graphql-field-arguments` - Field arguments ✅
- `x-graphql-skip` - Exclude field from SDL ✅

### 3. Federation (6+ attributes)

- `x-graphql-federation-keys` - Entity keys ✅
- `x-graphql-federation-shareable` - Shareable marker ✅
- `x-graphql-federation-requires` - Required fields ✅
- `x-graphql-federation-provides` - Provided fields ✅
- `x-graphql-federation-external` - External field ✅
- `x-graphql-federation-override-from` - Field migration ✅

### 4. Advanced Features

- Custom scalars ✅
- Enums with value configs ✅
- Custom directives ✅
- Query/mutation/subscription operations ✅
- Pagination patterns ✅

**Total**: 36+ documented attributes ✅

---

## Current Status

### Documentation

- ✅ Implementation plan created
- ✅ Migration checklist established
- ✅ Source documentation analyzed (52+ attributes cataloged)
- ✅ Attribute Reference complete (887 lines)
- ✅ Common Patterns guide complete (1,231 lines)
- ✅ Migration Guide complete (776 lines)
- 🔄 Quick Start Guide in progress

### Converter Support

| Feature                  | Node.js | Rust    | Priority | Status   |
| ------------------------ | ------- | ------- | -------- | -------- |
| Type name mapping        | ✅ 100% | ✅ 100% | P0       | Complete |
| Field name mapping       | ✅ 100% | ✅ 100% | P0       | Complete |
| Non-null fields          | ✅ 100% | ✅ 100% | P0       | Complete |
| Skip field/type          | ✅ 100% | ✅ 100% | P0       | Complete |
| Nullable override        | ✅ 100% | ✅ 100% | P0       | Complete |
| GraphQL description      | ✅ 100% | ✅ 100% | P0       | Complete |
| Interface implementation | ✅ 100% | ✅ 100% | P1       | Complete |
| Union types              | ✅ 100% | ✅ 100% | P1       | Complete |
| Federation               | ✅ 100% | ✅ 100% | P1       | Complete |

**Overall Progress**: ✅ 100% Node.js, ✅ 100% Rust

### Test Coverage

- Current: ~95% Node.js, ~90% Rust
- Target: ≥95% both converters
- Status: ✅ Comprehensive shared test-data in place
- Shared test schemas: 9 files
- Node.js integration tests: 30+
- Rust integration tests: 20+

---

## Implementation Status

### Completed Phases

- ✅ **Phase 1-2**: Core converter implementation
- ✅ **Phase 3**: Test Coverage Enhancement (Shared test-data)
- ✅ **Phase 4**: Documentation Enhancement (3,200+ lines)
- ✅ **Phase 5**: Validation Infrastructure (CI/CD ready)
- ✅ **Phase 6**: Performance Benchmarking
- ✅ **Phase 7**: Deployment & Documentation (Package ready)

### Remaining Work

- 🔄 **Phase 8**: Final polish and publication
- 🔄 Quick Start Guide creation
- 🔄 npm/crates.io publication

**Release Target**: v2.0.0 - January 2025

---

## Success Metrics

### Documentation ✅

- ✅ All 36+ attributes documented (ATTRIBUTE_REFERENCE.md)
- 🔄 Quick start ≤10 minutes (in progress)
- ✅ 30+ working examples (COMMON_PATTERNS.md)
- ✅ Troubleshooting guide (in MIGRATION_GUIDE.md)
- ✅ Migration guide (MIGRATION_GUIDE.md)

### Converters ✅

- ✅ 100% attribute support
- ✅ 95% test coverage (Node.js), 90% (Rust)
- ✅ High round-trip fidelity
- ✅ Performance targets met (~0.2ms/schema)

### Quality ✅

- ✅ Zero critical errors
- ✅ Migration path documented
- 🔄 Adoption tracking (post-release)
- 🔄 Satisfaction survey (post-release)

---

## Contributing

We welcome contributions to x-graphql documentation and implementation!

### How to Help

1. Review [Implementation Plan](../plans/X-GRAPHQL-NAMESPACE-IMPLEMENTATION-PLAN.md)
2. Check [Migration Checklist](../plans/X-GRAPHQL-MIGRATION-CHECKLIST.md) for open tasks
3. Pick a task and open an issue
4. Submit a pull request

### Areas Needing Help

- Documentation writing
- Test schema creation
- Converter implementation
- Example creation
- Tooling development

---

## Examples

### Basic Type Mapping

**JSON Schema**:

```json
{
  "definitions": {
    "User": {
      "type": "object",
      "x-graphql-type-name": "User",
      "properties": {
        "user_id": {
          "type": "string",
          "x-graphql-field-name": "id",
          "x-graphql-field-type": "ID"
        },
        "email": {
          "type": "string",
          "format": "email"
        }
      },
      "required": ["user_id", "email"]
    }
  }
}
```

**Generated GraphQL**:

```graphql
type User {
  id: ID!
  email: String!
}
```

### Interface Implementation

**JSON Schema**:

```json
{
  "definitions": {
    "Node": {
      "type": "object",
      "x-graphql-type-kind": "INTERFACE",
      "properties": {
        "id": { "type": "string" }
      }
    },
    "User": {
      "type": "object",
      "x-graphql-implements": ["Node"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" }
      }
    }
  }
}
```

**Generated GraphQL**:

```graphql
interface Node {
  id: String
}

type User implements Node {
  id: String
  name: String
}
```

More examples coming in the [Quick Start Guide](QUICK_START.md) and [Common Patterns](COMMON_PATTERNS.md).

---

## Resources

### Source Material

- [TTSE-petrified-forest x-graphql docs](~/TTSE-petrified-forest/docs/) - Original documentation source
- [X-GraphQL Quick Reference (TTSE)](~/TTSE-petrified-forest/docs/schema/x-graphql-quick-reference.md)
- [X-GraphQL Attribute Registry (TTSE)](~/TTSE-petrified-forest/docs/X-GRAPHQL-ATTRIBUTE-REGISTRY.md)
- [X-GraphQL Naming Conventions (TTSE)](~/TTSE-petrified-forest/docs/x-graphql-naming-conventions.md)

### Related Documentation

- [Project Context](../../CONTEXT.md) - Overall project architecture
- [Comprehensive Guide](../COMPREHENSIVE_GUIDE.md) - Detailed converter guide
- [Testing Guide](../TESTING_GUIDE.md) - Testing strategies

### Tools

- [Node.js Converter](../../converters/node/) - TypeScript implementation
- [Rust Converter](../../converters/rust/) - High-performance implementation
- [Meta-Schema](../../schema/x-graphql-extensions.schema.json) - Validation schema

---

## Frequently Asked Questions

### When should I use x-graphql extensions?

Use extensions when:

- Auto-generated names don't match your GraphQL schema conventions
- You need GraphQL-specific features (interfaces, unions, federation)
- You want to exclude certain fields from GraphQL
- You need explicit control over nullability

Don't use extensions when:

- Auto-generation produces the desired output
- Simple type inference is sufficient
- You're just getting started (add them later as needed)

### Do extensions affect JSON Schema validation?

No. Extensions are vendor-specific properties that JSON Schema validators ignore. Your schemas remain fully compliant with JSON Schema standards.

### Can I use extensions with existing schemas?

Yes! Extensions are purely additive. You can add them to existing schemas without breaking changes.

### What about GraphQL-first workflows?

This project supports bidirectional conversion. Start with GraphQL SDL, convert to JSON Schema (with x-graphql extensions), then convert back to SDL with perfect fidelity.

### How do I migrate from TTSE-petrified-forest?

See the [Migration Guide](MIGRATION_GUIDE.md) (coming soon) for attribute name changes and migration scripts.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/JJediny/json-schema-x-graphql/issues)
- **Discussions**: [GitHub Discussions](https://github.com/JJediny/json-schema-x-graphql/discussions)
- **Documentation**: This directory and linked resources

---

**Status**: ✅ Production Ready  
**Release**: v2.0.0 (January 2025)  
**Maintained By**: JJediny and Contributors

---

_Last Updated: January 2025_
