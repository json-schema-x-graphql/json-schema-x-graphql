# Monorepo Migration Implementation Plan

**Project:** `json-schema-x-graphql`  
**Status:** Draft  
**Goal:** Restructure the repository into a split-ready monorepo that can later be extracted into separate repositories with minimal friction, while keeping the core project stable and testable now.

---

## 1. Objectives

This plan defines the migration path for the `json-schema-x-graphql` ecosystem.

### Primary goals

- Keep the project as a **single monorepo for now**
- Organize the repo so each major component can later become its own repository
- Support **multiple converters** under a shared contract
- Build a **shared test harness** for parity and conformance
- Maintain a clear separation between:
  - core conversion logic
  - converter implementations
  - shared model types
  - test fixtures and conformance checks
  - documentation/site
  - web-based builder UI
  - proof-of-concept or legacy work

### Secondary goals

- Reduce accidental coupling between packages
- Make local development predictable
- Keep the default test command fast and reliable
- Create a structure that can support future tooling such as `testx`
- Make extraction into standalone repos straightforward later

---

## 2. Target End State

The monorepo should be organized around domain boundaries, not implementation accidents.

### Proposed top-level layout

```text
json-schema-x-graphql/
├── apps/
│   ├── site/
│   └── builder/
├── packages/
│   ├── core/
│   ├── model/
│   ├── converter-node/
│   ├── converter-rust/
│   ├── test-suite/
│   └── fixture-tools/
├── fixtures/
│   ├── json-schema/
│   ├── graphql/
│   └── parity/
├── docs/
├── tools/
│   ├── scripts/
│   └── generators/
├── proofs-of-concept/
│   ├── legacy-dashboard/
│   └── visual-experiments/
└── .github/
```

---

## 3. Package Responsibilities

### `packages/core`

Canonical conversion contract and shared behavior.

Owns:

- conversion APIs
- normalization rules
- naming conventions
- federation mapping rules
- error model
- conversion semantics
- public-facing contract for all converters

This package should be treated as the source of truth for conversion behavior.

---

### `packages/model`

Shared intermediate representation and schema model.

Owns:

- schema AST / IR types
- normalized object models
- helper types
- federation metadata models
- serialization and deserialization helpers

This package must remain converter-agnostic.

---

### `packages/converter-node`

Node/TypeScript converter implementation.

Owns:

- TypeScript implementation
- Node CLI entrypoints
- Node-specific adapters
- packaging metadata
- JS/TS unit tests

This package should depend on `core` and `model`, not duplicate them.

---

### `packages/converter-rust`

Rust converter implementation.

Owns:

- Rust crate
- native conversion logic
- WASM output
- Rust CLI/binary support
- Rust integration and unit tests

This package should also depend on the shared contract rather than redefining semantics.

---

### `packages/test-suite`

Shared conformance and parity suite.

Owns:

- canonical fixtures
- golden outputs
- Node vs Rust comparison tests
- regression tests
- schema edge cases
- fuzz inputs and expected results
- fixture metadata and execution rules

This package is the key to keeping multiple converters consistent.

---

### `packages/fixture-tools`

Utilities for managing test fixtures.

Owns:

- fixture generation
- output normalization helpers
- snapshot update tooling
- golden file regeneration
- report generation

This package is optional at first but becomes useful as the fixture corpus grows.

---

### `apps/site`

Public documentation and marketing site.

Owns:

- landing page
- docs
- usage guides
- changelog
- conversion examples
- migration notes
- test summary pages if needed

---

### `apps/builder`

Web-based JSON Schema to federated GraphQL builder.

Owns:

- schema editor UI
- GraphQL output preview
- import/export flows
- validation UI
- federation composition workflows
- user project state
- demo and shareable examples

This should consume the same conversion contract as the CLI/library packages.

---

## 4. Directory Rules

To preserve split readiness, follow these rules:

### Rule 1: One package, one purpose

Each package should have a narrow, obvious responsibility.

### Rule 2: Shared code lives only in `core` and `model`

Avoid scattering reusable logic throughout apps or converter packages.

### Rule 3: Fixtures live centrally

Test inputs and golden outputs should live in one fixture system, not repeated in each package.

### Rule 4: Apps should consume packages, not define semantics

The site and builder should use the converter contract, not own it.

### Rule 5: Avoid deep relative path coupling

Use workspace references and package imports where possible.

### Rule 6: Keep POCs separate

Experimental or legacy work should be isolated so it can be deleted or archived later.

---

## 5. Proposed Monorepo Structure

```text
json-schema-x-graphql/
├── package.json
├── pnpm-workspace.yaml
├── README.md
├── docs/
│   └── monorepo-migration-plan.md
├── apps/
│   ├── site/
│   └── builder/
├── packages/
│   ├── core/
│   ├── model/
│   ├── converter-node/
│   ├── converter-rust/
│   ├── test-suite/
│   └── fixture-tools/
├── fixtures/
│   ├── json-schema/
│   ├── graphql/
│   └── parity/
├── tools/
│   ├── scripts/
│   └── generators/
├── proofs-of-concept/
│   ├── legacy-dashboard/
│   └── visual-experiments/
└── .github/
```

---

## 6. Test Architecture

The test strategy should be layered.

### Layer 1: Package-local unit tests

Each converter package should keep its own fast unit tests.

Examples:

- type normalization tests
- naming strategy tests
- validation behavior
- conversion edge cases

### Layer 2: Shared conformance tests

The shared test suite should run the same fixture corpus against every converter.

Examples:

- JSON Schema input → GraphQL output
- GraphQL output parity between Node and Rust
- roundtrip consistency
- fixture golden output checks

### Layer 3: Integration tests

End-to-end tests should verify complete flows.

Examples:

- CLI input to SDL output
- builder import/export flows
- site-generated examples
- schema validation workflows

### Layer 4: Regression and fuzz tests

The shared suite should include:

- known historical regressions
- pathological input schemas
- circular references
- naming collisions
- federation-specific cases

---

## 7. `testx` Evaluation Plan

`testx` appears promising as the future top-level test orchestrator for this monorepo.

### Why it fits

- supports multiple languages
- supports monorepos/workspaces
- can run many test frameworks through one command
- can shard or parallelize tests
- can support a shared harness across Rust and JS/TS

### Recommended use

Adopt `testx` only after the repo layout is normalized.

### MVP validation criteria

A `testx` proof-of-concept should verify:

- JS/TS tests are detected correctly
- Rust tests are detected correctly
- workspace-level execution works
- shared fixture tests can run consistently
- local developer commands remain simple

### Suggested local validation commands

- `testx workspace`
- `testx workspace --list`
- `testx --affected`
- `testx --partition slice:1/2`
- `testx -p packages/test-suite`

### Success condition

`testx` should become the outer test runner only if it improves clarity and reliability without hiding package-level issues.

---

## 8. Migration Phases

### Phase 0: Inventory and classification

Identify what currently belongs to:

- core
- model
- converters
- test suite
- site
- builder
- POC/legacy

### Phase 1: Normalize directory boundaries

Move current code into the proposed structure without changing behavior.

### Phase 2: Extract shared model and conversion contract

Create or formalize:

- `packages/core`
- `packages/model`

### Phase 3: Centralize fixtures and conformance tests

Move parity data and golden tests into `packages/test-suite`.

### Phase 4: Standardize package-level scripts

Ensure each package can:

- build
- test
- lint
- format
- run independently

### Phase 5: Introduce monorepo orchestration

Add workspace commands and, later, `testx` if validated.

### Phase 6: Extraction-ready cleanup

Make sure each package can be moved into its own repo with minimal edits.

### Phase 7: Repo split

When ready, extract:

- converter-node
- converter-rust
- test-suite
- site
- builder

---

## 9. Immediate Implementation Priorities

### Priority A: Create the target folder structure

Prepare the repo for migration before moving logic.

### Priority B: Define `core` and `model` boundaries

This prevents duplicated logic later.

### Priority C: Move shared test fixtures into one place

This is required for multiple converters.

### Priority D: Make tests deterministic

The shared harness should be reliable and not depend on incidental package layout.

### Priority E: Isolate POCs

Move dashboards, experiments, and legacy work out of the main path.

---

## 10. Local Development Principles

The monorepo should support a few simple commands:

- run the fast default test suite
- run the full conformance/parity suite separately
- build a specific package
- run all workspace tests
- run only affected tests when possible

### Recommended command separation

- `pnpm test` → fast, default, local-friendly
- `pnpm test:parity` → shared converter parity suite
- `pnpm build` → package build pipeline
- package-specific commands under each package directory

---

## 11. Extraction Readiness Checklist

A package is ready to be split into its own repo when:

- it has its own `package.json` or manifest
- it has no hard-coded relative imports to other packages
- it uses shared package imports for cross-cutting logic
- tests can run independently
- CI can run it in isolation
- docs are not entangled with other app packages
- fixture ownership is clear

---

## 12. Risks

### Risk: Too much coupling remains in the monorepo

Mitigation:

- enforce package boundaries early
- use shared packages for shared logic

### Risk: Test suite becomes slow or noisy

Mitigation:

- separate fast tests from parity tests
- use sharding or filtering when necessary

### Risk: Builder/site logic leaks into converter semantics

Mitigation:

- keep conversion rules in `core`
- treat apps as consumers only

### Risk: Extraction becomes difficult later

Mitigation:

- design each package as if it will be moved tomorrow

---

## 13. Recommended Next Actions

1. Create the new monorepo directory structure
2. Move current work into the right buckets
3. Define the `core` and `model` packages
4. Centralize fixtures and parity tests
5. Keep POCs isolated under `proofs-of-concept/`
6. Validate whether `testx` works as the workspace-level orchestrator
7. Keep extraction as an explicit future milestone

---

## 14. Final Recommendation

The best path is:

- **monorepo now**
- **clear package boundaries**
- **shared conformance suite**
- **split-ready structure**
- **optional `testx` adoption after layout cleanup**
- **extract to dedicated repos only when each package is stable and independent**

This keeps the project manageable today while preserving the option to split into a multi-repo ecosystem later.
