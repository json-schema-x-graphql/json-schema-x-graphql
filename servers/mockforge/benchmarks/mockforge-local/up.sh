#!/usr/bin/env bash
#
# Spin up the custom Node.js Apollo Federation mock server for benchmarking.
#
# Usage: ./up.sh
#
# Required env (set automatically by gauntlet.mjs):
#   PORT (default 4101)
#   SYSTEM (default fpds)
#
# The harness invokes `node ../mock-server.js` directly. This wrapper exists
# for symmetry with mockforge-upstream/up.sh and to set env defaults.
#
set -euo pipefail
cd "$(dirname "$0")/.."

export PORT="${PORT:-4101}"
export SYSTEM="${SYSTEM:-fpds}"

exec node mock-server.js