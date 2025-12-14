# Testing Quick Reference Guide

**Project**: Enterprise Schema Unification Forest
**Last Updated**: 2024

---

## Quick Commands

### Run All Tests
```bash
pnpm test
```
**Expected**: 131/132 tests pass (99.2% pass rate)

### Run Tests with Coverage
```bash
pnpm run test:coverage
```
**Output**: Generates coverage reports in `coverage/` directory

### Run Tests in Watch Mode
```bash
pnpm run test:watch
```
**Use**: For active development - reruns tests on file changes

---

## Validation Commands

### Validate JSON Schemas
```bash
pnpm run validate:schema
```
**What it does**: Validates all JSON schemas against their meta-schemas
**Expected**: ✅ Pass

### Validate GraphQL Schema
```bash
pnpm run validate:graphql
```
**What it does**: Parses GraphQL SDL and validates structure
**Expected**: ✅ Pass

### Check Schema Sync (Loose)
```bash
pnpm run validate:sync
```
**What it does**: Compares GraphQL and JSON Schema field names
**Expected**: ⚠️ Exits 1 with informational warnings (normal)

### Check Schema Sync (Strict)
```bash
pnpm run validate:sync:strict
```
**What it does**: Validates JSON Schema path mappings for all GraphQL fields
**Expected**: ⚠️ Exits 1 with path mapping gaps (normal)

### Run All Validations
```bash
pnpm run validate:all
```
**What it does**: Runs all four validation checks in sequence

---

## Generation Commands

### Generate All Interop Schemas
```bash
pnpm run generate:schema:interop
```
**Generates**:
- `generated-schemas/field-name-mapping.json`
- `generated-schemas/schema_unification.from-graphql.json`
- `generated-schemas/schema_unification.from-json.graphql`
- Example JSON files

### Generate Introspection Data
```bash
pnpm run generate:schema:introspection
```
**Generates**:
- `public/data/schema_unification-introspection.json`
- `public/data/schema_unification.graphql`

### Generate JSON Schema from GraphQL
```bash
pnpm run generate:schema:graphql
```
**Generates**:
- `generated-schemas/schema_unification.from-graphql.json`

---

## Code Quality Commands

### Type Check
```bash
pnpm run typecheck
```
**What it does**: Runs TypeScript compiler in check mode
**Current Status**: ❌ Has pre-existing errors in `voyager-v1.tsx`

### Lint with ESLint
```bash
pnpm run eslint
```
**What it does**: Runs ESLint on `src/` directory
**Current Status**: ❌ Missing ESLint plugin

### Auto-fix ESLint Issues
```bash
pnpm run eslint:fix
```

### Check Code Formatting
```bash
pnpm run format:check
```
**What it does**: Checks if code matches Prettier formatting

### Auto-format Code
```bash
pnpm run format
```
**What it does**: Automatically formats code with Prettier

---

## Running Individual Test Files

### Run a Specific Test Suite
```bash
NODE_OPTIONS=--experimental-vm-modules npx jest <path-to-test-file>
```

**Examples**:
```bash
# Test GraphQL hints library
NODE_OPTIONS=--experimental-vm-modules npx jest __tests__/lib/graphql-hints.test.mjs

# Test schema generation
NODE_OPTIONS=--experimental-vm-modules npx jest __tests__/scripts/generate-graphql-json-schema.test.mjs

# Test validators
NODE_OPTIONS=--experimental-vm-modules npx jest __tests__/validators/
```

### Run Tests Matching a Pattern
```bash
NODE_OPTIONS=--experimental-vm-modules npx jest --testNamePattern="<pattern>"
```

**Example**:
```bash
# Run only tests with "graphql" in the name
NODE_OPTIONS=--experimental-vm-modules npx jest --testNamePattern="graphql"
```

---

## Interpreting Test Results

### Successful Test Run
```
Test Suites: 17 passed, 17 total
Tests:       131 passed, 131 total
```
✅ All tests passing

### Partial Failure
```
Test Suites: 1 failed, 17 passed, 18 total
Tests:       1 failed, 131 passed, 132 total
```
⚠️ One test failing (check output for details)

### Coverage Thresholds
Current project does not enforce coverage thresholds, but aim for:
- Statements: > 70%
- Branches: > 60%
- Functions: > 70%
- Lines: > 70%

---

## Common Issues & Solutions

### Issue: "Cannot find module '@graphql-tools/utils'"
**Solution**: This is handled gracefully - the import is optional
**Action**: No action needed unless functionality is missing

### Issue: Test suite passes individually but fails in full run
**Cause**: Test isolation or cleanup issue
**Solution**: 
```bash
# Run with --runInBand to serialize tests
NODE_OPTIONS=--experimental-vm-modules npx jest --runInBand
```

### Issue: "Experimental VM Modules" warning
**Cause**: Jest requires experimental ESM support
**Action**: This is normal - warnings can be ignored

### Issue: SDL parse errors
**Check**: Verify `src/data/schema_unification.graphql` syntax
**Common causes**:
- Unclosed enum/type declarations
- Extra closing braces
- Invalid directive syntax

### Issue: Schema validation exits with code 1
**Check**: Read the output carefully
- `validate:sync` - Informational warnings are expected
- `validate:sync:strict` - Path mapping gaps are documented
**Action**: Review output, update mappings if needed

---

## Test File Locations

### Unit Tests
- `__tests__/lib/` - Library unit tests
- `tests/unit/` - Generator unit tests

### Integration Tests
- `tests/integration/` - End-to-end integration tests
- `__tests__/scripts/` - Script integration tests

### Validator Tests
- `__tests__/validators/` - Validator test suites

### Test Fixtures
- `__tests__/fixtures/` - Test data and fixtures
- `__tests__/test-output/` - Temporary test output (cleaned up after tests)

---

## Coverage Reports

### Viewing Coverage
After running `pnpm run test:coverage`:

**Text Summary**: Displayed in terminal
**HTML Report**: Open `coverage/index.html` in browser
**JSON Summary**: `coverage/coverage-summary.json`
**LCOV Report**: `coverage/lcov.info` (for CI tools)

### Coverage Visual Summary
```bash
# Generate visual summary (SVG badge)
node scripts/coverage-visual-summary.mjs
```
**Output**: 
- `coverage/coverage-visual-summary.svg`
- `coverage/coverage-visual-summary.html`

---

## Debugging Tests

### Enable Verbose Output
```bash
NODE_OPTIONS=--experimental-vm-modules npx jest --verbose
```

### Show Console Logs
```bash
NODE_OPTIONS=--experimental-vm-modules npx jest --silent=false
```

### Debug a Specific Test
```bash
NODE_OPTIONS=--experimental-vm-modules node --inspect-brk node_modules/.bin/jest --runInBand <test-file>
```
Then open `chrome://inspect` in Chrome

### Check Test Configuration
```bash
cat jest.config.mjs
```

---

## CI/CD Integration

### GitHub Actions
Tests run automatically on:
- Push to main branches
- Pull requests
- Manual workflow dispatch

### CI Test Command
```bash
pnpm run test:coverage
```
Coverage reports are uploaded as artifacts

### CI Validation Command
```bash
pnpm run validate:all
```
Note: Exits with code 1 due to informational warnings

---

## Best Practices

### Before Committing
1. Run tests: `pnpm test`
2. Check formatting: `pnpm run format:check`
3. Fix formatting: `pnpm run format`
4. Validate schemas: `pnpm run validate:all`

### When Adding New Tests
1. Follow existing test structure
2. Use descriptive test names
3. Add fixtures to `__tests__/fixtures/`
4. Clean up test artifacts in `afterAll()`
5. Use `beforeAll()` for setup

### When Modifying Schemas
1. Update GraphQL SDL: `src/data/schema_unification.graphql`
2. Update JSON Schema: `src/data/schema_unification.schema.json`
3. Regenerate: `pnpm run generate:schema:interop`
4. Validate: `pnpm run validate:all`
5. Run tests: `pnpm test`

---

## Getting Help

### Test Failures
1. Read the error message carefully
2. Check `docs/TEST-RESULTS-SUMMARY.md` for known issues
3. Run the failing test individually for more detail
4. Check recent changes to related files

### Schema Issues
1. Validate SDL syntax: `pnpm run validate:graphql`
2. Validate JSON Schema: `pnpm run validate:schema`
3. Check sync status: `pnpm run validate:sync`
4. Review schema documentation in `docs/`

### Documentation
- Main docs: `docs/README.md`
- Test results: `docs/TEST-RESULTS-SUMMARY.md`
- Validator usage: `docs/examples/validator-usage.md`
- Implementation plan: `IMPLEMENTATION-PLAN.md`

---

## Quick Troubleshooting Checklist

- [ ] Run `pnpm install` to ensure dependencies are up to date
- [ ] Clear Jest cache: `npx jest --clearCache`
- [ ] Delete test output: `rm -rf __tests__/test-output/`
- [ ] Regenerate schemas: `pnpm run generate:schema:interop`
- [ ] Check Node version: `node --version` (should be 18+)
- [ ] Check file permissions on test fixtures
- [ ] Verify GraphQL SDL syntax
- [ ] Check for uncommitted changes that might affect tests

---

**Quick Status Check**:
```bash
echo "=== Tests ===" && pnpm test 2>&1 | tail -5
echo "=== Validation ===" && pnpm run validate:schema && pnpm run validate:graphql
echo "=== Generation ===" && pnpm run generate:schema:interop 2>&1 | tail -5
```

**All Green?** 🟢 You're good to go!