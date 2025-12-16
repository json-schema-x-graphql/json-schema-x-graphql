# Quick Start Guide - Subgraph Composer

## What's New

✨ **The app now loads with 3 template schemas pre-configured!**

## How to Use

### 1. Open the App
```
http://localhost:5175/
```

### 2. You'll See
- **Left sidebar**: 3 pre-loaded template schemas
  - Basic Scalars & Primitives
  - Enums & Constrained Values  
  - Nested Objects & Composition

### 3. Generate Supergraph
1. **Click the blue "Generate" button** at the top
2. All 3 schemas convert in parallel
3. SDL Preview shows merged output
4. Statistics show combined types and fields

### 4. Make Changes
- **Edit any schema** in the JSON editor (middle pane)
- **Click Generate again**
- Supergraph updates automatically with your changes

## What's Being Composed

Each schema becomes a subgraph:
```
Schema 1 (Basic Scalars)
    ↓
Subgraph 1 SDL
    ↓ 
         ↓ (Compose)
         → Supergraph SDL
         ↑
Subgraph 2 SDL
    ↑
Schema 2 (Enums)

Schema 3 (Nested Objects)
    ↓
Subgraph 3 SDL
```

## Key Features

| Feature | What It Does |
|---------|-------------|
| **Generate** | Converts all 3 schemas to GraphQL SDL |
| **Validate** | Checks schema validity |
| **Format** | Prettifies JSON |
| **Settings** | Configure converter options |
| **Clear All** | Removes all schemas |

## Tips

- **Change Multiple Schemas**: Edit them independently, then click Generate once
- **See Combined Output**: The supergraph shows merged types from all schemas
- **Statistics**: Shows total types and fields from all 3 schemas
- **Auto-Save**: Settings are saved to browser localStorage

## Keyboard Shortcuts

- **Ctrl+Shift+F** (or Cmd+Shift+F on Mac): Format JSON
- **Tab**: Indent code in editor
- **Ctrl+/** : Comment/uncomment

## Troubleshooting

### Generate button not working
- Make sure schemas have valid JSON
- Check that "Validate" is enabled in settings
- Look at browser console (F12) for error messages

### Supergraph not updating
- Click Generate button again
- Check if any schema has invalid JSON
- Verify compose is enabled in settings

### Want to clear everything
- Click "Clear All" button
- App will reload with 3 fresh templates

## Settings Available

**Converter Tab:**
- ✓ Validate schemas
- ✓ Include descriptions  
- ✓ Federation directives
- ✓ Naming convention

**UI & Display:**
- Font size adjustment
- Show/hide statistics

**Features:**
- Auto-compose
- Show suggestions

## What Each Template Does

### Basic Scalars & Primitives
Demonstrates GraphQL scalar types with validation:
```graphql
type BasicScalarsExample {
  id: ID!
  name: String!
  age: Int!
  rating: Float!
  is_active: Boolean!
}
```

### Enums & Constrained Values  
Shows enumeration types:
```graphql
enum UserRole {
  ADMIN
  MODERATOR
  USER
}
```

### Nested Objects & Composition
Shows complex nested structures:
```graphql
type NestedObjectsExample {
  name: String!
  address: Address!
  tags: [Tag!]!
}
```

## FAQ

**Q: Can I add more schemas?**
A: Yes! Click "Add" to create new schemas. The app supports up to 10 total.

**Q: Can I remove a template?**
A: Yes! Click the X next to any schema name to delete it.

**Q: Will changes be saved?**
A: Schemas are saved in browser sessionStorage. Settings are saved to localStorage.

**Q: Can I export the supergraph?**
A: Yes! Copy the SDL from the preview pane and paste it anywhere.

**Q: How do I reset to templates?**
A: Click "Clear All" to remove all schemas. Reload the page and 3 templates reload.

---

**Version:** 1.0 (with Multi-Schema Generation)  
**Last Updated:** December 16, 2025  
**Status:** ✅ Production Ready
