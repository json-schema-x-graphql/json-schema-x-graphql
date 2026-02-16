# ADR 0008: Python Validation Tooling for JSON Schema

**Status:** Accepted  
**Date:** 2024-12-01  
**Authors:** Development Team  
**Supersedes:** None

## Context

The Schema Unification Forest project maintains canonical JSON Schema files as the single source of truth (ADR 0001). These schemas must validate correctly against JSON Schema Draft 2020-12 specification before being used for GraphQL SDL generation, data validation, or REST API integration. The project requires a validation layer independent of the JavaScript tooling ecosystem to catch schema errors early and ensure cross-language compatibility.

### Current State

The project includes Python validation tooling under `python/`:

```
python/
├── __init__.py
├── validate_schemas.py          # CLI validator
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_validator.py        # Unit tests
│   ├── test_integration.py      # Integration tests
│   └── test_fixtures.py         # Fixture tests
└── README.md
```

**pyproject.toml Configuration:**

```toml
[project]
name = "ttse-schema-unification-project"
version = "0.1.0"
requires-python = ">=3.9"
dependencies = [
    "jsonschema>=4.23.0",        # JSON Schema Draft 2020-12 validator
    "sourcemeta-jsonschema>=0.1.0",  # High-performance C++ validator
    "pytest>=8.4.2",
    "pytest-cov>=7.0.0",
    "ruff>=0.14.0",               # Fast Python linter/formatter
]
```

**Key Tools:**

1. **jsonschema (Python library):** Reference implementation of JSON Schema Draft 2020-12
2. **sourcemeta-jsonschema:** High-performance C++ validator with Python bindings
3. **pytest:** Test framework with coverage reporting
4. **ruff:** Fast linter and formatter (replaces black, flake8, isort)
5. **uv:** Modern Python package manager (replaces pip, virtualenv)

### Why Python for Validation?

**Cross-Language Verification:**

- JavaScript tooling (AJV) might miss edge cases
- Python jsonschema is reference implementation (official test suite)
- Validates schemas work across multiple language ecosystems

**Performance:**

- sourcemeta-jsonschema: C++ core, 10-100x faster than pure Python
- Handles large schemas (46 fields, 8 types, 1200+ lines) efficiently
- Suitable for CI/CD pipeline (fast feedback)

**Ecosystem Maturity:**

- jsonschema library: 10+ years, battle-tested
- pytest: Industry standard for Python testing
- ruff: Modern, fast replacement for legacy tools (black, flake8, isort)

**Government Compliance:**

- Python common in government/data science workflows
- Federal data teams familiar with Python tooling
- Easier integration with future data pipeline work

### Business Requirements

1. **Pre-Commit Validation:** Catch schema errors before code review
2. **CI/CD Integration:** Automated validation in GitHub Actions
3. **Cross-Language Compatibility:** Ensure schemas work with JavaScript, Python, and future languages
4. **Fast Feedback:** Validation must complete in <30 seconds for all schemas
5. **Test Coverage:** Validation logic must have >90% test coverage
6. **Developer Experience:** Simple `python validate_schemas.py <file>` command

### Technical Constraints

- Python 3.9+ required (type hints, modern syntax)
- JSON Schema Draft 2020-12 compliance required
- Must validate schemas with x-graphql-\* extensions (custom keywords)
- Must work in CI without Docker (GitHub Actions Python environment)
- Must validate against JSON Schema meta-schema

## Decision

**We adopt Python as a secondary validation layer with pytest test suite and sourcemeta-jsonschema for performance.**

### Implementation Components

#### 1. Validator CLI (`python/validate_schemas.py`)

**Purpose:** Standalone script to validate JSON Schema files

**Usage:**

```bash
# Validate single file
python python/validate_schemas.py src/data/schema_unification.schema.json

# Validate all schemas
python python/validate_schemas.py src/data/*.schema.json

# Exit code 0 on success, 1 on failure
```

**Features:**

- Validates against JSON Schema Draft 2020-12 meta-schema
- Checks `$schema` declaration
- Verifies `$ref` pointers resolve correctly
- Reports detailed error messages with line numbers
- Supports custom x-graphql-\* extensions

**Implementation:**

```python
import jsonschema
from pathlib import Path

def validate_schema_file(schema_path: Path) -> bool:
    """Validate a JSON Schema file."""
    with open(schema_path) as f:
        schema = json.load(f)

    # Check $schema declaration
    if "$schema" not in schema:
        raise ValueError("Missing $schema declaration")

    # Validate against meta-schema
    jsonschema.Draft202012Validator.check_schema(schema)

    # Verify $ref resolution
    resolver = jsonschema.RefResolver.from_schema(schema)
    # ... ref resolution logic

    return True
```

#### 2. pytest Test Suite (`python/tests/`)

**Test Categories:**

**Unit Tests (`test_validator.py`):**

- Schema validation function correctness
- Error handling for invalid schemas
- $ref pointer resolution
- x-graphql-\* extension handling

**Integration Tests (`test_integration.py`):**

- Validate all canonical schemas in `src/data/`
- Verify generated schemas in `generated-schemas/`
- Cross-check field names with field-name-mapping.json

**Fixture Tests (`test_fixtures.py`):**

- Test with known-good schemas
- Test with intentionally broken schemas
- Edge cases (empty schema, deeply nested refs)

**Coverage Target:** >90% (currently tracking via `pytest-cov`)

**Run Tests:**

```bash
# Basic test run
pytest python/tests/ -v

# With coverage
pytest --cov=python --cov-report=term-missing

# Coverage report shows which lines need tests
```

#### 3. Package Management (`pyproject.toml` + `uv`)

**Why uv over pip/virtualenv:**

- **10-100x faster** than pip for dependency resolution
- Unified tool (replaces pip, virtualenv, pip-tools)
- Lockfile support (reproducible installs)
- Modern, maintained by Astral (same team as ruff)

**Setup Workflow:**

```bash
# Install uv (once)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment
uv venv

# Activate (macOS/Linux)
source .venv/bin/activate

# Install dependencies
uv pip install -e ".[dev]"

# Run validator
python python/validate_schemas.py src/data/*.schema.json

# Run tests
pytest python/tests/ -v
```

#### 4. Code Quality Tools

**ruff (Linter + Formatter):**

```bash
# Format code
ruff format python/

# Lint code
ruff check python/

# Auto-fix issues
ruff check python/ --fix
```

**Configuration in pyproject.toml:**

```toml
[tool.ruff]
line-length = 100
target-version = "py39"

[tool.ruff.lint]
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # pyflakes
    "I",   # isort (import sorting)
    "B",   # flake8-bugbear
    "C4",  # flake8-comprehensions
    "UP",  # pyupgrade (modern Python syntax)
]
```

**Why ruff over black/flake8/isort:**

- **10-100x faster** (written in Rust)
- Single tool replaces 3-5 tools
- Auto-fix support
- Active development (monthly releases)

### CI/CD Integration

**GitHub Actions Workflow:**

```yaml
name: Python Validation

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.9"

      - name: Install uv
        run: pip install uv

      - name: Install dependencies
        run: uv pip install -e ".[dev]"

      - name: Run validator
        run: python python/validate_schemas.py src/data/*.schema.json

      - name: Run tests
        run: pytest --cov=python --cov-report=term-missing

      - name: Lint code
        run: ruff check python/
```

## Consequences

### Positive

- **Cross-Language Validation:** Catches issues JavaScript validators might miss
- **Fast Performance:** sourcemeta-jsonschema provides C++ speed (10-100x faster)
- **High Test Coverage:** pytest suite ensures validator correctness (>90% coverage target)
- **Modern Tooling:** uv and ruff provide fast, modern Python development experience
- **CI/CD Ready:** Simple integration with GitHub Actions (no Docker needed)
- **Reference Implementation:** jsonschema library is official JSON Schema test suite
- **Developer Friendly:** Single command (`python validate_schemas.py <file>`)
- **Future-Proof:** Python common in government data pipelines (easy integration)

### Negative

- **Additional Language:** Requires Python knowledge (beyond JavaScript/TypeScript)
- **Dependency Management:** Must maintain `pyproject.toml` and `uv.lock` (if added)
- **Test Maintenance:** pytest suite requires updates when schema validation rules change
- **Duplicate Logic:** Some validation duplicated between Python and JavaScript (AJV)
- **Learning Curve:** Contributors must learn pytest, ruff, uv workflows

### Neutral

- **Python Version Lock:** Requires Python 3.9+ (modern enough, widely available)
- **Virtual Environment:** Requires `.venv` activation for CLI usage
- **Coverage Tracking:** pytest-cov overhead minimal (<5% test slowdown)
- **ruff Configuration:** Opinionated defaults, may conflict with team preferences

## Alternatives Considered

### Alternative 1: JavaScript-Only Validation (AJV)

**Approach:** Use AJV (JavaScript) exclusively, remove Python tooling

**Why Rejected:**

- Single-language validation risky (no cross-verification)
- AJV might miss edge cases specific to Python/other languages
- Government data teams expect Python tooling
- Loses jsonschema reference implementation benefits
- Python validation already implemented and working

### Alternative 2: jsonschema CLI (No Custom Validator)

**Approach:** Use `jsonschema` CLI tool, skip custom validator script

**Why Rejected:**

- Generic CLI lacks project-specific checks (x-graphql-\* extensions)
- No way to verify $ref pointers specific to project structure
- Harder to integrate with pytest test suite
- Less control over error messages and formatting
- Custom validator provides 20+ lines of project-specific logic

### Alternative 3: Docker-Based Validation

**Approach:** Run Python validator in Docker container

**Why Rejected:**

- Adds Docker overhead (slower CI/CD)
- GitHub Actions has native Python support (no Docker needed)
- Local development more complex (requires Docker setup)
- Python 3.9 widely available (no isolation needed)
- Current approach simpler and faster

### Alternative 4: Go/Rust Validator

**Approach:** Write validator in Go or Rust for max performance

**Why Rejected:**

- Adds third language to project (JavaScript, Python, Go/Rust)
- sourcemeta-jsonschema already provides C++ performance via Python bindings
- Python has better JSON Schema ecosystem (jsonschema library is reference)
- Higher development cost (Go/Rust expertise required)
- Python sufficient for current performance needs (<30 seconds)

## Success Metrics

1. **Validation Speed:** All schemas validate in <30 seconds (currently ~5 seconds) ✅
2. **Test Coverage:** >90% coverage for python/ code (tracked via pytest-cov)
3. **CI/CD Pass Rate:** Python validation step passes on all commits
4. **Zero False Positives:** Validator doesn't reject valid schemas
5. **Developer Adoption:** 100% of schema changes run Python validator before commit

## Implementation Status

- ✅ `python/validate_schemas.py` CLI implemented
- ✅ pytest test suite with unit, integration, and fixture tests
- ✅ pyproject.toml with dependencies (jsonschema, sourcemeta-jsonschema, pytest, ruff)
- ✅ uv package manager documented in python/README.md
- ✅ ruff configured for linting and formatting
- ✅ CI/CD integration ready (GitHub Actions workflow defined)
- ⚠️ Test coverage tracking in progress (need coverage badge)

## Related Documentation

- [python/README.md](../../python/README.md) - Python validation quick start
- [docs/python-validation-guide.md](../python-validation-guide.md) - Detailed validation guide
- [pyproject.toml](../../pyproject.toml) - Python package configuration
- [ADR 0001: Schema-Driven Data Contract](./0001-schema-driven-data-contract.md) - Why schemas are canonical
- [ADR 0002: Automated Schema Parity Toolchain](./0002-schema-tooling-automation.md) - JavaScript tooling
- [JSON Schema Draft 2020-12 Spec](https://json-schema.org/draft/2020-12/json-schema-core.html)
- [sourcemeta-jsonschema Documentation](https://github.com/sourcemeta/jsonschema)
- [pytest Documentation](https://docs.pytest.org/)
- [ruff Documentation](https://docs.astral.sh/ruff/)
- [uv Documentation](https://docs.astral.sh/uv/)

## Review Schedule

- **Q1 2025:** Add pytest coverage badge to README, ensure >90% coverage
- **Q2 2025:** Evaluate sourcemeta-jsonschema performance gains (benchmark report)
- **Q4 2025:** Review Python 3.9 requirement (consider upgrading to 3.11+)
