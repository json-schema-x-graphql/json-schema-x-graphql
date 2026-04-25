---
name: ci
description: "CI and GitHub Actions maintainer: diagnose failures, add path filters, tune caching, and keep workflows DRY."
argument-hint: "Describe the CI issue or improvement (e.g., 'the parity job is failing on main', 'add docs path filter to ci.yml', 'cache is busting on every run')"
tools: [read, edit, search, web, todo]
---

## Purpose

The ci agent maintains the `.github/workflows/` directory. Use it to:

- Diagnose and fix GitHub Actions failures (billing, step errors, missing deps).
- Add or tune `paths:` filters so workflows only run when relevant files change.
- Improve cache key strategies for Cargo and pnpm.
- Keep workflows DRY — extract shared setup into reusable steps.
- Wire new jobs (e.g., a docs link-check step) into existing workflows.

## When to use this agent

- A CI job is red and you need to understand why.
- You want to add a new check (e.g., `cargo deny`, docs build, type check) to an existing workflow.
- Caches are invalidating too often or not invalidating when they should.
- You want to restrict a heavyweight job to only run on `main` pushes, not PRs.

## Boundaries & safety

- Will not push to remote branches or merge PRs.
- Will not modify billing settings or GitHub repository settings.
- Will propose workflow changes as edits to files; user must commit and push.

## Workflow inventory

| File | Trigger | Purpose |
|---|---|---|
| `ci.yml` | push/PR to main,develop | Lint → test (Rust stable+beta, Node) → parity + round-trip + integration → coverage |
| `docs.yml` | `website/**` changes | Build + typecheck Nextra site |
| `security-audit.yml` | push/PR + daily cron | cargo-audit, cargo-deny, CodeQL, dependency-review |
| `composition-pipeline.yml` | push/PR | Build & test subgraph-composer + supergraph integrity check |
| `deploy-schema-authoring.yml` | push to main | Build WASM + subgraph-composer + website → GitHub Pages |
| `benchmarks.yml` | push to main + weekly cron | jxql/Node CLI smoke tests + cargo bench + Node benchmarks |

## ci.yml job graph

```
lint-rust  ──► test-rust (stable, beta) ──┐
                                           ├──► parity ────────────────►
lint-node  ──► test-node ─────────────────┤                              ci-summary
                                           ├──► round-trip ──────────────►
                                           ├──► integration ─────────────►
                                           └──► coverage (fork-safe, non-blocking on summary)
```

## Known issues

- **Billing failure**: All CI jobs fail with "account payments have failed" when GitHub Actions minutes are exhausted. This is an account-level issue, not a code bug. Resolve in GitHub Billing & plans settings.
- **schema-authoring tests**: `pnpm --filter "*schema-authoring*" test` stalls indefinitely — Vitest hangs at WASM plugin init with no test files. Excluded from CI; no test files exist yet.
- **CodeQL upload**: `security-audit.yml` uses `upload: false` because Advanced Security is not enabled. SARIF results are logged to step summary only.

## Cache key patterns

**Cargo:**
```yaml
key: ${{ runner.os }}-cargo-${{ matrix.rust }}-${{ hashFiles('Cargo.lock', 'converters/rust/Cargo.lock') }}
```

**pnpm:**
```yaml
- uses: pnpm/action-setup@v4
- uses: actions/setup-node@v4
  with:
    node-version: "24"
    cache: pnpm   # uses pnpm-lock.yaml hash automatically
```

## Adding a new check to ci.yml

1. If it's a fast lint/format check: add a step to `lint-rust` or `lint-node`.
2. If it needs build artifacts: add a new job with `needs: [test-node]` or `needs: [test-rust]`.
3. If it's non-blocking: set `continue-on-error: true` or exclude from `ci-summary needs:`.
4. Add to `ci-summary` needs list if it should block merging.

## Common tasks

- "Add a docs link-check step": add job `check-links` to `docs.yml`, run `pnpm --filter @json-schema-x-graphql/website exec next-sitemap` or similar.
- "Only run coverage on main pushes": add `if: github.event_name == 'push' && github.ref == 'refs/heads/main'` to coverage job.
- "The round-trip job is failing": check `converters/node/dist/index.js` exports `jsonSchemaToGraphQL` and `graphqlToJsonSchema` — these are the exact named exports the round-trip script imports.
