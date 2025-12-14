#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { camelToSnake, snakeToCamel, convertObjectKeys } from "./helpers/case-conversion.mjs";
import { scalars, enumConfigs, typeConfigs, unionConfigs } from "./json-to-graphql.config.mjs";
import { validateSDL, emitCanonicalSDL } from "./lib/graphql-utils-proto.mjs";
import { buildSchemaFromIR } from "./lib/ir-to-graphql.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "");
const defaultSchemaPath = path.join(repoRoot, "src", "data", "schema_unification.schema.json");
// Mutable so we can override via CLI flags for multi-system generation
let schemaPath = defaultSchemaPath;

// All systems write SDLs to the shared generated-schemas directory
const outputDir = path.join(repoRoot, "generated-schemas");

// Derive an output base name from the schema filename (e.g. schema_unification.schema.json -> schema_unification)
let outputBaseName = path
  .basename(schemaPath)
  .replace(/\.schema\.json$/i, "")
  .replace(/\.json$/i, "");

// Parse CLI flags early when invoked directly to support cross-system usage:
// --schema <path/to/system.schema.json>
// --out-base <customBaseName>
// Example:
//   node generate-graphql-from-json-schema.mjs --schema src/data/legacy_procurement.schema.json
if (
  typeof process !== "undefined" &&
  process.argv &&
  process.argv[1] &&
  import.meta.url === `file://${process.argv[1]}`
) {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--schema" && argv[i + 1]) {
      schemaPath = path.isAbsolute(argv[i + 1]) ? argv[i + 1] : path.join(repoRoot, argv[i + 1]);
      outputBaseName = path
        .basename(schemaPath)
        .replace(/\.schema\.json$/i, "")
        .replace(/\.json$/i, "");
    }
    if (argv[i] === "--out-base" && argv[i + 1]) {
      outputBaseName = argv[i + 1];
    }
  }
}

// Construct output paths dynamically per system
let outputPath = path.join(outputDir, `${outputBaseName}.from-json.graphql`);
const generatedDir = path.join(repoRoot, "src", "data", "generated");
let generatedOutPath = path.join(generatedDir, `${outputBaseName}.from-json.graphql`);

// Field mapping (camelCase -> { snake, locations[] }) populated at runtime
let fieldMapping = {};

function getNodeByPath(root, loc) {
  // loc examples: "$defs/vendor_info", "$defs/contract/properties/vendor_info", "properties/vendorInfo"
  if (!loc || !root || typeof root !== "object") return null;
  const parts = loc.split("/").filter(Boolean);
  let node = root;
  for (const p of parts) {
    if (!node || typeof node !== "object") return null;
    if (p === "$defs" || p === "definitions" || p === "properties") {
      // step into container
      node = node[p];
      continue;
    }
    if (node[p] !== undefined) {
      node = node[p];
      continue;
    }
    // try common alternates
    const alt = camelToSnake(p);
    if (node[alt] !== undefined) {
      node = node[alt];
      continue;
    }
    const alt2 = snakeToCamel(p);
    if (node[alt2] !== undefined) {
      node = node[alt2];
      continue;
    }
    return null;
  }
  return node;
}

function formatDescription(description, indent = "") {
  if (!description) return "";
  const sanitized = String(description).replace(/\"\"\"/g, '\"\\\"\\\"');
  const lines = sanitized.replace(/\r/g, "").split("\n");
  const indented = lines.map(line => `${indent}${line}`);
  return `${indent}"""
${indented.join("\n")}
${indent}"""`;
}

function resolvePointer(schema, pointer) {
  if (!pointer || pointer === "/") {
    return { node: schema, parent: null, key: null, required: false };
  }

  const parts = pointer.split("/").filter(Boolean);
  let node = schema;
  let parent = null;
  let key = null;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    parent = node;
    key = part;

    // If the current node is a $ref, try to dereference it before resolving further segments
    if (node && typeof node === "object" && node.$ref) {
      try {
        const ref = String(node.$ref);
        const refPointer = ref.startsWith("#") ? ref.slice(1) : ref;
        const refResult = resolvePointer(schema, refPointer);
        if (refResult && refResult.node) {
          node = refResult.node;
        }
      } catch (err) {
        // ignore and continue
      }
    }

    // If pointer explicitly steps into $defs or definitions, move into that container
    if (part === "$defs" || part === "definitions") {
      node = node?.$defs || node?.definitions || node;
      continue;
    }

    // Try multiple candidate segment names: original, camel->snake, snake->camel
    const candidates = [part, camelToSnake(part), snakeToCamel(part)];

    // If we have a field mapping for this GraphQL segment, prefer its snake_case name
    try {
      const mapping = fieldMapping && fieldMapping[part];
      if (mapping && mapping.snake) {
        if (!candidates.includes(mapping.snake)) candidates.push(mapping.snake);
      }
      // Also try explicit mapping locations if available (these are full paths)
      if (mapping && Array.isArray(mapping.locations) && mapping.locations.length) {
        let mappingResolved = false;
        const remaining = parts.slice(i + 1);
        for (const rawLoc of mapping.locations) {
          const loc = String(rawLoc).replace(/^#\//, "").replace(/^\//, "");
          // First try resolving the remainder of the path relative to the mapped location
          if (remaining.length) {
            const combined = `${loc}/${remaining.join("/")}`;
            const mappedNodeFull = getNodeByPath(schema, combined);
            if (mappedNodeFull) {
              node = mappedNodeFull;
              // we've consumed the rest of the pointer
              i = parts.length; // break outer loop
              mappingResolved = true;
              break;
            }
          }
          // Fallback: resolve the mapping location itself
          const mappedNode = getNodeByPath(schema, loc);
          if (mappedNode) {
            node = mappedNode;
            mappingResolved = true;
            break;
          }
        }
        if (mappingResolved) {
          continue; // move to next pointer segment (or exit if we've set i to end)
        }
      }
    } catch (err) {
      // ignore mapping failures and fall back to candidate resolution
    }

    // Special-case structural token 'items' first: prefer stepping into items,
    // but if the current node doesn't have items, try a best-effort fallback
    if (candidates.includes("items")) {
      if (node && typeof node === "object" && node.items !== undefined) {
        node = node.items;
        continue;
      }

      // Try to find an immediate child property that defines 'items'
      let foundItems = false;
      if (node && typeof node === "object") {
        if (node.properties) {
          for (const v of Object.values(node.properties)) {
            if (v && typeof v === "object" && v.items !== undefined) {
              node = v.items;
              foundItems = true;
              break;
            }
          }
        }
        if (!foundItems && node.$defs) {
          for (const v of Object.values(node.$defs)) {
            if (v && typeof v === "object" && v.items !== undefined) {
              node = v.items;
              foundItems = true;
              break;
            }
          }
        }
        if (!foundItems && node.definitions) {
          for (const v of Object.values(node.definitions)) {
            if (v && typeof v === "object" && v.items !== undefined) {
              node = v.items;
              foundItems = true;
              break;
            }
          }
        }
      }

      if (foundItems) continue;

      console.warn(
        `Warning: Pointer segment 'items' not found in schema for pointer '${pointer}'.`
      );
      return { node: null, parent, key, required: false };
    }

    if (candidates.some(c => c === "any_of" || c === "one_of" || c === "all_of")) {
      const arrKey = node?.any_of
        ? "any_of"
        : node?.one_of
          ? "one_of"
          : node?.all_of
            ? "all_of"
            : null;
      if (!arrKey || !Array.isArray(node[arrKey])) {
        console.warn(
          `Warning: Pointer segment expected to be an array in pointer '${pointer}', but was not found.`
        );
        return { node: null, parent, key, required: false };
      }
      node = node[arrKey];
      continue;
    }

    if (!node || typeof node !== "object") {
      console.warn(
        `Warning: Cannot resolve pointer '${pointer}'. Encountered non-object at segment '${part}'.`
      );
      return { node: null, parent, key, required: false };
    }

    // Try resolving candidates against $defs, definitions, properties
    let resolved = false;
    for (const cand of candidates) {
      if (node.$defs && node.$defs[cand] !== undefined) {
        node = node.$defs[cand];
        resolved = true;
        break;
      }
      if (node.definitions && node.definitions[cand] !== undefined) {
        node = node.definitions[cand];
        resolved = true;
        break;
      }
      if (node.properties && node.properties[cand] !== undefined) {
        node = node.properties[cand];
        resolved = true;
        break;
      }
      if (Array.isArray(node) && /^\d+$/.test(cand)) {
        node = node[Number(cand)];
        resolved = true;
        break;
      }
    }
    // If direct resolution failed, attempt a fallback search across the schema
    if (!resolved) {
      try {
        const found = findNodeByCandidates(schema, candidates);
        if (found) {
          node = found;
          resolved = true;
        }
      } catch (err) {
        // ignore and fall through to warning
      }
    }

    // Heuristic: if we're resolving a top-level GraphQL pointer (parent is root schema)
    // try resolving the segment under definitions.contract or its properties (common case)
    if (!resolved && parent === schema) {
      const contractDef = schema.definitions && schema.definitions.contract;
      const startNodes = [contractDef, contractDef && contractDef.properties].filter(Boolean);
      for (const startNode of startNodes) {
        for (const cand of candidates) {
          if (startNode.$defs && startNode.$defs[cand] !== undefined) {
            node = startNode.$defs[cand];
            resolved = true;
            break;
          }
          if (startNode.definitions && startNode.definitions[cand] !== undefined) {
            node = startNode.definitions[cand];
            resolved = true;
            break;
          }
          if (startNode.properties && startNode.properties[cand] !== undefined) {
            node = startNode.properties[cand];
            resolved = true;
            break;
          }
        }
        if (resolved) break;
      }
    }

    if (resolved) continue;

    console.warn(
      `Warning: Pointer segment '${part}' not found while resolving '${pointer}'. Tried candidates: ${candidates.join(", ")}`
    );
    return { node: null, parent, key, required: false };
  }

  // Determine if this segment was required in the parent by checking any candidate name
  const required = Boolean(
    parent &&
      Array.isArray(parent.required) &&
      parent.required.some(r => {
        return r === key || r === camelToSnake(key) || r === snakeToCamel(key);
      })
  );
  return { node, parent, key, required };
}

// Fallback search: depth-first search for a node matching any of the candidate keys
function findNodeByCandidates(root, candidates) {
  if (!root || typeof root !== "object") return null;
  const stack = [root];
  const seen = new Set();
  let iterations = 0;
  const MAX = 10000;

  while (stack.length) {
    if (++iterations > MAX) break;
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    // Prevent revisiting the same object
    if (seen.has(node)) continue;
    seen.add(node);

    // Check $defs, definitions, properties for candidate keys
    if (node.$defs) {
      for (const k of Object.keys(node.$defs)) {
        if (candidates.includes(k)) return node.$defs[k];
      }
      for (const v of Object.values(node.$defs)) stack.push(v);
    }
    if (node.definitions) {
      for (const k of Object.keys(node.definitions)) {
        if (candidates.includes(k)) return node.definitions[k];
      }
      for (const v of Object.values(node.definitions)) stack.push(v);
    }
    if (node.properties) {
      for (const k of Object.keys(node.properties)) {
        if (candidates.includes(k)) return node.properties[k];
      }
      for (const v of Object.values(node.properties)) stack.push(v);
    }
    if (node.items) stack.push(node.items);
    if (Array.isArray(node.any_of)) node.any_of.forEach(n => stack.push(n));
    if (Array.isArray(node.one_of)) node.one_of.forEach(n => stack.push(n));
    if (Array.isArray(node.all_of)) node.all_of.forEach(n => stack.push(n));
  }
  return null;
}

function ensureArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function transformEnumValues(values, transform) {
  const seen = new Set();
  const gqlValues = [];

  for (const rawValue of values) {
    const base = typeof transform === "function" ? transform(rawValue) : rawValue;
    const normalized = String(base)
      .replace(/[^A-Za-z0-9_]/g, "_")
      .replace(/^[^A-Za-z_]/, match => `_${match}`)
      .toUpperCase();

    if (!seen.has(normalized)) {
      seen.add(normalized);
      gqlValues.push({ name: normalized, original: rawValue });
    }
  }
  return gqlValues;
}

function buildEnumSDL(schema, config, warnings) {
  let { node } = resolvePointer(schema, config.pointer);

  // If the pointer resolved to a $ref, follow it to the target definition
  if (node && typeof node === "object" && node.$ref) {
    try {
      const ref = String(node.$ref);
      const refPointer = ref.startsWith("#") ? ref.slice(1) : ref;
      const refResult = resolvePointer(schema, refPointer);
      if (refResult && refResult.node) {
        node = refResult.node;
      }
    } catch (err) {
      // ignore and continue; we'll handle missing enum below
    }
  }

  let enumValues = ensureArray(node?.enum);

  // Fallback: try to find a matching definition by enum name (camel->snake) if pointer resolution failed
  if (!enumValues.length) {
    try {
      const altLoc = `$defs/${camelToSnake(config.name)}`;
      const altNode = getNodeByPath(schema, altLoc);
      const altEnum = ensureArray(altNode?.enum);
      if (altEnum.length) {
        enumValues = altEnum;
      }
    } catch (err) {
      // ignore
    }
  }

  if (!enumValues.length) {
    warnings.push(`Enum '${config.name}' skipped: pointer '${config.pointer}' has no enum values.`);
    return null;
  }

  const gqlValues = transformEnumValues(enumValues, config.valueTransform);
  const description = config.description || node.description || null;

  const lines = [];
  if (description) {
    lines.push(formatDescription(description));
  }
  lines.push(`enum ${config.name} {`);
  gqlValues.forEach(value => {
    lines.push(`  ${value.name}`);
  });
  lines.push("}");
  return lines.join("\n");
}

function buildFieldDescription(fieldConfig, pointerInfo) {
  if (fieldConfig.description) return fieldConfig.description;
  const nodeDesc = pointerInfo.node?.description;
  if (nodeDesc) return nodeDesc;
  const parentDesc = pointerInfo.parent?.description;
  return parentDesc || null;
}

function buildFieldSDL(schema, fieldConfig, warnings) {
  const pointerInfo = resolvePointer(schema, fieldConfig.pointer);
  const fieldDescription = buildFieldDescription(fieldConfig, pointerInfo);
  const descriptionSDL = formatDescription(fieldDescription, "  ");

  const isNonNull = fieldConfig.graphqlType.trim().endsWith("!");
  if (isNonNull && !pointerInfo.required && !fieldConfig.allowOptionalNonNull) {
    warnings.push(
      `Field '${fieldConfig.name}' is non-null in GraphQL but not marked required in schema pointer '${fieldConfig.pointer}'.`
    );
  }

  if (fieldConfig.itemsPointer) {
    try {
      resolvePointer(schema, fieldConfig.itemsPointer);
    } catch (error) {
      warnings.push(
        `itemsPointer '${fieldConfig.itemsPointer}' for field '${fieldConfig.name}' could not be resolved: ${error.message}`
      );
    }
  }

  return {
    descriptionSDL: fieldDescription ? descriptionSDL : "",
    line: `  ${fieldConfig.name}: ${fieldConfig.graphqlType}`,
  };
}

function buildTypeSDL(schema, config, warnings) {
  const { node } = resolvePointer(schema, config.pointer);
  const typeDescription = config.description || (node ? node.description : null);

  const lines = [];
  if (typeDescription) {
    lines.push(formatDescription(typeDescription));
  }
  lines.push(`type ${config.name} {`);

  for (const fieldConfig of config.fields) {
    try {
      const fieldSDL = buildFieldSDL(schema, fieldConfig, warnings);
      if (fieldSDL.descriptionSDL) {
        lines.push(fieldSDL.descriptionSDL);
      }
      lines.push(fieldSDL.line);
    } catch (error) {
      warnings.push(
        `Field '${fieldConfig.name}' skipped for type '${config.name}': ${error.message}`
      );
    }
  }

  lines.push("}");
  return lines.join("\n");
}

function buildUnionSDL(config) {
  const description = config.description ? formatDescription(config.description) + "\n" : "";
  return `${description}union ${config.name} = ${config.members.join(" | ")}`;
}

/**
 * Generate GraphQL SDL from a canonical JSON Schema (multi-system capable).
 *
 * Automatically:
 *  - Infers output base name from schema filename if not provided
 *  - Writes SDL to generated-schemas/<base>.from-json.graphql
 *  - Optionally mirrors SDL to src/data/generated/<base>.from-json.graphql for website consumption
 *
 * @param {object} options
 * @param {string} [options.schemaFile] - Path to input JSON Schema file (defaults to resolved CLI --schema or schema_unification.schema.json)
 * @param {string} [options.outputBaseName] - Override base name for output files (derived from schemaFile if omitted)
 * @param {string} [options.outPath] - Explicit output path (otherwise derived from outputBaseName in generated-schemas/)
 * @param {boolean} [options.writeGeneratedCopy=true] - Whether to also write a copy to src/data/generated/
 * @returns {Promise<{ outPath: string, generatedOutPath: string | null, warnings: string[] }>}
 *
 * @example
 * // Generate SDL from schema_unification canonical schema (defaults)
 * const { outPath } = await generateFromJSONSchema();
 *
 * @example
 * // Multi-system generation
 * await generateFromJSONSchema({ schemaFile: 'src/data/legacy_procurement.schema.json' });
 *
 * @example
 * // Custom base name and skip website copy
 * await generateFromJSONSchema({
 *   schemaFile: 'src/data/intake_process.schema.json',
 *   outputBaseName: 'intake_process',
 *   writeGeneratedCopy: false
 * });
 */
export async function generateFromJSONSchema({
  schemaFile = schemaPath,
  outputBaseName,
  outPath,
  writeGeneratedCopy = true,
} = {}) {
  // Derive base name if not supplied
  if (!outputBaseName) {
    outputBaseName = path
      .basename(schemaFile)
      .replace(/\.schema\.json$/i, "")
      .replace(/\.json$/i, "");
  }
  // Recompute output paths if caller overrode schemaFile/baseName
  if (!outPath) {
    outputPath = path.join(outputDir, `${outputBaseName}.from-json.graphql`);
    outPath = outputPath;
  }
  generatedOutPath = path.join(generatedDir, `${outputBaseName}.from-json.graphql`);
  // Parse CLI flags for case conversion if called directly
  let inputCase = "camel";
  let outputCase = "camel";
  if (
    typeof process !== "undefined" &&
    process.argv &&
    process.argv[1] &&
    import.meta.url === `file://${process.argv[1]}`
  ) {
    const argv = process.argv.slice(2);
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === "--input-case" && argv[i + 1]) inputCase = argv[i + 1];
      if (argv[i] === "--output-case" && argv[i + 1]) outputCase = argv[i + 1];
    }
  }

  const rawSchema = await fs.readFile(schemaFile, "utf8");
  let schema = JSON.parse(rawSchema);
  // Load generated field-name mapping (if present) so we can resolve GraphQL camelCase -> snake_case
  try {
    const mappingPath = path.join(repoRoot, "generated-schemas", "field-name-mapping.json");
    const mappingText = await fs.readFile(mappingPath, "utf8");
    fieldMapping = JSON.parse(mappingText);
  } catch (err) {
    // mapping optional; proceed without it
    fieldMapping = {};
  }
  // Optionally convert JSON Schema property names to camelCase or snake_case
  if (inputCase !== outputCase) {
    schema = convertObjectKeys(schema, outputCase === "snake" ? camelToSnake : snakeToCamel);
  }
  await fs.mkdir(outputDir, { recursive: true });

  const warnings = [];

  // Build an IR-based GraphQL schema and get its printed SDL
  try {
    const { printed, warnings: emitterWarnings = [] } = buildSchemaFromIR(
      schema,
      enumConfigs,
      typeConfigs,
      unionConfigs,
      scalars,
      fieldMapping,
      warnings
    );
    // Merge warnings
    emitterWarnings.forEach(w => warnings.push(w));

    let document = printed + "\n";

    // Run canonicalization to ensure consistent ordering; emitCanonicalSDL will
    // fall back to the original printed schema if mapSchema has issues.
    try {
      const emitted = emitCanonicalSDL(document);
      if (emitted && emitted.ok) document = emitted.printed + "\n";
      else warnings.push(`SDL canonicalization failed: ${emitted?.error || "unknown error"}`);
    } catch (err) {
      warnings.push(`SDL canonicalization threw an error: ${err.message || String(err)}`);
    }

    await fs.writeFile(outPath, document, "utf8");
  } catch (err) {
    // If the IR emitter failed for any reason, try to fall back to the string
    // based emitter to keep behavior stable.
    warnings.push(`IR->GraphQL emitter failed: ${String(err)}`);

    const sections = [];
    sections.push("# Auto-generated from src/data/schema_unification.schema.json. Do not edit manually.");
    sections.push("");
    if (scalars.length) {
      scalars.forEach(scalar => {
        sections.push(`scalar ${scalar}`);
      });
      sections.push("");
    }
    for (const enumConfig of enumConfigs) {
      const enumSDL = buildEnumSDL(schema, enumConfig, warnings);
      if (enumSDL) {
        sections.push(enumSDL);
        sections.push("");
      }
    }
    for (const typeConfig of typeConfigs) {
      const typeSDL = buildTypeSDL(schema, typeConfig, warnings);
      sections.push(typeSDL);
      sections.push("");
    }
    for (const unionConfig of unionConfigs) {
      sections.push(buildUnionSDL(unionConfig));
      sections.push("");
    }

    const document =
      sections
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trimEnd() + "\n";

    await fs.writeFile(outPath, document, "utf8");
  }

  if (warnings.length) {
    process.stderr.write("Warnings while generating GraphQL SDL:\n");
    warnings.forEach(warning => process.stderr.write(` - ${warning}\n`));
  }

  // Write website consumption copy if enabled
  if (writeGeneratedCopy) {
    try {
      await fs.mkdir(generatedDir, { recursive: true });
      const finalSDL = await fs.readFile(outPath, "utf8");
      await fs.writeFile(generatedOutPath, finalSDL, "utf8");
    } catch (e) {
      process.stderr.write(
        `Warning: failed to write generated copy for '${outputBaseName}': ${String(e)}\n`
      );
    }
  }

  return { outPath, generatedOutPath: writeGeneratedCopy ? generatedOutPath : null, warnings };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // Multi-system CLI argument parsing
  // Supported flags:
  //   --schema <path/to/system.schema.json>
  //   --out <explicit/output/path.graphql>
  //   --out-base <baseNameForOutputs>
  //   --no-generated-copy (skip writing to src/data/generated/)
  //   --input-case / --output-case (still parsed inside generateFromJSONSchema for legacy compatibility)
  const argv = process.argv.slice(2);
  let schemaFile = schemaPath;
  let outPath = null;
  let outputBaseName = null;
  let writeGeneratedCopy = true;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--schema" && argv[i + 1]) {
      schemaFile = path.isAbsolute(argv[i + 1]) ? argv[i + 1] : path.join(repoRoot, argv[i + 1]);
    }
    if (argv[i] === "--out" && argv[i + 1]) {
      outPath = path.isAbsolute(argv[i + 1]) ? argv[i + 1] : path.join(repoRoot, argv[i + 1]);
    }
    if (argv[i] === "--out-base" && argv[i + 1]) {
      outputBaseName = argv[i + 1];
    }
    if (argv[i] === "--no-generated-copy") {
      writeGeneratedCopy = false;
    }
  }
  generateFromJSONSchema({ schemaFile, outPath, outputBaseName, writeGeneratedCopy })
    .then(({ outPath: finalOut, generatedOutPath, warnings }) => {
      process.stdout.write(`GraphQL SDL written to ${path.relative(process.cwd(), finalOut)}\n`);
      if (generatedOutPath) {
        process.stdout.write(
          `Generated copy written to ${path.relative(process.cwd(), generatedOutPath)}\n`
        );
      }
      if (warnings && warnings.length) {
        process.stdout.write(`Warnings (${warnings.length}):\n`);
        warnings.forEach(w => process.stdout.write(` - ${w}\n`));
      }
    })
    .catch(error => {
      console.error("[generate-graphql-from-json-schema]", error);
      process.exit(1);
    });
}
