#!/bin/bash

# Test Federation Examples Script
# Tests conversion of federation JSON schemas to SDL and validates output

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
EXAMPLES_DIR="$PROJECT_ROOT/examples/federation"
JSON_SCHEMAS_DIR="$EXAMPLES_DIR/json-schemas"
SDL_REFERENCE_DIR="$EXAMPLES_DIR/sdl"
OUTPUT_DIR="$PROJECT_ROOT/output/federation"
NODE_CLI="$PROJECT_ROOT/converters/node/dist/cli.js"
RUST_CLI="$PROJECT_ROOT/converters/rust/target/release/jxql"

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    local all_good=true

    # Check Node CLI
    if [ -f "$NODE_CLI" ]; then
        print_success "Node.js CLI found: $NODE_CLI"
    else
        print_error "Node.js CLI not found: $NODE_CLI"
        print_info "Run: cd converters/node && npm install && npm run build"
        all_good=false
    fi

    # Check Rust CLI
    if [ -f "$RUST_CLI" ]; then
        print_success "Rust CLI found: $RUST_CLI"
    else
        print_warning "Rust CLI not found: $RUST_CLI"
        print_info "Run: cd converters/rust && cargo build --release --features=cli"
        print_warning "Skipping Rust tests"
    fi

    # Check JSON schemas exist
    if [ -d "$JSON_SCHEMAS_DIR" ]; then
        print_success "JSON schemas directory found"
    else
        print_error "JSON schemas directory not found: $JSON_SCHEMAS_DIR"
        all_good=false
    fi

    if [ "$all_good" = false ]; then
        echo -e "\n${RED}Prerequisites check failed. Please fix the issues above.${NC}\n"
        exit 1
    fi
}

# Create output directories
setup_output_dirs() {
    print_header "Setting Up Output Directories"

    mkdir -p "$OUTPUT_DIR/node"
    mkdir -p "$OUTPUT_DIR/rust"
    mkdir -p "$OUTPUT_DIR/comparison"

    print_success "Output directories created"
}

# Test single conversion
test_conversion() {
    local input_file=$1
    local converter=$2
    local output_file=$3
    local test_name=$4

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$converter" = "node" ]; then
        if node "$NODE_CLI" --input "$input_file" --output "$output_file" --include-federation-directives --descriptions --federation-version V2 --exclude-type "" 2>/dev/null; then
            PASSED_TESTS=$((PASSED_TESTS + 1))
            print_success "$test_name (Node.js)"
            return 0
        else
            FAILED_TESTS=$((FAILED_TESTS + 1))
            print_error "$test_name (Node.js)"
            return 1
        fi
    elif [ "$converter" = "rust" ]; then
        if [ -f "$RUST_CLI" ]; then
            if "$RUST_CLI" --input "$input_file" --output "$output_file" --descriptions --federation-version 2 --output-format SDL_WITH_FEDERATION_METADATA --exclude-types "" 2>/dev/null; then
                PASSED_TESTS=$((PASSED_TESTS + 1))
                print_success "$test_name (Rust)"
                return 0
            else
                FAILED_TESTS=$((FAILED_TESTS + 1))
                print_error "$test_name (Rust)"
                return 1
            fi
        else
            print_warning "$test_name (Rust) - SKIPPED (CLI not built)"
            TOTAL_TESTS=$((TOTAL_TESTS - 1))
            return 2
        fi
    fi
}

# Test all services in an example
test_example() {
    local example_name=$1
    local services=("${@:2}")

    print_header "Testing $example_name"

    for service in "${services[@]}"; do
        local input_json="$JSON_SCHEMAS_DIR/$example_name/${service}-service.json"
        local output_node="$OUTPUT_DIR/node/${example_name}-${service}.graphql"
        local output_rust="$OUTPUT_DIR/rust/${example_name}-${service}.graphql"

        if [ ! -f "$input_json" ]; then
            print_error "Input file not found: $input_json"
            continue
        fi

        # Test Node conversion
        test_conversion "$input_json" "node" "$output_node" "$example_name/$service"

        # Test Rust conversion
        test_conversion "$input_json" "rust" "$output_rust" "$example_name/$service"
    done
}

# Compare Node vs Rust outputs
compare_outputs() {
    print_header "Comparing Node.js vs Rust Outputs"

    for example_dir in "$OUTPUT_DIR/node"/*; do
        [ -e "$example_dir" ] || continue

        local filename=$(basename "$example_dir")
        local node_file="$OUTPUT_DIR/node/$filename"
        local rust_file="$OUTPUT_DIR/rust/$filename"

        if [ -f "$rust_file" ]; then
            TOTAL_TESTS=$((TOTAL_TESTS + 1))
            if diff -q "$node_file" "$rust_file" > /dev/null 2>&1; then
                PASSED_TESTS=$((PASSED_TESTS + 1))
                print_success "Outputs match: $filename"
            else
                FAILED_TESTS=$((FAILED_TESTS + 1))
                print_error "Outputs differ: $filename"

                # Save comparison
                local comparison_file="$OUTPUT_DIR/comparison/$filename.diff"
                diff -u "$node_file" "$rust_file" > "$comparison_file" 2>&1 || true
                print_info "Diff saved to: $comparison_file"
            fi
        fi
    done
}

# Validate SDL structure
validate_sdl() {
    print_header "Validating SDL Structure"

    for sdl_file in "$OUTPUT_DIR/node"/*.graphql; do
        [ -e "$sdl_file" ] || continue

        local filename=$(basename "$sdl_file")
        TOTAL_TESTS=$((TOTAL_TESTS + 1))

        # Basic validation: check for required elements
        local has_type=false
        local has_key=false

        if grep -q "^type " "$sdl_file"; then
            has_type=true
        fi

        if grep -q "@key" "$sdl_file"; then
            has_key=true
        fi

        if [ "$has_type" = true ] && [ "$has_key" = true ]; then
            PASSED_TESTS=$((PASSED_TESTS + 1))
            print_success "Valid SDL structure: $filename"
        else
            FAILED_TESTS=$((FAILED_TESTS + 1))
            print_error "Invalid SDL structure: $filename"
            [ "$has_type" = false ] && print_info "  Missing type definition"
            [ "$has_key" = false ] && print_info "  Missing @key directive"
        fi
    done
}

# Compare with reference SDL
compare_with_reference() {
    print_header "Comparing with Reference SDL"

    # Apollo Classic
    for service in users products reviews; do
        local reference="$SDL_REFERENCE_DIR/apollo-classic/${service}-service.graphql"
        local generated="$OUTPUT_DIR/node/apollo-classic-${service}.graphql"

        if [ -f "$reference" ] && [ -f "$generated" ]; then
            TOTAL_TESTS=$((TOTAL_TESTS + 1))

            # Normalize whitespace and compare
            if diff -w -B "$reference" "$generated" > /dev/null 2>&1; then
                PASSED_TESTS=$((PASSED_TESTS + 1))
                print_success "Matches reference: apollo-classic/$service"
            else
                FAILED_TESTS=$((FAILED_TESTS + 1))
                print_warning "Differs from reference: apollo-classic/$service"

                # Save comparison
                local comparison_file="$OUTPUT_DIR/comparison/reference-${service}.diff"
                diff -w -B -u "$reference" "$generated" > "$comparison_file" 2>&1 || true
                print_info "Diff saved to: $comparison_file"
            fi
        fi
    done

    # Strawberry
    for service in books reviews; do
        local reference="$SDL_REFERENCE_DIR/strawberry/${service}-service.graphql"
        local generated="$OUTPUT_DIR/node/strawberry-${service}.graphql"

        if [ -f "$reference" ] && [ -f "$generated" ]; then
            TOTAL_TESTS=$((TOTAL_TESTS + 1))

            if diff -w -B "$reference" "$generated" > /dev/null 2>&1; then
                PASSED_TESTS=$((PASSED_TESTS + 1))
                print_success "Matches reference: strawberry/$service"
            else
                FAILED_TESTS=$((FAILED_TESTS + 1))
                print_warning "Differs from reference: strawberry/$service"

                local comparison_file="$OUTPUT_DIR/comparison/reference-strawberry-${service}.diff"
                diff -w -B -u "$reference" "$generated" > "$comparison_file" 2>&1 || true
                print_info "Diff saved to: $comparison_file"
            fi
        fi
    done
}

# Print summary
print_summary() {
    print_header "Test Summary"

    echo -e "Total Tests:  ${BLUE}$TOTAL_TESTS${NC}"
    echo -e "Passed:       ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed:       ${RED}$FAILED_TESTS${NC}"

    if [ $TOTAL_TESTS -gt 0 ]; then
        local pass_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
        echo -e "Pass Rate:    ${BLUE}${pass_rate}%${NC}"
    fi

    echo ""

    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}All tests passed! ✓${NC}\n"
        exit 0
    else
        echo -e "${RED}Some tests failed. Check the output above for details.${NC}\n"
        exit 1
    fi
}

# Main execution
main() {
    print_header "Federation Examples Test Suite"

    check_prerequisites
    setup_output_dirs

    # Test Apollo Classic example
    test_example "apollo-classic" "users" "products" "reviews"

    # Test Strawberry example
    test_example "strawberry" "books" "reviews"

    # Compare outputs
    if [ -f "$RUST_CLI" ]; then
        compare_outputs
    fi

    # Validate SDL
    validate_sdl

    # Compare with reference
    compare_with_reference

    # Print summary
    print_summary
}

# Run main
main "$@"
