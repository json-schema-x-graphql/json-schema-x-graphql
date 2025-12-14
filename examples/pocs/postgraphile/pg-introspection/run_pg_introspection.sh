#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT_DIR/pg-introspection"
mkdir -p "$OUT_DIR"

# Connection info to the demo Postgres. Matches compose.
DB_URL="postgres://postgres:postgres@db:5432/localdb"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"

echo "Saving outputs to $OUT_DIR"

# Try Graphile pg-introspection via npx (best effort). If unavailable, fall back to pg_dump schema.
if command -v npx >/dev/null 2>&1; then
  echo "Attempting to run npx @graphile/pg-introspection (may download package)..."
  set +e
  npx --yes @graphile/pg-introspection --connection "$DB_URL" --output "$OUT_DIR/pg-introspection.json"
  NX_EXIT=$?
  set -e
  if [ "$NX_EXIT" -eq 0 ]; then
    echo "pg-introspection output saved to $OUT_DIR/pg-introspection.json"
    exit 0
  else
    echo "npx pg-introspection failed (exit $NX_EXIT), falling back to pg_dump schema"
  fi
else
  echo "npx not available; falling back to pg_dump schema"
fi

# Fallback: use pg_dump inside the running compose db container to export schema-only SQL for public and unified_model
OUT_SQL="$OUT_DIR/pg_schema.sql"

echo "Using docker compose to run pg_dump (writes to $OUT_SQL)"

docker compose -f "$COMPOSE_FILE" exec -T db pg_dump -U postgres -d localdb -s -n public -n unified_model > "$OUT_SQL"

if [ -s "$OUT_SQL" ]; then
  echo "Schema SQL exported to $OUT_SQL"
else
  echo "Warning: schema SQL file is empty or missing"
fi

# Also save a minimal metadata snapshot via psql queries (tables list)
TABLES_OUT="$OUT_DIR/tables.json"

docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -d localdb -At -c "\
SELECT jsonb_agg(jsonb_build_object('schema', table_schema, 'table', table_name))\
FROM information_schema.tables\
WHERE table_schema IN ('public','unified_model');" > "$TABLES_OUT"

if [ -s "$TABLES_OUT" ]; then
  echo "Tables snapshot saved to $TABLES_OUT"
fi

echo "Done."
