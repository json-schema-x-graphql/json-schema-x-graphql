# Quick Reference Guide

## Getting Started (60 seconds)

```bash
cd /home/john/json-schema-x-graphql/frontend/subgraph-composer
npm install
npm run dev
# Visit http://localhost:5175
```

## Common Commands

```bash
npm run dev              # Start dev server (port 5175)
npm run build            # Production build (dist/)
npm test                 # Run all tests
npm run test:watch      # Tests in watch mode
npm run test:coverage   # Coverage report
npm run format          # Auto-format code
npm run lint            # Check for errors
npm run clean           # Reset everything
```

## File Locations

### User-Facing

| File                                   | Purpose                       |
| -------------------------------------- | ----------------------------- |
| `src/components/SchemaManager.jsx`     | Schema list & templates       |
| `src/components/SchemaEditor.jsx`      | JSON editor & generate button |
| `src/components/FileManager.jsx`       | Import/export UI              |
| `src/components/SupergraphPreview.jsx` | GraphQL preview               |

### Business Logic

| File                            | Purpose                   |
| ------------------------------- | ------------------------- |
| `src/lib/converter.js`          | JSON → GraphQL conversion |
| `src/lib/composer.js`           | Subgraph composition      |
| `src/lib/templates.js`          | Schema templates          |
| `src/lib/fileIO.js`             | File import/export        |
| `src/lib/schemaDiff.js`         | Schema comparison         |
| `src/lib/federationMetadata.js` | Federation analysis       |

### React Hooks

| File                                | Purpose                    |
| ----------------------------------- | -------------------------- |
| `src/hooks/useSchemaManager.js`     | Schema CRUD + persistence  |
| `src/hooks/useSubgraphGenerator.js` | Convert schemas to GraphQL |
| `src/hooks/useComposition.js`       | Compose subgraphs          |

### Tests

| File                              | Coverage                   |
| --------------------------------- | -------------------------- |
| `src/__tests__/converter.test.js` | Unit (converter functions) |
| `src/__tests__/hooks.test.js`     | Integration (React hooks)  |
| `src/__tests__/e2e.test.js`       | E2E (complete workflows)   |

## Key Features

### 1. Schema Management

```jsx
// Add schema (blank)
const schema = addSchema();

// Add from template
const schema = addSchema("User", templateContent);

// Update content
updateSchema(schemaId, newContent);

// Rename
renameSchema(schemaId, "New Name");

// Remove
removeSchema(schemaId);
```

### 2. Conversion

```js
// Convert JSON schema to GraphQL SDL
const result = convertSchema(jsonSchema, {
  federation: true,
  descriptions: true,
  validate: true,
});
// result.sdl = GraphQL schema
```

### 3. File Operations

```js
// Export single schema
exportSchema(schema);

// Export all schemas
exportAllSchemas(schemas);

// Import from file
const result = await importSchemaFile(file);

// Export supergraph
exportSupergraph(sdl);
```

### 4. Schema Comparison

```js
// Compare two schemas
const diff = new SchemaDiff(schema1, schema2);
diff.getFormatted(); // Display data
diff.getSummary(); // Stats
diff.toTextReport(); // Human-readable
```

### 5. Federation Analysis

```js
// Extract federation metadata
const metadata = extractFederationMetadata(sdl);
// metadata.version, .types, .directives, .entityTypes

// Analyze composition requirements
const analysis = analyzeFederationRequirements(subgraphs);
// analysis.canCompose, .issues, .warnings
```

## User Workflows

### Workflow: Template → Convert → Compose

1. App loads → Click "📋 Template"
2. Select "User Service"
3. Schema auto-populates
4. Click "Generate"
5. GraphQL SDL appears
6. Add Order, Product templates
7. All compose into supergraph

### Workflow: Import Existing Schemas

1. Click dropzone
2. Drag JSON file
3. Preview shows count
4. Confirm import
5. Schemas loaded

### Workflow: Export & Backup

1. Click "💾 Export Active"
2. JSON file downloaded
3. Or click "💾 Export All"
4. Bulk JSON with metadata

## Component Hierarchy

```
App
├── SchemaManager (sidebar)
│   ├── Schema list
│   ├── Template selector
│   └── Add/Delete buttons
├── SchemaEditor (center)
│   ├── CodeMirrorEditor (JSON)
│   └── Generate button
├── SupergraphPreview (right)
│   ├── GraphQL SDL
│   ├── Stats
│   └── Errors
└── FileManager (collapsible)
    ├── Import zone
    └── Export buttons
```

## State Flow

```
useSchemaManager (schemas, activeSchemaId)
    ↓
useSubgraphGenerator (convert to GraphQL)
    ↓
useComposition (merge subgraphs)
    ↓
App state → Components → UI
```

## Testing Cheat Sheet

```bash
# Run all tests
npm test

# Run one file
npm test converter.test.js

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Specific test
npm test -- --testNamePattern="convertSchema"

# Debug
npm test -- --inspect-brk
```

## Troubleshooting

| Issue               | Solution                            |
| ------------------- | ----------------------------------- |
| Port 5175 in use    | Kill process or use different port  |
| Node modules broken | `npm install` or `npm run clean`    |
| Tests fail          | Check localStorage mock in setup.js |
| Build error         | Clear `.vite` folder, reinstall     |
| Import errors       | Ensure file extensions (.js/.jsx)   |

## Performance Tips

- Limit to 10 schemas (hard max)
- Conversion is synchronous (<50ms)
- Composition ~2 seconds for 10 schemas
- localStorage saves ~100KB
- Bundle is code-split (CodeMirror lazy)

## Environment Variables

Not required - app is fully client-side.

Optional future envs:

- `VITE_API_URL` - Backend API endpoint
- `VITE_FEDERATION_VERSION` - Force Fed v1/v2

## Browser Compatibility

- Chrome/Edge: ✅ (tested)
- Firefox: ✅ (should work)
- Safari: ⚠️ (CSS Grid support)
- IE 11: ❌ (not supported)

## Bundle Size Analysis

```
Total: 149.6 KB (gzipped)
├── App code: 66.15 KB
├── CodeMirror: 90.53 KB (lazy-loaded)
├── CSS: 2.44 KB
└── HTML: 0.48 KB
```

## Production Checklist

Before deploying:

- [ ] `npm test` passes
- [ ] `npm run build` succeeds
- [ ] No console errors
- [ ] Tested with 10 schemas
- [ ] LocalStorage working
- [ ] File upload tested
- [ ] Export files valid

## For Phase 5

Next phase adds:

- GraphQL Editor visual preview
- Federation dependency graph
- Real-time composition visualization
- Dashboard with metrics

## Documentation Files

| Doc                                | Content                            |
| ---------------------------------- | ---------------------------------- |
| COMPLETE_IMPLEMENTATION_SUMMARY.md | Overview of all phases             |
| PHASE_3_COMPLETION.md              | Phase 3a/b (converter + templates) |
| PHASE_3C_4_COMPLETION.md           | Phase 3c/4 (enhanced + tests)      |
| README.md                          | Project description                |
| This file                          | Quick reference                    |

## Contact & Support

For issues:

1. Check tests: `npm test`
2. Review relevant .md file
3. Check browser console for errors
4. See troubleshooting table above

---

**Last Updated**: December 15, 2025
**Version**: 0.1.0
**Phases Complete**: 1-4 ✅
