/**
 * OpenTelemetry tracing integration for json-schema-x-graphql.
 *
 * The SDK packages (`@opentelemetry/sdk-trace-node`, `@opentelemetry/sdk-trace-base`)
 * are loaded lazily via dynamic `import()` so they are NOT included in browser/WASM
 * bundles — they are only loaded at runtime in Node environments where they are installed.
 *
 * This makes `@opentelemetry/api` the only required runtime dependency; the SDK
 * packages become truly optional and can be omitted from installations that don't
 * need tracing instrumentation.
 */
import { type Tracer } from "@opentelemetry/api";
/** The OTel tracer — always available, backed by the global provider. */
export declare const otelTracer: Tracer;
/**
 * Helper to get accumulated traces during test execution.
 * Returns an empty array if the SDK is not installed or not yet initialised.
 */
export declare function getOtelSpans(): any[];
/**
 * Helper to clear accumulated traces between test cases.
 * No-op if the SDK is not installed.
 */
export declare function clearOtelSpans(): void;
