import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./ERDiagramPanel.css";
import { parseERDiagram, generateMermaidER, exportMermaidER } from "../lib/erDiagramParser.js";
import ERDiagramNode from "./ERDiagramNode.jsx";

const nodeTypes = {
  entityNode: ERDiagramNode,
};

export default function ERDiagramPanel({ supergraphSDL, subgraphsMap, schemas, typeSources }) {
  const [viewMode, setViewMode] = useState("diagram"); // "diagram" | "mermaid"
  const [mermaidText, setMermaidText] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const erData = useMemo(() => {
    if (!supergraphSDL) return { nodes: [], edges: [], subgraphs: [] };
    return parseERDiagram(supergraphSDL, typeSources, schemas);
  }, [supergraphSDL, typeSources, schemas]);

  useEffect(() => {
    if (erData.nodes.length > 0) {
      setNodes(erData.nodes);
      setEdges(
        erData.edges.map((e) => ({
          ...e,
          markerEnd: e.markerEnd
            ? { type: MarkerType.ArrowClosed, width: 12, height: 12, color: e.style?.stroke || "#999" }
            : undefined,
          markerStart: e.markerStart
            ? { type: MarkerType.ArrowClosed, width: 12, height: 12, color: e.style?.stroke || "#999" }
            : undefined,
        })),
      );
      const mermaid = generateMermaidER(erData);
      setMermaidText(mermaid);
    } else {
      setNodes([]);
      setEdges([]);
      setMermaidText("");
    }
  }, [erData, setNodes, setEdges]);

  const handleExport = useCallback(() => {
    exportMermaidER(erData, "federation-er-diagram.mmd");
  }, [erData]);

  const hasData = erData.nodes.length > 0;

  return (
    <div className="er-diagram-panel">
      <div className="er-diagram-toolbar">
        <div className="er-diagram-toggle-group">
          <button
            className={`er-diagram-toggle-btn ${viewMode === "diagram" ? "active" : ""}`}
            onClick={() => setViewMode("diagram")}
            title="Show interactive ER diagram"
          >
            Diagram
          </button>
          <button
            className={`er-diagram-toggle-btn ${viewMode === "mermaid" ? "active" : ""}`}
            onClick={() => setViewMode("mermaid")}
            title="Show Mermaid source"
          >
            Mermaid
          </button>
        </div>

        {hasData && (
          <button className="er-diagram-export-btn" onClick={handleExport} title="Export Mermaid ER diagram">
            Export Mermaid
          </button>
        )}
      </div>

      <div className="er-diagram-viewport">
        {viewMode === "diagram" ? (
          hasData ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition="bottom-right"
            >
              <Background variant="dots" gap={12} size={1} />
              <Controls />
              <MiniMap nodeStrokeWidth={3} zoomable pannable />
              {/* Subgraph swimlanes overlay */}
              <SubgraphSwimlanes subgraphs={erData.subgraphs} />
            </ReactFlow>
          ) : (
            <div className="er-diagram-empty">
              <p>No supergraph available. Generate subgraphs first.</p>
            </div>
          )
        ) : (
          <div className="er-diagram-mermaid">
            {mermaidText ? (
              <>
                <pre className="er-diagram-mermaid-code">{mermaidText}</pre>
                <button className="er-diagram-copy-btn" onClick={() => navigator.clipboard?.writeText(mermaidText)}>
                  Copy to Clipboard
                </button>
              </>
            ) : (
              <div className="er-diagram-empty">
                <p>No supergraph available. Generate subgraphs first.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SubgraphSwimlanes({ subgraphs }) {
  if (!subgraphs || subgraphs.length === 0) return null;

  return (
    <div className="er-swimlanes-legend">
      {subgraphs.map((sg) => (
        <div key={sg.id} className="er-swimlanes-item">
          <span className="er-swimlanes-dot" style={{ backgroundColor: sg.color }} />
          <span className="er-swimlanes-name">{sg.name}</span>
        </div>
      ))}
    </div>
  );
}
