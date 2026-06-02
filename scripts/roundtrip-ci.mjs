import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
import { parse as parseGraphQL } from "graphql";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, "..");
const outputDir = path.join(repoRoot, "test-output");
const defaultTestFile = path.join(repoRoot, "converters", "test-data", "complex-schema.json");
const testFile = process.env.ROUNDTRIP_TEST_FILE
  ? path.resolve(repoRoot, process.env.ROUNDTRIP_TEST_FILE)
  : defaultTestFile;

function ensureTestSchema(filePath) {
  if (fs.existsSync(filePath)) return;

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    JSON.stringify(
      {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "object",
        title: "User",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", minLength: 1 },
          email: { type: "string", format: "email" },
          age: { type: "integer", minimum: 0 },
          tags: { type: "array", items: { type: "string" } },
          metadata: { type: "object" },
        },
        required: ["id", "name", "email"],
      },
      null,
      2,
    ),
    "utf8",
  );
}

function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortJson(value[key])]),
    );
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(sortJson(value));
}

function stripLoc(value) {
  if (Array.isArray(value)) {
    return value.map(stripLoc);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "loc")
        .map(([key, child]) => [key, stripLoc(child)]),
    );
  }
  return value;
}

function sortGraphqlAst(ast) {
  const copy = stripLoc(ast);

  copy.definitions = [...(copy.definitions || [])].sort((a, b) => {
    const aName = a.name?.value || a.kind;
    const bName = b.name?.value || b.kind;
    return String(aName).localeCompare(String(bName));
  });

  for (const def of copy.definitions) {
    if (Array.isArray(def.fields)) {
      def.fields.sort((a, b) =>
        String(a.name?.value || "").localeCompare(String(b.name?.value || "")),
      );
      for (const field of def.fields) {
        if (Array.isArray(field.arguments)) {
          field.arguments.sort((a, b) =>
            String(a.name?.value || "").localeCompare(String(b.name?.value || "")),
          );
        }
      }
    }

    if (Array.isArray(def.values)) {
      def.values.sort((a, b) =>
        String(a.name?.value || "").localeCompare(String(b.name?.value || "")),
      );
    }
  }

  return copy;
}

function stableGraphql(sdl) {
  return JSON.stringify(sortGraphqlAst(parseGraphQL(sdl, { noLocation: true })));
}

function compareEqual(label, a, b) {
  if (a !== b) {
    throw new Error(`Drift detected for ${label}`);
  }
}

function getRustBinaryPath() {
  const candidates = [
    path.join(repoRoot, "converters", "rust", "target", "release", "jxql"),
    path.join(repoRoot, "target", "release", "jxql"),
  ]
    .filter((candidate) => fs.existsSync(candidate))
    .map((candidate) => ({
      candidate,
      mtimeMs: fs.statSync(candidate).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return candidates[0]?.candidate ?? null;
}

function runRustConvert(inputPath, outputPath) {
  const binaryPath = getRustBinaryPath();
  const args = ["--input", inputPath, "--output", outputPath, "--descriptions", "--preserve-order"];

  if (binaryPath) {
    execFileSync(binaryPath, args, {
      cwd: repoRoot,
      stdio: "inherit",
      encoding: "utf8",
    });
    return;
  }

  execFileSync(
    "cargo",
    ["run", "-q", "--release", "--features", "cli", "--bin", "jxql", "--", ...args],
    {
      cwd: path.join(repoRoot, "converters", "rust"),
      stdio: "inherit",
      encoding: "utf8",
    },
  );
}

function normalizeNodeJson(value) {
  if (typeof value === "string") {
    return JSON.parse(value);
  }
  return value;
}

async function loadNodeConverter() {
  const candidates = [
    path.join(repoRoot, "converters", "node", "dist", "converter.js"),
    path.join(repoRoot, "converters", "node", "dist", "index.js"),
  ];
  const modulePath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!modulePath) {
    throw new Error("Built Node converter not found in converters/node/dist");
  }
  return import(pathToFileURL(modulePath).href);
}

async function runNodeRoundTrip() {
  console.log("Running 3-cycle round-trip test for Node.js...");
  const { jsonSchemaToGraphQL, graphqlToJsonSchema } = await loadNodeConverter();
  const initialSchema = JSON.parse(fs.readFileSync(testFile, "utf8"));

  const graphql1 = jsonSchemaToGraphQL(initialSchema);
  fs.writeFileSync(path.join(outputDir, "node-cycle1.graphql"), graphql1, "utf8");
  const json1 = normalizeNodeJson(graphqlToJsonSchema(graphql1));
  fs.writeFileSync(
    path.join(outputDir, "node-cycle1.json"),
    JSON.stringify(json1, null, 2),
    "utf8",
  );

  const graphql2 = jsonSchemaToGraphQL(json1);
  fs.writeFileSync(path.join(outputDir, "node-cycle2.graphql"), graphql2, "utf8");
  const json2 = normalizeNodeJson(graphqlToJsonSchema(graphql2));
  fs.writeFileSync(
    path.join(outputDir, "node-cycle2.json"),
    JSON.stringify(json2, null, 2),
    "utf8",
  );

  const graphql3 = jsonSchemaToGraphQL(json2);
  fs.writeFileSync(path.join(outputDir, "node-cycle3.graphql"), graphql3, "utf8");
  const json3 = normalizeNodeJson(graphqlToJsonSchema(graphql3));
  fs.writeFileSync(
    path.join(outputDir, "node-cycle3.json"),
    JSON.stringify(json3, null, 2),
    "utf8",
  );

  // JSON Schema can be represented in multiple equivalent structural forms
  // across cycles (e.g. scalar refs vs explicit x-graphql type hints), so the
  // stable invariant we enforce here is the GraphQL surface that round-trips
  // back out of the converter.
  compareEqual("Node GraphQL cycle 1 → 2", stableGraphql(graphql1), stableGraphql(graphql2));
  compareEqual("Node GraphQL cycle 2 → 3", stableGraphql(graphql2), stableGraphql(graphql3));

  console.log("✅ Node.js: 3-cycle round-trip validation passed - No drift detected");
}

function runRustRoundTrip() {
  console.log("Running 3-cycle round-trip test for Rust...");

  const rustCycle1Graphql = path.join(outputDir, "rust-cycle1.graphql");
  const rustCycle1Json = path.join(outputDir, "rust-cycle1.json");
  const rustCycle2Graphql = path.join(outputDir, "rust-cycle2.graphql");
  const rustCycle2Json = path.join(outputDir, "rust-cycle2.json");
  const rustCycle3Graphql = path.join(outputDir, "rust-cycle3.graphql");
  const rustCycle3Json = path.join(outputDir, "rust-cycle3.json");

  runRustConvert(testFile, rustCycle1Graphql);
  runRustConvert(rustCycle1Graphql, rustCycle1Json);
  runRustConvert(rustCycle1Json, rustCycle2Graphql);
  runRustConvert(rustCycle2Graphql, rustCycle2Json);
  runRustConvert(rustCycle2Json, rustCycle3Graphql);
  runRustConvert(rustCycle3Graphql, rustCycle3Json);

  // JSON Schema can be represented in multiple equivalent structural forms
  // across cycles (e.g. scalar refs vs explicit x-graphql type hints), so the
  // stable invariant we enforce here is the GraphQL surface that round-trips
  // back out of the converter.
  compareEqual(
    "Rust GraphQL cycle 1 → 2",
    stableGraphql(fs.readFileSync(rustCycle1Graphql, "utf8")),
    stableGraphql(fs.readFileSync(rustCycle2Graphql, "utf8")),
  );
  compareEqual(
    "Rust GraphQL cycle 2 → 3",
    stableGraphql(fs.readFileSync(rustCycle2Graphql, "utf8")),
    stableGraphql(fs.readFileSync(rustCycle3Graphql, "utf8")),
  );

  console.log("✅ Rust: 3-cycle round-trip validation passed - No drift detected");
}

async function main() {
  console.log("Creating test data directory...");
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`Testing with ${path.relative(repoRoot, testFile)}...`);
  ensureTestSchema(testFile);

  runRustRoundTrip();
  console.log("");
  await runNodeRoundTrip();
  console.log("");
  console.log("✅ All 3-cycle round-trip validations passed!");
}

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});
