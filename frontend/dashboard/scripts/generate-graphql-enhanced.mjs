#!/usr/bin/env node

/**
 * Enhanced GraphQL Generator with Full x-graphql-* Hint Support
 *
 * This converter supports all x-graphql-* hints documented in x-graphql-hints-guide.md:
 * - x-graphql-type-name: Override generated type names
 * - x-graphql-field-name: Override field names
 * - x-graphql-type: Specify exact GraphQL type (interface, union, enum, scalar)
 * - x-graphql-implements: Specify interface implementations
 * - x-graphql-description: GraphQL-specific descriptions
 * - x-graphql-nullable: Override nullability
 * - x-graphql-union-types: Specify union member types
 * - x-graphql-directives: Apply GraphQL directives
 * - x-graphql-skip: Exclude fields from GraphQL
 * - x-graphql-args: Define field arguments
 *
 * Usage:
 *   node scripts/generate-graphql-enhanced.mjs [input] [output]
 *   node scripts/generate-graphql-enhanced.mjs src/data/schema_unification.schema.v2-hinted.json public/data/schema_unification-v2-enhanced.graphql
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

/**
 * Helper Functions for x-graphql hints
 */

function getTypeName(schema, defaultName) {
  return schema["x-graphql-type-name"] || defaultName;
}

function getFieldName(schema, defaultName) {
  return schema["x-graphql-field-name"] || defaultName;
}

function getDescription(schema) {
  const raw = schema["x-graphql-description"] || schema.description || "";
  if (typeof raw !== "string" || !raw) return "";
  // Escape embedded triple quotes to keep SDL valid
  return raw.replace(/"""/g, '\\"\\"\\"');
}

/**
 * Build a concise single-line inline comment for a field.
 * Combines (if present):
 *   description, src:<sourceField>, fmt:<format>, enum:<joined>, orig:<originalType>, req:<true|false>
 */
function buildInlineComment(propDef) {
  const base = getDescription(propDef);
  return base ? base.trim() : "";
}

function shouldSkipField(schema) {
  return schema["x-graphql-skip"] === true;
}

function isNullable(schema, propName, parentRequired = []) {
  // Explicit hint overrides everything
  if (schema["x-graphql-nullable"] !== undefined) {
    return schema["x-graphql-nullable"];
  }
  // Check if in required array
  return !parentRequired.includes(propName);
}

function getGraphQLType(schema) {
  return schema["x-graphql-type"];
}

function getImplementsInterfaces(schema) {
  return schema["x-graphql-implements"] || [];
}

function getUnionTypes(schema) {
  return schema["x-graphql-union-types"] || [];
}

function getDirectives(schema) {
  return schema["x-graphql-directives"] || [];
}

function getArgs(schema) {
  return schema["x-graphql-args"] || {};
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
          if (typeof value === "string") {
            return `${key}: "${value}"`;
          }
          return `${key}: ${JSON.stringify(value)}`;
        })
        .join(", ");

      return `@${dir.name}(${args})`;
    })
    .join(" ");
}

/**
 * Format GraphQL field arguments
 */
function formatArgs(args) {
  if (!args || Object.keys(args).length === 0) return "";

  const formatted = Object.entries(args)
    .map(([name, config]) => {
      let argStr = `${name}: ${config.type}`;
      if (config.defaultValue !== undefined) {
        argStr += ` = ${JSON.stringify(config.defaultValue)}`;
      }
      return argStr;
    })
    .join(", ");

  return `(${formatted})`;
}

/**
 * Map JSON Schema type to GraphQL type string
 */
function mapTypeToGraphQL(propDef, propName, definitions = {}, nullable = true) {
  // Check for x-graphql-type hint (explicit type override)
  const explicitType = getGraphQLType(propDef);
  if (explicitType) {
    // Handle special types
    if (explicitType === "interface" || explicitType === "union") {
      return null; // These are handled separately
    }
    // Custom scalars or type overrides
    const typeStr = explicitType;
    return nullable ? typeStr : `${typeStr}!`;
  }

  // Respect explicit scalar override if present
  if (propDef["x-graphql-scalar"]) {
    const typeStr = propDef["x-graphql-scalar"];
    return nullable ? typeStr : `${typeStr}!`;
  }

  // Check for $ref
  if (propDef.$ref) {
    const refName = propDef.$ref.split("/").pop();
    const refTypeName = getTypeName(definitions[refName] || {}, refName);
    return nullable ? refTypeName : `${refTypeName}!`;
  }

  // Check for array
  if (propDef.type === "array") {
    if (!propDef.items) {
      return nullable ? "[String]" : "[String]!";
    }

    const itemType = mapTypeToGraphQL(propDef.items, propName, definitions, false);
    const listType = `[${itemType}]`;
    return nullable ? listType : `${listType}!`;
  }

  // Check for enum
  if (propDef.enum) {
    // Generate enum type name from property name
    const enumName = getTypeName(propDef, propName.charAt(0).toUpperCase() + propName.slice(1));
    return nullable ? enumName : `${enumName}!`;
  }

  // Check for object - should be a named type
  if (propDef.type === "object") {
    if (propDef["x-graphql-type-name"]) {
      const typeName = getTypeName(propDef, propName);
      return nullable ? typeName : `${typeName}!`;
    }
    // If object has JSON-ish format hints, prefer JSON scalar
    if (propDef.format === "json" || propDef.format === "application/json") {
      return nullable ? "JSON" : "JSON!";
    }
    // Fallback to JSON scalar for anonymous objects
    return nullable ? "JSON" : "JSON!";
  }

  // Resolve effective JSON Schema type when it's a union like ["string","null"]
  let effectiveType = propDef.type;
  if (Array.isArray(effectiveType)) {
    effectiveType = effectiveType.find((t) => t !== "null") || effectiveType[0];
  }

  // Name- and metadata-based decimal inference
  const nameHint = typeof propName === "string" ? propName : "";
  const decimalNameHint =
    /amount|fee|price|cost|fund|credit|debit|total|balance|obligat|committed|awarded|ceiling|unit_?price|rate|percent|percentage|quantity|qty/i.test(
      nameHint,
    );
  const originalType =
    typeof propDef["x-original-type"] === "string" ? propDef["x-original-type"].toLowerCase() : "";
  const wantsDecimal =
    decimalNameHint ||
    originalType === "number" ||
    originalType === "decimal" ||
    originalType === "currency";

  // Map basic types with scalar inference
  let baseType;
  switch (effectiveType) {
    case "string": {
      // Prefer well-known formats first
      if (propDef.format === "date-time") {
        baseType = "DateTime";
      } else if (propDef.format === "date") {
        baseType = "Date";
      } else if (propDef.format === "email") {
        baseType = "Email";
      } else if (propDef.format === "uri" || propDef.format === "url") {
        baseType = "URI";
      } else if (propDef.format === "json" || propDef.format === "application/json") {
        baseType = "JSON";
      } else if (wantsDecimal) {
        baseType = "Decimal";
      } else {
        baseType = "String";
      }
      break;
    }
    case "integer":
      baseType = "Int";
      break;
    case "number":
      baseType = wantsDecimal ? "Decimal" : "Float";
      break;
    case "boolean":
      baseType = "Boolean";
      break;
    default:
      baseType = "String";
  }

  return nullable ? baseType : `${baseType}!`;
}

/**
 * Generate GraphQL enum definition
 */
function generateEnum(name, definition) {
  const typeName = getTypeName(definition, name);
  const description = getDescription(definition);
  const directives = formatDirectives(getDirectives(definition));

  // Sanitize enum values to valid GraphQL identifiers
  const seen = new Set();
  const safeValues = [];
  if (Array.isArray(definition.enum)) {
    for (const v of definition.enum) {
      const base = String(v);
      // Convert to UPPER_CASE_WITH_UNDERSCORES, strip invalid chars, and ensure leading letter/underscore
      let normalized = base
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^A-Za-z0-9_]/g, "_")
        .toUpperCase();
      if (!/^[A-Za-z_]/.test(normalized)) normalized = `_${normalized}`;
      if (!normalized) normalized = "_EMPTY";
      if (!seen.has(normalized)) {
        seen.add(normalized);
        safeValues.push(normalized);
      }
    }
  }

  let graphql = "";

  if (description) {
    graphql += `"""\n${description}\n"""\n`;
  }

  graphql += `enum ${typeName}${directives ? " " + directives : ""} {\n`;
  safeValues.forEach((val) => {
    graphql += `  ${val}\n`;
  });
  graphql += "}\n";
  return graphql;
}

/**
 * Generate GraphQL interface definition
 */
function generateInterface(name, definition, definitions = {}) {
  const typeName = getTypeName(definition, name);
  const description = getDescription(definition);
  const directives = formatDirectives(getDirectives(definition));

  let graphql = "";

  if (description) {
    graphql += `"""\n${description}\n"""\n`;
  }

  graphql += `interface ${typeName}${directives ? " " + directives : ""} {\n`;

  if (definition.properties) {
    for (const [propName, propDef] of Object.entries(definition.properties)) {
      if (shouldSkipField(propDef)) continue;

      const fieldName = getFieldName(propDef, propName);
      const fieldDesc = getDescription(propDef);
      const fieldDirectives = formatDirectives(getDirectives(propDef));
      const nullable = isNullable(propDef, propName, definition.required);
      const fieldType = mapTypeToGraphQL(propDef, propName, definitions, nullable);
      const args = formatArgs(getArgs(propDef));
      const requiredArray = definition.required || [];
      const inlineComment = buildInlineComment(propDef);

      graphql += `  ${fieldName}${args}: ${fieldType}${fieldDirectives ? " " + fieldDirectives : ""}${inlineComment ? " # " + inlineComment : ""}\n`;
    }
  }

  graphql += "}\n";
  return graphql;
}

/**
 * Generate GraphQL union definition
 */
function generateUnion(name, definition) {
  const typeName = getTypeName(definition, name);
  const description = getDescription(definition);
  const directives = formatDirectives(getDirectives(definition));
  const unionTypes = getUnionTypes(definition);

  let graphql = "";

  if (description) {
    graphql += `"""\n${description}\n"""\n`;
  }

  graphql += `union ${typeName}${directives ? " " + directives : ""}`;

  if (unionTypes.length > 0) {
    graphql += ` = ${unionTypes.join(" | ")}`;
  }

  graphql += "\n";
  return graphql;
}

/**
 * Get all properties from an interface
 */
function getInterfaceProperties(interfaceName, definitions = {}) {
  const interfaceDef = definitions[interfaceName];
  if (!interfaceDef || !interfaceDef.properties) {
    return {};
  }
  return interfaceDef.properties;
}

/**
 * Generate GraphQL object type definition
 */
function generateObjectType(name, definition, definitions = {}) {
  const typeName = getTypeName(definition, name);
  const description = getDescription(definition);
  const implementsInterfaces = getImplementsInterfaces(definition);
  const directives = formatDirectives(getDirectives(definition));

  // Federation @key directives from x-graphql-federation.keys
  let federationDirectives = "";
  if (
    definition["x-graphql-federation"] &&
    Array.isArray(definition["x-graphql-federation"].keys) &&
    definition["x-graphql-federation"].keys.length
  ) {
    federationDirectives = definition["x-graphql-federation"].keys
      .map((k) => `@key(fields: "${k}")`)
      .join(" ");
  }

  let graphql = "";

  if (description) {
    graphql += `"""\n${description}\n"""\n`;
  }

  graphql += `type ${typeName}`;

  if (implementsInterfaces.length > 0) {
    graphql += ` implements ${implementsInterfaces.join(" & ")}`;
  }

  const combinedDirectives = [directives, federationDirectives].filter(Boolean).join(" ");
  graphql += `${combinedDirectives ? " " + combinedDirectives : ""} {\n`;

  // Collect all fields: interface fields + own properties
  const allFields = new Map();

  // First, add all interface fields
  for (const interfaceName of implementsInterfaces) {
    const interfaceProps = getInterfaceProperties(interfaceName, definitions);
    for (const [propName, propDef] of Object.entries(interfaceProps)) {
      if (!shouldSkipField(propDef)) {
        allFields.set(propName, { propDef, source: "interface", interfaceName });
      }
    }
  }

  // Then, override with own properties (or add new ones)
  if (definition.properties) {
    for (const [propName, propDef] of Object.entries(definition.properties)) {
      if (!shouldSkipField(propDef)) {
        // If this property matches an interface property by name, merge with interface taking precedence for x-graphql hints
        if (allFields.has(propName)) {
          const interfaceField = allFields.get(propName);
          const interfaceProps = getInterfaceProperties(interfaceField.interfaceName, definitions);
          const interfaceFieldDef = interfaceProps[propName];

          // Merge: interface's x-graphql-* hints take precedence
          const mergedDef = {
            ...propDef, // Base from type
            ...interfaceFieldDef, // Override with interface definition
            // Explicitly preserve interface's x-graphql hints
            "x-graphql-field-name":
              interfaceFieldDef?.["x-graphql-field-name"] || propDef["x-graphql-field-name"],
            "x-graphql-description":
              interfaceFieldDef?.["x-graphql-description"] || propDef["x-graphql-description"],
            "x-graphql-directives":
              interfaceFieldDef?.["x-graphql-directives"] || propDef["x-graphql-directives"],
            "x-graphql-nullable":
              interfaceFieldDef?.["x-graphql-nullable"] !== undefined
                ? interfaceFieldDef["x-graphql-nullable"]
                : propDef["x-graphql-nullable"],
            "x-graphql-args": interfaceFieldDef?.["x-graphql-args"] || propDef["x-graphql-args"],
          };

          allFields.set(propName, {
            propDef: mergedDef,
            source: "merged",
            interfaceName: interfaceField.interfaceName,
          });
        } else {
          allFields.set(propName, { propDef, source: "own" });
        }
      }
    }
  }

  // Generate fields
  for (const [propName, { propDef, source, interfaceName }] of allFields) {
    // For interface or merged fields, the propDef already has the correct hints
    const fieldName = getFieldName(propDef, propName);
    const fieldDesc = getDescription(propDef);
    const fieldDirectives = formatDirectives(getDirectives(propDef));

    // Determine required array
    let requiredArray = definition.required || [];
    if ((source === "interface" || source === "merged") && interfaceName) {
      const interfaceDef = definitions[interfaceName];
      // Use interface's required array for interface fields
      if (interfaceDef && interfaceDef.required) {
        requiredArray = interfaceDef.required;
      }
    }

    const nullable = isNullable(propDef, propName, requiredArray);
    const fieldType = mapTypeToGraphQL(propDef, propName, definitions, nullable);
    const args = formatArgs(getArgs(propDef));
    const inlineComment = buildInlineComment(propDef);

    graphql += `  ${fieldName}${args}: ${fieldType}${fieldDirectives ? " " + fieldDirectives : ""}${inlineComment ? " # " + inlineComment : ""}\n`;
  }

  graphql += "}\n";
  return graphql;
}

/**
 * Generate custom scalar definitions
 */
function generateScalars() {
  return `"""
ISO 8601 date-time string (YYYY-MM-DDTHH:mm:ss.sssZ)
"""
scalar date_time

"""
ISO 8601 date string (YYYY-MM-DD)
"""
scalar date

"""
High-precision decimal number for amounts
"""
scalar decimal

"""
Arbitrary JSON value
"""
scalar json

"""
Valid email address
"""
scalar email

"""
Valid URI/URL
"""
scalar uri

"""
A custom scalar representing a date and time in ISO 8601 format
"""
scalar DateTime

"""
A custom scalar for arbitrary JSON values
"""
scalar JSON

`;
}

/**
 * Generate directive definitions for commonly used directives
 */
function generateDirectives(schema, definitions) {
  const directives = new Set();
  let directiveDefs = "";

  // Scan all definitions for used directives
  function scanForDirectives(obj) {
    if (!obj || typeof obj !== "object") return;

    if (obj["x-graphql-directives"]) {
      for (const dir of obj["x-graphql-directives"]) {
        if (dir.name) {
          directives.add(dir.name);
        }
      }
    }

    // Recursively scan properties
    if (obj.properties) {
      for (const prop of Object.values(obj.properties)) {
        scanForDirectives(prop);
      }
    }
    if (obj.items) {
      scanForDirectives(obj.items);
    }
  }

  // Scan all definitions
  // Scan all definitions for used directives
  for (const def of Object.values(definitions)) {
    scanForDirectives(def);
  }

  // Add federation key directive if any definition declares x-graphql-federation
  if (Object.values(definitions).some((d) => d && d["x-graphql-federation"])) {
    directives.add("key");
  }

  // Scan root schema
  scanForDirectives(schema);

  // Generate definitions for known directives
  if (directives.has("currency")) {
    directiveDefs += `"""
Specifies the currency code for monetary values
"""
directive @currency(
  """
  ISO 4217 currency code (e.g., USD, EUR, GBP)
  """
  code: String!
) on FIELD_DEFINITION

`;
  }

  if (directives.has("deprecated")) {
    directiveDefs += `"""
Marks a field as deprecated with an optional reason
"""
directive @deprecated(
  """
  Explanation for why this field is deprecated
  """
  reason: String = "No longer supported"
) on FIELD_DEFINITION | ENUM_VALUE

`;
  }

  if (directives.has("key")) {
    directiveDefs += `"""
Federation entity key directive
"""
directive @key(
  """
  Space-delimited list of fields forming the entity key
  """
  fields: String!
) on OBJECT | INTERFACE

`;
  }

  return directiveDefs;
}

/**
 * Collect all inline enums from properties
 */
function collectInlineEnums(definitions) {
  const inlineEnums = new Map();

  function scanProperties(properties, parentName = "") {
    if (!properties) return;

    for (const [propName, propDef] of Object.entries(properties)) {
      // Check for inline enum
      if (propDef.enum && propDef.type === "string") {
        const enumName = getTypeName(propDef, propName.charAt(0).toUpperCase() + propName.slice(1));
        if (!inlineEnums.has(enumName)) {
          inlineEnums.set(enumName, propDef);
        }
      }

      // Recursively check array items
      if (propDef.type === "array" && propDef.items?.enum) {
        const enumName = getTypeName(
          propDef.items,
          propName.charAt(0).toUpperCase() + propName.slice(1),
        );
        if (!inlineEnums.has(enumName)) {
          inlineEnums.set(enumName, propDef.items);
        }
      }

      // Recursively check nested objects
      if (propDef.properties) {
        scanProperties(propDef.properties, propName);
      }
    }
  }

  // Scan all definitions
  for (const [name, def] of Object.entries(definitions)) {
    if (def.properties) {
      scanProperties(def.properties, name);
    }
  }

  return inlineEnums;
}

/**
 * Main conversion function
 */
/**
 * Convert JSON Schema (with x-graphql hints) to enhanced GraphQL SDL.
 * Builds a base SDL using legacy phases, then applies shared hint enhancements
 * via the graphql-hints library to ensure consistent enum/union/scalar/operation
 * handling across generators.
 *
 * @param {object} schema - JSON Schema (canonical snake_case) plus x-graphql-* extensions
 * @returns {Promise<string>} Enhanced GraphQL SDL string
 */
export async function convertJSONSchemaToGraphQL(schema) {
  let graphql = "";

  console.log("📋 Processing JSON Schema with x-graphql hints (base phase)...");

  const definitions = schema.$defs || schema.definitions || {};

  // Add custom scalars
  graphql += generateScalars();

  // Add directive definitions
  const directiveDefs = generateDirectives(schema, definitions);
  if (directiveDefs) {
    graphql += directiveDefs;
  }

  const processed = new Set();

  // Phase 1: Generate interfaces (needed for implements)
  console.log("  ├─ Phase 1: Processing interfaces...");
  for (const [name, def] of Object.entries(definitions)) {
    if (getGraphQLType(def) === "interface") {
      graphql += "\n" + generateInterface(name, def, definitions);
      processed.add(name);
      console.log(`    ├─ Generated interface: ${getTypeName(def, name)}`);
    }
  }

  // Phase 2: Generate unions
  console.log("  ├─ Phase 2: Processing unions...");
  for (const [name, def] of Object.entries(definitions)) {
    if (getGraphQLType(def) === "union") {
      graphql += "\n" + generateUnion(name, def);
      processed.add(name);
      console.log(`    ├─ Generated union: ${getTypeName(def, name)}`);
    }
  }

  // Phase 3: Generate enums (including inline enums)
  console.log("  ├─ Phase 3: Processing enums...");

  // First, generate enums from definitions
  for (const [name, def] of Object.entries(definitions)) {
    if (def.enum || getGraphQLType(def) === "enum") {
      graphql += "\n" + generateEnum(name, def);
      processed.add(name);
      console.log(`    ├─ Generated enum: ${getTypeName(def, name)}`);
    }
  }

  // Then, generate inline enums
  const inlineEnums = collectInlineEnums(definitions);
  for (const [enumName, enumDef] of inlineEnums) {
    graphql += "\n" + generateEnum(enumName, enumDef);
    console.log(`    ├─ Generated inline enum: ${enumName}`);
  }

  // Phase 4: Generate object types
  console.log("  ├─ Phase 4: Processing object types...");
  for (const [name, def] of Object.entries(definitions)) {
    if (!processed.has(name) && def.type === "object") {
      graphql += "\n" + generateObjectType(name, def, definitions);
      processed.add(name);
      console.log(`    ├─ Generated type: ${getTypeName(def, name)}`);
    }
  }

  // Phase 5: Generate root Query type if present
  if (schema.properties) {
    console.log("  ├─ Phase 5: Processing root Query type...");
    graphql += "\ntype Query {\n";

    for (const [propName, propDef] of Object.entries(schema.properties)) {
      if (shouldSkipField(propDef)) continue;

      const fieldName = getFieldName(propDef, propName);
      const fieldDesc = getDescription(propDef);
      const nullable = isNullable(propDef, propName, schema.required);
      const fieldType = mapTypeToGraphQL(propDef, propName, definitions, nullable);
      const args = formatArgs(getArgs(propDef));
      const requiredArray = schema.required || [];
      const inlineComment = buildInlineComment(propDef);

      graphql += `  ${fieldName}${args}: ${fieldType}${inlineComment ? " # " + inlineComment : ""}\n`;
    }

    graphql += "}\n";
    console.log(`    └─ Generated Query type with ${Object.keys(schema.properties).length} fields`);
  }

  console.log("✅ Base GraphQL SDL generation complete. Applying shared enhancements...");

  // Dynamically import shared enhancement library (avoids top-level import churn)
  const { generateEnhancedSDL } = await import("./lib/graphql-hints.mjs");
  const enhanced = generateEnhancedSDL(graphql, schema, {
    includeOperations: true,
    includePagination: true,
    includeScalars: true,
    includeEnums: true,
    includeUnions: true,
    applyScalarFields: true,
    applyRequiredFields: true,
  });

  console.log("✨ Enhancement complete (graphql-hints applied).");
  return enhanced;
}

/**
 * CLI Entry Point
 */
/**
 * Programmatic entry point for enhanced SDL generation.
 * @param {string[]} [argv] - Optional argument array (defaults to process.argv.slice(2))
 * @returns {Promise<string>} Path to written enhanced SDL file
 */
export async function main(argv) {
  const args = argv ? argv : process.argv.slice(2);
  const inputPath = args[0] || path.join(repoRoot, "src/data/schema_unification.schema.json");
  const outputPath =
    args[1] || path.join(repoRoot, "public/data/schema_unification-v2-enhanced.graphql");

  console.log("🚀 Enhanced GraphQL Generator (shared graphql-hints)\n");
  console.log(`📥 Input:  ${path.relative(repoRoot, inputPath)}`);
  console.log(`📤 Output: ${path.relative(repoRoot, outputPath)}\n`);

  try {
    // Read JSON Schema
    const schemaContent = await fs.readFile(inputPath, "utf8");
    const schema = JSON.parse(schemaContent);

    // Convert & enhance GraphQL SDL
    const enhancedSDL = await convertJSONSchemaToGraphQL(schema);

    // Write output
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, enhancedSDL, "utf8");

    // Stats
    const lines = enhancedSDL.split("\n").length;
    const types = (enhancedSDL.match(/^type /gm) || []).length;
    const interfaces = (enhancedSDL.match(/^interface /gm) || []).length;
    const unions = (enhancedSDL.match(/^union /gm) || []).length;
    const enums = (enhancedSDL.match(/^enum /gm) || []).length;

    console.log("\n📊 Statistics:");
    console.log(`  ├─ Total lines: ${lines}`);
    console.log(`  ├─ Object types: ${types}`);
    console.log(`  ├─ Interfaces: ${interfaces}`);
    console.log(`  ├─ Unions: ${unions}`);
    console.log(`  ├─ Enums: ${enums}`);
    console.log(`\n✅ Enhanced GraphQL SDL written to ${path.relative(repoRoot, outputPath)}`);

    return outputPath;
  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
