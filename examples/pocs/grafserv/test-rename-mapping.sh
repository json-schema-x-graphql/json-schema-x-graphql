#!/usr/bin/env bash
set -euo pipefail
DIR=$(cd "$(dirname "$0")" && pwd)
cd "$DIR"

echo "Generating rename mapping (POSTGRAPHILE_URL=${POSTGRAPHILE_URL:-http://127.0.0.1:5001/graphql})"
node generate-rename-mapping.js
OUT=rename-mapping.json
if [ -f "$OUT" ]; then
  echo "Mapping file created: $OUT"
  wc -c "$OUT"
  exit 0
else
  echo "Mapping file not created"
  exit 1
fi
