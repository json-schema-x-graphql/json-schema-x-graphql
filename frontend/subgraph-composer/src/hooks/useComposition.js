import { useState, useCallback } from "react";
import { composeSupergraph } from "../lib/composer";
import { otelTracer } from "../otel";

export function useComposition() {
  const [supergraphSDL, setSupergraphSDL] = useState("");
  const [compositionStats, setCompositionStats] = useState(null);
  const [compositionErrors, setCompositionErrors] = useState([]);
  const [typeSources, setTypeSources] = useState([]);

  const compose = useCallback(async (subgraphs) => {
    if (subgraphs.size === 0) {
      setSupergraphSDL("");
      setCompositionStats(null);
      setCompositionErrors([]);
      setTypeSources({});
      return;
    }

    return otelTracer.startActiveSpan("composeSupergraph", async (span) => {
      span.setAttribute("subgraph.count", subgraphs.size);
      try {
        const result = composeSupergraph(subgraphs, {
          mergeStrategy: "extend",
          includeRootQuery: true,
          federationMode: false,
        });

        if (result.success) {
          span.setAttribute(
            "composition.totalTypes",
            result.stats?.totalTypes ?? 0,
          );
          span.setAttribute(
            "composition.totalFields",
            result.stats?.totalFields ?? 0,
          );
          span.setAttribute(
            "composition.conflicts",
            result.stats?.conflicts?.length ?? 0,
          );
          span.setStatus({ code: 1 }); // Ok
          setSupergraphSDL(result.sdl);
          setCompositionStats(result.stats);
          setCompositionErrors(result.errors);
          setTypeSources(result.typeSources ?? {});
        } else {
          span.setAttribute("composition.errors", result.errors.join("; "));
          span.setStatus({ code: 2, message: result.errors[0] });
          setCompositionErrors(result.errors);
          setSupergraphSDL("");
          setTypeSources({});
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        span.recordException(
          error instanceof Error ? error : new Error(errorMsg),
        );
        span.setStatus({ code: 2, message: errorMsg });
        setCompositionErrors([errorMsg]);
        setSupergraphSDL("");
        setTypeSources({});
      } finally {
        span.end();
      }
    });
  }, []);

  return {
    supergraphSDL,
    compositionStats,
    compositionErrors,
    typeSources,
    compose,
  };
}
