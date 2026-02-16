/**
 * GraphQL Hive Gateway Server
 * Federation gateway using @graphql-tools/stitch
 */

import { createServer } from "http";
import { createYoga } from "graphql-yoga";
import { stitchSchemas } from "@graphql-tools/stitch";
import { schemaFromExecutor } from "@graphql-tools/wrap";
import { buildHTTPExecutor } from "@graphql-tools/executor-http";
import { readFileSync } from "fs";

const PORT = process.env.PORT || 5100;

// Subgraph configurations
const subgraphs = [
  { name: "contract_data", url: "http://contract_data-mock:4001/graphql" },
  { name: "public_spending", url: "http://public_spending-mock:4002/graphql" },
  {
    name: "legacy_procurement",
    url: "http://legacy_procurement-mock:4003/graphql",
  },
  { name: "intake_process", url: "http://intake_process-mock:4004/graphql" },
  { name: "logistics_mgmt", url: "http://logistics_mgmt-mock:4005/graphql" },
];

console.log("🔨 Building federation gateway...");

// Create executors for each subgraph
const subgraphSchemas = await Promise.all(
  subgraphs.map(async ({ name, url }) => {
    try {
      const executor = buildHTTPExecutor({ endpoint: url });
      const schema = await schemaFromExecutor(executor);
      console.log(`✅ Loaded ${name} subgraph from ${url}`);
      return schema;
    } catch (error) {
      console.error(`❌ Failed to load ${name}: ${error.message}`);
      return null;
    }
  }),
);

// Filter out failed schemas
const validSchemas = subgraphSchemas.filter((s) => s !== null);

if (validSchemas.length === 0) {
  console.error("❌ No subgraphs available. Exiting.");
  process.exit(1);
}

// Stitch all subgraphs together
const stitchedSchema = stitchSchemas({
  subschemas: validSchemas,
});

console.log(`✅ Stitched ${validSchemas.length} subgraphs`);

// Create Yoga server
const yoga = createYoga({
  schema: stitchedSchema,
  graphiql: {
    title: "Schema Unification Forest Federation Gateway",
    defaultQuery: `# Hive Gateway - Federation GraphQL API
#
# Query multiple systems through a single endpoint
# Subgraphs: ${subgraphs.map((s) => s.name).join(", ")}

query {
  __typename
}
`,
  },
  cors: {
    origin: "*",
    credentials: true,
  },
  maskedErrors: false,
});

const server = createServer(yoga);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 Hive Gateway running on http://0.0.0.0:${PORT}/graphql`);
  console.log(
    `   Federated subgraphs: ${validSchemas.length}/${subgraphs.length}`,
  );
  subgraphs.forEach((sg) => {
    console.log(`   - ${sg.name}: ${sg.url}`);
  });
  console.log("");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down gateway...");
  server.close(() => {
    console.log("✅ Gateway closed");
    process.exit(0);
  });
});
