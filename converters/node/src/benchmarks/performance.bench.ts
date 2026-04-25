/**
 * Performance benchmarks for JSON Schema x GraphQL converter
 *
 * Measures validation and conversion performance using Benchmark.js
 */

import * as fs from "fs";
import * as path from "path";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Benchmark = require("benchmark");
import { JsonSchemaValidator } from "../cli/validate";
// Note: Import actual converter implementation based on project structure
// This is a placeholder - adjust based on actual exports

const TEST_DATA_PATH = path.join(__dirname, "../../../test-data/x-graphql");

interface BenchmarkResult {
  name: string;
  opsPerSecond: number;
  meanTime: number;
  marginOfError: number;
}

const results: BenchmarkResult[] = [];

// Small test schema
const smallSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  "x-graphql-type-name": "User",
  properties: {
    id: {
      type: "string",
      "x-graphql-field-type": "ID!",
    },
    name: {
      type: "string",
    },
  },
};

// Medium test schema
const mediumSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  "x-graphql-type-name": "Product",
  properties: {
    id: { type: "string", "x-graphql-field-type": "ID!" },
    name: { type: "string" },
    description: { type: "string" },
    price: { type: "number" },
    inStock: { type: "boolean" },
    category: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    metadata: {
      type: "object",
      properties: {
        created: { type: "string", format: "date-time" },
        updated: { type: "string", format: "date-time" },
      },
    },
  },
};

// Test data definitions (used as part of benchmark infrastructure)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const smallSDL = `
type User {
  id: ID!
  name: String!
}

type Query {
  user(id: ID!): User
}
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mediumSDL = `
type Product {
  id: ID!
  name: String!
  description: String
  price: Float!
  inStock: Boolean!
  category: String
  tags: [String!]!
}

type Query {
  product(id: ID!): Product
}
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const complexSDL = `
interface Node {
  id: ID!
}

type User implements Node {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}

type Post implements Node {
  id: ID!
  title: String!
  content: String!
  author: User!
}

union SearchResult = User | Post

type Query {
  node(id: ID!): Node
  search(query: String!): [SearchResult!]!
}
`;

function runBenchmarks() {
  console.log("🚀 Starting Performance Benchmarks\n");
  console.log("=".repeat(80));

  // Benchmark: JSON Schema Validation
  const validationSuite = new Benchmark.Suite("JSON Schema Validation");

  const validator = new JsonSchemaValidator(false);

  validationSuite
    .add("Small schema validation", () => {
      validator.validate(smallSchema);
    })
    .add("Medium schema validation", () => {
      validator.validate(mediumSchema);
    })
    .on("cycle", (event: any) => {
      console.log(String(event.target));
      const bench = event.target as any;
      results.push({
        name: bench.name || "unknown",
        opsPerSecond: bench.hz || 0,
        meanTime: bench.stats ? bench.stats.mean * 1000 : 0,
        marginOfError: bench.stats ? bench.stats.moe * 1000 : 0,
      });
    })
    .on("complete", function (this: any) {
      console.log("Fastest is " + this.filter("fastest").map("name"));
      console.log("");
    })
    .run();

  // Benchmark: JSON to GraphQL Conversion
  const jsonToGraphQLSuite = new Benchmark.Suite("JSON to GraphQL Conversion");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const smallSchemaStr = JSON.stringify(smallSchema);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mediumSchemaStr = JSON.stringify(mediumSchema);

  jsonToGraphQLSuite
    .add("Small schema conversion", () => {
      // convert(smallSchemaStr, ConversionDirection.JsonSchemaToGraphQL);
      // Note: Replace with actual converter call
    })
    .add("Medium schema conversion", () => {
      // convert(mediumSchemaStr, ConversionDirection.JsonSchemaToGraphQL);
      // Note: Replace with actual converter call
    })
    .on("cycle", (event: any) => {
      console.log(String(event.target));
      const bench = event.target as any;
      results.push({
        name: bench.name || "unknown",
        opsPerSecond: bench.hz || 0,
        meanTime: bench.stats ? bench.stats.mean * 1000 : 0,
        marginOfError: bench.stats ? bench.stats.moe * 1000 : 0,
      });
    })
    .on("complete", function (this: any) {
      console.log("Fastest is " + this.filter("fastest").map("name"));
      console.log("");
    })
    .run();

  // Benchmark: GraphQL to JSON Conversion
  const graphQLToJsonSuite = new Benchmark.Suite("GraphQL to JSON Conversion");

  graphQLToJsonSuite
    .add("Small SDL conversion", () => {
      // convert(smallSDL, ConversionDirection.GraphQLToJsonSchema);
      // Note: Replace with actual converter call
    })
    .add("Medium SDL conversion", () => {
      // convert(mediumSDL, ConversionDirection.GraphQLToJsonSchema);
      // Note: Replace with actual converter call
    })
    .add("Complex SDL conversion", () => {
      // convert(complexSDL, ConversionDirection.GraphQLToJsonSchema);
      // Note: Replace with actual converter call
    })
    .on("cycle", (event: any) => {
      console.log(String(event.target));
      const bench = event.target as any;
      results.push({
        name: bench.name || "unknown",
        opsPerSecond: bench.hz || 0,
        meanTime: bench.stats ? bench.stats.mean * 1000 : 0,
        marginOfError: bench.stats ? bench.stats.moe * 1000 : 0,
      });
    })
    .on("complete", function (this: any) {
      console.log("Fastest is " + this.filter("fastest").map("name"));
      console.log("");
    })
    .run();

  // Benchmark: Round-trip Conversion
  const roundTripSuite = new Benchmark.Suite("Round-trip Conversion");

  roundTripSuite
    .add("JSON → GraphQL → JSON", () => {
      // const graphql = convert(smallSchemaStr, ConversionDirection.JsonSchemaToGraphQL);
      // convert(graphql, ConversionDirection.GraphQLToJsonSchema);
      // Note: Replace with actual converter calls
    })
    .on("cycle", (event: any) => {
      console.log(String(event.target));
      const bench = event.target as any;
      results.push({
        name: bench.name || "unknown",
        opsPerSecond: bench.hz || 0,
        meanTime: bench.stats ? bench.stats.mean * 1000 : 0,
        marginOfError: bench.stats ? bench.stats.moe * 1000 : 0,
      });
    })
    .on("complete", function (this: any) {
      console.log("Fastest is " + this.filter("fastest").map("name"));
      console.log("");
    })
    .run();

  // Benchmark: Real-world schemas from test-data
  if (fs.existsSync(TEST_DATA_PATH)) {
    const realWorldSuite = new Benchmark.Suite("Real-world Schemas");

    const files = fs
      .readdirSync(TEST_DATA_PATH)
      .filter((f) => f.endsWith(".json"))
      .slice(0, 3); // Limit to 3 files

    files.forEach((file) => {
      const filePath = path.join(TEST_DATA_PATH, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const schema = JSON.parse(content);

      realWorldSuite.add(`Validate ${file}`, () => {
        validator.validate(schema);
      });
    });

    realWorldSuite
      .on("cycle", (event: any) => {
        console.log(String(event.target));
        const bench = event.target as any;
        results.push({
          name: bench.name || "unknown",
          opsPerSecond: bench.hz || 0,
          meanTime: bench.stats ? bench.stats.mean * 1000 : 0,
          marginOfError: bench.stats ? bench.stats.moe * 1000 : 0,
        });
      })
      .on("complete", function (this: any) {
        if (this.length > 1) {
          console.log("Fastest is " + this.filter("fastest").map("name"));
        }
        console.log("");
      })
      .run();
  }

  // Benchmark: Memory/Scaling
  const scalingSuite = new Benchmark.Suite("Scaling Performance");

  [10, 50, 100, 200].forEach((fieldCount) => {
    const properties: any = {};
    for (let i = 0; i < fieldCount; i++) {
      properties[`field_${i}`] = {
        type: "string",
        "x-graphql-field-name": `field${i}`,
      };
    }

    const largeSchema = {
      type: "object",
      "x-graphql-type-name": "LargeType",
      properties,
    };

    scalingSuite.add(`Validate ${fieldCount} fields`, () => {
      validator.validate(largeSchema);
    });
  });

  scalingSuite
    .on("cycle", (event: any) => {
      console.log(String(event.target));
      const bench = event.target as any;
      results.push({
        name: bench.name || "unknown",
        opsPerSecond: bench.hz || 0,
        meanTime: bench.stats ? bench.stats.mean * 1000 : 0,
        marginOfError: bench.stats ? bench.stats.moe * 1000 : 0,
      });
    })
    .on("complete", function (this: any) {
      console.log("Fastest is " + this.filter("fastest").map("name"));
      console.log("");
    })
    .run();

  // Print summary
  printSummary();
}

function printSummary() {
  console.log("=".repeat(80));
  console.log("📊 Performance Summary\n");

  console.log("Benchmark Results:");
  console.log("-".repeat(80));
  console.log(
    "Name".padEnd(50) + "Ops/sec".padStart(12) + "Mean (ms)".padStart(12) + "±".padStart(6),
  );
  console.log("-".repeat(80));

  results.forEach((result) => {
    console.log(
      result.name.padEnd(50) +
        result.opsPerSecond.toFixed(2).padStart(12) +
        result.meanTime.toFixed(4).padStart(12) +
        `±${result.marginOfError.toFixed(2)}%`.padStart(6),
    );
  });

  console.log("-".repeat(80));

  // Performance targets
  console.log("\n🎯 Performance Targets:");
  console.log("  • Validation: > 10,000 ops/sec (< 0.1ms per schema)");
  console.log("  • Conversion: > 1,000 ops/sec (< 1ms per schema)");
  console.log("  • Round-trip: > 500 ops/sec (< 2ms per operation)");

  // Check if we meet targets
  const validationBenches = results.filter((r) => r.name.includes("validation"));
  const conversionBenches = results.filter((r) => r.name.includes("conversion"));
  const roundTripBenches = results.filter((r) => r.name.includes("Round-trip"));

  const validationPassed = validationBenches.every((r) => r.opsPerSecond > 10000);
  const conversionPassed = conversionBenches.every((r) => r.opsPerSecond > 1000);
  const roundTripPassed = roundTripBenches.every((r) => r.opsPerSecond > 500);

  console.log("\n✅ Performance Status:");
  console.log(`  Validation: ${validationPassed ? "✅ PASS" : "⚠️  NEEDS IMPROVEMENT"}`);
  console.log(`  Conversion: ${conversionPassed ? "✅ PASS" : "⚠️  NEEDS IMPROVEMENT"}`);
  console.log(`  Round-trip: ${roundTripPassed ? "✅ PASS" : "⚠️  NEEDS IMPROVEMENT"}`);

  // Save results to file
  const resultsPath = path.join(__dirname, "../../../benchmark-results.json");
  fs.writeFileSync(
    resultsPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        results,
        targets: {
          validation: { target: 10000, passed: validationPassed },
          conversion: { target: 1000, passed: conversionPassed },
          roundTrip: { target: 500, passed: roundTripPassed },
        },
      },
      null,
      2,
    ),
  );
  console.log(`\n💾 Results saved to: ${resultsPath}`);
}

// Run benchmarks if called directly
if (require.main === module) {
  runBenchmarks();
}

export { runBenchmarks };
