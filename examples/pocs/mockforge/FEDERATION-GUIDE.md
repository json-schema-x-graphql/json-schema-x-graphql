# Schema Unification Forest Mock Services - Full Stack

## Overview

Complete federated mock service stack with:

- **Custom resolvers** with faker.js for realistic data
- **Seed data** from CSV files for each system
- **GraphQL Mesh** for federation gateway
- **Apollo Router** ready configuration
- **SQLite persistence** for mock data

## Architecture

```text
                    ┌─────────────────────┐
                    │   Apollo Router     │
                    │   (Port 4100)       │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │  GraphQL Mesh       │
                    │  Federation Gateway │
                    │  (Port 5050)        │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │          │           │           │          │
   ┌────┴───┐ ┌───┴────┐ ┌───┴────┐ ┌───┴────┐ ┌───┴────┐
   │ Contract Data   │ │USAspend│ │ Legacy Procurement │ │  Intake Process  │ │  Logistics Mgmt  │
   │ :4001  │ │ :4002  │ │ :4003  │ │ :4004  │ │ :4005  │
   └────┬───┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘
        │         │          │          │          │
        └─────────┴──────────┴──────────┴──────────┘
                           │
                  ┌────────┴────────┐
                  │  SQLite DB      │
                  │  (Persistence)  │
                  └─────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
cd dev/pocs/mockforge
pnpm install
```

### 2. Start All Services

```bash
# Option A: Docker Compose (recommended)
docker compose up

# Option B: Individual services
pnpm run services:start
```

### 3. Access Endpoints

- **GraphQL Mesh Gateway**: http://localhost:5000/graphql
- **Apollo Router**: http://localhost:5100
- **Contract Data Mock**: http://localhost:4001/graphql
- **Public Spending Mock**: http://localhost:4002/graphql
- **Legacy Procurement Mock**: http://localhost:4003/graphql
- **Intake Process Mock**: http://localhost:4004/graphql
- **Logistics Mgmt Mock**: http://localhost:4005/graphql

## Features

### Custom Resolvers with Faker.js

Smart data generation based on field names and types:

```javascript
// Automatically generates realistic:
- PIIDs: GS23F0001X, FA8750-23-C-0001
- DUNS numbers: 9-digit identifiers
- UEI codes: 12-character alphanumeric
- Contract amounts: Realistic ranges
- Dates: Recent to future dates
- Names, addresses, emails via faker.js
```

### Seed Data from CSV

Place real data in `seed-data/*.csv` files:

```csv
# contract_data.csv
piid,vendor_name,vendor_duns,naics,psc,award_amount
GS23F0001X,Acme Technology Solutions,123456789,541511,D302,1250000.00
```

Resolvers will use seed data when available, fall back to faker.js.

### GraphQL Mesh Federation

Query across all systems from single endpoint:

```graphql
query UnifiedSearch {
  # Query Contract Data
  contract_data_contracts(limit: 5) {
    piid
    vendorName
  }

  # Query Public Spending
  public_spending_procurements(limit: 5) {
    piid
    awardee_or_recipient_legal
  }

  # Cross-system search
  searchContracts(piid: "GS23F0001X") {
    piid
    vendorName
    sourceSystem
  }
}
```

### SQLite Persistence

Mock data persists across restarts:

```bash
# Data stored in
dev/pocs/mockforge/data/mock-data.db

# Reset data
rm dev/pocs/mockforge/data/mock-data.db
pnpm run services:restart
```

## Configuration

### Custom Resolver Patterns

Edit `mockforge.config.js`:

```javascript
export const fieldPatterns = {
  // Add custom patterns
  myField: () => faker.custom.data(),

  // Override existing
  piid: () => "CUSTOM-" + faker.string.alphanumeric(10),
};
```

### Seed Data

Add/update CSV files in `seed-data/`:

- `contract_data.csv` - Contract Data procurement records
- `public_spending.csv` - Public Spending records
- `legacy_procurement.csv` - Legacy Procurement award records
- `intake_process.csv` - Intake Process contract records
- `logistics_mgmt.csv` - Logistics Mgmt contract records

**Note**: CSV files are seeded with sample data. Replace with actual data for more realistic mocks.

### GraphQL Mesh

Edit `.meshrc.yaml`:

```yaml
sources:
  - name: mySystem
    handler:
      graphql:
        endpoint: http://localhost:3006/graphql
```

## Development Workflows

### Watch Mode

```bash
# Terminal 1: Regenerate schemas on change
pnpm run generate:schemas --watch

# Terminal 2: Restart mocks on schema change
pnpm run services:watch
```

### Testing

```bash
# Query mesh gateway
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ systemStatus { contract_data { available } } }"}'

# Check individual service
curl http://localhost:4001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

### Debugging

```bash
# View mesh logs
docker compose logs -f mesh

# View individual service logs
docker compose logs -f contract_data-mock

# Check SQLite data
sqlite3 dev/pocs/mockforge/data/mock-data.db ".tables"
```

## CI/CD Integration

```yaml
# .github/workflows/integration-tests.yml
- name: Start mock services
  run: |
    cd dev/pocs/mockforge
    docker compose up -d

- name: Wait for services
  run: |
    timeout 60 bash -c 'until curl -f http://localhost:5000/graphql; do sleep 2; done'

- name: Run integration tests
  run: pnpm test:integration
```

## Scripts

```json
{
  "services:start": "Start all mock services",
  "services:stop": "Stop all services",
  "services:restart": "Restart with fresh data",
  "services:watch": "Watch mode for development",
  "mesh:dev": "Start mesh gateway in dev mode",
  "mesh:validate": "Validate mesh configuration",
  "data:seed": "Seed database from CSV files",
  "data:reset": "Reset all mock data"
}
```

## Troubleshooting

### Services not starting

```bash
# Check if ports are in use
lsof -i :4001-4005,5000,5100

# Kill conflicting processes
pkill -f mockforge
```

### Mesh configuration errors

```bash
# Validate configuration
pnpm run mesh:validate

# Check mesh logs
docker compose logs mesh
```

### SQLite database locked

```bash
# Stop all services
docker compose down

# Remove database
rm data/mock-data.db

# Restart
docker compose up
```

## Advanced Usage

### Custom Directives

Add to supergraph for mock behavior:

```graphql
type Contract DataProcurement @mock(count: 100) {
  piid: String! @mock(pattern: "GS\\d{2}F\\d{5}")
  awardAmount: Float! @mock(min: 10000, max: 10000000)
}
```

### Dynamic Relationships

Configure related data in `mockforge.config.js`:

```javascript
// Ensure vendor consistency across systems
const vendorCache = new Map();

export const customResolvers = {
  Contract DataProcurement: {
    vendorDuns: (parent) => {
      const piid = parent.piid;
      if (!vendorCache.has(piid)) {
        vendorCache.set(piid, generateDUNS());
      }
      return vendorCache.get(piid);
    }
  }
};
```

## Performance

- **Mesh caching**: 5-10 minute TTL for queries
- **SQLite**: ~1000 queries/sec for reads
- **Memory**: ~200MB per service
- **Startup**: ~10s for full stack

## Next Steps

- [ ] Add Redis for distributed caching
- [ ] Implement GraphQL subscriptions
- [ ] Add OpenTelemetry tracing
- [ ] Create admin UI for seed data management
- [ ] Add authentication/authorization middleware
