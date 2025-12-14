/**
 * GraphQL Hive Gateway Configuration
 * The Guild's Node.js federation gateway for Schema Unification Forest mock services
 */

import { defineConfig } from '@graphql-hive/gateway';

export const gatewayConfig = defineConfig({
  // Load supergraph schema from file
  supergraph: './generated-schemas/schema_unification.supergraph.graphql',
  
  // Server configuration
  port: 5100,
  hostname: '0.0.0.0',
  
  // Enable GraphiQL playground
  graphiql: {
    enabled: true,
    title: 'Schema Unification Forest Federation Gateway',
    defaultQuery: `# Hive Gateway - Federation GraphQL API
#
# Query multiple systems through a single endpoint
# Subgraphs: contract_data, public_spending, legacy_procurement, intake_process, logistics_mgmt

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
    contract_data: {
      location: 'http://contract_data-mock:4001/graphql',
    },
    public_spending: {
      location: 'http://public_spending-mock:4002/graphql',
    },
    legacy_procurement: {
      location: 'http://legacy_procurement-mock:4003/graphql',
    },
    intake_process: {
      location: 'http://intake_process-mock:4004/graphql',
    },
    logistics_mgmt: {
      location: 'http://logistics_mgmt-mock:4005/graphql',
    },
  },
});

export default gatewayConfig;
