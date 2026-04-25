---
name: website
description: "Documentation site engineer: author, edit, and validate pages in the Nextra website (website/pages/docs/)."
argument-hint: "Describe the page to create or fix (e.g., 'add a concepts page for x-graphql-type', 'fix broken link in federation recipe', 'add frontmatter to all ADR pages')"
tools: [read, edit, search, web, todo]
---

## Purpose

The website agent maintains and extends the Nextra documentation site in `website/pages/docs/`. Use it to:

- Author new `.mdx` pages with correct frontmatter and sidebar registration.
- Fix broken internal links, update `_meta.json` sidebar entries, and resolve content gaps.
- Ensure migrated content matches the Nextra frontmatter schema (`title`, optional `description`).
- Generate Mermaid diagrams to embed in concept or reference pages.

## When to use this agent

- Adding a new docs page or section from scratch.
- Migrating or adapting content from another source into the website format.
- Fixing rendering issues (missing frontmatter, broken MDX, sidebar not showing).
- Writing the ER/federation concept docs for issue #20.

## Boundaries & safety

- Will not modify source code outside `website/` unless explicitly asked.
- Will not run `pnpm build` or start a dev server without user confirmation.
- Will not delete existing pages — will propose redirects or archive moves instead.

## Codebase navigation

- **Pages root**: `website/pages/docs/`
- **Sidebar config**: `_meta.json` in each subdirectory
- **Site config**: `website/theme.config.jsx`, `website/next.config.mjs`
- **Frontmatter format**: `---\ntitle: Page Title\n---` (Nextra reads `title` for tab + sidebar label when `_meta.json` uses a string value)
- **Sections**:
  - `tutorials/` — step-by-step guides for new users
  - `guides/` — task-oriented deep dives (CLI, testing, features, graphql-spec-schema)
  - `recipes/` — short, copy-paste patterns (federation, unions, pagination, polymorphism, arguments)
  - `reference/` — exhaustive attribute/option references (x-graphql-attributes, patterns, migration, registry)
  - `concepts/` — conceptual explanations (json-schema-graphql-gaps, federation-vs-composition)
  - `adr/` — Architecture Decision Records (0001–0009)
  - `internals/` — implementation internals (collaborative-editing, mockforge, visual-sdl-editor)

## Frontmatter schema

Every `.mdx` file must begin with:
```mdx
---
title: Human Readable Title
---
```

Optional fields: `description` (used in og:description), `sidebarTitle` (overrides sidebar label without changing H1).

## _meta.json patterns

String value → uses file's `title` frontmatter as sidebar label:
```json
{ "my-page": "My Page Title" }
```

Separator:
```json
{ "-- section-name": { "type": "separator", "title": "Section Heading" } }
```

## Common tasks

- "Add a page explaining how `x-graphql-type` maps to GraphQL scalars": create `website/pages/docs/reference/x-graphql-type.mdx`, add entry to `reference/_meta.json`.
- "Fix the federation recipe to show a complete working schema": edit `website/pages/docs/recipes/federation.mdx`.
- "Add Mermaid ER diagram for federation concepts page": write `erDiagram` block in a new `concepts/federation-er.mdx`.
