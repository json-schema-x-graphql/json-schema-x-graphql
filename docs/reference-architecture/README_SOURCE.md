# Schema Unification Forest

[![Validate and Generate](https://github.com/GSA-TTS/enterprise-schema-unification/actions/workflows/schema-validate-generate.yml/badge.svg)](https://github.com/GSA-TTS/enterprise-schema-unification/actions/workflows/schema-validate-generate.yml)
[![Composition](https://github.com/GSA-TTS/enterprise-schema-unification/actions/workflows/composition.yml/badge.svg)](https://github.com/GSA-TTS/enterprise-schema-unification/actions/workflows/composition.yml)
[![Pull Request](https://github.com/GSA-TTS/enterprise-schema-unification/actions/workflows/pull-request.yml/badge.svg)](https://github.com/GSA-TTS/enterprise-schema-unification/actions/workflows/pull-request.yml)
[![Generate Slides PDF](https://github.com/GSA-TTS/enterprise-schema-unification/actions/workflows/generate-slides-pdf.yml/badge.svg)](https://github.com/GSA-TTS/enterprise-schema-unification/actions/workflows/generate-slides-pdf.yml)
[![Tests](https://img.shields.io/badge/tests-215%20passing-brightgreen)](https://github.com/GSA-TTS/enterprise-schema-unification/actions)
[![Coverage](https://img.shields.io/badge/coverage-44.24%25-yellow)](https://github.com/GSA-TTS/enterprise-schema-unification/actions)

**Unified core data model for federal contract systems (Contract Data, Legacy Procurement, EASi, Logistics Mgmt)**

Schema Unification Forest provides canonical JSON Schema and GraphQL SDL for integrating, validating, and analyzing contract data across federal systems. The schemas serve as the single source of truth for data contracts, API design, and ETL pipelines.

## 🏗️ Architecture

**Schema-Driven Design** with bidirectional conversion between JSON Schema (validation) and GraphQL SDL (API):

- **JSON Schema** (snake_case): Database validation, Python tooling, REST API integration
- **GraphQL SDL** (camelCase): API layer, federation, type system
- **x-graphql Hints**: Extension metadata for lossless conversion

📖 **Architecture Decisions:** [`docs/adr/README.md`](docs/adr/README.md)

| ADR                                                        | Decision                                                  | Status      |
| ---------------------------------------------------------- | --------------------------------------------------------- | ----------- |
| [0001](docs/adr/0001-schema-driven-data-contract.md)       | Schema-Driven Data Contract                               | ✅ Accepted |
| [0002](docs/adr/0002-schema-tooling-automation.md)         | Automated Schema Parity Toolchain                         | ✅ Accepted |
| [0003](docs/adr/0003-visual-communication-layer.md)        | Schema Viewers as Communication Layer                     | ✅ Accepted |
| [0004](docs/adr/0004-graphql-gateway-selection.md)         | GraphQL Gateway Selection (GraphQL Mesh)                  | ✅ Accepted |
| [0005](docs/adr/0005-esm-first-module-system.md)           | ESM-First Module System                                   | ✅ Accepted |
| [0006](docs/adr/0006-three-namespace-naming-convention.md) | Three-Namespace Naming (snake_case/camelCase/hyphen-case) | ✅ Accepted |
| [0007](docs/adr/0007-multi-stage-docker-build.md)          | Multi-Stage Docker Build                                  | ✅ Accepted |
| [0008](docs/adr/0008-python-validation-tooling.md)         | Python Validation Tooling                                 | ✅ Accepted |
| [0009](docs/adr/0009-static-site-generation-nextjs.md)     | Static Site Generation with Next.js                       | ✅ Accepted |

## 🔗 Related Projects

**[Enterprise Schema Unification Forest Pipeline](https://github.com/GSA-TTS/enterprise-schema-unification-pipeline/)** — Databricks ETL for federal contract systems

- Uses canonical JSON Schema to validate data ingestion
- Uses GraphQL SDL to target model output
- Implements transformations for Contract Data, Legacy Procurement, EASi, Logistics Mgmt

## 📚 Documentation

**Core Documentation:**

- [`docs/`](docs/) — Schema architecture, pipeline guides, system mappings
- [`docs/adr/`](docs/adr/) — Architecture decision records
- [`scripts/README.md`](scripts/README.md) — Generator and validator scripts

**Quick Links:**

- [Schema Architecture Guide](docs/schema/schema-architecture.md)
- [Schema Pipeline Guide](docs/schema/schema-pipeline-guide.md)
- [x-graphql Hints Guide](docs/schema/x-graphql-hints-guide.md)
- [Python Validation Guide](docs/implementation/python-validation-guide.md)
- [Testing Quick Reference](docs/process/testing-quick-reference.md)
- [Quick Start Guide](docs/process/quick-start.md)
- [Implementation Plan](IMPLEMENTATION-PLAN.md) (85% complete)

**📊 Presentation Slides:**

- [Download Latest PDF](https://github.com/GSA-TTS/enterprise-schema-unification/actions/workflows/generate-slides-pdf.yml) — Latest presentation slides (auto-generated from main branch)
- [Slides CHEATSHEET](SLIDES-CHEATSHEET.md) — README, Customization options and export formats

## 🚀 Active Development

**Current Status: JSON Schema Architecture Established (December 2025)**

- ✅ JSON Schema established as canonical source of truth (ADR 0001 updated)
- ✅ GraphQL SDL generation from JSON Schema working (5 subgraphs + supergraph)
- ✅ Scripts audit: 100% complete (215 tests passing, 44.24% coverage)
- ✅ Schema diff root cause analysis completed
- ✅ Documentation updated: README, ADR 0001, root cause analysis
- ✅ All 6 system schemas maintained: Legacy Procurement, EASi, Logistics Mgmt, Contract Data, USASpending, Schema Unification
- 📋 Next: See [Project Board](https://github.com/orgs/GSA-TTS/projects/101)
  & [Documentation](docs/)

## Getting Started

### Prerequisites

- Node.js >= 18.x
- pnpm (recommended package manager)

### Local Development

```sh
# Install dependencies
pnpm install

# Run development server
pnpm dev
# Visit http://localhost:3000

# Run tests
pnpm test

# Validate schemas
pnpm run validate:all
```

### Schema Generation Workflow

**Architecture:** Multi-system federation with bidirectional schema conversion

**1. Edit system schemas (canonical sources):**

```bash
# System-specific JSON Schemas (snake_case)
src/data/legacy_procurement.schema.json      # Legacy Procurement system
src/data/intake_process.schema.json        # EASi system
src/data/logistics_mgmt.schema.json        # Logistics Mgmt system
src/data/contract_data.schema.json        # Contract Data system
src/data/public_spending.schema.json # USASpending system
```

**2. Validate schemas:**

```bash
pnpm run validate:schema         # Validate JSON Schemas (AJV with draft-2020-12)
pnpm run validate:all            # Full validation suite

# Python validation (optional)
python python/validate_schemas.py src/data/*.schema.json
```

**3. Generate complete pipeline:**

```bash
# Full pipeline: generates subgraphs, supergraph, and all interop artifacts
pnpm run generate:schema:interop
```

This single command runs:

- **Field mapping:** Generates camelCase ↔ snake_case mappings
- **Subgraphs:** Creates GraphQL SDL for each system (5 subgraphs)
- **Supergraph:** Composes all subgraphs into unified schema
- **JSON Schema from GraphQL:** Generates validation schemas from SDL
- **GraphQL from JSON Schema:** Generates SDL from JSON Schemas
- **V2 Generation:** Creates enhanced schema with x-graphql hints (if target exists)

**4. Generated artifacts:**

```bash
generated-schemas/
├── field-name-mapping.json              # Case conversion mappings
├── legacy_procurement.subgraph.graphql              # Legacy Procurement GraphQL SDL
├── intake_process.subgraph.graphql                # EASi GraphQL SDL
├── logistics_mgmt.subgraph.graphql                # Logistics Mgmt GraphQL SDL
├── contract_data.subgraph.graphql                # Contract Data GraphQL SDL
├── public_spending.subgraph.graphql         # USASpending GraphQL SDL
├── schema_unification.supergraph.graphql         # Composed supergraph
├── schema_unification.from-graphql.json          # JSON Schema from supergraph
├── schema_unification.from-json.graphql          # GraphQL SDL from JSON Schema
└── schema_unification.v2.from-graphql.json       # V2 with x-graphql hints

# Also copied to src/data/generated/ for website consumption
```

**5. Validate parity:**

```bash
pnpm run validate:graphql        # Ensure SDL builds correctly
pnpm run validate:sync           # Check field name sync
pnpm run validate:sync:strict    # Strict pointer resolution
```

**6. Run tests:**

```bash
pnpm test                        # 215 tests (22 suites)
pnpm run test:coverage           # With coverage report (44.24%)
```

**7. Commit changes:**

```bash
git add src/data/ generated-schemas/ src/data/generated/
git commit -m "schema: update system schemas and regenerate artifacts"
```

📖 **Detailed Guide:** [`docs/schema/schema-pipeline-guide.md`](docs/schema/schema-pipeline-guide.md)  
📖 **V1 vs V2 Guide:** [`docs/schema/schema-v1-vs-v2-guide.md`](docs/schema/schema-v1-vs-v2-guide.md)

## 📋 Key Schemas

### Canonical JSON Schemas (edit these)

**Source of truth for data contracts, validation, and GraphQL generation**

| File                                                                                 | Purpose                                | Lines | System             |
| ------------------------------------------------------------------------------------ | -------------------------------------- | ----- | ------------------ |
| [`src/data/legacy_procurement.schema.json`](src/data/legacy_procurement.schema.json) | Legacy Procurement system data model   | ~300  | Legacy Procurement |
| [`src/data/intake_process.schema.json`](src/data/intake_process.schema.json)         | EASi system data model                 | ~250  | EASi               |
| [`src/data/logistics_mgmt.schema.json`](src/data/logistics_mgmt.schema.json)         | Logistics Mgmt/PRISM system data model | ~2000 | Logistics Mgmt     |
| [`src/data/contract_data.schema.json`](src/data/contract_data.schema.json)           | Contract Data canonical data model     | ~720  | Contract Data      |
| [`src/data/public_spending.schema.json`](src/data/public_spending.schema.json)       | USASpending/GDSM data model            | ~600  | USASpending        |
| [`src/data/schema_unification.schema.json`](src/data/schema_unification.schema.json) | Unified supergraph model               | ~850  | All Systems        |

**These JSON Schemas:**

- Use snake_case naming convention
- Include x-graphql-\* extension metadata for SDL generation
- Define validation rules, types, and data contracts
- Are maintained by hand and version controlled

### Generated GraphQL Schemas (auto-generated)

**Generated from JSON Schemas via `pnpm run generate:schema:interop`**

| File                                                                                                                 | Source                           | Purpose                             | Lines |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------- | ----- |
| [`generated-schemas/legacy_procurement.subgraph.graphql`](generated-schemas/legacy_procurement.subgraph.graphql)     | `legacy_procurement.schema.json` | Legacy Procurement GraphQL subgraph | ~100  |
| [`generated-schemas/intake_process.subgraph.graphql`](generated-schemas/intake_process.subgraph.graphql)             | `intake_process.schema.json`     | EASi GraphQL subgraph               | ~80   |
| [`generated-schemas/logistics_mgmt.subgraph.graphql`](generated-schemas/logistics_mgmt.subgraph.graphql)             | `logistics_mgmt.schema.json`     | Logistics Mgmt GraphQL subgraph     | ~600  |
| [`generated-schemas/contract_data.subgraph.graphql`](generated-schemas/contract_data.subgraph.graphql)               | `contract_data.schema.json`      | Contract Data GraphQL subgraph      | ~300  |
| [`generated-schemas/public_spending.subgraph.graphql`](generated-schemas/public_spending.subgraph.graphql)           | `public_spending.schema.json`    | USASpending GraphQL subgraph        | ~290  |
| [`generated-schemas/schema_unification.supergraph.graphql`](generated-schemas/schema_unification.supergraph.graphql) | All subgraphs                    | Composed federated schema           | ~1900 |
| [`generated-schemas/schema_unification.from-json.graphql`](generated-schemas/schema_unification.from-json.graphql)   | `schema_unification.schema.json` | Supergraph SDL from JSON            | ~800  |
| [`generated-schemas/field-name-mapping.json`](generated-schemas/field-name-mapping.json)                             | All schemas                      | camelCase ↔ snake_case mappings     | N/A   |

**These GraphQL schemas:**

- Use camelCase naming convention
- Are regenerated on every schema change
- Should NOT be edited manually
- Are used for API layer and federation

## 🔧 Scripts

All generator and validator scripts live in [`scripts/`](scripts/):

**Validation:**

```bash
pnpm run validate:schema        # JSON Schema validation (AJV)
pnpm run validate:graphql       # GraphQL SDL validation
pnpm run validate:sync          # Bidirectional parity check
pnpm run validate:sync:strict   # Strict pointer validation
pnpm run validate:all           # Run all validators
```

**Generation Pipeline:**

```bash
# Full pipeline (recommended)
pnpm run generate:schema:interop    # Complete: subgraphs → supergraph → interop

# Individual steps (advanced)
pnpm run generate:subgraphs         # Generate all 5 system subgraphs
pnpm run generate:supergraph        # Compose subgraphs into supergraph
pnpm run generate:schemas           # subgraphs + supergraph (no interop)
pnpm run generate:schema:graphql    # GraphQL SDL → JSON Schema

# System-specific subgraphs
pnpm run generate:subgraph:legacy_procurement
pnpm run generate:subgraph:intake_process
pnpm run generate:subgraph:logistics_mgmt
pnpm run generate:subgraph:contract_data
pnpm run generate:subgraph:public_spending
```

**Python Validation:**

```bash
# Setup (one time)
uv venv && source .venv/bin/activate
uv pip install -e ".[dev]"

# Validate schemas
python python/validate_schemas.py src/data/*.schema.json

# Run tests
pytest python/tests/ -v
```

📖 **Scripts Documentation:** [`scripts/README.md`](scripts/README.md)

## 🐳 Docker

### Production Build

If you want to run the production build locally:

```console
# Build a Docker image with:
docker compose build jsonViewer

# Run the production container
docker compose up jsonViewer

# Go to http://localhost:8888
```

### Development Mode (Hot Reload)

For active development with automatic rebuilds and hot reload, use the `jsonViewer-dev` service. This runs the Next.js dev server in a container with live file watching, similar to `pnpm dev`:

```bash
# Start the development container (builds and watches for changes)
docker compose up jsonViewer-dev

# Or rebuild and start in one command
docker compose up --build jsonViewer-dev

# Then open http://localhost:3001
```

**Development Container Features:**

- 🔄 **Hot Reload**: Changes to source files automatically trigger rebuilds
- 📦 **Auto Install**: Dependencies are installed automatically on startup
- 🔍 **Watch Mode**: Next.js dev server watches for file changes
- 🚀 **Fast Iteration**: No need to rebuild the entire image on every change
- 📂 **Volume Mounted**: Your local `src/` directory is mounted into the container

**Port Mapping:**

- Production (`jsonViewer`): `http://localhost:8888` (optimized build)
- Development (`jsonViewer-dev`): `http://localhost:3001` (hot reload enabled)

**When to use each:**

- Use `pnpm dev` for fastest local development (no Docker overhead)
- Use `jsonViewer-dev` to test in a containerized environment with hot reload
- Use `jsonViewer` to test the production build before deployment

## 📝 Schema Workflow

See the **[📋 Key Schemas](#-key-schemas)** section above for the complete list of canonical JSON schemas and generated GraphQL artifacts.

### Quick Workflow

**1. Edit JSON Schemas** (source of truth):

```bash
# System-specific schemas
vim src/data/legacy_procurement.schema.json
vim src/data/intake_process.schema.json
vim src/data/logistics_mgmt.schema.json
vim src/data/contract_data.schema.json
vim src/data/public_spending.schema.json

# Unified supergraph
vim src/data/schema_unification.schema.json
```

**2. Validate changes:**

```bash
pnpm run validate:all           # JSON Schema + GraphQL SDL + sync parity
pnpm test                        # Run test suite (215 tests)
```

**3. Regenerate GraphQL artifacts:**

```bash
pnpm run generate:schema:interop  # Full pipeline: subgraphs → supergraph → interop
```

**4. Preview locally:**

```bash
pnpm dev                         # http://localhost:3000
```

**5. Commit:**

```bash
git add src/data/ generated-schemas/ src/data/generated/
git commit -m "schema: update system schemas and regenerate artifacts"
```

### Generated Artifacts

After running `pnpm run generate:schema:interop`, the following are auto-generated:

- `generated-schemas/*.subgraph.graphql` — GraphQL SDL for each system (5 subgraphs)
- `generated-schemas/schema_unification.supergraph.graphql` — Composed federated schema
- `generated-schemas/field-name-mapping.json` — camelCase ↔ snake_case mappings
- `src/data/generated/` — Copied for Next.js website consumption
- `generated-metadata/` — CI validation artifacts

**⚠️ Do NOT edit generated GraphQL files manually** — they will be overwritten.

### Documentation

- **[Schema Architecture Guide](docs/schema/schema-architecture.md)** — Complete schema design
- **[Schema Pipeline Guide](docs/schema/schema-pipeline-guide.md)** — Detailed generation workflow
- **[x-graphql Hints Guide](docs/schema/x-graphql-hints-guide.md)** — Extension metadata reference
- **[Schema Diff Root Cause Analysis](docs/schema-diff-root-cause-analysis.md)** — Field mapping troubleshooting
- **[ADR 0001: Schema-Driven Data Contract](docs/adr/0001-schema-driven-data-contract.md)** — JSON Schema as source of truth

### 🛠️ Helper Scripts

**Automated Workflow** (validate + generate + copy):

```bash
./scripts/publish-generated.sh
```

**Case Conversion Preview** (camelCase → snake_case):

```bash
node scripts/camel-snake.mjs /commonElements/vendorInfo
# Output: /common_elements/vendor_info
```

**Schema Diff Report** (SDL vs JSON Schema):

```bash
node scripts/diff-sdl-schema.mjs
# Output: generated-metadata/schema-diff.md
```

### 📊 Generated Artifacts

| Location              | Purpose                                    | Auto-Updated | Served By Website           |
| --------------------- | ------------------------------------------ | ------------ | --------------------------- |
| `generated-schemas/`  | Generator outputs (SDL ↔ JSON conversions) | ✅ Yes       | No                          |
| `src/data/generated/` | Next.js imports                            | ✅ Yes       | ✅ Yes (via imports)        |
| `generated-metadata/` | CI reports, diffs                          | ✅ Yes       | No                          |
| `public/data/`        | Static browser assets                      | Manual copy  | ✅ Yes (via `/data/` route) |

**Key Generated Files:**

- `schema_unification.from-graphql.json` - JSON Schema generated from `schema_unification.graphql` (validation)
- `schema_unification.from-json.graphql` - SDL generated from `schema_unification.schema.json` (validation)
- `legacy_procurement.from-json.graphql` - Legacy Procurement subgraph SDL from `legacy_procurement.schema.json`
- `intake_process.from-json.graphql` - EASi subgraph SDL from `intake_process.schema.json`
- `logistics_mgmt.from-json.graphql` - Logistics Mgmt subgraph SDL from `logistics_mgmt.schema.json`
- `field-name-mapping.json` - camelCase ↔ snake_case mappings (183 tokens)

**Legacy/Archive** (to be cleaned up per [Schema Architecture Guide](docs/SCHEMA-ARCHITECTURE.md)):

- `*.v1-custom.graphql`, `*.v2-custom.graphql` - Manual variants, should be archived
- `*.enhanced.graphql` - Duplicates `.from-json.graphql` functionality
- `schema_unification.omnigraph.graphql` - Federation composition (rename to `.supergraph.graphql`)

### ⚠️ Important Notes

- **CI Validation**: GitHub Actions runs `pnpm run validate:all` on PRs. All checks must pass.
- **Naming Conventions**: GraphQL SDL uses camelCase; JSON Schema uses snake_case. The `field-name-mapping.json` file provides authoritative mappings.
- **Sync Validation**: The strict sync validator (`pnpm run validate:sync:strict`) ensures configured types in [`scripts/schema-sync.config.json`](scripts/schema-sync.config.json) maintain parity between SDL and JSON Schema.
- **Website Consumption**: Generated schemas in `src/data/generated/` are automatically imported by Next.js pages and available at the localhost endpoints above.

### Commands

- Generate interop artifacts (SDL -> JSON and back):

```bash
pnpm run generate:schema:interop
```

- Generate V2 GraphQL from hinted JSON Schema (example):

```bash
node scripts/generate-graphql-enhanced.mjs src/data/schema_unification-contract_data-hinted.schema.json public/data/schema_unification-contract_data-hinted.graphql
```

- Run the full validation suite (local/CI):

```bash
pnpm run validate:all
pnpm test
```

### Notes and common warnings

- If you see JSON pointer resolution warnings (e.g., "Pointer segment 'systemMetadata' not found"), check `$ref` targets and `definitions` in `src/data/*.schema.json`. These indicate missing or misnamed definition blocks that the JSON→GraphQL projection expects.
- "Enum skipped" messages usually mean the pointer targeted by the generator had no `enum` values; add enums to the source schema or adjust the mapping hints.
- Non-nullability mismatches (GraphQL non-null vs JSON Schema `required`) are reported by the parity checks — update `required` arrays in JSON Schema or annotate with `x-graphql-nullable` hints for V2.
- A recurring GraphQL parser error like `Syntax Error: Expected Name, found String "$schema"` indicates the GraphQL parser was given a JSON document (or a document containing `$schema`) instead of clean SDL. If this appears while running SDL→JSON script, add targeted logging around the `buildSchema`/`parse` call to verify the exact string being parsed and ensure the input file is the SDL file (or strip `$schema` properties before feeding to GraphQL parser).

### Quick checklist for converting CamelCase → snake_case

- Use the `--input-case` / `--output-case` flags supported by the generation scripts when running conversions.
- Typical example (JSON Schema -> GraphQL with case conversion):

```bash
node scripts/generate-graphql-from-json-schema.mjs \
    --schema src/data/schema_unification.schema.v2-graphql.json \
    --out generated-schemas/schema_unification.v2.from-json.graphql \
    --input-case camel --output-case snake
```

After generation, review `generated-schemas/` and copy approved artifacts into `public/data/` or `src/data/generated/` for the website to consume.

## Completion summary

This section documents the canonical inputs, the generator scripts that create the derived artifacts, where to review generated outputs, and the validation steps that gate publishing. If you'd like I can also:

- Add a small `scripts/publish-generated.sh` helper to copy the approved generated files into `src/data/generated/` and `public/data/` and optionally run `pnpm run validate:all` first.
- Add a rendered SVG export of the mermaid diagrams under `docs/diagrams/` for quick browsing in the repo.

### V2 GraphQL with x-graphql Hints ⭐ NEW

The **enhanced converter** (`scripts/generate-graphql-enhanced.mjs`) supports advanced GraphQL features through **x-graphql-\* hints** added to JSON Schema. This enables V2 schema generation with:

- ✅ **Interfaces** with inheritance (e.g., `Contract` interface)
- ✅ **Union types** for polymorphic queries
- ✅ **Custom scalars** (DateTime, Money, URL, etc.)
- ✅ **GraphQL directives** (@currency, @deprecated, etc.)
- ✅ **Field arguments** with default values
- ✅ **Fine-grained nullability** control
- ✅ **Field/type name** customization

**Generate V2 GraphQL from hinted schema:**

```bash
node scripts/generate-graphql-enhanced.mjs \
  src/data/schema_unification-contract_data-hinted.schema.json \
  public/data/schema_unification-contract_data-hinted.graphql
```

**Example hinted schema** (Contract Data mapping with interfaces and unions):

```json
{
  "Contract": {
    "x-graphql-type": "interface",
    "x-graphql-description": "Base contract interface",
    "properties": {
      "contractId": { "x-graphql-nullable": false },
      "obligatedAmount": {
        "x-graphql-directives": [
          {
            "name": "currency",
            "args": { "code": "USD" }
          }
        ]
      }
    }
  },
  "IDVContract": {
    "x-graphql-implements": ["Contract"]
  }
}
```

**Documentation:**

- **Complete Guide**: [`docs/x-graphql-hints-guide.md`](docs/x-graphql-hints-guide.md) - All 9 hint types with examples
- **Implementation**: [`docs/X-GRAPHQL-IMPLEMENTATION.md`](docs/X-GRAPHQL-IMPLEMENTATION.md) - Technical details
- **Summary**: [`docs/V2-GRAPHQL-ENHANCEMENT-SUMMARY.md`](docs/V2-GRAPHQL-ENHANCEMENT-SUMMARY.md) - Quick overview

**Working Example**: See `src/data/schema_unification-contract_data-hinted.schema.json` for a complete Contract Data mapping demonstrating interfaces, unions, custom scalars, and directives.

### Common Core Model

Preview below, but recommend copying the full diagram into a [Mermaid live editor](https://www.mermaidchart.com/play?) to explore the full structure.

[Mermaid Diagram](src/data/schema_unification.mermaid.mmd) `Click Raw` to copy the full diagram text.

```mermaid
---
config:
  layout: elk
---
erDiagram
    NORMALIZED_SCHEMA {
        string schemaVersion
        string sourceSystem
        datetime lastModified
        string recordId PK
        decimal completenessScore
        datetime lastValidated
    }

    COMMON_ELEMENTS {
        string recordId PK "FK to NORMALIZED_SCHEMA"
        string contractTitle
        string contractType
        string contractingAgencyCode
        string contractingAgencyName
        string vendorName
        string vendorUei
        boolean isActive
        boolean isLatest
        boolean isFunded
    }

    CONTRACT_IDENTIFICATION {
        string piid PK
        string originalAwardPiid
        string referencedPiid
        string contractTitle
        string contractType
        string descriptionOfRequirement
        string recordId FK "to COMMON_ELEMENTS"
    }

    ORGANIZATION_INFO {
        string orgId PK
        string contractingAgencyCode
        string contractingAgencyName
        string contractingDepartmentCode
        string contractingDepartmentName
        string fundingAgencyCode
        string fundingAgencyName
        string fundingDepartmentCode
        string fundingDepartmentName
        string recordId FK "to COMMON_ELEMENTS"
    }

    VENDOR_INFO {
        string vendorId PK
        string vendorName
        string vendorUei
        string recordId FK "to COMMON_ELEMENTS"
    }

    PLACE_OF_PERFORMANCE {
        string perfId PK
        string streetAddress
        string city
        string county
        string state
        string zip
        string country
        string congressionalDistrict
        string recordId FK "to COMMON_ELEMENTS"
    }

    FINANCIAL_INFO {
        string finId PK
        decimal totalContractValue
        decimal baseAndAllOptionsValue
        decimal independentGovernmentEstimate
        decimal amountSpentOnProduct
        string contractFiscalYear
        string reportSubmittedFiscalYear
        string recordId FK "to COMMON_ELEMENTS"
    }

    BUSINESS_CLASSIFICATION {
        string bizId PK
        string naicsCode
        string naicsDescription
        string pscCode
        string pscDescription
        string categoryOfProduct
        string typeOfProduct
        string setAsideType
        boolean localAreaSetAside
        string coSizeDetermination
        string recordId FK "to COMMON_ELEMENTS"
    }

    CONTRACT_CHARACTERISTICS {
        string charId PK
        string emergencyAcquisition
        boolean governmentFurnishedProperty
        boolean includesCui
        boolean recurringService
        boolean recurringUtilities
        string recordId FK "to COMMON_ELEMENTS"
    }

    CONTACTS {
        string contactId PK
        string name
        string title
        string email
        string phone
        string role
        string recordId FK "to COMMON_ELEMENTS"
    }

    STATUS_INFO {
        string statusId PK
        boolean isActive
        boolean isLatest
        boolean isFunded
        string status
        datetime publishedDate
        datetime lastModifiedDate
        date contractCompleteDate
        date lastCarDateSigned
        string recordId FK "to COMMON_ELEMENTS"
    }

    SYSTEM_EXTENSIONS {
        string extensionId PK
        string systemType
        json extensionData
        string recordId FK "to NORMALIZED_SCHEMA"
    }

    Contract Data_EXTENSIONS {
        string contract_dataId PK
        string programNumber
        string objective
        string website
        string fieldName
        string fieldType
        json value
        json legacy_procurementanceTypes
        json eligibility
        json usage
        json projects
        json relatedPrograms
        json historicalIndex
        json suggestion
        json alternativeNames
        json applicantTypes
        json beneficiaryTypes
        string extensionId FK "to SYSTEM_EXTENSIONS"
    }

    Legacy Procurement_EXTENSIONS {
        string legacy_procurementId PK
        string iaPiidOrUniqueId
        string natureOfAcquisition
        string clientOrganizationName
        string typeOfIdc
        string whoCanUseIdc
        json acquisitionData
        json clientData
        json awardData
        json templates
        json officeAddress
        string extensionId FK "to SYSTEM_EXTENSIONS"
    }

    Intake Process_EXTENSIONS {
        string intake_processId PK
        string businessOwner
        string systemOwner
        decimal unitPrice
        string unitOfMeasure
        string optional
        string notToExceed
        string notSeparatelyPriced
        json intake_processTemplates
        json contract_dataFieldMappings
        json clinData
        string extensionId FK "to SYSTEM_EXTENSIONS"
    }

    NORMALIZED_SCHEMA ||--|| COMMON_ELEMENTS : contains
    NORMALIZED_SCHEMA ||--|| SYSTEM_EXTENSIONS : has
    COMMON_ELEMENTS ||--|| CONTRACT_IDENTIFICATION : includes
    COMMON_ELEMENTS ||--|| ORGANIZATION_INFO : includes
    COMMON_ELEMENTS ||--|| VENDOR_INFO : includes
    COMMON_ELEMENTS ||--|| PLACE_OF_PERFORMANCE : includes
    COMMON_ELEMENTS ||--|| FINANCIAL_INFO : includes
    COMMON_ELEMENTS ||--|| BUSINESS_CLASSIFICATION : includes
    COMMON_ELEMENTS ||--|| CONTRACT_CHARACTERISTICS : includes
    COMMON_ELEMENTS ||--o{ CONTACTS : includes
    COMMON_ELEMENTS ||--|| STATUS_INFO : includes
    SYSTEM_EXTENSIONS ||--o| Contract Data_EXTENSIONS : "extends as"
    SYSTEM_EXTENSIONS ||--o| Legacy Procurement_EXTENSIONS : "extends as"
    SYSTEM_EXTENSIONS ||--o| Intake Process_EXTENSIONS : "extends as"
```

## License

See [`LICENSE`](/LICENSE.md) for more information.
