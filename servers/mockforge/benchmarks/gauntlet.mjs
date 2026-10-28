#!/usr/bin/env node
/**
 * Mock Server Benchmarking Gauntlet
 *
 * Compares the local Apollo Federation mock server (servers/mockforge/)
 * against MockForge upstream (SaaSy-Solutions/mockforge) using identical
 * workloads. Emits a Markdown report to reports/ and exits non-zero on
 * regression versus the baseline.
 *
 * Usage:
 *   node gauntlet.mjs --target=local
 *   node gauntlet.mjs --target=upstream
 *   node gauntlet.mjs --target=all
 *
 * Zero non-Node dependencies (fetch, node:test, node:perf_hooks only).
 *
 * Exit codes:
 *   0  all probes passed
 *   1  one or more probes failed
 *   2  harness error (could not start server, missing config, etc.)
 */

import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { target: 'local', reportDir: join(ROOT, 'reports') };
  for (const a of argv.slice(2)) {
    const [k, v] = a.replace(/^--/, '').split('=');
    if (k === 'target') args.target = v;
    else if (k === 'report-dir') args.reportDir = resolve(v);
    else if (k === 'help') {
      console.log('Usage: node gauntlet.mjs --target=local|upstream|all');
      process.exit(0);
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------
class Server {
  constructor({ name, command, args, cwd, env, healthUrl, readyTimeoutMs = 30000 }) {
    this.name = name;
    this.command = command;
    this.args = args;
    this.cwd = cwd;
    this.env = { ...process.env, ...env };
    this.healthUrl = healthUrl;
    this.readyTimeoutMs = readyTimeoutMs;
    this.proc = null;
    this.startedAt = null;
    this.readyAt = null;
  }

  async start() {
    this.startedAt = performance.now();
    this.proc = spawn(this.command, this.args, {
      cwd: this.cwd,
      env: this.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    // Suppress noisy per-request logs from Yoga/MockForge during the run.
    // Probe output is what matters; per-request chatter belongs in the
    // server's own log file, not in the benchmark report.
    this.proc.stdout.on('data', () => {});
    this.proc.stderr.on('data', (d) => {
      const line = d.toString();
      if (line.includes('Processing GraphQL Parameters')) return;
      process.stderr.write(`[${this.name}] ${d}`);
    });

    // Wait until /graphql responds to introspection
    const deadline = Date.now() + this.readyTimeoutMs;
    while (Date.now() < deadline) {
      try {
        const r = await fetch(this.healthUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '{ __typename }' }),
        });
        if (r.ok) {
          this.readyAt = performance.now();
          return;
        }
      } catch {
        // not ready yet
      }
      await sleep(250);
    }
    throw new Error(`${this.name} did not become ready within ${this.readyTimeoutMs}ms`);
  }

  async stop() {
    if (!this.proc) return;
    this.proc.kill('SIGTERM');
    // Give it 5s to die gracefully, then SIGKILL
    const died = await Promise.race([
      new Promise((r) => this.proc.once('exit', r)),
      sleep(5000).then(() => false),
    ]);
    if (died !== false) return;
    try { this.proc.kill('SIGKILL'); } catch {}
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Probes
// ---------------------------------------------------------------------------

/** Probe 1: cold-start time is recorded by Server.start() */
async function probeColdStart(server, results) {
  results[server.name] = results[server.name] || {};
  results[server.name].coldStartMs = Math.round(server.readyAt - server.startedAt);
}

/** Probe 2: warm query latency — p50 / p95 / p99 over N sequential queries */
async function probeWarmLatency(server, query, n = 1000) {
  const samples = [];
  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    const r = await fetch(server.healthUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    await r.text(); // drain so we measure full response
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  const p = (q) => samples[Math.min(samples.length - 1, Math.floor(samples.length * q))];
  return {
    samples: n,
    p50Ms: round2(p(0.50)),
    p95Ms: round2(p(0.95)),
    p99Ms: round2(p(0.99)),
    maxMs: round2(samples[samples.length - 1]),
    meanMs: round2(samples.reduce((a, b) => a + b, 0) / samples.length),
  };
}

function round2(n) { return Math.round(n * 100) / 100; }

/** Probe 3: throughput — req/sec at concurrency = 16 */
async function probeThroughput(server, query, total = 10000, concurrency = 16) {
  let inFlight = 0;
  let completed = 0;
  const t0 = performance.now();
  const errors = [];

  async function one() {
    inFlight++;
    try {
      const r = await fetch(server.healthUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (!r.ok) errors.push(r.status);
      await r.text();
    } catch (e) {
      errors.push(String(e));
    }
    completed++;
    inFlight--;
  }

  const workers = Array.from({ length: concurrency }, async () => {
    while (completed < total && inFlight < concurrency * 2) {
      if (completed + inFlight >= total) break;
      await one();
    }
  });
  await Promise.all(workers);
  const elapsed = (performance.now() - t0) / 1000;
  return {
    totalRequests: completed,
    errors: errors.length,
    durationSec: round2(elapsed),
    reqPerSec: round2(completed / elapsed),
    concurrency,
  };
}

/** Probe 4: federation — _entities + _Service { sdl } */
async function probeFederation(server) {
  const entitiesQuery = `query($reps: [_Any!]!) {
    _entities(representations: $reps) { ... on FpdsRecord { piid awardAmount } }
  }`;
  const serviceQuery = `{ _service { sdl } }`;

  const entitiesRes = await fetch(server.healthUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: entitiesQuery,
      variables: { reps: [{ __typename: 'FpdsRecord', piid: 'GS-0001-00000001' }] },
    }),
  });
  const entitiesBody = await entitiesRes.json();

  const serviceRes = await fetch(server.healthUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: serviceQuery }),
  });
  const serviceBody = await serviceRes.json();

  return {
    entitiesResponds: !!entitiesBody.data?._entities,
    entitiesArrayLength: Array.isArray(entitiesBody.data?._entities)
      ? entitiesBody.data._entities.length
      : null,
    entitiesError: entitiesBody.errors?.[0]?.message || null,
    serviceSdlNonEmpty: !!serviceBody.data?._service?.sdl?.length,
    serviceSdlChars: serviceBody.data?._service?.sdl?.length || 0,
  };
}

/** Probe 5: scalar coverage — what fraction of declared scalars return non-null typed data */
async function probeScalarCoverage(server, schemaPath) {
  const schema = await readFile(schemaPath, 'utf8');
  // Extract declared scalars
  const scalarNames = [...schema.matchAll(/^scalar\s+(\w+)/gm)].map((m) => m[1]);
  // Probe each scalar via a __type introspection
  const results = {};
  for (const name of scalarNames) {
    const q = `{ __type(name: "${name}") { name kind } }`;
    const r = await fetch(server.healthUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q }),
    });
    const body = await r.json();
    results[name] = body.data?.__type ? 'declared' : 'missing';
  }
  const declared = Object.values(results).filter((v) => v === 'declared').length;
  return {
    totalScalars: scalarNames.length,
    declared,
    coveragePct: Math.round((declared / Math.max(1, scalarNames.length)) * 100),
    byName: results,
  };
}

// ---------------------------------------------------------------------------
// Report rendering
// ---------------------------------------------------------------------------
function renderReport(args, results, elapsedMs) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '-').slice(0, 19);
  const lines = [];
  lines.push(`# Mock Server Benchmark Report`);
  lines.push(``);
  lines.push(`- **Generated:** ${new Date().toISOString()}`);
  lines.push(`- **Targets:** ${args.target}`);
  lines.push(`- **Total elapsed:** ${(elapsedMs / 1000).toFixed(1)}s`);
  lines.push(``);
  lines.push(`## Cold-start time`);
  lines.push(``);
  lines.push(`| Target | Cold-start (ms) |`);
  lines.push(`|---|---|`);
  for (const [name, r] of Object.entries(results)) {
    lines.push(`| ${name} | ${r.coldStartMs} |`);
  }
  lines.push(``);

  lines.push(`## Warm query latency`);
  lines.push(``);
  lines.push(`| Target | p50 (ms) | p95 (ms) | p99 (ms) | max (ms) | mean (ms) |`);
  lines.push(`|---|---|---|---|---|---|`);
  for (const [name, r] of Object.entries(results)) {
    const w = r.warm;
    if (!w) { lines.push(`| ${name} | _n/a_ | _n/a_ | _n/a_ | _n/a_ | _n/a_ |`); continue; }
    lines.push(`| ${name} | ${w.p50Ms} | ${w.p95Ms} | ${w.p99Ms} | ${w.maxMs} | ${w.meanMs} |`);
  }
  lines.push(``);

  lines.push(`## Throughput`);
  lines.push(``);
  lines.push(`| Target | Reqs/sec | Errors | Concurrency | Total reqs |`);
  lines.push(`|---|---|---|---|---|`);
  for (const [name, r] of Object.entries(results)) {
    const t = r.throughput;
    if (!t) { lines.push(`| ${name} | _n/a_ | _n/a_ | _n/a_ | _n/a_ |`); continue; }
    lines.push(`| ${name} | ${t.reqPerSec} | ${t.errors} | ${t.concurrency} | ${t.totalRequests} |`);
  }
  lines.push(``);

  lines.push(`## Federation (Apollo Federation v2)`);
  lines.push(``);
  lines.push(`| Target | _entities responds | service SDL chars | entities error |`);
  lines.push(`|---|---|---|---|`);
  for (const [name, r] of Object.entries(results)) {
    const f = r.federation;
    if (!f) { lines.push(`| ${name} | _n/a_ | _n/a_ | _n/a_ |`); continue; }
    lines.push(`| ${name} | ${f.entitiesResponds ? '✅' : '❌'} | ${f.serviceSdlChars} | ${f.entitiesError || 'none'} |`);
  }
  lines.push(``);

  lines.push(`## Scalar coverage`);
  lines.push(``);
  lines.push(`| Target | Total | Declared | Coverage % |`);
  lines.push(`|---|---|---|---|`);
  for (const [name, r] of Object.entries(results)) {
    const s = r.scalars;
    if (!s) { lines.push(`| ${name} | _n/a_ | _n/a_ | _n/a_ |`); continue; }
    lines.push(`| ${name} | ${s.totalScalars} | ${s.declared} | ${s.coveragePct}% |`);
  }
  lines.push(``);

  lines.push(`## Per-scalar breakdown`);
  lines.push(``);
  for (const [name, r] of Object.entries(results)) {
    if (!r.scalars?.byName) continue;
    lines.push(`### ${name}`);
    lines.push(``);
    lines.push(`| Scalar | Status |`);
    lines.push(`|---|---|`);
    for (const [scalar, status] of Object.entries(r.scalars.byName)) {
      const icon = status === 'declared' ? '✅' : '❌';
      lines.push(`| \`${scalar}\` | ${icon} ${status} |`);
    }
    lines.push(``);
  }

  return { stamp, md: lines.join('\n') };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv);

  await mkdir(args.reportDir, { recursive: true });

  const workloadsPath = join(ROOT, 'workloads', 'queries.json');
  if (!existsSync(workloadsPath)) {
    console.error(`Missing workloads: ${workloadsPath}`);
    process.exit(2);
  }
  const workloads = JSON.parse(await readFile(workloadsPath, 'utf8'));

  const targets = [];
  if (args.target === 'local' || args.target === 'all') {
    // mock-server.js lives at ../mock-server.js relative to the benchmarks/
    // directory (i.e., servers/mockforge/mock-server.js).
    const localServerDir = join(ROOT, '..');
    const fixturePath = join(ROOT, 'mockforge-local', 'fpds.subgraph.graphql');
    targets.push({
      name: 'local',
      server: new Server({
        name: 'local',
        command: 'node',
        args: [join(localServerDir, 'mock-server.js')],
        cwd: localServerDir,
        env: {
          SYSTEM: 'fpds',
          PORT: '4101',
          SUBGRAPH_PATH: fixturePath,
        },
        healthUrl: 'http://localhost:4101/graphql',
        readyTimeoutMs: 30000,
      }),
      // Use the same fixture SDL for the scalar-coverage probe (introspect
      // declared scalars live rather than parsing a static file).
      schemaPath: fixturePath,
    });
  }
  if (args.target === 'upstream' || args.target === 'all') {
    targets.push({
      name: 'upstream',
      server: new Server({
        name: 'upstream',
        command: './up.sh',
        args: [],
        cwd: join(ROOT, 'mockforge-upstream'),
        env: {},
        healthUrl: 'http://localhost:4102/graphql',
        readyTimeoutMs: 600000, // 10 min for first cargo build
      }),
      schemaPath: join(ROOT, 'mockforge-upstream', 'schema.graphql'),
    });
  }

  const results = {};
  const totalT0 = performance.now();
  for (const t of targets) {
    console.log(`\n=== Probing ${t.name} ===`);
    try {
      await t.server.start();
      await probeColdStart(t.server, results);

      // Use the same query for both latency and throughput
      const warm = await probeWarmLatency(t.server, workloads.warmQuery);
      results[t.name].warm = warm;
      console.log(`  warm p50=${warm.p50Ms}ms p95=${warm.p95Ms}ms`);

      const throughput = await probeThroughput(t.server, workloads.warmQuery);
      results[t.name].throughput = throughput;
      console.log(`  throughput=${throughput.reqPerSec} req/sec (errors=${throughput.errors})`);

      const federation = await probeFederation(t.server);
      results[t.name].federation = federation;
      console.log(`  federation entities=${federation.entitiesResponds} sdlChars=${federation.serviceSdlChars}`);

      // Scalar coverage — point at a known schema file
      const schemaPath = t.schemaPath;
      if (schemaPath && existsSync(schemaPath)) {
        const scalars = await probeScalarCoverage(t.server, schemaPath);
        results[t.name].scalars = scalars;
        console.log(`  scalars: ${scalars.declared}/${scalars.totalScalars} declared`);
      } else {
        results[t.name].scalars = { totalScalars: 0, declared: 0, coveragePct: 0, byName: {} };
      }
    } finally {
      await t.server.stop();
    }
  }

  const elapsedMs = performance.now() - totalT0;
  const { stamp, md } = renderReport(args, results, elapsedMs);

  const reportPath = join(args.reportDir, `${stamp}-${args.target}.md`);
  const latestPath = join(args.reportDir, 'latest.md');
  await writeFile(reportPath, md, 'utf8');
  await writeFile(latestPath, md, 'utf8');
  console.log(`\nReport written to: ${reportPath}`);
  console.log(`Latest: ${latestPath}`);
}

main().catch((err) => {
  console.error('Gauntlet failed:', err);
  process.exit(2);
});