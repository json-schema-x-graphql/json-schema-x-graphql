#!/usr/bin/env node
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const schemas = [
  "legacy_procurement.schema.json",
  "intake_process.schema.json",
  "logistics_mgmt.schema.json",
  "contract_data.schema.json",
  "public_spending.schema.json",
];

console.log("Generating subgraphs from system schemas...");

for (const schema of schemas) {
  const schemaPath = path.join(repoRoot, "src", "data", schema);
  console.log(`  - Generating subgraph from ${schema}...`);
  
  const result = spawnSync(
    process.execPath,
    [path.join(repoRoot, "scripts", "generate-subgraph-sdl.mjs"), schemaPath],
    { cwd: repoRoot, stdio: "inherit" }
  );

  if (result.status !== 0) {
    console.error(`Failed to generate subgraph from ${schema}`);
    process.exit(1);
  }
}

console.log("✅ All subgraphs generated successfully");
