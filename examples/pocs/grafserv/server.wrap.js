const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { wrapSchema, introspectSchema } = require('@graphql-tools/wrap');
const { print, visit, Kind, parse } = require('graphql');

const PORT = process.env.PORT || 4001;
const POSTGRAPHILE_URL = process.env.POSTGRAPHILE_URL || 'http://127.0.0.1:5001/graphql';

// Load generated supergraph SDL
const sdlPath = path.resolve(__dirname, '../../../generated-schemas/supergraph/supergraph.graphql');
let typeDefs = '';
try {
  typeDefs = fs.readFileSync(sdlPath, 'utf8');
} catch (e) {
  console.error('[grafserv] could not read supergraph SDL at', sdlPath, e.message);
  process.exit(1);
}

function snakeToCamel(s) {
  return s.replace(/_([a-z])/g, (_m, p1) => p1.toUpperCase());
}

function transformDocumentForChild(document) {
  return visit(document, {
    Field(node) {
      if (node.name && node.name.value && node.name.value.startsWith('__')) return undefined;
      const name = node.name && node.name.value;
      if (!name) return undefined;
      const childName = snakeToCamel(name);
      if (childName === name) return undefined;
      const alias = node.alias ? node.alias : { kind: Kind.NAME, value: name };
      return Object.assign({}, node, { name: { kind: Kind.NAME, value: childName }, alias });
    }
  });
}

// executor uses the remote PostGraphile HTTP endpoint
const executor = async ({ document, variables }) => {
  const query = typeof document === 'string' ? document : print(document);
  const res = await fetch(POSTGRAPHILE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) return { errors: json.errors };
  return { data: json.data };
};

// remoteSchema created from introspection via executor
let remoteSchema = null;
async function initRemoteSchema() {
  try {
    const introspected = await introspectSchema(executor);
    remoteSchema = wrapSchema({ schema: introspected, executor });
    console.log('[grafserv] remote schema initialised via wrapSchema');
  } catch (e) {
    console.warn('[grafserv] could not introspect remote schema', e && e.message ? e.message : e);
    remoteSchema = null;
  }
}

// cache of child type -> set of field names (as exposed by PostGraphile)
const childTypeFields = {};
function populateChildTypeFields() {
  if (!remoteSchema) return;
  const types = ['Solicitation', 'Requisition'];
  for (const t of types) {
    try {
      const typeObj = remoteSchema.getType ? remoteSchema.getType(t) : null;
      const fields = typeObj && typeObj.getFields ? Object.keys(typeObj.getFields()) : [];
      childTypeFields[t] = new Set(fields);
      console.log('[grafserv] child fields for', t, fields);
    } catch (e) {
      childTypeFields[t] = new Set();
      console.warn('[grafserv] could not list fields for', t, e && e.message ? e.message : e);
    }
  }
}

const app = express();

async function init() {
  await initRemoteSchema();
  populateChildTypeFields();

  const resolvers = {
    Query: {
      solicitations: async (_parent, args, _context, info) => {
        const first = args && typeof args.limit === 'number' ? args.limit : 50;
        const parentField = info.fieldNodes && info.fieldNodes[0];
        const nodesSelection = parentField && parentField.selectionSet ? parentField.selectionSet : null;
        const op = {
          kind: 'Document',
          definitions: [
            {
              kind: 'OperationDefinition',
              operation: 'query',
              selectionSet: {
                kind: 'SelectionSet',
                selections: [
                  {
                    kind: 'Field',
                    name: { kind: Kind.NAME, value: 'allSolicitations' },
                    arguments: [
                      { kind: 'Argument', name: { kind: Kind.NAME, value: 'first' }, value: { kind: 'IntValue', value: String(first) } }
                    ],
                    selectionSet: {
                      kind: 'SelectionSet',
                      selections: [
                        {
                          kind: 'Field',
                          name: { kind: Kind.NAME, value: 'nodes' },
                          selectionSet: nodesSelection ? nodesSelection : { kind: 'SelectionSet', selections: [] }
                        }
                      ]
                    }
                  }
                ]
              }
            }
          ]
        };
        const transformed = transformDocumentForChild(op);
        const res = await executor({ document: transformed, variables: {} });
        if (res.errors) throw new Error(res.errors.map(e => e.message).join('\n'));
        const nodes = res && res.data && res.data.allSolicitations && res.data.allSolicitations.nodes ? res.data.allSolicitations.nodes : [];
        return nodes.map(n => {
          const out = { id: n.id || null };
          Object.keys(n).forEach(k => { if (k !== 'id') out[k] = n[k] === undefined ? null : n[k]; });
          return out;
        });
      },
      requisitions: async (_parent, args, _context, info) => {
        const first = args && typeof args.limit === 'number' ? args.limit : 50;
        const parentField = info.fieldNodes && info.fieldNodes[0];
        const nodesSelection = parentField && parentField.selectionSet ? parentField.selectionSet : null;
        const op = {
          kind: 'Document',
          definitions: [
            {
              kind: 'OperationDefinition',
              operation: 'query',
              selectionSet: {
                kind: 'SelectionSet',
                selections: [
                  {
                    kind: 'Field',
                    name: { kind: Kind.NAME, value: 'allRequisitions' },
                    arguments: [
                      { kind: 'Argument', name: { kind: Kind.NAME, value: 'first' }, value: { kind: 'IntValue', value: String(first) } }
                    ],
                    selectionSet: {
                      kind: 'SelectionSet',
                      selections: [
                        {
                          kind: 'Field',
                          name: { kind: Kind.NAME, value: 'nodes' },
                          selectionSet: nodesSelection ? nodesSelection : { kind: 'SelectionSet', selections: [] }
                        }
                      ]
                    }
                  }
                ]
              }
            }
          ]
        };
        const transformed = transformDocumentForChild(op);
        const res = await executor({ document: transformed, variables: {} });
        if (res.errors) throw new Error(res.errors.map(e => e.message).join('\n'));
        const nodes = res && res.data && res.data.allRequisitions && res.data.allRequisitions.nodes ? res.data.allRequisitions.nodes : [];
        return nodes.map(n => {
          const out = { id: n.id || null };
          Object.keys(n).forEach(k => { if (k !== 'id') out[k] = n[k] === undefined ? null : n[k]; });
          return out;
        });
      },
    },
  };

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  app.use('/graphql', graphqlHTTP({ schema, graphiql: true }));
  app.get('/', (req, res) => res.redirect('/graphql'));

  app.listen(PORT, () => console.log(`[grafserv] wrap-schema spike listening on http://localhost:${PORT}/graphql (delegates to ${POSTGRAPHILE_URL})`));
}

init().catch(e => {
  console.error('[grafserv] initialization failed', e);
  process.exit(1);
});
