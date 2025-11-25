import fs from "fs";
import { parse } from "graphql";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const schemaPath = join(
  __dirname,
  "../../../examples/federal-procurement.graphql",
);

try {
  const schema = fs.readFileSync(schemaPath, "utf8");
  parse(schema);
  console.log("✅ Schema is valid!");
} catch (error) {
  console.error("❌ Schema validation failed:", error.message);
  process.exit(1);
}
