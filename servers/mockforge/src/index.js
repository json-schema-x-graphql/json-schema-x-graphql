import { createYoga } from 'graphql-yoga';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { addMocksToSchema } from '@graphql-tools/mock';
import { faker } from '@faker-js/faker';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure we are referencing the correct path to the examples directory
const EXAMPLES_DIR = resolve(__dirname, '../../../examples/federation/sdl/apollo-classic');

const FEDERATION_DIRECTIVES = `
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

scalar _FieldSet
`;

function createMockServer(name, filename, port) {
  try {
    let typeDefs = readFileSync(resolve(EXAMPLES_DIR, filename), 'utf-8');
    typeDefs = FEDERATION_DIRECTIVES + typeDefs;

    const baseSchema = makeExecutableSchema({ typeDefs });

    const schema = addMocksToSchema({
      schema: baseSchema,
      mocks: {
        Int: () => faker.number.int({ min: 1, max: 1000 }),
        Float: () => faker.number.float({ min: 0, max: 1000, precision: 0.01 }),
        String: () => faker.lorem.words(2),
        Boolean: () => faker.datatype.boolean(),
        ID: () => faker.string.uuid(),
      },
      preserveResolvers: false,
    });

    const yoga = createYoga({
      schema,
      graphiql: {
        title: `MockForge ${name} API`,
      },
      logging: false, // keep output clean
    });

    const server = createServer(yoga);

    server.listen(port, () => {
      console.log(`✅ [${name}] Mock Subgraph running on http://localhost:${port}/graphql`);
    });

    return server;
  } catch (error) {
    console.error(`❌ Failed to start mock server for ${name}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Starting MockForge Subgraphs...');
  
  const servers = [
    createMockServer('Products', 'products-service.graphql', 4001),
    createMockServer('Reviews', 'reviews-service.graphql', 4002),
    createMockServer('Users', 'users-service.graphql', 4003),
  ];

  console.log('✨ Starting GraphQL Mesh Gateway on port 5050...');
  
  const meshProcess = spawn('npx', ['mesh', 'dev'], {
    cwd: resolve(__dirname, '..'),
    stdio: 'inherit',
    shell: true
  });

  meshProcess.on('error', (err) => {
    console.error('Failed to start GraphQL Mesh:', err);
  });

  process.on('SIGINT', () => {
    console.log('🛑 Shutting down MockForge...');
    meshProcess.kill('SIGINT');
    servers.forEach(s => s && s.close());
    process.exit(0);
  });
}

main().catch(console.error);
