# GraphQL Mesh POC

**Status:** Active evaluation  
**Priority:** HIGH (Top candidate for REST integration)  
**Updated:** December 1, 2025

---

## Overview

GraphQL Mesh POC for Schema Unification Forest gateway evaluation.

**Key Features:**
- ✅ Declarative REST to GraphQL mapping (`.meshrc.yaml`)
- ✅ Built-in OpenAPI/JSON Schema support
- ✅ Mock data generation
- ✅ Federation support
- ✅ Snake_case → camelCase transforms
- ✅ Response validation

---

## Quick Start

### Local Development

```bash
# Install dependencies
pnpm install

# Start dev server (hot reload enabled)
pnpm dev

# GraphiQL available at:
# http://localhost:4000/graphql
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f mesh

# Stop services
docker-compose down
```

### Cloud.gov Deployment

```bash
# Push to cloud.gov
cf push schema_unification-mesh -f manifest.yml

# Check status
cf app schema_unification-mesh

# View logs
cf logs schema_unification-mesh --recent
```

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `4000` |
| `NODE_ENV` | Environment | `development` |
| `ENABLE_MOCKS` | Enable mock data | `true` |
| `DATABRICKS_BASE_URL` | REST API base URL | `http://mock-api:3000` |
| `DATABRICKS_TOKEN` | API authentication token | (none) |
| `SCHEMA_PATH` | Path to supergraph SDL | `../../generated-schemas/schema_unification.supergraph.graphql` |

### Mesh Configuration (`.meshrc.yaml`)

See `.meshrc.yaml` for complete configuration including:
- OpenAPI source handlers
- Field name transforms (snake_case → camelCase)
- Response validation (JSON Schema)
- Cache configuration
- Mock data generators

---

## Project Structure

```
graphql-mesh/
├── .meshrc.yaml          # Mesh configuration
├── package.json          # Dependencies
├── manifest.yml          # Cloud.gov deployment
├── docker-compose.yml    # Local development stack
├── Dockerfile            # Container image
├── project.json          # Cloud Native Buildpack config
├── src/
│   └── index.ts          # Entry point (if needed)
├── schemas/              # JSON Schema files
│   └── *.schema.json
└── mocks/                # Mock data fixtures
    └── *.json
```

---

## Evaluation Criteria

### ✅ Strengths

1. **REST Integration (5/5)**
   - Best-in-class OpenAPI support
   - Declarative field mapping
   - Built-in transforms (rename, filter, wrap)
   - JSON Schema validation

2. **Mock Data (5/5)**
   - Automatic mock generation from schema
   - Custom mock handlers
   - Toggle via env var

3. **Development Speed (4/5)**
   - Hot reload on config changes
   - Clear error messages
   - GraphiQL included

4. **Schema Validation (4/5)**
   - Native JSON Schema support
   - Pre-request and post-response validation

5. **Federation (5/5)**
   - Full federation gateway support
   - Can merge multiple subgraphs
   - Supports all v2.3 directives

### ⚠️ Concerns

1. **Operational Complexity (2/5)**
   - Many configuration options
   - Multiple plugins/handlers
   - Steep learning curve

2. **Memory Usage (3/5)**
   - ~300-400MB typical
   - Need to test under load

3. **Cloud.gov Fit (3/5)**
   - Node.js buildpack works
   - May need memory tuning
   - Health check endpoint needs custom impl

---

## Test Scenarios

### 1. Load Supergraph SDL

```bash
# Should load without errors
curl http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'
```

### 2. Mock Data Generation

```graphql
query {
  allSolicitations(limit: 5) {
    id
    solicitationNumber
    title
    amount
  }
}
```

**Expected:** Realistic mock data generated from schema types.

### 3. REST API Proxy

```graphql
# With ENABLE_MOCKS=false
query {
  solicitationById(id: "TEST123") {
    id
    solicitationNumber
    title
    amount
  }
}
```

**Expected:** 
- Calls `GET /solicitations/TEST123` on mock REST API
- Validates response against JSON Schema
- Transforms snake_case → camelCase
- Returns GraphQL response

### 4. Error Handling

```graphql
query {
  solicitationById(id: "INVALID") {
    id
    title
  }
}
```

**Expected:** Graceful error for 404 from REST API.

### 5. Federation Entity Resolution

```graphql
query {
  _entities(representations: [
    { __typename: "AssistRecord", ia_piid_or_unique_id: "TEST123" }
  ]) {
    ... on AssistRecord {
      iaPiidOrUniqueId
      systemMetadata { systemName }
    }
  }
}
```

---

## Benchmarks

### Performance Test

```bash
# Install autocannon
npm install -g autocannon

# Run benchmark (10 concurrent, 30 seconds)
autocannon -c 10 -d 30 \
  -H "Content-Type: application/json" \
  -m POST \
  -b '{"query": "{ solicitationById(id: \"TEST123\") { id title } }"}' \
  http://localhost:4000/graphql
```

**Targets:**
- p95 latency: <100ms
- Throughput: >500 req/sec
- Memory: <512MB

### Memory Test

```bash
# Monitor memory usage
docker stats mesh --no-stream

# Or with Node.js
node --expose-gc --max-old-space-size=512 node_modules/.bin/mesh dev
```

---

## Scoring Matrix

| Criterion | Weight | Score (0-5) | Notes |
|-----------|--------|-------------|-------|
| Federation Support | 5 | 5 | Full gateway support |
| REST Integration | 5 | 5 | Best-in-class OpenAPI |
| Mock Data | 3 | 5 | Excellent mock support |
| Development Speed | 4 | 4 | Hot reload, good DX |
| Performance | 4 | 3 | Adequate but not fastest |
| Cloud.gov Fit | 5 | 3 | Works but may need tuning |
| Operational | 4 | 2 | Complex configuration |
| Validation | 3 | 4 | Native JSON Schema |
| Community | 3 | 3 | Active but smaller |
| Learning Curve | 2 | 3 | Moderate complexity |
| **TOTAL** | **38** | **TBD** | Weighted score pending |

---

## Next Steps

1. ✅ Create basic configuration
2. ✅ Set up docker-compose
3. ✅ Create cloud.gov manifest
4. ⏳ Load supergraph SDL
5. ⏳ Configure 3-5 REST endpoint mappings
6. ⏳ Run benchmarks
7. ⏳ Test cloud.gov deployment
8. ⏳ Complete scoring

---

## References

- [GraphQL Mesh Docs](https://the-guild.dev/graphql/mesh)
- [OpenAPI Handler](https://the-guild.dev/graphql/mesh/docs/handlers/openapi)
- [Federation Plugin](https://the-guild.dev/graphql/mesh/docs/plugins/federation)
- [Transform Reference](https://the-guild.dev/graphql/mesh/docs/transforms/rename)
