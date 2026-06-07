import { type Tracer } from "@opentelemetry/api";
export declare const otelTracer: Tracer;
/**
 * Helper to get accumulated traces during test execution
 */
export declare function getOtelSpans(): any;
/**
 * Helper to clear accumulated traces between test cases
 */
export declare function clearOtelSpans(): void;
