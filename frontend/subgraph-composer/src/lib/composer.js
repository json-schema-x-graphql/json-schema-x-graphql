import { parse } from "graphql";

/**
 * Compose multiple GraphQL subgraphs into a unified supergraph
 *
 * @param {Map<string, string>} subgraphs - Map of schemaId -> GraphQL SDL
 * @param {Object} options - Composition options
 * @returns {{success: boolean, sdl: string, errors: string[], stats: CompositionStats}}
 */
export function composeSupergraph(subgraphs, options = {}) {
  const { mergeStrategy = "extend", includeRootQuery = true } = options;

  const errors = [];

  try {
    // 1. Parse all subgraph SDLs
    const parsedSubgraphs = new Map();
    for (const [schemaId, sdl] of subgraphs.entries()) {
      try {
        const doc = parse(sdl);
        parsedSubgraphs.set(schemaId, doc);
      } catch (parseError) {
        errors.push(`Failed to parse subgraph ${schemaId}: ${parseError.message}`);
      }
    }

    if (errors.length === subgraphs.size) {
      // All subgraphs failed to parse
      return {
        success: false,
        sdl: "",
        errors,
        stats: { totalTypes: 0, totalFields: 0, mergedTypes: 0, conflicts: [] },
      };
    }

    // 2. Extract and merge type definitions
    const typeRegistry = new Map();
    const typeSourceMap = new Map(); // Track which schema each type comes from
    const conflicts = [];

    for (const [schemaId, doc] of parsedSubgraphs.entries()) {
      for (const def of doc.definitions) {
        const typeName = def.name?.value;
        if (!typeName) continue;

        // Skip special types
        if (["Query", "Mutation", "Subscription"].includes(typeName)) {
          if (!typeRegistry.has("_rootTypes")) {
            typeRegistry.set("_rootTypes", []);
            typeSourceMap.set("_rootTypes", []);
          }
          typeRegistry.get("_rootTypes").push(def);
          typeSourceMap.get("_rootTypes").push(schemaId);
          continue;
        }

        if (typeRegistry.has(typeName)) {
          // Type conflict detected - track detailed info
          const existingSources = typeSourceMap.get(typeName) || [];
          const conflictInfo = {
            type: typeName,
            sources: [...existingSources, schemaId],
            sourceCount: new Set([...existingSources, schemaId]).size,
            strategy: mergeStrategy,
            fieldCount: def.fields?.length || 0,
          };

          conflicts.push(conflictInfo);

          if (mergeStrategy === "extend") {
            // Keep existing, skip duplicate
            continue;
          } else if (mergeStrategy === "union") {
            // Mark as union
            // This would require more sophisticated merging
            continue;
          }
        }

        typeRegistry.set(typeName, def);
        typeSourceMap.set(typeName, [schemaId]);
      }
    }

    // 3. Build unified SDL
    const sdlLines = [];

    // Add non-root type definitions
    let typeCount = 0;
    let fieldCount = 0;

    for (const [typeName, def] of typeRegistry.entries()) {
      if (typeName === "_rootTypes") continue;
      if (!def.kind) continue;

      const sdlString = definitionToSDL(def);
      if (sdlString) {
        sdlLines.push(sdlString);
        typeCount++;

        // Count fields
        if (def.fields) {
          fieldCount += def.fields.length;
        }
      }
    }

    // 4. Create or merge root types
    if (includeRootQuery) {
      const rootTypeDefs = typeRegistry.get("_rootTypes") || [];
      const queryFields = [];

      for (const def of rootTypeDefs) {
        if (def.name?.value === "Query" && def.fields) {
          queryFields.push(...def.fields);
        }
      }

      // If no Query type exists, create a minimal one
      if (queryFields.length === 0) {
        sdlLines.unshift("type Query {\n  _empty: String\n}\n");
        typeCount++;
      } else {
        // Create Query type with merged fields
        const fieldSDLs = queryFields.map((f) => `  ${fieldToSDL(f)}`).join("\n");
        sdlLines.unshift(`type Query {\n${fieldSDLs}\n}\n`);
        typeCount++;
        fieldCount += queryFields.length;
      }
    }

    const finalSDL = sdlLines.filter(Boolean).join("\n\n");

    return {
      success: errors.length === 0,
      sdl: finalSDL,
      errors,
      stats: {
        totalTypes: typeCount,
        totalFields: fieldCount,
        mergedTypes: Array.from(typeRegistry.values()).filter((d) => d && d.kind).length,
        conflicts: conflicts, // Return full conflict objects, not just strings
      },
    };
  } catch (error) {
    errors.push(`Composition failed: ${error.message}`);
    return {
      success: false,
      sdl: "",
      errors,
      stats: { totalTypes: 0, totalFields: 0, mergedTypes: 0, conflicts: [] },
    };
  }
}

/**
 * Convert a GraphQL definition to SDL string
 * @private
 */
function definitionToSDL(def) {
  if (!def) return "";

  const { kind, name, description, fields, interfaces } = def;
  const typeName = name?.value || "Unknown";

  let sdl = "";

  // Description
  if (description?.value) {
    sdl += `"""\n${description.value}\n"""\n`;
  }

  // Type declaration
  switch (kind) {
    case "ObjectTypeDefinition": {
      const implStr = interfaces?.length
        ? ` implements ${interfaces.map((i) => i.name.value).join(" & ")}`
        : "";
      sdl += `type ${typeName}${implStr} {\n`;
      if (fields?.length) {
        sdl += fields.map((f) => `  ${fieldToSDL(f)}`).join("\n");
      }
      sdl += "\n}";
      break;
    }

    case "InterfaceTypeDefinition": {
      sdl += `interface ${typeName} {\n`;
      if (fields?.length) {
        sdl += fields.map((f) => `  ${fieldToSDL(f)}`).join("\n");
      }
      sdl += "\n}";
      break;
    }

    case "EnumTypeDefinition": {
      sdl += `enum ${typeName} {\n`;
      if (def.values?.length) {
        sdl += def.values.map((v) => `  ${v.name?.value || ""}`).join("\n");
      }
      sdl += "\n}";
      break;
    }

    case "UnionTypeDefinition": {
      const types = def.types?.map((t) => t.name?.value).join(" | ") || "";
      sdl += `union ${typeName} = ${types}`;
      break;
    }

    case "ScalarTypeDefinition": {
      sdl += `scalar ${typeName}`;
      break;
    }

    default:
      return "";
  }

  return sdl;
}

/**
 * Convert a GraphQL field to SDL string
 * @private
 */
function fieldToSDL(field) {
  if (!field) return "";

  const name = field.name?.value || "";
  const type = typeToSDL(field.type);
  const args = field.arguments?.length
    ? `(${field.arguments.map((a) => `${a.name?.value}: ${typeToSDL(a.type)}`).join(", ")})`
    : "";

  return `${name}${args}: ${type}`;
}

/**
 * Convert a GraphQL type to SDL string
 * @private
 */
function typeToSDL(type) {
  if (!type) return "String";

  if (type.kind === "NonNullType") {
    return `${typeToSDL(type.type)}!`;
  }

  if (type.kind === "ListType") {
    return `[${typeToSDL(type.type)}]`;
  }

  if (type.kind === "NamedType") {
    return type.name?.value || "String";
  }

  return "String";
}

/**
 * Get sources for a type (helper for conflict detection)
 * @private
 */
function getSourcesForType() {
  // This would track which schemas contribute to a type
  // For now, return empty array
  return [];
}

/**
 * Validate a supergraph SDL
 * @param {string} sdl - GraphQL SDL to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateSupergraphSDL(sdl) {
  const errors = [];

  try {
    // Try to parse the SDL
    parse(sdl);

    // Basic validation
    if (!sdl.includes("type Query")) {
      errors.push("Supergraph must have a Query type");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  } catch (error) {
    errors.push(`Parse error: ${error.message}`);
    return {
      valid: false,
      errors,
    };
  }
}
