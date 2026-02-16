const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { print, visit, Kind } = require("graphql");

const PORT = process.env.PORT || 4001;
const POSTGRAPHILE_URL =
  process.env.POSTGRAPHILE_URL || "http://127.0.0.1:5001/graphql";

// Load generated supergraph SDL (relative to repo root)
// grafserv lives at dev/pocs/grafserv so jump up three levels to repo root
const sdlPath = path.resolve(
  __dirname,
  "../../../generated-schemas/supergraph/supergraph.graphql",
);
let typeDefs = "";
try {
  typeDefs = fs.readFileSync(sdlPath, "utf8");
} catch (e) {
  console.error(
    "[grafserv] could not read supergraph SDL at",
    sdlPath,
    e.message,
  );
  process.exit(1);
}

function snakeToCamel(s) {
  return s.replace(/_([a-z])/g, (_m, p1) => p1.toUpperCase());
}

function transformDocumentForChild(document) {
  return visit(document, {
    Field(node) {
      if (node.name && node.name.value && node.name.value.startsWith("__"))
        return undefined;
      const name = node.name && node.name.value;
      if (!name) return undefined;
      const childName = snakeToCamel(name);
      if (childName === name) return undefined;
      const alias = node.alias ? node.alias : { kind: Kind.NAME, value: name };
      return Object.assign({}, node, {
        name: { kind: Kind.NAME, value: childName },
        alias,
      });
    },
  });
}

const app = express();

async function init() {
  // resolvers delegate selected root fields to the remote PostGraphile endpoint by
  // building an operation AST, transforming snake_case -> camelCase (aliasing to snake_case),
  // and POSTing the resulting query to PostGraphile.
  const resolvers = {
    Query: {
      solicitations: async (_parent, args, _context, info) => {
        const first = args && typeof args.limit === "number" ? args.limit : 50;
        const parentField = info.fieldNodes && info.fieldNodes[0];
        const nodesSelection =
          parentField && parentField.selectionSet
            ? parentField.selectionSet
            : null;
        const op = {
          kind: "Document",
          definitions: [
            {
              kind: "OperationDefinition",
              operation: "query",
              selectionSet: {
                kind: "SelectionSet",
                selections: [
                  {
                    kind: "Field",
                    name: { kind: Kind.NAME, value: "allSolicitations" },
                    arguments: [
                      {
                        kind: "Argument",
                        name: { kind: Kind.NAME, value: "first" },
                        value: { kind: "IntValue", value: String(first) },
                      },
                    ],
                    selectionSet: {
                      kind: "SelectionSet",
                      selections: [
                        {
                          kind: "Field",
                          name: { kind: Kind.NAME, value: "nodes" },
                          selectionSet: nodesSelection
                            ? nodesSelection
                            : { kind: "SelectionSet", selections: [] },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        };
        const transformed = transformDocumentForChild(op);
        const query = print(transformed);
        const res = await fetch(POSTGRAPHILE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const json = await res.json();
        if (json.errors)
          throw new Error(json.errors.map((e) => e.message).join("\n"));
        const nodes =
          json &&
          json.data &&
          json.data.allSolicitations &&
          json.data.allSolicitations.nodes
            ? json.data.allSolicitations.nodes
            : [];
        return nodes.map((n) => {
          const out = { id: n.id || null };
          Object.keys(n).forEach((k) => {
            if (k !== "id") out[k] = n[k] === undefined ? null : n[k];
          });
          return out;
        });
      },
      requisitions: async (_parent, args, _context, info) => {
        const first = args && typeof args.limit === "number" ? args.limit : 50;
        const parentField = info.fieldNodes && info.fieldNodes[0];
        const nodesSelection =
          parentField && parentField.selectionSet
            ? parentField.selectionSet
            : null;
        const op = {
          kind: "Document",
          definitions: [
            {
              kind: "OperationDefinition",
              operation: "query",
              selectionSet: {
                kind: "SelectionSet",
                selections: [
                  {
                    kind: "Field",
                    name: { kind: Kind.NAME, value: "allRequisitions" },
                    arguments: [
                      {
                        kind: "Argument",
                        name: { kind: Kind.NAME, value: "first" },
                        value: { kind: "IntValue", value: String(first) },
                      },
                    ],
                    selectionSet: {
                      kind: "SelectionSet",
                      selections: [
                        {
                          kind: "Field",
                          name: { kind: Kind.NAME, value: "nodes" },
                          selectionSet: nodesSelection
                            ? nodesSelection
                            : { kind: "SelectionSet", selections: [] },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        };
        const transformed = transformDocumentForChild(op);
        const query = print(transformed);
        const res = await fetch(POSTGRAPHILE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const json = await res.json();
        if (json.errors)
          throw new Error(json.errors.map((e) => e.message).join("\n"));
        const nodes =
          json &&
          json.data &&
          json.data.allRequisitions &&
          json.data.allRequisitions.nodes
            ? json.data.allRequisitions.nodes
            : [];
        return nodes.map((n) => {
          const out = { id: n.id || null };
          Object.keys(n).forEach((k) => {
            if (k !== "id") out[k] = n[k] === undefined ? null : n[k];
          });
          return out;
        });
      },
    },
  };

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  app.use("/graphql", graphqlHTTP({ schema, graphiql: true }));
  app.get("/", (req, res) => res.redirect("/graphql"));

  app.listen(PORT, () =>
    console.log(
      `[grafserv] spike listening on http://localhost:${PORT}/graphql (delegates to ${POSTGRAPHILE_URL})`,
    ),
  );
}

init().catch((e) => {
  console.error("[grafserv] initialization failed", e);
  process.exit(1);
});

const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { print, visit, Kind } = require("graphql");

const PORT = process.env.PORT || 4001;
const POSTGRAPHILE_URL =
  process.env.POSTGRAPHILE_URL || "http://127.0.0.1:5001/graphql";

// Load generated supergraph SDL (relative to repo root)
// grafserv lives at dev/pocs/grafserv so jump up three levels to repo root
const sdlPath = path.resolve(
  __dirname,
  "../../../generated-schemas/supergraph/supergraph.graphql",
);
let typeDefs = "";
try {
  typeDefs = fs.readFileSync(sdlPath, "utf8");
} catch (e) {
  console.error(
    "[grafserv] could not read supergraph SDL at",
    sdlPath,
    e.message,
  );
  process.exit(1);
}

function snakeToCamel(s) {
  return s.replace(/_([a-z])/g, (_m, p1) => p1.toUpperCase());
}

function transformDocumentForChild(document) {
  return visit(document, {
    Field(node) {
      if (node.name && node.name.value && node.name.value.startsWith("__"))
        return undefined;
      const name = node.name && node.name.value;
      if (!name) return undefined;
      const childName = snakeToCamel(name);
      if (childName === name) return undefined;
      const alias = node.alias ? node.alias : { kind: Kind.NAME, value: name };
      return Object.assign({}, node, {
        name: { kind: Kind.NAME, value: childName },
        alias,
      });
    },
  });
}

const app = express();

async function init() {
  // resolvers delegate selected root fields to the remote PostGraphile endpoint by
  // building an operation AST, transforming snake_case -> camelCase (aliasing to snake_case),
  // and POSTing the resulting query to PostGraphile.
  const resolvers = {
    Query: {
      solicitations: async (_parent, args, _context, info) => {
        const first = args && typeof args.limit === "number" ? args.limit : 50;
        const parentField = info.fieldNodes && info.fieldNodes[0];
        const nodesSelection =
          parentField && parentField.selectionSet
            ? parentField.selectionSet
            : null;
        const op = {
          kind: "Document",
          definitions: [
            {
              kind: "OperationDefinition",
              operation: "query",
              selectionSet: {
                kind: "SelectionSet",
                selections: [
                  {
                    kind: "Field",
                    name: { kind: Kind.NAME, value: "allSolicitations" },
                    arguments: [
                      {
                        kind: "Argument",
                        name: { kind: Kind.NAME, value: "first" },
                        value: { kind: "IntValue", value: String(first) },
                      },
                    ],
                    selectionSet: {
                      kind: "SelectionSet",
                      selections: [
                        {
                          kind: "Field",
                          name: { kind: Kind.NAME, value: "nodes" },
                          selectionSet: nodesSelection
                            ? nodesSelection
                            : { kind: "SelectionSet", selections: [] },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        };
        const transformed = transformDocumentForChild(op);
        const query = print(transformed);
        const res = await fetch(POSTGRAPHILE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const json = await res.json();
        if (json.errors)
          throw new Error(json.errors.map((e) => e.message).join("\n"));
        const nodes =
          json &&
          json.data &&
          json.data.allSolicitations &&
          json.data.allSolicitations.nodes
            ? json.data.allSolicitations.nodes
            : [];
        return nodes.map((n) => {
          const out = { id: n.id || null };
          Object.keys(n).forEach((k) => {
            if (k !== "id") out[k] = n[k] === undefined ? null : n[k];
          });
          return out;
        });
      },
      requisitions: async (_parent, args, _context, info) => {
        const first = args && typeof args.limit === "number" ? args.limit : 50;
        const parentField = info.fieldNodes && info.fieldNodes[0];
        const nodesSelection =
          parentField && parentField.selectionSet
            ? parentField.selectionSet
            : null;
        const op = {
          kind: "Document",
          definitions: [
            {
              kind: "OperationDefinition",
              operation: "query",
              selectionSet: {
                kind: "SelectionSet",
                selections: [
                  {
                    kind: "Field",
                    name: { kind: Kind.NAME, value: "allRequisitions" },
                    arguments: [
                      {
                        kind: "Argument",
                        name: { kind: Kind.NAME, value: "first" },
                        value: { kind: "IntValue", value: String(first) },
                      },
                    ],
                    selectionSet: {
                      kind: "SelectionSet",
                      selections: [
                        {
                          kind: "Field",
                          name: { kind: Kind.NAME, value: "nodes" },
                          selectionSet: nodesSelection
                            ? nodesSelection
                            : { kind: "SelectionSet", selections: [] },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        };
        const transformed = transformDocumentForChild(op);
        const query = print(transformed);
        const res = await fetch(POSTGRAPHILE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const json = await res.json();
        if (json.errors)
          throw new Error(json.errors.map((e) => e.message).join("\n"));
        const nodes =
          json &&
          json.data &&
          json.data.allRequisitions &&
          json.data.allRequisitions.nodes
            ? json.data.allRequisitions.nodes
            : [];
        return nodes.map((n) => {
          const out = { id: n.id || null };
          Object.keys(n).forEach((k) => {
            if (k !== "id") out[k] = n[k] === undefined ? null : n[k];
          });
          return out;
        });
      },
    },
  };

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  app.use("/graphql", graphqlHTTP({ schema, graphiql: true }));
  app.get("/", (req, res) => res.redirect("/graphql"));

  app.listen(PORT, () =>
    console.log(
      `[grafserv] spike listening on http://localhost:${PORT}/graphql (delegates to ${POSTGRAPHILE_URL})`,
    ),
  );
}

init().catch((e) => {
  console.error("[grafserv] initialization failed", e);
  process.exit(1);
});
const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const fs = require("fs");
const path = require("path");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const fetch = require("node-fetch");

const PORT = process.env.PORT || 4001;
const POSTGRAPHILE_URL =
  process.env.POSTGRAPHILE_URL || "http://127.0.0.1:5001/graphql";

// Load generated supergraph SDL (relative to repo root)
// grafserv lives at dev/pocs/grafserv so jump up three levels to repo root
const sdlPath = path.resolve(
  __dirname,
  "../../../generated-schemas/supergraph/supergraph.graphql",
);
let typeDefs = "";
try {
  typeDefs = fs.readFileSync(sdlPath, "utf8");
} catch (e) {
  console.error(
    "[grafserv] could not read supergraph SDL at",
    sdlPath,
    e.message,
  );
  process.exit(1);
}

// Minimal delegation helpers: build small queries and proxy to PostGraphile.
async function proxyQuery(query, variables) {
  console.log(
    "[grafserv] proxying query to PostGraphile:",
    query,
    variables || {},
  );
  const res = await fetch(POSTGRAPHILE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors)
    throw new Error(body.errors.map((e) => e.message).join("\n"));
  return body.data;
}

const resolvers = {
  Query: {
    // supergraph uses `solicitations(limit: Int)` returning [Solicitation!]!
    solicitations: async (_parent, args, _context, info) => {
      const limit =
        args && typeof args.limit === "number" ? Number(args.limit) : 50;
      // Build an aliased selection set from the incoming selection so the child resolves camelCase
      // fields but returns snake_case keys expected by the supergraph SDL.
      function snakeToCamel(s) {
        return s.replace(/_([a-z])/g, (_m, p1) => p1.toUpperCase());
      }
      function buildSelection(selectionSet) {
        return selectionSet.selections
          .map((sel) => {
            if (sel.kind !== "Field") return "";
            const name = sel.name.value;
            const childName = snakeToCamel(name);
            if (sel.selectionSet) {
              return `${name}: ${childName} { ${buildSelection(sel.selectionSet)} }`;
            }
            return `${name}: ${childName}`;
          })
          .join(" ");
      }
      const parentField = info.fieldNodes && info.fieldNodes[0];
      // collect requested field names so we can fill missing fields with nulls after delegation
      const requestedFields = [];
      function buildSelectionWithCollect(selectionSet, typeName) {
        return selectionSet.selections
          .map((sel) => {
            if (sel.kind !== "Field") return "";
            const name = sel.name.value;
            requestedFields.push(name);
            const childName = snakeToCamel(name);
            // only include the aliased child field if the child actually exposes it
            if (
              childTypeFields[typeName] &&
              !childTypeFields[typeName].has(childName)
            ) {
              return "";
            }
            if (sel.selectionSet) {
              return `${name}: ${childName} { ${buildSelectionWithCollect(sel.selectionSet, typeName)} }`;
            }
            return `${name}: ${childName}`;
          })
          .filter(Boolean)
          .join(" ");
      }
      const selection =
        parentField && parentField.selectionSet
          ? buildSelectionWithCollect(parentField.selectionSet, "Solicitation")
          : "";
      const q = `query($first:Int){ allSolicitations(first:$first){ nodes { ${selection} } } }`;
      const data = await proxyQuery(q, { first: limit });
      const nodes =
        data && data.allSolicitations ? data.allSolicitations.nodes : [];
      // Aliasing ensures the child returns snake_case keys for included fields.
      return nodes.map((n) => {
        const out = { id: n.id || null };
        // copy whatever the child returned
        Object.keys(n).forEach((k) => {
          if (k !== "id") out[k] = n[k] === undefined ? null : n[k];
        });
        // ensure requested fields exist, set to null if missing
        requestedFields.forEach((f) => {
          if (out[f] === undefined) out[f] = null;
        });
        return out;
      });
    },
    // supergraph uses `requisitions(limit: Int)` returning [Requisition!]!
    requisitions: async (_parent, args, _context, info) => {
      const limit =
        args && typeof args.limit === "number" ? Number(args.limit) : 50;
      function snakeToCamel(s) {
        return s.replace(/_([a-z])/g, (_m, p1) => p1.toUpperCase());
      }
      function buildSelection(selectionSet) {
        return selectionSet.selections
          .map((sel) => {
            if (sel.kind !== "Field") return "";
            const name = sel.name.value;
            const childName = snakeToCamel(name);
            if (sel.selectionSet) {
              return `${name}: ${childName} { ${buildSelection(sel.selectionSet)} }`;
            }
            return `${name}: ${childName}`;
          })
          .join(" ");
      }
      const parentField = info.fieldNodes && info.fieldNodes[0];
      const requestedFields = [];
      function buildSelectionWithCollect(selectionSet, typeName) {
        return selectionSet.selections
          .map((sel) => {
            if (sel.kind !== "Field") return "";
            const name = sel.name.value;
            requestedFields.push(name);
            const childName = snakeToCamel(name);
            if (
              childTypeFields[typeName] &&
              !childTypeFields[typeName].has(childName)
            ) {
              return "";
            }
            if (sel.selectionSet) {
              return `${name}: ${childName} { ${buildSelectionWithCollect(sel.selectionSet, typeName)} }`;
            }
            return `${name}: ${childName}`;
          })
          .filter(Boolean)
          .join(" ");
      }
      const selection =
        parentField && parentField.selectionSet
          ? buildSelectionWithCollect(parentField.selectionSet, "Requisition")
          : "";
      const q = `query($first:Int){ allRequisitions(first:$first){ nodes { ${selection} } } }`;
      const data = await proxyQuery(q, { first: limit });
      const nodes =
        data && data.allRequisitions ? data.allRequisitions.nodes : [];
      return nodes.map((n) => {
        const out = { id: n.id || null };
        Object.keys(n).forEach((k) => {
          if (k !== "id") out[k] = n[k] === undefined ? null : n[k];
        });
        requestedFields.forEach((f) => {
          if (out[f] === undefined) out[f] = null;
        });
        return out;
      });
    },
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

const app = express();
app.use("/graphql", graphqlHTTP({ schema, graphiql: true }));
app.get("/", (req, res) => res.redirect("/graphql"));

// cache of child type -> set of field names (as exposed by PostGraphile)
const childTypeFields = {};
async function introspectChildTypes() {
  const types = ["Solicitation", "Requisition"];
  for (const t of types) {
    try {
      const q = `query { __type(name: \"${t}\") { fields { name } } }`;
      const data = await proxyQuery(q);
      const arr =
        data && data.__type && data.__type.fields
          ? data.__type.fields.map((f) => f.name)
          : [];
      childTypeFields[t] = new Set(arr);
      console.log(
        "[grafserv] introspected child fields for",
        t,
        Array.from(childTypeFields[t]),
      );
    } catch (e) {
      console.warn("[grafserv] could not introspect child type", t, e.message);
      childTypeFields[t] = new Set();
    }
  }
}

(async function init() {
  await introspectChildTypes();
  app.listen(PORT, () =>
    console.log(
      `[grafserv] spike listening on http://localhost:${PORT}/graphql (delegates to ${POSTGRAPHILE_URL})`,
    ),
  );
})();
