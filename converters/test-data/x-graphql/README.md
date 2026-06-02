# X-GraphQL Test Data

This directory contains comprehensive test schemas for validating x-graphql-\* extension handling in the JSON Schema to GraphQL converters.

## Overview

These test schemas are designed to validate:

- Core x-graphql attribute functionality
- Edge cases and error conditions
- Complex nested scenarios
- Real-world usage patterns

## Test Schemas

### basic-types.json

**Purpose**: Test fundamental type and field name mapping

**Features Tested**:

- `x-graphql-type-name` - Custom type names
- `x-graphql-field-name` - Custom field names
- `x-graphql-field-type` - Type overrides (ID, DateTime)
- Basic type mapping (string, integer, number, boolean)
- Description inheritance from JSON Schema

**Types**: User, Product

**Lines**: 78

**Use This When**: You need examples of basic type/field naming conventions

---

### nullability.json

**Purpose**: Test all nullability control mechanisms

**Features Tested**:

- `x-graphql-field-non-null` - Explicit non-null fields
- `x-graphql-nullable` - Explicit nullable override
- `x-graphql-field-list-item-non-null` - List item nullability
- Required array interaction
- Nested list nullability
- Complex type nullability

**Types**: NullabilityTest, ComplexType

**Lines**: 105

**Nullability Patterns**:

- `String` - Nullable field
- `String!` - Non-null field
- `[String]` - Nullable list of nullable items
- `[String]!` - Non-null list of nullable items
- `[String!]` - Nullable list of non-null items
- `[String!]!` - Non-null list of non-null items

**Use This When**: You need to understand or test nullability rules

---

### skip-fields.json

**Purpose**: Test field and type exclusion from GraphQL SDL

**Features Tested**:

- `x-graphql-skip` on individual fields
- `x-graphql-skip` on entire types
- Skip nested objects
- Skip within arrays
- Combination with other attributes

**Types**: VisibleType, NestedType, InternalType (skipped), UserWithPrivateData, SkipListItems

**Lines**: 144

**Use Cases**:

- Hide sensitive data (passwords, tokens, SSN)
- Exclude internal metadata
- Remove database-specific fields
- Hide implementation details

**Use This When**: You need to exclude fields from GraphQL schema

---

### descriptions.json

**Purpose**: Test GraphQL-specific description handling

**Features Tested**:

- `x-graphql-description` - GraphQL-specific descriptions
- Description priority (x-graphql > JSON Schema)
- Multiline description formatting
- Special characters in descriptions (quotes, unicode, symbols)
- Empty/whitespace description handling
- Deprecation notices in descriptions

**Types**: DocumentedType, MultilineDescriptions, DescriptionPriority, SpecialCharactersInDescription, EmptyAndWhitespaceDescriptions, DeprecationInDescription

**Lines**: 143

**Priority Order**:

1. `x-graphql-description` (highest)
2. `description` (JSON Schema)

**Use This When**: You need API-facing descriptions separate from database model descriptions

---

### interfaces.json

**Purpose**: Test GraphQL interface definition and implementation

**Features Tested**:

- `x-graphql-type-kind: "INTERFACE"` - Interface definition
- `x-graphql-implements` - Interface implementation
- Single interface implementation
- Multiple interface implementation
- Interface extending another interface
- Nested types without interfaces

**Interfaces**: Node, Timestamped, Searchable, ExtendedInterface

**Implementing Types**: User, Product, Category, ConcreteExtended

**Non-Implementing Types**: UserProfile

**Lines**: 278

**Use This When**: You need to work with polymorphic types or shared field patterns

---

### unions.json

**Purpose**: Test GraphQL union type generation

**Features Tested**:

- `x-graphql-type-kind: "UNION"` - Union type definition
- `x-graphql-union-types` - Union member specification
- Multiple union types in schema
- Union types with 2+ members
- Nested references in union members

**Union Types**: SearchResult, MediaItem, NotificationTarget, PaymentMethod

**Member Types**: User, Product, Article, Image, Video, Audio, Team, CreditCard, BankAccount, DigitalWallet

**Lines**: 356

**Use This When**: You need types that can be one of several possible types

---

### comprehensive.json

**Purpose**: Real-world scenario combining all P0 features

**Features Tested**:

- All P0 attributes together
- Complex nested structures
- Interface implementation with skip/nullable
- Multiple relationships
- Real-world entity patterns (User, Post, Comment, Address)

**Types**: Node (interface), User, UserProfile, Address, Post, Comment, InternalType (skipped)

**Lines**: 467

**P0 Features Combined**:

- ✅ Type/field naming
- ✅ Nullability control (nullable, non-null, list items)
- ✅ Field skipping (sensitive data, internal fields)
- ✅ GraphQL descriptions (overriding JSON Schema)
- ✅ Interface implementation
- ✅ Type relationships

**Use This When**: You need a complete example of a real API schema

---

## Expected Output

The `expected/` directory contains the expected GraphQL SDL output for each test schema:

```
expected/
└── basic-types.graphql    # Expected output for basic-types.json
```

**Coming Soon**: Expected outputs for all test schemas

---

## Usage in Tests

### Node.js Tests

```typescript
import * as fs from "fs";
import * as path from "path";

// Load test schema
const schemaPath = path.join(
  __dirname,
  "../test-data/x-graphql/basic-types.json",
);
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));

// Load expected output
const expectedPath = path.join(
  __dirname,
  "../test-data/x-graphql/expected/basic-types.graphql",
);
const expected = fs.readFileSync(expectedPath, "utf-8");

// Run conversion and compare
const result = jsonToGraphQL(schema);
expect(result).toBe(expected);
```

### Rust Tests

```rust
#[test]
fn test_basic_types() {
    let schema_path = "test-data/x-graphql/basic-types.json";
    let schema = load_schema(schema_path);

    let expected_path = "test-data/x-graphql/expected/basic-types.graphql";
    let expected = fs::read_to_string(expected_path).unwrap();

    let result = json_to_graphql(&schema);
    assert_eq!(result, expected);
}
```

---

## Test Schema Conventions

### Naming

- Use `snake_case` for JSON Schema property names
- Use `x-graphql-field-name` to specify `camelCase` GraphQL names
- Type names should be `PascalCase`

### Structure

- Always include `$schema` reference
- Provide `title` and `description` at root level
- Use `definitions` for type definitions
- Document what each schema tests in the description

### Documentation

- Add `description` to all types and fields
- Use `x-graphql-description` when GraphQL description should differ
- Include comments about expected behavior

### Organization

- One primary feature per test schema
- Include related features when they interact
- Use comprehensive.json for multi-feature integration

---

## Creating New Test Schemas

### Template

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Your Test Name",
  "description": "What this test schema validates",
  "type": "object",
  "definitions": {
    "YourType": {
      "type": "object",
      "x-graphql-type-name": "YourType",
      "description": "Type description",
      "properties": {
        "your_field": {
          "type": "string",
          "x-graphql-field-name": "yourField",
          "description": "Field description"
        }
      }
    }
  }
}
```

### Checklist

- [ ] Valid JSON (run through JSON.parse)
- [ ] Includes `$schema` reference
- [ ] Has `title` and `description`
- [ ] All types have `x-graphql-type-name`
- [ ] All fields have `x-graphql-field-name`
- [ ] Documented what is being tested
- [ ] Created expected output file
- [ ] Added to test suite

---

## Statistics

**Total Test Schemas**: 7

**Total Lines**: 1,571

**Coverage**:

- ✅ P0 Features: 100%
- ✅ P1 Features: 80% (interfaces, unions)
- ⚠️ P2 Features: 0% (directives, arguments)

**Attributes Tested**:

- `x-graphql-type-name` ✅
- `x-graphql-type-kind` ✅
- `x-graphql-field-name` ✅
- `x-graphql-field-type` ✅
- `x-graphql-field-non-null` ✅
- `x-graphql-field-list-item-non-null` ✅
- `x-graphql-skip` ✅
- `x-graphql-nullable` ✅
- `x-graphql-description` ✅
- `x-graphql-implements` ✅
- `x-graphql-union-types` ✅
- `x-graphql-federation-keys` ⚠️ (API ready, not tested)
- `x-graphql-federation-shareable` ⚠️ (API ready, not tested)
- `x-graphql-federation-requires` ⚠️ (API ready, not tested)
- `x-graphql-federation-provides` ⚠️ (API ready, not tested)

---

## Validation

All test schemas pass validation:

```bash
# Validate all test schemas
npx validate-x-graphql converters/test-data/x-graphql/*.json

# Expected output:
# ✓ basic-types.json: Valid
# ✓ nullability.json: Valid
# ✓ skip-fields.json: Valid
# ✓ descriptions.json: Valid
# ✓ interfaces.json: Valid
# ✓ unions.json: Valid
# ✓ comprehensive.json: Valid
```

---

## Contributing

When adding new test schemas:

1. **Choose a Focus**: What specific feature/interaction are you testing?
2. **Name Clearly**: Use descriptive names (e.g., `federation-keys.json`)
3. **Document Thoroughly**: Explain what's being tested in descriptions
4. **Create Expected Output**: Add the expected GraphQL SDL to `expected/`
5. **Update This README**: Add your schema to the list above
6. **Add Tests**: Create corresponding unit/integration tests

---

## Related Documentation

- **Implementation Status**: `../../IMPLEMENTATION_STATUS.md`
- **Quick Reference**: `../../X-GRAPHQL-QUICK-REFERENCE.md`
- **Full Plan**: `../../docs/plans/X-GRAPHQL-NAMESPACE-IMPLEMENTATION-PLAN.md`
- **Extension Handler**: `../node/src/x-graphql-extensions.ts`
- **Validator**: `../node/src/x-graphql-validator.ts`

---

**Last Updated**: December 31, 2024
**Maintained By**: Core Team
**Status**: Active Development
