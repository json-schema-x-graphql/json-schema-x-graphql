/*
  server.delegate.js

  Attempt to provide a delegateToSchema-based implementation that delegates
  root fields to the PostGraphile child. This file will try to load
  `delegateToSchema` and transform utilities from `@graphql-tools/*`. If the
  dependencies are not available, it falls back to the existing
  `server.wrap.js` approach (which uses a direct HTTP executor).

  This is intended as a safer migration path: run `npm install` in
  `dev/pocs/grafserv` to make the delegate-based implementation active.
*/

const path = require('path');
const fs = require('fs');
const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const fetch = require('node-fetch');
const { print, Kind } = require('graphql');

const PORT = process.env.PORT || 4001;
const POSTGRAPHILE_URL = process.env.POSTGRAPHILE_URL || 'http://127.0.0.1:5001/graphql';

// If delegate libs are available, use them. Otherwise fall back.
let canDelegate = true;
let delegateToSchema, introspectSchema, wrapSchema, RenameObjectFields;
try {
  delegateToSchema = require('@graphql-tools/delegate').delegateToSchema;
  introspectSchema = require('@graphql-tools/wrap').introspectSchema;
  wrapSchema = require('@graphql-tools/wrap').wrapSchema;
  // Rename transforms may be in different packages depending on versions; try best-effort
  RenameObjectFields = require('@graphql-tools/wrap').RenameObjectFields || null;
} catch (e) {
  canDelegate = false;
}

// Simple HTTP executor used when delegating via wrapped schema
const executor = async ({ document, variables }) => {
  const q = typeof document === 'string' ? document : print(document);
  const res = await fetch(POSTGRAPHILE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, variables }),
  });
  const json = await res.json();
  if (json.errors) return { errors: json.errors };
  return { data: json.data };
};

async function runFallback() {
  // Use the already-checked-in wrap server if present
  const fallback = path.resolve(__dirname, 'server.wrap.js');
  if (fs.existsSync(fallback)) {
    console.log('[grafserv.delegate] delegate libs unavailable — running fallback server.wrap.js');
    require(fallback);
    return;
  }
  console.error('[grafserv.delegate] no fallback server.wrap.js found. Please install @graphql-tools/delegate and wrap or add server.wrap.js');
  process.exit(1);
}

async function init() {
  if (!canDelegate) {
    return runFallback();
  }

  let remoteSchema = null;
  try {
    // Introspect the remote PostGraphile schema
    remoteSchema = await introspectSchema(executor);

    // Parse our supergraph SDL to build snake_case -> child camelCase mapping
    const sdlPath = path.resolve(__dirname, '../../../generated-schemas/supergraph/supergraph.graphql');
    let sdlText = '';
    try {
      sdlText = fs.readFileSync(sdlPath, 'utf8');
    } catch (e) {
      console.warn('[grafserv.delegate] could not read supergraph SDL, continuing without rename mapping');
      sdlText = '';
    }

    const supergraphFieldsByType = new Map();
    if (sdlText) {
      const { parse, visit, Kind } = require('graphql');
      try {
        const ast = parse(sdlText, { noLocation: true });
        visit(ast, {
          ObjectTypeDefinition(node) {
            const tname = node.name && node.name.value;
            if (!tname) return;
            const fields = (node.fields || []).map(f => (f.name && f.name.value) || '');
            supergraphFieldsByType.set(tname, new Set(fields));
          }
        });
      } catch (e) {
        console.warn('[grafserv.delegate] failed to parse supergraph SDL for mapping:', e && e.message ? e.message : e);
      }
    }

    // Build RenameObjectFields transform mapping: remote (camelCase) -> supergraph (snake_case)
    const transforms = [];
    if (RenameObjectFields) {
      // Build a function that renames fields on remote types to snake_case when appropriate
      const snakeToCamel = s => s.replace(/_([a-z])/g, (_m, p1) => p1.toUpperCase());
      const renameFn = (typeName, fieldName) => {
        // If we have a supergraph type with snake_case fields, check if the remote exposes camelCase of any
        const superFields = supergraphFieldsByType.get(typeName);
        if (!superFields) return fieldName; // no mapping known
        // If remote field is already one of the supergraph fields, keep it
        if (superFields.has(fieldName)) return fieldName;
        // Try to find a snake_case equivalent that maps to this camelCase
        // e.g., remote 'solicitationNumber' -> supergraph 'solicitation_number'
        for (const sf of superFields) {
          if (snakeToCamel(sf) === fieldName) return sf;
        }
        return fieldName;
      };

      try {
        transforms.push(new RenameObjectFields(renameFn));
        console.log('[grafserv.delegate] rename transform configured using supergraph SDL');
      } catch (e) {
        console.warn('[grafserv.delegate] could not create RenameObjectFields transform:', e && e.message ? e.message : e);
      }
    }

    // Wrap the remote schema applying transforms (if any)
    remoteSchema = wrapSchema({ schema: remoteSchema, executor, transforms });
    console.log('[grafserv.delegate] remote schema initialised for delegation');
  } catch (e) {
    console.warn('[grafserv.delegate] introspection failed, falling back to wrap server', e && e.message ? e.message : e);
    return runFallback();
  }

  // Build a minimal executable schema that delegates selected root fields.
  // We will prefer delegating via delegateToSchema, but if mapping transforms
  // are not available we'll delegate and then remap response object keys
  // from the child's camelCase to the supergraph snake_case using a
  // generated mapping file `rename-mapping.json`.
  const { makeExecutableSchema } = require('@graphql-tools/schema');
  const sdlPath = path.resolve(__dirname, '../../../generated-schemas/composition-theguild/supergraph.graphql');
  let typeDefs = '';
  try { typeDefs = fs.readFileSync(sdlPath, 'utf8'); } catch (e) { console.error('Could not read supergraph SDL', e.message); process.exit(1); }

  // Try to load an explicit mapping file created by generate-rename-mapping.js
  const mappingFile = path.resolve(__dirname, 'rename-mapping.json');
  let renameMapping = {};
  if (fs.existsSync(mappingFile)) {
    try { renameMapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8')); console.log('[grafserv.delegate] loaded rename mapping', Object.keys(renameMapping).length, 'types'); } catch (e) { console.warn('[grafserv.delegate] failed to parse mapping file', e && e.message ? e.message : e); }
  } else {
    console.log('[grafserv.delegate] rename mapping file not found; responses may need remapping');
  }

  function remapObjectFields(typeName, obj) {
    const { getNamedType, isScalarType, isObjectType, isListType, isNonNullType } = require('graphql');
    if (obj === null || obj === undefined) return obj;
    // Scalars
    if (typeof obj !== 'object') return obj;

    const mapForType = renameMapping[typeName] || {};
    const out = Array.isArray(obj) ? [] : {};

    // Attempt to get the remote type definition for recursion
    const remoteType = remoteSchema && remoteSchema.getType ? remoteSchema.getType(typeName) : null;
    const remoteFields = remoteType && remoteType.getFields ? remoteType.getFields() : {};

    const entries = Array.isArray(obj) ? obj.entries ? Array.from(obj.entries()) : obj.map((v,i)=>[i,v]) : Object.entries(obj || {});
    for (const [k, v] of entries) {
      // For arrays handled above; when mapping array elements, callers will pass element type
      const childKey = String(k);
      const mappedKey = mapForType[childKey] || childKey;

      // Determine field type from remoteFields (use childKey since remote schema uses camelCase)
      const fieldDef = remoteFields && remoteFields[childKey] ? remoteFields[childKey] : null;
      let namedTypeName = null;
      let isList = false;
      if (fieldDef && fieldDef.type) {
        let t = fieldDef.type;
        // unwrap NonNull/List wrappers
        while (t && (t.ofType)) {
          if (t.kind === 'ListType' || (t.constructor && t.constructor.name === 'GraphQLList')) isList = true;
          t = t.ofType;
        }
        try {
          const named = getNamedType(fieldDef.type);
          namedTypeName = named && named.name ? named.name : null;
        } catch (e) {
          namedTypeName = null;
        }
      }

      if (v === null || v === undefined) {
        if (Array.isArray(out)) out.push(v); else out[mappedKey] = v;
        continue;
      }

      // If value is array and we have element type, recurse per element
      if (Array.isArray(v)) {
        if (namedTypeName) {
          const arr = v.map(item => remapObjectFields(namedTypeName, item));
          if (Array.isArray(out)) out.push(arr); else out[mappedKey] = arr;
        } else {
          if (Array.isArray(out)) out.push(v); else out[mappedKey] = v;
        }
        continue;
      }

      // If it's an object and we know the nested type -> recurse
      if (typeof v === 'object' && namedTypeName) {
        const nested = remapObjectFields(namedTypeName, v);
        if (Array.isArray(out)) out.push(nested); else out[mappedKey] = nested;
        continue;
      }

      // Scalar or unknown type -> copy as-is
      if (Array.isArray(out)) out.push(v); else out[mappedKey] = v;
    }

    return out;
  }

  const resolvers = {
    Query: {
      solicitations: async (_parent, args, context, info) => {
        const limit = args && typeof args.limit === 'number' ? Number(args.limit) : 50;
        try {
          const res = await delegateToSchema({
            schema: remoteSchema,
            operation: 'query',
            fieldName: 'allSolicitations',
            args: { first: limit },
            context,
            info,
          });
          // delegateToSchema may return the raw child shape; map nodes
          const nodes = res && res.nodes ? res.nodes : (res && res.allSolicitations && res.allSolicitations.nodes ? res.allSolicitations.nodes : []);
          return (nodes || []).map(n => remapObjectFields('Solicitation', n));
        } catch (e) {
          console.warn('[grafserv.delegate] delegateToSchema failed, falling back to HTTP executor', e && e.message ? e.message : e);
          const q = `{ allSolicitations(first:${limit}) { nodes { id } } }`;
          const r = await executor({ document: q, variables: {} });
          const nodes = r.data && r.data.allSolicitations && r.data.allSolicitations.nodes ? r.data.allSolicitations.nodes : [];
          return nodes.map(n => remapObjectFields('Solicitation', n));
        }
      },
      requisitions: async (_parent, args, context, info) => {
        const limit = args && typeof args.limit === 'number' ? Number(args.limit) : 50;
        try {
          const res = await delegateToSchema({
            schema: remoteSchema,
            operation: 'query',
            fieldName: 'allRequisitions',
            args: { first: limit },
            context,
            info,
          });
          const nodes = res && res.nodes ? res.nodes : (res && res.allRequisitions && res.allRequisitions.nodes ? res.allRequisitions.nodes : []);
          return (nodes || []).map(n => remapObjectFields('Requisition', n));
        } catch (e) {
          console.warn('[grafserv.delegate] delegateToSchema failed, falling back to HTTP executor', e && e.message ? e.message : e);
          const q = `{ allRequisitions(first:${limit}) { nodes { id } } }`;
          const r = await executor({ document: q, variables: {} });
          const nodes = r.data && r.data.allRequisitions && r.data.allRequisitions.nodes ? r.data.allRequisitions.nodes : [];
          return nodes.map(n => remapObjectFields('Requisition', n));
        }
      },
    },
  };

  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const app = express();
  app.use('/graphql', graphqlHTTP({ schema, graphiql: true }));
  app.get('/', (req, res) => res.redirect('/graphql'));
  app.listen(PORT, () => console.log(`[grafserv.delegate] listening on http://localhost:${PORT}/graphql (delegates to ${POSTGRAPHILE_URL})`));
}

init().catch(e => {
  console.error('[grafserv.delegate] initialization failed', e);
  process.exit(1);
});
