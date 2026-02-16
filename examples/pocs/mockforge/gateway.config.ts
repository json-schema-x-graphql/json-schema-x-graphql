/**
 * GraphQL Hive Gateway Configuration
 * The Guild's Node.js federation gateway for Petrified Forest mock services
 */

import { defineConfig } from '@graphql-hive/gateway';

export const gatewayConfig = defineConfig({
  // Load supergraph schema from file
  supergraph: './generated-schemas/petrified.supergraph.graphql',
  
  // Server configuration
  port: 5100,
  hostname: '0.0.0.0',
  
  // Enable GraphiQL playground
  graphiql: {
    enabled: true,
    title: 'Petrified Forest Federation Gateway',
    defaultQuery: `# Hive Gateway - Federation GraphQL API
#
# Query multiple systems through a single endpoint
# Subgraphs: fpds, usaspending, assist, easi, calm

query {
  __typename
}`,
  },
  
  // CORS configuration
  cors: {
    origin: '*',
    credentials: true,
  },
  
  // Logging
  logging: 'info',
  
  // Transport configuration for subgraphs
  transportEntries: {
    // All HTTP subgraphs
    '*.http': {
      options: {
        // Connection timeout
        timeout: 30000,
      },
    },
    // Override individual subgraph locations
    fpds: {
      location: 'http://fpds-mock:4001/graphql',
    },
    usaspending: {
      location: 'http://usaspending-mock:4002/graphql',
    },
    assist: {
      location: 'http://assist-mock:4003/graphql',
    },
    easi: {
      location: 'http://easi-mock:4004/graphql',
    },
    calm: {
      location: 'http://calm-mock:4005/graphql',
    },
  },
});

export default gatewayConfig;
