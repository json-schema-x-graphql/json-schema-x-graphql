# Quick Start Guide - JSON Schema ↔ GraphQL Authoring UI

This guide will help you get the schema authoring UI up and running quickly.

## Prerequisites

- **Node.js** >= 18.0.0
- **pnpm** package manager
- **Git** (to clone the repository)
- **Optional**: Rust + wasm-pack (for WASM converter)

## Installation

### 1. Clone and Install Dependencies

```bash
# Clone the repository (if not already done)
git clone <your-repo-url>
cd json-schema-x-graphql

# Install frontend dependencies
cd frontend/schema-authoring
pnpm install

# Install converter dependencies
cd ../../converters/node
pnpm install
```

### 2. Run Complete Test Suite

```bash
# From project root
./test-complete-setup.sh
```

This comprehensive test script will:

- ✅ Validate your environment
- ✅ Check project structure
- ✅ Verify TypeScript compilation
- ✅ Test the API server
- ✅ Test conversions (JSON → GraphQL and GraphQL → JSON)
- ✅ Validate configuration
- ✅ Build the frontend
- 📊 Generate a detailed report

**Expected Output:** You should see mostly green checkmarks (✅) with a summary at the end.

## Running the Application

### Option 1: Full Dev Environment (Recommended)

This starts both the API server and the frontend with hot-reload:

```bash
cd frontend/schema-authoring
pnpm run dev:full
```

Then open your browser to: **http://localhost:3003**

### Option 2: Run Components Separately

**Terminal 1 - API Server:**

```bash
cd converters/node
pnpm run dev:api
```

**Terminal 2 - Frontend:**

```bash
cd frontend/schema-authoring
pnpm run dev
```

Then open your browser to: **http://localhost:3003**

## Automated Browser Testing

The project includes Playwright-based automated testing for debugging UI issues:

### 1. Install Playwright (One-Time Setup)

```bash
cd frontend/schema-authoring
pnpm run debug:install
```

### 2. Run Browser Debug

Make sure the dev servers are running, then:

```bash
cd frontend/schema-authoring
pnpm run debug:browser
```

This will:

- 🌐 Launch a headless browser
- 📝 Capture all console logs
- 🌐 Record all network requests
- 📸 Take screenshots
- 💾 Save a detailed report

### 3. Review Results

Check the output in `frontend/schema-authoring/debug-output/`:

- `debug-summary.txt` - Human-readable summary
- `debug-report.json` - Detailed JSON report
- `screenshot-*.png` - Screenshots

## Testing Conversions

### Using the UI

1. Start the application (see above)
2. Enter a JSON Schema in the left editor:
   ```json
   {
     "type": "object",
     "properties": {
       "id": { "type": "string" },
       "name": { "type": "string" },
       "age": { "type": "integer" }
     },
     "required": ["id"]
   }
   ```
3. Click "Convert" or press Ctrl+Enter
4. See the GraphQL SDL output in the right editor

### Using the API Directly

Test the conversion API with curl:

```bash
# JSON Schema to GraphQL
curl -X POST http://localhost:3004/api/convert \
  -H "Content-Type: application/json" \
  -d '{
    "direction": "json-to-graphql",
    "input": {
      "type": "object",
      "properties": {
        "id": {"type": "string"},
        "name": {"type": "string"}
      }
    }
  }'

# GraphQL to JSON Schema
curl -X POST http://localhost:3004/api/convert \
  -H "Content-Type: application/json" \
  -d '{
    "direction": "graphql-to-json",
    "input": "type Query { hello: String }"
  }'
```

## Building for Production

### Frontend Only

```bash
cd frontend/schema-authoring
pnpm run build
```

Output will be in `frontend/schema-authoring/dist/`

### With WASM (Optional)

If you have Rust and wasm-pack installed:

```bash
cd frontend/schema-authoring
pnpm run build:wasm
pnpm run build
```

## Troubleshooting

### Issue: API Returns 404

**Problem:** Frontend can't reach the API server

**Solution:**

1. Ensure API server is running: `cd converters/node && pnpm run dev:api`
2. Check that port 3004 is available: `lsof -i :3004`
3. Verify Vite proxy configuration in `vite.config.ts`

### Issue: Monaco Editors Not Loading

**Problem:** Editor areas are blank or show loading indefinitely

**Solution:**

1. Clear browser cache
2. Check browser console for errors (F12)
3. Run `pnpm run debug:browser` to capture detailed logs

### Issue: Conversion Fails

**Problem:** Conversion returns errors or doesn't complete

**Solution:**

1. Check API server logs (visible in terminal where `dev:api` is running)
2. Test API directly with curl (see "Testing Conversions" above)
3. Validate your input schema/SDL syntax
4. Run `./test-complete-setup.sh` to check system health

### Issue: Dependencies Won't Install

**Problem:** `pnpm install` fails

**Solution:**

1. Ensure Node.js >= 18.0.0: `node --version`
2. Update pnpm: `npm install -g pnpm@latest`
3. Clear cache: `pnpm store prune`
4. Try again: `pnpm install --force`

### Issue: Port Already in Use

**Problem:** "Port 3003 or 3004 already in use"

**Solution:**

```bash
# Find process using the port
lsof -i :3003
lsof -i :3004

# Kill the process (replace PID with actual process ID)
kill -9 <PID>

# Or kill all node processes (use with caution)
pkill -9 node
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Port 3003)                  │
│                                                           │
│  ┌──────────────┐         ┌──────────────┐              │
│  │ JSON Schema  │◄───────►│   GraphQL    │              │
│  │   Editor     │         │    Editor    │              │
│  │  (Monaco)    │         │   (Monaco)   │              │
│  └──────────────┘         └──────────────┘              │
│         │                         │                      │
│         └────────┬────────────────┘                      │
│                  ▼                                       │
│         ┌─────────────────┐                             │
│         │  Converter      │                             │
│         │  Manager        │                             │
│         └────────┬────────┘                             │
│                  │                                       │
│         ┌────────┴────────┐                             │
│         ▼                 ▼                             │
│  ┌─────────────┐   ┌─────────────┐                     │
│  │    WASM     │   │    Node     │                     │
│  │  Converter  │   │  Converter  │                     │
│  │  (Optional) │   │  (Fallback) │                     │
│  └─────────────┘   └──────┬──────┘                     │
└─────────────────────────────┼──────────────────────────┘
                              │
                   Vite Proxy │ /api/*
                              ▼
                   ┌──────────────────┐
                   │  API Server      │
                   │  (Port 3004)     │
                   │                  │
                   │  - Health Check  │
                   │  - Convert API   │
                   └──────────────────┘
```

## Key Files

- **Frontend App**: `frontend/schema-authoring/src/App.tsx`
- **API Server**: `converters/node/src/api-server.ts`
- **Node Converter**: `converters/node/src/converter.ts`
- **Vite Config**: `frontend/schema-authoring/vite.config.ts`
- **Debug Script**: `frontend/schema-authoring/debug-browser.ts`
- **Test Script**: `test-complete-setup.sh`

## Development Workflow

### Daily Development

1. Start dev environment:

   ```bash
   cd frontend/schema-authoring
   pnpm run dev:full
   ```

2. Make changes to code
3. Browser auto-reloads with changes
4. Test in browser at http://localhost:3003

### Before Committing

1. Run type-check:

   ```bash
   cd frontend/schema-authoring
   pnpm run typecheck
   ```

2. Run full test suite:

   ```bash
   cd ../..
   ./test-complete-setup.sh
   ```

3. Run browser tests if UI changes:
   ```bash
   cd frontend/schema-authoring
   pnpm run debug:browser
   ```

## Next Steps

- 📖 Read `frontend/schema-authoring/DEBUG_GUIDE.md` for detailed debugging info
- 📖 Read `frontend/schema-authoring/RUNNING.md` for deployment options
- 🔧 Explore `converters/node/README.md` for converter API details
- 🧪 Add your own test cases in `converters/node/src/__tests__/`

## Getting Help

If you encounter issues:

1. ✅ Run `./test-complete-setup.sh` and review the output
2. ✅ Run `pnpm run debug:browser` to capture browser state
3. ✅ Check API logs in the terminal where `dev:api` is running
4. ✅ Review `debug-output/debug-summary.txt` for automated diagnostics
5. ✅ Check the GitHub issues or create a new one with:
   - Output from `test-complete-setup.sh`
   - Contents of `debug-summary.txt`
   - Screenshots if relevant

## Success Indicators

You'll know everything is working when:

- ✅ `./test-complete-setup.sh` shows mostly green checkmarks
- ✅ Browser loads at http://localhost:3003 without console errors
- ✅ Both Monaco editors render properly
- ✅ Converting JSON Schema produces valid GraphQL SDL
- ✅ Converting GraphQL SDL produces valid JSON Schema
- ✅ No red errors in browser console (F12)
- ✅ API server logs show successful conversions

**Happy schema authoring! 🚀**
