#!/usr/bin/env bash
#
# Spin up MockForge (SaaSy-Solutions/mockforge) as a single-subgraph mock server
# for benchmarking against our custom Node.js server.
#
# Usage: ./up.sh
#
# Required env (set automatically by gauntlet.mjs):
#   MOCKFORGE_PORT — port to listen on (default 4102)
#
# Prerequisites:
#   - Rust 1.96.0+ (per mockforge-cli README)
#   - cargo install mockforge-cli (or build from source)
#   - schema.graphql — an SDL file the upstream binary can load
#
# Expected behavior:
#   - Installs the binary if not already present (uses ~/.cargo/bin/mockforge)
#   - Runs `mockforge serve --graphql schema.graphql --graphql-port $MOCKFORGE_PORT`
#   - Forwards SIGTERM/SIGINT for clean shutdown
#   - Writes all output to stdout/stderr so the gauntlet harness can observe readiness
#
# Note: mockforge serve currently has limited GraphQL schema-aware behavior
# (see EVALUATION.md). The harness still exercises the server, surfaces what
# it does/doesn't do, and writes a fair report.
#
set -euo pipefail

PORT="${MOCKFORGE_PORT:-4102}"

# Install if not present
if ! command -v mockforge >/dev/null 2>&1; then
  echo "[upstream] mockforge binary not found; installing via cargo install..."
  echo "[upstream] This may take 10-15 minutes on first install (~60 crates)."
  cargo install mockforge-cli --locked
fi

cd "$(dirname "$0")"

if [[ ! -f schema.graphql ]]; then
  echo "[upstream] ERROR: schema.graphql not found in $(pwd)"
  exit 1
fi

echo "[upstream] Starting mockforge serve --graphql schema.graphql --graphql-port ${PORT}"

# We rely on the harness sending SIGTERM for clean shutdown; exec replaces the shell.
exec mockforge serve \
  --graphql "$(pwd)/schema.graphql" \
  --graphql-port "${PORT}" \
  --log-level info