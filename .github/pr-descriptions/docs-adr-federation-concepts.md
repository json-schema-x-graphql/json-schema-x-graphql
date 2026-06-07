# docs: add ADRs for federation visualization, authorization, and caching

**Branch:** `docs/adr-federation-concepts`
**Base:** `main`

## Summary

Converts four high-quality "essay" issues into permanent ADRs and documentation pages.

## Documents Added

| Document                                               | From Issue | Description                                                       |
| ------------------------------------------------------ | ---------- | ----------------------------------------------------------------- |
| `docs/adr/0010-visual-editor-design.md`                | #85        | Dual-visualization strategy (graphql-voyager + custom ER diagram) |
| `docs/adr/0011-fine-grained-authorization.md`          | #83        | Three-layer auth architecture (Schema → Router → OpenFGA)         |
| `docs/adr/0012-caching-and-schema-evolution.md`        | #84        | Three-pillar architecture (Cache + Schema Management + Evolution) |
| `docs/concepts/data-engineering-federation-mapping.md` | #82        | Data engineering concepts mapped to GraphQL Federation            |
| `docs/status/issue-triage-summary-2026-06-05.md`       | —          | Proposed actions for each open issue                              |

## Related

- Closes #82, #83, #84, #85
