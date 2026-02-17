# Visual GraphQL Editor Guide

This guide covers the integration of `graphql-editor` for visual GraphQL schema representation in both Yjs and Loro demos.

## Overview

Both demos now feature a **three-panel layout**:

1. **Left Panel**: JSON Schema editor (Monaco)
2. **Center Panel**: GraphQL SDL code editor (Monaco)
3. **Right Panel**: GraphQL SDL visual editor (graphql-editor)

All three panels are synchronized in real-time via CRDT (Yjs or Loro).

---

## What is graphql-editor?

[graphql-editor](https://github.com/graphql-editor/graphql-editor) is an interactive visual editor for GraphQL schemas that provides:

- 📊 **Node-based visualization** - See types, interfaces, and relationships as a graph
- 🔗 **Relationship mapping** - Visual connections between types
- ✏️ **Interactive editing** - Click to edit, drag to reorganize
- ✅ **Schema validation** - Real-time error highlighting
- 🎨 **Customizable themes** - Dark mode support
- 📱 **Responsive design** - Works on desktop and tablet

---

## Features in Our Implementation

### Real-Time Synchronization

Changes in any panel are instantly reflected in all others:

```
JSON Schema Editor → CRDT → GraphQL Code Editor → CRDT → Visual Editor
      ↑                                                          ↓
      └──────────────────────────────────────────────────────────┘
```

### Three Viewing Modes

Each demo includes a view mode selector:

- **Code**: Show only the code editor
- **Visual**: Show only the visual graph
- **Split**: Show both side-by-side (default)

### Dark Theme

The visual editor is configured with a dark theme matching the rest of the UI:

```typescript
theme={{
  mode: 'dark',
  colors: {
    background: {
      mainDark: '#1e1e1e',
      mainMiddle: '#2d2d30',
      mainLight: '#3e3e42',
    },
    text: {
      default: '#d4d4d4',
      active: '#ffffff',
      disabled: '#858585',
    },
    primary: {
      default: '#569cd6',
      hover: '#4a8cc4',
    },
  },
}}
```

---

## How It Works

### Component Architecture

```typescript
// GraphQLVisualEditor.tsx
export const GraphQLVisualEditor: React.FC<Props> = ({
  value,
  onChange,
  ydoc, // Yjs document (Yjs demo)
  loroDoc, // Loro document (Loro demo)
  textKey,
  readOnly,
}) => {
  // Sync with CRDT
  // Render GraphQLEditor
};
```

### Synchronization Flow

#### Yjs Demo

```typescript
// Subscribe to Yjs changes
ytext.observe(() => {
  const yjsContent = ytext.toString();
  setSchema({ code: yjsContent, libraries: "" });
});

// Update Yjs on editor changes
const handleSchemaChange = (newSchema) => {
  ydoc.transact(() => {
    ytext.delete(0, ytext.length);
    ytext.insert(0, newSchema.code);
  });
};
```

#### Loro Demo

```typescript
// Subscribe to Loro changes
loroDoc.subscribe((event) => {
  const loroContent = loroText.toString();
  setSchema({ code: loroContent, libraries: "" });
});

// Update Loro on editor changes
const handleSchemaChange = (newSchema) => {
  loroText.delete(0, currentText.length);
  loroText.insert(0, newSchema.code);
};
```

---

## Visual Editor Features

### 1. Type Visualization

Each GraphQL type appears as a node in the graph:

- **Types** - Blue nodes
- **Interfaces** - Purple nodes
- **Enums** - Orange nodes
- **Inputs** - Green nodes
- **Unions** - Yellow nodes

### 2. Relationship Lines

Connections show relationships:

- **Solid lines** - Field types
- **Dashed lines** - Interface implementations
- **Thick lines** - Required fields

### 3. Interactive Editing

Click any node to:

- Edit field names
- Change field types
- Add/remove fields
- Modify descriptions

### 4. Schema Validation

Errors appear with visual indicators:

- ❌ Red outline on invalid nodes
- ⚠️ Warning icons for issues
- Hover for error details

### 5. Navigation

- **Pan**: Click and drag background
- **Zoom**: Mouse wheel or pinch
- **Select**: Click nodes
- **Multi-select**: Cmd/Ctrl + click

---

## Usage Examples

### Basic Schema Visualization

Input this schema:

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  content: String
  author: User!
}
```

Visual editor shows:

- Two nodes (User, Post)
- Connection from User.posts → Post
- Connection from Post.author → User
- Field types and nullability indicators

### Federation Schema

Input this schema:

```graphql
type Product @key(fields: "id") {
  id: ID!
  name: String!
  price: Float!
}

extend type Query {
  product(id: ID!): Product
}
```

Visual editor shows:

- Product node with @key directive indicator
- Query node with product field
- Connection showing relationship

### Complex Schema

Input this schema:

```graphql
interface Node {
  id: ID!
}

type User implements Node {
  id: ID!
  name: String!
  role: Role!
}

enum Role {
  ADMIN
  USER
  GUEST
}

union SearchResult = User | Product
```

Visual editor shows:

- Interface node (Node)
- Type node (User) with dashed line to Node
- Enum node (Role)
- Union node (SearchResult) with connections

---

## Benefits for Different Users

### For Developers

- **Quick Overview**: See entire schema structure at a glance
- **Type Discovery**: Find types and their relationships visually
- **Refactoring**: Easily identify breaking changes
- **Documentation**: Visual representation serves as live docs

### For Non-Technical Users

- **Accessibility**: No need to read code
- **Understanding**: See data relationships intuitively
- **Communication**: Discuss schema with stakeholders
- **Validation**: Spot structural issues visually

### For Teams

- **Collaboration**: Multiple users see the same visual graph
- **Alignment**: Everyone sees the current schema state
- **Discussion**: Point to specific nodes during meetings
- **Onboarding**: New team members understand faster

---

## Configuration Options

### Route State

Control which views are available:

```typescript
routeState={{
  code: true,      // Show code tab
  diff: false,     // Hide diff tab
  errors: true,    // Show errors tab
  live: false,     // Hide live tab
  relation: true,  // Show relations tab
}}
```

### Theme Customization

Both demos use dark theme, but you can customize:

```typescript
theme={{
  mode: 'dark',
  colors: {
    background: {
      mainDark: '#your-color',
      mainMiddle: '#your-color',
      mainLight: '#your-color',
    },
    primary: {
      default: '#your-brand-color',
    },
  },
}}
```

### Read-Only Mode

Disable editing for viewing only:

```typescript
<GraphQLVisualEditor
  value={graphqlSdl}
  readonly={true}
/>
```

---

## Performance Considerations

### Bundle Size

Adding graphql-editor increases bundle size:

- **graphql-editor**: ~250KB (gzipped)
- **graphql**: ~50KB (gzipped)
- **styled-components**: ~50KB (gzipped)
- **Total addition**: ~350KB

### Optimization Tips

1. **Code Splitting**: Lazy load visual editor

```typescript
const GraphQLVisualEditor = lazy(() => import("./GraphQLVisualEditor"));
```

2. **Conditional Loading**: Only load when needed

```typescript
{showVisualEditor && (
  <Suspense fallback={<Loading />}>
    <GraphQLVisualEditor />
  </Suspense>
)}
```

3. **Debounce Updates**: Reduce sync frequency

```typescript
const debouncedUpdate = useMemo(() => debounce(handleUpdate, 300), []);
```

---

## Troubleshooting

### Issue: Visual editor doesn't update

**Cause**: Synchronization not working

**Solution**: Check CRDT document is initialized

```typescript
if (!ydoc || !loroDoc) {
  console.log("CRDT not initialized");
}
```

### Issue: Invalid schema error

**Cause**: GraphQL syntax error in schema

**Solution**: Check errors panel in visual editor

### Issue: Performance slow with large schemas

**Cause**: Too many nodes rendering

**Solution**:

- Enable virtualization
- Limit visible nodes
- Use code view for large schemas

### Issue: Theme colors not applying

**Cause**: Styled-components conflict

**Solution**: Ensure styled-components version matches

```bash
npm list styled-components
# Should show single version
```

---

## Keyboard Shortcuts

### Visual Editor

- **Ctrl/Cmd + Z**: Undo
- **Ctrl/Cmd + Shift + Z**: Redo
- **Delete/Backspace**: Delete selected node
- **Ctrl/Cmd + C**: Copy node
- **Ctrl/Cmd + V**: Paste node
- **Escape**: Deselect all

### Code Editor (Monaco)

- **Ctrl/Cmd + F**: Find
- **Ctrl/Cmd + H**: Replace
- **Ctrl/Cmd + /**: Toggle comment
- **Alt + Shift + F**: Format

---

## Best Practices

### 1. Use Visual Editor For

✅ Understanding schema structure
✅ Discussing with non-technical stakeholders
✅ Finding type relationships
✅ Spotting circular dependencies
✅ Schema reviews and audits

### 2. Use Code Editor For

✅ Detailed editing
✅ Adding directives
✅ Writing complex types
✅ Copy/paste operations
✅ Bulk changes

### 3. Use Both Together

✅ Edit in code, verify in visual
✅ Explore in visual, refine in code
✅ Present in visual, implement in code

---

## Advanced Usage

### Custom Node Rendering

Extend graphql-editor with custom node styles:

```typescript
// Future enhancement
const customNodeRenderer = (node) => {
  // Add custom badges, colors, etc.
};
```

### Export Graph as Image

Add screenshot capability:

```typescript
const exportGraph = () => {
  // Use html-to-image or similar
  html2canvas(graphElement).then((canvas) => {
    const link = document.createElement("a");
    link.download = "schema-graph.png";
    link.href = canvas.toDataURL();
    link.click();
  });
};
```

### Integration with Schema Registry

Connect to schema registry for versioning:

```typescript
const loadSchemaVersion = async (version) => {
  const schema = await registry.getSchema(version);
  setGraphqlSdl(schema);
};
```

---

## Comparison: Code vs Visual

| Aspect              | Code Editor         | Visual Editor        |
| ------------------- | ------------------- | -------------------- |
| **Precision**       | High - exact syntax | Medium - abstracted  |
| **Speed**           | Fast for experts    | Fast for exploration |
| **Learning Curve**  | Steep               | Gentle               |
| **Error Detection** | Syntax-based        | Structure-based      |
| **Refactoring**     | Manual              | Visual guidance      |
| **Documentation**   | Written             | Self-documenting     |
| **Accessibility**   | Technical users     | All users            |
| **Collaboration**   | PR-based            | Real-time visual     |

---

## Future Enhancements

Planned features for visual editor integration:

- [ ] Diff visualization for schema changes
- [ ] Custom color coding for different namespaces
- [ ] Minimap for large schemas
- [ ] Search and filter nodes
- [ ] Export graph as PNG/SVG
- [ ] Schema comparison side-by-side
- [ ] Collaborative cursors in visual view
- [ ] Guided schema creation wizard
- [ ] AI-powered schema suggestions
- [ ] Integration with GraphQL playground

---

## Resources

### Documentation

- [graphql-editor GitHub](https://github.com/graphql-editor/graphql-editor)
- [graphql-editor Demo](https://graphqleditor.com/)
- [GraphQL Spec](https://spec.graphql.org/)

### Examples

- See `demos/yjs-monaco/src/GraphQLVisualEditor.tsx`
- See `demos/loro-monaco/src/GraphQLVisualEditor.tsx`
- See `demos/*/src/App.tsx` for integration

### Community

- [graphql-editor Discord](https://discord.gg/graphql-editor)
- [GraphQL Foundation](https://graphql.org/)

---

## Conclusion

The visual GraphQL editor makes schema design accessible to everyone:

- **Developers**: Faster understanding and refactoring
- **Designers**: Visual schema exploration
- **Product Managers**: Clear data structure view
- **Stakeholders**: Easy schema discussions

Combined with real-time CRDT synchronization, it creates a powerful collaborative schema design experience.

**Try it now**: Open either demo and see your GraphQL schemas come to life! 🚀

---

_For support with the visual editor, refer to the main demo READMEs or open an issue on GitHub._
