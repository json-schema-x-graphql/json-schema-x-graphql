#!/usr/bin/env bash
set -euo pipefail

# Simple test script that queries PostGraphile for sample data
HOST=${HOST:-http://localhost:5000}

echo "Querying PostGraphile at $HOST/graphql"

curl -s -X POST "$HOST/graphql" \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ allSolicitations { nodes { id solicitationNumber title amount } } allRequisitions { nodes { id requisitionNumber description amount } } }"}' | jq
