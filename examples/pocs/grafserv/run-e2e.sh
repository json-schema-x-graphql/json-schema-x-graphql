#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")"/.. && pwd)
PG_POC_DIR="$ROOT/../postgraphile"

echo "Starting PostGraphile test stack (docker-compose)..."
cd "$PG_POC_DIR"
docker compose up -d --build

echo "Waiting for PostGraphile to become available on http://localhost:5000/graphql..."
for i in {1..30}; do
  if curl -sS -X POST http://localhost:5000/graphql -H 'Content-Type: application/json' -d '{"query":"{ __typename }"}' >/dev/null 2>&1; then
    echo "PostGraphile responsive"
    break
  fi
  echo -n "."
  sleep 1
done

echo "Generating rename mapping against POSTGRAPHILE_URL=http://127.0.0.1:5000/graphql"
cd "$ROOT"
export POSTGRAPHILE_URL="http://127.0.0.1:5000/graphql"
npm ci --no-audit --no-fund >/dev/null 2>&1 || true
node generate-rename-mapping.js

echo "Starting grafserv (delegate)..."
node server.delegate.js &
GRAFPID=$!
echo "grafserv pid=$GRAFPID"

sleep 2
echo "Running smoke query against grafserv (http://localhost:4001/graphql)"
curl -s -X POST http://localhost:4001/graphql -H 'Content-Type: application/json' -d '{"query":"{ solicitations(limit:1){ id solicitation_number title } }"}' | jq

echo "Cleaning up: stopping grafserv and docker compose"
kill $GRAFPID || true
cd "$PG_POC_DIR"
docker compose down

echo "E2E finished"
