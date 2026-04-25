#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import { snakeToCamel } from "./helpers/case-conversion.mjs";

const repoRoot = path.resolve(new URL(import.meta.url).pathname, "..", "..");
const schemaPath = path.join(repoRoot, "src", "data", "schema_unification.schema.json");
const outDir = path.join(repoRoot, "generated-schemas");
const generatedDir = path.join(repoRoot, "src", "data", "generated");

function canonicalCamel(s) {
  // For keys already camelCase, return as-is, otherwise convert snake_case -> camelCase
  if (/[A-Z]/.test(s)) return s;
  return snakeToCamel(s);
}

function findKeyLocations(obj, targetKey, basePath = "") {
  const results = [];
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      const currentPath = basePath ? `${basePath}/${k}` : k;
      if (k === targetKey) results.push(currentPath);
      if (v && typeof v === "object") {
        results.push(...findKeyLocations(v, targetKey, currentPath));
      }
    }
  }
  return results;
}

async function loadSchema() {
  const text = await fs.readFile(schemaPath, "utf8");
  return JSON.parse(text);
}

async function main() {
  const schema = await loadSchema();
  const defs = schema.$defs || schema.definitions || {};
  const mapping = {};

  // Collect keys from $defs and top-level properties
  const collectKeys = (obj, basePath) => {
    if (!obj || typeof obj !== "object") return;
    for (const [k, v] of Object.entries(obj)) {
      const p = basePath ? `${basePath}/${k}` : k;
      // Create mapping entry for this key
      const camel = canonicalCamel(k);
      mapping[camel] = mapping[camel] || { snake: k, locations: [] };
      mapping[camel].locations.push(p);

      // If this value has properties, include those too
      if (v && typeof v === "object") {
        if (v.properties && typeof v.properties === "object") {
          for (const prop of Object.keys(v.properties)) {
            const propCamel = canonicalCamel(prop);
            mapping[propCamel] = mapping[propCamel] || { snake: prop, locations: [] };
            mapping[propCamel].locations.push(`${p}/properties/${prop}`);
          }
        }
        // Recurse into nested defs
        collectKeys(v, p);
      }
    }
  };

  collectKeys(defs, "$defs");
  if (schema.properties) {
    for (const prop of Object.keys(schema.properties)) {
      const propCamel = canonicalCamel(prop);
      mapping[propCamel] = mapping[propCamel] || { snake: prop, locations: [] };
      mapping[propCamel].locations.push(`properties/${prop}`);
    }
  }

  // Deduplicate locations
  for (const k of Object.keys(mapping)) {
    mapping[k].locations = Array.from(new Set(mapping[k].locations));
  }

  // Ensure output dirs
  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(generatedDir, { recursive: true });

  const outPath = path.join(outDir, "field-name-mapping.json");
  const generatedOutPath = path.join(generatedDir, "field-name-mapping.json");
  const text = JSON.stringify(mapping, null, 2);
  await fs.writeFile(outPath, text, "utf8");
  await fs.writeFile(generatedOutPath, text, "utf8");

  console.log(`Wrote mapping for ${Object.keys(mapping).length} fields to:`);
  console.log(` - ${outPath}`);
  console.log(` - ${generatedOutPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
