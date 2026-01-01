# Development Guide: JSON Schema ↔ GraphQL Authoring UI

**Last Updated:** 2024

This document provides a comprehensive guide for continuing development of the JSON Schema ↔ GraphQL authoring web UI, including outstanding tasks, questions to resolve, and architectural decisions to make.

---

## Table of Contents

1. [Current Implementation Status](#current-implementation-status)
2. [Outstanding Type Alignment Issues](#outstanding-type-alignment-issues)
3. [Questions to Guide Development](#questions-to-guide-development)
4. [Next Steps by Priority](#next-steps-by-priority)
5. [Feature Roadmap](#feature-roadmap)
6. [Architecture Decisions](#architecture-decisions)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Considerations](#deployment-considerations)

---

## Current Implementation Status

### ✅ Completed Components

#### 1. **Project Structure & Configuration**
- ✅ Vite + React + TypeScript setup
- ✅ Tailwind CSS styling
- ✅ Monaco Editor dependencies
- ✅ Workspace integration (`pnpm-workspace.yaml`)
- ✅ Type definitions (`src/types/index.ts`)

#### 2. **Converter Infrastructure**
- ✅ Node converter wrapper (`src/converters/node-converter.ts`)
- ✅ WASM converter wrapper with graceful fallback (`src/converters/wasm-converter.ts`)
- ✅ Converter manager with auto-selection (`src/converters/converter-manager.ts`)
- ✅ Resilient WASM import handling (stub module for missing WASM)

#### 3. **Validation Layer**
- ✅ Ajv-based JSON Schema validator (`src/lib/validators.ts`)
- ✅ Error suggestion system
- ✅ Auto-fix infrastructure

#### 4. **State Management**
- ✅ Zustand store with Immer and persistence (`src/store/app-store.ts`)
- ✅ AI-accessible API exposure (`window.__schemaAuthoringAPI__`)
- ✅ History/undo/redo support
- ✅ Settings management

#### 5. **UI Components (Implemented but need type alignment)**
- ✅ `EditorPanel.tsx` - Monaco editor wrapper with:
  - JSON Schema and GraphQL syntax highlighting
  - Inline error markers
  - Autocompletion for x-graphql extensions
  - Keyboard shortcuts
  - Debounced change handling
- ✅ `Toolbar.tsx` - Top bar with:
  - Converter engine selection
  - Direction toggle
  - Convert/Validate/Export buttons
  - Status indicators
- ✅ `ErrorPanel.tsx` - Collapsible error list with:
  - Error/warning categorization
  - Auto-fix suggestions
  - Jump-to-location
  - Bulk actions
- ✅ `StatusBar.tsx` - Bottom bar with:
  - Performance metrics
  - Schema statistics
  - AI API indicator
  - Keyboard shortcuts hint
- ✅ `SettingsPanel.tsx` - Modal dialog with:
  - Theme selection
  - Engine preferences
  - Auto-validation/conversion toggles
  - Debounce configuration

#### 6. **Main Application**
- ✅ `App.tsx` - Integrated layout with split-pane editors
- ✅ Auto-conversion on content change
- ✅ Auto-validation support
- ✅ Theme management

---

## Outstanding Type Alignment Issues

### Issue Summary

There are type mismatches between components and the store that need resolution:

### 1. **Store Property Naming Inconsistencies**

**Problem:** Components expect different property names than the store provides.

| Component Expects | Store Provides | Fix Needed |
|-------------------|----------------|------------|
| `settings.selectedEngine` | `settings.converterEngine` | Update components OR add alias |
| `conversionDirection` | `mode` (type: `AppMode`) | Rename or add mapping |
| `convert()` | `convertJsonToGraphQL()` / `convertGraphQLToJson()` | Add unified method OR update components |
| `validate()` | `validateJsonSchema()` / `validateGraphQL()` | Add unified method OR update components |

**Recommendation:** Add convenience methods to store:
```typescript
// In app-store.ts
convert: async () => {
  const state = get();
  if (state.mode === 'json-to-graphql') {
    return get().convertJsonToGraphQL();
  } else {
    return get().convertGraphQLToJson();
  }
},

validate: async () => {
  const state = get();
  if (state.mode === 'json-to-graphql') {
    return get().validateJsonSchema();
  } else {
    return get().validateGraphQL();
  }
},

setMode: (mode: AppMode) => {
  set((state) => {
    state.mode = mode;
  });
},
```

### 2. **Type Definition Mismatches**

**Problem:** Type names differ across files.

| File | Type Name Used | Standard Should Be |
|------|----------------|-------------------|
| Types | `ConverterEngine = 'rust-wasm' \| 'node' \| 'auto'` | Keep as-is |
| Components | Used `'wasm'` instead of `'rust-wasm'` | ✅ Fixed |
| Types | `ConversionDirection = 'json-to-graphql' \| 'graphql-to-json'` | Keep |
| Types | `AppMode = 'json-to-graphql' \| 'graphql-to-json' \| 'bidirectional'` | These overlap - choose one |

**Recommendation:** Deprecate `ConversionDirection` in favor of `AppMode`, or merge them.

### 3. **Missing Store Methods**

Components need these methods that don't exist yet:

```typescript
interface AppActions {
  // Add these:
  setMode: (mode: AppMode) => void;
  applyAutoFix: (error: ValidationError) => Promise<void>;
  clearValidationResult: () => void;
}
```

### 4. **ValidationError Missing Properties**

The `EditorPanel` and `ErrorPanel` components use `error.length` and expect `error.source`, but these aren't defined in the type.

**Fix:** Already added `source?: string` and `length?: number` to `ValidationError` interface.

---

## Questions to Guide Development

### A. Architecture & Design

#### A1. Converter Engine Strategy
**Question:** Should the UI support runtime switching between WASM and Node converters, or commit to one approach?

**Options:**
- **Option 1 (Current):** Auto-select with fallback (WASM → Node)
  - Pros: Best performance when WASM available, graceful degradation
  - Cons: More complexity, larger bundle size
- **Option 2:** WASM-only (Node converter as build-time fallback during dev)
  - Pros: Simpler, smaller bundle, better performance
  - Cons: Requires Rust toolchain to build
- **Option 3:** Node converter via API endpoint
  - Pros: No WASM complexity, easier to update converter logic
  - Cons: Requires backend service, network latency

**Recommendation:** Stick with Option 1 (current approach) for best UX.

#### A2. Mode/Direction Semantics
**Question:** Should we support bidirectional editing (both schemas editable simultaneously)?

**Current state:** The UI has `mode: AppMode` which can be:
- `'json-to-graphql'` - JSON Schema is input (editable), GraphQL is output (read-only)
- `'graphql-to-json'` - GraphQL is input (editable), JSON Schema is output (read-only)
- `'bidirectional'` - Both editable (not implemented)

**Decision needed:**
- [ ] Remove bidirectional mode (simplify to one-way conversion only)
- [ ] Implement bidirectional with conflict resolution
- [ ] Add "manual mode" where both are editable but conversion is explicit

**Recommendation:** Start with one-way, add bidirectional later as advanced feature.

#### A3. Validation Strategy
**Question:** When should validation occur?

**Options:**
- Real-time (on every keystroke) - Can be slow
- Debounced (after N ms of no typing) - Current approach
- On-demand (explicit button click only)
- Hybrid (syntax check real-time, semantic validation debounced)

**Current implementation:** Debounced with configurable delay (default 800ms).

**Follow-up questions:**
- Should validation block conversion?
- Should we show different severity levels (error/warning/info)?
- Should validation be cancellable for long schemas?

#### A4. History & Undo Strategy
**Question:** What granularity should undo/redo have?

**Options:**
1. Character-level (undo each character typed)
2. Word-level (undo by word boundaries)
3. Action-level (undo entire conversion/validation/paste operations)
4. Time-based checkpoints (auto-save every N seconds)

**Current implementation:** Action-level history in store, but not fully wired up.

**Recommendation:** Implement action-level undo with time-based checkpoints for safety.

### B. Features & User Experience

#### B1. Template Library
**Question:** What templates should we provide out-of-the-box?

**Suggestions:**
- [ ] Basic: User profile, Blog post, Product catalog
- [ ] Federation: Federated entities with `@key` directives
- [ ] E-commerce: Order, Cart, Payment, Inventory
- [ ] Social: Post, Comment, Like, Follow relationships
- [ ] Enterprise: Document management, Workflow, Audit trail

**Follow-up:**
- Should templates be bundled or loaded dynamically?
- Should users be able to save/share their own templates?
- Template format: JSON? YAML? Embedded in code?

#### B2. Import/Export Formats
**Question:** What formats should import/export support?

**Current:** Export returns `ExportResult` but format handling is incomplete.

**Should support:**
- [x] JSON (implemented in types)
- [x] YAML (defined but not implemented)
- [x] TypeScript (defined but not implemented)
- [ ] OpenAPI 3.x specification?
- [ ] GraphQL IDL/SDL files?
- [ ] Protobuf definitions?

**Follow-up:**
- Should export include metadata (timestamp, converter version, etc.)?
- Should import validate before loading?

#### B3. Collaboration Features
**Question:** Should we add real-time collaboration?

**Options:**
- **CRDT-based (Yjs/Loro):** Multiple users edit simultaneously
- **Lock-based:** One user edits at a time
- **Comment-only:** Users can annotate but not edit directly
- **None:** Single-user tool only (simplest)

**Recommendation:** Start without collaboration, add as v2 feature if needed.

#### B4. Error Recovery & Auto-Fix
**Question:** How aggressive should auto-fix be?

**Current implementation:** Auto-fix suggestions provided, user must click to apply.

**Options:**
1. **Passive:** Show suggestions only
2. **Prompted:** Offer "Fix All" button
3. **Automatic:** Apply fixes automatically (with undo)
4. **AI-assisted:** Use LLM to suggest context-aware fixes

**Follow-up questions:**
- Should fixes be applied in-place or create a new version?
- Should fixes be batched or applied one-by-one?
- How to handle fixes that conflict or have side effects?

#### B5. Monaco Editor Features
**Question:** Which Monaco features should we enable/customize?

**Current implementation:** Basic setup with syntax highlighting and error markers.

**Should add:**
- [ ] Code folding for nested objects/types
- [ ] Breadcrumbs for navigation
- [ ] Find/replace with regex
- [ ] Multi-cursor editing
- [ ] Diff editor for comparing versions
- [ ] IntelliSense for GraphQL directives
- [ ] Hover tooltips with type information
- [ ] Code lens (inline actions like "Convert this type")

**Performance considerations:**
- Large schemas (>10,000 lines) may need virtualization
- Syntax checking debouncing to avoid UI lag

### C. Converter Integration

#### C1. WASM Build Strategy
**Question:** How should WASM be built and distributed?

**Current state:** WASM package is optional, with stub fallback.

**Options:**
1. **Build at install time:** Run `wasm-pack` in postinstall script
   - Pros: Always up-to-date
   - Cons: Requires Rust on every developer machine
2. **Pre-build and commit:** Check in built WASM to repo
   - Pros: No build toolchain needed
   - Cons: Larger repo size, manual updates
3. **CDN delivery:** Load WASM from external CDN
   - Pros: Smaller bundle
   - Cons: Network dependency, versioning complexity
4. **Separate package:** Publish WASM as standalone npm package
   - Pros: Clean separation, optional dependency
   - Cons: Version coordination

**Recommendation:** Option 4 (separate package) for production, Option 2 (pre-build) for development.

#### C2. Node Converter API
**Question:** Should Node converter run in-browser or server-side?

**Current state:** Node converter imports are client-side (would need bundling).

**Options:**
1. **Bundle with Vite:** Include Node converter code in frontend bundle
   - Pros: No backend needed
   - Cons: Larger bundle size
2. **Backend API:** Run Node converter as Express endpoint
   - Pros: Smaller frontend, server-side validation
   - Cons: Requires backend deployment
3. **Hybrid:** Bundle for dev, API for production
   - Pros: Best of both worlds
   - Cons: Complexity

**Recommendation:** Option 1 for now (simplest), migrate to Option 2 if bundle size becomes an issue.

#### C3. Converter Options UI
**Question:** Should advanced converter options be exposed in the UI?

**Current state:** Conversion options exist in types but no UI for them.

**Options from types:**
- `includeDescriptions: boolean`
- `useInterfaces: boolean`
- `generateResolvers: boolean`
- `customScalars: Record<string, string>`
- `fieldNameCase: 'camelCase' | 'snake_case' | ...`
- Federation options

**UI approaches:**
1. Advanced settings panel (modal or sidebar)
2. Inline options in editor (code lens / gutter)
3. JSON configuration file
4. Command palette

**Recommendation:** Start with Advanced Settings panel, add inline options later for frequently-used settings.

### D. AI Integration

#### D1. AI API Usage
**Question:** How should AI agents interact with the editor?

**Current implementation:** `window.__schemaAuthoringAPI__` exposes:
- `getJsonSchema()`, `setJsonSchema()`
- `getGraphQLSchema()`, `setGraphQLSchema()`
- `convert()`, `validate()`
- `getStateSnapshot()`, `exportSchemas()`

**Use cases:**
1. AI agent monitors editor and suggests improvements
2. AI generates schema from natural language description
3. AI explains validation errors in plain language
4. AI refactors schema (e.g., "Extract this type into a separate definition")

**Questions:**
- Should AI access be gated (require user consent)?
- Should AI actions be logged/auditable?
- Should AI suggestions appear inline or in separate panel?
- Should AI have read-only or read-write access?

**Recommendation:** Start with read-only AI access, add write capabilities with explicit user confirmation.

#### D2. LLM Integration
**Question:** Should we integrate an LLM for advanced features?

**Potential features:**
- Natural language → JSON Schema conversion
- Explain schema in plain English
- Suggest field names based on description
- Validate schema against business requirements (described in prose)
- Generate test data matching schema

**Options:**
1. No LLM integration (keep it simple)
2. Optional LLM (user provides API key)
3. Built-in LLM service (requires backend)

**Recommendation:** Defer LLM integration to v2, but design API to accommodate it.

### E. Testing & Quality

#### E1. Test Coverage Goals
**Question:** What level of test coverage should we aim for?

**Test types needed:**
- [ ] Unit tests (converters, validators, store actions)
- [ ] Integration tests (conversion flows, validation pipelines)
- [ ] Component tests (React Testing Library)
- [ ] E2E tests (Playwright for full user flows)
- [ ] Visual regression tests (Storybook + Chromatic?)
- [ ] Performance tests (large schema conversion benchmarks)

**Coverage targets:**
- Critical paths: 90%+
- Utility functions: 80%+
- UI components: 70%+
- Overall: 75%+

**Recommendation:** Start with unit tests for converters and validators, add E2E tests for critical flows.

#### E2. Error Handling Strategy
**Question:** How should we handle and report errors?

**Current state:** Basic error capture in conversion/validation results.

**Need to handle:**
- Network errors (if using backend API)
- WASM loading failures (handled with fallback)
- Parser errors (malformed JSON/GraphQL)
- Validation errors (schema issues)
- System errors (out of memory, timeout)

**Error reporting options:**
1. Inline in editor (current approach)
2. Toast notifications for system errors
3. Error boundary for React crashes
4. Sentry/logging service for production

**Recommendation:** Use all four - inline for schema errors, toasts for system errors, error boundary for crashes, logging for production monitoring.

#### E3. Performance Benchmarks
**Question:** What performance targets should we set?

**Metrics to track:**
- Conversion time for small schema (<100 lines): <50ms
- Conversion time for medium schema (<1000 lines): <200ms
- Conversion time for large schema (<10,000 lines): <2s
- Validation time: Similar to conversion
- Editor responsiveness: <16ms per keystroke (60 FPS)
- Initial load time: <3s

**How to measure:**
- Add performance.mark/measure calls
- Store timing data in conversion results
- Display in status bar
- Log to analytics

**Recommendation:** Implement performance timing hooks early, set concrete targets after baseline measurements.

---

## Next Steps by Priority

### 🔴 High Priority (Immediate - Complete First)

#### 1. Fix Type Alignment Issues (2-4 hours)
- [ ] Add unified `convert()` and `validate()` methods to store
- [ ] Add `setMode()` method to store
- [ ] Add `applyAutoFix()` method to store
- [ ] Add `clearValidationResult()` method to store
- [ ] Fix all TypeScript errors in components
- [ ] Verify all imports resolve correctly

#### 2. Complete Monaco Editor Integration (2-3 hours)
- [ ] Test editors with sample schemas
- [ ] Verify error markers display correctly
- [ ] Test autocompletion for x-graphql extensions
- [ ] Verify keyboard shortcuts work (Ctrl+S, Ctrl+K)
- [ ] Test read-only mode toggling
- [ ] Add jump-to-line functionality for error panel clicks

#### 3. Build WASM Package (1-2 hours, if Rust available)
- [ ] Run `wasm-pack build --target web` in `converters/rust/`
- [ ] Copy output to `frontend/schema-authoring/src/wasm/`
- [ ] Test WASM converter loads and works
- [ ] Compare performance vs Node converter
- [ ] Update README with build instructions

#### 4. End-to-End Testing (2-3 hours)
- [ ] Test full conversion flow: JSON → GraphQL
- [ ] Test reverse conversion: GraphQL → JSON
- [ ] Test validation with intentionally broken schemas
- [ ] Test auto-fix suggestions
- [ ] Test export functionality
- [ ] Test settings persistence
- [ ] Test theme switching

### 🟡 Medium Priority (Next Sprint - 1-2 weeks)

#### 5. Add Sample Templates (4-6 hours)
- [ ] Create 5-10 template JSON schemas
- [ ] Add template selection UI (dropdown or modal)
- [ ] Implement `loadTemplate()` action in store
- [ ] Add "Reset to Template" button
- [ ] Document template format

#### 6. Implement Node Converter Backend (Optional, 6-8 hours)
- [ ] Create Express server with `/api/convert` endpoint
- [ ] Add Vite proxy config for development
- [ ] Update Node converter wrapper to use API
- [ ] Add error handling for network failures
- [ ] Document backend setup in README

#### 7. Add Advanced Settings (3-4 hours)
- [ ] Expose converter options in Settings panel
  - Include descriptions
  - Use interfaces vs types
  - Custom scalars
  - Field name casing
- [ ] Add JSON import/export for settings
- [ ] Add "Reset to Defaults" button

#### 8. Improve Error Messages (4-6 hours)
- [ ] Review common validation errors
- [ ] Write helpful suggestion messages
- [ ] Implement more auto-fix recipes
- [ ] Add links to documentation
- [ ] Test error messages with non-technical users

#### 9. Add Keyboard Shortcuts (2-3 hours)
- [ ] Implement Ctrl+S for export
- [ ] Implement Ctrl+K for format
- [ ] Implement F1 for help panel
- [ ] Add shortcuts for convert/validate
- [ ] Display shortcuts in help panel

#### 10. Create Help/Documentation Panel (3-4 hours)
- [ ] Build help modal component
- [ ] Document x-graphql extensions
- [ ] Provide usage examples
- [ ] Link to external documentation
- [ ] Add search functionality

### 🟢 Low Priority (Future Enhancements - 1-3 months)

#### 11. Add Unit Tests (10-15 hours)
- [ ] Set up Vitest or Jest
- [ ] Write tests for converter wrappers
- [ ] Write tests for validators
- [ ] Write tests for store actions
- [ ] Write tests for utility functions
- [ ] Set up CI to run tests

#### 12. Add E2E Tests (8-12 hours)
- [ ] Set up Playwright
- [ ] Write tests for critical user flows
- [ ] Add visual regression tests
- [ ] Set up CI to run E2E tests
- [ ] Add test coverage reporting

#### 13. Add Diff Viewer (6-8 hours)
- [ ] Implement Monaco diff editor
- [ ] Add "Compare Versions" feature
- [ ] Show before/after for auto-fixes
- [ ] Add history diff view

#### 14. Add Schema Statistics (4-6 hours)
- [ ] Count types, fields, enums
- [ ] Calculate schema complexity score
- [ ] Show nesting depth
- [ ] Visualize schema graph (optional)

#### 15. Add Dark/Light Theme Toggle (2-3 hours)
- [ ] Add theme switcher in toolbar (currently in settings)
- [ ] Ensure all components respect theme
- [ ] Add system preference detection
- [ ] Persist theme choice

#### 16. Optimize Bundle Size (4-8 hours)
- [ ] Analyze bundle with `rollup-plugin-visualizer`
- [ ] Code-split Monaco editor
- [ ] Lazy-load components
- [ ] Tree-shake unused libraries
- [ ] Target <500 KB initial bundle

#### 17. Add Accessibility Features (6-10 hours)
- [ ] Audit with axe-core
- [ ] Add ARIA labels
- [ ] Ensure keyboard navigation works
- [ ] Add screen reader announcements
- [ ] Test with NVDA/JAWS

#### 18. Add Telemetry/Analytics (4-6 hours)
- [ ] Add event tracking (conversions, errors, etc.)
- [ ] Track performance metrics
- [ ] Add user feedback mechanism
- [ ] Privacy-preserving analytics

---

## Feature Roadmap

### Version 1.0 (MVP - Immediate)
**Goal:** Functional schema conversion with basic editing

- ✅ JSON Schema ↔ GraphQL conversion
- ✅ Syntax highlighting and error markers
- ✅ Basic validation
- ✅ Settings panel
- ✅ Export functionality
- ⚠️ Fix type alignment issues
- 🔲 End-to-end testing
- 🔲 5+ sample templates
- 🔲 Documentation

### Version 1.1 (Polish - 1 month)
**Goal:** Production-ready with good UX

- 🔲 WASM performance optimization
- 🔲 Comprehensive error messages
- 🔲 Auto-fix for common errors
- 🔲 Keyboard shortcuts
- 🔲 Help documentation
- 🔲 Unit test coverage >70%

### Version 1.2 (Advanced Features - 2-3 months)
**Goal:** Power user features

- 🔲 Advanced converter options UI
- 🔲 Diff viewer for history
- 🔲 Schema statistics dashboard
- 🔲 Template library with search
- 🔲 Import/export in multiple formats
- 🔲 E2E test coverage

### Version 2.0 (AI & Collaboration - 6+ months)
**Goal:** Next-generation schema tooling

- 🔲 AI-powered schema generation
- 🔲 Real-time collaboration (CRDT)
- 🔲 Visual schema builder
- 🔲 LLM integration for explanations
- 🔲 Schema composition validation
- 🔲 CI/CD integration

---

## Architecture Decisions

### ADR-001: Use Zustand for State Management
**Status:** Accepted

**Context:** Need centralized state for editors, conversion results, settings.

**Decision:** Use Zustand with Immer middleware for state management.

**Rationale:**
- Simpler than Redux, less boilerplate
- Immer provides immutable updates
- Good TypeScript support
- Easy to test

**Consequences:**
- All state mutations must go through store actions
- Need to be careful with performance (use selectors wisely)

### ADR-002: Monaco Editor for Code Editing
**Status:** Accepted

**Context:** Need powerful code editor with syntax highlighting, IntelliSense, etc.

**Decision:** Use Monaco Editor (VS Code's editor).

**Rationale:**
- Best-in-class editor features
- Excellent TypeScript/JSON/GraphQL support
- Extensible with custom languages and providers
- Large community and documentation

**Consequences:**
- Large bundle size (~3 MB)
- Need code-splitting to keep initial load fast
- Need to configure language services carefully

### ADR-003: Converter Engine Abstraction
**Status:** Accepted

**Context:** Want to support multiple converter implementations (WASM, Node).

**Decision:** Create `ConverterManager` with engine abstraction and auto-fallback.

**Rationale:**
- Allows runtime engine selection
- Graceful degradation if WASM unavailable
- Easy to add new engines
- Performance comparison across engines

**Consequences:**
- More complex than single engine
- Need to maintain interface compatibility
- Need to handle engine initialization failures

### ADR-004: Tailwind CSS for Styling
**Status:** Accepted

**Context:** Need fast, maintainable styling approach.

**Decision:** Use Tailwind CSS utility-first framework.

**Rationale:**
- Rapid development
- Consistent design tokens
- Excellent dark mode support
- Purge removes unused styles

**Consequences:**
- Need to learn utility classes
- Verbose className attributes
- Need JIT mode for custom values

### ADR-005: Vite for Build Tool
**Status:** Accepted

**Context:** Need fast development experience and production builds.

**Decision:** Use Vite for bundling and dev server.

**Rationale:**
- Lightning-fast HMR
- Native ESM support
- Good WASM integration
- Rollup-based production builds

**Consequences:**
- Need to configure for WASM properly
- Some legacy tools may not work

---

## Testing Strategy

### Unit Tests (Vitest)
**Target coverage: 80%+**

**What to test:**
- Converter wrappers (mock WASM/Node imports)
- Validators (various schema inputs)
- Store actions (state mutations)
- Utility functions (pure logic)

**Example test structure:**
```typescript
describe('ConverterManager', () => {
  it('should auto-select WASM when available', async () => {
    // Test implementation
  });

  it('should fallback to Node when WASM fails', async () => {
    // Test implementation
  });
});
```

### Integration Tests
**Target: Critical paths**

**Scenarios to test:**
- Full conversion flow (input → convert → output)
- Validation flow (input → validate → errors → fix → validate)
- Export flow (content → export → download)
- Settings flow (change setting → persist → reload)

### E2E Tests (Playwright)
**Target: User journeys**

**Test cases:**
1. New user opens app, sees welcome screen, loads template
2. User pastes JSON Schema, clicks Convert, sees GraphQL output
3. User makes error in schema, sees validation errors, applies fix
4. User changes theme, setting persists across reload
5. User exports schemas, file downloads correctly

### Performance Tests
**Benchmarks to track:**

| Scenario | Target Time | How to Measure |
|----------|-------------|----------------|
| Small schema conversion | <50ms | `performance.measure()` |
| Large schema conversion | <2s | `performance.measure()` |
| Initial app load | <3s | Lighthouse |
| Editor keystroke latency | <16ms | RAF timing |

---

## Deployment Considerations

### Production Build Checklist

- [ ] Set up CI/CD pipeline (GitHub Actions?)
- [ ] Configure environment variables
- [ ] Enable production optimizations in Vite
- [ ] Add error monitoring (Sentry?)
- [ ] Add analytics (privacy-respecting)
- [ ] Set up CDN for static assets
- [ ] Configure CSP headers
- [ ] Add rate limiting (if using backend API)
- [ ] Set up health check endpoint
- [ ] Document deployment process

### Hosting Options

1. **Static Site (Recommended for MVP)**
   - Vercel, Netlify, or GitHub Pages
   - Pros: Simple, fast, free tier
   - Cons: No backend for Node converter API

2. **Full-Stack (If backend needed)**
   - Render, Railway, or Fly.io
   - Pros: Can run Node converter API
   - Cons: More complex, costs money

3. **Self-Hosted**
   - Docker container on own infrastructure
   - Pros: Full control
   - Cons: Maintenance burden

### Environment Configuration

```bash
# .env.production
VITE_APP_VERSION=1.0.0
VITE_ENABLE_WASM=true
VITE_CONVERTER_API_URL=https://api.example.com
VITE_SENTRY_DSN=https://...
```

---

## Decision Log

Use this section to document decisions made during development:

### [Date] - [Decision Title]
**Decision:** [What was decided]
**Rationale:** [Why this was chosen]
**Alternatives considered:** [What else was considered]
**Impact:** [How this affects the project]

---

## Open Questions

Track unresolved questions here:

1. **Q:** Should we support custom scalar mappings in the UI?
   - **Status:** Under discussion
   - **Deadline:** Before v1.1
   - **Owner:** TBD

2. **Q:** What license should this project use?
   - **Status:** Open
   - **Options:** MIT, Apache 2.0, GPL v3
   - **Owner:** Project lead

3. **Q:** Should we build a VS Code extension?
   - **Status:** Deferred to v2.0
   - **Rationale:** Focus on web UI first

---

## Contributing Guidelines

### For New Contributors

1. Read this guide thoroughly
2. Set up development environment (see README)
3. Pick a task from "Next Steps" above
4. Create feature branch: `feature/your-feature-name`
5. Make changes with tests
6. Submit PR with clear description

### Code Style

- Use Prettier for formatting (config in repo)
- Use ESLint for linting (config in repo)
- Write TypeScript with strict mode
- Document public APIs with JSDoc
- Keep functions small and focused

### Commit Message Format

```
type(scope): brief description

Longer description if needed.

Fixes #123
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

---

## Resources & References

### Documentation
- [Monaco Editor API](https://microsoft.github.io/monaco-editor/api/index.html)
- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [JSON Schema Specification](https://json-schema.org/specification.html)
- [GraphQL Specification](https://spec.graphql.org/)

### Similar Projects
- [JSON Schema Editor](https://github.com/json-editor/json-editor)
- [GraphQL Playground](https://github.com/graphql/graphql-playground)
- [Stoplight Studio](https://stoplight.io/studio)

### Community
- [GraphQL Discord](https://discord.graphql.org/)
- [JSON Schema Slack](https://json-schema.org/slack)

---

## Appendix: Quick Reference

### Common Commands

```bash
# Install dependencies
pnpm install

# Start dev server
cd frontend/schema-authoring
pnpm run dev

# Build for production
pnpm run build

# Run tests
pnpm run test

# Build WASM (requires Rust + wasm-pack)
cd converters/rust
wasm-pack build --target web --out-dir ../../frontend/schema-authoring/src/wasm

# Type check
pnpm run type-check

# Lint
pnpm run lint
```

### File Structure Reference

```
frontend/schema-authoring/
├── src/
│   ├── components/          # React components
│   │   ├── EditorPanel.tsx
│   │   ├── Toolbar.tsx
│   │   ├── ErrorPanel.tsx
│   │   ├── StatusBar.tsx
│   │   └── SettingsPanel.tsx
│   ├── converters/          # Converter wrappers
│   │   ├── node-converter.ts
│   │   ├── wasm-converter.ts
│   │   └── converter-manager.ts
│   ├── lib/                 # Utilities
│   │   └── validators.ts
│   ├── store/               # State management
│   │   └── app-store.ts
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   ├── wasm/                # WASM module (build output)
│   ├── App.tsx              # Main component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── dist/                    # Build output
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies
```

---

**Last Updated:** [Date]  
**Document Owner:** [Name]  
**Next Review:** [Date]