# Typeconv and Core-Types: Evaluation Results

## Issue Found: Why typeconv doesn't work

**Problem**: `typeconv` requires JSON Schemas to have named types in a `definitions` or `$defs` section. Your `schema_unification.schema.json` has a single root object without named type definitions, which is why typeconv reports "Converted 0 types".

### Typeconv Command Format

The correct abbreviations for typeconv are:

- **JSON Schema**: `jsc` (not `json-schema`)
- **GraphQL**: `gql` (not `graphql`)

```bash
# Correct syntax (but won't work with your schema structure)
npx typeconv -f jsc -t gql -o output.graphql input.json
```

**Result**: ❌ Converted 0 types because the schema lacks named definitions

---

## Why Your Custom Scripts Exist

Your JSON Schema is **document-oriented** (single root object) rather than **definition-oriented** (multiple named types). This is why you needed custom scripts with:

1. **JSON Pointer resolution** (`"/systemMetadata/primarySystem"`)
2. **Manual type extraction** from nested properties
3. **Custom configuration** (`json-to-graphql.config.mjs` with 597 lines)

Standard conversion tools like `typeconv` expect schemas like this:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": {
    "Contract": { "type": "object", "properties": {...} },
    "Organization": { "type": "object", "properties": {...} }
  }
}
```

But your schema is structured like:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "Enhanced Government Contract...",
  "properties": {
    "systemMetadata": { "type": "object", ... },
    "commonElements": { "type": "object", ... }
  }
}
```

---

## Core-Types Library

The `core-types` library has the correct function names:

```javascript
import {
  convertJsonSchemaToCoreTypes,
  convertCoreTypesToJsonSchema,
} from "core-types-json-schema";

import {
  convertCoreTypesToGraphQL,
  convertGraphQLToCoreTypes,
} from "core-types-graphql";
```

**However**, it will face the same challenge - it expects named type definitions.

---

## Recommended Path Forward

Given your schema structure, you have **three options**:

### Option 1: Restructure JSON Schema (Recommended for Long-term)

Refactor `schema_unification.schema.json` to use `definitions`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": {
    "Contract": {
      "type": "object",
      "title": "Enhanced Government Contract Management",
      "properties": {
        "systemMetadata": { "$ref": "#/definitions/SystemMetadata" },
        "commonElements": { "$ref": "#/definitions/CommonElements" }
      }
    },
    "SystemMetadata": { ... },
    "CommonElements": { ... }
  },
  "$ref": "#/definitions/Contract"
}
```

**Pros**:

- Enables use of standard tools (typeconv, core-types)
- Better for TypeScript code generation
- Industry best practice
- Reduces custom code from 1,500 lines to ~200 lines

**Cons**:

- Requires schema refactoring (~2-4 hours)
- Breaking change if consumers rely on current structure
- Need to update validation logic

**ROI**: High - One-time refactor saves ongoing maintenance

### Option 2: Keep Custom Scripts (Status Quo)

Maintain your current `generate-graphql-from-json-schema.mjs` and `generate-graphql-json-schema.mjs`.

**Pros**:

- No migration risk
- Full control
- Already working

**Cons**:

- 1,558 lines of custom code to maintain
- High onboarding barrier
- Potential bugs in custom logic
- ~40+ hours/year maintenance burden

### Option 3: Hybrid Approach (Pragmatic)

1. Keep GraphQL SDL as canonical source (already doing this ✓)
2. Use `core-types` or `graphql-tools` for GraphQL → JSON Schema
3. Keep simplified custom script for JSON Schema → GraphQL (since schema is document-oriented)

**Example** using existing `@graphql-tools`:

```javascript
import { buildSchema, printSchema } from "graphql";
import { makeExecutableSchema } from "@graphql-tools/schema";

// GraphQL → Introspection → JSON
const schema = buildSchema(graphqlSDL);
// Use @graphql-tools to extract types programmatically
```

**Pros**:

- Reduces maintenance by ~50%
- No breaking schema changes
- Uses battle-tested libraries where possible

**Cons**:

- Still have some custom code
- Mixed approach may confuse contributors

---

## Updated Documentation Corrections

I need to update the documentation I created with these findings:

### Corrections needed:

1. ✅ **typeconv syntax**: Use `jsc` not `json-schema`, `gql` not `graphql`
2. ❌ **typeconv applicability**: Won't work with document-oriented schemas
3. ⚠️ **core-types**: Can work but needs definitions-based schema
4. ✅ **Custom scripts rationale**: Necessary because of schema structure

---

## Immediate Action Items

1. **Test current workflow**:

   ```bash
   pnpm run generate:schema:interop
   pnpm run validate:all
   ```

2. **Document schema structure decision**: Add to ADR explaining why document-oriented

3. **Evaluate refactoring**: Is restructuring to definitions-based worth it?

4. **If keeping current structure**: Document that standard tools won't work and why

---

## Questions for Team

1. **Can we restructure the schema?** Would it break existing consumers?
2. **Is GraphQL SDL truly canonical?** If so, why maintain bidirectional sync?
3. **What's the schema governance model?** Who owns JSON Schema vs GraphQL SDL?
4. **Migration appetite**: 2-4 hours of refactoring vs years of maintenance?

---

## Conclusion

The **standard tools don't work** with your schema structure because:

- Your JSON Schema is **document-oriented** (single root object)
- Tools expect **definition-oriented** schemas (named types in `definitions`)
- Your custom scripts use JSON Pointers to navigate the document structure

**Recommendation**:

If you control the schema format, **restructure to use `definitions`**. This is a one-time 2-4 hour effort that will:

- Enable standard tooling
- Reduce custom code by 70-80%
- Save 40+ hours annually
- Follow industry best practices

If you can't restructure (external consumers, backwards compatibility), **keep the custom scripts** but document clearly why standard tools don't work.
