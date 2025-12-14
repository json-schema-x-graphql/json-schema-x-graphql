#!/usr/bin/env node

/**
 * scripts/generate-canonical-subgraphs.mjs
 *
 * Generate canonical per-system subgraph SDL files by scanning GraphQL SDL
 * sources and grouping types by an inferred system key.
 *
 * Intended use-cases:
 *  - Produce standalone canonical SDLs suitable for composition tooling
 *    (e.g. @theguild/federation-composition, @apollo/composition) for
 *    benchmarking/validation.
 *  - Normalize collection of SDL fragments into one file per system.
 *
 * Behavior (defaults):
 *  - Scans these directories (in order): "src/data/supgraphs", "src/graphql/subgraphs",
 *    "scripts/graphql-subgraphs", "scripts".
 *  - For each .graphql/.gql file found:
 *     - parses the SDL and collects type definitions (object, interface, enum,
 *       union, input, scalar) and directive definitions.
 *     - skips root types (Query/Mutation/Subscription) when grouping types, but
 *       will include them in individual source-derived outputs if present.
 *  - Infers a system key for each type:
 *     - if the type name contains an underscore: prefix before first underscore,
 *       lowercased (e.g. `Contract Data_Contract` -> `contract_data`)
 *     - otherwise, the file base name is used as the system key (lowercased).
 *  - Emits one SDL file per system under:
 *     - generated-schemas/subgraphs/{system}.graphql
 *     - public/data/generated/subgraphs/{system}.graphql
 *
 * Options:
 *   --dirs=dir1,dir2        Comma-separated list of directories to scan (overrides defaults).
 *   --out=some/dir          Base output directory (defaults to generated-schemas/subgraphs).
 *   --no-public             Do not write the public/data/generated/subgraphs copy.
 *   --help, -h              Print usage.
 *
 * Notes:
 *  - This is intentionally conservative: it preserves directive definitions it
 *    encounters, and merges type-level definitions by name. If different sources
 *    provide conflicting definitions for the same symbol, the later one wins
 *    according to file processing order.
 *
 * Example:
 *   node scripts/generate-canonical-subgraphs.mjs
 */
import { spawnSync } from "child_process";
import fs from "fs/promises";
import { parse, print, visit, Kind } from "graphql";
import path from "path";

const projectRoot = process.cwd();

function usage() {
  console.log("");
  console.log("generate-canonical-subgraphs.mjs");
  console.log("");
  console.log("Scans GraphQL SDL files and emits one canonical SDL per inferred system.");
  console.log("");
  console.log("Usage:");
  console.log(
    "  node scripts/generate-canonical-subgraphs.mjs [--dirs=dir1,dir2] [--out=outdir] [--no-public]"
  );
  console.log("");
  console.log("Default directories:");
  console.log("  src/data/supgraphs, src/graphql/subgraphs, scripts/graphql-subgraphs, scripts");
  console.log("");
  console.log("Default output (per-system):");
  console.log("  generated-schemas/subgraphs/{system}.graphql");
  console.log("Additionally writes a copy to:");
  console.log("  public/data/generated/subgraphs/{system}.graphql");
  console.log("");
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (const a of args) {
    if (a === "--help" || a === "-h") {
      opts.help = true;
    } else if (a.startsWith("--dirs=")) {
      opts.dirs = a
        .slice("--dirs=".length)
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
    } else if (a.startsWith("--out=")) {
      opts.out = a.slice("--out=".length).trim();
    } else if (a === "--no-public") {
      opts.noPublic = true;
    }
  }
  return opts;
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function findSDLFiles(dirs) {
  const files = [];
  for (const d of dirs) {
    const abs = path.join(projectRoot, d);
    if (!(await exists(abs))) continue;
    const items = await fs.readdir(abs);
    for (const item of items) {
      const full = path.join(abs, item);
      const stat = await fs.stat(full);
      if (stat.isFile() && (item.endsWith(".graphql") || item.endsWith(".gql"))) {
        files.push(full);
      }
    }
  }
  return files;
}

/**
 * Infer a system key from a type name or fallback base name.
 */
function inferSystemKey(typeName, fileBase) {
  if (typeName && typeName.includes("_")) {
    return typeName.split("_")[0].toLowerCase();
  }
  return fileBase.toLowerCase();
}

/**
 * Collect relevant definitions from an AST.
 * Returns an object with maps keyed by definition name to the definition node.
 *
 * We collect:
 *  - OBJECT_TYPE_DEFINITION
 *  - INTERFACE_TYPE_DEFINITION
 *  - UNION_TYPE_DEFINITION
 *  - ENUM_TYPE_DEFINITION
 *  - INPUT_OBJECT_TYPE_DEFINITION
 *  - SCALAR_TYPE_DEFINITION
 *  - DIRECTIVE_DEFINITION
 *
 * Note: we do not validate or attempt to resolve conflicts beyond last-write-wins.
 */
function collectDefinitions(ast) {
  const defs = {
    objects: new Map(),
    interfaces: new Map(),
    unions: new Map(),
    enums: new Map(),
    inputs: new Map(),
    scalars: new Map(),
    directives: new Map(),
    roots: new Map(), // Query/Mutation/Subscription if present
  };

  for (const d of ast.definitions || []) {
    if (!d || !d.kind) continue;
    switch (d.kind) {
      case Kind.OBJECT_TYPE_DEFINITION: {
        const name = (d.name && d.name.value) || "<unknown>";
        if (name === "Query" || name === "Mutation" || name === "Subscription") {
          defs.roots.set(name, d);
        } else {
          defs.objects.set(name, d);
        }
        break;
      }
      case Kind.INTERFACE_TYPE_DEFINITION: {
        const name = (d.name && d.name.value) || "<unknown>";
        defs.interfaces.set(name, d);
        break;
      }
      case Kind.UNION_TYPE_DEFINITION: {
        const name = (d.name && d.name.value) || "<unknown>";
        defs.unions.set(name, d);
        break;
      }
      case Kind.ENUM_TYPE_DEFINITION: {
        const name = (d.name && d.name.value) || "<unknown>";
        defs.enums.set(name, d);
        break;
      }
      case Kind.INPUT_OBJECT_TYPE_DEFINITION: {
        const name = (d.name && d.name.value) || "<unknown>";
        defs.inputs.set(name, d);
        break;
      }
      case Kind.SCALAR_TYPE_DEFINITION: {
        const name = (d.name && d.name.value) || "<unknown>";
        defs.scalars.set(name, d);
        break;
      }
      case Kind.DIRECTIVE_DEFINITION: {
        const name = (d.name && d.name.value) || "<unknown>";
        defs.directives.set(name, d);
        break;
      }
      default:
        // ignore other kinds (schema, type extensions, etc.)
        break;
    }
  }

  return defs;
}

/**
 * Merge collected definitions into a single array of definitions suitable for
 * printing to SDL. This will include directive defs first, then scalars, enums,
 * inputs, unions, interfaces, objects. Root types (Query/Mutation/Subscription)
 * are optionally included if present.
 */
function mergeDefinitions(maps, includeRoots = false) {
  const out = [];

  // directives
  for (const d of maps.directives.values()) out.push(d);

  // scalars
  for (const d of maps.scalars.values()) out.push(d);

  // enums
  for (const d of maps.enums.values()) out.push(d);

  // inputs
  for (const d of maps.inputs.values()) out.push(d);

  // unions
  for (const d of maps.unions.values()) out.push(d);

  // interfaces
  for (const d of maps.interfaces.values()) out.push(d);

  // objects
  for (const d of maps.objects.values()) out.push(d);

  if (includeRoots) {
    for (const d of maps.roots.values()) out.push(d);
  }

  return out;
}

async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    // ignore races
  }
}

/**
 * Build a small header comment describing provenance.
 */
function buildHeader(sources) {
  const now = new Date().toISOString();
  const lines = [
    "# Canonical subgraph generated by scripts/generate-canonical-subgraphs.mjs",
    `# Generated: ${now}`,
    `# Source files: ${sources.join(", ")}`,
    "#",
  ];
  return lines.join("\n") + "\n\n";
}

async function main() {
  const opts = parseArgs();

  if (opts.help) {
    usage();
    process.exit(0);
  }

  const candidateDirs =
    opts.dirs && opts.dirs.length
      ? opts.dirs
      : ["src/data/supgraphs", "src/graphql/subgraphs", "scripts/graphql-subgraphs", "scripts"];

  console.log("Scanning directories for SDL files:", candidateDirs.join(", "));

  const sdlFiles = await findSDLFiles(candidateDirs);

  if (sdlFiles.length === 0) {
    console.warn("No SDL (.graphql/.gql) files found in the candidate directories. Nothing to do.");
    return;
  }

  // system -> maps of definitions
  const systems = new Map();
  // also track which source files contributed to each system
  const systemSources = new Map();

  for (const file of sdlFiles) {
    let txt;
    try {
      txt = await fs.readFile(file, "utf8");
    } catch (err) {
      console.error(`Failed to read ${file}:`, err && err.message ? err.message : String(err));
      continue;
    }

    let ast;
    try {
      ast = parse(txt, { noLocation: true });
    } catch (err) {
      console.error(
        `Failed to parse SDL in ${file}:`,
        err && err.message ? err.message : String(err)
      );
      continue;
    }

    const fileBase = path.basename(file).replace(/\.(gql|graphql)$/, "");

    const defs = collectDefinitions(ast);

    // For every object type, determine its system key and add to that system's maps.
    // For non-object defs (enum/input/etc.), attempt to include them in every system that
    // references them, but since we don't do deep reference resolution here, we take a
    // conservative approach: attach non-object defs to the same system as the file's base name.
    // This keeps type dependencies local to the producing file unless types are explicitly namespaced.
    for (const [typeName, node] of defs.objects.entries()) {
      const systemKey = inferSystemKey(typeName, fileBase);
      if (!systems.has(systemKey)) {
        systems.set(systemKey, {
          objects: new Map(),
          interfaces: new Map(),
          unions: new Map(),
          enums: new Map(),
          inputs: new Map(),
          scalars: new Map(),
          directives: new Map(),
          roots: new Map(),
        });
        systemSources.set(systemKey, new Set());
      }
      const target = systems.get(systemKey);
      // merge directives from the file into the system too
      for (const [dn, dnode] of defs.directives.entries()) {
        target.directives.set(dn, dnode);
      }
      // merge other defs conservatively under same systemKey as fileBase
      // but first add the object itself
      target.objects.set(typeName, node);
      systemSources.get(systemKey).add(path.relative(projectRoot, file));
    }

    // For other definition kinds, place them under the fileBase-derived system
    const fallbackSystemKey = fileBase.toLowerCase();
    if (!systems.has(fallbackSystemKey)) {
      systems.set(fallbackSystemKey, {
        objects: new Map(),
        interfaces: new Map(),
        unions: new Map(),
        enums: new Map(),
        inputs: new Map(),
        scalars: new Map(),
        directives: new Map(),
        roots: new Map(),
      });
      systemSources.set(fallbackSystemKey, new Set());
    }
    const fallbackTarget = systems.get(fallbackSystemKey);
    for (const [name, node] of defs.interfaces.entries()) fallbackTarget.interfaces.set(name, node);
    for (const [name, node] of defs.unions.entries()) fallbackTarget.unions.set(name, node);
    for (const [name, node] of defs.enums.entries()) fallbackTarget.enums.set(name, node);
    for (const [name, node] of defs.inputs.entries()) fallbackTarget.inputs.set(name, node);
    for (const [name, node] of defs.scalars.entries()) fallbackTarget.scalars.set(name, node);
    for (const [name, node] of defs.directives.entries()) fallbackTarget.directives.set(name, node);
    systemSources.get(fallbackSystemKey).add(path.relative(projectRoot, file));
  }

  if (systems.size === 0) {
    console.warn("No system definitions extracted. Nothing to write.");
    return;
  }

  const outBase = opts.out
    ? path.join(projectRoot, opts.out)
    : path.join(projectRoot, "generated-schemas", "subgraphs");
  const publicBase = path.join(projectRoot, "public", "data", "generated", "subgraphs");

  await ensureDir(outBase);
  if (!opts.noPublic) await ensureDir(publicBase);

  // For each system, assemble SDL and write files.
  for (const [systemKey, maps] of systems.entries()) {
    // Strip built-in federation directive definitions from generated subgraphs.
    // The composition/join machinery will provide canonical directive definitions,
    // so keep subgraphs free of duplicated federation directive declarations that
    // would otherwise conflict during composition.
    const builtinFederationDirectives = new Set([
      "requires",
      "provides",
      "key",
      "external",
      "shareable",
      "override",
      "inaccessible",
      // keep other framework-specific directives out of generated subgraphs if present
    ]);

    for (const dn of Array.from(maps.directives.keys())) {
      if (builtinFederationDirectives.has(dn)) {
        maps.directives.delete(dn);
      }
    }

    // Remove any scalar shim for _FieldSet / join__FieldSet so the composition
    // tool supplies the canonical scalar definition.
    if (maps.scalars.has("join__FieldSet")) maps.scalars.delete("join__FieldSet");
    if (maps.scalars.has("_FieldSet")) maps.scalars.delete("_FieldSet");

    // Compose definitions array
    const definitions = mergeDefinitions(maps, /* includeRoots */ false);

    // If there isn't a root Query present and there is exactly one object type that looks like a root,
    // optionally create a tiny Query exposing the main object so composition tools can parse a schema.
    // We avoid inventing fields for complex cases; keep it minimal.
    let includeQuery = false;
    if (maps.objects.size === 1 && !maps.roots.has("Query")) {
      includeQuery = true;
    }

    if (includeQuery) {
      // pick the single object type name
      const [singleName] = maps.objects.keys();
      const querySDL = `type Query { ${systemKey}Contract: ${singleName} }`;
      try {
        const qAST = parse(querySDL, { noLocation: true });
        for (const d of qAST.definitions) definitions.push(d);
      } catch (err) {
        // if parse fails, skip adding the artificial Query
      }
    }

    const doc = {
      kind: "Document",
      definitions,
    };

    const header = buildHeader(Array.from(systemSources.get(systemKey) || []));
    const body = print(doc);

    const content = header + body + "\n";

    const outPath = path.join(outBase, `${systemKey}.graphql`);
    try {
      await fs.writeFile(outPath, content, "utf8");
      console.log(`Wrote canonical subgraph: ${path.relative(projectRoot, outPath)}`);
    } catch (err) {
      console.error(`Failed to write ${outPath}:`, err && err.message ? err.message : String(err));
    }

    if (!opts.noPublic) {
      const pubPath = path.join(publicBase, `${systemKey}.graphql`);
      try {
        await ensureDir(path.dirname(pubPath));
        await fs.writeFile(pubPath, content, "utf8");
        console.log(`Wrote public copy: ${path.relative(projectRoot, pubPath)}`);
      } catch (err) {
        console.error(
          `Failed to write ${pubPath}:`,
          err && err.message ? err.message : String(err)
        );
      }
    }
  }

  // Best-effort: format generated canonical subgraphs with Prettier so CI/prettier checks
  // don't fail due to unformatted generated files. This is non-fatal.
  try {
    // Prefer pnpm exec if available, otherwise use npx
    const hasPnpm = spawnSync("pnpm", ["-v"], { stdio: "ignore" }).status === 0;
    const runner = hasPnpm ? "pnpm" : "npx";
    const args = hasPnpm
      ? [
          "exec",
          "prettier",
          "--write",
          "generated-schemas/subgraphs/*.graphql",
          "public/data/generated/subgraphs/*.graphql",
        ]
      : [
          "prettier",
          "--write",
          "generated-schemas/subgraphs/*.graphql",
          "public/data/generated/subgraphs/*.graphql",
        ];

    // Invoke Prettier (glob patterns passed directly to prettier; prettier supports globs)
    const res = spawnSync(runner, args, { cwd: projectRoot, stdio: "inherit" });
    if (res && res.status !== 0) {
      // Non-fatal — just warn in logs
      // eslint-disable-next-line no-console
      console.warn("Prettier formatting of generated subgraphs exited with non-zero status");
    }
  } catch (err) {
    // Non-fatal: continue without failing generation
    // eslint-disable-next-line no-console
    console.warn(
      "Prettier formatting of generated subgraphs failed (non-fatal):",
      err && err.message ? err.message : err
    );
  }

  console.log("Canonical subgraph generation complete.");
}

// run when invoked directly
if (
  import.meta.url === `file://${process.argv[1]}` ||
  (process.argv[1] && process.argv[1].endsWith("generate-canonical-subgraphs.mjs"))
) {
  main().catch(err => {
    console.error("Unexpected error:", err && err.stack ? err.stack : String(err));
    process.exit(1);
  });
}
