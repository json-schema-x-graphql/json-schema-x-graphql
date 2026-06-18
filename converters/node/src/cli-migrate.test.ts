import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

describe("jxql-migrate CLI Integration", () => {
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
      extends: true,
    },
    properties: {
      sku: { type: "string" },
    },
  };

  test("should output migrated schema to stdout by default", () => {
    const tempFile = path.join(tempDir, "schema-stdout.json");
    fs.writeFileSync(tempFile, JSON.stringify(testSchema, null, 2));

    const output = execFileSync(
      "node",
      ["../../cli/dist/migrate.js", "-i", "../temp-test/schema-stdout.json"],
      {
        cwd: __dirname,
        encoding: "utf-8",
      },
    );
    const migrated = JSON.parse(output);

    expect(migrated["x-graphql-federation"]).toBeUndefined();
    expect(migrated["x-graphql-federation-keys"]).toEqual(["sku"]);
    expect(migrated["x-graphql-federation-shareable"]).toBe(true);
    expect(migrated["x-graphql-federation-extends"]).toBe(true);
  });

  test("should support --write option to migrate in-place", () => {
    const tempFile = path.join(tempDir, "schema-inplace.json");
    fs.writeFileSync(tempFile, JSON.stringify(testSchema, null, 2));

    execFileSync(
      "node",
      [
        "../../cli/dist/migrate.js",
        "-i",
        "../temp-test/schema-inplace.json",
        "--write",
      ],
      {
        cwd: __dirname,
        encoding: "utf-8",
      },
    );
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

    execFileSync(
      "node",
      [
        "../../cli/dist/migrate.js",
        "-i",
        "../temp-test/schema-input.json",
        "-o",
        "../temp-test/schema-output.json",
      ],
      {
        cwd: __dirname,
        encoding: "utf-8",
      },
    );
    const fileContent = fs.readFileSync(outFile, "utf-8");
    const migrated = JSON.parse(fileContent);

    expect(migrated["x-graphql-federation"]).toBeUndefined();
    expect(migrated["x-graphql-federation-keys"]).toEqual(["sku"]);
    expect(migrated["x-graphql-federation-shareable"]).toBe(true);
    expect(migrated["x-graphql-federation-extends"]).toBe(true);
  });
});
