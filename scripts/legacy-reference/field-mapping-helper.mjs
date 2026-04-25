import fs from "fs/promises";
import path from "path";
import { camelToSnake } from "./helpers/case-conversion.mjs";

const repoRoot = path.resolve(new URL(import.meta.url).pathname, "..", "..");
const mappingPath = path.join(repoRoot, "generated-schemas", "field-name-mapping.json");

let _mapping = null;
export async function loadMapping() {
  if (_mapping) return _mapping;
  try {
    const text = await fs.readFile(mappingPath, "utf8");
    _mapping = JSON.parse(text);
    return _mapping;
  } catch (err) {
    throw new Error(
      `Field mapping not found; please run 'node scripts/generate-field-mapping.mjs' to generate it. Error: ${err.message}`,
    );
  }
}

export async function resolve(key) {
  const map = await loadMapping();
  if (map[key]) return map[key];
  // fallback try converting
  const snake = camelToSnake(key);
  for (const [k, v] of Object.entries(map)) {
    if (v.snake === snake) return v;
  }
  return null;
}
