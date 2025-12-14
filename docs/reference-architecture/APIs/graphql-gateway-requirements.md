# GraphQL Gateway Requirements & Solutions Comparison

**Document Purpose:** Define requirements and evaluation criteria for selecting a GraphQL gateway solution to support the Schema Unification Forest canonical data model.

**Status:** Draft for review  
**Date:** December 2024  
**Owner:** Development Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Business Requirements](#business-requirements)
3. [Technical Requirements](#technical-requirements)
4. [Deployment Context](#deployment-context)
5. [Candidate Solutions](#candidate-solutions)
6. [Evaluation Criteria](#evaluation-criteria)
7. [Questions for Clarification](#questions-for-clarification)
8. [Next Steps](#next-steps)

---

## Executive Summary

### Goals

We need a GraphQL gateway solution that:

1. **Serves as a mock/development API** based on our generated supergraph SDL (`generated-schemas/schema_unification.supergraph.graphql`)
2. **Proxies to remote REST APIs** validated by JSON Schema (per Databricks Delta tables)
3. **Deploys to cloud.gov** as a single application serving dual purposes:
   - Production API endpoint/gateway
   - Development iteration tool for rapid schema changes
4. **Supports federation semantics** from our Apollo Federation v2.3+ SDL (4 subgraphs: Legacy Procurement, Logistics Mgmt, Intake Process, Contract Data)

### Success Criteria

- **Fast iteration:** Schema changes visible in <2 minutes
- **REST integration:** Can proxy to JSON Schema-validated REST endpoints
- **Cloud.gov ready:** Deployable as Cloud Foundry app or Docker container
- **Minimal transformation:** Preserve federation directives and field semantics
- **Developer friendly:** Good DX for local development and debugging

---

## Business Requirements

### BR-1: Development Velocity

**Requirement:** Support rapid iteration on schema design during development phase.

**Rationale:** The canonical schema is evolving. Developers need to:
- Experiment with field names, types, and relationships
- Validate breaking changes before committing
- Get immediate feedback on schema validity

**Acceptance Criteria:**
- Schema changes reflected in GraphQL API within 2 minutes
- Hot reload or quick restart capability
- Clear error messages for invalid schema changes

---

### BR-2: Production Readiness

**Requirement:** Same solution must serve production traffic on cloud.gov.

**Rationale:** Minimize operational complexity by using one gateway for dev and prod.

**Acceptance Criteria:**
- Deployable to cloud.gov (Cloud Foundry or Docker)
- Configurable for multiple environments (dev/staging/prod)
- Production-grade performance (>1000 req/sec for simple queries)
- Observability (logs, metrics, traces)

---

### BR-3: Data Source Integration

**Requirement:** Proxy GraphQL queries to multiple REST API backends validated by JSON Schema.

**Rationale:** 
- Backend data sources (Databricks Delta tables) expose REST APIs
- Each source has a JSON Schema defining its contract
- Gateway must validate responses and map to GraphQL types

**Acceptance Criteria:**
- HTTP/REST data source support
- Configurable endpoint mappings (field → REST URL)
- Response validation against JSON Schema
- Error handling for downstream failures

---

### BR-4: Cost Efficiency

**Requirement:** Minimize infrastructure costs during development and production.

**Rationale:** Limited budget for infrastructure. Solution should:
- Run efficiently on cloud.gov's smallest instance sizes
- Not require expensive managed services
- Be horizontally scalable when needed

**Acceptance Criteria:**
- Runs in <512MB RAM for dev workloads
- Scales horizontally with load (stateless)
- No vendor lock-in to expensive managed services

---

## Technical Requirements

### TR-1: Apollo Federation Support

**Requirement:** Preserve Apollo Federation v2.3+ semantics from our supergraph.

**Context:**
- Generated supergraph: `generated-schemas/schema_unification.supergraph.graphql`
- 4 subgraphs: Legacy Procurement, Logistics Mgmt, Intake Process, Contract Data
- Uses `@key`, `@shareable`, `@external`, `@provides`, `@requires` directives

**Acceptance Criteria:**
- Load supergraph SDL without losing federation metadata
- Execute federated queries correctly (entity resolution across subgraphs)
- Support `_entities` and `_service` queries

**Open Questions:**
- Do we need full federation gateway (Apollo Router/Mesh) or just schema stitching?
- Can we simplify by merging subgraphs into one monolithic schema for development?

---

### TR-2: Schema Generation Pipeline

**Requirement:** Integrate with existing schema generation tooling.

**Context:**
- Canonical source: `src/data/schema_unification.schema.json` (JSON Schema in snake_case)
- Generated SDL: Multiple scripts produce various GraphQL outputs
- Pipeline: JSON Schema → GraphQL SDL → Supergraph → Gateway

**Acceptance Criteria:**
- Gateway can load SDL from file or URL
- Schema reload mechanism (file watch or API endpoint)
- Compatible with our existing generators

**Integration Points:**
- `scripts/generate-graphql-from-json-schema.mjs`
- `scripts/generate-subgraph-sdl.mjs`
- `generated-schemas/` output directory

---

### TR-3: REST to GraphQL Mapping

**Requirement:** Map GraphQL fields to REST endpoints with JSON Schema validation.

**Mapping Patterns:**

```yaml
# Example mapping configuration
resolvers:
  Query:
    solicitationById:
      rest:
        endpoint: "https://api.example.gov/v1/solicitations/{args.id}"
        method: GET
        headers:
          Authorization: "Bearer ${env.API_TOKEN}"
        responseSchema: "schemas/solicitation.schema.json"
        transform: |
          # Optional: transform snake_case response to camelCase
          const { snakeToCamel } = require('./helpers/case-conversion');
          return snakeToCamel(response);
```

**Acceptance Criteria:**
- Declarative mapping (YAML or JSON config)
- Support for path parameters, query params, headers
- Response validation against JSON Schema
- Error handling (downstream timeouts, 4xx/5xx responses)
- Optional response transformation (snake_case → camelCase)

---

### TR-4: Mock Data Support

**Requirement:** Generate realistic mock responses during development.

**Rationale:** 
- Backend REST APIs may not exist yet
- Need to develop frontend independently
- Want to test error scenarios

**Acceptance Criteria:**
- Generate mocks from GraphQL schema types
- Support custom mock data (fixtures or faker.js)
- Toggle between mock and real data per resolver
- Realistic response times (configurable delays)

---

### TR-5: Development Experience

**Requirement:** Excellent local development experience.

**Acceptance Criteria:**
- Single command to start local server
- GraphiQL or GraphQL Playground UI included
- Hot reload on schema changes
- Clear error messages
- Request logging (queries, variables, execution time)

---

### TR-6: Testing Support

**Requirement:** Enable automated testing of schema and resolvers.

**Acceptance Criteria:**
- Programmatic API for tests (not just CLI)
- Schema introspection for parity tests
- Resolver testing with mocked data sources
- Integration tests with real REST endpoints

---

## Deployment Context

### Cloud.gov Requirements

**Platform:** Cloud Foundry on cloud.gov (AWS GovCloud)

**Deployment Options:**
1. **Cloud Foundry Buildpack** (Node.js, Go, Python, etc.)
2. **Docker Container** (custom runtime)

**Constraints:**
- No SSH access to running containers
- Logs via `cf logs` (stdout/stderr)
- Ephemeral filesystem (use S3 for persistent storage)
- Environment variables for configuration
- Health check endpoint required

**Manifest Example:**

```yaml
# manifest.yml
applications:
  - name: schema_unification-graphql-gateway
    memory: 512M
    instances: 2
    buildpacks:
      - nodejs_buildpack
    env:
      NODE_ENV: production
      SCHEMA_URL: https://example.com/schema/schema_unification.supergraph.graphql
    health-check-type: http
    health-check-http-endpoint: /health
```

---

## Candidate Solutions

### 1. Existing POCs in `/dev/pocs`

#### PostGraphile
- **Location:** `dev/pocs/postgraphile/`
- **Approach:** Postgres-first, auto-generate GraphQL from DB schema
- **Status:** Basic POC complete, evaluation in progress
- **Pros:**
  - Fast iteration (DB schema → GraphQL instantly)
  - Excellent performance
  - Rich plugin ecosystem
- **Cons:**
  - Requires Postgres (not REST-first)
  - May need significant plugins for REST proxy
  - Federation support unclear

#### Grafserv
- **Location:** `dev/pocs/grafserv/`
- **Approach:** Express + @graphql-tools/schema + manual delegation
- **Status:** Spike implementation with wrap-schema variant
- **Pros:**
  - Lightweight, flexible
  - Full control over resolvers
  - Can delegate to PostGraphile or other services
- **Cons:**
  - Manual resolver implementation
  - No built-in REST mapping
  - More code to maintain

#### Prisma
- **Location:** `dev/pocs/prisma/`
- **Status:** Early exploration
- **Approach:** ORM + Prisma Client for type-safe data access
- **Pros:**
  - Type safety with TypeScript
  - Good DX with Prisma Studio
- **Cons:**
  - Primarily DB-focused (not REST)
  - Requires Prisma schema (another layer)
  - Federation support unclear

#### Mockforge
- **Location:** `dev/pocs/mockforge/`
- **Status:** Minimal setup
- **Notes:** Need more investigation

---

### 2. gqlgen (Proposed)

**Repository:** https://github.com/99designs/gqlgen  
**Language:** Go  
**Approach:** Code-first GraphQL server for Go

**Pros:**
- High performance (compiled Go)
- Strong type safety
- Good federation support (via federation library)
- Lightweight binary (good for cloud.gov)
- Excellent documentation

**Cons:**
- Go-based (may require new expertise)
- Code-first (need to generate Go types from SDL)
- Custom resolvers required for REST mapping

**Cloud.gov Fit:**
- ✅ Compiles to small binary (~20MB)
- ✅ Low memory footprint (<128MB)
- ✅ Fast startup time
- ✅ Can use Go buildpack or Docker

**REST Integration:**
- Need custom resolvers calling REST endpoints
- Can use `encoding/json` + `go-jsonschema` for validation
- Example resolver pattern:

```go
func (r *queryResolver) SolicitationByID(ctx context.Context, id string) (*model.Solicitation, error) {
    resp, err := http.Get(fmt.Sprintf("https://api.example.gov/v1/solicitations/%s", id))
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    var data map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&data)
    
    // Validate against JSON Schema
    if err := validateResponse(data, solicitationSchema); err != nil {
        return nil, err
    }
    
    // Transform to GraphQL type
    return transformToSolicitation(data), nil
}
```

---

### 3. Apollo Server + DataSources

**Repository:** https://github.com/apollographql/apollo-server  
**Language:** Node.js/TypeScript  
**Approach:** Schema-first with DataSource pattern for REST

**Pros:**
- Battle-tested for federation
- Built-in federation gateway support
- RESTDataSource pattern for REST APIs
- Excellent documentation
- Large community

**Cons:**
- Node.js overhead (memory, startup time)
- Requires custom DataSource implementations
- No built-in JSON Schema validation
- Can be heavyweight

**Cloud.gov Fit:**
- ✅ Node.js buildpack available
- ⚠️ Higher memory usage (256-512MB typical)
- ✅ Mature deployment patterns

**REST Integration:**
- RESTDataSource class handles HTTP concerns
- Example:

```typescript
class SolicitationAPI extends RESTDataSource {
  override baseURL = 'https://api.example.gov/v1/';
  
  async getSolicitationById(id: string): Promise<Solicitation> {
    const data = await this.get(`solicitations/${id}`);
    
    // Validate with ajv
    const validate = ajv.compile(solicitationSchema);
    if (!validate(data)) {
      throw new Error('Response validation failed');
    }
    
    return data;
  }
}
```

---

### 4. Mercurius (Fastify Plugin)

**Repository:** https://github.com/mercurius-js/mercurius  
**Language:** Node.js/TypeScript  
**Approach:** High-performance GraphQL for Fastify

**Pros:**
- Very fast (Fastify foundation)
- Lower overhead than Express/Apollo
- Federation support via `@mercuriusjs/federation`
- Good plugin ecosystem

**Cons:**
- Smaller community than Apollo
- Less mature federation implementation
- Need custom REST integration

**Cloud.gov Fit:**
- ✅ Lower memory than Apollo (~256MB)
- ✅ Fast startup
- ✅ Node.js buildpack

---

### 5. Hasura DDN (Deprecated)

**Status:** Deprecated per `dev/README.md`  
**Reason:** Complexity of federation transformation, fidelity loss

See: `docs/archived/hasura-ddn-abandonment.md`

---

### 6. GraphQL Mesh

**Repository:** https://github.com/Urigo/graphql-mesh  
**Language:** Node.js/TypeScript  
**Approach:** Universal GraphQL Gateway (REST, gRPC, SQL, GraphQL)

**Pros:**
- Built specifically for REST to GraphQL
- Declarative configuration (`.meshrc.yaml`)
- JSON Schema support via OpenAPI handler
- Schema stitching and federation
- Mock data support

**Cons:**
- Complex configuration
- Can be heavy (multiple handlers/plugins)
- Active development (frequent breaking changes)

**Cloud.gov Fit:**
- ⚠️ Medium memory footprint (256-512MB)
- ✅ Node.js buildpack
- ✅ Docker option

**REST Integration:**
- Best-in-class REST support
- Example config:

```yaml
# .meshrc.yaml
sources:
  - name: Solicitations
    handler:
      openapi:
        source: https://api.example.gov/v1/openapi.json
        schemaHeaders:
          Authorization: Bearer {env.API_TOKEN}
    transforms:
      - rename:
          mode: bare | wrap
          renames:
            - from:
                type: Solicitation
                field: solicitation_number
              to:
                type: Solicitation
                field: solicitationNumber
```

---

### 7. StepZen (Commercial)

**Not evaluated** - Commercial SaaS, likely not suitable for gov cloud deployment

---

## Evaluation Criteria

### Scoring Matrix (0-5 scale)

| Criterion | Weight | PostGraphile | Grafserv | gqlgen | Apollo | Mercurius | Mesh |
|-----------|--------|--------------|----------|--------|--------|-----------|------|
| **Federation Support** | 5 | ? | 3 | 4 | 5 | 4 | 5 |
| **REST Integration** | 5 | 2 | 3 | 4 | 4 | 4 | 5 |
| **Mock Data Support** | 3 | 2 | 3 | 3 | 4 | 3 | 5 |
| **Development Speed** | 4 | 5 | 3 | 3 | 4 | 4 | 4 |
| **Performance** | 4 | 5 | 4 | 5 | 3 | 4 | 3 |
| **Cloud.gov Fit** | 5 | 3 | 4 | 5 | 4 | 4 | 3 |
| **Operational Simplicity** | 4 | 4 | 3 | 4 | 4 | 4 | 2 |
| **Schema Validation** | 3 | 3 | 2 | 3 | 3 | 3 | 4 |
| **Community/Support** | 3 | 4 | 2 | 4 | 5 | 3 | 3 |
| **Learning Curve** | 2 | 3 | 3 | 2 | 4 | 4 | 3 |
| **TOTAL (weighted)** | - | **TBD** | **TBD** | **TBD** | **TBD** | **TBD** | **TBD** |

**Weights:**
- 5 = Critical (dealbreaker if poor)
- 4 = Very Important
- 3 = Important
- 2 = Nice to have

---

## Detailed Evaluation Criteria

### 1. Federation Support (Weight: 5)

**Questions:**
- Can it load and serve our supergraph SDL?
- Are `@key`, `@external`, `@requires`, `@provides` directives preserved?
- Does it support `_entities` and `_service` queries?
- Can it act as a federation gateway or just a standalone service?

**Test:**
```graphql
# Test federated entity resolution
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

### 2. REST Integration (Weight: 5)

**Questions:**
- How do we map GraphQL fields to REST endpoints?
- A: Ideal solution would provide a mechanism
- Is it declarative (config) or code (resolvers)?
- Can responses be validated against JSON Schema?
- How are errors from downstream services handled?
- Can we transform response formats (snake_case → camelCase)?

**Test Scenarios:**
- Map `Query.solicitationById` → `GET /api/v1/solicitations/{id}`
- Handle 404 from REST API gracefully
- Validate response matches `solicitation.schema.json`
- Transform field names if needed

---

### 3. Mock Data Support (Weight: 3)

**Questions:**
- Can it generate mock data from schema types?
- Can we provide custom fixtures?
- Can we toggle mock vs real data per resolver?
- Are mocks realistic (faker.js integration)?

**Test:**
```graphql
# Should return realistic mock data
query {
  allSolicitations(limit: 10) {
    id
    solicitationNumber
    title
    amount
  }
}
```

---

### 4. Development Speed (Weight: 4)

**Measurement:**
- Time to apply schema change and see it in GraphQL
- Hot reload capability
- Error clarity
- Local setup time (first run)

**Benchmark:**
- Change field name in SDL
- Measure time until GraphQL query returns new field
- Target: <2 minutes end-to-end

---

### 5. Performance (Weight: 4)

**Benchmarks:**
- Simple query latency (p50, p95, p99)
- Throughput (requests/second)
- Memory usage under load
- Startup time

**Test Query:**
```graphql
query {
  solicitationById(id: "TEST123") {
    id
    title
    amount
  }
}
```

**Tool:** `autocannon` or `k6`

**Target:**
- p95 latency <100ms
- >1000 req/sec on 2 CPU cores
- <512MB memory

---

### 6. Cloud.gov Fit (Weight: 5)

**Checklist:**
- ✅ Works with Cloud Foundry buildpack or Docker
- ✅ Configurable via environment variables
- ✅ Exposes health check endpoint
- ✅ Logs to stdout/stderr
- ✅ Runs in <512MB RAM
- ✅ Horizontal scaling (stateless)

**Test:**
```bash
# Push to cloud.gov
cf push schema_unification-gateway -f manifest.yml

# Check health
cf app schema_unification-gateway

# View logs
cf logs schema_unification-gateway --recent
```

---

### 7. Operational Simplicity (Weight: 4)

**Questions:**
- How many moving parts (services, databases, caches)?
- Configuration complexity (how many files/env vars)?
- Observability (logs, metrics, traces)?
- Error handling and debugging

**Ideal:**
- Single process (no sidecars)
- <10 environment variables for basic config
- Structured JSON logs
- Clear error messages

---

### 8. Schema Validation (Weight: 3)

**Questions:**
- Can it validate REST responses against JSON Schema?
- Built-in or requires integration (ajv, etc.)?
- Performance impact of validation?
- Error reporting quality

**Test:**
```javascript
// Response from REST API
const response = {
  solicitation_number: "ABC-123",
  title: "Test",
  amount: "invalid" // Should be number
};

// Should fail validation
validateResponse(response, solicitationSchema);
```

---

### 9. Community/Support (Weight: 3)

**Factors:**
- GitHub stars and activity
- Documentation quality
- Stack Overflow questions
- Commercial support available
- Maintenance status

---

### 10. Learning Curve (Weight: 2)

**Questions:**
- How familiar is the stack to our team?
- Time to productivity for new contributor
- Ecosystem maturity

**Current Team Skills:**
- ✅ Node.js/TypeScript (strong)
- ✅ GraphQL (moderate)
- ⚠️ Go (limited)
- ✅ REST APIs (strong)
- ✅ JSON Schema (strong)

---

## Questions for Clarification

### Business Context

1. **Timeline:** When do we need production-ready gateway?
   - Development phase only? Or production traffic soon?
   - A: Development is first proiority, seemless iterating of generated schemas must be paramopunt, production capable eventually
   - Can we iterate on POCs or need to commit quickly?

2. **Traffic Expectations:**
   - Expected requests/day in production?
   - Concurrent users?
   - Data freshness requirements (cache TTL)?
   - A: Per day refresh cycle with heavy caching 

3. **Security:**
   - Authentication requirements (OAuth, JWT, API keys)?
   - A: Can be native or 3rd party compatible may use API umbrella or Keycloak in front and proxy to
   - Authorization model (field-level, row-level)?
   - A: Ideal solution would support federation directives for authz
   - Compliance requirements (FedRAMP, etc.)?

4. **Data Sources:**
   - How many REST APIs will we proxy to?
   - A: 4 to start up to 20 eventually
   - Are they all Databricks Delta tables or mixed sources?
   - Do they all have OpenAPI/JSON Schema specs?
   - Are they synchronous (REST) or async (events)?

### Technical Details

5. **Federation Needs:**
   - Do we actually need federation gateway capabilities?
   - Or can we simplify to single monolithic schema for v1?
   - Are subgraphs owned by different teams/services?

6. **Schema Evolution:**
   - How often do we expect schema changes?
   - Breaking changes acceptable or need versioning?
   - Schema registry required?

7. **Mock vs Real Data:**
   - During development, 100% mocked or mixed?
   - When do real REST APIs become available?
   - Need to support both simultaneously?

8. **Transformation Requirements:**
   - Do all REST APIs return snake_case?
   - Need other transformations (date formats, enums, etc.)?
   - Acceptable to do in gateway or should be in REST API?

9. **Observability:**
   - Required metrics (latency, error rate, etc.)?
   - Tracing requirements (OpenTelemetry)?
   - Log aggregation setup (Splunk, ELK)?

10. **Development Workflow:**
    - CI/CD pipeline in place?
    - Automated testing requirements?
    - Preview environments for PRs?

### Operational

11. **Cloud.gov Constraints:**
    - Memory limits per instance?
    - Budget for instances/services?
    - Existing services we can leverage (Redis, S3, etc.)?

12. **Team Capacity:**
    - Comfortable with Go if we choose gqlgen?
    - Prefer Node.js ecosystem?
    - DevOps support available for complex setups?

---

## Next Steps

### Phase 1: POC Evaluation (1-2 weeks)

**For Each Candidate Solution:**

1. **Setup**
   - Deploy to local environment
   - Load supergraph SDL
   - Configure mock data

2. **Integration Test**
   - Map 3-5 fields to REST endpoints
   - Validate JSON Schema responses
   - Test error handling

3. **Benchmark**
   - Run performance tests
   - Measure memory usage
   - Test schema reload time

4. **Documentation**
   - Create setup guide
   - Document pros/cons
   - Score against criteria

**Deliverables:**
- POC for gqlgen (new)
- Updated POCs for existing solutions
- Completed scoring matrix
- Recommendation document

---

### Phase 2: Prototype (2-3 weeks)

**Based on selected solution:**

1. **Full Schema Integration**
   - Load complete supergraph
   - Map all critical resolvers
   - Implement authentication

2. **Cloud.gov Deployment**
   - Create manifest.yml
   - Push to dev space
   - Validate health checks

3. **Developer Documentation**
   - Local setup guide
   - Schema change workflow
   - Troubleshooting guide

4. **Testing**
   - Automated integration tests
   - Load testing
   - Security scanning

---

### Phase 3: Production Readiness (2-3 weeks)

1. **Monitoring**
   - Metrics dashboard
   - Alerting setup
   - Log aggregation

2. **Operations Guide**
   - Deployment runbook
   - Incident response
   - Rollback procedures

3. **Performance Tuning**
   - Cache configuration
   - Connection pooling
   - Query optimization

4. **Security Hardening**
   - Rate limiting
   - Input validation
   - Secrets management

---

## Recommendation Framework

### Decision Tree

```
START: Need GraphQL gateway for Schema Unification Forest

├─ Primary Use Case?
│  ├─ Development/Mocking Only
│  │  → Consider: Mockforge, GraphQL Mesh (mock mode)
│  │  
│  ├─ Development + Future Production
│  │  ├─ Team Expertise?
│  │  │  ├─ Strong Node.js/TypeScript
│  │  │  │  ├─ REST Integration Critical?
│  │  │  │  │  ├─ Yes → GraphQL Mesh or Apollo + DataSources
│  │  │  │  │  └─ No → Mercurius or Apollo
│  │  │  │  
│  │  │  └─ Open to Go
│  │  │     └─ Performance Critical?
│  │  │        ├─ Yes → gqlgen
│  │  │        └─ No → Still consider gqlgen for simplicity
│  │  │
│  │  └─ Database-First Model?
│  │     └─ Yes → PostGraphile
│  │     └─ No → See above
│  │
│  └─ Production Immediate + High Scale
│     └─ gqlgen (performance) or Apollo (maturity)
```

---

## Appendix: Example Configurations

### A. GraphQL Mesh Configuration

```yaml
# .meshrc.yaml
sources:
  # Databricks REST API
  - name: Databricks
    handler:
      openapi:
        source: ./schemas/databricks-openapi.json
        baseUrl: https://databricks.example.gov/api/v1
        schemaHeaders:
          Authorization: Bearer {env.DATABRICKS_TOKEN}
        operationHeaders:
          Content-Type: application/json
    transforms:
      # Rename snake_case to camelCase
      - rename:
          mode: bare
          renames:
            - from:
                type: Solicitation
                field: solicitation_number
              to:
                type: Solicitation
                field: solicitationNumber
      # Validate responses
      - validate:
          schema: ./schemas/solicitation.schema.json

# Federation config
additionalTypeDefs: |
  extend type Solicitation @key(fields: "id") {
    id: ID! @external
    solicitationNumber: String!
  }

# Cache configuration
cache:
  - field: Query.solicitationById
    invalidate:
      ttl: 3600

# Plugins
plugins:
  - mock:
      if: "{env.ENABLE_MOCKS}"
      mocks:
        Solicitation:
          solicitationNumber: "{random.alphanumeric 10}"
          title: "{lorem.sentence}"
          amount: "{random.number 1000000}"
```

---

### B. gqlgen Configuration

```yaml
# gqlgen.yml
schema:
  - schema.graphql

exec:
  filename: graph/generated.go
  package: graph

model:
  filename: graph/model/models_gen.go
  package: model

resolver:
  layout: follow-schema
  dir: graph
  package: graph
  filename_template: "{name}.resolvers.go"

# Custom scalars
models:
  DateTime:
    model: time.Time
  Date:
    model: time.Time
  Email:
    model: string
```

**Resolver Example:**

```go
// graph/solicitation.resolvers.go
package graph

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    
    "github.com/example/schema_unification/graph/model"
    "github.com/xeipuuv/gojsonschema"
)

func (r *queryResolver) SolicitationByID(ctx context.Context, id string) (*model.Solicitation, error) {
    // Call REST API
    url := fmt.Sprintf("%s/solicitations/%s", r.RestBaseURL, id)
    resp, err := http.Get(url)
    if err != nil {
        return nil, fmt.Errorf("REST API error: %w", err)
    }
    defer resp.Body.Close()
    
    if resp.StatusCode == 404 {
        return nil, nil
    }
    if resp.StatusCode != 200 {
        return nil, fmt.Errorf("REST API returned %d", resp.StatusCode)
    }
    
    // Parse response
    var data map[string]interface{}
    if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
        return nil, fmt.Errorf("JSON decode error: %w", err)
    }
    
    // Validate against JSON Schema
    schemaLoader := gojsonschema.NewReferenceLoader("file:///schemas/solicitation.schema.json")
    dataLoader := gojsonschema.NewGoLoader(data)
    result, err := gojsonschema.Validate(schemaLoader, dataLoader)
    if err != nil {
        return nil, fmt.Errorf("validation error: %w", err)
    }
    if !result.Valid() {
        return nil, fmt.Errorf("response validation failed: %v", result.Errors())
    }
    
    // Transform to GraphQL model
    return &model.Solicitation{
        ID:                 id,
        SolicitationNumber: data["solicitation_number"].(string),
        Title:              data["title"].(string),
        Amount:             int(data["amount"].(float64)),
    }, nil
}
```

---

### C. Apollo Server + DataSources

```typescript
// src/server.ts
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { readFileSync } from 'fs';
import { SolicitationAPI } from './datasources/SolicitationAPI';

const typeDefs = readFileSync('./schema.graphql', 'utf-8');

const resolvers = {
  Query: {
    solicitationById: async (_: any, { id }: { id: string }, { dataSources }: any) => {
      return dataSources.solicitationAPI.getSolicitationById(id);
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

const { url } = await startStandaloneServer(server, {
  context: async () => ({
    dataSources: {
      solicitationAPI: new SolicitationAPI(),
    },
  }),
  listen: { port: 4000 },
});

console.log(`🚀 Server ready at ${url}`);
```

```typescript
// src/datasources/SolicitationAPI.ts
import { RESTDataSource } from '@apollo/datasource-rest';
import Ajv from 'ajv';
import solicitationSchema from '../schemas/solicitation.schema.json';

const ajv = new Ajv();
const validate = ajv.compile(solicitationSchema);

export class SolicitationAPI extends RESTDataSource {
  override baseURL = process.env.DATABRICKS_BASE_URL;
  
  override willSendRequest(_path: string, request: any) {
    request.headers['Authorization'] = `Bearer ${process.env.DATABRICKS_TOKEN}`;
  }
  
  async getSolicitationById(id: string) {
    const data = await this.get(`solicitations/${id}`);
    
    // Validate response
    if (!validate(data)) {
      throw new Error(`Validation failed: ${ajv.errorsText(validate.errors)}`);
    }
    
    // Transform snake_case to camelCase
    return {
      id: data.id,
      solicitationNumber: data.solicitation_number,
      title: data.title,
      amount: data.amount,
    };
  }
}
```

---

## References

- [Apollo Federation Specification](https://www.apollographql.com/docs/federation/federated-types/federated-directives/)
- [GraphQL Mesh Documentation](https://the-guild.dev/graphql/mesh)
- [gqlgen Documentation](https://gqlgen.com/)
- [PostGraphile Documentation](https://www.graphile.org/postgraphile/)
- [Cloud.gov Documentation](https://cloud.gov/docs/)
- [JSON Schema Specification](https://json-schema.org/)

---

**Next Review:** After POC evaluation phase completion  
**Reviewers:** Development Team, DevOps Lead, Product Owner
