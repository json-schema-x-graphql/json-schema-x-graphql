# Phase 3 Web Editor Setup Guide

Complete setup instructions for both Yjs and Loro collaborative editing demos.

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+ or yarn 1.22+
- Modern browser (Chrome, Firefox, Safari, Edge)
- Git

## Quick Setup (TL;DR)

```bash
# Clone the repository (if not already done)
git clone https://github.com/JJediny/json-schema-x-graphql.git
cd json-schema-x-graphql/frontend

# Setup Yjs Demo
cd demos/yjs-monaco
npm install
npx y-websocket &  # Start WebSocket server in background
npm run dev        # Start dev server on port 3001

# Setup Loro Demo (in new terminal)
cd demos/loro-monaco
npm install
npm run dev        # Start dev server on port 3002
```

## Detailed Setup Instructions

### Step 1: Install Node.js

**macOS:**
```bash
# Using Homebrew
brew install node

# Or download from nodejs.org
```

**Linux:**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Fedora
sudo dnf install nodejs
```

**Windows:**
- Download installer from [nodejs.org](https://nodejs.org/)
- Run installer and follow prompts

**Verify Installation:**
```bash
node --version  # Should be v18.0.0 or higher
npm --version   # Should be 9.0.0 or higher
```

### Step 2: Clone Repository

```bash
# HTTPS
git clone https://github.com/JJediny/json-schema-x-graphql.git

# SSH (if you have SSH keys set up)
git clone git@github.com:JJediny/json-schema-x-graphql.git

cd json-schema-x-graphql
```

### Step 3: Choose Your Demo

You can set up one or both demos. They run on different ports and don't interfere with each other.

---

## Yjs Demo Setup

### 1. Navigate to Yjs Demo Directory

```bash
cd frontend/demos/yjs-monaco
```

### 2. Install Dependencies

```bash
npm install
```

**Expected Install Time:** 1-2 minutes

**Dependencies Installed:**
- React 18
- TypeScript 5
- Vite 5
- Monaco Editor
- Yjs, y-monaco, y-websocket
- Tailwind CSS
- Zustand

### 3. Configure Environment (Optional)

Create `.env` file:

```bash
cat > .env << EOF
VITE_WS_URL=ws://localhost:1234
EOF
```

### 4. Start WebSocket Server

**Option A: Using npx (Recommended for testing)**
```bash
npx y-websocket
```

**Option B: Install globally**
```bash
npm install -g y-websocket-server
y-websocket-server --port 1234
```

**Option C: Custom server with persistence**
```bash
# Install dependencies
npm install ws y-leveldb

# Create server.js
cat > server.js << 'EOF'
const WebSocket = require('ws');
const http = require('http');
const { LeveldbPersistence } = require('y-leveldb');

const server = http.createServer();
const wss = new WebSocket.Server({ server });
const persistence = new LeveldbPersistence('./data');

wss.on('connection', (ws, req) => {
  console.log('New connection');
  // Add your logic here
});

server.listen(1234, () => {
  console.log('WebSocket server running on port 1234');
});
EOF

# Run server
node server.js
```

**Verify Server is Running:**
```bash
curl http://localhost:1234
# Should return WebSocket server info
```

### 5. Start Development Server

In a new terminal:

```bash
cd frontend/demos/yjs-monaco
npm run dev
```

**Expected Output:**
```
  VITE v5.3.1  ready in 450 ms

  ➜  Local:   http://localhost:3001/
  ➜  Network: http://192.168.1.x:3001/
  ➜  press h to show help
```

### 6. Test Collaboration

1. Open http://localhost:3001 in your browser
2. Enter a username and room name
3. Click "Connect"
4. Open another browser window/tab
5. Enter the same room name
6. Start editing - see real-time sync!

---

## Loro Demo Setup

### 1. Navigate to Loro Demo Directory

```bash
cd frontend/demos/loro-monaco
```

### 2. Install Dependencies

```bash
npm install
```

**Expected Install Time:** 1-2 minutes

**Dependencies Installed:**
- React 18
- TypeScript 5
- Vite 5
- Monaco Editor
- Loro CRDT (with WASM)
- Tailwind CSS
- Zustand
- WASM plugins

### 3. Configure WASM (Already Done)

The `vite.config.ts` is already configured with WASM support:

```typescript
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  // ... other config
});
```

### 4. Start Development Server

```bash
npm run dev
```

**Expected Output:**
```
  VITE v5.3.1  ready in 650 ms

  ➜  Local:   http://localhost:3002/
  ➜  Network: http://192.168.1.x:3002/
  ➜  press h to show help
```

**Note:** Loro demo doesn't require a separate server!

### 5. Test Features

1. Open http://localhost:3002 in your browser
2. Enter a username and document ID
3. Click "Initialize"
4. Test features:
   - ✅ Edit JSON Schema and GraphQL SDL
   - ✅ Click "History" to see version control
   - ✅ Export/import snapshots
   - ✅ Works offline!

---

## Production Build

### Yjs Demo

```bash
cd frontend/demos/yjs-monaco
npm run build
```

**Output:** `dist/` directory with optimized files

**Preview:**
```bash
npm run preview
```

### Loro Demo

```bash
cd frontend/demos/loro-monaco
npm run build
```

**Output:** `dist/` directory with optimized files

**Preview:**
```bash
npm run preview
```

---

## Deployment

### Deploy to Vercel

**Yjs Demo:**
```bash
cd frontend/demos/yjs-monaco
vercel
```

**Loro Demo:**
```bash
cd frontend/demos/loro-monaco
vercel
```

### Deploy to Netlify

**Yjs Demo:**
```bash
cd frontend/demos/yjs-monaco
netlify deploy --prod
```

**Loro Demo:**
```bash
cd frontend/demos/loro-monaco
netlify deploy --prod
```

### Deploy with Docker

**Yjs Demo:**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
docker build -t yjs-demo .
docker run -p 3001:80 yjs-demo
```

**Loro Demo:**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
docker build -t loro-demo .
docker run -p 3002:80 loro-demo
```

---

## Troubleshooting

### Issue: `npm install` fails

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Issue: WebSocket connection fails (Yjs)

**Symptoms:** "Disconnected" status in header

**Solutions:**
1. Ensure WebSocket server is running:
   ```bash
   npx y-websocket
   ```

2. Check port availability:
   ```bash
   lsof -i :1234  # macOS/Linux
   netstat -ano | findstr :1234  # Windows
   ```

3. Verify `.env` file:
   ```bash
   cat .env
   # Should show: VITE_WS_URL=ws://localhost:1234
   ```

4. Check firewall settings

### Issue: WASM fails to load (Loro)

**Symptoms:** Console error about WASM module

**Solutions:**
1. Verify Vite plugins are installed:
   ```bash
   npm list vite-plugin-wasm vite-plugin-top-level-await
   ```

2. Check `vite.config.ts` has plugins configured

3. Clear Vite cache:
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

4. Check browser compatibility (needs WASM support)

### Issue: Port already in use

**Symptoms:** `Error: listen EADDRINUSE: address already in use`

**Solutions:**

**macOS/Linux:**
```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>
```

**Windows:**
```powershell
# Find process
netstat -ano | findstr :3001

# Kill process
taskkill /PID <PID> /F
```

**Or change port:**
```javascript
// vite.config.ts
export default defineConfig({
  server: {
    port: 3003,  // Use different port
  },
});
```

### Issue: Changes not syncing (Yjs)

**Solutions:**
1. Ensure all clients are in the same room
2. Check WebSocket connection status
3. Open browser DevTools → Network → WS tab
4. Verify no errors in console

### Issue: Performance issues

**Solutions:**

**Yjs:**
```typescript
// Enable garbage collection
ydoc.gc = true;
```

**Loro:**
```typescript
// Periodically compact document
loroDoc.compact();
```

### Issue: TypeScript errors

**Solution:**
```bash
# Regenerate TypeScript declarations
npm run build
```

---

## Development Tips

### Hot Module Replacement (HMR)

Both demos support HMR. Changes to source files will update instantly without full reload.

### Browser DevTools

**Yjs:**
```javascript
// Access Yjs doc in console
window.ydoc
window.provider
```

**Loro:**
```javascript
// Access Loro doc in console
window.loroDoc
```

### Debugging

**Enable verbose logging:**

**Yjs:**
```typescript
provider.on('status', (event) => {
  console.log('Status:', event);
});

provider.on('sync', (isSynced) => {
  console.log('Synced:', isSynced);
});
```

**Loro:**
```typescript
loroDoc.subscribe((event) => {
  console.log('Loro event:', event);
});
```

### Performance Profiling

**React DevTools:**
1. Install React DevTools extension
2. Open DevTools → Components/Profiler
3. Record interactions
4. Analyze render times

**Chrome Performance:**
1. Open DevTools → Performance
2. Start recording
3. Perform actions
4. Stop and analyze

---

## Environment Variables

### Yjs Demo

`.env` file:
```bash
# WebSocket server URL
VITE_WS_URL=ws://localhost:1234

# Optional: Production WebSocket URL
VITE_WS_URL_PROD=wss://your-server.com
```

### Loro Demo

`.env` file (optional):
```bash
# Optional sync server URL
VITE_SYNC_URL=https://your-sync-server.com

# Optional feature flags
VITE_ENABLE_HISTORY=true
VITE_ENABLE_EXPORT=true
```

---

## Next Steps

After setup:

1. ✅ Read the [Comparison Guide](./COMPARISON.md)
2. ✅ Review individual demo READMEs
3. ✅ Test both demos with your use cases
4. ✅ Integrate with Rust converter (Phase 3B next steps)
5. ✅ Deploy to staging environment
6. ✅ Gather user feedback
7. ✅ Choose final implementation
8. ✅ Deploy to production

---

## Getting Help

### Documentation
- [Yjs Demo README](./demos/yjs-monaco/README.md)
- [Loro Demo README](./demos/loro-monaco/README.md)
- [Comparison Guide](./COMPARISON.md)

### Community
- **Yjs**: [Discord](https://discord.gg/yjs) | [Discussions](https://discuss.yjs.dev/)
- **Loro**: [Discord](https://discord.gg/loro-dev) | [GitHub Issues](https://github.com/loro-dev/loro/issues)

### Issues
- Project issues: [GitHub Issues](https://github.com/JJediny/json-schema-x-graphql/issues)

---

## Success Checklist

- [ ] Node.js 18+ installed
- [ ] Repository cloned
- [ ] Yjs demo dependencies installed
- [ ] Yjs WebSocket server running
- [ ] Yjs demo accessible at http://localhost:3001
- [ ] Yjs real-time sync working
- [ ] Loro demo dependencies installed
- [ ] Loro demo accessible at http://localhost:3002
- [ ] Loro time travel working
- [ ] Both demos tested with multiple users
- [ ] Production builds successful
- [ ] Deployment tested (optional)

Once all items are checked, you're ready to evaluate and choose your preferred solution!

---

**Happy coding! 🚀**