#!/usr/bin/env bash
# Helper to validate, generate artifacts, and copy approved generated files
# Usage: ./scripts/publish-generated.sh [--no-copy]

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "1/4: Running validation suite (pnpm run validate:all)"
pnpm run validate:all

echo "2/4: Generating interop artifacts"
pnpm run generate:schema:interop

echo "3/4: Generating JSON->GraphQL (hinted) if available"
if [ -f src/data/schema_unification-contract_data-hinted.schema.json ]; then
  node scripts/generate-graphql-enhanced.mjs src/data/schema_unification-contract_data-hinted.schema.json generated-schemas/schema_unification-contract_data-hinted.graphql || true
fi

if [ "${1:-}" = "--no-copy" ]; then
  echo "--no-copy specified; skipping copy step"
  exit 0
fi

echo "4/4: Copying generated artifacts to site-consumed locations"
mkdir -p src/data/generated generated-metadata public/data || true
cp -v generated-schemas/schema_unification.from-graphql.json src/data/generated/ || true
cp -v generated-schemas/schema_unification.from-graphql.json generated-metadata/ || true
cp -v generated-schemas/schema_unification.from-json.graphql src/data/generated/ || true

echo "Publish complete. Review generated files in generated-schemas/ and src/data/generated/"

exit 0
