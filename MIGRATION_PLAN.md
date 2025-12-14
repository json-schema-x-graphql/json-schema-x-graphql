# Migration Plan: enterprise-schema-unification to json-schema-x-graphql

This document outlines the strategy for migrating valuable assets, logic, and documentation from the `enterprise-schema-unification` repository (source) to the `json-schema-x-graphql` repository (target).

The source repository contains a mature "JSON Viewer" application with extensive schema management, conversion scripts, and documentation that served as the inspiration for this project. The goal is to consolidate these resources to accelerate the development of `json-schema-x-graphql`.

## Source Repository Analysis
**Path:** `/home/john/enterprise-schema-unification`
**Type:** Next.js Application (`json-viewer`)
**Key Assets:**
1.  **Real-world Schemas:** `src/data/*.schema.json` (Legacy Procurement, Contract Data, Logistics Mgmt, etc.) - Excellent test cases.
2.  **Conversion Logic:** `scripts/` contains Node.js scripts for JSON Schema <-> GraphQL SDL conversion, subgraph generation, and supergraph composition.
3.  **Frontend:** A Next.js application for visualizing schemas, diffs, and documentation.
4.  **Documentation:** Extensive architectural docs in `docs/`.
5.  **POCs:** Proofs of concept in `dev/pocs` (Mesh, Federation, etc.).

## Sanitization & Anonymization
To comply with security and privacy requirements, all migrated content has been sanitized to remove specific system names and use cases.
- **System Names:** Replaced with generic terms (e.g., `Legacy Procurement`, `Contract Data`, `Logistics Mgmt`).
- **Filenames:** Converted to kebab-case generic names (e.g., `assist.schema.json` -> `legacy-procurement.schema.json`).
- **Content:** References in code, documentation, and scripts have been updated to match the new generic terminology.

## Migration Phases

### Phase 1: Schema & Data Migration
*Goal: Populate the target repo with real-world test data.*

1.  **Create Directory:** `examples/real-world-schemas`
2.  **Copy Schemas:**
    *   Source: `src/data/*.schema.json`
    *   Target: `examples/real-world-schemas/`
3.  **Copy Generated Artifacts (Reference):**
    *   Source: `generated-schemas/subgraphs/*.graphql`
    *   Target: `examples/real-world-schemas/reference-output/`
    *   *Purpose:* These serve as the "gold standard" for testing our Rust/Wasm converter.

### Phase 2: Logic & Scripts Migration
*Goal: Preserve the original Node.js implementation for reference and comparison.*

1.  **Create Directory:** `scripts/legacy-reference`
2.  **Copy Key Scripts:**
    *   `scripts/generate-subgraph-sdl.mjs` (The core logic for JSON Schema -> GraphQL)
    *   `scripts/generate-graphql-json-schema.mjs`
    *   `scripts/validate-graphql-vs-jsonschema.mjs`
    *   `scripts/generate-supergraph.mjs`
3.  **Action:** Analyze `generate-subgraph-sdl.mjs` to ensure the Rust implementation covers all edge cases handled in this script (e.g., `oneOf`, `allOf`, custom directives).

### Phase 3: Documentation Migration
*Goal: Centralize knowledge.*

1.  **Create Directory:** `docs/reference-architecture`
2.  **Copy Docs:**
    *   `docs/schema/` -> `docs/reference-architecture/schema-management`
    *   `docs/adr/` -> `docs/reference-architecture/adr`
    *   `docs/diagrams/` -> `docs/reference-architecture/diagrams`
3.  **Update Context:** Add a README in `docs/reference-architecture` explaining that these docs come from the prototype project.

### Phase 4: Frontend Application Migration
*Goal: Replace the placeholder frontend with the mature Next.js application.*

The current `json-schema-x-graphql/frontend` seems to be a mix of demos. The source repo is a full Next.js app.

1.  **Strategy:** We will treat the source `json-viewer` as the new `frontend/dashboard` application.
2.  **Steps:**
    *   Create `frontend/dashboard`.
    *   Copy the root configuration files (`package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts` if exists) from source to `frontend/dashboard`.
    *   Copy `src/` from source to `frontend/dashboard/src`.
    *   Copy `public/` from source to `frontend/dashboard/public`.
    *   **Cleanup:** Remove `dev/` and `docs/` from the copied frontend structure (since we moved docs separately).
3.  **Integration:**
    *   Update `frontend/dashboard/package.json` to reference the local Wasm build of `json-schema-x-graphql` instead of relying solely on server-side scripts.
    *   Modify the Next.js app to demonstrate the *new* Rust converter alongside the old logic.

### Phase 5: Proofs of Concept (POCs)
*Goal: Preserve research on Federation and Mesh.*

1.  **Create Directory:** `examples/pocs`
2.  **Copy:**
    *   `dev/pocs/graphql-mesh` -> `examples/pocs/graphql-mesh`
    *   `dev/pocs/mockforge` -> `examples/pocs/mockforge` (Useful for mocking data based on schemas)
    *   `dev/hasura-ddn` -> `examples/hasura-ddn-reference`

## Execution Checklist

- [x] **Step 1:** Create folder structures in `json-schema-x-graphql`.
- [x] **Step 2:** Copy `src/data` schemas to `examples/real-world-schemas`.
- [x] **Step 3:** Copy `scripts/*.mjs` to `scripts/legacy-reference`.
- [x] **Step 4:** Copy `docs/` content to `docs/reference-architecture`.
- [x] **Step 5:** Port the Next.js app to `frontend/dashboard`.
- [x] **Step 6:** Sanitize all migrated content (filenames and text) to remove specific system references.
- [ ] **Step 7:** Update `frontend/dashboard/package.json` dependencies to match the monorepo structure if necessary.
- [ ] **Step 8:** Commit and verify.

## Notes on Dependencies
The source repo uses `pnpm`. The target repo uses `npm` (based on `package.json`).
*   **Decision:** When migrating the frontend, we should generate a `package-lock.json` for consistency with the target repo, or switch the target repo to `pnpm` workspaces if the frontend dependencies are complex. For now, we will attempt to stick to `npm` in the migrated frontend folder.