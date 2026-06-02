import { type Tracer } from "@opentelemetry/api";
export declare const otelTracer: Tracer;
/**
 * Helper to get accumulated traces during test execution
 */
export declare function getOtelSpans(): import("@opentelemetry/sdk-trace-base").ReadableSpan[];
/**
 * Helper to clear accumulated traces between test cases
 */
export declare function clearOtelSpans(): void;
