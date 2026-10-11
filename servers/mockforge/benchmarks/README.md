# Mock Server Benchmarking Gauntlet

Reproducible comparison harness for the custom Apollo Federation mock server (`servers/mockforge/`) versus MockForge upstream (`SaaSy-Solutions/mockforge`).

The gauntlet runs identical workloads against both implementations and reports latency, throughput, fidelity, federation correctness, scalar coverage, and cross-subgraph entity consistency.

## Quick start

```bash
# Custom server only (fast, ~30s)
cd servers/mockforge/benchmarks
./run.sh --target=local

# MockForge upstream only (requires Rust toolchain, ~15 min first build)
./run.sh --target=upstream

# Both, side-by-side (~30 min first time)
./run.sh --target=all
```

Output is written to `reports/YYYY-MM-DD-HHMMSS-<target>.md` and `reports/latest.md`.

## What gets measured

| Metric | What it tests |
|---|---|
| **Cold-start time** | Time from `docker compose up` / `node mock-server.js` / `mockforge serve` to first successful GraphQL response |
| **Warm query latency** | p50 / p95 / p99 over 1000 sequential queries against a single subgraph |
| **Throughput** | Requests/sec at saturation (concurrency = 16, 10000 req total) |
| **Federation directives** | Subgraph serves `_entities` and `_Service { sdl }` correctly; gateway can compose with Apollo Router |
| **Scalar coverage** | Fraction of declared scalars that return non-null, non-empty, type-correct values |
| **Cross-subgraph identity** | Same `PIID` queried against `fpds` and `usaspending` returns records with related (not necessarily identical) identifiers and realistic distributions |
| **Hot-reload** | SDL change triggers server restart vs live update |

## How it works

```
gauntlet.mjs
├── spin up servers (via docker compose or shell script)
├── load shared workload (workloads/queries.json)
├── for each target:
│   ├── run cold-start probe
│   ├── run warm-latency probe (1000 req)
│   ├── run throughput probe (10K req @ c=16)
│   ├── run federation probe
│   ├── run scalar-coverage probe
│   └── collect results
├── compute deltas
└── render reports/latest.md
```

The harness uses zero non-Node deps (`fetch`, `node:test`, `node:perf_hooks`). It deliberately does **not** use `autocannon` / `k6` / `wrk` — the goal is a single file that can be audited and run anywhere.

## Layout

```
benchmarks/
├── README.md                  # this file
├── EVALUATION.md              # ADR for adopting (or not) MockForge upstream
├── gauntlet.mjs               # main harness
├── run.sh                     # top-level entrypoint
├── workloads/
│   ├── queries.json           # shared GraphQL queries
│   └── expected.md            # per-query pass/fail criteria
├── mockforge-local/
│   ├── config.example.yaml    # config for the custom server
│   └── up.sh                  # spin up
├── mockforge-upstream/
│   ├── config.example.yaml    # MockForge config
│   ├── schema.graphql         # the *same* subgraph SDL we hand to MockForge
│   └── up.sh                  # install + serve via cargo
└── reports/                   # generated reports (gitignored)
```

## Constraints

- **CPU/memory.** Upstream requires Rust 1.96.0+ and ~10 min cold compile. The gauntlet defaults to `--target=local` so a single contributor can run it on a laptop without Rust installed.
- **Network.** MockForge upstream requires fetching ~60 crates from crates.io on first build.
- **Time budget.** Local-only run completes in ~30s on a modern laptop. Full upstream+local run is ~30 min first time, ~3 min after warm cache.
- **Ports.** Custom server uses 4001-4006. MockForge upstream uses 4000 by default.

## Status

| | |
|---|---|
| Custom server harness | ✅ implemented |
| Upstream harness | ⚠️ config + scripts only; full run requires user to install Rust and approve ~60 crate downloads |
| CI integration | ❌ not yet; intended to be a developer tool, not a CI gate |
| Historical reports | ❌ (intentional; reports are not committed) |

See [`EVALUATION.md`](./EVALUATION.md) for the full ADR.