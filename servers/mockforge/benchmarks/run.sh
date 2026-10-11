#!/usr/bin/env bash
#
# Top-level entrypoint for the mock server benchmarking gauntlet.
#
# Usage:
#   ./run.sh --target=local       # custom Node.js server only (fast, ~30s)
#   ./run.sh --target=upstream    # MockForge upstream only (~30 min first time)
#   ./run.sh --target=all         # both side-by-side
#
# Flags are forwarded to gauntlet.mjs.

set -euo pipefail
cd "$(dirname "$0")"

# Make sibling scripts executable (idempotent)
chmod +x mockforge-local/up.sh mockforge-upstream/up.sh

# Default to local for fast feedback on a fresh clone
ARGS=("$@")
if [[ ${#ARGS[@]} -eq 0 ]]; then
  ARGS=(--target=local)
fi

# Sanity: workloads must exist
if [[ ! -f workloads/queries.json ]]; then
  echo "FATAL: workloads/queries.json missing" >&2
  exit 2
fi

echo "[gauntlet] target=${ARGS[*]}"
echo "[gauntlet] reports will appear in ./reports/"
echo ""

# Strip the leading "--" so the gauntlet sees --target=local, not --target=--target=local
STRIPPED=()
for arg in "${ARGS[@]}"; do
  if [[ "$arg" == --* ]]; then
    STRIPPED+=("${arg#--}")
  else
    STRIPPED+=("$arg")
  fi
done

exec node gauntlet.mjs "${STRIPPED[@]}"