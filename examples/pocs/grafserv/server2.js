const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { print, visit, Kind } = require('graphql');

const PORT = process.env.PORT || 4002;
const POSTGRAPHILE_URL = process.env.POSTGRAPHILE_URL || 'http://127.0.0.1:5001/graphql';

// Load generated supergraph SDL
const sdlPath = path.resolve(__dirname, '../../../generated-schemas/supergraph/supergraph.graphql');
let typeDefs = '';
try { typeDefs = fs.readFileSync(sdlPath, 'utf8'); } catch (e) { console.error('could not read SDL', e.message); process.exit(1); }

function snakeToCamel(s) { return s.replace(/_([a-z])/g, (_m, p1) => p1.toUpperCase()); }

function transformDocumentForChild(document) {
  return visit(document, {
    Field(node) {
      if (node.name && node.name.value && node.name.value.startsWith('__')) return undefined;
      const name = node.name && node.name.value; if (!name) return undefined;
      const childName = snakeToCamel(name); if (childName === name) return undefined;
      const alias = node.alias ? node.alias : { kind: Kind.NAME, value: name };
      return Object.assign({}, node, { name: { kind: Kind.NAME, value: childName }, alias });
    }
  });
}

const app = express();

// introspect child types so we avoid requesting fields PostGraphile doesn't expose
const childTypeFields = {};
async function introspectChild(typeName) {
  const q = `query { __type(name: \"${typeName}\") { fields { name } } }`;
  const res = await fetch(POSTGRAPHILE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) });
  const json = await res.json();
  if (json && json.data && json.data.__type && json.data.__type.fields) {
    childTypeFields[typeName] = new Set(json.data.__type.fields.map(f => f.name));
  } else {
    childTypeFields[typeName] = new Set();
  }
  console.log('[grafserv2] child fields for', typeName, Array.from(childTypeFields[typeName]));
}

function filterSelectionForChild(selectionSet, typeName) {
  if (!selectionSet || !selectionSet.selections) return selectionSet;
  const allowed = childTypeFields[typeName] || new Set();
  const selections = selectionSet.selections.filter(sel => {
    if (!sel || sel.kind !== 'Field') return false;
    const name = sel.name && sel.name.value;
    if (!name) return false;
    const childName = snakeToCamel(name);
    return allowed.has(childName) || name === 'id';
  }).map(sel => {
    if (sel.selectionSet) {
      return Object.assign({}, sel, { selectionSet: filterSelectionForChild(sel.selectionSet, typeName) });
    }
    return sel;
  });
  // ensure at least one field is requested (nodes must select subfields)
  if (selections.length === 0) {
    selections.push({ kind: 'Field', name: { kind: Kind.NAME, value: 'id' } });
  }
  return { kind: 'SelectionSet', selections };
}

const resolvers = {
  Query: {
    solicitations: async (_p, args, _c, info) => {
      const first = args && typeof args.limit === 'number' ? args.limit : 50;
      const parentField = info.fieldNodes && info.fieldNodes[0];
      let nodesSelection = parentField && parentField.selectionSet ? parentField.selectionSet : null;
      // trim selection to fields the child actually exposes
      nodesSelection = filterSelectionForChild(nodesSelection, 'Solicitation');
      const op = {
        kind: 'Document', definitions: [{ kind: 'OperationDefinition', operation: 'query', selectionSet: { kind: 'SelectionSet', selections: [{ kind: 'Field', name: { kind: Kind.NAME, value: 'allSolicitations' }, arguments: [{ kind: 'Argument', name: { kind: Kind.NAME, value: 'first' }, value: { kind: 'IntValue', value: String(first) } }], selectionSet: { kind: 'SelectionSet', selections: [{ kind: 'Field', name: { kind: Kind.NAME, value: 'nodes' }, selectionSet: nodesSelection ? nodesSelection : { kind: 'SelectionSet', selections: [] } }] } }] } }]
      };
      const transformed = transformDocumentForChild(op);
      const query = print(transformed);
      const res = await fetch(POSTGRAPHILE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
      const json = await res.json(); if (json.errors) throw new Error(json.errors.map(e => e.message).join('\n'));
      const nodes = json && json.data && json.data.allSolicitations && json.data.allSolicitations.nodes ? json.data.allSolicitations.nodes : [];
      return nodes.map(n => { const out = { id: n.id || null }; Object.keys(n).forEach(k => { if (k !== 'id') out[k] = n[k] === undefined ? null : n[k]; }); return out; });
    },
    requisitions: async (_p, args, _c, info) => {
      const first = args && typeof args.limit === 'number' ? args.limit : 50;
      const parentField = info.fieldNodes && info.fieldNodes[0];
      let nodesSelection = parentField && parentField.selectionSet ? parentField.selectionSet : null;
      nodesSelection = filterSelectionForChild(nodesSelection, 'Requisition');
      const op = {
        kind: 'Document', definitions: [{ kind: 'OperationDefinition', operation: 'query', selectionSet: { kind: 'SelectionSet', selections: [{ kind: 'Field', name: { kind: Kind.NAME, value: 'allRequisitions' }, arguments: [{ kind: 'Argument', name: { kind: Kind.NAME, value: 'first' }, value: { kind: 'IntValue', value: String(first) } }], selectionSet: { kind: 'SelectionSet', selections: [{ kind: 'Field', name: { kind: Kind.NAME, value: 'nodes' }, selectionSet: nodesSelection ? nodesSelection : { kind: 'SelectionSet', selections: [] } }] } }] } }]
      };
      const transformed = transformDocumentForChild(op);
      const query = print(transformed);
      const res = await fetch(POSTGRAPHILE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
      const json = await res.json(); if (json.errors) throw new Error(json.errors.map(e => e.message).join('\n'));
      const nodes = json && json.data && json.data.allRequisitions && json.data.allRequisitions.nodes ? json.data.allRequisitions.nodes : [];
      return nodes.map(n => { const out = { id: n.id || null }; Object.keys(n).forEach(k => { if (k !== 'id') out[k] = n[k] === undefined ? null : n[k]; }); return out; });
    }
  }
};

async function init() {
  await introspectChild('Solicitation');
  await introspectChild('Requisition');
  const schema = makeExecutableSchema({ typeDefs, resolvers });
  app.use('/graphql', graphqlHTTP({ schema, graphiql: true }));
  app.get('/', (req, res) => res.redirect('/graphql'));
  app.listen(PORT, () => console.log(`[grafserv2] listening on http://localhost:${PORT}/graphql (delegates to ${POSTGRAPHILE_URL})`));
}

init().catch(e => { console.error('[grafserv2] init failed', e); process.exit(1); });
