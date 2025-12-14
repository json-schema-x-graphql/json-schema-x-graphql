# Frontend Dashboard Migration

This directory contains the full Next.js application migrated from the `enterprise-schema-unification` repository (originally named `json-viewer`). It serves as a comprehensive dashboard for visualizing JSON Schemas, GraphQL schemas, and their conversions.

## Origin

- **Source:** `enterprise-schema-unification` (root directory)
- **Original Name:** `json-viewer`
- **Framework:** Next.js 14
- **Styling:** Tailwind CSS / Mantine

## Directory Structure

The contents of this directory mirror the root of the original repository, with the following key components:

- `src/`: Application source code (React components, pages, hooks).
- `public/`: Static assets.
- `package.json`: Original dependency definitions.
- `next.config.js`: Next.js configuration.

## Getting Started

### Prerequisites

The original project uses `pnpm`. Ensure you have it installed:

```bash
npm install -g pnpm
```

### Installation

Navigate to this directory and install dependencies:

```bash
cd frontend/dashboard
pnpm install
```

### Running Development Server

```bash
pnpm dev
```

The application should be available at `http://localhost:3000`.

## Integration Goals

The primary goal of migrating this dashboard is to integrate it with the `json-schema-x-graphql` core library.

1.  **Wasm Integration:** Replace the server-side Node.js conversion scripts with the `json-schema-x-graphql` Rust/Wasm converter.
2.  **Monorepo Structure:** Align the dependency management with the root `package.json` (likely moving towards a unified workspace or keeping this as a standalone package).
3.  **Feature Parity:** Ensure all visualization features (schema diffs, graph views) work with the new converter's output.

## Known Issues / TODOs

-   **Dependencies:** The `package.json` currently references `pnpm` and specific versions that might conflict with the root repo if merged into a single workspace.
-   **Scripts:** Many scripts in `package.json` reference paths like `dev/` or `docs/` which have been moved to different locations in this repo (`examples/` and `docs/reference-architecture/`). These scripts will need to be updated or removed.
-   **Environment:** Check `.env` requirements (if any) from the original repo.