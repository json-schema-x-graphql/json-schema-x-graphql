> **⚠️ ARCHIVED DOCUMENTATION**
>
> This document has been archived and is preserved for historical reference only.
>
> See instead: [x-graphql Hints Guide](../../x-graphql-hints-guide.md) and [Schema Pipeline Guide](../../schema-pipeline-guide.md)
>
> Archived: December 2024  
> Reason: Superseded by consolidated hints and pipeline guides

# GraphQL Extensions Guide for JSON Schema

## Overview

This guide documents the `x-graphql-*` extension properties used in the Enterprise Schema Unification Forest JSON Schema to preserve GraphQL-specific metadata and enable automated GraphQL SDL generation.

**Purpose**: Bridge JSON Schema (canonical) and GraphQL SDL (generated) while maintaining:

- Rich GraphQL type system features (unions, enums, interfaces)
- API-specific operations (queries, mutations, subscriptions)
- Relationships and resolvers
- Custom scalars and directives

---

## Table of Contents

1. [Extension Principles](#extension-principles)
2. [Core Extensions](#core-extensions)
3. [Type Extensions](#type-extensions)
4. [Field Extensions](#field-extensions)
5. [Operation Extensions](#operation-extensions)
6. [Advanced Patterns](#advanced-patterns)
7. [Examples](#examples)
8. [Best Practices](#best-practices)

---

## Extension Principles

### Design Philosophy

1. **Non-Breaking**: Extensions are ignored by standard JSON Schema validators
2. **Self-Documenting**: Extension names clearly indicate their purpose
3. **Minimal**: Only add extensions when JSON Schema can't express the concept
4. **Consistent**: Follow naming patterns across all extensions

### Naming Convention

All extensions use the `x-graphql-` prefix followed by the GraphQL concept:

```
x-graphql-{concept}
```

Examples:

- `x-graphql-enum` - Enum type metadata
- `x-graphql-union` - Union type definition
- `x-graphql-required` - Override required status for GraphQL
- `x-graphql-field` - Field resolver configuration

---

## Core Extensions

### 1. x-graphql-type

Override the generated GraphQL type name or add type-level metadata.

**Usage**: Definition-level property

**Schema**:

```json
{
  "x-graphql-type": {
    "name": "string", // GraphQL type name (optional)
    "description": "string", // Type description (optional)
    "implements": ["string"], // Interfaces implemented (optional)
    "directives": [
      // GraphQL directives (optional)
      {
        "name": "string",
        "args": {}
      }
    ]
  }
}
```

**Example**:

```json
{
  "definitions": {
    "Contract": {
      "type": "object",
      "description": "Federal contract record",
      "x-graphql-type": {
        "name": "Contract",
        "implements": ["Node", "Timestamped"],
        "directives": [
          {
            "name": "cacheControl",
            "args": { "maxAge": 300 }
          }
        ]
      },
      "properties": {
        "id": {
          "type": "string",
          "description": "Unique identifier"
        }
      }
    }
  }
}
```

**Generated GraphQL**:

```graphql
"""
Federal contract record
"""
type Contract implements Node & Timestamped @cacheControl(maxAge: 300) {
  """
  Unique identifier
  """
  id: String
}
```

---

### 2. x-graphql-enum

Define GraphQL enum with custom value names and descriptions.

**Usage**: Definition-level property for string enums

**Schema**:

```json
{
  "x-graphql-enum": {
    "name": "string", // Enum type name (required)
    "description": "string", // Enum description (optional)
    "values": {
      // Value mappings (required)
      "json-value": {
        "name": "GRAPHQL_NAME", // GraphQL enum value (required)
        "description": "string", // Value description (optional)
        "deprecated": "string" // Deprecation reason (optional)
      }
    }
  }
}
```

**Example**:

```json
{
  "definitions": {
    "ContactRole": {
      "type": "string",
      "description": "Role classification for contract contacts",
      "enum": ["primary", "technical", "administrative", "contracting_officer"],
      "x-graphql-enum": {
        "name": "ContactRole",
        "description": "Role classification for contract contacts",
        "values": {
          "primary": {
            "name": "PRIMARY",
            "description": "Primary contact for the contract"
          },
          "technical": {
            "name": "TECHNICAL",
            "description": "Technical point of contact"
          },
          "administrative": {
            "name": "ADMINISTRATIVE",
            "description": "Administrative contact"
          },
          "contracting_officer": {
            "name": "CONTRACTING_OFFICER",
            "description": "Government contracting officer"
          }
        }
      }
    }
  }
}
```

**Generated GraphQL**:

```graphql
"""
Role classification for contract contacts
"""
enum ContactRole {
  """
  Primary contact for the contract
  """
  PRIMARY

  """
  Technical point of contact
  """
  TECHNICAL

  """
  Administrative contact
  """
  ADMINISTRATIVE

  """
  Government contracting officer
  """
  CONTRACTING_OFFICER
}
```

---

### 3. x-graphql-union

Define GraphQL union types for polymorphic relationships.

**Usage**: Definition-level property

**Schema**:

```json
{
  "x-graphql-union": {
    "name": "string", // Union type name (required)
    "description": "string", // Union description (optional)
    "types": ["string"], // Member types (required)
    "discriminator": "string" // JSON discriminator field (optional)
  }
}
```

**Example**:

```json
{
  "definitions": {
    "SystemExtension": {
      "description": "System-specific extension data",
      "x-graphql-union": {
        "name": "SystemExtension",
        "description": "Union of all system-specific extensions",
        "types": [
          "Contract DataExtension",
          "AssistExtension",
          "EasiExtension",
          "Logistics MgmtExtension"
        ],
        "discriminator": "systemType"
      },
      "oneOf": [
        { "$ref": "#/definitions/Contract DataExtension" },
        { "$ref": "#/definitions/AssistExtension" },
        { "$ref": "#/definitions/EasiExtension" },
        { "$ref": "#/definitions/Logistics MgmtExtension" }
      ]
    }
  }
}
```

**Generated GraphQL**:

```graphql
"""
Union of all system-specific extensions
"""
union SystemExtension = Contract DataExtension | AssistExtension | EasiExtension | Logistics MgmtExtension
```

---

### 4. x-graphql-scalar

Map JSON Schema format to GraphQL custom scalar.

**Usage**: Property-level annotation

**Schema**:

```json
{
  "x-graphql-scalar": "string" // GraphQL scalar name
}
```

**Example**:

```json
{
  "definitions": {
    "SystemMetadata": {
      "properties": {
        "lastModified": {
          "type": "string",
          "format": "date-time",
          "description": "Last modification timestamp",
          "x-graphql-scalar": "DateTime"
        },
        "effectiveDate": {
          "type": "string",
          "format": "date",
          "description": "Effective date",
          "x-graphql-scalar": "Date"
        },
        "amount": {
          "type": "number",
          "description": "Dollar amount",
          "x-graphql-scalar": "Decimal"
        },
        "metadata": {
          "type": "object",
          "description": "Arbitrary metadata",
          "x-graphql-scalar": "JSON"
        }
      }
    }
  }
}
```

**Root-level scalar definitions**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "x-graphql-scalars": {
    "DateTime": {
      "description": "ISO 8601 date-time string",
      "serialize": "String"
    },
    "Date": {
      "description": "ISO 8601 date string",
      "serialize": "String"
    },
    "Decimal": {
      "description": "High-precision decimal number",
      "serialize": "Float"
    },
    "JSON": {
      "description": "Arbitrary JSON value",
      "serialize": "JSON"
    }
  }
}
```

**Generated GraphQL**:

```graphql
"""
ISO 8601 date-time string
"""
scalar DateTime

"""
ISO 8601 date string
"""
scalar Date

"""
High-precision decimal number
"""
scalar Decimal

"""
Arbitrary JSON value
"""
scalar JSON

type SystemMetadata {
  """
  Last modification timestamp
  """
  lastModified: DateTime

  """
  Effective date
  """
  effectiveDate: Date

  """
  Dollar amount
  """
  amount: Decimal

  """
  Arbitrary metadata
  """
  metadata: JSON
}
```

---

## Type Extensions

### 5. x-graphql-required

Override JSON Schema's required array for GraphQL field nullability.

**Use Case**: Field is optional in JSON (data flexibility) but required in GraphQL API (type safety).

**Usage**: Property-level boolean

**Schema**:

```json
{
  "x-graphql-required": true
}
```

**Example**:

```json
{
  "definitions": {
    "SystemMetadata": {
      "type": "object",
      "properties": {
        "schemaVersion": {
          "type": "string",
          "default": "2.0",
          "description": "Schema version",
          "x-graphql-required": true
        },
        "lastModified": {
          "type": "string",
          "format": "date-time",
          "description": "Last modification timestamp",
          "x-graphql-scalar": "DateTime",
          "x-graphql-required": true
        },
        "dataQuality": {
          "type": "object",
          "description": "Optional data quality metrics"
        }
      }
    }
  }
}
```

**Generated GraphQL**:

```graphql
type SystemMetadata {
  """
  Schema version
  """
  schemaVersion: String! # Required due to x-graphql-required
  """
  Last modification timestamp
  """
  lastModified: DateTime! # Required due to x-graphql-required
  """
  Optional data quality metrics
  """
  dataQuality: JSON # Optional (no x-graphql-required)
}
```

---

### 6. x-graphql-interface

Define GraphQL interface implemented by types.

**Usage**: Definition-level property

**Schema**:

```json
{
  "x-graphql-interface": {
    "name": "string", // Interface name (required)
    "description": "string", // Interface description (optional)
    "fields": {
      // Interface fields (required)
      "fieldName": {
        "type": "string",
        "description": "string"
      }
    }
  }
}
```

**Example**:

```json
{
  "definitions": {
    "Node": {
      "description": "Base interface for all entities with global IDs",
      "x-graphql-interface": {
        "name": "Node",
        "description": "An object with a globally unique ID",
        "fields": {
          "id": {
            "type": "ID!",
            "description": "Globally unique identifier"
          }
        }
      }
    },
    "Contract": {
      "type": "object",
      "x-graphql-type": {
        "implements": ["Node"]
      },
      "properties": {
        "id": {
          "type": "string",
          "description": "Unique contract identifier"
        }
      }
    }
  }
}
```

**Generated GraphQL**:

```graphql
"""
An object with a globally unique ID
"""
interface Node {
  """
  Globally unique identifier
  """
  id: ID!
}

type Contract implements Node {
  """
  Unique contract identifier
  """
  id: ID!
}
```

---

## Field Extensions

### 7. x-graphql-field

Define custom field behavior, arguments, and resolver configuration.

**Usage**: Property-level object

**Schema**:

```json
{
  "x-graphql-field": {
    "name": "string", // Field name override (optional)
    "type": "string", // GraphQL type override (optional)
    "description": "string", // Field description (optional)
    "args": {
      // Field arguments (optional)
      "argName": {
        "type": "string",
        "description": "string",
        "default": "any"
      }
    },
    "resolver": "string", // Resolver function name (optional)
    "deprecated": "string" // Deprecation reason (optional)
  }
}
```

**Example**:

```json
{
  "definitions": {
    "Contract": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string"
        },
        "referencedPiid": {
          "type": "string",
          "description": "Referenced contract PIID"
        },
        "relatedContracts": {
          "description": "Related contracts via referencedPiid",
          "x-graphql-field": {
            "type": "[Contract!]",
            "description": "Fetch related contracts",
            "args": {
              "first": {
                "type": "Int",
                "description": "Number of contracts to return",
                "default": 10
              },
              "after": {
                "type": "String",
                "description": "Cursor for pagination"
              }
            },
            "resolver": "Contract.relatedContracts"
          }
        },
        "legacyField": {
          "type": "string",
          "description": "Old field",
          "x-graphql-field": {
            "deprecated": "Use newField instead"
          }
        }
      }
    }
  }
}
```

**Generated GraphQL**:

```graphql
type Contract {
  id: String
  referencedPiid: String

  """
  Fetch related contracts
  """
  relatedContracts(
    """
    Number of contracts to return
    """
    first: Int = 10

    """
    Cursor for pagination
    """
    after: String
  ): [Contract!]

  """
  Old field
  """
  legacyField: String @deprecated(reason: "Use newField instead")
}
```

---

## Operation Extensions

### 8. x-graphql-operations

Define root Query, Mutation, and Subscription operations.

**Usage**: Root-level schema property

**Schema**:

```json
{
  "x-graphql-operations": {
    "queries": {
      "operationName": {
        "type": "string",
        "description": "string",
        "args": {}
      }
    },
    "mutations": {
      "operationName": {
        "type": "string",
        "description": "string",
        "args": {}
      }
    },
    "subscriptions": {
      "operationName": {
        "type": "string",
        "description": "string",
        "args": {}
      }
    }
  }
}
```

**Example**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://github.com/GSA-TTS/enterprise-schema-unification/schemas/contract-v2",
  "x-graphql-operations": {
    "queries": {
      "contract": {
        "type": "Contract",
        "description": "Fetch a single contract by ID",
        "args": {
          "id": {
            "type": "ID!",
            "description": "Global record identifier"
          }
        }
      },
      "contracts": {
        "type": "ContractConnection!",
        "description": "Paginated list of contracts with filtering",
        "args": {
          "first": {
            "type": "Int",
            "description": "Number of contracts to return",
            "default": 10
          },
          "after": {
            "type": "String",
            "description": "Cursor for pagination"
          },
          "filter": {
            "type": "ContractFilter",
            "description": "Filter criteria"
          },
          "orderBy": {
            "type": "ContractOrderBy",
            "description": "Ordering criteria"
          }
        }
      },
      "searchContracts": {
        "type": "[Contract!]!",
        "description": "Full-text search for contracts",
        "args": {
          "query": {
            "type": "String!",
            "description": "Search query"
          },
          "limit": {
            "type": "Int",
            "default": 20
          }
        }
      }
    },
    "mutations": {
      "triggerDataIngestion": {
        "type": "Boolean!",
        "description": "Trigger data ingestion from external system",
        "args": {
          "system": {
            "type": "SystemType!",
            "description": "System to ingest from (Contract Data, Legacy Procurement, Intake Process, Logistics Mgmt)"
          },
          "fullRefresh": {
            "type": "Boolean",
            "description": "Whether to perform full refresh",
            "default": false
          }
        }
      },
      "updateContractMetadata": {
        "type": "Contract!",
        "description": "Update contract metadata",
        "args": {
          "id": {
            "type": "ID!",
            "description": "Contract ID"
          },
          "input": {
            "type": "ContractMetadataInput!",
            "description": "Metadata updates"
          }
        }
      }
    },
    "subscriptions": {
      "contractUpdated": {
        "type": "Contract!",
        "description": "Subscribe to contract updates",
        "args": {
          "id": {
            "type": "ID!",
            "description": "Contract ID to watch"
          }
        }
      }
    }
  }
}
```

**Generated GraphQL**:

```graphql
type Query {
  """
  Fetch a single contract by ID
  """
  contract(
    """
    Global record identifier
    """
    id: ID!
  ): Contract

  """
  Paginated list of contracts with filtering
  """
  contracts(
    """
    Number of contracts to return
    """
    first: Int = 10

    """
    Cursor for pagination
    """
    after: String

    """
    Filter criteria
    """
    filter: ContractFilter

    """
    Ordering criteria
    """
    orderBy: ContractOrderBy
  ): ContractConnection!

  """
  Full-text search for contracts
  """
  searchContracts(
    """
    Search query
    """
    query: String!

    limit: Int = 20
  ): [Contract!]!
}

type Mutation {
  """
  Trigger data ingestion from external system
  """
  triggerDataIngestion(
    """
    System to ingest from (Contract Data, Legacy Procurement, Intake Process, Logistics Mgmt)
    """
    system: SystemType!

    """
    Whether to perform full refresh
    """
    fullRefresh: Boolean = false
  ): Boolean!

  """
  Update contract metadata
  """
  updateContractMetadata(
    """
    Contract ID
    """
    id: ID!

    """
    Metadata updates
    """
    input: ContractMetadataInput!
  ): Contract!
}

type Subscription {
  """
  Subscribe to contract updates
  """
  contractUpdated(
    """
    Contract ID to watch
    """
    id: ID!
  ): Contract!
}
```

---

## Advanced Patterns

### 9. Pagination (Relay Cursor Connections)

**Root-level configuration**:

```json
{
  "x-graphql-pagination": {
    "enabled": true,
    "style": "relay",
    "types": {
      "Contract": {
        "connection": "ContractConnection",
        "edge": "ContractEdge"
      }
    }
  }
}
```

**Auto-generated types**:

```graphql
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type ContractEdge {
  cursor: String!
  node: Contract!
}

type ContractConnection {
  edges: [ContractEdge!]!
  pageInfo: PageInfo!
  totalCount: Int
}
```

---

### 10. Input Types

**Definition with input type mapping**:

```json
{
  "definitions": {
    "ContractMetadata": {
      "type": "object",
      "properties": {
        "tags": {
          "type": "array",
          "items": { "type": "string" }
        },
        "notes": {
          "type": "string"
        }
      },
      "x-graphql-input": {
        "name": "ContractMetadataInput",
        "description": "Input for updating contract metadata"
      }
    }
  }
}
```

**Generated GraphQL**:

```graphql
input ContractMetadataInput {
  tags: [String!]
  notes: String
}
```

---

### 11. Relationships

**Define relationships between types**:

```json
{
  "definitions": {
    "Contract": {
      "properties": {
        "vendorId": {
          "type": "string",
          "description": "Vendor DUNS number"
        },
        "vendor": {
          "description": "Associated vendor",
          "x-graphql-field": {
            "type": "Vendor",
            "resolver": "Contract.vendor",
            "args": {}
          }
        }
      },
      "x-graphql-relationships": {
        "vendor": {
          "type": "Vendor",
          "foreignKey": "vendorId",
          "cardinality": "many-to-one"
        },
        "modifications": {
          "type": "Modification",
          "foreignKey": "contractId",
          "cardinality": "one-to-many"
        }
      }
    }
  }
}
```

---

## Examples

### Complete Schema Example

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://github.com/GSA-TTS/enterprise-schema-unification/schemas/contract-v2",
  "title": "Enterprise Schema Unification Forest Contract Schema",
  "description": "Unified federal contract data schema",

  "x-graphql-scalars": {
    "DateTime": {
      "description": "ISO 8601 date-time string"
    },
    "Date": {
      "description": "ISO 8601 date string"
    },
    "Decimal": {
      "description": "High-precision decimal"
    }
  },

  "x-graphql-operations": {
    "queries": {
      "contract": {
        "type": "Contract",
        "description": "Fetch contract by ID",
        "args": {
          "id": { "type": "ID!" }
        }
      },
      "contracts": {
        "type": "ContractConnection!",
        "description": "Paginated contracts",
        "args": {
          "first": { "type": "Int", "default": 10 },
          "after": { "type": "String" }
        }
      }
    },
    "mutations": {
      "triggerDataIngestion": {
        "type": "Boolean!",
        "args": {
          "system": { "type": "SystemType!" }
        }
      }
    }
  },

  "definitions": {
    "ContactRole": {
      "type": "string",
      "enum": ["primary", "technical", "administrative", "contracting_officer"],
      "x-graphql-enum": {
        "name": "ContactRole",
        "values": {
          "primary": { "name": "PRIMARY" },
          "technical": { "name": "TECHNICAL" },
          "administrative": { "name": "ADMINISTRATIVE" },
          "contracting_officer": { "name": "CONTRACTING_OFFICER" }
        }
      }
    },

    "SystemType": {
      "type": "string",
      "enum": ["Contract Data", "Legacy Procurement", "Intake Process", "Logistics Mgmt"],
      "x-graphql-enum": {
        "name": "SystemType",
        "values": {
          "Contract Data": {
            "name": "Contract Data",
            "description": "Federal Procurement Data System"
          },
          "Legacy Procurement": {
            "name": "Legacy Procurement",
            "description": "Award System for Streamlined IT Transactions"
          },
          "Intake Process": {
            "name": "Intake Process",
            "description": "Enterprise Acquisition System for Infrastructure"
          },
          "Logistics Mgmt": {
            "name": "Logistics Mgmt",
            "description": "Contract Award Lifecycle Management"
          }
        }
      }
    },

    "Contract": {
      "type": "object",
      "description": "Federal contract record",
      "x-graphql-type": {
        "implements": ["Node"],
        "directives": [{ "name": "cacheControl", "args": { "maxAge": 300 } }]
      },
      "properties": {
        "id": {
          "type": "string",
          "description": "Unique identifier",
          "x-graphql-required": true
        },
        "piid": {
          "type": "string",
          "description": "Procurement Instrument Identifier",
          "x-graphql-required": true
        },
        "systemMetadata": {
          "$ref": "#/definitions/SystemMetadata"
        }
      }
    },

    "SystemMetadata": {
      "type": "object",
      "properties": {
        "schemaVersion": {
          "type": "string",
          "default": "2.0",
          "x-graphql-required": true
        },
        "lastModified": {
          "type": "string",
          "format": "date-time",
          "x-graphql-scalar": "DateTime",
          "x-graphql-required": true
        }
      }
    }
  }
}
```

---

## Best Practices

### When to Use Extensions

✅ **DO use extensions for**:

- Enum value naming (SCREAMING_SNAKE_CASE vs kebab-case)
- Union types (JSON Schema uses oneOf)
- GraphQL operations (Query/Mutation/Subscription)
- Custom scalars (DateTime, Decimal, JSON)
- Required field overrides (different semantics)
- Relationships and resolvers
- Pagination patterns

❌ **DON'T use extensions for**:

- Simple type mappings (string → String)
- Descriptions (use JSON Schema description)
- Basic required fields (use JSON Schema required array)
- Anything JSON Schema can express natively

### Validation

Always validate:

1. JSON Schema is valid (ajv)
2. Extensions follow schema
3. Referenced types exist
4. Generated GraphQL compiles

```bash
# Validate JSON Schema
ajv validate -s src/data/schema_unification.schema.json

# Generate and validate GraphQL
pnpm run generate:graphql
pnpm run validate:graphql
```

### Documentation

Document extensions in schema:

```json
{
  "definitions": {
    "ContactRole": {
      "description": "Role classification. Uses x-graphql-enum for SCREAMING_SNAKE_CASE values.",
      "x-graphql-enum": {
        "name": "ContactRole",
        "values": {
          /* ... */
        }
      }
    }
  }
}
```

### Versioning

When schema evolves:

1. Add new extensions
2. Deprecate old fields
3. Maintain backward compatibility
4. Document breaking changes

```json
{
  "oldField": {
    "type": "string",
    "x-graphql-field": {
      "deprecated": "Use newField instead. Will be removed in v3.0"
    }
  }
}
```

---

## Troubleshooting

### Extension Not Applied

**Problem**: Extension ignored during generation

**Solution**: Check:

- Extension name spelling
- Extension placement (root vs definition vs property)
- Generator version supports extension
- Extension schema is valid JSON

### Generated Type Mismatch

**Problem**: Generated GraphQL doesn't match expectations

**Solution**:

- Review extension configuration
- Check for conflicting extensions
- Validate JSON Schema structure
- Review generator logs

### Circular References

**Problem**: Types reference each other

**Solution**:

- Use $ref for circular types
- Ensure all types are in definitions
- Check for infinite recursion

---

## Reference

### All Extensions

| Extension                 | Level      | Purpose                      |
| ------------------------- | ---------- | ---------------------------- |
| `x-graphql-type`          | Definition | Type metadata and interfaces |
| `x-graphql-enum`          | Definition | Enum configuration           |
| `x-graphql-union`         | Definition | Union type definition        |
| `x-graphql-interface`     | Definition | Interface definition         |
| `x-graphql-scalar`        | Property   | Custom scalar mapping        |
| `x-graphql-required`      | Property   | Required override            |
| `x-graphql-field`         | Property   | Field configuration          |
| `x-graphql-input`         | Definition | Input type mapping           |
| `x-graphql-operations`    | Root       | Query/Mutation/Subscription  |
| `x-graphql-scalars`       | Root       | Scalar definitions           |
| `x-graphql-pagination`    | Root       | Pagination configuration     |
| `x-graphql-relationships` | Definition | Type relationships           |

### Generator Support

Check which extensions are supported:

```bash
node scripts/generate-graphql.mjs --list-extensions
```

---

## See Also

- [ADR 0002: Schema Tooling Automation](adr/0002-schema-tooling-automation.md)
- [Migration Plan](migration-to-json-schema-canonical.md)
- [Schema Management Guide](schemaManagement.md)
- [JSON Schema Specification](https://json-schema.org/)
- [GraphQL Specification](https://spec.graphql.org/)
