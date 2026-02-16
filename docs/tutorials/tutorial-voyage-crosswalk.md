# Apollo Voyage Tutorial Crosswalk for json-schema-x-graphql

This guide maps the concepts and steps from the [Apollo Odyssey "Voyage" series](https://www.apollographql.com/tutorials/voyage-part1/) to the `json-schema-x-graphql` ecosystem. It demonstrates how to achieve the same Federation architecture using JSON Schema as the source of truth.

## Series Overview

1.  [**Part 1: Federation from Day One**](#part-1-federation-from-day-one)
    - Defining Subgraphs in JSON Schema
    - Entity Keys & References (`x-graphql-federation`)
    - Generating & Publishing SDL
2.  [**Part 2: Federating the Monolith**](#part-2-federating-the-monolith)
    - The Strangler Fig Pattern with JSON Schema
    - Using `@override` via `x-graphql-federation-override-from`
    - Authentication & Router Config
3.  [**Part 3: Federation in Production**](#part-3-federation-in-production)
    - CI/CD Integration
    - Schema Checks for JSON-source pipelines
    - Using `@inaccessible` via `x-graphql-federation-inaccessible`

---

## Part 1: Federation from Day One

**Goal**: Build a supergraph from multiple subgraphs (Locations and Reviews) using JSON Schema.

### 1.1 Project Setup & Schema Definition

**Apollo Way**: Define `locations.graphql` and `reviews.graphql` SDL manually.
**JSON Schema Way**: Define `locations.schema.json` and `reviews.schema.json`.

#### Locations Subgraph

Define the `Location` entity.

**`locations.schema.json`**:

```json
{
  "$id": "https://example.com/locations.schema.json",
  "definitions": {
    "Location": {
      "type": "object",
      "x-graphql-type-name": "Location",
      "x-graphql-federation": {
        "keys": ["id"],
        "shareable": true
      },
      "properties": {
        "id": { "type": "string", "x-graphql-field-type": "ID" },
        "name": { "type": "string" },
        "description": { "type": "string" },
        "photo": { "type": "string" }
      },
      "required": ["id", "name", "photo"]
    }
  }
}
```

#### Reviews Subgraph

Define `Review` type and reference `Location` entity.

**`reviews.schema.json`**:

```json
{
  "$id": "https://example.com/reviews.schema.json",
  "definitions": {
    "Review": {
      "type": "object",
      "x-graphql-type-name": "Review",
      "properties": {
        "id": { "type": "string", "x-graphql-field-type": "ID" },
        "rating": { "type": "integer" },
        "comment": { "type": "string" },
        "location": { "$ref": "#/definitions/LocationStub" }
      }
    },
    "LocationStub": {
      "type": "object",
      "x-graphql-type-name": "Location",
      "x-graphql-federation": {
        "keys": ["id"]
      },
      "properties": {
        "id": { "type": "string", "x-graphql-field-type": "ID" },
        "reviews": {
          "type": "array",
          "items": { "$ref": "#/definitions/Review" }
        }
      }
    }
  }
}
```

### 1.2 Accessing Entities (The "Lookup")

**Apollo Way**: Implement `__resolveReference` in resolvers.
**JSON Schema Way**: The schema defines the _shape_. You still implement resolvers in your server, but the SDL is generated.

When generating the SDL:

```bash
# Generate Locations Subgraph
json-schema-x-graphql convert locations.schema.json --out locations.graphql --federation-version 2

# Generate Reviews Subgraph
json-schema-x-graphql convert reviews.schema.json --out reviews.graphql --federation-version 2
```

### 1.3 Supergraph Composition

Once SDLs are generated, the steps are identical to Apollo's tutorial:

1.  Push schemas to Apollo GraphOS (or use `rover supergraph compose` locally).
2.  Start the Router.

---

## Part 2: Federating the Monolith

**Goal**: Break down a monolith (Airlock) into subgraphs using `@override`.

### 2.1 The "Monolith" Schema

Start with a single JSON Schema representing the monolith.

**`monolith.schema.json`**:

```json
{
  "definitions": {
    "Listing": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "title": { "type": "string" },
        "numOfBeds": { "type": "integer" }
      }
    }
  }
}
```

### 2.2 Creating the Stub Subgraph (Listings Service)

Create a new schema for the extracted service.

**`listings.schema.json`**:

```json
{
  "definitions": {
    "Listing": {
      "type": "object",
      "x-graphql-federation": {
        "keys": ["id"]
      },
      "properties": {
        "id": { "type": "string" },
        "numOfBeds": {
          "type": "integer",
          "x-graphql-federation-override-from": "monolith-subgraph"
        }
      }
    }
  }
}
```

_Note: The `x-graphql-federation-override-from` attribute generates the `@override(from: "monolith-subgraph")` directive._

### 2.3 Router Configuration & Authentication

This step is infrastructure-level and remains largely the same. However, you can document authentication requirements in the schema:

```json
{
  "properties": {
    "secureData": {
      "type": "string",
      "x-graphql-federation-authenticated": true
    }
  }
}
```

---

## Part 3: Federation in Production

**Goal**: CI/CD, Schema Checks, and advanced directives like `@inaccessible`.

### 3.1 Marking Fields as Inaccessible

To deprecate or hide a field from the supergraph API while keeping it in the subgraph:

**`users.schema.json`**:

```json
{
  "properties": {
    "internalId": {
      "type": "string",
      "x-graphql-federation-inaccessible": true
    }
  }
}
```

### 3.2 CI/CD Pipeline Integration

Detailed flow for `json-schema-x-graphql` pipelines:

1.  **Validate JSON Schema**: Ensure `x-graphql` attributes are valid.
    ```bash
    # Verify schema structure
    ajv validate -s schema.json -d data.json
    ```
2.  **Generate SDL**:
    ```bash
    json-schema-x-graphql convert schema.json > schema.graphql
    ```
3.  **Run Apollo Schema Checks**:
    ```bash
    rover subgraph check my-graph@prod --name my-subgraph --schema schema.graphql
    ```

### 3.3 Observability

Using `x-graphql-description` ensures that all types and fields in GraphOS have rich documentation, which improves the utility of the Explorer and Schema Reference pages in Apollo Studio.

```json
{
  "x-graphql-description": "The primary listing entity for the Airlock platform."
}
```

---

## Detailed Feature Map

| Apollo Concept    | GraphQL Directive        | JSON Schema Attribute (`x-graphql-`) |
| :---------------- | :----------------------- | :----------------------------------- |
| **Entity Key**    | `@key(fields: "id")`     | `federation: { keys: ["id"] }`       |
| **Shareable**     | `@shareable`             | `federation: { shareable: true }`    |
| **Override**      | `@override(from: "x")`   | `federation-override-from: "x"`      |
| **Inaccessible**  | `@inaccessible`          | `federation-inaccessible: true`      |
| **Authenticated** | `@authenticated`         | `federation-authenticated: true`     |
| **Requires**      | `@requires(fields: "x")` | `federation-requires: "x"`           |
| **Provides**      | `@provides(fields: "x")` | `federation-provides: "x"`           |
| **Tag**           | `@tag(name: "x")`        | `federation-tag: "x"`                |
