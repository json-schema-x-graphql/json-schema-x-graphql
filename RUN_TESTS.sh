#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "======================================================================"
echo "  JSON Schema x GraphQL - Test Execution Summary"
echo "======================================================================"
echo ""

# Navigate to the Rust converter directory to build the WASM module.
echo "→ Building Rust WASM module for Node.js..."
(cd converters/rust && pnpm run build:nodejs)
echo "✅ WASM module built."
echo ""

# Navigate to the Node.js converter directory for the rest of the script.
cd ../node

echo "→ Running comprehensive test suite for Node.js converter..."
echo ""

echo "1. Running linter..."
pnpm run lint
echo "✅ Linter passed."
echo ""

echo "2. Building project..."
pnpm run build
echo "✅ Build successful."
echo ""

echo "3. Running tests..."
# Running all tests defined in the package.json test script
pnpm test
echo "✅ Tests completed."
echo ""

echo "4. Running WASM tests..."
pnpm run test:wasm
echo "✅ WASM tests completed."
echo "  ✅ ALL CHECKS PASSED"
echo "======================================================================"
=======
echo "→ Building frontend demo: loro-monaco..."
echo ""
cd ../../frontend/demos/loro-monaco
npm run build
echo "✅ Demo build successful."
echo ""

echo "======================================================================"
echo "  ✅ ALL CHECKS PASSED"
echo "======================================================================"

echo "======================================================================"
echo "  ✅ ALL CHECKS PASSED"
echo "======================================================================"
