pg-introspection helper

This folder contains helpers to create a DB-level introspection snapshot of the PostGraphile POC Postgres instance.

Usage:

- Ensure the PostGraphile compose stack is running: `docker compose up -d` (run from `dev/pocs/postgraphile`).
- Run the helper script:

  ```bash
  cd dev/pocs/postgraphile
  ./pg-introspection/run_pg_introspection.sh
  ```

What it does:
- Attempts to run `npx @graphile/pg-introspection` (if `npx` is available). If that runs, it writes `pg-introspection.json` to this folder.
- If `npx` is not available or fails, falls back to `pg_dump` inside the running Postgres container and writes `pg_schema.sql` and `tables.json`.

Outputs:
- `pg-introspection.json` (if npx succeeded)
- `pg_schema.sql` (schema-only SQL dump)
- `tables.json` (list of tables in `public` and `unified_model`)
