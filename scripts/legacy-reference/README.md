# Scripts overview

This document lists the npm/pnpm scripts exposed by the project and the important JS/MJS helper scripts under `scripts/`. It also contains a prioritized TODO checklist for reviewing, testing, and improving the scripts and their usage.

## Quick summary

- Primary purpose: schema tooling (JSON Schema ↔ GraphQL interop), validation, plus standard Next.js app scripts (dev/build/test/lint).
- Important combined commands:
  - `pnpm run validate:all` — runs the full validation pipeline (schema validation, GraphQL sync checks, sync strict check).
  - `pnpm run generate:schema:interop` — regenerates interop artifacts (GraphQL → JSON Schema and JSON Schema → GraphQL, including the v2 generator).

## NPM / PNPM scripts (from `package.json`)

Below are the scripts available via `pnpm run` and what they do.

- dev
  - Command: `next dev`
  - Purpose: Run the Next.js dev server for local UI development.

- build
  - Command: `NODE_OPTIONS='--max-old-space-size=4096' next build`
  - Purpose: Build the Next.js app (increases Node memory for large builds).

- postbuild
  - Command: `next-sitemap --config next-sitemap.config.js`
  - Purpose: Generate sitemaps after a successful build.

- start
  - Command: `next start`
  # Scripts overview

  This document lists the npm/pnpm scripts exposed by the project and the important JS/MJS helper scripts under `scripts/`. It also contains a prioritized TODO checklist for reviewing, testing, and improving the scripts and their usage.

  ## Quick summary

  - Primary purpose: schema tooling (JSON Schema ↔ GraphQL interop), validation, plus standard Next.js app scripts (dev/build/test/lint).
  - Important combined commands:
    - `pnpm run validate:all` — runs the full validation pipeline (schema validation, GraphQL sync checks, sync strict check).
    - `pnpm run generate:schema:interop` — regenerates interop artifacts (GraphQL → JSON Schema and JSON Schema → GraphQL, including the v2 generator).

  ## NPM / PNPM scripts (from `package.json`)

  Below are the scripts available via `pnpm run` and what they do.

  - dev
    - Command: `next dev`
    - Purpose: Run the Next.js dev server for local UI development.

  - build
    - Command: `NODE_OPTIONS='--max-old-space-size=4096' next build`
    - Purpose: Build the Next.js app (increases Node memory for large builds).

  - postbuild
    - Command: `next-sitemap --config next-sitemap.config.js`
    - Purpose: Generate sitemaps after a successful build.

  - start
    - Command: `next start`
    - Purpose: Start the built Next.js production server.

  - test
    - Command: `jest`
    - Purpose: Run Jest unit tests.

  - test:watch
    - Command: `jest --watch`
    - Purpose: Run Jest in watch mode for TDD.

  - lint
    - Command: `tsc --project tsconfig.json && eslint src && prettier --check src`
    - Purpose: Type-check the project, run ESLint, and check Prettier formatting.

  - lint:fix
    - Command: `eslint --fix src & prettier --write src`
    - Purpose: Auto-fix eslint problems and format files with Prettier. (Note: uses `&` — runs concurrently in the shell; consider using `pnpm -w` or `npm-run-all` to make behavior explicit and cross-platform.)

  - eslint
    - Command: `eslint src`
    - Purpose: Run ESLint on `src/`.

  - eslint:fix
    - Command: `eslint --fix src`
    - Purpose: Fix ESLint issues in `src/`.

  - typecheck
    - Command: `tsc --project tsconfig.json --noEmit`
    - Purpose: Run TypeScript type checks without emitting files.

  - format
    - Command: `prettier --write src`
    - Purpose: Format source files.

  - format:check
    - Command: `prettier --check src`
    - Purpose: Check formatting.

  - validate:schema
    - Command: `node scripts/validate-schema.js`
    - Purpose: Validate JSON Schema(s) using project scripts (python/json tools historically used); this is a primary schema sanity check.

  - validate:graphql
    - Command: `node scripts/validate-graphql-vs-jsonschema.mjs`
    - Purpose: Validate GraphQL SDL against JSON Schema parity and report mismatches.

  - validate:sync
    - Command: `node scripts/validate-schema-sync.mjs`
    - Purpose: Validate sync/parity between GraphQL and JSON Schema (non-strict).

  - validate:sync:strict
    - Command: `node scripts/validate-schema-sync.mjs --strict --config scripts/schema-sync.config.json`
    - Purpose: Strict parity check between the SDL and JSON Schema using the sync script with a config file.

  - validate:all
    - Command: `pnpm run validate:schema && pnpm run validate:graphql && pnpm run validate:sync && pnpm run validate:sync:strict`
    - Purpose: Aggregate command to run all validation steps in sequence (used in CI).

  - generate:schema:interop
    - Command: `node scripts/generate-schema-interop.js`
    - Purpose: Run the interop generators that output `generated-schemas/` artifacts. Typically runs v1 and v2 generators and the reverse JSON→GraphQL generator.

  - generate:schema:introspection
    - Command: `node scripts/generate-schema_unification-introspection.js`
    - Purpose: Produce GraphQL introspection JSON (used for downstream tooling / playgrounds).

  - generate:schema:graphql
    - Command: `node scripts/generate-graphql-json-schema.mjs`
    - Purpose: Generate JSON Schema from the v1 GraphQL SDL.

  - analyze
    - Command: `ANALYZE=true npm run build`
    - Purpose: Run a build with bundle analyzer enabled (note: uses `npm` rather than `pnpm` – consider standardizing).

  - federalist
    - Command: `npm install && NODE_OPTIONS='--max-old-space-size=4096' npm run build && npx serve@latest out`
    - Purpose: One-shot build + serve flow for Federalist preview. Uses `npm` and `npx`; consider replacing with `pnpm` equivalents and make platform quoting portable.

  ## Key scripts in `scripts/` (helpers and generators)


  Files in `scripts/` include (non-exhaustive; run `ls scripts/` to confirm):

  - generate-graphql-json-schema.mjs — GraphQL SDL → JSON Schema (v1)
  - generate-graphql-json-schema-v2.mjs — GraphQL SDL → JSON Schema (v2 target SDL)
  - generate-graphql-json-schema-helpers.mjs — shared helpers used by the generators
  - generate-graphql-from-json-schema.mjs — JSON Schema → GraphQL SDL
  - generate-schema-interop.mjs — orchestration wrapper that runs the above generators and writes into `generated-schemas/`
  - generate-schema_unification-introspection.mjs — generates GraphQL introspection JSON
  - validate-graphql-vs-jsonschema.mjs — checks SDL vs JSON Schema parity
  - validate-graphql-vs-jsonschema-v2.mjs — v2 variant of the parity check
  - validate-schema-sync.mjs — sync/consistency validation (has strict mode)
  - validate-schema.mjs / validate-schema.js — lower-level schema validation helpers
  - generate-graphql-custom.mjs, generate-graphql-enhanced.mjs, generate-graphql-with-extensions.mjs — variants that apply custom hints or extensions when generating SDL or schema
  - convert-v1-to-v2.mjs — conversion tooling (v1 → v2) used for migration tests or experiments
  - restructure-schema.mjs — scripts used to reorganize schema files
  - test-core-types.mjs — test harness for core type conversions

  ### Archived/diagnostic scripts (moved to `scripts/dev/`):
  - dev/map-missing-fields.mjs — Diagnostic tool to list missing fields between GraphQL and JSON Schema. Not required for CI or main flows.
  - dev/convert-camel-to-snake.mjs — One-off helper to convert schema keys to snake_case. Use only for canonicalization or migration.

  ### Shell scripts
  - extract-keycloak-cert.sh — Fetches Keycloak realm certs for OIDC integration.
  - generate-self-signed-cert.sh — Generates a self-signed certificate and private key for local testing.

  (If you need a complete file list with brief one-line descriptions for each file, I can generate that automatically by scanning the `scripts/` directory and reading the top comments of each file.)

  ## Common pitfalls / notes

  - ESM vs CJS: some scripts use `.mjs` (ES modules) and some use `.js` with CommonJS. The orchestration wrapper (`generate-schema-interop.js`) uses Node to execute scripts by path which generally works, but mixing ESM/CJS can cause module resolution surprises if helper modules are not present or import paths are wrong.

  - Quoting in `NODE_OPTIONS` and cross-platform shells: the `NODE_OPTIONS='--max-old-space-size=4096'` pattern works on POSIX shells (macOS/Linux) but can fail on Windows. Consider using cross-env or a Node wrapper to set memory in a cross-platform way.

  - Using `npm` in scripts (analyze/federalist): these call `npm`/`npx` explicitly. Prefer `pnpm` or use environment-agnostic commands to reduce confusion.

  - Output paths: generators write to `generated-schemas/`. CI assumes these files are present and sometimes commits them back; ensure scripts are deterministic and idempotent.

  ## Prioritized TODO checklist — review & improvements

  Top priority (blocking CI / correctness):

  1. Verify `validate:all` passes locally and in CI
     - Action: run `pnpm run validate:all` and fix failures; ensure `schema_unification.v2.from-graphql.json` is produced and matches expectations.
     - Reason: CI depends on these checks.

  2. Stabilize v2 generator
     - Action: confirm `generate-graphql-json-schema-v2.mjs` uses `generate-graphql-json-schema-helpers.mjs` (helpers exist) and emits consistent `$id`/`$ref` style matching project parity expectations.
     - Reason: v2 artifacts are now included in interop and must be validated & committed.

  3. Audit `scripts/generate-schema-interop.js`
     - Action: ensure it handles failing child processes with readable error messages and adds the expected artifacts to `git` in CI.
     - Reason: orchestrator failure causes CI to fail with minimal context.

  High priority (developer UX & maintainability):

  4. Document each `scripts/` helper file with top-of-file comments and list them in this README (automate if possible).
  5. Add `--help` output to long-running scripts or create a `scripts/cli.js` central entry so commands can be discovered programmatically.
  6. Standardize on `pnpm` in script bodies (replace `npm` calls in `analyze` / `federalist`).
  7. Make scripts idempotent and safe for CI runs (no side-effectful global git commits unless explicitly intended).

  Medium priority (cleanup & tests):

  8. Add unit/integration tests for critical scripts (generators and validators) — harness can use Node + temporary dirs.
  9. Add a script `scripts/check-generated` that validates the presence and rough validity of `generated-schemas/*.json` (AJV quick-check).
  10. Normalize ESM/CJS usage or document why some scripts are `.mjs` and others are `.js`.

  Low priority (polish):

  11. Consider adding `make` targets or GitHub Actions workflow snippets for running these scripts locally in a consistent environment.
  12. Add a troubleshooting section with common errors (example: GraphQL parse errors due to leftover diff markers; missing helper imports).
  13. Provide a small CONTRIBUTING note for how to regenerate and commit `generated-schemas/` artifacts when making schema changes.

  ## Suggested immediate next commands (local checks)

  Run these in your shell (zsh) to verify the main flows:

  ```bash
  pnpm run generate:schema:interop
  pnpm run validate:all
  pnpm test
  pnpm run lint
  ```

  If you need me to automatically generate a per-file summary for every file under `scripts/` (top comment + one-line purpose), I can scan and produce that as an annex to this README.

  ---

  Created: scripts/README.md

  If you want, I can now:
  - Scan `scripts/` and append a one-line summary for each file automatically.
  - Add a short CONTRIBUTING snippet describing how to regenerate `generated-schemas/` and commit them in PRs.
  - Implement `scripts/check-generated` (quick AJV validation) as a new script and add it to `package.json`.

  Tell me which of the follow-ups you'd like next.
