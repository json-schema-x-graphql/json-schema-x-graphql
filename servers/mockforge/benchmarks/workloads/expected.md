# Expected behavior — pass/fail criteria per probe

This file defines what "pass" means for each probe in `gauntlet.mjs`. The harness currently only **measures**; the criteria below are reference notes for human review of generated reports.

## Cold-start

| Target | Pass threshold |
|---|---|
| `local` (Yoga + faker.js) | ≤ 5,000 ms |
| `upstream` (MockForge Rust binary) | ≤ 30,000 ms (cold compile done separately) |

If cold-start > threshold, the server is too slow to be useful in tight inner-loop development.

## Warm query latency (1000 sequential requests, single query)

| Target | Pass threshold (p95) |
|---|---|
| `local` | ≤ 25 ms |
| `upstream` | ≤ 10 ms |

MockForge upstream's Rust-native server is expected to be 2-3x faster than the Yoga + faker.js stack.

## Throughput (10,000 requests, concurrency = 16)

| Target | Pass threshold | Errors |
|---|---|---|
| `local` | ≥ 800 req/sec | ≤ 50 |
| `upstream` | ≥ 5,000 req/sec | ≤ 50 |

## Federation

A target **passes** federation if all of:

- [ ] `_service { sdl }` returns a non-empty SDL string with the `@key` directive preserved
- [ ] `_entities(representations: [...])` returns an array of length matching the input representations
- [ ] `_entities` does **not** return an error containing "Cannot resolve"
- [ ] If the server claims Apollo Federation v2 support, `_service.sdl` includes the federation link (`@link(url: "https://specs.apollo.dev/link/v1.0")`)

## Scalar coverage

A target **passes** scalar coverage if all declared custom scalars (from the schema file passed to the harness) are visible via `__type(name: "X") { kind: SCALAR }`. The harness only checks **declaration**, not whether values are realistic.

A more rigorous scalar probe would assert value format (e.g. PIID matches `/^GS-[A-Z0-9]{4}-[A-Z0-9]{8}$/`). That probe is a follow-up.

## Cross-subgraph identity

Not yet implemented in the gauntlet. Future probe: query PIID `GS-0001-00000001` against `fpds` and `usaspending`, assert the `fpds.awardAmount` and `usaspending.federal_action_obligation` are within the same order of magnitude (or at least both non-null numeric).

## Hot-reload

Not yet implemented. Future probe: write a new type into the schema file, assert the server picks it up within 5s without restart.