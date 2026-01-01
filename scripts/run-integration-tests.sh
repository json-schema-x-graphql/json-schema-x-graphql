#!/bin/bash
set -e

# Master Integration Test Runner Script
# Runs all integration tests: JSON Schema → GraphQL conversion tests
# Compares generated SDL against expected outputs
# Optionally outputs reports and fails on errors for CI/CD

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT/converters/node"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse arguments
FAIL_ON_ERROR=false
OUTPUT_DIR=""
JSON_OUTPUT=false
VERBOSE=false
UPDATE_EXPECTED=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --fail-on-error)
      FAIL_ON_ERROR=true
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
    --verbose)
      VERBOSE=true
      shift
      ;;
    --update-expected)
      UPDATE_EXPECTED=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--fail-on-error] [--output-dir=DIR] [--json] [--verbose] [--update-expected]"
      exit 1
      ;;
  esac
done

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  JSON Schema → GraphQL Integration Test Suite             ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Create output directory if specified
if [ -n "$OUTPUT_DIR" ]; then
  mkdir -p "$OUTPUT_DIR"
  echo -e "${BLUE}📁 Reports will be saved to: $OUTPUT_DIR${NC}"
  echo ""
fi

# Run integration tests
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Running Integration Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

TEST_ARGS=""
if [ -n "$OUTPUT_DIR" ]; then
  TEST_ARGS="$TEST_ARGS --output=$OUTPUT_DIR/integration-test-report.json"
fi
if [ "$JSON_OUTPUT" = true ]; then
  TEST_ARGS="$TEST_ARGS --json"
fi
if [ "$VERBOSE" = true ]; then
  TEST_ARGS="$TEST_ARGS --verbose"
fi
if [ "$UPDATE_EXPECTED" = true ]; then
  TEST_ARGS="$TEST_ARGS --update-expected"
  echo -e "${YELLOW}⚠️  Update mode: Expected SDL files will be updated${NC}"
  echo ""
fi

set +e
if [ "$FAIL_ON_ERROR" = true ]; then
  pnpm tsx ../../scripts/integration/test-conversions.ts $TEST_ARGS --fail-on-error
else
  pnpm tsx ../../scripts/integration/test-conversions.ts $TEST_ARGS
fi
TEST_EXIT=$?
set -e

echo ""

# Summary
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Integration Test Summary                                  ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $TEST_EXIT -eq 0 ]; then
  echo -e "${GREEN}✅ All integration tests passed!${NC}"
  echo ""

  # Suggest next steps
  if [ "$UPDATE_EXPECTED" = false ]; then
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "  • Run benchmarks: ${CYAN}./scripts/run-benchmarks.sh${NC}"
    echo -e "  • Validate all: ${CYAN}./scripts/run-all-validation.sh${NC}"
    echo ""
  fi

  exit 0
else
  echo -e "${RED}❌ Integration tests failed${NC}"
  echo ""

  # Provide troubleshooting tips
  echo -e "${YELLOW}Troubleshooting:${NC}"
  echo -e "  • Review the output above for specific test failures"
  echo -e "  • Check generated SDL vs expected SDL diffs"
  echo -e "  • Run with ${CYAN}--verbose${NC} for more details"
  echo -e "  • Update expected outputs with ${CYAN}--update-expected${NC} if intentional"
  echo ""

  if [ "$FAIL_ON_ERROR" = true ]; then
    exit 1
  else
    exit 0
  fi
fi
