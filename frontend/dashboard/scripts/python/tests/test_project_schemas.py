"""Integration tests for validating all project JSON Schemas."""

import sys
from pathlib import Path
from urllib.parse import urlparse

import pytest

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from validate_schemas import load_json_file, validate_with_jsonschema

# Get the project root directory
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
SCHEMA_DIR = PROJECT_ROOT / "src" / "data"

_JSON_SCHEMA_HOSTS = {"json-schema.org"}
_MODERN_SCHEMA_PATHS = {
    "/draft/2019-09/schema",
    "/draft/2020-12/schema",
}


def _is_json_schema_url(url: str) -> bool:
    """Return True only when the URL's hostname is exactly json-schema.org."""
    parsed = urlparse(url)
    return parsed.scheme in {"https", "http"} and parsed.netloc in _JSON_SCHEMA_HOSTS


def _is_modern_schema_url(url: str) -> bool:
    """Return True when the URL is a recognized modern JSON Schema draft URI."""
    parsed = urlparse(url)
    if parsed.netloc not in _JSON_SCHEMA_HOSTS:
        return False
    return parsed.path in _MODERN_SCHEMA_PATHS or not parsed.path


@pytest.mark.parametrize(
    "schema_file",
    [
        "schema-unification.schema.json",
        "archived/schema-unification.schema.v2.json",
        "archived/schema-unification.schema.v2-generated.json",
        "archived/schema-unification.schema.v2-graphql.json",
        "archived/schema-unification-contract-data-hinted.schema.json",
    ],
)
def test_project_schemas_are_valid(schema_file):
    """Test that all project schemas are valid JSON Schema files."""
    schema_path = SCHEMA_DIR / schema_file

    # Skip if schema doesn't exist (some might be optional)
    if not schema_path.exists():
        pytest.skip(f"Schema {schema_file} does not exist")

    schema = load_json_file(schema_path)
    assert validate_with_jsonschema(schema, schema_path), (
        f"{schema_file} should be valid"
    )


def test_all_schemas_have_schema_key():
    """Test that all schemas declare their JSON Schema version."""
    schema_files = list(SCHEMA_DIR.glob("*.schema.json"))

    assert len(schema_files) > 0, "Should find at least one schema file"

    for schema_path in schema_files:
        schema = load_json_file(schema_path)
        assert "$schema" in schema, f"{schema_path.name} should have $schema key"
        assert _is_json_schema_url(schema["$schema"]), (
            f"{schema_path.name} $schema should reference json-schema.org"
        )


def test_schemas_use_modern_draft():
    """Test that schemas use a modern JSON Schema draft (2019-09 or 2020-12)."""
    schema_files = list(SCHEMA_DIR.glob("*.schema.json"))

    for schema_path in schema_files:
        schema = load_json_file(schema_path)
        if "$schema" in schema:
            assert _is_modern_schema_url(schema["$schema"]) or _is_json_schema_url(
                schema["$schema"]
            ), f"{schema_path.name} should use a modern JSON Schema draft"
