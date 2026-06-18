import { execSync } from "child_process";
import fs from "fs";
import path from "path";

describe("jxql-migrate CLI Integration", () => {
  const cliPath = path.resolve(__dirname, "../../cli/dist/migrate.js");
  const tempDir = path.resolve(__dirname, "../temp-test");

  beforeAll(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  const testSchema = {
    type: "object",
    "x-graphql-type-name": "Product",
    "x-graphql-federation": {
      keys: [{ fields: "sku" }],
      shareable: true,
      extends: true
    },
    properties: {
      sku: { type: "string" }
    }
  };

  test("should output migrated schema to stdout by default", () => {
    const tempFile = path.join(tempDir, "schema-stdout.json");
    fs.writeFileSync(tempFile, JSON.stringify(testSchema, null, 2));

    const output = execSync(`node ${cliPath} -i ${tempFile}`, { encoding: "utf-8" });
    const migrated = JSON.parse(output);

    expect(migrated["x-graphql-federation"]).toBeUndefined();
    expect(migrated["x-graphql-federation-keys"]).toEqual(["sku"]);
    expect(migrated["x-graphql-federation-shareable"]).toBe(true);
    expect(migrated["x-graphql-federation-extends"]).toBe(true);
  });

  test("should support --write option to migrate in-place", () => {
    const tempFile = path.join(tempDir, "schema-inplace.json");
    fs.writeFileSync(tempFile, JSON.stringify(testSchema, null, 2));

    execSync(`node ${cliPath} -i ${tempFile} --write`);
    const fileContent = fs.readFileSync(tempFile, "utf-8");
    const migrated = JSON.parse(fileContent);

    expect(migrated["x-graphql-federation"]).toBeUndefined();
    expect(migrated["x-graphql-federation-keys"]).toEqual(["sku"]);
    expect(migrated["x-graphql-federation-shareable"]).toBe(true);
    expect(migrated["x-graphql-federation-extends"]).toBe(true);
  });

  test("should support -o option to specify output file path", () => {
    const tempFile = path.join(tempDir, "schema-input.json");
    const outFile = path.join(tempDir, "schema-output.json");
    fs.writeFileSync(tempFile, JSON.stringify(testSchema, null, 2));

    execSync(`node ${cliPath} -i ${tempFile} -o ${outFile}`);
    const fileContent = fs.readFileSync(outFile, "utf-8");
    const migrated = JSON.parse(fileContent);

    expect(migrated["x-graphql-federation"]).toBeUndefined();
    expect(migrated["x-graphql-federation-keys"]).toEqual(["sku"]);
    expect(migrated["x-graphql-federation-shareable"]).toBe(true);
    expect(migrated["x-graphql-federation-extends"]).toBe(true);
  });
});
