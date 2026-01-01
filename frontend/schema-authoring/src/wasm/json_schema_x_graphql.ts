/**
 * WASM Module Stub
 *
 * This is a placeholder module that gets used when the actual WASM module
 * hasn't been built yet. It throws helpful errors directing users to build
 * the WASM module if they want to use the Rust converter.
 *
 * To build the actual WASM module:
 *   pnpm run build:wasm
 *
 * Or manually:
 *   cd ../../converters/rust
 *   wasm-pack build --target web --out-dir ../../frontend/schema-authoring/src/wasm
 */

const WASM_NOT_BUILT_ERROR = `
WASM converter not built yet!

The Rust WASM converter is not available. You have two options:

1. Build the WASM module:
   cd json-schema-x-graphql
   pnpm run build:wasm

2. Use the Node.js converter instead (no action needed - automatic fallback)

The app will work fine with the Node.js converter as fallback.
WASM provides better performance but requires Rust toolchain.
`.trim();

/**
 * Stub WASM initialization function
 */
export default function init(): Promise<void> {
  return Promise.reject(new Error(WASM_NOT_BUILT_ERROR));
}

/**
 * Stub converter functions that throw helpful errors
 */
export function convert_json_to_sdl(_input: string, _options: string): string {
  throw new Error(WASM_NOT_BUILT_ERROR);
}

export function convert_sdl_to_json(_input: string, _options: string): string {
  throw new Error(WASM_NOT_BUILT_ERROR);
}

export function get_version(): string {
  throw new Error(WASM_NOT_BUILT_ERROR);
}

export function validate_json_schema(_schema: string): string {
  throw new Error(WASM_NOT_BUILT_ERROR);
}

export function validate_graphql_sdl(_sdl: string): string {
  throw new Error(WASM_NOT_BUILT_ERROR);
}

/**
 * Type definitions for WASM module
 * These match what wasm-pack would generate
 */
export interface WasmModule {
  convert_json_to_sdl(jsonSchema: string, options: string): string;
  convert_sdl_to_json(sdl: string, options: string): string;
  get_version(): string;
  validate_json_schema(jsonSchema: string): string;
  validate_graphql_sdl(sdl: string): string;
}
