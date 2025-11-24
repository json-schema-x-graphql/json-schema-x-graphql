#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "======================================================================"
echo "  JSON Schema x GraphQL - Test Execution Summary"
echo "======================================================================"
echo ""

# Navigate to the Node.js converter directory.
# All subsequent commands are run from this directory.
cd converters/node

echo "→ Running comprehensive test suite for Node.js converter..."
echo ""

echo "1. Running linter..."
npm run lint
echo "✅ Linter passed."
echo ""

echo "2. Building project..."
npm run build
echo "✅ Build successful."
echo ""

echo "3. Running tests..."
# Running all tests defined in the package.json test script
npm test
echo "✅ Tests completed."
echo ""

echo "4. Running WASM tests..."
npm run test:wasm
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
