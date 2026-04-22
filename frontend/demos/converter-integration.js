/**
 * Simple JSON Schema <-> GraphQL Converter Integration
 *
 * This is a simplified converter for the web demos.
 * For production use, integrate the Rust WASM converter.
 */

/**
 * Convert JSON Schema to GraphQL SDL
 * @param {string} jsonSchemaStr - JSON Schema as string
 * @returns {string} GraphQL SDL
 */
export function jsonSchemaToGraphQL(jsonSchemaStr) {
  try {
    const schema = JSON.parse(jsonSchemaStr);

    // Extract configuration
    const typeName =
      schema["x-graphql-type"]?.name ||
      schema["x-graphql-type-name"] ||
      schema.title?.replace(/[^a-zA-Z0-9]/g, "") ||
      "GeneratedType";

    const description = schema.description;

    // Start building GraphQL SDL
    let sdl = "";

    // Add custom scalars if defined
    if (schema["x-graphql-scalars"]) {
      sdl += "# Custom Scalars\n";
      for (const [scalarName, scalarDef] of Object.entries(schema["x-graphql-scalars"])) {
        if (scalarDef.description) {
          sdl += `"${scalarDef.description}"\n`;
        }
        sdl += `scalar ${toPascalCase(scalarName)}\n\n`;
      }
    }

    // Add enums from definitions
    if (schema.$defs) {
      for (const [, defSchema] of Object.entries(schema.$defs)) {
        if (defSchema["x-graphql-enum"]) {
          sdl += convertEnum(defSchema);
        }
      }
    }

    // Convert main type
    if (description) {
      sdl += `"${description}"\n`;
    }
    sdl += `type ${typeName} {\n`;

    // Convert properties
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        sdl += convertProperty(propName, propSchema, schema.required);
      }
    }

    sdl += "}\n\n";

    // Add queries if defined
    if (schema["x-graphql-operations"]?.queries) {
      sdl += "type Query {\n";
      for (const [queryName, queryDef] of Object.entries(schema["x-graphql-operations"].queries)) {
        if (queryDef.description) {
          sdl += `  "${queryDef.description}"\n`;
        }

        let args = "";
        if (queryDef.args) {
          const argsList = Object.entries(queryDef.args).map(([argName, argDef]) => {
            return `${argName}: ${argDef.type}`;
          });
          args = `(${argsList.join(", ")})`;
        }

        sdl += `  ${queryName}${args}: ${queryDef.type}\n`;
      }
      sdl += "}\n\n";
    }

    // Add mutations if defined
    if (schema["x-graphql-operations"]?.mutations) {
      sdl += "type Mutation {\n";
      for (const [mutationName, mutationDef] of Object.entries(
        schema["x-graphql-operations"].mutations,
      )) {
        if (mutationDef.description) {
          sdl += `  "${mutationDef.description}"\n`;
        }

        let args = "";
        if (mutationDef.args) {
          const argsList = Object.entries(mutationDef.args).map(([argName, argDef]) => {
            return `${argName}: ${argDef.type}`;
          });
          args = `(${argsList.join(", ")})`;
        }

        sdl += `  ${mutationName}${args}: ${mutationDef.type}\n`;
      }
      sdl += "}\n\n";
    }

    return sdl.trim();
  } catch (error) {
    throw new Error(`Failed to convert JSON Schema to GraphQL: ${error.message}`);
  }
}

/**
 * Convert GraphQL SDL to JSON Schema
 * @param {string} graphqlSdl - GraphQL SDL string
 * @returns {string} JSON Schema as string
 */
export function graphqlToJsonSchema(graphqlSdl) {
  try {
    const schema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {},
      required: [],
    };

    // Parse SDL (simplified parser)
    const lines = graphqlSdl.split("\n");
    let currentType = null;
    let inType = false;
    let description = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip comments and empty lines
      if (line.startsWith("#") || !line) {
        continue;
      }

      // Capture description
      if (line.startsWith('"') && line.endsWith('"')) {
        description = line.slice(1, -1);
        continue;
      }

      // Parse type definition
      if (line.startsWith("type ") && !line.includes("Query") && !line.includes("Mutation")) {
        const match = line.match(/type\s+(\w+)/);
        if (match) {
          currentType = match[1];
          if (description) {
            schema.description = description;
            schema["x-graphql-type-name"] = currentType;
            description = "";
          }
          inType = true;
          continue;
        }
      }

      // Parse scalar
      if (line.startsWith("scalar ")) {
        const match = line.match(/scalar\s+(\w+)/);
        if (match) {
          if (!schema["x-graphql-scalars"]) {
            schema["x-graphql-scalars"] = {};
          }
          schema["x-graphql-scalars"][match[1].toLowerCase()] = {
            description: description || `Custom scalar ${match[1]}`,
            serialize: "String",
          };
          description = "";
        }
        continue;
      }

      // Parse enum
      if (line.startsWith("enum ")) {
        const match = line.match(/enum\s+(\w+)/);
        if (match) {
          if (!schema.$defs) {
            schema.$defs = {};
          }
          const enumName = match[1];
          schema.$defs[toSnakeCase(enumName)] = {
            type: "string",
            enum: [],
            "x-graphql-enum": {
              name: enumName,
              description: description || `${enumName} enumeration`,
              values: [],
            },
          };
          description = "";
        }
        continue;
      }

      // Parse field
      if (inType && line.includes(":")) {
        const fieldMatch = line.match(/(\w+)(?:\([^)]*\))?\s*:\s*([^\s{]+)/);
        if (fieldMatch) {
          const [, fieldName, graphqlType] = fieldMatch;
          const jsonField = convertGraphQLTypeToJSON(graphqlType);

          schema.properties[fieldName] = jsonField;

          if (description) {
            schema.properties[fieldName].description = description;
            description = "";
          }

          // Check if required
          if (graphqlType.includes("!")) {
            if (!schema.required.includes(fieldName)) {
              schema.required.push(fieldName);
            }
          }
        }
      }

      // End of type
      if (line === "}") {
        inType = false;
        currentType = null;
      }
    }

    return JSON.stringify(schema, null, 2);
  } catch (error) {
    throw new Error(`Failed to convert GraphQL to JSON Schema: ${error.message}`);
  }
}

// Helper functions

function convertProperty(propName, propSchema, required = []) {
  let sdl = "  ";

  // Add description
  if (propSchema.description) {
    sdl += `"${propSchema.description}" `;
  }

  // Add field name
  const fieldName =
    propSchema["x-graphql-field"]?.name || propSchema["x-graphql-field-name"] || propName;
  sdl += fieldName;

  // Add type
  let graphqlType =
    propSchema["x-graphql-type"] ||
    propSchema["x-graphql-field"]?.type ||
    jsonTypeToGraphQLType(propSchema);

  // Check if required
  const isRequired = required?.includes(propName) || propSchema["x-graphql-required"] === true;

  if (isRequired && !graphqlType.endsWith("!")) {
    graphqlType += "!";
  }

  sdl += `: ${graphqlType}\n`;

  return sdl;
}

function convertEnum(enumSchema) {
  const enumDef = enumSchema["x-graphql-enum"];
  let sdl = "";

  if (enumDef.description) {
    sdl += `"${enumDef.description}"\n`;
  }

  sdl += `enum ${enumDef.name} {\n`;

  if (enumDef.values) {
    for (const [key, value] of Object.entries(enumDef.values)) {
      if (value.description) {
        sdl += `  "${value.description}"\n`;
      }
      sdl += `  ${value.name || key.toUpperCase()}\n`;
    }
  } else if (enumSchema.enum) {
    for (const value of enumSchema.enum) {
      sdl += `  ${value.toUpperCase()}\n`;
    }
  }

  sdl += "}\n\n";

  return sdl;
}

function jsonTypeToGraphQLType(propSchema) {
  // Check for explicit GraphQL type
  if (propSchema["x-graphql-type"]) {
    return propSchema["x-graphql-type"];
  }

  // Check for scalar
  if (propSchema["x-graphql-scalar"]) {
    return toPascalCase(propSchema["x-graphql-scalar"]);
  }

  // Check for reference
  if (propSchema.$ref) {
    const refName = propSchema.$ref.split("/").pop();
    return toPascalCase(refName);
  }

  // Convert JSON type to GraphQL type
  const type = propSchema.type;

  if (type === "string") {
    if (propSchema.format === "date-time") return "DateTime";
    if (propSchema.format === "date") return "Date";
    if (propSchema.format === "email") return "Email";
    if (propSchema.format === "uri") return "URI";
    return "String";
  }

  if (type === "number" || type === "integer") {
    return propSchema.format === "float" ? "Float" : "Int";
  }

  if (type === "boolean") {
    return "Boolean";
  }

  if (type === "array") {
    const itemType = propSchema.items ? jsonTypeToGraphQLType(propSchema.items) : "String";
    return `[${itemType}]`;
  }

  if (type === "object") {
    return "JSON";
  }

  return "String";
}

function convertGraphQLTypeToJSON(graphqlType) {
  // Remove non-null marker
  graphqlType.endsWith("!");
  const cleanType = graphqlType.replace(/!/g, "");

  // Handle arrays
  if (cleanType.startsWith("[") && cleanType.endsWith("]")) {
    const itemType = cleanType.slice(1, -1);
    return {
      type: "array",
      items: convertGraphQLTypeToJSON(itemType),
    };
  }

  // Convert GraphQL type to JSON type
  const jsonField = {};

  switch (cleanType) {
    case "String":
      jsonField.type = "string";
      break;
    case "Int":
    case "Float":
      jsonField.type = "number";
      break;
    case "Boolean":
      jsonField.type = "boolean";
      break;
    case "ID":
      jsonField.type = "string";
      jsonField["x-graphql-type"] = "ID";
      break;
    case "DateTime":
      jsonField.type = "string";
      jsonField.format = "date-time";
      jsonField["x-graphql-scalar"] = "DateTime";
      break;
    case "Date":
      jsonField.type = "string";
      jsonField.format = "date";
      jsonField["x-graphql-scalar"] = "Date";
      break;
    case "JSON":
      jsonField.type = "object";
      jsonField["x-graphql-scalar"] = "JSON";
      break;
    default:
      // Assume it's a custom type/reference
      jsonField.$ref = `#/$defs/${toSnakeCase(cleanType)}`;
      jsonField["x-graphql-type"] = cleanType;
  }

  return jsonField;
}

function toPascalCase(str) {
  return str
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

function toSnakeCase(str) {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}
