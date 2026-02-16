# ADR 0005: ESM-First Module System

**Status:** Accepted  
**Date:** 2024-12-01  
**Authors:** Development Team  
**Supersedes:** None

## Context

The Schema Unification Forest project operates as a modern Node.js application with extensive build tooling, schema generation scripts, and a Next.js frontend. The Node.js ecosystem has undergone a significant transition from CommonJS (CJS) to ECMAScript Modules (ESM), requiring projects to make explicit choices about module system usage.

### Current State

The project's `package.json` declares:

```json
{
  "type": "module",
  "engines": {
    "node": ">=18.x"
  }
}
```

This configures the entire project as ESM by default, affecting:

- **36+ script files** in `scripts/` directory using `.mjs` extension
- **Frontend code** in Next.js (src/) using ESM imports/exports
- **Test files** in `__tests__/` and `tests/` using `.test.mjs` extension
- **Jest configuration** requiring `NODE_OPTIONS=--experimental-vm-modules`

### Module System Landscape

**ESM Advantages:**

- Native browser compatibility
- Static import analysis (tree-shaking, better bundling)
- Modern JavaScript standard
- Top-level await support
- Explicit imports (no implicit `require.resolve`)

**CJS Challenges:**

- Dynamic `require()` causes bundling issues
- No top-level await
- Legacy module system
- Harder to tree-shake

**Mixed System Challenges:**

- Import resolution complexity
- `require` vs `import` syntax switching
- File extension confusion (.js vs .mjs vs .cjs)
- Jest ESM support requires experimental flag
- Some npm packages still CJS-only

### Business Requirements

1. **Schema Generation Scripts Must Be Executable:** 36+ scripts in `scripts/` directory must run directly via `node scripts/filename.mjs` or via npm scripts
2. **Next.js Static Export:** Frontend must support static site generation for cloud.gov deployment
3. **Jest Testing:** Test suite must work with ESM-based scripts
4. **Third-Party Package Compatibility:** Must integrate with modern GraphQL tooling (@graphql-tools, @omnigraph, graphql-yoga)
5. **Developer Onboarding:** Clear conventions for new contributors

### Technical Constraints

- Node.js 18+ is required (LTS with native ESM support)
- Jest testing framework (no Vitest migration planned)
- Next.js 14 framework (ESM-first)
- GraphQL tooling ecosystem largely ESM-native
- Cloud.gov deployment via Docker multi-stage build

## Decision

**We adopt ESM-first as the canonical module system for the entire project.**

### Implementation Rules

1. **Package Configuration:**
   - `package.json` declares `"type": "module"`
   - Node.js version locked to `>=18.x` for stable ESM support

2. **File Extensions:**
   - `.mjs` for all standalone scripts in `scripts/` directory
   - `.js` for Next.js frontend code (ESM by default via package.json)
   - `.test.mjs` for Jest test files
   - `.cjs` ONLY when importing CJS-only packages that cannot be upgraded

3. **Import Syntax:**
   - Use `import`/`export` exclusively in new code
   - Never use `require()` except in `.cjs` files
   - Always include file extensions in relative imports: `import { helper } from './helpers/util.mjs'`

4. **Script Shebangs:**
   - All executable scripts start with `#!/usr/bin/env node`
   - Scripts assume ESM context (no `require()` calls)

5. **Jest Configuration:**
   - Run tests with `NODE_OPTIONS=--experimental-vm-modules jest`
   - `jest.config.mjs` in ESM format
   - Test files use `.test.mjs` extension

6. **CommonJS Compatibility Exceptions:**
   - Use `.cjs` extension for true CommonJS files (e.g., `src/compat/server/empty-css.cjs`)
   - Document why CJS is required in file header comments
   - Prefer ESM wrappers over CJS when possible

### Script Examples

**Canonical ESM Script Pattern:**

```javascript
#!/usr/bin/env node

/**
 * Script description
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Script logic using ESM imports
```

**Jest Test Pattern:**

```javascript
// File: __tests__/lib/validators.test.mjs

import { describe, test, expect } from "@jest/globals";
import { validateSchema } from "../../scripts/lib/validators.mjs";

describe("validateSchema", () => {
  test("validates correct schema", () => {
    // Test logic
  });
});
```

## Consequences

### Positive

- **Modern JavaScript Standard:** Aligns with ECMAScript specification and browser environments
- **Better Tooling:** Static analysis enables tree-shaking, dead code elimination, and faster bundling
- **Next.js Native Support:** Framework expects ESM, reducing configuration complexity
- **GraphQL Ecosystem:** Modern GraphQL tools (@graphql-tools, graphql-yoga) are ESM-first
- **Top-Level Await:** Can use `await` at module top-level in scripts
- **Explicit Dependencies:** Import statements make dependency trees clear
- **Future-Proof:** ESM is the long-term direction for Node.js and JavaScript

### Negative

- **Jest Experimental Flag:** Must use `NODE_OPTIONS=--experimental-vm-modules` until Jest finalizes ESM support
- **Legacy Package Issues:** Some old npm packages require CJS compatibility shims
- **Learning Curve:** Contributors familiar with CommonJS must learn ESM patterns
- **File Extensions Required:** Must include `.mjs` in imports: `import { x } from './file.mjs'` (not `./file`)
- **No `__dirname`:** Must use `fileURLToPath(import.meta.url)` pattern
- **Dynamic Imports:** `require()` equivalent requires async `import()` function

### Neutral

- **Node.js Version Lock:** Requires Node 18+ (already project requirement)
- **Migration Cost:** Existing scripts already use `.mjs`, minimal migration needed
- **Test Configuration:** Jest config requires experimental flag but tests run successfully

## Alternatives Considered

### Alternative 1: CommonJS-First (Rejected)

**Approach:** Keep package.json without `"type": "module"`, use `.cjs` by default

**Why Rejected:**

- Legacy approach, moving away from ecosystem direction
- Next.js 14 strongly prefers ESM
- GraphQL tooling ecosystem migrating to ESM
- No top-level await support
- Harder to tree-shake and optimize bundles

### Alternative 2: Dual ESM/CJS (Rejected)

**Approach:** Support both module systems equally, let developers choose per-file

**Why Rejected:**

- Increases complexity with mixed import patterns
- Jest configuration becomes more fragile
- Import resolution errors increase
- Hard to maintain consistent conventions
- New contributors face decision paralysis

### Alternative 3: TypeScript with `ts-node` (Rejected)

**Approach:** Convert all scripts to TypeScript, use ts-node for execution

**Why Rejected:**

- Compilation step adds friction to script execution
- Type checking already done via `tsc --noEmit` for src/ code
- Scripts are simple transformation logic, not complex enough to need TS
- Would require `ts-node` as dependency for script execution
- Slows down schema generation pipeline

## Success Metrics

1. **Script Execution:** All 36+ scripts in `scripts/` run without module errors
2. **Test Pass Rate:** Jest test suite passes with ESM configuration (215 tests, 44.24% coverage)
3. **Build Success:** Next.js builds successfully with `pnpm run build`
4. **Zero CJS Files:** Project contains only `.mjs` and `.js` (ESM) files, except documented `.cjs` exceptions
5. **Developer Onboarding:** New contributors can understand module system from README and examples

## Implementation Status

- ✅ Package.json configured with `"type": "module"`
- ✅ 36+ scripts use `.mjs` extension
- ✅ Jest configured with experimental ESM support
- ✅ Next.js frontend using ESM imports
- ✅ Test suite passing (215 tests, all ESM)
- ✅ Build pipeline working (Docker multi-stage build)

## Related Documentation

- [scripts/README.md](../../scripts/README.md) - Script organization and conventions
- [**tests**/README.md](../../__tests__/README.md) - Testing guide with ESM patterns
- [Testing Quick Reference](../testing-quick-reference.md) - Jest ESM configuration
- [ADR 0002: Automated Schema Parity Toolchain](./0002-schema-tooling-automation.md) - Scripts that use ESM
- [Jest ESM Documentation](https://jestjs.io/docs/ecmascript-modules)
- [Node.js ESM Documentation](https://nodejs.org/docs/latest-v18.x/api/esm.html)

## Review Schedule

- **Q1 2025:** Verify Jest ESM support stabilizes (may remove experimental flag)
- **Q2 2025:** Audit remaining CJS packages, upgrade to ESM versions if available
- **Q4 2025:** Review Node.js version requirement (consider Node 20 LTS)
