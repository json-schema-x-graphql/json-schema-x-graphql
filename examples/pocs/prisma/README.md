# Prisma POC — Schema Unification Forest

Purpose
-------
This document describes a focused POC to evaluate adopting Prisma for parts of the Schema Unification Forest project. The objective is to find the lightest-weight, most conformant approach to add Prisma while minimizing disruption to the existing codebase and tooling (PostGraphile, Next.js, generators). The POC will compare alternatives using the criteria documented in the Prisma examples repo and produce a recommendation.

Background / Current State
--------------------------
- The repo currently uses PostgreSQL and PostGraphile for runtime GraphQL over the database.
- We have a generated canonical supergraph SDL at `generated-schemas/supergraph/supergraph.graphql` and a Next.js UI that loads it from `public/data/`.
- We already built POCs that host the supergraph SDL and delegate selected fields to a running PostGraphile instance (`dev/pocs/grafserv/server2.js`).

POC Goals
---------
- Evaluate how Prisma could be used in this project in the least invasive way.
- Measure developer ergonomics and type-safety improvement compared with current DB workflows.
- Produce a short implementation that demonstrates: schema modeling, data access via Prisma Client, and exposing GraphQL fields that integrate with the supergraph or PostGraphile-derived runtime.
- Produce a recommendation (keep PostGraphile + Prisma for DB work? Replace pieces with Prisma-powered GraphQL? Use Prisma for migrations only?).

Evaluation Criteria (informed by prisma-examples)
-------------------------------------------------
We will evaluate each approach by these criteria:
- Minimal runtime surface: how many new services/processes are required
- Codebase conformity: how well the approach fits current repo patterns (Node, pnpm, Next.js)
- Developer DX: type inference, auto-complete, schema-first vs code-first ergonomics
- Migration & schema management: ability to evolve DB schema and keep parity with generators
- Integration complexity: how many integration points / glue code required to keep canonical supergraph
- Performance implications: latency, number of network hops
- Testability: ease of adding small-unit tests and integration checks

Candidate Approaches
--------------------
1) Prisma as a **developer-only layer** (lightest):
   - Use Prisma locally to model the DB and generate the Prisma Client.
   - Create a small Node process (GraphQL Yoga / Apollo) that exposes a handful of resolvers backed by Prisma Client for the types we want to prototype.
   - Keep PostGraphile as the canonical GraphQL server for production-like flows; use the small Prisma server only for POC eval and developer ergonomics.
   - Pros: minimal change, evaluates Prisma DX & types. Cons: two GraphQL runtimes during POC.

2) Prisma for migrations + PostGraphile for GraphQL (medium):
   - Use Prisma Migrate to manage DB schema changes (and optionally generate seed data) but keep PostGraphile as the runtime GraphQL engine.
   - This tests whether Prisma's migration tooling and schema modelling are useful without replacing PostGraphile.
   - Pros: low runtime change, uses Prisma tooling. Cons: double schema sources to keep in sync (Prisma schema vs JSON Schema / SDL), mapping required.

3) Replace small subgraph with Prisma-backed GraphQL (heavier):
   - Implement a Prisma-backed GraphQL service that serves a part of the supergraph (e.g., Solicitation / Requisition types), and host it as a service that the composition pipeline can include.
   - This more fully tests the hosted-supergraph approach but requires more work (delegation, composition, transforms).
   - Pros: full-stack test of Prisma as GraphQL source. Cons: larger surface area and integration work.

Recommended initial POC (lightest-weight, highest learning value)
----------------------------------------------------------------
Start with Approach (1): a tiny Prisma + GraphQL server scoped to a small set of types (Solicitation & Requisition). This delivers the fastest feedback on Prisma's dev DX and type-safety while keeping production runtime (PostGraphile) unchanged.

POC Implementation Plan (step-by-step)
-------------------------------------
1. Create `dev/pocs/prisma/` and initialize a minimal Node workspace.
   - `cd dev/pocs && mkdir -p prisma && cd prisma`
   - `pnpm init -w` or `npm init -y` inside the folder (follow repo tooling, prefer `pnpm` if used broadly).

2. Install minimal dependencies (TypeScript optional):
   - `pnpm add prisma @prisma/client graphql-yoga` (or `apollo-server` / `graphql-yoga`)
   - Optionally add `typescript ts-node` for faster dev DX

3. Add a minimal `prisma/schema.prisma` pointing at your local Postgres used by the PostGraphile POC (or a lightweight SQLite for isolated testing). For example (Postgres):

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Solicitation {
  id                      Int     @id @default(autoincrement())
  solicitationNumber      String  @map("solicitation_number")
  amendmentNumber         String? @map("amendment_number")
  title                   String?
  status                  String?
  amount                  Float?
}

model Requisition {
  id                Int     @id @default(autoincrement())
  requisitionNumber String  @map("requisition_number")
  amendmentNumber   String? @map("amendment_number")
  description       String?
  amount            Float?
}
```

4. Run Prisma generate & (optional) migrate:
   - `pnpm prisma generate`
   - For the POC, you can run `prisma db push` to sync schema to DB (or `prisma migrate dev` if you want migrations).

5. Implement a tiny GraphQL server `index.js` or `index.ts` that imports `@prisma/client` and exposes `solicitations(limit: Int)` and `requisitions(limit: Int)` resolvers, matching the supergraph SDL names (snake_case) at the HTTP GraphQL endpoint.

6. Run smoke tests and compare types & dev DX: introspect, query, measure latency vs PostGraphile.

7. Write a short evaluation report with the evaluation criteria above and a recommendation.

Deliverables for the POC
------------------------
- `dev/pocs/prisma/` with:
  - `package.json` and install instructions
  - `prisma/schema.prisma` (PRISMAschema)
  - `index.js`/`index.ts` GraphQL server exposing targeted resolvers
  - a `README.md` summarizing how to run the POC and the evaluation checklist
- Short evaluation report (1-2 pages) that compares the candidate approaches and gives a recommendation.

Success Criteria (how we decide this POC succeeded)
-------------------------------------------------
- Developer DX: team members can add a field and have TypeScript + client types update within minutes.
- Integration: the Prisma-based service can serve the small selection of fields in the supergraph SDL with minimal glue.
- Effort: total POC work remains small (approx 4	6 hours of dev to scaffold + test).
- Recommendation: produce a clear recommendation that identifies whether to adopt Prisma only for migrations, for a microservice approach, or not at all.

Risks & Mitigations
--------------------
- Risk: duplicate schema sources (Prisma schema vs canonical JSON Schema / SDL) introduce drift.
  - Mitigation: for a short-term POC, treat Prisma as a developer tool; if adopted, define a single source of truth workflow (e.g., use Prisma only for migrations and generate SDL from DB or map fields through the generator pipeline).
- Risk: PostGraphile and Prisma both try to be the GraphQL/DB layer.
  - Mitigation: prefer incremental adoption. Use Prisma in a targeted service rather than replacing PostGraphile immediately.

Next actions I can take for you right now
----------------------------------------
- Create the `dev/pocs/prisma/` scaffold (package.json, prisma schema, example server) and run a smoke test. — I can implement this now.
- Or: just record this plan and let you decide which approach to prototype first.

If you want me to scaffold the POC, tell me whether to point Prisma at the existing Postgres instance used by the PostGraphile POC (`DATABASE_URL`) or to use a separate SQLite DB for isolated testing. I will then create the files and run the scaffolding commands.

Current evaluation & blockers
-----------------------------
Status summary (live runs):
- Scaffold: `dev/pocs/prisma/` scaffolded with `package.json`, `prisma/schema.prisma`, `index.js` server and `.env.example`.
- Server: `index.js` now starts and will use `@prisma/client` when present, but falls back to `pg` raw queries when the Prisma client is not generated.
- Smoke test: server startup succeeded and a test GraphQL query was attempted, but the DB rejected the connection due to authentication (`password authentication failed for user "postgres"`).

Blockers observed during POC runs:
- Prisma engine download TLS error: `prisma generate` failed in this environment when attempting to download native Prisma engines for darwin-arm64 with a TLS/certificate verification error (`unable to get local issuer certificate`). This prevents `prisma generate` from completing here and therefore the `@prisma/client` cannot be used until the binary download completes.
- DB credentials: the sample/default `DATABASE_URL` in `.env.example` did not match the running Postgres credentials, producing `password authentication failed for user "postgres"` during the pg fallback query.

Implications:
- Without a successful `prisma generate` this environment cannot use the generated Prisma client; the server will fall back to raw SQL which works for smoke-testing but does not provide Prisma's typed client benefits.
- Prisma Studio (the Prisma web UI) requires a working `DATABASE_URL` and a generated client for the best experience; Studio will still connect to the DB without client generation, but `prisma generate` is usually run prior to `prisma studio` in standard workflows.

Recommended remediation options (pick one):
1. Provide correct `DATABASE_URL` (recommended): update `dev/pocs/prisma/.env` or paste the `DATABASE_URL` here and I will re-run the server and smoke tests to validate queries and start Prisma Studio.
2. Re-run `prisma generate` locally on a machine with working system CA / network (recommended for security): run the generate & push locally and either commit the generated client or re-run the same commands here (no secrets shared). This avoids changing TLS behavior in this environment.
3. Quick unblock (insecure): re-run `prisma generate` here with `NODE_TLS_REJECT_UNAUTHORIZED=0` to ignore the certificate validation error. This will likely succeed but is insecure and should only be used for short-term testing.
4. Use isolated SQLite for offline testing: convert the `datasource` to SQLite in `prisma/schema.prisma` and re-run `prisma generate` & `db push`. Note: Prisma still downloads engines and may hit the same TLS issue.

Next steps I can take after you choose:
- If you provide `DATABASE_URL` I will re-run `pnpm dlx prisma generate`, `pnpm dlx prisma db push`, start the server, and run the smoke query to confirm results. I will also start Prisma Studio if you want to inspect data.
- If you prefer local generation, I will provide the exact commands to run locally and resume here when you confirm the client was generated.

References
----------
- Prisma examples: https://github.com/prisma/prisma-examples/
- Prisma docs: https://www.prisma.io/docs/

---
Document created by the Schema Unification Forest engineering POC automation.
