# Documentation Archive

This directory contains historical documentation that has been superseded by consolidated guides or is no longer actively maintained.

---

## Purpose

These documents are preserved for:
- **Historical context** — Understanding how the project evolved
- **Decision tracking** — Seeing why certain approaches were taken
- **Troubleshooting reference** — Diagnosing similar issues in the future
- **Audit trail** — Maintaining complete project history

**Important:** These documents are **not actively maintained**. For current documentation, see the main [docs directory](../README.md).

---

## Archive Organization

### [`implementation-logs/`](implementation-logs/)
Feature implementation logs and completion reports from various development phases.

**Examples:**
- Benchmark setup
- GraphQL converter bug fixes
- Voyager page implementations
- Schema restructuring results

**Use when:** You need to understand how a specific feature was implemented or what issues were encountered.

### [`v1-v2-migration/`](v1-v2-migration/)
Documentation related to the migration from V1 to V2 schema architecture.

**Examples:**
- Conversion results
- Enhancement summaries
- Migration guides (historical)
- V1 diagrams

**Use when:** You need to understand the V1/V2 transition history or troubleshoot migration-related issues.

### [`deprecated/`](deprecated/)
Documentation that has been superseded by newer, consolidated guides.

**Examples:**
- Old TODO lists
- Preliminary analysis documents
- Superseded user guides
- Outdated transformation history

**Use when:** You need to reference old approaches or understand what changed between documentation versions.

---

## Finding Current Documentation

For up-to-date documentation, see:

### Core Documentation
- **[Main Docs README](../README.md)** — Complete documentation index
- **[Quick Start Guide](../quick-start.md)** — Get started in 5 minutes
- **[Schema Pipeline Guide](../schema-pipeline-guide.md)** — Schema generation and validation

### Reference Guides
- **[x-graphql Hints Guide](../x-graphql-hints-guide.md)** — Comprehensive GraphQL hints reference
- **[Schema V1 vs V2 Guide](../schema-v1-vs-v2-guide.md)** — Current comparison and migration guide
- **[System Mappings Guide](../system-mappings-guide.md)** — Contract Data, Legacy Procurement, EASi mappings

---

## Archive Policy

### What Gets Archived?

Documents are archived when they:
- Are **implementation logs** or completion reports (historical record, not user guide)
- Have been **superseded** by consolidated guides
- Are specific to **outdated versions** or approaches
- Are **TODO lists** or planning docs that are no longer current

### What Stays Active?

Documents remain active when they:
- Provide **current reference** material
- Are **user guides** with up-to-date information
- Document **architectural decisions** (ADRs)
- Serve as **quick references** or lookup tables

### Archive Process

When a document is archived:
1. ✅ File is moved to appropriate archive subdirectory
2. ✅ ARCHIVED notice is added to top of file
3. ✅ Cross-references are updated to point to current guides
4. ✅ Archive index is updated (this README)

---

## Archive Index

### Implementation Logs (6 files)
- `BENCHMARK-SETUP-COMPLETE.md` — Benchmark infrastructure setup completion
- `GRAPHQL-CONVERTER-BUG-FIXES.md` — GraphQL converter debugging and fixes
- `GRAPHQL-VOYAGER-PAGES.md` — Voyager visualization page implementation
- `MERMAID-DIAGRAM-PAGES-IMPLEMENTATION.md` — Mermaid diagram integration
- `SCHEMA-RESTRUCTURING-SUCCESS.md` — Schema restructuring completion report
- `VOYAGER-V2-HINTED-IMPLEMENTATION.md` — V2 schema Voyager implementation

### V1/V2 Migration (4 files)
- `V1-TO-V2-CONVERTER-RESULTS.md` — V1 to V2 conversion results and analysis
- `V2-GRAPHQL-ENHANCEMENT-SUMMARY.md` — V2 GraphQL enhancements summary
- `migration-to-json-schema-canonical.md` — Migration to canonical JSON Schema
- `schema_unification-v1-diagram.md` — V1 schema architecture diagram

### Deprecated (4 files)
- `schema-todo.md` — Outdated TODO list
- `GRAPHQL-SCHEMA-ANALYSIS-AND-STRATEGY.md` — Preliminary GraphQL analysis
- `graphql-extensions-guide.md` — Superseded by x-graphql-hints-guide.md
- `transformationHistory.md` — Historical transformation notes

**Total Archived:** 14 files

---

## Accessing Archived Content

### Via Git History
All archived documents remain accessible in Git history:
```bash
# View file history
git log -- docs/archived/implementation-logs/BENCHMARK-SETUP-COMPLETE.md

# View file at specific commit
git show <commit-hash>:docs/BENCHMARK-SETUP-COMPLETE.md
```

### Via Archive Directory
Simply browse to the appropriate subdirectory:
```bash
cd docs/archived/implementation-logs
ls -la
```

---

## Contributing to Archive

If you need to archive a document:

1. **Verify it should be archived** — Check [archive policy](#archive-policy)
2. **Move to correct subdirectory** — implementation-logs, v1-v2-migration, or deprecated
3. **Add ARCHIVED notice** — Use template below
4. **Update cross-references** — Point to current guides
5. **Update this README** — Add to archive index

### ARCHIVED Notice Template

Add to the top of archived files:

```markdown
> **⚠️ ARCHIVED DOCUMENTATION**
> 
> This document has been archived and is preserved for historical reference only.
> 
> **See instead:** [Current Guide Name](../current-guide.md)
> 
> **Archived:** December 2024  
> **Reason:** [Brief reason for archiving]
```

---

## Questions?

- **Can't find something?** Check the [main docs README](../README.md) or search Git history
- **Need to reference archived content?** That's fine! Just note it's historical
- **Found outdated active docs?** Open an issue or PR to archive them

---

**Archive Established:** December 2024  
**Last Updated:** December 2024

**Archived Document Count:** 14 files  
**Active Document Count:** ~15 core files