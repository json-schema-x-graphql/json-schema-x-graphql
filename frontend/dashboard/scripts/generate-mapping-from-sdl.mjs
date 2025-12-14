#!/usr/bin/env node

/**
 * scripts/generate-mapping-from-sdl.mjs
 *
 * Read GraphQL SDL files with @mapFrom(path: "...") directives and emit
 * JSON mapping files where each GraphQL field maps to the literal path string.
 *
 * Writes outputs to:
 *  - generated-schemas/examples/{basename}.json
 *  - public/data/generated/examples/{basename}.json
 *
 * Usage:
 *   node scripts/generate-mapping-from-sdl.mjs
 *
 * Optional flags:
 *   --dirs=dir1,dir2    Comma-separated list of directories to scan for SDL files.
 *                       Defaults to: src/graphql/subgraphs,scripts/graphql-subgraphs,scripts
 *
 * Notes:
 * - If an SDL file defines multiple object types (excluding Query/Mutation/Subscription),
 *   the script will produce separate outputs named:
 *     {basename}__{TypeName}.json
 *
 * - Only fields annotated with @mapFrom(path: "string") are included in the output mapping.
 *
 * - The script is defensive: it will skip directories that don't exist and continue.
 */
import fs from "fs/promises";
import { parse, visit, Kind } from "graphql";
import path from "path";

const projectRoot = process.cwd();

function usage() {
  console.log("");
  console.log("generate-mapping-from-sdl.mjs");
  console.log("");
  console.log('Scans GraphQL SDL files and extracts @mapFrom(path: "...") directives');
  console.log("to produce JSON mappings for visualization/consumption.");
  console.log("");
  console.log("Usage:");
  console.log("  node scripts/generate-mapping-from-sdl.mjs [--dirs=dir1,dir2]");
  console.log("");
  console.log("Default directories:");
  console.log("  src/graphql/subgraphs, scripts/graphql-subgraphs, scripts");
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
 * Extract mappings from SDL text.
 * Returns a map: { TypeName: { fieldName: pathString, ... }, ... }
 */
function extractMappingsFromSDL(sdlText) {
  const ast = parse(sdlText, { noLocation: true });
  const mappings = {};

  visit(ast, {
    enter(node) {
      if (node.kind === Kind.OBJECT_TYPE_DEFINITION && node.name && node.name.value) {
        const typeName = node.name.value;
        // skip schema root types
        if (typeName === "Query" || typeName === "Mutation" || typeName === "Subscription") {
          return;
        }
        if (!node.fields || node.fields.length === 0) return;
        const fieldMap = {};
        for (const f of node.fields) {
          const fieldName = f.name && f.name.value;
          if (!fieldName) continue;
          let mapFromPath = null;
          if (f.directives && f.directives.length) {
            for (const d of f.directives) {
              if (d.name && d.name.value === "mapFrom") {
                // find argument 'path'
                const arg = (d.arguments || []).find(a => a.name && a.name.value === "path");
                if (arg && arg.value) {
                  // only handle literal string for now
                  if (arg.value.kind === Kind.STRING) {
                    mapFromPath = arg.value.value;
                  } else {
                    // If it's not a string literal, try to stringify the AST value (best-effort)
                    try {
                      mapFromPath = String(arg.value.value ?? null);
                    } catch {
                      mapFromPath = null;
                    }
                  }
                }
              }
            }
          }
          if (mapFromPath !== null && mapFromPath !== undefined) {
            fieldMap[fieldName] = mapFromPath;
          }
        }
        if (Object.keys(fieldMap).length > 0) {
          mappings[typeName] = fieldMap;
        }
      }
    },
  });

  return mappings;
}

async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    // ignore EEXIST races
  }
}

async function writeOutputFile(basename, jsonObj) {
  const legacyDir = path.join(projectRoot, "generated-schemas", "examples");
  const publicDir = path.join(projectRoot, "public", "data", "generated", "examples");

  await ensureDir(legacyDir);
  await ensureDir(publicDir);

  const legacyPath = path.join(legacyDir, `${basename}.json`);
  const publicPath = path.join(publicDir, `${basename}.json`);

  const content = JSON.stringify(jsonObj, null, 2) + "\n";
  await fs.writeFile(legacyPath, content, "utf8");
  await fs.writeFile(publicPath, content, "utf8");

  console.log(`Wrote ${legacyPath}`);
  console.log(`Wrote ${publicPath}`);
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

  for (const file of sdlFiles) {
    try {
      const txt = await fs.readFile(file, "utf8");
      const mappings = extractMappingsFromSDL(txt);
      const typeNames = Object.keys(mappings);
      if (typeNames.length === 0) {
        console.log(
          `No @mapFrom directives found in ${path.relative(projectRoot, file)} - skipping.`
        );
        continue;
      }

      const base = path.basename(file).replace(/\.(gql|graphql)$/, "");

      // Aggregate mappings into a single system-level JSON per system.
      // Derive a system key from the GraphQL type name by taking the prefix
      // before the first underscore (e.g. 'Contract Data_Contract' -> 'contract_data'). If a type
      // does not include an underscore, fall back to the file base name.
      const systemAggregates = {};
      for (const t of typeNames) {
        const obj = mappings[t];
        // determine system key
        let systemKey = base.toLowerCase();
        if (t && t.includes("_")) {
          systemKey = t.split("_")[0].toLowerCase();
        } else if (t) {
          // try to infer common prefix from type name (non-underscore)
          systemKey = t.toLowerCase();
        }

        if (!systemAggregates[systemKey]) {
          systemAggregates[systemKey] = {};
        }

        // merge fields for the system (later types override earlier ones on key collisions)
        systemAggregates[systemKey] = {
          ...systemAggregates[systemKey],
          ...obj,
        };
      }

      // Write one JSON file per system (e.g. public/data/generated/examples/contract_data.json)
      for (const [systemKey, mapObj] of Object.entries(systemAggregates)) {
        await writeOutputFile(systemKey, mapObj);
      }
    } catch (err) {
      console.error(`Failed to process ${file}:`, err && err.message ? err.message : String(err));
    }
  }

  console.log("Mapping generation complete.");
}

// run
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1].endsWith("generate-mapping-from-sdl.mjs")
) {
  main().catch(err => {
    console.error("Unexpected error:", err);
    process.exit(1);
  });
}
