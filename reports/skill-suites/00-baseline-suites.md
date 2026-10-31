# Baseline: Full Test Suites — Both Converters

**Date:** 2026-10-27
**Repo state:** branch `dependabot/npm_and_yarn/workspace-dependencies-209267c20e` rebased onto `origin/main` @ `e0796ea` (duplicate dependabot commit skipped — its change landed upstream via #297). Converters untouched by the rebase (only `package.json` + `pnpm-lock.yaml` changed).
**Toolchain:** rustc/cargo 1.97.1 · Node v24.18.0 · npm 11.16.0

## Suite 1 — Rust converter (`converters/rust`)

Command: `cd converters/rust && cargo test`

| Test binary | Passed | Failed | Ignored |
|---|---|---|---|
| Unit tests (lib) | 118 | 0 | 0 |
| wasm/API tests | 6 | 0 | 0 |
| integration_tests.rs | 8 | 0 | 4 |
| repro_issue.rs | 2 | 0 | 0 |
| phase1_bugs_test.rs | 18 | 0 | 0 |
| other integration suites | 10 + 1 + 16 | 0 | 2 |
| x_graphql_shared_tests.rs | 14 | 0 | 1 |
| Doc-tests (lib.rs) | 1 | 0 | 0 |

**Result: 194 passed / 0 failed / 7 ignored — GREEN**

## Suite 2 — TypeScript converter (`converters/node`)

Command: `cd converters/node && npm test` (jest, ts-jest ESM)

- **Test suites: 19 passed, 19 total**
- **Tests: 275 passed, 275 total** — 0 failed, 0 skipped
- Runtime: ~23.6s

Includes `src/parity.test.ts`, which runs both converters on
`converters/test-data/user-service.json` and diffs the SDL output:

```
✅ Perfect Match! Both converters produce identical SDL
Node lines: 45  Rust lines: 47  (byte sizes 1241 vs 1243 — comment/blank-line delta)
```

**Result: GREEN — parity between the two converters holds.**

## Scope of this suite run

These baselines are the pre-condition for the skill-suite runs that follow
(see `01`–`04` in this directory). Any port or review activity must keep both
suites green.
