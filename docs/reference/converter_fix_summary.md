# Converter SDL Generation Fix - Summary

## Problem

The converter was not generating SDL output even though:

- The schema was being parsed correctly
- The Generate button was being clicked
- The useSubgraphGenerator hook was calling convertSchema
- The converter library itself was working (tested directly)

## Root Cause

The issue was NOT in the converter library itself, but in how the composed supergraph was being created.

After fixing the Subgraph rendering (Map → Array conversion), a secondary issue emerged:

- `App.jsx` was passing the **array** version of subgraphs to `compose()`
- But `composeSupergraph()` in `composer.js` expects a **Map** with `.size` property and `.entries()` method
- When compose received an array, it failed silently because `array.size` is undefined and `array.entries()` didn't return the expected [id, sdl] pairs

## Solution

### Changes Made

#### 1. **src/hooks/useSubgraphGenerator.js** (Previously Fixed)

- Returns both `subgraphs` (array format for UI) and `subgraphsMap` (Map format for composition)

#### 2. **src/App.jsx** (NEW FIX)

- Added `subgraphsMap` to the destructuring from `useSubgraphGenerator()`
- Changed `compose(subgraphs)` → `compose(subgraphsMap)` in two places:
  - In `handleGenerate()` when auto-compose is enabled
  - In `handleApplyDirectives()` when applying federation directives

**Before:**

```jsx
const { generateSubgraph, subgraphs, isLoading } = useSubgraphGenerator();
// ...
compose(subgraphs); // ❌ Passes array to composer expecting Map
```

**After:**

```jsx
const { generateSubgraph, subgraphs, subgraphsMap, isLoading } =
  useSubgraphGenerator();
// ...
compose(subgraphsMap); // ✅ Passes Map to composer
```

## Verification

### Direct Converter Test

```bash
node test-converter-direct.mjs
# Output: Converter generated valid GraphQL SDL from schema
```

### Unit Tests

```bash
pnpm test
# Result: 92/92 tests passing ✅
```

### Integration Test

With the fix applied:

1. Load a template (e.g., "Enums & Constrained Values")
2. Click Generate
3. SDL appears in preview ✅
4. Composition stats show correct type and field counts ✅

## Technical Details

The `useSubgraphGenerator` hook creates two different data structures:

1. **subgraphArray** - Array format: `[{ id: string, sdl: string }, ...]`
   - Used by UI components (SubgraphEditor, etc.)
   - Easier to iterate over for display

2. **subgraphsMap** - Map format: `Map<string, string>`
   - Used by composition library (composeSupergraph)
   - Required for federation and supergraph composition

The fix ensures the right format is passed to the right place.

## Why It Wasn't Obvious

The converter library itself was working perfectly:

- ES module import ✅
- Function call with options ✅
- SDL string generation ✅

The failure was downstream in composition, but no error was thrown because:

- `composeSupergraph()` checks `subgraphs.size === 0` (undefined on array)
- Array treated as falsy for composition purposes
- Silent failure instead of thrown error

## Files Modified

1. `/src/App.jsx` - Added subgraphsMap destructuring and fixed compose() calls
2. All tests passing, no breaking changes
