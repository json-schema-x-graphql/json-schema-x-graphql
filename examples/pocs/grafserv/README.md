Grafserv spike (Express + graphql-tools)

This directory contains a small spike that:

- Loads the generated supergraph SDL from `generated-schemas/supergraph/supergraph.graphql`.
- Exposes a GraphQL endpoint at `http://localhost:4001/graphql`.
- Delegates a small set of root fields (`solicitationById`, `allSolicitations`, `requisitionById`, `allRequisitions`) to a PostGraphile instance running at `http://127.0.0.1:5001/graphql` by default.

Quick start:

```bash
# from repo root
cd dev/pocs/grafserv
npm install
# ensure your PostGraphile child is running at http://127.0.0.1:5001/graphql
npm start
```

Notes:
- This is a lightweight spike using `express` + `@graphql-tools/schema` rather than the Grafast/Grafserv runtime; it's intended to show the runtime shape and a simple delegation approach. If you'd like, I can replace this with a `@grafast/grafserv`-based server next.

Updated: wrap-schema server
---------------------------

This directory now includes `server.wrap.js`, a variant that uses `@graphql-tools/wrap` to introspect the remote PostGraphile schema and an HTTP executor for delegation. The original `server.js` (AST-based delegator) remains as a reference.

Environment variables:

- `POSTGRAPHILE_URL` — URL of the PostGraphile child (default: `http://127.0.0.1:5001/graphql`)
- `PORT` — port to listen on (default: `4001`)

Run the wrap-based server (default `npm start` runs `server.wrap.js`):

```bash
cd dev/pocs/grafserv
npm install
npm start
```

Smoke test (selection-preserving delegation):

```bash
# Retrieve first solicitation's id and solicitation_number/title
curl -s -X POST http://localhost:4001/graphql \
	-H 'Content-Type: application/json' \
	-d '{"query":"{ solicitations(limit:1){ id solicitation_number title } }"}' | jq
```

Notes and next steps:
- If the PostGraphile endpoint is not available at startup, the wrap server will still run but will skip introspection; delegation will still use the HTTP executor for requests.
- I have not installed dependencies in CI or the grafserv directory inside this workspace (to avoid colliding with the running Next dev server). If you want, I can stop the dev server and finish `npm install` + smoke tests.
- Future improvement: replace manual AST aliasing with `delegateToSchema` and `RenameObjectFields` transforms from `@graphql-tools/*` once dependencies are installed and validated.
