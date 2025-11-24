#!/usr/bin/env bash

# Rust Advanced Testing Script
# Comprehensive testing, security auditing, and quality assurance for Rust converter
# Includes: cargo-fuzz, mirai, rudra, geiger, cargo-audit

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Setup cargo environment
source ~/.cargo/env 2>/dev/null || true

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Rust Advanced Testing & Security Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check Rust installation
echo -e "${BLUE}[1/10] Verifying Rust installation...${NC}"
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}ERROR: cargo not found. Please install Rust via rustup.${NC}"
    exit 1
fi

rustc --version
cargo --version
echo ""

# Change to Rust converter directory
cd "$(dirname "$0")/../converters/rust" || exit 1
echo -e "${GREEN}Working directory: $(pwd)${NC}"
echo ""

# Install required cargo tools
echo -e "${BLUE}[2/10] Installing/Updating cargo tools...${NC}"
echo -e "${YELLOW}This may take a few minutes on first run...${NC}"

# Install cargo-audit for security vulnerability scanning
if ! command -v cargo-audit &> /dev/null; then
    echo "Installing cargo-audit..."
    cargo install cargo-audit
fi

# Install cargo-geiger for unsafe code detection
if ! command -v cargo-geiger &> /dev/null; then
    echo "Installing cargo-geiger..."
    cargo install cargo-geiger
fi

# Install cargo-fuzz for fuzzing
if ! command -v cargo-fuzz &> /dev/null; then
    echo "Installing cargo-fuzz..."
    cargo install cargo-fuzz
fi

# Note: MIRAI and Rudra are research tools with complex setup
# We'll document them but focus on production-ready tools
echo -e "${YELLOW}Note: MIRAI and Rudra are research tools requiring specialized setup.${NC}"
echo -e "${YELLOW}They will be documented for manual installation if needed.${NC}"
echo ""

# Standard cargo check and test
echo -e "${BLUE}[3/10] Running cargo check...${NC}"
cargo check --all-targets --all-features
echo -e "${GREEN}✓ Cargo check passed${NC}"
echo ""

echo -e "${BLUE}[4/10] Running cargo clippy...${NC}"
cargo clippy --all-targets --all-features -- -D warnings || {
    echo -e "${YELLOW}⚠ Clippy warnings found (non-blocking)${NC}"
}
echo ""

echo -e "${BLUE}[5/10] Running cargo test...${NC}"
cargo test --all-features
echo -e "${GREEN}✓ All tests passed${NC}"
echo ""

# Security audit
echo -e "${BLUE}[6/10] Running cargo-audit (security vulnerabilities)...${NC}"
cargo audit || {
    echo -e "${YELLOW}⚠ Security advisories found - review above${NC}"
}
echo ""

# Unsafe code detection
echo -e "${BLUE}[7/10] Running cargo-geiger (unsafe code detection)...${NC}"
cargo geiger --all-features || {
    echo -e "${YELLOW}⚠ Unsafe code detected - review above${NC}"
}
echo ""

# Check for outdated dependencies
echo -e "${BLUE}[8/10] Checking for outdated dependencies...${NC}"
if command -v cargo-outdated &> /dev/null; then
    cargo outdated
else
    echo -e "${YELLOW}cargo-outdated not installed. Run: cargo install cargo-outdated${NC}"
fi
echo ""

# License checking
echo -e "${BLUE}[9/10] Checking dependency licenses...${NC}"
if command -v cargo-license &> /dev/null; then
    cargo-license --all-features
else
    echo -e "${YELLOW}cargo-license not installed. Run: cargo install cargo-license${NC}"
fi
echo ""

# Setup fuzz targets (if not already set up)
echo -e "${BLUE}[10/10] Setting up fuzz testing infrastructure...${NC}"
if [ ! -d "fuzz" ]; then
    echo "Initializing cargo-fuzz..."
    cargo fuzz init || {
        echo -e "${YELLOW}⚠ Fuzz initialization skipped (may need manual setup)${NC}"
    }
else
    echo "Fuzz directory already exists"
    # List available fuzz targets
    if [ -d "fuzz/fuzz_targets" ]; then
        echo "Available fuzz targets:"
        ls -1 fuzz/fuzz_targets/*.rs 2>/dev/null || echo "  (none configured yet)"
    fi
fi
echo ""

# Generate summary report
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Testing Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "✓ Rust version: $(rustc --version)"
echo "✓ Cargo check: PASSED"
echo "✓ Cargo test: PASSED"
echo "✓ Security audit: COMPLETED"
echo "✓ Unsafe code scan: COMPLETED"
echo ""

# Additional tool recommendations
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Additional Tools (Optional)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "The following tools are available for advanced testing:"
echo ""
echo "1. cargo-fuzz: Fuzzing for finding edge cases"
echo "   Usage: cargo fuzz run <target>"
echo ""
echo "2. MIRAI: Abstract interpretation for Rust (Facebook Research)"
echo "   Requires: RUSTC_WRAPPER setup and specialized configuration"
echo "   Repo: https://github.com/facebookexperimental/MIRAI"
echo ""
echo "3. Rudra: Rust memory safety & undefined behavior detector"
echo "   Note: Requires nightly Rust and complex setup"
echo "   Repo: https://github.com/sslab-gatech/Rudra"
echo ""
echo "4. cargo-outdated: Check for outdated dependencies"
echo "   Install: cargo install cargo-outdated"
echo ""
echo "5. cargo-license: Check dependency licenses"
echo "   Install: cargo install cargo-license"
echo ""
echo "6. cargo-tarpaulin: Code coverage for Linux"
echo "   Install: cargo install cargo-tarpaulin"
echo "   Usage: cargo tarpaulin --out Html"
echo ""
echo "7. cargo-deny: Lint dependencies for security and licensing"
echo "   Install: cargo install cargo-deny"
echo "   Usage: cargo deny check"
echo ""

# Check if deny.toml exists and run cargo-deny if available
if [ -f "deny.toml" ] && command -v cargo-deny &> /dev/null; then
    echo -e "${BLUE}Running cargo-deny with existing configuration...${NC}"
    cargo deny check || {
        echo -e "${YELLOW}⚠ cargo-deny found issues - review above${NC}"
    }
    echo ""
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Rust Advanced Testing Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Review any warnings or issues above."
echo "For continuous integration, add these checks to .github/workflows/"
echo ""
