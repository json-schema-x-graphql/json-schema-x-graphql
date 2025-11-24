/**
 * Simple JSON Schema <-> GraphQL Converter Integration
 *
 * This is a simplified converter for the web demos.
 * For production use, integrate the Rust WASM converter.
 */

interface ConversionOptions {
  validate?: boolean;
  includeDescriptions?: boolean;
  preserveFieldOrder?: boolean;
  federationVersion?: number | null;
}

interface JSONSchema {
  [key: string]: any;
  $schema?: string;
  $id?: string;
  title?: string;
  description?: string;
  type?: string;
  properties?: { [key: string]: any };
  required?: string[];
  $defs?: { [key: string]: any };
  "x-graphql-type"?: any;
  "x-graphql-type-name"?: string;
  "x-graphql-scalars"?: { [key: string]: any };
  "x-graphql-operations"?: any;
}

/**
 * Convert JSON Schema to GraphQL SDL
 */
export function jsonSchemaToGraphQL(
  jsonSchemaStr: string,
  _options: ConversionOptions = {},
): string {
  try {
    const schema: JSONSchema = JSON.parse(jsonSchemaStr);

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
      for (const [scalarName, scalarDef] of Object.entries(
        schema["x-graphql-scalars"],
      )) {
        if (scalarDef.description) {
          sdl += `"${scalarDef.description}"\n`;
        }
        sdl += `scalar ${toPascalCase(scalarName)}\n\n`;
      }
    }

    // Add enums from definitions
    if (schema.$defs) {
      for (const [_defName, defSchema] of Object.entries(schema.$defs)) {
        if (
          defSchema["x-graphql-type-kind"] === "ENUM" ||
          defSchema["x-graphql-enum"] ||
          (defSchema.enum && defSchema["x-graphql-type-name"])
        ) {
          sdl += convertEnum(defSchema);
        }
      }
    }

    // Convert main type
    if (description) {
      sdl += `"${description}"\n`;
    }

    // Add type-level directives
    let typeDirectives = "";
    if (schema["x-graphql-type-directives"]) {
      typeDirectives = formatDirectives(schema["x-graphql-type-directives"]);
    }

    // Add federation @key directive
    if (schema["x-graphql-federation-keys"]) {
      const keys = schema["x-graphql-federation-keys"];
      for (const key of keys) {
        typeDirectives += ` @key(fields: "${key.fields}")`;
      }
    }

    sdl += `type ${typeName}${typeDirectives} {\n`;

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
      for (const [queryName, queryDef] of Object.entries(
        schema["x-graphql-operations"].queries,
      )) {
        const query = queryDef as any;
        if (query.description) {
          sdl += `  "${query.description}"\n`;
        }

        let args = "";
        if (query.args) {
          const argsList = Object.entries(query.args).map(
            ([argName, argDef]) => {
              return `${argName}: ${(argDef as any).type}`;
            },
          );
          args = `(${argsList.join(", ")})`;
        }

        sdl += `  ${queryName}${args}: ${query.type}\n`;
      }
      sdl += "}\n\n";
    }

    // Add mutations if defined
    if (schema["x-graphql-operations"]?.mutations) {
      sdl += "type Mutation {\n";
      for (const [mutationName, mutationDef] of Object.entries(
        schema["x-graphql-operations"].mutations,
      )) {
        const mutation = mutationDef as any;
        if (mutation.description) {
          sdl += `  "${mutation.description}"\n`;
        }

        let args = "";
        if (mutation.args) {
          const argsList = Object.entries(mutation.args).map(
            ([argName, argDef]) => {
              return `${argName}: ${(argDef as any).type}`;
            },
          );
          args = `(${argsList.join(", ")})`;
        }

        sdl += `  ${mutationName}${args}: ${mutation.type}\n`;
      }
      sdl += "}\n\n";
    }

    return sdl.trim();
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to convert JSON Schema to GraphQL: ${err.message}`);
  }
}

/**
 * Convert GraphQL SDL to JSON Schema
 */
export function graphqlToJsonSchema(
  graphqlSdl: string,
  _options: ConversionOptions = {},
): string {
  try {
    const schema: JSONSchema = {
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
      if (
        line.startsWith("type ") &&
        !line.includes("Query") &&
        !line.includes("Mutation")
      ) {
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

          if (!schema.properties) schema.properties = {};
          schema.properties[fieldName] = jsonField;

          if (description) {
            if (schema.properties[fieldName]) {
              schema.properties[fieldName].description = description;
            }
            description = "";
          }

          // Check if required
          if (graphqlType.includes("!")) {
            if (!schema.required) schema.required = [];
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
    const err = error as Error;
    throw new Error(`Failed to convert GraphQL to JSON Schema: ${err.message}`);
  }
}

// Helper functions

function convertProperty(
  propName: string,
  propSchema: any,
  required: string[] = [],
): string {
  let sdl = "  ";

  // Add description
  if (propSchema.description) {
    const escapedDesc = propSchema.description.replace(/"/g, '\\"');
    sdl += `"${escapedDesc}"\n  `;
  }

  // Add field name
  const fieldName =
    propSchema["x-graphql-field"]?.name ||
    propSchema["x-graphql-field-name"] ||
    propName;

  sdl += fieldName;

  // Add arguments if present
  if (propSchema["x-graphql-field-arguments"]) {
    const args = propSchema["x-graphql-field-arguments"];
    const argStrs = args.map((arg: any) => {
      let argStr = `${arg.name}: ${arg.type}`;
      if (arg["default-value"] !== undefined) {
        argStr += ` = ${JSON.stringify(arg["default-value"])}`;
      }
      return argStr;
    });
    sdl += `(${argStrs.join(", ")})`;
  }

  // Add type
  let graphqlType =
    propSchema["x-graphql-type"] ||
    propSchema["x-graphql-field"]?.type ||
    propSchema["x-graphql-field-type"] ||
    jsonTypeToGraphQLType(propSchema);

  // Check if required
  const isRequired =
    required?.includes(propName) ||
    propSchema["x-graphql-required"] === true ||
    propSchema["x-graphql-field-non-null"] === true;

  if (isRequired && !graphqlType.endsWith("!")) {
    graphqlType += "!";
  }

  sdl += `: ${graphqlType}`;

  // Add field directives
  if (propSchema["x-graphql-field-directives"]) {
    sdl += formatDirectives(propSchema["x-graphql-field-directives"]);
  }

  sdl += "\n";

  return sdl;
}

function convertEnum(enumSchema: any): string {
  const enumDef = enumSchema["x-graphql-enum"];
  let sdl = "";

  // Get enum name
  const enumName =
    enumSchema["x-graphql-type-name"] || enumDef?.name || "UnknownEnum";

  // Add description
  const description = enumSchema.description || enumDef?.description;
  if (description) {
    sdl += `"${description}"\n`;
  }

  sdl += `enum ${enumName} {\n`;

  // Handle enum values
  if (enumDef?.values) {
    for (const [key, value] of Object.entries(enumDef.values)) {
      const val = value as any;
      if (val.description) {
        sdl += `  "${val.description}"\n`;
      }
      sdl += `  ${val.name || key.toUpperCase()}\n`;
    }
  } else if (enumSchema.enum) {
    const valueConfigs = enumSchema["x-graphql-enum-value-configs"] || {};
    for (const value of enumSchema.enum) {
      const config = valueConfigs[value];
      if (config?.description) {
        sdl += `  "${config.description}"\n`;
      }
      sdl += `  ${value}\n`;
    }
  }

  sdl += "}\n\n";

  return sdl;
}

function jsonTypeToGraphQLType(propSchema: any): string {
  // Check for explicit GraphQL type
  if (propSchema["x-graphql-type"]) {
    return propSchema["x-graphql-type"];
  }

  if (propSchema["x-graphql-field-type"]) {
    return propSchema["x-graphql-field-type"];
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
    if (propSchema.format === "email") return "String";
    if (propSchema.format === "uri") return "String";
    return "String";
  }

  if (type === "number" || type === "integer") {
    return propSchema.format === "float" ? "Float" : "Int";
  }

  if (type === "boolean") {
    return "Boolean";
  }

  if (type === "array") {
    const itemType = propSchema.items
      ? jsonTypeToGraphQLType(propSchema.items)
      : "String";
    const itemNonNull =
      propSchema["x-graphql-field-list-item-non-null"] === true ? "!" : "";
    return `[${itemType}${itemNonNull}]`;
  }

  if (type === "object") {
    return "JSON";
  }

  return "String";
}

function convertGraphQLTypeToJSON(graphqlType: string): any {
  // Remove non-null marker
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
  const jsonField: any = {};

  switch (cleanType) {
    case "String":
      jsonField.type = "string";
      break;
    case "Int":
      jsonField.type = "integer";
      break;
    case "Float":
      jsonField.type = "number";
      break;
    case "Boolean":
      jsonField.type = "boolean";
      break;
    case "ID":
      jsonField.type = "string";
      jsonField["x-graphql-field-type"] = "ID";
      break;
    case "DateTime":
      jsonField.type = "string";
      jsonField.format = "date-time";
      jsonField["x-graphql-field-type"] = "DateTime";
      break;
    case "Date":
      jsonField.type = "string";
      jsonField.format = "date";
      jsonField["x-graphql-field-type"] = "Date";
      break;
    case "JSON":
      jsonField.type = "object";
      jsonField["x-graphql-field-type"] = "JSON";
      break;
    default:
      // Assume it's a custom type/reference
      jsonField.$ref = `#/$defs/${toSnakeCase(cleanType)}`;
      jsonField["x-graphql-field-type"] = cleanType;
  }

  return jsonField;
}

function toPascalCase(str: string): string {
  return str
    .split(/[_-]/)
    .map(
      (word: string) =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join("");
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

function formatDirectives(directives: any[]): string {
  if (!directives || directives.length === 0) return "";

  return directives
    .map((dir) => {
      let result = ` @${dir.name}`;
      if (dir.args && Object.keys(dir.args).length > 0) {
        const argStrs = Object.entries(dir.args).map(([key, value]) => {
          if (typeof value === "string") {
            return `${key}: "${value}"`;
          }
          return `${key}: ${JSON.stringify(value)}`;
        });
        result += `(${argStrs.join(", ")})`;
      }
      return result;
    })
    .join("");
}
