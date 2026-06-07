# ADR 0013: Federation Extension Format — Nested Object vs. Declarative Flat Extensions

**Status**: Proposed  
**Date**: 2026-06-05  
**Deciders**: Core Maintainers  
**Context**: `json-schema-x-graphql` currently supports two competing patterns for expressing Apollo Federation directives in JSON Schema extensions.

---

## 1. The Problem

The codebase contains **two incompatible patterns** for the same feature:

| Pattern              | Format                                                                        | Converter Support                                 | Example Usage                            |
| -------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------- |
| **Nested Object**    | `"x-graphql-federation": { "keys": [...], "external": true }`                 | Only legacy `reference/jsonschema-to-graphql.mjs` | `examples/federation/`                   |
| **Declarative Flat** | `"x-graphql-federation-keys": [...]`, `"x-graphql-federation-external": true` | Both Node.js and Rust converters                  | `converters/test-data/x-graphql/`, tests |

**Critical Finding**: The federation examples (`examples/federation/json-schemas/`) use the nested object format, but the main converters (Node.js and Rust) **do not implement it**. This means the examples are effectively broken when used with the main CLI.

---

## 2. Comparison Matrix

| Criterion                                           | Nested Object                                            | Declarative Flat                                                       |
| --------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Converter Support**                               | ❌ Legacy script only                                    | ✅ Node.js + Rust                                                      |
| **JSON Schema Validation**                          | ⚠️ Requires custom `anyOf` or `oneOf` in meta-schema     | ✅ Native JSON Schema property validation                              |
| **Searchability**                                   | ⚠️ Harder to grep for specific directives                | ✅ Easy to grep `"x-graphql-federation-external"`                      |
| **Explicitness**                                    | ⚠️ Federation details hidden in a sub-object             | ✅ Each directive is a top-level property                              |
| **Alignment with existing `x-graphql-*` namespace** | ❌ Breaks the flat `x-graphql-{aspect}-{detail}` pattern | ✅ Consistent with `x-graphql-field-name`, `x-graphql-type-kind`, etc. |
| **Field-level granularity**                         | ✅ Can group all federation metadata on a field          | ✅ Each field property is independent                                  |
| **Extensibility**                                   | ✅ Easy to add new nested keys without polluting schema  | ⚠️ Each new directive adds a new top-level property                    |
| **Tooling (IDE, lint)**                             | ⚠️ Nested objects need deeper schema definitions         | ✅ Flat properties are trivially autocomplete-friendly                 |
| **Round-trip fidelity**                             | ❌ Legacy script doesn't round-trip to the same format   | ✅ Both converters support bidirectional conversion                    |
| **Migration effort**                                | —                                                        | High (examples + docs + scripts)                                       |

---

## 3. Deep Dive: Why the Nested Object Is Broken

### 3.1 Node.js Converter

The Node.js converter (`converters/node/src/converter.ts`) detects federation via:

```typescript
if (
  current["x-graphql-federation-keys"] ||
  current["x-graphql-federation-shareable"] ||
  ...
) {
  return "V2";
}
```

The `extractDirectives()` function in `normalization/directives.ts` only processes flat keys:

```typescript
if (Array.isArray(schema["x-graphql-federation-keys"])) { ... }
if (schema["x-graphql-federation-external"]) { ... }
```

There is **zero code** that reads `schema["x-graphql-federation"]` as a nested object.

### 3.2 Rust Converter

The Rust converter (`converters/rust/src/json_to_graphql.rs`) reads:

```rust
obj.get("x-graphql-federation-keys")
obj.get("x-graphql-federation-shareable")
obj.get("x-graphql-federation-external")
```

No `obj.get("x-graphql-federation")` nested lookup exists.

### 3.3 Legacy Script

Only `converters/node/src/reference/jsonschema-to-graphql.mjs` supports the nested object:

```javascript
const federatedKeys = schema["x-graphql-federation"]?.keys || [];
```

This script is labeled as a reference/legacy implementation and is not the main conversion path.

---

## 4. Recommendation: Standardize on Declarative Flat Extensions

### 4.1 Rationale

1. **Both converters already implement it**. Migrating to the nested object would require rewriting converter logic in both Node.js and Rust.
2. **Consistency with the `x-graphql-*` namespace**. The project has established a flat pattern: `x-graphql-type-name`, `x-graphql-field-name`, `x-graphql-field-non-null`, etc. The nested object is an outlier.
3. **Better JSON Schema tooling support**. Flat properties can be declared directly in a JSON Schema meta-schema with `properties`, `patternProperties`, or `additionalProperties: false`. Nested objects require `oneOf`/`anyOf` or complex `if/then` schemas, which are harder to validate and give worse error messages.
4. **Superior grep/search/diff ergonomics**. Finding all fields marked `@external` is a simple search for `"x-graphql-federation-external"`. With the nested object, you need to search for both the key and the value, across arbitrary nesting depths.
5. **Clearer error messages from validators**. A flat property can be validated as `"type": "boolean"` with a specific path. A nested object requires traversing into the object, and validation errors are harder to attribute to the correct line.
6. **Round-trip conversion works**. The flat extensions are preserved in both Node.js → SDL → Node.js and Rust → SDL → Rust conversions.

### 4.2 Mapping: Nested → Flat

| Nested (Deprecated)                                         | Flat (Recommended)                                                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `"x-graphql-federation": { "keys": [{ "fields": "id" }] }`  | `"x-graphql-federation-keys": ["id"]`                                                                  |
| `"x-graphql-federation": { "external": true }`              | `"x-graphql-federation-external": true`                                                                |
| `"x-graphql-federation": { "provides": "username" }`        | `"x-graphql-federation-provides": "username"`                                                          |
| `"x-graphql-federation": { "requires": "email" }`           | `"x-graphql-federation-requires": "email"`                                                             |
| `"x-graphql-federation": { "shareable": true }`             | `"x-graphql-federation-shareable": true`                                                               |
| `"x-graphql-federation": { "extends": true }`               | `"x-graphql-directives": ["@extends"]` or `"x-graphql-federation-extends": true` _(see open question)_ |
| `"x-graphql-federation": { "override": { "from": "old" } }` | `"x-graphql-federation-override-from": "old"`                                                          |

### 4.3 Open Question: `extends` Directive

The `extend type` / `@extends` directive has no flat equivalent in the current codebase. Options:

1. **Add `x-graphql-federation-extends`**: A new boolean flat property.
2. **Use `x-graphql-directives`: ["@extends"]\*\***: Already supported by the converter.
3. **Use `"x-graphql-type-kind": "EXTENDED_OBJECT"`**: Semantically incorrect but possible.

**Recommendation**: Option 1 (`x-graphql-federation-extends: true`) for consistency with the rest of the flat namespace, and for easier detection by the federation version auto-detector.

---

## 5. Work Index: Migration from Nested to Flat

### 5.1 Phase 1: Examples (P0 — Critical)

| File                                                     | Action                                                     | Effort |
| -------------------------------------------------------- | ---------------------------------------------------------- | ------ |
| `examples/federation/json-schemas/apollo-classic/*.json` | Replace nested `x-graphql-federation` with flat properties | 2h     |
| `examples/federation/json-schemas/strawberry/*.json`     | Replace nested `x-graphql-federation` with flat properties | 1h     |
| `examples/federation/QUICK_REFERENCE.md`                 | Update all code examples to flat format                    | 2h     |
| `examples/federation/IMPLEMENTATION_STATUS.md`           | Update mapping table                                       | 30m    |
| `examples/federation/PATTERNS.md`                        | Update all JSON Schema examples                            | 3h     |
| `examples/federation/README.md`                          | Update examples                                            | 2h     |
| `examples/federation/COMPOSITION_VALIDATION_RESULTS.md`  | Update references                                          | 30m    |
| `examples/federation/STATUS.md`                          | Update references                                          | 30m    |

**Total Phase 1**: ~12 hours

### 5.2 Phase 2: Converter Normalization (P0 — Critical)

| Task                               | Action                                                                                                       | Effort |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------ |
| Add backward-compat shim           | Optionally detect `x-graphql-federation` nested object and auto-convert to flat extensions before processing | 4h     |
| Add `x-graphql-federation-extends` | Implement flat `extends` support in both converters                                                          | 2h     |
| Update federation version detector | Detect nested object as V2 as well                                                                           | 1h     |
| Update validator                   | Validate flat extensions; warn on nested object usage                                                        | 2h     |

**Total Phase 2**: ~9 hours

### 5.3 Phase 3: Documentation & Meta-Schema (P1)

| Task                                                          | Action                                        | Effort |
| ------------------------------------------------------------- | --------------------------------------------- | ------ |
| `schema/x-graphql-extensions.schema.json`                     | Add flat federation properties to meta-schema | 2h     |
| `docs/x-graphql/ATTRIBUTE_REFERENCE.md`                       | Document flat federation extensions           | 2h     |
| `docs/x-graphql/QUICK_START.md`                               | Update examples                               | 1h     |
| `docs/x-graphql/TROUBLESHOOTING.md`                           | Add "nested object deprecated" section        | 30m    |
| `docs/x-graphql/MIGRATION_GUIDE.md`                           | Add migration script from nested to flat      | 2h     |
| `docs/adr/0013-federation-extension-format-recommendation.md` | This document (finalize as Accepted)          | 1h     |

**Total Phase 3**: ~9 hours

### 5.4 Phase 4: Tooling & Scripts (P1)

| Task                                                      | Action                                                             | Effort |
| --------------------------------------------------------- | ------------------------------------------------------------------ | ------ |
| `scripts/validate-federation-composition.js`              | Update to expect flat extensions                                   | 1h     |
| `scripts/test-federation-examples.sh`                     | Update to validate flat extension output                           | 1h     |
| `scripts/add-federation-schema-link.sh`                   | Update if it reads schema extensions                               | 30m    |
| `converters/node/src/reference/jsonschema-to-graphql.mjs` | Add deprecation warning for nested object; support flat extensions | 2h     |

**Total Phase 4**: ~5 hours

### 5.5 Phase 5: Testing & Validation (P1)

| Task                                                | Action                                   | Effort |
| --------------------------------------------------- | ---------------------------------------- | ------ |
| Add round-trip tests for flat federation extensions | Node.js + Rust                           | 3h     |
| Add composition validation tests                    | Ensure flat examples compose with Rover  | 2h     |
| Add validator tests for nested → flat shim          | Ensure backward compatibility            | 2h     |
| Update `x-graphql-extensions.test.ts`               | Add `x-graphql-federation-extends` tests | 1h     |

**Total Phase 5**: ~8 hours

### 5.6 Grand Total

| Phase                  | Effort        | Priority |
| ---------------------- | ------------- | -------- |
| Phase 1: Examples      | 12h           | P0       |
| Phase 2: Converter     | 9h            | P0       |
| Phase 3: Documentation | 9h            | P1       |
| Phase 4: Tooling       | 5h            | P1       |
| Phase 5: Testing       | 8h            | P1       |
| **Total**              | **~43 hours** | —        |

---

## 6. Risks & Mitigations

| Risk                                                | Mitigation                                                                                                  |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| External users already using nested object format   | Add backward-compat shim in converter (Phase 2); add deprecation warning                                    |
| Migration is large and error-prone                  | Automate with a JSON-to-JSON migration script; validate with existing composition tests                     |
| Meta-schema becomes large with many flat properties | Use JSON Schema `patternProperties` to group federation properties; or accept the explicitness as a feature |
| Divergence from TTSE-petrified-forest patterns      | Document the rationale; TTSE-petrified-forest is a separate project with its own conventions                |

---

## 7. Decision

**Adopt declarative flat extensions (`x-graphql-federation-*`) as the canonical format.**

**Deprecate the nested object format (`x-graphql-federation: { ... }`)** with a backward-compatibility shim and warning in the next minor release, and remove support in the next major release.

**Add `x-graphql-federation-extends`** as the canonical way to express `extend type`.

---

## 8. Related Issues

- #93 — Federation examples use unsupported nested object format
- #94 — Add `x-graphql-federation-extends` support to converters
- #95 — Create migration script: nested → flat federation extensions
- #96 — Update meta-schema to validate flat federation extensions
- #97 — Add backward-compat shim for deprecated nested object format
