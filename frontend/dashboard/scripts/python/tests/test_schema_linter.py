"""Tests for the schema linter."""

import sys
from pathlib import Path

import pytest

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from schema_linter import SchemaLinter, lint_schema


def test_missing_schema_version():
    """Test detection of missing $schema declaration."""
    schema = {
        "type": "object",
        "properties": {"name": {"type": "string"}},
    }
    
    linter = SchemaLinter()
    results = linter.lint(schema, Path("test.json"))
    
    assert any("$schema" in w for w in results["warnings"])


def test_old_draft_version():
    """Test suggestion for old JSON Schema draft."""
    schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
    }
    
    linter = SchemaLinter()
    results = linter.lint(schema, Path("test.json"))
    
    assert any("2020-12" in s or "upgrade" in s.lower() for s in results["suggestions"])


def test_modern_schema_version():
    """Test recognition of modern schema version."""
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
    }
    
    linter = SchemaLinter()
    results = linter.lint(schema, Path("test.json"))
    
    assert any("modern" in i.lower() for i in results["info"])


def test_missing_descriptions():
    """Test detection of missing descriptions."""
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "age": {"type": "integer"},
        },
    }
    
    linter = SchemaLinter()
    results = linter.lint(schema, Path("test.json"))
    
    # Should suggest adding descriptions
    assert any("description" in s.lower() for s in results["suggestions"])


def test_empty_enum():
    """Test detection of empty enum."""
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {"status": {"type": "string", "enum": []}},
    }
    
    linter = SchemaLinter()
    results = linter.lint(schema, Path("test.json"))
    
    assert any("empty enum" in w.lower() for w in results["warnings"])


def test_single_value_enum():
    """Test suggestion for single-value enum."""
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {"status": {"type": "string", "enum": ["active"]}},
    }
    
    linter = SchemaLinter()
    results = linter.lint(schema, Path("test.json"))
    
    assert any("const" in s.lower() for s in results["suggestions"])


def test_no_required_fields():
    """Test suggestion when no required fields are specified."""
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "email": {"type": "string"},
        },
    }
    
    linter = SchemaLinter()
    results = linter.lint(schema, Path("test.json"))
    
    assert any("required" in s.lower() for s in results["suggestions"])


def test_invalid_required_fields():
    """Test warning for required fields not in properties."""
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {"name": {"type": "string"}},
        "required": ["name", "nonexistent"],
    }
    
    linter = SchemaLinter()
    results = linter.lint(schema, Path("test.json"))
    
    assert any("not in properties" in w.lower() for w in results["warnings"])


def test_missing_additional_properties():
    """Test suggestion for missing additionalProperties."""
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {"name": {"type": "string"}},
    }
    
    linter = SchemaLinter()
    results = linter.lint(schema, Path("test.json"))
    
    assert any("additionalproperties" in s.lower() for s in results["suggestions"])


def test_string_format_suggestions():
    """Test suggestions for string formats."""
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {
            "email": {"type": "string"},
            "website": {"type": "string"},
            "birthDate": {"type": "string"},
        },
    }
    
    linter = SchemaLinter()
    results = linter.lint(schema, Path("test.json"))
    
    suggestions_text = " ".join(results["suggestions"]).lower()
    assert "email" in suggestions_text or "format" in suggestions_text


def test_numeric_constraints():
    """Test suggestion for numeric constraints."""
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {"age": {"type": "integer"}},
    }
    
    linter = SchemaLinter()
    results = linter.lint(schema, Path("test.json"))
    
    assert any("min" in s.lower() or "max" in s.lower() for s in results["suggestions"])


def test_array_without_items():
    """Test warning for array without items definition."""
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {"tags": {"type": "array"}},
    }
    
    linter = SchemaLinter()
    results = linter.lint(schema, Path("test.json"))
    
    assert any("items" in w.lower() for w in results["warnings"])


def test_array_size_constraints():
    """Test suggestion for array size constraints."""
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {
            "tags": {"type": "array", "items": {"type": "string"}}
        },
    }
    
    linter = SchemaLinter()
    results = linter.lint(schema, Path("test.json"))
    
    assert any("minitems" in s.lower() or "maxitems" in s.lower() for s in results["suggestions"])


def test_deprecated_keywords():
    """Test detection of deprecated keywords."""
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "definitions": {"Person": {"type": "object"}},
    }
    
    linter = SchemaLinter()
    results = linter.lint(schema, Path("test.json"))
    
    assert any("$defs" in s or "definitions" in s for s in results["suggestions"])


def test_missing_title():
    """Test suggestion for missing title."""
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
    }
    
    linter = SchemaLinter()
    results = linter.lint(schema, Path("test.json"))
    
    assert any("title" in s.lower() for s in results["suggestions"])


def test_lint_schema_function():
    """Test the convenience lint_schema function."""
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {"name": {"type": "string"}},
    }
    
    results = lint_schema(schema, Path("test.json"))
    
    assert "warnings" in results
    assert "suggestions" in results
    assert "info" in results
    assert isinstance(results["warnings"], list)
    assert isinstance(results["suggestions"], list)
    assert isinstance(results["info"], list)


def test_well_formed_schema():
    """Test a well-formed schema produces minimal suggestions."""
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "Person",
        "description": "A person object",
        "type": "object",
        "properties": {
            "name": {
                "type": "string",
                "description": "Full name",
            },
            "age": {
                "type": "integer",
                "description": "Age in years",
                "minimum": 0,
                "maximum": 150,
            },
            "email": {
                "type": "string",
                "format": "email",
                "description": "Email address",
            },
        },
        "required": ["name", "email"],
        "additionalProperties": False,
    }
    
    linter = SchemaLinter()
    results = linter.lint(schema, Path("test.json"))
    
    # Should have info about modern schema, but minimal warnings/suggestions
    assert len(results["warnings"]) == 0
    assert len(results["info"]) > 0
