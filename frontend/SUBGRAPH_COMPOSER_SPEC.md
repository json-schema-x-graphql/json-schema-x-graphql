# Subgraph Composer Utility - Specification & Design

## Overview

The **Subgraph Composer** is a lightweight, browser-based utility that allows users to:
1. Input 1-10 JSON Schemas with `x-graphql` extensions
2. Generate GraphQL subgraphs from each schema
3. Compose subgraphs into a unified supergraph
4. Visualize and explore the result using GraphQL Editor

**Key Constraint:** Minimize computational cost and bundle size by using the smallest possible code editor.

---

## Architecture

### Technology Stack

| Component | Technology | Reason |
|-----------|-----------|--------|
| **JSON Schema Editor** | CodeMirror v6 + JSON mode | ~5KB gzipped, highly configurable |
| **Converter** | `@json-schema-x-graphql/core` (Node.js) | Already built, tested, supports federation |
| **GraphQL Preview** | `graphql-editor` (existing) | Already integrated, proven |
| **UI Framework** | React 18 | Consistent with project |
| **Build Tool** | Vite | Fast, lightweight, already used |
| **Bundler Strategy** | Code splitting + lazy loading | Defer CodeMirror/GraphQL Editor until needed |

### Bundle Size Targets

```
Base app:           ~50 KB
+ CodeMirror (lazy):  ~15 KB (loaded on demand)
+ GraphQL Editor:     ~200 KB (lazy, already separate app)
Total initial load:   ~50 KB (scales well to 10 schemas)
```

---

## Component Architecture

### 1. SchemaManager Component
Manages the collection of JSON schemas with minimal UI footprint.

```typescript
interface SchemaEntry {
  id: string;           // Unique ID for tracking
  name: string;         // User-friendly name (e.g., "User Service")
  content: string;      // Raw JSON Schema
  lastModified: number; // Timestamp
  error?: string;       // Validation/conversion errors
  isLoading?: boolean;  // Conversion in progress
}

interface SchemaManagerState {
  schemas: SchemaEntry[];
  activeSchemaId: string | null;
  generatedSubgraphs: Map<string, string>; // id -> GraphQL SDL
  supergraphSDL: string;
  compositionErrors: string[];
}
```

**Features:**
- Add schema (up to 10)
- Remove schema
- Rename schema
- Duplicate schema
- Reorder schemas
- Clear all

### 2. SchemaEditor Component
Minimal JSON editor using CodeMirror v6.

```typescript
interface SchemaEditorProps {
  schema: SchemaEntry;
  onUpdate: (content: string) => void;
  onGenerate: () => void;
}
```

**Features:**
- Syntax highlighting (JSON)
- Line numbers
- Auto-indent
- Minimal UI (no minimap, no breadcrumbs)
- Status indicator (dirty/saved/error)
- Quick buttons: Format, Validate, Generate

### 3. SubgraphGenerator Component
Handles conversion from JSON Schema → GraphQL SDL.

```typescript
interface SubgraphGeneratorOptions {
  includeDescriptions: boolean;
  includeFederationDirectives: boolean;
  federationVersion: 'V1' | 'V2' | 'AUTO';
  namingConvention: 'PRESERVE' | 'GRAPHQL_IDIOMATIC';
}

async function generateSubgraph(
  jsonSchema: Record<string, any>,
  options: SubgraphGeneratorOptions
): Promise<{ sdl: string; warnings: string[] }>
```

**Features:**
- Uses `@json-schema-x-graphql/core` library
- Batch generation for multiple schemas
- Error recovery (continue on single schema failure)
- Progress indication
- Validation of output SDL

### 4. SupergraphComposer Component
Merges multiple subgraphs into a unified supergraph.

```typescript
interface CompositionOptions {
  mergeStrategy: 'union' | 'extend';      // How to handle type conflicts
  includeRootQuery: boolean;               // Auto-create Query root
  federationMode: boolean;                 // Enable federation features
}

async function composeSupergraph(
  subgraphs: Map<string, string>,     // id -> SDL
  options: CompositionOptions
): Promise<{ sdl: string; errors: string[]; stats: CompositionStats }>

interface CompositionStats {
  totalTypes: number;
  totalFields: number;
  mergedTypes: number;
  conflicts: string[];
}
```

**Algorithm:**
1. Parse all subgraph SDLs
2. Build type registry (detect conflicts)
3. Merge type definitions (extend or union strategy)
4. Create unified Query/Mutation roots
5. Validate final SDL

### 5. SupergraphPreview Component
Displays and explores the generated supergraph.

```typescript
interface SupergraphPreviewProps {
  sdl: string;
  errors: string[];
  stats: CompositionStats;
  onOpenInEditor: (sdl: string) => void;
}
```

**Features:**
- Syntax-highlighted SDL display
- Type browser (show all types, search)
- Error display with line numbers
- Copy SDL button
- "Open in GraphQL Editor" button
- Stats summary

---

## File Structure

```
frontend/subgraph-composer/
├── package.json
├── vite.config.js
├── index.html
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── App.css
│   ├── components/
│   │   ├── SchemaManager.jsx        # Schema list, add/remove/rename
│   │   ├── SchemaEditor.jsx         # CodeMirror editor
│   │   ├── SubgraphGenerator.jsx    # Converter integration
│   │   ├── SupergraphComposer.jsx   # Composition logic
│   │   ├── SupergraphPreview.jsx    # Display results
│   │   └── ErrorBoundary.jsx        # Error handling
│   ├── hooks/
│   │   ├── useSchemaManager.js      # State management
│   │   ├── useSubgraphGenerator.js  # Conversion wrapper
│   │   └── useComposition.js        # Composition wrapper
│   ├── lib/
│   │   ├── converter.js             # Wrapper around @json-schema-x-graphql/core
│   │   ├── composer.js              # Supergraph composition logic
│   │   ├── validation.js            # Schema/SDL validation
│   │   └── storage.js               # LocalStorage persistence
│   └── styles/
│       ├── global.css
│       ├── manager.css
│       ├── editor.css
│       └── preview.css
└── tests/
    ├── converter.test.js
    ├── composer.test.js
    └── integration.test.js
```

---

## Workflow

### User Journey

```
┌─────────────────────────────────────────────┐
│ 1. Create New Subgraph Composer Project     │
│    (Add to frontend/subgraph-composer)      │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│ 2. User Opens App in Browser                │
│    - See empty schema list                  │
│    - See "Add Schema" button                │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│ 3. User Adds 1st JSON Schema                │
│    - Click "Add Schema"                     │
│    - Paste JSON or use template             │
│    - Click "Generate Subgraph"              │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│ 4. App Converts to GraphQL Subgraph         │
│    - Uses converter library                 │
│    - Shows result with warning/errors       │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│ 5. User Adds More Schemas (2-10)            │
│    - Repeat steps 3-4                       │
│    - Auto-compose on each generation        │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│ 6. App Composes Supergraph                  │
│    - Merges all subgraphs                   │
│    - Detects & reports conflicts            │
│    - Shows unified schema                   │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│ 7. User Views Supergraph in Preview         │
│    - Syntax-highlighted SDL                 │
│    - Type browser                           │
│    - Composition stats                      │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│ 8. User Opens in GraphQL Editor             │
│    - Click "Open in Editor"                 │
│    - Uses graphql-editor in separate app    │
│    - Full exploration features              │
└──────────────┬──────────────────────────────┘
               │
        (User explores, edits, exports)
```

---

## Performance Considerations

### Bundle Size Optimization

1. **Code Splitting:**
   - Core app: React + basic UI (~50 KB)
   - CodeMirror: Lazy load on first schema edit (~15 KB)
   - GraphQL Editor: Already separate app, lazy load (~200 KB)

2. **Converter Library:**
   - Use pre-compiled dist from `@json-schema-x-graphql/core`
   - Tree-shake unused exports
   - Inline only if needed

3. **State Management:**
   - Use React hooks (no Redux)
   - LocalStorage for persistence
   - Debounce editor updates

### Computational Efficiency

1. **Conversion:**
   - Single-threaded (browser limitation)
   - Process one schema at a time
   - Show progress indicator for 10+ schemas

2. **Composition:**
   - Use simple graph merging algorithm
   - Cache subgraph results
   - Debounce composition after edits

3. **Memory:**
   - Limit schema size to 100 KB each
   - Clear old compositions
   - Release unused references

---

## Feature Flags & Options

### Converter Options Panel

```
□ Include Descriptions
□ Include Federation Directives
  Federation Version: [AUTO ▼] (AUTO | V1 | V2)
  Naming Convention: [GRAPHQL_IDIOMATIC ▼] (PRESERVE | GRAPHQL_IDIOMATIC)
□ Infer IDs
```

### Composition Options Panel

```
Merge Strategy: [EXTEND ▼] (UNION | EXTEND)
□ Create Root Query (auto)
□ Federation Mode
```

### Schema Import/Export

1. **Import:**
   - Paste JSON Schema
   - Drag & drop JSON file
   - GitHub Gist URL
   - Copy from existing schema

2. **Export:**
   - Download individual subgraph (GraphQL SDL)
   - Download supergraph (GraphQL SDL)
   - Export all schemas (ZIP)
   - Copy to clipboard

---

## API & Integration Points

### Converter Integration

```javascript
// lib/converter.js
import { jsonSchemaToGraphQL } from '@json-schema-x-graphql/core';

export async function convertSchema(jsonSchema, options = {}) {
  try {
    const sdl = jsonSchemaToGraphQL(jsonSchema, {
      validate: true,
      includeDescriptions: options.descriptions ?? true,
      includeFederationDirectives: options.federation ?? true,
      federationVersion: options.federationVersion ?? 'AUTO',
      namingConvention: options.naming ?? 'GRAPHQL_IDIOMATIC',
    });
    return { sdl, success: true };
  } catch (error) {
    return { sdl: null, success: false, error: error.message };
  }
}
```

### Composition Integration

```javascript
// lib/composer.js
import { parse, buildSchema, printSchema } from 'graphql';

export function composeSupergraph(subgraphs, options = {}) {
  // 1. Parse all SDL strings
  // 2. Extract type definitions
  // 3. Merge based on options.mergeStrategy
  // 4. Build unified Query root if needed
  // 5. Return merged SDL
}
```

### GraphQL Editor Integration

```javascript
// Navigate to graphql-editor with supergraph SDL:
window.open(`/graphql-editor?schema=${encodeURIComponent(supergraphSDL)}`);
// OR: Store in session/local storage and use URL reference
```

---

## Testing Strategy

### Unit Tests

- `converter.test.js`: Schema → SDL conversions
- `composer.test.js`: Subgraph merging logic
- `validation.test.js`: Input validation
- `storage.test.js`: LocalStorage persistence

### Integration Tests

- End-to-end: 1 schema → subgraph → preview
- Multiple schemas → composition → preview
- Error handling: Invalid JSON, circular refs, conflicts
- Performance: 10 schemas, 100 KB each

### Manual Testing

- Minimal bundle size check: `npm run build && du -sh dist/`
- No lag with 10 schemas
- Correct subgraph generation from complex schemas
- Correct composition with type conflicts
- Browser compatibility (Chrome, Firefox, Safari)

---

## Success Criteria

1. ✅ Accepts 1-10 JSON Schemas with `x-graphql` extensions
2. ✅ Generates GraphQL subgraphs for each schema
3. ✅ Composes subgraphs into unified supergraph
4. ✅ Displays result in graphql-editor
5. ✅ Bundle size < 100 KB initial load (CodeMirror lazy)
6. ✅ No computational lag with 10 schemas
7. ✅ Handles errors gracefully (partial failures)
8. ✅ Allows schema management (add, edit, remove, reorder)
9. ✅ Persists state to localStorage
10. ✅ Fully documented with examples

---

## Next Steps

1. Create project structure and package.json
2. Install dependencies (React, Vite, CodeMirror, converter)
3. Build core components (SchemaManager, SchemaEditor)
4. Integrate converter library
5. Implement composition logic
6. Add GraphQL Editor integration
7. Polish UI and add features
8. Test and optimize
9. Document usage
