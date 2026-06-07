# feat(frontend): add federation ER diagram visualization to subgraph-composer

**Branch:** `feat/20-federation-er-diagram`
**Base:** `main`

## Summary

Adds a custom entity-relationship diagram visualization for Apollo Federation concepts using `@xyflow/react`.

## Changes

- **New `ERDiagramPanel` component** (`frontend/subgraph-composer/src/components/ERDiagramPanel.jsx`)
  - React Flow canvas with subgraph swimlanes
  - Entity cards with federation directive badges
  - Relationship edges styled by directive type
  - Mermaid ER diagram export
- **New `ERDiagramNode` component** (`frontend/subgraph-composer/src/components/ERDiagramNode.jsx`)
  - Custom node type with field list and badge styling
  - Color-coded headers by subgraph origin
  - `@external` fields styled with dashed border and reduced opacity
- **New `erDiagramParser.js`** (`frontend/subgraph-composer/src/lib/erDiagramParser.js`)
  - Parses GraphQL SDL into nodes/edges with federation metadata
  - Handles `type implements` syntax
  - Generates Mermaid ER syntax for static export
  - Two-pass layout for subgraph swimlanes
- **Third tab** in `App.jsx`: Preview / Visualize / ER Diagram
- **Lazy loading** of ERDiagramPanel to avoid bundling `@xyflow/react` on initial render
- **Tests**: `erDiagram.test.js` (parser tests) and `erDiagramPanel.test.jsx` (component tests)

## Verification

- `pnpm test` in `frontend/subgraph-composer` → 188 tests pass
- `pnpm build` → builds successfully (ERDiagramPanel chunk ~185KB, lazy-loaded)

## Review Notes

- Reviewer identified and fixed: parser `implements` support, Mermaid array bracket stripping, `@external` styling, swimlane legend pointer-events, unused prop cleanup.
- Remaining items for follow-up: docs page for ER analogy, static Mermaid pipeline, `@key` cross-subgraph arrows as explicit FK edges.

## Related

- Closes #20
- ADR 0010: `docs/adr/0010-visual-editor-design.md`
- Related: #19 (graphql-voyager) — both PRs should be merged together; App.jsx will need conflict resolution to include both tabs.
