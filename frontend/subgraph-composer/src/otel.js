import { trace } from "@opentelemetry/api";

let memoryExporter = null;

// Only initialize heavy OpenTelemetry SDK when not running in Jest / test environment
if (typeof window !== "undefined" && (typeof process === "undefined" || !process.env || process.env.NODE_ENV !== "test")) {
  Promise.all([
    import("@opentelemetry/sdk-trace-web"),
    import("@opentelemetry/sdk-trace-base"),
    import("@opentelemetry/context-zone")
  ]).then(([
    { WebTracerProvider },
    { SimpleSpanProcessor, InMemorySpanExporter, ConsoleSpanExporter },
    { ZoneContextManager }
  ]) => {
    const provider = new WebTracerProvider();
    memoryExporter = new InMemorySpanExporter();
    
    provider.addSpanProcessor(new SimpleSpanProcessor(memoryExporter));
    provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
    
    provider.register({
      contextManager: new ZoneContextManager(),
    });
  }).catch(err => {
    console.warn("Failed to initialize OpenTelemetry Web Provider:", err);
  });
}

export const otelTracer = trace.getTracer("subgraph-composer");

export function getOtelSpans() {
  return memoryExporter ? memoryExporter.getFinishedSpans() : [];
}

export function clearOtelSpans() {
  if (memoryExporter) {
    memoryExporter.reset();
  }
}
