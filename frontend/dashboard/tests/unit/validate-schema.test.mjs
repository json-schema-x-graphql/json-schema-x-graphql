import { describe, test, expect } from "@jest/globals";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { validateFiles } from "../../scripts/validate-schema.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

describe("validate-schema helper", () => {
  test("validates schema with provided schema file", async () => {
    // create a minimal v1 schema file and a small data file
    const tmpSchema = path.join(repoRoot, "tmp.petrified.schema.json");
    const tmpData = path.join(repoRoot, "tmp.petrified.json");
    const schema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: { foo: { type: "string" } },
    };
    await fs.writeFile(tmpSchema, JSON.stringify(schema));
    await fs.writeFile(tmpData, JSON.stringify({ foo: "bar" }));

    const results = validateFiles({
      schemaFile: tmpSchema,
      files: [{ name: "tmp", path: tmpData, validateSchema: true }],
    });
    expect(results.totalErrors).toBe(0);
    expect(results.fileResults.tmp).toBe(true);

    await fs.rm(tmpSchema).catch(() => {});
    await fs.rm(tmpData).catch(() => {});
  });

  test("reports missing data files and handles parse errors", async () => {
    const tmpSchema = path.join(repoRoot, "tmp2.petrified.schema.json");
    const tmpData = path.join(repoRoot, "tmp2.petrified.json");
    const schema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: { a: { type: "number" } },
    };
    await fs.writeFile(tmpSchema, JSON.stringify(schema));
    // write invalid JSON to cause parse error
    await fs.writeFile(tmpData, "{ invalid-json ");

    const results = validateFiles({
      schemaFile: tmpSchema,
      files: [{ name: "tmp2", path: tmpData, validateSchema: true }],
    });
    expect(results.fileResults.tmp2).toBe(false);
    expect(results.totalErrors).toBeGreaterThan(0);

    await fs.rm(tmpSchema).catch(() => {});
    await fs.rm(tmpData).catch(() => {});
  });
});
