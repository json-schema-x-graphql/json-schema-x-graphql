/**
 * Integration tests for the Visualize tab and Voyager panel lazy loading
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../App";

// Mock graphql-voyager so we don't bundle its heavy deps in tests
jest.mock("graphql-voyager", () => {
  return {
    Voyager: jest.fn(() => <div data-testid="mock-voyager">Mock Voyager</div>),
    sdlToSchema: jest.fn((sdl) => ({ __mockSchema: true, sdl })),
    voyagerIntrospectionQuery: jest.fn(() => "{ __schema { types { name } } }"),
  };
});

// Mock react-split-pane to avoid layout issues in jsdom
jest.mock("react-split-pane", () => {
  return function SplitPane({ children }) {
    return <div>{children}</div>;
  };
});

describe("Voyager Integration", () => {
  test("App renders Preview and Visualize tabs", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Preview")).toBeInTheDocument();
      expect(screen.getByText("Visualize")).toBeInTheDocument();
    });
  });

  test("clicking Visualize tab switches to voyager panel", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Visualize")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Visualize"));

    await waitFor(() => {
      expect(screen.getByText("Supergraph")).toBeInTheDocument();
      expect(screen.getByText("Per-Subgraph")).toBeInTheDocument();
    });
  });

  test("clicking back to Preview tab restores editor view", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Visualize")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Visualize"));
    await waitFor(() => {
      expect(screen.getByText("Supergraph")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Preview"));
    await waitFor(() => {
      expect(screen.queryByText("Supergraph")).not.toBeInTheDocument();
    });
  });
});
