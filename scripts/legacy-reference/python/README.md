# Python Validation Tools

This directory contains Python-based validation tools for JSON Schemas in the Schema Unification Forest project.

## Setup

Install dependencies using `uv`:

```bash
# Install uv if you haven't already
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment and install dependencies
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -e ".[dev]"
```

## Usage

### Validate JSON Schema Files

```bash
# Validate a single schema
python python/validate_schemas.py src/data/schema_unification.schema.json

# Validate multiple schemas
python python/validate_schemas.py src/data/*.schema.json

# Verbose output with linting suggestions
python python/validate_schemas.py -v src/data/schema_unification.schema.json

# Just validation, no linting
python python/validate_schemas.py --no-lint src/data/schema_unification.schema.json

# Linting without verbose mode
python python/validate_schemas.py --lint src/data/schema_unification.schema.json
```

### Linting Features

The validator includes a built-in linter that checks for JSON Schema best practices:

- ✅ **Schema Version**: Warns if `$schema` is missing or suggests upgrading old drafts
- ✅ **Documentation**: Suggests adding titles, descriptions, and examples
- ✅ **Type Constraints**: Recommends min/max for numbers, size limits for arrays
- ✅ **String Formats**: Suggests appropriate formats (email, uri, date-time)
- ✅ **Required Fields**: Warns about invalid required fields or missing requirements
- ✅ **Additional Properties**: Suggests explicitly setting additionalProperties
- ✅ **Enum Best Practices**: Detects empty enums or single-value enums (use const instead)
- ✅ **Deprecated Keywords**: Flags old keywords like `definitions` (use `$defs`)
- ✅ **Array Items**: Warns if array type is missing items definition

**Example output:**

```text
$ python python/validate_schemas.py -v src/data/schema_unification.schema.json

============================================================
Validating: src/data/schema_unification.schema.json
============================================================
✅ schema_unification.schema.json is valid

📋 Best Practices Check for schema_unification.schema.json:
────────────────────────────────────────────────────────────
  💡 Consider upgrading to Draft 2020-12 for better validation features
  💡 Consider adding 'examples' to help users understand the schema
  💡 Numeric field at root.totalAmount has no min/max constraints
  💡 Array at root.items has no size constraints (minItems/maxItems)
────────────────────────────────────────────────────────────
```

### Run Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=python --cov-report=html

# Run specific test file
pytest python/tests/test_validate_schemas.py -v
```

### Code Quality

```bash
# Format code
ruff format python/

# Lint code
ruff check python/

# Auto-fix linting issues
ruff check python/ --fix
```

## Libraries Used

- **[jsonschema](https://pypi.org/project/jsonschema/)**: Reference implementation for JSON Schema validation (Draft 2020-12 support)
- **[sourcemeta-jsonschema](https://pypi.org/project/sourcemeta-jsonschema/)**: Additional validation tool (CLI-based)

## Project Structure

```
python/
├── __init__.py
├── validate_schemas.py      # Main validation script
└── tests/
    └── test_validate_schemas.py  # Unit tests
```
