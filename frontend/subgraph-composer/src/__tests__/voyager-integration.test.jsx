/**
 * Integration tests for the Visualize tab and ERDiagram panel lazy loading
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../App";

describe("Visualize Integration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("App renders Preview tab and hides Visualize tab on first load", async () => {
    render(<App />);

    await waitFor(
      () => {
        expect(screen.getByText("Preview")).toBeInTheDocument();
        expect(screen.queryByText("Visualize")).not.toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  test("clicking Generate makes Visualize tab visible, and clicking it displays ER Diagram", async () => {
    render(<App />);

    // Select the first schema to open the editor and show the Generate button
    await waitFor(
      () => {
        const schemaItems = document.querySelectorAll(".schema-item-content");
        expect(schemaItems.length).toBeGreaterThan(0);
        fireEvent.click(schemaItems[0]);
      },
      { timeout: 5000 },
    );

    // Click generate to trigger supergraph composition
    await waitFor(
      () => {
        const generateBtn = screen.getByRole("button", { name: /generate/i });
        fireEvent.click(generateBtn);
      },
      { timeout: 5000 },
    );

    // Verify Visualize tab button appears
    await waitFor(
      () => {
        expect(screen.getByText("Visualize")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Click Visualize tab
    fireEvent.click(screen.getByText("Visualize"));

    // Verify ER Diagram Panel container is rendered
    await waitFor(
      () => {
        expect(screen.getByText("Diagram")).toBeInTheDocument();
        expect(screen.getByText("Mermaid")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  }, 15000);

  test("clicking back to Preview tab restores editor view", async () => {
    render(<App />);

    // Select the first schema to open the editor and show the Generate button
    await waitFor(
      () => {
        const schemaItems = document.querySelectorAll(".schema-item-content");
        expect(schemaItems.length).toBeGreaterThan(0);
        fireEvent.click(schemaItems[0]);
      },
      { timeout: 5000 },
    );

    // Click generate
    await waitFor(
      () => {
        const generateBtn = screen.getByRole("button", { name: /generate/i });
        fireEvent.click(generateBtn);
      },
      { timeout: 5000 },
    );

    await waitFor(
      () => {
        expect(screen.getByText("Visualize")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    fireEvent.click(screen.getByText("Visualize"));
    await waitFor(
      () => {
        expect(screen.getByText("Diagram")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    fireEvent.click(screen.getByText("Preview"));
    await waitFor(
      () => {
        expect(screen.queryByText("Diagram")).not.toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  }, 15000);
});
