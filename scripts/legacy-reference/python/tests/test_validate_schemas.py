"""Tests for JSON Schema validation."""

import json
from pathlib import Path

import pytest

# Sample valid JSON Schema for testing
VALID_SCHEMA = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "age": {"type": "integer", "minimum": 0},
    },
    "required": ["name"],
}

# Sample invalid JSON Schema (missing type)
INVALID_SCHEMA = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "properties": {
        "name": {"type": "invalid_type"},
    },
}


@pytest.fixture
def temp_schema_file(tmp_path):
    """Create a temporary schema file for testing."""

    def _create_schema(schema_dict):
        schema_file = tmp_path / "test_schema.json"
        with open(schema_file, "w") as f:
            json.dump(schema_dict, f)
        return schema_file

    return _create_schema


def test_valid_schema(temp_schema_file):
    """Test validation of a valid schema."""
    import sys

    sys.path.insert(0, str(Path(__file__).parent.parent))
    from validate_schemas import validate_with_jsonschema

    schema_file = temp_schema_file(VALID_SCHEMA)
    result = validate_with_jsonschema(VALID_SCHEMA, schema_file)
    assert result is True


def test_invalid_schema(temp_schema_file):
    """Test validation of an invalid schema."""
    import sys

    sys.path.insert(0, str(Path(__file__).parent.parent))
    from validate_schemas import validate_with_jsonschema

    schema_file = temp_schema_file(INVALID_SCHEMA)
    result = validate_with_jsonschema(INVALID_SCHEMA, schema_file)
    assert result is False


def test_load_json_file(temp_schema_file):
    """Test loading a JSON file."""
    import sys

    sys.path.insert(0, str(Path(__file__).parent.parent))
    from validate_schemas import load_json_file

    schema_file = temp_schema_file(VALID_SCHEMA)
    loaded_schema = load_json_file(schema_file)
    assert loaded_schema == VALID_SCHEMA
