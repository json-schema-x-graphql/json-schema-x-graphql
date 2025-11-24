#!/bin/bash

#############################################################################
# Test Parity Script
#
# Validates that Rust and Node.js converters produce identical results
#
# Usage:
#   ./scripts/test-parity.sh [test-file]
#
# Examples:
#   ./scripts/test-parity.sh
#   ./scripts/test-parity.sh converters/test-data/user-service.json
#############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Temporary directory for outputs
TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  JSON Schema x GraphQL - Converter Parity Test        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

#############################################################################
# Helper Functions
#############################################################################

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

normalize_sdl() {
    # Remove empty lines and trim whitespace for comparison
    sed '/^\s*$/d' "$1" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' > "$1.normalized"
    mv "$1.normalized" "$1"
}

compare_files() {
    local file1="$1"
    local file2="$2"
    local description="$3"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if diff -w "$file1" "$file2" > /dev/null 2>&1; then
        log_success "$description"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        log_error "$description"
        echo "  Expected: $file1"
        echo "  Got:      $file2"
        echo ""
        echo "  Diff:"
        diff -u "$file1" "$file2" || true
        echo ""
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

#############################################################################
# Setup
#############################################################################

log_info "Setting up test environment..."

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    log_error "Cargo not found. Please install Rust: https://rustup.rs/"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    log_error "Node.js not found. Please install Node.js 18+: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log_error "Node.js 18+ required. Found: $(node --version)"
    exit 1
fi

log_success "Environment check passed"
echo ""

#############################################################################
# Build Converters
#############################################################################

log_info "Building Rust converter..."
cd converters/rust
if cargo build --release > /dev/null 2>&1; then
    log_success "Rust converter built successfully"
else
    log_error "Failed to build Rust converter"
    exit 1
fi
cd ../..

log_info "Building Node.js converter..."
cd converters/node
if npm run build > /dev/null 2>&1; then
    log_success "Node.js converter built successfully"
else
    log_error "Failed to build Node.js converter"
    exit 1
fi
cd ../..

echo ""

#############################################################################
# Test Data
#############################################################################

# Use provided test file or default
if [ -n "$1" ]; then
    TEST_FILES=("$1")
else
    TEST_FILES=(
        "converters/test-data/user-service.json"
    )
fi

log_info "Testing with ${#TEST_FILES[@]} schema(s)..."
echo ""

#############################################################################
# Run Parity Tests
#############################################################################

for TEST_FILE in "${TEST_FILES[@]}"; do
    if [ ! -f "$TEST_FILE" ]; then
        log_warning "Test file not found: $TEST_FILE"
        continue
    fi

    BASENAME=$(basename "$TEST_FILE" .json)
    log_info "Testing: $BASENAME"
    echo ""

    # Test 1: JSON -> SDL (Rust)
    log_info "  Converting JSON -> SDL with Rust..."
    RUST_SDL="$TMP_DIR/${BASENAME}-rust.graphql"
    if cargo run --manifest-path converters/rust/Cargo.toml --release --example convert_json_to_sdl -- "$TEST_FILE" > "$RUST_SDL" 2>&1; then
        normalize_sdl "$RUST_SDL"
        log_success "  Rust conversion completed"
    else
        log_error "  Rust conversion failed"
        cat "$RUST_SDL"
        continue
    fi

    # Test 2: JSON -> SDL (Node.js)
    log_info "  Converting JSON -> SDL with Node.js..."
    NODE_SDL="$TMP_DIR/${BASENAME}-node.graphql"
    if node converters/node/dist/examples/convert-json-to-sdl.js "$TEST_FILE" > "$NODE_SDL" 2>&1; then
        normalize_sdl "$NODE_SDL"
        log_success "  Node.js conversion completed"
    else
        log_error "  Node.js conversion failed"
        cat "$NODE_SDL"
        continue
    fi

    echo ""

    # Test 3: Compare SDL outputs
    compare_files "$RUST_SDL" "$NODE_SDL" "  JSON -> SDL: Rust vs Node.js parity"

    echo ""

    # If there's a corresponding .graphql file, test round-trip
    GRAPHQL_FILE="${TEST_FILE%.json}.graphql"
    if [ -f "$GRAPHQL_FILE" ]; then
        log_info "  Testing round-trip conversion..."

        # Test 4: SDL -> JSON (Rust)
        log_info "    Converting SDL -> JSON with Rust..."
        RUST_JSON="$TMP_DIR/${BASENAME}-rust.json"
        if cargo run --manifest-path converters/rust/Cargo.toml --release --example convert_sdl_to_json -- "$GRAPHQL_FILE" > "$RUST_JSON" 2>&1; then
            log_success "    Rust SDL -> JSON completed"
        else
            log_error "    Rust SDL -> JSON failed"
            cat "$RUST_JSON"
            continue
        fi

        # Test 5: SDL -> JSON (Node.js)
        log_info "    Converting SDL -> JSON with Node.js..."
        NODE_JSON="$TMP_DIR/${BASENAME}-node.json"
        if node converters/node/dist/examples/convert-sdl-to-json.js "$GRAPHQL_FILE" > "$NODE_JSON" 2>&1; then
            log_success "    Node.js SDL -> JSON completed"
        else
            log_error "    Node.js SDL -> JSON failed"
            cat "$NODE_JSON"
            continue
        fi

        echo ""

        # Test 6: Compare JSON outputs
        compare_files "$RUST_JSON" "$NODE_JSON" "    SDL -> JSON: Rust vs Node.js parity"

        # Test 7: Validate round-trip (JSON -> SDL -> JSON)
        RUST_ROUNDTRIP_JSON="$TMP_DIR/${BASENAME}-rust-roundtrip.json"
        if cargo run --manifest-path converters/rust/Cargo.toml --release --example convert_sdl_to_json -- "$RUST_SDL" > "$RUST_ROUNDTRIP_JSON" 2>&1; then
            compare_files "$TEST_FILE" "$RUST_ROUNDTRIP_JSON" "    Round-trip fidelity (Rust): JSON -> SDL -> JSON"
        fi

        NODE_ROUNDTRIP_JSON="$TMP_DIR/${BASENAME}-node-roundtrip.json"
        if node converters/node/dist/examples/convert-sdl-to-json.js "$NODE_SDL" > "$NODE_ROUNDTRIP_JSON" 2>&1; then
            compare_files "$TEST_FILE" "$NODE_ROUNDTRIP_JSON" "    Round-trip fidelity (Node): JSON -> SDL -> JSON"
        fi

        echo ""
    fi

    echo ""
done

#############################################################################
# Summary
#############################################################################

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Test Summary                                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Total Tests:  $TOTAL_TESTS"
echo -e "  Passed:       ${GREEN}$PASSED_TESTS${NC}"
echo -e "  Failed:       ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All parity tests passed!${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
    echo ""
    exit 1
fi
