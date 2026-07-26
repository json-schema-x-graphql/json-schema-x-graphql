/**
 * Field mapping system for multi-source schema unification.
 *
 * Mirrors the Rust implementation in
 * `converters/rust/src/mapping/mod.rs`.
 */
export interface FieldMappingEntry {
    snake?: string;
    camel?: string;
    locations: string[];
}
export type FieldMapping = Record<string, FieldMappingEntry>;
/**
 * Build a FieldMapping from a JSON object (e.g., loaded from
 * `field-mapping.json`).
 */
export declare function parseFieldMapping(value: any): FieldMapping;
/**
 * Walk a JSON pointer path through a schema.
 * Accepts both `/foo/bar` and `foo/bar` formats. Tries direct
 * key access, then camelCase/snake_case variants.
 */
export declare function resolvePointer(schema: any, pointer: string): any;
/**
 * Resolve a pointer using a field mapping as a hint.
 * Tries direct resolution first, then falls back to mapping locations.
 */
export declare function resolvePointerWithMapping(schema: any, pointer: string, mapping: FieldMapping): {
    node: any;
    path: string;
} | null;
/**
 * Translate a federation field set (e.g., `"id contractId"`) by
 * applying the field mapping to each token.
 */
export declare function translateFederationFieldSet(fieldSet: string, mapping: FieldMapping): string;
