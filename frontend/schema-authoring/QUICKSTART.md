# Quick Start Guide

## TL;DR - Just Run This!

```bash
cd frontend/schema-authoring
pnpm run dev:full
```

Then open: **http://localhost:3003**

That's it! The command starts both the API server and the frontend together.

---

## What Just Happened?

The `dev:full` command starts two servers concurrently:

1. **API Server** (port 3004) - Node.js converter backend
2. **Frontend** (port 3003) - React app with Monaco editors

The frontend automatically proxies API requests to the backend, so you only need to visit port 3003.

---

## Troubleshooting

### ❌ "POST /api/convert 404"

**Problem**: API server isn't running.

**Solution**: Make sure you used `pnpm run dev:full` (not just `pnpm run dev`)

### ❌ "concurrently: command not found"

**Problem**: Dependencies not installed.

**Solution**:
```bash
pnpm install
```

### ❌ Editors not showing / stuck on loading

**Possible fixes**:
1. Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
2. Clear browser cache
3. Check browser console for errors (F12)
4. Try: `rm -rf node_modules/.vite && pnpm run dev:full`

### ⚠️ "WASM converter initialization failed"

**This is normal!** The app will use the Node.js converter instead. WASM is optional and provides better performance, but requires building with Rust toolchain.

To enable WASM (optional):
```bash
pnpm run build:wasm
```

---

## Manual Control (Advanced)

If you want to start servers separately:

**Terminal 1** - API Server:
```bash
cd converters/node
pnpm run dev:api
```

**Terminal 2** - Frontend:
```bash
cd frontend/schema-authoring
pnpm run dev
```

---

## First Time Setup

If this is your first time running the app:

```bash
# From project root
pnpm install

# Start the app
cd frontend/schema-authoring
pnpm run dev:full
```

---

## What to Expect

When you open http://localhost:3003, you should see:

- **Left panel**: JSON Schema editor (Monaco)
- **Right panel**: GraphQL SDL output (Monaco)
- **Top toolbar**: Template selector, conversion buttons, settings
- **Bottom status bar**: Converter status, error counts

The app auto-converts as you type (with debouncing).

---

## Next Steps

- Check out the templates (📄 Templates button in toolbar)
- Try editing the JSON Schema in the left panel
- Watch the GraphQL SDL update in real-time
- Explore the settings (⚙️ button)

For more details, see [RUNNING.md](./RUNNING.md).