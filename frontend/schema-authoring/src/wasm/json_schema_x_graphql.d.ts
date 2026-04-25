/* tslint:disable */
/* eslint-disable */

/**
 * WASM-compatible conversion options
 */
export class WasmConversionOptions {
    free(): void;
    [Symbol.dispose](): void;
    constructor();
    federation_version: number;
    include_descriptions: boolean;
    infer_ids: boolean;
    preserve_field_order: boolean;
    validate: boolean;
}

/**
 * WASM-compatible converter
 */
export class WasmConverter {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Convert between formats (bidirectional)
     */
    convert(input: string, direction: string): string;
    /**
     * Convert GraphQL SDL to JSON Schema
     */
    graphqlToJsonSchema(graphql_sdl: string): string;
    /**
     * Convert JSON Schema to GraphQL SDL
     */
    jsonSchemaToGraphQL(json_schema: string): string;
    /**
     * Create a new converter with default options
     */
    constructor();
    /**
     * Create a new converter with custom options
     */
    static withOptions(options: WasmConversionOptions): WasmConverter;
}

/**
 * Standardized API conversion function
 */
export function convert(input: any): any;

/**
 * Get library version
 */
export function getVersion(): string;

/**
 * Standalone function to convert GraphQL SDL to JSON Schema
 */
export function graphqlToJsonSchema(graphql_sdl: string): string;

/**
 * Initialize panic hook for better error messages in browser
 */
export function init(): void;

/**
 * Standalone function to convert JSON Schema to GraphQL SDL
 */
export function jsonSchemaToGraphQL(json_schema: string): string;

/**
 * Validate a GraphQL name
 */
export function validateGraphQLName(name: string): boolean;

/**
 * Validate GraphQL SDL
 */
export function validateGraphQLSdl(graphql_sdl: string): boolean;

/**
 * Validate JSON Schema
 */
export function validateJsonSchema(json_schema: string): boolean;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_wasmconversionoptions_free: (a: number, b: number) => void;
    readonly __wbg_wasmconverter_free: (a: number, b: number) => void;
    readonly convert: (a: number, b: number) => void;
    readonly getVersion: (a: number) => void;
    readonly graphqlToJsonSchema: (a: number, b: number, c: number) => void;
    readonly init: () => void;
    readonly jsonSchemaToGraphQL: (a: number, b: number, c: number) => void;
    readonly validateGraphQLName: (a: number, b: number, c: number) => void;
    readonly validateGraphQLSdl: (a: number, b: number, c: number) => void;
    readonly validateJsonSchema: (a: number, b: number, c: number) => void;
    readonly wasmconversionoptions_federation_version: (a: number) => number;
    readonly wasmconversionoptions_include_descriptions: (a: number) => number;
    readonly wasmconversionoptions_infer_ids: (a: number) => number;
    readonly wasmconversionoptions_new: () => number;
    readonly wasmconversionoptions_preserve_field_order: (a: number) => number;
    readonly wasmconversionoptions_set_federation_version: (a: number, b: number) => void;
    readonly wasmconversionoptions_set_include_descriptions: (a: number, b: number) => void;
    readonly wasmconversionoptions_set_infer_ids: (a: number, b: number) => void;
    readonly wasmconversionoptions_set_preserve_field_order: (a: number, b: number) => void;
    readonly wasmconversionoptions_set_validate: (a: number, b: number) => void;
    readonly wasmconversionoptions_validate: (a: number) => number;
    readonly wasmconverter_convert: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly wasmconverter_graphqlToJsonSchema: (a: number, b: number, c: number, d: number) => void;
    readonly wasmconverter_jsonSchemaToGraphQL: (a: number, b: number, c: number, d: number) => void;
    readonly wasmconverter_new: () => number;
    readonly wasmconverter_withOptions: (a: number) => number;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_export3: (a: number) => void;
    readonly __wbindgen_export4: (a: number, b: number, c: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
