/**
 * JSON Schema to GraphQL SDL Generator Library
 * 
 * This library provides functions to convert JSON Schema (with x-graphql-* extensions)
 * into Apollo Federation-compatible GraphQL SDL.
 */

import { snakeToCamel } from "../helpers/case-conversion.mjs";

/**
 * Convert snake_case to PascalCase and sanitize for GraphQL
 */
export function snakeToPascal(str) {
  if (!str) return "";
  return str
    .split(/[^a-zA-Z0-9]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

/**
 * Get type name with x-graphql-type-name hint support
 */
export function getTypeName(schema, defaultName) {
  return schema["x-graphql-type-name"] || snakeToPascal(defaultName);
}

/**
 * Get field name with x-graphql-field-name hint support
 */
export function getFieldName(schema, defaultName) {
  return schema["x-graphql-field-name"] || snakeToCamel(defaultName);
}

/**
 * Get description with x-graphql-description hint support
 */
export function getDescription(schema) {
  const raw = schema["x-graphql-description"] || schema.description || "";
  if (typeof raw !== "string" || !raw) return "";
  // Escape triple quotes for SDL
  return raw.replace(/\"\"\"/g, '\\"\\"\\"');
}

/**
 * Determine if field is nullable
 */
export function isNullable(schema, propName, parentRequired = []) {
  if (schema["x-graphql-nullable"] !== undefined) {
    return schema["x-graphql-nullable"];
  }
  return !parentRequired.includes(propName);
}

/**
 * Get scalar type mapping
 */
export function getScalarType(schema) {
  const format = schema.format;
  const xGraphqlScalar = schema["x-graphql-scalar"];

  if (xGraphqlScalar) {
    return xGraphqlScalar;
  }

  // Format-based mapping
  if (format === "date-time") return "DateTime";
  if (format === "date") return "Date";
  if (format === "time") return "Time";
  if (format === "email") return "Email";
  if (format === "uri" || format === "url") return "URI";

  return null;
}

/**
 * Map JSON Schema type to GraphQL type
 */
export function mapType(schema, propName, options = {}) {
  const { 
    parentRequired = [], 
    rootSchema = null, 
    supergraphSchema = null
  } = options;

  // Handle $ref
  if (schema.$ref) {
    const refParts = schema.$ref.split("/");
    const refName = refParts[refParts.length - 1];
    
    // Check if reference is to external schema
    if (refParts[0] && !refParts[0].startsWith("#")) {
      const refName = refParts[refParts.length - 1];
      let typeName = snakeToPascal(refName);
      
      // Try to resolve from supergraph schema
      if (supergraphSchema && supergraphSchema.$defs && supergraphSchema.$defs[refName]) {
        typeName = getTypeName(supergraphSchema.$defs[refName], refName);
      }
      
      const nullable = isNullable(schema, propName, parentRequired);
      return nullable ? typeName : `${typeName}!`;
    }
    
    // Internal reference
    let typeName = snakeToPascal(refName);
    if (rootSchema && rootSchema.$defs && rootSchema.$defs[refName]) {
      typeName = getTypeName(rootSchema.$defs[refName], refName);
    }
    
    const nullable = isNullable(schema, propName, parentRequired);
    return nullable ? typeName : `${typeName}!`;
  }

  // Handle anyOf/oneOf (union types)
  if (schema.oneOf || schema.anyOf) {
    const unionSchema = schema.oneOf || schema.anyOf;
    const types = unionSchema
      .filter((s) => s.type && s.type !== "null")
      .map((s) => mapType(s, propName, { ...options, parentRequired: [] }));
    if (types.length === 1) return types[0];
    return types[0] || "String";
  }

  // Handle arrays
  if (schema.type === "array" && schema.items) {
    const itemType = mapType(schema.items, propName, { ...options, parentRequired: [] });
    const nullable = isNullable(schema, propName, parentRequired);
    return nullable ? `[${itemType}]` : `[${itemType}]!`;
  }

  // Check for custom scalars
  const scalarType = getScalarType(schema);
  if (scalarType) {
    const nullable = isNullable(schema, propName, parentRequired);
    return nullable ? scalarType : `${scalarType}!`;
  }

  // Check for explicit field type hint
  if (schema["x-graphql-field-type"]) {
    const nullable = isNullable(schema, propName, parentRequired);
    const typeName = schema["x-graphql-field-type"];
    return nullable ? typeName : `${typeName}!`;
  }

  // Basic type map
  const typeMap = {
    string: "String",
    integer: "Int",
    number: "Float",
    boolean: "Boolean",
    object: "JSON",
  };

  let graphqlType = typeMap[schema.type] || "String";

  if (Array.isArray(schema.type)) {
    const types = schema.type.filter((t) => t !== "null");
    if (types.includes("number")) graphqlType = "Float";
    else if (types.includes("integer")) graphqlType = "Int";
    else if (types.includes("boolean")) graphqlType = "Boolean";
    else graphqlType = "String";
  }

  const nullable = isNullable(schema, propName, parentRequired);
  return nullable ? graphqlType : `${graphqlType}!`;
}

/**
 * Format GraphQL directives
 */
export function formatDirectives(directives, filter = null) {
  if (!directives) return "";
  
  if (typeof directives === "string") {
    if (filter) {
      const name = directives.match(/@(\w+)/)?.[1];
      if (name && !filter.shouldInclude(name)) return "";
    }
    return directives;
  }
  
  if (Array.isArray(directives)) {
    return directives
      .filter((dir) => {
        const name = typeof dir === "string" ? dir.match(/@(\w+)/)?.[1] : dir.name;
        if (filter && name && !filter.shouldInclude(name)) return false;
        return true;
      })
      .map((dir) => {
        if (typeof dir === "string") return dir;
        if (!dir.args || Object.keys(dir.args).length === 0) return `@${dir.name}`;
        
        const args = Object.entries(dir.args)
          .map(([key, value]) => {
            if (typeof value === "string") return `${key}: "${value}"`;
            return `${key}: ${JSON.stringify(value)}`;
          })
          .join(", ");
          
        return `@${dir.name}(${args})`;
      })
      .join(" ");
  }

  return "";
}

/**
 * Generate field arguments
 */
export function generateFieldArgs(args, filter = null) {
  if (!args || Object.keys(args).length === 0) return "";

  const argStrings = Object.entries(args).map(([name, argDef]) => {
    const type = argDef.type || "String";
    const defaultVal = argDef.default !== undefined ? ` = ${JSON.stringify(argDef.default)}` : "";
    const desc = argDef.description ? `"${argDef.description}" ` : "";
    
    // Support arguments with directives
    let directiveStr = "";
    if (argDef["x-graphql-arg-directives"]) {
      directiveStr = ` ${formatDirectives(argDef["x-graphql-arg-directives"], filter)}`;
    }

    return `${desc}${name}: ${type}${defaultVal}${directiveStr}`;
  });

  return `(${argStrings.join(", ")})`;
}

/**
 * Generate enum type
 */
export function generateEnum(name, schema) {
  const enumName = getTypeName(schema, name);
  const desc = getDescription(schema);
  const output = [];

  if (desc) output.push(`"""\n${desc}\n"""`);
  output.push(`enum ${enumName} {`);

  const enumData = schema["x-graphql-enum"] || schema;
  const values = enumData.values || schema.enum || [];

  if (Array.isArray(values)) {
    values.forEach((value) => {
      if (value === null) return;
      output.push(`  ${String(value).toUpperCase().replace(/[^A-Z0-9_]/g, "_")}`);
    });
  } else if (typeof values === "object") {
    Object.entries(values).forEach(([snakeValue, config]) => {
      const enumValue = config.name || snakeValue.toUpperCase();
      if (config.description) output.push(`  """${config.description}"""`);
      if (config.deprecated) {
        output.push(`  ${enumValue} @deprecated(reason: "${config.deprecated}")`);
      } else {
        output.push(`  ${enumValue}`);
      }
    });
  }

  output.push("}\n");
  return output.join("\n");
}

/**
 * Resolve a schema reference
 */
export function resolveSchema(schema, options = {}) {
  if (!schema || !schema.$ref) return schema;
  
  const { rootSchema = null, supergraphSchema = null } = options;
  const ref = schema.$ref;
  
  if (ref.startsWith("#/")) {
    // Internal ref
    if (!rootSchema) return schema;
    const parts = ref.split("/").slice(1);
    let current = rootSchema;
    for (const part of parts) {
      if (current[part] === undefined) return schema;
      current = current[part];
    }
    return resolveSchema(current, options);
  } else if (ref.includes("#/")) {
    // External ref with fragment
    const [file, fragment] = ref.split("#");
    let base = null;
    if (file === "petrified-supergraph.schema.json") {
      base = supergraphSchema;
    }
    
    if (!base) return schema;
    
    const parts = fragment.split("/").slice(1);
    let current = base;
    for (const part of parts) {
      if (current[part] === undefined) return schema;
      current = current[part];
    }
    return resolveSchema(current, options);
  }
  
  return schema;
}

/**
 * Generate object type
 */
export function generateObjectType(name, schema, options = {}) {
  const { rootSchema = null, supergraphSchema = null, generatedTypes = new Set() } = options;
  const typeName = getTypeName(schema, name);

  if (generatedTypes.has(typeName)) return "";
  generatedTypes.add(typeName);

  const desc = getDescription(schema);
  const graphqlType = schema["x-graphql-type"];
  const implements_ = schema["x-graphql-implements"] || [];
  const federatedKeys = schema["x-graphql-federation"]?.keys || [];
  const directives = schema["x-graphql-directives"] || [];

  const output = [];
  if (desc) output.push(`"""\n${desc}\n"""`);

  let typeKeyword = "type";
  if (graphqlType === "interface") typeKeyword = "interface";
  else if (graphqlType === "input" || schema["x-graphql-input"]) typeKeyword = "input";

  let typeDecl = `${typeKeyword} ${typeName}`;
  if (implements_.length > 0) typeDecl += ` implements ${implements_.join(" & ")}`;

  // Federation keys
  const keys = Array.isArray(federatedKeys) ? federatedKeys : [federatedKeys];
  keys.forEach((key) => {
    typeDecl += ` @key(fields: "${key}")`;
  });

  if (directives.length > 0) {
    typeDecl += ` ${formatDirectives(directives, options.filter)}`;
  }

  const required = [...(schema.required || [])];
  const properties = { ...(schema.properties || {}) };

  // Handle allOf
  if (schema.allOf) {
    schema.allOf.forEach(subSchema => {
      const resolved = resolveSchema(subSchema, options);
      if (resolved.properties) {
        Object.assign(properties, resolved.properties);
      }
      if (resolved.required) {
        required.push(...resolved.required);
      }
    });
  }

  const propertyEntries = Object.entries(properties).filter(([_, propSchema]) => !propSchema["x-graphql-skip"]);

  if (propertyEntries.length === 0) {
    // GraphQL types/interfaces/inputs must have at least one field
    // If it's an empty object, we skip generating it as a type
    generatedTypes.delete(typeName);
    return "";
  }

  output.push(`${typeDecl} {`);

  propertyEntries.forEach(([propName, propSchema]) => {
    const fieldName = getFieldName(propSchema, propName);
    const fieldType = mapType(propSchema, propName, { ...options, parentRequired: required });
    const fieldDesc = getDescription(propSchema);
    const fieldArgs = propSchema["x-graphql-args"];
    const fieldDirectives = propSchema["x-graphql-directives"] || [];

    if (fieldDesc) output.push(`  """${fieldDesc}"""`);

    let fieldDecl = `  ${fieldName}`;
    if (fieldArgs) fieldDecl += generateFieldArgs(fieldArgs, options.filter);
    fieldDecl += `: ${fieldType}`;

    if (fieldDirectives.length > 0) {
      fieldDecl += ` ${formatDirectives(fieldDirectives, options.filter)}`;
    }

    output.push(fieldDecl);
  });

  output.push("}\n");
  return output.join("\n");
}

/**
 * Generate Relay pagination types
 */
export function generateRelayTypes(paginationConfig) {
  if (!paginationConfig || !paginationConfig.enabled) return "";
  
  const results = [];
  
  // PageInfo is always the same
  results.push(`"""
Information about pagination in a connection.
"""
type PageInfo {
  """When paginating forwards, are there more items?"""
  hasNextPage: Boolean!
  """When paginating backwards, are there more items?"""
  hasPreviousPage: Boolean!
  """When paginating backwards, the cursor to continue."""
  startCursor: String
  """When paginating forwards, the cursor to continue."""
  endCursor: String
}
`);

  if (paginationConfig.types) {
    for (const [typeName, configs] of Object.entries(paginationConfig.types)) {
      const pascalName = snakeToPascal(typeName);
      const connName = configs.connection || `${pascalName}Connection`;
      const edgeName = configs.edge || `${pascalName}Edge`;
      
      results.push(`"""
A connection to a list of items.
"""
type ${connName} {
  """A list of edges."""
  edges: [${edgeName}]
  """Information to aid in pagination."""
  pageInfo: PageInfo!
  """Total count of items in the connection."""
  totalCount: Int
}

"""
An edge in a connection.
"""
type ${edgeName} {
  """The item at the end of the edge."""
  node: ${pascalName}
  """A cursor for use in pagination."""
  cursor: String!
}
`);
    }
  }
  
  return results.join("\n");
}

/**
 * Generate union type
 */
export function generateUnion(name, schema) {
  const unionName = getTypeName(schema, name);
  const desc = getDescription(schema);
  const unionTypes = schema["x-graphql-union"]?.types || [];

  if (unionTypes.length === 0) return "";

  const output = [];
  if (desc) output.push(`"""\n${desc}\n"""`);
  output.push(`union ${unionName} = ${unionTypes.join(" | ")}\n`);
  return output.join("\n");
}
