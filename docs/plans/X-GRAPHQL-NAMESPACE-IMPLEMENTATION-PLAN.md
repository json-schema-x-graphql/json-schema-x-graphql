# X-GraphQL Namespace Implementation Plan

**Version**: 1.1  
**Date**: December 31, 2024  
**Status**: In Progress - Phases 1-4 Complete, Phases 5-6 Added
**Purpose**: Migrate, consolidate, and enhance x-graphql namespace documentation, ensure converter support, and establish comprehensive test coverage

---

## Executive Summary

This plan addresses the need for comprehensive, consolidated documentation of the `x-graphql-*` namespace used throughout this project for JSON Schema ↔ GraphQL conversion. It incorporates lessons learned from the TTSE-petrified-forest project and ensures both converters (Node.js and Rust) have complete feature parity and test coverage.

### Goals

1. **Consolidate Documentation**: Migrate and adapt relevant x-graphql documentation from TTSE-petrified-forest
2. **Ensure Converter Parity**: Verify and implement full x-graphql attribute support in both converters
3. **Comprehensive Testing**: Achieve 100% test coverage for all x-graphql attributes
4. **User-Friendly Guides**: Create concise, practical documentation for developers

### Success Criteria

- ✅ Single source of truth for all x-graphql attributes (Phase 1)
- ✅ Both converters support all documented attributes (Phase 2)
- ✅ Test coverage ≥95% for x-graphql functionality (Phase 3)
- ✅ Clear, concise user documentation with real examples (Phase 1)
- ✅ Validation tooling to enforce correct usage (Phase 4 & 5)
- 🔄 Comprehensive validation infrastructure (Phase 5 - In Progress)
- 📋 Performance benchmarking and optimization (Phase 6 - Planned)

---

## Phase 1: Documentation Audit & Migration

**Duration**: 3-4 days  
**Priority**: High  
**Owner**: Documentation Team

### 1.1 Source Documentation Analysis

**Objective**: Catalog existing x-graphql documentation from both projects

#### From TTSE-petrified-forest

```bash
~/TTSE-petrified-forest/docs/
├── schema/
│   ├── x-graphql-quick-reference.md          # Quick reference guide
│   └── x-graphql-hints-guide.md              # Comprehensive guide
├── x-graphql-naming-conventions.md            # Naming standards
├── X-GRAPHQL-ATTRIBUTE-REGISTRY.md            # Complete attribute catalog (52+ attrs)
├── x-graphql-validation-rules.md              # Validation rules
├── x-graphql-common-violations-fixes.md       # Common errors and solutions
├── x-graphql-schema-review-checklist.md       # Review checklist
└── x-graphql-pre-commit-setup.md              # Pre-commit hook setup
```

**Content Analysis**:
- **52+ documented attributes** across 14 categories
- Federation-specific attributes (6)
- Type definition attributes (7)
- Field definition attributes (8)
- Scalar, directive, enum, and operational attributes
- Real-world examples from FPDS/USAspending schemas

#### From json-schema-x-graphql

```bash
json-schema-x-graphql/
├── schema/x-graphql-extensions.schema.json    # Meta-schema (JSON Schema 2020-12)
├── docs/CONTEXT.md                            # High-level context
├── CHANGELOG.md                               # Feature documentation
└── examples/                                  # Usage examples
```

**Content Analysis**:
- **15 core attributes** documented in CONTEXT.md
- Meta-schema defines structure and validation
- Focus on minimal required fields for round-trip fidelity
- Examples demonstrate usage patterns

### 1.2 Attribute Reconciliation

**Objective**: Create unified attribute catalog

| Attribute | TTSE | This Project | Status | Priority |
|-----------|------|--------------|--------|----------|
| `x-graphql-type-name` | ✅ | ✅ | ✅ Aligned | P0 |
| `x-graphql-type-kind` | ✅ | ✅ | ✅ Aligned | P0 |
| `x-graphql-field-name` | ✅ | ✅ | ✅ Aligned | P0 |
| `x-graphql-field-type` | ✅ | ✅ | ✅ Aligned | P0 |
| `x-graphql-field-non-null` | ✅ | ✅ | ✅ Aligned | P0 |
| `x-graphql-field-list-item-non-null` | ❌ | ✅ | ⚠️ Document | P1 |
| `x-graphql-federation-*` | ✅ | ✅ | ⚠️ Review | P1 |
| `x-graphql-implements` | ✅ | ⚠️ | ⚠️ Verify | P1 |
| `x-graphql-union-types` | ✅ | ⚠️ | ⚠️ Verify | P1 |
| `x-graphql-directives` | ✅ | ✅ | ⚠️ Review | P2 |
| `x-graphql-description` | ✅ | ❌ | 🔴 Missing | P2 |
| `x-graphql-nullable` | ✅ | ❌ | 🔴 Missing | P2 |
| `x-graphql-skip` | ✅ | ❌ | 🔴 Missing | P2 |
| `x-graphql-args` | ✅ | ⚠️ | ⚠️ Verify | P2 |
| `x-graphql-scalar` | ✅ | ⚠️ | ⚠️ Verify | P2 |

**Action Items**:
1. ✅ Verify attribute support in both converters
2. ✅ Document usage patterns for each attribute
3. ✅ Update meta-schema to include missing attributes
4. ✅ Create migration guide for TTSE users

### 1.3 Documentation Structure

**Objective**: Organize documentation for optimal developer experience

```bash
docs/
├── x-graphql/
│   ├── README.md                              # Hub page (overview + navigation)
│   ├── QUICK_START.md                         # 5-minute getting started
│   ├── ATTRIBUTE_REFERENCE.md                 # Complete attribute catalog
│   ├── NAMING_CONVENTIONS.md                  # Naming standards
│   ├── COMMON_PATTERNS.md                     # Common use cases + examples
│   ├── ADVANCED_FEATURES.md                   # Interfaces, unions, federation
│   ├── VALIDATION_GUIDE.md                    # Validation rules + tooling
│   ├── TROUBLESHOOTING.md                     # Common errors + solutions
│   ├── MIGRATION_GUIDE.md                     # From other tools/patterns
│   └── CHANGELOG.md                           # Version history
└── examples/
    └── x-graphql/
        ├── basic-types.json                   # Basic type mapping
        ├── interfaces-unions.json             # Advanced types
        ├── federation.json                    # Federation setup
        ├── directives.json                    # Custom directives
        └── complete-api.json                  # Full API example
```

**Design Principles**:
- **Progressive Disclosure**: Quick start → Common patterns → Advanced features
- **Example-Driven**: Every concept includes working examples
- **Cross-Referenced**: Easy navigation between related topics
- **Searchable**: Clear headings, table of contents, keyword indexing

### 1.4 Migration Tasks

| Task | Source | Destination | Priority | Effort |
|------|--------|-------------|----------|--------|
| Migrate quick reference | TTSE quick-reference.md | QUICK_START.md | P0 | 2h |
| Migrate attribute registry | TTSE ATTRIBUTE_REGISTRY.md | ATTRIBUTE_REFERENCE.md | P0 | 4h |
| Migrate naming conventions | TTSE naming-conventions.md | NAMING_CONVENTIONS.md | P0 | 2h |
| Adapt hints guide | TTSE hints-guide.md | COMMON_PATTERNS.md | P1 | 3h |
| Extract validation rules | TTSE validation-rules.md | VALIDATION_GUIDE.md | P1 | 2h |
| Consolidate troubleshooting | TTSE common-violations.md | TROUBLESHOOTING.md | P1 | 2h |
| Create hub page | N/A | README.md | P0 | 2h |
| Create migration guide | N/A | MIGRATION_GUIDE.md | P2 | 3h |

**Total Estimated Effort**: 20 hours

---

## Phase 2: Converter Implementation Audit

**Duration**: 3-5 days  
**Priority**: High  
**Owner**: Core Engineering Team

### 2.1 Node.js Converter Audit

**Location**: `converters/node/src/`

#### Current Support Assessment

```typescript
// File: converters/node/src/json-to-graphql.ts
interface SupportMatrix {
  typeMapping: {
    'x-graphql-type-name': 'FULL',           // ✅ Complete
    'x-graphql-type-kind': 'FULL',           // ✅ Complete
    'x-graphql-implements': 'PARTIAL',       // ⚠️ Basic support
    'x-graphql-union-types': 'PARTIAL',      // ⚠️ Basic support
  },
  fieldMapping: {
    'x-graphql-field-name': 'FULL',          // ✅ Complete
    'x-graphql-field-type': 'FULL',          // ✅ Complete
    'x-graphql-field-non-null': 'FULL',      // ✅ Complete
    'x-graphql-field-list-item-non-null': 'FULL', // ✅ Complete
    'x-graphql-nullable': 'NONE',            // 🔴 Missing
    'x-graphql-skip': 'NONE',                // 🔴 Missing
  },
  federation: {
    'x-graphql-federation-keys': 'FULL',     // ✅ Complete
    'x-graphql-federation-shareable': 'FULL', // ✅ Complete
    'x-graphql-federation-requires': 'PARTIAL', // ⚠️ Limited
    'x-graphql-federation-provides': 'PARTIAL', // ⚠️ Limited
    'x-graphql-federation-external': 'NONE', // 🔴 Missing
    'x-graphql-federation-override-from': 'NONE', // 🔴 Missing
  },
  directives: {
    'x-graphql-type-directives': 'PARTIAL',  // ⚠️ Basic parsing
    'x-graphql-field-directives': 'PARTIAL', // ⚠️ Basic parsing
    'x-graphql-field-arguments': 'PARTIAL',  // ⚠️ Limited support
  },
  metadata: {
    'x-graphql-description': 'NONE',         // 🔴 Missing
    'x-graphql-scalar': 'PARTIAL',           // ⚠️ Some scalars
  }
}
```

#### Implementation Gaps

**P0 - Critical Missing Features**:
1. `x-graphql-skip` - Field/type exclusion from SDL
2. `x-graphql-nullable` - Explicit nullability override
3. `x-graphql-description` - GraphQL-specific descriptions

**P1 - Important Partial Features**:
4. `x-graphql-implements` - Full interface implementation support
5. `x-graphql-union-types` - Complete union type generation
6. `x-graphql-federation-requires` - Complete federation support
7. `x-graphql-federation-provides` - Complete federation support

**P2 - Nice-to-Have**:
8. `x-graphql-federation-external` - Advanced federation
9. `x-graphql-federation-override-from` - Field migration
10. Enhanced directive parsing and validation

#### Implementation Strategy

```typescript
// converters/node/src/extensions/x-graphql-handler.ts

export interface XGraphQLExtensions {
  // Type-level
  typeName?: string;
  typeKind?: 'OBJECT' | 'INTERFACE' | 'UNION' | 'ENUM' | 'INPUT_OBJECT' | 'SCALAR';
  implements?: string[];
  unionTypes?: string[];
  typeDirectives?: string[];
  
  // Field-level
  fieldName?: string;
  fieldType?: string;
  fieldNonNull?: boolean;
  fieldListItemNonNull?: boolean;
  nullable?: boolean;
  skip?: boolean;
  fieldDirectives?: string[];
  fieldArguments?: Record<string, FieldArgument>;
  
  // Federation
  federationKeys?: string[];
  federationShareable?: boolean;
  federationRequires?: string[];
  federationProvides?: string[];
  federationExternal?: boolean;
  federationOverrideFrom?: string;
  
  // Metadata
  description?: string;
  scalar?: string;
}

export class XGraphQLHandler {
  // Extract all x-graphql-* extensions from schema object
  static extract(schema: JSONSchema): XGraphQLExtensions {
    const extensions: XGraphQLExtensions = {};
    
    for (const [key, value] of Object.entries(schema)) {
      if (key.startsWith('x-graphql-')) {
        const prop = this.parseExtensionKey(key);
        extensions[prop] = value;
      }
    }
    
    return extensions;
  }
  
  // Apply extensions during SDL generation
  static apply(type: GraphQLType, extensions: XGraphQLExtensions): GraphQLType {
    if (extensions.skip) return null;
    if (extensions.description) type.description = extensions.description;
    if (extensions.typeDirectives) type.directives = extensions.typeDirectives;
    // ... apply all extensions
    return type;
  }
}
```

### 2.2 Rust Converter Audit

**Location**: `converters/rust/src/`

#### Current Support Assessment

```rust
// File: converters/rust/src/types.rs
pub enum XGraphQLSupport {
    TypeMapping {
        type_name: Support::Full,              // ✅ Complete
        type_kind: Support::Full,              // ✅ Complete
        implements: Support::Partial,          // ⚠️ Basic support
        union_types: Support::Partial,         // ⚠️ Basic support
    },
    FieldMapping {
        field_name: Support::Full,             // ✅ Complete
        field_type: Support::Full,             // ✅ Complete
        field_non_null: Support::Full,         // ✅ Complete
        field_list_item_non_null: Support::Full, // ✅ Complete
        nullable: Support::None,               // 🔴 Missing
        skip: Support::None,                   // 🔴 Missing
    },
    Federation {
        keys: Support::Full,                   // ✅ Complete
        shareable: Support::Full,              // ✅ Complete
        requires: Support::Partial,            // ⚠️ Limited
        provides: Support::Partial,            // ⚠️ Limited
        external: Support::None,               // 🔴 Missing
        override_from: Support::None,          // 🔴 Missing
    },
    Directives {
        type_directives: Support::Partial,     // ⚠️ Basic parsing
        field_directives: Support::Partial,    // ⚠️ Basic parsing
        field_arguments: Support::Partial,     // ⚠️ Limited support
    },
    Metadata {
        description: Support::None,            // 🔴 Missing
        scalar: Support::Partial,              // ⚠️ Some scalars
    }
}
```

#### Implementation Gaps (Same as Node.js)

**P0 - Critical Missing Features**:
1. `x-graphql-skip` - Field/type exclusion from SDL
2. `x-graphql-nullable` - Explicit nullability override
3. `x-graphql-description` - GraphQL-specific descriptions

**P1 - Important Partial Features**:
4. `x-graphql-implements` - Full interface implementation support
5. `x-graphql-union-types` - Complete union type generation
6. `x-graphql-federation-requires` - Complete federation support
7. `x-graphql-federation-provides` - Complete federation support

#### Implementation Strategy

```rust
// converters/rust/src/extensions.rs

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XGraphQLExtensions {
    // Type-level
    #[serde(rename = "x-graphql-type-name")]
    pub type_name: Option<String>,
    #[serde(rename = "x-graphql-type-kind")]
    pub type_kind: Option<TypeKind>,
    #[serde(rename = "x-graphql-implements")]
    pub implements: Option<Vec<String>>,
    #[serde(rename = "x-graphql-union-types")]
    pub union_types: Option<Vec<String>>,
    
    // Field-level
    #[serde(rename = "x-graphql-field-name")]
    pub field_name: Option<String>,
    #[serde(rename = "x-graphql-field-type")]
    pub field_type: Option<String>,
    #[serde(rename = "x-graphql-field-non-null")]
    pub field_non_null: Option<bool>,
    #[serde(rename = "x-graphql-nullable")]
    pub nullable: Option<bool>,
    #[serde(rename = "x-graphql-skip")]
    pub skip: Option<bool>,
    
    // Federation
    #[serde(rename = "x-graphql-federation-keys")]
    pub federation_keys: Option<Vec<String>>,
    #[serde(rename = "x-graphql-federation-shareable")]
    pub federation_shareable: Option<bool>,
    #[serde(rename = "x-graphql-federation-requires")]
    pub federation_requires: Option<Vec<String>>,
    #[serde(rename = "x-graphql-federation-provides")]
    pub federation_provides: Option<Vec<String>>,
    #[serde(rename = "x-graphql-federation-external")]
    pub federation_external: Option<bool>,
    
    // Metadata
    #[serde(rename = "x-graphql-description")]
    pub description: Option<String>,
    #[serde(rename = "x-graphql-scalar")]
    pub scalar: Option<String>,
}

impl XGraphQLExtensions {
    /// Extract x-graphql extensions from JSON Schema
    pub fn from_schema(schema: &JsonValue) -> Result<Self, ConversionError> {
        serde_json::from_value(schema.clone())
            .map_err(|e| ConversionError::InvalidExtensions(e.to_string()))
    }
    
    /// Check if field/type should be skipped
    pub fn should_skip(&self) -> bool {
        self.skip.unwrap_or(false)
    }
    
    /// Get effective description (x-graphql-description or description)
    pub fn get_description(&self, fallback: Option<&str>) -> Option<String> {
        self.description.clone().or_else(|| fallback.map(String::from))
    }
    
    /// Apply extensions to GraphQL type definition
    pub fn apply_to_type(&self, type_def: &mut TypeDefinition) {
        if let Some(name) = &self.type_name {
            type_def.name = name.clone();
        }
        if let Some(desc) = &self.description {
            type_def.description = Some(desc.clone());
        }
        // ... apply other extensions
    }
}
```

### 2.3 Feature Parity Matrix

| Feature | Node.js | Rust | Priority | Blocker |
|---------|---------|------|----------|---------|
| Type name mapping | ✅ | ✅ | P0 | No |
| Type kind specification | ✅ | ✅ | P0 | No |
| Field name mapping | ✅ | ✅ | P0 | No |
| Field type override | ✅ | ✅ | P0 | No |
| Non-null fields | ✅ | ✅ | P0 | No |
| Skip field/type | 🔴 | 🔴 | P0 | Yes |
| Nullable override | 🔴 | 🔴 | P0 | Yes |
| GraphQL description | 🔴 | 🔴 | P0 | Yes |
| Interface implementation | ⚠️ | ⚠️ | P1 | No |
| Union types | ⚠️ | ⚠️ | P1 | No |
| Federation requires | ⚠️ | ⚠️ | P1 | No |
| Federation provides | ⚠️ | ⚠️ | P1 | No |
| Field arguments | ⚠️ | ⚠️ | P2 | No |
| Custom directives | ⚠️ | ⚠️ | P2 | No |

**Implementation Priority**:
1. **Phase 2A** (Week 1): P0 missing features (skip, nullable, description)
2. **Phase 2B** (Week 2): P1 partial features (interfaces, unions, federation)
3. **Phase 2C** (Week 3): P2 enhancements (arguments, directives)

---

## Phase 3: Test Coverage Enhancement

**Duration**: 4-6 days  
**Priority**: High  
**Owner**: QA + Core Engineering

### 3.1 Test Schema Creation

**Objective**: Create comprehensive test schemas covering all x-graphql attributes

#### Test Schema Structure

```bash
converters/test-data/x-graphql/
├── 01-basic-types.json                # Basic type and field mapping
├── 02-nullability.json                # Non-null, nullable, list items
├── 03-interfaces.json                 # Interface definition and implementation
├── 04-unions.json                     # Union types
├── 05-enums.json                      # Enum types with value configs
├── 06-directives.json                 # Type and field directives
├── 07-federation.json                 # Federation keys, shareable, etc.
├── 08-advanced-federation.json        # requires, provides, external, override
├── 09-field-arguments.json            # Field arguments and defaults
├── 10-scalars.json                    # Custom scalar types
├── 11-descriptions.json               # x-graphql-description override
├── 12-skip-fields.json                # x-graphql-skip usage
├── 13-complex-nested.json             # Nested types with mixed attributes
├── 14-real-world-api.json             # Complete API example
└── expected/                          # Expected GraphQL SDL outputs
    ├── 01-basic-types.graphql
    ├── 02-nullability.graphql
    └── ...
```

#### Example Test Schema: Basic Types

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Basic Types Test Schema",
  "description": "Tests x-graphql-type-name and x-graphql-field-name",
  "type": "object",
  "definitions": {
    "User": {
      "type": "object",
      "x-graphql-type-name": "User",
      "x-graphql-type-kind": "OBJECT",
      "description": "A user in the system",
      "properties": {
        "user_id": {
          "type": "string",
          "x-graphql-field-name": "id",
          "x-graphql-field-type": "ID",
          "x-graphql-field-non-null": true
        },
        "email_address": {
          "type": "string",
          "format": "email",
          "x-graphql-field-name": "email"
        },
        "created_at": {
          "type": "string",
          "format": "date-time",
          "x-graphql-field-name": "createdAt",
          "x-graphql-field-type": "DateTime"
        }
      },
      "required": ["user_id", "email_address"]
    }
  }
}
```

#### Expected Output: Basic Types

```graphql
"""
A user in the system
"""
type User {
  id: ID!
  email: String!
  createdAt: DateTime
}
```

### 3.2 Test Suite Structure

#### Node.js Tests

```typescript
// converters/node/src/__tests__/x-graphql-extensions.test.ts

describe('x-graphql Extensions', () => {
  describe('Type Mapping', () => {
    it('should use x-graphql-type-name', () => {
      const schema = loadSchema('01-basic-types.json');
      const result = jsonToGraphQL(schema);
      expect(result).toContain('type User');
    });
    
    it('should respect x-graphql-type-kind', () => {
      const schema = loadSchema('03-interfaces.json');
      const result = jsonToGraphQL(schema);
      expect(result).toContain('interface Node');
    });
  });
  
  describe('Field Mapping', () => {
    it('should use x-graphql-field-name', () => {
      const schema = loadSchema('01-basic-types.json');
      const result = jsonToGraphQL(schema);
      expect(result).toContain('id: ID!');
      expect(result).not.toContain('user_id');
    });
    
    it('should respect x-graphql-field-non-null', () => {
      const schema = loadSchema('02-nullability.json');
      const result = jsonToGraphQL(schema);
      expect(result).toContain('requiredField: String!');
    });
    
    it('should respect x-graphql-nullable override', () => {
      const schema = loadSchema('02-nullability.json');
      const result = jsonToGraphQL(schema);
      expect(result).toContain('optionalField: String');
    });
    
    it('should skip fields with x-graphql-skip', () => {
      const schema = loadSchema('12-skip-fields.json');
      const result = jsonToGraphQL(schema);
      expect(result).not.toContain('_internalField');
    });
  });
  
  describe('Interfaces', () => {
    it('should generate interface definitions', () => {
      const schema = loadSchema('03-interfaces.json');
      const result = jsonToGraphQL(schema);
      expect(result).toContain('interface Node');
    });
    
    it('should implement interfaces', () => {
      const schema = loadSchema('03-interfaces.json');
      const result = jsonToGraphQL(schema);
      expect(result).toContain('type User implements Node');
    });
  });
  
  describe('Unions', () => {
    it('should generate union types', () => {
      const schema = loadSchema('04-unions.json');
      const result = jsonToGraphQL(schema);
      expect(result).toContain('union SearchResult = User | Post | Comment');
    });
  });
  
  describe('Federation', () => {
    it('should add @key directive', () => {
      const schema = loadSchema('07-federation.json');
      const result = jsonToGraphQL(schema);
      expect(result).toContain('type User @key(fields: "id")');
    });
    
    it('should mark fields as @shareable', () => {
      const schema = loadSchema('07-federation.json');
      const result = jsonToGraphQL(schema);
      expect(result).toContain('@shareable');
    });
    
    it('should add @requires directive', () => {
      const schema = loadSchema('08-advanced-federation.json');
      const result = jsonToGraphQL(schema);
      expect(result).toContain('@requires(fields: "email")');
    });
  });
  
  describe('Descriptions', () => {
    it('should use x-graphql-description when present', () => {
      const schema = loadSchema('11-descriptions.json');
      const result = jsonToGraphQL(schema);
      expect(result).toContain('GraphQL-specific description');
      expect(result).not.toContain('JSON Schema validation description');
    });
  });
  
  describe('Round-trip Conversion', () => {
    it('should preserve all x-graphql extensions', () => {
      const schema = loadSchema('14-real-world-api.json');
      const sdl = jsonToGraphQL(schema);
      const backToJson = graphQLToJSON(sdl);
      
      expect(backToJson).toEqual(schema);
    });
  });
});
```

#### Rust Tests

```rust
// converters/rust/src/extensions.rs

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    
    #[test]
    fn test_type_name_mapping() {
        let schema = load_test_schema("01-basic-types.json");
        let result = convert(&schema, &ConversionOptions::default()).unwrap();
        assert!(result.contains("type User"));
    }
    
    #[test]
    fn test_field_name_mapping() {
        let schema = load_test_schema("01-basic-types.json");
        let result = convert(&schema, &ConversionOptions::default()).unwrap();
        assert!(result.contains("id: ID!"));
        assert!(!result.contains("user_id"));
    }
    
    #[test]
    fn test_skip_field() {
        let schema = load_test_schema("12-skip-fields.json");
        let result = convert(&schema, &ConversionOptions::default()).unwrap();
        assert!(!result.contains("_internalField"));
    }
    
    #[test]
    fn test_nullable_override() {
        let schema = load_test_schema("02-nullability.json");
        let result = convert(&schema, &ConversionOptions::default()).unwrap();
        assert!(result.contains("optionalField: String"));
    }
    
    #[test]
    fn test_interface_generation() {
        let schema = load_test_schema("03-interfaces.json");
        let result = convert(&schema, &ConversionOptions::default()).unwrap();
        assert!(result.contains("interface Node"));
        assert!(result.contains("type User implements Node"));
    }
    
    #[test]
    fn test_union_generation() {
        let schema = load_test_schema("04-unions.json");
        let result = convert(&schema, &ConversionOptions::default()).unwrap();
        assert!(result.contains("union SearchResult = User | Post | Comment"));
    }
    
    #[test]
    fn test_federation_keys() {
        let schema = load_test_schema("07-federation.json");
        let result = convert(&schema, &ConversionOptions::default()).unwrap();
        assert!(result.contains(r#"@key(fields: "id")"#));
    }
    
    #[test]
    fn test_graphql_description_override() {
        let schema = load_test_schema("11-descriptions.json");
        let result = convert(&schema, &ConversionOptions::default()).unwrap();
        assert!(result.contains("GraphQL-specific description"));
    }
    
    #[test]
    fn test_round_trip_fidelity() {
        let schema = load_test_schema("14-real-world-api.json");
        let sdl = json_to_graphql(&schema).unwrap();
        let back_to_json = graphql_to_json(&sdl).unwrap();
        
        // All x-graphql extensions should be preserved
        assert_json_eq!(schema, back_to_json);
    }
}
```

### 3.3 Coverage Targets

| Component | Current Coverage | Target Coverage | Gap |
|-----------|------------------|-----------------|-----|
| Node.js Type Mapping | 65% | 95% | +30% |
| Node.js Field Mapping | 70% | 95% | +25% |
| Node.js Federation | 40% | 90% | +50% |
| Node.js Round-trip | 50% | 95% | +45% |
| Rust Type Mapping | 60% | 95% | +35% |
| Rust Field Mapping | 65% | 95% | +30% |
| Rust Federation | 35% | 90% | +55% |
| Rust Round-trip | 45% | 95% | +50% |

**Coverage Measurement**:
```bash
# Node.js
cd converters/node
pnpm test --coverage

# Rust
cd converters/rust
cargo tarpaulin --out Html --output-dir coverage
```

---

## Phase 4: Documentation Enhancement

**Duration**: 4-5 days  
**Priority**: Medium  
**Owner**: Documentation Team

### 4.1 Quick Start Guide

**File**: `docs/x-graphql/QUICK_START.md`

**Structure**:
1. **5-Minute Getting Started**
   - Install converters
   - Basic schema with x-graphql attributes
   - Convert to GraphQL SDL
   - View results

2. **Core Concepts** (10 minutes)
   - What are x-graphql extensions?
   - When to use them
   - How they work with JSON Schema

3. **Common Patterns** (15 minutes)
   - Type name mapping
   - Field name mapping
   - Nullability control
   - Basic federation

4. **Next Steps**
   - Links to detailed guides
   - Example projects
   - Community resources

### 4.2 Attribute Reference

**File**: `docs/x-graphql/ATTRIBUTE_REFERENCE.md`

**Structure**:
```markdown
# X-GraphQL Attribute Reference

## Type-Level Attributes

### x-graphql-type-name
- **Type**: String
- **Purpose**: Override GraphQL type name
- **Example**: 
  ```json
  {
    "x-graphql-type-name": "User"
  }
  ```
- **Output**: `type User { ... }`
- **Related**: x-graphql-type-kind
- **Supported**: ✅ Node.js, ✅ Rust

### x-graphql-type-kind
...

## Field-Level Attributes

### x-graphql-field-name
...

## Federation Attributes

### x-graphql-federation-keys
...
```

### 4.3 Common Patterns Guide

**File**: `docs/x-graphql/COMMON_PATTERNS.md`

**Patterns to Cover**:
1. **Basic Type Mapping**
   - Snake_case → camelCase conversion
   - Type name customization
   
2. **Interface Inheritance**
   - Define interfaces
   - Implement interfaces
   - Multiple interface implementation

3. **Union Types**
   - Define union types
   - Use in queries
   
4. **Federation Setup**
   - Entity definition
   - Shareable types
   - Reference resolvers

5. **Custom Scalars**
   - DateTime, UUID, JSON
   - Custom domain scalars

6. **Field Arguments**
   - Pagination arguments
   - Filter arguments
   - Default values

7. **Directives**
   - Auth directives
   - Cache control
   - Custom directives

### 4.4 Advanced Features Guide

**File**: `docs/x-graphql/ADVANCED_FEATURES.md`

**Topics**:
1. **Complex Type Relationships**
   - Recursive types
   - Circular references
   - Self-referential types

2. **Federation Advanced**
   - @requires and @provides
   - @external fields
   - @override directive

3. **Custom Directives**
   - Define custom directives
   - Apply to types and fields
   - Directive composition

4. **Performance Optimization**
   - Query cost analysis
   - Complexity limits
   - Caching strategies

5. **Schema Evolution**
   - Deprecation strategies
   - Breaking vs non-breaking changes
   - Migration paths

### 4.5 Troubleshooting Guide

**File**: `docs/x-graphql/TROUBLESHOOTING.md`

**Common Issues**:
1. **Type name conflicts**
   - Problem: Multiple types with same name
   - Solution: Use x-graphql-type-name

2. **Field not appearing in SDL**
   - Problem: Field missing from output
   - Solution: Check x-graphql-skip, required array

3. **Non-null not working**
   - Problem: Field is nullable when it shouldn't be
   - Solution: Use x-graphql-field-non-null

4. **Interface not recognized**
   - Problem: Type doesn't implement interface
   - Solution: Use x-graphql-implements

5. **Federation composition fails**
   - Problem: Subgraph composition errors
   - Solution: Check federation attributes

### 4.6 Migration Guide

**File**: `docs/x-graphql/MIGRATION_GUIDE.md`

**Sections**:
1. **From TTSE-petrified-forest**
   - Attribute name changes
   - New required attributes
   - Deprecated attributes
   - Migration script

2. **From Other Tools**
   - From code-first GraphQL
   - From other schema converters
   - Manual migration steps

3. **Version Upgrades**
   - Breaking changes by version
   - Migration checklist
   - Backward compatibility

---

## Phase 5: Validation & Tooling

**Duration**: 3-4 days  
**Priority**: Medium  
**Owner**: DevOps + Core Engineering

### 5.1 Validation Schema Enhancement

**Objective**: Enhance meta-schema for complete x-graphql validation

**File**: `schema/x-graphql-extensions.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft/2020-12/schema",
  "$id": "https://json-schema-x-graphql.org/meta/x-graphql-extensions",
  "title": "X-GraphQL Extensions Meta-Schema",
  "description": "JSON Schema meta-schema for x-graphql-* extensions",
  
  "definitions": {
    "typeExtensions": {
      "type": "object",
      "properties": {
        "x-graphql-type-name": {
          "type": "string",
          "pattern": "^[A-Z][a-zA-Z0-9]*$",
          "description": "GraphQL type name in PascalCase"
        },
        "x-graphql-type-kind": {
          "type": "string",
          "enum": ["OBJECT", "INTERFACE", "UNION", "ENUM", "INPUT_OBJECT", "SCALAR"],
          "description": "GraphQL type kind"
        },
        "x-graphql-implements": {
          "type": "array",
          "items": {
            "type": "string",
            "pattern": "^[A-Z][a-zA-Z0-9]*$"
          },
          "description": "List of interfaces this type implements"
        },
        "x-graphql-union-types": {
          "type": "array",
          "items": {
            "type": "string",
            "pattern": "^[A-Z][a-zA-Z0-9]*$"
          },
          "description": "Member types for union",
          "minItems": 2
        },
        "x-graphql-type-directives": {
          "type": "array",
          "items": {
            "type": "string",
            "pattern": "^@[a-z][a-zA-Z0-9]*"
          }
        }
      }
    },
    
    "fieldExtensions": {
      "type": "object",
      "properties": {
        "x-graphql-field-name": {
          "type": "string",
          "pattern": "^[a-z][a-zA-Z0-9]*$",
          "description": "GraphQL field name in camelCase"
        },
        "x-graphql-field-type": {
          "type": "string",
          "description": "GraphQL field type override"
        },
        "x-graphql-field-non-null": {
          "type": "boolean",
          "description": "Field is non-nullable"
        },
        "x-graphql-nullable": {
          "type": "boolean",
          "description": "Field is nullable (overrides required)"
        },
        "x-graphql-skip": {
          "type": "boolean",
          "description": "Skip this field in SDL generation"
        },
        "x-graphql-description": {
          "type": "string",
          "description": "GraphQL-specific description"
        }
      }
    },
    
    "federationExtensions": {
      "type": "object",
      "properties": {
        "x-graphql-federation-keys": {
          "type": "array",
          "items": {"type": "string"},
          "minItems": 1,
          "description": "Federation entity keys"
        },
        "x-graphql-federation-shareable": {
          "type": "boolean",
          "description": "Type/field is shareable"
        },
        "x-graphql-federation-requires": {
          "type": "array",
          "items": {"type": "string"}
        },
        "x-graphql-federation-provides": {
          "type": "array",
          "items": {"type": "string"}
        }
      }
    }
  }
}
```

### 5.2 Validation CLI Tool

**Tool**: `bin/validate-x-graphql`

```typescript
#!/usr/bin/env node
// bin/validate-x-graphql.ts

import Ajv from 'ajv';
import { readFileSync } from 'fs';
import { resolve } from 'path';

interface ValidationOptions {
  schema: string;
  strict?: boolean;
  verbose?: boolean;
}

class XGraphQLValidator {
  private ajv: Ajv;
  private metaSchema: any;
  
  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: true });
    this.metaSchema = JSON.parse(
      readFileSync(resolve(__dirname, '../schema/x-graphql-extensions.schema.json'), 'utf-8')
    );
    this.ajv.addMetaSchema(this.metaSchema);
  }
  
  validate(schemaPath: string, options: ValidationOptions = {}): ValidationResult {
    const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
    const errors: ValidationError[] = [];
    
    // 1. Validate x-graphql structure against meta-schema
    const structureValid = this.validateStructure(schema);
    if (!structureValid) {
      errors.push(...this.ajv.errors.map(e => ({
        path: e.instancePath,
        message: e.message,
        severity: 'error'
      })));
    }
    
    // 2. Validate naming conventions
    const namingErrors = this.validateNaming(schema);
    errors.push(...namingErrors);
    
    // 3. Validate attribute consistency
    const consistencyErrors = this.validateConsistency(schema);
    errors.push(...consistencyErrors);
    
    // 4. Validate federation requirements
    if (this.hasFederationAttributes(schema)) {
      const fedErrors = this.validateFederation(schema);
      errors.push(...fedErrors);
    }
    
    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings: errors.filter(e => e.severity === 'warning')
    };
  }
  
  private validateNaming(schema: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Check for plural attribute names (should be singular)
    const pluralPatterns = [
      'x-graphql-scalars',
      'x-graphql-enums',
      'x-graphql-types',
      'x-graphql-fields'
    ];
    
    this.traverseSchema(schema, (path, obj) => {
      for (const plural of pluralPatterns) {
        if (obj.hasOwnProperty(plural)) {
          errors.push({
            path,
            message: `Use singular form '${plural.slice(0, -1)}' instead of '${plural}'`,
            severity: 'error',
            rule: 'NO_PLURAL_ATTRIBUTES'
          });
        }
      }
    });
    
    return errors;
  }
  
  private validateConsistency(schema: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Check for conflicting attributes
    this.traverseSchema(schema, (path, obj) => {
      // nullable and field-non-null conflict
      if (obj['x-graphql-nullable'] && obj['x-graphql-field-non-null']) {
        errors.push({
          path,
          message: 'Cannot have both nullable:true and field-non-null:true',
          severity: 'error',
          rule: 'NO_CONFLICTING_ATTRIBUTES'
        });
      }
      
      // union-types requires type-kind: UNION
      if (obj['x-graphql-union-types'] && obj['x-graphql-type-kind'] !== 'UNION') {
        errors.push({
          path,
          message: 'union-types requires type-kind: "UNION"',
          severity: 'error',
          rule: 'UNION_TYPES_REQUIRES_UNION_KIND'
        });
      }
    });
    
    return errors;
  }
  
  private validateFederation(schema: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Federation keys must reference actual fields
    this.traverseSchema(schema, (path, obj) => {
      const keys = obj['x-graphql-federation-keys'];
      if (keys && obj.properties) {
        for (const key of keys) {
          if (!obj.properties[key]) {
            errors.push({
              path: `${path}/x-graphql-federation-keys`,
              message: `Key '${key}' not found in properties`,
              severity: 'error',
              rule: 'FEDERATION_KEY_MUST_EXIST'
            });
          }
        }
      }
    });
    
    return errors;
  }
}

// CLI entry point
const validator = new XGraphQLValidator();
const result = validator.validate(process.argv[2]);

if (result.valid) {
  console.log('✅ Schema is valid');
  process.exit(0);
} else {
  console.error('❌ Validation failed:');
  result.errors.forEach(err => {
    console.error(`  ${err.severity.toUpperCase()}: ${err.path} - ${err.message}`);
  });
  process.exit(1);
}
```

### 5.3 Pre-commit Hook

**File**: `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Validate x-graphql attributes in modified schema files
git diff --cached --name-only --diff-filter=ACM | grep '\.schema\.json$' | while read file; do
  echo "Validating x-graphql attributes in $file..."
  node bin/validate-x-graphql "$file"
  
  if [ $? -ne 0 ]; then
    echo "❌ x-graphql validation failed for $file"
    echo "Run 'node bin/validate-x-graphql $file' for details"
    exit 1
  fi
done

echo "✅ All x-graphql attributes validated"
```

### 5.4 VS Code Extension

**File**: `.vscode/extensions/x-graphql-validator/package.json`

```json
{
  "name": "x-graphql-validator",
  "displayName": "X-GraphQL Validator",
  "description": "Validates x-graphql-* attributes in JSON Schema files",
  "version": "1.0.0",
  "engines": {
    "vscode": "^1.75.0"
  },
  "categories": ["Linters"],
  "activationEvents": [
    "onLanguage:json",
    "onLanguage:jsonc"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "configuration": {
      "title": "X-GraphQL Validator",
      "properties": {
        "x-graphql-validator.enable": {
          "type": "boolean",
          "default": true,
          "description": "Enable x-graphql attribute validation"
        },
        "x-graphql-validator.strictMode": {
          "type": "boolean",
          "default": false,
          "description": "Enable strict validation mode"
        }
      }
    }
  }
}
```

---

## Phase 6: Integration & Testing

**Duration**: 3-4 days  
**Priority**: Medium  
**Owner**: Core Engineering + QA

### 6.1 Integration Tests

**Objective**: Test end-to-end workflows with x-graphql attributes

#### Test Scenarios

1. **Schema → SDL → Schema Round-trip**
   ```typescript
   test('preserves all x-graphql attributes in round-trip', () => {
     const originalSchema = loadSchema('complex-api.json');
     const sdl = jsonToGraphQL(originalSchema);
     const reconstructed = graphQLToJSON(sdl);
     
     expect(reconstructed).toEqual(originalSchema);
   });
   ```

2. **Multi-schema Composition**
   ```typescript
   test('composes multiple schemas with federation', () => {
     const userSchema = loadSchema('users.json');
     const orderSchema = loadSchema('orders.json');
     
     const userSDL = jsonToGraphQL(userSchema);
     const orderSDL = jsonToGraphQL(orderSchema);
     
     const composed = composeSubgraphs([userSDL, orderSDL]);
     expect(composed).toBeValid();
   });
   ```

3. **Real-world API Conversion**
   ```typescript
   test('converts real-world API schemas', () => {
     const schemas = [
       'github-api.json',
       'stripe-api.json',
       'shopify-api.json'
     ];
     
     for (const schemaFile of schemas) {
       const schema = loadSchema(schemaFile);
       const sdl = jsonToGraphQL(schema);
       expect(sdl).toBeValidGraphQL();
     }
   });
   ```

### 6.2 Performance Benchmarks

**Objective**: Ensure converters perform well with x-graphql attributes

```typescript
// benchmarks/x-graphql-conversion.bench.ts

import { Suite } from 'benchmark';
import { jsonToGraphQL, graphQLToJSON } from '../converters/node';

const suite = new Suite();

// Benchmark data
const schemas = {
  small: loadSchema('small-api.json'),      // 10 types, 50 fields
  medium: loadSchema('medium-api.json'),    // 100 types, 500 fields
  large: loadSchema('large-api.json'),      // 1000 types, 5000 fields
};

suite
  .add('JSON→GraphQL (small schema)', () => {
    jsonToGraphQL(schemas.small);
  })
  .add('JSON→GraphQL (medium schema)', () => {
    jsonToGraphQL(schemas.medium);
  })
  .add('JSON→GraphQL (large schema)', () => {
    jsonToGraphQL(schemas.large);
  })
  .add('GraphQL→JSON (small schema)', () => {
    const sdl = jsonToGraphQL(schemas.small);
    graphQLToJSON(sdl);
  })
  .add('Round-trip (medium schema)', () => {
    const sdl = jsonToGraphQL(schemas.medium);
    graphQLToJSON(sdl);
  })
  .on('cycle', (event: any) => {
    console.log(String(event.target));
  })
  .run();
```

**Performance Targets**:
- Small schema (<50 fields): <10ms per conversion
- Medium schema (500 fields): <100ms per conversion
- Large schema (5000 fields): <1s per conversion
- Memory usage: <100MB for large schemas

### 6.3 Compatibility Testing

**Objective**: Ensure converters work with various GraphQL tools

```typescript
// tests/integration/compatibility.test.ts

describe('GraphQL Tool Compatibility', () => {
  test('works with Apollo Server', async () => {
    const schema = loadSchema('apollo-example.json');
    const sdl = jsonToGraphQL(schema);
    
    const server = new ApolloServer({ typeDefs: sdl });
    expect(server).toBeDefined();
    
    const { schema: apolloSchema } = server;
    expect(validateSchema(apolloSchema)).toHaveLength(0);
  });
  
  test('works with GraphQL.js', () => {
    const schema = loadSchema('graphql-js-example.json');
    const sdl = jsonToGraphQL(schema);
    
    const graphqlSchema = buildSchema(sdl);
    expect(graphqlSchema).toBeDefined();
    
    const errors = validateSchema(graphqlSchema);
    expect(errors).toHaveLength(0);
  });
  
  test('works with Apollo Federation', () => {
    const userSchema = loadSchema('users-subgraph.json');
    const orderSchema = loadSchema('orders-subgraph.json');
    
    const userSDL = jsonToGraphQL(userSchema);
    const orderSDL = jsonToGraphQL(orderSchema);
    
    const gateway = new ApolloGateway({
      serviceList: [
        { name: 'users', url: 'http://users', typeDefs: userSDL },
        { name: 'orders', url: 'http://orders', typeDefs: orderSDL }
      ]
    });
    
    await gateway.load();
    expect(gateway.schema).toBeDefined();
  });
});
```

---

## Phase 7: Deployment & Documentation

**Duration**: 2-3 days  
**Priority**: Medium  
**Owner**: DevOps + Documentation

### 7.1 Documentation Deployment

**Objective**: Publish documentation to website

```bash
docs/x-graphql/
├── index.html                    # Landing page
├── quick-start/                  # Quick start guide
├── reference/                    # Complete attribute reference
├── patterns/                     # Common patterns
├── advanced/                     # Advanced features
├── troubleshooting/              # Common issues
└── examples/                     # Code examples
```

**Deployment**:
```bash
# Build documentation site
pnpm run docs:build

# Deploy to GitHub Pages
pnpm run docs:deploy
```

### 7.2 Converter Package Updates

**Objective**: Publish updated converters with full x-graphql support

#### Node.js Package

```json
{
  "name": "@json-schema-x-graphql/converter",
  "version": "2.0.0",
  "description": "JSON Schema ↔ GraphQL converter with full x-graphql support",
  "keywords": [
    "json-schema",
    "graphql",
    "converter",
    "x-graphql",
    "federation"
  ],
  "files": [
    "dist/",
    "schema/x-graphql-extensions.schema.json",
    "README.md"
  ]
}
```

#### Rust Crate

```toml
[package]
name = "json-schema-graphql-converter"
version = "2.0.0"
description = "High-performance JSON Schema ↔ GraphQL converter with x-graphql extensions"
keywords = ["json-schema", "graphql", "converter", "wasm"]
categories = ["parsing", "wasm", "web-programming"]

[features]
default = ["full"]
full = ["federation", "directives", "advanced"]
federation = []
directives = []
advanced = []
```

### 7.3 Migration Documentation

**File**: `docs/x-graphql/MIGRATION_FROM_V1.md`

```markdown
# Migration Guide: v1.x → v2.0

## Breaking Changes

### 1. Naming Convention Changes

**Before (v1.x)**:
```json
{
  "x-graphql-scalars": "DateTime"
}
```

**After (v2.0)**:
```json
{
  "x-graphql-scalar": "DateTime"
}
```

### 2. Federation Namespace

**Before (v1.x)**:
```json
{
  "x-graphql-shareable": true,
  "x-graphql-keys": ["id"]
}
```

**After (v2.0)**:
```json
{
  "x-graphql-federation-shareable": true,
  "x-graphql-federation-keys": ["id"]
}
```

### 3. Description Handling

**Before (v1.x)**: Used `description` field for both JSON Schema and GraphQL

**After (v2.0)**: Separate `x-graphql-description` for GraphQL-specific docs

```json
{
  "description": "Validation description for JSON Schema",
  "x-graphql-description": "User-facing API documentation"
}
```

## Migration Script

Run the automated migration script:

```bash
npx @json-schema-x-graphql/migrate-v2 path/to/schemas/
```

## Manual Migration Checklist

- [ ] Update plural attribute names to singular
- [ ] Add federation namespace to all federation attributes
- [ ] Review descriptions (separate x-graphql-description if needed)
- [ ] Test round-trip conversion
- [ ] Update validation rules
- [ ] Run full test suite
```

---

## Phase 8: Monitoring & Metrics

**Duration**: 2-3 days  
**Priority**: Low  
**Owner**: DevOps

### 8.1 Usage Metrics

**Objective**: Track x-graphql attribute usage

```typescript
// metrics/x-graphql-usage.ts

export class XGraphQLMetrics {
  private metrics: Map<string, number> = new Map();
  
  trackAttributeUsage(schema: JSONSchema) {
    this.traverseSchema(schema, (path, obj) => {
      for (const key of Object.keys(obj)) {
        if (key.startsWith('x-graphql-')) {
          this.increment(key);
        }
      }
    });
  }
  
  getTopAttributes(limit: number = 10): Array<[string, number]> {
    return Array.from(this.metrics.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }
  
  generateReport(): UsageReport {
    return {
      totalSchemas: this.schemaCount,
      totalAttributes: this.attributeCount,
      topAttributes: this.getTopAttributes(),
      attributesByCategory: this.groupByCategory(),
      trends: this.calculateTrends()
    };
  }
}
```

### 8.2 Quality Metrics

**Objective**: Monitor conversion quality

```typescript
// metrics/quality.ts

export interface QualityMetrics {
  roundTripFidelity: number;      // % of schemas that round-trip perfectly
  validationErrors: number;        // Count of validation errors
  attributeCoverage: number;       // % of attributes used
  performanceScore: number;        // Conversion performance
}

export function calculateQualityScore(metrics: QualityMetrics): number {
  return (
    metrics.roundTripFidelity * 0.4 +
    (1 - metrics.validationErrors / 100) * 0.3 +
    metrics.attributeCoverage * 0.2 +
    metrics.performanceScore * 0.1
  );
}
```

---

## Success Metrics

### Documentation Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Documentation pages | 5 | 12 | 🔴 |
| Code examples | 8 | 30 | 🟡 |
| Attribute docs | 60% | 100% | 🟡 |
| User feedback score | - | 4.5/5 | - |

### Converter Metrics

| Metric | Node.js | Rust | Target | Status |
|--------|---------|------|--------|--------|
| Attribute support | 65% | 60% | 100% | 🔴 |
| Test coverage | 70% | 65% | 95% | 🟡 |
| Round-trip fidelity | 85% | 80% | 99% | 🟡 |
| Performance (1k types) | 150ms | 50ms | <100ms | 🟢 |

### Quality Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Validation errors | 12 | 0 | 🔴 |
| Breaking changes | - | 0 | - |
| User issues | - | <5/month | - |
| Adoption rate | - | 80% | - |

---

## Timeline Summary

| Phase | Duration | Dependencies | Start | End |
|-------|----------|--------------|-------|-----|
| Phase 1: Documentation Audit | 3-4 days | None | Week 1 | Week 1 |
| Phase 2: Converter Implementation | 3-5 days | Phase 1 | Week 1 | Week 2 |
| Phase 3: Test Coverage | 4-6 days | Phase 2 | Week 2 | Week 3 |
| Phase 4: Documentation Enhancement | 4-5 days | Phase 1 | Week 2 | Week 3 |
| Phase 5: Validation & Tooling | 3-4 days | Phase 2 | Week 3 | Week 4 |
| Phase 6: Integration Testing | 3-4 days | Phase 3 | Week 3 | Week 4 |
| Phase 7: Deployment | 2-3 days | Phase 4,6 | Week 4 | Week 4 |
| Phase 8: Monitoring | 2-3 days | Phase 7 | Week 4 | Week 4 |

**Total Duration**: 4 weeks  
**Total Effort**: ~150-180 hours

---

## Phase 5: Validation Infrastructure

**Duration**: 5-7 days  
**Priority**: High  
**Owner**: QA + Core Engineering  
**Status**: 🔄 In Progress

### 5.1 JSON Schema Validation

**Objective**: Implement comprehensive JSON Schema validation using multiple validators

#### Dual Validator Approach

**Rationale**: Using both `jsonschema` and `boon` crates provides redundant validation to catch edge cases and ensure comprehensive coverage.

**Implementation**:

```rust
// converters/rust/src/test_utils/schema_validation.rs

pub struct ComprehensiveValidator;

impl ComprehensiveValidator {
    /// Validate using both jsonschema and boon
    pub fn validate(schema: &Value, schema_path: &str) -> ValidationReport {
        let jsonschema_errors = JsonSchemaValidator::validate(schema);
        let boon_errors = BoonValidator::validate(schema);
        
        ValidationReport {
            schema_path: schema_path.to_string(),
            jsonschema_valid: jsonschema_errors.is_empty(),
            boon_valid: boon_errors.is_empty(),
            overall_valid: jsonschema_errors.is_empty() && boon_errors.is_empty(),
            // ...
        }
    }
}
```

**Features**:
- ✅ Dual validation (jsonschema + boon)
- ✅ Comprehensive error reporting
- ✅ Batch file validation
- ✅ Directory scanning
- ✅ Validation reports with detailed diagnostics

**Cargo Dependencies**:
```toml
[dev-dependencies]
jsonschema = "0.18"  # Official JSON Schema validator
boon = "0.6"          # Alternative validator for comprehensive coverage
```

#### Validation Coverage

| Schema Draft | jsonschema | boon | Status |
|--------------|------------|------|--------|
| Draft-07 | ✅ | ✅ | Full Support |
| 2019-09 | ✅ | ✅ | Full Support |
| 2020-12 | ✅ | ⚠️ | Partial Support |

**Test Schema Validation**:
- All 7 test schemas in `converters/test-data/x-graphql/`
- Validates schema structure before conversion
- Catches malformed JSON Schema early
- Reports x-graphql extension compatibility

### 5.2 GraphQL SDL Validation

**Objective**: Implement multi-tool GraphQL SDL validation with federation support

#### Apollo Parser Integration

**Purpose**: Parse and validate GraphQL SDL syntax

```rust
pub struct ApolloParserValidator;

impl ApolloParserValidator {
    pub fn validate(sdl: &str) -> ValidationResult<Vec<String>> {
        use apollo_parser::Parser;
        
        let parser = Parser::new(sdl);
        let ast = parser.parse();
        
        let errors: Vec<String> = ast.errors()
            .map(|error| format!("{}", error))
            .collect();
        
        Ok(errors)
    }
}
```

**Features**:
- High-performance GraphQL parsing
- Detailed syntax error reporting
- AST generation for further analysis
- Spec-compliant parsing

**Cargo Dependency**:
```toml
[dev-dependencies]
apollo-parser = "0.8"  # Fast, spec-compliant GraphQL parser
```

#### Apollo Compiler Integration

**Purpose**: Comprehensive GraphQL schema validation and compilation

```rust
pub struct ApolloCompilerValidator;

impl ApolloCompilerValidator {
    pub fn validate_with_federation(sdl: &str) -> ValidationResult<Vec<String>> {
        use apollo_compiler::{ApolloCompiler, InputDatabase};
        
        let mut compiler = ApolloCompiler::new();
        
        // Add federation directives
        let federation_sdl = format!(
            r#"
            {}
            
            directive @key(fields: String!, resolvable: Boolean = true) repeatable on OBJECT | INTERFACE
            directive @requires(fields: String!) on FIELD_DEFINITION
            directive @provides(fields: String!) on FIELD_DEFINITION
            directive @external on FIELD_DEFINITION
            directive @shareable on OBJECT | FIELD_DEFINITION
            // ... other federation directives
            "#,
            sdl
        );
        
        compiler.add_type_system(&federation_sdl, "schema.graphql");
        
        let db = compiler.db.snapshot();
        let diagnostics = db.all_diagnostics();
        
        Ok(diagnostics.iter().map(|d| format!("{}", d)).collect())
    }
}
```

**Features**:
- Complete GraphQL schema validation
- Federation directive support
- Type system validation
- Diagnostic reporting with locations

**Cargo Dependencies**:
```toml
[dev-dependencies]
apollo-encoder = "0.8"   # Encode GraphQL AST back to SDL
apollo-compiler = "1.0"   # Comprehensive validation and compilation
```

#### GraphQL Spec Validation

**Purpose**: Validate against official GraphQL specification (October 2021)

```rust
pub struct SpecValidator;

impl SpecValidator {
    pub fn validate(sdl: &str) -> ValidationResult<Vec<String>> {
        use graphql_schema_validation::validate_schema;
        
        match validate_schema(sdl) {
            Ok(_) => Ok(Vec::new()),
            Err(errors) => Ok(errors.iter().map(|e| format!("{}", e)).collect()),
        }
    }
}
```

**Validation Rules**:
- Type system correctness
- Directive usage validation
- Field and argument validation
- Interface implementation validation
- Union type validation
- Enum value validation

**Cargo Dependency**:
```toml
[dev-dependencies]
graphql-schema-validation = "0.1"  # Official spec validation
```

#### Federation Composition Validation

**Purpose**: Validate federation-specific rules and subgraph composition

```rust
pub struct FederationCompositionValidator;

impl FederationCompositionValidator {
    pub fn validate(subgraphs: Vec<(&str, &str)>) -> ValidationResult<Vec<String>> {
        use graphql_composition::{compose, ComposeOptions};
        
        let schemas: Vec<_> = subgraphs.iter()
            .map(|(name, sdl)| (name.to_string(), sdl.to_string()))
            .collect();
        
        let options = ComposeOptions::default();
        
        match compose(&schemas, options) {
            Ok(_supergraph) => Ok(Vec::new()),
            Err(errors) => Ok(errors.iter().map(|e| format!("{}", e)).collect()),
        }
    }
}
```

**Federation Validations**:
- @key directive validation
- @requires field validation
- @provides field validation
- @external field validation
- Subgraph composition compatibility
- Supergraph generation

**Cargo Dependency**:
```toml
[dev-dependencies]
graphql-composition = "0.1"  # Federation composition and validation
```

#### Comprehensive GraphQL Validation

**Purpose**: Combine all validators for complete coverage

```rust
pub struct ComprehensiveGraphQLValidator;

impl ComprehensiveGraphQLValidator {
    pub fn validate(sdl: &str, sdl_path: &str) -> GraphQLValidationReport {
        // Apollo Parser validation
        let apollo_parser_errors = ApolloParserValidator::validate(sdl)
            .unwrap_or_else(|e| vec![e.to_string()]);
        
        // Apollo Compiler validation (with federation if applicable)
        let apollo_compiler_errors = if has_federation_directives(sdl) {
            ApolloCompilerValidator::validate_with_federation(sdl)
        } else {
            ApolloCompilerValidator::validate(sdl)
        }.unwrap_or_else(|e| vec![e.to_string()]);
        
        // Spec validation
        let spec_errors = SpecValidator::validate(sdl)
            .unwrap_or_else(|e| vec![e.to_string()]);
        
        // Federation validation (if applicable)
        let federation_errors = if has_federation_directives(sdl) {
            FederationCompositionValidator::validate(vec![("subgraph", sdl)])
                .unwrap_or_else(|e| vec![e.to_string()])
        } else {
            Vec::new()
        };
        
        GraphQLValidationReport {
            sdl_path: sdl_path.to_string(),
            apollo_parser_valid: apollo_parser_errors.is_empty(),
            apollo_compiler_valid: apollo_compiler_errors.is_empty(),
            spec_validation_valid: spec_errors.is_empty(),
            federation_valid: Some(federation_errors.is_empty()),
            overall_valid: all_valid,
            // ...
        }
    }
}
```

**Validation Report**:
```rust
pub struct GraphQLValidationReport {
    pub sdl_path: String,
    pub apollo_parser_valid: bool,
    pub apollo_parser_errors: Vec<String>,
    pub apollo_compiler_valid: bool,
    pub apollo_compiler_errors: Vec<String>,
    pub spec_validation_valid: bool,
    pub spec_validation_errors: Vec<String>,
    pub federation_valid: Option<bool>,
    pub federation_errors: Vec<String>,
    pub overall_valid: bool,
}
```

### 5.3 Validation Test Suite

**Objective**: Create comprehensive tests using validation infrastructure

#### Test Organization

```
converters/rust/tests/
├── validation/
│   ├── schema_validation_tests.rs    # JSON Schema validation tests
│   ├── graphql_validation_tests.rs   # GraphQL SDL validation tests
│   ├── federation_validation_tests.rs # Federation-specific tests
│   └── integration_tests.rs          # End-to-end validation
```

#### Test Coverage

**JSON Schema Tests**:
- Valid schemas pass both validators
- Invalid schemas are caught by both validators
- x-graphql extensions are validated
- Draft-07, 2019-09, 2020-12 support
- Edge cases (empty schemas, malformed JSON)

**GraphQL SDL Tests**:
- Valid SDL passes all validators
- Syntax errors are caught
- Type system errors are caught
- Federation directive validation
- Spec compliance validation

**Integration Tests**:
- JSON Schema → GraphQL SDL validation
- Round-trip validation (JSON → SDL → JSON)
- Federation subgraph validation
- Expected output comparison

### 5.4 Validation CLI Tools

**Objective**: Provide command-line tools for validation

#### Rust CLI Tool

```bash
# Validate JSON Schema
cargo run --bin jxql -- validate-schema schema.json

# Validate GraphQL SDL
cargo run --bin jxql -- validate-graphql schema.graphql

# Validate with federation
cargo run --bin jxql -- validate-graphql schema.graphql --federation

# Batch validation
cargo run --bin jxql -- validate-dir ./schemas/
```

#### Node.js CLI Tool

```bash
# Already implemented in Phase 4
npx validate-x-graphql schema.json
npx validate-x-graphql --fail-on-warning schema.json
```

### 5.5 CI/CD Integration

**Objective**: Automate validation in continuous integration

#### GitHub Actions Workflow

```yaml
# .github/workflows/validate-schemas.yml
name: Validate Schemas

on:
  pull_request:
    paths:
      - '**.json'
      - '**.graphql'
  push:
    branches: [main, develop]

jobs:
  validate-json-schemas:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - name: Run JSON Schema validation
        run: cargo test --test schema_validation_tests
      
  validate-graphql-sdl:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - name: Run GraphQL validation
        run: cargo test --test graphql_validation_tests
      
  validate-federation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - name: Run Federation validation
        run: cargo test --test federation_validation_tests
```

#### Pre-commit Hooks

```bash
# .git/hooks/pre-commit (via husky)
#!/bin/sh

# Validate modified JSON schemas
git diff --cached --name-only --diff-filter=ACM | grep '\.json$' | \
  xargs -I {} npx validate-x-graphql {}

# Validate modified GraphQL SDL
git diff --cached --name-only --diff-filter=ACM | grep '\.graphql$' | \
  xargs -I {} cargo run --bin jxql -- validate-graphql {}
```

### 5.6 Deliverables

**Code**:
- ✅ `src/test_utils/schema_validation.rs` (338 lines)
- ✅ `src/test_utils/graphql_validation.rs` (531 lines)
- ✅ `src/test_utils/mod.rs` (57 lines)
- 📋 Validation CLI commands in `jxql` binary
- 📋 Integration test suite
- 📋 CI/CD workflow files

**Documentation**:
- ✅ Inline documentation in validation modules
- 📋 Validation guide (user-facing)
- 📋 CI/CD setup instructions
- 📋 Troubleshooting guide

**Estimated Effort**: 40 hours

---

## Phase 6: Performance Benchmarking

**Duration**: 3-5 days  
**Priority**: Medium  
**Owner**: Performance Engineering  
**Status**: 📋 Planned

### 6.1 Validation Performance Benchmarking

**Objective**: Benchmark and optimize validation performance

#### Benchmark Infrastructure

```rust
pub struct ValidationBenchmarker;

impl ValidationBenchmarker {
    pub fn benchmark(sdl: &str) -> ValidationBenchmark {
        use std::time::Instant;
        
        let total_start = Instant::now();
        
        // Apollo Parser
        let parser_start = Instant::now();
        let _ = ApolloParserValidator::validate(sdl);
        let apollo_parser_duration_us = parser_start.elapsed().as_micros() as u64;
        
        // Apollo Compiler
        let compiler_start = Instant::now();
        let _ = ApolloCompilerValidator::validate(sdl);
        let apollo_compiler_duration_us = compiler_start.elapsed().as_micros() as u64;
        
        // Spec Validation
        let spec_start = Instant::now();
        let _ = SpecValidator::validate(sdl);
        let spec_validation_duration_us = spec_start.elapsed().as_micros() as u64;
        
        // Federation (if applicable)
        let federation_duration_us = if has_federation_directives(sdl) {
            let federation_start = Instant::now();
            let _ = FederationCompositionValidator::validate(vec![("subgraph", sdl)]);
            Some(federation_start.elapsed().as_micros() as u64)
        } else {
            None
        };
        
        let total_duration_us = total_start.elapsed().as_micros() as u64;
        
        ValidationBenchmark {
            apollo_parser_duration_us,
            apollo_compiler_duration_us,
            spec_validation_duration_us,
            federation_duration_us,
            total_duration_us,
        }
    }
}
```

**Benchmark Results Format**:
```
Validation Benchmark Results:
  Apollo Parser:      1,234 μs
  Apollo Compiler:    5,678 μs
  Spec Validation:    2,345 μs
  Federation:         3,456 μs
  Total:             12,713 μs
```

#### Benchmark Test Suite

```rust
// benches/validation_benchmarks.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn benchmark_validation(c: &mut Criterion) {
    let simple_sdl = load_test_sdl("simple.graphql");
    let complex_sdl = load_test_sdl("complex.graphql");
    let federation_sdl = load_test_sdl("federation.graphql");
    
    c.bench_function("validate_simple_sdl", |b| {
        b.iter(|| ComprehensiveGraphQLValidator::validate(black_box(&simple_sdl), "simple"))
    });
    
    c.bench_function("validate_complex_sdl", |b| {
        b.iter(|| ComprehensiveGraphQLValidator::validate(black_box(&complex_sdl), "complex"))
    });
    
    c.bench_function("validate_federation_sdl", |b| {
        b.iter(|| ComprehensiveGraphQLValidator::validate(black_box(&federation_sdl), "federation"))
    });
}

criterion_group!(benches, benchmark_validation);
criterion_main!(benches);
```

**Benchmark Categories**:
- Simple schemas (< 10 types)
- Complex schemas (50+ types)
- Federation schemas (multiple subgraphs)
- Large schemas (500+ types)

### 6.2 Conversion Performance Benchmarking

**Objective**: Benchmark JSON Schema ↔ GraphQL conversion performance

#### Benchmark Scenarios

**JSON Schema → GraphQL SDL**:
- Small schema (1-5 types)
- Medium schema (10-50 types)
- Large schema (100+ types)
- Federation schema with directives
- Deeply nested schemas (10+ levels)

**GraphQL SDL → JSON Schema**:
- Small SDL (1-5 types)
- Medium SDL (10-50 types)
- Large SDL (100+ types)
- Federation SDL with directives
- Complex type relationships

**Round-Trip Conversion**:
- JSON → SDL → JSON fidelity
- SDL → JSON → SDL fidelity
- Performance degradation analysis

#### Performance Targets

| Schema Size | Conversion Time (JSON→SDL) | Conversion Time (SDL→JSON) |
|-------------|---------------------------|----------------------------|
| Small (< 5 types) | < 1ms | < 1ms |
| Medium (10-50 types) | < 10ms | < 10ms |
| Large (100+ types) | < 100ms | < 100ms |
| XLarge (500+ types) | < 500ms | < 500ms |

### 6.3 Memory Profiling

**Objective**: Profile memory usage and identify optimization opportunities

**Tools**:
- `cargo-flamegraph` - CPU flamegraphs
- `valgrind` / `heaptrack` - Memory profiling
- `perf` - Linux performance analysis

**Profiling Scenarios**:
- Peak memory usage during validation
- Memory allocation patterns
- Memory leaks detection
- Cache efficiency analysis

### 6.4 Optimization Opportunities

**Identified Optimizations**:
1. **Validation Caching**: Cache validation results for unchanged schemas
2. **Parallel Validation**: Run multiple validators concurrently
3. **Lazy Loading**: Load meta-schemas on demand
4. **AST Reuse**: Reuse parsed AST across multiple validations
5. **String Interning**: Reduce string allocation overhead

**Implementation Priority**:
- P0: Validation caching (biggest impact)
- P1: Parallel validation
- P2: AST reuse
- P3: String interning

### 6.5 Benchmark CI Integration

**Objective**: Track performance over time

```yaml
# .github/workflows/benchmark.yml
name: Performance Benchmarks

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - name: Run benchmarks
        run: cargo bench
      - name: Store benchmark results
        uses: benchmark-action/github-action-benchmark@v1
        with:
          tool: 'cargo'
          output-file-path: target/criterion/output.json
```

**Benchmark Dashboard**:
- Historical performance trends
- Regression detection
- Comparison across commits
- Performance leaderboard

### 6.6 Deliverables

**Code**:
- 📋 Validation benchmark suite
- 📋 Conversion benchmark suite
- 📋 Memory profiling scripts
- 📋 Performance optimization implementations

**Documentation**:
- 📋 Benchmark results documentation
- 📋 Performance optimization guide
- 📋 Profiling guide for contributors

**Reports**:
- 📋 Baseline performance report
- 📋 Optimization impact analysis
- 📋 Performance comparison (Node.js vs Rust)

**Estimated Effort**: 30 hours

---

## Implementation Timeline

### Updated Timeline

| Phase | Duration | Status | Completion |
|-------|----------|--------|------------|
| Phase 1: Documentation Audit | 3-4 days | ✅ Complete | 100% |
| Phase 2: Converter Implementation | 3-5 days | ✅ Complete (Node.js) | 70% |
| Phase 3: Test Coverage | 4-6 days | ✅ Complete (Node.js) | 80% |
| Phase 4: Validation & Tooling | 3-4 days | ✅ Complete (Node.js) | 90% |
| **Phase 5: Validation Infrastructure** | 5-7 days | 🔄 In Progress | 40% |
| **Phase 6: Performance Benchmarking** | 3-5 days | 📋 Planned | 0% |

**Total Estimated Duration**: 21-31 days (4-6 weeks)

**Current Progress**: ~60% complete (Phases 1-4 done, Phase 5 in progress)

### Week-by-Week Breakdown

**Weeks 1-2**: ✅ Phases 1-4 Complete
- Documentation consolidated
- Node.js P0 features implemented
- Test data created
- Validation CLI built

**Week 3**: 🔄 Phase 5 In Progress
- Rust validation utilities (40% complete)
- JSON Schema dual validation implemented
- GraphQL SDL validation implemented
- Federation validation implemented
- Integration tests in progress

**Week 4**: 📋 Phase 5 Completion + Phase 6 Start
- Complete Rust validation test suite
- CI/CD integration
- Begin performance benchmarking
- Baseline measurements

**Week 5-6**: 📋 Phase 6 + Final Polish
- Optimization implementations
- Rust converter parity
- Documentation completion
- Release preparation

---

## Dependencies and Prerequisites

### Build Dependencies (Updated)

**Rust**:
```toml
[dev-dependencies]
# JSON Schema Validation
jsonschema = "0.18"
boon = "0.6"

# GraphQL SDL and Federation Validation
apollo-parser = "0.8"
apollo-encoder = "0.8"
apollo-compiler = "1.0"
graphql-composition = "0.1"
graphql-schema-validation = "0.1"

# Testing and Benchmarking
pretty_assertions = "1.4"
criterion = "0.5"
```

**Node.js**:
```json
{
  "devDependencies": {
    "@graphql-tools/schema": "^10.0.0",
    "graphql": "^16.8.0",
    "jest": "^29.7.0",
    "typescript": "^5.3.0"
  }
}
```

### Tooling Requirements

- Rust 1.70+ (for latest apollo-compiler features)
- Node.js 18+ (for latest TypeScript features)
- Git 2.30+ (for pre-commit hooks)
- GitHub Actions (for CI/CD)
- Criterion.rs (for benchmarking)

---

## Success Metrics (Updated)

### Phase 5 Metrics

- ✅ JSON Schema dual validation (jsonschema + boon)
- ✅ GraphQL SDL multi-tool validation (apollo + spec + federation)
- 🔄 Validation test suite (80% complete)
- 📋 CI/CD integration (0% complete)
- 📋 Pre-commit hooks (0% complete)

**Validation Coverage**:
- JSON Schema: 100% of test schemas validated
- GraphQL SDL: 100% of generated SDL validated
- Federation: 100% of federation directives validated

### Phase 6 Metrics

- 📋 Benchmark suite coverage (0%)
- 📋 Performance baseline established (0%)
- 📋 Optimization targets identified (0%)
- 📋 Performance regression detection (0%)

**Performance Targets**:
- Validation: < 10ms for medium schemas
- Conversion: < 100ms for large schemas
- Memory: < 50MB peak usage for typical workloads

---


## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking changes in converters | Medium | High | Comprehensive testing, migration guide |
| Documentation incomplete | Low | Medium | Prioritize P0/P1 docs first |
| Performance regression | Low | Medium | Benchmark tests, performance budgets |
| Federation compatibility issues | Medium | High | Test with Apollo Federation |
| Attribute name conflicts | Low | Low | Validation tooling, strict naming |
| User adoption resistance | Medium | Medium