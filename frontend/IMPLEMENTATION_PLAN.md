# Frontend Completion & Testing Plan

Goal: ship the `/frontend` demos (Yjs and Loro) as production-ready apps with converter integration, full test coverage, and repeatable deployment.

## Objectives

- Integrate the Rust/Node converters (WASM and JS) behind a single option panel and input/output pipeline.
- Harden collaboration flows (auth/persistence for Yjs; snapshot/history for Loro) and error handling.
- Deliver UX polish: responsive layout, keyboard shortcuts, accessible focus order, dark/light theme toggle.
- Establish testing: unit/integration (Vitest), E2E (Playwright), and visual regression for the three-panel experience.
- Add CI jobs and production deploy targets (Vercel/Netlify + container preview).

## Scope

- Included: `frontend/demos/yjs-monaco`, `frontend/demos/loro-monaco`, shared docs, scripts, and CI.
- Excluded (for later): advanced authz/role systems, paid feature gating, hosted multi-tenant control plane.

## Milestones & Tasks

**M1 – Baseline & Plumbing (env + build) [0.5-1d]**

- Align Node version, lockfile, and pnpm workspaces; ensure dev/build commands succeed for both demos.
- Add shared env contract (`.env.example`) for converter endpoints and theme defaults.
- Verify Vite WASM configuration for Loro is compatible with converter WASM import.

**M2 – Core Editors & Converter Integration (single-user first) [1-2d]**

- Wire JSON/GraphQL editors to `convert` (Rust WASM) and Node fallback; support `outputFormat` `SDL|AST_JSON|SDL_WITH_FEDERATION_METADATA`.
- Surface `idStrategy`, `failOnWarning`, `includeFederationDirectives`, `federationVersion`, `namingConvention` with sensible defaults.
- Add error/result channel: diagnostics list, warning banner, and download buttons for SDL/AST JSON.
- Persist last options per document; reset controls on schema change when needed.

**M3 – UX Polish & Accessibility (single-user) [1d]**

- Responsive layout for <768px; keyboard shortcuts (convert, toggle panel, theme switch); focus traps for modals/panels.
- Theming: dark/light toggle, persist preference; ensure graphql-editor theme syncs.
- Empty/error states: converter unavailable, invalid schema, large-schema warning.

**M4 – Testing & Quality Gates (single-user flows) [1.5-2d]**

- Unit/integration (Vitest): state stores, option mappers, converter adapter; mock CRDT bindings where needed.
- E2E (Playwright): smoke flows for single-user convert/edit, failure cases (bad schema, warning exit).
- Visual regression (Playwright screenshots) for the three-panel layout and theme toggle on both demos.
- Add test fixtures under `frontend/tests/fixtures` for schema inputs and expected outputs (SDL and AST JSON).

**M5 – Performance & Telemetry [0.5-1d]**

- Measure bundle size and conversion latency for small/medium/large schemas; budget/regressions in CI.
- Optional lightweight analytics hook (feature toggle) and error logging for converter failures.

**M6 – CI/CD & Release [0.5-1d]**

- GitHub Actions: lint/typecheck, unit/integration, Playwright (headed in CI container), bundle-size check.
- Build artifacts: Vercel/Netlify preview for each PR; Dockerfile for local preview.
- Release checklist: envs documented, quickstart updated, known limitations captured.

**M7 – Collaboration & Data Durability (Yjs/Loro) [last, 1-2d]**

- Yjs: production WS endpoint, retry/backoff, room naming constraints, optional auth token hook; persistence adapter stub.
- Loro: snapshot export/import hardening, time-travel guardrails, optional relay placeholder; document P2P limitations.
- Shared: presence indicators, cursor colors, and conflict/tooltips on converter errors.

## Acceptance Criteria

- Both demos build and run locally and in CI with WASM and Node converter paths.
- Option panel drives converter outputs for SDL, SDL_WITH_FEDERATION_METADATA, and AST_JSON; diagnostics surface in UI; `failOnWarning` honored.
- Single-user editing/conversion UX is responsive, accessible, and themed; keyboard shortcuts documented; error/empty states present.
- Tests: Vitest suite green; Playwright E2E + visual regression green in CI; bundle-size budget enforced.
- Deployable previews available per PR; main branch deploy succeeds with documented envs.
- Collaboration (Yjs/Loro) verified after core acceptance, with presence indicators and basic persistence where applicable.

## Risk & Mitigation

- WASM loading failures: prefetch and graceful fallback to Node converter; cache-bust strategy.
- Playwright flakiness: use deterministic fixtures, network stubs, generous timeouts for first WASM load.
- WS availability (Yjs): retry with exponential backoff and user-visible status; allow offline read-only mode.

## Owners & Handoffs

- Frontend lead: drives M2–M5, owns UX and testing.
- Infra/CI: owns M6–M7; coordinates Vercel/Netlify and GitHub Actions.
- Converter team: supports WASM build artifacts and option surface changes.
