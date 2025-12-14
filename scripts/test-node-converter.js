const fs = require("fs");
const path = require("path");
const { jsonSchemaToGraphQL } = require("../converters/node/dist/converter");

const SCHEMA_NAME = "legacy-procurement";
const SCHEMA_PATH = path.join(
  __dirname,
  `../examples/real-world-schemas/${SCHEMA_NAME}.schema.json`,
);
const REFERENCE_PATH = path.join(
  __dirname,
  `../examples/real-world-schemas/reference-output/${SCHEMA_NAME}.graphql`,
);

async function runTest() {
  console.log(`Testing Node converter against ${SCHEMA_NAME}...`);

  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`Schema file not found: ${SCHEMA_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(REFERENCE_PATH)) {
    console.error(`Reference file not found: ${REFERENCE_PATH}`);
    process.exit(1);
  }

  const schemaContent = fs.readFileSync(SCHEMA_PATH, "utf8");
  const schema = JSON.parse(schemaContent);

  try {
    const options = {
      federationVersion: 2,
      includeDescriptions: true,
      preserveFieldOrder: true,
    };

    console.time("Conversion");
    const result = await jsonSchemaToGraphQL(schema, options);
    console.timeEnd("Conversion");

    const referenceSDL = fs.readFileSync(REFERENCE_PATH, "utf8");

    // Normalize line endings and whitespace for comparison
    const normalize = (str) => str.replace(/\r\n/g, "\n").trim();

    const generated = normalize(result);
    const reference = normalize(referenceSDL);

    if (generated === reference) {
      console.log("SUCCESS: Generated SDL matches reference output!");
    } else {
      console.log("FAILURE: Generated SDL does not match reference output.");
      console.log("--- Generated Preview ---");
      console.log(generated.substring(0, 500) + "...");
      console.log("--- Reference Preview ---");
      console.log(reference.substring(0, 500) + "...");

      // Write generated output for manual inspection
      const debugPath = path.join(
        __dirname,
        `../output/${SCHEMA_NAME}.debug.graphql`,
      );
      fs.mkdirSync(path.dirname(debugPath), { recursive: true });
      fs.writeFileSync(debugPath, result);
      console.log(`Debug output written to: ${debugPath}`);
    }
  } catch (error) {
    console.error("Conversion failed:", error);
  }
}

runTest();
