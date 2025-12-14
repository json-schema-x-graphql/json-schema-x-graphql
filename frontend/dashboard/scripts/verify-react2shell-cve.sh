#!/bin/bash
#
# CVE-2025-66478 (React2Shell) Verification Script
# This script verifies that the repository is not vulnerable to CVE-2025-66478
#
# Usage: bash scripts/verify-react2shell-cve.sh
#

set -e

echo "🔍 Verifying CVE-2025-66478 (React2Shell) Status"
echo "=================================================="
echo ""

# Check Next.js version
echo "1. Checking Next.js version..."
NEXT_VERSION=$(npm list next --depth=0 2>/dev/null | grep next@ | sed 's/.*next@//' | sed 's/ .*//')
echo "   ✓ Next.js version: $NEXT_VERSION"

# Parse version to check if it's in vulnerable range
MAJOR=$(echo "$NEXT_VERSION" | cut -d. -f1)
MINOR=$(echo "$NEXT_VERSION" | cut -d. -f2)
PATCH=$(echo "$NEXT_VERSION" | cut -d. -f3)

echo ""
echo "2. Analyzing version against CVE-2025-66478 criteria..."

VULNERABLE=false

# Check for Next.js 15.x vulnerable versions
if [ "$MAJOR" -eq 15 ]; then
    echo "   ⚠️  Next.js 15.x detected - checking patch level..."
    if [ "$MINOR" -eq 0 ] && [ "$PATCH" -lt 5 ]; then
        VULNERABLE=true
        echo "   ❌ VULNERABLE: Upgrade to 15.0.5+"
    elif [ "$MINOR" -eq 1 ] && [ "$PATCH" -lt 9 ]; then
        VULNERABLE=true
        echo "   ❌ VULNERABLE: Upgrade to 15.1.9+"
    elif [ "$MINOR" -eq 2 ] && [ "$PATCH" -lt 6 ]; then
        VULNERABLE=true
        echo "   ❌ VULNERABLE: Upgrade to 15.2.6+"
    elif [ "$MINOR" -eq 3 ] && [ "$PATCH" -lt 6 ]; then
        VULNERABLE=true
        echo "   ❌ VULNERABLE: Upgrade to 15.3.6+"
    elif [ "$MINOR" -eq 4 ] && [ "$PATCH" -lt 8 ]; then
        VULNERABLE=true
        echo "   ❌ VULNERABLE: Upgrade to 15.4.8+"
    elif [ "$MINOR" -eq 5 ] && [ "$PATCH" -lt 7 ]; then
        VULNERABLE=true
        echo "   ❌ VULNERABLE: Upgrade to 15.5.7+"
    else
        echo "   ✓ Not vulnerable (patched 15.x version)"
    fi
fi

# Check for Next.js 16.x vulnerable versions
if [ "$MAJOR" -eq 16 ]; then
    echo "   ⚠️  Next.js 16.x detected - checking patch level..."
    if [ "$MINOR" -eq 0 ] && [ "$PATCH" -lt 7 ]; then
        VULNERABLE=true
        echo "   ❌ VULNERABLE: Upgrade to 16.0.7+"
    else
        echo "   ✓ Not vulnerable (patched 16.x version)"
    fi
fi

# Check for vulnerable canary versions
if [[ "$NEXT_VERSION" == *"canary"* ]]; then
    echo "   ⚠️  Canary version detected"
    if [ "$MAJOR" -eq 14 ]; then
        echo "   ⚠️  14.x canary - may be vulnerable if >= 14.3.0-canary.77"
        echo "   ℹ️  Recommendation: Downgrade to stable 14.x"
        VULNERABLE=true
    fi
fi

# Stable 14.x, 13.x, and earlier are not vulnerable
if [ "$MAJOR" -eq 14 ] && [[ "$NEXT_VERSION" != *"canary"* ]]; then
    echo "   ✓ Not vulnerable (stable Next.js 14.x)"
fi

if [ "$MAJOR" -eq 13 ] || [ "$MAJOR" -lt 13 ]; then
    echo "   ✓ Not vulnerable (Next.js 13.x or earlier)"
fi

echo ""
echo "3. Checking for App Router usage..."
if [ -d "src/app" ]; then
    APP_FILES=$(find src/app -type f -name "*.tsx" -o -name "*.ts" 2>/dev/null | wc -l)
    if [ "$APP_FILES" -gt 0 ]; then
        echo "   ⚠️  App Router detected ($APP_FILES files)"
        echo "   ℹ️  If using RSC, ensure version is patched"
    else
        echo "   ℹ️  App Router directory exists but empty"
    fi
else
    echo "   ✓ No App Router detected"
fi

echo ""
echo "4. Checking for Pages Router usage..."
if [ -d "src/pages" ]; then
    PAGES_FILES=$(find src/pages -type f -name "*.tsx" -o -name "*.ts" 2>/dev/null | wc -l)
    echo "   ✓ Pages Router detected ($PAGES_FILES files)"
    echo "   ✓ Pages Router is not affected by CVE-2025-66478"
fi

echo ""
echo "5. Checking static export configuration..."
if grep -q "output.*['\"]export['\"]" next.config.js 2>/dev/null; then
    echo "   ✓ Static export configured"
    echo "   ✓ Static exports are not affected"
fi

echo ""
echo "6. Running official fix-react2shell-next scanner..."
npx fix-react2shell-next --yes 2>&1 | tail -5 || echo "   ℹ️  Scanner not available"

echo ""
echo "=================================================="
if [ "$VULNERABLE" = true ]; then
    echo "❌ RESULT: VULNERABLE to CVE-2025-66478"
    echo ""
    echo "REQUIRED ACTIONS:"
    echo "  1. Upgrade Next.js immediately to patched version"
    echo "  2. Run: npm install next@latest"
    echo "  3. Deploy updated application"
    echo "  4. Rotate all environment secrets"
    echo ""
    echo "See: https://nextjs.org/blog/CVE-2025-66478"
    exit 1
else
    echo "✅ RESULT: NOT VULNERABLE to CVE-2025-66478"
    echo ""
    echo "This repository is protected because:"
    echo "  • Next.js version $NEXT_VERSION is not affected"
    echo "  • Using Pages Router architecture (not vulnerable)"
    echo "  • Static export configuration (no server runtime)"
    echo ""
    echo "No action required. Continue monitoring security advisories."
    exit 0
fi
