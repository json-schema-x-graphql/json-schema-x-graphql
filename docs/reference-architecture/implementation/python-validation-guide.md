# Python Schema Validation Quick Start

This guide shows how to use the Python validation tools for the Schema Unification Forest project.

## Quick Setup

```bash
# Install uv (if not already installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment and install dependencies
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -e ".[dev]"
```

## Usage Examples

### Validate a Single Schema

```bash
python python/validate_schemas.py src/data/schema_unification.schema.json
```

### Validate Multiple Schemas

```bash
python python/validate_schemas.py src/data/*.schema.json
```

### Validate with Verbose Output

```bash
python python/validate_schemas.py -v src/data/schema_unification.schema.v2.json
```

### Best Practices Linting

The validator includes a built-in linter for JSON Schema best practices:

```bash
# Linting is enabled by default with -v flag
python python/validate_schemas.py -v src/data/schema_unification.schema.json

# Or explicitly enable linting
python python/validate_schemas.py --lint src/data/schema_unification.schema.json

# Disable linting if you only want validation
python python/validate_schemas.py --no-lint src/data/schema_unification.schema.json
```

**What the linter checks:**

- ⚠️ **Warnings**: Critical issues like missing `$schema`, invalid required fields, empty enums
- 💡 **Suggestions**: Best practices like adding descriptions, setting constraints, using modern drafts
- ✅ **Info**: Confirmations like using modern JSON Schema versions

**Example linting output:**

```text
📋 Best Practices Check for schema_unification.schema.json:
────────────────────────────────────────────────────────────
  ⚠️  Missing $schema declaration - consider adding "$schema"
  💡 Consider upgrading to Draft 2020-12 for better features
  💡 Add a 'description' to the root schema for documentation
  💡 Numeric field at root.amount has no min/max constraints
  💡 Array at root.items has no size constraints
────────────────────────────────────────────────────────────
```

### Validate V2 Schemas

```bash
python python/validate_schemas.py \
  src/data/schema_unification.schema.v2.json \
  src/data/schema_unification.schema.v2-generated.json \
  src/data/schema_unification.schema.v2-graphql.json
```

## Running Tests

### Run All Tests

```bash
pytest
```

### Run with Coverage

```bash
pytest --cov=python --cov-report=html
open htmlcov/index.html  # View coverage report
```

### Run Specific Test File

```bash
pytest python/tests/test_project_schemas.py -v
```

### Run Specific Test

```bash
pytest python/tests/test_project_schemas.py::test_project_schemas_are_valid -v
```

## Code Quality

### Format Code

```bash
ruff format python/
```

### Lint Code

```bash
ruff check python/
```

### Auto-fix Linting Issues

```bash
ruff check python/ --fix
```

## Integration with CI/CD

Add to your GitHub Actions workflow:

```yaml
- name: Set up Python
  uses: actions/setup-python@v5
  with:
    python-version: '3.9'

- name: Install uv
  run: curl -LsSf https://astral.sh/uv/install.sh | sh

- name: Install dependencies
  run: |
    uv venv
    source .venv/bin/activate
    uv pip install -e ".[dev]"

- name: Validate schemas
  run: |
    source .venv/bin/activate
    python python/validate_schemas.py src/data/*.schema.json

- name: Run tests
  run: |
    source .venv/bin/activate
    pytest --cov=python --cov-report=xml
```

## Troubleshooting

### Virtual Environment Not Activated

If you see import errors, make sure the virtual environment is activated:

```bash
source .venv/bin/activate  # On macOS/Linux
.venv\Scripts\activate     # On Windows
```

### Dependencies Not Installed

If packages are missing:

```bash
uv pip install -e ".[dev]"
```

### Schema Validation Fails

If a schema fails validation, check:

1. The `$schema` property is set correctly
2. Property types are valid JSON Schema types
3. Required fields are defined
4. No circular references without proper definitions

Example of a valid schema structure:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the entity"
    }
  },
  "required": ["name"]
}
```

## What Gets Validated

### Schema Validation
The validation script checks:

- ✅ Schema is valid JSON
- ✅ Schema conforms to JSON Schema metaschema
- ✅ Property types are valid
- ✅ References (`$ref`) are properly defined
- ✅ Schema structure is correct

### Best Practices Linting (with `--lint` or `-v`)

**Schema Version & Structure:**
- Missing or outdated `$schema` declaration
- Missing top-level `type` definition
- Missing `title` or `description`

**Documentation:**
- Properties without descriptions
- Missing examples in the schema

**Type Constraints:**
- Numbers without min/max constraints
- Strings without format/pattern (suggests formats for email, URL, dates)
- Arrays without `items` definition or size constraints

**Validation Rules:**
- Invalid `required` fields (not in properties)
- Missing `required` fields specification
- Missing or ambiguous `additionalProperties`

**Enum & Constants:**
- Empty enum definitions
- Single-value enums (should use `const`)

**Deprecated Features:**
- Old keywords like `definitions` (use `$defs` in modern drafts)
- References to old JSON Schema drafts

**$ref Usage:**
- Invalid or malformed `$ref` paths

## Files Validated

The test suite validates these schemas:

- `src/data/schema_unification.schema.json` - Main schema
- `src/data/schema_unification.schema.v2.json` - V2 schema
- `src/data/schema_unification.schema.v2-generated.json` - Generated V2 schema
- `src/data/schema_unification.schema.v2-graphql.json` - GraphQL-derived schema
- `src/data/schema_unification-contract_data-hinted.schema.json` - Contract Data hinted schema

## Learn More

- [jsonschema Documentation](https://python-jsonschema.readthedocs.io/)
- [JSON Schema Specification](https://json-schema.org/)
- [uv Documentation](https://github.com/astral-sh/uv)
