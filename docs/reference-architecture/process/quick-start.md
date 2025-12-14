# Quick Start Guide

**Get up and running with Schema Unification Forest in 5 minutes**

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js** >= 18.x ([download](https://nodejs.org/))
- **Python** >= 3.9 ([download](https://www.python.org/downloads/))
- **pnpm** package manager ([install](https://pnpm.io/installation))
- **Git** for cloning the repository

### Check Your Versions

```bash
node --version    # Should be >= 18
python --version  # Should be >= 3.9
pnpm --version    # Should be >= 8.x
```

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/GSA-TTS/enterprise-schema-unification.git
cd enterprise-schema-unification
```

### 2. Install Node.js Dependencies

```bash
# Use LTS Node version
nvm use --lts

# Install dependencies with pnpm
pnpm install
```

This will install all JavaScript/TypeScript dependencies including:
- Next.js (frontend framework)
- GraphQL tools
- Schema validators
- Testing tools (Jest)

### 3. Set Up Python Environment

```bash
# Create virtual environment
uv venv

# Activate virtual environment
source .venv/bin/activate  # On macOS/Linux
# or
.venv\Scripts\activate     # On Windows

# Install Python dependencies
uv pip install -e ".[dev]"
```

This installs:
- JSON Schema validators
- Testing tools (pytest)
- Code quality tools (ruff)

---

## Verify Installation

### Run Validators

Test that schema validation works:

```bash
# JavaScript/TypeScript validators
pnpm run validate:all

# Python validators
python python/validate_schemas.py src/data/*.schema.json
```

✅ **Success:** All validators should pass with no errors.

### Generate Schemas

Test that schema generation works:

```bash
# Generate all schema artifacts
pnpm run generate:schema:interop
```

This will:
1. Generate field name mappings
2. Convert GraphQL SDL → JSON Schema
3. Convert JSON Schema → GraphQL SDL
4. Generate V2 schemas (if V2 SDL exists)

✅ **Success:** Check `generated-schemas/` for output files.

---

## Run the Development Server

Start the local development server:

```bash
pnpm dev
```

The application will be available at **http://localhost:3000/**

You should see:
- 🏠 Homepage with project overview
- 📊 Schema viewer and visualization tools
- 📚 Documentation pages
- 🔍 GraphQL explorer

---

## Quick Tour

### View the Canonical Schema

Navigate to the JSON Schema viewer:
- **URL:** http://localhost:3000/
- **File:** `src/data/schema_unification.schema.json`

This is the canonical source of truth for the Schema Unification Forest data model.

### Explore GraphQL Schema

View the GraphQL SDL:
- **File:** `src/data/schema_unification.graphql`
- **Generated:** `generated-schemas/schema_unification.from-json.graphql`

### Check Documentation

Browse documentation pages:
- **URL:** http://localhost:3000/docs/
- **Files:** All `.md` files in `docs/` are automatically available

---

## Run Tests

### JavaScript/TypeScript Tests

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:scripts    # Generator/validator tests
pnpm test:coverage   # With coverage report

# Watch mode for development
pnpm test:watch
```

### Python Tests

```bash
# Run all Python tests
pytest

# Run with verbose output
pytest -v

# Run with coverage
pytest --cov=python --cov-report=term-missing
```

---

## Common Commands

### Development

```bash
pnpm dev              # Start dev server (http://localhost:3000)
pnpm build            # Build for production
pnpm start            # Run production build
```

### Schema Operations

```bash
pnpm run generate:schema:interop     # Generate all schemas
pnpm run validate:all                # Run all validators
pnpm run validate:schema             # Validate JSON Schema
pnpm run validate:graphql            # Validate GraphQL SDL
pnpm run validate:sync               # Check SDL ↔ JSON parity
```

### Testing

```bash
pnpm test                    # Run JavaScript tests
pytest                       # Run Python tests
pnpm run lint               # Lint JavaScript/TypeScript
pnpm run typecheck          # TypeScript type checking
ruff check python/          # Lint Python
```

### Docker (Optional)

```bash
# Development with hot reload
docker-compose up jsonViewer-dev

# Production build
docker-compose up jsonViewer
```

---

## Project Structure

```
enterprise-schema-unification/
├── src/
│   ├── data/
│   │   ├── schema_unification.schema.json      # Canonical JSON Schema (snake_case)
│   │   ├── schema_unification.graphql          # Canonical GraphQL SDL
│   │   └── generated/                 # Generated schemas for website
│   ├── pages/                         # Next.js pages
│   └── components/                    # React components
│
├── generated-schemas/                 # Generated schema artifacts
│   ├── schema_unification.from-graphql.json   # JSON Schema from SDL
│   └── schema_unification.from-json.graphql   # SDL from JSON Schema
│
├── scripts/                           # Generator and validator scripts
│   ├── generate-*.mjs                # Schema generators
│   └── validate-*.mjs                # Schema validators
│
├── python/                            # Python validation tools
│   ├── validate_schemas.py           # Main validator
│   └── tests/                        # Python tests
│
├── docs/                              # Documentation (auto-published)
└── __tests__/                         # JavaScript/TypeScript tests
```

---

## Troubleshooting

### Port 3000 Already in Use

```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill

# Or use a different port
PORT=3001 pnpm dev
```

### Validation Errors

If validators fail:

1. **Check canonical schema:** `src/data/schema_unification.schema.json` should be valid JSON Schema
2. **Regenerate schemas:** `pnpm run generate:schema:interop`
3. **Check for manual edits:** Generated files should not be hand-edited

### Python Virtual Environment Issues

```bash
# Deactivate and recreate
deactivate
rm -rf .venv
uv venv
source .venv/bin/activate
uv pip install -e ".[dev]"
```

### Build Failures

```bash
# Clear cache and reinstall
rm -rf node_modules .next out
pnpm install
pnpm build
```

### Test Failures

```bash
# Update snapshots (if using)
pnpm test -- -u

# Run specific test file
pnpm test __tests__/scripts/generate-graphql-from-json-schema.test.mjs
```

---

## Next Steps

Now that you're set up, explore these guides:

### Learn the Schema Pipeline
📖 [Schema Pipeline Guide](../schema/schema-pipeline-guide.md) — Complete guide to schema generation, validation, and publishing

### Understand V1 vs V2
📖 [Schema V1 vs V2 Guide](../schema/schema-v1-vs-v2-guide.md) — Differences, migration, and architecture

### Work with x-graphql Hints
📖 [x-graphql Hints Guide](../schema/x-graphql-hints-guide.md) — Comprehensive guide to GraphQL hints system

### System Integration
📖 [System Mappings Guide](../mappings/system-mappings-guide.md) — Contract Data, Legacy Procurement, EASi mappings

### Python Validation
📖 [Python Validation Guide](../implementation/python-validation-guide.md) — Python setup and advanced validation

---

## Getting Help

### Documentation
- **Main README:** [`README.md`](../../README.md)
- **All Docs:** Browse http://localhost:3000/docs/ or `docs/` directory
- **Implementation Plan:** [`IMPLEMENTATION-PLAN.md`](../../IMPLEMENTATION-PLAN.md)

### Architecture Decision Records
- [`docs/adr/`](../adr/) — Key architectural decisions

### Common Issues
- **Schema validation:** Check `docs/schema/schema-linting-guide.md`
- **GraphQL converter issues:** See archived troubleshooting in `docs/archived/implementation-logs/`

### Community
- **GitHub Issues:** Report bugs or request features
- **Project Wiki:** Additional documentation
- **Team Chat:** Contact TTS team for support

---

## Development Workflow

### Making Schema Changes

1. **Edit canonical schema:** `src/data/schema_unification.schema.json`
2. **Validate changes:** `pnpm run validate:schema`
3. **Regenerate artifacts:** `pnpm run generate:schema:interop`
4. **Check parity:** `pnpm run validate:sync`
5. **Run tests:** `pnpm test && pytest`
6. **Commit all changes:** Include generated files

### Adding Documentation

1. **Create markdown file:** `docs/your-new-doc.md`
2. **Add frontmatter (optional):**
   ```yaml
   ---
   title: Your Document Title
   description: Brief description
   ---
   ```
3. **View live:** http://localhost:3000/docs/your-new-doc
4. **Commit:** File is automatically published

### Contributing Code

1. **Create feature branch:** `git checkout -b feature/your-feature`
2. **Make changes:** Edit code
3. **Add tests:** Ensure coverage
4. **Run checks:** `pnpm run lint && pnpm run typecheck && pnpm test`
5. **Commit:** Follow commit conventions
6. **Push and PR:** Create pull request

---

## Configuration Files

- **`.env.local`** — Local environment variables (create if needed)
- **`next.config.js`** — Next.js configuration
- **`jest.config.js`** — Jest test configuration
- **`pyproject.toml`** — Python project configuration
- **`docker-compose.yml`** — Docker services
- **`package.json`** — Node.js dependencies and scripts

---

## Quick Reference

### File Paths
- Canonical JSON Schema: `src/data/schema_unification.schema.json`
- Canonical GraphQL SDL: `src/data/schema_unification.graphql`
- Generated artifacts: `generated-schemas/`
- Website schemas: `src/data/generated/`

### Key Scripts
- Generate: `pnpm run generate:schema:interop`
- Validate: `pnpm run validate:all`
- Test: `pnpm test && pytest`
- Dev server: `pnpm dev`

### Important Conventions
- JSON Schema: **snake_case** (canonical)
- GraphQL SDL: **camelCase**
- Generated files: **Committed to Git**
- Tests: Required for all generators/validators

---

**You're all set!** 🎉

Start building with `pnpm dev` and explore the documentation for detailed guides.

**Questions?** Check the [Schema Pipeline Guide](../schema/schema-pipeline-guide.md) or [Main README](../../README.md).

---

**Last Updated:** December 2024  
**Version:** 2.0  
**Status:** Active