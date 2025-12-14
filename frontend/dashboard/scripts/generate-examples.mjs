// enterprise-schema-unification/scripts/generate-examples.mjs
//
// Small generator script to create example JSON records from a declarative YAML
// mapping (scripts/example-mapping.yaml). Intended to be maintainable: add new
// archived sources under `sources:` in the YAML and add templates under
// `mapping_templates:` and then declare `examples:` to produce.
//
// Usage:
//   node scripts/generate-examples.mjs
//
// Notes:
//  - Requires `js-yaml` to be installed (dev-dependency OK). If not present the
//    script will exit with a helpful message.
//  - The YAML mapping drives which archived source file is used and how values
//    are copied, templated, or synthesized into the example output.
//
// This script is defensive and idempotent: it only writes when data is produced.
// It writes both to the "public" examples folder (for client-side fetch) and
// into `generated-schemas/examples/` to keep generation artifacts next to other
// generated outputs.

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

let yaml;
try {
  // prefer the standard `js-yaml` module
  // eslint-disable-next-line no-unused-vars
  yaml = (await import("js-yaml")).default;
} catch (err) {
  console.error(
    "\nERROR: required package `js-yaml` is not installed.\n" +
      "Install it with `pnpm add -D js-yaml` (or npm/yarn) and re-run the script.\n"
  );
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve mapping yaml location relative to scripts/
const mappingYamlPath = path.resolve(__dirname, "example-mapping.yaml");

function get(obj, pointer) {
  if (!pointer) return undefined;
  const parts = pointer.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    // if numeric index in pointer, coerce
    const idx = Number.isFinite ? Number(p) : Number(p);
    cur = cur[p];
  }
  return cur;
}

function deepClone(val) {
  return JSON.parse(JSON.stringify(val));
}

function deepMerge(a, b) {
  // simple recursive merge: arrays are replaced, objects are merged
  if (Array.isArray(a) && Array.isArray(b)) return b.slice();
  if (Array.isArray(a) || Array.isArray(b)) return b;
  if (typeof a === "object" && typeof b === "object") {
    const out = { ...(a || {}) };
    for (const k of Object.keys(b || {})) {
      out[k] = deepMerge(a?.[k], b[k]);
    }
    return out;
  }
  return typeof b !== "undefined" ? b : a;
}

function randSuffix(len = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function generateUuid() {
  // simple RFC4122 v4-ish generator (not cryptographically secure)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isDirectiveObject(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  const directiveKeys = new Set([
    "copy",
    "literal",
    "template",
    "now",
    "array_from",
    "pick",
    "generate",
  ]);
  const keys = Object.keys(obj);
  // treat as directive when the object has exactly one of the known directive keys
  const found = keys.filter(k => directiveKeys.has(k));
  return found.length > 0 && keys.length === found.length;
}

function applyTemplate(node, source, context) {
  // node can be:
  //  - directive object { copy: "path" } or { literal: ... }
  //  - plain object with children -> build object recursively
  //  - array -> map elements
  //  - primitive -> return as-is
  if (node === null || typeof node === "undefined") return null;

  // directive handling
  if (typeof node === "object" && !Array.isArray(node) && isDirectiveObject(node)) {
    // Prefer known keys
    if ("literal" in node) {
      return deepClone(node.literal);
    }
    if ("copy" in node) {
      const pointer = node.copy;
      const val = get(source, pointer);
      return deepClone(typeof val === "undefined" ? null : val);
    }
    if ("template" in node) {
      const tpl = String(node.template);
      // simple placeholder replacement: {{SYSTEM}}, {{SEQ}}, {{RAND}}, {{NOW}}
      return tpl
        .replace(/{{\s*SYSTEM\s*}}/gi, String(context.system || ""))
        .replace(/{{\s*SEQ\s*}}/gi, String(context.seq || "1"))
        .replace(/{{\s*RAND\s*}}/gi, String(context.rand || ""))
        .replace(/{{\s*NOW\s*}}/gi, String(context.now || new Date().toISOString()));
    }
    if ("now" in node) {
      if (node.now === true) return new Date().toISOString();
      if (typeof node.now === "string") return node.now;
      return new Date().toISOString();
    }
    if ("array_from" in node) {
      const pointer = node.array_from;
      const val = get(source, pointer);
      if (Array.isArray(val)) return deepClone(val);
      if (val == null) return [];
      return [deepClone(val)];
    }
    if ("pick" in node) {
      const arr = node.pick;
      if (Array.isArray(arr) && arr.length > 0) return arr[0];
      return null;
    }
    if ("generate" in node) {
      const def = node.generate;
      if (def && def.type === "uuid") return generateUuid();
      if (def && def.type === "randSuffix") return randSuffix(def.length || 6);
      return null;
    }

    // unknown directive -> return null
    return null;
  }

  // arrays
  if (Array.isArray(node)) {
    const out = [];
    for (const el of node) {
      out.push(applyTemplate(el, source, context));
    }
    return out;
  }

  // plain object (not directive): recursively build
  if (typeof node === "object") {
    const out = {};
    for (const key of Object.keys(node)) {
      out[key] = applyTemplate(node[key], source, context);
    }
    return out;
  }

  // primitive
  return node;
}

async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    // If concurrency races, ignore
    if (err && err.code !== "EEXIST") throw err;
  }
}

async function main() {
  console.log("Reading mapping YAML:", mappingYamlPath);
  let yamlContent;
  try {
    yamlContent = await fs.readFile(mappingYamlPath, "utf8");
  } catch (err) {
    console.error("Failed to read mapping YAML at", mappingYamlPath, ":", err.message);
    process.exit(1);
  }

  let mapping;
  try {
    mapping = yaml.load(yamlContent);
  } catch (err) {
    console.error("Failed to parse YAML:", err.message);
    process.exit(1);
  }

  const outputDir = mapping?.output?.dir || "public/data/generated/examples";
  const pretty = mapping?.output?.pretty_print !== false;
  const seqStart = (mapping?.hints?.seq_start && Number(mapping.hints.seq_start)) || 1;

  // Load sources
  const sources = mapping?.sources || {};
  const loadedSources = {};
  for (const [k, def] of Object.entries(sources)) {
    const srcPath = path.resolve(__dirname, "..", def.path || def);
    try {
      const txt = await fs.readFile(srcPath, "utf8");
      // try parse JSON (archived files are JSON)
      try {
        loadedSources[k] = JSON.parse(txt);
      } catch (jsonErr) {
        // not JSON — attempt YAML parsing as fallback
        try {
          loadedSources[k] = yaml.load(txt);
        } catch {
          loadedSources[k] = null;
        }
      }
      console.log(`Loaded source for "${k}" from ${def.path}`);
    } catch (err) {
      console.warn(`WARNING: failed to load source for "${k}" at ${def.path}: ${err.message}`);
      loadedSources[k] = null;
    }
  }

  // Ensure both canonical generated-schemas location and public output exist
  const legacyOutDir = path.resolve(__dirname, "..", "generated-schemas", "examples");
  const publicOutDir = path.resolve(__dirname, "..", outputDir);
  await ensureDir(legacyOutDir);
  await ensureDir(publicOutDir);

  const templates = mapping?.mapping_templates || {};
  const examples = mapping?.examples || [];

  let seq = seqStart;

  // For each example target: generate `count` files (count defaults to 1)
  for (const exampleDef of examples) {
    const systemKey = exampleDef.system;
    const templateName = exampleDef.template || systemKey;
    const count = exampleDef.count || 1;
    const outFileName = exampleDef.output || `${systemKey}.json`;
    const template = templates[templateName];
    if (!template) {
      console.warn(`Skipping example ${exampleDef.id || outFileName}: template "${templateName}" not found.`);
      continue;
    }

    for (let i = 0; i < count; i++) {
      const ctx = {
        system: systemKey,
        seq,
        rand: randSuffix(mapping?.hints?.random_suffix_length || 6),
        now: new Date().toISOString(),
      };

      // find the source object for the system (if missing, use an empty object)
      const sourceObj = deepClone(loadedSources[systemKey] || {});

      // Apply template (the template may expect to copy values from the archived source)
      let generated = applyTemplate(template, sourceObj, ctx);

      // In some templates we might have top-level copy to grab the whole source — if so and generated is null use source
      if ((generated == null || Object.keys(generated || {}).length === 0) && sourceObj) {
        // fallback: use the archived source as-is as a base
        generated = deepClone(sourceObj);
      }

      // Add some metadata fields to the generated object if not present
      generated.systemMetadata = generated.systemMetadata || {};
      generated.systemMetadata.primarySystem = generated.systemMetadata.primarySystem || ctx.system.toUpperCase();
      generated.systemMetadata.globalRecordId = generated.systemMetadata.globalRecordId || `PETRIFIED-${String(ctx.system).toUpperCase()}-${String(ctx.seq)}`;
      generated.systemMetadata.schemaVersion = generated.systemMetadata.schemaVersion || "2.0";
      generated.systemMetadata.lastModified = generated.systemMetadata.lastModified || ctx.now;

      // Allow exampleDef.overrides to further tweak the final output (deep merge)
      if (exampleDef.overrides) {
        generated = deepMerge(generated, exampleDef.overrides);
      }

      // Determine file names: write to both legacy folder and public folder
      const seqSuffix = count > 1 ? `-${i + 1}` : "";
      const targetFileLegacy = path.join(legacyOutDir, outFileName.replace(/\.json$/, `${seqSuffix}.json`));
      const targetFilePublic = path.join(publicOutDir, outFileName.replace(/\.json$/, `${seqSuffix}.json`));

      const content = pretty ? JSON.stringify(generated, null, 2) : JSON.stringify(generated);

      try {
        await fs.writeFile(targetFileLegacy, content, "utf8");
        await fs.writeFile(targetFilePublic, content, "utf8");
        console.log(`Wrote example for '${systemKey}' -> ${path.relative(process.cwd(), targetFilePublic)}`);
      } catch (err) {
        console.error("Failed to write generated example:", err);
      }

      seq += 1;
    }
  }

  console.log("Example generation complete.");
}

main().catch(err => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
