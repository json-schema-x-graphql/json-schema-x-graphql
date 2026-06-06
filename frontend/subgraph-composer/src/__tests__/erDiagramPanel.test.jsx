/**
 * Tests for ERDiagramPanel component
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ERDiagramPanel from "../components/ERDiagramPanel.jsx";

// Mock @xyflow/react to avoid canvas issues in jsdom
jest.mock("@xyflow/react", () => {
  const React = require("react");
  return {
    ReactFlow: ({ children, nodes, edges }) => (
      <div data-testid="react-flow">
        <div data-testid="rf-nodes">{nodes.length} nodes</div>
        <div data-testid="rf-edges">{edges.length} edges</div>
        {children}
      </div>
    ),
    Background: () => <div data-testid="background" />,
    Controls: () => <div data-testid="controls" />,
    MiniMap: () => <div data-testid="minimap" />,
    Handle: ({ position }) => <div data-testid={`handle-${position}`} />,
    Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
    useNodesState: (initial) => {
      const [nodes, setNodes] = React.useState(initial);
      const onChange = React.useCallback((changes) => {
        setNodes((prev) =>
          prev.map((n) => {
            const change = changes.find((c) => c.id === n.id);
            return change ? { ...n, ...change } : n;
          }),
        );
      }, []);
      return [nodes, setNodes, onChange];
    },
    useEdgesState: (initial) => {
      const [edges, setEdges] = React.useState(initial);
      const onChange = React.useCallback((changes) => {
        setEdges((prev) =>
          prev.map((e) => {
            const change = changes.find((c) => c.id === e.id);
            return change ? { ...e, ...change } : e;
          }),
        );
      }, []);
      return [edges, setEdges, onChange];
    },
    MarkerType: { ArrowClosed: "arrowclosed" },
  };
});

jest.mock("../components/ERDiagramNode.jsx", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ data }) => <div data-testid="entity-node">{data.label}</div>,
  };
});

const sampleSDL = `
  type Product @key(fields: "id") {
    id: ID!
    name: String
    reviews: [Review]
  }

  type Review {
    id: ID!
    rating: Int
  }
`;

const schemas = [
  { id: "schema1", name: "Catalog" },
  { id: "schema2", name: "Reviews" },
];

const typeSources = {
  Product: ["schema1"],
  Review: ["schema2"],
};

describe("ERDiagramPanel", () => {
  test("renders empty state when no SDL is provided", () => {
    render(
      <ERDiagramPanel
        supergraphSDL=""
        subgraphsMap={new Map()}
        schemas={[]}
        typeSources={{}}
      />,
    );
    expect(screen.getByText(/No supergraph available/i)).toBeInTheDocument();
  });

  test("renders diagram toggle buttons", () => {
    render(
      <ERDiagramPanel
        supergraphSDL={sampleSDL}
        subgraphsMap={new Map()}
        schemas={schemas}
        typeSources={typeSources}
      />,
    );
    expect(
      screen.getByRole("button", { name: /^Diagram$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Mermaid$/i }),
    ).toBeInTheDocument();
  });

  test("switches to Mermaid view on click", async () => {
    render(
      <ERDiagramPanel
        supergraphSDL={sampleSDL}
        subgraphsMap={new Map()}
        schemas={schemas}
        typeSources={typeSources}
      />,
    );

    const mermaidBtn = screen.getByRole("button", { name: /^Mermaid$/i });
    fireEvent.click(mermaidBtn);

    await waitFor(() => {
      expect(screen.getByText(/erDiagram/)).toBeInTheDocument();
    });
  });

  test("renders ReactFlow when SDL is provided", () => {
    render(
      <ERDiagramPanel
        supergraphSDL={sampleSDL}
        subgraphsMap={new Map()}
        schemas={schemas}
        typeSources={typeSources}
      />,
    );
    expect(screen.getByTestId("react-flow")).toBeInTheDocument();
  });

  test("shows export button when data is available", () => {
    render(
      <ERDiagramPanel
        supergraphSDL={sampleSDL}
        subgraphsMap={new Map()}
        schemas={schemas}
        typeSources={typeSources}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Export Mermaid/i }),
    ).toBeInTheDocument();
  });

  test("hides export button when no data is available", () => {
    render(
      <ERDiagramPanel
        supergraphSDL=""
        subgraphsMap={new Map()}
        schemas={[]}
        typeSources={{}}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /Export Mermaid/i }),
    ).not.toBeInTheDocument();
  });

  test("renders swimlane legend when subgraphs exist", () => {
    render(
      <ERDiagramPanel
        supergraphSDL={sampleSDL}
        subgraphsMap={new Map()}
        schemas={schemas}
        typeSources={typeSources}
      />,
    );
    expect(screen.getByText("Catalog")).toBeInTheDocument();
    expect(screen.getByText("Reviews")).toBeInTheDocument();
  });
});
