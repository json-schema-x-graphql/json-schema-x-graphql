/**
 * Lightweight Mock GraphQL Server
 *
 * Serves individual system subgraph with faker.js data and CSV seed data.
 * Yoga + GraphQL Mesh compatible - no SQLite dependency.
 * Environment: PORT (default 3000), SYSTEM (fpds, usaspending, assist, easi, calm)
 */

import { createYoga } from 'graphql-yoga';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { addMocksToSchema } from '@graphql-tools/mock';
import { faker } from '@faker-js/faker';
import { customResolvers, fieldPatterns } from './mockforge.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PORT = process.env.PORT || 3000;
const SYSTEM = process.env.SYSTEM || 'fpds';
const SUBGRAPH_PATH = resolve(__dirname, `../../../generated-schemas/${SYSTEM}.subgraph.graphql`);

// Seed faker for deterministic data per system
faker.seed({
  fpds: 12345,
  usaspending: 23456,
  assist: 34567,
  easi: 45678,
  calm: 56789
}[SYSTEM] || 12345);

console.log(`✅ Initialized ${SYSTEM} mock server (lightweight Yoga + faker.js)`);

/**
 * Load subgraph schema for specific system
 */
function loadSystemSchema(system) {
  try {
    let subgraph = readFileSync(SUBGRAPH_PATH, 'utf-8');

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

  // Add custom resolvers for this system
  if (customResolvers[system]) {
    Object.assign(resolvers, customResolvers[system]);
  }

  return resolvers;
}

// Load schema and create executable schema with mocks
const typeDefs = loadSystemSchema(SYSTEM);
const baseResolvers = generateResolvers(SYSTEM);

const baseSchema = makeExecutableSchema({
  typeDefs,
  resolvers: baseResolvers,
});

// Add automatic mocks with faker.js
const schema = addMocksToSchema({
  schema: baseSchema,
  mocks: {
    Int: () => faker.number.int({ min: 1, max: 100000 }),
    Float: () => faker.number.float({ min: 0, max: 1000000, precision: 0.01 }),
    String: () => faker.lorem.words(3),
    Boolean: () => faker.datatype.boolean(),
    DateTime: () => faker.date.past().toISOString(),
    Date: () => faker.date.past().toISOString().split('T')[0],
    Email: () => faker.internet.email(),
    URI: () => faker.internet.url(),
  },
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
    `.trim()
  },
  cors: {
    origin: '*',
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
