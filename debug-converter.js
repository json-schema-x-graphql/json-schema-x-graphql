const fs = require("fs");
const path = require("path");

// Load the converter
const converterPath = path.join(__dirname, "converters/node/dist/converter.js");
let converter;

try {
  converter = require(converterPath);
  console.log("Converter loaded:", Object.keys(converter));
} catch (e) {
  console.error("Failed to load converter:", e.message);
  process.exit(1);
}

// Load the schema
const schemaPath = path.join(__dirname, "graphql-spec-schema.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));

console.log("\n=== Schema Info ===");
console.log("Root properties:", Object.keys(schema.properties || {}));
console.log("$defs keys:", Object.keys(schema.$defs || {}).slice(0, 5));
console.log("Has x-graphql?", !!schema["x-graphql"]);
console.log("Root type:", schema.type);
console.log("Title:", schema.title);

// Try conversion
try {
  console.log("\n=== Attempting Conversion ===");

  const converterInstance = new converter.Converter();
  const result = converterInstance.convert({
    jsonSchema: schema,
    options: {
      includeDescriptions: true,
      preserveFieldOrder: true,
      validate: false,
      inferIds: false,
    },
  });

  console.log("Result type:", typeof result);
  console.log("Result is Promise?", result instanceof Promise);

  if (result instanceof Promise) {
    result
      .then((res) => {
        console.log("Async Result:", res);
        if (res && res.schema) {
          console.log(
            "SDL Output (first 500 chars):\n",
            res.schema.substring(0, 500),
          );
        }
        if (res && res.errors && res.errors.length) {
          console.log("Errors:", res.errors);
        }
      })
      .catch((e) => {
        console.error("Async conversion failed:", e.message);
      });
  } else {
    console.log("Result:", result);
    if (result.schema) {
      console.log(
        "SDL Output (first 500 chars):\n",
        result.schema.substring(0, 500),
      );
    }
  }
} catch (e) {
  console.error("Conversion failed:", e.message);
  console.error(e.stack);
}
