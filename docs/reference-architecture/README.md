# Docs Index

This repository's documentation is file-driven under the `docs/` folder. Generate a `docs-index.json` with `node scripts/generate-docs-index.mjs`.

# Documentation System

This directory contains all documentation files for the Schema Unification Forest project. All markdown files (`.md`) in this directory and its subdirectories are automatically converted to static pages accessible via the `/docs/` URL path.

## How It Works

### Automatic Page Generation

The documentation system uses Next.js's **dynamic routing** with a catch-all route (`[...slug].tsx`) to automatically generate static pages for every markdown file in the `/docs` directory.

**Example:**

- `docs/why.md` → `/docs/why`
- `docs/adr/0001-schema-driven-data-contract.md` → `/docs/adr/0001-schema-driven-data-contract`
- `docs/GRAPHQL-SCHEMA-ANALYSIS-AND-STRATEGY.md` → `/docs/GRAPHQL-SCHEMA-ANALYSIS-AND-STRATEGY`

### Build Process

At build time (`pnpm build`), Next.js will:

1. **Scan** the `/docs` directory recursively for all `.md` files
2. **Generate** static HTML pages for each markdown file
3. **Parse** any frontmatter (YAML metadata at the top of markdown files)
4. **Render** the markdown content with full styling and formatting

### Features

✅ **Automatic Discovery** - Just add a `.md` file to `/docs` and it's immediately available
✅ **Nested Directories** - Organize docs in folders, the URL path matches the file structure
✅ **Frontmatter Support** - Add metadata like title and description using YAML frontmatter
✅ **Rich Formatting** - Tables, code blocks, lists, links, images all fully styled
✅ **GitHub Flavored Markdown** - Extended markdown features like task lists and strikethrough
✅ **SEO Optimized** - Automatic meta tags, Open Graph tags, and canonical URLs

## Frontmatter

You can add optional metadata to the top of any markdown file using YAML frontmatter:

```markdown
---
title: My Custom Page Title
description: A brief description for SEO and social sharing
---

# Your content starts here
```

If no frontmatter is provided, the system will automatically generate a title from the file path.

## Styling

The markdown is rendered with custom styling that includes:

- **Headers** - Clear hierarchy with bottom borders for H1 and H2
- **Code Blocks** - Syntax highlighted with light gray background
- **Tables** - Alternating row colors with borders
- **Links** - Underline on hover, blue color
- **Blockquotes** - Green left border with gray background
- **Lists** - Proper indentation and spacing

## File Organization

Active documentation structure (archived items excluded):

> NOTE: Historical and superseded documents have been moved under `docs/archived/`. Refer to `docs/archived/README.md` for the archive index. The tree below lists only active guides and references.

```text
docs/
├── README.md                                    (this file)
├── adr/                                         (Architecture Decision Records)
│   ├── 0001-schema-driven-data-contract.md
│   ├── 0002-schema-tooling-automation.md
│   ├── 0003-visual-communication-layer.md
│   └── 0004-graphql-gateway-selection.md
├── schema/                                      (Schema Design & Pipeline)
│   ├── schema-pipeline-guide.md                 (Schema generation & validation)
│   ├── schema-v1-vs-v2-guide.md                 (V1 vs V2 overview & migration)
│   ├── schema-tooling-reference.md              (Tooling, APIs, tests, CI)
│   ├── schema-linting-guide.md                  (Linting and quality checks)
│   ├── x-graphql-hints-guide.md                 (Hints reference)
│   └── x-graphql-quick-reference.md             (Hints quick lookup)
├── mappings/                                    (System Mappings)
│   └── system-mappings-guide.md                 (Contract Data/Legacy Procurement/EASi mappings)
├── process/                                     (Process & Planning)
│   ├── quick-start.md                           (Getting started)
│   ├── business-plan.md                         (Project planning)
│   └── why.md                                   (Project rationale)
├── implementation/                              (Implementation Details)
│   ├── python-validation-guide.md               (Python validators)
│   └── reporting-guide.md                       (Reporting use cases)
├── external/                                    (External Systems)
│   └── README.md                                (External Systems Reference)
├── diagrams/                                    (Diagrams & Visuals)
│   └── schema_unification-v2-diagram.md                  (ERD & Schema Visualization)
└── examples/                                    (Live usage examples)
    └── validator-usage.md                       (Validator usage recipes)

(Archived documents live under: docs/archived/)
```

## Adding New Documentation

To add new documentation:

1. **Create a markdown file** in the `/docs` directory or subdirectory
2. **Optionally add frontmatter** for custom title/description
3. **Write your content** using markdown syntax
4. **Commit the file** - that's it! The page will be automatically available

Example:

```bash
# Create a new documentation file
echo "# My New Doc\n\nContent here..." > docs/my-new-doc.md

# The page is now available at /docs/my-new-doc
```

## Linking to Documentation

### From the Homepage

Documentation links are available in Section1 of the landing page, organized into categorized cards:

- **Architecture Decisions** (ADRs)
- **Schema Documentation**
- **System Mappings**
- **Implementation Details**
- **Process & History**
- **External Systems**

### From Other Pages

Link to documentation using standard Next.js `Link` component or regular anchor tags:

```tsx
import Link from "next/link";

<Link href="/docs/why">Why Schema Unification Forest?</Link>

// Or with anchor tag
<a href="/docs/adr/0001-schema-driven-data-contract">ADR 0001</a>
```

## Technical Implementation

### Files

- **`src/pages/docs/[...slug].tsx`** - Dynamic catch-all route that handles all `/docs/*` URLs
- **`src/components/MarkdownPage/index.tsx`** - Reusable component for rendering markdown with styling

### Dependencies

- **`react-markdown`** - Converts markdown to React components
- **`remark-gfm`** - GitHub Flavored Markdown support
- **`rehype-raw`** - Allows raw HTML in markdown
- **`rehype-sanitize`** - Sanitizes HTML for security
- **`gray-matter`** - Parses YAML frontmatter from markdown files

### Build-Time Generation

The `getStaticPaths` function recursively scans the `/docs` directory at build time to generate paths for all markdown files. This means:

1. **Zero runtime overhead** - All pages are pre-rendered as static HTML
2. **Fast page loads** - No markdown parsing at runtime
3. **SEO friendly** - Search engines can crawl all content
4. **Serverless compatible** - Works on CDNs and static hosting

## Deployment

When deploying:

1. **Development** - Pages are generated on-demand in dev mode (`pnpm dev`)
2. **Production** - All pages are pre-generated at build time (`pnpm build`)
3. **Static Export** - Compatible with `next export` for pure static hosting

## Best Practices

1. **Use descriptive filenames** - The filename becomes part of the URL
2. **Add frontmatter** - Provide custom titles and descriptions for better SEO
3. **Organize by topic** - Use subdirectories to group related documentation
4. **Link between docs** - Create a web of interconnected documentation
5. **Keep URLs stable** - Avoid renaming files to prevent broken links

## Maintenance

The documentation system requires no maintenance - just add markdown files and they're automatically available. The system handles:

- Recursive directory scanning
- Static page generation
- Markdown rendering
- SEO meta tags
- Responsive styling

## Examples

### Basic Markdown File

```markdown
# Getting Started

Welcome to Schema Unification Forest! This guide will help you get started.

## Prerequisites

- Node.js 18+
- pnpm

## Installation

\`\`\`bash
pnpm install
\`\`\`
```

### With Frontmatter

```markdown
---
title: Getting Started with Schema Unification Forest
description: A comprehensive guide to setting up and using Schema Unification Forest
---

# Getting Started

Content here...
```

## Support

For questions or issues with the documentation system, please open an issue on GitHub or contact the TTS team.
