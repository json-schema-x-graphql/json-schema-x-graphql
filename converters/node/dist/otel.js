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
import { trace } from "@opentelemetry/api";
let memoryExporter = null;
// Lazily initialize the tracer provider only in Node environments where the SDK
// packages are installed.  The dynamic import() ensures bundlers do not pull
// the heavy SDK packages into a WASM/browser build.
async function initTracerProvider() {
    if (typeof globalThis.window !== "undefined" ||
        typeof process === "undefined" ||
        !process.versions?.node) {
        return; // Not a Node environment — skip initialisation
    }
    try {
        const [{ NodeTracerProvider }, { SimpleSpanProcessor, InMemorySpanExporter },] = await Promise.all([
            import("@opentelemetry/sdk-trace-node"),
            import("@opentelemetry/sdk-trace-base"),
        ]);
        memoryExporter = new InMemorySpanExporter();
        const provider = new NodeTracerProvider({
            spanProcessors: [new SimpleSpanProcessor(memoryExporter)],
        });
        provider.register();
    }
    catch {
        // SDK packages are not installed — tracing degrades gracefully to no-ops.
    }
}
// Fire-and-forget initialisation; any spans created before the provider
// finishes setting up will be recorded by the default global provider (no-ops).
initTracerProvider();
/** The OTel tracer — always available, backed by the global provider. */
export const otelTracer = trace.getTracer("json-schema-x-graphql");
/**
 * Helper to get accumulated traces during test execution.
 * Returns an empty array if the SDK is not installed or not yet initialised.
 */
export function getOtelSpans() {
    return memoryExporter ? memoryExporter.getFinishedSpans() : [];
}
/**
 * Helper to clear accumulated traces between test cases.
 * No-op if the SDK is not installed.
 */
export function clearOtelSpans() {
    if (memoryExporter) {
        memoryExporter.reset();
    }
}
//# sourceMappingURL=otel.js.map