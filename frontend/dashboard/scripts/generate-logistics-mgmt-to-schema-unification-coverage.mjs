#!/usr/bin/env node
/**
 * scripts/generate-logistics_mgmt-to-schema_unification-coverage.mjs
 *
 * Add coverage report generator comparing Logistics Mgmt vs Schema Unification mapping.
 *
 * This script compares fields in the Logistics Mgmt (PRISM) JSON Schema against the
 * Schema Unification canonical JSON Schema and produces a coverage report indicating:
 *  - Total Logistics Mgmt fields discovered (flattened)
 *  - How many Logistics Mgmt fields have a potential match in Schema Unification (by heuristic)
 *  - How many Logistics Mgmt fields are explicitly mapped via a provided mapping file
 *  - Per-type breakdown of coverage
 *  - CSV row-level details
 *
 * Usage:
 *   node scripts/generate-logistics_mgmt-to-schema_unification-coverage.mjs \
 *     --logistics_mgmt src/data/logistics_mgmt.schema.json \
 *     --schema_unification src/data/schema_unification.schema.json \
 *     --out generated-schemas/coverage/logistics_mgmt-to-schema_unification-coverage.json \
 *     --csv generated-schemas/coverage/logistics_mgmt-to-schema_unification-coverage.csv \
 *     --md generated-schemas/coverage/logistics_mgmt-to-schema_unification-coverage.md \
 *     [--mapping path/to/mapping.json|yaml]
 *
 * Notes:
 *  - Mapping is optional. If provided, it should be a JSON or simple YAML file
 *    mapping fully-qualified Logistics Mgmt paths to Schema Unification paths. Example:
 *      {
 *        "Solicitation.solicitation_number": "Contract.common_elements.contract_identification.piid",
 *        "Requisition.requisition_number": "Contract.common_elements.contract_identification.referenced_piid"
 *      }
 *    For YAML, a minimal subset is supported:
 *      Solicitation.solicitation_number: Contract.common_elements.contract_identification.piid
 *  - Heuristic matching falls back to normalized leaf property names (remove underscores, lowercase).
 *  - Output directories will be created if absent.
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

/* -------------------------------------------------------------------------- */
/* CLI                                                                        */
/* -------------------------------------------------------------------------- */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    logistics_mgmt: path.join(repoRoot, "src", "data", "logistics_mgmt.schema.json"),
    schema_unification: path.join(repoRoot, "src", "data", "schema_unification.schema.json"),
    out: path.join(repoRoot, "generated-schemas", "coverage", "logistics_mgmt-to-schema_unification-coverage.json"),
    csv: path.join(repoRoot, "generated-schemas", "coverage", "logistics_mgmt-to-schema_unification-coverage.csv"),
    md: path.join(repoRoot, "generated-schemas", "coverage", "logistics_mgmt-to-schema_unification-coverage.md"),
    mapping: null,
    verbose: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--logistics_mgmt" && argv[i + 1]) args.logistics_mgmt = toAbs(argv[++i]);
    else if (a === "--schema_unification" && argv[i + 1]) args.schema_unification = toAbs(argv[++i]);
    else if (a === "--out" && argv[i + 1]) args.out = toAbs(argv[++i]);
    else if (a === "--csv" && argv[i + 1]) args.csv = toAbs(argv[++i]);
    else if (a === "--md" && argv[i + 1]) args.md = toAbs(argv[++i]);
    else if (a === "--mapping" && argv[i + 1]) args.mapping = toAbs(argv[++i]);
    else if (a === "--verbose") args.verbose = true;
  }
  return args;
}

function toAbs(p) {
  if (!p) return p;
  return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
}

/* -------------------------------------------------------------------------- */
/* FS Helpers                                                                 */
/* -------------------------------------------------------------------------- */

async function readJson(file) {
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw);
}

// Minimal YAML parser for simple "key: value" maps (single line values only).
// This is not a full YAML parser; it is only intended for flat key-value mappings.
async function readMaybeYamlOrJson(file) {
  const raw = await fs.readFile(file, "utf8");
  const trimmed = raw.trim();
  if (!trimmed) return {};
  // JSON?
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // fallthrough to naive YAML
    }
  }
  // Very naive YAML (key: value per line, ignore comments, no nesting)
  const map = {};
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const ln = line.trim();
    if (!ln || ln.startsWith("#")) continue;
    const idx = ln.indexOf(":");
    if (idx === -1) continue;
    const k = ln.slice(0, idx).trim();
    let v = ln.slice(idx + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
    if (k) map[k] = v;
  }
  return map;
}

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

/* -------------------------------------------------------------------------- */
/* Schema Traversal                                                           */
/* -------------------------------------------------------------------------- */

function isObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function getDefinitions(schema) {
  return schema?.$defs || schema?.definitions || {};
}

// Collect flattened paths of all leaf fields in a type definition.
// Returns an object:
//  { fields: Set<string>, fullPaths: Set<string> }
// where fields is set of leaf property names and fullPaths are Type.path.subpath.
function collectTypeFields(typeName, def, schema, seen = new Set()) {
  const fields = new Set();
  const fullPaths = new Set();

  function visit(node, prefixPath = []) {
    if (!node || typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);

    if (node.$ref && typeof node.$ref === "string") {
      const resolved = resolveRef(schema, node.$ref);
      if (resolved && resolved.def) {
        visit(resolved.def, prefixPath);
      }
      return;
    }

    // If node has properties, walk into them; otherwise treat as a leaf
    const props = node.properties && typeof node.properties === "object" ? node.properties : null;
    if (!props) {
      const leafField = prefixPath[prefixPath.length - 1];
      if (leafField) {
        fields.add(String(leafField));
        fullPaths.add([typeName, ...prefixPath].join("."));
      }
      return;
    }

    // For arrays, recurse into items as structure
    if (node.type === "array" && node.items) {
      visit(node.items, prefixPath);
    }

    for (const [propName, propDef] of Object.entries(props)) {
      // Step into arrays, refs, or nested objects
      if (propDef && propDef.$ref) {
        const r = resolveRef(schema, propDef.$ref);
        if (r && r.def) {
          visit(r.def, [...prefixPath, propName]);
        } else {
          fields.add(propName);
          fullPaths.add([typeName, ...prefixPath, propName].join("."));
        }
        continue;
      }

      if (propDef && propDef.type === "array" && propDef.items) {
        const items = propDef.items;
        if (items.$ref) {
          const rr = resolveRef(schema, items.$ref);
          if (rr && rr.def) {
            visit(rr.def, [...prefixPath, propName]);
          } else {
            fields.add(propName);
            fullPaths.add([typeName, ...prefixPath, propName].join("."));
          }
        } else if (items.properties || items.type === "object") {
          visit(items, [...prefixPath, propName]);
        } else {
          // primitive items: treat property as leaf
          fields.add(propName);
          fullPaths.add([typeName, ...prefixPath, propName].join("."));
        }
        continue;
      }

      if (propDef && (propDef.properties || propDef.type === "object")) {
        visit(propDef, [...prefixPath, propName]);
      } else {
        fields.add(propName);
        fullPaths.add([typeName, ...prefixPath, propName].join("."));
      }
    }
  }

  visit(def, []);
  return { fields, fullPaths };
}

function resolveRef(schema, ref) {
  const refStr = String(ref || "");
  const hash = refStr.startsWith("#/") ? refStr.slice(2) : refStr.replace(/^#/, "");
  const parts = hash.split("/").filter(Boolean);
  if (!parts.length) return null;
  let node = schema;
  for (const p of parts) {
    if (!node || typeof node !== "object") return null;
    node = node[p];
  }
  return { def: node, ref: refStr };
}

// Gather all type defs and fields for a schema
function collectSchemaFields(schema) {
  const defs = getDefinitions(schema);
  const typeMap = new Map(); // typeName -> { fields:Set, fullPaths:Set }

  for (const [defKey, defVal] of Object.entries(defs)) {
    if (!isObject(defVal)) continue;
    const typeName = defVal["x-graphql-type-name"] || defKey;
    if (defVal.type === "object" || defVal.properties || defVal.$ref) {
      const res = collectTypeFields(typeName, defVal, schema);
      typeMap.set(typeName, res);
    }
  }
  return typeMap;
}

/* -------------------------------------------------------------------------- */
/* Matching                                                                   */
/* -------------------------------------------------------------------------- */

function normalizeName(name) {
  return String(name || "").toLowerCase().replace(/[_\W]+/g, "");
}

function buildGlobalLeafIndex(typeMap) {
  const byNormalized = new Map(); // normalizedLeaf -> Set(fullPath)
  for (const [typeName, { fullPaths }] of typeMap.entries()) {
    for (const full of fullPaths) {
      const parts = full.split(".");
      const leaf = parts[parts.length - 1];
      const norm = normalizeName(leaf);
      if (!byNormalized.has(norm)) byNormalized.set(norm, new Set());
      byNormalized.get(norm).add(full);
    }
  }
  return byNormalized;
}

function analyzeCoverage(logistics_mgmtTypes, schema_unificationTypes, explicitMapping = {}) {
  const schema_unificationIndex = buildGlobalLeafIndex(schema_unificationTypes);
  const summary = {
    totals: {
      logistics_mgmtTypes: logistics_mgmtTypes.size,
      schema_unificationTypes: schema_unificationTypes.size,
      logistics_mgmtFields: 0,
      mappedExplicit: 0,
      matchedHeuristic: 0,
      unmatched: 0,
    },
    perType: {}, // type -> { total, mappedExplicit, matchedHeuristic, unmatched }
    rows: [], // detailed rows for CSV
  };

  // Build quick lookup for explicit mapping keys
  const explicitMap = new Map(Object.entries(explicitMapping || {})); // CalmPath -> Schema UnificationPath

  for (const [typeName, { fullPaths }] of logistics_mgmtTypes.entries()) {
    const typeStats = { total: 0, mappedExplicit: 0, matchedHeuristic: 0, unmatched: 0 };
    for (const logistics_mgmtPath of fullPaths) {
      const row = {
        logistics_mgmtType: typeName,
        logistics_mgmtPath,
        logistics_mgmtField: logistics_mgmtPath.split(".").slice(-1)[0],
        matchedBy: "no",
        targetType: "",
        targetPath: "",
      };

      summary.totals.logistics_mgmtFields++;
      typeStats.total++;

      // Explicit mapping?
      if (explicitMap.has(logistics_mgmtPath)) {
        const mapped = explicitMap.get(logistics_mgmtPath);
        row.matchedBy = "mapping";
        row.targetPath = mapped;
        row.targetType = mapped.split(".")[0] || "";
        summary.totals.mappedExplicit++;
        typeStats.mappedExplicit++;
        summary.rows.push(row);
        continue;
      }

      // Heuristic leaf-name match
      const leaf = logistics_mgmtPath.split(".").slice(-1)[0];
      const norm = normalizeName(leaf);
      const candidates = schema_unificationIndex.get(norm);
      if (candidates && candidates.size) {
        const first = Array.from(candidates)[0];
        row.matchedBy = "heuristic";
        row.targetPath = first;
        row.targetType = first.split(".")[0] || "";
        summary.totals.matchedHeuristic++;
        typeStats.matchedHeuristic++;
      } else {
        summary.totals.unmatched++;
        typeStats.unmatched++;
      }

      summary.rows.push(row);
    }
    summary.perType[typeName] = typeStats;
  }

  return summary;
}

/* -------------------------------------------------------------------------- */
/* Report Writers                                                             */
/* -------------------------------------------------------------------------- */

function toCsv(rows) {
  const headers = [
    "logistics_mgmtType",
    "logistics_mgmtPath",
    "logistics_mgmtField",
    "matchedBy",
    "targetType",
    "targetPath",
  ];
  const out = [headers.join(",")];
  for (const r of rows) {
    const vals = headers.map(h => csvEscape(r[h]));
    out.push(vals.join(","));
  }
  return out.join("\n") + "\n";
}

function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toMarkdown(summary) {
  const lines = [];
  lines.push("# Logistics Mgmt → Schema Unification Coverage Report");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Logistics Mgmt types: ${summary.totals.logistics_mgmtTypes}`);
  lines.push(`- Schema Unification types: ${summary.totals.schema_unificationTypes}`);
  lines.push(`- Logistics Mgmt fields: ${summary.totals.logistics_mgmtFields}`);
  lines.push(`- Explicitly mapped: ${summary.totals.mappedExplicit}`);
  lines.push(`- Heuristic matched: ${summary.totals.matchedHeuristic}`);
  lines.push(`- Unmatched: ${summary.totals.unmatched}`);
  lines.push("");
  lines.push("## Per-type Coverage");
  lines.push("");
  lines.push("| Type | Total | Explicit | Heuristic | Unmatched | Coverage % |");
  lines.push("|------|------:|---------:|----------:|----------:|-----------:|");
  for (const [type, stats] of Object.entries(summary.perType)) {
    const covered = stats.mappedExplicit + stats.matchedHeuristic;
    const pct = stats.total ? ((covered / stats.total) * 100).toFixed(1) : "0.0";
    lines.push(
      `| ${type} | ${stats.total} | ${stats.mappedExplicit} | ${stats.matchedHeuristic} | ${stats.unmatched} | ${pct}% |`
    );
  }
  lines.push("");
  lines.push("> Coverage % = (Explicit + Heuristic) / Total * 100");
  return lines.join("\n") + "\n";
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

async function main() {
  const args = parseArgs();

  if (args.verbose) {
    console.log("Logistics Mgmt → Schema Unification Coverage");
    console.log("  Logistics Mgmt:       ", path.relative(repoRoot, args.logistics_mgmt));
    console.log("  Schema Unification:  ", path.relative(repoRoot, args.schema_unification));
    if (args.mapping) console.log("  Mapping:    ", path.relative(repoRoot, args.mapping));
    console.log("  JSON out:   ", path.relative(repoRoot, args.out));
    console.log("  CSV out:    ", path.relative(repoRoot, args.csv));
    console.log("  MD out:     ", path.relative(repoRoot, args.md));
  }

  // Load schemas
  const logistics_mgmtSchema = await readJson(args.logistics_mgmt);
  const schema_unificationSchema = await readJson(args.schema_unification);

  // Collect fields
  const logistics_mgmtTypes = collectSchemaFields(logistics_mgmtSchema);
  const schema_unificationTypes = collectSchemaFields(schema_unificationSchema);

  // Load explicit mapping if provided
  let explicitMapping = {};
  if (args.mapping) {
    try {
      explicitMapping = await readMaybeYamlOrJson(args.mapping);
      if (args.verbose) {
        console.log(`Loaded mapping entries: ${Object.keys(explicitMapping).length}`);
      }
    } catch (e) {
      console.warn(`Warning: failed to load mapping file '${args.mapping}': ${e.message}`);
    }
  }

  // Analyze coverage
  const summary = analyzeCoverage(logistics_mgmtTypes, schema_unificationTypes, explicitMapping);

  // Write outputs
  await ensureDir(args.out);
  await fs.writeFile(args.out, JSON.stringify(summary, null, 2) + "\n", "utf8");

  await ensureDir(args.csv);
  await fs.writeFile(args.csv, toCsv(summary.rows), "utf8");

  await ensureDir(args.md);
  await fs.writeFile(args.md, toMarkdown(summary), "utf8");

  if (args.verbose) {
    console.log("Completed.");
    console.log(
      `  Coverage: ${summary.totals.mappedExplicit + summary.totals.matchedHeuristic}/${
        summary.totals.logistics_mgmtFields
      } (${((summary.totals.mappedExplicit + summary.totals.matchedHeuristic) /
        Math.max(summary.totals.logistics_mgmtFields, 1)) *
        100}%)`
    );
  }

  // Also return data for programmatic use (if imported)
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error("Error:", err?.stack || String(err));
    process.exit(1);
  });
}

export { main, collectSchemaFields, analyzeCoverage }
