# JSON Schema Linting Guide

The Python validation tool includes a comprehensive linter that checks JSON Schemas for best practices and provides actionable suggestions.

## Quick Start

```bash
# Validate with linting (enabled by default with -v)
python python/validate_schemas.py -v src/data/schema_unification.schema.json

# Just linting, less verbose
python python/validate_schemas.py --lint src/data/schema_unification.schema.json

# Validation only, no linting
python python/validate_schemas.py --no-lint src/data/schema_unification.schema.json
```

## Linting Categories

The linter provides three types of feedback:

- ⚠️ **Warnings**: Issues that may cause validation problems or are likely errors
- 💡 **Suggestions**: Best practices that improve schema quality and documentation
- ✅ **Info**: Confirmations about good practices already in use

## What the Linter Checks

### 1. Schema Version & Metadata

**Missing $schema declaration**
```json
// ❌ Bad
{
  "type": "object"
}

// ✅ Good
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object"
}
```

**Old JSON Schema draft**
```json
// 💡 Suggestion: Upgrade to Draft 2020-12
{
  "$schema": "http://json-schema.org/draft-07/schema#"
}

// ✅ Good
{
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

**Missing title and description**
```json
// 💡 Suggestion: Add title and description
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object"
}

// ✅ Good
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Person",
  "description": "A person object with name and contact info",
  "type": "object"
}
```

### 2. Documentation

**Missing property descriptions**
```json
// 💡 Suggestion: Add descriptions
{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "age": { "type": "integer" }
  }
}

// ✅ Good
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Full name of the person"
    },
    "age": {
      "type": "integer",
      "description": "Age in years"
    }
  }
}
```

**Missing examples**
```json
// 💡 Suggestion: Add examples
{
  "type": "object",
  "properties": {
    "email": { "type": "string", "format": "email" }
  }
}

// ✅ Good
{
  "type": "object",
  "properties": {
    "email": { "type": "string", "format": "email" }
  },
  "examples": [
    { "email": "user@example.com" }
  ]
}
```

### 3. Type Constraints

**Numeric types without constraints**
```json
// 💡 Suggestion: Add min/max
{
  "type": "object",
  "properties": {
    "age": { "type": "integer" }
  }
}

// ✅ Good
{
  "type": "object",
  "properties": {
    "age": {
      "type": "integer",
      "minimum": 0,
      "maximum": 150
    }
  }
}
```

**Strings without format**
```json
// 💡 Suggestion: Use format for known patterns
{
  "type": "object",
  "properties": {
    "email": { "type": "string" },
    "website": { "type": "string" },
    "birthDate": { "type": "string" }
  }
}

// ✅ Good
{
  "type": "object",
  "properties": {
    "email": { "type": "string", "format": "email" },
    "website": { "type": "string", "format": "uri" },
    "birthDate": { "type": "string", "format": "date" }
  }
}
```

**Arrays without items or size constraints**
```json
// ⚠️ Warning: Missing items definition
{
  "type": "object",
  "properties": {
    "tags": { "type": "array" }
  }
}

// 💡 Suggestion: Add size constraints
{
  "type": "object",
  "properties": {
    "tags": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}

// ✅ Good
{
  "type": "object",
  "properties": {
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1,
      "maxItems": 10
    }
  }
}
```

### 4. Required Fields & Additional Properties

**Invalid required fields**
```json
// ⚠️ Warning: Required field not in properties
{
  "type": "object",
  "properties": {
    "name": { "type": "string" }
  },
  "required": ["name", "nonexistent"]
}

// ✅ Good
{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "email": { "type": "string" }
  },
  "required": ["name", "email"]
}
```

**Missing required fields specification**
```json
// 💡 Suggestion: Consider which fields are mandatory
{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "email": { "type": "string" }
  }
}

// ✅ Good (explicit about requirements)
{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "email": { "type": "string" }
  },
  "required": ["name"]
}
```

**Missing additionalProperties**
```json
// 💡 Suggestion: Explicitly set additionalProperties
{
  "type": "object",
  "properties": {
    "name": { "type": "string" }
  }
}

// ✅ Good (explicit about additional properties)
{
  "type": "object",
  "properties": {
    "name": { "type": "string" }
  },
  "additionalProperties": false
}
```

### 5. Enum & Constants

**Empty enum**
```json
// ⚠️ Warning: Empty enum
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": []
    }
  }
}

// ✅ Good
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["active", "inactive", "pending"]
    }
  }
}
```

**Single-value enum**
```json
// 💡 Suggestion: Use const instead
{
  "type": "object",
  "properties": {
    "version": {
      "type": "string",
      "enum": ["1.0"]
    }
  }
}

// ✅ Good
{
  "type": "object",
  "properties": {
    "version": {
      "type": "string",
      "const": "1.0"
    }
  }
}
```

### 6. Deprecated Keywords

**Using old keywords**
```json
// 💡 Suggestion: Use $defs instead of definitions
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "definitions": {
    "Address": { "type": "object" }
  }
}

// ✅ Good
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$defs": {
    "Address": { "type": "object" }
  }
}
```

## Example Linting Session

```bash
$ python python/validate_schemas.py -v src/data/example.schema.json

============================================================
Validating: src/data/example.schema.json
============================================================
✅ example.schema.json is valid

📋 Best Practices Check for example.schema.json:
────────────────────────────────────────────────────────────
  ⚠️  Required fields not in properties: nonexistent
  💡 Consider upgrading to Draft 2020-12 for better features
  💡 Add a 'description' to the root schema for documentation
  💡 Consider adding descriptions to: name, email, age
  💡 Numeric field at root.age has no min/max constraints
  💡 String at root.email might benefit from format: 'email'
  💡 Array at root.tags has no size constraints (minItems/maxItems)
  ✅ Using modern JSON Schema: https://json-schema.org/draft/2019-09/schema
────────────────────────────────────────────────────────────

============================================================
✅ All schemas are valid!
```

## Well-Formed Schema Example

A schema that produces minimal warnings/suggestions:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Person",
  "description": "A person object with contact information",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Full name of the person",
      "minLength": 1,
      "maxLength": 100
    },
    "age": {
      "type": "integer",
      "description": "Age in years",
      "minimum": 0,
      "maximum": 150
    },
    "email": {
      "type": "string",
      "format": "email",
      "description": "Email address"
    },
    "tags": {
      "type": "array",
      "description": "Tags associated with the person",
      "items": { "type": "string" },
      "minItems": 0,
      "maxItems": 20
    }
  },
  "required": ["name", "email"],
  "additionalProperties": false,
  "examples": [
    {
      "name": "Jane Doe",
      "age": 30,
      "email": "jane@example.com",
      "tags": ["developer", "contributor"]
    }
  ]
}
```

## Customizing Linting Behavior

### Enable/Disable Linting

```bash
# Linting enabled with verbose mode (default)
python python/validate_schemas.py -v schema.json

# Explicitly enable linting without full verbose mode
python python/validate_schemas.py --lint schema.json

# Disable linting (validation only)
python python/validate_schemas.py --no-lint schema.json
```

### In CI/CD Pipelines

```yaml
# Fail on validation errors only (warnings/suggestions don't fail)
- name: Validate schemas
  run: |
    python python/validate_schemas.py src/data/*.schema.json

# Validate with linting output for review
- name: Validate with best practices check
  run: |
    python python/validate_schemas.py --lint src/data/*.schema.json
```

## Benefits of Linting

1. **Consistency**: Ensures all schemas follow the same conventions
2. **Documentation**: Encourages adding descriptions and examples
3. **Validation Quality**: Catches missing constraints that could allow invalid data
4. **Maintainability**: Flags deprecated features and suggests modern alternatives
5. **Developer Experience**: Provides helpful suggestions for improvement

## Learn More

- [JSON Schema Best Practices](https://json-schema.org/understanding-json-schema/reference/index.html)
- [JSON Schema Specification](https://json-schema.org/specification.html)
- [Python validation README](../python/README.md)
- [Quick Start Guide](./PYTHON-VALIDATION-QUICK-START.md)
