# GraphQL Gateway Decision

**Date:** December 1, 2025  
**Status:** ✅ DECISION MADE  
**Decision:** GraphQL Mesh for development phase (6+ months)

---

## Executive Summary

Based on stakeholder requirements analysis, **GraphQL Mesh** is the optimal solution for the development phase (6+ months), with an optional migration to **gqlgen** for production optimization if needed.

---

## Stakeholder Requirements (Confirmed)

### Critical Requirements

| Requirement     | Answer                                     | Impact                                             |
| --------------- | ------------------------------------------ | -------------------------------------------------- |
| **Federation**  | ✅ YES - Full federation required          | Eliminates: Grafserv, PostGraphile                 |
| **Timeline**    | Development first, production eventually   | Favors: Mesh (iteration) over gqlgen (performance) |
| **REST APIs**   | 4 now → 20 eventually                      | Strongly favors: Mesh (declarative)                |
| **Team Skills** | Go/Rust acceptable if performance critical | Opens: gqlgen as option                            |
| **Cloud.gov**   | 4GB memory, 2-3 instances                  | No constraints: Any solution works                 |

### High Priority Requirements

| Requirement        | Answer                        | Impact                             |
| ------------------ | ----------------------------- | ---------------------------------- |
| **Schema Changes** | Very frequent (daily)         | Strongly favors: Mesh (hot reload) |
| **Validation**     | YES - Production requirement  | Favors: Mesh (built-in)            |
| **Authentication** | Native or bolt-on (Keycloak)  | Neutral: All solutions work        |
| **Observability**  | OpenTelemetry ideal           | Favors: Mesh (plugin available)    |
| **Mock Strategy**  | Mock server (mockforge-style) | Favors: Mesh (built-in plugin)     |

---

## Decision Matrix

### Scoring Based on YOUR Requirements

| Criterion                             | Weight | GraphQL Mesh | gqlgen  | Apollo Server |
| ------------------------------------- | ------ | ------------ | ------- | ------------- |
| **Federation (Required)**             | 5      | 5 ✅         | 4 ✅    | 5 ✅          |
| **REST Integration (4-20 APIs)**      | 5      | 5 ✅         | 4       | 4             |
| **Development Speed (Daily changes)** | 5      | 5 ✅         | 3       | 4             |
| **Validation (Production req)**       | 4      | 4 ✅         | 3       | 3             |
| **Mock Data (mockforge-style)**       | 4      | 5 ✅         | 3       | 4             |
| **Cloud.gov Fit (4GB budget)**        | 3      | 5 ✅         | 5 ✅    | 5 ✅          |
| **Performance**                       | 3      | 3            | 5 ✅    | 3             |
| **Operational Simplicity**            | 3      | 2            | 4       | 4             |
| **Community/Support**                 | 2      | 3            | 4       | 5             |
| **Learning Curve**                    | 2      | 3            | 2       | 4             |
| **WEIGHTED TOTAL**                    | **36** | **154**      | **137** | **148**       |

**Winner: GraphQL Mesh (154/180 = 85.6%)**

---

## Why GraphQL Mesh?

### ✅ Perfect Matches

1. **Federation Required**
   - Full Apollo Federation v2.3+ gateway support
   - Entity resolution across 4 subgraphs (Legacy Procurement, Logistics Mgmt, Intake Process, Contract Data)
   - Supports all directives: `@key`, `@shareable`, `@requires`, `@provides`

2. **4-20 REST APIs (Strongest Advantage)**
   - Declarative OpenAPI handler
   - Add new endpoint = edit YAML (no code)
   - Snake_case → camelCase transforms built-in
   - Validation against JSON Schema per endpoint
   - Example: 20 endpoints = 20 YAML blocks, not 20 resolver files

3. **Daily Schema Changes (Critical for Development)**
   - Hot reload on `.meshrc.yaml` changes
   - No code generation step
   - No compilation required
   - Changes visible in <30 seconds

4. **Production Validation Required**
   - Native JSON Schema validation
   - Per-endpoint validation
   - Pre-compiled schemas for performance
   - Clear error messages

5. **Mock Data Strategy**
   - Built-in mock plugin
   - Generate from schema types
   - Can integrate mockforge for realism
   - Toggle via env var (`ENABLE_MOCKS=true`)

### ✅ Acceptable Trade-offs

1. **Memory Usage: 300-400MB**
   - You have 4GB available (10x headroom)
   - Not a concern with current budget
   - Can optimize if needed

2. **Performance: ~500 req/sec**
   - Adequate for development
   - Low production traffic (stated)
   - Can add caching (24h TTL)
   - Migration to gqlgen if needed

3. **Operational Complexity**
   - More config than gqlgen
   - But better than 20 manual resolvers
   - Well-documented patterns
   - Plugin ecosystem mature

---

## Why NOT gqlgen Now?

Despite Go being acceptable and excellent performance:

### ❌ Mismatches with Current Priorities

1. **Development Speed (Your #1 Priority)**
   - gqlgen: Edit schema → `go generate` → implement resolvers → `go build` → restart
   - Mesh: Edit YAML → auto-reload (done)
   - **Time difference: 5-10 minutes vs 30 seconds**

2. **4-20 REST Endpoints (Your #2 Priority)**
   - gqlgen: 20 REST endpoints = 20 Go resolver functions (manual code)
   - Mesh: 20 REST endpoints = 20 YAML blocks (declarative)
   - **Code maintenance: 2000 lines Go vs 500 lines YAML**

3. **Very Frequent Schema Changes**
   - Code generation is friction when iterating daily
   - Manual resolver updates error-prone
   - Type safety is benefit, but slows iteration

### ✅ When to Consider gqlgen

**Triggers for Migration (6+ months out):**

- Schema stabilizes (weekly/monthly changes, not daily)
- Performance becomes bottleneck (>1000 req/sec needed)
- Team acquires Go expertise
- Memory budget tightens (<512MB)

**Migration Effort: 2-3 weeks**

- Schema is shared (no change)
- Reimplement 20 resolvers in Go
- Port validation logic
- Test parity

---

## Implementation Plan

### Phase 1: GraphQL Mesh Setup (Week 1-2)

**Week 1:**

- ✅ POC already created in `/dev/pocs/graphql-mesh`
- [ ] Install dependencies: `cd dev/pocs/graphql-mesh && pnpm install`
- [ ] Configure 4 Databricks endpoints in `.meshrc.yaml`
- [ ] Test locally: `pnpm dev` (GraphiQL at http://localhost:4000)
- [ ] Verify hot reload: Change schema, see immediate update

**Week 2:**

- [ ] Deploy to cloud.gov: `cf push -f manifest.yml`
- [ ] Configure environment variables (DATABRICKS_TOKEN, etc.)
- [ ] Test health checks and logging
- [ ] Document developer workflow

**Deliverables:**

- ✅ GraphQL API serving federation schema
- ✅ 4 REST endpoints mapped and validated
- ✅ Mock data for development
- ✅ Cloud.gov deployment successful

---

### Phase 2: Development Iteration (Months 1-3)

**Goals:**

- Add 4 → 10 REST endpoints as available
- Iterate on schema daily/weekly
- Support frontend development with mocks
- Monitor performance/memory

**Activities:**

- Add new REST endpoints: Edit `.meshrc.yaml` (5 minutes per endpoint)
- Schema changes: Edit supergraph, see in <30 seconds
- Mock data: Toggle `ENABLE_MOCKS` env var
- Monitor: Check `cf logs` for memory usage

**Success Metrics:**

- ✅ Schema change → visible in <2 minutes
- ✅ New REST endpoint added in <1 hour
- ✅ <512MB memory usage (well under 4GB limit)
- ✅ Zero downtime for schema updates

---

### Phase 3: Scale REST APIs (Months 3-6)

**Goals:**

- Add remaining endpoints (10 → 20)
- Implement caching (24h TTL)
- Add authentication (Keycloak proxy)
- Production readiness validation

**Activities:**

- Add 10 more REST endpoints: Update `.meshrc.yaml`
- Configure response caching: Per-field TTL settings
- Test with API Umbrella / Keycloak in front
- Run load tests: Validate >500 req/sec

**Success Metrics:**

- ✅ 20 REST endpoints integrated
- ✅ 24-hour cache working
- ✅ Authentication/authorization via proxy
- ✅ Production-ready performance

---

### Phase 4: Production Optimization (Months 6+, Optional)

**Decision Point:** Evaluate if gqlgen migration needed

**Evaluate:**

- Is performance adequate? (If YES, stay on Mesh)
- Is memory usage acceptable? (If YES, stay on Mesh)
- Has schema stabilized? (If NO, stay on Mesh)
- Is team comfortable with Go? (If NO, stay on Mesh)

**If Migration Needed:**

1. Set up gqlgen in parallel
2. Implement 20 resolvers in Go
3. Run both in production (canary deployment)
4. Switch traffic gradually
5. Keep Mesh for development

**If Staying on Mesh:**

1. Optimize configuration
2. Add caching layers (Redis if needed)
3. Tune memory settings
4. Continue with current setup

---

## Configuration Examples

### 1. Adding a REST Endpoint (GraphQL Mesh)

```yaml
# .meshrc.yaml - Add new Databricks table
sources:
  - name: Solicitations
    handler:
      openapi:
        source: ./schemas/solicitations-openapi.json
        baseUrl: "{env.DATABRICKS_BASE_URL}/api/v1"
        operationHeaders:
          Authorization: "Bearer {env.DATABRICKS_TOKEN}"
    transforms:
      - rename:
          mode: wrap
          renames:
            - from:
                type: Solicitation
                field: solicitation_number
              to:
                type: Solicitation
                field: solicitationNumber
```

**Time to add:** 5-10 minutes  
**Code changes:** 15 lines of YAML  
**Restart required:** No (hot reload)

---

### 2. Schema Change Workflow (GraphQL Mesh)

```bash
# 1. Edit schema
vim ../../generated-schemas/schema_unification.supergraph.graphql

# 2. Mesh auto-detects change and reloads
# (no action needed)

# 3. Test in GraphiQL
# http://localhost:4000
```

**Time from edit to visible:** <30 seconds

---

### 3. Mock Data Configuration

```yaml
# .meshrc.yaml
plugins:
  - mock:
      if: "{env.ENABLE_MOCKS}"
      mocks:
        Solicitation:
          id: "{random.uuid}"
          solicitationNumber: "{random.alphanumeric 10}"
          title: "{lorem.sentence}"
          amount: "{random.number 1000000}"
          awardDate: "{date.recent}"
```

Toggle mocks:

```bash
# Development with mocks
export ENABLE_MOCKS=true
pnpm dev

# Development with real APIs
export ENABLE_MOCKS=false
pnpm dev
```

---

### 4. Validation Configuration

```yaml
# .meshrc.yaml
sources:
  - name: Solicitations
    handler:
      openapi:
        source: ./schemas/solicitations-openapi.json
        validateRequest: true
        validateResponse: true
```

Validation errors automatically returned to client with schema details.

---

## Quick Start Commands

### Local Development

```bash
# Navigate to POC
cd dev/pocs/graphql-mesh

# Install dependencies
pnpm install

# Start with mocks (for pure development)
ENABLE_MOCKS=true pnpm dev

# Start with real APIs (when available)
DATABRICKS_BASE_URL=https://api.example.gov \
DATABRICKS_TOKEN=your-token \
ENABLE_MOCKS=false \
pnpm dev

# GraphiQL available at:
# http://localhost:4000/graphql
```

### Docker Compose (with mock REST API)

```bash
cd dev/pocs/graphql-mesh
docker-compose up

# GraphQL: http://localhost:4000
# Mock REST API: http://localhost:3000
```

### Cloud.gov Deployment

```bash
cd dev/pocs/graphql-mesh

# Set environment variables
cf set-env schema_unification-mesh DATABRICKS_BASE_URL https://api.example.gov
cf set-env schema_unification-mesh DATABRICKS_TOKEN your-token
cf set-env schema_unification-mesh ENABLE_MOCKS false

# Push
cf push -f manifest.yml

# Check status
cf app schema_unification-mesh

# View logs
cf logs schema_unification-mesh --recent
```

---

## Risk Mitigation

### Risk 1: Memory Usage on Cloud.gov

**Likelihood:** Low (you have 4GB, Mesh uses ~300-400MB)  
**Impact:** Medium  
**Mitigation:**

- Monitor with `cf app schema_unification-mesh`
- Optimize bundle size if needed
- Use production builds (smaller)
- Cache compiled schemas

---

### Risk 2: Complex Configuration

**Likelihood:** Medium (Mesh has many options)  
**Impact:** Medium  
**Mitigation:**

- Start with simple config (4 endpoints)
- Document patterns in `/dev/pocs/graphql-mesh/README.md`
- Use templates for new endpoints
- Regular config reviews

---

### Risk 3: Future Migration to gqlgen

**Likelihood:** Low (may not be needed)  
**Impact:** High (2-3 weeks effort)  
**Mitigation:**

- Keep schema source canonical (shared)
- Document resolver patterns
- Plan migration early if needed
- Run both in parallel (canary)

---

## Success Criteria

### Week 1-2 (Setup)

- ✅ GraphQL API deployed to cloud.gov
- ✅ 4 Databricks endpoints integrated
- ✅ Mock data working for development
- ✅ Schema changes visible in <2 minutes

### Month 1-3 (Development)

- ✅ 10 REST endpoints integrated
- ✅ Daily schema iteration working
- ✅ Frontend development unblocked
- ✅ Memory usage <512MB

### Month 3-6 (Scale)

- ✅ 20 REST endpoints integrated
- ✅ 24-hour caching operational
- ✅ Authentication via Keycloak working
- ✅ Production-ready performance

### Month 6+ (Production)

- ✅ Handling production traffic
- ✅ 99.9% uptime
- ✅ <100ms p95 latency
- ✅ Monitoring and alerting in place

---

## Decision Approval

**Decision:** Proceed with GraphQL Mesh for development phase

**Approved By:** **\*\*\*\***\_\_\_**\*\*\*\***  
**Date:** **\*\*\*\***\_\_\_**\*\*\*\***

**Next Review:** After 3 months of usage (March 2025)

---

## References

- **POC Location:** `/dev/pocs/graphql-mesh/`
- **Configuration:** `.meshrc.yaml`
- **Documentation:** `dev/pocs/graphql-mesh/README.md`
- **Requirements:** `docs/graphql-gateway-requirements.md`
- **Critical Questions:** `docs/CRITICAL-QUESTIONS.md`
- **Scoring Matrix:** `docs/GATEWAY-RECOMMENDATION.md`

---

**Status:** ✅ READY TO PROCEED  
**Next Action:** Set up GraphQL Mesh POC (Week 1 tasks)  
**Owner:** Development Team  
**Timeline:** Start Week of December 2, 2025
