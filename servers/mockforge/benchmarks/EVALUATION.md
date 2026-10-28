# ADR-0015: MockForge (SaaSy-Solutions) Adoption Evaluation

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-10-11 |
| **Authors** | @JJediny |
| **Reviewers** | TBD |
| **Supersedes** | — |
| **Related** | `servers/mockforge/` (custom GraphQL POC), `benchmarks/` (gauntlet) |

---

## 1. Context

We maintain a custom GraphQL mock federation at [`servers/mockforge/`](../README.md). It serves five Apollo Federation v2 subgraphs (`fpds`, `usaspending`, `assist`, `easi`, `calm`) through a `graphql-yoga` + `@graphql-tools/mock` + `faker.js` stack, fronted by an Apollo Router. The full data path is `JSON Schema → SDL → subgraph mocks → Apollo Router → gateway`.

[`MockForge`](https://github.com/SaaSy-Solutions/mockforge) (SaaSy-Solutions, MIT/Apache-2.0, ~11 stars, 2,048 commits) is a Rust-native multi-protocol mocking framework that supports REST, gRPC, GraphQL, WebSocket, Kafka, MQTT, AMQP, SMTP, FTP, TCP, plus admin UI, RAG-driven data synthesis, and SDKs in five languages. It is the most credible open-source competitor to a hand-rolled GraphQL mock server.

This ADR evaluates whether we should **replace** our custom server, **adopt incrementally**, or **stay the course**.

The accompanying [`benchmarks/`](./README.md) gauntlet is a reproducible harness that runs identical workloads against both implementations so this decision (and any future re-evaluation) is data-driven, not vibes-driven.

---

## 2. Decision

**Recommendation: Do NOT replace. Stay with the custom server, with a planned set of upgrades.**

Specifically:

1. **Keep** the `servers/mockforge/` Node.js implementation. It satisfies every Apollo Federation v2 requirement we have today and ships domain-aware mock data that MockForge cannot reproduce without equivalent (and likely larger) configuration overhead.

2. **Pilot** MockForge *upstream* for one narrow workload — REST mocking with OpenAPI spec — on a non-critical path, because we may still benefit from its admin UI and SDKs for HTTP.

3. **Re-evaluate** after (a) MockForge upstream ships first-class Apollo Federation v2 support (the `mockforge-federation` crate today is *workspace composition*, not Apollo directives), and (b) we have profiled the custom server under the [benchmarks/](./README.md) gauntlet for at least one quarter to know what our actual production needs are.

4. **Adopt upstream patterns, not the upstream binary.** Several MockForge ideas are worth backporting to our custom server (see §6).

---

## 3. MockForge upstream — what it actually is

`SaaSy-Solutions/mockforge` is a sprawling Rust workspace. The relevant crates for our use case are:

| Crate | Purpose | Status |
|---|---|---|
| `mockforge-cli` | Single binary entry point (`mockforge serve`) | Mature |
| `mockforge-core` | Routing, validation, latency, proxy | Mature |
| `mockforge-http` | HTTP/REST mocking with OpenAPI | Mature |
| `mockforge-graphql` | GraphQL mocking from SDL | Basic |
| `mockforge-federation` | "Multi-workspace federation" | Very early |
| `mockforge-data` | faker + RAG-driven synthesis | Mature |
| `mockforge-ui` | Admin UI (React) | Mature |
| `mockforge-grpc`, `mockforge-ws`, `mockforge-kafka`, `mockforge-mqtt`, `mockforge-amqp`, `mockforge-smtp`, `mockforge-ftp`, `mockforge-tcp` | Other protocols | Varies |

**Total LoC:** ~2,048 commits spanning dozens of crates. A full upstream build is a 10+ minute cold compile.

---

## 4. Technical comparison

### 4.1 Capabilities matrix

| Capability | Custom (`servers/mockforge/`) | MockForge upstream |
|---|---|---|
| **Apollo Federation v2 directives** (`@key`, `@requires`, `@provides`, `@external`, `@shareable`, `@override`, `@link`) | ✅ First-class — entire pipeline understands Apollo directives | ❌ Not recognized — schema is loaded as SDL, directives are passed through but not honored at execution |
| **`_entities` entity resolution** | ✅ Resolver chains resolve cross-subgraph entities (see `gateway-server.js`) | ❌ MockForge executes single-schema queries only; there is no `_entities` resolver |
| **`_Service { sdl }` introspection for gateway composition** | ✅ Each subgraph exposes the canonical SDL via `_Service` | ❌ No equivalent |
| **Multiple simultaneous subgraphs on different ports** | ✅ Five (4001-4006) with `services:start` and per-system seeds | ⚠️ Each MockForge instance mocks one schema; running five means five processes + five ports |
| **Federated gateway (`@graphql-hive/gateway`)** | ✅ Already configured at port 4000 with `extensionResolvers` for cross-subgraph `Contract` type | ❌ MockForge has no gateway concept |
| **Domain-specific scalar mocks** (`PIID`, `UEI`, `NAICSCode`, `PSCCode`, `AgencyCode`, `FiscalYear`, `Decimal`, `PositiveDecimal`, `Percentage`, `Email`, `PhoneNumber`, `URI`, `DateTime`, `Date`, `Time`, etc.) | ✅ Hard-coded generators in `mockforge.config.js` and `mock-server.js` (`SCALAR_MOCKS` map) | ⚠️ Only generic generators (`String`, `Int`, `Float`, `Uuid`, `Email`, `Name`, `Timestamp`, `FromList`, `Object`, `Array`). Domain scalars fall back to plain `String` or `Number` |
| **CSV seed data ingestion** | ✅ `seed-data/*.csv` loaded by `mockforge.config.js` | ❌ No equivalent; would require writing custom plugins |
| **Deterministic per-subgraph faker seeds** | ✅ `{ fpds: 12345, usaspending: 23456, … }` per `SYSTEM` env var | ⚠️ Determinism available via `MOCKFORGE_FAKE_TOKENS` toggle but not per-process |
| **Field-name-pattern auto-mocking** | ✅ 25+ patterns in `mockforge.config.js` (`piid`, `uei`, `naics`, `psc`, `email`, `phone`, `street`, `duns`, `amount`, etc.) | ⚠️ ~10 patterns in `mockforge-graphql/resolvers.rs` (`id`, `name/title`, `email`, `description/content`, `age/count/quantity`, `price/amount`, `active/enabled`, `created_at/updated_at`) |
| **Nested object/array generation** | ✅ Realistic recursive generation via `addMocksToSchema` | ⚠️ Intentionally simplified — `Object` returns empty `{}`, `Array` returns `[null, null, …]` (see `mockforge-graphql/src/resolvers.rs:213-237`) |
| **Cross-subgraph entity consistency** (same PIID yields same record across `fpds` and `usaspending`) | ⚠️ Per-system seeds mean correlated *distributions* but not identical identifiers | ❌ No entity identity layer |
| **Health polling plugin** (`systemHealth` extension with per-subgraph latency/error) | ✅ `systemHealthPlugin` in `gateway-server.js` | ❌ No equivalent in MockForge |
| **Latency injection** | ⚠️ Not built-in; relies on Apollo Router settings | ✅ `LatencyProfile` with fixed/normal/exponential/pareto distributions |
| **Error injection** | ❌ Not built-in | ✅ Per-route `error_rate` and `error_types` |
| **Schema hot-reload** | ⚠️ Requires manual restart via `services:watch` | ✅ `schema_watcher.rs` |
| **Admin UI** | ❌ None | ✅ Modern React UI at `localhost:9080` |
| **Multi-language SDKs** | ❌ None | ✅ Rust, Node.js, Python, Go, Java, .NET |
| **OpenAPI ingestion** | ❌ N/A | ✅ First-class |
| **Build time / cold start** | ⚠️ ~3s (`node mock-server.js`) | ✅ ~1s for HTTP; ~3s for GraphQL via `async-graphql` |
| **Dependency surface** | ⚠️ ~15 npm deps, plus GraphQL Mesh + Apollo Router | ❌ ~60+ Rust crates; 10+ min cold compile |
| **Production deployment** | ✅ Docker Compose (`docker-compose.yml`) | ✅ Docker, Helm, K8s operator |
| **Federation supergraph validation in CI** | ✅ `Supergraph Generation Integrity` GitHub Action | ❌ Not applicable |

### 4.2 Federation: the decisive dimension

Our federation story is what makes or breaks this comparison. A side-by-side read of the source:

**Custom server, `gateway-server.js`:**
- 800+ lines stitching together `@graphql-tools/stitch`, `@graphql-tools/delegate`, and `@graphql-tools/wrap`
- Manually maps `_entities` resolutions with `extensionResolvers` for the `Contract` extension type
- Subgraph URL rewriting via Apollo Router config (`router.yaml`)
- Per-subgraph health snapshots exposed via `systemHealthPlugin` to clients

**MockForge upstream, `crates/mockforge-federation/`:**
- README: "Multi-workspace federation for MockForge — compose multiple mock workspaces into federated virtual systems"
- No awareness of `@key`, `@requires`, `@provides`, `@external`, `@shareable`, `@override`
- No `_entities` resolver
- No `_Service { sdl }` resolver
- No gateway/router/supergraph composition

The upstream crate is solving a **different problem** (SaaS multi-tenant workspace composition with `reality_level` per service: `real`, `mock_v3`, `blended`, `chaos_driven`). It is **not** Apollo Federation. Adopting it would mean giving up the entire federation story and rebuilding it ourselves.

### 4.3 Domain data realism

Our mockforge.config.js has hand-tuned generators for federal contracting domain:

```js
// mockforge.config.js — excerpted
generatePIID()       // GS-XXXX-XXXXXXXX
generateDUNS()       // 9-digit numeric
generateUEI()        // 12-char alphanumeric uppercase
generateVendorName() // weighted distribution of known federal vendors
generateNAICS()      // weighted distribution of NAICS codes
generatePSC()        // weighted distribution of PSC codes
generateAgencyCode() // weighted distribution of agency codes (DOD, GSA, etc.)
generateDateBundle() // coherent date chain (actionDate → solicitationDate → signed → effective → completion)
generateContractAmount() // log-normal distribution of $ amounts
```

Reproducing this in MockForge upstream requires writing a plugin crate, registering it with the binary, and re-distributing the binary. The configuration burden is **larger** than our existing `mockforge.config.js`, not smaller.

### 4.4 Performance

MockForge upstream advertises high throughput ("10K+ req/sec", native Rust). Our custom server is Yoga + `@graphql-tools/mock`, which is single-threaded JS. We have **not** profiled production workloads yet — the [benchmarks/](./README.md) gauntlet is the first step.

---

## 5. Why not adopt upstream today

1. **No Apollo Federation v2.** The single largest gap. Adopting MockForge means losing our federation story entirely.

2. **No domain awareness.** Every domain-specific scalar we currently mock realistically would fall back to a generic `String` or `Number`.

3. **No CSV seed ingestion.** We have real per-system CSV seed data; MockForge would need a plugin to honor it.

4. **Build cost.** ~60+ Rust crates, 10+ min cold compile, requires Rust 1.96.0+ on every contributor machine. Our team is Node.js-centric.

5. **Operational complexity.** A 2,048-commit Rust workspace with 5+ language SDKs is a much larger security and maintenance surface than 800 lines of Node.js.

6. **No clear migration gain.** Even if we replaced the mock servers, we'd still need:
   - The Apollo Router (or equivalent) for federation
   - Custom plugin code for our domain scalars
   - Custom seed data ingestion
   - Custom `Contract` extension type
   - Custom system health plugin

   The "replace" is really "delete what we have, write what we have again, plus translate the federation story to MockForge's vocabulary." Net negative.

---

## 6. What we should adopt *from* MockForge

Even though we won't adopt the binary, several upstream patterns are worth backporting:

| Pattern | Source | Effort | Impact |
|---|---|---|---|
| **Latency profiles** with normal/exp/pareto + per-route overrides | `mockforge-core/src/latency` | Small | Adds realistic latency injection for `schemathesis` testing |
| **Error injection** with per-route `error_rate` and `error_types` | `mockforge-core/src/chaos` | Small | Allows negative-path testing today |
| **Schema watcher** for hot-reload on SDL change | `mockforge-graphql/src/schema_watcher.rs` | Medium | Removes manual `services:watch` workflow |
| **Template tokens** (`{{uuid}}`, `{{now}}`, `{{faker.X}}`) | `mockforge-core/src/templating` | Small | Standardizes mock generation across services |
| **Admin UI** for fixture inspection | `mockforge-ui` | Medium | Optional convenience |
| **Validation modes** (`off` / `warn` / `enforce`) | `mockforge-core/src/validation` | Small | Matches what we already have for OpenAPI |

---

## 7. Open questions for steering

1. **Performance baseline.** The custom server has never been profiled under production load. Before deciding anything, we need a real baseline. The gauntlet in `benchmarks/` provides this.

2. **Schema watch trade-off.** Hot-reloading SDL is convenient but bypasses Apollo Router's supergraph validation. Is the trade-off worth it for developer velocity?

4. **Long-term multi-protocol direction.** If Phase 4 (REST/OpenAPI ingestion, Protobuf ingestion) ships, do we eventually want a unified multi-protocol mock binary? That is the case where MockForge upstream starts to look attractive — but only after federation is solved upstream.

5. **Reality Continuum.** MockForge upstream ships a "blend mock and real" mode (`reality_continuum.default_ratio: 0.5` → 50% real, 50% mock per route). This is interesting for staged rollouts but irrelevant until we have real upstream services.

---

## 8. References

- [`SaaSy-Solutions/mockforge`](https://github.com/SaaSy-Solutions/mockforge) — upstream project
- [`crates/mockforge-graphql/src/resolvers.rs`](https://github.com/SaaSy-Solutions/mockforge/blob/main/crates/mockforge-graphql/src/resolvers.rs) — generic resolver catalog
- [`crates/mockforge-federation/README.md`](https://github.com/SaaSy-Solutions/mockforge/blob/main/crates/mockforge-federation/README.md) — confirms federation is workspace composition, not Apollo
- [`servers/mockforge/README.md`](../README.md) — current custom server
- [`servers/mockforge/mock-server.js`](../mock-server.js) — SCALAR_MOCKS map
- [`servers/mockforge/mockforge.config.js`](../mockforge.config.js) — domain-specific generators
- [`servers/mockforge/gateway-server.js`](../gateway-server.js) — federation gateway
- [`benchmarks/README.md`](./README.md) — comparison gauntlet