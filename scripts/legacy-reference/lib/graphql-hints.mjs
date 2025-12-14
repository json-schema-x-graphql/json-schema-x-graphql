/**
 * Shared GraphQL hints processing library.
 *
 * Centralizes parsing and application of x-graphql-* JSON Schema extensions
 * into GraphQL SDL post-processing steps. Designed for reuse across:
 *  - generate-graphql-with-extensions.mjs
 *  - generate-graphql-enhanced.mjs
 *  - generate-graphql-custom.mjs
 *  - future validators / enrichment tools
 *
 * Extensions supported:
 *  - x-graphql-scalars
 *  - x-graphql-enum (per definition)
 *  - x-graphql-union (per definition)
 *  - x-graphql-scalar (per field/property)
 *  - x-graphql-required (per field/property)
 *  - x-graphql-operations (root queries/mutations/subscriptions)
 *  - x-graphql-pagination (Relay-style connection scaffolding)
 *
 * All functions are pure (no file IO). Callers pass in raw JSON schema object
 * and base SDL string produced by a generator (typeconv, custom builder, etc).
 *
 * Exported high-level API:
 *  - parseHintExtensions(schema)
 *  - generateEnhancedSDL(baseSDL, schema [, options])
 *
 * Low-level building blocks exported to allow partial application:
 *  - buildEnumSDL(enumConfig)
 *  - addCustomScalarsSDL(scalarsMap)
 *  - addOperationsSDL(operationsConfig)
 *  - addPaginationTypesSDL(paginationConfig)
 *  - enhanceUnionDescriptions(sdl, unionsMap)
 *  - applyScalarFieldReplacements(sdl, scalarFieldMap)
 *  - applyRequiredFieldNonNull(sdl, requiredFieldMap)
 *  - collectSchemaHintMeta(schema)
 *
 * Design goals:
 *  - Idempotency: Applying the same enhancement twice should not duplicate content.
 *  - Safety: Avoid brittle regex replacements via bounded patterns & structural checks.
 *  - Extensibility: New x-graphql-* extensions can slot into parse & apply phases.
 *
 * NOTE: The library does not perform GraphQL validation; callers may wish to run
 * buildSchema()/parse() afterwards.
 */

/* -------------------------------------------------------------------------- */
/* Types (JSDoc)                                                              */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {Object} GraphQLScalarConfig
 * @property {string} description
 */

/**
 * @typedef {Object} GraphQLEnumValueConfig
 * @property {string} name - The enum value identifier in SDL
 * @property {string} [description]
 * @property {string} [deprecated] - Deprecation reason (if present)
 */

/**
 * @typedef {Object} GraphQLEnumConfig
 * @property {string} name - Enum type name in GraphQL
 * @property {string} [description]
 * @property {Object.<string, GraphQLEnumValueConfig>} values - Original JSON value key -> config
 */

/**
 * @typedef {Object} GraphQLUnionConfig
 * @property {string} name - Union type name
 * @property {string} [description]
 * @property {string[]} types - Member type names
 */

/**
 * @typedef {Object} GraphQLOperationFieldArg
 * @property {string} type - GraphQL type reference (e.g. "String!", "ID")
 * @property {string} [description]
 * @property {*} [default] - Default value (will be JSON.stringified)
 */

/**
 * @typedef {Object} GraphQLOperationField
 * @property {string} type - Return type
 * @property {string} [description]
 * @property {Object.<string, GraphQLOperationFieldArg>} [args]
 */

/**
 * @typedef {Object} GraphQLOperationsConfig
 * @property {Object.<string, GraphQLOperationField>} [queries]
 * @property {Object.<string, GraphQLOperationField>} [mutations]
 * @property {Object.<string, GraphQLOperationField>} [subscriptions]
 */

/**
 * @typedef {Object} GraphQLPaginationConfig
 * @property {boolean} enabled
 * @property {string} [connectionTypeName='ContractConnection']
 * @property {string} [edgeTypeName='ContractEdge']
 * @property {string} [nodeTypeName='Contract']
 * @property {string} [pageInfoTypeName='PageInfo']
 * @property {string} [nodeInterfaceName='Node']
 */

/**
 * @typedef {Object} ParsedHintExtensions
 * @property {Object.<string, GraphQLScalarConfig>} scalars
 * @property {Object.<string, GraphQLEnumConfig>} enums
 * @property {Object.<string, GraphQLUnionConfig>} unions
 * @property {GraphQLOperationsConfig} operations
 * @property {GraphQLPaginationConfig|null} pagination
 * @property {Map<string, string>} scalarFieldMap - Key: TypeName.fieldName -> scalarType
 * @property {Map<string, boolean>} requiredFieldMap - Key: TypeName.fieldName -> true
 */

/* -------------------------------------------------------------------------- */
/* Utility Helpers                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Safely get object key; returns empty object if missing.
 * @param {Object} obj
 * @param {string} key
 * @returns {Object}
 */
function objectOrEmpty(obj, key) {
  const val = obj && obj[key];
  return val && typeof val === "object" ? val : {};
}

/**
 * Return unique filtered lines (preserve first occurrence order).
 * @param {string[]} lines
 * @returns {string[]}
 */
function uniqueLines(lines) {
  const seen = new Set();
  const out = [];
  for (const line of lines) {
    if (!seen.has(line)) {
      seen.add(line);
      out.push(line);
    }
  }
  return out;
}

/**
 * Indent block of text lines with provided spaces.
 * @param {string} text
 * @param {number} spaces
 * @returns {string}
 */
function indent(text, spaces = 2) {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map(l => (l.trim().length ? pad + l : l))
    .join("\n");
}

/**
 * Escape double quotes for inline string contexts.
 * @param {string} value
 * @returns {string}
 */
function esc(value) {
  return value.replace(/"/g, '\\"');
}

/* -------------------------------------------------------------------------- */
/* Parsing Functions                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Collect hint metadata without performing transformation.
 * @param {Object} schema - Raw JSON Schema object
 * @returns {ParsedHintExtensions}
 */
export function parseHintExtensions(schema) {
  const scalars = objectOrEmpty(schema, "x-graphql-scalars");
  const operations = objectOrEmpty(schema, "x-graphql-operations");
  const pagination = schema["x-graphql-pagination"] || null;

  const enums = {};
  const unions = {};
  const scalarFieldMap = new Map();
  const requiredFieldMap = new Map();

  const definitions = schema.definitions || schema.$defs || {};

  for (const [defName, def] of Object.entries(definitions)) {
    // Enum
    if (def && def["x-graphql-enum"]) {
      const enumConfig = def["x-graphql-enum"];
      // Validate minimal shape
      if (enumConfig && enumConfig.name && enumConfig.values) {
        enums[defName] = {
          name: enumConfig.name,
          description: enumConfig.description || def.description || "",
          values: enumConfig.values,
        };
      }
    }
    // Union
    if (def && def["x-graphql-union"]) {
      const unionConfig = def["x-graphql-union"];
      if (unionConfig && Array.isArray(unionConfig.types)) {
        unions[defName] = {
          name: unionConfig.name || defName,
          // preserve original description preference
          description: unionConfig.description || def.description || "",
          types: unionConfig.types.slice(),
        };
      }
    }
    // Fields scanning
    if (def && def.properties && typeof def.properties === "object") {
      for (const [propName, propDef] of Object.entries(def.properties)) {
        if (propDef && typeof propDef === "object") {
          if (propDef["x-graphql-scalar"]) {
            scalarFieldMap.set(`${defName}.${propName}`, propDef["x-graphql-scalar"]);
          }
          if (propDef["x-graphql-required"] === true) {
            requiredFieldMap.set(`${defName}.${propName}`, true);
          } else if (Array.isArray(def.required) && def.required.includes(propName)) {
            // canonical JSON Schema required is still respected
            requiredFieldMap.set(`${defName}.${propName}`, true);
          }
        }
      }
    }
  }

  return {
    scalars,
    enums,
    unions,
    operations,
    pagination,
    scalarFieldMap,
    requiredFieldMap,
  };
}

/**
 * Alias for parseHintExtensions (semantic clarity when caller wants metadata).
 * @param {Object} schema
 * @returns {ParsedHintExtensions}
 */
export function collectSchemaHintMeta(schema) {
  return parseHintExtensions(schema);
}

/* -------------------------------------------------------------------------- */
/* SDL Builders                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Build SDL for custom scalars.
 * Idempotent: does not repeat if scalar already defined in baseSDL.
 * @param {Object.<string, GraphQLScalarConfig>} scalarsMap
 * @param {string} [baseSDL='']
 * @returns {string} scalar declarations block or empty string
 */
export function addCustomScalarsSDL(scalarsMap, baseSDL = "") {
  const lines = [];
  for (const [scalarName, config] of Object.entries(scalarsMap)) {
    // Skip if scalar already present
    const scalarRegex = new RegExp(`(^|\\n)\\s*scalar\\s+${scalarName}(\\s|\\n|$)`);
    if (scalarRegex.test(baseSDL)) continue;
    if (config.description) {
      lines.push(`"""\n${config.description}\n"""`);
    }
    lines.push(`scalar ${scalarName}`);
    lines.push("");
  }
  return lines.join("\n").trim();
}

/**
 * Build SDL for a single enum config.
 * @param {GraphQLEnumConfig} enumConfig
 * @returns {string}
 */
export function buildEnumSDL(enumConfig) {
  const out = [];
  if (enumConfig.description) {
    out.push(`"""\n${enumConfig.description}\n"""`);
  }
  out.push(`enum ${enumConfig.name} {`);
  for (const [rawKey, valueCfg] of Object.entries(enumConfig.values)) {
    const valueName = valueCfg.name;
    if (!valueName) continue;
    if (valueCfg.description) {
      out.push(indent(`"""`));
      out.push(indent(`${valueCfg.description}`));
      out.push(indent(`"""`));
    }
    let line = indent(valueName);
    if (valueCfg.deprecated) {
      line += ` @deprecated(reason: "${esc(valueCfg.deprecated)}")`;
    }
    out.push(line);
  }
  out.push("}");
  return out.join("\n");
}

/**
 * Produce SDL for operations (Query / Mutation / Subscription).
 * @param {GraphQLOperationsConfig} operationsConfig
 * @param {Object} [options]
 * @param {boolean} [options.includeDescriptions=true]
 * @returns {string} SDL block (may be multi-type)
 */
export function addOperationsSDL(operationsConfig, options = {}) {
  const { includeDescriptions = true } = options;
  const blocks = [];

  function makeType(typeName, fieldsObj) {
    if (!fieldsObj || !Object.keys(fieldsObj).length) return "";
    const lines = [`type ${typeName} {`];
    for (const [fieldName, fieldCfg] of Object.entries(fieldsObj)) {
      // Args
      let argsSDL = "";
      if (fieldCfg.args && Object.keys(fieldCfg.args).length) {
        const argLines = [];
        for (const [argName, argCfg] of Object.entries(fieldCfg.args)) {
          let argLine = `${argName}: ${argCfg.type}`;
          if (argCfg.default !== undefined) {
            // GraphQL default value syntax; we stringify JSON for edge cases
            argLine += ` = ${JSON.stringify(argCfg.default)}`;
          }
          if (includeDescriptions && argCfg.description) {
            argLines.push(indent(`"""`));
            argLines.push(indent(argCfg.description));
            argLines.push(indent(`"""`));
          }
          argLines.push(indent(argLine));
        }
        if (argLines.some(l => l.trim().startsWith('"""'))) {
          // multiline args style
          argsSDL = `(\n${argLines.join("\n")}\n  )`;
        } else {
          // single line style if minimal
          const simpleArgs = argLines.filter(l => !l.trim().startsWith('"""')).map(l => l.trim());
          argsSDL = `(${simpleArgs.join(", ")})`;
        }
      }
      if (includeDescriptions && fieldCfg.description) {
        lines.push(indent(`"""`));
        lines.push(indent(fieldCfg.description));
        lines.push(indent(`"""`));
      }
      lines.push(indent(`${fieldName}${argsSDL}: ${fieldCfg.type}`));
    }
    lines.push("}");
    return lines.join("\n");
  }

  const q = makeType("Query", operationsConfig.queries);
  const m = makeType("Mutation", operationsConfig.mutations);
  const s = makeType("Subscription", operationsConfig.subscriptions);
  [q, m, s].forEach(b => {
    if (b) blocks.push(b);
  });
  return blocks.join("\n\n");
}

/**
 * Build pagination support SDL (Relay-style).
 * @param {GraphQLPaginationConfig} paginationConfig
 * @param {string} [baseSDL=''] - Used to avoid duplicate type declarations
 * @returns {string}
 */
export function addPaginationTypesSDL(paginationConfig, baseSDL = "") {
  if (!paginationConfig || !paginationConfig.enabled) return "";
  const {
    connectionTypeName = "ContractConnection",
    edgeTypeName = "ContractEdge",
    nodeTypeName = "Contract",
    pageInfoTypeName = "PageInfo",
    nodeInterfaceName = "Node",
  } = paginationConfig;

  // Skip types already present
  const needed = [connectionTypeName, edgeTypeName, pageInfoTypeName, nodeInterfaceName].filter(
    typeName => !new RegExp(`(^|\\n)type\\s+${typeName}\\b`).test(baseSDL)
  );

  if (!needed.length) return "";

  const block = [];
  if (needed.includes(pageInfoTypeName)) {
    block.push(`"""Information about pagination in a connection"""`);
    block.push(`type ${pageInfoTypeName} {`);
    block.push(indent("hasNextPage: Boolean!"));
    block.push(indent("hasPreviousPage: Boolean!"));
    block.push(indent("startCursor: String"));
    block.push(indent("endCursor: String"));
    block.push("}");
    block.push("");
  }
  if (needed.includes(edgeTypeName)) {
    block.push(`"""Edge linking a cursor to a ${nodeTypeName} node"""`);
    block.push(`type ${edgeTypeName} {`);
    block.push(indent("cursor: String!"));
    block.push(indent(`node: ${nodeTypeName}!`));
    block.push("}");
    block.push("");
  }
  if (needed.includes(connectionTypeName)) {
    block.push(`"""Paginated list of ${nodeTypeName} items"""`);
    block.push(`type ${connectionTypeName} {`);
    block.push(indent(`edges: [${edgeTypeName}!]!`));
    block.push(indent(`${pageInfoTypeName ? "pageInfo" : "page"}: ${pageInfoTypeName}!`));
    block.push(indent("totalCount: Int"));
    block.push("}");
    block.push("");
  }
  if (needed.includes(nodeInterfaceName)) {
    block.push(`"""Global identification interface"""`);
    block.push(`interface ${nodeInterfaceName} {`);
    block.push(indent("id: ID!"));
    block.push("}");
  }
  return block.join("\n");
}

/**
 * Enhance union descriptions if missing or to append additional metadata.
 * @param {string} sdl
 * @param {Object.<string, GraphQLUnionConfig>} unionsMap
 * @returns {string}
 */
export function enhanceUnionDescriptions(sdl, unionsMap) {
  let updated = sdl;
  for (const [defName, unionCfg] of Object.entries(unionsMap)) {
    const unionName = unionCfg.name || defName;
    const pattern = new RegExp(`(^|\\n)union\\s+${unionName}\\s*=`);
    if (!pattern.test(updated)) {
      // union not found in SDL; skip
      continue;
    }
    if (!unionCfg.description) continue;

    // If description already exists, skip insert
    const descPattern = new RegExp(`("""[\\s\\S]*?"""\\s+)?union\\s+${unionName}\\s*=`);
    const alreadyHasDesc = new RegExp(`(^|\\n)"""[\\s\\S]*?"""\\s+union\\s+${unionName}\\s*=`).test(
      updated
    );
    if (alreadyHasDesc) continue;

    // Inject description immediately before union line
    updated = updated.replace(pattern, `\n"""\n${unionCfg.description}\n"""\nunion ${unionName} =`);
  }
  return updated;
}

/**
 * Apply custom scalar replacements to field lines.
 * @param {string} sdl
 * @param {Map<string,string>} scalarFieldMap - TypeName.fieldName -> scalarName
 * @returns {string}
 */
export function applyScalarFieldReplacements(sdl, scalarFieldMap) {
  if (!scalarFieldMap || !scalarFieldMap.size) return sdl;
  const lines = sdl.split("\n");
  let currentType = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const typeMatch = line.match(/^\s*type\s+(\w+)/);
    if (typeMatch) {
      currentType = typeMatch[1];
      continue;
    }
    if (/^\s*}/.test(line)) {
      currentType = null;
      continue;
    }
    if (!currentType) continue;

    // Extract field candidate: <name>: <Type>...
    const fieldMatch = line.match(/^\s*("?[^"]*"?\s*)?(\w+)\s*:\s*([[\]\w!]+)/);
    if (!fieldMatch) continue;

    const fieldName = fieldMatch[2];
    const key = `${currentType}.${fieldName}`;
    const targetScalar = scalarFieldMap.get(key);
    if (!targetScalar) continue;

    // Replace the type part only (avoid altering description lines)
    lines[i] = line.replace(/:\s*([[\]\w!]+)/, match => {
      // Preserve wrapping (list/non-null) but substitute base scalar
      const originalType = match.replace(/:\s*/, "");
      // Extract wrappers
      let wrappersPrefix = "";
      let wrappersSuffix = "";
      let base = originalType;

      // Handle list wrapper(s)
      const listPrefixMatch = base.match(/^(\[+)/);
      if (listPrefixMatch) {
        wrappersPrefix = listPrefixMatch[1];
        base = base.slice(wrappersPrefix.length);
      }
      const listSuffixMatch = base.match(/(\!*\]+)$/);
      if (listSuffixMatch) {
        wrappersSuffix = listSuffixMatch[1];
        base = base.slice(0, base.length - wrappersSuffix.length);
      }

      // Remove trailing ! from base (will re-add if existed)
      let nonNull = "";
      if (base.endsWith("!")) {
        nonNull = "!";
        base = base.slice(0, -1);
      }
      // Compose new base
      const newBase = targetScalar + nonNull;
      return `: ${wrappersPrefix}${newBase}${wrappersSuffix}`;
    });
  }

  return lines.join("\n");
}

/**
 * Apply required markers (!) to fields based on requiredFieldMap.
 * Only adds ! where absent. Does not remove existing !.
 * @param {string} sdl
 * @param {Map<string,boolean>} requiredFieldMap
 * @returns {string}
 */
export function applyRequiredFieldNonNull(sdl, requiredFieldMap) {
  if (!requiredFieldMap || !requiredFieldMap.size) return sdl;
  const lines = sdl.split("\n");
  let currentType = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const typeMatch = line.match(/^\s*type\s+(\w+)/);
    if (typeMatch) {
      currentType = typeMatch[1];
      continue;
    }
    if (/^\s*}/.test(line)) {
      currentType = null;
      continue;
    }
    if (!currentType) continue;

    // Field line detection (optionally preceded by """description""")
    const fieldMatch = line.match(/^\s*(?:"""[^"]*"""\s*)?(\w+)\s*:\s*([[\]\w!]+)/);
    if (!fieldMatch) continue;
    const fieldName = fieldMatch[1];
    const key = `${currentType}.${fieldName}`;
    if (!requiredFieldMap.get(key)) continue;

    // Add ! at the end of the base type (respect lists)
    // Avoid if already non-null (pattern ends in ! or inner list item has !)
    const typePartMatch = line.match(/:\s*([[\]\w!]+)/);
    if (!typePartMatch) continue;
    const typePart = typePartMatch[1];

    // Already non-null outermost?
    if (/\!$/.test(typePart.trim())) continue;

    // Append ! after the entire type (including any closing brackets)
    let newTypePart = typePart;
    if (!newTypePart.endsWith("!")) {
      newTypePart += "!";
    }
    lines[i] = line.replace(/:\s*([[\]\w!]+)/, `: ${newTypePart}`);
  }

  return lines.join("\n");
}

/* -------------------------------------------------------------------------- */
/* Orchestration                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Generate enhanced SDL from baseSDL and JSON Schema hint extensions.
 *
 * Steps (conditional if metadata present):
 *  1. Inject custom scalars (top)
 *  2. Replace field scalar types
 *  3. Mark required fields non-null
 *  4. Insert/replace enum stubs (if missing)
 *  5. Enhance union descriptions
 *  6. Append operations (Query/Mutation/Subscription)
 *  7. Append pagination types
 *
 * @param {string} baseSDL - Initial SDL
 * @param {Object} schema - JSON Schema object with x-graphql-* extensions
 * @param {Object} [options]
 * @param {boolean} [options.includeOperations=true]
 * @param {boolean} [options.includePagination=true]
 * @param {boolean} [options.includeScalars=true]
 * @param {boolean} [options.includeEnums=true]
 * @param {boolean} [options.includeUnions=true]
 * @param {boolean} [options.applyScalarFields=true]
 * @param {boolean} [options.applyRequiredFields=true]
 * @returns {string} Enhanced SDL
 */
export function generateEnhancedSDL(baseSDL, schema, options = {}) {
  const {
    includeOperations = true,
    includePagination = true,
    includeScalars = true,
    includeEnums = true,
    includeUnions = true,
    applyScalarFields = true,
    applyRequiredFields = true,
  } = options;

  let sdl = baseSDL;
  const meta = parseHintExtensions(schema);

  // 1. Custom scalars (prepend)
  if (includeScalars && Object.keys(meta.scalars).length) {
    const scalarsBlock = addCustomScalarsSDL(meta.scalars, sdl);
    if (scalarsBlock) {
      sdl = scalarsBlock + "\n\n" + sdl;
    }
  }

  // 2. Scalar field replacements
  if (applyScalarFields) {
    sdl = applyScalarFieldReplacements(sdl, meta.scalarFieldMap);
  }

  // 3. Required field enhancements
  if (applyRequiredFields) {
    sdl = applyRequiredFieldNonNull(sdl, meta.requiredFieldMap);
  }

  // 4. Enums - Insert definitions if missing
  if (includeEnums && Object.keys(meta.enums).length) {
    const existingEnumNames = new Set();
    sdl.split("\n").forEach(line => {
      const m = line.match(/^\s*enum\s+(\w+)/);
      if (m) existingEnumNames.add(m[1]);
    });
    const newEnumBlocks = [];
    for (const enumCfg of Object.values(meta.enums)) {
      if (!existingEnumNames.has(enumCfg.name)) {
        newEnumBlocks.push(buildEnumSDL(enumCfg));
      }
    }
    if (newEnumBlocks.length) {
      sdl = sdl + "\n\n" + newEnumBlocks.join("\n\n");
    }
  }

  // 5. Union descriptions
  if (includeUnions && Object.keys(meta.unions).length) {
    sdl = enhanceUnionDescriptions(sdl, meta.unions);
  }

  // 6. Operations (append)
  if (includeOperations && Object.keys(meta.operations).length) {
    // Avoid duplicate Query type injection if exists already
    const operationsSDL = addOperationsSDL(meta.operations);
    if (operationsSDL.trim()) {
      sdl = sdl + "\n\n" + operationsSDL;
    }
  }

  // 7. Pagination types (append)
  if (includePagination && meta.pagination && meta.pagination.enabled) {
    const paginationSDL = addPaginationTypesSDL(meta.pagination, sdl);
    if (paginationSDL.trim()) {
      sdl = sdl + "\n\n" + paginationSDL;
    }
  }

  // Final tidy: remove accidental duplicate blank lines
  sdl = uniqueLines(sdl.split("\n"))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  return sdl.trim() + "\n";
}

/* -------------------------------------------------------------------------- */
/* Advanced / Optional Utilities                                              */
/* -------------------------------------------------------------------------- */

/**
 * Merge two ParsedHintExtensions objects (useful for layered schemas).
 * Later object overrides earlier keys on shallow structures.
 * Maps are merged (union of entries).
 * @param {ParsedHintExtensions} a
 * @param {ParsedHintExtensions} b
 * @returns {ParsedHintExtensions}
 */
export function mergeParsedHints(a, b) {
  const out = {
    scalars: { ...(a.scalars || {}), ...(b.scalars || {}) },
    enums: { ...(a.enums || {}), ...(b.enums || {}) },
    unions: { ...(a.unions || {}), ...(b.unions || {}) },
    operations: {
      queries: {
        ...(a.operations?.queries || {}),
        ...(b.operations?.queries || {}),
      },
      mutations: {
        ...(a.operations?.mutations || {}),
        ...(b.operations?.mutations || {}),
      },
      subscriptions: {
        ...(a.operations?.subscriptions || {}),
        ...(b.operations?.subscriptions || {}),
      },
    },
    pagination: b.pagination != null ? b.pagination : a.pagination,
    scalarFieldMap: new Map([...a.scalarFieldMap, ...b.scalarFieldMap]),
    requiredFieldMap: new Map([...a.requiredFieldMap, ...b.requiredFieldMap]),
  };
  return out;
}

/**
 * Build enum SDL blocks for all enums absent from baseSDL.
 * @param {string} baseSDL
 * @param {Object.<string, GraphQLEnumConfig>} enums
 * @returns {string[]} array of SDL blocks (each an enum)
 */
export function buildMissingEnums(baseSDL, enums) {
  const existing = new Set();
  baseSDL.split("\n").forEach(line => {
    const m = line.match(/^\s*enum\s+(\w+)/);
    if (m) existing.add(m[1]);
  });
  const blocks = [];
  for (const enumCfg of Object.values(enums)) {
    if (!existing.has(enumCfg.name)) {
      blocks.push(buildEnumSDL(enumCfg));
    }
  }
  return blocks;
}

/* -------------------------------------------------------------------------- */
/* Diagnostics                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Produce a simple diagnostics summary for hint coverage.
 * @param {ParsedHintExtensions} meta
 * @returns {Object} summary
 */
export function summarizeHints(meta) {
  return {
    scalarCount: Object.keys(meta.scalars).length,
    enumCount: Object.keys(meta.enums).length,
    unionCount: Object.keys(meta.unions).length,
    operationQueryCount: Object.keys(meta.operations.queries || {}).length,
    operationMutationCount: Object.keys(meta.operations.mutations || {}).length,
    operationSubscriptionCount: Object.keys(meta.operations.subscriptions || {}).length,
    paginationEnabled: !!(meta.pagination && meta.pagination.enabled),
    scalarFieldRefs: meta.scalarFieldMap.size,
    requiredFieldRefs: meta.requiredFieldMap.size,
  };
}

/* -------------------------------------------------------------------------- */
/* Example Usage (Comment Only)                                               */
/* -------------------------------------------------------------------------- */

/**
 *
 * // In a generator script:
 * import { generateEnhancedSDL } from './lib/graphql-hints.mjs';
 *
 * const baseSDL = await fs.readFile('generated-schemas/base.graphql', 'utf8');
 * const schema = JSON.parse(await fs.readFile('src/data/schema_unification.schema.json', 'utf8'));
 *
 * const enhancedSDL = generateEnhancedSDL(baseSDL, schema, {
 *   includeOperations: true,
 *   includePagination: true,
 * });
 *
 * await fs.writeFile('generated-schemas/schema_unification.enhanced.graphql', enhancedSDL);
 *
 */

/* -------------------------------------------------------------------------- */
/* Default Export                                                             */
/* -------------------------------------------------------------------------- */

export default {
  parseHintExtensions,
  collectSchemaHintMeta,
  generateEnhancedSDL,
  addCustomScalarsSDL,
  buildEnumSDL,
  addOperationsSDL,
  addPaginationTypesSDL,
  enhanceUnionDescriptions,
  applyScalarFieldReplacements,
  applyRequiredFieldNonNull,
  buildMissingEnums,
  mergeParsedHints,
  summarizeHints,
};
