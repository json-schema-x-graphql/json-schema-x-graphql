# Implementation Quick Reference Card

**Date:** 2024  
**Purpose:** One-page reference for implementing converter improvements

---

## 📋 Priority Order

1. **Circular Reference Protection** (Node) - 3 hours ⭐ QUICK WIN
2. **Enhanced $ref Resolution** (Both) - 2-3 days ⭐ CRITICAL
3. **Extract $defs Types** (Node) - 4-6 hours ⭐ CRITICAL
4. **Type Filtering** (Both) - 3-4 hours
5. **CLI Tools** (Both) - 1 day each
6. **Case Conversion** (Both) - 2-3 hours each

---

## 🔥 Start Here: Circular Reference Protection (Node)

### Step 1: Update Context
```typescript
interface ConversionContext {
  schema: JsonSchema;
  processedTypes: Set<string>;
  building: Set<string>;  // ← ADD THIS
}
```

### Step 2: Protect Type Conversion
```typescript
private convertTypeDefinition(
  schema: JsonSchema,
  typeName: string,
  context: ConversionContext
): string {
  if (context.building.has(typeName)) {
    throw new ConversionError(
      `Circular reference detected: ${typeName}`,
      undefined,
      'CIRCULAR_REF'
    );
  }
  
  context.building.add(typeName);
  try {
    // ... existing logic ...
    return output;
  } finally {
    context.building.delete(typeName);
  }
}
```

### Step 3: Test
```typescript
it('should detect circular reference', () => {
  const schema = {
    type: 'object',
    'x-graphql-type-name': 'Node',
    properties: { next: { $ref: '#' } }
  };
  expect(() => convert(schema)).toThrow(/Circular/);
});
```

**Files:** `converters/node/src/json-to-graphql.ts`  
**Time:** 3 hours  
**Impact:** Prevents crashes

---

## 🚀 Next: Enhanced $ref Resolution

### Rust Implementation
```rust
// Add recursive resolution
fn resolve_ref(&self, ref_path: &str, visited: &mut HashSet<String>) 
  -> Result<Option<&JsonValue>> 
{
  if visited.contains(ref_path) {
    return Err(ConversionError::CircularReference(/*...*/));
  }
  visited.insert(ref_path.to_string());
  
  // Walk path, following nested $refs
  for part in parts {
    if let Some(nested_ref) = current.get("$ref") {
      current = self.resolve_ref(nested_ref, visited)?;
    }
    current = self.try_get_property(current, part)?;
  }
}

fn try_get_property(&self, node: &JsonValue, key: &str) 
  -> Result<&JsonValue> 
{
  node.get(key)
    .or_else(|| node.get(&camel_to_snake(key)))
    .or_else(|| node.get(&snake_to_camel(key)))
    .ok_or(ConversionError::InvalidReference(/*...*/))
}
```

### Node Implementation
```typescript
private resolveRef(
  schema: JsonSchema,
  refPath: string,
  visited: Set<string> = new Set()
): JsonSchema | null {
  if (visited.has(refPath)) {
    throw new ConversionError('Circular $ref', /*...*/);
  }
  visited.add(refPath);
  
  let current: any = schema;
  for (const part of parts) {
    if (current.$ref) {
      current = this.resolveRef(schema, current.$ref, visited);
    }
    current = this.tryGetProperty(current, part);
  }
  return current;
}

private tryGetProperty(obj: any, key: string): any {
  return obj[key] 
    ?? obj[camelToSnake(key)] 
    ?? obj[snakeToCamel(key)]
    ?? null;
}
```

**Files:** 
- `converters/rust/src/json_to_graphql.rs`
- `converters/node/src/json-to-graphql.ts`

**Time:** 2-3 days per converter  
**Impact:** 🔥 CRITICAL - Complex schema support

---

## 📦 Extract $defs Types (Node Only)

```typescript
public convert(schema: JsonSchema): string {
  let output = '';
  
  // Process $defs first
  const defs = schema.$defs || schema.definitions;
  if (defs) {
    for (const [name, defSchema] of Object.entries(defs)) {
      const typeName = defSchema['x-graphql-type-name'];
      if (typeName && !this.shouldExcludeType(typeName)) {
        output += this.convertTypeDefinition(defSchema, typeName, context);
      }
    }
  }
  
  // Then process root if it has a name
  const rootName = schema['x-graphql-type-name'];
  if (rootName) {
    output += this.convertTypeDefinition(schema, rootName, context);
  }
  
  return output;
}
```

**File:** `converters/node/src/json-to-graphql.ts`  
**Time:** 4-6 hours  
**Impact:** Match Rust capability

---

## 🎯 Type Filtering

### Add to Options
```typescript
export interface ConversionOptions {
  excludeTypes?: string[];
  excludeTypeSuffixes?: string[];
  includeOperationalTypes?: boolean;
}

export const DEFAULT_OPTIONS = {
  excludeTypes: ['Query', 'Mutation', 'Subscription', 'PageInfo'],
  excludeTypeSuffixes: [
    'Filter', 'Sort', 'Connection', 'Edge', 'Payload', 'Args'
  ],
  includeOperationalTypes: false,
};
```

### Filter Logic
```typescript
private shouldExcludeType(typeName: string): boolean {
  if (typeName.startsWith('__')) return true;
  
  if (!this.options.includeOperationalTypes) {
    if (this.options.excludeTypes?.includes(typeName)) return true;
  }
  
  for (const suffix of this.options.excludeTypeSuffixes || []) {
    if (typeName.endsWith(suffix)) return true;
  }
  
  return false;
}
```

**Files:**
- `converters/rust/src/types.rs`
- `converters/node/src/types.ts`
- Both conversion files

**Time:** 3-4 hours each  
**Impact:** Cleaner output

---

## 🧪 Test Commands

```bash
# Rust
cargo test improvements
cargo test ref_resolution
cargo test circular_refs

# Node
npm test -- improvements.test.ts
npm test -- --grep "$ref Resolution"
npm test -- --grep "Circular"
```

---

## 📂 Key Files

### Node Converter
- `src/json-to-graphql.ts` - Main conversion logic
- `src/types.ts` - Type definitions and options
- `src/case-conversion.ts` - NEW: Case utilities
- `tests/improvements.test.ts` - NEW: Test suite

### Rust Converter
- `src/json_to_graphql.rs` - Main conversion logic
- `src/types.rs` - Type definitions and options
- `src/case_conversion.rs` - NEW: Case utilities
- `tests/improvements.rs` - NEW: Test suite

---

## 🎨 Case Conversion Utilities

### JavaScript/TypeScript
```typescript
export function camelToSnake(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

export function snakeToCamel(str: string): string {
  return str.replace(/_([a-zA-Z0-9])/g, (_, c) => c.toUpperCase());
}
```

### Rust
```rust
pub fn camel_to_snake(s: &str) -> String {
    let re1 = Regex::new(r"([a-z0-9])([A-Z])").unwrap();
    let re2 = Regex::new(r"([A-Z])([A-Z][a-z])").unwrap();
    let temp = re1.replace_all(s, "${1}_${2}");
    re2.replace_all(&temp, "${1}_${2}").to_lowercase()
}
```

---

## ✅ Verification Checklist

- [ ] Code compiles/runs without errors
- [ ] All existing tests pass
- [ ] New tests added and passing
- [ ] Test with `schema/test.json`
- [ ] Documentation updated
- [ ] Examples updated
- [ ] Performance acceptable

---

## 📚 Related Documents

- **Detailed Analysis:** `docs/CONVERTER_BEST_PRACTICES_ANALYSIS.md`
- **Action Plan:** `docs/NEXT_STEPS_CONVERTER_IMPROVEMENTS.md`
- **Code Snippets:** `docs/CODE_SNIPPETS_FOR_IMPROVEMENTS.md`

---

## 🎯 Success Metrics

| Metric | Target |
|--------|--------|
| test.json conversion | ✅ Pass |
| Nested $refs | ✅ Resolve |
| Circular refs | ✅ Detect & Error |
| $defs extraction | ✅ All types |
| Performance | < 1s for test.json |
| Test coverage | > 90% |

---

## 💡 Tips

1. **Start small:** Circular ref protection is intake_processest
2. **Test incrementally:** Run tests after each change
3. **Use production scripts:** Copy patterns, not code
4. **Handle errors gracefully:** Good messages help debugging
5. **Document as you go:** Update README with new features

---

**Quick Start Command:**
```bash
# Node: Start with circular ref protection
cd converters/node
# Edit src/json-to-graphql.ts
npm test
npm run build

# Rust: Enhance $ref resolution
cd converters/rust
# Edit src/json_to_graphql.rs
cargo test
cargo build
```

---

**Status:** ✅ Ready to implement  
**Estimated Total Time:** 2-3 weeks full implementation  
**First Task:** Circular reference protection (3 hours) ⭐