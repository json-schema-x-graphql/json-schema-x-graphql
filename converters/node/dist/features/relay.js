export function ensurePageInfo(context) {
    if (context.generatedTypes.has("PageInfo"))
        return;
    context.output.push(`
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}`);
    context.generatedTypes.add("PageInfo");
}
export function ensureConnectionType(typeName, context) {
    const edgeName = `${typeName}Edge`;
    const connectionName = `${typeName}Connection`;
    if (context.generatedTypes.has(connectionName))
        return;
    ensurePageInfo(context);
    if (!context.generatedTypes.has(edgeName)) {
        context.output.push(`
type ${edgeName} {
  cursor: String!
  node: ${typeName}
}`);
        context.generatedTypes.add(edgeName);
    }
    context.output.push(`
type ${connectionName} {
  edges: [${edgeName}]
  pageInfo: PageInfo!
  totalCount: Int
}`);
    context.generatedTypes.add(connectionName);
}
//# sourceMappingURL=relay.js.map