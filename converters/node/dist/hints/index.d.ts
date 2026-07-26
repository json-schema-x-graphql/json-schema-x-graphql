/**
 * GraphQL hints post-processing module.
 *
 * Applies x-graphql-* extension data that cannot be expressed during
 * the core conversion pass. Mirrors the Rust implementation in
 * `converters/rust/src/hints/mod.rs`.
 */
import { parseCustomScalars, injectCustomScalars, buildScalarFieldMap, applyScalarFieldReplacements, generateScalarsSdl, ScalarConfig } from "./scalars.js";
import { parseOperations, injectOperations, OperationsConfig } from "./operations.js";
import { parsePagination, injectPaginationTypes, PaginationConfig } from "./pagination.js";
export { parseCustomScalars, injectCustomScalars, generateScalarsSdl, buildScalarFieldMap, applyScalarFieldReplacements, };
export type { ScalarConfig };
import type { OperationField, OperationArgument } from "./operations.js";
import type { PaginationTypeConfig } from "./pagination.js";
export { parseOperations, injectOperations, type OperationsConfig, OperationField, OperationArgument, };
export { parsePagination, injectPaginationTypes, type PaginationConfig, PaginationTypeConfig, };
export interface HintData {
    scalars: ScalarConfig[];
    operations: OperationsConfig;
    pagination: PaginationConfig;
    scalarFieldMap: Map<string, string>;
}
/** Parse all hint extensions from the schema. */
export declare function parseHints(schema: any): HintData;
/**
 * Apply all hint post-processing steps to SDL.
 *
 * Order matters:
 * 1. Inject custom scalar declarations (must come first)
 * 2. Apply field-level scalar replacements
 * 3. Inject operation types
 * 4. Inject pagination types
 */
export declare function applyHints(sdl: string, schema: any): string;
