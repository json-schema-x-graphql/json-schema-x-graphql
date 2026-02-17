# Critical Questions for GraphQL Gateway Selection

**Date:** December 1, 2025  
**Status:** AWAITING STAKEHOLDER FEEDBACK  
**Impact:** These decisions directly affect POC evaluation and architecture choices

---

## 🚨 IMPERATIVE: Answer These First

These 5 questions will drive our entire approach and must be answered before POC evaluation:

### 1. Federation: Required or Optional?

**Question:** Do we actually need Apollo Federation gateway capabilities in v1?

Yes, we need full federation support across multiple subgraphs to enforce ID referencing and authorization/authentication.

**Why This Matters:**

- **If YES (Full Federation):** Must support `@key`, `@shareable`, entity resolution across 4 subgraphs (Legacy Procurement, Logistics Mgmt, Intake Process, Contract Data). Limits us to Apollo, Mercurius, or custom federation gateway.
- **If NO (Monolithic Schema OK):** Can use simpler solutions like gqlgen, GraphQL Mesh in standalone mode, or lightweight Express server. Significantly reduces complexity.

**Current State:**

- Supergraph SDL exists with 4 subgraphs
- Federation v2.3+ directives in place
- BUT: Are subgraphs owned by different teams/services? Or is this just schema organization?

**Recommendation Needed:**

- [ ] YES - Full federation required (multiple teams/services)
- [ ] NO - Monolithic schema acceptable for v1 (single team/service)
- [ ] MAYBE - Can start monolithic, migrate to federation later

**Impact on Candidates:**

- Federation YES: Apollo Server, Mercurius, GraphQL Mesh (federation mode)
- Federation NO: gqlgen, GraphQL Mesh (standalone), lightweight custom

---

### 2. Timeline: Development Tool or Production Gateway?

**Question:** When do we need this running in production with real traffic?

A thread/type safe lanugage is important to build a foundations from (golang/rust) but iteration speed is more important for now.

**Why This Matters:**

- **Development Tool (3-6 months):** Prioritize fast iteration, mocking, schema flexibility. Can tolerate rough edges. Focus: GraphQL Mesh, Mockforge, lightweight solutions.
- **Production Soon (1-2 months):** Need mature, battle-tested, well-documented solution. Focus: Apollo Server, gqlgen, PostGraphile.
- **Production Now (weeks):** Must use proven, stable, enterprise-ready. Focus: Apollo Server with commercial support.

**Recommendation Needed:**

- [ ] Development phase only (6+ months before production)
- [ ] Prototype → Production (2-3 months)
- [ ] Production immediate (<1 month)

**Impact on Candidates:**

- Dev tool: Mesh (best REST), Mockforge (simplest)
- Prototype: gqlgen (flexible), Mercurius (fast iteration)
- Production: Apollo (mature), gqlgen (stable)

---

### 3. REST APIs: How Many and When Available?

**Question:** How many REST APIs will we proxy to, and are they available now?

4 APIs endpoints to Databricks Delta tables are available now, with up to 20 expected eventually from various REST implementations.

**Why This Matters:**

- **1-3 APIs, Available Now:** Simple DataSource pattern works. Any solution OK.
- **5-10 APIs, Available Now:** Need good composition tools (GraphQL Mesh shines here).
- **10+ APIs, Available Now:** Need enterprise composition (Apollo or Mesh).
- **APIs Not Available Yet:** Need excellent mock support (affects tooling choice).

**Current Understanding:**

- Databricks Delta tables as REST endpoints
- Each table has JSON Schema
- Snake_case → camelCase transformation needed

**Recommendation Needed:**

- [ ] Number of REST APIs: \_\_\_ (1-3, 5-10, 10+, unknown)
- [ ] All APIs available now: YES / NO / PARTIAL
- [ ] All APIs have JSON Schema: YES / NO / PARTIAL
- [ ] All APIs return snake_case: YES / NO / MIXED

**Impact on Candidates:**

- Few APIs: Any solution works
- Many APIs: GraphQL Mesh (OpenAPI transforms), Apollo (mature DataSources)
- Not available: Need good mocking (Mockforge, Mesh mock mode)

---

### 4. Team Expertise: Node.js or Open to Go?

**Question:** Is the team comfortable maintaining Go code, or should we stick to Node.js/TypeScript?

Golang, rust are acceptable if the performance and memory benefits are significant, no preference otherwise.

**Why This Matters:**

- **Go Acceptable:** gqlgen becomes top choice (best performance, smallest memory, simple deployment)
- **Node.js Only:** Apollo Server, Mercurius, or GraphQL Mesh (rich ecosystem, familiar)

**Current Team Skills (from requirements doc):**

- ✅ Node.js/TypeScript (strong)
- ✅ GraphQL (moderate)
- ⚠️ Go (limited)
- ✅ REST APIs (strong)
- ✅ JSON Schema (strong)

**Recommendation Needed:**

- [ ] Go is acceptable (team will learn)
- [ ] Node.js/TypeScript only (no Go)
- [ ] Depends on performance requirements

**Impact on Candidates:**

- Go OK: gqlgen (best choice for simplicity + performance)
- Node.js only: Apollo (mature), Mesh (REST focus), Mercurius (fast)

---

### 5. Cloud.gov: Memory and Budget Constraints?

**Question:** What are the actual memory limits and instance budget on cloud.gov?

4GB memory limit per instance is expected, with budget for 2-3 instances initially. Horizontal/Veritcal scaling possible.

**Why This Matters:**

- **<256MB:** Must use gqlgen or highly optimized Node.js
- **256-512MB:** Most Node.js solutions work
- **>512MB:** Any solution works
- **Budget:** How many instances can we run? (Affects caching, scaling strategy)

**Recommendation Needed:**

- [ ] Memory limit per instance: \_\_\_ MB
- [ ] Instance budget: \_\_\_ instances
- [ ] Existing cloud.gov services available: Redis? S3? Database?

**Impact on Candidates:**

- <256MB: gqlgen only
- 256-512MB: Mercurius, gqlgen, lightweight Apollo
- > 512MB: Any solution

---

## 🔶 HIGH Priority: Answer These Next

These affect architecture and complexity but aren't immediate blockers:

### 6. Schema Changes: How Often?

**Question:** How frequently do we expect schema changes during development?

Very frequent, especially in the initial phases.

**Options:**

- [ ] Daily (fast iteration critical)
- [ ] Weekly (moderate iteration)
- [ ] Monthly (stable, production-focused)

**Impact:**

- Daily: Need hot-reload, minimal build steps (GraphQL Mesh, Mercurius)
- Weekly: Code generation OK (gqlgen, Apollo)
- Monthly: Any solution works

---

### 7. Validation: Required Performance?

**Question:** Must we validate ALL REST responses against JSON Schema in production?

Yes, this will be a hard requirement for production to ensure data integrity.

**Options:**

- [ ] YES - Production validation required (adds 5-20ms latency)
- [ ] NO - Validation in dev/test only
- [ ] Entity ManagementPLING - Validate % of responses for monitoring

**Impact:**

- YES: Need efficient validation (pre-compiled schemas, ajv)
- NO: Simpler implementation
- Entity ManagementPLING: Need metrics infrastructure

---

### 8. Authentication: What Model?

**Question:** What authentication/authorization is required?

Can be native or bolt-on compatible, may use API umbrella or Keycloak in front and proxy to.

**Options:**

- [ ] None (internal tool)
- [ ] API Key (simple)
- [ ] OAuth/JWT (standard)
- [ ] FedRAMP compliance required

**Impact:**

- None: Any solution
- API Key: Simple middleware
- OAuth/JWT: Need auth libraries
- FedRAMP: Limits deployment options

---

### 9. Observability: What's Required?

**Question:** What monitoring/logging/tracing is required?

OpenTelemetry support would be ideal, but not mandatory.

**Options:**

- [ ] Basic logs (stdout/stderr)
- [ ] Metrics (Prometheus/Grafana)
- [ ] Distributed tracing (OpenTelemetry)
- [ ] Full observability suite

**Impact:**

- Basic: Any solution
- Metrics: Need Prometheus integration
- Tracing: OpenTelemetry support required
- Full: Apollo Studio or custom instrumentation

---

### 10. Mock Data: Strategy?

**Question:** How should we handle mock data during development?

I like the idea of a mock server that can simulate the REST APIs with realistic data. https://github.com/SaaSy-Solutions/mockforge or alike could be used to implement a reference API mock server from the JSON Schemas/Generated GraphQL Subgraph.

**Options:**

- [ ] GraphQL Mesh mock mode (generated from schemas)
- [ ] Static JSON fixtures
- [ ] Mock REST API server (json-server, MSW)
- [ ] Real Databricks with test data

**Impact:**

- Mesh mock: Best for pure development
- Fixtures: Simple, manual maintenance
- Mock server: Most realistic
- Real data: Need staging environment

---

## 🟢 MEDIUM Priority: Nice to Know

These help optimize but aren't decision-blockers:

### 11. CI/CD Pipeline

**Question:** What's the deployment pipeline?

- [ ] GitHub Actions exists? YES / NO
- [ ] Cloud Foundry or Docker deployment?
- [ ] Automated testing in place?

Local docker compose, ideally application would run, bundled, deployed via Cloud Foundry via Cloud Native Buildpacks.

---

### 12. Traffic Expectations

**Question:** Expected production load?

- [ ] Requests/day: \_\_\_
- [ ] Concurrent users: \_\_\_
- [ ] Cache TTL acceptable: 900 seconds

## Unknown other production usage is sufficiently low to not be a concern at this time.

## Decision Matrix Based on Answers

### Scenario A: Development Tool, Node.js, Simple REST

**If:**

- Timeline: Development phase (6+ months)
- Team: Node.js only
- REST APIs: 1-5 endpoints
- Federation: Not required

**Recommendation:** GraphQL Mesh (standalone mode)

- Best REST integration
- Great mocking
- Fast iteration
- Node.js ecosystem

---

### Scenario B: Production Gateway, Go Acceptable, Performance Critical

**If:**

- Timeline: Production soon (1-3 months)
- Team: Open to Go
- Cloud.gov: <512MB memory
- Federation: Optional or can defer

**Recommendation:** gqlgen

- Best performance (Go compiled)
- Smallest memory footprint
- Simple deployment (single binary)
- Code generation = type safety

---

### Scenario C: Production Gateway, Node.js Only, Many REST APIs

**If:**

- Timeline: Production soon (1-3 months)
- Team: Node.js only
- REST APIs: 5-10+ endpoints
- Federation: Required

**Recommendation:** GraphQL Mesh (federation mode) or Apollo Server

- Mesh: Best REST composition
- Apollo: Most mature, commercial support
- Both: Federation support
- Node.js ecosystem

---

### Scenario D: Full Federation, Enterprise Scale

**If:**

- Federation: Required (multiple teams)
- Traffic: High volume
- Support: Need commercial backing
- Budget: Available for tooling

**Recommendation:** Apollo Server + Apollo Studio

- Battle-tested federation
- Commercial support
- Rich tooling ecosystem
- Monitoring built-in

---

## Next Steps After Answers

1. **Eliminate Non-Viable Candidates** (based on hard constraints)
2. **Set Up Remaining POCs** (2-3 top candidates)
3. **Run Benchmark Tests** (performance, memory, iteration speed)
4. **Complete Scoring Matrix** (quantitative evaluation)
5. **Create Recommendation** (with confidence level)

**Timeline:**

- Stakeholder feedback: **This week** (December 1-5, 2025)
- POC setup: 2-3 days after feedback
- Evaluation: 1 week
- Recommendation: December 13, 2025

---

## How to Provide Feedback

**Option 1: Quick Decision (recommended)**

```markdown
1. Federation: NO (monolithic OK for v1)
2. Timeline: Prototype → Production (2-3 months)
3. REST APIs: 5-10 endpoints, mostly available, all have JSON Schema
4. Team: Node.js only (no Go)
5. Cloud.gov: 512MB limit, 2-3 instances available

→ This points to: GraphQL Mesh or Apollo Server
```

**Option 2: Detailed Response**
Copy this document, fill in checkboxes and blanks, return via:

- GitHub issue
- Email
- Slack discussion
- Team meeting notes

**Option 3: Discussion**
Schedule 30-minute session to walk through questions together.

---

## Contact

**Document Owner:** Development Team  
**Status:** BLOCKING - POC evaluation cannot proceed without feedback  
**Urgency:** HIGH - Needed by December 5, 2025  
**Related:** `docs/graphql-gateway-requirements.md`
