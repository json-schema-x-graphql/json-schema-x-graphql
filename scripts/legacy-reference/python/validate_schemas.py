#!/usr/bin/env python3
"""
JSON Schema validation script for Schema Unification Forest schemas.

This script validates JSON Schema files using jsonschema (the reference implementation)
to ensure schemas are well-formed and compliant with the JSON Schema specification.
It also provides linting and best practices suggestions.
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any

try:
    import jsonschema
    from jsonschema import Draft202012Validator, validators
except ImportError:
    print("Error: jsonschema not installed. Run: uv pip install jsonschema")
    sys.exit(1)

try:
    from schema_linter import lint_schema
except ImportError:
    print("Warning: schema_linter not found. Linting disabled.")
    lint_schema = None


def load_json_file(filepath: Path) -> dict[str, Any]:
    """Load and parse a JSON file."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ JSON parse error in {filepath}: {e}")
        sys.exit(1)
    except FileNotFoundError:
        print(f"❌ File not found: {filepath}")
        sys.exit(1)


def validate_with_jsonschema(schema: dict[str, Any], filepath: Path, verbose: bool = False) -> bool:
    """Validate a JSON Schema using the jsonschema library."""
    try:
        # Check if the schema itself is valid against the JSON Schema metaschema
        validator_class = validators.validator_for(schema)
        validator_class.check_schema(schema)
        
        if verbose:
            print(f"✅ {filepath.name} is valid")
        else:
            print(f"✅ {filepath.name} is valid")
        
        return True
    except jsonschema.exceptions.SchemaError as e:
        print(f"❌ {filepath.name} schema error: {e.message}")
        return False
    except Exception as e:
        print(f"❌ {filepath.name} validation error: {e}")
        return False


def print_lint_results(results: dict[str, list[str]], filepath: Path) -> None:
    """Print linting results in a readable format."""
    warnings = results.get("warnings", [])
    suggestions = results.get("suggestions", [])
    info = results.get("info", [])
    
    if warnings or suggestions or info:
        print(f"\n📋 Best Practices Check for {filepath.name}:")
        print("─" * 60)
        
        if warnings:
            for warning in warnings:
                print(f"  {warning}")
        
        if suggestions:
            for suggestion in suggestions:
                print(f"  {suggestion}")
        
        if info:
            for item in info:
                print(f"  {item}")
        
        print("─" * 60)


def main():
    """Main entry point for the validation script."""
    parser = argparse.ArgumentParser(
        description="Validate JSON Schema files for Schema Unification Forest"
    )
    parser.add_argument(
        "schemas",
        nargs="+",
        type=Path,
        help="Path(s) to JSON Schema file(s) to validate",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Enable verbose output",
    )
    parser.add_argument(
        "--lint",
        action="store_true",
        help="Run linting checks for best practices (enabled by default with -v)",
    )
    parser.add_argument(
        "--no-lint",
        action="store_true",
        help="Disable linting checks",
    )

    args = parser.parse_args()

    # Enable linting by default with verbose, unless explicitly disabled
    run_linting = (args.lint or args.verbose) and not args.no_lint

    all_valid = True

    for schema_path in args.schemas:
        if not schema_path.exists():
            print(f"❌ File not found: {schema_path}")
            all_valid = False
            continue

        if args.verbose:
            print(f"\n{'=' * 60}")
            print(f"Validating: {schema_path}")
            print(f"{'=' * 60}")

        schema = load_json_file(schema_path)

        # Validate with jsonschema (reference implementation)
        valid = validate_with_jsonschema(schema, schema_path, args.verbose)

        if not valid:
            all_valid = False

        # Run linting checks if enabled
        if run_linting and lint_schema:
            lint_results = lint_schema(schema, schema_path)
            print_lint_results(lint_results, schema_path)

    print("\n" + "=" * 60)
    if all_valid:
        print("✅ All schemas are valid!")
        sys.exit(0)
    else:
        print("❌ Some schemas failed validation")
        sys.exit(1)


if __name__ == "__main__":
    main()
