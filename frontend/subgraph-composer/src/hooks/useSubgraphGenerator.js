import { useState, useCallback } from 'react';
import { convertSchema } from '../lib/converter';

export function useSubgraphGenerator() {
  const [subgraphs, setSubgraphs] = useState(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState(new Map());

  const generateSubgraph = useCallback(
    async (jsonSchema, schemaId, options = {}) => {
      setIsLoading(true);
      try {
        const result = await convertSchema(jsonSchema, {
          validate: options.validate ?? true,
          descriptions: options.descriptions ?? true,
          federation: options.federation ?? true,
          federationVersion: options.federationVersion ?? 'AUTO',
          naming: options.naming ?? 'GRAPHQL_IDIOMATIC',
          ...options, // Allow additional options
        });

        if (result.success) {
          setSubgraphs((prev) => new Map(prev).set(schemaId, result.sdl));
          setErrors((prev) => {
            const next = new Map(prev);
            next.delete(schemaId);
            return next;
          });
        } else {
          setErrors((prev) => new Map(prev).set(schemaId, result.error));
        }

        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setErrors((prev) => new Map(prev).set(schemaId, errorMsg));
        return {
          success: false,
          error: errorMsg,
          sdl: null,
        };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

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
