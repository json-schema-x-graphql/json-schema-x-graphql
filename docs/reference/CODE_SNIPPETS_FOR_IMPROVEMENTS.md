# Code Snippets for Converter Improvements

**Purpose:** Ready-to-use code snippets for implementing best practices from production scripts.
**Date:** 2024

---

## Table of Contents

1. [Rust Improvements](#rust-improvements)
2. [Node.js Improvements](#nodejs-improvements)
3. [Shared Test Cases](#shared-test-cases)
4. [Configuration Examples](#configuration-examples)

---

## Rust Improvements

### 1. Case Conversion Utilities

**File:** `converters/rust/src/case_conversion.rs` (NEW)

```rust
//! Case conversion utilities for flexible field name handling

use regex::Regex;

/// Convert camelCase or PascalCase to snake_case
pub fn camel_to_snake(s: &str) -> String {
    let re1 = Regex::new(r"([a-z0-9])([A-Z])").unwrap();
    let re2 = Regex::new(r"([A-Z])([A-Z][a-z])").unwrap();

    let temp = re1.replace_all(s, "${1}_${2}");
    let result = re2.replace_all(&temp, "${1}_${2}");

    result.to_lowercase()
}

/// Convert snake_case to camelCase
pub fn snake_to_camel(s: &str) -> String {
    let re = Regex::new(r"_([a-zA-Z0-9])").unwrap();

    re.replace_all(s, |caps: &regex::Captures| {
        caps[1].to_uppercase()
    }).to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_camel_to_snake() {
        assert_eq!(camel_to_snake("camelCase"), "camel_case");
        assert_eq!(camel_to_snake("PascalCase"), "pascal_case");
        assert_eq!(camel_to_snake("HTTPResponse"), "http_response");
        assert_eq!(camel_to_snake("http2Protocol"), "http2_protocol");
    }

    #[test]
    fn test_snake_to_camel() {
        assert_eq!(snake_to_camel("snake_case"), "snakeCase");
        assert_eq!(snake_to_camel("http_response"), "httpResponse");
    }
}
```

**Add to Cargo.toml:**

```toml
[dependencies]
regex = "1.10"
```

---

### 2. Enhanced $ref Resolution with Recursion

**File:** `converters/rust/src/json_to_graphql.rs`

**Replace the existing `resolve_ref` method:**

```rust
use crate::case_conversion::{camel_to_snake, snake_to_camel};
use std::collections::HashSet;

impl<'a> ConversionContext<'a> {
    /// Resolve a $ref reference with recursive following and case conversion fallbacks
    fn resolve_ref(&self, ref_path: &str, visited: &mut HashSet<String>) -> Result<Option<&JsonValue>> {
        if !ref_path.starts_with('#') {
            // External references not supported yet
            return Ok(None);
        }

        // Check for circular $ref
        if visited.contains(ref_path) {
            return Err(ConversionError::CircularReference(
                format!("Circular $ref detected: {}", ref_path)
            ));
        }
        visited.insert(ref_path.to_string());

        let root = match self.root_schema {
            Some(r) => r,
            None => return Ok(None),
        };

        // Parse the JSON pointer path (e.g., "#/$defs/system_metadata")
        let path = ref_path.trim_start_matches('#').trim_start_matches('/');
        if path.is_empty() {
            return Ok(Some(root));
        }

        let parts: Vec<&str> = path.split('/').collect();
        let mut current = root;

        for part in parts {
            if part.is_empty() {
                continue;
            }

            // If current node has a $ref, resolve it first (recursive)
            if let Some(nested_ref) = current.get("$ref").and_then(|v| v.as_str()) {
                if let Some(resolved) = self.resolve_ref(nested_ref, visited)? {
                    current = resolved;
                }
            }

            // Try to get the part with multiple strategies
            current = self.try_get_property(current, part)?;
        }

        Ok(Some(current))
    }

    /// Try to get a property with case conversion fallbacks
    fn try_get_property(&self, node: &JsonValue, key: &str) -> Result<&JsonValue> {
        // Direct match
        if let Some(val) = node.get(key) {
            return Ok(val);
        }

        // Try snake_case conversion
        let snake = camel_to_snake(key);
        if let Some(val) = node.get(&snake) {
            return Ok(val);
        }

        // Try camelCase conversion
        let camel = snake_to_camel(key);
        if let Some(val) = node.get(&camel) {
            return Ok(val);
        }

        Err(ConversionError::InvalidReference(
            format!("Property '{}' not found (tried: {}, {}, {})", key, key, snake, camel)
        ))
    }
}

/// Helper method for external callers
impl<'a> ConversionContext<'a> {
    pub fn resolve_ref_public(&self, ref_path: &str) -> Result<Option<&JsonValue>> {
        let mut visited = HashSet::new();
        self.resolve_ref(ref_path, &mut visited)
    }
}
```

---

### 3. Circular Reference Protection

**File:** `converters/rust/src/json_to_graphql.rs`

**Update ConversionContext:**

```rust
struct ConversionContext<'a> {
    options: &'a ConversionOptions,
    type_names: HashMap<String, usize>,
    root_schema: Option<&'a JsonValue>,
    building: HashSet<String>,  // ← Add this
}

impl<'a> ConversionContext<'a> {
    fn with_root(options: &'a ConversionOptions, root_schema: &'a JsonValue) -> Self {
        Self {
            options,
            type_names: HashMap::new(),
            root_schema: Some(root_schema),
            building: HashSet::new(),  // ← Initialize
        }
    }
}
```

**Update convert_type_definition:**

```rust
fn convert_type_definition(
    schema: &JsonValue,
    type_name: &str,
    context: &mut ConversionContext,
) -> Result<String> {
    // Check for circular reference
    if context.building.contains(type_name) {
        return Err(ConversionError::CircularReference(
            format!("Circular reference detected while building type: {}", type_name)
        ));
    }

    context.building.insert(type_name.to_string());

    // Perform conversion (wrap existing logic)
    let result = (|| {
        let obj = schema.as_object().ok_or_else(|| {
            ConversionError::InvalidJsonSchema("schema must be an object".to_string())
        })?;

        // ... existing conversion logic ...

        Ok(output)
    })();

    // Always remove from building set, even on error
    context.building.remove(type_name);

    result
}
```

---

### 4. Type Filtering

**File:** `converters/rust/src/types.rs`

**Add to ConversionOptions:**

```rust
#[derive(Debug, Clone)]
pub struct ConversionOptions {
    pub validate: bool,
    pub include_descriptions: bool,
    pub pretty_print: bool,
    pub exclude_types: Option<Vec<String>>,        // ← Add
    pub exclude_type_suffixes: Option<Vec<String>>, // ← Add
    pub include_operational_types: bool,            // ← Add
}

impl Default for ConversionOptions {
    fn default() -> Self {
        Self {
            validate: false,
            include_descriptions: true,
            pretty_print: true,
            exclude_types: Some(vec![
                "Query".to_string(),
                "Mutation".to_string(),
                "Subscription".to_string(),
                "PageInfo".to_string(),
            ]),
            exclude_type_suffixes: Some(vec![
                "Filter".to_string(),
                "Sort".to_string(),
                "SortInput".to_string(),
                "FilterInput".to_string(),
                "Connection".to_string(),
                "Edge".to_string(),
                "Payload".to_string(),
                "Args".to_string(),
            ]),
            include_operational_types: false,
        }
    }
}
```

**File:** `converters/rust/src/json_to_graphql.rs`

**Add filtering function:**

```rust
fn should_include_type(type_name: &str, options: &ConversionOptions) -> bool {
    // Always exclude introspection types
    if type_name.starts_with("__") {
        return false;
    }

    // Check operational types
    if !options.include_operational_types {
        if let Some(ref excluded) = options.exclude_types {
            if excluded.contains(&type_name.to_string()) {
                return false;
            }
        }
    }

    // Check suffixes
    if let Some(ref suffixes) = options.exclude_type_suffixes {
        for suffix in suffixes {
            if type_name.ends_with(suffix) {
                return false;
            }
        }
    }

    true
}
```

**Use in conversion:**

```rust
// In convert() function, before processing $defs:
for (def_name, def_schema) in defs_obj {
    if let Some(type_name) = def_schema
        .get("x-graphql-type-name")
        .and_then(|v| v.as_str())
    {
        if !should_include_type(type_name, context.options) {
            continue;  // Skip filtered types
        }

        let type_def = convert_type_definition(def_schema, type_name, &mut context)?;
        output.push_str(&type_def);
    }
}
```

---

## Node.js Improvements

### 1. Case Conversion Utilities

**File:** `converters/node/src/case-conversion.ts` (NEW)

```typescript
/**
 * Case conversion utilities for flexible field name handling
 */

/**
 * Convert camelCase or PascalCase to snake_case
 */
export function camelToSnake(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

/**
 * Convert snake_case to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-zA-Z0-9])/g, (_, c) => c.toUpperCase());
}

/**
 * Recursively convert object keys using a converter function
 */
export function convertObjectKeys(
  obj: any,
  converter: (key: string) => string,
): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => convertObjectKeys(item, converter));
  } else if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        converter(key),
        convertObjectKeys(value, converter),
      ]),
    );
  }
  return obj;
}

/**
 * Convert GraphQL field names in SDL string using a converter
 */
export function convertGraphQLFields(
  sdl: string,
  converter: (field: string) => string,
): string {
  return sdl.replace(
    /(\s*)([a-zA-Z][a-zA-Z0-9_]*)\s*:/g,
    (match, ws, field) => `${ws}${converter(field)}:`,
  );
}
```

---

### 2. $ref Resolution with Recursion

**File:** `converters/node/src/json-to-graphql.ts`

**Add to imports:**

```typescript
import { camelToSnake, snakeToCamel } from "./case-conversion.js";
```

**Update JsonSchemaToGraphQL class:**

```typescript
export class JsonSchemaToGraphQL {
  private options: Required<ConversionOptions>;

  constructor(options: Required<ConversionOptions>) {
    this.options = options;
  }

  /**
   * Resolve a $ref with recursive following and case conversion fallbacks
   */
  private resolveRef(
    schema: JsonSchema,
    refPath: string,
    visited: Set<string> = new Set(),
  ): JsonSchema | null {
    if (!refPath.startsWith("#")) {
      // External references not supported yet
      return null;
    }

    // Check for circular $ref
    if (visited.has(refPath)) {
      throw new ConversionError(
        `Circular $ref detected: ${refPath}`,
        undefined,
        "CIRCULAR_REF",
      );
    }
    visited.add(refPath);

    const path = refPath.replace(/^#\//, "");
    if (!path) {
      return schema; // Reference to root
    }

    const parts = path.split("/");
    let current: any = schema;

    for (const part of parts) {
      if (!part) continue;

      // If current node has $ref, resolve it first (recursive)
      if (current.$ref && typeof current.$ref === "string") {
        const resolved = this.resolveRef(schema, current.$ref, visited);
        if (resolved) {
          current = resolved;
        }
      }

      // Try to get property with fallbacks
      current = this.tryGetProperty(current, part);
      if (!current) {
        throw new ConversionError(
          `Failed to resolve $ref: ${refPath} (missing part: ${part})`,
          undefined,
          "INVALID_REF",
        );
      }
    }

    return current;
  }

  /**
   * Try to get a property with case conversion fallbacks
   */
  private tryGetProperty(obj: any, key: string): any {
    if (!obj || typeof obj !== "object") {
      return null;
    }

    // Direct match
    if (obj[key] !== undefined) {
      return obj[key];
    }

    // Try snake_case
    const snake = camelToSnake(key);
    if (obj[snake] !== undefined) {
      return obj[snake];
    }

    // Try camelCase
    const camel = snakeToCamel(key);
    if (obj[camel] !== undefined) {
      return obj[camel];
    }

    return null;
  }
}
```

---

### 3. Extract Types from $defs

**File:** `converters/node/src/json-to-graphql.ts`

**Update convert method:**

```typescript
public convert(schema: JsonSchema): string {
  const context: ConversionContext = {
    schema,
    processedTypes: new Set(),
    building: new Set(),
  };

  let output = '';

  // Process $defs or definitions first
  const defs = schema.$defs || schema.definitions;
  if (defs && typeof defs === 'object') {
    for (const [defName, defSchema] of Object.entries(defs)) {
      const typeName = this.getTypeName(defSchema as JsonSchema);

      if (typeName && !this.shouldExcludeType(typeName)) {
        const typeDef = this.convertTypeDefinition(
          defSchema as JsonSchema,
          typeName,
          context
        );
        output += typeDef + '\n';
      }
    }
  }

  // Process root type if it has a name
  const rootTypeName = this.getTypeName(schema);
  if (rootTypeName && !this.shouldExcludeType(rootTypeName)) {
    const rootTypeDef = this.convertTypeDefinition(schema, rootTypeName, context);
    output += rootTypeDef;
  } else if (!defs && schema.properties) {
    // Anonymous root object without $defs needs a type name
    throw new ConversionError(
      'Root object requires x-graphql-type-name extension',
      undefined,
      'MISSING_TYPE_NAME'
    );
  }

  if (!output.trim()) {
    throw new ConversionError(
      'No GraphQL types found in schema',
      undefined,
      'NO_TYPES_FOUND'
    );
  }

  return output.trim();
}

/**
 * Get type name from schema
 */
private getTypeName(schema: JsonSchema): string | null {
  return schema['x-graphql-type-name'] || null;
}
```

---

### 4. Circular Reference Protection

**File:** `converters/node/src/json-to-graphql.ts`

**Update ConversionContext interface:**

```typescript
interface ConversionContext {
  schema: JsonSchema;
  processedTypes: Set<string>;
  building: Set<string>; // ← Add this
}
```

**Update convertTypeDefinition:**

```typescript
private convertTypeDefinition(
  schema: JsonSchema,
  typeName: string,
  context: ConversionContext
): string {
  // Check for circular reference
  if (context.building.has(typeName)) {
    throw new ConversionError(
      `Circular reference detected while building type: ${typeName}`,
      undefined,
      'CIRCULAR_REF'
    );
  }

  // Mark as building
  context.building.add(typeName);

  try {
    // Existing conversion logic...
    let output = '';

    // Add description
    if (this.options.includeDescriptions && schema.description) {
      output += this.formatDescription(schema.description);
    }

    // Determine type kind
    const typeKind = this.getTypeKind(schema);
    const sdlKeyword = this.mapTypeKindToSDL(typeKind);

    // ... rest of conversion logic ...

    return output;
  } finally {
    // Always remove from building set
    context.building.delete(typeName);
  }
}
```

---

### 5. Type Filtering

**File:** `converters/node/src/types.ts`

**Update ConversionOptions:**

```typescript
export interface ConversionOptions {
  validate?: boolean;
  includeDescriptions?: boolean;
  prettyPrint?: boolean;
  excludeTypes?: string[]; // ← Add
  excludeTypeSuffixes?: string[]; // ← Add
  includeOperationalTypes?: boolean; // ← Add
}

export const DEFAULT_OPTIONS: Required<ConversionOptions> = {
  validate: false,
  includeDescriptions: true,
  prettyPrint: true,
  excludeTypes: ["Query", "Mutation", "Subscription", "PageInfo"],
  excludeTypeSuffixes: [
    "Filter",
    "Sort",
    "SortInput",
    "FilterInput",
    "Connection",
    "Edge",
    "Payload",
    "Args",
  ],
  includeOperationalTypes: false,
};
```

**File:** `converters/node/src/json-to-graphql.ts`

**Add filtering method:**

```typescript
private shouldExcludeType(typeName: string): boolean {
  // Always exclude introspection types
  if (typeName.startsWith('__')) {
    return true;
  }

  // Check operational types
  if (!this.options.includeOperationalTypes) {
    if (this.options.excludeTypes?.includes(typeName)) {
      return true;
    }
  }

  // Check suffixes
  if (this.options.excludeTypeSuffixes) {
    for (const suffix of this.options.excludeTypeSuffixes) {
      if (typeName.endsWith(suffix)) {
        return true;
      }
    }
  }

  return false;
}
```

---

## Shared Test Cases

### Test File Structure

**Rust:** `converters/rust/tests/improvements.rs`
**Node:** `converters/node/tests/improvements.test.ts`

### 1. $ref Resolution Tests

```typescript
describe("$ref Resolution", () => {
  it("should resolve simple internal $ref", () => {
    const schema = {
      type: "object",
      "x-graphql-type-name": "User",
      properties: {
        address: { $ref: "#/$defs/Address" },
      },
      $defs: {
        Address: {
          type: "object",
          "x-graphql-type-name": "Address",
          properties: {
            street: { type: "string" },
          },
        },
      },
    };

    const result = jsonSchemaToGraphQL(JSON.stringify(schema));
    expect(result).toContain("type User");
    expect(result).toContain("type Address");
    expect(result).toContain("address: Address");
  });

  it("should resolve nested $refs", () => {
    const schema = {
      $defs: {
        A: { $ref: "#/$defs/B" },
        B: { $ref: "#/$defs/C" },
        C: {
          type: "object",
          "x-graphql-type-name": "C",
          properties: { value: { type: "string" } },
        },
      },
    };

    // Should follow A → B → C
    const result = jsonSchemaToGraphQL(JSON.stringify(schema));
    expect(result).toContain("type C");
  });

  it("should handle $ref with case mismatch", () => {
    const schema = {
      type: "object",
      "x-graphql-type-name": "User",
      properties: {
        // Ref uses snake_case
        user_info: { $ref: "#/$defs/UserInfo" },
      },
      $defs: {
        // Def is camelCase
        userInfo: {
          type: "object",
          "x-graphql-type-name": "UserInfo",
          properties: { name: { type: "string" } },
        },
      },
    };

    const result = jsonSchemaToGraphQL(JSON.stringify(schema));
    expect(result).toContain("userInfo: UserInfo");
  });

  it("should error on circular $ref", () => {
    const schema = {
      $defs: {
        A: { $ref: "#/$defs/B" },
        B: { $ref: "#/$defs/A" },
      },
    };

    expect(() => jsonSchemaToGraphQL(JSON.stringify(schema))).toThrow(
      /Circular.*ref/i,
    );
  });
});
```

### 2. Circular Reference Tests

```typescript
describe("Circular Reference Protection", () => {
  it("should detect self-referencing type", () => {
    const schema = {
      type: "object",
      "x-graphql-type-name": "Node",
      properties: {
        next: { $ref: "#" },
      },
    };

    expect(() => jsonSchemaToGraphQL(JSON.stringify(schema))).toThrow(
      /Circular reference/i,
    );
  });

  it("should detect mutual references", () => {
    const schema = {
      $defs: {
        A: {
          type: "object",
          "x-graphql-type-name": "A",
          properties: {
            b: { $ref: "#/$defs/B" },
          },
        },
        B: {
          type: "object",
          "x-graphql-type-name": "B",
          properties: {
            a: { $ref: "#/$defs/A" },
          },
        },
      },
    };

    // This is actually valid - types can reference each other
    // Only the building process itself should not be circular
    const result = jsonSchemaToGraphQL(JSON.stringify(schema));
    expect(result).toContain("type A");
    expect(result).toContain("type B");
  });
});
```

### 3. Type Filtering Tests

```typescript
describe("Type Filtering", () => {
  it("should exclude Query/Mutation by default", () => {
    const schema = {
      $defs: {
        Query: {
          type: "object",
          "x-graphql-type-name": "Query",
          properties: { hello: { type: "string" } },
        },
        User: {
          type: "object",
          "x-graphql-type-name": "User",
          properties: { id: { type: "string" } },
        },
      },
    };

    const result = jsonSchemaToGraphQL(JSON.stringify(schema));
    expect(result).not.toContain("type Query");
    expect(result).toContain("type User");
  });

  it("should exclude types with Connection suffix", () => {
    const schema = {
      $defs: {
        UserConnection: {
          type: "object",
          "x-graphql-type-name": "UserConnection",
        },
        User: {
          type: "object",
          "x-graphql-type-name": "User",
        },
      },
    };

    const result = jsonSchemaToGraphQL(JSON.stringify(schema));
    expect(result).not.toContain("UserConnection");
    expect(result).toContain("type User");
  });

  it("should include operational types when configured", () => {
    const schema = {
      $defs: {
        Query: {
          type: "object",
          "x-graphql-type-name": "Query",
        },
      },
    };

    const result = jsonSchemaToGraphQL(JSON.stringify(schema), {
      includeOperationalTypes: true,
    });

    expect(result).toContain("type Query");
  });
});
```

### 4. $defs Extraction Tests

```typescript
describe("$defs Extraction", () => {
  it("should extract all types from $defs", () => {
    const schema = {
      $defs: {
        User: {
          type: "object",
          "x-graphql-type-name": "User",
          properties: { id: { type: "string" } },
        },
        Post: {
          type: "object",
          "x-graphql-type-name": "Post",
          properties: { title: { type: "string" } },
        },
        Comment: {
          type: "object",
          "x-graphql-type-name": "Comment",
          properties: { text: { type: "string" } },
        },
      },
    };

    const result = jsonSchemaToGraphQL(JSON.stringify(schema));
    expect(result).toContain("type User");
    expect(result).toContain("type Post");
    expect(result).toContain("type Comment");
  });

  it("should support both $defs and definitions", () => {
    const schema = {
      definitions: {
        // Old JSON Schema draft
        User: {
          type: "object",
          "x-graphql-type-name": "User",
          properties: { id: { type: "string" } },
        },
      },
    };

    const result = jsonSchemaToGraphQL(JSON.stringify(schema));
    expect(result).toContain("type User");
  });
});
```

---

## Configuration Examples

### 1. Converter Config File

**File:** `converter.config.js`

```javascript
module.exports = {
  // Conversion options
  validate: true,
  includeDescriptions: true,
  prettyPrint: true,

  // Type filtering
  excludeTypes: ["Query", "Mutation", "Subscription", "PageInfo"],

  excludeTypeSuffixes: [
    "Filter",
    "Sort",
    "Connection",
    "Edge",
    "Input",
    "Args",
    "Payload",
  ],

  includeOperationalTypes: false,

  // Custom scalars
  customScalars: [
    { name: "Date", jsonSchemaType: "string", jsonSchemaFormat: "date" },
    {
      name: "DateTime",
      jsonSchemaType: "string",
      jsonSchemaFormat: "date-time",
    },
    { name: "Decimal", jsonSchemaType: "number" },
    { name: "JSON", jsonSchemaType: "object" },
  ],

  // Advanced: Pointer-based field mappings (optional)
  typeConfigs: [
    {
      name: "Contract",
      pointer: "/",
      fields: [
        {
          name: "id",
          pointer: "/systemMetadata/globalRecordId",
          graphqlType: "ID!",
        },
        {
          name: "lastModified",
          pointer: "/systemMetadata/lastModified",
          graphqlType: "DateTime",
        },
      ],
    },
  ],
};
```

### 2. CLI Usage Examples

**Rust:**

```bash
# Basic conversion
cargo run --example json_to_sdl -- schema.json > output.graphql

# With options
cargo run --example json_to_sdl -- \
  --schema schema.json \
  --output output.graphql \
  --config converter.config.toml \
  --include-operational-types

# Validate only
cargo run --example json_to_sdl -- schema.json --validate-only
```

**Node:**

```bash
# Basic conversion
npx json-schema-to-graphql schema.json > output.graphql

# With options
npx json-schema-to-graphql \
  --schema schema.json \
  --output output.graphql \
  --config converter.config.js \
  --include-operational-types

# Validate only
npx json-schema-to-graphql schema.json --validate-only
```

---

## Testing Commands

**Run all improvements tests:**

```bash
# Rust
cargo test improvements

# Node
npm test -- improvements.test.ts
```

**Run specific test suites:**

```bash
# Rust
cargo test ref_resolution
cargo test circular_refs
cargo test type_filtering

# Node
npm test -- --grep "$ref Resolution"
npm test -- --grep "Circular Reference"
npm test -- --grep "Type Filtering"
```

---

## Implementation Order

1. ✅ **Case Conversion** (2-3 hours each)
   - Copy case-conversion module
   - Add tests
   - Export from index

2. ✅ **Circular Reference Protection** (3-4 hours Node, 2 hours Rust)
   - Add `building` set to context
   - Update type conversion method
   - Add tests

3. ✅ **Enhanced $ref Resolution** (1-2 days each)
   - Add recursive following
   - Add case conversion fallbacks
   - Add tests
   - Update error messages

4. ✅ **$defs Extraction** (4-6 hours Node only)
   - Process $defs/definitions
   - Extract all types
   - Add tests

5. ✅ **Type Filtering** (3-4 hours each)
   - Add config options
   - Implement filtering
   - Add tests

---

## Verification Checklist

After implementing each improvement:

- [ ] Code compiles without errors
- [ ] All existing tests still pass
- [ ] New tests are added and passing
- [ ] Documentation is updated
- [ ] Examples are updated
- [ ] Changelog is updated
- [ ] Performance is acceptable

---

**Status:** Ready to implement
**Priority:** Start with Circular Reference Protection (quick win)
**Next:** Enhanced $ref Resolution (biggest impact)
