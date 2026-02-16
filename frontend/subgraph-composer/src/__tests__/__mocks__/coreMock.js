export function jsonSchemaToGraphQL(schema, options = {}) {
  const title = schema?.title || "Root";
  const props = schema?.properties ? Object.keys(schema.properties) : [];
  const fields = props.map((p) => `  ${p}: String`).join("\n");
  return `type ${title} {\n${fields}\n}`;
}

export default { jsonSchemaToGraphQL };
