/**
 * Tests for ER diagram parser and Mermaid export
 */

import {
  parseERDiagram,
  generateMermaidER,
  exportMermaidER,
  FEDERATION_DIRECTIVES,
  DIRECTIVE_EDGE_STYLES,
  SUBGRAPH_COLORS,
} from "../lib/erDiagramParser.js";

describe("ER Diagram Parser", () => {
  const sampleSDL = `
    type Product @key(fields: "id") {
      id: ID!
      name: String
      sku: String @external
      reviews: [Review] @requires(fields: "sku")
    }

    type Review {
      id: ID!
      rating: Int
      product: Product @shareable
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

  test("parseERDiagram returns nodes, edges, and subgraphs", () => {
    const result = parseERDiagram(sampleSDL, typeSources, schemas);
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(Array.isArray(result.edges)).toBe(true);
    expect(Array.isArray(result.subgraphs)).toBe(true);
  });

  test("nodes have entityNode type with label and fields", () => {
    const result = parseERDiagram(sampleSDL, typeSources, schemas);
    const productNode = result.nodes.find((n) => n.data.label === "Product");
    expect(productNode).toBeDefined();
    expect(productNode.type).toBe("entityNode");
    expect(productNode.data.fields.length).toBeGreaterThan(0);
    expect(productNode.data.fields.some((f) => f.name === "id")).toBe(true);
  });

  test("nodes include federation directives on type", () => {
    const result = parseERDiagram(sampleSDL, typeSources, schemas);
    const productNode = result.nodes.find((n) => n.data.label === "Product");
    expect(productNode.data.directives.some((d) => d.name === "@key")).toBe(
      true,
    );
  });

  test("fields include federation directives", () => {
    const result = parseERDiagram(sampleSDL, typeSources, schemas);
    const productNode = result.nodes.find((n) => n.data.label === "Product");
    const skuField = productNode.data.fields.find((f) => f.name === "sku");
    expect(skuField.directives.some((d) => d.name === "@external")).toBe(true);
  });

  test("edges are created for complex field types", () => {
    const result = parseERDiagram(sampleSDL, typeSources, schemas);
    const productToReview = result.edges.find((e) => e.label === "reviews");
    expect(productToReview).toBeDefined();
    expect(
      productToReview.data.directives.some((d) => d.name === "@requires"),
    ).toBe(true);
  });

  test("subgraphs are grouped by source schema", () => {
    const result = parseERDiagram(sampleSDL, typeSources, schemas);
    expect(result.subgraphs.length).toBe(2);
    const catalog = result.subgraphs.find((s) => s.id === "schema1");
    expect(catalog).toBeDefined();
    expect(catalog.nodeIds.length).toBe(1);
  });

  test("handles empty SDL gracefully", () => {
    const result = parseERDiagram("", {}, []);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.subgraphs).toEqual([]);
  });

  test("handles SDL with no federation directives", () => {
    const plainSDL = `
      type User {
        id: ID!
        name: String
      }
    `;
    const result = parseERDiagram(plainSDL, { User: ["s1"] }, [
      { id: "s1", name: "Users" },
    ]);
    const userNode = result.nodes.find((n) => n.data.label === "User");
    expect(userNode.data.directives).toEqual([]);
  });

  test("SUBGRAPH_COLORS has at least 10 colors", () => {
    expect(SUBGRAPH_COLORS.length).toBeGreaterThanOrEqual(10);
  });

  test("FEDERATION_DIRECTIVES includes expected directives", () => {
    expect(FEDERATION_DIRECTIVES).toContain("@key");
    expect(FEDERATION_DIRECTIVES).toContain("@external");
    expect(FEDERATION_DIRECTIVES).toContain("@requires");
    expect(FEDERATION_DIRECTIVES).toContain("@shareable");
    expect(FEDERATION_DIRECTIVES).toContain("@provides");
  });

  test("DIRECTIVE_EDGE_STYLES has entries for each directive", () => {
    for (const d of FEDERATION_DIRECTIVES) {
      expect(DIRECTIVE_EDGE_STYLES[d]).toBeDefined();
    }
  });
});

describe("Mermaid ER Export", () => {
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

  test("generateMermaidER returns a string starting with erDiagram", () => {
    const erData = parseERDiagram(sampleSDL, typeSources, schemas);
    const mermaid = generateMermaidER(erData);
    expect(mermaid.startsWith("erDiagram")).toBe(true);
  });

  test("generateMermaidER includes entity definitions", () => {
    const erData = parseERDiagram(sampleSDL, typeSources, schemas);
    const mermaid = generateMermaidER(erData);
    expect(mermaid).toContain("Product {");
    expect(mermaid).toContain("Review {");
  });

  test("generateMermaidER includes field lines with types", () => {
    const erData = parseERDiagram(sampleSDL, typeSources, schemas);
    const mermaid = generateMermaidER(erData);
    expect(mermaid).toContain("ID id");
    expect(mermaid).toContain("String name");
  });

  test("generateMermaidER includes relationships", () => {
    const erData = parseERDiagram(sampleSDL, typeSources, schemas);
    const mermaid = generateMermaidER(erData);
    expect(mermaid).toContain("Product ||--|| Review");
  });

  test("generateMermaidER returns empty string for empty data", () => {
    expect(generateMermaidER({ nodes: [], edges: [], subgraphs: [] })).toBe("");
  });

  test("exportMermaidER triggers download", () => {
    const erData = parseERDiagram(sampleSDL, typeSources, schemas);
    const createElementSpy = jest.spyOn(document, "createElement");
    const appendChildSpy = jest.spyOn(document.body, "appendChild");
    const removeChildSpy = jest.spyOn(document.body, "removeChild");

    const mermaid = exportMermaidER(erData, "test.mmd");

    expect(mermaid).toContain("erDiagram");
    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
});
