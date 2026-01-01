# TODO Checklist - Schema Authoring UI

**Last Updated:** December 2024  
**Status:** 🟡 85% Complete - Type Fixes Required

---

## 🔴 CRITICAL (Blocks Everything) - ~1 hour

### Fix Store Methods
**File:** `src/store/app-store.ts`

- [ ] Add `convert()` method to `AppActions` interface
- [ ] Add `validate()` method to `AppActions` interface  
- [ ] Add `setMode(mode: AppMode)` method to `AppActions` interface
- [ ] Add `applyAutoFix(error: ValidationError)` method to `AppActions` interface
- [ ] Add `clearValidationResult()` method to `AppActions` interface
- [ ] Implement `convert()` method in store (calls convertJsonToGraphQL or convertGraphQLToJson based on mode)
- [ ] Implement `validate()` method in store (calls validateJsonSchema or validateGraphQL based on mode)
- [ ] Implement `setMode()` method in store
- [ ] Implement `applyAutoFix()` method in store (applies text changes from error.fix)
- [ ] Implement `clearValidationResult()` method in store
- [ ] Run `pnpm run type-check` - should pass with 0 errors

### Verify Build
- [ ] `cd frontend/schema-authoring`
- [ ] `pnpm run type-check` passes
- [ ] `pnpm run dev` starts without errors
- [ ] Open http://localhost:3003 - app loads
- [ ] No console errors

---

## 🟡 HIGH PRIORITY (Get to Demo) - ~2 hours

### Manual Testing
- [ ] Paste JSON Schema in left editor
- [ ] Click "Convert" button
- [ ] GraphQL appears in right editor
- [ ] Paste invalid JSON (missing brace)
- [ ] Error appears in error panel
- [ ] Error marker shows in editor
- [ ] Click "Settings" - modal opens
- [ ] Change theme - UI updates
- [ ] Close settings - theme persists
- [ ] Click "Export" - file downloads
- [ ] Reload page - content and settings persist

### Add Sample Templates
- [ ] Create `src/examples/templates.ts`
- [ ] Add "Basic User" template
- [ ] Add "Federated Entity" template
- [ ] Add "E-commerce Product" template
- [ ] Add "Blog Post" template
- [ ] Add "Social Media Post" template
- [ ] Wire templates to UI (dropdown in Toolbar)
- [ ] Test template loading

### Polish
- [ ] Add loading states to buttons
- [ ] Improve empty state (welcome message)
- [ ] Add "Copy to Clipboard" button to output
- [ ] Test on Chrome
- [ ] Test on Firefox
- [ ] Test on Safari (if available)

---

## 🟢 MEDIUM PRIORITY (Production Ready) - 1-2 weeks

### Testing
- [ ] Set up Vitest
- [ ] Write tests for `converter-manager.ts`
- [ ] Write tests for `validators.ts`
- [ ] Write tests for store actions
- [ ] Write tests for utility functions
- [ ] Set up Playwright for E2E
- [ ] Write E2E test: conversion flow
- [ ] Write E2E test: validation flow
- [ ] Write E2E test: settings persistence
- [ ] Achieve >70% test coverage

### Documentation
- [ ] Add screenshots to README
- [ ] Record demo GIF/video
- [ ] Document x-graphql extensions
- [ ] Create CONTRIBUTING.md
- [ ] Add JSDoc comments to public APIs
- [ ] Create API reference page

### Features
- [ ] Implement jump-to-line when clicking errors
- [ ] Add keyboard shortcut: Ctrl+Enter for convert
- [ ] Add keyboard shortcut: Ctrl+Shift+F for format
- [ ] Add "Copy to Clipboard" with toast notification
- [ ] Show schema statistics (type count, complexity)
- [ ] Add help panel (F1 or Help button)
- [ ] Implement undo/redo in UI (store has it)

### WASM (Optional)
- [ ] Install Rust + wasm-pack
- [ ] Build WASM: `cd converters/rust && wasm-pack build --target web`
- [ ] Copy WASM to `frontend/schema-authoring/src/wasm/`
- [ ] Test WASM converter loads
- [ ] Compare WASM vs Node performance
- [ ] Update README with WASM build instructions

---

## 🔵 LOW PRIORITY (Nice to Have) - 1-3 months

### Advanced Features
- [ ] Visual schema builder (drag-and-drop)
- [ ] Schema diff viewer
- [ ] Import from OpenAPI/Swagger
- [ ] Export to TypeScript types
- [ ] Export to Zod schemas
- [ ] Template library with search
- [ ] Schema versioning
- [ ] Real-time collaboration (CRDT)
- [ ] LLM integration (schema generation)

### Performance
- [ ] Bundle size optimization
- [ ] Code splitting for Monaco
- [ ] Lazy load components
- [ ] Virtualize large schemas
- [ ] Add web worker for conversion
- [ ] Benchmark and optimize

### Accessibility
- [ ] Run axe-core audit
- [ ] Add ARIA labels
- [ ] Ensure keyboard navigation
- [ ] Test with screen readers
- [ ] Achieve WCAG AA compliance

### Deployment
- [ ] Set up CI/CD (GitHub Actions)
- [ ] Add Sentry for error monitoring
- [ ] Add analytics (privacy-respecting)
- [ ] Configure CDN
- [ ] Set up health checks
- [ ] Document deployment process
- [ ] Deploy to Vercel/Netlify

---

## 📝 Documentation Improvements

- [ ] Add troubleshooting section to README
- [ ] Create architecture diagram (visual)
- [ ] Document converter API in detail
- [ ] Add examples for each x-graphql extension
- [ ] Create video tutorial
- [ ] Add FAQ section
- [ ] Document common error messages

---

## 🐛 Known Issues

- [ ] WASM not built (expected - falls back to Node)
- [ ] Jump-to-error just logs (needs implementation)
- [ ] Direction toggle logs but doesn't switch mode
- [ ] Large schemas (>10K lines) not tested
- [ ] Mobile responsiveness not implemented
- [ ] Safari CORS headers for WASM (needs testing)

---

## 📊 Metrics to Track

### Code Quality
- [ ] TypeScript errors: 0
- [ ] ESLint warnings: 0
- [ ] Test coverage: >70%
- [ ] Bundle size: <500 KB (initial)

### Performance
- [ ] Initial load: <3s
- [ ] Monaco load: <2s
- [ ] Small schema conversion: <50ms
- [ ] Large schema conversion: <2s
- [ ] Keystroke latency: <16ms

### User Experience
- [ ] No console errors
- [ ] Settings persist
- [ ] Theme switches instantly
- [ ] Export works
- [ ] Errors are helpful

---

## ✅ Completed

- ✅ Project setup (Vite + React + TypeScript)
- ✅ Tailwind CSS configuration
- ✅ Monaco Editor integration
- ✅ Type definitions (500+ lines)
- ✅ Converter infrastructure (WASM + Node)
- ✅ Validation system with auto-fix
- ✅ State management (Zustand)
- ✅ AI-accessible APIs
- ✅ All UI components implemented
  - ✅ EditorPanel
  - ✅ Toolbar
  - ✅ ErrorPanel
  - ✅ StatusBar
  - ✅ SettingsPanel
- ✅ App integration
- ✅ Comprehensive documentation (3000+ lines)
- ✅ Development guides
- ✅ Action plans

---

## 🎯 Current Sprint Goal

**Get to Working Demo (2-4 hours)**

1. Fix store methods (1 hour)
2. Verify build and run (30 min)
3. Manual testing (30 min)
4. Add templates (1 hour)
5. Deploy to Vercel (30 min)

---

## 📅 Timeline

- **Today:** Fix types, verify, manual test
- **This Week:** Add templates, deploy demo
- **Next Week:** Write tests, improve docs
- **Next Month:** Advanced features, production deploy

---

**Next Action:** Add missing store methods in `src/store/app-store.ts`  
**ETA to Demo:** 2-4 hours  
**Blocker:** Type errors (5-6 missing methods)

---

**Questions?** See [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) for detailed guidance.
**Need Help?** Check [ACTION_PLAN.md](./ACTION_PLAN.md) for step-by-step instructions.