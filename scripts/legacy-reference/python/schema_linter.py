#!/usr/bin/env python3
"""
JSON Schema linting and best practices checker.

This module provides functions to analyze JSON Schemas and suggest improvements
based on best practices and common patterns.
"""

from pathlib import Path
from typing import Any


class SchemaLinter:
    """Analyzes JSON Schemas for best practices and potential issues."""

    def __init__(self):
        self.warnings = []
        self.suggestions = []
        self.info = []

    def lint(self, schema: dict[str, Any], filepath: Path) -> dict[str, list[str]]:
        """Run all linting checks on a schema."""
        self.warnings = []
        self.suggestions = []
        self.info = []

        self._check_schema_version(schema)
        self._check_top_level_type(schema)
        self._check_missing_descriptions(schema, filepath.name)
        self._check_missing_examples(schema)
        self._check_enum_values(schema)
        self._check_required_fields(schema)
        self._check_additional_properties(schema)
        self._check_string_patterns(schema)
        self._check_numeric_constraints(schema)
        self._check_array_items(schema)
        self._check_deprecated_keywords(schema)
        self._check_ref_usage(schema)
        self._check_title_presence(schema)

        return {
            "warnings": self.warnings,
            "suggestions": self.suggestions,
            "info": self.info,
        }

    def _check_schema_version(self, schema: dict[str, Any]) -> None:
        """Check if schema uses a modern JSON Schema draft."""
        if "$schema" not in schema:
            self.warnings.append(
                "⚠️  Missing $schema declaration - consider adding "
                '"$schema": "https://json-schema.org/draft/2020-12/schema"'
            )
        else:
            schema_version = schema["$schema"]
            if "draft-07" in schema_version or "draft-06" in schema_version:
                self.suggestions.append(
                    "💡 Consider upgrading to Draft 2020-12 for better validation features"
                )
            elif "2020-12" in schema_version or "2019-09" in schema_version:
                self.info.append(f"✅ Using modern JSON Schema: {schema_version}")

    def _check_top_level_type(self, schema: dict[str, Any]) -> None:
        """Check if root schema has a type definition."""
        if "type" not in schema and "$ref" not in schema and "oneOf" not in schema:
            self.warnings.append(
                "⚠️  Root schema missing 'type' - consider adding a top-level type"
            )

    def _check_missing_descriptions(self, schema: dict[str, Any], context: str) -> None:
        """Check for missing descriptions in schema and properties."""
        if "description" not in schema and "properties" in schema:
            self.suggestions.append(
                f"💡 Add a 'description' to the root schema for better documentation"
            )

        if "properties" in schema:
            props = schema["properties"]
            missing_desc = [
                prop for prop in props if "description" not in props[prop]
            ]
            if missing_desc and len(missing_desc) <= 5:
                self.suggestions.append(
                    f"💡 Consider adding descriptions to: {', '.join(missing_desc[:5])}"
                )
            elif len(missing_desc) > 5:
                self.suggestions.append(
                    f"💡 {len(missing_desc)} properties missing descriptions"
                )

    def _check_missing_examples(self, schema: dict[str, Any]) -> None:
        """Check if schema includes examples."""
        if "properties" in schema and "examples" not in schema and "example" not in schema:
            self.suggestions.append(
                "💡 Consider adding 'examples' to help users understand the schema"
            )

    def _check_enum_values(self, schema: dict[str, Any], path: str = "root") -> None:
        """Check enum definitions for best practices."""
        if "enum" in schema:
            enum_values = schema["enum"]
            if len(enum_values) == 0:
                self.warnings.append(f"⚠️  Empty enum at {path}")
            elif len(enum_values) == 1:
                self.suggestions.append(
                    f"💡 Enum with single value at {path} - consider using 'const' instead"
                )

        # Recursively check nested schemas
        if "properties" in schema:
            for prop, prop_schema in schema["properties"].items():
                if isinstance(prop_schema, dict):
                    self._check_enum_values(prop_schema, f"{path}.properties.{prop}")

    def _check_required_fields(self, schema: dict[str, Any]) -> None:
        """Check required field definitions."""
        if "properties" in schema:
            props = set(schema["properties"].keys())
            required = set(schema.get("required", []))

            # Check for required fields not in properties
            invalid_required = required - props
            if invalid_required:
                self.warnings.append(
                    f"⚠️  Required fields not in properties: {', '.join(invalid_required)}"
                )

            # Suggest considering required fields if none are specified
            if not required and len(props) > 0:
                self.suggestions.append(
                    "💡 No required fields specified - consider if any fields are mandatory"
                )

    def _check_additional_properties(self, schema: dict[str, Any]) -> None:
        """Check additionalProperties usage."""
        if "properties" in schema and "additionalProperties" not in schema:
            self.suggestions.append(
                "💡 Consider explicitly setting 'additionalProperties' (true/false/schema) "
                "for clarity"
            )
        elif schema.get("additionalProperties") is True:
            self.info.append(
                "ℹ️  Schema allows additional properties - this may be intentional"
            )

    def _check_string_patterns(
        self, schema: dict[str, Any], path: str = "root"
    ) -> None:
        """Check string type definitions for patterns and formats."""
        if schema.get("type") == "string":
            if "format" not in schema and "pattern" not in schema and "enum" not in schema:
                if "email" in path.lower() or "mail" in path.lower():
                    self.suggestions.append(
                        f"💡 String at {path} might benefit from format: 'email'"
                    )
                elif "url" in path.lower() or "uri" in path.lower():
                    self.suggestions.append(
                        f"💡 String at {path} might benefit from format: 'uri'"
                    )
                elif "date" in path.lower():
                    self.suggestions.append(
                        f"💡 String at {path} might benefit from format: 'date' or 'date-time'"
                    )

        # Recursively check nested schemas
        if "properties" in schema:
            for prop, prop_schema in schema["properties"].items():
                if isinstance(prop_schema, dict):
                    self._check_string_patterns(prop_schema, f"{path}.{prop}")

    def _check_numeric_constraints(
        self, schema: dict[str, Any], path: str = "root"
    ) -> None:
        """Check numeric types for appropriate constraints."""
        if schema.get("type") in ["integer", "number"]:
            has_constraints = any(
                k in schema for k in ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum"]
            )
            if not has_constraints and "enum" not in schema:
                self.suggestions.append(
                    f"💡 Numeric field at {path} has no min/max constraints"
                )

        # Recursively check nested schemas
        if "properties" in schema:
            for prop, prop_schema in schema["properties"].items():
                if isinstance(prop_schema, dict):
                    self._check_numeric_constraints(prop_schema, f"{path}.{prop}")

    def _check_array_items(self, schema: dict[str, Any], path: str = "root") -> None:
        """Check array definitions."""
        if schema.get("type") == "array":
            if "items" not in schema:
                self.warnings.append(
                    f"⚠️  Array at {path} missing 'items' definition"
                )
            if "minItems" not in schema and "maxItems" not in schema:
                self.suggestions.append(
                    f"💡 Array at {path} has no size constraints (minItems/maxItems)"
                )

        # Recursively check nested schemas
        if "properties" in schema:
            for prop, prop_schema in schema["properties"].items():
                if isinstance(prop_schema, dict):
                    self._check_array_items(prop_schema, f"{path}.{prop}")

    def _check_deprecated_keywords(self, schema: dict[str, Any]) -> None:
        """Check for deprecated or discouraged keywords."""
        deprecated_keywords = {
            "id": "Use $id instead of id (Draft 6+)",
            "definitions": "Consider using $defs instead (Draft 2019-09+)",
        }

        for keyword, suggestion in deprecated_keywords.items():
            if keyword in schema:
                self.suggestions.append(f"💡 {suggestion}")

    def _check_ref_usage(self, schema: dict[str, Any], path: str = "root") -> None:
        """Check $ref usage patterns."""
        if "$ref" in schema:
            ref = schema["$ref"]
            # Check for internal references
            if ref.startswith("#/"):
                # This is good - internal reference
                pass
            elif not ref.startswith(("http://", "https://")):
                self.warnings.append(
                    f"⚠️  Potentially invalid $ref at {path}: {ref}"
                )

        # Recursively check nested schemas
        if "properties" in schema:
            for prop, prop_schema in schema["properties"].items():
                if isinstance(prop_schema, dict):
                    self._check_ref_usage(prop_schema, f"{path}.{prop}")

    def _check_title_presence(self, schema: dict[str, Any]) -> None:
        """Check if schema has a title."""
        if "title" not in schema:
            self.suggestions.append(
                "💡 Consider adding a 'title' to the schema for better documentation"
            )


def lint_schema(schema: dict[str, Any], filepath: Path) -> dict[str, list[str]]:
    """Convenience function to lint a schema."""
    linter = SchemaLinter()
    return linter.lint(schema, filepath)
