const { loadGraphQLSchemaFromJSONSchemas } = require("@omnigraph/json-schema");
const { printSchema } = require("graphql");
const fs = require("fs");

async function main() {
  const schema = await loadGraphQLSchemaFromJSONSchemas("Schema UnificationForest", {
    operations: [
      {
        type: "Query",
        field: "contract",
        description: "Fetch a contract record",
        responseSchema: "src/data/schema_unification.schema.json#/definitions/contract",
      },
    ],
  });
  fs.writeFileSync("generated-schemas/schema_unification.omnigraph.graphql", printSchema(schema));
  console.log("GraphQL SDL generated at generated-schemas/schema_unification.omnigraph.graphql");
}

main();
