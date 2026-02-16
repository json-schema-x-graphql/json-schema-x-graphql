# GraphQL Editor Validation Worker Setup

This document explains how the GraphQL validation worker is configured in both demos.

---

## Overview

The `graphql-editor` component requires a validation worker to properly validate GraphQL SDL syntax in real-time. Without it, you'll see 404 errors for `validation.worker.js` in the browser console.

---

## Worker Package

The worker is provided by the `graphql-editor-worker` package, which is automatically installed as a dependency of `graphql-editor`.

**Package:** `graphql-editor-worker`  
**Worker Location:** `node_modules/graphql-editor-worker/lib/worker/validation.worker.js`

---

## Configuration

### 1. GraphQLVisualEditor Component

Both demos now include the worker configuration:

**File:** `src/GraphQLVisualEditor.tsx`

```typescript
import { GraphQLEditor, PassedSchema } from "graphql-editor";

// Import worker for validation
const workerUrl = new URL(
  "graphql-editor-worker/lib/worker/validation.worker.js",
  import.meta.url,
);

// In the component:
<GraphQLEditor
  schema={schema}
  setSchema={handleSchemaChange}
  readonly={readOnly}
  path="/"
  workers={{
    validation: workerUrl.href,
  }}
/>
```

**Key Points:**

- `new URL()` with `import.meta.url` creates a proper module URL
- Vite handles resolving the node_modules path at build time
- The worker is loaded asynchronously by the GraphQL editor

---

### 2. Vite Configuration

**File:** `vite.config.ts`

```typescript
export default defineConfig({
  optimizeDeps: {
    include: ["graphql-editor-worker"],
  },
  worker: {
    format: "es",
  },
});
```

**Configuration Details:**

- **`optimizeDeps.include`**: Pre-bundles the worker package for faster dev server startup
- **`worker.format: "es"`**: Uses ES modules for workers (modern format)

---

## How It Works

### Development Mode

1. Vite dev server starts
2. GraphQLVisualEditor component loads
3. Worker URL is created: `new URL("graphql-editor-worker/...", import.meta.url)`
4. Vite resolves the path to the actual file in node_modules
5. Worker is served at a URL like: `/node_modules/.vite/deps/graphql-editor-worker.js`
6. GraphQL editor loads the worker and starts validation

### Production Build

1. Vite bundles the worker during build
2. Worker is included in the output bundle
3. Worker URL is rewritten to the bundled location
4. GraphQL editor loads from the bundled assets

---

## Verification

### Check Worker is Loaded

1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "worker"
4. Refresh the page
5. Should see `validation.worker.js` load with status 200

### Check Worker is Running

1. Enter invalid GraphQL in the editor:
   ```graphql
   type User {
     invalidSyntax: : String
   }
   ```
2. Should see red error highlighting in the editor
3. Console should show validation messages (not 404 errors)

---

## Troubleshooting

### 404 Error for validation.worker.js

**Symptom:**

```
GET http://localhost:3002/node_modules/.vite/deps/validation.worker.js?worker_file&type=classic
Status: 404 Not Found
```

**Solution:**

1. Check that `graphql-editor-worker` is installed:
   ```bash
   npm list graphql-editor-worker
   ```
2. Restart the dev server:
   ```bash
   npm run dev
   ```
3. Clear Vite cache and reinstall:
   ```bash
   rm -rf node_modules/.vite
   npm install
   npm run dev
   ```

### Worker Import Error

**Symptom:**

```
Error: Cannot find module 'graphql-editor-worker/lib/worker/validation.worker.js'
```

**Solution:**

1. Verify the package is installed:
   ```bash
   ls node_modules/graphql-editor-worker/lib/worker/validation.worker.js
   ```
2. Check Vite config includes the package:
   ```typescript
   optimizeDeps: {
     include: ["graphql-editor-worker"],
   }
   ```

### CORS or Module Type Errors

**Symptom:**

```
Worker script failed to load due to CORS policy
```

**Solution:**
Ensure proper server headers in `vite.config.ts`:

```typescript
server: {
  headers: {
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
  },
},
```

---

## Alternative: Self-Hosted Worker

If you need to customize the worker or host it separately:

### 1. Copy Worker File

```bash
cp node_modules/graphql-editor-worker/lib/worker/validation.worker.js public/workers/
```

### 2. Update Component

```typescript
const workerUrl = new URL("/workers/validation.worker.js", window.location.origin);

<GraphQLEditor
  workers={{
    validation: workerUrl.href,
  }}
/>
```

### 3. Update Vite Config

```typescript
export default defineConfig({
  publicDir: "public", // Ensure public folder is served
});
```

---

## Worker Functionality

The validation worker provides:

- **Syntax Validation**: Real-time GraphQL SDL syntax checking
- **Type Validation**: Ensures all referenced types are defined
- **Directive Validation**: Validates directive usage and arguments
- **Schema Composition**: Checks for conflicts and issues
- **Performance**: Runs in background thread, doesn't block UI

---

## Dependencies

Both demos have these packages installed:

```json
{
  "dependencies": {
    "graphql-editor": "^7.3.1",
    "graphql": "^16.8.1"
  }
}
```

The `graphql-editor-worker` is automatically installed as a peer dependency of `graphql-editor`.

---

## Status

✅ **Loro Demo:** Worker configured and working  
✅ **Yjs Demo:** Worker configured and working  
✅ **Vite Config:** Optimized for worker loading  
✅ **Documentation:** Complete

---

## References

- **graphql-editor GitHub:** https://github.com/graphql-editor/graphql-editor
- **graphql-editor-worker:** https://www.npmjs.com/package/graphql-editor-worker
- **Vite Workers:** https://vitejs.dev/guide/features.html#web-workers
- **Web Workers MDN:** https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API

---

**Last Updated:** 2024  
**Status:** ✅ Working in both demos
