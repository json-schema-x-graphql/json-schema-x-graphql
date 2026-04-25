import { useState, useCallback } from "react";
import { composeSupergraph } from "../lib/composer";

export function useComposition() {
  const [supergraphSDL, setSupergraphSDL] = useState("");
  const [compositionStats, setCompositionStats] = useState(null);
  const [compositionErrors, setCompositionErrors] = useState([]);

  const compose = useCallback(async (subgraphs) => {
    if (subgraphs.size === 0) {
      setSupergraphSDL("");
      setCompositionStats(null);
      setCompositionErrors([]);
      return;
    }

    try {
      const result = composeSupergraph(subgraphs, {
        mergeStrategy: "extend",
        includeRootQuery: true,
        federationMode: false,
      });

      if (result.success) {
        setSupergraphSDL(result.sdl);
        setCompositionStats(result.stats);
        setCompositionErrors(result.errors);
      } else {
        setCompositionErrors(result.errors);
        setSupergraphSDL("");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setCompositionErrors([errorMsg]);
      setSupergraphSDL("");
    }
  }, []);

  return {
    supergraphSDL,
    compositionStats,
    compositionErrors,
    compose,
  };
}
