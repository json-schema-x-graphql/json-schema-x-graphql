# Legacy Directory Removal Notice

**Date:** December 4, 2025

## This Directory Has Been Superseded

The `src/data/supgraphs/` directory contained legacy Contract Data schema files that have been superseded by the current architecture.

### What Was Here

- `contract_data.graphql` - Legacy GraphQL SDL (242 lines)
- `contract_data.schema.json` - Legacy JSON Schema (242 lines)

### Why Removed

1. **Superseded by canonical schema** - `src/data/contract_data.schema.json` (720 lines) is the current authoritative source
2. **Generated SDL location changed** - All subgraph SDL now lives in `generated-schemas/contract_data.subgraph.graphql`
3. **Conflicting with current architecture** - x-graphql annotations are single source of truth, not manual SDL files

### Current Architecture

**Canonical Source:**

```plaintext
src/data/contract_data.schema.json (720 lines)
```

**Generated Output:**

```plaintext
generated-schemas/contract_data.subgraph.graphql
generated-schemas/contract_data.from-json.graphql
```

**Website Consumption:**

```plaintext
src/data/generated/ (CI auto-populated mirror)
```

### Migration Notes

The legacy `supgraphs/contract_data.schema.json` was significantly different from the current canonical schema:

- Old: 242 lines, draft-07, focused on contract identification
- New: 720 lines, draft-2020-12, comprehensive Contract Data coverage with 600+ fields

All unique content from the legacy schema was evaluated and incorporated into the canonical schema where appropriate.

## For Historical Reference

If you need to see the legacy schemas, they are preserved in:

- `src/data/archived/` directory
- Git history: `git log --all --full-history -- src/data/supgraphs/`

## Questions?

See:

- `src/data/README.md` - Current architecture documentation
- `docs/SCHEMA-ARCHITECTURE.md` - Schema organization guide
- `docs/CLEANUP-PLAN-src-data.md` - Full cleanup plan and rationale
