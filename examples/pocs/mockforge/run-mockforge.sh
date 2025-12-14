#!/usr/bin/env bash
set -euo pipefail

# MockForge Helper — Serve canonical Schema Unification Forest supergraph
# Usage: ./run-mockforge.sh [port]

ROOT_DIR=$(cd "$(dirname "$0")"/../../.. && pwd)
cd "$ROOT_DIR"

PORT="${1:-3000}"
SUPERGRAPH="$ROOT_DIR/generated-schemas/schema_unification.supergraph.graphql"

echo "🚀 Starting MockForge for Schema Unification Forest"
echo "   Supergraph: $SUPERGRAPH"
echo "   Port: $PORT"
echo ""

# Check if supergraph exists
if [ ! -f "$SUPERGRAPH" ]; then
  echo "❌ Supergraph not found at: $SUPERGRAPH"
  echo ""
  echo "Generate it first:"
  echo "  pnpm run generate:supergraph"
  echo "  # or"
  echo "  pnpm run generate:schemas"
  exit 1
fi

# Check for mockforge CLI
if ! command -v mockforge >/dev/null 2>&1; then
  echo "❌ mockforge CLI not found"
  echo ""
  echo "Install options:"
  echo "  1. Cargo: cargo install mockforge-cli"
  echo "  2. Docker: cd dev/pocs/mockforge && docker compose up"
  echo "  3. pnpm: pnpm run mock:docker"
  exit 2
fi

# Serve supergraph
echo "✅ Starting MockForge server..."
echo "   GraphQL endpoint: http://localhost:$PORT/graphql"
echo ""
mockforge serve --spec "$SUPERGRAPH" --port "$PORT"

