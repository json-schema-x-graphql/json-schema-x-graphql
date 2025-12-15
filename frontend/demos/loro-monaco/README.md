# Loro CRDT + Monaco Editor Demo

This demo showcases real-time collaborative editing of JSON Schema and GraphQL SDL using [Loro CRDT](https://loro.dev/) with Monaco Editor, featuring built-in time travel capabilities.

## Features

- ✨ **Local-First Collaboration**: Peer-to-peer collaboration without a central server
- 🕐 **Time Travel**: Navigate through document history and restore any version
- 🔄 **Bidirectional Conversion**: Convert between JSON Schema and GraphQL SDL
- 💾 **Offline Support**: Work offline and sync when reconnected
- 🎨 **Monaco Editor**: Full-featured code editor with syntax highlighting and validation
- 🖼️ **Visual GraphQL Editor**: Interactive graph visualization using graphql-editor
- 📦 **Snapshot Export/Import**: Save and load document states
- ⚡ **High Performance**: Efficient CRDT implementation in Rust/WASM
- 📊 **Three-Panel Layout**: JSON Schema, GraphQL Code, and GraphQL Visual views

## Architecture

### Loro CRDT (Conflict-Free Replicated Data Type)

Loro is a next-generation CRDT library built with Rust and compiled to WebAssembly. Key features:

- **Local-First**: No server required for basic operations
- **Time Travel**: Built-in version control with checkout capability
- **Rich Types**: Supports Text, List, Map, Tree, and more
- **Fast**: Optimized Rust implementation compiled to WASM
- **Small Memory Footprint**: Efficient memory usage
- **Rich Text**: Collaborative rich text editing support

### Components

```
src/
├── App.tsx                   # Main application component
├── MonacoEditor.tsx          # Monaco editor with Loro binding
├── GraphQLVisualEditor.tsx   # Visual GraphQL editor with graphql-editor
├── store.ts                  # Zustand store for state management
├── index.css                 # Tailwind CSS styles
└── main.tsx                  # Application entry point
```

## Installation

```bash
npm install
```

Create a local env file (optional, defaults shown):

```bash
cp .env.example .env
```

## Running the Demo

### Development Server

```bash
npm run dev
```

The demo will open at `http://localhost:3002`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## How It Works

### 1. Loro Document Structure

```typescript
import { Loro } from 'loro-crdt';

// Create a new Loro document
const doc = new Loro();
doc.setPeerId(BigInt(Date.now()));

// Get text containers
const jsonText = doc.getText('jsonSchema');
const graphqlText = doc.getText('graphqlSdl');
```

Two shared text types store the JSON Schema and GraphQL SDL content.

### 2. Synchronization

Loro uses a peer-to-peer synchronization model:

```typescript
// Export updates
const updates = doc.exportFrom(lastVersion);

// Send to peers via WebRTC, WebSocket, or any transport

// Import updates from peers
doc.import(updatesFromPeer);
```

### 3. Monaco Binding

```typescript
// Subscribe to Loro changes
doc.subscribe((event) => {
  const content = loroText.toString();
  editor.setValue(content);
});

// Apply Monaco changes to Loro
editor.onDidChangeModelContent((e) => {
  for (const change of e.changes) {
    loroText.delete(change.rangeOffset, change.rangeLength);
    loroText.insert(change.rangeOffset, change.text);
  }
});
```

### 4. Time Travel

```typescript
// Get document history
const versions = doc.oplogVersion();

// Checkout a specific version
doc.checkout(frontiers);

// Return to latest
doc.checkoutToLatest();
```

### 4. Visual GraphQL Editor

```typescript
import { GraphQLEditor } from 'graphql-editor';

<GraphQLVisualEditor
  value={graphqlSdl}
  loroDoc={loroDoc}
  textKey="graphqlSdl"
/>
```

Provides interactive graph visualization of GraphQL schemas with:
- Node-based type visualization
- Relationship mapping
- Real-time collaborative editing
- Schema validation and error display

## Visual GraphQL Editor Features

The demo includes `graphql-editor` for visual schema representation:

### Benefits
- **Interactive Graph**: See your schema as a connected graph
- **Type Relationships**: Visualize connections between types
- **Live Updates**: Graph updates in real-time as you edit
- **Error Highlighting**: Visual indicators for schema errors
- **Multi-View**: Switch between code, visual, and split views

### Three-Panel Layout
1. **Left Panel**: JSON Schema editor (Monaco)
2. **Center Panel**: GraphQL SDL code editor (Monaco)
3. **Right Panel**: GraphQL SDL visual editor (graphql-editor)

All three panels sync in real-time via Loro!

## Loro Advantages

### ✅ Pros

1. **True Local-First**: No server required for basic operation
2. **Built-in Time Travel**: Navigate version history natively
3. **High Performance**: Rust implementation compiled to WASM
4. **Rich Types**: More data structures than Yjs (Tree, Movable List, etc.)
5. **Memory Efficient**: Optimized for low memory usage
6. **Type Safety**: Written in Rust with excellent TypeScript bindings
7. **Snapshot Support**: Export/import complete document state
8. **Better Conflict Resolution**: Advanced CRDT algorithms
9. **Visual Editing**: Integrates seamlessly with graphql-editor

### ⚠️ Considerations

1. **Newer**: Less mature than Yjs (but rapidly evolving)
2. **WASM Required**: Larger initial bundle (~150KB)
3. **Smaller Ecosystem**: Fewer ready-made bindings
4. **Learning Curve**: CRDT concepts + Loro-specific APIs
5. **Network Layer**: Must implement your own sync protocol
6. **Bundle Size**: Larger with WASM + graphql-editor (~300KB total)

## Comparison: Loro vs Yjs

| Feature | Loro | Yjs |
|---------|------|-----|
| **Maturity** | Newer (2023+) | Very mature (2015+) |
| **Performance** | Excellent (Rust/WASM) | Excellent (JavaScript) |
| **Bundle Size** | ~150KB (WASM) | ~60KB (gzipped) |
| **Language** | Rust → WASM | JavaScript |
| **Time Travel** | Built-in, first-class | Via snapshots |
| **Rich Types** | Text, List, Map, Tree, Movable | Text, Array, Map, XML |
| **Bindings** | Growing | Many (Monaco, Quill, etc.) |
| **Memory Usage** | Very efficient | Efficient |
| **Community** | Growing | Large |
| **Network** | DIY | y-websocket, y-webrtc |
| **Persistence** | Snapshot-based | Provider-based |
| **Visual Editor** | ✅ graphql-editor | ✅ graphql-editor |

## Use Cases

### When to Choose Loro

- ✅ Building local-first applications
- ✅ Need built-in time travel/version control
- ✅ Want cutting-edge CRDT technology
- ✅ Performance is critical
- ✅ Building from scratch (no legacy constraints)
- ✅ Need rich data structures (trees, movable lists)

### When to Choose Yjs

- ✅ Need mature, battle-tested solution
- ✅ Want ready-made bindings (Monaco, Quill, ProseMirror)
- ✅ Prefer JavaScript-only stack
- ✅ Need smaller bundle size
- ✅ Want managed hosting options (Liveblocks, etc.)
- ✅ Large community and ecosystem

## Implementing Peer-to-Peer Sync

### WebRTC Example

```typescript
// Peer A: Export updates
const updates = loroDoc.exportFrom(undefined);
dataChannel.send(updates);

// Peer B: Import updates
dataChannel.onmessage = (event) => {
  loroDoc.import(new Uint8Array(event.data));
};
```

### WebSocket Example

```typescript
// Client: Send updates to server
ws.send(loroDoc.exportFrom(lastVersion));

// Server: Broadcast to all clients
server.on('message', (updates) => {
  server.broadcast(updates);
});

// Client: Receive updates
ws.onmessage = (event) => {
  loroDoc.import(new Uint8Array(event.data));
};
```

## Time Travel Features

### Checkout Version

Navigate to any point in history:

```typescript
const history = loroDoc.oplogVersion();
const version = history[5]; // Get 5th version
loroDoc.checkout(version);
```

### Return to Latest

```typescript
loroDoc.checkoutToLatest();
```

### Branch from History

```typescript
// Checkout old version
loroDoc.checkout(oldVersion);

// Make changes (creates new branch)
loroDoc.getText('content').insert(0, 'New content');
```

## Export/Import

### Export Snapshot

```typescript
const snapshot = loroDoc.exportSnapshot();
// Save to file, localStorage, or send to server
```

### Import Snapshot

```typescript
loroDoc.import(snapshot);
```

### Export Updates Only

```typescript
// Export changes since last sync
const updates = loroDoc.exportFrom(lastSyncVersion);
```

## Performance Optimization

### 1. Batch Updates

```typescript
loroDoc.transact(() => {
  text.insert(0, 'Multiple');
  text.insert(8, ' changes');
  text.delete(0, 5);
});
```

### 2. Selective Subscriptions

```typescript
// Subscribe to specific containers
const unsubscribe = loroDoc.subscribe((event) => {
  if (event.target === 'jsonSchema') {
    // Only handle JSON schema changes
  }
});
```

### 3. Memory Management

```typescript
// Periodically compact history
loroDoc.compact();
```

## Production Deployment

### Sync Server Options

Since Loro doesn't provide a built-in sync server, you can:

1. **WebSocket Server**: Custom Node.js server for broadcasting updates
2. **WebRTC**: Direct peer-to-peer (no server needed)
3. **Cloudflare Durable Objects**: Edge-based sync
4. **PartyKit**: Serverless WebSocket platform
5. **Custom REST API**: Snapshot-based sync

### Example Sync Server (Node.js + WebSocket)

```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const rooms = new Map();

wss.on('connection', (ws, req) => {
  const roomId = new URL(req.url, 'http://localhost').searchParams.get('room');
  
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId).add(ws);

  ws.on('message', (data) => {
    // Broadcast to all peers in room
    rooms.get(roomId).forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });

  ws.on('close', () => {
    rooms.get(roomId).delete(ws);
  });
});
```

## Troubleshooting

### WASM Loading Issues

Ensure your build tool supports WASM:

```javascript
// vite.config.ts
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default {
  plugins: [wasm(), topLevelAwait()],
};
```

### CORS Headers

For WASM to work, you may need these headers:

```javascript
headers: {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}
```

### Memory Leaks

Always clean up subscriptions:

```typescript
const unsubscribe = loroDoc.subscribe(handler);
// Later...
unsubscribe();
```

## Advanced Features

### Movable Lists

```typescript
const list = loroDoc.getMovableList('tasks');
list.push('Task 1');
list.push('Task 2');
list.move(0, 1); // Move first item to second position
```

### Tree Structures

```typescript
const tree = loroDoc.getTree('outline');
const root = tree.createNode();
const child = root.createNode();
```

### Rich Text

```typescript
const text = loroDoc.getText('richText');
text.insert(0, 'Hello');
text.mark(0, 5, 'bold', true);
```

## Learn More

- [Loro Documentation](https://loro.dev/docs)
- [Loro GitHub](https://github.com/loro-dev/loro)
- [CRDT Fundamentals](https://crdt.tech/)
- [Local-First Software](https://www.inkandswitch.com/local-first/)

## Benchmarks

Loro performance characteristics:

- **Insertion**: ~100k ops/sec
- **Memory**: ~50 bytes per operation
- **Sync Time**: Sub-millisecond for typical edits
- **Bundle Size**: ~150KB (WASM + JS)

## Contributing

To add features or fix bugs:

1. Fork the repository
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT