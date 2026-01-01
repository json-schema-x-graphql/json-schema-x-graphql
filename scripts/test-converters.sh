#!/bin/bash

# Comprehensive Converter Testing and Benchmarking Script
# Tests both Node.js and Rust converters, compares outputs, and runs benchmarks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_DATA_DIR="$PROJECT_ROOT/converters/test-data/x-graphql"
OUTPUT_DIR="$PROJECT_ROOT/output/converter-tests"
BENCHMARK_DIR="$PROJECT_ROOT/output/benchmarks"
NODE_CONVERTER="$PROJECT_ROOT/converters/node"
RUST_CONVERTER="$PROJECT_ROOT/converters/rust"

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Create output directories
mkdir -p "$OUTPUT_DIR/node"
mkdir -p "$OUTPUT_DIR/rust"
mkdir -p "$OUTPUT_DIR/diffs"
mkdir -p "$BENCHMARK_DIR"

# Function to print section headers
print_header() {
    echo ""
    echo -e "${BOLD}${CYAN}========================================${NC}"
    echo -e "${BOLD}${CYAN}$1${NC}"
    echo -e "${BOLD}${CYAN}========================================${NC}"
    echo ""
}

# Function to print test status
print_test() {
    local status=$1
    local message=$2
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} $message"
        ((PASSED_TESTS++))
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}✗${NC} $message"
        ((FAILED_TESTS++))
    elif [ "$status" = "SKIP" ]; then
        echo -e "${YELLOW}⊘${NC} $message"
    else
        echo -e "${BLUE}→${NC} $message"
    fi
    ((TOTAL_TESTS++))
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_header "Checking Prerequisites"

if command_exists node; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js: $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js not found"
    exit 1
fi

if command_exists npm; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} npm: $NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm not found"
    exit 1
fi

RUST_AVAILABLE=false
if command_exists cargo; then
    CARGO_VERSION=$(cargo --version)
    echo -e "${GREEN}✓${NC} Cargo: $CARGO_VERSION"
    RUST_AVAILABLE=true
else
    echo -e "${YELLOW}⚠${NC} Rust/Cargo not found - Rust tests will be skipped"
fi

# Build Node.js converter
print_header "Building Node.js Converter"
cd "$NODE_CONVERTER"
echo "Installing dependencies..."
npm install --silent 2>/dev/null || npm install
echo "Building TypeScript..."
npm run build
echo -e "${GREEN}✓${NC} Node.js converter built successfully"

# Build Rust converter (if available)
if [ "$RUST_AVAILABLE" = true ]; then
    print_header "Building Rust Converter"
    cd "$RUST_CONVERTER"
    echo "Building release binary..."
    cargo build --release --bin jxql 2>&1 | grep -E "Compiling|Finished|error|warning" || true
    if [ -f "target/release/jxql" ]; then
        echo -e "${GREEN}✓${NC} Rust converter built successfully"
    else
        echo -e "${RED}✗${NC} Rust converter build failed"
        RUST_AVAILABLE=false
    fi
fi

# Test Node.js Converter
print_header "Testing Node.js Converter"
cd "$NODE_CONVERTER"

echo "Running test suite..."
if npm test -- --silent 2>&1 | tee "$OUTPUT_DIR/node-test-results.txt"; then
    echo -e "${GREEN}✓${NC} Node.js tests passed"
else
    echo -e "${RED}✗${NC} Node.js tests failed - see $OUTPUT_DIR/node-test-results.txt"
fi

# Generate SDL outputs from Node.js converter
print_header "Generating Node.js SDL Outputs"

for schema_file in "$TEST_DATA_DIR"/*.json; do
    if [ -f "$schema_file" ]; then
        schema_name=$(basename "$schema_file" .json)
        output_file="$OUTPUT_DIR/node/${schema_name}.graphql"

        echo "Converting $schema_name..."
        if node dist/cli.js --input "$schema_file" --output "$output_file" --descriptions --preserve-order 2>/dev/null; then
            print_test "PASS" "Node.js: $schema_name"

            # Compare with expected output if it exists
            expected_file="$TEST_DATA_DIR/expected/${schema_name}.graphql"
            if [ -f "$expected_file" ]; then
                if diff -u "$expected_file" "$output_file" > "$OUTPUT_DIR/diffs/node-${schema_name}.diff" 2>&1; then
                    print_test "PASS" "Node.js matches expected: $schema_name"
                    rm "$OUTPUT_DIR/diffs/node-${schema_name}.diff"
                else
                    print_test "FAIL" "Node.js differs from expected: $schema_name (see diffs/node-${schema_name}.diff)"
                fi
            fi
        else
            print_test "FAIL" "Node.js: $schema_name"
        fi
    fi
done

# Test Rust Converter
if [ "$RUST_AVAILABLE" = true ]; then
    print_header "Testing Rust Converter"
    cd "$RUST_CONVERTER"

    echo "Running test suite..."
    if cargo test --lib 2>&1 | tee "$OUTPUT_DIR/rust-test-results.txt"; then
        echo -e "${GREEN}✓${NC} Rust tests passed"
    else
        echo -e "${RED}✗${NC} Rust tests failed - see $OUTPUT_DIR/rust-test-results.txt"
    fi

    # Generate SDL outputs from Rust converter
    print_header "Generating Rust SDL Outputs"

    RUST_BIN="$RUST_CONVERTER/target/release/jxql"

    for schema_file in "$TEST_DATA_DIR"/*.json; do
        if [ -f "$schema_file" ]; then
            schema_name=$(basename "$schema_file" .json)
            output_file="$OUTPUT_DIR/rust/${schema_name}.graphql"

            echo "Converting $schema_name..."
            if "$RUST_BIN" --input "$schema_file" --output "$output_file" --descriptions --preserve-order 2>/dev/null; then
                print_test "PASS" "Rust: $schema_name"

                # Compare with expected output if it exists
                expected_file="$TEST_DATA_DIR/expected/${schema_name}.graphql"
                if [ -f "$expected_file" ]; then
                    if diff -u "$expected_file" "$output_file" > "$OUTPUT_DIR/diffs/rust-${schema_name}.diff" 2>&1; then
                        print_test "PASS" "Rust matches expected: $schema_name"
                        rm "$OUTPUT_DIR/diffs/rust-${schema_name}.diff"
                    else
                        print_test "FAIL" "Rust differs from expected: $schema_name (see diffs/rust-${schema_name}.diff)"
                    fi
                fi

                # Compare Node.js vs Rust output
                node_output="$OUTPUT_DIR/node/${schema_name}.graphql"
                if [ -f "$node_output" ]; then
                    if diff -u "$node_output" "$output_file" > "$OUTPUT_DIR/diffs/node-vs-rust-${schema_name}.diff" 2>&1; then
                        print_test "PASS" "Node.js ≡ Rust: $schema_name"
                        rm "$OUTPUT_DIR/diffs/node-vs-rust-${schema_name}.diff"
                    else
                        print_test "FAIL" "Node.js ≠ Rust: $schema_name (see diffs/node-vs-rust-${schema_name}.diff)"
                    fi
                fi
            else
                print_test "FAIL" "Rust: $schema_name"
            fi
        fi
    done
fi

# Benchmark Node.js Converter
print_header "Benchmarking Node.js Converter"
cd "$NODE_CONVERTER"

echo "Running quick benchmark (10 iterations)..."
BENCHMARK_START=$(date +%s%N)

for i in {1..10}; do
    for schema_file in "$TEST_DATA_DIR"/*.json; do
        if [ -f "$schema_file" ]; then
            node dist/cli.js --input "$schema_file" > /dev/null 2>&1
        fi
    done
done

BENCHMARK_END=$(date +%s%N)
NODE_DURATION=$(( (BENCHMARK_END - BENCHMARK_START) / 1000000 ))
NODE_AVG=$(( NODE_DURATION / 10 ))

echo -e "${CYAN}Node.js Benchmark Results:${NC}"
echo "  Total time (10 iterations): ${NODE_DURATION}ms"
echo "  Average per iteration: ${NODE_AVG}ms"

# Save benchmark results
cat > "$BENCHMARK_DIR/node-benchmark.json" <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "converter": "node",
  "version": "$(node --version)",
  "iterations": 10,
  "total_ms": $NODE_DURATION,
  "avg_ms": $NODE_AVG,
  "schemas_tested": $(find "$TEST_DATA_DIR" -name "*.json" | wc -l)
}
EOF

# Benchmark Rust Converter
if [ "$RUST_AVAILABLE" = true ]; then
    print_header "Benchmarking Rust Converter"
    cd "$RUST_CONVERTER"

    echo "Running quick benchmark (10 iterations)..."
    RUST_BIN="$RUST_CONVERTER/target/release/jxql"
    BENCHMARK_START=$(date +%s%N)

    for i in {1..10}; do
        for schema_file in "$TEST_DATA_DIR"/*.json; do
            if [ -f "$schema_file" ]; then
                "$RUST_BIN" --input "$schema_file" > /dev/null 2>&1
            fi
        done
    done

    BENCHMARK_END=$(date +%s%N)
    RUST_DURATION=$(( (BENCHMARK_END - BENCHMARK_START) / 1000000 ))
    RUST_AVG=$(( RUST_DURATION / 10 ))

    echo -e "${CYAN}Rust Benchmark Results:${NC}"
    echo "  Total time (10 iterations): ${RUST_DURATION}ms"
    echo "  Average per iteration: ${RUST_AVG}ms"

    # Save benchmark results
    cat > "$BENCHMARK_DIR/rust-benchmark.json" <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "converter": "rust",
  "version": "$(rustc --version)",
  "iterations": 10,
  "total_ms": $RUST_DURATION,
  "avg_ms": $RUST_AVG,
  "schemas_tested": $(find "$TEST_DATA_DIR" -name "*.json" | wc -l)
}
EOF

    # Performance comparison
    print_header "Performance Comparison"

    if [ $RUST_DURATION -lt $NODE_DURATION ]; then
        SPEEDUP=$(echo "scale=2; $NODE_DURATION / $RUST_DURATION" | bc)
        echo -e "${GREEN}Rust is ${SPEEDUP}x faster than Node.js${NC}"
    else
        SLOWDOWN=$(echo "scale=2; $RUST_DURATION / $NODE_DURATION" | bc)
        echo -e "${YELLOW}Rust is ${SLOWDOWN}x slower than Node.js${NC}"
    fi

    # Save comparison
    cat > "$BENCHMARK_DIR/comparison.json" <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "node_ms": $NODE_DURATION,
  "rust_ms": $RUST_DURATION,
  "speedup": $(echo "scale=2; $NODE_DURATION / $RUST_DURATION" | bc),
  "iterations": 10
}
EOF
fi

# Manual Review Summary
print_header "Manual Review Summary"

echo "Generated outputs are available in:"
echo "  Node.js: $OUTPUT_DIR/node/"
if [ "$RUST_AVAILABLE" = true ]; then
    echo "  Rust:    $OUTPUT_DIR/rust/"
fi
echo "  Diffs:   $OUTPUT_DIR/diffs/"
echo ""

echo "Key files to review:"
for schema_file in "$TEST_DATA_DIR"/*.json; do
    schema_name=$(basename "$schema_file" .json)
    echo ""
    echo -e "${BOLD}$schema_name:${NC}"
    echo "  Input:    $schema_file"
    echo "  Expected: $TEST_DATA_DIR/expected/${schema_name}.graphql"
    echo "  Node.js:  $OUTPUT_DIR/node/${schema_name}.graphql"
    if [ "$RUST_AVAILABLE" = true ]; then
        echo "  Rust:     $OUTPUT_DIR/rust/${schema_name}.graphql"
    fi

    # Show if differences exist
    if [ -f "$OUTPUT_DIR/diffs/node-${schema_name}.diff" ]; then
        echo -e "  ${RED}⚠ Node.js differs from expected${NC}"
    fi
    if [ -f "$OUTPUT_DIR/diffs/rust-${schema_name}.diff" ]; then
        echo -e "  ${RED}⚠ Rust differs from expected${NC}"
    fi
    if [ -f "$OUTPUT_DIR/diffs/node-vs-rust-${schema_name}.diff" ]; then
        echo -e "  ${RED}⚠ Node.js and Rust outputs differ${NC}"
    fi
done

# Feature validation checklist
print_header "Feature Validation Checklist"

echo "Review the following in generated outputs:"
echo ""
echo -e "${BOLD}1. Interface Generation${NC} (interfaces.json)"
echo "   - Check: 'interface Node' not 'type Node'"
echo "   - Check: Types implementing interfaces have 'implements' clause"
echo ""
echo -e "${BOLD}2. Field Type Overrides${NC} (comprehensive-features.json, comprehensive.json)"
echo "   - Check: Custom scalars (Email, URL, DateTime, JSON) are used"
echo "   - Check: x-graphql-field-type takes precedence"
echo ""
echo -e "${BOLD}3. Skip Attributes${NC} (skip-fields.json)"
echo "   - Check: Skipped types are not in output"
echo "   - Check: Skipped fields are not in output"
echo ""
echo -e "${BOLD}4. Nullability Overrides${NC} (nullability.json)"
echo "   - Check: x-graphql-field-non-null adds '!' markers"
echo "   - Check: x-graphql-nullable removes '!' markers"
echo ""
echo -e "${BOLD}5. List Item Non-Null${NC} (comprehensive.json)"
echo "   - Check: Arrays with non-null items show '[String!]' syntax"
echo ""
echo -e "${BOLD}6. Federation Directives${NC} (comprehensive-features.json)"
echo "   - Check: @key, @requires, @provides, @external, @override present"
echo "   - Check: Directive arguments formatted correctly"
echo ""
echo -e "${BOLD}7. Descriptions${NC} (descriptions.json)"
echo "   - Check: Type and field descriptions present"
echo "   - Check: Block style (triple quotes) for multi-line"
echo ""
echo -e "${BOLD}8. Union Types${NC} (unions.json)"
echo "   - Check: Union syntax 'union Name = Type1 | Type2'"
echo "   - Check: Union members exist in schema"

# Final Summary
print_header "Test Summary"

echo -e "${BOLD}Total Tests:${NC} $TOTAL_TESTS"
echo -e "${GREEN}${BOLD}Passed:${NC}${GREEN} $PASSED_TESTS${NC}"
echo -e "${RED}${BOLD}Failed:${NC}${RED} $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✓ ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}${BOLD}✗ SOME TESTS FAILED${NC}"
    echo ""
    echo "Review the following for details:"
    echo "  - Diff files in: $OUTPUT_DIR/diffs/"
    echo "  - Node.js test results: $OUTPUT_DIR/node-test-results.txt"
    if [ "$RUST_AVAILABLE" = true ]; then
        echo "  - Rust test results: $OUTPUT_DIR/rust-test-results.txt"
    fi
    exit 1
fi
