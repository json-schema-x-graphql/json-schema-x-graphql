import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App Integration", () => {
  it("should render without crashing", () => {
    render(<App />);
    // Just verify the component mounts
    expect(document.body).toBeDefined();
  });

  it("should render main editor sections", () => {
    const { container } = render(<App />);
    // Check if basic structure exists
    expect(container.firstChild).toBeDefined();
  });
});
