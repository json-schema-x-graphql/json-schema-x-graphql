import React, { useState, useEffect, useMemo, useRef } from "react";
import { Voyager, sdlToSchema } from "graphql-voyager";
import "graphql-voyager/dist/voyager.css";
import "./VoyagerPanel.css";

const SUBGRAPH_COLORS = [
  { stroke: "#2196f3", fill: "#e3f2fd", header: "#2196f3" },
  { stroke: "#4caf50", fill: "#e8f5e9", header: "#4caf50" },
  { stroke: "#ff9800", fill: "#fff3e0", header: "#ff9800" },
  { stroke: "#9c27b0", fill: "#f3e5f5", header: "#9c27b0" },
  { stroke: "#f44336", fill: "#ffebee", header: "#f44336" },
  { stroke: "#009688", fill: "#e0f2f1", header: "#009688" },
  { stroke: "#795548", fill: "#efebe9", header: "#795548" },
  { stroke: "#607d8b", fill: "#eceff1", header: "#607d8b" },
  { stroke: "#e91e63", fill: "#fce4ec", header: "#e91e63" },
  { stroke: "#3f51b5", fill: "#e8eaf6", header: "#3f51b5" },
];

function getSchemaColor(index) {
  return SUBGRAPH_COLORS[index % SUBGRAPH_COLORS.length];
}

function buildColorStyles(typeSources, schemas) {
  if (!typeSources || Object.keys(typeSources).length === 0) return "";

  const schemaIndexMap = new Map();
  schemas.forEach((s, idx) => schemaIndexMap.set(s.id, idx));

  const lines = [];
  for (const [typeName, sourceIds] of Object.entries(typeSources)) {
    if (!sourceIds || sourceIds.length === 0) continue;
    // Use the first source to determine color
    const sourceId = sourceIds[0];
    const idx = schemaIndexMap.get(sourceId) ?? 0;
    const color = getSchemaColor(idx);
    const safeId = `TYPE::${typeName}`;
    const escapedId = safeId.replace(/\\/g, "\\\\").replace(/:/g, "\\:");
    lines.push(
      `#${escapedId}.node polygon { stroke: ${color.stroke} !important; fill: ${color.fill} !important; }`,
      `#${escapedId}.node .type-title polygon { fill: ${color.header} !important; }`,
    );
  }
  return lines.join("\n");
}

export default function VoyagerPanel({
  supergraphSDL,
  subgraphsMap,
  schemas,
  typeSources,
}) {
  const [viewMode, setViewMode] = useState("supergraph"); // "supergraph" | "subgraph"
  const [selectedSubgraphId, setSelectedSubgraphId] = useState("");
  const styleRef = useRef(null);
  const containerRef = useRef(null);

  const subgraphEntries = useMemo(() => {
    if (!subgraphsMap) return [];
    return Array.from(subgraphsMap.entries()).map(([id, sdl]) => {
      const schema = schemas.find((s) => s.id === id);
      return { id, sdl, name: schema?.name || id };
    });
  }, [subgraphsMap, schemas]);

  useEffect(() => {
    if (subgraphEntries.length > 0 && !selectedSubgraphId) {
      setSelectedSubgraphId(subgraphEntries[0].id);
    }
  }, [subgraphEntries, selectedSubgraphId]);

  const schema = useMemo(() => {
    try {
      if (viewMode === "supergraph") {
        if (!supergraphSDL) return null;
        return sdlToSchema(supergraphSDL);
      } else {
        const sdl = subgraphsMap?.get(selectedSubgraphId);
        if (!sdl) return null;
        return sdlToSchema(sdl);
      }
    } catch (error) {
      console.error("Failed to parse SDL for Voyager:", error);
      return null;
    }
  }, [viewMode, supergraphSDL, subgraphsMap, selectedSubgraphId]);

  // Inject color styles for supergraph view
  useEffect(() => {
    if (viewMode !== "supergraph" || !typeSources) {
      if (styleRef.current) {
        styleRef.current.remove();
        styleRef.current = null;
      }
      return;
    }

    const css = buildColorStyles(typeSources, schemas);
    if (!css) return;

    // Remove old style tag
    if (styleRef.current) {
      styleRef.current.remove();
    }

    const style = document.createElement("style");
    style.setAttribute("data-voyager-colors", "true");
    style.textContent = css;
    document.head.appendChild(style);
    styleRef.current = style;

    return () => {
      if (styleRef.current) {
        styleRef.current.remove();
        styleRef.current = null;
      }
    };
  }, [viewMode, typeSources, schemas]);

  const hasData = schema != null;

  return (
    <div className="voyager-panel" ref={containerRef}>
      <div className="voyager-toolbar">
        <div className="voyager-toggle-group">
          <button
            className={`voyager-toggle-btn ${viewMode === "supergraph" ? "active" : ""}`}
            onClick={() => setViewMode("supergraph")}
            title="Show composed supergraph"
          >
            Supergraph
          </button>
          <button
            className={`voyager-toggle-btn ${viewMode === "subgraph" ? "active" : ""}`}
            onClick={() => setViewMode("subgraph")}
            title="Show individual subgraph"
          >
            Per-Subgraph
          </button>
        </div>

        {viewMode === "subgraph" && (
          <select
            className="voyager-select"
            value={selectedSubgraphId}
            onChange={(e) => setSelectedSubgraphId(e.target.value)}
            aria-label="Select subgraph"
          >
            {subgraphEntries.map((sg) => (
              <option key={sg.id} value={sg.id}>
                {sg.name}
              </option>
            ))}
          </select>
        )}

        {viewMode === "supergraph" && schemas.length > 0 && (
          <div className="voyager-legend">
            {schemas.map((s, idx) => {
              const color = getSchemaColor(idx);
              return (
                <span key={s.id} className="voyager-legend-item">
                  <span
                    className="voyager-legend-dot"
                    style={{ backgroundColor: color.header }}
                  />
                  {s.name}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="voyager-viewport">
        {hasData ? (
          <Voyager
            introspection={schema}
            displayOptions={{
              skipRelay: true,
              skipDeprecated: true,
              showLeafFields: true,
              sortByAlphabet: false,
              hideRoot: false,
            }}
            hideDocs={false}
            hideSettings={false}
            hideVoyagerLogo={true}
          />
        ) : (
          <div className="voyager-empty">
            <p>
              {viewMode === "supergraph"
                ? "No supergraph available. Generate subgraphs first."
                : "No subgraph selected."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
