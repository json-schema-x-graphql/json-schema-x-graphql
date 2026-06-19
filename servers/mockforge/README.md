# MockForge POC — Lightweight Mock Server for Example Forest

## Status: ✅ Operational (Lightweight Yoga + GraphQL Mesh)

Lightweight mock GraphQL services using Yoga and GraphQL Mesh without SQLite persistence. Auto-generated fake data from canonical JSON schemas.

**Last Updated**: February 6, 2026
**Migration Status**: ✅ Complete - All legacy SQLite approaches removed, working with Yoga + faker.js

## Goal

Provide automated mock GraphQL API generation from canonical JSON Schema sources for local UI development, testing, and demos. MockForge automatically generates realistic mock data using faker.js based on the GraphQL schema.

## Quick Start

### Recommended: Lightweight Federation Stack

```bash
# 1. Generate all schemas from JSON (required first time or after JSON schema changes)
./regenerate-schemas.sh

# 2. Start all services (from dev/pocs/mockforge/)
pnpm run services:start

# 3. Test the services
./test-data-queries.sh
```

**Endpoints:**

- **GraphQL Mesh** (Federation Gateway): http://localhost:5050/graphql ✅ Working
- **Local Stitched Gateway**: http://localhost:4000/graphql ✅ Best default for end-user flow testing
- **Individual Services**: http://localhost:4001-4005/graphql ✅ All Working
- **Generated Supergraph Mock**: http://localhost:3000/graphql ✅ Best artifact-level smoke target
- **Legacy Hive Gateway**: http://localhost:5100/graphql (deprecated - use Mesh instead)

## Recommended Consumption Pattern

Choose the endpoint based on who is consuming the schema and what they need to validate:

- **End-user apps and unified procurement experiences**: use the federated gateway at `http://localhost:4000/graphql`. This is the right default for contract search, cross-system details, and client integration because users care about one joined contract experience, not subgraph boundaries.
- **Domain-owned tools and service-team debugging**: query individual subgraphs on `4001-4006` when you need to isolate schema ownership, mock behavior, or field-level regressions within a single system.
- **Generated artifact validation**: use the generated supergraph mock at `http://localhost:3000/graphql` when you want to verify that `generated-schemas/example.supergraph.graphql` can still be consumed as a single published contract.

For code and website imports, prefer generated artifacts over ad hoc copies:

- Use `generated-schemas/` for contract publishing and tooling.
- Use `src/data/generated/` for app-local imports and viewer consumption.
- Avoid importing from `public/data/` for runtime logic; keep that as a published/viewer surface.

## Schemathesis Commands

Run the appropriate test lane from the repo root:

```bash
pnpm run schemathesis
pnpm run schemathesis:gateway
pnpm run schemathesis:subgraphs
pnpm run schemathesis:supergraph
pnpm run schemathesis:all
```

Reports are written to `schemathesis-reports/`:

- `gateway-report.txt`
- `subgraphs-report.txt`
- `supergraph-report.txt`

## Architecture

### Current Lightweight Federation Stack

```text
GraphQL Mesh (5050) ─────┬──→ FPDS Mock (4001)      ✅
                         ├──→ USAspending Mock (4002) ✅
                         ├──→ ASSIST Mock (4003)      ✅
                         ├──→ EASI Mock (4004)        ✅
                         └──→ CALM Mock (4005)        ✅

Individual Yoga Servers (no SQLite)
- faker.js for data generation
- CSV seed data support
- Lightweight, no persistence
```

**All individual mock services working perfectly with nested auto-generated data!**

### Migration Summary

✅ **Completed Migration from Legacy SQLite Approach**

- Removed all SQLite dependencies (`better-sqlite3`)
- Migrated to pure Yoga + faker.js servers
- Updated GraphQL Mesh configuration for localhost networking
- Eliminated Docker dependency for mock services
- All services now run natively without persistence

## Integration with Schema Pipeline

MockForge uses schemas generated from canonical JSON Schema sources:

### Schema Generation Flow

```text
JSON Schema Sources (src/data/*.schema.json)
    ↓ (generate-subgraph-sdl.mjs)
Subgraph Schemas (generated-schemas/*.subgraph.graphql)
    ↓ (generate-supergraph.mjs)
Supergraph Schema (generated-schemas/example.supergraph.graphql)
    ↓
MockForge Services (auto-mocking with faker.js)
    ↓
GraphQL Mesh (federation routing)
    ↓
Mock GraphQL API (http://localhost:5050/graphql)
```

### Key Files

**Schema Sources (Canonical JSON):**

- `src/data/fpds.schema.json` - FPDS procurement data schema
- `src/data/usaspending.schema.json` - USAspending procurement schema
- `src/data/assist.schema.json` - ASSIST interagency agreement schema
- `src/data/easi.schema.json` - EASI IT system schema
- `src/data/calm.schema.json` - CALM shared types (library-only)

**Generated Schemas:**

- `generated-schemas/*.subgraph.graphql` - Individual subgraph SDL files
- `generated-schemas/example.supergraph.graphql` - Composed supergraph

**MockForge Configuration:**

- `dev/pocs/mockforge/docker-compose.yml` - Service orchestration
- `dev/pocs/mockforge/mock-server.js` - Mock service implementation
- `dev/pocs/mockforge/mockforge.config.js` - Custom resolvers (faker.js)
- `dev/pocs/mockforge/.meshrc.yaml` - GraphQL Mesh federation config
- `dev/pocs/mockforge/gateway.config.ts` - Hive Gateway config

**Helper Scripts:**

- `regenerate-schemas.sh` - Regenerate all schemas from JSON sources
- `dev/pocs/mockforge/rebuild.sh` - Rebuild all Docker images
- `dev/pocs/mockforge/test-queries.sh` - Test service health
- `dev/pocs/mockforge/test-data-queries.sh` - Test data queries with nesting

## Prerequisites

- **Docker** - For running mock services
- **Node.js 20+** - For schema generation
- **pnpm** - For dependency management

```bash
# Install dependencies (from project root)
pnpm install

# Make scripts executable
chmod +x regenerate-schemas.sh
chmod +x dev/pocs/mockforge/rebuild.sh
chmod +x dev/pocs/mockforge/test-*.sh
```

### Zscaler Certificate (Local Development Behind Corporate Proxy)

If you're building behind a Zscaler proxy, you'll need to add the certificate:

1. **Export the Zscaler certificate** from your browser or system keychain as `zscaler_cert.pem`

2. **Place it in the `.docker/` directory:**

   ```bash
   mkdir -p .docker
   cp /path/to/your/zscaler_cert.pem .docker/zscaler_cert.pem
   ```

3. **Build with LOCAL environment:**

   ```bash
   # Set BUILD_ENV to LOCAL
   export BUILD_ENV=LOCAL

   # Build images (will trust Zscaler cert)
   cd dev/pocs/mockforge
   docker-compose build

   # Or inline:
   BUILD_ENV=LOCAL docker-compose build
   ```

4. **Production builds** (CI/CD) will ignore the certificate automatically (BUILD_ENV defaults to PRODUCTION).

**Note:** The certificate is only added to the trusted store when `BUILD_ENV=LOCAL`. Production builds ignore it for security.

## Features

- ✅ **Canonical JSON Schema Source** — All schemas generated from `src/data/*.schema.json`
- ✅ **Proper Query Type Generation** — All subgraphs have Query types from `x-graphql-operations`
- ✅ **Auto-Generated Mock Data** — faker.js generates realistic data for all fields
- ✅ **Federation Gateway** — GraphQL Mesh routes queries to correct subgraphs
- ✅ **Nested Query Support** — Deep object nesting with auto-mocking
- ✅ **Lightweight Design** — No SQLite dependency, pure Yoga + faker.js
- ✅ **Custom Resolvers** — Field-specific data generation patterns
- ✅ **CSV Seed Data** — Override faker.js with real data from CSV files
- ✅ **Docker Compose** — Full orchestration of all services
- ✅ **Health Checks** — Service dependency management
- ✅ **Hot Reload** — Automatically picks up schema changes
- ✅ **Docker Compose** — Full orchestration of all services
- ✅ **Health Checks** — Service dependency management
- ✅ **Hot Reload** — Automatically picks up schema changes

## New Capabilities

### Custom Resolvers with Faker.js

Smart data generation in `mockforge.config.js`:

```javascript
// Automatically generates realistic:
- PIIDs: GS23F0001X, FA8750-23-C-0001
- DUNS: 123456789
- UEI: A1B2C3D4E5F6
- Contract amounts: $10K - $10M
- Dates: 2020-2025
- Names, addresses, emails
```

### Seed Data from CSV

Place real data in `seed-data/*.csv`:

```csv
piid,vendor_name,vendor_duns,award_amount
GS23F0001X,Acme Technology Solutions,123456789,1250000.00
```

Resolvers use seed data when available, fall back to faker.js.

## Usage Examples

### Query Federated Contract Gateway

```bash
# Start from the federated contract endpoint
curl -s http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { contractByPiid(piid: \"GS-TEST-12345678\") { piid availableSystems sourceRecords { system subgraphName rootQuery identifierArg identifierSourceField recordId notes } } }"
  }' | jq
```

```graphql
# GraphiQL at http://localhost:4000/graphql
query ContractOverview {
  contractByPiid(piid: "GS-TEST-12345678") {
    piid
    availableSystems
    sourceRecords {
      system
      subgraphName
      rootQuery
      identifierArg
      identifierSourceField
      recordId
      notes
    }

    # Drill into the systems that matter for this consumer workflow
    fpds {
      piid
      financial {
        dollars_obligated
      }
    }

    usaspending {
      piid
      financial {
        federalActionObligation
      }
    }

    assist {
      award_piid
      modifications {
        modification_number
      }
    }

    calm {
      solicitation_number
      title
    }
  }
}
```

Recommended client workflow:

- Call `contractByPiid(piid: ...)` first for a unified view.
- Read `availableSystems` to see which sources have deeper detail.
- Read `sourceRecords` to determine the exact subgraph, root query, and argument needed for a source-specific follow-up call.
- Only query direct subgraph roots first when you are building a source-owned tool or debugging a specific system.

### Query Individual Service

```bash
# FPDS Mock (port 4001)
curl -s http://localhost:4001/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ fpdsRecords { identifiers { piid agencyCode } } }"
  }' | jq

# USAspending Mock (port 4002)
curl -s http://localhost:4002/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ usaspendingProcurements { piid uniqueAwardKey } }"
  }' | jq

# ASSIST Mock (port 4003)
curl -s http://localhost:4003/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ assistRecords { iaPiidOrUniqueId systemMetadata { sourceRecordId } } }"
  }' | jq

# EASI Mock (port 4004)
curl -s http://localhost:4004/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ easiRecords { businessOwner systemOwner } }"
  }' | jq
```

### Introspection

```bash
# Check available queries on any service
curl -s http://localhost:5050/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ __schema { queryType { fields { name description type { name kind } } } } }"
  }' | jq '.data.__schema.queryType.fields[] | select(.name | startswith("_") | not)'
```

## Integration with CI/CD

MockForge can be used in CI for:

- **Contract testing** — validate frontend queries against schema
- **Integration tests** — test without real data sources
- **Demo environments** — showcase UI with realistic mock data

```yaml
# Example GitHub Actions usage
- name: Generate schemas
  run: pnpm run generate:schemas

- name: Start mock server
  run: pnpm run mock:start &

- name: Run integration tests
  run: pnpm test:integration
```

## Configuration

### Custom Resolvers

Edit `mockforge.config.js`:

```javascript
export const customResolvers = {
  FPDSProcurement: {
    piid: () => generatePIID(),
    vendorName: () => {
      const seed = seedLoader.getRandomRecord("fpds");
      return seed?.vendor_name || faker.company.name();
    },
  },
};

export const fieldPatterns = {
  email: () => faker.internet.email(),
  duns: () => generateDUNS(),
  piid: () => generatePIID(),
};
```

### Seed Data

CSV files in `seed-data/`:

- `fpds.csv` - 12 sample FPDS records
- `usaspending.csv` - 12 sample USAspending records
- `assist.csv` - 12 sample ASSIST records
- `easi.csv` - 12 sample EASI records
- `calm.csv` - 12 sample CALM records

**Replace with real data for production-like mocks**

### GraphQL Mesh

Edit `.meshrc.yaml`:

```yaml
sources:
  - name: fpds
    handler:
      graphql:
        endpoint: http://localhost:4001/graphql
```

### Apollo Router

Edit `router.yaml`:

```yaml
override_subgraph_url:
  fpds: http://fpds-mock:4001/graphql
```

## Troubleshooting

### Services not starting

```bash
# Check Docker logs
docker-compose logs fpds-mock usaspending-mock assist-mock easi-mock calm-mock mesh

# Rebuild all images
./rebuild.sh

# Restart services
docker-compose restart
```

### Schema validation errors

```bash
# Regenerate all schemas from JSON sources
./regenerate-schemas.sh

# Validate schemas
cd ../../../  # Back to project root
pnpm run validate:graphql
pnpm run validate:schema
```

### Query returns null or errors

**Check the generated schema has correct field names:**

```bash
# Inspect a subgraph schema
cat generated-schemas/fpds.subgraph.graphql | grep "type FpdsRecord" -A 20

# Check Query type
cat generated-schemas/fpds.subgraph.graphql | grep "type Query" -A 10
```

**Common issues:**

- Field names are camelCase in GraphQL (e.g., `piid` not `PIID`, `iaPiidOrUniqueId` not `ia_piid_or_unique_id`)
- Nested fields require selecting sub-fields (e.g., `agency { contractingAgencyName }` not `agency { name }`)
- List queries return arrays, not single objects

### Federation gateway can't reach services

**GraphQL Mesh works, Hive Gateway doesn't** - This is expected. The supergraph was composed with `@graphql-tools/merge` which doesn't include Federation routing directives. Use GraphQL Mesh at port 5050.

```bash
# Test individual service
curl -s http://localhost:4001/graphql -d '{"query":"{ __typename }"}' | jq

# Test Mesh gateway
curl -s http://localhost:5050/graphql -d '{"query":"{ __typename }"}' | jq
```

### Missing Query types after regeneration

The JSON schemas must have `x-graphql-operations.queries` section:

```json
{
  "x-graphql-operations": {
    "queries": {
      "myQuery": {
        "type": "MyType!",
        "description": "Query description"
      }
    }
  }
}
```

**Note:** Use `"queries"` (plural), not `"query"` (singular). Use `"type"`, not `"returnType"`.

## Next Steps

### Completed

- [x] Generate schemas from canonical JSON sources
- [x] Add Query types to all subgraphs via `x-graphql-operations`
- [x] Fix FPDS and USAspending query definitions (`type` vs `returnType`)
- [x] Add custom mock resolvers for specific fields
- [x] Configure realistic data patterns (faker.js integration)
- [x] Add GraphQL Mesh for data source federation
- [x] Set up mock data persistence (SQLite)
- [x] Docker Compose orchestration for all services
- [x] Health checks and dependency management

### Future Enhancements

- [ ] Redis for distributed caching
- [ ] GraphQL subscriptions support
- [ ] OpenTelemetry tracing integration
- [ ] Admin UI for seed data management
- [ ] Authentication/authorization middleware
- [ ] Rate limiting and throttling
- [ ] Custom directive support (@mock, @seed)
- [ ] Automated data relationship consistency
- [ ] CSV seed data loading (currently generates all data via faker.js)
- [ ] Fix Hive Gateway routing (requires proper Federation composition)

## Documentation

**Core Files:**

- **[README.md](README.md)** (this file) - Complete MockForge documentation
- **[mockforge.config.js](mockforge.config.js)** - Custom resolver configuration with faker.js
- **[.meshrc.yaml](.meshrc.yaml)** - GraphQL Mesh federation configuration
- **[gateway.config.ts](gateway.config.ts)** - Hive Gateway configuration (not working yet)
- **[docker-compose.yml](docker-compose.yml)** - Service orchestration
- **[mock-server.js](mock-server.js)** - Mock service implementation
- **[Dockerfile.mock](Dockerfile.mock)** - Mock service container image
- **[Dockerfile.mesh](Dockerfile.mesh)** - Mesh gateway container image
- **[Dockerfile.gateway](Dockerfile.gateway)** - Hive Gateway container image

**Test Scripts:**

- **[test-queries.sh](test-queries.sh)** - Service health and introspection tests
- **[test-data-queries.sh](test-data-queries.sh)** - Data query tests with nested fields
- **[rebuild.sh](rebuild.sh)** - Rebuild all Docker images

**Schema Generation (Project Root):**

- **[regenerate-schemas.sh](../../../regenerate-schemas.sh)** - Regenerate all schemas from JSON
- **[scripts/generate-subgraph-sdl.mjs](../../../scripts/generate-subgraph-sdl.mjs)** - JSON → GraphQL SDL generator
- **[scripts/generate-supergraph.mjs](../../../scripts/generate-supergraph.mjs)** - Compose supergraph from subgraphs

**Canonical Sources:**

- **[src/data/fpds.schema.json](../../../src/data/fpds.schema.json)** - FPDS schema
- **[src/data/usaspending.schema.json](../../../src/data/usaspending.schema.json)** - USAspending schema
- **[src/data/assist.schema.json](../../../src/data/assist.schema.json)** - ASSIST schema
- **[src/data/easi.schema.json](../../../src/data/easi.schema.json)** - EASI schema
- **[src/data/calm.schema.json](../../../src/data/calm.schema.json)** - CALM library schema
