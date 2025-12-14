# V1 to V2 Migration Archive

This directory contains historical documentation from the V1 to V2 schema migration.

---

## Purpose

These documents preserve the history of the major schema architecture transition from V1 (camelCase) to V2 (snake_case with x-graphql hints). They are useful for:

- **Understanding migration decisions** — Why certain approaches were chosen
- **Troubleshooting migration issues** — Identifying similar problems
- **Historical context** — How the V2 architecture evolved
- **Audit trail** — Complete migration history

---

## Files in This Directory

### `V1-TO-V2-CONVERTER-RESULTS.md`
**Conversion results and analysis from V1 to V2 schema**

- Field-by-field conversion results
- Type mapping changes
- Issues encountered during conversion
- Validation results

**Archived:** December 2024  
**Reason:** Consolidated into [Schema V1 vs V2 Guide](../../schema-v1-vs-v2-guide.md)

---

### `V2-GRAPHQL-ENHANCEMENT-SUMMARY.md`
**Summary of V2 GraphQL enhancements and new features**

- x-graphql-* hint system
- Interface and union improvements
- Custom directive support
- Extension mechanisms

**Archived:** December 2024  
**Reason:** Consolidated into [Schema V1 vs V2 Guide](../../schema-v1-vs-v2-guide.md) and [x-graphql Hints Guide](../../x-graphql-hints-guide.md)

---

### `migration-to-json-schema-canonical.md`
**Migration guide to canonical JSON Schema approach**

- Decision to use snake_case as canonical
- Migration from camelCase
- Pointer resolution updates
- Generator script changes

**Archived:** December 2024  
**Reason:** Consolidated into [Schema Pipeline Guide](../../schema-pipeline-guide.md)

---

### `schema_unification-v1-diagram.md`
**V1 schema architecture diagram and documentation**

- V1 type system overview
- Field naming conventions
- Relationships and references
- Original design decisions

**Archived:** December 2024  
**Reason:** V2 diagram is canonical; V1 preserved for historical reference

---

## Current V1 vs V2 Documentation

For up-to-date V1/V2 comparison and migration guidance, see:

### **[Schema V1 vs V2 Guide](../../schema-v1-vs-v2-guide.md)**
Consolidated guide covering:
- Quick reference comparison table
- Detailed type system changes
- Field naming (camelCase → snake_case)
- x-graphql hints system
- Migration strategies
- V2 architecture diagram

---

## Migration Timeline

### Phase 1: Planning (Completed)
- Analysis of V1 limitations
- V2 architecture design
- Decision to adopt snake_case canonical schema

### Phase 2: Implementation (Completed)
- Converter script development
- Field mapping generation
- x-graphql hint system implementation
- Schema generation pipeline updates

### Phase 3: Validation (Completed)
- Parity checking between V1 and V2
- Round-trip testing (SDL ↔ JSON)
- Pointer resolution validation
- Production deployment

### Phase 4: Consolidation (Completed)
- Legacy V1 pages moved to `src/legacy-pages/`
- V1 schema files moved to `src/data/archived/`
- Documentation consolidated
- V2 established as canonical

---

## Key Migration Decisions

### 1. Snake_case as Canonical
**Decision:** Use snake_case for canonical JSON Schema  
**Rationale:** 
- Better alignment with JSON Schema conventions
- Improved compatibility with Python validators
- Clearer separation from GraphQL (camelCase SDL)

**Impact:** All generators updated to read/write snake_case canonical schema

---

### 2. x-graphql Hints System
**Decision:** Use x-graphql-* extensions for GraphQL-specific metadata  
**Rationale:**
- Preserve GraphQL semantics in JSON Schema
- Support interfaces, unions, and custom directives
- Enable rich GraphQL generation from JSON Schema

**Impact:** Enhanced V2 generator with hint processing logic

---

### 3. Dual Schema Generation
**Decision:** Maintain both SDL → JSON and JSON → SDL generators  
**Rationale:**
- Bidirectional parity validation
- Flexibility in source of truth
- Round-trip testing capabilities

**Impact:** Schema interop pipeline with multiple generators

---

## Lessons Learned

### What Worked Well
✅ Comprehensive field mapping before migration  
✅ Automated conversion scripts (reduced errors)  
✅ Parity validation throughout process  
✅ Preserving V1 for historical reference  

### Challenges Encountered
⚠️ Pointer resolution required updates for snake_case  
⚠️ Some manual fixes needed for complex nested types  
⚠️ CI/CD pipeline required updates for dual output  

### Recommendations for Future Migrations
- Start with comprehensive field mapping
- Automate as much as possible
- Validate parity continuously
- Keep historical versions archived
- Update all tooling simultaneously

---

## Related Documentation

- **Current V1/V2 Guide:** [schema-v1-vs-v2-guide.md](../../schema-v1-vs-v2-guide.md)
- **Schema Pipeline:** [schema-pipeline-guide.md](../../schema-pipeline-guide.md)
- **x-graphql Hints:** [x-graphql-hints-guide.md](../../x-graphql-hints-guide.md)
- **Main Archive:** [../README.md](../README.md)

---

**Migration Completed:** 2024  
**Archive Created:** December 2024  
**Status:** V2 is canonical, V1 preserved for reference