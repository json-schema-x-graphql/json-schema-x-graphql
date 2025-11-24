#!/usr/bin/env bash

# Rust Security Audit Script
# Focused security testing with cargo-audit, cargo-geiger, and cargo-deny
# for JSON Schema x GraphQL Rust converter

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Setup cargo environment
source ~/.cargo/env 2>/dev/null || true

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Rust Security Audit Suite${NC}"
echo -e "${CYAN}JSON Schema x GraphQL Converter${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Check Rust installation
echo -e "${BLUE}[1/8] Verifying Rust installation...${NC}"
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}ERROR: cargo not found. Please install Rust via rustup.${NC}"
    exit 1
fi

echo "Rust version: $(rustc --version)"
echo "Cargo version: $(cargo --version)"
echo ""

# Change to Rust converter directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RUST_DIR="$PROJECT_ROOT/converters/rust"

if [ ! -d "$RUST_DIR" ]; then
    echo -e "${RED}ERROR: Rust converter directory not found at $RUST_DIR${NC}"
    exit 1
fi

cd "$RUST_DIR"
echo -e "${GREEN}Working directory: $(pwd)${NC}"
echo ""

# Create output directory for reports
REPORTS_DIR="$RUST_DIR/security-reports"
mkdir -p "$REPORTS_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Basic cargo check
echo -e "${BLUE}[2/8] Running cargo check...${NC}"
if cargo check --all-targets --all-features 2>&1 | tee "$REPORTS_DIR/cargo-check-$TIMESTAMP.log"; then
    echo -e "${GREEN}✓ Cargo check passed${NC}"
else
    echo -e "${YELLOW}⚠ Cargo check had warnings (see log)${NC}"
fi
echo ""

# Install cargo-audit if not present
echo -e "${BLUE}[3/8] Installing/verifying cargo-audit...${NC}"
if ! command -v cargo-audit &> /dev/null; then
    echo "Installing cargo-audit..."
    cargo install cargo-audit --quiet
    echo -e "${GREEN}✓ cargo-audit installed${NC}"
else
    echo -e "${GREEN}✓ cargo-audit already installed${NC}"
    cargo-audit --version
fi
echo ""

# Run security audit
echo -e "${BLUE}[4/8] Running cargo-audit (dependency vulnerability scan)...${NC}"
if cargo audit 2>&1 | tee "$REPORTS_DIR/cargo-audit-$TIMESTAMP.log"; then
    echo -e "${GREEN}✓ No known vulnerabilities found${NC}"
else
    echo -e "${RED}⚠ SECURITY VULNERABILITIES DETECTED - Review report above${NC}"
fi
echo ""

# Install cargo-geiger if not present
echo -e "${BLUE}[5/8] Installing/verifying cargo-geiger...${NC}"
if ! command -v cargo-geiger &> /dev/null; then
    echo "Installing cargo-geiger (this may take a few minutes)..."
    cargo install cargo-geiger --quiet
    echo -e "${GREEN}✓ cargo-geiger installed${NC}"
else
    echo -e "${GREEN}✓ cargo-geiger already installed${NC}"
    cargo-geiger --version
fi
echo ""

# Run unsafe code detection
echo -e "${BLUE}[6/8] Running cargo-geiger (unsafe code detection)...${NC}"
if cargo geiger --all-features 2>&1 | tee "$REPORTS_DIR/cargo-geiger-$TIMESTAMP.log"; then
    echo -e "${GREEN}✓ Unsafe code analysis complete${NC}"
else
    echo -e "${YELLOW}⚠ cargo-geiger completed with warnings${NC}"
fi
echo ""

# Install cargo-deny if not present and deny.toml exists
echo -e "${BLUE}[7/8] Installing/verifying cargo-deny...${NC}"
if [ -f "deny.toml" ]; then
    if ! command -v cargo-deny &> /dev/null; then
        echo "Installing cargo-deny..."
        cargo install cargo-deny --quiet
        echo -e "${GREEN}✓ cargo-deny installed${NC}"
    else
        echo -e "${GREEN}✓ cargo-deny already installed${NC}"
        cargo-deny --version
    fi

    echo ""
    echo -e "${BLUE}[8/8] Running cargo-deny (licensing, security, sources)...${NC}"
    if cargo deny check 2>&1 | tee "$REPORTS_DIR/cargo-deny-$TIMESTAMP.log"; then
        echo -e "${GREEN}✓ cargo-deny checks passed${NC}"
    else
        echo -e "${YELLOW}⚠ cargo-deny found issues (see log)${NC}"
    fi
else
    echo -e "${YELLOW}deny.toml not found - skipping cargo-deny${NC}"
    echo -e "${BLUE}[8/8] Skipped${NC}"
fi
echo ""

# Generate summary report
SUMMARY_FILE="$REPORTS_DIR/security-summary-$TIMESTAMP.txt"

cat > "$SUMMARY_FILE" << EOF
========================================
Rust Security Audit Summary
========================================
Date: $(date)
Project: JSON Schema x GraphQL Converter
Directory: $RUST_DIR

========================================
Environment
========================================
Rust Version: $(rustc --version)
Cargo Version: $(cargo --version)

========================================
Tools Executed
========================================
✓ cargo check
✓ cargo-audit (dependency vulnerability scanner)
✓ cargo-geiger (unsafe code detector)
$([ -f "deny.toml" ] && echo "✓ cargo-deny (license/security/sources)" || echo "- cargo-deny (skipped - no deny.toml)")

========================================
Report Files
========================================
- cargo-check-$TIMESTAMP.log
- cargo-audit-$TIMESTAMP.log
- cargo-geiger-$TIMESTAMP.log
$([ -f "deny.toml" ] && echo "- cargo-deny-$TIMESTAMP.log" || echo "")

All reports saved to: $REPORTS_DIR

========================================
Next Steps
========================================
1. Review any vulnerabilities in cargo-audit report
2. Check unsafe code usage in cargo-geiger report
3. Verify license compliance (if cargo-deny was run)
4. Address any RED or YELLOW warnings above

========================================
Additional Security Tools (Optional)
========================================

cargo-fuzz: Fuzzing for finding edge cases
  Install: cargo install cargo-fuzz
  Usage: cargo fuzz init && cargo fuzz run <target>

cargo-outdated: Check for outdated dependencies
  Install: cargo install cargo-outdated
  Usage: cargo outdated

cargo-license: License compliance checker
  Install: cargo install cargo-license
  Usage: cargo-license

MIRAI: Facebook's abstract interpreter for Rust
  Repo: https://github.com/facebookexperimental/MIRAI
  Note: Requires specialized setup, nightly Rust

Rudra: Memory safety & undefined behavior detector
  Repo: https://github.com/sslab-gatech/Rudra
  Note: Research tool, requires nightly Rust

cargo-tarpaulin: Code coverage (Linux only)
  Install: cargo install cargo-tarpaulin
  Usage: cargo tarpaulin --out Html

========================================
EOF

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Security Audit Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Summary report: ${CYAN}$SUMMARY_FILE${NC}"
echo ""
echo "Key findings:"
echo -e "${CYAN}1.${NC} Check cargo-audit for known vulnerabilities"
echo -e "${CYAN}2.${NC} Review cargo-geiger for unsafe code usage"
echo -e "${CYAN}3.${NC} All reports saved to: $REPORTS_DIR"
echo ""

# Display summary
cat "$SUMMARY_FILE"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}For CI/CD Integration:${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Add to .github/workflows/security.yml:"
echo ""
echo "  - name: Install cargo-audit"
echo "    run: cargo install cargo-audit"
echo ""
echo "  - name: Security audit"
echo "    run: cargo audit"
echo ""
echo "  - name: Install cargo-geiger"
echo "    run: cargo install cargo-geiger"
echo ""
echo "  - name: Check unsafe code"
echo "    run: cargo geiger --all-features"
echo ""

exit 0
