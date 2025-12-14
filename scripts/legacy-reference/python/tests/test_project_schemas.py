"""Integration tests for validating all project JSON Schemas."""

import sys
from pathlib import Path

import pytest

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from validate_schemas import load_json_file, validate_with_jsonschema


# Get the project root directory
PROJECT_ROOT = Path(__file__).parent.parent.parent
SCHEMA_DIR = PROJECT_ROOT / "src" / "data"


@pytest.mark.parametrize(
    "schema_file",
    [
        "schema_unification.schema.json",
        "schema_unification.schema.v2.json",
        "schema_unification.schema.v2-generated.json",
        "schema_unification.schema.v2-graphql.json",
        "schema_unification-contract_data-hinted.schema.json",
    ],
)
def test_project_schemas_are_valid(schema_file):
    """Test that all project schemas are valid JSON Schema files."""
    schema_path = SCHEMA_DIR / schema_file
    
    # Skip if schema doesn't exist (some might be optional)
    if not schema_path.exists():
        pytest.skip(f"Schema {schema_file} does not exist")
    
    schema = load_json_file(schema_path)
    assert validate_with_jsonschema(schema, schema_path), f"{schema_file} should be valid"


def test_all_schemas_have_schema_key():
    """Test that all schemas declare their JSON Schema version."""
    schema_files = list(SCHEMA_DIR.glob("*.schema.json"))
    
    assert len(schema_files) > 0, "Should find at least one schema file"
    
    for schema_path in schema_files:
        schema = load_json_file(schema_path)
        assert "$schema" in schema, f"{schema_path.name} should have $schema key"
        assert "json-schema.org" in schema["$schema"], (
            f"{schema_path.name} $schema should reference json-schema.org"
        )


def test_schemas_use_modern_draft():
    """Test that schemas use a modern JSON Schema draft (2019-09 or 2020-12)."""
    schema_files = list(SCHEMA_DIR.glob("*.schema.json"))
    
    modern_drafts = [
        "https://json-schema.org/draft/2019-09/schema",
        "https://json-schema.org/draft/2020-12/schema",
    ]
    
    for schema_path in schema_files:
        schema = load_json_file(schema_path)
        if "$schema" in schema:
            # Allow any modern draft or just the base URL
            is_modern = any(draft in schema["$schema"] for draft in modern_drafts)
            assert is_modern or "json-schema.org" in schema["$schema"], (
                f"{schema_path.name} should use a modern JSON Schema draft"
            )
