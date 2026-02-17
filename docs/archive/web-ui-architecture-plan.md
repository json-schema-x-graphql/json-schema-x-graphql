# Phase 3B: Web UI Architecture

**Visual Guide to the Three-Panel Editor with GraphQL Editor Integration**

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                    JSON Schema x GraphQL Converter                          │
│                         Bidirectional Editor                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
            ┌───────▼────────┐                 ┌───────▼────────┐
            │  User Interface │                │  Converter Core │
            │  (React + TS)   │                │  (Node.js/WASM) │
            └────────────────┘                 └─────────────────┘
```

---

## Three-Panel Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Header: JSON Schema x GraphQL                              [Dark] [Settings] │
├──────────────────────┬────────────────┬──────────────────────────────────────┤
│                      │                │                                      │
│   JSON Schema        │   Converter    │   GraphQL SDL + Visualization        │
│   Editor Panel       │   Control      │   Editor Panel                       │
│                      │   Panel        │                                      │
│ ┏━━━━━━━━━━━━━━━━━┓ │ ┏━━━━━━━━━━┓ │ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│ ┃                 ┃ │ ┃ Converter ┃ │ ┃                                ┃ │
│ ┃  Monaco Editor  ┃ │ ┃   Mode:   ┃ │ ┃     GraphQL Editor             ┃ │
│ ┃                 ┃ │ ┃           ┃ │ ┃                                ┃ │
│ ┃  {             ┃ │ ┃ ○ Node.js ┃ │ ┃  type User {                   ┃ │
│ ┃    "$schema":  ┃ │ ┃ ● WASM    ┃ │ ┃    id: ID!                     ┃ │
│ ┃    "...",      ┃ │ ┃           ┃ │ ┃    name: String!               ┃ │
│ ┃    "$defs": {  ┃ │ ┃ ┌───────┐ ┃ │ ┃  }                             ┃ │
│ ┃      "User": { ┃ │ ┃ │   →   │ ┃ │ ┃                                ┃ │
│ ┃        ...     ┃ │ ┃ └───────┘ ┃ │ ┃  [Visual Graph View]           ┃ │
│ ┃      }         ┃ │ ┃           ┃ │ ┃                                ┃ │
│ ┃    }           ┃ │ ┃ ┌───────┐ ┃ │ ┃       ┌──────────┐             ┃ │
│ ┃  }             ┃ │ ┃ │   ←   │ ┃ │ ┃       │   User   │             ┃ │
│ ┃                 ┃ │ ┃ └───────┘ ┃ │ ┃       └────┬─────┘             ┃ │
│ ┃  Line 15/127   ┃ │ ┃           ┃ │ ┃            │                    ┃ │
│ ┃                 ┃ │ ┃  Stats:   ┃ │ ┃       ┌────▼─────┐             ┃ │
│ ┗━━━━━━━━━━━━━━━━━┛ │ ┃  ⏱ 2.1ms ┃ │ ┃       │   Post   │             ┃ │
│                      │ ┃  📊 5 typ ┃ │ ┃       └──────────┘             ┃ │
│  [📁 Import]         │ ┃  ✓ Valid  ┃ │ ┃                                ┃ │
│  [💾 Export]         │ ┗━━━━━━━━━━┛ │ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│  [📋 Samples ▼]      │                │  [⬇ Download SDL]                  │
│                      │                │  [🔗 Share] [📋 Copy]              │
│                      │                │                                    │
└──────────────────────┴────────────────┴────────────────────────────────────┘
```

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Data Flow Diagram                                  │
└─────────────────────────────────────────────────────────────────────────────┘

   User Input                                                   Display Output
       │                                                               ▲
       ▼                                                               │
┌──────────────┐                                              ┌──────────────┐
│  JSON Schema │                                              │  GraphQL SDL │
│    Editor    │                                              │    Editor    │
│  (Monaco)    │                                              │ (graphql-ed) │
└──────┬───────┘                                              └──────▲───────┘
       │                                                               │
       │ onChange                                          display SDL │
       │ (debounced)                                                   │
       ▼                                                               │
┌────────────────────────────────────────────────────────────────────┴───────┐
│                         Editor Store (Zustand)                             │
│                                                                            │
│  State:                                                                    │
│  - jsonSchema: string                                                      │
│  - graphqlSdl: string                                                      │
│  - converterMode: 'node' | 'wasm'                                          │
│  - isConverting: boolean                                                   │
│  - lastResult: ConversionResult                                            │
│                                                                            │
│  Actions:                                                                  │
│  - convert()                                                               │
│  - convertReverse()                                                        │
└────────────────────────────────────┬───────────────────────────────────────┘
                                     │
                                     │ convert()
                                     ▼
                     ┌───────────────────────────────┐
                     │   Converter Router            │
                     │   (useConverter hook)         │
                     └───────┬───────────────┬───────┘
                             │               │
                   mode === 'node'    mode === 'wasm'
                             │               │
                             ▼               ▼
                  ┌──────────────┐    ┌──────────────┐
                  │   Node.js    │    │  Rust WASM   │
                  │  Converter   │    │  Converter   │
                  └──────┬───────┘    └──────┬───────┘
                         │                   │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌─────────────────┐
                         │ Conversion      │
                         │ Result          │
                         │ - sdl: string   │
                         │ - duration: ms  │
                         │ - stats         │
                         └─────────────────┘
```

---

## Component Hierarchy

```
App
├── Layout
│   ├── Header
│   │   ├── Logo
│   │   ├── ThemeToggle
│   │   └── Settings
│   │
│   ├── ThreePanel
│   │   ├── JsonSchemaPanel
│   │   │   ├── EditorToolbar
│   │   │   │   ├── ImportButton
│   │   │   │   ├── ExportButton
│   │   │   │   └── SampleSelector
│   │   │   │
│   │   │   └── MonacoEditor
│   │   │       ├── JsonSchemaLanguage
│   │   │       ├── SyntaxHighlighting
│   │   │       ├── Validation (AJV)
│   │   │       └── ErrorMarkers
│   │   │
│   │   ├── ConverterPanel
│   │   │   ├── ConverterToggle
│   │   │   │   ├── NodeButton
│   │   │   │   └── WasmButton
│   │   │   │
│   │   │   ├── ConvertButtons
│   │   │   │   ├── JsonToSdlButton
│   │   │   │   └── SdlToJsonButton
│   │   │   │
│   │   │   ├── ConversionStats
│   │   │   │   ├── DurationDisplay
│   │   │   │   ├── TypesCountDisplay
│   │   │   │   └── ValidationStatus
│   │   │   │
│   │   │   └── ErrorDisplay
│   │   │       └── ErrorList
│   │   │
│   │   └── GraphQLPanel
│   │       ├── EditorToolbar
│   │       │   ├── DownloadButton
│   │       │   ├── ShareButton
│   │       │   └── CopyButton
│   │       │
│   │       └── GraphQLEditor
│   │           ├── SdlEditor
│   │           ├── VisualGraph
│   │           ├── TypeInspector
│   │           └── FederationSupport
│   │
│   └── Footer
│       ├── StatusBar
│       └── Links
│
└── Providers
    ├── ThemeProvider
    └── ToastProvider
```

---

## State Management (Zustand Store)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            EditorStore                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Content State:                                                             │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │  jsonSchema: string                                             │        │
│  │  graphqlSdl: string                                             │        │
│  │  errors: string[]                                               │        │
│  └────────────────────────────────────────────────────────────────┘        │
│                                                                             │
│  Converter State:                                                           │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │  converterMode: 'node' | 'wasm'                                 │        │
│  │  isConverting: boolean                                          │        │
│  │  lastConversion: ConversionResult | null                        │        │
│  └────────────────────────────────────────────────────────────────┘        │
│                                                                             │
│  Options:                                                                   │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │  validate: boolean                                              │        │
│  │  includeDescriptions: boolean                                   │        │
│  │  preserveFieldOrder: boolean                                    │        │
│  │  federationVersion: string                                      │        │
│  │  prettyPrint: boolean                                           │        │
│  └────────────────────────────────────────────────────────────────┘        │
│                                                                             │
│  Actions:                                                                   │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │  setJsonSchema(schema: string): void                            │        │
│  │  setGraphqlSdl(sdl: string): void                               │        │
│  │  setConverterMode(mode: 'node' | 'wasm'): void                  │        │
│  │  convert(): Promise<void>                                       │        │
│  │  convertReverse(): Promise<void>                                │        │
│  │  loadSample(name: string): void                                 │        │
│  │  exportSchema(format: 'json' | 'sdl' | 'both'): void            │        │
│  │  clearErrors(): void                                            │        │
│  └────────────────────────────────────────────────────────────────┘        │
│                                                                             │
│  Persistence (localStorage):                                               │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │  - converterMode                                                │        │
│  │  - options                                                      │        │
│  │  - theme                                                        │        │
│  └────────────────────────────────────────────────────────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Converter Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Converter Architecture                                │
└─────────────────────────────────────────────────────────────────────────────┘

User Clicks "Convert" Button
         │
         ▼
┌─────────────────────┐
│  useConverter Hook  │
│  - Check mode       │
│  - Route to impl    │
└──────┬──────────────┘
       │
       ├────────────────┬────────────────┐
       │                │                │
       ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Node.js     │  │  Rust WASM   │  │  Fallback    │
│  Converter   │  │  Converter   │  │  Handler     │
└──────┬───────┘  └──────┬───────┘  └──────────────┘
       │                 │
       │                 │
       ▼                 ▼
┌──────────────────────────────────┐
│  Unified Converter Interface     │
│                                  │
│  convertJsonToSdl(               │
│    jsonSchema: any,              │
│    options: ConversionOptions    │
│  ): Promise<ConversionResult>    │
│                                  │
│  convertSdlToJson(               │
│    sdl: string,                  │
│    options: ConversionOptions    │
│  ): Promise<ConversionResult>    │
└──────────────────────────────────┘
```

### Node.js Converter Flow

```
JSON Schema Input
      │
      ▼
┌─────────────────┐
│ Parse JSON      │
│ Validate Schema │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ Extract Types   │
│ - $defs         │
│ - x-graphql-*   │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ Build GraphQL   │
│ - Types         │
│ - Fields        │
│ - Directives    │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ Format SDL      │
│ Pretty Print    │
└────┬────────────┘
     │
     ▼
ConversionResult
```

### WASM Converter Flow

```
JSON Schema Input
      │
      ▼
┌─────────────────┐
│ Serialize to    │
│ JSON String     │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ WASM Module     │
│ - Init once     │
│ - Call convert  │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ Parse Result    │
│ JSON String     │
└────┬────────────┘
     │
     ▼
ConversionResult
```

---

## File Organization

```
web-ui/
│
├── public/
│   ├── samples/                    # Sample schemas
│   │   ├── user-service.json
│   │   ├── product-catalog.json
│   │   ├── order-system.json
│   │   └── blog-platform.json
│   │
│   ├── assets/
│   │   └── logo.svg
│   │
│   └── favicon.ico
│
├── src/
│   │
│   ├── components/
│   │   ├── editors/
│   │   │   ├── JsonSchemaEditor.tsx      # Monaco editor wrapper
│   │   │   ├── GraphQLEditor.tsx         # GraphQL editor wrapper
│   │   │   └── EditorToolbar.tsx         # Toolbar component
│   │   │
│   │   ├── converter/
│   │   │   ├── ConverterToggle.tsx       # Mode toggle (Node/WASM)
│   │   │   ├── ConvertButton.tsx         # Convert action button
│   │   │   ├── ConversionStats.tsx       # Stats display
│   │   │   └── ErrorDisplay.tsx          # Error messages
│   │   │
│   │   ├── layout/
│   │   │   ├── Layout.tsx                # Main layout
│   │   │   ├── Header.tsx                # Top header
│   │   │   ├── Footer.tsx                # Bottom footer
│   │   │   └── ThreePanel.tsx            # 3-panel layout
│   │   │
│   │   └── ui/                           # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── select.tsx
│   │       └── ...
│   │
│   ├── converters/
│   │   ├── nodeConverter.ts              # Node.js wrapper
│   │   ├── wasmConverter.ts              # WASM wrapper
│   │   ├── types.ts                      # TypeScript types
│   │   └── index.ts                      # Exports
│   │
│   ├── hooks/
│   │   ├── useConverter.ts               # Converter hook
│   │   ├── useValidation.ts              # Validation hook
│   │   ├── useLocalStorage.ts            # Persistence hook
│   │   └── useDebounce.ts                # Debounce hook
│   │
│   ├── store/
│   │   └── editorStore.ts                # Zustand store
│   │
│   ├── utils/
│   │   ├── validation.ts                 # Validation helpers
│   │   ├── formatting.ts                 # Format helpers
│   │   ├── export.ts                     # Export helpers
│   │   └── samples.ts                    # Sample loading
│   │
│   ├── wasm/                             # WASM build output
│   │   ├── json_schema_graphql_converter_bg.wasm
│   │   ├── json_schema_graphql_converter.d.ts
│   │   └── json_schema_graphql_converter.js
│   │
│   ├── styles/
│   │   ├── globals.css                   # Global styles
│   │   └── themes.css                    # Theme variables
│   │
│   ├── App.tsx                           # Root component
│   ├── main.tsx                          # Entry point
│   └── vite-env.d.ts                     # Vite types
│
├── tests/
│   ├── unit/
│   │   ├── components.test.tsx
│   │   └── converters.test.ts
│   │
│   ├── integration/
│   │   └── conversion.test.tsx
│   │
│   └── e2e/
│       └── editor.spec.ts                # Playwright tests
│
├── .env.example                          # Environment template
├── .gitignore
├── index.html                            # HTML entry
├── package.json
├── postcss.config.js                     # PostCSS config
├── tailwind.config.js                    # Tailwind config
├── tsconfig.json                         # TypeScript config
├── tsconfig.node.json                    # Node TS config
├── vite.config.ts                        # Vite config
└── README.md
```

---

## Technology Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Technology Stack                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Frontend Framework                                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  React 18 + TypeScript                                     │ │
│  │  - Hooks-based architecture                                │ │
│  │  - Strong typing                                           │ │
│  │  - Modern component patterns                               │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Editors                                                         │
│  ┌───────────────────────┐  ┌────────────────────────────────┐ │
│  │  Monaco Editor        │  │  GraphQL Editor                │ │
│  │  - JSON Schema        │  │  - SDL editing                 │ │
│  │  - Syntax highlight   │  │  - Visual graph                │ │
│  │  - IntelliSense       │  │  - Type inspector              │ │
│  │  - Error markers      │  │  - Federation support          │ │
│  └───────────────────────┘  └────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  State Management                                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Zustand                                                   │ │
│  │  - Lightweight                                             │ │
│  │  - TypeScript-friendly                                     │ │
│  │  - Persistence middleware                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Styling                                                         │
│  ┌───────────────────────┐  ┌────────────────────────────────┐ │
│  │  TailwindCSS          │  │  shadcn/ui                     │ │
│  │  - Utility-first      │  │  - Pre-built components        │ │
│  │  - Responsive         │  │  - Radix UI primitives         │ │
│  │  - Dark mode          │  │  - Accessible                  │ │
│  └───────────────────────┘  └────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Build & Dev                                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Vite                                                      │ │
│  │  - Fast HMR                                                │ │
│  │  - Optimized builds                                        │ │
│  │  - Plugin ecosystem                                        │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Testing                                                         │
│  ┌───────────────────────┐  ┌────────────────────────────────┐ │
│  │  Vitest               │  │  Playwright                    │ │
│  │  - Unit tests         │  │  - E2E tests                   │ │
│  │  - Integration tests  │  │  - Cross-browser               │ │
│  └───────────────────────┘  └────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Deployment Flow                                     │
└─────────────────────────────────────────────────────────────────────────────┘

Developer Push
      │
      ▼
┌─────────────────┐
│  GitHub Repo    │
│  - main branch  │
└────┬────────────┘
     │
     │ Webhook
     ▼
┌─────────────────┐
│  CI/CD Pipeline │
│  (GitHub Actions)
│                 │
│  1. Install deps│
│  2. Run tests   │
│  3. Build WASM  │
│  4. Build app   │
│  5. Run E2E     │
└────┬────────────┘
     │
     │ Deploy
     ▼
┌─────────────────────────────────────┐
│  Hosting Platform                   │
│  (Vercel / Netlify)                 │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Static Files               │   │
│  │  - HTML, CSS, JS            │   │
│  │  - WASM module              │   │
│  │  - Assets                   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  CDN Distribution           │   │
│  │  - Global edge network      │   │
│  │  - HTTPS                    │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
          │
          │ HTTPS
          ▼
    ┌─────────┐
    │  Users  │
    └─────────┘
```

---

## Performance Optimization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Performance Strategy                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  Code Splitting                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  - Lazy load editors                                     │ │
│  │  - Dynamic WASM loading                                  │ │
│  │  - Route-based splitting                                 │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  Caching                                                       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  - Service worker caching                                │ │
│  │  - LocalStorage for state                                │ │
│  │  - CDN caching (static assets)                           │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  Debouncing                                                    │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  - Editor input (500ms)                                  │ │
│  │  - Validation (300ms)                                    │ │
│  │  - Auto-convert (disabled by default)                    │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  WASM Optimization                                             │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  - Build with release mode                               │ │
│  │  - Size optimization (-Os)                               │ │
│  │  - Stripped binaries                                     │ │
│  │  - Gzip compression                                      │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## Responsive Design

```
Desktop (1920px+)
┌─────────────────────────────────────────────────────────────────┐
│ [JSON Schema]  │ [Converter] │ [GraphQL SDL + Visual Graph]     │
│  40% width     │   20% width │           40% width              │
└─────────────────────────────────────────────────────────────────┘

Tablet (768px - 1920px)
┌─────────────────────────────────────────────────────────────────┐
│ [JSON Schema]        │                                          │
│   50% width          │ [GraphQL SDL]                            │
│                      │   50% width                              │
├──────────────────────┴──────────────────────────────────────────┤
│ [Converter Controls - Full Width]                               │
└─────────────────────────────────────────────────────────────────┘

Mobile (< 768px)
┌─────────────────────────────────────────────────────────────────┐
│ [Tabs: JSON Schema | GraphQL]                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ [Active Editor - Full Width]                                    │
│                                                                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [Floating Action Button - Convert]                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Considerations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Security Measures                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  Input Validation                                              │
│  - Validate JSON Schema structure                              │
│  - Sanitize user input                                         │
│  - Limit file sizes                                            │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  Content Security Policy (CSP)                                 │
│  - Restrict script sources                                     │
│  - Prevent XSS attacks                                         │
│  - HTTPS only                                                  │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  WASM Sandboxing                                               │
│  - Isolated execution environment                              │
│  - Memory-safe Rust code                                       │
│  - No direct system access                                     │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  No Backend Required                                           │
│  - Client-side only processing                                 │
│  - No data transmitted to servers                              │
│  - LocalStorage only (user controlled)                         │
└────────────────────────────────────────────────────────────────┘
```

---

## Success Metrics

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Key Performance Indicators                          │
└─────────────────────────────────────────────────────────────────────────────┘

Performance:
  ✓ Initial load time          < 2s
  ✓ Conversion time (Node.js)  < 10ms
  ✓ Conversion time (WASM)     < 5ms
  ✓ Editor responsiveness      < 100ms

User Experience:
  ✓ Mobile responsive          Yes
  ✓ Accessibility (WCAG 2.1)   AA level
  ✓ Browser support            Chrome, Firefox, Safari, Edge
  ✓ Keyboard navigation        Full support

Reliability:
  ✓ Test coverage              > 80%
  ✓ E2E test coverage          Critical paths
  ✓ Error handling             Graceful degradation
  ✓ Uptime                     99.9%

Developer Experience:
  ✓ TypeScript coverage        100%
  ✓ Documentation              Complete
  ✓ Build time                 < 30s
  ✓ Hot reload                 < 1s
```

---

**This architecture ensures a robust, performant, and user-friendly web UI for JSON Schema ↔ GraphQL SDL conversion with seamless GraphQL Editor integration.**
