import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "subgraph-composer-schemas";
const ACTIVE_ID_KEY = "subgraph-composer-active-schema-id";

export function useSchemaManager() {
  const [schemas, setSchemas] = useState([]);
  const [activeSchemaId, setActiveSchemaId] = useState(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const storedActiveId = localStorage.getItem(ACTIVE_ID_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSchemas(parsed);
        if (parsed.length > 0) {
          // Restore activeSchemaId if present and valid, else default to first
          if (storedActiveId && parsed.some((s) => s.id === storedActiveId)) {
            setActiveSchemaId(storedActiveId);
          } else {
            setActiveSchemaId(parsed[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to load schemas from localStorage:", error);
      }
    }
  }, []);

  // Save to localStorage whenever schemas or activeSchemaId change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schemas));
    if (activeSchemaId) {
      localStorage.setItem(ACTIVE_ID_KEY, activeSchemaId);
    } else {
      localStorage.removeItem(ACTIVE_ID_KEY);
    }
  }, [schemas, activeSchemaId]);

  const generateId = useCallback(() => {
    return `schema-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const addSchema = useCallback(
    (name = null, template = null) => {
      const newSchema = {
        id: generateId(),
        name: name || `Schema ${schemas.length + 1}`,
        content:
          template ||
          JSON.stringify(
            {
              $schema: "https://json-schema.org/draft/2020-12/schema",
              title: "NewSchema",
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
              },
              required: ["id"],
            },
            null,
            2,
          ),
        lastModified: Date.now(),
        enabled: true, // NEW: Track whether schema is included in composition
      };
      setSchemas((prev) => [...prev, newSchema]);
      return newSchema;
    },
    [schemas.length, generateId],
  );

  const removeSchema = useCallback(
    (schemaId) => {
      setSchemas((prev) => {
        const filtered = prev.filter((s) => s.id !== schemaId);
        // If the active schema is removed, set to next available or null
        if (activeSchemaId === schemaId) {
          if (filtered.length > 0) {
            setActiveSchemaId(filtered[0].id);
          } else {
            setActiveSchemaId(null);
          }
        }
        return filtered;
      });
    },
    [activeSchemaId],
  );

  const updateSchema = useCallback((schemaId, content) => {
    setSchemas((prev) =>
      prev.map((s) =>
        s.id === schemaId ? { ...s, content, lastModified: Date.now() } : s,
      ),
    );
  }, []);

  const renameSchema = useCallback((schemaId, newName) => {
    setSchemas((prev) =>
      prev.map((s) => (s.id === schemaId ? { ...s, name: newName } : s)),
    );
  }, []);

  const reorderSchemas = useCallback((reorderedSchemas) => {
    setSchemas(reorderedSchemas);
  }, []);

  const duplicateSchema = useCallback(
    (schemaId) => {
      const schema = schemas.find((s) => s.id === schemaId);
      if (!schema) return;

      const newSchema = {
        ...schema,
        id: generateId(),
        name: `${schema.name} (Copy)`,
        lastModified: Date.now(),
      };
      setSchemas((prev) => [...prev, newSchema]);
      return newSchema;
    },
    [schemas, generateId],
  );

  const clearAll = useCallback(() => {
    if (window.confirm("Delete all schemas? This cannot be undone.")) {
      setSchemas([]);
      setActiveSchemaId(null);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ACTIVE_ID_KEY);
    }
  }, []);

  const toggleSchema = useCallback((schemaId) => {
    setSchemas((prev) =>
      prev.map((s) => (s.id === schemaId ? { ...s, enabled: !s.enabled } : s)),
    );
  }, []);

  return {
    schemas,
    activeSchemaId,
    setActiveSchemaId,
    addSchema,
    removeSchema,
    updateSchema,
    renameSchema,
    reorderSchemas,
    duplicateSchema,
    clearAll,
    toggleSchema,
  };
}
