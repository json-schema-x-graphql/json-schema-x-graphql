#!/bin/bash

# Code Coverage Measurement Script for Rust Converter
# Requires cargo-tarpaulin: cargo install cargo-tarpaulin

set -e

echo "=========================================="
echo "JSON Schema x GraphQL - Code Coverage"
echo "=========================================="
echo ""

# Check if cargo-tarpaulin is installed
if ! command -v cargo-tarpaulin &> /dev/null; then
    echo "❌ cargo-tarpaulin is not installed"
    echo "Install it with: cargo install cargo-tarpaulin"
    exit 1
fi

echo "✓ cargo-tarpaulin found"
echo ""

# Create coverage directory
COVERAGE_DIR="coverage"
mkdir -p "$COVERAGE_DIR"

echo "📊 Running code coverage analysis..."
echo ""

# Run coverage with HTML, XML (Cobertura), and JSON output
cargo tarpaulin \
    --all-features \
    --workspace \
    --timeout 120 \
    --out Html \
    --out Xml \
    --out Json \
    --output-dir "$COVERAGE_DIR" \
    --exclude-files "fuzz/*" \
    --exclude-files "tests/*" \
    --exclude-files "target/*" \
    --exclude-files "examples/*" \
    --line \
    --branch \
    --count \
    --verbose

echo ""
echo "=========================================="
echo "Coverage Report Generated"
echo "=========================================="
echo ""
echo "📁 Coverage files saved to: $COVERAGE_DIR/"
echo ""
echo "Available reports:"
echo "  - HTML:  $COVERAGE_DIR/tarpaulin-report.html"
echo "  - XML:   $COVERAGE_DIR/cobertura.xml"
echo "  - JSON:  $COVERAGE_DIR/tarpaulin-report.json"
echo ""

# Extract coverage percentage from JSON
if [ -f "$COVERAGE_DIR/tarpaulin-report.json" ]; then
    # Try to extract coverage percentage using jq if available
    if command -v jq &> /dev/null; then
        COVERAGE=$(jq -r '.files | map(.coverage) | add / length' "$COVERAGE_DIR/tarpaulin-report.json" 2>/dev/null || echo "N/A")
        if [ "$COVERAGE" != "N/A" ]; then
            echo "📈 Overall Coverage: ${COVERAGE}%"
            echo ""

            # Set coverage threshold
            THRESHOLD=70
            COVERAGE_INT=$(printf "%.0f" "$COVERAGE")

            if [ "$COVERAGE_INT" -ge "$THRESHOLD" ]; then
                echo "✅ Coverage meets threshold (${THRESHOLD}%)"
            else
                echo "⚠️  Coverage below threshold (${THRESHOLD}%)"
            fi
        fi
    fi
fi

echo ""
echo "To view the HTML report:"
echo "  open $COVERAGE_DIR/tarpaulin-report.html"
echo ""
echo "Done!"
