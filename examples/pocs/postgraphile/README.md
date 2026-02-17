# PostGraphile POC — quick start

This POC runs a minimal Postgres instance seeded with `solicitations` and `requisitions` tables and exposes a GraphQL API using PostGraphile.

Goals

- Verify a Postgres-first GraphQL approach can expose our canonical entities with minimal transformation.
- Provide a quick way to iterate SQL -> GraphQL and run simple parity checks.

How to run

1. Change to the POC folder:

```bash
cd dev/pocs/postgraphile
```

2. Start the stack (docker is required):

```bash
docker compose up -d
```

3. PostGraphile GraphiQL UI will be available at:

- http://localhost:5000/graphiql

Quick smoke test (curl)

```bash
# Introspection / query for solicitations
curl -s -X POST http://localhost:5000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ allSolicitations { nodes { id solicitationNumber title amount } } }"}' | jq
```

Notes

- PostGraphile will auto-generate GraphQL types from the DB tables. Naming uses typical Graphile conventions (snake_case -> camelCase).
- Use `--watch` for live schema reloads when you change DB schema.

Evaluation checklist (high-level)

- Semantic fidelity: can we expose fields with minimal renames/hacks?
- Developer ergonomics: iteration speed, ease of schema change.
- Deployment: can this be run cleanly in Docker and integrated in CI?
