export function jsonSchemaToGraphQL(schema, _options = {}) {
  let title = schema?.["x-graphql-type-name"] || schema?.title || "Root";
  // Clean up title to be a valid GraphQL identifier
  title = title.replace(/[^a-zA-Z0-9_]/g, "");
  if (!/^[a-zA-Z_]/.test(title)) {
    title = "_" + title;
  }
  const props = schema?.properties ? Object.keys(schema.properties) : [];
  const fields = props.map((p) => `  ${p}: String`).join("\n");
  return `type ${title} {\n${fields}\n}`;
}

export default { jsonSchemaToGraphQL };
