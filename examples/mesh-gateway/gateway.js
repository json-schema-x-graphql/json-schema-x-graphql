const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const axios = require('axios');
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const { ApolloGateway, IntrospectAndCompose } = require('@apollo/gateway');
const { gql } = require('graphql-tag');
const { Converter } = require('@json-schema-x-graphql/core');

// Recursive utility to map raw REST API response fields to camelCase GraphQL fields,
// resolving local $ref schemas, remapping renames, normalising key formats (handling spaces/hyphens),
// and enforcing type structures dynamically based on the converted JSON Schema.
function mapRestToGraphQL(data, schema, rootSchema = schema) {
  if (!data) return null;
  
  if (schema && schema.$ref) {
    const refPath = schema.$ref.replace('#/', '').split('/');
    let current = rootSchema;
    for (const segment of refPath) {
      if (!current) break;
      current = current[segment];
    }
    schema = current;
  }
  
  if (Array.isArray(data)) {
    const itemSchema = schema.items;
    return data.map(item => mapRestToGraphQL(item, itemSchema, rootSchema));
  }
  
  if (typeof data !== 'object') {
    return data;
  }
  
  const mapped = {};
  const properties = schema.properties || {};
  
  for (const [restKey, value] of Object.entries(data)) {
    let propSchema = properties[restKey];
    
    // Key normalization: Convert spaces/hyphens to underscores to map fields like "place name" to "place_name"
    const normKey = restKey.replace(/[-\s]+/g, '_');
    if (!propSchema) {
      propSchema = properties[normKey];
    }
    
    if (!propSchema) {
      const foundEntry = Object.entries(properties).find(([k, v]) => 
        k === restKey || 
        k === normKey || 
        v['x-graphql-field-name'] === restKey || 
        v['x-graphql-field-name'] === normKey
      );
      if (foundEntry) {
        propSchema = foundEntry[1];
      }
    }
    
    if (propSchema) {
      if (propSchema.$ref) {
        const refPath = propSchema.$ref.replace('#/', '').split('/');
        let current = rootSchema;
        for (const segment of refPath) {
          if (!current) break;
          current = current[segment];
        }
        propSchema = current;
      }
      
      const gqlKey = propSchema['x-graphql-field-name'] || toCamelCase(restKey);
      if (propSchema.type === 'object') {
        mapped[gqlKey] = mapRestToGraphQL(value, propSchema, rootSchema);
      } else if (propSchema.type === 'array') {
        const subItemsSchema = propSchema.items || {};
        mapped[gqlKey] = (value || []).map(item => mapRestToGraphQL(item, subItemsSchema, rootSchema));
      } else {
        if (propSchema['x-graphql-field-type'] === 'String' && typeof value !== 'string') {
          mapped[gqlKey] = String(value);
        } else {
          mapped[gqlKey] = value;
        }
      }
    } else {
      const gqlKey = toCamelCase(restKey);
      mapped[gqlKey] = value;
    }
  }
  return mapped;
}

function toCamelCase(str) {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}

async function convertSchema(schemaPath) {
  const schemaText = fs.readFileSync(schemaPath, 'utf8');
  const jsonSchema = JSON.parse(schemaText);
  
  const converterInstance = new Converter();
  const conversionResult = await converterInstance.convert({
    jsonSchema,
    options: {
      includeDescriptions: true,
      preserveFieldOrder: true,
      validate: false,
      inferIds: false,
      federationVersion: 'V2',
      includeFederationDirectives: true,
      namingConvention: 'GRAPHQL_IDIOMATIC',
      outputFormat: 'SDL',
      excludeTypes: [],
      includeOperationalTypes: true
    }
  });
  
  if (!conversionResult.success) {
    console.error(`Conversion errors for ${schemaPath}:`, conversionResult.diagnostics);
    throw new Error(`Failed to convert schema ${schemaPath}`);
  }
  
  return {
    sdl: conversionResult.output,
    jsonSchema
  };
}

async function start() {
  console.log('=== Starting Federated REST Emulator & Stitching Gateway ===');
  
  const configPath = path.join(__dirname, 'endpoints-config.yaml');
  const config = yaml.parse(fs.readFileSync(configPath, 'utf8'));
  console.log(`Loaded endpoints-config.yaml with ${config.endpoints.length} services.\n`);
  
  console.log('Converting JSON Schemas to Federated GraphQL SDLs...');
  
  const nominatimConfig = config.endpoints.find(e => e.name === 'NominatimGeocoding');
  const bigDataCloudConfig = config.endpoints.find(e => e.name === 'BigDataCloudReverseGeocoding');
  const ipConfig = config.endpoints.find(e => e.name === 'IpApiGeocoding');
  const zipConfig = config.endpoints.find(e => e.name === 'ZippopotamGeocoding');
  
  const fwdSchemaPath = path.resolve(__dirname, nominatimConfig.operations[0].schema);
  const revSchemaPath = path.resolve(__dirname, bigDataCloudConfig.operations[0].schema);
  const ipSchemaPath = path.resolve(__dirname, ipConfig.operations[0].schema);
  const zipSchemaPath = path.resolve(__dirname, zipConfig.operations[0].schema);
  
  const fwdRes = await convertSchema(fwdSchemaPath);
  const revRes = await convertSchema(revSchemaPath);
  const ipRes = await convertSchema(ipSchemaPath);
  const zipRes = await convertSchema(zipSchemaPath);
  
  console.log('✔ Nominatim Subgraph SDL generated successfully.');
  console.log('✔ BigDataCloud Subgraph SDL generated successfully.');
  console.log('✔ IP-API Subgraph SDL generated successfully.');
  console.log('✔ Zippopotam Subgraph SDL generated successfully.\n');
  
  const federationHeader = `
    extend schema
      @link(url: "https://specs.apollo.dev/federation/v2.9",
            import: ["@key", "@shareable", "@external"])
  `;
  
  // =========================================================================
  // SUBGRAPH A: Nominatim (Forward Geocoding)
  // =========================================================================
  const fwdTypeDefs = gql(federationHeader + "\n" + fwdRes.sdl);
  const fwdSchemaObj = fwdRes.jsonSchema;
  
  const fwdResolvers = {
    Query: {
      geocode: async (_, { q }) => {
        console.log(`[Nominatim Subgraph] REST GET -> /search?q=${q}`);
        try {
          const response = await axios.get(`${nominatimConfig.baseUrl}/search`, {
            params: { q, format: 'json', limit: 5 },
            headers: { 'User-Agent': nominatimConfig.userAgent }
          });
          return mapRestToGraphQL(response.data, fwdSchemaObj);
        } catch (err) {
          console.error('[Nominatim Subgraph] REST Error:', err.message);
          throw new Error('Failed to query Nominatim REST API');
        }
      }
    }
  };
  
  const fwdSubgraph = new ApolloServer({
    schema: buildSubgraphSchema({ typeDefs: fwdTypeDefs, resolvers: fwdResolvers })
  });
  const { url: fwdUrl } = await startStandaloneServer(fwdSubgraph, { listen: { port: 4001 } });
  console.log(`🚀 Nominatim Subgraph running at: ${fwdUrl}`);
  
  // =========================================================================
  // SUBGRAPH B: BigDataCloud (Reverse Geocoding)
  // =========================================================================
  const revTypeDefs = gql(federationHeader + "\n" + revRes.sdl);
  const revSchemaObj = revRes.jsonSchema;
  
  const revResolvers = {
    GeocodedLocation: {
      __resolveReference: async (representation) => {
        const { latitude, longitude } = representation;
        console.log(`[BigDataCloud Subgraph] REST GET -> /reverse-geocode-client?lat=${latitude}&lon=${longitude}`);
        try {
          const response = await axios.get(`${bigDataCloudConfig.baseUrl}/reverse-geocode-client`, {
            params: { latitude, longitude, localityLanguage: 'en' }
          });
          const mapped = mapRestToGraphQL(response.data, revSchemaObj);
          mapped.latitude = latitude;
          mapped.longitude = longitude;
          return mapped;
        } catch (err) {
          console.error('[BigDataCloud Subgraph] REST Error:', err.message);
          throw new Error('Failed to query BigDataCloud REST API');
        }
      }
    }
  };
  
  const revSubgraph = new ApolloServer({
    schema: buildSubgraphSchema({ typeDefs: revTypeDefs, resolvers: revResolvers })
  });
  const { url: revUrl } = await startStandaloneServer(revSubgraph, { listen: { port: 4002 } });
  console.log(`🚀 BigDataCloud Subgraph running at: ${revUrl}`);
  
  // =========================================================================
  // SUBGRAPH C: IP-API (IP Geocoding)
  // =========================================================================
  const ipTypeDefs = gql(federationHeader + "\n" + ipRes.sdl);
  const ipSchemaObj = ipRes.jsonSchema;
  
  const ipResolvers = {
    Query: {
      geocodeIP: async (_, { ip }) => {
        console.log(`[IP-API Subgraph] REST GET -> /json/${ip}`);
        try {
          const response = await axios.get(`${ipConfig.baseUrl}/json/${ip}`);
          return mapRestToGraphQL(response.data, ipSchemaObj);
        } catch (err) {
          console.error('[IP-API Subgraph] REST Error:', err.message);
          throw new Error('Failed to query IP-API REST API');
        }
      }
    },
    IpLocation: {
      // Connect coordinates back to the federated GeocodedLocation entity
      details: (parent) => {
        if (parent.latitude && parent.longitude) {
          return {
            __typename: 'GeocodedLocation',
            latitude: String(parent.latitude),
            longitude: String(parent.longitude)
          };
        }
        return null;
      }
    }
  };
  
  const ipSubgraph = new ApolloServer({
    schema: buildSubgraphSchema({ typeDefs: ipTypeDefs, resolvers: ipResolvers })
  });
  const { url: ipUrl } = await startStandaloneServer(ipSubgraph, { listen: { port: 4003 } });
  console.log(`🚀 IP-API Subgraph running at: ${ipUrl}`);
  
  // =========================================================================
  // SUBGRAPH D: Zippopotam (ZIP Code Geocoding)
  // =========================================================================
  const zipTypeDefs = gql(federationHeader + "\n" + zipRes.sdl);
  const zipSchemaObj = zipRes.jsonSchema;
  
  const zipResolvers = {
    Query: {
      geocodeZip: async (_, { zip, countryCode }) => {
        const lowerCountry = countryCode.toLowerCase();
        console.log(`[Zippopotam Subgraph] REST GET -> /${lowerCountry}/${zip}`);
        try {
          const response = await axios.get(`${zipConfig.baseUrl}/${lowerCountry}/${zip}`);
          return mapRestToGraphQL(response.data, zipSchemaObj);
        } catch (err) {
          console.error('[Zippopotam Subgraph] REST Error:', err.message);
          throw new Error('Failed to query Zippopotam REST API');
        }
      }
    },
    ZipPlace: {
      // Connect coordinates back to the federated GeocodedLocation entity
      details: (parent) => {
        if (parent.latitude && parent.longitude) {
          return {
            __typename: 'GeocodedLocation',
            latitude: String(parent.latitude),
            longitude: String(parent.longitude)
          };
        }
        return null;
      }
    }
  };
  
  const zipSubgraph = new ApolloServer({
    schema: buildSubgraphSchema({ typeDefs: zipTypeDefs, resolvers: zipResolvers })
  });
  const { url: zipUrl } = await startStandaloneServer(zipSubgraph, { listen: { port: 4004 } });
  console.log(`🚀 Zippopotam Subgraph running at: ${zipUrl}`);
  
  // =========================================================================
  // STITCHED ROUTER GATEWAY
  // =========================================================================
  console.log('\nStarting API Gateway Router & composing all 4 subgraphs...');
  
  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: [
        { name: 'nominatim', url: 'http://localhost:4001/' },
        { name: 'bigdatacloud', url: 'http://localhost:4002/' },
        { name: 'ipapi', url: 'http://localhost:4003/' },
        { name: 'zippopotam', url: 'http://localhost:4004/' }
      ]
    })
  });
  
  const gatewayServer = new ApolloServer({ gateway });
  const { url: gatewayUrl } = await startStandaloneServer(gatewayServer, { listen: { port: 4000 } });
  
  console.log(`\n🎉 Gateway Stitched Router running successfully!`);
  console.log(`👉 Query Interface Available at: ${gatewayUrl}`);
  console.log('------------------------------------------------------------\n');
}

start().catch(err => {
  console.error('Fatal gateway startup error:', err);
  process.exit(1);
});
