# MockForge POC — Automated Mock Server for Schema Unification Forest

## Status: ✅ Operational

All mock services are running with auto-generated fake data from canonical JSON schemas. GraphQL Mesh federation gateway is operational for cross-subgraph queries.

**Last Updated**: December 5, 2025

## Goal

Provide automated mock GraphQL API generation from canonical JSON Schema sources for local UI development, testing, and demos. MockForge automatically generates realistic mock data using faker.js based on the GraphQL schema.

## Quick Start

### Recommended: Full Federation Stack

```bash
# 1. Generate all schemas from JSON (required first time or after JSON schema changes)
./regenerate-schemas.sh

# 2. Start all services (from dev/pocs/mockforge/)
docker-compose up

# 3. Test the services
./test-data-queries.sh
```

**Endpoints:**

- **GraphQL Mesh** (Federation Gateway): http://localhost:5050/graphql ✅ Working
- **Individual Services**: http://localhost:4001-4005/graphql ✅ All Working
- **Hive Gateway**: http://localhost:5100/graphql ⚠️ Config issue (use Mesh instead)

## Architecture

### Current Federation Stack

```text
GraphQL Mesh (5050) ─────┬──→ Contract Data Mock (4001)      ✅
                         ├──→ Public Spending Mock (4002) ✅
                         ├──→ Legacy Procurement Mock (4003)      ✅
                         ├──→ Intake Process Mock (4004)        ✅
                         └──→ Logistics Mgmt Mock (4005)        ✅ (library-only)

Hive Gateway (5100) ──────→ Supergraph ⚠️ (routing issue)
```

**All individual mock services working perfectly with nested auto-generated data!**

## Integration with Schema Pipeline

MockForge uses schemas generated from canonical JSON Schema sources:

### Schema Generation Flow

```text
JSON Schema Sources (src/data/*.schema.json)
    ↓ (generate-subgraph-sdl.mjs)
Subgraph Schemas (generated-schemas/*.subgraph.graphql)
    ↓ (generate-supergraph.mjs)
Supergraph Schema (generated-schemas/schema_unification.supergraph.graphql)
    ↓
MockForge Services (auto-mocking with faker.js)
    ↓
GraphQL Mesh (federation routing)
    ↓
Mock GraphQL API (http://localhost:5050/graphql)
```

### Key Files

**Schema Sources (Canonical JSON):**

- `src/data/contract_data.schema.json` - Contract Data procurement data schema
- `src/data/public_spending.schema.json` - Public Spending procurement schema
- `src/data/legacy_procurement.schema.json` - Legacy Procurement interagency agreement schema
- `src/data/intake_process.schema.json` - Intake Process IT system schema
- `src/data/logistics_mgmt.schema.json` - Logistics Mgmt shared types (library-only)

**Generated Schemas:**

- `generated-schemas/*.subgraph.graphql` - Individual subgraph SDL files
- `generated-schemas/schema_unification.supergraph.graphql` - Composed supergraph

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
- ✅ **SQLite Persistence** — Mock data persists across restarts
- ✅ **Custom Resolvers** — Field-specific data generation patterns
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

Resolvers use seed data first, fall back to faker.js.

### SQLite Persistence

Mock data persists in `data/mock-data.db`:

```bash
# Reset data
rm data/mock-data.db && pnpm run data:seed

# Inspect
sqlite3 data/mock-data.db "SELECT COUNT(*) FROM mock_records"
```

## Usage Examples

### Query Federation Gateway (GraphQL Mesh)

```bash
# Query multiple subgraphs in one request
curl -s http://localhost:5050/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ intake_processRecords { businessOwner systemOwner } contract_dataRecords { identifiers { piid } agency { contractingAgencyName } } }"
  }' | jq
```

```graphql
# GraphiQL at http://localhost:5050/graphql
query CrossSystemQuery {
  # Contract Data procurement data
  contract_dataRecords {
    identifiers {
      piid
      agencyCode
    }
    agency {
      contractingAgencyName
      departmentName
    }
    financial {
      dollarsObligated
      currentContractValue
    }
  }

  # Public Spending data
  public_spendingProcurements {
    piid
    uniqueAwardKey
    awardeeOrRecipientLegal
    federalActionObligation
  }

  # Legacy Procurement interagency agreements
  legacy_procurementRecords {
    iaPiidOrUniqueId
    systemMetadata {
      systemName
      sourceRecordId
      ingestedAt
    }
    legacy_procurementSpecific {
      acquisitionData {
        iaPiidOrUniqueId
        natureOfAcquisition
      }
    }
  }

  # Intake Process IT systems
  intake_processRecords {
    businessOwner
    systemOwner
    systemMetadata {
      systemName
      sourceRecordId
    }
  }
}
```

### Query Individual Service

```bash
# Contract Data Mock (port 4001)
curl -s http://localhost:4001/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ contract_dataRecords { identifiers { piid agencyCode } } }"
  }' | jq

# Public Spending Mock (port 4002)
curl -s http://localhost:4002/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ public_spendingProcurements { piid uniqueAwardKey } }"
  }' | jq

# Legacy Procurement Mock (port 4003)
curl -s http://localhost:4003/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ legacy_procurementRecords { iaPiidOrUniqueId systemMetadata { sourceRecordId } } }"
  }' | jq

# Intake Process Mock (port 4004)
curl -s http://localhost:4004/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ intake_processRecords { businessOwner systemOwner } }"
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
  Contract DataProcurement: {
    piid: () => generatePIID(),
    vendorName: () => {
      const seed = seedLoader.getRandomRecord('contract_data');
      return seed?.vendor_name || faker.company.name();
    }
  }
};

export const fieldPatterns = {
  email: () => faker.internet.email(),
  duns: () => generateDUNS(),
  piid: () => generatePIID(),
};
```

### Seed Data

CSV files in `seed-data/`:

- `contract_data.csv` - 12 sample Contract Data records
- `public_spending.csv` - 12 sample Public Spending records
- `legacy_procurement.csv` - 12 sample Legacy Procurement records
- `intake_process.csv` - 12 sample Intake Process records
- `logistics_mgmt.csv` - 12 sample Logistics Mgmt records

**Replace with real data for production-like mocks**

### GraphQL Mesh

Edit `.meshrc.yaml`:

```yaml
sources:
  - name: contract_data
    handler:
      graphql:
        endpoint: http://localhost:4001/graphql
```

### Apollo Router

Edit `router.yaml`:

```yaml
override_subgraph_url:
  contract_data: http://contract_data-mock:4001/graphql
```

## Troubleshooting

### Services not starting

```bash
# Check Docker logs
docker-compose logs contract_data-mock public_spending-mock legacy_procurement-mock intake_process-mock logistics_mgmt-mock mesh

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
cat generated-schemas/contract_data.subgraph.graphql | grep "type FpdsRecord" -A 20

# Check Query type
cat generated-schemas/contract_data.subgraph.graphql | grep "type Query" -A 10
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
- [x] Fix Contract Data and Public Spending query definitions (`type` vs `returnType`)
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

- **[src/data/contract_data.schema.json](../../../src/data/contract_data.schema.json)** - Contract Data schema
- **[src/data/public_spending.schema.json](../../../src/data/public_spending.schema.json)** - Public Spending schema
- **[src/data/legacy_procurement.schema.json](../../../src/data/legacy_procurement.schema.json)** - Legacy Procurement schema
- **[src/data/intake_process.schema.json](../../../src/data/intake_process.schema.json)** - Intake Process schema
- **[src/data/logistics_mgmt.schema.json](../../../src/data/logistics_mgmt.schema.json)** - Logistics Mgmt library schema
