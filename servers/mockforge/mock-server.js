/**
 * Lightweight Mock GraphQL Server
 *
 * Serves individual system subgraph with faker.js data and CSV seed data.
 * Yoga + GraphQL Mesh compatible - no SQLite dependency.
 * Environment: PORT (default 3000), SYSTEM (fpds, usaspending, assist, easi, calm)
 */
import { faker } from "@faker-js/faker";
import { addMocksToSchema } from "@graphql-tools/mock";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { readFileSync } from "fs";
import { createYoga } from "graphql-yoga";
import { createServer } from "http";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { customResolvers } from "./mockforge.config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PORT = process.env.PORT || 3000;
const SYSTEM = process.env.SYSTEM || "fpds";
// Try mounted volume path first (Docker), fallback to local development path
let SUBGRAPH_PATH = `/workspace/generated-schemas/${SYSTEM}.subgraph.graphql`;
try {
  readFileSync(SUBGRAPH_PATH);
} catch {
  // Fallback to local development path
  SUBGRAPH_PATH = resolve(__dirname, `../../../generated-schemas/${SYSTEM}.subgraph.graphql`);
}

// Seed faker for deterministic data per system
faker.seed(
  {
    fpds: 12345,
    usaspending: 23456,
    assist: 34567,
    easi: 45678,
    calm: 56789,
  }[SYSTEM] || 12345
);

console.log(`✅ Initialized ${SYSTEM} mock server (lightweight Yoga + faker.js)`);

/**
 * Load subgraph schema for specific system
 */
function loadSystemSchema(system) {
  try {
    let subgraph = readFileSync(SUBGRAPH_PATH, "utf-8");

    // Add Federation directive definitions so the schema validates
    const federationDirectives = `
directive @key(fields: String!, resolvable: Boolean = true) repeatable on OBJECT | INTERFACE
directive @requires(fields: String!) on FIELD_DEFINITION
directive @provides(fields: String!) on FIELD_DEFINITION
directive @external on FIELD_DEFINITION | OBJECT
directive @shareable on OBJECT | FIELD_DEFINITION
directive @tag(name: String!) repeatable on FIELD_DEFINITION | INTERFACE | OBJECT | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION
directive @extends on OBJECT | INTERFACE
directive @link(url: String!, as: String, import: [String]) repeatable on SCHEMA
directive @inaccessible on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION
directive @override(from: String!) on FIELD_DEFINITION
directive @composeDirective(name: String!) repeatable on SCHEMA
directive @interfaceObject on OBJECT

`;

    // Prepend federation directives to the schema
    subgraph = federationDirectives + subgraph;

    console.log(`✅ Loaded ${system} subgraph from ${SUBGRAPH_PATH}`);

    return subgraph;
  } catch (e) {
    console.error(`❌ Error loading ${system} subgraph:`, e.message);

    // Fallback minimal schema
    return `
type Query {
  _service: _Service!
}

type _Service {
  sdl: String!
}
`;
  }
}

/**
 * Generate lightweight resolvers with faker.js (no persistence)
 */
function generateResolvers(system) {
  const resolvers = {};

  // mockforge.config.js exports resolvers keyed by GraphQL type name.
  // Include all configured type resolvers; GraphQL ignores entries for types
  // that are not present in the current subgraph schema.
  Object.assign(resolvers, customResolvers);

  return resolvers;
}

// Load schema and create executable schema with mocks
const typeDefs = loadSystemSchema(SYSTEM);
const baseResolvers = generateResolvers(SYSTEM);

const baseSchema = makeExecutableSchema({
  typeDefs,
  resolvers: baseResolvers,
  resolverValidationOptions: {
    requireResolversToMatchSchema: "ignore",
  },
});

/**
 * Well-known scalar mock generators.
 * Any scalar declared in the SDL that is NOT in this map gets a sensible
 * string fallback so schemathesis never hits an INTERNAL_SERVER_ERROR.
 */
const SCALAR_MOCKS = {
  // Primitives
  Int: () => faker.number.int({ min: 1, max: 100000 }),
  Float: () => faker.number.float({ min: 0, max: 1000000, precision: 0.01 }),
  String: () => faker.lorem.words(3),
  Boolean: () => faker.datatype.boolean(),
  // Date/Time scalars
  DateTime: () => faker.date.past().toISOString(),
  Date: () => faker.date.past().toISOString().split("T")[0],
  Time: () => {
    const h = String(faker.number.int({ min: 0, max: 23 })).padStart(2, "0");
    const m = String(faker.number.int({ min: 0, max: 59 })).padStart(2, "0");
    const s = String(faker.number.int({ min: 0, max: 59 })).padStart(2, "0");
    return `${h}:${m}:${s}`;
  },
  // Numeric scalars
  Decimal: () => faker.number.float({ min: 0, max: 1000000, precision: 0.01 }),
  PositiveDecimal: () => faker.number.float({ min: 0.01, max: 1000000, precision: 0.01 }),
  Percentage: () => faker.number.float({ min: 0, max: 100, precision: 0.01 }),
  // Contact scalars
  Email: () => faker.internet.email(),
  PhoneNumber: () => faker.phone.number(),
  // URI scalars (handle both casing variants)
  URI: () => faker.internet.url(),
  Uri: () => faker.internet.url(),
  // Identifier scalars
  PIID: () =>
    `GS-${faker.string.alphanumeric(4).toUpperCase()}-${faker.string.alphanumeric(8).toUpperCase()}`,
  UEI: () => faker.string.alphanumeric(12).toUpperCase(),
  FiscalYear: () => String(faker.number.int({ min: 2018, max: 2026 })),
  // Code scalars
  AgencyCode: () => String(faker.number.int({ min: 1000, max: 9999 })),
  CountryCode: () => faker.location.countryCode(),
  StateCode: () => faker.location.state({ abbreviated: true }),
  ZipCode: () => faker.location.zipCode(),
  NAICSCode: () => String(faker.number.int({ min: 111110, max: 999990 })),
  PSCCode: () => faker.string.alphanumeric(4).toUpperCase(),
  // Structured scalars
  JSON: () => ({}),
  Json: () => ({}),
};

/**
 * Auto-detect custom scalars declared in the SDL and ensure every one
 * has a mock handler.  Unrecognised scalars get a string fallback.
 */
function buildScalarMocks(sdl) {
  const mocks = { ...SCALAR_MOCKS };
  const builtins = new Set(["Int", "Float", "String", "Boolean", "ID"]);
  const scalarPattern = /^scalar\s+(\w+)/gm;
  let match;
  const declaredScalars = [];

  while ((match = scalarPattern.exec(sdl)) !== null) {
    const name = match[1];
    if (!builtins.has(name)) declaredScalars.push(name);
    if (!mocks[name] && !builtins.has(name)) {
      // Provide a sensible fallback for unknown scalars
      mocks[name] = () => faker.lorem.words(2);
      console.warn(`⚠️  Auto-mocking unknown scalar '${name}' with string fallback`);
    }
  }

  console.log(`📊 Scalar coverage: ${declaredScalars.length} custom scalars, all mocked`);
  return mocks;
}

// Add automatic mocks with faker.js
const schema = addMocksToSchema({
  schema: baseSchema,
  mocks: buildScalarMocks(typeDefs),
  preserveResolvers: true, // Keep our custom resolvers
});

// Create Yoga server
const yoga = createYoga({
  schema,
  graphiql: {
    title: `${SYSTEM.toUpperCase()} Mock Server (Lightweight)`,
    defaultQuery: `
# ${SYSTEM.toUpperCase()} Mock GraphQL API
#
# This server provides realistic mock data using:
# - faker.js for data generation
# - CSV seed data from seed-data/${SYSTEM}.csv
# - Lightweight Yoga + GraphQL Mesh (no SQLite)
#
# Try querying your schema here!

query {
  __typename
}
    `.trim(),
  },
  cors: {
    origin: "*",
    credentials: true,
  },
  logging: {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  },
});

// Start server
const server = createServer(yoga);

server.listen(PORT, () => {
  console.log(`\n🚀 ${SYSTEM.toUpperCase()} Lightweight Mock Server running`);
  console.log(`   GraphQL endpoint: http://localhost:${PORT}/graphql`);
  console.log(`   System: ${SYSTEM}`);
  console.log(`   Subgraph: ${SUBGRAPH_PATH}`);
  console.log(`   Mode: Yoga + faker.js (no persistence)\n`);
});
