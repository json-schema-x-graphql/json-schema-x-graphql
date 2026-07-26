/**
 * Custom scalar type generation from x-graphql-scalars extension.
 *
 * Mirrors the Rust implementation in
 * `converters/rust/src/hints/scalars.rs`.
 */
export interface ScalarConfig {
    name: string;
    description?: string;
    specifiedByURL?: string;
}
/**
 * Parse `x-graphql-scalars` from the top-level schema object.
 * Accepts both an object format (keys are scalar names) and an
 * array format (each entry has `name` and optional `description`).
 */
export declare function parseCustomScalars(schema: any): ScalarConfig[];
/** Generate SDL for a list of custom scalars. */
export declare function generateScalarsSdl(scalars: ScalarConfig[], existingSdl: string): string;
/** Prepend custom scalar declarations to existing SDL. */
export declare function injectCustomScalars(sdl: string, scalars: ScalarConfig[]): string;
/** Build a map of type.field → scalar name for property-level x-graphql-scalar overrides. */
export declare function buildScalarFieldMap(schema: any): Map<string, string>;
/** Apply field-level scalar replacements to SDL. */
export declare function applyScalarFieldReplacements(sdl: string, fieldMap: Map<string, string>): string;
