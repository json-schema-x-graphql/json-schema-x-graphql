# Subgraph Composer - Quick Start

> 🚀 Get up and running in 2 minutes

## Prerequisites

- Node.js 18+
- npm or pnpm

## Installation & Run

```bash
# Navigate to project
cd frontend/subgraph-composer

# Install dependencies
npm install

# Start development server
npm run dev
```

**The app opens automatically at `http://localhost:5175`**

## What You Can Do Right Now

### 1. Add Your First Schema

Click **➕ Add** button in the left sidebar.

Paste this example:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "User",
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "email": { "type": "string" }
  },
  "required": ["id", "name"]
}
```

### 2. Generate Subgraph

Click **✓ Validate** → Verify JSON is valid  
Click **⚡ Generate** → Creates GraphQL schema

### 3. View the Results

Look at the right panel to see generated GraphQL!

### 4. Add More Schemas

Repeat steps 1-3. Each new schema auto-composes with previous ones.

Try adding 2-3 schemas to see supergraph composition.

## Key Features Ready to Use

- ✅ **Schema List** - Manage up to 10 schemas
- ✅ **JSON Editor** - With syntax highlighting
- ✅ **Format** - Clean up indentation
- ✅ **Validate** - Check JSON syntax
- ✅ **Generate** - Convert to GraphQL
- ✅ **Preview** - View composed supergraph
- ✅ **Copy** - Save SDL to clipboard
- ✅ **Download** - Export as .graphql file
- ✅ **Persist** - Auto-saves to browser storage

## Next Steps

### For Development

```bash
# Read the full guides
cat README.md                    # User guide
cat IMPLEMENTATION_GUIDE.md      # Developer guide
cat PROJECT_SUMMARY.md           # Technical details
```

### For Production

```bash
# Build optimized version
npm run build

# Test production build
npm run preview
```

### Integrate Real Converter

When ready, link the actual converter library:

```bash
npm install ../../../converters/node/dist
```

Then update `src/lib/converter.js` to use it.

## Troubleshooting

**Editor not appearing?**
→ Ensure dependencies installed: `npm install`

**Schemas not saving?**
→ Check browser localStorage is enabled

**Generation failing?**
→ Use **✓ Validate** to check JSON first

## Project Structure

```
src/
├── components/      # React components (6 total)
├── hooks/          # Custom hooks (3 total)
├── lib/            # Utilities (converter, composer)
└── App.jsx         # Main app
```

## Support

- 📖 [README.md](./README.md) - Full user guide
- 🏗️ [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - Dev guide
- 📋 [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - Technical details

---

**Version:** 0.1.0  
**Status:** ✅ Ready to use  
**Questions?** Check the guides above or review the code!
