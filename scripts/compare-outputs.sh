#!/bin/bash

# Simplified Converter Output Comparison Script
# Compares Node.js and Rust converter outputs against expected results

# Don't exit on error for the entire script
# set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_DATA_DIR="$PROJECT_ROOT/converters/test-data/x-graphql"
OUTPUT_DIR="$PROJECT_ROOT/output/converter-comparison"
NODE_CLI="$PROJECT_ROOT/converters/node/dist/cli.js"

# Create output directories
mkdir -p "$OUTPUT_DIR/node"
mkdir -p "$OUTPUT_DIR/rust"
mkdir -p "$OUTPUT_DIR/analysis"

# Counters
TOTAL=0
NODE_PASS=0
NODE_FAIL=0
RUST_PASS=0
RUST_FAIL=0
PARITY_PASS=0
PARITY_FAIL=0

echo -e "${BOLD}${CYAN}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║        X-GraphQL Converter Output Comparison Tool              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check Node.js
if [ ! -f "$NODE_CLI" ]; then
    echo -e "${RED}✗ Node.js converter not built. Run: cd converters/node && npm run build${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js converter found${NC}"

# Check Rust
RUST_CLI="$PROJECT_ROOT/converters/rust/target/release/jxql"
RUST_AVAILABLE=false
if [ -f "$RUST_CLI" ]; then
    echo -e "${GREEN}✓ Rust converter found${NC}"
    RUST_AVAILABLE=true
else
    echo -e "${YELLOW}⚠ Rust converter not found (run: cd converters/rust && cargo build --release)${NC}"
fi

echo ""
echo -e "${BOLD}Test Schemas:${NC}"
for schema in "$TEST_DATA_DIR"/*.json; do
    name=$(basename "$schema" .json)
    echo "  • $name"
    TOTAL=$((TOTAL + 1))
done
echo ""

# Process each schema
for schema_file in "$TEST_DATA_DIR"/*.json; do
    schema_name=$(basename "$schema_file" .json)
    expected_file="$TEST_DATA_DIR/expected/${schema_name}.graphql"

    echo -e "${BOLD}${CYAN}──────────────────────────────────────────────────${NC}"
    echo -e "${BOLD}Testing: $schema_name${NC}"
    echo -e "${CYAN}──────────────────────────────────────────────────${NC}"

    # Test Node.js
    echo -n "  Node.js: "
    node_output="$OUTPUT_DIR/node/${schema_name}.graphql"
    if node "$NODE_CLI" --input "$schema_file" --output "$node_output" --descriptions --preserve-order 2>/dev/null; then
        if [ -f "$expected_file" ]; then
            if diff -u "$expected_file" "$node_output" > "$OUTPUT_DIR/analysis/node-${schema_name}.diff" 2>&1; then
                echo -e "${GREEN}✓ PASS (matches expected)${NC}"
                rm "$OUTPUT_DIR/analysis/node-${schema_name}.diff"
                NODE_PASS=$((NODE_PASS + 1))
            else
                echo -e "${RED}✗ FAIL (differs from expected)${NC}"
                NODE_FAIL=$((NODE_FAIL + 1))
            fi
        else
            echo -e "${YELLOW}⚠ SKIP (no expected output)${NC}"
        fi
    else
        echo -e "${RED}✗ ERROR (conversion failed)${NC}"
        NODE_FAIL=$((NODE_FAIL + 1))
    fi

    # Test Rust
    if [ "$RUST_AVAILABLE" = true ]; then
        echo -n "  Rust:    "
        rust_output="$OUTPUT_DIR/rust/${schema_name}.graphql"
        if "$RUST_CLI" --input "$schema_file" --output "$rust_output" --descriptions --preserve-order 2>/dev/null; then
            if [ -f "$expected_file" ]; then
                if diff -u "$expected_file" "$rust_output" > "$OUTPUT_DIR/analysis/rust-${schema_name}.diff" 2>&1; then
                    echo -e "${GREEN}✓ PASS (matches expected)${NC}"
                    rm "$OUTPUT_DIR/analysis/rust-${schema_name}.diff"
                    RUST_PASS=$((RUST_PASS + 1))
                else
                    echo -e "${RED}✗ FAIL (differs from expected)${NC}"
                    RUST_FAIL=$((RUST_FAIL + 1))
                fi
            else
                echo -e "${YELLOW}⚠ SKIP (no expected output)${NC}"
            fi

            # Compare Node vs Rust
            echo -n "  Parity:  "
            if diff -u "$node_output" "$rust_output" > "$OUTPUT_DIR/analysis/parity-${schema_name}.diff" 2>&1; then
                echo -e "${GREEN}✓ PASS (Node.js ≡ Rust)${NC}"
                rm "$OUTPUT_DIR/analysis/parity-${schema_name}.diff"
                PARITY_PASS=$((PARITY_PASS + 1))
            else
                echo -e "${RED}✗ FAIL (Node.js ≠ Rust)${NC}"
                PARITY_FAIL=$((PARITY_FAIL + 1))
            fi
        else
            echo -e "${RED}✗ ERROR (conversion failed)${NC}"
            RUST_FAIL=$((RUST_FAIL + 1))
        fi
    fi

    echo ""
done

# Summary
echo -e "${BOLD}${CYAN}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                      SUMMARY REPORT                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BOLD}Node.js Converter:${NC}"
echo -e "  ${GREEN}Passed: $NODE_PASS/${TOTAL}${NC}"
if [ $NODE_FAIL -gt 0 ]; then
    echo -e "  ${RED}Failed: $NODE_FAIL/${TOTAL}${NC}"
fi

if [ "$RUST_AVAILABLE" = true ]; then
    echo ""
    echo -e "${BOLD}Rust Converter:${NC}"
    echo -e "  ${GREEN}Passed: $RUST_PASS/${TOTAL}${NC}"
    if [ $RUST_FAIL -gt 0 ]; then
        echo -e "  ${RED}Failed: $RUST_FAIL/${TOTAL}${NC}"
    fi

    echo ""
    echo -e "${BOLD}Feature Parity:${NC}"
    echo -e "  ${GREEN}Matching: $PARITY_PASS/${TOTAL}${NC}"
    if [ $PARITY_FAIL -gt 0 ]; then
        echo -e "  ${RED}Differing: $PARITY_FAIL/${TOTAL}${NC}"
    fi
fi

echo ""
echo -e "${BOLD}Output Locations:${NC}"
echo "  Node.js:  $OUTPUT_DIR/node/"
if [ "$RUST_AVAILABLE" = true ]; then
    echo "  Rust:     $OUTPUT_DIR/rust/"
fi
echo "  Analysis: $OUTPUT_DIR/analysis/"

# Show diffs if any exist
if ls "$OUTPUT_DIR/analysis"/*.diff 1> /dev/null 2>&1; then
    echo ""
    echo -e "${BOLD}${YELLOW}Differences Found:${NC}"
    for diff_file in "$OUTPUT_DIR/analysis"/*.diff; do
        echo "  • $(basename "$diff_file")"
    done
    echo ""
    echo "Review with: cat $OUTPUT_DIR/analysis/<filename>.diff"
fi

# Manual review guide
echo ""
echo -e "${BOLD}${CYAN}Manual Review Checklist:${NC}"
echo ""
echo "For each schema, verify these features are working:"
echo ""
echo -e "${BOLD}1. interfaces.json${NC}"
echo "   □ 'interface Node' (not 'type Node')"
echo "   □ Types show 'implements Node'"
echo ""
echo -e "${BOLD}2. skip-fields.json${NC}"
echo "   □ password_hash field is NOT in output"
echo "   □ InternalType is NOT in output"
echo ""
echo -e "${BOLD}3. nullability.json${NC}"
echo "   □ requiredField has '!' marker"
echo "   □ optionalField does NOT have '!' marker"
echo "   □ x-graphql-field-non-null forces '!'"
echo ""
echo -e "${BOLD}4. comprehensive.json / comprehensive-features.json${NC}"
echo "   □ Custom scalars: Email, URL, DateTime, JSON"
echo "   □ Arrays with non-null items: [String!]"
echo "   □ Federation directives: @key, @requires, @provides"
echo ""
echo -e "${BOLD}5. unions.json${NC}"
echo "   □ Union syntax: 'union Name = Type1 | Type2'"
echo ""
echo -e "${BOLD}6. descriptions.json${NC}"
echo "   □ Triple-quote blocks for multi-line descriptions"
echo "   □ Inline quotes for single-line descriptions"
echo ""

# Exit code
if [ $NODE_FAIL -eq 0 ] && [ $RUST_FAIL -eq 0 ] && [ $PARITY_FAIL -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✓ ALL TESTS PASSED${NC}"
    exit 0
else
    echo -e "${RED}${BOLD}✗ SOME TESTS FAILED - Review differences above${NC}"
    exit 1
fi
