# JSON Schema Authoring UI

A modern, AI-accessible web interface for authoring JSON Schemas with live GraphQL SDL conversion, intelligent validation, and dual converter support (Rust WASM + Node.js).

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🌟 Features

### Core Capabilities

- **Dual Monaco Editors**: Split-pane view with JSON Schema and GraphQL SDL editors
- **Live Conversion**: Real-time bidirectional conversion between JSON Schema ↔ GraphQL SDL
- **Swappable Converters**: Choose between Rust (WASM) or Node.js converters, or let the app auto-select
- **Intelligent Validation**: Live validation with actionable error messages showing where, what, and how to resolve
- **Smart Autocomplete**: Context-aware autocompletion with required elements for JSON Schema
- **AI-Accessible APIs**: Global APIs for AI agents to retrieve/modify editor contents
- **Performance Tracking**: Built-in metrics for converter performance and success rates
- **Automatic Fallback**: Seamlessly falls back to Node.js if WASM fails
- **Undo/Redo History**: Full state history with 50-entry buffer
- **Template Library**: Quick-start templates for common schema patterns
- **Theme Support**: Dark/light themes with customizable editor settings

### Advanced Features

- **Federation Support**: Full Apollo Federation v2 directives and schema links
- **Custom Scalars**: Define and map custom scalar types
- **Field Name Transformation**: Automatic camelCase, snake_case, PascalCase conversion
- **Export/Import**: Export schemas in JSON, YAML, or TypeScript formats
- **Error Recovery**: Detailed error messages with contextual suggestions
- **Performance Metrics**: Real-time conversion time and success rate tracking

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0 (recommended) or npm >= 8.0.0
- Rust >= 1.70 (optional, for building WASM converter)

### Installation

```bash
# From the frontend/schema-authoring directory
pnpm install

# Build WASM converter (optional - will use Node.js fallback if skipped)
pnpm run build:wasm

# Start development server
pnpm run dev
```

The application will be available at `http://localhost:3003`

### Production Build

```bash
pnpm run build
pnpm run preview
```

## 📖 Usage

### Basic Workflow

1. **Enter JSON Schema** in the left editor
2. **Watch live conversion** to GraphQL SDL in the right editor
3. **View validation errors** inline with actionable fixes
4. **Switch converters** using the toolbar dropdown
5. **Export results** in your preferred format

### Keyboard Shortcuts

| Shortcut               | Action             |
| ---------------------- | ------------------ |
| `Ctrl/Cmd + S`         | Save current state |
| `Ctrl/Cmd + Z`         | Undo               |
| `Ctrl/Cmd + Shift + Z` | Redo               |
| `Ctrl/Cmd + F`         | Find               |
| `Ctrl/Cmd + H`         | Replace            |
| `Ctrl/Cmd + /`         | Toggle comment     |
| `Alt + Shift + F`      | Format document    |
| `F1`                   | Command palette    |

### Converter Selection

**Auto Mode (Recommended)**

- Automatically selects the best available converter
- Prefers WASM (faster, no network) when available
- Falls back to Node.js if WASM initialization fails

**Manual Selection**

- `rust-wasm`: High performance, runs in browser, no network required
- `node`: Server-side conversion, requires backend API endpoint

### Example JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Product",
  "type": "object",
  "x-graphql-type-name": "Product",
  "x-graphql-federation-keys": ["upc"],
  "properties": {
    "upc": {
      "type": "string",
      "description": "Universal Product Code"
    },
    "name": {
      "type": "string",
      "description": "Product name"
    },
    "price": {
      "type": "number",
      "x-graphql-field-name": "price",
      "description": "Price in USD"
    },
    "inStock": {
      "type": "boolean",
      "x-graphql-field-name": "inStock"
    }
  },
  "required": ["upc", "name"]
}
```

### Generated GraphQL SDL

```graphql
"""
Universal Product Code
"""
extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key", "@shareable", "@external"])

type Product @key(fields: "upc") {
  """
  Universal Product Code
  """
  upc: String!

  """
  Product name
  """
  name: String!

  """
  Price in USD
  """
  price: Float

  inStock: Boolean
}
```

## 🤖 AI-Accessible APIs

The application exposes global APIs for AI agents to interact with:

```javascript
// Get the AI API instance
const api = window.__schemaAuthoringAPI__.getAPI();

// Read current schemas
const jsonSchema = api.getJsonSchema();
const graphqlSchema = api.getGraphQLSchema();

// Update schemas
await api.setJsonSchema('{ "type": "object" }');
await api.setGraphQLSchema("type User { id: ID! }");

// Get all schemas at once
const { jsonSchema, graphqlSchema } = api.getAllSchemas();

// Trigger conversion manually
const result = await api.convert();
console.log("Conversion:", result.success ? "succeeded" : "failed");

// Validate current schema
const validation = await api.validate();
console.log("Validation errors:", validation.errors);

// Get validation errors
const errors = api.getValidationErrors();

// Get conversion metadata
const metadata = api.getConversionMetadata();
console.log("Types generated:", metadata?.typesGenerated);

// Update settings
api.updateSettings({
  converterEngine: "rust-wasm",
  autoConvert: true,
  theme: "vs-dark",
});

// Get current settings
const settings = api.getSettings();

// Export schemas
const exported = await api.exportSchemas("json");
console.log("Exported:", exported.filename);

// Get complete state snapshot
const snapshot = api.getStateSnapshot();
console.log("State:", snapshot);
```

### State Snapshot Structure

```typescript
interface AppStateSnapshot {
  timestamp: string;
  jsonSchema: string;
  graphqlSchema: string;
  validationErrors: ValidationError[];
  conversionMetadata: ConversionMetadata | null;
  settings: AppSettings;
  isConverting: boolean;
  isValidating: boolean;
}
```

## 🔧 Configuration

### Converter Configuration

**WASM Converter**

```typescript
// Update WASM configuration
converterManager.updateConfig({
  wasmConfig: {
    wasmPath: "/custom/path/to/wasm",
    autoInit: true,
  },
});
```

**Node Converter**

```typescript
// Update Node converter endpoint
converterManager.updateConfig({
  nodeConfig: {
    endpoint: "https://api.example.com/convert",
    timeout: 30000,
  },
});
```

### Editor Settings

Settings are persisted in localStorage and include:

```typescript
interface AppSettings {
  converterEngine: "rust-wasm" | "node" | "auto";
  theme: "vs-dark" | "vs-light" | "hc-black" | "hc-light";
  autoConvert: boolean;
  autoValidate: boolean;
  showLineNumbers: boolean;
  wordWrap: boolean;
  minimap: boolean;
  fontSize: number; // 8-40
  tabSize: number; // 2, 4, 8
  insertSpaces: boolean;
  showWhitespace: boolean;
  formatOnSave: boolean;
  validateOnType: boolean;
  debounceMs: number; // 0-2000
}
```

## 📊 Performance Metrics

The application tracks converter performance:

```javascript
import { converterManager } from "./converters/converter-manager";

// Get all performance metrics
const metrics = converterManager.getPerformanceMetrics();

// Get average conversion time by engine
const avgTimes = converterManager.getAverageConversionTime();
console.log("WASM avg:", avgTimes["rust-wasm"], "ms");
console.log("Node avg:", avgTimes["node"], "ms");

// Get success rates
const successRates = converterManager.getSuccessRate();
console.log("WASM success:", successRates["rust-wasm"] * 100, "%");
console.log("Node success:", successRates["node"] * 100, "%");

// Clear metrics
converterManager.clearPerformanceMetrics();
```

## 🎨 Validation & Error Handling

### Validation Error Structure

```typescript
interface ValidationError {
  severity: "error" | "warning" | "info" | "hint";
  message: string;
  path?: string; // JSON path (e.g., "properties.name.type")
  line?: number;
  column?: number;
  keyword?: string; // JSON Schema keyword that failed
  suggestion?: string; // How to fix the error
  fix?: AutoFix; // Automatic fix suggestion
}
```

### Auto-Fix Suggestions

Many validation errors include auto-fix suggestions:

```typescript
interface AutoFix {
  description: string;
  changes: TextChange[];
  confidence: "high" | "medium" | "low";
}
```

### Common Error Messages

| Error                     | Suggestion                                      |
| ------------------------- | ----------------------------------------------- |
| Invalid JSON              | Check syntax: trailing commas, quotes, brackets |
| Empty schema              | Add at least one type definition                |
| Missing required property | Add required fields to satisfy the schema       |
| Type mismatch             | Ensure value matches expected type              |
| Unknown keyword           | Check JSON Schema version compatibility         |

## 🏗️ Architecture

### Project Structure

```
schema-authoring/
├── src/
│   ├── components/          # React components
│   │   ├── Editor.tsx       # Monaco editor wrapper
│   │   ├── Toolbar.tsx      # Top toolbar
│   │   ├── StatusBar.tsx    # Bottom status bar
│   │   └── ErrorPanel.tsx   # Validation error display
│   ├── converters/          # Converter implementations
│   │   ├── wasm-converter.ts
│   │   ├── node-converter.ts
│   │   └── converter-manager.ts
│   ├── lib/                 # Utility libraries
│   │   ├── validators.ts    # JSON Schema validation
│   │   ├── formatters.ts    # Code formatting
│   │   └── templates.ts     # Schema templates
│   ├── store/               # State management (Zustand)
│   │   └── app-store.ts
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   ├── wasm/                # WASM bindings (generated)
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── public/
│   └── wasm/                # WASM files (copied during build)
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

### State Management

Uses Zustand with:

- **Immer**: Immutable state updates
- **Persist**: LocalStorage persistence
- **Devtools**: Redux DevTools integration

### Converter Architecture

```
┌─────────────────────────────────────┐
│     Converter Manager (Auto)        │
│  ┌───────────┐    ┌──────────────┐ │
│  │   WASM    │    │    Node.js   │ │
│  │ Converter │◄──►│  Converter   │ │
│  └───────────┘    └──────────────┘ │
│       │                  │          │
│       ▼                  ▼          │
│  Performance      Fallback Logic   │
│   Tracking          & Retries       │
└─────────────────────────────────────┘
```

## 🧪 Testing

```bash
# Run unit tests
pnpm test

# Run with UI
pnpm run test:ui

# Run with coverage
pnpm test -- --coverage
```

## 🚢 Deployment

### Vercel

```bash
vercel
```

### Docker

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Environment Variables

```bash
# .env.production
VITE_API_ENDPOINT=https://api.example.com/convert
VITE_WASM_PATH=/wasm/json_schema_x_graphql_bg.wasm
VITE_ENABLE_ANALYTICS=true
```

## 🔌 Backend API

The Node.js converter requires a backend API with these endpoints:

### POST `/api/convert`

**Request:**

```json
{
  "direction": "json-to-graphql" | "graphql-to-json",
  "input": "string | object",
  "options": {
    "includeFederationDirectives": boolean,
    "includeSchemaLink": boolean,
    "includeDescriptions": boolean,
    ...
  }
}
```

**Response:**

```json
{
  "output": "string",
  "warnings": [],
  "metadata": {
    "typesGenerated": number,
    "fieldsGenerated": number
  }
}
```

### GET `/api/convert/health`

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "version": "2.0.0"
}
```

### GET `/api/convert/version`

Get converter version.

**Response:**

```json
{
  "version": "2.0.0"
}
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Add tests for new features
- Update documentation
- Use conventional commits
- Ensure all tests pass

## 📝 License

MIT License - see [LICENSE](../../LICENSE) for details.

## 🙏 Acknowledgments

- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor
- [Zustand](https://zustand-demo.pmnd.rs/) - State management
- [Vite](https://vitejs.dev/) - Build tool
- [Apollo Federation](https://www.apollographql.com/docs/federation/) - GraphQL federation

## 📚 Resources

- [JSON Schema Specification](https://json-schema.org/)
- [GraphQL Specification](https://spec.graphql.org/)
- [Apollo Federation Docs](https://www.apollographql.com/docs/federation/)
- [x-graphql Extensions Guide](../../docs/X-GRAPHQL-QUICK-REFERENCE.md)
- [Federation Patterns](../../examples/federation/PATTERNS.md)

## 🐛 Known Issues

- WASM initialization may fail on older browsers (use Node fallback)
- Large schemas (>10MB) may cause performance issues
- Safari requires additional CORS headers for WASM loading

## 🗺️ Roadmap

- [ ] Visual schema builder (drag-and-drop)
- [ ] Real-time collaboration (CRDT-based)
- [ ] Schema diff viewer
- [ ] Import from various sources (Swagger, OpenAPI, etc.)
- [ ] Export to additional formats (TypeScript types, Zod schemas)
- [ ] AI-powered schema suggestions
- [ ] Integrated GraphQL Playground
- [ ] Schema versioning and migration tools
- [ ] Plugin system for custom converters
- [ ] Mobile-responsive design

## 💬 Support

- 📧 Email: support@example.com
- 💬 Discord: [Join our community](https://discord.gg/example)
- 🐛 Issues: [GitHub Issues](https://github.com/JJediny/json-schema-x-graphql/issues)
- 📖 Docs: [Full Documentation](https://docs.example.com)

---

Made with ❤️ by the JSON Schema ↔ GraphQL team
