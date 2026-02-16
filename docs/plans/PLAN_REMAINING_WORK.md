# Project Plan: Remaining Work (Phases 4 & 5)

**Project**: JSON Schema x GraphQL  
**Date**: 2024-05-20  
**Status**: Planning for Hardening & Release  
**Previous Phase**: Phase 3 (Web Editor) - ✅ Complete

---

## Executive Summary

With the core converters (Rust & Node.js) and the Visual Editor now functional, the focus shifts to **hardening**. Remaining work ensures parity, robustness, and readiness for external users, especially around complex schemas and documentation.

The updated plan explicitly tracks advanced `$ref` resolution and richer test coverage so the project can survive real-world schema complexity and deployment scenarios.

---

## Phase 4: Validation, Testing & Hardening

**Goal**: Eliminate parity gaps between converters while strengthening the engine against recursive, multi-file, and malformed JSON Schemas.

### 4.1. Technical Improvements (Priority Implementation)
*Ref: `docs/plans/TECHNICAL_IMPROVEMENTS.md`*

1. **Circular Reference Protection (Node.js)** - ✅ Complete
   * **Task**: Implement detection and safe handling of circular `$ref` in the Node.js converter.
   * **Why**: Prevents stack overflow crashes on recursive/looping schemas.
   * **Est**: 3 hours.

2. **Enhanced `$ref` Resolution (Both Engines)**
   * **Task**: Fully support JSON Pointer navigation, resolving nested `$ref` paths, cross-file references, and `$defs` targets recursively.
   * **Why**: Real-world schemas reference shared types deeply and across files; accurate GraphQL output depends on resolving the actual node the pointer targets.
   * **Est**: 2-3 days per converter.

3. **Nested Resolution Verification**
   * **Task**: Create an automated suite (`nested-ref.json`, multi-file fixtures) that exercises resolution through `$defs`, `allOf`, and `oneOf` layers.
   * **Why**: Validates that the enhancement covers true complexity, not just single-level references.
   * **Est**: 1 day.

4. **`$defs` Type Extraction (Node.js)** - ✅ Complete
   * **Task**: Scan for reusable definitions and convert them into GraphQL types alongside root schemas.
   * **Why**: Aligns Node.js output with Rust behavior and real project conventions.
   * **Est**: 1 day.

5. **Type Filtering & Configuration** - ✅ Complete
   * **Task**: Add options to exclude specific GraphQL type names or suffixes from conversion.
   * **Why**: Lets users focus on core entities when integrating with existing GraphQL services.
   * **Est**: 1 day.

### 4.2. Testing Infrastructure

1. **Consolidate Test Suites** - ✅ Complete  
   * **Task**: Use `converters/test-data` as canonical fixtures.  
   * **Task**: Run converters and diff SDL outputs via `scripts/test-both-converters.js`.

2. **Edge Case Coverage**
   * **Task**: Add schema fixtures covering:
     * Deeply nested arrays/objects and recursive structures.
     * Complex `oneOf`/`anyOf` unions with discriminator logic.
     * All Apollo Federation directives combined with `x-graphql-*` controls.
     * Invalid/malformed schemas to verify error messaging.
     * Nested `$ref` chains, file references, and `$defs` indirection.

3. **Deep `$ref` Regression Testing**
   * **Task**: Add targeted tests to ensure recursive resolution returns the schema at the reference target, not only the reference path.
   * **Why**: Prevents drift when new nested references are introduced or when refactoring $defs hierarchies.
   * **Est**: 1-2 days.

### 4.3. Performance Profiling

1. **Benchmarking**
   * **Task**: Run conversions on small, medium, and large schemas (10k+ lines) to capture CPU/memory profiles.
   * **Task**: Compare Rust WASM vs. Node.js native throughput.
   * **Task**: Identify hotspots introduced by deep resolution and optimize memoization/path caching.

---

## Phase 5: Documentation & Release

**Goal**: Make the project discoverable, understandable, and deployable.

### 5.1. Documentation Polish

1. **API Documentation**
   * Generate TSDoc/JSDoc for Node.js package.
   * Generate `cargo doc` artifacts for the Rust crate.
   * Write a "Migration Guide" for users coming from tools like `jsonschema2graphql`.

2. **Integration Guides**
   * Document "Using with Apollo Federation" with directive handling notes.
   * Document "Using in a CI/CD Pipeline" including schema linting and test runner instructions.
   * Document "Using with React/Next.js" highlighting GraphQL type customization.

### 5.2. Packaging & Publishing

1. **NPM Package (`@json-schema-x-graphql/core`)**
   * Finalize `package.json` exports, type maps, and peer dependencies.
   * Set up the npm release pipeline with versioning and changelog automation.

2. **Rust Crate (`json-schema-x-graphql`)**
   * Finalize `Cargo.toml` metadata and feature flags.
   * Verify `crates.io` publication requirements (documentation, licensing, versioning).

3. **Visual Editor Deployment**
   * Optimize the editor build (asset hashing, pruning).
   * Deploy to a public host (Vercel/Netlify/GitHub Pages) and validate UX with production data.

### 5.3. Marketing & Community

1. **Launch Assets**
   * Produce a "Showcase" video demonstrating the visual editor and converter parity.
   * Update repository social preview image (OG Image) to highlight the release.

---

## Implementation Roadmap

| Timeline | Phase | Key Deliverables |
| --- | --- | --- |
| **Week 1** | 4.1 | Circular protection, deep `$ref` resolution, nested regression tests |
| **Week 2** | 4.2 | Extended edge-case fixtures, unified test runner validation |
| **Week 3** | 4.3 | Benchmarking, memoization tuning, guarding performance |
| **Week 4** | 5.1 | API docs, migration & integration guides |
| **Week 5** | 5.2 | NPM/crate releases, editor deployment |

---

## Success Metrics

1. **Reliability**
   * 100% pass rate on consolidated test suite (50+ fixtures).
   * Zero crashes or misresolved types when encountering circular or nested `$ref`.

2. **Parity**
   * Rust and Node.js converters produce semantically identical SDL for 95% of cases, with aligned descriptions/directives.

3. **Performance**
   * Sub-50ms conversion for schemas under 1,000 lines even with deep references.
   * Editor maintains 60fps responsiveness with medium-sized schemas.

4. **Adoption Readiness**
   * Packages published to npm and crates.io with complete doc sets.
   * Documentation covers configuration, advanced ref handling, and CLI/CI usage.

---

## Resource Requirements

* **Developers**: 1 Full-stack engineer (Rust + TypeScript).
* **Infrastructure**: CI/CD provider (GitHub Actions), Hosting provider for editor (Vercel/Netlify).