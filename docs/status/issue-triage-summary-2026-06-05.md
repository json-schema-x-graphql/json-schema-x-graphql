# Issue Triage Summary — 2026-06-05

## Actions Taken

### ADRs Created
| Issue | Action | New Document |
|-------|--------|--------------|
| #85 | Converted to ADR | `docs/adr/0010-visual-editor-design.md` |
| #84 | Converted to ADR | `docs/adr/0012-caching-and-schema-evolution.md` |
| #83 | Converted to ADR | `docs/adr/0011-fine-grained-authorization.md` |
| #82 | Converted to docs page | `docs/concepts/data-engineering-federation-mapping.md` |

### Proposed Comments for GitHub Issues

#### Issue #85 — Visual Editor Design Guide
> This design guide has been consolidated into ADR 0010: Visual Editor Design for Federated Subgraph ERD.
> 
> → `docs/adr/0010-visual-editor-design.md`
> 
> The ADR establishes the dual-visualization strategy (graphql-voyager + custom ER diagram) and the visual design system. Implementation is tracked in #19 (voyager) and #20 (ER diagram).
> 
> **Proposed action:** Close this issue as the design work is now captured in the ADR.

#### Issue #84 — Subgraph Independence / Caching
> This architectural proposal has been consolidated into ADR 0012: Dynamic Caching, Schema Drift Detection, and Independent Subgraph Evolution.
> 
> → `docs/adr/0012-caching-and-schema-evolution.md`
> 
> The ADR breaks the proposal into three pillars (Cache Layer, Schema Management System, Independent Subgraph Evolution) with phased implementation strategy.
> 
> **Proposed action:** Close this issue as the architecture is now captured in the ADR. Future implementation work will be tracked as child issues under the epic.

#### Issue #83 — OpenFGA / RBAC
> This security proposal has been consolidated into ADR 0011: Fine-Grained Authorization via @policy Directive and OpenFGA.
> 
> → `docs/adr/0011-fine-grained-authorization.md`
> 
> The ADR documents the three-layer authorization architecture. The converter already supports `@policy` (commit f414f51). The remaining work is the router plugin and validation tooling.
> 
> **Proposed action:** Close this issue as the design is now captured in the ADR.

#### Issue #82 — ELI5 / Data Engineering Mapping
> This conceptual explainer has been converted into a permanent docs page.
> 
> → `docs/concepts/data-engineering-federation-mapping.md`
> 
> The page maps canonical data models, provenance, survivorship, joins, and transformations to their GraphQL Federation equivalents with a quick-reference table.
> 
> **Proposed action:** Close this issue as the content is now in the docs.

#### Issue #60 — Review Visualization Editors
> **Proposed action:** Close as superseded by #19 (graphql-voyager) and #20 (federation ER diagram). The ADR 0010 documents the chosen visualization strategy.

#### Issue #44 — Standard Schema
> **Proposed action:** Convert to a spike issue for a proof-of-concept adapter. Standard Schema is an emerging spec with high future value.

#### Issue #43 — simdjson
> **Proposed action:** Label `research` + `performance` and close or backlog. Only relevant if JSON parsing becomes a bottleneck.

#### Issue #41 — Zod Schema
> **Proposed action:** Label `research` and close or backlog. Overlaps with core converter mission but could be a future plugin.

### Deferred Issues Grouping
Issues #7–#17 should be grouped into a single epic: **"v2.1 Ecosystem Rehydration"**

## Implementation Status

### Completed (via subagents)
- **#19 (graphql-voyager):** Implementation complete in `frontend/subgraph-composer`. VoyagerPanel component, lazy loading, tab integration, subgraph color-coding, tests passing.
- **Node converter fixes:** Circular reference protection, enhanced `$ref` resolution with case fallback, `$defs` extraction verification. 158 tests passing.

### Remaining
- **Docs page for voyager:** `website/pages/docs/internals/voyager.mdx` (not yet created)
- **Build verification:** `pnpm build` in `frontend/subgraph-composer` (not yet run)
- **ER diagram (#20):** Not yet started
- **Router plugin (ADR 0011):** Not yet started
- **Cache layer (ADR 0012):** Not yet started
