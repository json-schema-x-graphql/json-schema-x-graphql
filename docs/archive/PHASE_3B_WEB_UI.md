# Phase 3B: Web UI Editor Implementation Plan

**Status**: 📋 Planning  
**Dependencies**: Phase 3A (Local Testing) Complete  
**Timeline**: 4-5 weeks  
**Goal**: Interactive three-panel editor with GraphQL Editor integration

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Implementation Roadmap](#implementation-roadmap)
4. [Component Design](#component-design)
5. [Converter Integration](#converter-integration)
6. [Features & User Experience](#features--user-experience)
7. [Deployment](#deployment)

---

## Architecture Overview

### Three-Panel Editor Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│                        JSON Schema x GraphQL                         │
│                     Bidirectional Converter                          │
├──────────────────────┬────────────┬──────────────────────────────────┤
│                      │            │                                  │
│   JSON Schema        │ Converter  │   GraphQL SDL + Visualization    │
│   Editor             │  Controls  │                                  │
│                      │            │                                  │
│ ┌──────────────────┐ │ Mode:      │ ┌──────────────────────────────┐ │
│ │                  │ │ ○ Node.js  │ │                              │ │
│ │ Monaco Editor    │ │ ● WASM     │ │   GraphQL Editor             │ │
│ │                  │ │            │ │                              │ │
│ │ - Syntax HL      │ │ [Convert→] │ │   - SDL Editor               │ │
│ │ - Validation     │ │ [←Convert] │ │   - Visual Graph View        │ │
│ │ - Autocomplete   │ │            │ │   - Type Inspector           │ │
│ │ - Error markers  │ │ Stats:     │ │   - Federation Support       │ │
│ │                  │ │ ⏱ 2.3ms    │ │                              │ │
│ │                  │ │ 📊 5 types │ │                              │ │
│ │                  │ │ ✓ Valid    │ │                              │ │
│ └──────────────────┘ │            │ └──────────────────────────────┘ │
│                      │            │                                  │
│ [Import] [Export]    │ [Validate] │ [Download SDL] [Share]           │
│ [Sample Schemas ▼]   │            │ [View JSON] [Copy]               │
└──────────────────────┴────────────┴──────────────────────────────────┘
```

### Data Flow

```
User Input (JSON Schema)
         │
         ├──→ Monaco Editor
         │    - Syntax validation
         │    - Schema validation (AJV)
         │    - Auto-format
         │
         ├──→ Convert Button Click
         │
         ├──→ Converter Selection
         │    ├─→ Node.js Converter
         │    │   - Direct JS function call
         │    │   - Fast, no WASM overhead
         │    │   - Full features
         │    │
         │    └─→ Rust WASM Converter
         │        - WASM module call
         │        - Sub-5ms performance
         │        - Memory-safe
         │
         ├──→ Conversion Result
         │    - GraphQL SDL string
         │    - Statistics (time, types, errors)
         │    - Validation results
         │
         └──→ GraphQL Editor
              - Render SDL
              - Visual graph
              - Interactive editing
              - Bidirectional sync
```

---

## Technology Stack

### Frontend Framework

**React 18+ with TypeScript**
- Modern hooks-based architecture
- Strong typing for converter APIs
- Excellent ecosystem support

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.3.3"
  }
}
```

### Editors

**1. JSON Schema Editor: Monaco Editor**
```json
{
  "dependencies": {
    "@monaco-editor/react": "^4.6.0",
    "monaco-editor": "^0.45.0"
  }
}
```

Features:
- VS Code-like experience
- JSON Schema validation built-in
- Syntax highlighting
- IntelliSense/autocomplete
- Error markers
- Multi-cursor editing

**2. GraphQL Editor: graphql-editor**
```json
{
  "dependencies": {
    "graphql-editor": "^7.0.0",
    "graphql": "^16.8.1"
  }
}
```

Features:
- Visual graph representation
- SDL editing
- Type introspection
- Federation directive support
- Drag-and-drop interface

### Converters

**Node.js Converter**
```json
{
  "dependencies": {
    "@json-schema-x-graphql/node-converter": "file:../../converters/node"
  }
}
```

**Rust WASM Converter**
```bash
# Build WASM from Rust converter
cd ../../converters/rust
wasm-pack build --target web --out-dir ../../web-ui/src/wasm
```

### State Management

**Zustand** (lightweight, TypeScript-friendly)
```json
{
  "dependencies": {
    "zustand": "^4.4.7"
  }
}
```

### Styling

**TailwindCSS** + **shadcn/ui**
```json
{
  "dependencies": {
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-*": "latest",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.2.0"
  }
}
```

### Build Tool

**Vite**
```json
{
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0"
  }
}
```

### Testing

```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.1.0",
    "@testing-library/jest-dom": "^6.1.0",
    "playwright": "^1.40.0"
  }
}
```

---

## Implementation Roadmap

### Week 1: Project Setup & Infrastructure

**Days 1-2: Initial Setup**
- [ ] Initialize Vite + React + TypeScript project
- [ ] Configure TailwindCSS
- [ ] Install all dependencies
- [ ] Setup project structure
- [ ] Configure build pipeline

**Days 3-4: WASM Integration**
- [ ] Build Rust converter to WASM
- [ ] Create WASM TypeScript bindings
- [ ] Test WASM loading and execution
- [ ] Setup WASM error handling

**Days 5-7: Base Layout**
- [ ] Create three-panel responsive layout
- [ ] Setup routing (if needed)
- [ ] Implement theme switching (light/dark)
- [ ] Basic navigation and header

**Deliverables**:
- Working Vite build
- WASM module loading successfully
- Base UI layout responsive

### Week 2: Editor Integration

**Days 8-10: Monaco Editor Setup**
- [ ] Integrate Monaco Editor
- [ ] Configure JSON Schema language support
- [ ] Add custom theme matching app design
- [ ] Implement basic validation
- [ ] Add keyboard shortcuts
- [ ] Setup auto-formatting (Prettier)

**Days 11-14: GraphQL Editor Integration**
- [ ] Integrate graphql-editor component
- [ ] Configure federation support
- [ ] Setup visual graph rendering
- [ ] Implement SDL syntax highlighting
- [ ] Add type inspector panel
- [ ] Configure custom theme

**Deliverables**:
- Fully functional JSON Schema editor
- Fully functional GraphQL editor
- Both editors styled and responsive

### Week 3: Converter Integration

**Days 15-17: Node.js Converter**
- [ ] Import Node.js converter package
- [ ] Create converter service wrapper
- [ ] Implement JSON → SDL conversion
- [ ] Implement SDL → JSON conversion
- [ ] Add error handling and display
- [ ] Show conversion statistics

**Days 18-21: WASM Converter**
- [ ] Create WASM converter wrapper
- [ ] Implement async WASM loading
- [ ] Add JSON → SDL via WASM
- [ ] Add SDL → JSON via WASM
- [ ] Implement fallback to Node.js if WASM fails
- [ ] Add performance comparison metrics

**Deliverables**:
- Both converters working end-to-end
- Converter toggle functional
- Statistics displayed accurately

### Week 4: Features & Polish

**Days 22-24: Import/Export**
- [ ] Implement file upload (JSON/GraphQL)
- [ ] Add drag-and-drop support
- [ ] Create export functionality (JSON, SDL, both)
- [ ] Add copy-to-clipboard
- [ ] Implement share URL generation
- [ ] Add sample schema selector

**Days 25-26: Validation & Errors**
- [ ] Real-time JSON Schema validation
- [ ] GraphQL SDL validation
- [ ] Federation directive validation
- [ ] Error highlighting in editors
- [ ] Error panel with details
- [ ] Warning notifications

**Days 27-28: UX Enhancements**
- [ ] Add loading states
- [ ] Implement keyboard shortcuts guide
- [ ] Add tooltips and help text
- [ ] Create onboarding tour
- [ ] Optimize performance
- [ ] Mobile responsiveness

**Deliverables**:
- Complete feature set
- Polished user experience
- All edge cases handled

### Week 5: Testing, Documentation & Deployment

**Days 29-30: Testing**
- [ ] Unit tests for components
- [ ] Integration tests for converters
- [ ] E2E tests with Playwright
- [ ] Performance testing
- [ ] Browser compatibility testing

**Days 31-32: Documentation**
- [ ] User guide
- [ ] API documentation
- [ ] Troubleshooting guide
- [ ] Video tutorial (optional)

**Days 33-35: Deployment**
- [ ] Configure deployment (Vercel/Netlify)
- [ ] Setup CI/CD pipeline
- [ ] Configure custom domain
- [ ] Setup analytics (optional)
- [ ] Production testing
- [ ] Launch!

**Deliverables**:
- 80%+ test coverage
- Complete documentation
- Live production deployment

---

## Component Design

### Directory Structure

```
web-ui/
├── public/
│   ├── samples/
│   │   ├── user-service.json
│   │   ├── product-catalog.json
│   │   └── order-system.json
│   ├── logo.svg
│   └── favicon.ico
│
├── src/
│   ├── components/
│   │   ├── editors/
│   │   │   ├── JsonSchemaEditor.tsx
│   │   │   ├── GraphQLEditor.tsx
│   │   │   └── EditorToolbar.tsx
│   │   │
│   │   ├── converter/
│   │   │   ├── ConverterToggle.tsx
│   │   │   ├── ConvertButton.tsx
│   │   │   ├── ConversionStats.tsx
│   │   │   └── ErrorDisplay.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── Layout.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── ThreePanel.tsx
│   │   │
│   │   └── ui/
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       └── ... (shadcn components)
│   │
│   ├── converters/
│   │   ├── nodeConverter.ts
│   │   ├── wasmConverter.ts
│   │   └── types.ts
│   │
│   ├── hooks/
│   │   ├── useConverter.ts
│   │   ├── useValidation.ts
│   │   ├── useLocalStorage.ts
│   │   └── useDebounce.ts
│   │
│   ├── store/
│   │   └── editorStore.ts
│   │
│   ├── utils/
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   └── export.ts
│   │
│   ├── wasm/
│   │   ├── json_schema_graphql_converter_bg.wasm
│   │   ├── json_schema_graphql_converter.d.ts
│   │   └── json_schema_graphql_converter.js
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
│
├── tests/
│   ├── unit/
│   │   └── components.test.tsx
│   ├── integration/
│   │   └── conversion.test.tsx
│   └── e2e/
│       └── editor.spec.ts
│
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── README.md
```

### Key Components

#### 1. EditorStore (Zustand)

```typescript
// src/store/editorStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface EditorState {
  // Content
  jsonSchema: string;
  graphqlSdl: string;
  
  // Converter settings
  converterMode: 'node' | 'wasm';
  options: ConversionOptions;
  
  // State
  isConverting: boolean;
  lastConversion: ConversionResult | null;
  errors: string[];
  
  // Actions
  setJsonSchema: (schema: string) => void;
  setGraphqlSdl: (sdl: string) => void;
  setConverterMode: (mode: 'node' | 'wasm') => void;
  convert: () => Promise<void>;
  convertReverse: () => Promise<void>;
  clearErrors: () => void;
  loadSample: (sampleName: string) => void;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      jsonSchema: '{\n  "$schema": "https://json-schema.org/draft/2020-12/schema"\n}',
      graphqlSdl: '',
      converterMode: 'wasm',
      options: {
        validate: true,
        includeDescriptions: true,
        preserveFieldOrder: true,
        federationVersion: '2.9',
        prettyPrint: true,
      },
      isConverting: false,
      lastConversion: null,
      errors: [],
      
      // Implementation...
    }),
    {
      name: 'json-graphql-editor',
      partialize: (state) => ({
        converterMode: state.converterMode,
        options: state.options,
      }),
    }
  )
);
```

#### 2. JsonSchemaEditor Component

```typescript
// src/components/editors/JsonSchemaEditor.tsx

import React from 'react';
import Editor from '@monaco-editor/react';
import { useEditorStore } from '@/store/editorStore';
import { validateJsonSchema } from '@/utils/validation';

export const JsonSchemaEditor: React.FC = () => {
  const { jsonSchema, setJsonSchema } = useEditorStore();
  
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setJsonSchema(value);
    }
  };
  
  return (
    <div className="h-full border rounded-lg overflow-hidden">
      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b">
        <h3 className="text-sm font-semibold">JSON Schema</h3>
      </div>
      
      <Editor
        height="calc(100% - 40px)"
        defaultLanguage="json"
        value={jsonSchema}
        onChange={handleEditorChange}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          formatOnPaste: true,
          formatOnType: true,
          automaticLayout: true,
        }}
      />
    </div>
  );
};
```

#### 3. GraphQLEditor Component

```typescript
// src/components/editors/GraphQLEditor.tsx

import React from 'react';
import { GraphQLEditor as GQLEditor } from 'graphql-editor';
import { useEditorStore } from '@/store/editorStore';

export const GraphQLEditor: React.FC = () => {
  const { graphqlSdl, setGraphqlSdl } = useEditorStore();
  
  return (
    <div className="h-full border rounded-lg overflow-hidden">
      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b">
        <h3 className="text-sm font-semibold">GraphQL SDL</h3>
      </div>
      
      <GQLEditor
        schema={graphqlSdl}
        onChange={(newSdl) => setGraphqlSdl(newSdl)}
        options={{
          theme: 'dark',
          readonly: false,
          federation: true,
        }}
      />
    </div>
  );
};
```

#### 4. ConverterToggle Component

```typescript
// src/components/converter/ConverterToggle.tsx

import React from 'react';
import { useEditorStore } from '@/store/editorStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const ConverterToggle: React.FC = () => {
  const { 
    converterMode, 
    setConverterMode, 
    convert,
    convertReverse,
    isConverting,
    lastConversion 
  } = useEditorStore();
  
  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Mode Toggle */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Converter Engine</label>
        <div className="flex gap-2">
          <Button
            variant={converterMode === 'node' ? 'default' : 'outline'}
            onClick={() => setConverterMode('node')}
            size="sm"
          >
            Node.js
          </Button>
          <Button
            variant={converterMode === 'wasm' ? 'default' : 'outline'}
            onClick={() => setConverterMode('wasm')}
            size="sm"
          >
            Rust/WASM
            <Badge variant="secondary" className="ml-2">Fast</Badge>
          </Button>
        </div>
      </div>
      
      {/* Convert Buttons */}
      <div className="flex flex-col gap-2">
        <Button
          onClick={convert}
          disabled={isConverting}
          className="w-full"
        >
          {isConverting ? 'Converting...' : 'JSON → SDL'}
        </Button>
        
        <Button
          onClick={convertReverse}
          disabled={isConverting}
          variant="outline"
          className="w-full"
        >
          {isConverting ? 'Converting...' : 'SDL → JSON'}
        </Button>
      </div>
      
      {/* Statistics */}
      {lastConversion && (
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Time:</span>
            <span className="font-mono">{lastConversion.duration}ms</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Types:</span>
            <span className="font-mono">{lastConversion.typesConverted}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <Badge variant={lastConversion.success ? 'default' : 'destructive'}>
              {lastConversion.success ? '✓ Valid' : '✗ Error'}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## Converter Integration

### Node.js Converter Wrapper

```typescript
// src/converters/nodeConverter.ts

import { 
  convertJsonToSdl, 
  convertSdlToJson,
  ConversionOptions 
} from '@json-schema-x-graphql/node-converter';

export async function convertJsonToSdlNode(
  jsonSchema: any,
  options: ConversionOptions
): Promise<ConversionResult> {
  const startTime = performance.now();
  
  try {
    const result = await convertJsonToSdl(jsonSchema, options);
    const duration = performance.now() - startTime;
    
    return {
      success: result.success,
      sdl: result.sdl,
      errors: result.errors || [],
      duration: Math.round(duration * 100) / 100,
      typesConverted: result.statistics?.typesConverted || 0,
      fieldsConverted: result.statistics?.fieldsConverted || 0,
    };
  } catch (error) {
    return {
      success: false,
      sdl: '',
      errors: [error.message],
      duration: performance.now() - startTime,
      typesConverted: 0,
      fieldsConverted: 0,
    };
  }
}

export async function convertSdlToJsonNode(
  sdl: string,
  options: ConversionOptions
): Promise<ConversionResult> {
  const startTime = performance.now();
  
  try {
    const result = await convertSdlToJson(sdl, options);
    const duration = performance.now() - startTime;
    
    return {
      success: result.success,
      schema: result.schema,
      errors: result.errors || [],
      duration: Math.round(duration * 100) / 100,
      typesConverted: result.statistics?.typesConverted || 0,
      fieldsConverted: result.statistics?.fieldsConverted || 0,
    };
  } catch (error) {
    return {
      success: false,
      schema: {},
      errors: [error.message],
      duration: performance.now() - startTime,
      typesConverted: 0,
      fieldsConverted: 0,
    };
  }
}
```

### WASM Converter Wrapper

```typescript
// src/converters/wasmConverter.ts

import init, { 
  convert_json_to_sdl, 
  convert_sdl_to_json 
} from '../wasm/json_schema_graphql_converter';

let wasmInitialized = false;

async function ensureWasmInit() {
  if (!wasmInitialized) {
    await init();
    wasmInitialized = true;
  }
}

export async function convertJsonToSdlWasm(
  jsonSchema: any,
  options: ConversionOptions
): Promise<ConversionResult> {
  const startTime = performance.now();
  
  try {
    await ensureWasmInit();
    
    const result = convert_json_to_sdl(
      JSON.stringify(jsonSchema),
      JSON.stringify(options)
    );
    
    const parsed = JSON.parse(result);
    const duration = performance.now() - startTime;
    
    return {
      ...parsed,
      duration: Math.round(duration * 100) / 100,
    };
  } catch (error) {
    return {
      success: false,
      sdl: '',
      errors: [error.message],
      duration: performance.now() - startTime,
      typesConverted: 0,
      fieldsConverted: 0,
    };
  }
}

export async function convertSdlToJsonWasm(
  sdl: string,
  options: ConversionOptions
): Promise<ConversionResult> {
  const startTime = performance.now();
  
  try {
    await ensureWasmInit();
    
    const result = convert_sdl_to_json(
      sdl,
      JSON.stringify(options)
    );
    
    const parsed = JSON.parse(result);
    const duration = performance.now() - startTime;
    
    return {
      ...parsed,
      duration: Math.round(duration * 100) / 100,
    };
  } catch (error) {
    return {
      success: false,
      schema: {},
      errors: [error.message],
      duration: performance.now() - startTime,
      typesConverted: 0,
      fieldsConverted: 0,
    };
  }
}
```

### Unified Converter Hook

```typescript
// src/hooks/useConverter.ts

import { useEditorStore } from '@/store/editorStore';
import { convertJsonToSdlNode, convertSdlToJsonNode } from '@/converters/nodeConverter';
import { convertJsonToSdlWasm, convertSdlToJsonWasm } from '@/converters/wasmConverter';

export function useConverter() {
  const { converterMode, options } = useEditorStore();
  
  const convertJsonToSdl = async (jsonSchema: any) => {
    if (converterMode === 'node') {
      return convertJsonToSdlNode(jsonSchema, options);
    } else {
      return convertJsonToSdlWasm(jsonSchema, options);
    }
  };
  
  const convertSdlToJson = async (sdl: string) => {
    if (converterMode === 'node') {
      return convertSdlToJsonNode(sdl, options);
    } else {
      return convertSdlToJsonWasm(sdl, options);
    }
  };
  
  return {
    convertJsonToSdl,
    convertSdlToJson,
  };
}
```

---

## Features & User Experience

### Core Features

1. **Real-Time Conversion**
   - Auto-convert on input (debounced 500ms)
   - Manual convert buttons
   - Show conversion in progress

2. **Validation**
   - JSON Schema validation (AJV)
   - GraphQL SDL validation
   - Federation directive validation
   - Inline error markers

3. **Import/Export**
   - Upload JSON/GraphQL files
   - Drag-and-drop support
   - Export as JSON, SDL, or ZIP
   - Copy to clipboard
   - Share via URL

4. **Sample Schemas**
   - User service (federated)
   - Product catalog
   - Order system
   - Blog platform
   - E-commerce

5. **Converter Comparison**
   - Toggle between Node.js and WASM
   - Performance metrics
   - Validate parity

6. **Settings**
   - Theme (light/dark)
   - Editor preferences
   - Conversion options
   - Auto-save

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Enter` | Convert JSON → SDL |
| `Ctrl/Cmd + Shift + Enter` | Convert SDL → JSON |
| `Ctrl/Cmd + S` | Save/Export |
| `Ctrl/Cmd + O` | Open file |
| `Ctrl/Cmd + K` | Show shortcuts |
| `Ctrl/Cmd + ,` | Open settings |
| `Ctrl/Cmd + Shift + T` | Toggle converter mode |

### Mobile Responsiveness

```
Desktop (1920px+):  [JSON Schema | Controls | GraphQL]
Tablet (768px):     [JSON Schema]
                    [Controls]
                    [GraphQL]
Mobile (< 768px):   Tabs: JSON Schema | GraphQL
                    Floating convert button
```

---

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd web-ui
vercel

# Production
vercel --prod
```

**vercel.json**:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Netlify

```bash
# Build command
npm run build

# Publish directory
dist
```

**netlify.toml**:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Custom Domain

1. Add custom domain in hosting provider
2. Configure DNS:
   ```
   A     @       76.76.21.21
   CNAME www     cname.vercel-dns.com
   ```
3. Enable HTTPS (automatic with Vercel/Netlify)

---

## Testing Strategy

### Unit Tests (Vitest)

```typescript
// tests/unit/ConverterToggle.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { ConverterToggle } from '@/components/converter/ConverterToggle';

describe('ConverterToggle', () => {
  it('switches between Node.js and WASM modes', () => {
    render(<ConverterToggle />);
    
    const nodeButton = screen.getByText('Node.js');
    const wasmButton = screen.getByText(/Rust\/WASM/);
    
    fireEvent.click(nodeButton);
    expect(nodeButton).toHaveClass('active');
    
    fireEvent.click(wasmButton);
    expect(wasmButton).toHaveClass('active');
  });
});
```

### Integration Tests

```typescript
// tests/integration/conversion.test.tsx

import { renderHook, act } from '@testing-library/react';
import { useConverter } from '@/hooks/useConverter';

describe('Converter Integration', () => {
  it('converts JSON Schema to SDL', async () => {
    const { result } = renderHook(() => useConverter());
    
    const jsonSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: {
        User: {
          type: 'object',
          'x-graphql-type-name': 'User',
          'x-graphql-type-kind': 'OBJECT',
        },
      },
    };
    
    let conversionResult;
    await act(async () => {
      conversionResult = await result.current.convertJsonToSdl(jsonSchema);
    });
    
    expect(conversionResult.success).toBe(true);
    expect(conversionResult.sdl).toContain('type User');
  });
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test('complete conversion workflow', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  // Paste JSON Schema
  await page.click('[data-testid="json-editor"]');
  await page.keyboard.type('{"$schema": "https://json-schema.org/draft/2020-12/schema"}');
  
  // Click convert
  await page.click('[data-testid="convert-button"]');
  
  // Wait for result
  await page.waitForSelector('[data-testid="graphql-editor"]');
  
  // Verify SDL output
  const sdl = await page.textContent('[data-testid="graphql-editor"]');
  expect(sdl).toBeTruthy();
});
```

---

## Success Criteria

### Phase 3B Complete When:

- [x] Project setup complete
- [ ] Monaco Editor integrated and functional
- [ ] GraphQL Editor integrated and functional
- [ ] Node.js converter working end-to-end
- [ ] WASM converter working end-to-end
- [ ] Converter toggle functional
- [ ] Import/export working
- [ ] Sample schemas available
- [ ] All features implemented
- [ ] 80%+ test coverage
- [ ] Documentation complete
- [ ] Deployed to production
- [ ] Performance < 5ms for conversions
- [ ] Mobile responsive
- [ ] Cross-browser compatible (Chrome, Firefox, Safari, Edge)

---

## Next Steps

1. **Complete Phase 3A (Local Testing)**
   - Ensure all converter tests pass
   - Achieve 80%+ coverage
   - Validate parity between converters

2. **Begin Phase 3B**
   - Initialize Vite project
   - Setup basic layout
   - Integrate first editor

3. **Iterate Weekly**
   - Review progress against roadmap
   - Adjust timeline as needed
   - User testing and feedback

---

## Resources

- [GraphQL Editor GitHub](https://github.com/graphql-editor/graphql-editor)
- [Monaco Editor Docs](https://microsoft.github.io/monaco-editor/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Zustand Docs](https://docs.pmnd.rs/zustand/)
- [TailwindCSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)

---

**Ready to start Phase 3B?** Complete Phase 3A testing first, then follow this roadmap!