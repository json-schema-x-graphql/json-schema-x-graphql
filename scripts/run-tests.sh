#!/bin/bash

#############################################################################
# Run Tests Script
#
# Quick start script to run all Phase 3A local tests
#
# Usage:
#   ./scripts/run-tests.sh [rust|node|all]
#
# Examples:
#   ./scripts/run-tests.sh          # Run all tests
#   ./scripts/run-tests.sh rust     # Run only Rust tests
#   ./scripts/run-tests.sh node     # Run only Node.js tests
#############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default to running all tests
TEST_TARGET="${1:-all}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  JSON Schema x GraphQL - Phase 3A Test Runner         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

#############################################################################
# Helper Functions
#############################################################################

log_header() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo ""
}

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

#############################################################################
# Rust Tests
#############################################################################

run_rust_tests() {
    log_header "Rust Converter Tests"

    cd converters/rust

    # Check if Cargo is installed
    if ! command -v cargo &> /dev/null; then
        log_error "Cargo not found. Please install Rust: https://rustup.rs/"
        cd ../..
        return 1
    fi

    log_info "Running Rust tests..."
    echo ""

    # Run tests with output
    if cargo test --verbose; then
        log_success "Rust tests passed"
    else
        log_error "Rust tests failed"
        cd ../..
        return 1
    fi

    echo ""
    log_info "Running clippy (linter)..."
    if cargo clippy -- -D warnings; then
        log_success "Clippy passed"
    else
        log_warning "Clippy warnings found"
    fi

    echo ""
    log_info "Checking code formatting..."
    if cargo fmt -- --check; then
        log_success "Code formatting is correct"
    else
        log_warning "Code needs formatting (run: cargo fmt)"
    fi

    echo ""
    log_info "Generating coverage report..."
    if command -v cargo-tarpaulin &> /dev/null; then
        if cargo tarpaulin --out Html --output-dir coverage; then
            log_success "Coverage report generated: converters/rust/coverage/index.html"
        else
            log_warning "Coverage generation failed"
        fi
    else
        log_warning "cargo-tarpaulin not installed. Install with: cargo install cargo-tarpaulin"
    fi

    cd ../..
    return 0
}

#############################################################################
# Node.js Tests
#############################################################################

run_node_tests() {
    log_header "Node.js Converter Tests"

    cd converters/node

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found. Please install Node.js 18+: https://nodejs.org/"
        cd ../..
        return 1
    fi

    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js 18+ required. Found: $(node --version)"
        cd ../..
        return 1
    fi

    log_info "Installing dependencies..."
    if pnpm install --frozen-lockfile 2>/dev/null || pnpm install; then
        log_success "Dependencies installed"
    else
        log_error "Failed to install dependencies"
        cd ../..
        return 1
    fi

    echo ""
    log_info "Running Node.js tests..."
    echo ""

    if pnpm test; then
        log_success "Node.js tests passed"
    else
        log_error "Node.js tests failed"
        cd ../..
        return 1
    fi

    echo ""
    log_info "Running ESLint..."
    if pnpm run lint; then
        log_success "ESLint passed"
    else
        log_warning "ESLint warnings found"
    fi

    echo ""
    log_info "Checking code formatting..."
    if pnpm run format:check; then
        log_success "Code formatting is correct"
    else
        log_warning "Code needs formatting (run: npm run format)"
    fi

    echo ""
    log_info "Generating coverage report..."
    if pnpm run test:coverage; then
        log_success "Coverage report generated: converters/node/coverage/lcov-report/index.html"
    else
        log_warning "Coverage generation failed"
    fi

    cd ../..
    return 0
}

#############################################################################
# Main Execution
#############################################################################

RUST_EXIT=0
NODE_EXIT=0

case "$TEST_TARGET" in
    rust)
        run_rust_tests || RUST_EXIT=$?
        ;;
    node)
        run_node_tests || NODE_EXIT=$?
        ;;
    all)
        run_rust_tests || RUST_EXIT=$?
        run_node_tests || NODE_EXIT=$?
        ;;
    *)
        echo -e "${RED}Invalid target: $TEST_TARGET${NC}"
        echo "Usage: $0 [rust|node|all]"
        exit 1
        ;;
esac

#############################################################################
# Summary
#############################################################################

echo ""
log_header "Test Summary"

if [ "$TEST_TARGET" = "all" ] || [ "$TEST_TARGET" = "rust" ]; then
    if [ $RUST_EXIT -eq 0 ]; then
        log_success "Rust tests: PASSED"
    else
        log_error "Rust tests: FAILED"
    fi
fi

if [ "$TEST_TARGET" = "all" ] || [ "$TEST_TARGET" = "node" ]; then
    if [ $NODE_EXIT -eq 0 ]; then
        log_success "Node.js tests: PASSED"
    else
        log_error "Node.js tests: FAILED"
    fi
fi

echo ""

# Exit with error if any tests failed
if [ $RUST_EXIT -ne 0 ] || [ $NODE_EXIT -ne 0 ]; then
    log_error "Some tests failed. See output above for details."
    exit 1
else
    log_success "All tests passed!"
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ Phase 3A Testing Complete - Ready for Phase 3B!   ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    exit 0
fi
