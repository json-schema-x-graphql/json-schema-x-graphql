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
export declare function parsePagination(schema: any): PaginationConfig;
/** Generate the PageInfo type SDL. */
export declare function generatePageInfoSdl(existingSdl: string): string | null;
/** Generate Relay Connection and Edge types for a pagination config. */
export declare function generatePaginationTypesSdl(config: PaginationConfig, existingSdl: string): string;
/** Append pagination types to existing SDL. */
export declare function injectPaginationTypes(sdl: string, config: PaginationConfig): string;
