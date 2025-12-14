#!/usr/bin/env node

/**
 * scripts/generate-unified_model-views.mjs
 *
 * Generate Unified Model JSON Schema and (optional) GraphQL SDL "views" side-by-side with the canonical model,
 * using a declarative mapping file that translates canonical snake_case paths to Unified Model dot paths.
 *
 * Inputs:
 *  - canonical JSON Schema (default: src/data/schema_unification.schema.json)
 *  - mapping file (default: resources/USASPENDING/canonical-to-unified_model.json)
 *
 * Outputs (side-by-side, non-destructive):
 *  - generated-schemas/unified_model/unified_model.schema.json
 *  - generated-schemas/unified_model/mapping-resolved.json
 *  - generated-schemas/unified_model/sdl/unified_model.graphql (unless --no-sdl)
 *
 * CLI:
 *  node scripts/generate-unified_model-views.mjs \
 *    [--schema src/data/schema_unification.schema.json] \
 *    [--mapping resources/USASPENDING/canonical-to-unified_model.json] \
 *    [--out generated-schemas/unified_model] \
 *    [--no-sdl] \
 *    [--verbose]
 *
 * Notes:
 *  - This script attempts to infer types for Unified Model leaves by looking up the canonical schema nodes for
 *    the provided canonical_path. Ambiguities are recorded into diagnostics.
 *  - SDL generation is best-effort and creates nested GraphQL types mirroring the Unified Model property tree.
 *  - Transform semantics are captured in the mapping-resolved.json; they are not applied to shape,
 *    only recorded for downstream ETL implementations.
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Optional: transforms registry (non-fatal if not present)
let transformsLib = null;
try {
  transformsLib = await import("./transforms/index.mjs");
} catch {
  // Keep null; we operate without transform execution here
}

/* -------------------------------------------------------------------------- */
/* CLI                                                                        */
/* -------------------------------------------------------------------------- */

function parseArgs(argv = process.argv.slice(2)) {
  const opts = {
    schema: "src/data/schema_unification.schema.json",
    mapping: "resources/USASPENDING/canonical-to-unified_model.json",
    out: "generated-schemas/unified_model",
    noSDL: false,
    verbose: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--schema" && argv[i + 1]) opts.schema = argv[++i];
    else if (a === "--mapping" && argv[i + 1]) opts.mapping = argv[++i];
    else if (a === "--out" && argv[i + 1]) opts.out = argv[++i];
    else if (a === "--no-sdl") opts.noSDL = true;
    else if (a === "--verbose") opts.verbose = true;
  }
  return opts;
}

/* -------------------------------------------------------------------------- */
/* Paths & IO                                                                  */
/* -------------------------------------------------------------------------- */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

async function readJson(relativeOrAbsolutePath) {
  const full = path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(repoRoot, relativeOrAbsolutePath);
  const raw = await fs.readFile(full, "utf8");
  return JSON.parse(raw);
}

async function writeJson(relativeOrAbsolutePath, value) {
  const full = path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(repoRoot, relativeOrAbsolutePath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, JSON.stringify(value, null, 2), "utf8");
  return full;
}

async function writeText(relativeOrAbsolutePath, text) {
  const full = path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(repoRoot, relativeOrAbsolutePath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, String(text), "utf8");
  return full;
}

/* -------------------------------------------------------------------------- */
/* Canonical schema traversal                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Resolve a canonical JSON Schema node by a "dot path" that may contain [] to indicate arrays.
 * Assumes canonical schema uses "type: object" with "properties" and "type: array" with "items".
 * Returns { node, found, trail } where node is the final schema node (if found).
 */
function resolveCanonicalNode(canonicalSchema, canonicalPath) {
  const out = { node: null, found: false, trail: [] };
  if (!canonicalSchema || typeof canonicalSchema !== "object" || !canonicalPath) return out;

  // Resolve a JSON Pointer like "#/$defs/foo/properties/bar"
  function getByJsonPointer(root, ref) {
    if (typeof ref !== "string" || !ref.startsWith("#/")) return null;
    const parts = ref
      .slice(2)
      .split("/")
      .map(p => p.replace(/~1/g, "/").replace(/~0/g, "~")); // unescape per JSON Pointer
    let cur = root;
    for (const p of parts) {
      if (cur && typeof cur === "object" && Object.prototype.hasOwnProperty.call(cur, p)) {
        cur = cur[p];
      } else {
        return null;
      }
    }
    return cur;
  }

  // Unwrap node by following $ref and (allOf|all_of) chains until a concrete node
  function unwrapNode(node) {
    let cur = node;
    const seen = new Set();
    while (cur && typeof cur === "object") {
      // Prevent cycles
      const sig = JSON.stringify(cur.$ref ? { $ref: cur.$ref } : cur);
      if (seen.has(sig)) break;
      seen.add(sig);

      // Follow $ref
      if (typeof cur.$ref === "string" && cur.$ref.startsWith("#/")) {
        const resolved = getByJsonPointer(canonicalSchema, cur.$ref);
        if (!resolved) break;
        cur = resolved;
        continue;
      }

      // Handle allOf / all_of by selecting the first sub-schema with properties or $ref
      const allOf = Array.isArray(cur.allOf)
        ? cur.allOf
        : Array.isArray(cur.all_of)
          ? cur.all_of
          : null;
      if (allOf && allOf.length) {
        const candidate = allOf.find(s => s && (s.properties || s.$ref || s.items)) || allOf[0];
        if (candidate) {
          cur = unwrapNode(candidate) || candidate;
          continue;
        }
      }

      break;
    }
    return cur || node;
  }

  const parts = String(canonicalPath).split(".");
  let node = canonicalSchema;
  node = unwrapNode(node);

  for (let i = 0; i < parts.length; i++) {
    const raw = parts[i];
    const isArrayMarker = raw.endsWith("[]");
    const key = isArrayMarker ? raw.slice(0, -2) : raw;

    // Always unwrap current node before descending
    node = unwrapNode(node);

    // descend into properties
    if (
      node &&
      node.type === "object" &&
      node.properties &&
      Object.prototype.hasOwnProperty.call(node.properties, key)
    ) {
      node = node.properties[key];
      out.trail.push({ type: "property", key });
      node = unwrapNode(node);
    } else if (
      node &&
      (node.definitions || node.$defs) &&
      (node.definitions?.[key] || node.$defs?.[key])
    ) {
      node = node.definitions?.[key] || node.$defs?.[key];
      out.trail.push({ type: "def", key });
      node = unwrapNode(node);
    } else {
      // If current node is array (or becomes array after unwrap) and next segment is inside items
      if (node) {
        node = unwrapNode(node);
      }
      if (node && node.type === "array" && node.items) {
        node = node.items;
        out.trail.push({ type: "items" });
        node = unwrapNode(node);
        // re-try the same key in the items object
        if (
          node &&
          node.type === "object" &&
          node.properties &&
          Object.prototype.hasOwnProperty.call(node.properties, key)
        ) {
          node = node.properties[key];
          out.trail.push({ type: "property", key });
          node = unwrapNode(node);
        } else {
          return out;
        }
      } else {
        return out;
      }
    }

    // Handle array marker: move into items
    if (isArrayMarker) {
      node = unwrapNode(node);
      if (node && node.type === "array" && node.items) {
        node = node.items;
        out.trail.push({ type: "items" });
        node = unwrapNode(node);
      } else if (node && node.type !== "array") {
        // path expects array but node is not array
        return out;
      }
    }
  }

  node = unwrapNode(node);
  out.node = node || null;
  out.found = !!node;
  return out;
}

/**
 * Infer a GraphQL scalar name from a JSON Schema type/format.
 * Used later during SDL generation.
 */
function inferGraphQLScalarFromJSONSchema(node) {
  if (!node || typeof node !== "object") return "String";
  const t = node.type;
  const format = node.format;

  if (Array.isArray(t)) {
    // remove null to infer main type
    const types = t.filter(x => x !== "null");
    if (types.length === 1) return inferGraphQLScalarFromJSONSchema({ type: types[0], format });
    // fallback
    return "JSON";
  }

  switch (t) {
    case "string":
      if (format === "date-time") return "DateTime";
      if (format === "date") return "Date";
      if (format === "email") return "Email";
      if (format === "uri" || format === "url") return "URI";
      // decimal semantics: if hinted via x-original-type or pattern, could map to Decimal
      if (node["x-original-type"] === "number" || node["x-graphql-scalar"] === "Decimal")
        return "Decimal";
      return "String";
    case "integer":
      return "Int";
    case "number":
      // prefer Decimal as a safer scalar for money/precision
      return "Decimal";
    case "boolean":
      return "Boolean";
    case "array":
      return null; // handled by caller (as list)
    case "object":
      return null; // handled by caller (as nested type/JSON)
    default:
      return "String";
  }
}

/**
 * Build (or reuse) a nested node inside a target JSON Schema object for a given unified_model path.
 * Returns the leaf container node and the final key info.
 */
function ensureGsdmContainer(root, unified_modelPath) {
  const parts = String(unified_modelPath).split(".");
  let cur = root;
  for (let i = 0; i < parts.length; i++) {
    const raw = parts[i];
    const isArray = raw.endsWith("[]");
    const key = isArray ? raw.slice(0, -2) : raw;
    const isLeaf = i === parts.length - 1;

    // ensure object container
    if (!cur.properties) {
      cur.type = "object";
      cur.properties = {};
    }

    if (!cur.properties[key]) {
      // If leaf and array, create array schema; otherwise create object
      if (isArray) {
        cur.properties[key] = { type: "array", items: { type: "object", properties: {} } };
      } else {
        cur.properties[key] = { type: "object", properties: {} };
      }
    }

    // advance
    cur = cur.properties[key];

    // If array, descend into items for next level
    if (isArray && !isLeaf) {
      if (!cur.items) cur.items = { type: "object", properties: {} };
      cur = cur.items;
    }
  }
  return cur;
}

/* -------------------------------------------------------------------------- */
/* Unified Model JSON Schema construction                                              */
/* -------------------------------------------------------------------------- */

function normalizeTransformSpec(t) {
  if (t == null) return [];
  if (Array.isArray(t)) return t;
  if (typeof t === "string") return [{ name: t }];
  if (typeof t === "object" && typeof t.name === "string") return [t];
  return [];
}

/**
 * Merge type information into a Unified Model leaf node, based on canonical node.
 * This preserves existing structure and adds minimal typing.
 */
function mergeLeafTypeFromCanonical(leafNode, canonicalNode) {
  if (!canonicalNode || typeof canonicalNode !== "object") {
    // fallback to string
  } else {
    // Use canonical type; simplify union with null
    const t = Array.isArray(canonicalNode.type)
      ? canonicalNode.type.filter(x => x !== "null")
      : canonicalNode.type;

    if (t === "array") {
      // If canonical leaf is array, prefer array-of-strings unless item types are object
      leafNode.type = "array";
      if (!leafNode.items) leafNode.items = {};
      const itemType = Array.isArray(canonicalNode.items?.type)
        ? canonicalNode.items.type.filter(x => x !== "null")
        : canonicalNode.items?.type;
      if (itemType === "object" || canonicalNode.items?.properties) {
        leafNode.items.type = "object";
        leafNode.items.properties = leafNode.items.properties || {};
      } else if (itemType === "integer") {
        leafNode.items.type = "integer";
      } else if (itemType === "number") {
        leafNode.items.type = "number";
      } else if (itemType === "boolean") {
        leafNode.items.type = "boolean";
      } else {
        leafNode.items.type = "string";
      }
      return;
    }

    if (t === "object" || canonicalNode.properties) {
      // Object leaf: keep as object
      leafNode.type = "object";
      leafNode.properties = leafNode.properties || {};
      return;
    }

    if (t === "integer" || t === "number" || t === "boolean" || t === "string") {
      leafNode.type = t;
      // carry format if present and relevant
      if (canonicalNode.format && t === "string") {
        leafNode.format = canonicalNode.format;
      }
      return;
    }
  }

  // default
  if (!leafNode.type) {
    leafNode.type = "string";
  }
}

/**
 * Build the Unified Model JSON Schema tree from mapping entries and canonical schema.
 * Returns { schema, diagnostics, resolvedMapping }
 */
function buildGsdmSchema(canonicalSchema, mappingDoc) {
  const diagnostics = [];
  const entries = Array.isArray(mappingDoc.entries) ? mappingDoc.entries : [];
  const out = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://example.org/unified_model/schema.json",
    title: "Unified Model View (derived from canonical Schema Unification schema)",
    description:
      "Programmatically generated Unified Model-named view based on canonical schema and mapping entries. For API/documentation convenience. Not authoritative for procurement semantics.",
    type: "object",
    properties: {},
  };

  const resolvedMapping = {
    mapping_version: mappingDoc.mapping_version || "0.0.0",
    generated_at: new Date().toISOString(),
    generated_by: "generate-unified_model-views.mjs",
    entries: [],
  };

  for (const entry of entries) {
    const cPath = entry.canonical_path;
    const gPath = entry.unified_model_path;
    const transforms = normalizeTransformSpec(entry.transform);
    const preserve = entry.preserve === true;

    if (!cPath || !gPath) {
      diagnostics.push({
        level: "warn",
        code: "missing_path",
        msg: `Entry missing path(s)`,
        entry,
      });
      continue;
    }

    // Locate canonical node
    const res = resolveCanonicalNode(canonicalSchema, cPath);
    if (!res.found) {
      diagnostics.push({
        level: "info",
        code: "canonical_not_found",
        msg: `Canonical path not found: ${cPath}`,
      });
    }

    // Ensure Unified Model container; then insert leaf (or update)
    const leaf = ensureGsdmContainer(out, gPath);

    // For a simple leaf, add type inferred from canonical
    mergeLeafTypeFromCanonical(leaf, res.node);

    // Optional: enforce a target type override from mapping entry
    const targetType = typeof entry.target_type === "string" ? entry.target_type : null;
    if (targetType) {
      leaf.type = targetType;
      if (targetType !== "object") delete leaf.properties;
      if (targetType !== "array") delete leaf.items;
      if (targetType !== "string") delete leaf.format;
    }

    // Record resolved mapping with type info (including target_type override if provided)
    const resolved = {
      canonical_path: cPath,
      unified_model_path: gPath,
      // Provide inferred JSON Schema type info
      inferred_type: leaf.type || "string",
      inferred_format: leaf.format || undefined,
      target_type: targetType,
      transforms,
      preserve,
      confidence: entry.confidence || "unspecified",
      description: entry.description || "",
      "x-source-path": entry["x-source-path"] || null,
    };
    resolvedMapping.entries.push(resolved);
  }

  return { schema: out, diagnostics, resolvedMapping };
}

/* -------------------------------------------------------------------------- */
/* GraphQL SDL generation (best-effort)                                       */
/* -------------------------------------------------------------------------- */

function toPascalCase(s) {
  return String(s || "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function toSafeTypeName(parts) {
  const name = parts.map(p => toPascalCase(p)).join("");
  return /^[A-Za-z_]/.test(name) ? name : `T${name}`;
}

function scalarPreludeSDL() {
  return [
    `"""High-precision decimal"""`,
    `scalar Decimal`,
    `"""Arbitrary JSON value"""`,
    `scalar JSON`,
    `"""ISO 8601 date"""`,
    `scalar Date`,
    `"""ISO 8601 date and time"""`,
    `scalar DateTime`,
    `"""Valid email address"""`,
    `scalar Email`,
    `"""Valid URI/URL"""`,
    `scalar URI`,
  ].join("\n");
}

/**
 * Build a nested map of types from the Unified Model JSON Schema.
 * Returns a map: typeName -> { fields: Map<string, { type: string, list?: boolean }>, description? }
 */
function collectTypesFromGsdmSchema(gs) {
  const types = new Map();

  function visit(node, pathParts) {
    // Determine current type name for this node
    const typeName = toSafeTypeName(pathParts.length ? pathParts : ["GsdmRoot"]);

    // Ensure type entry
    if (!types.has(typeName)) {
      types.set(typeName, { fields: new Map(), description: "" });
    }
    const t = types.get(typeName);

    if (!node || typeof node !== "object") return;

    // If node has properties (object)
    if (node.type === "object" && node.properties) {
      for (const [key, child] of Object.entries(node.properties)) {
        const keyParts = [...pathParts, key];
        if (child.type === "object") {
          // nested object -> create/visit a new type
          const nestedTypeName = toSafeTypeName(keyParts);
          t.fields.set(key, { type: nestedTypeName, list: false });
          visit(child, keyParts);
        } else if (child.type === "array") {
          // array: decide scalar or object based on items
          const items = child.items || {};
          if (items.type === "object" || items.properties) {
            const nestedTypeName = toSafeTypeName([...keyParts, "Item"]);
            t.fields.set(key, { type: nestedTypeName, list: true });
            visit(items, [...keyParts, "Item"]);
          } else {
            // scalar items
            const scalar = inferGraphQLScalarFromJSONSchema(items) || "JSON";
            t.fields.set(key, { type: scalar, list: true });
          }
        } else {
          // scalar leaf
          const scalar = inferGraphQLScalarFromJSONSchema(child) || "JSON";
          t.fields.set(key, { type: scalar, list: false });
        }
      }
    } else if (node.type === "array") {
      // Rare case: array at a named node; handle items
      const items = node.items || {};
      const itemType =
        items.type === "object" || items.properties
          ? toSafeTypeName([...pathParts, "Item"])
          : inferGraphQLScalarFromJSONSchema(items) || "JSON";
      // Represent this node as list on parent (handled by caller)
      if (typeof itemType === "string" && (items.type === "object" || items.properties)) {
        // define nested item type
        visit(items, [...pathParts, "Item"]);
      }
    } else {
      // scalar or unknown -> parent handles
    }
  }

  visit(gs, ["Gsdm"]);
  return types;
}

function printSDLFromTypes(types) {
  const lines = [scalarPreludeSDL(), ""];

  // Output types in deterministic order
  const names = Array.from(types.keys()).sort((a, b) => a.localeCompare(b));
  for (const name of names) {
    // Skip root placeholder if it has no fields
    const node = types.get(name);
    if (!node || !node.fields || node.fields.size === 0) continue;

    lines.push(`type ${name} {`);
    for (const [field, cfg] of Array.from(node.fields.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    )) {
      const t = cfg.list ? `[${cfg.type}]` : cfg.type;
      lines.push(`  ${field}: ${t}`);
    }
    lines.push(`}`);
    lines.push("");
  }

  // Root query exposing a Unified Model root if available
  const rootType = names.find(n => n === "Gsdm") || names[0];
  if (rootType) {
    lines.push(`type Query {`);
    lines.push(`  unified_model: ${rootType}`);
    lines.push(`}`);
  }

  return lines.join("\n").trim() + "\n";
}

/* -------------------------------------------------------------------------- */
/* Main                                                                        */
/* -------------------------------------------------------------------------- */

export async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);

  const canonicalPath = path.isAbsolute(opts.schema)
    ? opts.schema
    : path.join(repoRoot, opts.schema);
  const mappingPath = path.isAbsolute(opts.mapping)
    ? opts.mapping
    : path.join(repoRoot, opts.mapping);
  const outBase = path.isAbsolute(opts.out) ? opts.out : path.join(repoRoot, opts.out);
  const outSDLDir = path.join(outBase, "sdl");

  if (opts.verbose) {
    console.log("📦 Unified Model Views Generator");
    console.log("  Canonical schema:", path.relative(repoRoot, canonicalPath));
    console.log("  Mapping file:    ", path.relative(repoRoot, mappingPath));
    console.log("  Output base:     ", path.relative(repoRoot, outBase));
    console.log("  SDL output dir:  ", path.relative(repoRoot, outSDLDir));
    console.log("  Options:         ", {
      ...opts,
      schema: undefined,
      mapping: undefined,
      out: undefined,
    });
    console.log("");
  }

  // Load inputs
  const canonicalSchema = await readJson(canonicalPath);
  const mappingDoc = await readJson(mappingPath);

  // Build Unified Model JSON Schema and resolved mapping
  const {
    schema: unified_modelSchema,
    diagnostics,
    resolvedMapping,
  } = buildGsdmSchema(canonicalSchema, mappingDoc);

  // Annotate top-level metadata
  unified_modelSchema.$id = unified_modelSchema.$id || "https://example.org/unified_model/schema.json";
  unified_modelSchema["x-provenance"] = {
    canonical_source: path.relative(repoRoot, canonicalPath),
    mapping_source: path.relative(repoRoot, mappingPath),
    generated_at: new Date().toISOString(),
    generator: "scripts/generate-unified_model-views.mjs",
  };

  // Write outputs
  const writtenSchema = await writeJson(path.join(outBase, "unified_model.schema.json"), unified_modelSchema);
  const writtenResolved = await writeJson(path.join(outBase, "mapping-resolved.json"), {
    ...resolvedMapping,
    diagnostics,
  });

  if (!opts.noSDL) {
    // Derive SDL types from Unified Model schema
    const types = collectTypesFromGsdmSchema(unified_modelSchema);
    const sdl = printSDLFromTypes(types);
    await writeText(path.join(outSDLDir, "unified_model.graphql"), sdl);
  }

  // Best-effort: return summary
  const summary = {
    written: {
      schema: path.relative(repoRoot, writtenSchema),
      mapping: path.relative(repoRoot, writtenResolved),
      sdl: opts.noSDL ? null : path.relative(repoRoot, path.join(outSDLDir, "unified_model.graphql")),
    },
    diagnostics: {
      counts: {
        warn: diagnostics.filter(d => d.level === "warn").length,
        info: diagnostics.filter(d => d.level === "info").length,
        error: diagnostics.filter(d => d.level === "error").length,
      },
    },
  };

  if (opts.verbose) {
    console.log("✅ Unified Model artifacts generated:");
    console.log("  -", summary.written.schema);
    console.log("  -", summary.written.mapping);
    if (summary.written.sdl) console.log("  -", summary.written.sdl);
    console.log("📋 Diagnostics:", summary.diagnostics.counts);
  }

  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error("❌ generate-unified_model-views:", err?.stack || err?.message || err);
    process.exit(1);
  });
}
