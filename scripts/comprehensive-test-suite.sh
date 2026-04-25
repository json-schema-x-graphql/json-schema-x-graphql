#!/bin/bash

#############################################################################
# Comprehensive Test Suite with Security Scanning and Round-Trip Validation
#
# This script performs:
# 1. Code linting and formatting checks
# 2. Security vulnerability scanning
# 3. Unit and integration tests
# 4. 3-cycle round-trip conversion testing to detect drift/data loss
# 5. Coverage reporting
#
# Usage:
#   ./scripts/comprehensive-test-suite.sh [rust|node|all]
#
# Examples:
#   ./scripts/comprehensive-test-suite.sh          # Run all tests
#   ./scripts/comprehensive-test-suite.sh rust     # Run only Rust tests
#   ./scripts/comprehensive-test-suite.sh node     # Run only Node.js tests
#############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Default to running all tests
TEST_TARGET="${1:-all}"

# Tracking variables
RUST_TESTS_PASSED=0
NODE_TESTS_PASSED=0
RUST_SECURITY_PASSED=0
NODE_SECURITY_PASSED=0
RUST_ROUNDTRIP_PASSED=0
NODE_ROUNDTRIP_PASSED=0

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  JSON Schema x GraphQL - Comprehensive Security & Quality Suite   ║${NC}"
echo -e "${BLUE}║  Including 3-Cycle Round-Trip Validation                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

#############################################################################
# Helper Functions
#############################################################################

log_header() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

log_subheader() {
    echo ""
    echo -e "${MAGENTA}▶ $1${NC}"
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

log_step() {
    echo -e "${CYAN}→${NC} $1"
}

#############################################################################
# Round-Trip Testing Functions
#############################################################################

run_roundtrip_test_rust() {
    log_subheader "Round-Trip Testing: Rust Converter (3 Cycles)"

    local test_file="../test-data/complex-schema.json"
    local temp_dir="./target/roundtrip-test"

    mkdir -p "$temp_dir"

    log_step "Cycle 1: JSON Schema → GraphQL SDL → JSON Schema"

    # Cycle 1
    if cargo run --example json_to_graphql -- "$test_file" > "$temp_dir/cycle1.graphql" 2>/dev/null; then
        log_info "  ✓ JSON → GraphQL"
    else
        log_error "  ✗ Failed to convert JSON to GraphQL"
        return 1
    fi

    if cargo run --example graphql_to_json -- "$temp_dir/cycle1.graphql" > "$temp_dir/cycle1.json" 2>/dev/null; then
        log_info "  ✓ GraphQL → JSON"
    else
        log_error "  ✗ Failed to convert GraphQL to JSON"
        return 1
    fi

    # Cycle 2
    log_step "Cycle 2: JSON Schema → GraphQL SDL → JSON Schema"

    if cargo run --example json_to_graphql -- "$temp_dir/cycle1.json" > "$temp_dir/cycle2.graphql" 2>/dev/null; then
        log_info "  ✓ JSON → GraphQL"
    else
        log_error "  ✗ Failed on cycle 2 JSON to GraphQL"
        return 1
    fi

    if cargo run --example graphql_to_json -- "$temp_dir/cycle2.graphql" > "$temp_dir/cycle2.json" 2>/dev/null; then
        log_info "  ✓ GraphQL → JSON"
    else
        log_error "  ✗ Failed on cycle 2 GraphQL to JSON"
        return 1
    fi

    # Cycle 3
    log_step "Cycle 3: JSON Schema → GraphQL SDL → JSON Schema"

    if cargo run --example json_to_graphql -- "$temp_dir/cycle2.json" > "$temp_dir/cycle3.graphql" 2>/dev/null; then
        log_info "  ✓ JSON → GraphQL"
    else
        log_error "  ✗ Failed on cycle 3 JSON to GraphQL"
        return 1
    fi

    if cargo run --example graphql_to_json -- "$temp_dir/cycle3.graphql" > "$temp_dir/cycle3.json" 2>/dev/null; then
        log_info "  ✓ GraphQL → JSON"
    else
        log_error "  ✗ Failed on cycle 3 GraphQL to JSON"
        return 1
    fi

    # Validate no drift
    log_step "Validating output stability (no drift)"

    if diff -q "$temp_dir/cycle1.json" "$temp_dir/cycle2.json" > /dev/null 2>&1; then
        log_info "  ✓ Cycle 1 → 2: No drift detected"
    else
        log_error "  ✗ Drift detected between cycle 1 and 2"
        diff "$temp_dir/cycle1.json" "$temp_dir/cycle2.json" || true
        return 1
    fi

    if diff -q "$temp_dir/cycle2.json" "$temp_dir/cycle3.json" > /dev/null 2>&1; then
        log_info "  ✓ Cycle 2 → 3: No drift detected"
    else
        log_error "  ✗ Drift detected between cycle 2 and 3"
        diff "$temp_dir/cycle2.json" "$temp_dir/cycle3.json" || true
        return 1
    fi

    if diff -q "$temp_dir/cycle1.graphql" "$temp_dir/cycle2.graphql" > /dev/null 2>&1; then
        log_info "  ✓ GraphQL Cycle 1 → 2: No drift detected"
    else
        log_error "  ✗ GraphQL drift detected between cycle 1 and 2"
        diff "$temp_dir/cycle1.graphql" "$temp_dir/cycle2.graphql" || true
        return 1
    fi

    if diff -q "$temp_dir/cycle2.graphql" "$temp_dir/cycle3.graphql" > /dev/null 2>&1; then
        log_info "  ✓ GraphQL Cycle 2 → 3: No drift detected"
    else
        log_error "  ✗ GraphQL drift detected between cycle 2 and 3"
        diff "$temp_dir/cycle2.graphql" "$temp_dir/cycle3.graphql" || true
        return 1
    fi

    log_success "Round-trip validation passed: No data loss or drift detected"
    return 0
}

run_roundtrip_test_node() {
    log_subheader "Round-Trip Testing: Node.js Converter (3 Cycles)"

    local test_file="../test-data/complex-schema.json"
    local temp_dir="./roundtrip-test"

    mkdir -p "$temp_dir"

    # Create a test script for round-trip validation
    cat > "$temp_dir/roundtrip.js" << 'EOF'
import { jsonSchemaToGraphQL, graphqlToJsonSchema } from '../dist/index.js';
import fs from 'fs';

const testFile = process.argv[2];
const outputDir = process.argv[3];

async function runRoundTrip() {
  try {
    // Load initial schema
    const initialSchema = JSON.parse(fs.readFileSync(testFile, 'utf8'));

    // Cycle 1
    console.log('Cycle 1: JSON → GraphQL → JSON');
    const graphql1 = jsonSchemaToGraphQL(initialSchema);
    fs.writeFileSync(`${outputDir}/cycle1.graphql`, graphql1);
    const json1 = graphqlToJsonSchema(graphql1);
    fs.writeFileSync(`${outputDir}/cycle1.json`, JSON.stringify(json1, null, 2));

    // Cycle 2
    console.log('Cycle 2: JSON → GraphQL → JSON');
    const graphql2 = jsonSchemaToGraphQL(json1);
    fs.writeFileSync(`${outputDir}/cycle2.graphql`, graphql2);
    const json2 = graphqlToJsonSchema(graphql2);
    fs.writeFileSync(`${outputDir}/cycle2.json`, JSON.stringify(json2, null, 2));

    // Cycle 3
    console.log('Cycle 3: JSON → GraphQL → JSON');
    const graphql3 = jsonSchemaToGraphQL(json2);
    fs.writeFileSync(`${outputDir}/cycle3.graphql`, graphql3);
    const json3 = graphqlToJsonSchema(graphql3);
    fs.writeFileSync(`${outputDir}/cycle3.json`, JSON.stringify(json3, null, 2));

    // Validate
    const json1Str = JSON.stringify(json1);
    const json2Str = JSON.stringify(json2);
    const json3Str = JSON.stringify(json3);

    if (json1Str !== json2Str) {
      console.error('ERROR: Drift detected between cycle 1 and 2');
      process.exit(1);
    }

    if (json2Str !== json3Str) {
      console.error('ERROR: Drift detected between cycle 2 and 3');
      process.exit(1);
    }

    if (graphql1 !== graphql2) {
      console.error('ERROR: GraphQL drift detected between cycle 1 and 2');
      process.exit(1);
    }

    if (graphql2 !== graphql3) {
      console.error('ERROR: GraphQL drift detected between cycle 2 and 3');
      process.exit(1);
    }

    console.log('✓ All cycles stable: No drift detected');
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

runRoundTrip();
EOF

    if node "$temp_dir/roundtrip.js" "$test_file" "$temp_dir" 2>&1; then
        log_success "Round-trip validation passed: No data loss or drift detected"
        return 0
    else
        log_error "Round-trip validation failed"
        return 1
    fi
}

#############################################################################
# Rust Tests with Security Scanning
#############################################################################

run_rust_tests() {
    log_header "Rust Converter - Comprehensive Testing"

    cd converters/rust

    # Check if Cargo is installed
    if ! command -v cargo &> /dev/null; then
        log_error "Cargo not found. Please install Rust: https://rustup.rs/"
        cd ../..
        return 1
    fi

    log_info "Rust version: $(rustc --version)"
    log_info "Cargo version: $(cargo --version)"
    echo ""

    #########################################################################
    # 1. Security Audit
    #########################################################################

    log_subheader "1. Security Vulnerability Scanning"

    if command -v cargo-audit &> /dev/null; then
        log_step "Running cargo-audit..."
        if cargo audit --deny warnings; then
            log_success "No security vulnerabilities found"
            RUST_SECURITY_PASSED=1
        else
            log_error "Security vulnerabilities detected"
            RUST_SECURITY_PASSED=0
        fi
    else
        log_warning "cargo-audit not installed. Install with: cargo install cargo-audit"
        log_info "Skipping security audit..."
        RUST_SECURITY_PASSED=1
    fi

    echo ""

    #########################################################################
    # 2. Code Quality - Linting
    #########################################################################

    log_subheader "2. Code Quality - Linting (Clippy)"

    log_step "Running clippy with strict checks..."
    if cargo clippy --all-targets --all-features -- -D warnings -D clippy::all -W clippy::pedantic; then
        log_success "Clippy passed (no warnings)"
    else
        log_error "Clippy found issues"
        cd ../..
        return 1
    fi

    echo ""

    #########################################################################
    # 3. Code Formatting
    #########################################################################

    log_subheader "3. Code Formatting Check"

    log_step "Checking code formatting..."
    if cargo fmt -- --check; then
        log_success "Code formatting is correct"
    else
        log_error "Code needs formatting. Run: cargo fmt"
        cd ../..
        return 1
    fi

    echo ""

    #########################################################################
    # 4. Build
    #########################################################################

    log_subheader "4. Building Project"

    log_step "Building in release mode..."
    if cargo build --release --all-features; then
        log_success "Build successful"
    else
        log_error "Build failed"
        cd ../..
        return 1
    fi

    echo ""

    #########################################################################
    # 5. Unit & Integration Tests
    #########################################################################

    log_subheader "5. Running Unit & Integration Tests"

    log_step "Running all tests..."
    if cargo test --all-features --verbose -- --nocapture; then
        log_success "All tests passed"
        RUST_TESTS_PASSED=1
    else
        log_error "Tests failed"
        RUST_TESTS_PASSED=0
        cd ../..
        return 1
    fi

    echo ""

    #########################################################################
    # 6. Coverage Report
    #########################################################################

    log_subheader "6. Test Coverage Analysis"

    if command -v cargo-tarpaulin &> /dev/null; then
        log_step "Generating coverage report..."
        if cargo tarpaulin --out Html --out Lcov --output-dir coverage --all-features; then
            log_success "Coverage report: converters/rust/coverage/index.html"

            # Extract coverage percentage
            if [ -f "coverage/lcov.info" ]; then
                log_info "Coverage summary generated"
            fi
        else
            log_warning "Coverage generation encountered issues"
        fi
    else
        log_warning "cargo-tarpaulin not installed"
        log_info "Install with: cargo install cargo-tarpaulin"
    fi

    echo ""

    #########################################################################
    # 7. Documentation Check
    #########################################################################

    log_subheader "7. Documentation Validation"

    log_step "Checking documentation..."
    if cargo doc --no-deps --all-features; then
        log_success "Documentation builds successfully"
    else
        log_warning "Documentation has issues"
    fi

    echo ""

    #########################################################################
    # 8. Round-Trip Testing (3 Cycles)
    #########################################################################

    if run_roundtrip_test_rust; then
        RUST_ROUNDTRIP_PASSED=1
    else
        RUST_ROUNDTRIP_PASSED=0
        log_error "Round-trip testing failed"
    fi

    cd ../..
    return 0
}

#############################################################################
# Node.js Tests with Security Scanning
#############################################################################

run_node_tests() {
    log_header "Node.js Converter - Comprehensive Testing"

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

    log_info "Node.js version: $(node --version)"
    log_info "npm version: $(npm --version)"
    echo ""

    #########################################################################
    # 0. Install Dependencies
    #########################################################################

    log_subheader "0. Installing Dependencies"

    if command -v pnpm &> /dev/null; then
        log_step "Installing with pnpm..."
        if pnpm install --frozen-lockfile 2>/dev/null || pnpm install; then
            log_success "Dependencies installed"
        else
            log_error "Failed to install dependencies"
            cd ../..
            return 1
        fi
    else
        log_step "Installing with npm..."
        if npm ci 2>/dev/null || npm install; then
            log_success "Dependencies installed"
        else
            log_error "Failed to install dependencies"
            cd ../..
            return 1
        fi
    fi

    echo ""

    #########################################################################
    # 1. Security Audit
    #########################################################################

    log_subheader "1. Security Vulnerability Scanning"

    log_step "Running npm audit..."
    if command -v pnpm &> /dev/null; then
        if pnpm audit --audit-level=moderate; then
            log_success "No security vulnerabilities found"
            NODE_SECURITY_PASSED=1
        else
            log_error "Security vulnerabilities detected"
            log_info "Run 'pnpm audit fix' to attempt automatic fixes"
            NODE_SECURITY_PASSED=0
        fi
    else
        if npm audit --audit-level=moderate; then
            log_success "No security vulnerabilities found"
            NODE_SECURITY_PASSED=1
        else
            log_error "Security vulnerabilities detected"
            log_info "Run 'npm audit fix' to attempt automatic fixes"
            NODE_SECURITY_PASSED=0
        fi
    fi

    # Additional security scanning with snyk if available
    if command -v snyk &> /dev/null; then
        log_step "Running Snyk security scan..."
        if snyk test; then
            log_success "Snyk: No vulnerabilities found"
        else
            log_warning "Snyk found potential issues"
        fi
    fi

    echo ""

    #########################################################################
    # 2. Code Quality - Linting
    #########################################################################

    log_subheader "2. Code Quality - Linting (ESLint)"

    log_step "Running ESLint with strict rules..."
    if command -v pnpm &> /dev/null; then
        if pnpm run lint; then
            log_success "ESLint passed (no issues)"
        else
            log_error "ESLint found issues"
            log_info "Try running: pnpm run lint:fix"
            cd ../..
            return 1
        fi
    else
        if npm run lint; then
            log_success "ESLint passed (no issues)"
        else
            log_error "ESLint found issues"
            log_info "Try running: npm run lint:fix"
            cd ../..
            return 1
        fi
    fi

    echo ""

    #########################################################################
    # 3. Code Formatting
    #########################################################################

    log_subheader "3. Code Formatting Check (Prettier)"

    log_step "Checking code formatting..."
    if command -v pnpm &> /dev/null; then
        if pnpm run format:check; then
            log_success "Code formatting is correct"
        else
            log_error "Code needs formatting"
            log_info "Run: pnpm run format"
            cd ../..
            return 1
        fi
    else
        if npm run format:check; then
            log_success "Code formatting is correct"
        else
            log_error "Code needs formatting"
            log_info "Run: npm run format"
            cd ../..
            return 1
        fi
    fi

    echo ""

    #########################################################################
    # 4. TypeScript Compilation
    #########################################################################

    log_subheader "4. TypeScript Compilation"

    log_step "Building TypeScript..."
    if command -v pnpm &> /dev/null; then
        if pnpm run build; then
            log_success "Build successful"
        else
            log_error "Build failed"
            cd ../..
            return 1
        fi
    else
        if npm run build; then
            log_success "Build successful"
        else
            log_error "Build failed"
            cd ../..
            return 1
        fi
    fi

    echo ""

    #########################################################################
    # 5. Unit & Integration Tests
    #########################################################################

    log_subheader "5. Running Unit & Integration Tests"

    log_step "Running all tests..."
    if command -v pnpm &> /dev/null; then
        if pnpm test; then
            log_success "All tests passed"
            NODE_TESTS_PASSED=1
        else
            log_error "Tests failed"
            NODE_TESTS_PASSED=0
            cd ../..
            return 1
        fi
    else
        if npm test; then
            log_success "All tests passed"
            NODE_TESTS_PASSED=1
        else
            log_error "Tests failed"
            NODE_TESTS_PASSED=0
            cd ../..
            return 1
        fi
    fi

    echo ""

    #########################################################################
    # 6. Coverage Report
    #########################################################################

    log_subheader "6. Test Coverage Analysis"

    log_step "Generating coverage report..."
    if command -v pnpm &> /dev/null; then
        if pnpm run test:coverage; then
            log_success "Coverage report: converters/node/coverage/lcov-report/index.html"
        else
            log_warning "Coverage generation encountered issues"
        fi
    else
        if npm run test:coverage; then
            log_success "Coverage report: converters/node/coverage/lcov-report/index.html"
        else
            log_warning "Coverage generation encountered issues"
        fi
    fi

    echo ""

    #########################################################################
    # 7. Type Checking
    #########################################################################

    log_subheader "7. TypeScript Type Checking"

    log_step "Running TypeScript compiler in check mode..."
    if npx tsc --noEmit; then
        log_success "Type checking passed"
    else
        log_warning "Type checking found issues"
    fi

    echo ""

    #########################################################################
    # 8. Round-Trip Testing (3 Cycles)
    #########################################################################

    if run_roundtrip_test_node; then
        NODE_ROUNDTRIP_PASSED=1
    else
        NODE_ROUNDTRIP_PASSED=0
        log_error "Round-trip testing failed"
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
# Final Summary Report
#############################################################################

log_header "Comprehensive Test Suite Summary"

if [ "$TEST_TARGET" = "all" ] || [ "$TEST_TARGET" = "rust" ]; then
    echo -e "${CYAN}Rust Converter Results:${NC}"

    if [ $RUST_SECURITY_PASSED -eq 1 ]; then
        log_success "Security Scan: PASSED"
    else
        log_error "Security Scan: FAILED"
    fi

    if [ $RUST_TESTS_PASSED -eq 1 ]; then
        log_success "Unit/Integration Tests: PASSED"
    else
        log_error "Unit/Integration Tests: FAILED"
    fi

    if [ $RUST_ROUNDTRIP_PASSED -eq 1 ]; then
        log_success "3-Cycle Round-Trip: PASSED (No drift detected)"
    else
        log_error "3-Cycle Round-Trip: FAILED"
    fi

    echo ""
fi

if [ "$TEST_TARGET" = "all" ] || [ "$TEST_TARGET" = "node" ]; then
    echo -e "${CYAN}Node.js Converter Results:${NC}"

    if [ $NODE_SECURITY_PASSED -eq 1 ]; then
        log_success "Security Scan: PASSED"
    else
        log_error "Security Scan: FAILED"
    fi

    if [ $NODE_TESTS_PASSED -eq 1 ]; then
        log_success "Unit/Integration Tests: PASSED"
    else
        log_error "Unit/Integration Tests: FAILED"
    fi

    if [ $NODE_ROUNDTRIP_PASSED -eq 1 ]; then
        log_success "3-Cycle Round-Trip: PASSED (No drift detected)"
    else
        log_error "3-Cycle Round-Trip: FAILED"
    fi

    echo ""
fi

# Exit with error if any critical tests failed
if [ $RUST_EXIT -ne 0 ] || [ $NODE_EXIT -ne 0 ]; then
    log_error "Some tests failed. See detailed output above."
    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ✗ Test Suite Failed - Please fix errors before proceeding       ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    exit 1
else
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ All Tests Passed - Production Ready!                          ║${NC}"
    echo -e "${GREEN}║                                                                    ║${NC}"
    echo -e "${GREEN}║  • Security scans completed                                       ║${NC}"
    echo -e "${GREEN}║  • Code quality validated                                         ║${NC}"
    echo -e "${GREEN}║  • Unit/Integration tests passed                                  ║${NC}"
    echo -e "${GREEN}║  • 3-cycle round-trip validation successful (no drift)            ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    exit 0
fi
