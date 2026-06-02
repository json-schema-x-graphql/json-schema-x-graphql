import { trace } from "@opentelemetry/api";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { SimpleSpanProcessor, InMemorySpanExporter } from "@opentelemetry/sdk-trace-base";
let memoryExporter = null;
let provider = null;
// Initialize tracer provider only if in a Node/testing environment
if (typeof globalThis.window === "undefined" && typeof process !== "undefined" && process.versions?.node) {
    provider = new NodeTracerProvider();
    memoryExporter = new InMemorySpanExporter();
    provider.addSpanProcessor(new SimpleSpanProcessor(memoryExporter));
    provider.register();
}
export const otelTracer = trace.getTracer("json-schema-x-graphql");
/**
 * Helper to get accumulated traces during test execution
 */
export function getOtelSpans() {
    return memoryExporter ? memoryExporter.getFinishedSpans() : [];
}
/**
 * Helper to clear accumulated traces between test cases
 */
export function clearOtelSpans() {
    if (memoryExporter) {
        memoryExporter.reset();
    }
}
//# sourceMappingURL=otel.js.map