# Yjs + Monaco Editor Demo

This demo showcases real-time collaborative editing of JSON Schema and GraphQL SDL using [Yjs](https://yjs.dev/) with Monaco Editor.

## Features

- ✨ **Real-time Collaboration**: Multiple users can edit the same document simultaneously
- 🎯 **Awareness**: See other users' cursors and selections in real-time
- 🔄 **Bidirectional Conversion**: Convert between JSON Schema and GraphQL SDL
- 💾 **Automatic Sync**: Changes are automatically synchronized across all connected clients
- 🎨 **Monaco Editor**: Full-featured code editor with syntax highlighting and validation
- 🖼️ **Visual GraphQL Editor**: Interactive graph visualization using graphql-editor
- 🔌 **WebSocket Support**: Uses WebSocket for low-latency real-time updates
- 📊 **Three-Panel Layout**: JSON Schema, GraphQL Code, and GraphQL Visual views

## Architecture

### Yjs (Conflict-Free Replicated Data Type)

Yjs is a CRDT implementation that enables real-time collaboration without a central server managing conflict resolution. Key features:

- **Shared Types**: Uses `Y.Text` for editor content
- **Awareness Protocol**: Tracks user presence and cursor positions
- **WebSocket Provider**: Connects to a WebSocket server for synchronization
- **Monaco Binding**: `y-monaco` package provides seamless integration with Monaco Editor

### Components

```
src/
├── App.tsx                   # Main application component
├── MonacoEditor.tsx          # Monaco editor with Yjs binding
├── GraphQLVisualEditor.tsx   # Visual GraphQL editor with graphql-editor
├── store.ts                  # Zustand store for state management
├── index.css                 # Tailwind CSS styles
└── main.tsx                  # Application entry point
```

## Installation

```bash
npm install
```

## Running the Demo

### 1. Start the WebSocket Server (Required for Collaboration)

You need a Yjs WebSocket server running for real-time collaboration. You have two options:

#### Option A: Use y-websocket server

```bash
npx y-websocket
```

This starts a server on `ws://localhost:1234` by default.

#### Option B: Custom server with persistence

```bash
npm install -g y-websocket-server
y-websocket-server --port 1234
```

### 2. Start the Development Server

```bash
npm run dev
```

The demo will open at `http://localhost:3001`

### 3. Test Collaboration

- Open the app in multiple browser windows or tabs
- Enter the same room name in each instance
- Start editing - you'll see changes synchronized in real-time!

## Configuration

### Environment Variables

Create a `.env` file:

```env
VITE_WS_URL=ws://localhost:1234
```

### Connection Settings

- **Room Name**: Determines which document users collaborate on
- **Username**: Displayed to other users in the session
- **Solo Mode**: Works without WebSocket connection for single-user editing

## How It Works

### 1. Yjs Document Structure

```typescript
const ydoc = new Y.Doc();
const jsonText = ydoc.getText('jsonSchema');
const graphqlText = ydoc.getText('graphqlSdl');
```

Two shared text types store the JSON Schema and GraphQL SDL content.

### 2. WebSocket Provider

```typescript
const provider = new WebsocketProvider(
  'ws://localhost:1234',
  'room-name',
  ydoc
);
```

Connects to the WebSocket server and syncs changes.

### 3. Monaco Binding

```typescript
const binding = new MonacoBinding(
  ytext,
  editor.getModel()!,
  new Set([editor]),
  provider.awareness
);
```

Binds Yjs text to Monaco editor model with awareness.

### 4. Awareness (User Presence)

```typescript
provider.awareness.setLocalStateField('user', {
  id: 'user-123',
  name: 'Alice',
  color: '#FF0000',
});
```

Broadcasts user information to all connected peers.

### 5. Visual GraphQL Editor

```typescript
import { GraphQLEditor } from 'graphql-editor';

<GraphQLVisualEditor
  value={graphqlSdl}
  ydoc={ydoc}
  provider={provider}
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

All three panels sync in real-time via Yjs!

## Yjs Advantages

### ✅ Pros

1. **No Central Authority**: CRDTs resolve conflicts automatically
2. **Offline Support**: Changes can be made offline and synced later
3. **Performance**: Efficient delta synchronization
4. **Proven**: Used in production by many applications
5. **Rich Ecosystem**: Bindings for Monaco, Quill, ProseMirror, etc.
6. **Simple Integration**: Easy to add to existing editors
7. **Visual Editing**: Integrates seamlessly with graphql-editor

### ⚠️ Considerations

1. **Document Size**: History grows over time (can be mitigated with GC)
2. **Learning Curve**: CRDT concepts require understanding
3. **Server Required**: Need WebSocket server for synchronization
4. **Complex State**: Debugging can be challenging
5. **Bundle Size**: Larger with graphql-editor (~300KB additional)

## Comparison with Loro

| Feature | Yjs | Loro |
|---------|-----|------|
| Maturity | Very mature, widely used | Newer, growing |
| Performance | Excellent | Excellent (claims better) |
| Bundle Size | ~60KB (gzipped) | ~150KB (WASM) |
| TypeScript | Yes | Yes |
| WASM | Optional | Required |
| Bindings | Many (Monaco, Quill, etc.) | Growing |
| Time Travel | Via snapshots | Built-in |
| Community | Large | Growing |
| Visual Editor | ✅ graphql-editor | ✅ graphql-editor |

## Production Deployment

### WebSocket Server Options

1. **Self-hosted**: Deploy y-websocket server
2. **Liveblocks**: Managed Yjs hosting
3. **Partykit**: Serverless WebSocket platform
4. **Cloudflare Durable Objects**: Edge-based sync

### Scaling Considerations

- Use Redis for multi-server synchronization
- Implement authentication and authorization
- Add rate limiting to prevent abuse
- Monitor document sizes and implement garbage collection
- Set up document persistence (save to database)

## Example Production Setup

```typescript
// With authentication
const provider = new WebsocketProvider(
  'wss://your-server.com',
  roomName,
  ydoc,
  {
    connect: false,
  }
);

// Authenticate first
const token = await getAuthToken();
provider.connect(token);

// Handle disconnections
provider.on('status', ({ status }) => {
  if (status === 'disconnected') {
    // Retry logic or show offline UI
  }
});
```

## Troubleshooting

### WebSocket Connection Fails

- Ensure WebSocket server is running
- Check firewall/network settings
- Verify `VITE_WS_URL` is correct

### Changes Not Syncing

- Confirm all users are in the same room
- Check browser console for errors
- Verify WebSocket connection status

### Performance Issues

- Monitor document size
- Implement periodic garbage collection
- Use `ydoc.gc = true` to enable GC

## Learn More

- [Yjs Documentation](https://docs.yjs.dev/)
- [y-monaco GitHub](https://github.com/yjs/y-monaco)
- [y-websocket GitHub](https://github.com/yjs/y-websocket)
- [CRDT Explanation](https://crdt.tech/)

## License

MIT