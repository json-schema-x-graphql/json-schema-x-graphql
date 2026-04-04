# Converter Improvements - Quick Reference Guide

This guide provides quick examples and usage patterns for the newly improved converter features.

## Table of Contents

1. [Case-Insensitive $ref Resolution](#case-insensitive-ref-resolution)
2. [Circular Reference Support](#circular-reference-support)
3. [Type Filtering](#type-filtering)
4. [Case Conversion Utilities](#case-conversion-utilities)
5. [Configuration Examples](#configuration-examples)

---

## Case-Insensitive $ref Resolution

The converter now automatically resolves `$ref` paths even when the casing doesn't match the definition key.

### Example

```json
{
  "$defs": {
    "userInfo": {
      "type": "object",
      "x-graphql-type-name": "UserInfo",
      "properties": {
        "name": { "type": "string" }
      }
    }
  },
  "properties": {
    "user": {
      "$ref": "#/$defs/UserInfo"
    }
  }
}
```

**Works with:**

- `#/$defs/userInfo` (exact match)
- `#/$defs/UserInfo` (PascalCase)
- `#/$defs/user_info` (snake_case)

The converter tries:

1. Direct match (exact case)
2. snake_case conversion
3. camelCase conversion

---

## Circular Reference Support

Self-referencing and mutually referencing types are now fully supported.

### Self-Referencing Type

```json
{
  "$defs": {
    "Node": {
      "type": "object",
      "x-graphql-type-name": "Node",
      "properties": {
        "value": { "type": "string" },
        "next": { "$ref": "#/$defs/Node" }
      }
    }
  }
}
```

**Output:**

```graphql
type Node {
  value: String
  next: Node
}
```

### Mutual References

```json
{
  "$defs": {
    "Person": {
      "type": "object",
      "x-graphql-type-name": "Person",
      "properties": {
        "name": { "type": "string" },
        "company": { "$ref": "#/$defs/Company" }
      }
    },
    "Company": {
      "type": "object",
      "x-graphql-type-name": "Company",
      "properties": {
        "name": { "type": "string" },
        "employees": {
          "type": "array",
          "items": { "$ref": "#/$defs/Person" }
        }
      }
    }
  }
}
```

**Output:**

```graphql
type Person {
  name: String
  company: Company
}

type Company {
  name: String
  employees: [Person]
}
```

### Recursive Tree Structure

```json
{
  "$defs": {
    "Tree": {
      "type": "object",
      "x-graphql-type-name": "Tree",
      "properties": {
        "value": { "type": "string" },
        "children": {
          "type": "array",
          "items": { "$ref": "#/$defs/Tree" }
        }
      }
    }
  }
}
```

**Output:**

```graphql
type Tree {
  value: String
  children: [Tree]
}
```

---

## Type Filtering

Control which types appear in the output with powerful filtering options.

### Default Behavior

By default, these types are **excluded**:

- `Query`, `Mutation`, `Subscription` (operational types)
- `PageInfo` (standard pagination type)
- Types ending with: `Filter`, `Sort`, `SortInput`, `FilterInput`, `Connection`, `Edge`, `Payload`, `Args`

### Basic Filtering

```typescript
// Node.js
import { jsonSchemaToGraphQL } from "./converter";

const result = jsonSchemaToGraphQL(schema, {
  // Include operational types
  includeOperationalTypes: true,

  // Custom exclude list
  excludeTypes: ["InternalType", "DebugInfo"],

  // Custom suffix exclusions
  excludeTypeSuffixes: ["Filter", "Input"],

  // Regex patterns for exclusion
  excludePatterns: ["^Internal.*", ".*Debug$"],
});
```

```rust
// Rust
use converter::ConversionOptions;

let mut options = ConversionOptions::default();
options.include_operational_types = true;
options.exclude_types = vec!["InternalType".to_string(), "DebugInfo".to_string()];
options.exclude_type_suffixes = vec!["Filter".to_string(), "Input".to_string()];
```

### Example: Include Only Domain Types

```typescript
const result = jsonSchemaToGraphQL(schema, {
  includeOperationalTypes: false, // Exclude Query/Mutation/Subscription
  excludeTypeSuffixes: [
    "Filter",
    "Sort",
    "Connection",
    "Edge",
    "Payload",
    "Args",
    "Input",
  ],
});
```

### Example: Include Everything

```typescript
const result = jsonSchemaToGraphQL(schema, {
  includeOperationalTypes: true,
  excludeTypes: [],
  excludeTypeSuffixes: [],
  excludePatterns: [],
});
```

---

## Case Conversion Utilities

Utility functions for working with different naming conventions.

### Node.js

```typescript
import {
  camelToSnake,
  snakeToCamel,
  convertObjectKeys,
} from "./case-conversion";

// Convert strings
camelToSnake("camelCase"); // → 'camel_case'
camelToSnake("HTTPResponse"); // → 'http_response'
snakeToCamel("snake_case"); // → 'snakeCase'
snakeToCamel("user_profile"); // → 'userProfile'

// Convert object keys
const input = {
  user_name: "John",
  user_profile: {
    avatar_url: "http://example.com",
  },
};

const camelCased = convertObjectKeys(input, snakeToCamel);
// {
//   userName: 'John',
//   userProfile: {
//     avatarUrl: 'http://example.com'
//   }
// }
```

### Rust

```rust
use converter::case_conversion::{camel_to_snake, snake_to_camel};

let snake = camel_to_snake("camelCase");    // "camel_case"
let camel = snake_to_camel("snake_case");   // "snakeCase"
```

---

## Configuration Examples

### Minimal Configuration (Use Defaults)

```typescript
// Node.js
const result = jsonSchemaToGraphQL(schema);
```

```rust
// Rust
let options = ConversionOptions::default();
let result = convert(&schema, &options)?;
```

### Standard API Schema

```typescript
const result = jsonSchemaToGraphQL(schema, {
  includeDescriptions: true,
  includeOperationalTypes: false, // Exclude Query/Mutation
  excludeTypeSuffixes: ["Filter", "Sort", "Connection", "Edge", "Payload"],
});
```

### Internal Tool (Include Everything)

```typescript
const result = jsonSchemaToGraphQL(schema, {
  includeDescriptions: true,
  includeOperationalTypes: true,
  excludeTypes: [],
  excludeTypeSuffixes: [],
});
```

### Complex Filtering

```typescript
const result = jsonSchemaToGraphQL(schema, {
  // Include operational types
  includeOperationalTypes: true,

  // But exclude specific ones
  excludeTypes: ["InternalQuery", "DebugMutation"],

  // Exclude relay/pagination types
  excludeTypeSuffixes: ["Connection", "Edge", "Payload"],

  // Exclude test/internal types by pattern
  excludePatterns: ["^Test.*", ".*Debug$", "^Internal.*"],

  // Other options
  includeDescriptions: true,
  preserveFieldOrder: true,
  namingConvention: "GRAPHQL_IDIOMATIC",
});
```

---

## Error Handling

### Circular $ref Detection

If a schema has circular `$ref` chains (not circular types), you'll get a clear error:

```
ConversionError: Circular $ref detected: #/$defs/A
```

**Example of circular $ref chain (invalid):**

```json
{
  "$defs": {
    "A": { "$ref": "#/$defs/B" },
    "B": { "$ref": "#/$defs/A" }
  }
}
```

### Invalid Reference

```
ConversionError: Property 'unknown' not found (tried: unknown, unknown_property, unknownProperty)
```

### Circular Type Resolution

```
ConversionError: Circular type resolution detected for TypeName
```

This indicates a bug in the converter logic, not the schema itself.

---

## Testing Your Schema

### Node.js Test

```typescript
import { jsonSchemaToGraphQL } from "./converter";
import * as fs from "fs";

const schema = JSON.parse(fs.readFileSync("schema.json", "utf-8"));

try {
  const result = jsonSchemaToGraphQL(schema, {
    includeDescriptions: true,
    includeOperationalTypes: false,
  });

  console.log(result);
} catch (error) {
  console.error("Conversion failed:", error.message);
}
```

### Quick CLI Test

```bash
# Node.js converter
cd converters/node
npm run cli -- path/to/schema.json --output output.graphql

# With options
npm run cli -- schema.json \
  --include-operational-types \
  --exclude-types "InternalType,DebugInfo" \
  --output output.graphql
```

---

## Best Practices

### 1. Use Explicit Type Names

Always provide `x-graphql-type-name` for predictable output:

```json
{
  "type": "object",
  "x-graphql-type-name": "User",
  "properties": { ... }
}
```

### 2. Organize Large Schemas

Use `$defs` to organize complex schemas:

```json
{
  "$defs": {
    "User": { ... },
    "Post": { ... },
    "Comment": { ... }
  }
}
```

### 3. Test Case Variations

The converter handles case variations, but consistency is clearer:

```json
// ✅ Good - consistent casing
"$ref": "#/$defs/userInfo"

// ✅ Also works - but less clear
"$ref": "#/$defs/UserInfo"
```

### 4. Use Filtering Strategically

- Development: Include everything
- Production: Exclude internal/test types
- Public API: Exclude operational types if using operations elsewhere

### 5. Document Circular References

Add descriptions to circular types for clarity:

```json
{
  "type": "object",
  "x-graphql-type-name": "Node",
  "description": "A node in a linked list. Self-referencing via 'next' field.",
  "properties": {
    "next": { "$ref": "#/$defs/Node" }
  }
}
```

---

## Troubleshooting

### Type Not Appearing in Output

**Check if it's filtered:**

```typescript
const result = jsonSchemaToGraphQL(schema, {
  includeOperationalTypes: true,
  excludeTypes: [],
  excludeTypeSuffixes: [],
});
```

### Case Mismatch Errors

The converter auto-resolves case differences, but ensure:

1. Definition exists in `$defs`
2. Reference path is correct (check `/` separators)
3. Definition has valid structure

### Circular Reference Errors

- **Circular `$ref`**: Invalid schema - fix the `$ref` chain
- **Circular type**: Valid - should work automatically

---

## Performance Tips

1. **Large Schemas**: Enable `preserveFieldOrder: false` for faster processing
2. **Many Exclusions**: Use `excludeTypeSuffixes` over individual `excludeTypes`
3. **Caching**: If converting the same schema repeatedly, cache the result

---

## Migration from Previous Versions

If upgrading from an earlier version:

1. **Default Exclusions**: Query/Mutation are now excluded by default
   - **Fix**: Set `includeOperationalTypes: true` to restore old behavior

2. **Type Filtering**: More types excluded by default (Connection, Edge, etc.)
   - **Fix**: Override `excludeTypeSuffixes: []` to disable

3. **Case Sensitivity**: `$ref` resolution is now case-insensitive
   - **Impact**: Schemas with case mismatches now work (no breaking change)

---

## Additional Resources

- Full implementation details: `IMPROVEMENTS_IMPLEMENTATION_SUMMARY.md`
- Original plan: `IMPROVEMENT_PLAN.md`
- Code snippets: `docs/CODE_SNIPPETS_FOR_IMPROVEMENTS.md`
- Test schemas: `converters/test-data/`
  - `circular-refs.schema.json`
  - `case-mismatch.schema.json`
  - `filtering.schema.json`

---

## Support

For issues or questions:

1. Check test files for examples
2. Review error messages carefully
3. Enable verbose logging if available
4. Open an issue with minimal reproduction schema
