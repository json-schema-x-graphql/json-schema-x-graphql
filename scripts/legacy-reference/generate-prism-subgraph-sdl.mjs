#!/usr/bin/env node

/**
 * generate-prism-subgraph-sdl.mjs
 *
 * Auto-discovery subgraph generator for PRISM JSON Schema.
 *
 * Inputs:
 *   - JSON Schema with $defs and root properties (e.g., src/data/supgraphs/prism.json)
 *   - Uses x-graphql-type-name when present on $defs to name GraphQL types.
 *   - Preserves descriptions as GraphQL triple-quoted descriptions.
 *   - Infers scalars for date/date-time/decimal.
 *   - Generates enums for inline enum fields (values normalized to valid GraphQL enum values).
 *   - Adds federation @key directives for key PRISM entities (Solicitation, Requisition).
 *   - Emits a Query type with simple fetchers for solicitation/requisition by composite keys.
 *
 * Outputs:
 *   - generated-schemas/prism.from-json.graphql
 *   - src/data/generated/prism.from-json.graphql (mirror copy)
 *   - Optionally, generated-schemas/subgraphs/prism.graphql (if --subgraph-out is provided)
 *
 * CLI:
 *   node scripts/generate-prism-subgraph-sdl.mjs \
 *     --in src/data/supgraphs/prism.json \
 *     --out generated-schemas/prism.from-json.graphql \
 *     --subgraph-out generated-schemas/subgraphs/prism.graphql
 *
 * Notes:
 *   - This generator does not modify the input schema or its structure.
 *   - Field names remain in snake_case to avoid altering the source field identity.
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

/* -------------------------------------------------------------------------- */
/* Paths & CLI                                                                */
/* -------------------------------------------------------------------------- */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function parseArgs(argv = process.argv.slice(2)) {
  const args = { in: null, out: null, subgraphOut: null, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--in" && argv[i + 1]) args.in = argv[++i];
    else if (a === "--out" && argv[i + 1]) args.out = argv[++i];
    else if (a === "--subgraph-out" && argv[i + 1]) args.subgraphOut = argv[++i];
    else if (a === "--verbose") args.verbose = true;
  }
  if (!args.in) args.in = path.join(repoRoot, "src", "data", "supgraphs", "prism.json");
  if (!args.out) args.out = path.join(repoRoot, "generated-schemas", "prism.from-json.graphql");
  return args;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function pascalCase(str) {
  return String(str || "")
    .replace(/[_\-\s]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

function safeGraphQLName(name, fallback = "X") {
  let n = String(name || "").replace(/[^A-Za-z0-9_]/g, "_");
  if (!/^[A-Za-z_]/.test(n)) n = `_${n}`;
  if (!n) n = fallback;
  return n;
}

function normalizeEnumValue(value) {
  // Convert raw value to a valid GraphQL enum identifier
  const s = String(value);
  let n = s
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_]/g, "_")
    .toUpperCase();
  if (!/^[A-Za-z_]/.test(n)) n = `_${n}`;
  if (!n) n = "_EMPTY";
  return n;
}

function tripleQuote(desc, indent = "") {
  if (!desc) return "";
  const text = String(desc).replace(/"""/g, '\\"""');
  const lines = text.split(/\r?\n/).map(l => indent + l);
  return `${indent}"""\n${lines.join("\n")}\n${indent}"""`;
}

function get(obj, pathSegments) {
  let cur = obj;
  for (const p of pathSegments) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}

function isObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

/* -------------------------------------------------------------------------- */
/* Core Mapper                                                                */
/* -------------------------------------------------------------------------- */

class PrismSDLBuilder {
  constructor(schema, options = {}) {
    this.schema = schema || {};
    this.defs = schema.$defs || schema.definitions || {};
    this.options = options || {};
    this.enumRegistry = new Map(); // enumName -> Set(values)
    this.typeRegistry = new Map(); // typeName -> SDL string
    this.seenEnums = new Set();
    this.seenTypes = new Set();
  }

  resolveRef(ref) {
    // Handles "#/$defs/Name" or "#/definitions/Name"
    if (!ref || typeof ref !== "string") return null;
    const hash = ref.startsWith("#/") ? ref.slice(2) : ref.replace(/^#/, "");
    const parts = hash.split("/").filter(Boolean);
    if (!parts.length) return null;
    if (parts[0] === "$defs" || parts[0] === "definitions") {
      const name = parts[1];
      return { name, def: this.defs[name], defName: name };
    }
    return null;
  }

  getTypeNameForDefKey(defKey) {
    const def = this.defs[defKey];
    if (!def) return pascalCase(defKey);
    return def["x-graphql-type-name"] || pascalCase(defKey);
  }

  getTypeNameForRef(ref) {
    const res = this.resolveRef(ref);
    if (!res || !res.def) {
      // fallback to last path segment
      const last = String(ref || "")
        .split("/")
        .pop();
      return pascalCase(last);
    }
    const tname = res.def["x-graphql-type-name"] || pascalCase(res.defName || "");
    return safeGraphQLName(tname || pascalCase(res.defName || "RefType"));
  }

  mapScalar(propDef, propName) {
    const t = propDef && propDef.type;
    const types = Array.isArray(t) ? t.filter(x => x !== "null") : t ? [t] : [];

    // Prefer explicit date formats even when flexible (string | number | null)
    if (types.includes("string") || types.length === 0) {
      if (propDef && propDef.format === "date-time") return "DateTime";
      if (propDef && propDef.format === "date") return "Date";
    }

    // Decimal hint wins for numeric unions
    if (
      propDef &&
      propDef["x-original-type"] &&
      String(propDef["x-original-type"]).toLowerCase() === "decimal"
    ) {
      return "Decimal";
    }

    // Numeric unions: prefer Decimal if hinted, otherwise Int vs Float
    if (types.includes("number") || types.includes("integer")) {
      if (
        propDef &&
        propDef["x-original-type"] &&
        String(propDef["x-original-type"]).toLowerCase() === "decimal"
      ) {
        return "Decimal";
      }
      // If integer only, use Int; otherwise prefer Float for mixed/number
      return types.includes("integer") && !types.includes("number") ? "Int" : "Float";
    }

    // Boolean (even if unioned with string), prefer a stable Boolean
    if (types.includes("boolean")) return "Boolean";

    // anyOf/oneOf: prefer $ref -> object -> number -> boolean -> string
    const alts = (propDef && (propDef.anyOf || propDef.oneOf)) || null;
    if (Array.isArray(alts) && alts.length) {
      const refAlt = alts.find(a => a && a.$ref);
      if (refAlt) return this.getTypeNameForRef(refAlt.$ref);
      const objAlt = alts.find(a => a && a.type === "object");
      if (objAlt) return "JSON";
      const numAlt = alts.find(
        a =>
          a &&
          (Array.isArray(a.type)
            ? a.type.includes("number") || a.type.includes("integer")
            : a.type === "number" || a.type === "integer")
      );
      if (numAlt) return this.mapScalar(numAlt, propName);
      const boolAlt = alts.find(a => a && a.type === "boolean");
      if (boolAlt) return "Boolean";
      return "String";
    }

    // Default stable fallback
    return "String";
  }

  ensureEnum(enumName, values) {
    const name = safeGraphQLName(enumName);
    if (!this.enumRegistry.has(name)) this.enumRegistry.set(name, new Set());
    const set = this.enumRegistry.get(name);
    for (const v of values || []) set.add(normalizeEnumValue(v));
    return name;
  }

  mapPropertyType(parentTypeName, propName, propDef) {
    // $ref
    if (propDef && propDef.$ref) {
      return this.getTypeNameForRef(propDef.$ref);
    }

    // enum
    if (propDef && Array.isArray(propDef.enum) && propDef.enum.length) {
      const enumTypeName = `${parentTypeName}${pascalCase(propName)}Enum`;
      this.ensureEnum(enumTypeName, propDef.enum);
      return enumTypeName;
    }

    // anyOf/oneOf/allOf: pick best-effort representative
    const choice = (propDef && (propDef.anyOf || propDef.oneOf || propDef.allOf)) || null;
    if (Array.isArray(choice) && choice.length) {
      // Prefer $ref branch
      const refAlt = choice.find(a => a && a.$ref);
      if (refAlt) return this.getTypeNameForRef(refAlt.$ref);
      // Prefer array branch
      const arrAlt = choice.find(
        a => a && (a.type === "array" || (Array.isArray(a.type) && a.type.includes("array")))
      );
      if (arrAlt) return this.mapPropertyType(parentTypeName, propName, arrAlt);
      // Prefer object branch -> JSON
      const objAlt = choice.find(
        a => a && (a.type === "object" || (Array.isArray(a.type) && a.type.includes("object")))
      );
      if (objAlt) return "JSON";
      // Fallback to scalar mapping
      return this.mapScalar(choice[0], propName);
    }

    // Handle multi-type unions (e.g., ["integer","string","null"])
    const t = propDef && propDef.type;
    const types = Array.isArray(t) ? t.filter(x => x !== "null") : t ? [t] : [];

    // array
    if (types.includes("array") || (propDef && propDef.type === "array")) {
      const items = propDef.items || {};
      let inner;

      // items can be unioned
      const itemChoice = items.anyOf || items.oneOf || items.allOf || null;
      if (Array.isArray(itemChoice) && itemChoice.length) {
        const itemRef = itemChoice.find(a => a && a.$ref);
        if (itemRef) {
          inner = this.getTypeNameForRef(itemRef.$ref);
        } else {
          inner = this.mapScalar(itemChoice[0], `${propName}_item`);
        }
      } else if (items.$ref) {
        inner = this.getTypeNameForRef(items.$ref);
      } else if (Array.isArray(items.enum) && items.enum.length) {
        const enumTypeName = `${parentTypeName}${pascalCase(propName)}ItemEnum`;
        this.ensureEnum(enumTypeName, items.enum);
        inner = enumTypeName;
      } else if (
        (items.type === "object" && items.properties) ||
        (Array.isArray(items.type) && items.type.includes("object"))
      ) {
        // Anonymous object - map to JSON to avoid reshaping
        inner = "JSON";
      } else {
        inner = this.mapScalar(items, `${propName}_item`);
      }
      return `[${inner}]`;
    }

    // object
    if (types.includes("object") || (propDef && propDef.type === "object")) {
      if (propDef.properties || propDef.$ref) {
        // Anonymous object with properties -> JSON, avoid inventing a new type
        return "JSON";
      }
    }

    // primitives / unions
    return this.mapScalar(propDef, propName);
  }

  buildFieldSDL(parentTypeName, propName, propDef, requiredList = []) {
    const fieldName = safeGraphQLName(propName);
    let typeStr = this.mapPropertyType(parentTypeName, propName, propDef);
    const isRequired = Array.isArray(requiredList) && requiredList.includes(propName);

    // Non-null if required at parent
    if (!typeStr.endsWith("]") && !typeStr.endsWith("!")) {
      // If it's a list like [T], keep as [T]! for required list
      if (typeStr.startsWith("[") && isRequired) {
        typeStr = `${typeStr}!`;
      } else if (isRequired) {
        typeStr = `${typeStr}!`;
      }
    } else if (typeStr.startsWith("[") && isRequired) {
      // Already has closing ] or non-null; apply non-null to list if missing
      if (!typeStr.endsWith("!")) typeStr = `${typeStr}!`;
    }

    const parts = [];
    if (propDef && propDef.description) {
      parts.push(tripleQuote(propDef.description, "  "));
    }
    parts.push(`  ${fieldName}: ${typeStr}`);
    return parts.join("\n");
  }

  buildTypeSDL(defKey) {
    const def = this.defs[defKey];
    if (!def || def.type !== "object") return null;

    const typeName = this.getTypeNameForDefKey(defKey);
    const description = def.description || "";
    const required = Array.isArray(def.required) ? def.required : [];

    // Federation keys for PRISM core entities
    let typeDirectives = "";
    if (typeName === "Solicitation") {
      typeDirectives = ' @key(fields: "solicitation_number amendment_number")';
    } else if (typeName === "Requisition") {
      typeDirectives = ' @key(fields: "requisition_number amendment_number")';
    }

    const lines = [];
    if (description) lines.push(tripleQuote(description));
    lines.push(`type ${safeGraphQLName(typeName)}${typeDirectives} {`);

    if (isObject(def.properties)) {
      for (const [propName, propDef] of Object.entries(def.properties)) {
        lines.push(this.buildFieldSDL(typeName, propName, propDef, required));
      }
    }

    lines.push("}");
    const sdl = lines.join("\n");
    this.typeRegistry.set(typeName, sdl);
    return sdl;
  }

  // Build enums after scanning all types
  buildEnumsSDL() {
    const parts = [];
    for (const [name, set] of Array.from(this.enumRegistry.entries()).sort((a, b) =>
      a[0] > b[0] ? 1 : -1
    )) {
      const values = Array.from(set.values());
      parts.push(`enum ${name} {\n${values.map(v => `  ${v}`).join("\n")}\n}`);
    }
    return parts.join("\n\n");
  }

  // Build Query root with basic fetchers
  buildQuerySDL() {
    const rootProps = isObject(this.schema.properties) ? this.schema.properties : {};
    const fields = [];

    // Generic fetcher builder: for each root property that is a $ref, build a single-object query
    for (const [propName, propDef] of Object.entries(rootProps)) {
      if (!propDef || !propDef.$ref) continue;
      const typeName = this.getTypeNameForRef(propDef.$ref);

      // Determine key fields heuristically:
      // 1. If definition has required fields containing *_number and amendment_number -> composite key
      // 2. Else if it has a single required field ending in _id or _number -> single key
      // 3. Else no args (returns nullable object)
      let argsSDL = "";
      let docLines = ['  """', `  Fetch a single ${propName} record`, '  """'];

      const refInfo = this.resolveRef(propDef.$ref);
      const def = refInfo && refInfo.def;
      let required = Array.isArray(def?.required) ? def.required : [];

      // Candidate key sets
      const hasAmendment = required.includes("amendment_number");
      const numberField = required.find(r => /_number$/.test(r) && r !== "amendment_number");
      const idField = required.find(r => /(_id$|^id$)/.test(r));

      if (hasAmendment && numberField) {
        argsSDL = `(${numberField}: String!, amendment_number: String)`;
        docLines.splice(2, 0, `  Composite key: (${numberField}, amendment_number)`);
      } else if (numberField) {
        argsSDL = `(${numberField}: String!)`;
        docLines.splice(2, 0, `  Key: ${numberField}`);
      } else if (idField) {
        argsSDL = `(${idField}: String!)`;
        docLines.splice(2, 0, `  Key: ${idField}`);
      }

      fields.push([...docLines, `  ${propName}${argsSDL}: ${typeName}`].join("\n"));
    }

    // Optionally add list queries: <propNamePlural>
    for (const [propName, propDef] of Object.entries(rootProps)) {
      if (!propDef || !propDef.$ref) continue;
      const typeName = this.getTypeNameForRef(propDef.$ref);
      const plural = propName.endsWith("s") ? `${propName}_list` : `${propName}s`; // simple heuristic
      fields.push(
        [
          '  """',
          `  List query for ${propName} records (non-paginated snapshot)`,
          '  """',
          `  ${plural}(limit: Int = 50): [${typeName}!]!`,
        ].join("\n")
      );
    }

    if (!fields.length) return "";
    return `type Query {\n${fields.join("\n\n")}\n}`;
  }

  // Build directive and scalar prelude
  buildPreludeSDL() {
    const lines = [];
    lines.push(
      `"""`,
      `Federation key directive (minimal definition for composition)`,
      `"""`,
      `directive @key(fields: String!) on OBJECT | INTERFACE`,
      ``,
      `"""ISO 8601 date and time"""`,
      `scalar DateTime`,
      `"""ISO 8601 date"""`,
      `scalar Date`,
      `"""High-precision decimal"""`,
      `scalar Decimal`,
      `"""Arbitrary JSON value"""`,
      `scalar JSON`
    );
    return lines.join("\n");
  }

  generateSDL() {
    const sections = [];

    // Prelude
    sections.push(this.buildPreludeSDL());

    // Types: for each $defs entry with type object
    for (const defKey of Object.keys(this.defs)) {
      const def = this.defs[defKey];
      if (def && def.type === "object") {
        const sdl = this.buildTypeSDL(defKey);
        if (sdl) sections.push(sdl);
      }
    }

    // Enums
    const enumsSDL = this.buildEnumsSDL();
    if (enumsSDL) sections.push(enumsSDL);

    // Root Query
    const querySDL = this.buildQuerySDL();
    if (querySDL) sections.push(querySDL);

    // Join
    let doc = sections.filter(Boolean).join("\n\n");
    // normalize excessive blank lines
    doc = doc.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
    return doc;
  }
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

async function main() {
  const args = parseArgs();

  const inPath = path.isAbsolute(args.in) ? args.in : path.join(repoRoot, args.in);
  const outPath = path.isAbsolute(args.out) ? args.out : path.join(repoRoot, args.out);

  // Ensure sibling mirrors
  const mirrorPath = path.join(repoRoot, "src", "data", "generated", "prism.from-json.graphql");
  const subgraphOut =
    args.subgraphOut &&
    (path.isAbsolute(args.subgraphOut) ? args.subgraphOut : path.join(repoRoot, args.subgraphOut));

  if (args.verbose) {
    console.log("🚀 PRISM Subgraph Generator");
    console.log("  Input:   ", path.relative(repoRoot, inPath));
    console.log("  Output:  ", path.relative(repoRoot, outPath));
    if (subgraphOut) console.log("  Subgraph:", path.relative(repoRoot, subgraphOut));
    console.log("  Mirror:  ", path.relative(repoRoot, mirrorPath));
  }

  const raw = await fs.readFile(inPath, "utf8");
  const schema = JSON.parse(raw);

  const builder = new PrismSDLBuilder(schema, { verbose: args.verbose });
  const sdl = builder.generateSDL();

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, sdl, "utf8");
  if (args.verbose) console.log("✅ Wrote", path.relative(repoRoot, outPath));

  // Mirror for website consumption
  await fs.mkdir(path.dirname(mirrorPath), { recursive: true });
  await fs.writeFile(mirrorPath, sdl, "utf8");
  if (args.verbose) console.log("✅ Wrote", path.relative(repoRoot, mirrorPath));

  // Optional copy to subgraphs location for composition
  if (subgraphOut) {
    await fs.mkdir(path.dirname(subgraphOut), { recursive: true });
    await fs.writeFile(subgraphOut, sdl, "utf8");
    if (args.verbose) console.log("✅ Wrote", path.relative(repoRoot, subgraphOut));
  }

  // Stats
  const lines = sdl.split("\n").length;
  const typeCount = (sdl.match(/^type\s+/gm) || []).length;
  const enumCount = (sdl.match(/^enum\s+/gm) || []).length;

  if (args.verbose) {
    console.log("\n📊 SDL Stats");
    console.log("  Lines: ", lines);
    console.log("  Types: ", typeCount);
    console.log("  Enums: ", enumCount);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error("❌ Error:", err && err.stack ? err.stack : String(err));
    process.exit(1);
  });
}

export { PrismSDLBuilder, parseArgs };
