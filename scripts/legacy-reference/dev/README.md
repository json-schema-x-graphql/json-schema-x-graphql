# scripts/dev/ — Development & Diagnostic Scripts

This folder contains scripts that are not part of the main build, validation, or generation pipeline, but are useful for development, diagnostics, or one-off data transformations. Scripts here may be archived, experimental, or used for manual schema/data inspection.

## Contents

- `map-missing-fields.mjs` — Diagnostic tool to list missing fields between GraphQL and JSON Schema. Not required for CI or main flows.
- `convert-camel-to-snake.mjs` — One-off helper to convert schema keys to snake_case. Use only for canonicalization or migration.

## Usage

Run these scripts manually as needed. They are not invoked by any main npm/pnpm script or CI pipeline.

## Archival Policy

Scripts in this folder may be deleted, refactored, or moved to main pipeline if they become critical. Otherwise, treat as optional tools.
