#!/bin/bash
set -e

# Master Validation Runner Script
# Runs all validation tools: JSON Schema validation, GraphQL SDL validation
# Optionally outputs reports and fails on errors for CI/CD

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT/converters/node"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
FAIL_ON_ERROR=false
FAIL_ON_WARNING=false
OUTPUT_DIR=""
JSON_OUTPUT=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --fail-on-error)
      FAIL_ON_ERROR=true
      shift
      ;;
    --fail-on-warning)
      FAIL_ON_WARNING=true
      shift
      ;;
    --output-dir=*)
      OUTPUT_DIR="${1#*=}"
      shift
      ;;
    --json)
      JSON_OUTPUT=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  JSON Schema ↔ GraphQL Validation Suite                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

TOTAL_ERRORS=0
TOTAL_WARNINGS=0

# Create output directory if specified
if [ -n "$OUTPUT_DIR" ]; then
  mkdir -p "$OUTPUT_DIR"
  echo -e "${BLUE}📁 Reports will be saved to: $OUTPUT_DIR${NC}"
  echo ""
fi

# 1. Validate JSON Schemas
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}1. Validating JSON Schemas${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

SCHEMA_ARGS=""
if [ -n "$OUTPUT_DIR" ]; then
  SCHEMA_ARGS="$SCHEMA_ARGS --output=$OUTPUT_DIR/schema-validation.json"
fi
if [ "$JSON_OUTPUT" = true ]; then
  SCHEMA_ARGS="$SCHEMA_ARGS --json"
fi

set +e
if [ "$FAIL_ON_WARNING" = true ]; then
  pnpm tsx ../../scripts/validation/validate-schemas.ts $SCHEMA_ARGS --fail-on-warning
else
  pnpm tsx ../../scripts/validation/validate-schemas.ts $SCHEMA_ARGS
fi
SCHEMA_EXIT=$?
set -e

if [ $SCHEMA_EXIT -ne 0 ]; then
  TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
  echo -e "${RED}❌ JSON Schema validation failed${NC}"
else
  echo -e "${GREEN}✅ JSON Schema validation passed${NC}"
fi
echo ""

# 2. Validate GraphQL SDL
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}2. Validating GraphQL SDL${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

GRAPHQL_ARGS=""
if [ -n "$OUTPUT_DIR" ]; then
  GRAPHQL_ARGS="$GRAPHQL_ARGS --output=$OUTPUT_DIR/graphql-validation.json"
fi
if [ "$JSON_OUTPUT" = true ]; then
  GRAPHQL_ARGS="$GRAPHQL_ARGS --json"
fi

set +e
if [ "$FAIL_ON_WARNING" = true ]; then
  pnpm tsx ../../scripts/validation/validate-graphql.ts $GRAPHQL_ARGS --fail-on-warning
else
  pnpm tsx ../../scripts/validation/validate-graphql.ts $GRAPHQL_ARGS
fi
GRAPHQL_EXIT=$?
set -e

if [ $GRAPHQL_EXIT -ne 0 ]; then
  TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
  echo -e "${RED}❌ GraphQL SDL validation failed${NC}"
else
  echo -e "${GREEN}✅ GraphQL SDL validation passed${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Validation Summary                                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $TOTAL_ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ All validations passed!${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}❌ $TOTAL_ERRORS validation suite(s) failed${NC}"
  echo ""
  if [ "$FAIL_ON_ERROR" = true ]; then
    exit 1
  else
    exit 0
  fi
fi
