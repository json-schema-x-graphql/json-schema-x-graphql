#!/usr/bin/env node

/*
 Bi-directional schema sync check between GraphQL SDL and JSON Schema.

 - Parses GraphQL SDL and collects field names across object types
 - Walks JSON Schema recursively to collect all property keys
 - Reports fields missing in JSON Schema and properties missing in GraphQL

 Usage:
   pnpm run validate:sync
*/
import fs from "fs";
import { parse } from "graphql";
import path from "path";
import { fileURLToPath } from "url";

function readFile(p) {
  return fs.readFileSync(p, "utf8");
}

function collectJsonSchemaKeys(schema, out = new Set(), basePath = null, visited = new Set()) {
  if (!schema || typeof schema !== "object") return out;
  
  // Handle $ref to external files
  if (schema.$ref && typeof schema.$ref === "string" && !schema.$ref.startsWith("#")) {
    const refPath = schema.$ref;
    
    // Avoid circular references
    if (visited.has(refPath)) return out;
    visited.add(refPath);
    
    // Try to load the external schema file
    if (basePath) {
      try {
        const fullPath = path.resolve(path.dirname(basePath), refPath);
        if (fs.existsSync(fullPath)) {
          const externalSchema = JSON.parse(fs.readFileSync(fullPath, "utf8"));
          collectJsonSchemaKeys(externalSchema, out, fullPath, visited);
        }
      } catch (err) {
        console.warn(`⚠️  Could not load external schema: ${refPath} - ${err.message}`);
      }
    }
    return out;
  }
  
  if (schema.properties && typeof schema.properties === "object") {
    for (const key of Object.keys(schema.properties)) {
      out.add(key);
      collectJsonSchemaKeys(schema.properties[key], out, basePath, visited);
    }
  }
  if (schema.items) collectJsonSchemaKeys(schema.items, out, basePath, visited);
  if (schema.anyOf) schema.anyOf.forEach(s => collectJsonSchemaKeys(s, out, basePath, visited));
  if (schema.oneOf) schema.oneOf.forEach(s => collectJsonSchemaKeys(s, out, basePath, visited));
  if (schema.allOf) schema.allOf.forEach(s => collectJsonSchemaKeys(s, out, basePath, visited));
  if (schema.$defs && typeof schema.$defs === "object") {
    // $defs is an object of schemas, iterate through each one
    for (const [defName, defSchema] of Object.entries(schema.$defs)) {
      collectJsonSchemaKeys(defSchema, out, basePath, visited);
    }
  }
  return out;
}

function collectGraphQLFieldNames(sdl) {
  const ast = parse(sdl);
  const excludeTypeNames = new Set([
    "Query",
    "Mutation",
    "Subscription",
    "PageInfo",
    "ContractConnection",
    "ContractEdge",
  ]);
  const names = new Set();
  for (const def of ast.definitions) {
    if (def.kind === "ObjectTypeDefinition" && !excludeTypeNames.has(def.name.value)) {
      for (const field of def.fields || []) {
        names.add(field.name.value);
      }
    }
  }
  // Remove some generic/pagination fields that often don't map 1:1
  const excludeFieldNames = new Set([
    "edges",
    "node",
    "cursor",
    "pageInfo",
    "totalCount",
    "startCursor",
    "endCursor",
  ]);
  excludeFieldNames.forEach(n => names.delete(n));
  return names;
}

function getArgFlag(name) {
  return process.argv.includes(name);
}

function getArgValue(name, def) {
  const i = process.argv.indexOf(name);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return def;
}

function getJsonSchemaAtPath(schema, jsonPointer) {
  // jsonPointer like "/commonElements/vendorInfo"; supports navigating properties and items
  if (!jsonPointer || jsonPointer === "/") return schema;
  const parts = jsonPointer.split("/").filter(Boolean);
  let node = schema;

  function resolveRef(ref) {
    if (!ref || typeof ref !== "string") return null;
    // Support internal refs like "#/$defs/name" or "#/$defs/name/properties/foo"
    if (ref.startsWith("#")) {
      const p = ref.replace(/^#\//, "").split("/");
      let n = schema;
      for (const seg of p) {
        if (n && typeof n === "object" && Object.prototype.hasOwnProperty.call(n, seg)) {
          n = n[seg];
        } else {
          return null;
        }
      }
      return n;
    }
    return null;
  }

  function derefNode(n) {
    if (!n || typeof n !== "object") return n;
    if (n.$ref) {
      const r = resolveRef(n.$ref);
      if (r) return r;
    }
    const alt = n.allOf || n.all_of || n.anyOf || n.oneOf;
    if (Array.isArray(alt)) {
      for (const entry of alt) {
        if (entry && typeof entry === "object") {
          if (entry.properties) return entry;
          if (entry.$ref) {
            const r = resolveRef(entry.$ref);
            if (r) return r;
          }
        }
      }
    }
    return n;
  }

    for (const seg of parts) {
    if (!node || typeof node !== "object") return null;
    // Direct property
    if (node.properties && node.properties[seg]) {
      node = derefNode(node.properties[seg]);
      if (!node) return null;
      continue;
    }
    // If the node is a $ref, try to resolve and check properties there
    if (node.$ref) {
      const refNode = resolveRef(node.$ref);
      if (refNode) {
        node = derefNode(refNode);
        if (node.properties && node.properties[seg]) {
          node = derefNode(node.properties[seg]);
          if (!node) return null;
          continue;
        }
      }
    }
    // Look for a top-level $defs entry matching the segment
    if (schema.$defs && Object.prototype.hasOwnProperty.call(schema.$defs, seg)) {
      node = schema.$defs[seg];
      continue;
    }
    // Support explicit 'items' traversal
    if (seg === "items" && node.items) {
      node = node.items;
      continue;
    }
    return null;
  }
  return node;
}

function collectGraphQLTypeFieldsMap(sdl) {
  const ast = parse(sdl);
  const map = new Map();
  for (const def of ast.definitions) {
    if (def.kind === "ObjectTypeDefinition") {
      const name = def.name.value;
      const fields = new Set((def.fields || []).map(f => f.name.value));
      map.set(name, fields);
    }
  }
  return map;
}

/**
 * Check if a string is in camelCase format
 */
function isCamelCase(str) {
  // Must start with lowercase, can have uppercase letters but no underscores
  return /^[a-z][a-zA-Z0-9]*$/.test(str) && /[A-Z]/.test(str);
}

/**
 * Check if a string is in snake_case format
 */
function isSnakeCase(str) {
  // Must be all lowercase with optional underscores, no uppercase letters
  return /^[a-z][a-z0-9_]*$/.test(str) && /_/.test(str);
}

/**
 * Check if a string is in lowercase format (not camelCase or snake_case)
 */
function isLowercase(str) {
  return /^[a-z][a-z0-9]*$/.test(str);
}

/**
 * Validate naming conventions in JSON Schema (must be snake_case or lowercase, no camelCase)
 */
function validateJsonSchemaNaming(schema, path = "", violations = []) {
  if (!schema || typeof schema !== "object") return violations;
  
  if (schema.properties && typeof schema.properties === "object") {
    for (const key of Object.keys(schema.properties)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Check if property name is camelCase (violation)
      if (isCamelCase(key)) {
        violations.push({
          path: currentPath,
          field: key,
          issue: "camelCase",
          expected: "snake_case",
          suggestion: camelToSnake(key)
        });
      }
      
      // Recursively check nested properties
      validateJsonSchemaNaming(schema.properties[key], currentPath, violations);
    }
  }
  
  // Check $defs
  if (schema.$defs && typeof schema.$defs === "object") {
    for (const [key, value] of Object.entries(schema.$defs)) {
      validateJsonSchemaNaming(value, `$defs.${key}`, violations);
    }
  }
  
  // Check items (for arrays)
  if (schema.items) {
    validateJsonSchemaNaming(schema.items, `${path}.items`, violations);
  }
  
  // Check anyOf, oneOf, allOf
  if (schema.anyOf) schema.anyOf.forEach((s, i) => validateJsonSchemaNaming(s, `${path}.anyOf[${i}]`, violations));
  if (schema.oneOf) schema.oneOf.forEach((s, i) => validateJsonSchemaNaming(s, `${path}.oneOf[${i}]`, violations));
  if (schema.allOf) schema.allOf.forEach((s, i) => validateJsonSchemaNaming(s, `${path}.allOf[${i}]`, violations));
  
  return violations;
}

/**
 * Validate naming conventions in GraphQL SDL (must be camelCase for fields, no snake_case)
 */
function validateGraphQLNaming(sdl, violations = []) {
  const ast = parse(sdl);
  
  for (const def of ast.definitions) {
    if (def.kind === "ObjectTypeDefinition") {
      const typeName = def.name.value;
      
      for (const field of def.fields || []) {
        const fieldName = field.name.value;
        
        // Check if field name is snake_case (violation)
        if (isSnakeCase(fieldName)) {
          violations.push({
            type: typeName,
            field: fieldName,
            issue: "snake_case",
            expected: "camelCase",
            suggestion: snakeToCamel(fieldName)
          });
        }
        // Also check for all lowercase multi-word fields (should be camelCase)
        else if (isLowercase(fieldName) && fieldName.length > 15) {
          // Likely a multi-word field that should be camelCase
          violations.push({
            type: typeName,
            field: fieldName,
            issue: "lowercase (possibly should be camelCase)",
            expected: "camelCase",
            suggestion: `Consider: ${fieldName.replace(/([a-z])([a-z]{3,})/g, (m, p1, p2) => p1 + p2.charAt(0).toUpperCase() + p2.slice(1))}`
          });
        }
      }
    }
  }
  
  return violations;
}

/**
 * Helper to convert camelCase to snake_case
 */
function camelToSnake(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

/**
 * Helper to convert snake_case to camelCase
 */
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Programmatic API: Compare GraphQL SDL and JSON Schema for name-level parity.
 *
 * @param {string} sdl - GraphQL SDL string
 * @param {object} jsonSchema - Parsed JSON Schema object
 * @param {object} [options]
 * @param {boolean} [options.strict=false] - Enable strict mapping checks using a config
 * @param {object|string|null} [options.config=null] - Strict config object or path to JSON config
 * @param {string} [options.repoRoot=process.cwd()] - Repo root for resolving default config path
 * @param {boolean} [options.enforceNamingConventions=true] - Enforce naming conventions (JSON: snake_case, GraphQL: camelCase)
 * @param {string} [options.jsonSchemaPath=null] - Path to JSON Schema file for resolving external refs
 * @returns {{ missingInJson: string[], missingInGraphQL: string[], missingCritical: string[], strictIssues: string[], namingViolations: object, exitCode: number }}
 * @throws {Error} When strict mode is enabled and config is missing/invalid
 */
export function compareSchemas(sdl, jsonSchema, options = {}) {
  const { strict = false, config = null, repoRoot = process.cwd(), enforceNamingConventions = true, jsonSchemaPath = null } = options;

  // First, validate naming conventions
  let namingViolations = {
    jsonSchema: [],
    graphql: []
  };
  
  if (enforceNamingConventions) {
    namingViolations.jsonSchema = validateJsonSchemaNaming(jsonSchema);
    namingViolations.graphql = validateGraphQLNaming(sdl);
  }

  const gqlFields = collectGraphQLFieldNames(sdl);
  const jsonKeys = collectJsonSchemaKeys(jsonSchema, new Set(), jsonSchemaPath);

  // Helper to convert camelCase to snake_case for comparison
  function camelToSnakeLocal(str) {
    return str.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
  }

  // Create a map of snake_case versions of both sets for lenient comparison
  const gqlFieldsSnake = new Set(Array.from(gqlFields).map(f => camelToSnakeLocal(f)));
  const jsonKeysSnake = new Set(Array.from(jsonKeys).map(k => camelToSnakeLocal(k)));

  // Find fields that don't match even after case conversion
  const missingInJson = Array.from(gqlFields).filter(f => {
    const snake = camelToSnakeLocal(f);
    return !jsonKeys.has(f) && !jsonKeysSnake.has(snake);
  });
  
  const missingInGraphQL = Array.from(jsonKeys).filter(k => {
    const snake = camelToSnakeLocal(k);
    return !gqlFields.has(k) && !gqlFieldsSnake.has(snake);
  });

  // Critical checks (project-specific)
  const critical = ["piid", "vendor_info", "place_of_performance"];
  const missingCritical = critical.filter(c => {
    const snake = camelToSnakeLocal(c);
    return !jsonKeys.has(c) && !jsonKeysSnake.has(snake);
  });

  let strictIssues = [];
  let exitCode = 0;

  // Naming violations should always fail
  if (namingViolations.jsonSchema.length > 0 || namingViolations.graphql.length > 0) {
    exitCode = 1;
  }

  // In non-strict mode, only fail if there are critical fields missing or naming violations
  // In strict mode, fail on any mismatch
  if (strict && missingInJson.length) {
    exitCode = 1;
  }
  
  if (missingCritical.length) {
    exitCode = 1;
  }

  if (strict) {
    let cfg = null;
    if (config && typeof config === "object") {
      cfg = config;
    } else {
      const configPath =
        typeof config === "string"
          ? config
          : path.join(repoRoot, "scripts", "schema-sync.config.json");
      if (fs.existsSync(configPath)) {
        try {
          cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
        } catch (e) {
          throw new Error(`Failed to parse strict config: ${configPath} ${e.message}`);
        }
      } else {
        throw new Error(`Strict mode enabled but config not found: ${configPath}`);
      }
    }

    // Attempt to load a field-name mapping produced by the generators to translate
    // camelCase JSON pointers used in the strict config into the snake_case
    // property names present in the canonical JSON Schema. This keeps the
    // strict config readable (camelCase) while matching JSON Schema keys.
    let fieldNameMap = null;
    const mappingPath = path.join(repoRoot, "generated-schemas", "field-name-mapping.json");
    if (fs.existsSync(mappingPath)) {
      try {
        fieldNameMap = JSON.parse(fs.readFileSync(mappingPath, "utf8"));
      } catch (e) {
        // Non-fatal: we'll fallback to naive conversion if mapping can't be parsed
        fieldNameMap = null;
      }
    }

    function camelToSnakeFallback(s) {
      return s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
    }

    function mapJsonPointer(ptr) {
      if (!ptr || ptr === "/") return ptr;
      const parts = ptr.split("/").filter(Boolean);
      const mapped = parts.map(p => {
        // If mapping exists for the exact token, use it
        if (fieldNameMap && Object.prototype.hasOwnProperty.call(fieldNameMap, p)) {
          const entry = fieldNameMap[p];
          if (entry && typeof entry === "object" && entry.snake) return entry.snake;
        }
        // If token already looks snake_case, return as-is
        if (p.includes("_")) return p;
        // Fallback conversion
        return camelToSnakeFallback(p);
      });
      return "/" + mapped.join("/");
    }

    const typeFieldsMap = collectGraphQLTypeFieldsMap(sdl);
    const typesCfg = (cfg && cfg.types) || {};
    for (const [typeName, typeCfg] of Object.entries(typesCfg)) {
      const fieldsInSDL = typeFieldsMap.get(typeName) || new Set();
      const mapped = (typeCfg && typeCfg.fields) || {};
      for (const [fieldName, jsonPointer] of Object.entries(mapped)) {
        if (!fieldsInSDL.has(fieldName)) {
          strictIssues.push(`[${typeName}] GraphQL field missing: ${fieldName}`);
        }
        // Map the configured jsonPointer (often camelCase) into the canonical
        // JSON Schema path (snake_case) using the generated mapping where available.
        const mappedPointer = mapJsonPointer(jsonPointer);
        const target = getJsonSchemaAtPath(jsonSchema, mappedPointer) || getJsonSchemaAtPath(jsonSchema, jsonPointer);
        if (!target) {
          strictIssues.push(
            `[${typeName}] JSON Schema path missing: ${fieldName} -> ${jsonPointer} (tried ${mappedPointer})`
          );
        }
      }
    }
    if (strictIssues.length) {
      exitCode = Math.max(exitCode, 1);
    }
  }

  return {
    missingInJson,
    missingInGraphQL,
    missingCritical,
    strictIssues,
    namingViolations,
    exitCode,
  };
}

function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, "..");
  const graphqlSDLPath = path.join(repoRoot, "generated-schemas", "schema_unification.supergraph.graphql");
  const jsonSchemaPath = path.join(repoRoot, "src", "data", "schema_unification.schema.json");

  if (!fs.existsSync(graphqlSDLPath)) {
    console.error("❌ GraphQL supergraph not found. Run: pnpm run generate:schemas");
    process.exit(1);
  }
  
  if (!fs.existsSync(jsonSchemaPath)) {
    console.error("❌ JSON Schema not found at:", jsonSchemaPath);
    process.exit(1);
  }

  const sdl = readFile(graphqlSDLPath);
  const jsonSchema = JSON.parse(readFile(jsonSchemaPath));

  const strict = getArgFlag("--strict");
  const configPath = getArgValue(
    "--config",
    path.join(repoRoot, "scripts", "schema-sync.config.json")
  );

  let result;
  try {
    result = compareSchemas(sdl, jsonSchema, { strict, config: configPath, repoRoot, jsonSchemaPath });
  } catch (e) {
    console.error(`\n❌ ${e.message}`);
    process.exit(1);
  }

  if (result.missingInJson.length) {
    console.log("\n❌ GraphQL fields missing in JSON Schema:");
    result.missingInJson.sort().forEach(n => console.log("  -", n));
  } else {
    console.log("\n✅ All GraphQL fields are represented in the JSON Schema (by name).");
  }

  if (result.missingInGraphQL.length) {
    console.log("\nℹ️ JSON Schema properties with no GraphQL field (by name):");
    result.missingInGraphQL
      .sort()
      .slice(0, 50)
      .forEach(n => console.log("  -", n));
    if (result.missingInGraphQL.length > 50) {
      console.log(`  ...and ${result.missingInGraphQL.length - 50} more`);
    }
  } else {
    console.log("\n✅ All JSON Schema properties have a GraphQL field (by name).");
  }

  if (result.missingCritical.length) {
    console.log("\n💥 Critical JSON Schema properties missing:", result.missingCritical.join(", "));
  }

  // Report naming convention violations
  if (result.namingViolations.jsonSchema.length > 0) {
    console.log("\n❌ JSON Schema naming violations (camelCase found, should be snake_case):");
    result.namingViolations.jsonSchema.forEach(violation => {
      console.log(`  - Field '${violation.field}' at path '${violation.path}'`);
      console.log(`    → Should be: '${violation.suggestion}'`);
    });
    console.log("\n  Fix: Update the JSON Schema canonical source (src/data/schema_unification.schema.json)");
    console.log("       to use snake_case naming convention for all field names.");
  }

  if (result.namingViolations.graphql.length > 0) {
    console.log("\n❌ GraphQL SDL naming violations (snake_case found, should be camelCase):");
    result.namingViolations.graphql.forEach(violation => {
      console.log(`  - Field '${violation.field}' in type '${violation.type}'`);
      console.log(`    → Should be: '${violation.suggestion}'`);
    });
    console.log("\n  Fix: Update the GraphQL generation logic or source to use camelCase naming");
    console.log("       convention for all field names. Check scripts/generate-from-json-schema.mjs");
  }

  if (strict) {
    if (result.strictIssues.length) {
      console.log("\n❌ Strict sync issues:");
      result.strictIssues.forEach(i => console.log("  -", i));
    } else {
      console.log("\n✅ Strict sync check passed for configured types.");
    }
  }

  console.log("\nSchema sync check complete.");
  process.exit(result.exitCode);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
