/**
 * Type declarations for WASM module
 *
 * This file provides TypeScript types for both the stub and the real WASM module.
 */

/**
 * WASM module initialization function
 */
export default function init(input?: RequestInfo | URL | Response | BufferSource): Promise<void>;

/**
 * Convert JSON Schema to GraphQL SDL
 */
export function convert_json_to_sdl(input: string, options: string): string;

/**
 * Convert GraphQL SDL to JSON Schema
 */
export function convert_sdl_to_json(input: string, options: string): string;

/**
 * Get converter version
 */
export function get_version(): string;

/**
 * Validate JSON Schema
 */
export function validate_json_schema(schema: string): string;

/**
 * Validate GraphQL SDL
 */
export function validate_graphql_sdl(sdl: string): string;

/**
 * WASM module interface
 */
export interface WasmModule {
  convert_json_to_sdl(jsonSchema: string, options: string): string;
  convert_sdl_to_json(sdl: string, options: string): string;
  get_version(): string;
  validate_json_schema(jsonSchema: string): string;
  validate_graphql_sdl(sdl: string): string;
}
