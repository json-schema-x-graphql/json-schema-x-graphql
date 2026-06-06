# 0010: Visual Editor Design for Federated Subgraph ERD

Date: 2026-06-05

## Status

Accepted

## Context

As the `json-schema-x-graphql` subgraph composer grows, users need a visual way to understand:
- Which types belong to which subgraph
- How cross-subgraph entity references (`@key`, `@external`) connect
- How federation directives (`@provides`, `@requires`, `@shareable`) affect data flow

The challenge is finding the "sweet spot" between a powerful, explicit view (where developers can edit and resolve data links) and a streamlined, decluttered view (where navigating a massive enterprise supergraph doesn't overwhelm cognition).

## Decision

Adopt a **dual-visualization strategy** for the subgraph composer:

1. **graphql-voyager integration** (Issue #19) — immediate, interactive force-directed graph view of any introspection result
2. **Custom ER diagram view** (Issue #20) — domain-specific notation that maps federation concepts to familiar database/ORM entity-relationship concepts

### Visual Design System

#### 1. Subgraph Domain Boundaries
- **Dashed bounding boxes with semi-transparent background shading** for each subgraph
- Entities owned by a domain live inside its zone
- Extending domains show "proxy nodes" of entities owned elsewhere
- Inspiration: RAG architecture diagrams that separate functional domains without boxing in data flow

#### 2. Entity and Field Representation
- Structured card/table nodes with solid-color header matching the owning domain
- Field names aligned left, data types as muted text right
- Collapsible node structures to reduce noise

#### 3. Directive Badges
Replace verbose text directives with interactive visual badges:
- **`@key`**: Gold key icon (primary identifier)
- **`@external`**: Hollow dashed-outline pill (borrowed field)
- **`@requires` & `@provides`**: Brightly colored pills (purple and green) on dark mode
- **Hover states** reveal underlying arguments for dynamic editing

#### 4. Dynamic Linkages
- **Smooth Bezier curves** connecting specific fields across nodes (not just table-to-table)
- **Solid arrow** = `@key` reference (owns/defines)
- **Dashed arrow** = `@external` reference (borrows/depends)
- **Double-headed arrow** = `@shareable` (multiple owners)
- **Dotted arrow with label** = `@requires` dependency

### Elements to Include vs. Exclude

**INCLUDE (explicit control):**
1. Field-level edge routing (drag lines from `@requires` to `@external`)
2. Interactive directive badges with hover states
3. Cross-domain color slivers on primary entity cards (show which subgraphs extend it)
4. Real-time composition validation indicators (red error highlights on invalid edges)

**EXCLUDE (streamlined UI):**
1. Verbose scalar type definitions by default (hide `String`, `Int`, `Boolean` unless clicked)
2. Boilerplate/implicit directives (`@shareable` by default, `x-graphql-field-name` extensions)
3. "Spaghetti" cross-domain wiring (collapse into thick domain-to-domain pipelines by default; expand on click)
4. Underlying data source mapping (don't show REST endpoints or DB tables on the ERD canvas)

## Consequences

### Positive
- **Immediate readability**: Database-minded developers understand federation through familiar ER concepts
- **Progressive disclosure**: Power users get field-level editing; casual users see clean domain boundaries
- **Consistent with x-graphql metadata**: The `x-graphql-federation` JSON Schema key already carries all required metadata
- **Two implementations share one design**: Both voyager and ER views use the same color system and subgraph metadata

### Negative
- **Two implementations to maintain**: Both voyager and custom ER view require ongoing maintenance
- **React Flow bundle size**: Custom ER view adds `@xyflow/react` dependency
- **Color system must stay stable**: Changing subgraph colors breaks user's mental model

### Tradeoffs
- **Mermaid for docs**: Static `erDiagram` blocks generated from SDL for documentation pages (zero JS dependency)
- **React Flow for interactive UI**: Embedded directly in `frontend/subgraph-composer` as a second visualizer tab

## Implementation Strategy

### Phase 1: graphql-voyager (Issue #19) — Completed
- Add `graphql-voyager` as lazy-loaded dependency
- Feed composed supergraph SDL through `sdlToSchema` → `<Voyager>`
- Toggle between Supergraph and Per-Subgraph views
- Subgraph color-coding via injected CSS overrides

### Phase 2: Custom ER Diagram (Issue #20) — Pending
- Add `@xyflow/react` to subgraph-composer
- Define `EntityCard` node type with PK/FK badges
- Implement subgraph swimlanes
- Generate Mermaid `erDiagram` blocks for docs

### Phase 3: Unified Design Polish
- Normalize color palette between voyager and ER views
- Add composition validation highlights to both views
- Cross-domain sliver indicators on entity cards

## References

- Issue #19: `feat(editor): supergraph/subgraph visualization with graphql-voyager`
- Issue #20: `feat(editor): x-graphql federation concepts as ER/entity-relationship diagram`
- Issue #85: `Visual Editor Design Guide` (superseded by this ADR)
- React Flow: https://reactflow.dev/
- Mermaid ER docs: https://mermaid.js.org/syntax/entityRelationshipDiagram.html
- graphql-voyager: https://github.com/APIs-guru/graphql-voyager
