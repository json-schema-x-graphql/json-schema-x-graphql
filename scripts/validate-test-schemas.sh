#!/usr/bin/env bash
#
# Validate X-GraphQL Test Schemas
#
# This script validates all test schemas in the x-graphql test data directory
# using the x-graphql-validator CLI tool. It can be run manually or as part
# of CI/CD pipelines.
#
# Usage:
#   ./scripts/validate-test-schemas.sh [options]
#
# Options:
#   --fail-on-warning    Exit with error code if warnings are found
#   --verbose            Show detailed validation information
#   --json               Output results as JSON
#   --quiet              Only show errors (suppress warnings)
#
# Exit Codes:
#   0 - All schemas valid
#   1 - Validation errors found
#   2 - Warnings found (with --fail-on-warning)
#   3 - Script error (validator not found, etc.)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEST_DATA_DIR="$PROJECT_ROOT/converters/test-data/x-graphql"
VALIDATOR="$PROJECT_ROOT/converters/node/src/validate-x-graphql.ts"

# Parse command line options
FAIL_ON_WARNING=""
VERBOSE=""
JSON=""
QUIET=""

for arg in "$@"; do
  case $arg in
    --fail-on-warning)
      FAIL_ON_WARNING="--fail-on-warning"
      ;;
    --verbose|-v)
      VERBOSE="--verbose"
      ;;
    --json)
      JSON="--json"
      ;;
    --quiet)
      QUIET="--quiet"
      ;;
    --help|-h)
      head -n 20 "$0" | tail -n +3 | sed 's/^# //'
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $arg${NC}"
      exit 3
      ;;
  esac
done

# Check if test data directory exists
if [ ! -d "$TEST_DATA_DIR" ]; then
  echo -e "${RED}Error: Test data directory not found: $TEST_DATA_DIR${NC}"
  exit 3
fi

# Check if validator exists
if [ ! -f "$VALIDATOR" ]; then
  echo -e "${RED}Error: Validator not found: $VALIDATOR${NC}"
  echo "Please ensure the Node.js converter is set up correctly."
  exit 3
fi

# Print header
if [ -z "$JSON" ]; then
  echo -e "${BLUE}================================================${NC}"
  echo -e "${BLUE}  X-GraphQL Test Schema Validation${NC}"
  echo -e "${BLUE}================================================${NC}"
  echo ""
  echo "Test Data Directory: $TEST_DATA_DIR"
  echo "Validator: $VALIDATOR"
  echo ""
fi

# Find all JSON test schemas (exclude expected/ directory)
TEST_SCHEMAS=$(find "$TEST_DATA_DIR" -maxdepth 1 -name "*.json" -type f | sort)

if [ -z "$TEST_SCHEMAS" ]; then
  echo -e "${RED}Error: No test schemas found in $TEST_DATA_DIR${NC}"
  exit 3
fi

# Count schemas
SCHEMA_COUNT=$(echo "$TEST_SCHEMAS" | wc -l)

if [ -z "$JSON" ]; then
  echo -e "Found ${GREEN}$SCHEMA_COUNT${NC} test schema(s)"
  echo ""
fi

# Change to converter directory to run validator
cd "$PROJECT_ROOT/converters/node"

# Run validation
EXIT_CODE=0

if [ -z "$JSON" ]; then
  # Human-readable output
  for schema in $TEST_SCHEMAS; do
    schema_name=$(basename "$schema")

    if [ -n "$VERBOSE" ]; then
      echo -e "${BLUE}Validating: $schema_name${NC}"
    fi

    # Run validator
    if npx ts-node "$VALIDATOR" "$schema" $FAIL_ON_WARNING $VERBOSE $QUIET 2>&1; then
      if [ -z "$QUIET" ]; then
        echo -e "${GREEN}✓${NC} $schema_name"
      fi
    else
      VALIDATION_EXIT=$?
      echo -e "${RED}✗${NC} $schema_name"
      if [ $VALIDATION_EXIT -eq 1 ]; then
        EXIT_CODE=1
      elif [ $VALIDATION_EXIT -eq 2 ]; then
        EXIT_CODE=2
      fi
    fi

    if [ -n "$VERBOSE" ]; then
      echo ""
    fi
  done

  echo ""
  echo -e "${BLUE}================================================${NC}"

  if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All schemas valid!${NC}"
  elif [ $EXIT_CODE -eq 1 ]; then
    echo -e "${RED}✗ Validation errors found${NC}"
  elif [ $EXIT_CODE -eq 2 ]; then
    echo -e "${YELLOW}⚠ Validation warnings found (--fail-on-warning enabled)${NC}"
  fi

  echo -e "${BLUE}================================================${NC}"
else
  # JSON output - validate all at once
  npx ts-node "$VALIDATOR" $TEST_SCHEMAS $FAIL_ON_WARNING $JSON
  EXIT_CODE=$?
fi

exit $EXIT_CODE
