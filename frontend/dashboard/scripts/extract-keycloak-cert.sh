#!/usr/bin/env bash
# Usage: ./scripts/extract-keycloak-cert.sh http://localhost:8081/ ttse
# This will fetch the realm certs and print the first x5c entry.

BASEURL=${1:-http://localhost:8081}
REALM=${2:-ttse}

set -euo pipefail

echo "Fetching realm certs from ${BASEURL}/realms/${REALM}/protocol/openid-connect/certs"
curl -s ${BASEURL}/realms/${REALM}/protocol/openid-connect/certs | jq -r '.keys[0].x5c[0]'

echo "\n# Paste the output above into Login.gov's Public Certificate field when registering the client."
