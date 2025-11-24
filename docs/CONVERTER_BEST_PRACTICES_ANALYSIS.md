# JSON Schema x GraphQL Converter Best Practices Analysis

**Date:** 2024
**Purpose:** Compare the production scripts in `scripts/tmp/scripts` with the Node.js and Rust converters to identify and cherry-pick best practices for improvement.

---

## Executive Summary

The production scripts in `scripts/tmp/scripts` contain mature, battle-tested patterns that should be incorporated into both converters. Key areas for improvement include:

1. **$ref Resolution** - Sophisticated pointer resolution with fallbacks
2. **Case Conversion** - Flexible camelCase/snake_case handling
3. **Type Filtering** - Smart exclusion of non-business types
4. **Circular Reference Protection** - Proper tracking of types being built
5. **Validation & Canonicalization** - SDL validation and formatting
6. **Configuration-Driven Conversion** - Flexible mapping configurations
7. **Error Handling** - Comprehensive error context
8. **CLI Flexibility** - Multi-schema support via CLI args

---

## Part 1: Best Practices from Production Scripts

### 1.1 Advanced $ref Resolution

**Location:** `scripts/tmp/scripts/generate-graphql-from-json-schema.mjs` (lines 102-334)

**What it does:**
- Resolves JSON pointer references recursively
- Handles nested $ref chains (follows $refs within resolved nodes)
- Supports both `$defs` and `definitions` conventions
- Provides fallback search strategies (case conversion, alternate paths)
- Integrates with field mapping for complex schemas
- Handles special cases like `items` arrays with $refs

**Key implementation details:**
```javascript
function resolvePointer(schema, pointer) {
  // 1. Handle root references
  if (!pointer || pointer === "/") {
    return { node: schema, parent: null, key: null, required: false };
  }

  // 2. Walk the pointer path
  const parts = pointer.split("/").filter(Boolean);
  let node = schema;
  let parent = null;
  let key = null;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    parent = node;
    key = part;

    // 3. If current node has a $ref, dereference it first
    if (node && typeof node === "object" && node.$ref) {
      try {
        const ref = String(node.$ref);
        const refPointer = ref.replace(/^#/, "");
        const refResult = resolvePointer(schema, refPointer);
        if (refResult && refResult.node) {
          node = refResult.node;
        }
      } catch (err) {
        // Continue with current node if resolution fails
      }
    }

    // 4. Navigate to next part
    if (node[part]) {
      node = node[part];
    } else {
      // Try alternate case conventions
      const altCase = camelToSnake(part);
      if (node[altCase]) {
        node = node[altCase];
      } else {
        const alt2 = snakeToCamel(part);
        if (node[alt2]) {
          node = node[alt2];
        } else {
          return null;
        }
      }
    }
  }

  return { node, parent, key, required: false };
}
```

**Current state in converters:**

- **Rust:** ✅ Basic $ref resolution implemented (lines 81-107 in json_to_graphql.rs)
  - Handles internal references
  - Does NOT follow $refs recursively
  - Does NOT support case conversion fallbacks
  
- **Node:** ❌ No $ref resolution
  - Fields with $refs output as `String`
  - Does not extract types from $defs

**Recommendation:** 
- **Priority: HIGH** for both converters
- Add recursive $ref following
- Add case conversion fallbacks
- Add better error messages when refs fail to resolve

---

### 1.2 Case Conversion Utilities

**Location:** `scripts/tmp/scripts/helpers/case-conversion.mjs`

**What it does:**
- Converts between camelCase and snake_case bidirectionally
- Handles edge cases (consecutive capitals, numbers)
- Recursively converts object keys
- Can convert field names in SDL strings

**Implementation:**
```javascript
export function camelToSnake(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

export function snakeToCamel(str) {
  return str.replace(/_([a-zA-Z0-9])/g, (_, c) => c.toUpperCase());
}

export function convertObjectKeys(obj, converter) {
  if (Array.isArray(obj)) {
    return obj.map((item) => convertObjectKeys(item, converter));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => 
        [converter(key), convertObjectKeys(value, converter)]
      )
    );
  }
  return obj;
}
```

**Current state in converters:**

- **Rust:** ❌ No case conversion utilities
- **Node:** ❌ No case conversion utilities

**Recommendation:**
- **Priority: MEDIUM**
- Add case conversion module to both converters
- Use during $ref resolution fallback
- Make field naming convention configurable
- Support both conventions in the same schema

---

### 1.3 Type Filtering & Exclusions

**Location:** `scripts/tmp/scripts/generate-graphql-json-schema-helpers.mjs` (lines 43-64)

**What it does:**
- Filters out non-business types from conversion
- Excludes operational types (Query, Mutation, Subscription)
- Excludes infrastructure types (PageInfo, Connection, Edge)
- Excludes input/filter/sort types by suffix pattern
- Excludes introspection types (starting with `__`)

**Implementation:**
```javascript
const EXCLUDED_TYPE_NAMES = new Set([
  "Query", 
  "Mutation", 
  "Subscription", 
  "PageInfo"
]);

const EXCLUDED_TYPE_SUFFIXES = [
  "Filter",
  "Sort",
  "SortInput",
  "FilterInput",
  "Args",
  "Connection",
  "Edge",
  "Payload",
  "Result",
  "Response",
  "PaginationInput",
];

export const shouldIncludeType = type => {
  if (!type) return false;
  const name = type.name ?? "";
  if (!name) return false;
  if (name.startsWith("__")) return false;
  if (EXCLUDED_TYPE_NAMES.has(name)) return false;
  if (EXCLUDED_TYPE_SUFFIXES.some(suffix => name.endsWith(suffix))) return false;
  if (isInputObjectType(type)) return false;
  return true;
};
```

**Current state in converters:**

- **Rust:** ❌ No type filtering
- **Node:** ❌ No type filtering

**Recommendation:**
- **Priority: MEDIUM**
- Add configurable type exclusion lists
- Default to excluding operational types
- Allow override via options for full schema conversion
- Consider separate mode for "business types only"

---

### 1.4 Circular Reference Protection

**Location:** `scripts/tmp/scripts/generate-graphql-json-schema-helpers.mjs` (lines 99-125)

**What it does:**
- Tracks types currently being built using a Set
- Prevents infinite recursion in circular type graphs
- Properly adds/removes types from the building set

**Implementation:**
```javascript
export function createContext(schema) {
  return {
    schema,
    definitions: new Map(),
    building: new Set(),  // ← Tracks in-progress types
  };
}

export function ensureDefinition(namedType, ctx) {
  const name = namedType.name;
  if (!name || name.startsWith("__")) return;
  if (!shouldIncludeType(namedType)) return;
  
  // Check if already processed or currently building
  if (ctx.definitions.has(name) || ctx.building.has(name)) return;
  
  if (isScalarType(namedType)) {
    return;
  }
  
  ctx.building.add(name);  // ← Mark as in-progress
  let definition;
  
  if (isObjectType(namedType) || isInterfaceType(namedType)) {
    definition = buildObjectDefinition(namedType, ctx);
  } else if (isEnumType(namedType)) {
    definition = buildEnumDefinition(namedType);
  } else if (isUnionType(namedType)) {
    definition = buildUnionDefinition(namedType, ctx);
  }
  
  if (definition) {
    ctx.definitions.set(name, definition);
  }
  
  ctx.building.delete(name);  // ← Remove from in-progress
}
```

**Current state in converters:**

- **Rust:** ⚠️ Partial - has root_schema context but no circular tracking
- **Node:** ❌ No circular reference protection

**Recommendation:**
- **Priority: HIGH** for Node, **MEDIUM** for Rust
- Add `building` set to context structures
- Check before processing each type
- Add detection for infinite $ref loops
- Provide helpful error message when circular references detected

---

### 1.5 Scalar Type Factory Pattern

**Location:** `scripts/tmp/scripts/generate-graphql-json-schema-helpers.mjs` (lines 14-39)

**What it does:**
- Uses Map with factory functions for scalar mappings
- Each factory returns appropriate JSON Schema structure
- Handles special types (Date, DateTime, JSON)
- Provides fallback for unknown scalars

**Implementation:**
```javascript
const scalarFactories = new Map([
  ["String", () => ({ type: "string" })],
  ["ID", () => ({ type: "string" })],
  ["Boolean", () => ({ type: "boolean" })],
  ["Int", () => ({ type: "integer" })],
  ["Float", () => ({ type: "number" })],
  ["Decimal", () => ({ type: "number" })],
  ["Date", () => ({ type: "string", format: "date" })],
  ["DateTime", () => ({ type: "string", format: "date-time" })],
  ["JSON", () => ({
    description: "Arbitrary JSON value",
    anyOf: [
      { type: "object", additionalProperties: true },
      { type: "array", items: {} },
      { type: "string" },
      { type: "number" },
      { type: "boolean" },
      { type: "null" },
    ],
  })],
]);

const scalarFallbackFactory = () => ({ type: "string" });

const convertScalar = name => {
  const factory = scalarFactories.get(name) ?? scalarFallbackFactory;
  return factory();
};
```

**Current state in converters:**

- **Rust:** ⚠️ Partial - has basic scalar mapping but not factory pattern
- **Node:** ⚠️ Partial - has scalar mapping but not extensible

**Recommendation:**
- **Priority: LOW**
- Refactor to factory pattern for extensibility
- Allow custom scalar registration via options
- Document custom scalar requirements

---

### 1.6 Nullable Type Handling

**Location:** `scripts/tmp/scripts/generate-graphql-json-schema-helpers.mjs` (lines 66-96)

**What it does:**
- Sophisticated handling of nullable types
- Respects existing `anyOf`/`oneOf`/`allOf` structures
- Handles array types properly
- Avoids duplicate null types

**Implementation:**
```javascript
const makeNullable = schema => {
  if (!schema) return schema;
  
  // Already has composition keywords - wrap entire schema
  if (schema.anyOf || schema.oneOf || schema.allOf || schema.$ref) {
    return {
      anyOf: [schema, { type: "null" }],
    };
  }
  
  // No type specified - wrap
  if (schema.type === undefined) {
    return {
      anyOf: [schema, { type: "null" }],
    };
  }
  
  // Array of types
  if (Array.isArray(schema.type)) {
    if (schema.type.includes("null")) {
      return schema;  // Already nullable
    }
    return {
      ...schema,
      type: [...schema.type, "null"],
    };
  }
  
  // Already null type
  if (schema.type === "null") {
    return schema;
  }
  
  // Single type - make it an array with null
  return {
    ...schema,
    type: [schema.type, "null"],
  };
};
```

**Current state in converters:**

- **Rust:** ⚠️ Basic nullable handling (wraps with Option)
- **Node:** ⚠️ Basic nullable handling

**Recommendation:**
- **Priority: MEDIUM**
- Enhance nullable logic to match production pattern
- Handle `anyOf`/`oneOf` cases properly
- Avoid duplicate null types
- Test with complex nullable scenarios

---

### 1.7 SDL Validation & Canonicalization

**Location:** `scripts/tmp/scripts/lib/graphql-utils-proto.mjs`

**What it does:**
- Validates generated SDL using `buildSchema`
- Optionally applies `mapSchema` transformations
- Produces canonical output via `printSchema`
- Returns both validation status and formatted SDL

**Implementation:**
```javascript
export function validateSDL(sdlText) {
  try {
    const schema = buildSchema(sdlText);
    
    if (mapSchema) {
      try {
        mapSchema(schema, {});
      } catch (merr) {
        // Don't fail validation on mapSchema issues
      }
    }
    
    return { valid: true, printed: printSchema(schema) };
  } catch (err) {
    return { valid: false, error: String(err) };
  }
}

export function emitCanonicalSDL(sdlText) {
  try {
    const schema = buildSchema(sdlText);
    
    if (mapSchema) {
      try {
        const mapped = mapSchema(schema, {});
        if (mapped && typeof mapped === "object" && mapped.toConfig) {
          return { ok: true, printed: printSchema(mapped) };
        }
        return { ok: true, printed: printSchema(schema) };
      } catch (mapErr) {
        // Log error but continue with original schema
        process.stderr.write(
          `mapSchema error: ${mapErr.stack || String(mapErr)}\n`
        );
        return { ok: true, printed: printSchema(schema) };
      }
    }
    
    return { ok: true, printed: printSchema(schema) };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
```

**Current state in converters:**

- **Rust:** ⚠️ Has basic validation but no canonicalization
- **Node:** ⚠️ Has basic validation but no canonicalization

**Recommendation:**
- **Priority: MEDIUM**
- Add canonicalization step to both converters
- Use GraphQL parsers to validate and reformat output
- Return both validation result and canonical SDL
- Make canonicalization optional via config

---

### 1.8 Configuration-Driven Conversion

**Location:** `scripts/tmp/scripts/json-to-graphql.config.mjs`

**What it does:**
- Defines type configurations with explicit pointer mappings
- Maps JSON Schema paths to GraphQL field definitions
- Supports custom scalar lists
- Provides enum and union configurations

**Structure:**
```javascript
const typeConfigs = [
  {
    name: "Contract",
    pointer: "/",
    description: "Normalized contract record...",
    fields: [
      {
        name: "globalRecordId",
        pointer: "/systemMetadata/globalRecordId",
        graphqlType: "ID!",
        description: "Unique global record identifier.",
      },
      {
        name: "systemChain",
        pointer: "/systemMetadata/systemChain",
        itemsPointer: "/systemMetadata/systemChain/items",
        graphqlType: "[SystemChainEntry!]!",
        description: "System chain entries...",
      },
      // ... more fields
    ]
  },
  // ... more types
];

const scalars = ["Date", "DateTime", "Decimal", "JSON"];
const enumConfigs = [...];
const unionConfigs = [...];
```

**Current state in converters:**

- **Rust:** ❌ No configuration file support
- **Node:** ❌ No configuration file support

**Recommendation:**
- **Priority: LOW** (advanced feature)
- Add optional configuration file support
- Allow pointer-based field mappings
- Support custom type definitions
- Useful for complex schema transformations
- Document configuration format

---

### 1.9 CLI Flexibility

**Location:** `scripts/tmp/scripts/generate-graphql-from-json-schema.mjs` (lines 15-50)

**What it does:**
- Accepts command-line arguments for multi-schema support
- Allows custom input/output paths
- Supports different naming conventions
- Enables batch processing

**Implementation:**
```javascript
let schemaPath = defaultSchemaPath;
let outputBaseName = path
  .basename(schemaPath)
  .replace(/\.schema\.json$/i, "")
  .replace(/\.json$/i, "");

// Parse CLI flags
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--schema" && argv[i + 1]) {
    schemaPath = path.isAbsolute(argv[i + 1]) 
      ? argv[i + 1] 
      : path.join(repoRoot, argv[i + 1]);
    
    outputBaseName = path
      .basename(schemaPath)
      .replace(/\.schema\.json$/i, "")
      .replace(/\.json$/i, "");
  }
  if (argv[i] === "--out-base" && argv[i + 1]) {
    outputBaseName = argv[i + 1];
  }
}

// Construct output paths dynamically per system
let outputPath = path.join(outputDir, `${outputBaseName}.from-json.graphql`);
```

**Current state in converters:**

- **Rust:** ⚠️ Partial - has example with args but not full CLI
- **Node:** ⚠️ Partial - exports functions but no CLI tool

**Recommendation:**
- **Priority: MEDIUM**
- Add full CLI tools to both converters
- Support `--schema`, `--output`, `--config` flags
- Enable batch mode for multiple schemas
- Add `--help` documentation

---

### 1.10 Description Formatting

**Location:** `scripts/tmp/scripts/generate-graphql-from-json-schema.mjs` (lines 92-100)

**What it does:**
- Formats multi-line descriptions properly
- Escapes triple-quotes in descriptions
- Handles line breaks and indentation
- Produces clean GraphQL comments

**Implementation:**
```javascript
function formatDescription(description, indent = "") {
  if (!description) return "";
  
  const sanitized = String(description).replace(/\"\"\"/g, '\"\\\"\\\"');
  const lines = sanitized.replace(/\r/g, "").split("\n");
  const indented = lines.map(line => `${indent}${line}`);
  
  return `${indent}"""
${indented.join("\n")}
${indent}"""`;
}
```

**Current state in converters:**

- **Rust:** ⚠️ Basic description handling
- **Node:** ⚠️ Basic description handling

**Recommendation:**
- **Priority: LOW**
- Enhance description formatting
- Handle edge cases (embedded quotes, special chars)
- Ensure proper indentation
- Test with complex descriptions

---

## Part 2: Prioritized Implementation Plan

### Phase 1: Critical Improvements (Week 1-2)

#### 1.1 Enhanced $ref Resolution
**Both Converters**

- [ ] Add recursive $ref following
- [ ] Support `$defs` and `definitions`
- [ ] Implement case conversion fallbacks
- [ ] Add path resolution utilities
- [ ] Handle circular $ref chains
- [ ] Improve error messages

**Impact:** HIGH - Enables complex schema conversion
**Effort:** MEDIUM

#### 1.2 Circular Reference Protection
**Node Converter (HIGH), Rust Converter (MEDIUM)**

- [ ] Add `building` set to context
- [ ] Check before processing types
- [ ] Detect infinite loops
- [ ] Add helpful error messages

**Impact:** HIGH - Prevents crashes
**Effort:** LOW

### Phase 2: Important Enhancements (Week 3-4)

#### 2.1 Type Filtering
**Both Converters**

- [ ] Add exclusion lists (types, suffixes)
- [ ] Make filtering configurable
- [ ] Support override options
- [ ] Document filtering behavior

**Impact:** MEDIUM - Cleaner output
**Effort:** LOW

#### 2.2 Nullable Type Handling
**Both Converters**

- [ ] Handle `anyOf`/`oneOf`/`allOf` cases
- [ ] Avoid duplicate null types
- [ ] Support complex nullable scenarios
- [ ] Add comprehensive tests

**Impact:** MEDIUM - Better schema accuracy
**Effort:** MEDIUM

#### 2.3 CLI Tools
**Both Converters**

- [ ] Add command-line interfaces
- [ ] Support `--schema`, `--output`, `--config`
- [ ] Enable batch processing
- [ ] Add `--help` documentation
- [ ] Support stdin/stdout

**Impact:** MEDIUM - Better usability
**Effort:** MEDIUM

#### 2.4 SDL Validation & Canonicalization
**Both Converters**

- [ ] Add validation step
- [ ] Implement canonicalization
- [ ] Return formatted SDL
- [ ] Make optional via config

**Impact:** MEDIUM - Better output quality
**Effort:** MEDIUM

### Phase 3: Nice-to-Have Features (Week 5+)

#### 3.1 Case Conversion Utilities
**Both Converters**

- [ ] Add case conversion module
- [ ] Support camelCase ↔ snake_case
- [ ] Make naming convention configurable
- [ ] Use in $ref resolution

**Impact:** LOW-MEDIUM - Better flexibility
**Effort:** LOW

#### 3.2 Configuration Files
**Both Converters**

- [ ] Support external config files
- [ ] Enable pointer-based mappings
- [ ] Allow custom type definitions
- [ ] Document configuration format

**Impact:** LOW - Advanced use cases
**Effort:** HIGH

#### 3.3 Scalar Type Factories
**Both Converters**

- [ ] Refactor to factory pattern
- [ ] Allow custom scalar registration
- [ ] Document custom scalars

**Impact:** LOW - Better extensibility
**Effort:** LOW

---

## Part 3: Specific Implementation Recommendations

### 3.1 Rust Converter Enhancements

**File:** `converters/rust/src/json_to_graphql.rs`

```rust
// Add to ConversionContext
struct ConversionContext<'a> {
    options: &'a ConversionOptions,
    type_names: HashMap<String, usize>,
    root_schema: Option<&'a JsonValue>,
    building: HashSet<String>,  // ← Add this
}

// Enhanced resolve_ref with recursive following
fn resolve_ref(&self, ref_path: &str) -> Result<Option<&JsonValue>> {
    if !ref_path.starts_with('#') {
        return Ok(None);
    }

    let root = self.root_schema?;
    let path = ref_path.trim_start_matches('#').trim_start_matches('/');
    let parts: Vec<&str> = path.split('/').collect();

    let mut current = root;
    for part in parts {
        if part.is_empty() {
            continue;
        }
        
        // If current node has $ref, follow it first
        if let Some(nested_ref) = current.get("$ref")
            .and_then(|v| v.as_str()) 
        {
            if let Some(resolved) = self.resolve_ref(nested_ref)? {
                current = resolved;
            }
        }
        
        // Try direct match, then case conversions
        current = current.get(part)
            .or_else(|| current.get(&camel_to_snake(part)))
            .or_else(|| current.get(&snake_to_camel(part)))
            .ok_or_else(|| ConversionError::invalid_ref(ref_path))?;
    }

    Ok(Some(current))
}

// Add case conversion utilities
fn camel_to_snake(s: &str) -> String {
    let re1 = Regex::new(r"([a-z0-9])([A-Z])").unwrap();
    let re2 = Regex::new(r"([A-Z])([A-Z][a-z])").unwrap();
    let temp = re1.replace_all(s, "${1}_${2}");
    re2.replace_all(&temp, "${1}_${2}").to_lowercase()
}

fn snake_to_camel(s: &str) -> String {
    let re = Regex::new(r"_([a-zA-Z0-9])").unwrap();
    re.replace_all(s, |caps: &Captures| {
        caps[1].to_uppercase()
    }).to_string()
}

// Add circular reference check
fn convert_type_definition(
    schema: &JsonValue,
    type_name: &str,
    context: &mut ConversionContext,
) -> Result<String> {
    // Check if already building this type
    if context.building.contains(type_name) {
        return Err(ConversionError::CircularReference(
            format!("Circular reference detected: {}", type_name)
        ));
    }
    
    context.building.insert(type_name.to_string());
    
    // ... existing conversion logic ...
    
    context.building.remove(type_name);
    Ok(output)
}
```

### 3.2 Node Converter Enhancements

**File:** `converters/node/src/json-to-graphql.ts`

```typescript
interface ConversionContext {
  schema: JsonSchema;
  processedTypes: Set<string>;
  building: Set<string>;  // ← Add this
}

class JsonSchemaToGraphQL {
  private resolveRef(
    schema: JsonSchema, 
    refPath: string,
    visited: Set<string> = new Set()
  ): JsonSchema | null {
    if (!refPath.startsWith('#')) {
      return null;
    }
    
    // Check for circular $ref
    if (visited.has(refPath)) {
      throw new ConversionError(
        `Circular $ref detected: ${refPath}`,
        undefined,
        'CIRCULAR_REF'
      );
    }
    
    visited.add(refPath);
    
    const path = refPath.replace(/^#\//, '');
    const parts = path.split('/');
    
    let current: any = schema;
    for (const part of parts) {
      if (!part) continue;
      
      // If current node has $ref, follow it
      if (current.$ref && typeof current.$ref === 'string') {
        const resolved = this.resolveRef(schema, current.$ref, visited);
        if (resolved) {
          current = resolved;
        }
      }
      
      // Try direct match, then case conversions
      current = current[part] 
        || current[this.camelToSnake(part)]
        || current[this.snakeToCamel(part)];
        
      if (!current) {
        return null;
      }
    }
    
    return current;
  }
  
  private camelToSnake(str: string): string {
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
      .toLowerCase();
  }
  
  private snakeToCamel(str: string): string {
    return str.replace(/_([a-zA-Z0-9])/g, (_, c) => c.toUpperCase());
  }
  
  private convertTypeDefinition(
    schema: JsonSchema,
    typeName: string,
    context: ConversionContext
  ): string {
    // Check circular reference
    if (context.building.has(typeName)) {
      throw new ConversionError(
        `Circular reference detected: ${typeName}`,
        undefined,
        'CIRCULAR_REF'
      );
    }
    
    context.building.add(typeName);
    
    try {
      // ... existing conversion logic ...
      
      return output;
    } finally {
      context.building.delete(typeName);
    }
  }
}
```

---

## Part 4: Testing Strategy

### 4.1 Test Cases to Add

**$ref Resolution Tests:**
- [ ] Simple internal $ref
- [ ] Nested $ref (ref to ref)
- [ ] $ref with case differences (camelCase vs snake_case)
- [ ] $ref to $defs vs definitions
- [ ] Circular $ref chains (should error gracefully)
- [ ] Missing $ref target (should error with helpful message)

**Type Filtering Tests:**
- [ ] Exclude Query/Mutation/Subscription
- [ ] Exclude types ending in Connection/Edge/Filter
- [ ] Include/exclude based on config
- [ ] Introspection types (__)

**Circular Reference Tests:**
- [ ] Self-referencing type
- [ ] Mutually referencing types (A→B→A)
- [ ] Complex circular graph
- [ ] Verify error messages

**Case Conversion Tests:**
- [ ] camelCase to snake_case
- [ ] snake_case to camelCase
- [ ] Consecutive capitals (HTTPResponse)
- [ ] Numbers in names (http2Protocol)
- [ ] Edge cases

**Nullable Handling Tests:**
- [ ] Simple nullable field
- [ ] anyOf with null
- [ ] oneOf with null
- [ ] Already nullable type (avoid duplicates)
- [ ] $ref that resolves to nullable

---

## Part 5: Documentation Updates

### 5.1 Update README Files

**Add sections for:**
- [ ] Advanced features (case conversion, type filtering)
- [ ] Configuration options
- [ ] CLI usage examples
- [ ] Best practices for complex schemas
- [ ] Known limitations

### 5.2 Add Migration Guide

**Create:** `docs/MIGRATION_FROM_SCRIPTS.md`

- [ ] Document differences between scripts and converters
- [ ] Migration path for existing users
- [ ] Configuration equivalents
- [ ] Breaking changes

### 5.3 Add Architecture Document

**Create:** `docs/ARCHITECTURE.md`

- [ ] Explain $ref resolution algorithm
- [ ] Document context/state management
- [ ] Describe type filtering logic
- [ ] Show extension point locations

---

## Part 6: Comparison Matrix

| Feature | Production Scripts | Rust Converter | Node Converter | Priority |
|---------|-------------------|----------------|----------------|----------|
| Basic $ref resolution | ✅ Advanced | ✅ Basic | ❌ None | **HIGH** |
| Recursive $ref following | ✅ Yes | ❌ No | ❌ No | **HIGH** |
| Case conversion | ✅ Full | ❌ No | ❌ No | MEDIUM |
| Type filtering | ✅ Yes | ❌ No | ❌ No | MEDIUM |
| Circular ref protection | ✅ Yes | ⚠️ Partial | ❌ No | **HIGH** |
| Scalar factories | ✅ Yes | ⚠️ Basic | ⚠️ Basic | LOW |
| Nullable handling | ✅ Advanced | ⚠️ Basic | ⚠️ Basic | MEDIUM |
| SDL validation | ✅ Yes | ⚠️ Basic | ⚠️ Basic | MEDIUM |
| Configuration files | ✅ Yes | ❌ No | ❌ No | LOW |
| CLI flexibility | ✅ Full | ⚠️ Example | ⚠️ None | MEDIUM |
| Description formatting | ✅ Advanced | ⚠️ Basic | ⚠️ Basic | LOW |
| $defs extraction | ✅ Yes | ✅ Yes | ❌ No | **HIGH** |

**Legend:**
- ✅ Fully implemented
- ⚠️ Partially implemented
- ❌ Not implemented

---

## Part 7: Quick Wins (Do First)

These can be implemented quickly with high impact:

### 1. Add Circular Reference Protection (Node)
**Time:** 2-3 hours  
**Impact:** Prevents crashes on complex schemas  
**Files:** `converters/node/src/json-to-graphql.ts`

### 2. Enhance $ref Resolution (Both)
**Time:** 1-2 days  
**Impact:** Major improvement in schema support  
**Files:** 
- `converters/rust/src/json_to_graphql.rs`
- `converters/node/src/json-to-graphql.ts`

### 3. Add Type Filtering (Both)
**Time:** 3-4 hours  
**Impact:** Cleaner output, better defaults  
**Files:**
- `converters/rust/src/types.rs` (add config)
- `converters/node/src/types.ts` (add config)
- Both conversion files

### 4. Extract $defs Types (Node)
**Time:** 4-6 hours  
**Impact:** Support for complex schemas  
**Files:** `converters/node/src/json-to-graphql.ts`

---

## Part 8: Conclusion

The production scripts demonstrate mature patterns that should be incorporated into both converters. The highest priority improvements are:

1. **Enhanced $ref resolution with recursion** - Both converters need this
2. **Circular reference protection** - Critical for Node, important for Rust
3. **$defs extraction** - Node converter needs this to match Rust
4. **Type filtering** - Both converters would benefit

These improvements will bring the converters to production-quality and enable them to handle complex, real-world schemas like the production scripts do.

---

## Appendix A: Related Scripts for Future Analysis

Additional scripts that may contain useful patterns:

- `validate-graphql-vs-jsonschema.mjs` - Schema parity validation
- `generate-graphql-enhanced.mjs` - Enhanced conversion with hints
- `generate-mapping-from-sdl.mjs` - Reverse mapping generation
- `diff-sdl-schema.mjs` - Schema comparison utilities
- `field-mapping-helper.mjs` - Field mapping logic
- `lib/ir-to-graphql.mjs` - Intermediate representation approach

These could be analyzed in a future iteration for additional patterns.

---

## Appendix B: Implementation Checklist

**Phase 1 (Week 1-2):**
- [ ] Rust: Enhanced $ref resolution
- [ ] Node: Enhanced $ref resolution  
- [ ] Node: Circular reference protection
- [ ] Rust: Improve circular reference handling
- [ ] Both: Add comprehensive $ref tests

**Phase 2 (Week 3-4):**
- [ ] Both: Type filtering with config
- [ ] Both: Enhanced nullable handling
- [ ] Both: CLI tools
- [ ] Both: SDL canonicalization
- [ ] Node: Extract $defs types

**Phase 3 (Week 5+):**
- [ ] Both: Case conversion utilities
- [ ] Both: Configuration file support
- [ ] Both: Scalar factory pattern
- [ ] All: Documentation updates
- [ ] All: Migration guide

**Ongoing:**
- [ ] Add tests for each new feature
- [ ] Update examples
- [ ] Performance benchmarks
- [ ] CI/CD integration

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Status:** Ready for Implementation