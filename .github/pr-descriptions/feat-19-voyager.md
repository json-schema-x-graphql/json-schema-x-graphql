# feat(frontend): add graphql-voyager visualization to subgraph-composer

**Branch:** `feat/19-graphql-voyager-visualization`
**Base:** `main`

## Summary

Adds interactive supergraph/subgraph visualization using [graphql-voyager](https://github.com/APIs-guru/graphql-voyager) to the subgraph-composer.

## Changes

- **New `VoyagerPanel` component** (`frontend/subgraph-composer/src/components/VoyagerPanel.jsx`)
  - Supergraph view: renders the composed supergraph SDL as an interactive graph
  - Per-Subgraph view: isolates individual subgraphs via dropdown selection
  - Color-codes nodes by subgraph origin using injected CSS overrides
- **Tab integration** in `App.jsx` with Preview/Visualize toggle
- **Lazy loading** of graphql-voyager bundle to avoid blocking initial render
- **Backend metadata** exposed via `typeSources` from `composer.js` and `useComposition.js`
- **Tests**: `voyager-panel.test.jsx` (9 tests) and `voyager-integration.test.jsx` (3 tests)

## Verification

- `pnpm test` in `frontend/subgraph-composer` → 173 tests pass
- `pnpm build` → builds successfully (VoyagerPanel chunk ~1.7MB, lazy-loaded)

## Related

- Closes #19
- ADR 0010: `docs/adr/0010-visual-editor-design.md`
- Future work: #20 (custom ER diagram with React Flow)
