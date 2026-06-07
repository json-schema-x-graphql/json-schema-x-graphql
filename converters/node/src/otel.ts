import { trace, type Tracer } from "@opentelemetry/api";

let memoryExporter: any = null;
let provider: any = null;

// Initialize tracer provider only if in a Node/testing environment
if (
  typeof (globalThis as any).window === "undefined" &&
  typeof process !== "undefined" &&
  process.versions?.node
) {
  Promise.all([
    import("@opentelemetry/sdk-trace-node"),
    import("@opentelemetry/sdk-trace-base"),
  ])
    .then(
      ([
        { NodeTracerProvider },
        { SimpleSpanProcessor, InMemorySpanExporter },
      ]) => {
        provider = new NodeTracerProvider();
        memoryExporter = new InMemorySpanExporter();
        provider.addSpanProcessor(new SimpleSpanProcessor(memoryExporter));
        provider.register();
      },
    )
    .catch(() => {
      // optional dependencies might not be installed
    });
}

export const otelTracer: Tracer = trace.getTracer("json-schema-x-graphql");

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
