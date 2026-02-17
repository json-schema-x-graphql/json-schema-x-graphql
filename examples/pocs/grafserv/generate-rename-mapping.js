#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const { parse } = require("graphql");

const POSTGRAPHILE_URL =
  process.env.POSTGRAPHILE_URL || "http://127.0.0.1:5001/graphql";
const OUT_FILE = path.resolve(__dirname, "rename-mapping.json");

function snakeToCamel(s) {
  return s.replace(/_([a-z])/g, (_m, p1) => p1.toUpperCase());
}

async function introspectType(typeName) {
  const q = `query { __type(name: \"${typeName}\") { fields { name } } }`;
  const res = await fetch(POSTGRAPHILE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: q }),
  });
  const j = await res.json();
  const arr =
    j && j.data && j.data.__type && j.data.__type.fields
      ? j.data.__type.fields.map((f) => f.name)
      : [];
  return new Set(arr);
}

async function main() {
  const sdlPath = path.resolve(
    __dirname,
    "../../../generated-schemas/composition-theguild/supergraph.graphql",
  );
  if (!fs.existsSync(sdlPath)) {
    console.error("Supergraph SDL not found at", sdlPath);
    process.exit(2);
  }
  const sdl = fs.readFileSync(sdlPath, "utf8");
  const ast = parse(sdl, { noLocation: true });
  const types = {};
  for (const def of ast.definitions || []) {
    if (def.kind === "ObjectTypeDefinition" && def.name && def.name.value) {
      const tname = def.name.value;
      types[tname] = (def.fields || []).map(
        (f) => (f.name && f.name.value) || "",
      );
    }
  }

  const mapping = {};
  for (const [tname, fields] of Object.entries(types)) {
    try {
      const remoteFields = await introspectType(tname);
      mapping[tname] = {};
      for (const sf of fields) {
        const camel = snakeToCamel(sf);
        if (remoteFields.has(camel)) {
          mapping[tname][camel] = sf;
        }
      }
      if (Object.keys(mapping[tname]).length === 0) delete mapping[tname];
    } catch (e) {
      console.warn(
        "Could not introspect type",
        tname,
        e && e.message ? e.message : e,
      );
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(mapping, null, 2) + "\n", "utf8");
  console.log("Wrote rename mapping to", OUT_FILE);
  console.log("Mapping summary:");
  for (const k of Object.keys(mapping))
    console.log(" ", k, Object.keys(mapping[k]).length, "fields");
}

main().catch((e) => {
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
});
