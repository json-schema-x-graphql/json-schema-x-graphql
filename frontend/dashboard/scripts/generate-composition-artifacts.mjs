#!/usr/bin/env node

/**
 * scripts/generate-composition-artifacts.mjs
 *
 * Compose the canonical per-system subgraphs with two composition libraries
 * (@theguild/federation-composition and @apollo/composition) and emit a set of
 * artifacts useful for CI, debugging, UI visualization and benchmarking.
 *
 * Artifacts produced (per tool):
 *  - supergraph.graphql
 *  - diagnostics.json (errors/warnings)
 *  - hints.json (where available)
 *  - metadata.json (timings, memory, provenance)
 *  - supergraph.introspection.json
 *  - ownership.json (type -> services, field -> owner)
 *  - manifest.json (subgraph manifest)
 *  - unreachable.json (best-effort list)
 *  - topology.mmd (mermaid)
 *
 * Additional shared artifacts:
 *  - generated-schemas/subgraphs/{system}.graphql (input canonical subgraphs)
 *  - generated-schemas/examples/*.json (mapping JSONs, not modified here)
 *
 * Usage:
 *  node scripts/generate-composition-artifacts.mjs
 *
 * Notes:
 * - This script will read `generated-schemas/subgraphs/*.graphql`. If nothing
 *   exists there it will try `src/data/supgraphs/*.graphql`.
 * - It attempts to be defensive: per-library failures are captured into
 *   diagnostics artifacts rather than throwing the whole script.
 */
import { spawnSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import fs from "fs/promises";
import globPkg from "glob";
const globSync = globPkg.sync;
import { parse, buildSchema, graphql, getIntrospectionQuery, visit, Kind } from "graphql";
import path from "path";

let theguild;

async function tryImportTheGuild() {
  try {
    theguild = await import("@theguild/federation-composition");
  } catch (e) {
    theguild = null;
  }
}

function ensureDirSync(dir) {
  try {
    mkdirSync(dir, { recursive: true });
  } catch (e) {
    // ignore
  }
}

async function writeJson(filePath, obj) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

async function writeFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

function hrtimeMs(start) {
  const diff = process.hrtime.bigint() - start;
  return Number(diff / BigInt(1_000_000));
}

async function readPackageJson() {
  try {
    const txt = await fs.readFile(path.join(process.cwd(), "package.json"), "utf8");
    return JSON.parse(txt);
  } catch {
    return {};
  }
}

function collectDefinitionsFromSDL(ast) {
  const types = new Map();
  visit(ast, {
    ObjectTypeDefinition(node) {
      const name = node.name && node.name.value;
      if (!name) return;
      const fields = (node.fields || []).map((f) => (f.name && f.name.value) || "<unknown>");
      types.set(name, fields);
    },
  });
  return types;
}

/**
 * Build an ownership map from the individual subgraph SDLs.
 * Input: array of { name, sdl }
 * Output: { types: { TypeName: [service...] }, fields: { "Type.field": owner } }
 */
function buildOwnership(services) {
  const types = {}; // TypeName -> Set of services
  const fields = {}; // Type.field -> first owner
  for (const svc of services) {
    try {
      const ast = parse(svc.sdl, { noLocation: true });
      for (const def of ast.definitions || []) {
        if (def.kind === Kind.OBJECT_TYPE_DEFINITION && def.name && def.name.value) {
          const tname = def.name.value;
          types[tname] = types[tname] || new Set();
          types[tname].add(svc.name);
          for (const f of def.fields || []) {
            const fname = f.name && f.name.value;
            if (!fname) continue;
            const key = `${tname}.${fname}`;
            if (!fields[key]) fields[key] = svc.name;
          }
        }
      }
    } catch (e) {
      // skip defective SDL for ownership mapping
    }
  }
  const typesOut = {};
  for (const [k, set] of Object.entries(types)) {
    typesOut[k] = Array.from(set);
  }
  return { types: typesOut, fields };
}

/**
 * Build a simple manifest for subgraphs
 */
function buildManifest(services) {
  const m = [];
  for (const s of services) {
    try {
      const ast = parse(s.sdl, { noLocation: true });
      const defs = collectDefinitionsFromSDL(ast);
      m.push({
        name: s.name,
        file: s.file,
        typeCount: defs.size,
        types: Array.from(defs.keys()).sort(),
      });
    } catch {
      m.push({ name: s.name, file: s.file, error: "parse_failed" });
    }
  }
  return m;
}

/**
 * Simple mermaid topology: nodes are services, root edges from Query to service
 * for each Query field annotated with join__field(graph: ...).
 * If not available, fall back to listing service nodes only.
 */
function buildTopologyMermaid(supergraphSDL) {
  const lines = ["flowchart LR"];
  // find join__Graph enum entries and Query join__field usage
  try {
    const ast = parse(supergraphSDL, { noLocation: true });
    const graphs = new Set();
    const rootEdges = new Set();
    for (const def of ast.definitions || []) {
      if (def.kind === Kind.ENUM_TYPE_DEFINITION && def.name && def.name.value === "join__Graph") {
        for (const v of def.values || []) {
          const nm = v.name && v.name.value;
          if (nm) graphs.add(nm);
        }
      } else if (
        def.kind === Kind.OBJECT_TYPE_DEFINITION &&
        def.name &&
        def.name.value === "Query"
      ) {
        for (const f of def.fields || []) {
          // look for @join__field directives with graph arg
          for (const d of f.directives || []) {
            if (d.name && d.name.value === "join__field") {
              const arg = (d.arguments || []).find((a) => a.name && a.name.value === "graph");
              if (arg && arg.value && arg.value.kind === Kind.ENUM) {
                const g = arg.value.value;
                rootEdges.add(g);
                graphs.add(g);
              } else if (arg && arg.value && arg.value.kind === Kind.STRING) {
                graphs.add(arg.value.value);
                rootEdges.add(arg.value.value);
              }
            }
          }
        }
      }
    }
    // nodes
    if (graphs.size === 0 && supergraphSDL) {
      // best effort: try to infer service names from join__graph directive occurrences
      const mMatches = [];
      const re = /@join__graph\(name:\s*"([^"]+)"/g;
      let mm;
      while ((mm = re.exec(supergraphSDL)) !== null) {
        mMatches.push(mm[1]);
      }
      const matches = [...new Set(mMatches)];
      matches.forEach((m) => graphs.add(m.toUpperCase()));
    }
    for (const g of graphs) {
      lines.push(`  ${g}["${g}"]`);
    }
    if (rootEdges.size > 0) {
      lines.push(`  ROOT["Query (root)"]`);
      for (const g of rootEdges) {
        lines.push(`  ROOT --> ${g}`);
      }
    }
    return lines.join("\n") + "\n";
  } catch (e) {
    return "flowchart LR\n  /* topology generation failed */\n";
  }
}

/**
 * Compose with TheGuild library (programmatic) and produce artifacts
 */
async function runTheGuild(services, outBase, projectPackage) {
  const targetDir = path.join(outBase, "supergraph");
  ensureDirSync(targetDir);
  const resultArtifacts = {};

  if (!theguild) {
    await writeJson(path.join(targetDir, "diagnostics.json"), { error: "module_not_available" });
    return { ok: false, reason: "module_not_available" };
  }

  // theguild expects parsed ASTs for composeServices in many versions; ensure we pass ASTs
  const guildServices = services.map((svc) => {
    try {
      return { name: svc.name, typeDefs: parse(svc.sdl, { noLocation: true }) };
    } catch (e) {
      return { name: svc.name, typeDefs: null, _parseError: String(e && e.message) };
    }
  });

  const meta = {
    tool: "@theguild/federation-composition",
    startedAt: new Date().toISOString(),
    nodeVersion: process.version,
    package: projectPackage,
  };

  const start = process.hrtime.bigint();
  let composeResult = null;
  let err = null;
  try {
    // validate or compose; prefer composeServices
    composeResult = theguild.composeServices(guildServices);
  } catch (e) {
    err = e;
  }
  const durationMs = hrtimeMs(start);
  const mem = process.memoryUsage();

  meta.durationMs = durationMs;
  meta.memory = { rss: mem.rss, heapTotal: mem.heapTotal, heapUsed: mem.heapUsed };
  meta.endedAt = new Date().toISOString();

  // Write metadata
  await writeJson(path.join(targetDir, "metadata.json"), meta);

  if (err) {
    await writeJson(path.join(targetDir, "diagnostics.json"), {
      error: String(err && err.stack ? err.stack : err),
    });
    return { ok: false, reason: "compose_failed", metadata: meta };
  }

  // composeResult expected shape: { supergraphSdl, publicSdl, errors? }
  try {
    if (composeResult.supergraphSdl) {
      await writeFile(path.join(targetDir, "supergraph.graphql"), composeResult.supergraphSdl);
      resultArtifacts.supergraph = path.join(targetDir, "supergraph.graphql");
    }

    // capture errors or diagnostics
    if (composeResult.errors) {
      await writeJson(path.join(targetDir, "diagnostics.json"), composeResult.errors);
    } else {
      await writeJson(path.join(targetDir, "diagnostics.json"), []);
    }

    // public SDL (if present) - helpful for ownership analysis
    if (composeResult.publicSdl) {
      await writeFile(path.join(targetDir, "public.sdl.graphql"), composeResult.publicSdl);
    }

    // generate introspection for the supergraph if available
    if (composeResult.supergraphSdl) {
      try {
        const schema = buildSchema(composeResult.supergraphSdl);
        const intros = await graphql({ schema, source: getIntrospectionQuery() });
        await writeJson(path.join(targetDir, "supergraph.introspection.json"), intros);
      } catch (e) {
        await writeJson(path.join(targetDir, "supergraph.introspection.json"), {
          error: String(e && e.message),
        });
      }
    }

    // Ownership: build from original services (safer than parsing supergraph)
    const ownership = buildOwnership(services);
    await writeJson(path.join(targetDir, "ownership.json"), ownership);

    // manifest
    await writeJson(path.join(targetDir, "manifest.json"), buildManifest(services));

    // best-effort unreachable (empty placeholder or use composeResult diagnostics if available)
    const unreachable = (composeResult && composeResult.unreachable) || [];
    await writeJson(path.join(targetDir, "unreachable.json"), unreachable);

    // mermaid topology
    const sg = composeResult.supergraphSdl || "";
    const mmd = buildTopologyMermaid(sg);
    await writeFile(path.join(targetDir, "topology.mmd"), mmd);

    // store timing benchmark
    await writeJson(path.join(targetDir, "benchmark.json"), {
      durationMs,
      memory: meta.memory,
      startedAt: meta.startedAt,
      endedAt: meta.endedAt,
    });

    return { ok: true, artifacts: resultArtifacts, metadata: meta };
  } catch (e) {
    await writeJson(path.join(targetDir, "diagnostics.json"), {
      error: String(e && e.stack ? e.stack : e),
    });
    return { ok: false, reason: "write_failed", error: String(e && e.message) };
  }
}

/**
 * Compose with Apollo library and produce artifacts
 */
async function runApollo(services, outBase, projectPackage) {
  const targetDir = path.join(outBase, "composition-apollo");
  ensureDirSync(targetDir);
  const resultArtifacts = {};

  if (!apollo) {
    await writeJson(path.join(targetDir, "diagnostics.json"), { error: "module_not_available" });
    return { ok: false, reason: "module_not_available" };
  }

  // Apollo composeServices expects SDL strings
  const apServices = services.map((svc) => ({ name: svc.name, typeDefs: svc.sdl }));

  const meta = {
    tool: "@apollo/composition",
    startedAt: new Date().toISOString(),
    nodeVersion: process.version,
    package: projectPackage,
  };

  const start = process.hrtime.bigint();
  let composeResult = null;
  let err = null;
  try {
    composeResult = apollo.composeServices(apServices);
  } catch (e) {
    err = e;
  }
  const durationMs = hrtimeMs(start);
  const mem = process.memoryUsage();

  meta.durationMs = durationMs;
  meta.memory = { rss: mem.rss, heapTotal: mem.heapTotal, heapUsed: mem.heapUsed };
  meta.endedAt = new Date().toISOString();

  await writeJson(path.join(targetDir, "metadata.json"), meta);

  if (err) {
    await writeJson(path.join(targetDir, "diagnostics.json"), {
      error: String(err && err.stack ? err.stack : err),
    });
    return { ok: false, reason: "compose_failed", metadata: meta };
  }

  try {
    // composeResult may include supergraphSdl, schema, hints
    if (composeResult.supergraphSdl) {
      await writeFile(path.join(targetDir, "supergraph.graphql"), composeResult.supergraphSdl);
      resultArtifacts.supergraph = path.join(targetDir, "supergraph.graphql");
    } else if (composeResult.schema) {
      // attempt to print schema as SDL
      await writeFile(path.join(targetDir, "supergraph.graphql"), String(composeResult.schema));
      resultArtifacts.supergraph = path.join(targetDir, "supergraph.graphql");
    }

    if (composeResult.hints) {
      await writeJson(path.join(targetDir, "hints.json"), composeResult.hints);
    }

    if (composeResult.errors) {
      await writeJson(path.join(targetDir, "diagnostics.json"), composeResult.errors);
    } else {
      await writeJson(path.join(targetDir, "diagnostics.json"), []);
    }

    // introspection
    if (composeResult.supergraphSdl) {
      try {
        const schema = buildSchema(composeResult.supergraphSdl);
        const intros = await graphql({ schema, source: getIntrospectionQuery() });
        await writeJson(path.join(targetDir, "supergraph.introspection.json"), intros);
      } catch (e) {
        await writeJson(path.join(targetDir, "supergraph.introspection.json"), {
          error: String(e && e.message),
        });
      }
    }

    // Ownership & manifest
    const ownership = buildOwnership(services);
    await writeJson(path.join(targetDir, "ownership.json"), ownership);
    await writeJson(path.join(targetDir, "manifest.json"), buildManifest(services));

    // unreachable (placeholder or use hints)
    const unreachable = composeResult.unreachable || [];
    await writeJson(path.join(targetDir, "unreachable.json"), unreachable);

    // topology
    const sg = composeResult.supergraphSdl || "";
    const mmd = buildTopologyMermaid(sg);
    await writeFile(path.join(targetDir, "topology.mmd"), mmd);

    // benchmark
    await writeJson(path.join(targetDir, "benchmark.json"), {
      durationMs,
      memory: meta.memory,
      startedAt: meta.startedAt,
      endedAt: meta.endedAt,
    });

    return { ok: true, artifacts: resultArtifacts, metadata: meta };
  } catch (e) {
    await writeJson(path.join(targetDir, "diagnostics.json"), {
      error: String(e && e.stack ? e.stack : e),
    });
    return { ok: false, reason: "write_failed", error: String(e && e.message) };
  }
}

async function main() {
  const projectRoot = process.cwd();
  const fallbackDirs = [
    "generated-schemas/subgraphs",
    "src/data/supgraphs",
    "src/graphql/subgraphs",
    "scripts",
  ];
  // find subgraph SDLs
  let files = globSync(path.join("generated-schemas", "subgraphs", "*.graphql"));
  if (!files || files.length === 0) {
    // fallback
    for (const d of fallbackDirs) {
      const f = globSync(path.join(d, "*.graphql"));
      if (f && f.length) {
        files = f;
        break;
      }
    }
  }

  if (!files || files.length === 0) {
    console.warn(
      "No canonical subgraph SDLs found under generated-schemas/subgraphs or fallback directories. Nothing to do.",
    );
    return;
  }

  // normalize into service objects
  const services = [];
  for (const f of files.sort()) {
    try {
      const txt = await fs.readFile(f, "utf8");
      services.push({ name: path.basename(f).replace(/\.(gql|graphql)$/, ""), sdl: txt, file: f });
    } catch (e) {
      // skip unreadable
    }
  }

  // Prepare output base directory
  const outBase = path.join(projectRoot, "generated-schemas");
  ensureDirSync(outBase);
  ensureDirSync(path.join(outBase, "supergraph"));

  // Project package info
  const pkg = await readPackageJson();

  // Import composition lib (theguild) if available
  await tryImportTheGuild();

  // Run theguild library and produce artifacts
  const results = { theguild: null };
  try {
    results.theguild = await runTheGuild(services, outBase, {
      name: pkg.name,
      version: pkg.version,
      deps: pkg.devDependencies || {},
    });
  } catch (e) {
    // capture
    await writeJson(path.join(outBase, "supergraph", "diagnostics.json"), {
      error: String(e && e.stack ? e.stack : e),
    });
    results.theguild = { ok: false, reason: "exception", error: String(e && e.message) };
  }

  // Produce aggregator artifacts
  const aggregatorDir = path.join(outBase, "composition-artifacts");
  ensureDirSync(aggregatorDir);

  // all-systems.json - aggregate ownership across tools (use ownership from either tool)
  const agg = {
    services: services.map((s) => ({ name: s.name, file: s.file })),
    generatedAt: new Date().toISOString(),
    results,
  };
  await writeJson(path.join(aggregatorDir, "all-systems.json"), agg);

  // Create a top-level manifest file combining both tool manifests (if they exist)
  try {
    const tgManifestPath = path.join(outBase, "supergraph", "manifest.json");
    const combined = { generatedAt: new Date().toISOString(), manifests: {} };
    if (existsSync(tgManifestPath)) {
      combined.manifests.theguild = JSON.parse(await fs.readFile(tgManifestPath, "utf8"));
    }
    await writeJson(path.join(aggregatorDir, "manifests.json"), combined);
  } catch {
    // ignore
  }

  // Best-effort: format composition artifacts with Prettier so CI checks (prettier/eslint) don't fail.
  // This step is non-fatal — failures here will only be logged.
  try {
    const compositionDirs = [
      path.join(outBase, "supergraph"),
      path.join(outBase, "composition-apollo"),
      aggregatorDir,
    ];

    // Collect files to format (json, graphql, introspection)
    const filesToFormat = [];
    for (const d of compositionDirs) {
      if (!existsSync(d)) continue;
      const entries = globSync(path.join(d, "**", "*.*"));
      for (const e of entries) {
        if (e.endsWith(".json") || e.endsWith(".graphql") || e.endsWith(".introspection.json")) {
          filesToFormat.push(e);
        }
      }
    }

    if (filesToFormat.length > 0) {
      // Prefer pnpm exec if pnpm is available in runner, otherwise fall back to npx
      const hasPnpm = spawnSync("pnpm", ["-v"], { stdio: "ignore" }).status === 0;
      const runner = hasPnpm ? "pnpm" : "npx";
      const args = hasPnpm
        ? ["exec", "prettier", "--write", ...filesToFormat]
        : ["prettier", "--write", ...filesToFormat];

      // Invoke Prettier
      const res = spawnSync(runner, args, { cwd: process.cwd(), stdio: "inherit" });
      if (res && res.status !== 0) {
        // non-fatal; just warn
        // eslint-disable-next-line no-console
        console.warn("Prettier formatting of composition artifacts exited with non-zero status");
      } else {
        // eslint-disable-next-line no-console
        console.log("Formatted composition artifacts with Prettier.");
      }
    }
  } catch (err) {
    // non-fatal: log and continue
    // eslint-disable-next-line no-console
    console.warn(
      "Prettier formatting of composition artifacts failed (non-fatal):",
      err && err.message ? err.message : err,
    );
  }

  // Print a short summary
  console.log("Composition artifact generation complete.");
  console.log("TheGuild result:", results.theguild && results.theguild.ok ? "ok" : "failed");
  console.log("Artifacts under:", path.resolve(outBase));

  // Copy generated supergraph into public data so Next.js dev server can serve it
  try {
    const srcSuper = path.join(outBase, "supergraph", "supergraph.graphql");
    const destDir = path.join(projectRoot, "public", "data", "supergraph");
    const destFile = path.join(destDir, "supergraph.graphql");
    if (existsSync(srcSuper)) {
      await fs.mkdir(destDir, { recursive: true });
      // copyFile available on fs.promises
      await fs.copyFile(srcSuper, destFile);
      console.log(`Copied supergraph to: ${destFile}`);
    }
  } catch (e) {
    console.warn("Failed to copy supergraph into public/data:", e && e.message ? e.message : e);
  }
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1].endsWith("generate-composition-artifacts.mjs")
) {
  main().catch((err) => {
    console.error(
      "generate-composition-artifacts.mjs: unexpected error:",
      err && err.stack ? err.stack : err,
    );
    process.exit(1);
  });
}
