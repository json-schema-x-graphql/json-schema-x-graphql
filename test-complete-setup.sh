#!/bin/bash

##############################################################################
# Complete Setup Testing Script
# Tests the entire JSON Schema <-> GraphQL authoring UI system
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Track overall status
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

run_test() {
    local test_name="$1"
    local test_command="$2"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}▶ Testing: ${test_name}${NC}"

    if eval "$test_command"; then
        print_success "$test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        print_error "$test_name"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

print_header "JSON Schema <-> GraphQL Authoring UI - Complete Test Suite"

##############################################################################
# 1. Environment Checks
##############################################################################

print_header "1. Environment Validation"

run_test "Node.js installed" "command -v node > /dev/null"
if [ $? -eq 0 ]; then
    NODE_VERSION=$(node --version)
    print_info "Node version: $NODE_VERSION"
fi

run_test "pnpm installed" "command -v pnpm > /dev/null"
if [ $? -eq 0 ]; then
    PNPM_VERSION=$(pnpm --version)
    print_info "pnpm version: $PNPM_VERSION"
fi

run_test "tsx installed or available" "command -v tsx > /dev/null || command -v npx > /dev/null"

# Check for optional Rust/WASM tools
if command -v rustc > /dev/null && command -v wasm-pack > /dev/null; then
    print_success "Rust & wasm-pack installed (WASM build available)"
    RUST_VERSION=$(rustc --version)
    WASM_PACK_VERSION=$(wasm-pack --version)
    print_info "Rust: $RUST_VERSION"
    print_info "wasm-pack: $WASM_PACK_VERSION"
else
    print_warning "Rust/wasm-pack not found - WASM converter will not be available"
    print_info "Node.js converter will be used as fallback"
    WARNINGS=$((WARNINGS + 1))
fi

##############################################################################
# 2. Project Structure Validation
##############################################################################

print_header "2. Project Structure"

run_test "Root directory exists" "[ -d '$SCRIPT_DIR' ]"
run_test "Frontend directory exists" "[ -d '$SCRIPT_DIR/frontend/schema-authoring' ]"
run_test "Node converter directory exists" "[ -d '$SCRIPT_DIR/converters/node' ]"
run_test "Rust converter directory exists" "[ -d '$SCRIPT_DIR/converters/rust' ]"

run_test "Frontend package.json exists" "[ -f '$SCRIPT_DIR/frontend/schema-authoring/package.json' ]"
run_test "Node converter package.json exists" "[ -f '$SCRIPT_DIR/converters/node/package.json' ]"
run_test "Vite config exists" "[ -f '$SCRIPT_DIR/frontend/schema-authoring/vite.config.ts' ]"
run_test "API server exists" "[ -f '$SCRIPT_DIR/converters/node/src/api-server.ts' ]"
run_test "Node converter wrapper exists" "[ -f '$SCRIPT_DIR/frontend/schema-authoring/src/converters/node-converter.ts' ]"
run_test "Debug browser script exists" "[ -f '$SCRIPT_DIR/frontend/schema-authoring/debug-browser.ts' ]"

##############################################################################
# 3. Dependencies Check
##############################################################################

print_header "3. Dependencies"

print_info "Checking if dependencies are installed..."

if [ -d "$SCRIPT_DIR/frontend/schema-authoring/node_modules" ]; then
    print_success "Frontend dependencies installed"
else
    print_warning "Frontend dependencies not installed"
    print_info "Run: cd frontend/schema-authoring && pnpm install"
    WARNINGS=$((WARNINGS + 1))
fi

if [ -d "$SCRIPT_DIR/converters/node/node_modules" ]; then
    print_success "Node converter dependencies installed"
else
    print_warning "Node converter dependencies not installed"
    print_info "Run: cd converters/node && pnpm install"
    WARNINGS=$((WARNINGS + 1))
fi

##############################################################################
# 4. TypeScript Compilation Check
##############################################################################

print_header "4. TypeScript Type-Checking"

if [ -d "$SCRIPT_DIR/frontend/schema-authoring/node_modules" ]; then
    run_test "Frontend TypeScript check" "cd '$SCRIPT_DIR/frontend/schema-authoring' && pnpm run typecheck"
else
    print_warning "Skipping frontend TypeScript check (dependencies not installed)"
fi

if [ -d "$SCRIPT_DIR/converters/node/node_modules" ]; then
    run_test "Node converter TypeScript check" "cd '$SCRIPT_DIR/converters/node' && pnpm exec tsc --noEmit"
else
    print_warning "Skipping node converter TypeScript check (dependencies not installed)"
fi

##############################################################################
# 5. API Server Tests
##############################################################################

print_header "5. API Server Validation"

print_info "Starting API server in background..."

# Kill any existing process on port 3004
lsof -ti:3004 | xargs kill -9 2>/dev/null || true
sleep 1

# Start API server in background
cd "$SCRIPT_DIR/converters/node"
if [ -d "node_modules" ]; then
    pnpm run dev:api > /tmp/api-server.log 2>&1 &
    API_PID=$!
    print_info "API server PID: $API_PID"

    # Wait for server to start
    print_info "Waiting for API server to start..."
    sleep 5

    # Test health endpoint
    run_test "API health endpoint responds" "curl -f -s http://localhost:3004/health > /dev/null"

    if [ $? -eq 0 ]; then
        print_info "Testing API conversion endpoint..."

        # Test JSON to GraphQL conversion
        TEST_SCHEMA='{"type":"object","properties":{"id":{"type":"string"},"name":{"type":"string"}}}'
        RESPONSE=$(curl -s -X POST http://localhost:3004/api/convert \
            -H "Content-Type: application/json" \
            -d "{\"direction\":\"json-to-graphql\",\"input\":$TEST_SCHEMA}")

        if echo "$RESPONSE" | grep -q '"success":true'; then
            print_success "JSON to GraphQL conversion works"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            print_error "JSON to GraphQL conversion failed"
            echo "Response: $RESPONSE"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
        TOTAL_TESTS=$((TOTAL_TESTS + 1))

        # Test GraphQL to JSON conversion
        TEST_SDL='type Query { hello: String }'
        RESPONSE=$(curl -s -X POST http://localhost:3004/api/convert \
            -H "Content-Type: application/json" \
            -d "{\"direction\":\"graphql-to-json\",\"input\":\"$TEST_SDL\"}")

        if echo "$RESPONSE" | grep -q '"success":true'; then
            print_success "GraphQL to JSON conversion works"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            print_error "GraphQL to JSON conversion failed"
            echo "Response: $RESPONSE"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
    fi

    # Show API logs
    print_info "API Server Logs (last 20 lines):"
    tail -n 20 /tmp/api-server.log | sed 's/^/  /'

    # Kill API server
    print_info "Stopping API server..."
    kill $API_PID 2>/dev/null || true
    sleep 1
else
    print_warning "Skipping API server tests (dependencies not installed)"
    WARNINGS=$((WARNINGS + 1))
fi

##############################################################################
# 6. Frontend Build Test
##############################################################################

print_header "6. Frontend Build"

cd "$SCRIPT_DIR/frontend/schema-authoring"

if [ -d "node_modules" ]; then
    run_test "Frontend builds successfully" "pnpm run build"

    if [ $? -eq 0 ]; then
        run_test "Build output directory exists" "[ -d 'dist' ]"
        run_test "Build index.html exists" "[ -f 'dist/index.html' ]"

        # Check build size
        if [ -d "dist" ]; then
            BUILD_SIZE=$(du -sh dist | cut -f1)
            print_info "Build size: $BUILD_SIZE"
        fi
    fi
else
    print_warning "Skipping frontend build test (dependencies not installed)"
    WARNINGS=$((WARNINGS + 1))
fi

##############################################################################
# 7. Integration Test Setup
##############################################################################

print_header "7. Integration Test Setup"

cd "$SCRIPT_DIR/frontend/schema-authoring"

if [ -d "node_modules" ]; then
    # Check if Playwright is installed
    if [ -f "node_modules/.bin/playwright" ]; then
        print_success "Playwright is installed"
    else
        print_warning "Playwright not installed - browser tests not available"
        print_info "Run: pnpm run debug:install"
        WARNINGS=$((WARNINGS + 1))
    fi

    # Check if debug script can be compiled
    run_test "Debug script compiles" "pnpm exec tsx --check debug-browser.ts"
else
    print_warning "Skipping integration test setup (dependencies not installed)"
    WARNINGS=$((WARNINGS + 1))
fi

##############################################################################
# 8. Configuration Validation
##############################################################################

print_header "8. Configuration Validation"

cd "$SCRIPT_DIR/frontend/schema-authoring"

# Check Vite config for proxy
if grep -q "proxy.*3004" vite.config.ts; then
    print_success "Vite proxy configured for API server"
else
    print_error "Vite proxy not configured correctly"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Check if dev:full script exists
if grep -q "dev:full" package.json; then
    print_success "dev:full script configured"
else
    print_warning "dev:full script not found in package.json"
    WARNINGS=$((WARNINGS + 1))
fi

# Check if API server script exists in node converter
cd "$SCRIPT_DIR/converters/node"
if grep -q "dev:api" package.json; then
    print_success "API server script configured"
else
    print_error "API server script not found in package.json"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

##############################################################################
# 9. WASM Check (Optional)
##############################################################################

print_header "9. WASM Converter (Optional)"

if [ -d "$SCRIPT_DIR/frontend/schema-authoring/src/wasm" ]; then
    print_success "WASM directory exists"

    if [ -f "$SCRIPT_DIR/frontend/schema-authoring/src/wasm/json_schema_x_graphql_bg.wasm" ]; then
        print_success "WASM binary found"
        WASM_SIZE=$(ls -lh "$SCRIPT_DIR/frontend/schema-authoring/src/wasm/json_schema_x_graphql_bg.wasm" | awk '{print $5}')
        print_info "WASM size: $WASM_SIZE"
    else
        print_warning "WASM binary not built"
        print_info "To build: cd frontend/schema-authoring && pnpm run build:wasm"
    fi
else
    print_info "WASM not built (using Node converter fallback)"
    print_info "This is normal for development - WASM is optional"
fi

##############################################################################
# 10. Documentation Check
##############################################################################

print_header "10. Documentation"

cd "$SCRIPT_DIR"

docs_found=0
[ -f "README.md" ] && docs_found=$((docs_found + 1)) && print_success "README.md exists"
[ -f "frontend/schema-authoring/RUNNING.md" ] && docs_found=$((docs_found + 1)) && print_success "RUNNING.md exists"
[ -f "frontend/schema-authoring/DEBUG_GUIDE.md" ] && docs_found=$((docs_found + 1)) && print_success "DEBUG_GUIDE.md exists"

if [ $docs_found -gt 0 ]; then
    print_info "Found $docs_found documentation files"
fi

##############################################################################
# Summary Report
##############################################################################

print_header "TEST SUMMARY"

echo -e "Total Tests:    ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed:         ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:         ${RED}$FAILED_TESTS${NC}"
echo -e "Warnings:       ${YELLOW}$WARNINGS${NC}"

PASS_RATE=0
if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
fi
echo -e "Pass Rate:      ${BLUE}${PASS_RATE}%${NC}"

echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    print_header "✅ ALL TESTS PASSED!"
    echo ""
    print_info "Next Steps:"
    echo "  1. Start the full development environment:"
    echo "     cd frontend/schema-authoring && pnpm run dev:full"
    echo ""
    echo "  2. Open http://localhost:3003 in your browser"
    echo ""
    echo "  3. Run automated browser tests (optional):"
    echo "     cd frontend/schema-authoring && pnpm run debug:browser"
    echo ""

    if [ $WARNINGS -gt 0 ]; then
        print_warning "There are $WARNINGS warnings - review them above"
    fi

    exit 0
else
    print_header "❌ SOME TESTS FAILED"
    echo ""
    print_error "$FAILED_TESTS test(s) failed"

    if [ $WARNINGS -gt 0 ]; then
        print_warning "$WARNINGS warning(s) detected"
    fi

    echo ""
    print_info "Troubleshooting:"
    echo "  1. Install dependencies:"
    echo "     cd frontend/schema-authoring && pnpm install"
    echo "     cd ../../converters/node && pnpm install"
    echo ""
    echo "  2. Check the error messages above"
    echo ""
    echo "  3. Review logs at /tmp/api-server.log"
    echo ""
    echo "  4. Run individual tests manually to debug"
    echo ""

    exit 1
fi
