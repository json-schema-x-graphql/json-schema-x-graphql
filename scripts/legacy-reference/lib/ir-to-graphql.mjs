import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLEnumType,
  GraphQLUnionType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLID,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLScalarType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  printSchema,
} from "graphql";

import { camelToSnake, snakeToCamel } from "../../scripts/helpers/case-conversion.mjs";

// Lightweight pointer resolver used by the IR->GraphQL emitter. It mirrors
// the behavior in generate-graphql-from-json-schema.mjs but is intentionally
// small and self-contained.
function getNodeByPath(root, loc) {
  if (!loc || !root || typeof root !== "object") return null;
  const parts = String(loc).split("/").filter(Boolean);
  let node = root;
  for (const p of parts) {
    if (!node || typeof node !== "object") return null;
    if (p === "$defs" || p === "definitions" || p === "properties") {
      node = node[p];
      continue;
    }
    if (node[p] !== undefined) {
      node = node[p];
      continue;
    }
    const alt = camelToSnake(p);
    if (node[alt] !== undefined) {
      node = node[alt];
      continue;
    }
    const alt2 = snakeToCamel(p);
    if (node[alt2] !== undefined) {
      node = node[alt2];
      continue;
    }
    return null;
  }
  return node;
}

function ensureArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

// Mapping-aware pointer resolver. Mirrors key behavior from the
// generate-graphql-from-json-schema script: try direct resolution,
// then prefer mapping.snake and mapping.locations to resolve remainder
function resolvePointer(schema, pointer, fieldMapping = {}) {
  if (!pointer || pointer === "/") return { node: schema, parent: null, key: null };
  const parts = String(pointer).split("/").filter(Boolean);
  let node = schema;
  let parent = null;
  let key = null;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    parent = node;
    key = part;

    // Dereference $ref early
    if (node && typeof node === "object" && node.$ref) {
      try {
        const ref = String(node.$ref);
        const refPointer = ref.startsWith("#") ? ref.slice(1) : ref;
        const refRes = resolvePointer(schema, refPointer, fieldMapping);
        if (refRes && refRes.node) node = refRes.node;
      } catch (err) {
        // ignore
      }
    }

    // If explicit container tokens
    if (part === "$defs" || part === "definitions" || part === "properties") {
      node = node?.$defs || node?.definitions || node?.properties || node;
      continue;
    }

    const candidates = [part, camelToSnake(part), snakeToCamel(part)];

    // mapping preference
    try {
      const mapping = fieldMapping && fieldMapping[part];
      if (mapping && mapping.snake && !candidates.includes(mapping.snake))
        candidates.push(mapping.snake);
      if (mapping && Array.isArray(mapping.locations) && mapping.locations.length) {
        const remaining = parts.slice(i + 1);
        for (const rawLoc of mapping.locations) {
          const loc = String(rawLoc).replace(/^#\//, "").replace(/^\//, "");
          if (remaining.length) {
            // Try multiple combined forms: direct remainder, under properties, or under $defs
            const candidates = [
              `${loc}/${remaining.join("/")}`,
              `${loc}/properties/${remaining.join("/")}`,
              `${loc}/$defs/${remaining.join("/")}`,
            ];
            for (const combined of candidates) {
              const mapped = getNodeByPath(schema, combined);
              if (mapped) {
                return { node: mapped, parent: null, key: null };
              }
            }
          }
          const mappedSelf = getNodeByPath(schema, loc);
          if (mappedSelf) return { node: mappedSelf, parent: null, key: null };
        }
      }
    } catch (err) {
      // ignore mapping failures
    }

    // Special-case items
    if (candidates.includes("items")) {
      if (node && typeof node === "object" && node.items !== undefined) {
        node = node.items;
        continue;
      }
      // try child containers
      if (node && typeof node === "object") {
        if (node.properties) {
          for (const v of Object.values(node.properties)) {
            if (v && typeof v === "object" && v.items !== undefined) {
              node = v.items;
              break;
            }
          }
        }
        if (node.items !== undefined) {
          continue;
        }
      }
      return { node: null, parent, key };
    }

    // Try to resolve candidate in $defs/definitions/properties
    let resolved = false;
    for (const cand of candidates) {
      if (node?.$defs && node.$defs[cand] !== undefined) {
        node = node.$defs[cand];
        resolved = true;
        break;
      }
      if (node?.definitions && node.definitions[cand] !== undefined) {
        node = node.definitions[cand];
        resolved = true;
        break;
      }
      if (node?.properties && node.properties[cand] !== undefined) {
        node = node.properties[cand];
        resolved = true;
        break;
      }
      if (Array.isArray(node) && /^\d+$/.test(cand)) {
        node = node[Number(cand)];
        resolved = true;
        break;
      }
    }

    if (resolved) continue;

    // fallback DFS
    const found = (function dfs(r, cands, seen = new Set(), depth = 0) {
      if (!r || typeof r !== "object" || seen.has(r) || depth > 1000) return null;
      seen.add(r);
      if (r.$defs) for (const k of Object.keys(r.$defs)) if (cands.includes(k)) return r.$defs[k];
      if (r.definitions)
        for (const k of Object.keys(r.definitions)) if (cands.includes(k)) return r.definitions[k];
      if (r.properties)
        for (const k of Object.keys(r.properties)) if (cands.includes(k)) return r.properties[k];
      if (r.items) {
        const res = dfs(r.items, cands, seen, depth + 1);
        if (res) return res;
      }
      for (const v of Object.values(r)) {
        if (v && typeof v === "object") {
          const res = dfs(v, cands, seen, depth + 1);
          if (res) return res;
        }
      }
      return null;
    })(schema, candidates);
    if (found) {
      node = found;
      continue;
    }

    return { node: null, parent, key };
  }
  return { node, parent, key };
}
function transformEnumValues(values, transform) {
  const seen = new Set();
  const out = {};
  for (const raw of ensureArray(values)) {
    const base = typeof transform === "function" ? transform(raw) : raw;
    const normalized = String(base)
      .replace(/[^A-Za-z0-9_]/g, "_")
      .replace(/^[^A-Za-z_]/, (m) => `_${m}`)
      .toUpperCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      out[normalized] = { value: raw };
    }
  }
  return out;
}

function parseTypeString(typeStr, lookup) {
  // Returns a GraphQLType using lookup(name) to get named types
  let s = String(typeStr).trim();
  let nonNull = false;
  if (s.endsWith("!")) {
    nonNull = true;
    s = s.slice(0, -1).trim();
  }
  let list = false;
  let innerNonNull = false;
  if (s.startsWith("[")) {
    const m = s.match(/^\[(.+)\](?:!)?$/);
    if (m) {
      list = true;
      let inner = m[1].trim();
      if (inner.endsWith("!")) {
        innerNonNull = true;
        inner = inner.slice(0, -1).trim();
      }
      let innerType = lookup(inner);
      if (!innerType) innerType = GraphQLString;
      if (innerNonNull) innerType = new GraphQLNonNull(innerType);
      let result = new GraphQLList(innerType);
      if (nonNull) result = new GraphQLNonNull(result);
      return result;
    }
  }
  // Named type
  let base = lookup(s) || GraphQLString;
  if (nonNull) base = new GraphQLNonNull(base);
  return base;
}

export function buildSchemaFromIR(
  schemaJson,
  enumConfigs,
  typeConfigs,
  unionConfigs,
  scalars = [],
  fieldMapping = {},
  warnings = [],
) {
  const typeMap = Object.create(null);

  // Create scalar placeholders
  const scalarMap = {
    ID: GraphQLID,
    String: GraphQLString,
    Int: GraphQLInt,
    Float: GraphQLFloat,
    Boolean: GraphQLBoolean,
  };
  for (const s of scalars || []) {
    if (!scalarMap[s]) {
      scalarMap[s] = new GraphQLScalarType({
        name: s,
        serialize: (v) => v,
        parseValue: (v) => v,
        parseLiteral: (ast) => null,
      });
    }
  }

  // Helper lookup for named types (enums, objects, scalars)
  const lookup = (name) => {
    if (!name) return null;
    if (scalarMap[name]) return scalarMap[name];
    if (typeMap[name]) return typeMap[name];
    return null;
  };

  // Build enums first
  for (const cfg of enumConfigs || []) {
    try {
      // Try to resolve the enum node using a mapping-aware resolver first
      let node = null;
      try {
        const res = resolvePointer(schemaJson, cfg.pointer, fieldMapping);
        node = res && res.node ? res.node : null;
      } catch (e) {
        // fall back
      }
      if (!node)
        node =
          getNodeByPath(schemaJson, cfg.pointer.replace(/^\//, "")) ||
          getNodeByPath(schemaJson, `$defs/${camelToSnake(cfg.name)}`);
      // If node is a $ref wrapper, follow it to the target definition
      try {
        if (node && typeof node === "object" && node.$ref) {
          const ref = String(node.$ref);
          const refPointer = ref.startsWith("#") ? ref.slice(1) : ref;
          const refRes = resolvePointer(schemaJson, refPointer, fieldMapping);
          if (refRes && refRes.node) node = refRes.node;
        }
      } catch (e) {
        // ignore deref failures and proceed
      }
      let enumVals = ensureArray(node?.enum);
      // If the node uses x-graphql-enum shape, extract values from its values map
      if (
        !enumVals.length &&
        node &&
        typeof node === "object" &&
        node["x-graphql-enum"] &&
        node["x-graphql-enum"].values
      ) {
        try {
          const valsObj = node["x-graphql-enum"].values;
          const vals = [];
          for (const v of Object.values(valsObj)) {
            if (v && typeof v === "object" && v.name) vals.push(v.name);
            else if (typeof v === "string") vals.push(v);
          }
          if (vals.length) enumVals = vals;
        } catch (e) {
          // ignore
        }
      }
      // If still not found, try scanning fieldMapping entries for candidate locations
      if (!enumVals.length && fieldMapping && typeof fieldMapping === "object") {
        const targetSnake = camelToSnake(cfg.name);
        const tried = new Set();
        for (const [gName, mapping] of Object.entries(fieldMapping)) {
          if (!mapping) continue;
          try {
            // If mapping.snake matches the enum name, try its locations first
            if (mapping.snake === targetSnake || gName === cfg.name) {
              for (const rawLoc of mapping.locations || []) {
                const loc = String(rawLoc).replace(/^#\//, "").replace(/^\//, "");
                if (tried.has(loc)) continue;
                tried.add(loc);
                // Try the location itself
                const mapped = getNodeByPath(schemaJson, loc);
                if (mapped) {
                  // follow $ref if present on the mapped node
                  try {
                    if (mapped && typeof mapped === "object" && mapped.$ref) {
                      const r = String(mapped.$ref);
                      const rp = r.startsWith("#") ? r.slice(1) : r;
                      const rr = resolvePointer(schemaJson, rp, fieldMapping);
                      if (rr && rr.node) {
                        node = rr.node;
                        break;
                      }
                    }
                  } catch (e) {
                    // ignore
                  }
                  if (mapped.enum) {
                    node = mapped;
                    break;
                  }
                }
                // Try to find any descendant enum under mapped node
                if (mapped && typeof mapped === "object") {
                  // If mapped node has x-graphql-enum, use its values
                  if (mapped["x-graphql-enum"] && mapped["x-graphql-enum"].values) {
                    const vobj = mapped["x-graphql-enum"].values;
                    const vals = Object.values(vobj).map((x) => (x && x.name ? x.name : String(x)));
                    if (vals.length) {
                      node = { enum: vals };
                      break;
                    }
                  }
                  const descendant = (function findEnumInNode(n, seen = new Set()) {
                    if (!n || typeof n !== "object" || seen.has(n)) return null;
                    seen.add(n);
                    if (n.enum && ensureArray(n.enum).length) return n;
                    if (n.$defs)
                      for (const v of Object.values(n.$defs)) {
                        const r = findEnumInNode(v, seen);
                        if (r) return r;
                      }
                    if (n.definitions)
                      for (const v of Object.values(n.definitions)) {
                        const r = findEnumInNode(v, seen);
                        if (r) return r;
                      }
                    if (n.properties)
                      for (const v of Object.values(n.properties)) {
                        const r = findEnumInNode(v, seen);
                        if (r) return r;
                      }
                    if (n.items) {
                      const r = findEnumInNode(n.items, seen);
                      if (r) return r;
                    }
                    return null;
                  })(mapped);
                  if (descendant) {
                    node = descendant;
                    break;
                  }
                }
              }
            }
            if (node) break;
          } catch (e) {
            // ignore mapping scan errors
          }
        }
      }

      enumVals = ensureArray(node?.enum);
      if (!enumVals.length) {
        try {
          const parts = String(cfg.pointer || "")
            .split("/")
            .filter(Boolean);
          const mapInfo = {};
          for (const p of parts) {
            if (fieldMapping && fieldMapping[p]) mapInfo[p] = fieldMapping[p].locations || [];
          }
          process.stderr.write(
            `enum-skip-diagnostics: name=${cfg.name} pointer=${cfg.pointer} mapInfo=${JSON.stringify(mapInfo)} nodeKeys=${node && typeof node === "object" ? Object.keys(node).slice(0, 10) : String(node)}\n`,
          );
        } catch (e) {
          // ignore diag failures
        }
        warnings.push(`Enum '${cfg.name}' skipped: no values found at pointer ${cfg.pointer}`);
        continue;
      }
      const values = transformEnumValues(enumVals, cfg.valueTransform);
      typeMap[cfg.name] = new GraphQLEnumType({
        name: cfg.name,
        values,
        description: cfg.description || node?.description || null,
      });
    } catch (err) {
      warnings.push(`Enum '${cfg.name}' error: ${String(err)}`);
    }
  }

  // Precreate object type shells so fields can reference each other lazily
  for (const tcfg of typeConfigs || []) {
    try {
      if (!tcfg || !tcfg.name) {
        warnings.push(`Skipping invalid type config: ${JSON.stringify(tcfg)}`);
        continue;
      }
      // Capture tcfg in closure so each fields thunk can access its config
      // If the config represents an interface, create an Interface type
      if (tcfg.kind === "interface") {
        typeMap[tcfg.name] = new GraphQLInterfaceType({
          name: tcfg.name,
          description: tcfg.description || null,
          fields: () => {
            const out = {};
            for (const f of tcfg.fields || []) {
              try {
                if (!f || !f.name) {
                  warnings.push(
                    `Skipping invalid interface field in '${tcfg.name}': ${JSON.stringify(f)}`,
                  );
                  continue;
                }
                out[f.name] = {
                  type: parseTypeString(f.graphqlType, lookup),
                  description: f.description || null,
                };
              } catch (err) {
                warnings.push(
                  `Interface field '${f && f.name}' in '${tcfg.name}' error: ${String(err)}`,
                );
              }
            }
            return out;
          },
          resolveType: () => null,
        });
        continue;
      }

      // If the config represents an input object, create an InputObject type
      if (tcfg.kind === "input") {
        typeMap[tcfg.name] = new GraphQLInputObjectType({
          name: tcfg.name,
          description: tcfg.description || null,
          fields: () => {
            const out = {};
            for (const f of tcfg.fields || []) {
              try {
                if (!f || !f.name) {
                  warnings.push(
                    `Skipping invalid input field in '${tcfg.name}': ${JSON.stringify(f)}`,
                  );
                  continue;
                }
                // Input fields use the same graphqlType strings but should map to input types; best-effort
                out[f.name] = {
                  type: parseTypeString(f.graphqlType, lookup),
                  description: f.description || null,
                };
              } catch (err) {
                warnings.push(
                  `Input field '${f && f.name}' in '${tcfg.name}' error: ${String(err)}`,
                );
              }
            }
            return out;
          },
        });
        continue;
      }

      typeMap[tcfg.name] = new GraphQLObjectType({
        name: tcfg.name,
        description: tcfg.description || null,
        interfaces: () => (tcfg.interfaces || []).map((n) => lookup(n)).filter(Boolean),
        fields: () => {
          const out = {};
          for (const f of tcfg.fields || []) {
            try {
              if (!f || !f.name) {
                warnings.push(
                  `Skipping invalid field in type '${tcfg.name}': ${JSON.stringify(f)}`,
                );
                continue;
              }
              const fieldDef = {
                type: parseTypeString(f.graphqlType, lookup),
                description: f.description || null,
              };
              if (f.deprecationReason) fieldDef.deprecationReason = f.deprecationReason;
              out[f.name] = fieldDef;
            } catch (err) {
              warnings.push(`Field '${f && f.name}' in type '${tcfg.name}' error: ${String(err)}`);
            }
          }
          return out;
        },
      });
    } catch (err) {
      // If constructing the GraphQLObjectType fails, record and continue
      try {
        warnings.push(
          `Failed to create GraphQLObjectType for '${tcfg && tcfg.name}': ${err && err.stack ? err.stack : String(err)}`,
        );
      } catch (e) {
        // ignore
      }
      continue;
    }
  }

  // Create unions
  for (const ucfg of unionConfigs || []) {
    try {
      const members = (ucfg.members || []).map((m) => typeMap[m] || null).filter(Boolean);
      typeMap[ucfg.name] = new GraphQLUnionType({
        name: ucfg.name,
        types: members,
        resolveType: () => null,
        description: ucfg.description || null,
      });
    } catch (err) {
      warnings.push(`Union '${ucfg.name}' error: ${String(err)}`);
    }
  }

  // (Fields are provided lazily via the GraphQLObjectType fields thunk above.)

  // Create a Query root that exposes Contract (if exists) or first type
  const rootTypeName =
    (typeConfigs && typeConfigs.find((t) => t.name === "Contract") && "Contract") ||
    (typeConfigs && typeConfigs[0] && typeConfigs[0].name) ||
    null;
  let queryType = null;
  if (rootTypeName && typeMap[rootTypeName]) {
    queryType = new GraphQLObjectType({
      name: "Query",
      fields: { root: { type: typeMap[rootTypeName] } },
    });
  } else {
    queryType = new GraphQLObjectType({
      name: "Query",
      fields: { _dummy: { type: GraphQLString } },
    });
  }

  const schema = new GraphQLSchema({ query: queryType, types: Object.values(typeMap) });
  const printed = printSchema(schema);
  return { schema, printed, warnings };
}

export default { buildSchemaFromIR };
