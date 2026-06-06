# 0012: Dynamic Caching, Schema Drift Detection, and Independent Subgraph Evolution

Date: 2026-06-05

## Status

Accepted

## Context

Enterprise federated architectures face three interrelated challenges:
1. **Legacy API resilience**: Heavy queries must not overload upstream systems or cause outages
2. **Schema drift**: Independent subgraph teams can introduce breaking changes that break the supergraph composition
3. **Independent evolution**: Teams must be able to evolve their schemas without cross-team coordination

These problems must be solved together — caching without schema governance leads to stale data; schema governance without caching leads to brittle performance requirements.

## Decision

Adopt a **three-pillar architecture**: Cache Layer + Schema Management System + Versioned Storage.

### Pillar 1: Dynamic Caching & Cache Reindexing

**Goal:** Prevent legacy API outages and ensure low-latency responses.

| Pattern | Implementation | Rationale |
|---------|----------------|-----------|
| **Dedicated Cache Layer** | Redis as the distributed gateway cache | GraphQL Portal and other gateways natively rely on Redis for distributed node management |
| **Materialized Views** | Scheduled refreshes to Apache Iceberg | Acts as a background worker/queue; reindexes cache incrementally without overloading upstream |
| **Cache Service Redirection** | Automatic table scan redirection to materialized copies | Gives federation the flexibility of distributed data with warehouse-like performance for hot data |
| **Webhook Invalidation** | Event-driven cache invalidation instead of polling | Legacy systems push update events to invalidate specific entity caches |

**Principle:** Decouple heavy queries from live operational databases. The cache is a first-class layer, not an afterthought.

### Pillar 2: Schema Drift Detection & Version Control

**Goal:** Detect breaking changes before they reach runtime.

| Layer | Mechanism |
|-------|-----------|
| **CI/CD Composition Checks** | Automated validation of schema compatibility, ownership boundaries, and type extensions |
| **Multi-Stage Schema Management** | Unit schemas → staging validation → production approval |
| **Storage-Level Schema Evolution** | Apache Iceberg native schema evolution and time travel for materialized caches |

**Principle:** The supergraph is not manually written — it is generated through a composition pipeline that validates governance rules before publication.

### Pillar 3: Independent Subgraph Evolution

**Goal:** Enable teams to evolve their APIs without breaking the supergraph.

**Three-Layer Schema Architecture:**

```
Unit Schema (team-owned)
    |
    v
Subgraph Schema (composition unit)
    |
    v
Supergraph Schema (consumer contract)
```

- **Unit Schemas**: Individual teams develop their APIs independently
- **Subgraph Schemas**: The schema management system automatically merges unit schemas into subgraph schemas
- **Supergraph Schema**: Composed from validated subgraphs; the only contract consumers see

**Declarative Extensions:**
- `x-graphql-external`: Declare fields originating elsewhere
- `x-graphql-provides`: Dictate survivorship and resolution rules
- `x-graphql-key`: Establish entity identity for cross-subgraph references

**Principle:** Domains explicitly declare their entity representations. The federated router dynamically handles join logic at runtime. Teams add new types to their unit schemas; as long as they pass composition checks, the router automatically exposes them.

## Consequences

### Positive
- **Resilience**: Materialized views + webhooks prevent legacy API overload
- **Governance**: Automated composition rejects breaking changes before production
- **Autonomy**: Teams evolve independently within validated boundaries
- **Observability**: Iceberg time travel provides reproducible schema snapshots

### Negative
- **Operational complexity**: Three new systems (Redis, Iceberg, schema management) to operate
- **Eventual consistency**: Materialized views introduce lag between upstream change and cache refresh
- **Migration effort**: Existing schemas must be restructured into the three-layer hierarchy

### Mitigation
- Start with Redis caching only (no Iceberg) for the first phase
- Implement the schema management system as a GitHub Action before building a full UI
- Use Iceberg's time travel only for audit/debugging, not for normal query serving

## Implementation Strategy

### Phase 1: Cache Layer (Short-term)
- Redis integration in the gateway/router
- Webhook endpoint for cache invalidation
- TTL-based materialization for frequently accessed queries

### Phase 2: Schema Management System (Medium-term)
- GitHub Action for supergraph composition validation
- Staging environment for subgraph schema previews
- Breaking change detection with `@theguild/federation-composition`

### Phase 3: Full Data Federation (Long-term)
- Apache Iceberg materialized views
- Time-travel debugging for schema drift
- Cross-domain analytics via the federated cache layer

## References

- Issue #84: `Support for Subgraph independence, with organic federated schema evolution and dynamic caching strategies`
- Issue #10: `@theguild/federation-composition` (composition validation)
- Apache Iceberg: https://iceberg.apache.org/
- OpenFGA (for authorization layer): ADR 0011
- `website/pages/docs/adr/0008-subgraph-supergraph-metadata-naming.mdx`
- `website/pages/docs/recipes/federation.mdx`
