import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import VoyagerPanel from "../components/VoyagerPanel.jsx";
import { sdlToSchema, Voyager } from "graphql-voyager";

jest.mock("graphql-voyager", () => ({
  Voyager: jest.fn(() => null),
  sdlToSchema: jest.fn((sdl) => ({
    __mockSchema: true,
    sdl,
    getQueryType: () => ({ name: "Query" }),
    getTypeMap: () => ({}),
  })),
  voyagerIntrospectionQuery: jest.fn(() => "{ __schema { types { name } } }"),
}));

describe("VoyagerPanel", () => {
  const schemas = [
    { id: "schema-1", name: "Users" },
    { id: "schema-2", name: "Orders" },
  ];

  const subgraphsMap = new Map([
    ["schema-1", "type Query { users: [User] } type User { id: ID }"],
    ["schema-2", "type Query { orders: [Order] } type Order { id: ID }"],
  ]);

  const typeSources = {
    User: ["schema-1"],
    Order: ["schema-2"],
    Query: ["schema-1", "schema-2"],
  };

  beforeEach(() => {
    sdlToSchema.mockClear();
    Voyager.mockClear();
  });

  test("renders supergraph view by default", () => {
    render(
      <VoyagerPanel
        supergraphSDL="type Query { users: [User] orders: [Order] } type User { id: ID } type Order { id: ID }"
        subgraphsMap={subgraphsMap}
        schemas={schemas}
        typeSources={typeSources}
      />,
    );

    expect(screen.getByText("Supergraph")).toBeInTheDocument();
    expect(screen.getByText("Per-Subgraph")).toBeInTheDocument();
    expect(sdlToSchema).toHaveBeenCalledWith(
      expect.stringContaining("type Query"),
    );
    expect(Voyager).toHaveBeenCalled();
  });

  test("switches to per-subgraph view and shows dropdown", async () => {
    render(
      <VoyagerPanel
        supergraphSDL="type Query { users: [User] orders: [Order] } type User { id: ID } type Order { id: ID }"
        subgraphsMap={subgraphsMap}
        schemas={schemas}
        typeSources={typeSources}
      />,
    );

    fireEvent.click(screen.getByText("Per-Subgraph"));

    await waitFor(() => {
      expect(screen.getByLabelText("Select subgraph")).toBeInTheDocument();
    });

    const select = screen.getByLabelText("Select subgraph");
    expect(select.value).toBe("schema-1");
    expect(select).toHaveTextContent("Users");
    expect(select).toHaveTextContent("Orders");
  });

  test("changes selected subgraph in per-subgraph view", async () => {
    render(
      <VoyagerPanel
        supergraphSDL="type Query { users: [User] orders: [Order] } type User { id: ID } type Order { id: ID }"
        subgraphsMap={subgraphsMap}
        schemas={schemas}
        typeSources={typeSources}
      />,
    );

    fireEvent.click(screen.getByText("Per-Subgraph"));

    await waitFor(() => {
      expect(screen.getByLabelText("Select subgraph")).toBeInTheDocument();
    });

    const select = screen.getByLabelText("Select subgraph");
    fireEvent.change(select, { target: { value: "schema-2" } });

    expect(sdlToSchema).toHaveBeenCalledWith(
      expect.stringContaining("type Order"),
    );
  });

  test("shows empty state when no SDL is available", () => {
    render(
      <VoyagerPanel
        supergraphSDL=""
        subgraphsMap={new Map()}
        schemas={[]}
        typeSources={{}}
      />,
    );

    expect(
      screen.getByText("No supergraph available. Generate subgraphs first."),
    ).toBeInTheDocument();
    expect(Voyager).not.toHaveBeenCalled();
  });

  test("renders color legend in supergraph view", () => {
    render(
      <VoyagerPanel
        supergraphSDL="type Query { users: [User] } type User { id: ID }"
        subgraphsMap={subgraphsMap}
        schemas={schemas}
        typeSources={typeSources}
      />,
    );

    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Orders")).toBeInTheDocument();
  });

  test("hides legend in per-subgraph view", async () => {
    render(
      <VoyagerPanel
        supergraphSDL="type Query { users: [User] } type User { id: ID }"
        subgraphsMap={subgraphsMap}
        schemas={schemas}
        typeSources={typeSources}
      />,
    );

    fireEvent.click(screen.getByText("Per-Subgraph"));

    await waitFor(() => {
      expect(screen.queryByLabelText("Select subgraph")).toBeInTheDocument();
    });

    // In per-subgraph mode the legend container should not be present
    const legend = document.querySelector(".voyager-legend");
    expect(legend).toBeNull();
  });
});
