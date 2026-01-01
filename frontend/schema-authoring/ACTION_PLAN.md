# Immediate Action Plan - Schema Authoring UI

**Status:** Implementation ~85% complete  
**Blockers:** Type alignment issues preventing compilation  
**ETA to working demo:** 2-4 hours

---

## 🚨 Critical Fixes Required (Do These First)

### 1. Add Missing Store Methods (30 minutes)

**File:** `frontend/schema-authoring/src/store/app-store.ts`

Add these methods to the `AppActions` interface and implement them:

```typescript
// Add to interface AppActions
setMode: (mode: AppMode) => void;
applyAutoFix: (error: ValidationError) => Promise<void>;
clearValidationResult: () => void;

// Add convenience methods for components
convert: () => Promise<void>;
validate: () => Promise<void>;
```

**Implementation:**

```typescript
// Add to store implementation
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

applyAutoFix: async (error: ValidationError) => {
  if (!error.fix) return;
  
  const state = get();
  const currentContent = state.mode === 'json-to-graphql'
    ? state.jsonSchemaEditor.content
    : state.graphqlEditor.content;
  
  // Apply the fix changes
  let newContent = currentContent;
  for (const change of error.fix.changes) {
    // Simple implementation - replace text at position
    const lines = newContent.split('\n');
    if (change.startLine <= lines.length) {
      const line = lines[change.startLine - 1];
      const before = line.substring(0, change.startColumn - 1);
      const after = line.substring(change.endColumn - 1);
      lines[change.startLine - 1] = before + change.newText + after;
      newContent = lines.join('\n');
    }
  }
  
  // Update the appropriate editor
  if (state.mode === 'json-to-graphql') {
    get().setJsonSchemaContent(newContent);
  } else {
    get().setGraphQLContent(newContent);
  }
},

clearValidationResult: () => {
  set((state) => {
    state.validationResult = null;
  });
},
```

### 2. Fix Component Type Errors (30 minutes)

**Files to update:**
- `src/components/Toolbar.tsx` - Already updated to use correct types
- `src/components/StatusBar.tsx` - Needs `mode` instead of `conversionDirection`
- `src/components/ErrorPanel.tsx` - Already mostly correct
- `src/App.tsx` - Already updated

**Quick fixes needed in StatusBar.tsx:**

Change line with `conversionDirection` to:
```typescript
const mode = useAppStore((state) => state.mode);
```

And update the display logic:
```typescript
<span className="font-mono text-xs">
  {mode === 'json-to-graphql' ? 'JSON→GQL' : 'GQL→JSON'}
</span>
```

### 3. Verify All Imports (15 minutes)

Run these commands:

```bash
cd frontend/schema-authoring
pnpm run type-check
```

Fix any remaining import errors or type mismatches.

---

## ✅ Verification Checklist (1 hour)

Once types are fixed, verify these work:

### Test 1: Basic Startup
```bash
cd frontend/schema-authoring
pnpm run dev
```
- [ ] App loads without errors
- [ ] Both editors render
- [ ] Toolbar displays correctly
- [ ] Status bar shows correct info

### Test 2: JSON Schema → GraphQL Conversion

Paste this into left editor:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "User",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "name": {
      "type": "string"
    },
    "email": {
      "type": "string",
      "format": "email"
    }
  },
  "required": ["id", "name", "email"]
}
```

- [ ] Click "Convert" button
- [ ] GraphQL schema appears in right editor
- [ ] No errors in console
- [ ] Status bar shows conversion time

### Test 3: Validation

Paste invalid JSON into left editor (missing closing brace):
```json
{
  "type": "object"
```

- [ ] Validation error appears in error panel
- [ ] Red marker appears in editor
- [ ] Error message is helpful

### Test 4: Settings

- [ ] Click Settings button
- [ ] Modal opens
- [ ] Change theme to Light
- [ ] Theme changes immediately
- [ ] Close and reopen - setting persists

### Test 5: Export

- [ ] Enter some content in left editor
- [ ] Click Export button
- [ ] File downloads
- [ ] File contains correct JSON

---

## 🎯 Post-Fix Tasks (Priority Order)

### A. Add Sample Content (30 minutes)

Create `src/examples/templates.ts`:

```typescript
export const templates = {
  basic: {
    name: 'Basic User Schema',
    jsonSchema: '{ ... }',
    description: 'Simple user object with common fields'
  },
  federation: {
    name: 'Federated Entity',
    jsonSchema: '{ ... }',
    description: 'Apollo Federation entity with @key directive'
  },
  // Add 3-5 more
};
```

Add "Load Template" dropdown to Toolbar.

### B. Improve Error Messages (1 hour)

Enhance `src/lib/validators.ts`:
- Add more helpful suggestions
- Add common fix recipes
- Improve error context

### C. Add Help Panel (1-2 hours)

Create `src/components/HelpPanel.tsx`:
- Document x-graphql extensions
- Show keyboard shortcuts
- Link to external docs

### D. Write Tests (3-4 hours)

Create `src/__tests__/`:
- `converter-manager.test.ts`
- `validators.test.ts`
- `app-store.test.ts`

---

## 🔧 Known Issues & Workarounds

### Issue 1: WASM Not Built
**Status:** Expected  
**Workaround:** App automatically falls back to Node converter  
**Fix:** Run `wasm-pack build` when Rust toolchain available

### Issue 2: Auto-conversion Timing
**Status:** May fire too frequently  
**Workaround:** Increase debounce delay in settings  
**Fix:** Optimize debouncing logic in App.tsx

### Issue 3: Large Schemas Slow
**Status:** Not yet tested with >1000 lines  
**Workaround:** None yet  
**Fix:** Add virtualization or web worker for conversion

---

## 📝 Documentation To-Do

- [ ] Update main README with screenshots
- [ ] Document x-graphql extension format
- [ ] Create CONTRIBUTING.md
- [ ] Add inline JSDoc comments
- [ ] Record demo video

---

## 🚀 Path to Production

### Phase 1: MVP (Current - 1 week)
- [x] Basic UI structure ✅
- [x] Components implemented ✅
- [ ] Fix type errors ⚠️
- [ ] End-to-end testing
- [ ] Add 5 templates
- [ ] Write README

### Phase 2: Polish (2-3 weeks)
- [ ] Unit tests (80% coverage)
- [ ] Performance optimization
- [ ] Better error messages
- [ ] Help documentation
- [ ] Accessibility audit

### Phase 3: Deploy (1 week)
- [ ] Set up CI/CD
- [ ] Deploy to Vercel/Netlify
- [ ] Add analytics
- [ ] Add error monitoring
- [ ] Write blog post

---

## 💡 Quick Wins (Easy Improvements)

1. **Add Loading States** (30 min)
   - Show spinner during long conversions
   - Disable buttons while processing

2. **Add Keyboard Shortcuts** (1 hour)
   - Implement Ctrl+Enter for convert
   - Implement Ctrl+Shift+F for format
   - Show shortcuts in help

3. **Add Copy Button** (30 min)
   - Add "Copy to Clipboard" button to output editor
   - Show toast notification on copy

4. **Improve Empty State** (30 min)
   - Show welcome message when editors empty
   - Add "Load Template" CTA
   - Add quick tips

5. **Add Schema Stats** (1 hour)
   - Count types in GraphQL output
   - Show required vs optional fields
   - Calculate schema complexity score

---

## 📞 Getting Help

### If Stuck On Type Errors:
1. Read error messages carefully
2. Check `src/types/index.ts` for correct type names
3. Compare component usage to store API in `src/store/app-store.ts`
4. Use TypeScript's "Go to Definition" to verify property names

### If Conversion Fails:
1. Check browser console for errors
2. Verify converter manager is initialized (should log at startup)
3. Test with simple schema first
4. Check that Node converter is bundled correctly

### If UI Looks Broken:
1. Verify Tailwind is compiling (check `npm run dev` output)
2. Check dark mode class on `<html>` element
3. Verify Monaco editor loaded (Network tab in DevTools)
4. Clear browser cache and reload

---

## ✨ Success Criteria

The implementation is **DONE** when:

- ✅ No TypeScript errors
- ✅ App runs without console errors
- ✅ Can convert simple JSON Schema → GraphQL
- ✅ Can convert simple GraphQL → JSON Schema
- ✅ Validation shows errors correctly
- ✅ Settings persist across reload
- ✅ Export downloads valid JSON
- ✅ README has setup instructions
- ✅ At least 3 example templates
- ✅ Help documentation exists

---

**Next Action:** Fix store methods (see section 1 above)  
**Estimated Time to Working Demo:** 2-4 hours  
**Blockers:** None (all code is in place, just needs type fixes)

**Questions?** See `DEVELOPMENT_GUIDE.md` for detailed guidance.