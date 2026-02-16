# Documentation Consolidation Plan — Schema Unification Forest

**Last Updated:** December 2024  
**Status:** DRAFT

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Consolidation Strategy](#consolidation-strategy)
4. [Proposed Structure](#proposed-structure)
5. [File-by-File Action Plan](#file-by-file-action-plan)
6. [Archive Strategy](#archive-strategy)
7. [Implementation Timeline](#implementation-timeline)
8. [Success Metrics](#success-metrics)

---

## Executive Summary

### Problem Statement

The `/docs` directory currently contains **38 markdown files** with significant overlap, outdated information, and unclear organization. This creates:

- **Maintenance burden:** Multiple files covering similar topics require synchronized updates
- **User confusion:** Unclear which documents are authoritative or current
- **Redundancy:** Similar content repeated across multiple files
- **Discovery issues:** Important information buried in verbose or misnamed documents

### Goals

1. **Reduce document count by 60%+** (target: ~15 core documents)
2. **Eliminate redundancy** through consolidation and cross-referencing
3. **Establish clear document hierarchy** and purpose
4. **Archive outdated implementation logs** while preserving historical context
5. **Create single source of truth** for each topic area

### Target State

- **Core documentation:** 10-12 essential guides and references
- **Architecture Decision Records (ADRs):** Preserved in `docs/adr/`
- **Historical archive:** Implementation logs and outdated docs in `docs/archived/`
- **Clear naming:** Descriptive, consistent file names without shouting (no ALL_CAPS)

---

## Current State Analysis

### Document Count by Category

| Category                | Count | Files                                                                                                    |
| ----------------------- | ----- | -------------------------------------------------------------------------------------------------------- |
| **Implementation Logs** | 11    | GRAPHQL-_.md, V1-TO-V2-_.md, BENCHMARK-_.md, VOYAGER-_.md, MERMAID-_.md, SCHEMA-RESTRUCTURING-_.md       |
| **User Guides**         | 8     | x-graphql-_.md, graphql-extensions-guide.md, PYTHON-VALIDATION-_.md, SCHEMA-LINTING-_.md, Reporting-_.md |
| **Reference Docs**      | 5     | schema-_.md, transformation_.md, why.md, BusinessPlan.md                                                 |
| **System Mappings**     | 3     | pertrified2\*.md (contract_data, legacy_procurement, intake_process)                                     |
| **External Systems**    | 2     | fiscal.treasury.gov.md, deltalake.md                                                                     |
| **Diagrams**            | 2     | schema_unification-v1-diagram.md, schema_unification-v2-diagram.md                                       |
| **ADRs**                | 4     | adr/\*.md (including README)                                                                             |
| **Meta**                | 1     | README.md                                                                                                |
| **Assets**              | 2     | APIs/_.xml, APIs/_.yaml, diagrams/\*.svg                                                                 |

**Total:** 38 markdown files + assets

### Redundancy Analysis

#### GraphQL Documentation (5 files → consolidate to 2)

- `GRAPHQL-SCHEMA-ANALYSIS-AND-STRATEGY.md` — analysis and comparison
- `GRAPHQL-CONVERTER-BUG-FIXES.md` — implementation log
- `graphql-extensions-guide.md` — user guide for extensions
- `x-graphql-hints-guide.md` — comprehensive hint guide
- `x-graphql-quick-reference.md` — quick reference

**Recommendation:** Keep `x-graphql-hints-guide.md` (comprehensive) and `x-graphql-quick-reference.md` (reference). Archive implementation logs.

#### V1/V2 Comparison (4 files → consolidate to 1)

- `V1-VS-V2-QUICK-REFERENCE.md` — quick comparison
- `V1-VS-V2-SCHEMA-COMPARISON.md` — detailed comparison
- `V1-TO-V2-CONVERTER-RESULTS.md` — conversion results log
- `V2-GRAPHQL-ENHANCEMENT-SUMMARY.md` — enhancement log

**Recommendation:** Consolidate into single `schema-v1-vs-v2-guide.md`. Archive implementation logs.

#### Schema Management (5 files → consolidate to 2)

- `schema-pipeline.md` — generation pipeline
- `schemaManagement.md` — management guide
- `schema-tooling-alternatives.md` — tooling comparison
- `schema-todo.md` — TODO list (likely outdated)
- `migration-to-json-schema-canonical.md` — migration log

**Recommendation:** Consolidate into `schema-pipeline-guide.md` and `schema-tooling-reference.md`. Archive TODO and migration log.

#### Implementation Logs (6 files → archive all)

- `BENCHMARK-SETUP-COMPLETE.md`
- `GRAPHQL-CONVERTER-BUG-FIXES.md`
- `GRAPHQL-VOYAGER-PAGES.md`
- `MERMAID-DIAGRAM-PAGES-IMPLEMENTATION.md`
- `SCHEMA-RESTRUCTURING-SUCCESS.md`
- `VOYAGER-V2-HINTED-IMPLEMENTATION.md`

**Recommendation:** Archive all; reference from consolidated guides if needed.

---

## Consolidation Strategy

### Principles

1. **One topic, one document:** Each document should have a single, clear purpose
2. **Progressive disclosure:** Start with quick references, link to detailed guides
3. **Prefer consolidation over deletion:** Archive historical content, don't lose it
4. **Clear naming:** lowercase-with-dashes, descriptive, no jargon
5. **Cross-reference liberally:** Link between related documents

### Document Hierarchy

```
Core Documentation (Essential Reading)
├── Getting Started
│   ├── README.md (overview, links to everything)
│   └── quick-start.md (NEW: 5-minute setup guide)
├── Schema Guides
│   ├── schema-pipeline-guide.md (NEW: consolidated pipeline + management)
│   ├── schema-v1-vs-v2-guide.md (NEW: consolidated comparison)
│   └── schema-tooling-reference.md (NEW: tooling alternatives + evaluation)
├── GraphQL Guides
│   ├── x-graphql-hints-guide.md (KEEP: comprehensive guide)
│   └── x-graphql-quick-reference.md (KEEP: quick reference)
├── System Integration
│   ├── system-mappings-guide.md (NEW: consolidate contract_data/legacy_procurement/intake_process)
│   └── external-systems-reference.md (NEW: treasury, deltalake, etc.)
├── Developer Guides
│   ├── python-validation-guide.md (RENAME: PYTHON-VALIDATION-QUICK-START.md)
│   ├── schema-linting-guide.md (RENAME: SCHEMA-LINTING-GUIDE.md)
│   └── reporting-guide.md (RENAME: Reporting-Use-Case-Implementation-Guide.md)
└── Architecture & History
    ├── why.md (KEEP: project rationale)
    ├── business-plan.md (RENAME: BusinessPlan.md)
    └── adr/ (KEEP ALL: decision records)

Supporting Assets
├── APIs/ (KEEP: openapi.yaml, solicitation.xml)
└── diagrams/ (KEEP: schema_unification.svg)

Historical Archive (docs/archived/)
├── implementation-logs/
│   ├── BENCHMARK-SETUP-COMPLETE.md
│   ├── GRAPHQL-CONVERTER-BUG-FIXES.md
│   ├── GRAPHQL-VOYAGER-PAGES.md
│   ├── MERMAID-DIAGRAM-PAGES-IMPLEMENTATION.md
│   ├── SCHEMA-RESTRUCTURING-SUCCESS.md
│   └── VOYAGER-V2-HINTED-IMPLEMENTATION.md
├── v1-v2-migration/
│   ├── V1-TO-V2-CONVERTER-RESULTS.md
│   ├── V2-GRAPHQL-ENHANCEMENT-SUMMARY.md
│   ├── migration-to-json-schema-canonical.md
│   └── schema_unification-v1-diagram.md
└── deprecated/
    ├── schema-todo.md
    ├── GRAPHQL-SCHEMA-ANALYSIS-AND-STRATEGY.md
    ├── graphql-extensions-guide.md (superseded by x-graphql-hints-guide)
    └── transformationHistory.md
```

---

## Proposed Structure

### Target: 15 Core Documents

#### Essential (Always Keep)

1. `README.md` — Documentation system overview
2. `why.md` — Project rationale and vision
3. `x-graphql-hints-guide.md` — Comprehensive x-graphql guide
4. `x-graphql-quick-reference.md` — Quick reference for x-graphql hints
5. `adr/` — All ADRs (4 files)

#### New Consolidated Guides (Create)

6. `quick-start.md` — 5-minute getting started guide
7. `schema-pipeline-guide.md` — Schema generation and management (consolidates 3 files)
8. `schema-v1-vs-v2-guide.md` — V1/V2 comparison and migration (consolidates 4 files)
9. `schema-tooling-reference.md` — Tooling alternatives and evaluation (consolidates 2 files)
10. `system-mappings-guide.md` — Contract Data/Legacy Procurement/EASi mappings (consolidates 3 files)
11. `external-systems-reference.md` — Treasury, Delta Lake, etc. (consolidates 2 files)

#### Renamed Guides (Improve naming)

12. `python-validation-guide.md` — Python validation setup and usage
13. `schema-linting-guide.md` — Schema linting and validation
14. `reporting-guide.md` — Reporting use cases and implementation
15. `business-plan.md` — Business plan and strategy

#### Assets (Keep)

- `APIs/openapi.yaml`
- `APIs/solicitation.xml`
- `diagrams/schema_unification.svg`

#### Archived (Move to `docs/archived/`)

- 17 files moved to archive with organized subdirectories

---

## File-by-File Action Plan

### Phase 1: Create New Consolidated Guides

#### 1. `quick-start.md` (NEW)

**Purpose:** Get developers up and running in 5 minutes

**Content:**

- Prerequisites check (Node, Python, pnpm)
- Installation steps
- Run first validation
- Generate schemas
- View in browser
- Next steps (links to detailed guides)

**Sources:**

- README.md sections
- chatmode.md setup instructions
- Common onboarding questions

---

#### 2. `schema-pipeline-guide.md` (NEW)

**Purpose:** Complete guide to schema generation, validation, and publishing

**Consolidates:**

- `schema-pipeline.md` — generation pipeline overview
- `schemaManagement.md` — management best practices
- `migration-to-json-schema-canonical.md` — canonical schema approach

**Content Structure:**

```markdown
# Schema Pipeline Guide

## Overview

- Architecture diagram
- Source of truth: src/data/schema_unification.schema.json

## Generation Pipeline

- GraphQL SDL → JSON Schema
- JSON Schema → GraphQL SDL
- Interop generation
- Publishing to website

## Validation Suite

- Schema validation (Ajv)
- Parity validation (GraphQL ↔ JSON)
- Sync validation (strict mode)
- Python validation

## Management Best Practices

- When to regenerate
- Testing changes
- Committing artifacts
- CI/CD workflow

## Canonical Schema

- Snake_case convention
- Migration from camelCase
- Pointer resolution

## Troubleshooting

- Common issues
- Debug workflows
```

---

#### 3. `schema-v1-vs-v2-guide.md` (NEW)

**Purpose:** Understanding differences and migration path

**Consolidates:**

- `V1-VS-V2-QUICK-REFERENCE.md` — quick comparison
- `V1-VS-V2-SCHEMA-COMPARISON.md` — detailed comparison
- `schema_unification-v2-diagram.md` — V2 diagram

**Content Structure:**

```markdown
# Schema V1 vs V2 Guide

## Quick Reference

- Key differences table
- Migration checklist
- Breaking changes

## Detailed Comparison

- Type system changes
- Field naming (camelCase → snake_case)
- GraphQL hints (x-graphql-\*)
- Interface and union handling
- Directive changes

## V2 Architecture

- Diagram (embed schema_unification.svg)
- Design decisions
- Benefits and tradeoffs

## Migration Guide

- Converting V1 schemas
- Testing migration
- Rollout strategy

## See Also

- Link to archived conversion results
- Link to ADRs
```

---

#### 4. `schema-tooling-reference.md` (NEW)

**Purpose:** Comparison and evaluation of schema tooling

**Consolidates:**

- `schema-tooling-alternatives.md` — tooling comparison
- `typeconv-evaluation-results.md` — typeconv evaluation

**Content Structure:**

```markdown
# Schema Tooling Reference

## Overview

- Tooling landscape
- Selection criteria

## Current Stack

- graphql-js
- json-schema
- Ajv validator
- Python validation

## Alternatives Evaluated

- typeconv (evaluation results)
- graphql-compose
- nexus
- pothos
- Others

## Decision Matrix

- Feature comparison table
- Performance benchmarks
- Maintenance considerations

## Future Considerations

- Emerging tools
- Migration paths
```

---

#### 5. `system-mappings-guide.md` (NEW)

**Purpose:** How Schema Unification Forest maps to external procurement systems

**Consolidates:**

- `pertrified2contract_data.md` — Contract Data mapping
- `pertrified2legacy_procurement.md` — Legacy Procurement mapping
- `pertrified2intake_process.md` — EASi mapping

**Content Structure:**

```markdown
# System Mappings Guide

## Overview

- Why mappings matter
- Mapping strategy

## Contract Data (Federal Procurement Data System)

- Entity mappings
- Field mappings
- Data transformations
- Example queries

## Legacy Procurement (Assisted Search)

- Entity mappings
- Field mappings
- Data transformations
- Example queries

## EASi (Easy Acquisition System Interface)

- Entity mappings
- Field mappings
- Data transformations
- Example queries

## Cross-System Analysis

- Common patterns
- Divergences
- Harmonization approach

## Extending Mappings

- Adding new systems
- Testing mappings
- Documentation requirements
```

---

#### 6. `external-systems-reference.md` (NEW)

**Purpose:** Reference for integrating external data sources

**Consolidates:**

- `fiscal.treasury.gov.md` — Treasury API
- `deltalake.md` — Delta Lake integration

**Content Structure:**

```markdown
# External Systems Reference

## Overview

- Integration architecture
- Authentication strategies

## Treasury API (fiscal.treasury.gov)

- API overview
- Authentication
- Key endpoints
- Data models
- Example integration

## Delta Lake

- Architecture
- Data storage patterns
- Query examples
- Integration with Schema Unification Forest

## Future Integrations

- Planned systems
- Integration patterns
```

---

### Phase 2: Rename and Update Existing Guides

#### 7. `python-validation-guide.md` (RENAME from PYTHON-VALIDATION-QUICK-START.md)

**Actions:**

- Rename file (lowercase, consistent naming)
- Update cross-references
- Ensure up-to-date with current Python setup

#### 8. `schema-linting-guide.md` (RENAME from SCHEMA-LINTING-GUIDE.md)

**Actions:**

- Rename to lowercase
- Update cross-references

#### 9. `reporting-guide.md` (RENAME from Reporting-Use-Case-Implementation-Guide.md)

**Actions:**

- Simplify name
- Update cross-references

#### 10. `business-plan.md` (RENAME from BusinessPlan.md)

**Actions:**

- Rename to lowercase
- Review for outdated content

---

### Phase 3: Archive Implementation Logs

Create `docs/archived/` directory structure:

```
docs/archived/
├── README.md (explains archive purpose and contents)
├── implementation-logs/
│   ├── BENCHMARK-SETUP-COMPLETE.md
│   ├── GRAPHQL-CONVERTER-BUG-FIXES.md
│   ├── GRAPHQL-VOYAGER-PAGES.md
│   ├── MERMAID-DIAGRAM-PAGES-IMPLEMENTATION.md
│   ├── SCHEMA-RESTRUCTURING-SUCCESS.md
│   └── VOYAGER-V2-HINTED-IMPLEMENTATION.md
├── v1-v2-migration/
│   ├── README.md (migration history overview)
│   ├── V1-TO-V2-CONVERTER-RESULTS.md
│   ├── V2-GRAPHQL-ENHANCEMENT-SUMMARY.md
│   ├── migration-to-json-schema-canonical.md
│   └── schema_unification-v1-diagram.md
└── deprecated/
    ├── README.md (explains why deprecated)
    ├── schema-todo.md
    ├── GRAPHQL-SCHEMA-ANALYSIS-AND-STRATEGY.md
    ├── graphql-extensions-guide.md
    └── transformationHistory.md
```

#### Archive README Template

```markdown
# Documentation Archive

This directory contains historical documentation that has been superseded by consolidated guides or is no longer actively maintained.

## Why Archive?

These documents are preserved for:

- Historical context and decision tracking
- Reference during troubleshooting
- Understanding project evolution

## Organization

- `implementation-logs/` — Feature implementation logs and completion reports
- `v1-v2-migration/` — V1 to V2 migration history and results
- `deprecated/` — Superseded documentation

## Finding Current Documentation

See the main [docs README](../README.md) for up-to-date documentation.
```

---

### Phase 4: Update Cross-References

#### Update README.md

Remove references to archived files and update with new consolidated structure:

```markdown
## Documentation Organization

### Getting Started

- [Quick Start](quick-start.md) — Get up and running in 5 minutes
- [Why Schema Unification Forest?](why.md) — Project rationale

### Schema Documentation

- [Schema Pipeline Guide](schema-pipeline-guide.md) — Generation, validation, and publishing
- [Schema V1 vs V2 Guide](schema-v1-vs-v2-guide.md) — Differences and migration
- [Schema Tooling Reference](schema-tooling-reference.md) — Tooling comparison

### GraphQL Documentation

- [x-graphql Hints Guide](x-graphql-hints-guide.md) — Comprehensive guide to x-graphql hints
- [x-graphql Quick Reference](x-graphql-quick-reference.md) — Quick lookup

### System Integration

- [System Mappings Guide](system-mappings-guide.md) — Contract Data, Legacy Procurement, EASi mappings
- [External Systems Reference](external-systems-reference.md) — Treasury, Delta Lake

### Developer Guides

- [Python Validation Guide](python-validation-guide.md) — Python setup and validation
- [Schema Linting Guide](schema-linting-guide.md) — Linting and best practices
- [Reporting Guide](reporting-guide.md) — Reporting use cases

### Architecture & Planning

- [Business Plan](business-plan.md) — Strategy and roadmap
- [Architecture Decision Records](adr/) — ADRs documenting key decisions

### Historical Documentation

- [Documentation Archive](archived/) — Implementation logs and deprecated docs
```

#### Update Navigation Component

Update `src/components/ViewerNavigation/index.tsx` or homepage links to reflect new structure.

#### Update Copilot Instructions

Update `.github/chatmodes/schema-unification-project.chatmode.md` with new doc paths.

---

## Archive Strategy

### What to Archive

**Archive if:**

- Implementation log or completion report (historical record, not user guide)
- Superseded by consolidated guide
- Specific to outdated version or approach
- TODO list or planning doc that's no longer current

**Keep if:**

- Reference material still relevant
- User guide with current information
- ADR or architectural decision
- Quick reference or lookup table

### Archive Process

1. **Create archive structure** (see Phase 3)
2. **Move files** to appropriate archive subdirectory
3. **Add archive READMEs** explaining contents
4. **Update cross-references** to point to new consolidated guides
5. **Add "ARCHIVED" notice** to top of archived files:

```markdown
> **⚠️ ARCHIVED DOCUMENTATION**
>
> This document has been archived and is preserved for historical reference only.
>
> **See instead:** [Schema Pipeline Guide](../schema-pipeline-guide.md)
>
> **Archived:** December 2024  
> **Reason:** Consolidated into comprehensive pipeline guide
```

---

## Implementation Timeline

### Week 1: Planning and Setup

- ✅ Create consolidation plan (this document)
- [ ] Review plan with team
- [ ] Create `docs/archived/` structure
- [ ] Set up archive READMEs

### Week 2: Create Consolidated Guides

- [ ] Write `quick-start.md`
- [ ] Write `schema-pipeline-guide.md`
- [ ] Write `schema-v1-vs-v2-guide.md`

### Week 3: More Consolidated Guides + Renames

- [ ] Write `schema-tooling-reference.md`
- [ ] Write `system-mappings-guide.md`
- [ ] Write `external-systems-reference.md`
- [ ] Rename existing guides (lowercase, consistent)

### Week 4: Archive and Update References

- [ ] Move files to archive
- [ ] Add ARCHIVED notices
- [ ] Update README.md
- [ ] Update navigation components
- [ ] Update cross-references throughout docs

### Week 5: Review and Polish

- [ ] Review all consolidated guides
- [ ] Verify all cross-references work
- [ ] Update copilot instructions
- [ ] Get team feedback
- [ ] Final polishing pass

---

## Success Metrics

### Quantitative

- ✅ **Document count reduced from 38 to ~15** (60% reduction)
- ✅ **All implementation logs archived** (6+ files)
- ✅ **All redundant comparisons consolidated** (4 → 1)
- ✅ **All naming made consistent** (lowercase-with-dashes)

### Qualitative

- [ ] **New developers can get started in <5 minutes** using quick-start
- [ ] **Each topic has one authoritative source** (no confusion)
- [ ] **Historical context preserved** (nothing lost, just organized)
- [ ] **Cross-references work** (no broken links)
- [ ] **Maintenance burden reduced** (fewer files to update)

### Validation Checks

- [ ] All markdown files have valid frontmatter
- [ ] All internal links resolve correctly
- [ ] All code examples are current and work
- [ ] Documentation build succeeds without warnings
- [ ] Navigation reflects new structure

---

## Maintenance Going Forward

### Document Lifecycle

**Active Documentation:**

- Review quarterly for accuracy
- Update with major changes
- Keep synchronized with code

**Archived Documentation:**

- Do not update (historical record)
- Add redirects to current docs if needed
- Preserve as-is for reference

### Adding New Documentation

**Before adding new doc, ask:**

1. Does this belong in an existing guide?
2. Is this a user guide or implementation log?
3. Will this need regular updates?
4. Does this overlap with existing docs?

**If adding new doc:**

- Use lowercase-with-dashes naming
- Add to README.md organization
- Add cross-references to related docs
- Consider if it supersedes anything (archive old doc)

### Preventing Documentation Bloat

**Guidelines:**

- Implementation logs go in Git history or PR descriptions, not docs
- Consolidate rather than create new files
- Archive rather than delete
- Regular quarterly reviews to catch drift

---

## Appendix: Complete File Mapping

### Before → After Mapping

| Current File                                 | Action      | New Location                      | Notes                     |
| -------------------------------------------- | ----------- | --------------------------------- | ------------------------- |
| `README.md`                                  | UPDATE      | `README.md`                       | Update with new structure |
| `why.md`                                     | KEEP        | `why.md`                          | No changes                |
| `BusinessPlan.md`                            | RENAME      | `business-plan.md`                | Lowercase                 |
|                                              |             |                                   |                           |
| **GraphQL Docs**                             |             |                                   |                           |
| `x-graphql-hints-guide.md`                   | KEEP        | `x-graphql-hints-guide.md`        | Comprehensive guide       |
| `x-graphql-quick-reference.md`               | KEEP        | `x-graphql-quick-reference.md`    | Quick reference           |
| `graphql-extensions-guide.md`                | ARCHIVE     | `archived/deprecated/`            | Superseded by hints guide |
| `GRAPHQL-SCHEMA-ANALYSIS-AND-STRATEGY.md`    | ARCHIVE     | `archived/deprecated/`            | Analysis, not user guide  |
| `GRAPHQL-CONVERTER-BUG-FIXES.md`             | ARCHIVE     | `archived/implementation-logs/`   | Implementation log        |
| `GRAPHQL-VOYAGER-PAGES.md`                   | ARCHIVE     | `archived/implementation-logs/`   | Implementation log        |
|                                              |             |                                   |                           |
| **V1/V2 Docs**                               |             |                                   |                           |
| `V1-VS-V2-QUICK-REFERENCE.md`                | CONSOLIDATE | → `schema-v1-vs-v2-guide.md`      |                           |
| `V1-VS-V2-SCHEMA-COMPARISON.md`              | CONSOLIDATE | → `schema-v1-vs-v2-guide.md`      |                           |
| `V1-TO-V2-CONVERTER-RESULTS.md`              | ARCHIVE     | `archived/v1-v2-migration/`       | Results log               |
| `V2-GRAPHQL-ENHANCEMENT-SUMMARY.md`          | ARCHIVE     | `archived/v1-v2-migration/`       | Enhancement log           |
| `schema_unification-v1-diagram.md`           | ARCHIVE     | `archived/v1-v2-migration/`       | V1 diagram                |
| `schema_unification-v2-diagram.md`           | CONSOLIDATE | → `schema-v1-vs-v2-guide.md`      | Embed diagram             |
|                                              |             |                                   |                           |
| **Schema Management**                        |             |                                   |                           |
| `schema-pipeline.md`                         | CONSOLIDATE | → `schema-pipeline-guide.md`      |                           |
| `schemaManagement.md`                        | CONSOLIDATE | → `schema-pipeline-guide.md`      |                           |
| `schema-tooling-alternatives.md`             | CONSOLIDATE | → `schema-tooling-reference.md`   |                           |
| `schema-todo.md`                             | ARCHIVE     | `archived/deprecated/`            | Outdated TODO             |
| `migration-to-json-schema-canonical.md`      | CONSOLIDATE | → `schema-pipeline-guide.md`      | Migration section         |
| `typeconv-evaluation-results.md`             | CONSOLIDATE | → `schema-tooling-reference.md`   |                           |
|                                              |             |                                   |                           |
| **System Mappings**                          |             |                                   |                           |
| `pertrified2contract_data.md`                | CONSOLIDATE | → `system-mappings-guide.md`      |                           |
| `pertrified2legacy_procurement.md`           | CONSOLIDATE | → `system-mappings-guide.md`      |                           |
| `pertrified2intake_process.md`               | CONSOLIDATE | → `system-mappings-guide.md`      |                           |
|                                              |             |                                   |                           |
| **External Systems**                         |             |                                   |                           |
| `fiscal.treasury.gov.md`                     | CONSOLIDATE | → `external-systems-reference.md` |                           |
| `deltalake.md`                               | CONSOLIDATE | → `external-systems-reference.md` |                           |
|                                              |             |                                   |                           |
| **Developer Guides**                         |             |                                   |                           |
| `PYTHON-VALIDATION-QUICK-START.md`           | RENAME      | `python-validation-guide.md`      | Lowercase                 |
| `SCHEMA-LINTING-GUIDE.md`                    | RENAME      | `schema-linting-guide.md`         | Lowercase                 |
| `Reporting-Use-Case-Implementation-Guide.md` | RENAME      | `reporting-guide.md`              | Simplified                |
|                                              |             |                                   |                           |
| **Implementation Logs**                      |             |                                   |                           |
| `BENCHMARK-SETUP-COMPLETE.md`                | ARCHIVE     | `archived/implementation-logs/`   |                           |
| `MERMAID-DIAGRAM-PAGES-IMPLEMENTATION.md`    | ARCHIVE     | `archived/implementation-logs/`   |                           |
| `SCHEMA-RESTRUCTURING-SUCCESS.md`            | ARCHIVE     | `archived/implementation-logs/`   |                           |
| `VOYAGER-V2-HINTED-IMPLEMENTATION.md`        | ARCHIVE     | `archived/implementation-logs/`   |                           |
|                                              |             |                                   |                           |
| **Transformation**                           |             |                                   |                           |
| `transformationRules.md`                     | CONSOLIDATE | → `schema-pipeline-guide.md`      | Rules section             |
| `transformationHistory.md`                   | ARCHIVE     | `archived/deprecated/`            | Historical                |
|                                              |             |                                   |                           |
| **ADRs**                                     |             |                                   |                           |
| `adr/*.md`                                   | KEEP        | `adr/*.md`                        | All ADRs preserved        |
|                                              |             |                                   |                           |
| **Assets**                                   |             |                                   |                           |
| `APIs/openapi.yaml`                          | KEEP        | `APIs/openapi.yaml`               |                           |
| `APIs/solicitation.xml`                      | KEEP        | `APIs/solicitation.xml`           |                           |
| `diagrams/schema_unification.svg`            | KEEP        | `diagrams/schema_unification.svg` |                           |
| `fiscal.treasury.gov.json`                   | KEEP        | `fiscal.treasury.gov.json`        | Reference data            |

### New Files to Create

1. `quick-start.md` — NEW 5-minute getting started
2. `schema-pipeline-guide.md` — CONSOLIDATION of 4 files
3. `schema-v1-vs-v2-guide.md` — CONSOLIDATION of 4 files
4. `schema-tooling-reference.md` — CONSOLIDATION of 2 files
5. `system-mappings-guide.md` — CONSOLIDATION of 3 files
6. `external-systems-reference.md` — CONSOLIDATION of 2 files
7. `docs/archived/README.md` — Archive explanation
8. `docs/archived/implementation-logs/README.md` — Logs index
9. `docs/archived/v1-v2-migration/README.md` — Migration index
10. `docs/archived/deprecated/README.md` — Deprecated index

---

**Document Count Summary:**

- **Current:** 38 markdown files
- **Target:** 15 core files + 4 ADRs + 4 archive READMEs = **23 total**
- **Reduction:** 39% fewer files, 60% reduction in core documentation

---

**End of Consolidation Plan**
