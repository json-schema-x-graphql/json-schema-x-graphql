/**
 * Relay-style pagination type generation from x-graphql-pagination extension.
 *
 * Mirrors the Rust implementation in `converters/rust/src/hints/pagination.rs`.
 */

export interface PaginationTypeConfig {
  typeName: string;
  connectionName: string;
  edgeName: string;
}

export interface PaginationConfig {
  enabled: boolean;
  types: PaginationTypeConfig[];
}

/** Parse `x-graphql-pagination` from the schema root. */
export function parsePagination(schema: any): PaginationConfig {
  const obj = schema as Record<string, unknown> | undefined;
  if (!obj || typeof obj !== "object") {
    return { enabled: false, types: [] };
  }

  const pagination = (obj as Record<string, unknown>)["x-graphql-pagination"];
  if (!pagination || typeof pagination !== "object") {
    return { enabled: false, types: [] };
  }

  const enabled = (pagination as Record<string, unknown>).enabled === true;
  if (!enabled) {
    return { enabled: false, types: [] };
  }

  const typesObj = (pagination as Record<string, unknown>).types as
    Record<string, unknown> | undefined;
  if (!typesObj) {
    return { enabled: true, types: [] };
  }

  const types: PaginationTypeConfig[] = Object.entries(typesObj).map(
    ([typeName, config]) => {
      const cfg = config as Record<string, unknown>;
      const connectionName =
        (cfg.connection as string | undefined) ??
        `${pascalCase(typeName)}Connection`;
      const edgeName =
        (cfg.edge as string | undefined) ?? `${pascalCase(typeName)}Edge`;
      return {
        typeName: pascalCase(typeName),
        connectionName,
        edgeName,
      };
    },
  );

  return { enabled: true, types };
}

function pascalCase(s: string): string {
  return s
    .split(/[^a-zA-Z0-9]/)
    .filter((w) => w.length > 0)
    .map((w) => {
      if (w.length === 0) return "";
      return w[0].toUpperCase() + w.substring(1).toLowerCase();
    })
    .join("");
}

/** Generate the PageInfo type SDL. */
export function generatePageInfoSdl(existingSdl: string): string | null {
  if (existingSdl.includes("type PageInfo")) {
    return null;
  }
  return `"""
Information about pagination in a connection.
"""
type PageInfo {
  """When paginating forwards, are there more items?"""
  hasNextPage: Boolean!
  """When paginating backwards, are there more items?"""
  hasPreviousPage: Boolean!
  """When paginating backwards, the cursor to continue."""
  startCursor: String
  """When paginating forwards, the cursor to continue."""
  endCursor: String
}`;
}

/** Generate Relay Connection and Edge types for a pagination config. */
export function generatePaginationTypesSdl(
  config: PaginationConfig,
  existingSdl: string,
): string {
  if (!config.enabled || config.types.length === 0) {
    return "";
  }

  const blocks: string[] = [];

  const pageInfo = generatePageInfoSdl(existingSdl);
  if (pageInfo) blocks.push(pageInfo);

  for (const typeConfig of config.types) {
    if (
      existingSdl.includes(`type ${typeConfig.connectionName}`) &&
      existingSdl.includes(`type ${typeConfig.edgeName}`)
    ) {
      continue;
    }

    // Edge type
    if (!existingSdl.includes(`type ${typeConfig.edgeName}`)) {
      blocks.push(`
"""
Edge linking a cursor to a ${typeConfig.typeName} node.
"""
type ${typeConfig.edgeName} {
  cursor: String!
  node: ${typeConfig.typeName}!
}`);
    }

    // Connection type
    if (!existingSdl.includes(`type ${typeConfig.connectionName}`)) {
      blocks.push(`
"""
Paginated list of ${typeConfig.typeName} items.
"""
type ${typeConfig.connectionName} {
  edges: [${typeConfig.edgeName}!]!
  pageInfo: PageInfo!
  totalCount: Int
}`);
    }
  }

  if (blocks.length === 0) return "";
  blocks.push("");
  return blocks.join("\n");
}

/** Append pagination types to existing SDL. */
export function injectPaginationTypes(
  sdl: string,
  config: PaginationConfig,
): string {
  const paginationSdl = generatePaginationTypesSdl(config, sdl);
  if (!paginationSdl) return sdl;
  return `${sdl.trimEnd()}\n${paginationSdl}`;
}
