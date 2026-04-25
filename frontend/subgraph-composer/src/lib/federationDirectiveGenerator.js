/**
 * Federation Directive Generator
 *
 * Automatically detects field dependencies across schemas
 * Generates Apollo Federation v2 @requires and @provides directives
 * Suggests reference fields and composite keys
 */

/**
 * Main entry point: Analyze schemas and generate directive suggestions
 * @param {Array<{name: string, sdl: string}>} subgraphs - Subgraphs with SDL
 * @param {string} supergraphSdl - Current composed supergraph
 * @returns {Array<{type: string, field: string, directive: string, reason: string, suggestion: string}>}
 */
export function generateDirectiveSuggestions(subgraphs, supergraphSdl) {
  const suggestions = [];
  const typeToSchema = buildTypeToSchemaMap(subgraphs);
  const fieldDependencies = analyzeDependencies(supergraphSdl);

  // For each field with dependencies, generate @requires or @provides
  for (const [fieldId, deps] of Object.entries(fieldDependencies)) {
    const [typeName, fieldName] = fieldId.split(".");
    const schemaName = typeToSchema[typeName];

    if (!schemaName) continue;

    // Check if field depends on external types
    const externalDeps = deps.filter((dep) => typeToSchema[dep] !== schemaName);

    if (externalDeps.length > 0) {
      suggestions.push({
        type: "requires",
        typeName,
        fieldName,
        dependencies: externalDeps,
        directive: generateRequiresDirective(fieldName, externalDeps),
        reason: `Field "${fieldName}" references types from other subgraphs`,
        severity: "info",
        schemaName,
        applicable: true,
      });
    }
  }

  // Detect composite keys and shared fields
  const sharedTypes = detectSharedTypes(subgraphs, typeToSchema);
  for (const [typeName, schemas] of Object.entries(sharedTypes)) {
    if (schemas.length > 1) {
      // Type exists in multiple schemas - suggest @key/@provides
      suggestions.push({
        type: "composite_key",
        typeName,
        schemas: schemas,
        directive: `# Type exists in ${schemas.join(", ")}. Consider @key for consistency.`,
        reason: `"${typeName}" is defined in multiple subgraphs`,
        severity: "warning",
        applicable: true,
      });
    }
  }

  // Detect entity extensions
  const entityExtensions = detectEntityExtensions(subgraphs, typeToSchema);
  for (const ext of entityExtensions) {
    suggestions.push({
      type: "extension",
      typeName: ext.typeName,
      baseSchema: ext.baseSchema,
      extendingSchemas: ext.extendingSchemas,
      directive: generateProvidesDirective(ext.typeName, ext.fields),
      reason: `"${ext.typeName}" is extended with fields in other subgraphs`,
      severity: "info",
      applicable: true,
    });
  }

  return suggestions;
}

/**
 * Analyze dependencies within GraphQL SDL
 * Find which fields reference which types
 * @param {string} sdl - GraphQL SDL
 * @returns {Object} Map of fieldId -> [dependencyTypes]
 */
function analyzeDependencies(sdl) {
  const dependencies = {};

  // Parse SDL to find field-type relationships
  const typeMatches = sdl.matchAll(/type\s+(\w+)\s*(?:@\w+[^{]*)?\{([^}]*)\}/g);

  for (const match of typeMatches) {
    const typeName = match[1];
    const fieldsBlock = match[2];

    // Extract field definitions
    const fieldMatches = fieldsBlock.matchAll(/(\w+)\s*(?:\([^)]*\))?:\s*([![\w$]+)*/g);

    for (const fieldMatch of fieldMatches) {
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2];

      if (fieldType && isComplexType(fieldType)) {
        const baseType = extractBaseType(fieldType);
        const fieldId = `${typeName}.${fieldName}`;

        if (!dependencies[fieldId]) {
          dependencies[fieldId] = [];
        }
        dependencies[fieldId].push(baseType);
      }
    }
  }

  return dependencies;
}

/**
 * Build map of which types are defined in which schemas
 * @param {Array<{name: string, sdl: string}>} subgraphs
 * @returns {Object} Map of typeName -> schemaName
 */
function buildTypeToSchemaMap(subgraphs) {
  const map = {};

  for (const subgraph of subgraphs) {
    const typeMatches = subgraph.sdl.matchAll(/type\s+(\w+)/g);
    for (const match of typeMatches) {
      const typeName = match[1];
      if (!map[typeName]) {
        map[typeName] = [];
      }
      if (!map[typeName].includes(subgraph.name)) {
        map[typeName].push(subgraph.name);
      }
    }
  }

  // Convert arrays to single schema if only one, keep array if multiple
  for (const key in map) {
    if (map[key].length === 1) {
      map[key] = map[key][0];
    }
  }

  return map;
}

/**
 * Detect types that are defined in multiple schemas
 * @param {Array<{name: string, sdl: string}>} subgraphs
 * @param {Object} typeToSchema - Existing type-to-schema map
 * @returns {Object} Map of typeName -> [schemas]
 */
function detectSharedTypes(subgraphs, typeToSchema) {
  const shared = {};

  for (const [typeName, schema] of Object.entries(typeToSchema)) {
    if (Array.isArray(schema)) {
      shared[typeName] = schema;
    }
  }

  return shared;
}

/**
 * Detect when a type is extended in different schemas
 * @param {Array<{name: string, sdl: string}>} subgraphs
 * @param {Object} typeToSchema
 * @returns {Array<{typeName, baseSchema, extendingSchemas, fields}>}
 */
function detectEntityExtensions(subgraphs, typeToSchema) {
  const extensions = [];
  const typeExtensions = {};

  // Find which schemas extend which types
  for (const subgraph of subgraphs) {
    const extendMatches = subgraph.sdl.matchAll(
      /extend\s+type\s+(\w+)\s*(?:@\w+[^{]*)?\{([^}]*)\}/g,
    );

    for (const match of extendMatches) {
      const typeName = match[1];
      const fieldsBlock = match[2];

      if (!typeExtensions[typeName]) {
        typeExtensions[typeName] = {
          baseSchema: null,
          extendingSchemas: [],
          fields: [],
        };
      }

      typeExtensions[typeName].extendingSchemas.push(subgraph.name);

      // Extract field names from extends block
      const fieldMatches = fieldsBlock.matchAll(/(\w+)\s*(?:\([^)]*\))?:/g);
      for (const fieldMatch of fieldMatches) {
        const fieldName = fieldMatch[1];
        if (!typeExtensions[typeName].fields.includes(fieldName)) {
          typeExtensions[typeName].fields.push(fieldName);
        }
      }
    }
  }

  // Find the base schema for each extended type
  for (const [typeName, ext] of Object.entries(typeExtensions)) {
    const baseSchema = typeToSchema[typeName];
    if (baseSchema && !Array.isArray(baseSchema)) {
      extensions.push({
        typeName,
        baseSchema,
        extendingSchemas: ext.extendingSchemas,
        fields: ext.fields,
      });
    }
  }

  return extensions;
}

/**
 * Generate @requires directive based on field dependencies
 * @param {string} fieldName
 * @param {Array<string>} externalTypes
 * @returns {string} GraphQL directive
 */
function generateRequiresDirective(fieldName, externalTypes) {
  // @requires needs the reference fields that identify the external type
  // This is a suggestion - actual key fields would need to be determined
  const requiredFields = externalTypes
    .map((type) => {
      return `${type.toLowerCase()}Id`; // Suggest based on type name
    })
    .join(", ");

  return `@requires(fields: "${requiredFields}")`;
}

/**
 * Generate @provides directive for extended types
 * @param {string} typeName
 * @param {Array<string>} fields
 * @returns {string} GraphQL directive
 */
function generateProvidesDirective(typeName, fields) {
  const fieldList = fields.join(", ");
  return `@provides(fields: "${fieldList}")`;
}

/**
 * Check if a type string represents a complex type (not scalar)
 * @param {string} typeStr
 * @returns {boolean}
 */
function isComplexType(typeStr) {
  const baseType = extractBaseType(typeStr);
  const scalars = ["String", "Int", "Float", "Boolean", "ID"];
  return !scalars.includes(baseType);
}

/**
 * Extract base type from a GraphQL type string
 * Handles: Type, [Type], Type!, [Type]!, etc.
 * @param {string} typeStr
 * @returns {string} Base type name
 */
function extractBaseType(typeStr) {
  return typeStr.replace(/[![\]]/g, "");
}

/**
 * Apply suggestions to SDL by inserting directives
 * @param {string} sdl - Original SDL
 * @param {Array<Object>} suggestions - Directive suggestions
 * @returns {string} Modified SDL with directives
 */
export function applySuggestionsToSdl(sdl, suggestions) {
  let modifiedSdl = sdl;

  // Group suggestions by type and field
  const requiresSuggestions = suggestions.filter((s) => s.type === "requires");

  for (const suggestion of requiresSuggestions) {
    const { typeName, fieldName, directive } = suggestion;

    // Find the type and its fields, then add directive to specific field
    // This is more precise than generic field matching
    const lines = modifiedSdl.split("\n");
    let inType = false;
    let typeStartIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      // Check if this line starts the target type
      if (lines[i].includes(`type ${typeName}`) && lines[i].includes("{")) {
        inType = true;
        typeStartIdx = i;
      }

      // Check if we've exited the type
      if (inType && lines[i].includes("}") && i > typeStartIdx) {
        inType = false;
      }

      // If we're in the right type, look for the field
      if (inType && lines[i].includes(fieldName)) {
        const fieldPattern = new RegExp(`(${fieldName}\\s*(?:\\([^)]*\\))?:\\s*[!\\[\\w$]+)`);
        if (fieldPattern.test(lines[i]) && !lines[i].includes("@requires")) {
          lines[i] = lines[i].replace(fieldPattern, `$1 ${directive}`);
        }
      }
    }

    modifiedSdl = lines.join("\n");
  }

  return modifiedSdl;
}

/**
 * Filter and validate suggestions
 * @param {Array<Object>} suggestions
 * @param {Object} filters - {severity, type, applicable}
 * @returns {Array<Object>} Filtered suggestions
 */
export function filterSuggestions(suggestions, filters = {}) {
  return suggestions.filter((s) => {
    if (filters.severity && s.severity !== filters.severity) return false;
    if (filters.type && s.type !== filters.type) return false;
    if (filters.applicable !== undefined && s.applicable !== filters.applicable) return false;
    return true;
  });
}

/**
 * Rank suggestions by importance
 * @param {Array<Object>} suggestions
 * @returns {Array<Object>} Sorted by severity and impact
 */
export function rankSuggestions(suggestions) {
  const severityOrder = { error: 0, warning: 1, info: 2 };

  return [...suggestions].sort((a, b) => {
    const severityDiff = (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3);
    if (severityDiff !== 0) return severityDiff;

    // Secondary sort: by type importance
    const typeOrder = { requires: 0, extension: 1, composite_key: 2 };
    return (typeOrder[a.type] ?? 3) - (typeOrder[b.type] ?? 3);
  });
}

/**
 * Generate a human-readable report of suggestions
 * @param {Array<Object>} suggestions
 * @returns {string} Formatted report
 */
export function generateSuggestionReport(suggestions) {
  let report = "# Federation Directive Suggestions\n\n";

  const byType = {};
  for (const suggestion of suggestions) {
    if (!byType[suggestion.type]) {
      byType[suggestion.type] = [];
    }
    byType[suggestion.type].push(suggestion);
  }

  for (const [type, sugs] of Object.entries(byType)) {
    report += `## ${type.replace("_", " ").toUpperCase()} (${sugs.length})\n\n`;

    for (const sug of sugs) {
      report += `### ${sug.typeName || "Unknown"}`;
      if (sug.fieldName) report += `.${sug.fieldName}`;
      report += `\n`;

      report += `- **Reason**: ${sug.reason}\n`;
      report += `- **Directive**: \`${sug.directive}\`\n`;
      report += `- **Severity**: ${sug.severity}\n\n`;
    }
  }

  return report;
}

/**
 * Validate if a suggestion can be safely applied
 * @param {Object} suggestion
 * @param {string} sdl - Current SDL
 * @returns {Object} {valid: boolean, errors: Array<string>}
 */
export function validateSuggestion(suggestion, sdl) {
  const errors = [];

  // Check if type exists
  if (!sdl.includes(`type ${suggestion.typeName}`)) {
    errors.push(`Type ${suggestion.typeName} not found in SDL`);
  }

  // Check if field exists (for requires suggestions)
  if (suggestion.type === "requires" && suggestion.fieldName) {
    const fieldRegex = new RegExp(`${suggestion.fieldName}\\s*(?:\\([^)]*\\))?:\\s*`);
    if (!sdl.includes(`${suggestion.typeName}`)) {
      errors.push(`Field ${suggestion.fieldName} not found in type ${suggestion.typeName}`);
    }
  }

  // Check for syntax errors in directive
  if (!suggestion.directive || suggestion.directive.trim() === "") {
    errors.push("Directive is empty");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merge multiple suggestions into a single SDL
 * @param {string} baseSdl
 * @param {Array<Object>} suggestions
 * @returns {string} Modified SDL
 */
export function mergeSuggestionsIntoSdl(baseSdl, suggestions) {
  const validated = suggestions.filter((s) => validateSuggestion(s, baseSdl).valid);
  return applySuggestionsToSdl(baseSdl, validated);
}

/**
 * Analyze Federation v2 requirements based on suggestions
 * @param {Array<Object>} suggestions
 * @returns {Object} Federation analysis
 */
export function analyzeDirectiveRequirements(suggestions) {
  const analysis = {
    hasRequires: suggestions.some((s) => s.type === "requires"),
    hasExtensions: suggestions.some((s) => s.type === "extension"),
    typeCount: new Set(suggestions.map((s) => s.typeName)).size,
    fieldCount: suggestions.filter((s) => s.fieldName).length,
    externalReferences: new Set(),
    complexityScore: 0,
  };

  // Calculate external references
  for (const s of suggestions) {
    if (s.dependencies) {
      s.dependencies.forEach((dep) => analysis.externalReferences.add(dep));
    }
  }

  // Calculate complexity score (0-100)
  analysis.complexityScore = Math.min(
    100,
    analysis.typeCount * 10 + analysis.fieldCount * 5 + analysis.externalReferences.size * 8,
  );

  return analysis;
}
