# Running the Schema Authoring UI

This guide explains how to run the JSON Schema ↔ GraphQL authoring UI in development mode.

## Prerequisites

- Node.js 18+ and pnpm installed
- Project dependencies installed (`pnpm install` from project root)

## Quick Start (Recommended)

The easiest way to run both the API server and the frontend together:

```bash
cd frontend/schema-authoring
pnpm run dev:full
```

This will start:
- **API Server** on `http://localhost:3004` (Node.js converter backend)
- **Vite Dev Server** on `http://localhost:3003` (React frontend)

The frontend will proxy API requests (`/api/*`) to the backend automatically.

## Manual Start (Individual Servers)

If you prefer to run the servers separately (useful for debugging):

### 1. Start the API Server

In one terminal:

```bash
cd converters/node
pnpm run dev:api
```

This starts the Node.js converter API on `http://localhost:3004`.

### 2. Start the Frontend

In another terminal:

```bash
cd frontend/schema-authoring
pnpm run dev
```

This starts the Vite dev server on `http://localhost:3003`.

## Available Converters

The app supports two conversion engines:

### 1. Node.js Converter (Default)
- Runs as a separate API server on port 3004
- Fast and reliable
- Automatically used when API server is running
- **Status**: ✅ Working when API server is running

### 2. WASM Converter (Optional)
- Runs directly in the browser (no server needed)
- Faster performance for large schemas
- Requires Rust toolchain to build
- **Status**: ⚠️ Requires building first

To build the WASM converter:

```bash
# From project root or frontend/schema-authoring
pnpm run build:wasm
```

**Note**: WASM building requires `wasm-pack` and Rust toolchain. If not available, the app will automatically fall back to the Node.js converter.

## Troubleshooting

### Issue: "POST http://localhost:3003/api/convert 404"

**Cause**: The API server is not running.

**Solution**: 
- Use `pnpm run dev:full` instead of `pnpm run dev`
- OR manually start the API server: `cd converters/node && pnpm run dev:api`

### Issue: "WASM converter initialization failed"

**Cause**: WASM module not built yet.

**Solution**: This is expected and harmless. The app will use the Node.js converter as fallback. If you want WASM support, run `pnpm run build:wasm`.

### Issue: Monaco editors not showing / loading spinner stuck

**Possible causes**:
1. Check browser console for errors
2. Clear browser cache and reload
3. Check that Monaco worker files are being served correctly

**Debug steps**:
```bash
# Check console for errors:
# - Open DevTools (F12)
# - Look for red errors in Console tab
# - Check Network tab for 404s on worker files

# Try a clean build:
cd frontend/schema-authoring
rm -rf node_modules/.vite
pnpm run dev:full
```

## Environment Variables

You can customize ports using environment variables:

```bash
# API Server (default: 3004)
PORT=3005 pnpm run dev:api

# Frontend (set in vite.config.ts)
# Vite dev server runs on port 3003 by default
```

## URLs

- **Frontend**: http://localhost:3003
- **API Server**: http://localhost:3004
- **API Health Check**: http://localhost:3004/health
- **API Endpoint**: http://localhost:3004/api/convert

## Scripts Reference

From `frontend/schema-authoring/`:

- `pnpm run dev` - Start frontend only (requires API server running separately)
- `pnpm run dev:api` - Start API server only
- `pnpm run dev:full` - Start both servers together ✨ **Recommended**
- `pnpm run build` - Build for production
- `pnpm run preview` - Preview production build
- `pnpm run typecheck` - Type check TypeScript
- `pnpm run build:wasm` - Build WASM converter (requires Rust)

## Production Build

To create a production build:

```bash
cd frontend/schema-authoring
pnpm run build
```

The output will be in `dist/` directory.

To preview the production build:

```bash
pnpm run preview
```

**Note**: In production, you'll need to deploy both the frontend static files and the API server, or configure the frontend to use a different API endpoint.

## Architecture

```
┌─────────────────────┐
│   Browser (3003)    │
│  React + Monaco     │
└──────────┬──────────┘
           │ /api/* proxied
           ▼
┌─────────────────────┐
│  API Server (3004)  │
│  Node.js Converter  │
└─────────────────────┘
```

Vite's proxy configuration (in `vite.config.ts`) forwards all `/api/*` requests from the frontend to the API server, so the browser only needs to connect to port 3003.