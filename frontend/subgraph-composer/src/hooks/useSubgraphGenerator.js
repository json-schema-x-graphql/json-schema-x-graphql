import { useState, useCallback } from "react";
import { convertSchema } from "../lib/converter";
import { otelTracer } from "../otel";

export function useSubgraphGenerator() {
  const [subgraphs, setSubgraphs] = useState(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState(new Map());

  const generateSubgraph = useCallback(async (jsonSchema, schemaId, options = {}) => {
    setIsLoading(true);
    return otelTracer.startActiveSpan("generateSubgraph", async (span) => {
      span.setAttribute("schemaId", schemaId);
      try {
        const result = await convertSchema(jsonSchema, {
          validate: options.validate ?? true,
          descriptions: options.descriptions ?? true,
          federation: options.federation ?? true,
          federationVersion: options.federationVersion ?? "AUTO",
          naming: options.naming ?? "GRAPHQL_IDIOMATIC",
          ...options, // Allow additional options
        });

        if (result.success) {
          span.setAttribute("success", true);
          span.setStatus({ code: 1 }); // Ok
          setSubgraphs((prev) => new Map(prev).set(schemaId, result.sdl));
          setErrors((prev) => {
            const next = new Map(prev);
            next.delete(schemaId);
            return next;
          });
        } else {
          span.setAttribute("success", false);
          span.recordException(new Error(result.error));
          span.setStatus({ code: 2, message: result.error }); // Error
          setErrors((prev) => new Map(prev).set(schemaId, result.error));
        }

        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        span.recordException(error instanceof Error ? error : new Error(errorMsg));
        span.setStatus({ code: 2, message: errorMsg }); // Error
        setErrors((prev) => new Map(prev).set(schemaId, errorMsg));
        return {
          success: false,
          error: errorMsg,
          sdl: null,
        };
      } finally {
        span.end();
        setIsLoading(false);
      }
    });
  }, []);

  const clearSubgraph = useCallback((schemaId) => {
    setSubgraphs((prev) => {
      const next = new Map(prev);
      next.delete(schemaId);
      return next;
    });
    setErrors((prev) => {
      const next = new Map(prev);
      next.delete(schemaId);
      return next;
    });
  }, []);

  // Convert Map to array for easier consumption
  const subgraphArray = Array.from(subgraphs.entries()).map(([id, sdl]) => ({
    id,
    sdl,
  }));

  return {
    subgraphs: subgraphArray,
    subgraphsMap: subgraphs,
    isLoading,
    errors,
    generateSubgraph,
    clearSubgraph,
  };
}
