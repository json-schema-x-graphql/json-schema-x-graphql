#!/usr/bin/env node

/**
 * Unified Subgraph SDL Generator
 *
 * Generates Apollo Federation-compatible GraphQL SDL from canonical JSON Schema files.
 * Replaces generate-graphql-enhanced.mjs and generate-graphql-from-json-schema.mjs.
 *
 * Features:
 * - Full x-graphql-* hint support (interfaces, unions, scalars, directives, etc.)
 * - Apollo Federation directives (@key, @shareable, @external, etc.)
 * - Automatic camelCase conversion from snake_case
 * - Enum generation with custom names/values
 * - Custom scalars (DateTime, Date, Decimal, JSON, Email, URI)
 *
 * Usage:
 *   node scripts/generate-subgraph-sdl.mjs <input-schema.json> [output-file.graphql]
 *
 * Examples:
 *   node scripts/generate-subgraph-sdl.mjs src/data/legacy_procurement.schema.json
 *   node scripts/generate-subgraph-sdl.mjs src/data/intake_process.schema.json generated-schemas/intake_process.subgraph.graphql
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { snakeToCamel } from "./helpers/case-conversion.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

// Output directories
const GENERATED_SCHEMAS_DIR = path.join(repoRoot, "generated-schemas");
const SRC_GENERATED_DIR = path.join(repoRoot, "src", "data", "generated");

/**
 * Convert snake_case to PascalCase
 */
function snakeToPascal(str) {
  return str
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

/**
 * Get type name with x-graphql-type-name hint support
 */
function getTypeName(schema, defaultName) {
  return schema["x-graphql-type-name"] || snakeToPascal(defaultName);
}

/**
 * Get field name with x-graphql-field-name hint support
 */
function getFieldName(schema, defaultName) {
  return schema["x-graphql-field-name"] || snakeToCamel(defaultName);
}

/**
 * Get description with x-graphql-description hint support
 */
function getDescription(schema) {
  const raw = schema["x-graphql-description"] || schema.description || "";
  if (typeof raw !== "string" || !raw) return "";
  // Escape triple quotes for SDL
  return raw.replace(/"""/g, '\\"\\"\\"');
}

/**
 * Check if field should be skipped
 */
function shouldSkipField(schema) {
  return schema["x-graphql-skip"] === true;
}

/**
 * Determine if field is nullable
 */
function isNullable(schema, propName, parentRequired = []) {
  if (schema["x-graphql-nullable"] !== undefined) {
    return schema["x-graphql-nullable"];
  }
  return !parentRequired.includes(propName);
}

/**
 * Get scalar type mapping
 */
function getScalarType(schema) {
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
function mapType(schema, propName, parentRequired = []) {
  // Handle $ref
  if (schema.$ref) {
    const refParts = schema.$ref.split("/");
    const refName = refParts[refParts.length - 1];
    const typeName = snakeToPascal(refName);
    const nullable = isNullable(schema, propName, parentRequired);
    return nullable ? typeName : `${typeName}!`;
  }

  // Handle anyOf/oneOf (union types)
  if (schema.oneOf || schema.anyOf) {
    const unionSchema = schema.oneOf || schema.anyOf;
    const types = unionSchema
      .filter((s) => s.type && s.type !== "null")
      .map((s) => mapType(s, propName, parentRequired));
    if (types.length === 1) return types[0];
    // For unions, return first type (proper union handling requires x-graphql-union hint)
    return types[0] || "String";
  }

  // Handle arrays
  if (schema.type === "array" && schema.items) {
    const itemType = mapType(schema.items, propName, []);
    const nullable = isNullable(schema, propName, parentRequired);
    return nullable ? `[${itemType}]` : `[${itemType}]!`;
  }

  // Check for custom scalars
  const scalarType = getScalarType(schema);
  if (scalarType) {
    const nullable = isNullable(schema, propName, parentRequired);
    return nullable ? scalarType : `${scalarType}!`;
  }

  // Handle enums
  if (schema.enum) {
    const enumName = snakeToPascal(propName);
    const nullable = isNullable(schema, propName, parentRequired);
    return nullable ? enumName : `${enumName}!`;
  }

  // Handle basic types
  const typeMap = {
    string: "String",
    integer: "Int",
    number: "Float",
    boolean: "Boolean",
    object: "JSON",
  };

  let graphqlType = typeMap[schema.type] || "String";

  // Handle flexible types (union of string|number|boolean)
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
function formatDirectives(directives) {
  if (!directives || directives.length === 0) return "";

  return directives
    .map((dir) => {
      if (!dir.args || Object.keys(dir.args).length === 0) {
        return `@${dir.name}`;
      }

      const args = Object.entries(dir.args)
        .map(([key, value]) => {
          if (typeof value === "string") return `${key}: "${value}"`;
          if (typeof value === "boolean") return `${key}: ${value}`;
          if (typeof value === "number") return `${key}: ${value}`;
          return `${key}: ${JSON.stringify(value)}`;
        })
        .join(", ");

      return `@${dir.name}(${args})`;
    })
    .join(" ");
}

/**
 * Generate field arguments
 */
function generateFieldArgs(args) {
  if (!args || Object.keys(args).length === 0) return "";

  const argStrings = Object.entries(args).map(([name, argDef]) => {
    const type = argDef.type || "String";
    const defaultVal = argDef.default !== undefined ? ` = ${JSON.stringify(argDef.default)}` : "";
    const desc = argDef.description ? `"${argDef.description}" ` : "";
    return `${desc}${name}: ${type}${defaultVal}`;
  });

  return `(${argStrings.join(", ")})`;
}

/**
 * Generate enum type from schema
 */
function generateEnum(name, schema, output) {
  const enumName = getTypeName(schema, name);
  const desc = getDescription(schema);

  if (desc) {
    output.push(`"""\n${desc}\n"""`);
  }

  output.push(`enum ${enumName} {`);

  // Check for x-graphql-enum hint with custom values
  const xGraphqlEnum = schema["x-graphql-enum"];
  if (xGraphqlEnum && xGraphqlEnum.values) {
    Object.entries(xGraphqlEnum.values).forEach(([snakeValue, config]) => {
      const enumValue = config.name || snakeValue.toUpperCase();
      if (config.description) {
        output.push(`  """${config.description}"""`);
      }
      if (config.deprecated) {
        output.push(`  ${enumValue} @deprecated(reason: "${config.deprecated}")`);
      } else {
        output.push(`  ${enumValue}`);
      }
    });
  } else if (schema.enum) {
    schema.enum.forEach((value) => {
      if (value === null) return;
      const enumValue = String(value)
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, "_");
      output.push(`  ${enumValue}`);
    });
  }

  output.push(`}\n`);
}

/**
 * Generate object type from schema
 */
function generateObjectType(name, schema, output, generatedTypes) {
  const typeName = getTypeName(schema, name);

  // Skip if already generated
  if (generatedTypes.has(typeName)) return;
  generatedTypes.add(typeName);

  const desc = getDescription(schema);
  const graphqlType = schema["x-graphql-type"];
  const implements_ = schema["x-graphql-implements"] || [];
  const directives = schema["x-graphql-directives"] || [];
  const typeDirectives = schema["x-graphql-type-directives"] || ""; // Support type-level directives like @shareable
  const federation = schema["x-graphql-federation"] || {};

  // Add description
  if (desc) {
    output.push(`"""\n${desc}\n"""`);
  }

  // Determine type keyword (type, interface, input)
  let typeKeyword = "type";
  if (graphqlType === "interface") {
    typeKeyword = "interface";
  } else if (graphqlType === "input") {
    typeKeyword = "input";
  }

  // Build type declaration
  let typeDecl = `${typeKeyword} ${typeName}`;

  // Add implements
  if (implements_.length > 0) {
    typeDecl += ` implements ${implements_.join(" & ")}`;
  }

  // Add directives (federation keys, etc.)
  if (federation.keys) {
    const keys = Array.isArray(federation.keys) ? federation.keys : [federation.keys];
    keys.forEach((key) => {
      typeDecl += ` @key(fields: "${key}")`;
    });
  }

  // Add federation boolean directives
  if (schema["x-graphql-federation-shareable"]) {
    typeDecl += " @shareable";
  }
  if (schema["x-graphql-federation-inaccessible"]) {
    typeDecl += " @inaccessible";
  }
  if (schema["x-graphql-federation-interface-object"]) {
    typeDecl += " @interfaceObject";
  }
  if (schema["x-graphql-federation-authenticated"]) {
    typeDecl += " @authenticated";
  }

  // Add type-level directives (like @shareable)
  if (typeDirectives) {
    typeDecl += ` ${typeDirectives}`;
  }

  if (directives.length > 0) {
    typeDecl += ` ${formatDirectives(directives)}`;
  }

  output.push(`${typeDecl} {`);

  // Generate fields
  const required = schema.required || [];
  const properties = schema.properties || {};

  Object.entries(properties).forEach(([propName, propSchema]) => {
    if (shouldSkipField(propSchema)) return;

    const fieldName = getFieldName(propSchema, propName);
    const fieldType = mapType(propSchema, propName, required);
    const fieldDesc = getDescription(propSchema);
    const fieldArgs = propSchema["x-graphql-args"];
    const fieldDirectives = propSchema["x-graphql-directives"] || [];

    // Add field description
    if (fieldDesc) {
      output.push(`  """${fieldDesc}"""`);
    }

    // Build field declaration
    let fieldDecl = `  ${fieldName}`;

    // Add arguments
    if (fieldArgs) {
      fieldDecl += generateFieldArgs(fieldArgs);
    }

    fieldDecl += `: ${fieldType}`;

    // Add field directives
    if (fieldDirectives.length > 0) {
      fieldDecl += ` ${formatDirectives(fieldDirectives)}`;
    }

    output.push(fieldDecl);
  });

  output.push(`}\n`);
}

/**
 * Generate union type from schema
 */
function generateUnion(name, schema, output) {
  const unionName = getTypeName(schema, name);
  const desc = getDescription(schema);
  const unionTypes = schema["x-graphql-union"] && schema["x-graphql-union"].types;

  if (!unionTypes || unionTypes.length === 0) {
    console.warn(`Warning: Union type ${unionName} has no member types`);
    return;
  }

  if (desc) {
    output.push(`"""\n${desc}\n"""`);
  }

  output.push(`union ${unionName} = ${unionTypes.join(" | ")}\n`);
}

/**
 * Generate custom scalar definitions
 */
function generateCustomScalars(schema, output, usedScalars) {
  const scalars = schema["x-graphql-scalars"] || {};

  Object.entries(scalars).forEach(([scalarName, config]) => {
    const scalarTypeName = snakeToPascal(scalarName);
    if (usedScalars.has(scalarTypeName)) {
      const desc = config.description || "";
      if (desc) {
        output.push(`"""\n${desc}\n"""`);
      }
      output.push(`scalar ${scalarTypeName}\n`);
    }
  });
}

/**
 * Generate enum definitions
 */
function generateEnums(schema, output) {
  const enums = schema["x-graphql-enums"] || {};

  Object.entries(enums).forEach(([enumName, config]) => {
    const desc = config.description || "";
    if (desc) {
      output.push(`"""\n${desc}\n"""`);
    }

    output.push(`enum ${enumName} {`);

    const values = config.values || [];
    values.forEach((value) => {
      output.push(`  ${value}`);
    });

    output.push(`}\n`);
  });
}

/**
 * Collect used scalars from schema
 */
function collectUsedScalars(schema, usedScalars = new Set()) {
  if (schema.$ref) return usedScalars;

  const scalarType = getScalarType(schema);
  if (scalarType) {
    usedScalars.add(scalarType);
  }

  if (schema.properties) {
    Object.values(schema.properties).forEach((prop) => {
      collectUsedScalars(prop, usedScalars);
    });
  }

  if (schema.items) {
    collectUsedScalars(schema.items, usedScalars);
  }

  if (schema.oneOf || schema.anyOf) {
    (schema.oneOf || schema.anyOf).forEach((s) => collectUsedScalars(s, usedScalars));
  }

  return usedScalars;
}

/**
 * Process $defs to generate types
 */
function processDefinitions(defs, output, generatedTypes) {
  Object.entries(defs).forEach(([name, schema]) => {
    if (shouldSkipField(schema)) return;

    const graphqlType = schema["x-graphql-type"];

    // Generate union types
    if (graphqlType === "union" || schema["x-graphql-union"]) {
      generateUnion(name, schema, output);
      return;
    }

    // Generate enum types
    if (schema.enum || graphqlType === "enum") {
      generateEnum(name, schema, output);
      return;
    }

    // Generate object/interface types
    if (schema.type === "object" || !schema.type) {
      generateObjectType(name, schema, output, generatedTypes);
      return;
    }
  });
}

/**
 * Generate operations (Query, Mutation, Subscription)
 */
function generateOperations(schema, output, generatedTypes) {
  const operations = schema["x-graphql-operations"] || {};

  ["queries", "mutations", "subscriptions"].forEach((opType) => {
    const ops = operations[opType];
    if (!ops || Object.keys(ops).length === 0) return;

    const typeName =
      opType === "queries" ? "Query" : opType === "mutations" ? "Mutation" : "Subscription";

    if (generatedTypes.has(typeName)) return;
    generatedTypes.add(typeName);

    output.push(`type ${typeName} {`);

    Object.entries(ops).forEach(([fieldName, fieldDef]) => {
      const fieldType = fieldDef.type || "String";
      const fieldDesc = fieldDef.description || "";
      const fieldArgs = fieldDef.args || {};

      if (fieldDesc) {
        output.push(`  """${fieldDesc}"""`);
      }

      let fieldDecl = `  ${snakeToCamel(fieldName)}`;

      if (Object.keys(fieldArgs).length > 0) {
        fieldDecl += generateFieldArgs(fieldArgs);
      }

      fieldDecl += `: ${fieldType}`;
      output.push(fieldDecl);
    });

    output.push(`}\n`);
  });
}

/**
 * Generate federation schema directive
 */
function generateSchemaDirective(output) {
  output.unshift(
    'extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key", "@shareable", "@external", "@provides", "@requires"])\n',
  );
}

/**
 * Main generation function
 */
async function generateSubgraphSDL(inputPath, outputPath) {
  console.log(`\n🔨 Generating subgraph SDL from ${path.basename(inputPath)}...`);

  // Read input schema
  const schemaContent = await fs.readFile(inputPath, "utf-8");
  const schema = JSON.parse(schemaContent);

  const output = [];
  const generatedTypes = new Set();

  // Collect used scalars
  const usedScalars = new Set();
  collectUsedScalars(schema, usedScalars);
  if (schema.$defs) {
    Object.values(schema.$defs).forEach((def) => collectUsedScalars(def, usedScalars));
  }

  // Generate custom scalars
  if (Object.keys(schema["x-graphql-scalars"] || {}).length > 0) {
    generateCustomScalars(schema, output, usedScalars);
  }

  // Generate enums
  if (Object.keys(schema["x-graphql-enums"] || {}).length > 0) {
    generateEnums(schema, output);
  }

  // Process $defs
  if (schema.$defs) {
    processDefinitions(schema.$defs, output, generatedTypes);
  }

  // Generate root type if schema defines properties
  // Skip root type generation if title looks like a description (contains spaces)
  if (schema.properties && Object.keys(schema.properties).length > 0) {
    const rootTypeName = schema.title?.replace(/\s+/g, "") || "RootType";

    // Only generate if the type name is valid and not already generated
    if (
      rootTypeName &&
      /^[A-Z][A-Za-z0-9_]*$/.test(rootTypeName) &&
      !generatedTypes.has(rootTypeName)
    ) {
      generateObjectType(rootTypeName, schema, output, generatedTypes);
    }
  }

  // Generate operations
  generateOperations(schema, output, generatedTypes);

  // Add federation directive at the top
  if (output.length > 0) {
    generateSchemaDirective(output);
  }

  const sdl = output.join("\n");

  // Determine output path
  if (!outputPath) {
    const baseName = path.basename(inputPath, ".schema.json");
    outputPath = path.join(GENERATED_SCHEMAS_DIR, `${baseName}.subgraph.graphql`);
  }

  // Write to both locations
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, sdl, "utf-8");
  console.log(`✅ Generated: ${outputPath}`);

  // Also write to src/data/generated/
  const srcOutputPath = path.join(SRC_GENERATED_DIR, path.basename(outputPath));
  await fs.mkdir(path.dirname(srcOutputPath), { recursive: true });
  await fs.writeFile(srcOutputPath, sdl, "utf-8");
  console.log(`✅ Copied to: ${srcOutputPath}`);

  return sdl;
}

/**
 * CLI Entry Point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error(`
Usage: node scripts/generate-subgraph-sdl.mjs <input-schema.json> [output-file.graphql]

Examples:
  node scripts/generate-subgraph-sdl.mjs src/data/legacy_procurement.schema.json
  node scripts/generate-subgraph-sdl.mjs src/data/intake_process.schema.json generated-schemas/intake_process.subgraph.graphql
    `);
    process.exit(1);
  }

  const inputPath = path.resolve(args[0]);
  const outputPath = args[1] ? path.resolve(args[1]) : null;

  try {
    await generateSubgraphSDL(inputPath, outputPath);
    console.log("\n✨ Done!\n");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateSubgraphSDL };
