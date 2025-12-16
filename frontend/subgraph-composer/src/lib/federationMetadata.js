/**
 * Federation metadata extraction and analysis
 * Identifies Apollo Federation directives and patterns in subgraphs
 */

/**
 * Extract federation metadata from GraphQL SDL
 * @param {string} sdl - GraphQL Schema Definition Language
 */
export function extractFederationMetadata(sdl) {
  if (!sdl || typeof sdl !== 'string') {
    return {
      success: false,
      error: 'Invalid GraphQL SDL',
      metadata: null,
    };
  }

  try {
    const metadata = {
      version: detectFederationVersion(sdl),
      types: extractFederatedTypes(sdl),
      directives: extractDirectives(sdl),
      references: extractReferences(sdl),
      entityTypes: extractEntityTypes(sdl),
      externalFields: extractExternalFields(sdl),
      stats: {},
    };

    metadata.stats = {
      totalTypes: metadata.types.length,
      federatedTypes: metadata.types.filter((t) => t.isFederated).length,
      entityTypes: metadata.entityTypes.length,
      externalFields: metadata.externalFields.length,
      directives: metadata.directives.length,
    };

    return {
      success: true,
      metadata,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      metadata: null,
    };
  }
}

/**
 * Detect Apollo Federation version
 * @private
 */
function detectFederationVersion(sdl) {
  if (sdl.includes('@key(fields:')) {
    return 'v2';
  }
  if (sdl.includes('@extends') || sdl.includes('@external')) {
    return 'v1';
  }
  return 'none';
}

/**
 * Extract all federated types
 * @private
 */
function extractFederatedTypes(sdl) {
  const types = [];
  const typeRegex =
    /type\s+(\w+)\s*(?:@key|@extends|\s*\{)/gm;
  let match;

  while ((match = typeRegex.exec(sdl)) !== null) {
    const typeName = match[1];
    const typeStart = match.index;
    const typeSection = extractTypeSection(sdl, typeStart);

    types.push({
      name: typeName,
      isFederated: /@key|@extends|@external|@requires|@provides/g.test(
        typeSection
      ),
      hasKey: /@key/g.test(typeSection),
      isExtended: /@extends/g.test(typeSection),
      hasExternalFields: /@external/g.test(typeSection),
      hasRequires: /@requires/g.test(typeSection),
      hasProvides: /@provides/g.test(typeSection),
      fields: extractTypeFields(typeSection),
    });
  }

  return types;
}

/**
 * Extract type section from SDL
 * @private
 */
function extractTypeSection(sdl, startIndex) {
  let braceCount = 0;
  let inBraces = false;
  let end = startIndex;

  for (let i = startIndex; i < sdl.length; i++) {
    if (sdl[i] === '{') {
      inBraces = true;
      braceCount++;
    } else if (sdl[i] === '}') {
      braceCount--;
      if (braceCount === 0 && inBraces) {
        end = i + 1;
        break;
      }
    }
  }

  return sdl.substring(startIndex, end);
}

/**
 * Extract type fields with directives
 * @private
 */
function extractTypeFields(typeSection) {
  const fields = [];
  const fieldRegex = /(\w+):\s*([^\n]+)(@external|@requires|@provides)?/g;
  let match;

  while ((match = fieldRegex.exec(typeSection)) !== null) {
    const fieldName = match[1];
    const fieldType = match[2].trim();
    const directive = match[3] || null;

    if (!fieldName.includes('directive') && !fieldName.includes('extend')) {
      fields.push({
        name: fieldName,
        type: fieldType.split('\n')[0],
        hasDirective: !!directive,
        directive,
      });
    }
  }

  return fields;
}

/**
 * Extract all federation directives
 * @private
 */
function extractDirectives(sdl) {
  const directives = [];
  const directiveRegex = /(@key|@external|@requires|@provides|@extends)\s*\(([^)]+)\)/g;
  let match;

  while ((match = directiveRegex.exec(sdl)) !== null) {
    directives.push({
      type: match[1],
      args: match[2],
      position: match.index,
    });
  }

  return directives;
}

/**
 * Extract type references (dependencies)
 * @private
 */
function extractReferences(sdl) {
  const references = [];
  const refRegex = /:\s*(\[?[A-Z]\w+\]?)(!)?/g;
  let match;

  while ((match = refRegex.exec(sdl)) !== null) {
    const typeRef = match[1].replace(/[\[\]]/g, '');
    if (!references.some((r) => r.type === typeRef)) {
      references.push({
        type: typeRef,
        isRequired: !!match[2],
        isList: match[1].includes('['),
      });
    }
  }

  return references;
}

/**
 * Extract entity types (types with @key)
 * @private
 */
function extractEntityTypes(sdl) {
  const entities = [];
  const entityRegex = /@key\s*\(\s*fields:\s*"([^"]+)"\s*\)\s*\n\s*type\s+(\w+)/g;
  let match;

  while ((match = entityRegex.exec(sdl)) !== null) {
    entities.push({
      name: match[2],
      keyFields: match[1].split(/\s+/),
    });
  }

  return entities;
}

/**
 * Extract external fields
 * @private
 */
function extractExternalFields(sdl) {
  const externalFields = [];
  const extRegex = /(\w+):\s*([^\n]+)\s*@external/g;
  let match;

  while ((match = extRegex.exec(sdl)) !== null) {
    externalFields.push({
      field: match[1],
      type: match[2].trim(),
    });
  }

  return externalFields;
}

/**
 * Analyze federation composition requirements
 */
export function analyzeFederationRequirements(subgraphs) {
  const analysis = {
    canCompose: true,
    issues: [],
    warnings: [],
    recommendations: [],
    entityMap: {},
  };

  // Parse metadata from each subgraph
  const allMetadata = subgraphs.map((sg) => ({
    name: sg.name,
    ...extractFederationMetadata(sg.sdl).metadata,
  }));

  // Check for key conflicts
  const entityNames = new Set();
  for (const metadata of allMetadata) {
    for (const entity of metadata.entityTypes) {
      if (entityNames.has(entity.name)) {
        analysis.issues.push(
          `Entity "${entity.name}" defined in multiple subgraphs`
        );
        analysis.canCompose = false;
      } else {
        entityNames.add(entity.name);
        analysis.entityMap[entity.name] = {
          subgraph: metadata.name,
          keyFields: entity.keyFields,
        };
      }
    }
  }

  // Check for missing @extends
  for (const metadata of allMetadata) {
    for (const extField of metadata.externalFields) {
      const entityName = Object.keys(analysis.entityMap).find((key) =>
        metadata.types
          .find((t) => t.name === key)
          ?.fields?.some((f) => f.name === extField.field)
      );

      if (
        !entityName &&
        !metadata.types.some((t) => t.isExtended && t.name === entityName)
      ) {
        analysis.warnings.push(
          `External field "${extField.field}" may require @extends`
        );
      }
    }
  }

  // Recommendations
  if (allMetadata.some((m) => m.version === 'v1')) {
    analysis.recommendations.push(
      'Consider upgrading from Federation v1 to v2 for improved features'
    );
  }

  if (allMetadata.some((m) => m.entityTypes.length === 0)) {
    analysis.recommendations.push(
      'Some subgraphs have no entities. Consider adding @key directives'
    );
  }

  return analysis;
}

/**
 * Generate federation composition report
 */
export function generateFederationReport(subgraphs, supergraphSdl) {
  const report = {
    timestamp: new Date().toISOString(),
    subgraphs: [],
    supergraph: null,
    composition: analyzeFederationRequirements(subgraphs),
  };

  // Analyze each subgraph
  for (const subgraph of subgraphs) {
    const metadata = extractFederationMetadata(subgraph.sdl);
    report.subgraphs.push({
      name: subgraph.name,
      ...metadata,
    });
  }

  // Analyze supergraph
  if (supergraphSdl) {
    report.supergraph = extractFederationMetadata(supergraphSdl);
  }

  return report;
}
