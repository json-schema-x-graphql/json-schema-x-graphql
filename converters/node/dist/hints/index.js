/**
 * GraphQL hints post-processing module.
 *
 * Applies x-graphql-* extension data that cannot be expressed during
 * the core conversion pass. Mirrors the Rust implementation in
 * `converters/rust/src/hints/mod.rs`.
 */
import { parseCustomScalars, injectCustomScalars, buildScalarFieldMap, applyScalarFieldReplacements, generateScalarsSdl, } from "./scalars.js";
import { parseOperations, injectOperations, } from "./operations.js";
import { parsePagination, injectPaginationTypes, } from "./pagination.js";
export { parseCustomScalars, injectCustomScalars, generateScalarsSdl, buildScalarFieldMap, applyScalarFieldReplacements, };
export { parseOperations, injectOperations, };
export { parsePagination, injectPaginationTypes, };
/** Parse all hint extensions from the schema. */
export function parseHints(schema) {
    return {
        scalars: parseCustomScalars(schema),
        operations: parseOperations(schema),
        pagination: parsePagination(schema),
        scalarFieldMap: buildScalarFieldMap(schema),
    };
}
/**
 * Apply all hint post-processing steps to SDL.
 *
 * Order matters:
 * 1. Inject custom scalar declarations (must come first)
 * 2. Apply field-level scalar replacements
 * 3. Inject operation types
 * 4. Inject pagination types
 */
export function applyHints(sdl, schema) {
    const hints = parseHints(schema);
    let result = sdl;
    if (hints.scalars.length > 0) {
        result = injectCustomScalars(result, hints.scalars);
    }
    if (hints.scalarFieldMap.size > 0) {
        result = applyScalarFieldReplacements(result, hints.scalarFieldMap);
    }
    if (hints.operations.queries.length > 0 ||
        hints.operations.mutations.length > 0 ||
        hints.operations.subscriptions.length > 0) {
        result = injectOperations(result, hints.operations);
    }
    if (hints.pagination.enabled) {
        result = injectPaginationTypes(result, hints.pagination);
    }
    return result;
}
//# sourceMappingURL=index.js.map