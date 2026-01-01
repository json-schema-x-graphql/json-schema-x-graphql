#!/bin/bash
set -e

# Master Benchmark Runner Script
# Runs all performance benchmarks: JSON Schema → GraphQL conversion, validation
# Optionally compares against baseline and outputs reports for CI/CD

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT/converters/node"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse arguments
ITERATIONS=100
OUTPUT_DIR=""
JSON_OUTPUT=false
COMPARE_BASELINE=""
SAVE_BASELINE=false
QUICK_MODE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --iterations=*)
      ITERATIONS="${1#*=}"
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
    --compare=*)
      COMPARE_BASELINE="${1#*=}"
      shift
      ;;
    --save-baseline)
      SAVE_BASELINE=true
      shift
      ;;
    --quick)
      QUICK_MODE=true
      ITERATIONS=10
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --iterations=N        Number of iterations per benchmark (default: 100)"
      echo "  --output-dir=DIR      Directory to save reports"
      echo "  --json                Output results in JSON format"
      echo "  --compare=FILE        Compare results with baseline file"
      echo "  --save-baseline       Save results as baseline"
      echo "  --quick               Quick benchmark mode (10 iterations)"
      echo "  --help                Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0 --quick                                    # Quick benchmark"
      echo "  $0 --iterations=1000 --save-baseline          # Full benchmark and save"
      echo "  $0 --compare=baseline.json                    # Compare with baseline"
      echo ""
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

echo -e "${MAGENTA}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║  JSON Schema ↔ GraphQL Performance Benchmark Suite         ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Display configuration
echo -e "${BLUE}Configuration:${NC}"
echo -e "  Iterations:     ${CYAN}$ITERATIONS${NC}"
if [ "$QUICK_MODE" = true ]; then
  echo -e "  Mode:           ${YELLOW}Quick${NC}"
else
  echo -e "  Mode:           ${GREEN}Full${NC}"
fi
if [ -n "$OUTPUT_DIR" ]; then
  echo -e "  Output dir:     ${CYAN}$OUTPUT_DIR${NC}"
fi
if [ -n "$COMPARE_BASELINE" ]; then
  echo -e "  Compare with:   ${CYAN}$COMPARE_BASELINE${NC}"
fi
if [ "$SAVE_BASELINE" = true ]; then
  echo -e "  Save baseline:  ${GREEN}Yes${NC}"
fi
echo ""

# Create output directory if specified
if [ -n "$OUTPUT_DIR" ]; then
  mkdir -p "$OUTPUT_DIR"
fi

# Determine output file
OUTPUT_FILE=""
if [ -n "$OUTPUT_DIR" ]; then
  if [ "$SAVE_BASELINE" = true ]; then
    OUTPUT_FILE="$OUTPUT_DIR/baseline-benchmark.json"
  else
    OUTPUT_FILE="$OUTPUT_DIR/benchmark-report.json"
  fi
fi

# Run benchmarks
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Running Performance Benchmarks${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Suggest running with --expose-gc for better memory measurements
echo -e "${YELLOW}💡 Tip: For accurate memory measurements, run with --expose-gc:${NC}"
echo -e "   ${CYAN}node --expose-gc $(which tsx) ../../scripts/benchmarks/run-benchmarks.ts${NC}"
echo ""

BENCH_ARGS="--iterations=$ITERATIONS"
if [ -n "$OUTPUT_FILE" ]; then
  BENCH_ARGS="$BENCH_ARGS --output=$OUTPUT_FILE"
fi
if [ "$JSON_OUTPUT" = true ]; then
  BENCH_ARGS="$BENCH_ARGS --json"
fi
if [ -n "$COMPARE_BASELINE" ]; then
  BENCH_ARGS="$BENCH_ARGS --compare=$COMPARE_BASELINE"
fi

set +e
pnpm tsx ../../scripts/benchmarks/run-benchmarks.ts $BENCH_ARGS
BENCH_EXIT=$?
set -e

echo ""

# Summary
echo -e "${MAGENTA}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║  Benchmark Summary                                         ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $BENCH_EXIT -eq 0 ]; then
  echo -e "${GREEN}✅ Benchmarks completed successfully!${NC}"
  echo ""

  if [ -n "$OUTPUT_FILE" ]; then
    echo -e "${BLUE}📊 Results saved to: ${CYAN}$OUTPUT_FILE${NC}"
    echo ""
  fi

  if [ "$SAVE_BASELINE" = true ]; then
    echo -e "${GREEN}✅ Baseline saved!${NC}"
    echo -e "   Use ${CYAN}--compare=$OUTPUT_FILE${NC} in future runs to compare"
    echo ""
  fi

  # Suggest next steps
  echo -e "${BLUE}Next steps:${NC}"
  if [ "$QUICK_MODE" = true ]; then
    echo -e "  • Run full benchmark: ${CYAN}./scripts/run-benchmarks.sh --iterations=1000${NC}"
  fi
  if [ "$SAVE_BASELINE" = false ]; then
    echo -e "  • Save as baseline: ${CYAN}./scripts/run-benchmarks.sh --save-baseline${NC}"
  fi
  if [ -z "$COMPARE_BASELINE" ] && [ -f "$PROJECT_ROOT/baseline-benchmark.json" ]; then
    echo -e "  • Compare with baseline: ${CYAN}./scripts/run-benchmarks.sh --compare=baseline-benchmark.json${NC}"
  fi
  echo -e "  • Run integration tests: ${CYAN}./scripts/run-integration-tests.sh${NC}"
  echo ""

  exit 0
else
  echo -e "${RED}❌ Benchmarks failed${NC}"
  echo ""

  # Provide troubleshooting tips
  echo -e "${YELLOW}Troubleshooting:${NC}"
  echo -e "  • Ensure all dependencies are installed: ${CYAN}pnpm install${NC}"
  echo -e "  • Check Node.js version compatibility"
  echo -e "  • Review error messages above"
  echo -e "  • Try quick mode first: ${CYAN}./scripts/run-benchmarks.sh --quick${NC}"
  echo ""

  exit 1
fi
