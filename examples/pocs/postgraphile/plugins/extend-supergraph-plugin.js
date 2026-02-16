// PostGraphile plugin that extends the schema with the generated supergraph SDL.
// Uses `makeExtendSchemaPlugin` from `graphile-utils` if available.

module.exports = function makeExtendSupergraphPlugin() {
  const fs = require("fs");
  const path = "/srv/generated-schemas/supergraph/supergraph.graphql";
  let sdl = "";
  try {
    sdl = fs.readFileSync(path, "utf8");
    if (!sdl || sdl.trim() === "") {
      console.error(
        "[extend-supergraph-plugin] supergraph SDL is empty or missing at",
        path,
      );
    }
  } catch (e) {
    console.error(
      "[extend-supergraph-plugin] could not read supergraph SDL:",
      e.message,
    );
    // return a noop plugin to avoid breaking PostGraphile start
    return function noopPlugin() {
      return {};
    };
  }

  let makeExtendSchemaPlugin;
  try {
    makeExtendSchemaPlugin = require("graphile-utils").makeExtendSchemaPlugin;
  } catch (e) {
    console.error(
      "[extend-supergraph-plugin] graphile-utils not available in image; plugin will be a noop.",
    );
    return function noopPlugin() {
      return {};
    };
  }

  // Prefer using `graphql-tag` to produce a parsed document that
  // `makeExtendSchemaPlugin` accepts.
  let gql;
  try {
    gql = require("graphql-tag");
  } catch (e) {
    console.error(
      "[extend-supergraph-plugin] graphql-tag not available; plugin will be a noop.",
    );
    return function noopPlugin() {
      return {};
    };
  }

  const typeDefs = gql(String.raw`${sdl}`);

  // Helper: a small serializer to convert JS values into GraphQL literal syntax.
  function toGqlLiteral(v) {
    if (v === null || typeof v === "undefined") return "null";
    if (Array.isArray(v)) return "[" + v.map(toGqlLiteral).join(", ") + "]";
    if (typeof v === "object") {
      return (
        "{" +
        Object.keys(v)
          .map((k) => `${k}: ${toGqlLiteral(v[k])}`)
          .join(", ") +
        "}"
      );
    }
    if (typeof v === "string") return JSON.stringify(v);
    return String(v);
  }

  // Delegation helper: send a GraphQL POST to the local child PostGraphile instance.
  const fetchImpl =
    global.fetch ||
    (() => {
      try {
        return require("node-fetch");
      } catch (e) {
        return null;
      }
    })();

  async function delegateToChild(fieldName, args, info) {
    const { print } = require("graphql");
    // Print the incoming field AST (name, args, selection) and wrap it into a query.
    let printedField;
    try {
      printedField = print(info.fieldNodes[0]);
    } catch (e) {
      printedField = fieldName;
    }

    // If printedField contains variable references, replace arguments with runtime values.
    if (/\$/.test(printedField) && args && Object.keys(args).length) {
      const argList = Object.keys(args)
        .map((k) => `${k}: ${toGqlLiteral(args[k])}`)
        .join(", ");
      // replace first parentheses group if present, otherwise insert
      if (/\([^)]*\)/.test(printedField)) {
        printedField = printedField.replace(/\([^)]*\)/, `(${argList})`);
      } else {
        printedField = printedField.replace(/^([^{\s]+)/, `$1(${argList})`);
      }
    }

    const query = `query { ${printedField} }`;
    const url = "http://127.0.0.1:5001/graphql";

    const fetchFn = global.fetch || fetchImpl || require("node-fetch");
    if (!fetchFn) throw new Error("no fetch available to delegate to child");

    const res = await fetchFn(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const body = await res.json();
    if (body.errors) {
      // surface the first error as a JS Error so PostGraphile logs it in startup if necessary
      const e = body.errors[0];
      const err = new Error(e.message || "delegation error");
      err.extensions = e.extensions;
      throw err;
    }
    // return the field result (the top-level field key)
    return body.data ? body.data[fieldName] : null;
  }

  // Return the extend schema plugin that injects the SDL into the running schema
  // and provides minimal delegation resolvers for a few root fields.
  return makeExtendSchemaPlugin(() => ({
    typeDefs,
    resolvers: {
      Query: {
        solicitationById: async (_parent, args, _ctx, info) =>
          delegateToChild("solicitationById", args, info),
        solicitation: async (_parent, args, _ctx, info) =>
          delegateToChild("solicitation", args, info),
        allSolicitations: async (_parent, args, _ctx, info) =>
          delegateToChild("allSolicitations", args, info),
        requisitionById: async (_parent, args, _ctx, info) =>
          delegateToChild("requisitionById", args, info),
        requisition: async (_parent, args, _ctx, info) =>
          delegateToChild("requisition", args, info),
        allRequisitions: async (_parent, args, _ctx, info) =>
          delegateToChild("allRequisitions", args, info),
      },
    },
  }));
};
