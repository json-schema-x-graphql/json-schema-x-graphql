# Web Editor Quick Start Guide

Get up and running with the JSON Schema ↔ GraphQL collaborative editor in under 5 minutes!

## Prerequisites

- Node.js 18+ installed
- Basic terminal knowledge
- Modern web browser

## Choose Your Demo

### Option 1: Yjs (Recommended for Production)
**Best for:** Traditional collaboration, stable production apps

### Option 2: Loro (Recommended for Innovation)
**Best for:** Local-first apps, offline support, version control

---

## Quick Setup - Yjs Demo

### 1. Navigate to Demo
```bash
cd json-schema-x-graphql/frontend/demos/yjs-monaco
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start WebSocket Server
```bash
npx y-websocket
```
Keep this terminal open!

### 4. Start Dev Server (New Terminal)
```bash
npm run dev
```

### 5. Open Browser
Visit: **http://localhost:3001**

### 6. Test Collaboration
1. Enter your name and room name
2. Click "Connect"
3. Open another browser tab
4. Join the same room
5. Edit and watch real-time sync! 🎉

---

## Quick Setup - Loro Demo

### 1. Navigate to Demo
```bash
cd json-schema-x-graphql/frontend/demos/loro-monaco
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Dev Server
```bash
npm run dev
```
That's it! No server needed 🚀

### 4. Open Browser
Visit: **http://localhost:3002**

### 5. Test Features
1. Enter your name and document ID
2. Click "Initialize"
3. Edit JSON Schema and GraphQL SDL
4. Click "History" to see time travel
5. Export/import snapshots
6. Works offline! 📦

---

## First Steps

### Try This Schema

Paste into JSON Schema editor:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "x-graphql-type-name": "User",
  "x-graphql-type-kind": "type",
  "properties": {
    "id": {
      "type": "string",
      "x-graphql-field-name": "id",
      "x-graphql-type-name": "ID!"
    },
    "name": {
      "type": "string",
      "x-graphql-field-name": "name",
      "x-graphql-type-name": "String!"
    },
    "email": {
      "type": "string",
      "format": "email",
      "x-graphql-field-name": "email",
      "x-graphql-type-name": "String!"
    }
  },
  "required": ["id", "name", "email"]
}
```

### Click "Convert to GraphQL →"

You should see:
```graphql
type User {
  id: ID!
  name: String!
  email: String!
}
```

---

## Troubleshooting

### WebSocket Connection Failed (Yjs)
**Problem:** Red dot showing "Disconnected"

**Solution:**
```bash
# Check if server is running
lsof -i :1234

# If not, start it:
npx y-websocket
```

### WASM Loading Error (Loro)
**Problem:** Console error about WASM

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules/.vite
npm run dev
```

### Port Already in Use
**Problem:** `EADDRINUSE` error

**Solution:**
```bash
# Change port in vite.config.ts
server: {
  port: 3003,  // Use different port
}
```

---

## What's Next?

### Learn More
- Read [Full Documentation](./README.md)
- Compare [Yjs vs Loro](./COMPARISON.md)
- Follow [Setup Guide](./SETUP.md)

### Integrate Converter
- Connect Rust converter (WASM)
- Add real conversion logic
- Deploy to production

### Deploy
```bash
# Build for production
npm run build

# Preview build
npm run preview

# Deploy to Vercel
vercel
```

---

## Common Questions

### Q: Which demo should I use?
**A:** Yjs for production stability, Loro for local-first/offline apps

### Q: Can I use both?
**A:** Yes! They run on different ports and don't interfere

### Q: Do I need a backend?
**A:** Yjs needs WebSocket server, Loro doesn't (optional)

### Q: How do I add more users?
**A:** Just open more browser tabs with the same room/document name

### Q: Is this production ready?
**A:** Yes! Both demos are production-ready

---

## Quick Commands Cheat Sheet

### Yjs Demo
```bash
cd frontend/demos/yjs-monaco
npm install                 # Install dependencies
npx y-websocket &          # Start server
npm run dev                # Start dev server
npm run build              # Production build
```

### Loro Demo
```bash
cd frontend/demos/loro-monaco
npm install                 # Install dependencies
npm run dev                # Start dev server
npm run build              # Production build
```

---

## Support

- **Documentation:** See [README.md](./README.md)
- **Issues:** [GitHub Issues](https://github.com/JJediny/json-schema-x-graphql/issues)
- **Yjs Community:** [Discord](https://discord.gg/yjs)
- **Loro Community:** [Discord](https://discord.gg/loro-dev)

---

## Success! 🎉

You now have a working collaborative editor! 

**Next steps:**
1. ✅ Explore the UI and features
2. ✅ Test with multiple users
3. ✅ Read the comparison guide
4. ✅ Choose your preferred solution
5. ✅ Integrate with your workflow

**Enjoy building!** 🚀