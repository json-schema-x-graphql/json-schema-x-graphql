# visual-json (vendored)

A lightweight collapsible JSON tree viewer and editor — React component vendored in-repo to avoid an external npm dependency.

## Why vendored?

The original `visual-json` npm package provides an interactive JSON tree. By vendoring the source here we:

- Eliminate version-management overhead for an external package
- Can extend or diverge the component to match our dark-theme design tokens
- Keep the API stable across major npm updates

## Usage

```tsx
import { JsonView, JsonEditor } from "visual-json";

// Read-only tree (collapsed at depth 2 by default)
<JsonView data={myJsonObject} name="schema" collapsed={2} />

// Editable tree
<JsonEditor
  data={myJsonObject}
  name="schema"
  onChange={(path, newValue) => {
    console.log("Changed", path, "to", newValue);
  }}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `unknown` | required | JSON value to display |
| `name` | `string` | `"root"` | Root node label |
| `collapsed` | `number \| boolean` | `2` | Collapse depth (`0` = all, `Infinity` = none) |
| `editable` | `boolean` | `false` | Enable inline editing |
| `onChange` | `(path, value) => void` | — | Called after editing a leaf value |
| `className` | `string` | — | CSS class for the wrapper |
| `indentWidth` | `number` | `16` | Pixels per indent level |

## Exports

- `JsonView` — read-only collapsible tree (default export)
- `JsonEditor` — editable tree (re-exports `JsonView` with `editable` prop)

## Integration in subgraph-composer

Add `external/visual-json` back to `pnpm-workspace.yaml`, then:

```json
// frontend/subgraph-composer/package.json
{
  "dependencies": {
    "visual-json": "workspace:*"
  }
}
```

Add a Vite alias (optional, for tree-shaking):

```ts
// vite.config.ts
resolve: {
  alias: {
    "visual-json": path.resolve("../../external/visual-json/src/index.tsx"),
  },
},
```
