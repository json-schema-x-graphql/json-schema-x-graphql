/**
 * Federation Validator
 * Uses @graphql-tools to validate Apollo Federation compliance
 */

import { buildSchema, validateSchema, parse } from 'graphql';

/**
 * Validates federation compliance of a GraphQL SDL string
 * Checks for proper @extends, @external, @key directives
 * @param {string} sdl - GraphQL Schema Definition Language
 * @returns {Object} Validation result with errors and warnings
 */
export function validateFederationRules(sdl) {
  const errors = [];
  const warnings = [];

  if (!sdl || typeof sdl !== 'string') {
    return {
      valid: false,
      errors: ['Invalid SDL: must be a non-empty string'],
      warnings: []
    };
  }

  try {
    // Parse SDL to check for syntax errors
    const document = parse(sdl);
    
    // Check for federation directives
    const hasExtends = sdl.includes('@extends');
    const hasExternal = sdl.includes('@external');
    const hasKey = sdl.includes('@key');
    const hasShareable = sdl.includes('@shareable');
    const hasRequires = sdl.includes('@requires');

    // Validate @extends usage
    if (hasExtends) {
      const extendsMatches = sdl.match(/type\s+(\w+)\s*@extends/g);
      if (extendsMatches && extendsMatches.length > 0) {
        extendsMatches.forEach(match => {
          // Types with @extends should also have @key
          const typeNameMatch = match.match(/type\s+(\w+)/);
          if (typeNameMatch) {
            const typeName = typeNameMatch[1];
            const typeSection = sdl.match(new RegExp(`type\\s+${typeName}\\s*(@[^{]+)?\\{[^}]*\\}`));
            if (typeSection && !typeSection[0].includes('@key')) {
              warnings.push(
                `Type "${typeName}" uses @extends but may be missing @key. ` +
                `Extending types should repeat @key from owner.`
              );
            }
          }
        });
      }
    }

    // Validate @external usage
    if (hasExternal) {
      if (!hasExtends) {
        warnings.push(
          '@external directives found but no @extends found. ' +
          '@external should only be used in types that extend others.'
        );
      }
    }

    // Validate @key presence
    if (!hasKey) {
      warnings.push('No @key directives found. At least owner type should have @key.');
    }

    // Check for proper federation directive structure
    const keyMatches = sdl.match(/@key\s*\(\s*fields\s*:\s*"([^"]+)"/g) || [];
    const externalMatches = sdl.match(/@external/g) || [];
    const extendsDirectives = sdl.match(/@extends/g) || [];
    
    if (keyMatches.length === 0 && hasExternal) {
      errors.push(
        'Found @external directives without @key. ' +
        'Federation requires at least one type with @key.'
      );
    }

    // Warn if mixing old and new federation patterns
    if (sdl.includes('shared_entity_id')) {
      warnings.push(
        'Schema uses "shared_entity_id" - consider using proper federation keys. ' +
        'See: https://www.apollographql.com/docs/graphos/schema-design/federated-schemas/'
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      hasExtends: hasExtends || extendsDirectives.length > 0,
      hasExternal: hasExternal || externalMatches.length > 0,
      hasKey: hasKey || keyMatches.length > 0,
      directives: {
        extends: extendsDirectives.length,
        external: externalMatches.length,
        key: keyMatches.length
      }
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`SDL Parse Error: ${error.message}`],
      warnings: []
    };
  }
}

/**
 * Validates GraphQL schema syntax and semantics
 * @param {string} sdl - GraphQL Schema Definition Language
 * @returns {Object} Validation result
 */
export function validateSchemaSDL(sdl) {
  try {
    // Ensure SDL has a Query type (required by GraphQL)
    let normalizedSdl = sdl;
    if (!sdl.includes('type Query')) {
      normalizedSdl = `
        type Query {
          _empty: String
        }
        ${sdl}
      `;
    }
    
    const schema = buildSchema(normalizedSdl);
    const schemaErrors = validateSchema(schema);
    
    return {
      valid: schemaErrors.length === 0,
      errors: schemaErrors.map(error => error.message),
      schema,
      typeCount: Object.keys(schema.getTypeMap()).length - 5 // Subtract built-in types (Query, String, Boolean, Int, Float)
    };
  } catch (error) {
    return {
      valid: false,
      errors: [error.message],
      schema: null,
      typeCount: 0
    };
  }
}

/**
 * Comprehensive validation combining federation and schema rules
 * @param {string} sdl - GraphQL Schema Definition Language
 * @returns {Object} Complete validation report
 */
export function validateSupergraph(sdl) {
  const schemaValidation = validateSchemaSDL(sdl);
  const federationValidation = validateFederationRules(sdl);

  return {
    schema: schemaValidation,
    federation: federationValidation,
    isValid: schemaValidation.valid && federationValidation.valid,
    summary: {
      schemaErrors: schemaValidation.errors.length,
      federationErrors: federationValidation.errors.length,
      federationWarnings: federationValidation.warnings.length,
      totalTypes: schemaValidation.typeCount
    }
  };
}

/**
 * Validates supergraph metadata in JSON Schema
 * @param {Object} schema - JSON Schema object with potential x-graphql-supergraph-* properties
 * @returns {Object} Validation result for supergraph metadata
 */
export function validateSupergraphMetadata(schema) {
  const errors = [];
  const warnings = [];

  if (!schema) {
    return { valid: true, errors: [], warnings: [], hasMetadata: false };
  }

  const {
    'x-graphql-supergraph-name': name,
    'x-graphql-supergraph-type': type,
    'x-graphql-supergraph-entity': entity,
    'x-graphql-supergraph-query-root': queryRoot
  } = schema;

  const hasMetadata = !!(name || type || entity || queryRoot !== undefined);

  if (!hasMetadata) {
    return { valid: true, errors: [], warnings: [], hasMetadata: false };
  }

  // Validate required metadata
  if (!name) {
    errors.push('x-graphql-supergraph-name is required when supergraph metadata is present');
  } else if (typeof name !== 'string' || name.length === 0) {
    errors.push('x-graphql-supergraph-name must be a non-empty string');
  }

  if (!type) {
    errors.push('x-graphql-supergraph-type is required when supergraph metadata is present');
  } else if (!['base-entity', 'entity-extending', 'utility'].includes(type)) {
    errors.push(
      'x-graphql-supergraph-type must be one of: base-entity, entity-extending, utility'
    );
  }

  // Validate entity name
  if (type === 'base-entity' || type === 'entity-extending') {
    if (!entity) {
      errors.push(
        `x-graphql-supergraph-entity is required for ${type} subgraphs`
      );
    } else if (typeof entity !== 'string' || entity.length === 0) {
      errors.push('x-graphql-supergraph-entity must be a non-empty string');
    }
  }

  // Validate query-root with type
  if (queryRoot === true && type === 'entity-extending') {
    warnings.push(
      'x-graphql-supergraph-query-root should be false for entity-extending subgraphs'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    hasMetadata: true,
    metadata: {
      name,
      type,
      entity,
      queryRoot: queryRoot !== undefined ? queryRoot : false
    }
  };
}

/**
 * Validates that schemas follow Apollo Federation type-sharing rules
 * @param {Object} schemas - Map of schema names to SDL strings
 * @returns {Object} Validation report for all schemas
 */
export function validateFederatedComposition(schemas) {
  const results = {};
  let hasOwnerWithKey = false;
  let typesWithExtends = [];
  let allErrors = [];
  let allWarnings = [];

  // Validate each schema
  for (const [name, sdl] of Object.entries(schemas)) {
    const validation = validateSupergraph(sdl);
    results[name] = validation;

    allErrors.push(...validation.federation.errors);
    allWarnings.push(...validation.federation.warnings);

    if (validation.federation.hasKey && !validation.federation.hasExtends) {
      hasOwnerWithKey = true;
    }

    if (validation.federation.hasExtends) {
      typesWithExtends.push(name);
    }
  }

  // Check composition rules
  const compositionErrors = [];
  if (!hasOwnerWithKey) {
    compositionErrors.push(
      'No owner schema with @key found. At least one schema must define @key without @extends.'
    );
  }

  if (typesWithExtends.length > 0 && !hasOwnerWithKey) {
    compositionErrors.push(
      `Schemas ${typesWithExtends.join(', ')} use @extends but no owner schema found.`
    );
  }

  return {
    schemas: results,
    composition: {
      valid: compositionErrors.length === 0 && allErrors.length === 0,
      errors: [...allErrors, ...compositionErrors],
      warnings: allWarnings,
      hasOwner: hasOwnerWithKey,
      hasExtenders: typesWithExtends.length > 0,
      extenderCount: typesWithExtends.length
    }
  };
}

/**
 * Generates human-readable validation report
 * @param {Object} validation - Result from validateSupergraph or validateFederatedComposition
 * @returns {string} Formatted report
 */
export function formatValidationReport(validation) {
  const lines = [];

  if (validation.composition) {
    // Federation composition report
    const comp = validation.composition;
    lines.push('=== Federation Composition Report ===');
    lines.push(`Status: ${comp.valid ? '✓ VALID' : '✗ INVALID'}`);
    lines.push(`Owner Schema: ${comp.hasOwner ? '✓ Found' : '✗ Missing'}`);
    lines.push(`Extending Schemas: ${comp.extenderCount} (${comp.hasExtenders ? 'valid' : 'none'})`);
    lines.push('');

    if (comp.errors.length > 0) {
      lines.push('Errors:');
      comp.errors.forEach(err => lines.push(`  ✗ ${err}`));
      lines.push('');
    }

    if (comp.warnings.length > 0) {
      lines.push('Warnings:');
      comp.warnings.forEach(warn => lines.push(`  ⚠ ${warn}`));
      lines.push('');
    }

    // Schema results
    lines.push('Schema Validations:');
    for (const [name, result] of Object.entries(validation.schemas)) {
      const status = result.isValid ? '✓' : '✗';
      lines.push(`  ${status} ${name}: ${result.summary.schemaErrors} schema errors, ${result.summary.federationErrors} federation errors`);
    }
  } else if (validation.federation) {
    // Single schema report
    const fed = validation.federation;
    lines.push('=== Federation Validation Report ===');
    lines.push(`Status: ${fed.valid ? '✓ VALID' : '✗ INVALID'}`);
    lines.push(`Directives: @key=${fed.directives.key}, @extends=${fed.directives.extends}, @external=${fed.directives.external}`);
    lines.push('');

    if (fed.errors.length > 0) {
      lines.push('Errors:');
      fed.errors.forEach(err => lines.push(`  ✗ ${err}`));
      lines.push('');
    }

    if (fed.warnings.length > 0) {
      lines.push('Warnings:');
      fed.warnings.forEach(warn => lines.push(`  ⚠ ${warn}`));
    }
  }

  return lines.join('\n');
}

/**
 * Validates subgraph metadata naming convention
 * Only 1 subgraph should use x-graphql-supergraph-* (the base entity)
 * Other subgraphs should use x-graphql-subgraph-*
 * @param {Array} schemas - Array of {name: string, schema: Object, type: string}
 * @returns {Object} Validation result
 */
export function validateSubgraphNaming(schemas) {
  const errors = [];
  const warnings = [];
  const supergraphSchemas = [];
  const subgraphSchemas = [];

  if (!Array.isArray(schemas) || schemas.length === 0) {
    return {
      valid: true,
      errors: [],
      warnings: [],
      supergraphCount: 0,
      subgraphCount: 0
    };
  }

  // Analyze each schema's metadata
  schemas.forEach(({ name, schema, type }) => {
    const hasSupergraphMetadata = !!(
      schema['x-graphql-supergraph-name'] ||
      schema['x-graphql-supergraph-type'] ||
      schema['x-graphql-supergraph-entity'] ||
      schema['x-graphql-supergraph-query-root'] !== undefined
    );

    const hasSubgraphMetadata = !!(
      schema['x-graphql-subgraph-name'] ||
      schema['x-graphql-subgraph-type'] ||
      schema['x-graphql-subgraph-entity'] ||
      schema['x-graphql-subgraph-query-root'] !== undefined
    );

    // Check for mixed metadata
    if (hasSupergraphMetadata && hasSubgraphMetadata) {
      errors.push(
        `"${name}": Cannot mix x-graphql-supergraph-* and x-graphql-subgraph-* metadata. ` +
        `Choose one namespace per subgraph.`
      );
    }

    if (hasSupergraphMetadata) {
      supergraphSchemas.push({
        name,
        type: schema['x-graphql-supergraph-type'],
        isBaseEntity: schema['x-graphql-supergraph-type'] === 'base-entity'
      });
    }

    if (hasSubgraphMetadata) {
      subgraphSchemas.push({
        name,
        type: schema['x-graphql-subgraph-type']
      });
    }
  });

  // Enforce: Only 1 supergraph allowed
  if (supergraphSchemas.length > 1) {
    errors.push(
      `Only 1 subgraph can use x-graphql-supergraph-* metadata, found ${supergraphSchemas.length}: ` +
      `${supergraphSchemas.map(s => `"${s.name}"`).join(', ')}`
    );
  }

  // Enforce: If supergraph exists, it must be base-entity type
  const baseEntitySupergraph = supergraphSchemas.find(s => s.isBaseEntity);
  if (supergraphSchemas.length === 1 && !baseEntitySupergraph) {
    errors.push(
      `Supergraph subgraph "${supergraphSchemas[0].name}" must use ` +
      `x-graphql-supergraph-type: "base-entity"`
    );
  }

  // Warn: If there are subgraphs but no supergraph
  if (subgraphSchemas.length > 0 && supergraphSchemas.length === 0) {
    warnings.push(
      `Found ${subgraphSchemas.length} extending subgraph(s) but no base entity subgraph ` +
      `(using x-graphql-supergraph-*). Ensure federation composition is valid.`
    );
  }

  // Validate subgraph types must be entity-extending or utility
  subgraphSchemas.forEach(({ name, type }) => {
    if (type && type !== 'entity-extending' && type !== 'utility') {
      errors.push(
        `"${name}": x-graphql-subgraph-type must be "entity-extending" or "utility", ` +
        `got "${type}". Only supergraph subgraphs can be "base-entity".`
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    supergraphCount: supergraphSchemas.length,
    subgraphCount: subgraphSchemas.length,
    supergraphSchemas,
    subgraphSchemas
  };
}

/**
 * SDL Linter - Highlights issues in GraphQL SDL
 * Checks for naming conventions, syntax issues, and federation compliance
 * @param {string} sdl - GraphQL Schema Definition Language
 * @returns {Object} Linting results organized by severity
 */
export function lintSDL(sdl) {
  const issues = {
    errors: [],
    warnings: [],
    infos: []
  };

  if (!sdl || typeof sdl !== 'string') {
    issues.errors.push('SDL must be a non-empty string');
    return issues;
  }

  // Check naming conventions
  const typeMatches = sdl.match(/type\s+(\w+)/g) || [];
  typeMatches.forEach(match => {
    const typeName = match.match(/type\s+(\w+)/)[1];
    if (!/^[A-Z]/.test(typeName)) {
      issues.errors.push(
        `Type name "${typeName}" should start with uppercase letter (PascalCase)`
      );
    }
  });

  // Check field naming conventions
  const fieldMatches = sdl.match(/(\w+)\s*:\s*[A-Z\[!]/g) || [];
  fieldMatches.forEach(match => {
    const fieldName = match.match(/^(\w+)/)[1];
    if (fieldName !== '_empty' && !/^[a-z_]/.test(fieldName)) {
      issues.warnings.push(
        `Field name "${fieldName}" should use snake_case (start with lowercase)`
      );
    }
  });

  // Check for missing @key in federation types
  if (sdl.includes('@extends')) {
    const extendsMatches = sdl.match(/type\s+(\w+)\s+@extends/g) || [];
    extendsMatches.forEach(match => {
      const typeName = match.match(/type\s+(\w+)/)[1];
      const typeBlock = sdl.match(new RegExp(`type\\s+${typeName}[^}]*\\}`));
      if (typeBlock && !typeBlock[0].includes('@key')) {
        issues.warnings.push(
          `Type "${typeName}" uses @extends but has no @key directive. ` +
          `Extending types should repeat @key from the owner schema.`
        );
      }
    });
  }

  // Check for orphaned @external directives
  if (sdl.includes('@external') && !sdl.includes('@extends')) {
    issues.warnings.push(
      '@external directives found but no @extends. @external should only be used with @extends.'
    );
  }

  // Check for proper directive argument syntax
  const badDirectives = sdl.match(/@\w+\s*\(\s*[^"]/g) || [];
  if (badDirectives.length > 0) {
    issues.warnings.push(
      'Some directives may have improper argument syntax. Use fields: "fieldName" format for @key.'
    );
  }

  // Check for duplicate type definitions
  const typeNames = new Map();
  (sdl.match(/type\s+(\w+)/g) || []).forEach(match => {
    const typeName = match.match(/type\s+(\w+)/)[1];
    typeNames.set(typeName, (typeNames.get(typeName) || 0) + 1);
  });
  typeNames.forEach((count, name) => {
    if (count > 1) {
      issues.errors.push(`Type "${name}" is defined ${count} times`);
    }
  });

  // Check for empty types
  const emptyTypeMatches = sdl.match(/type\s+\w+\s*\{[^}]*\}/g) || [];
  emptyTypeMatches.forEach(typeBlock => {
    const content = typeBlock.match(/\{([^}]*)\}/)[1].trim();
    if (content === '' || content === '_empty: String') {
      const typeName = typeBlock.match(/type\s+(\w+)/)[1];
      issues.infos.push(
        `Type "${typeName}" appears to be empty or is a placeholder`
      );
    }
  });

  return issues;
}
