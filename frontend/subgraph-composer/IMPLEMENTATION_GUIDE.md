# Subgraph Composer - Implementation Guide

## Overview

The **Subgraph Composer** is a lightweight browser-based utility that converts JSON Schemas (with `x-graphql` extensions) to GraphQL subgraphs and composes them into a unified supergraph.

## Quick Start

### 1. Install Dependencies

```bash
cd frontend/subgraph-composer
npm install
# or
pnpm install
```

### 2. Run Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5175`

### 3. Build for Production

```bash
npm run build
```

Output goes to `dist/` directory.

---

## Architecture & Design

### Component Hierarchy

```
App.jsx (Main Container)
├── SchemaManager (Sidebar - Schema list)
├── SchemaEditor (Main editor)
│   └── CodeMirrorEditor (Lazy-loaded JSON editor)
├── SupergraphPreview (Right panel - Results)
└── ErrorBoundary (Error handling)
```

### Data Flow

```
User Input → SchemaManager → useSchemaManager Hook → LocalStorage
                ↓
            SchemaEditor → onUpdate
                ↓
            useSubgraphGenerator → convertSchema (lib/converter.js)
                ↓
            useComposition → composeSupergraph (lib/composer.js)
                ↓
            SupergraphPreview (Display Results)
```

### Key Hooks

1. **useSchemaManager**: Manages schema collection state and localStorage persistence
2. **useSubgraphGenerator**: Handles schema → GraphQL SDL conversion
3. **useComposition**: Handles subgraph → supergraph merging

---

## Feature Implementation Details

### Adding a New Feature

Example: Add schema import from file

```jsx
// In useSchemaManager.js
const importSchemaFromFile = useCallback(
  (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const schema = JSON.parse(content);
        const newSchema = addSchema(JSON.stringify(schema, null, 2));
        setActiveSchemaId(newSchema.id);
      } catch (error) {
        alert(`Failed to import: ${error.message}`);
      }
    };
    reader.readAsText(file);
  },
  [addSchema, setActiveSchemaId],
);
```

### Adding Converter Options

```jsx
// In App.jsx - Add options panel
const [converterOptions, setConverterOptions] = useState({
  includeDescriptions: true,
  federationVersion: "AUTO",
});

// Pass to useSubgraphGenerator:
const result = await generateSubgraph(JSON.parse(schema.content), schema.id, converterOptions);
```

---

## Known Limitations & Todos

### Current Status: ✅ Specification & Foundation Complete

The implementation provides:

- ✅ Project structure with Vite + React
- ✅ Schema management (add, edit, remove, rename)
- ✅ Minimal CodeMirror editor (lazy-loaded)
- ✅ Converter wrapper (stub implementation)
- ✅ Composer logic (basic subgraph merging)
- ✅ Preview panel with stats and errors
- ✅ LocalStorage persistence
- ✅ Error boundaries
- ✅ Responsive UI
- ✅ Keyboard shortcuts ready

### Next Steps

1. **Integrate Real Converter Library**

   ```bash
   # Add to package.json
   npm install ../../../converters/node/dist
   ```

   Then in `src/lib/converter.js`:

   ```javascript
   import { jsonSchemaToGraphQL } from "@json-schema-x-graphql/core";
   ```

2. **Enhance Composition Algorithm**
   - Improve type conflict detection
   - Add federation support
   - Handle circular references

3. **Add Features**
   - Import/export schemas (JSON files, Gist)
   - Schema templates library
   - Supergraph export to file
   - Diff view for schemas
   - Search/filter types in preview

4. **Performance Optimization**
   - Web Worker for conversion
   - Debounce composition updates
   - Virtual scrolling for large schemas
   - Bundle size optimization

5. **Testing**
   - Unit tests for converter
   - Integration tests for composition
   - E2E tests with Cypress

6. **Documentation**
   - User guide with examples
   - API documentation
   - Video tutorial

---

## File Structure

```
frontend/subgraph-composer/
├── package.json                          # Dependencies
├── vite.config.js                        # Vite configuration
├── index.html                            # Entry HTML
├── src/
│   ├── main.jsx                          # React entry point
│   ├── App.jsx                           # Main app container
│   ├── App.css                           # Global styles
│   ├── components/
│   │   ├── SchemaManager.jsx             # Schema list sidebar
│   │   ├── SchemaManager.css
│   │   ├── SchemaEditor.jsx              # Main editor
│   │   ├── SchemaEditor.css
│   │   ├── CodeMirrorEditor.jsx          # Lazy-loaded editor
│   │   ├── SupergraphPreview.jsx         # Results display
│   │   └── ErrorBoundary.jsx             # Error handling
│   ├── hooks/
│   │   ├── useSchemaManager.js           # Schema state
│   │   ├── useSubgraphGenerator.js       # Conversion
│   │   └── useComposition.js             # Merging
│   └── lib/
│       ├── converter.js                  # Converter wrapper
│       ├── composer.js                   # Composition logic
│       └── validation.js                 # Input validation
├── IMPLEMENTATION_GUIDE.md               # This file
└── README.md                             # User documentation
```

---

## Environment Variables

None currently required. Optional future additions:

```env
VITE_GRAPHQL_EDITOR_URL=http://localhost:5174
VITE_CONVERTER_ENDPOINT=http://localhost:3000/convert
```

---

## Performance Targets

- **Initial Load:** < 100 KB (Core + CodeMirror lazy)
- **First Interaction:** < 2s
- **10 Schema Composition:** < 5s
- **Memory Usage:** < 50 MB
- **No lag** when switching between schemas

---

## Browser Support

- Chrome/Edge: ✅ Latest
- Firefox: ✅ Latest
- Safari: ✅ 14+
- Mobile: ⚠️ Limited (no mobile optimization yet)

---

## Troubleshooting

### "Module not found" Error

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Editor not appearing

- Check browser console for errors
- Ensure CodeMirror dependencies are installed:
  ```bash
  npm install @codemirror/lang-json @codemirror/view @codemirror/state
  ```

### Composition failing

- Check JSON Schema validity: Use "Validate" button
- Look for circular references in properties
- Check converter logs in browser DevTools

---

## Contributing

### Adding a Component

1. Create `src/components/MyComponent.jsx`
2. Create `src/components/MyComponent.css`
3. Use existing components as templates
4. Add to `App.jsx` imports and JSX
5. Test in dev server

### Adding a Hook

1. Create `src/hooks/useMyHook.js`
2. Use `useState`, `useCallback`, `useEffect` as needed
3. Follow naming convention `use*`
4. Export from hook file
5. Import in component

### Adding to lib/

1. Create utility function in `src/lib/*.js`
2. Add JSDoc comments
3. Export as named export
4. Write unit tests in `tests/*.test.js`

---

## Deployment

### Deploy to Vercel

```bash
vercel deploy frontend/subgraph-composer
```

### Deploy to Netlify

```bash
# Build
npm run build

# Deploy dist/ folder
# Via Netlify CLI or web interface
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
EXPOSE 5175
CMD ["npm", "run", "preview"]
```

---

## Related Documentation

- See [SUBGRAPH_COMPOSER_SPEC.md](../SUBGRAPH_COMPOSER_SPEC.md) for full specification
- See [../graphql-editor/](../graphql-editor/) for GraphQL Editor integration
- See [../dashboard/](../dashboard/) for learning modules

---

## Support & Feedback

For issues or feature requests:

1. Check existing issues in repository
2. Create detailed bug report with reproduction steps
3. Include browser version and console errors
4. Suggest features with use cases

---

**Last Updated:** December 15, 2025  
**Version:** 0.1.0 (Foundation Release)  
**Status:** ✅ Ready for Feature Development
