# Quick Commands Reference

**JSON Schema ↔ GraphQL Authoring UI**

---

## 🚀 Getting Started

```bash
# From repository root
cd frontend/schema-authoring

# Install dependencies
pnpm install

# Start development server
pnpm run dev
# Open http://localhost:3003
```

---

## 🛠️ Development Commands

### Build & Run

```bash
# Start dev server with HMR
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview

# Type check without building
pnpm run type-check

# Lint code
pnpm run lint

# Format code
pnpm run format
```

### Testing

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test -- --watch

# Run tests with UI
pnpm run test:ui

# Run tests with coverage
pnpm test -- --coverage

# Run E2E tests (when implemented)
pnpm run test:e2e
```

---

## 🦀 WASM Commands

### Build WASM Converter (Requires Rust + wasm-pack)

```bash
# From repository root
cd converters/rust

# Build WASM for web
wasm-pack build --target web --out-dir ../../frontend/schema-authoring/src/wasm

# Or use the npm script from root
cd ../..
pnpm run build:wasm
```

### Install Rust & wasm-pack

```bash
# Install Rust (if not installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Verify installation
rustc --version
wasm-pack --version
```

---

## 📦 Dependency Management

```bash
# Install new dependency
pnpm add <package>

# Install dev dependency
pnpm add -D <package>

# Remove dependency
pnpm remove <package>

# Update dependencies
pnpm update

# Update dependencies interactively
pnpm update -i

# Check outdated packages
pnpm outdated

# Clean install (remove node_modules and reinstall)
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## 🐛 Debugging

### Browser Console

```javascript
// Access AI API
const api = window.__schemaAuthoringAPI__.getAPI();

// Get current schemas
api.getJsonSchema();
api.getGraphQLSchema();

// Get state snapshot
api.getStateSnapshot();

// Get settings
api.getSettings();

// Trigger conversion
api.convert();

// Trigger validation
api.validate();
```

### Check Converter Status

```javascript
// In browser console
import { converterManager } from "./src/converters/converter-manager";

// Get engine status
converterManager.getEngineStatus();

// Get performance metrics
converterManager.getPerformanceMetrics();

// Get average conversion times
converterManager.getAverageConversionTime();

// Get success rates
converterManager.getSuccessRate();
```

### Clear State

```javascript
// Clear localStorage
localStorage.clear();

// Clear specific key
localStorage.removeItem("schema-authoring-storage");

// Reload page
location.reload();
```

---

## 🔍 Troubleshooting

### Fix: Module not found

```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Reinstall dependencies
pnpm install

# Restart dev server
pnpm run dev
```

### Fix: TypeScript errors

```bash
# Check for errors
pnpm run type-check

# Generate types
pnpm run type-check --noEmit false

# Restart TypeScript server (in VS Code)
# Cmd/Ctrl + Shift + P -> "TypeScript: Restart TS Server"
```

### Fix: Port already in use

```bash
# Kill process on port 3003 (Linux/Mac)
lsof -ti:3003 | xargs kill -9

# Or use different port
pnpm run dev -- --port 3004
```

### Fix: WASM not loading

```bash
# Check if WASM file exists
ls src/wasm/

# Build WASM if missing
cd ../../converters/rust
wasm-pack build --target web --out-dir ../../frontend/schema-authoring/src/wasm

# Or just use Node converter (app auto-falls back)
```

---

## 🚢 Deployment

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy

# Deploy to production
netlify deploy --prod
```

### Docker

```bash
# Build Docker image
docker build -t schema-authoring .

# Run container
docker run -p 8080:80 schema-authoring

# Open http://localhost:8080
```

### GitHub Pages

```bash
# Build
pnpm run build

# Deploy dist/ to gh-pages branch
npx gh-pages -d dist
```

---

## 📊 Performance Analysis

### Bundle Analysis

```bash
# Install analyzer
pnpm add -D rollup-plugin-visualizer

# Build with analysis
pnpm run build -- --mode analyze

# Open stats.html in browser
```

### Lighthouse Audit

```bash
# Install Lighthouse CLI
npm i -g lighthouse

# Run audit
lighthouse http://localhost:3003 --view

# Or use Chrome DevTools > Lighthouse tab
```

---

## 🔧 Configuration

### Environment Variables

```bash
# .env.local (not committed)
VITE_API_ENDPOINT=http://localhost:4000/api
VITE_ENABLE_ANALYTICS=false
VITE_SENTRY_DSN=your-sentry-dsn

# .env.production
VITE_API_ENDPOINT=https://api.example.com
VITE_ENABLE_ANALYTICS=true
```

### Vite Config

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 3003,
    open: true,
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      // Custom options
    },
  },
});
```

---

## 📝 Git Commands

```bash
# Create feature branch
git checkout -b feature/my-feature

# Stage changes
git add .

# Commit with conventional commit message
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/my-feature

# Create PR (using GitHub CLI)
gh pr create
```

### Conventional Commits

```bash
feat: new feature
fix: bug fix
docs: documentation
style: formatting
refactor: code restructuring
test: adding tests
chore: maintenance
```

---

## 🧹 Cleanup

```bash
# Remove build artifacts
rm -rf dist

# Remove node_modules
rm -rf node_modules

# Remove cache
rm -rf node_modules/.vite
rm -rf .turbo

# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## 📚 Useful Scripts

### Create Component

```bash
# Create new component file
touch src/components/MyComponent.tsx

# Add boilerplate
cat > src/components/MyComponent.tsx << 'EOF'
import React from 'react';

export interface MyComponentProps {
  // Props here
}

export const MyComponent: React.FC<MyComponentProps> = (props) => {
  return (
    <div className="my-component">
      {/* Content */}
    </div>
  );
};

export default MyComponent;
EOF
```

### Generate Type Definitions

```bash
# Generate types from JSON Schema
npx json-schema-to-typescript schema.json > types.ts

# Generate GraphQL types
npx @graphql-codegen/cli
```

---

## 🎯 Quick Fixes

### Fix: Store methods missing

```bash
# Edit src/store/app-store.ts
# Add to AppActions interface:
#   convert: () => Promise<void>;
#   validate: () => Promise<void>;
#   setMode: (mode: AppMode) => void;
#   applyAutoFix: (error: ValidationError) => Promise<void>;
#   clearValidationResult: () => void;

# Implement methods (see ACTION_PLAN.md)
```

### Fix: Types not aligned

```bash
# Check types
pnpm run type-check

# Fix imports
# Fix property names
# Fix method signatures

# Verify
pnpm run type-check
```

---

## 💡 Pro Tips

```bash
# Run multiple commands in parallel
pnpm run dev & pnpm run test -- --watch

# Watch for file changes
pnpm run dev -- --watch

# Generate source maps for debugging
pnpm run build -- --sourcemap

# Profile build performance
pnpm run build -- --profile

# Use specific Node version (with nvm)
nvm use 18
pnpm run dev

# Clear everything and start fresh
rm -rf node_modules dist .vite pnpm-lock.yaml
pnpm install
pnpm run dev
```

---

## 🔗 Quick Links

- **Dev Server:** http://localhost:3003
- **Type Check:** `pnpm run type-check`
- **Documentation:** See README.md, DEVELOPMENT_GUIDE.md
- **Action Plan:** See ACTION_PLAN.md
- **Issues:** GitHub Issues tab

---

**Need Help?** See [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) or [ACTION_PLAN.md](./ACTION_PLAN.md)
