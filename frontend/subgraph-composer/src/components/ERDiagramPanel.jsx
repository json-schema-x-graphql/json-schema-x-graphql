import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  BezierEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./ERDiagramPanel.css";
import {
  parseERDiagram,
  generateMermaidER,
  exportMermaidER,
} from "../lib/erDiagramParser.js";
import ERDiagramNode from "./ERDiagramNode.jsx";

// Self-loop edge for @requires intra-node connections.
// ReactFlow collapses edges where source === target to zero length;
// this custom type applies a curvature so the arc is visible.
function SelfConnectingEdge(props) {
  const { sourceX, sourceY, targetX, targetY, ...rest } = props;
  // Offset target slightly so BezierEdge computes a visible arc
  return (
    <BezierEdge
      {...rest}
      sourceX={sourceX}
      sourceY={sourceY}
      targetX={sourceX + 1}
      targetY={sourceY - 60}
    />
  );
}

const nodeTypes = {
  entityNode: ERDiagramNode,
};

const edgeTypes = {
  selfConnecting: SelfConnectingEdge,
};

export default function ERDiagramPanel({
  supergraphSDL,
  schemas,
  typeSources,
}) {
  const isTest =
    typeof process !== "undefined" &&
    process.env &&
    process.env.NODE_ENV === "test";

  const [viewMode, setViewMode] = useState("diagram"); // "diagram" | "mermaid"
  const [mermaidViewMode, setMermaidViewMode] = useState(
    isTest ? "code" : "preview",
  ); // "preview" | "code"
  const [mermaidText, setMermaidText] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [svgContent, setSvgContent] = useState("");
  const [mermaidRenderError, setMermaidRenderError] = useState(false);

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
            ? {
                type: MarkerType.ArrowClosed,
                width: 12,
                height: 12,
                color: e.style?.stroke || "#999",
              }
            : undefined,
          markerStart: e.markerStart
            ? {
                type: MarkerType.ArrowClosed,
                width: 12,
                height: 12,
                color: e.style?.stroke || "#999",
              }
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

  // Dynamic visual mermaid rendering
  useEffect(() => {
    if (
      isTest ||
      viewMode !== "mermaid" ||
      mermaidViewMode !== "preview" ||
      !mermaidText
    ) {
      return;
    }

    const renderDiagram = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
          fontFamily: "Arial, sans-serif",
          fontSize: 14,
        });

        const randomId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(randomId, mermaidText);
        setSvgContent(svg);
        setMermaidRenderError(false);
      } catch (error) {
        console.error("Error rendering Mermaid diagram:", error);
        setMermaidRenderError(true);
      }
    };

    renderDiagram();
  }, [viewMode, mermaidViewMode, mermaidText, isTest]);

  const handleExport = useCallback(() => {
    exportMermaidER(erData, "federation-er-diagram.mmd");
  }, [erData]);

  const hasData = erData.nodes.length > 0;

  const displayEdges = useMemo(() => {
    const selectedNodeIds = new Set(
      nodes.filter((n) => n.selected).map((n) => n.id),
    );
    return edges.map((e) => {
      if (
        e.data?.isCrossDomain &&
        !selectedNodeIds.has(e.source) &&
        !selectedNodeIds.has(e.target)
      ) {
        return {
          ...e,
          sourceHandle: undefined,
          targetHandle: undefined,
          style: { ...e.style, strokeWidth: 4, opacity: 0.5 },
        };
      }
      return e;
    });
  }, [edges, nodes]);

  return (
    <div className="er-diagram-panel">
      <div className="er-diagram-toolbar">
        <div
          style={{
            display: "flex",
            gap: "var(--spacing-md)",
            alignItems: "center",
          }}
        >
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
              title="Show Mermaid visualization"
            >
              Mermaid
            </button>
          </div>

          {viewMode === "mermaid" && mermaidText && (
            <div className="er-diagram-toggle-group">
              <button
                className={`er-diagram-toggle-btn ${mermaidViewMode === "preview" ? "active" : ""}`}
                onClick={() => setMermaidViewMode("preview")}
                title="Show visual preview"
              >
                Preview
              </button>
              <button
                className={`er-diagram-toggle-btn ${mermaidViewMode === "code" ? "active" : ""}`}
                onClick={() => setMermaidViewMode("code")}
                title="Show raw Mermaid code"
              >
                Code
              </button>
            </div>
          )}
        </div>

        {hasData && (
          <button
            className="er-diagram-export-btn"
            onClick={handleExport}
            title="Export Mermaid ER diagram"
          >
            Export Mermaid
          </button>
        )}
      </div>

      <div className="er-diagram-viewport">
        {viewMode === "diagram" ? (
          hasData ? (
            <ReactFlow
              nodes={nodes}
              edges={displayEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
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
          <div
            className="er-diagram-mermaid"
            style={{
              height: "100%",
              width: "100%",
              boxSizing: "border-box",
              padding: "var(--spacing-md)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {mermaidText ? (
              mermaidViewMode === "preview" ? (
                mermaidRenderError ? (
                  <div className="er-diagram-empty">
                    <p>
                      Failed to visually render Mermaid diagram. See the Mermaid
                      Code view.
                    </p>
                  </div>
                ) : (
                  <div
                    className="mermaid-rendered-container"
                    style={{
                      flex: 1,
                      overflow: "auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#f9fafb",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-md)",
                      padding: "var(--spacing-md)",
                    }}
                    dangerouslySetInnerHTML={{
                      __html:
                        svgContent ||
                        "<div style='color: var(--color-text-light)'>Rendering diagram...</div>",
                    }}
                  />
                )
              ) : (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 0,
                  }}
                >
                  <pre className="er-diagram-mermaid-code" style={{ flex: 1 }}>
                    {mermaidText}
                  </pre>
                  <button
                    className="er-diagram-copy-btn"
                    onClick={() => navigator.clipboard?.writeText(mermaidText)}
                    style={{ marginTop: "var(--spacing-sm)" }}
                  >
                    Copy to Clipboard
                  </button>
                </div>
              )
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
          <span
            className="er-swimlanes-dot"
            style={{ backgroundColor: sg.color }}
          />
          <span className="er-swimlanes-name">{sg.name}</span>
        </div>
      ))}
    </div>
  );
}
