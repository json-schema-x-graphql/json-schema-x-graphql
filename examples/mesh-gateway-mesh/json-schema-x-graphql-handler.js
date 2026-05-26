const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { Converter } = require('@json-schema-x-graphql/core');

// Centralized cache to prevent duplicate REST hits for reverse geocoding within the same execution cycle.
const reverseGeocodeCache = new Map();

async function fetchReverseGeocoding(latitude, longitude) {
  const cacheKey = `${latitude},${longitude}`;
  if (reverseGeocodeCache.has(cacheKey)) {
    return reverseGeocodeCache.get(cacheKey);
  }

  console.log(`[Mesh Shared Cache] Calling BigDataCloud REST GET -> /reverse-geocode-client?lat=${latitude}&lon=${longitude}`);
  try {
    const response = await axios.get('https://api.bigdatacloud.net/data/reverse-geocode-client', {
      params: { latitude, longitude, localityLanguage: 'en' }
    });
    
    // We also need the reverse schema object to map fields
    const reverseSchemaPath = path.resolve(__dirname, '../mesh-gateway/schemas/geocoding-reverse.schema.json');
    const reverseSchema = JSON.parse(fs.readFileSync(reverseSchemaPath, 'utf8'));
    
    const mapped = mapRestToGraphQL(response.data, reverseSchema);
    reverseGeocodeCache.set(cacheKey, mapped);
    return mapped;
  } catch (err) {
    console.error(`[Mesh Shared Cache] BigDataCloud REST Error:`, err.message);
    return null;
  }
}

// Helper to bundle lazy-loaded geocoding promises on a parent node
function getReverseDetails(parent) {
  if (!parent) return null;
  if (!parent._reversePromise) {
    if (parent.latitude && parent.longitude) {
      parent._reversePromise = fetchReverseGeocoding(parent.latitude, parent.longitude);
    } else {
      parent._reversePromise = Promise.resolve(null);
    }
  }
  return parent._reversePromise;
}

function mapRestToGraphQL(data, schema, rootSchema = schema) {
  if (data == null) return null;
  
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

class JsonSchemaXGraphQLHandler {
  constructor({ name, config, baseDir, cache, pubsub }) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
  }

  async getMeshSource() {
    const {
      name: serviceName,
      baseUrl,
      userAgent,
      schemaPath,
      operationType,
      operationField,
      path: urlPath,
      query: defaultQuery = {}
    } = this.config;

    const fullSchemaPath = path.resolve(this.baseDir, schemaPath);
    const schemaText = fs.readFileSync(fullSchemaPath, 'utf8');
    const jsonSchema = JSON.parse(schemaText);

    const converterInstance = new Converter();
    const conversionResult = await converterInstance.convert({
      jsonSchema,
      options: {
        includeDescriptions: true,
        preserveFieldOrder: true,
        validate: false,
        inferIds: false,
        includeFederationDirectives: false,
        namingConvention: 'GRAPHQL_IDIOMATIC',
        outputFormat: 'SDL',
        excludeTypes: [],
        includeOperationalTypes: true
      }
    });

    if (!conversionResult.success) {
      throw new Error(`Failed to convert schema ${schemaPath}: ${JSON.stringify(conversionResult.diagnostics)}`);
    }

    let typeDefs = conversionResult.output;
    if (typeDefs.includes('type GeocodedLocation')) {
      const fieldsToAdd = [];
      if (!typeDefs.includes('city:')) fieldsToAdd.push('  city: String');
      if (!typeDefs.includes('countryName:')) fieldsToAdd.push('  countryName: String');
      if (!typeDefs.includes('principalSubdivision:')) fieldsToAdd.push('  principalSubdivision: String');
      if (!typeDefs.includes('postcode:')) fieldsToAdd.push('  postcode: String');
      if (!typeDefs.includes('name:')) fieldsToAdd.push('  name: String');
      if (!typeDefs.includes('displayName:')) fieldsToAdd.push('  displayName: String');

      if (fieldsToAdd.length > 0) {
        typeDefs = typeDefs.replace(
          /type GeocodedLocation\s*\{/,
          `type GeocodedLocation {\n${fieldsToAdd.join('\n')}`
        );
      }
    }
    const resolvers = {};

    if (operationType === 'query') {
      resolvers.Query = {
        [operationField]: async (_, args) => {
          console.log(`[Mesh - ${serviceName}] REST GET -> ${urlPath}`);
          let finalPath = urlPath;
          for (const [argKey, argVal] of Object.entries(args)) {
            finalPath = finalPath.replace(`{${argKey}}`, encodeURIComponent(argVal));
          }

          const params = { ...defaultQuery };
          if (args.q) params.q = args.q;

          try {
            const headers = userAgent ? { 'User-Agent': userAgent } : {};
            const response = await axios.get(`${baseUrl}${finalPath}`, { params, headers });
            return mapRestToGraphQL(response.data, jsonSchema);
          } catch (err) {
            console.error(`[Mesh - ${serviceName}] Error:`, err.message);
            throw new Error(`Failed to query REST API for ${serviceName}`);
          }
        }
      };

      // Add dynamic in-memory field stitching to fetch BigDataCloud reverse geocode metadata
      if (operationField === 'geocode') {
        resolvers.GeocodedLocation = {
          city: async (parent) => {
            const details = await getReverseDetails(parent);
            return details?.city;
          },
          countryName: async (parent) => {
            const details = await getReverseDetails(parent);
            return details?.countryName;
          },
          principalSubdivision: async (parent) => {
            const details = await getReverseDetails(parent);
            return details?.principalSubdivision;
          },
          postcode: async (parent) => {
            const details = await getReverseDetails(parent);
            return details?.postcode;
          }
        };
      } else if (operationField === 'geocodeIP') {
        resolvers.IpLocation = {
          details: async (parent) => {
            if (parent.latitude && parent.longitude) {
              const details = await fetchReverseGeocoding(parent.latitude, parent.longitude);
              if (details) {
                return {
                  latitude: String(parent.latitude),
                  longitude: String(parent.longitude),
                  name: details.locality || 'IP Location',
                  displayName: parent.isp || 'IP Location',
                  ...details
                };
              }
            }
            return null;
          }
        };
      } else if (operationField === 'geocodeZip') {
        resolvers.ZipPlace = {
          details: async (parent) => {
            if (parent.latitude && parent.longitude) {
              const details = await fetchReverseGeocoding(parent.latitude, parent.longitude);
              if (details) {
                return {
                  latitude: String(parent.latitude),
                  longitude: String(parent.longitude),
                  name: parent.placeName || 'ZIP Location',
                  displayName: parent.placeName || 'ZIP Location',
                  ...details
                };
              }
            }
            return null;
          }
        };
      }
    }

    const schema = makeExecutableSchema({ typeDefs, resolvers });

    return {
      schema
    };
  }
}

module.exports = JsonSchemaXGraphQLHandler;
