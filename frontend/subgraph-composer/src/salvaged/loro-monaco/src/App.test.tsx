import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "./App";
import * as converterIntegration from "./converter-integration";
import { useEditorStore } from "./store";

// Mock child components to avoid Monaco/Canvas issues in JSDOM
vi.mock("./MonacoEditor", () => ({
  MonacoEditor: ({ value, onChange, textKey }: any) => (
    <div data-testid={`monaco-editor-${textKey}`}>
      <textarea
        data-testid={`textarea-${textKey}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
}));

vi.mock("./GraphQLVisualEditor", () => ({
  GraphQLVisualEditor: ({ value, onChange, textKey }: any) => (
    <div data-testid={`graphql-editor-${textKey}`}>
      <textarea
        data-testid={`textarea-${textKey}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
}));

// Mock converter integration
vi.mock("./converter-integration", () => ({
  jsonSchemaToGraphQL: vi.fn(),
  graphqlToJsonSchema: vi.fn(),
}));

// Mock Loro CRDT using the mock class we created
vi.mock("loro-crdt", async () => {
  const mocks = await import("./test/mocks");
  return {
    Loro: mocks.MockLoro,
  };
});

describe("App Integration", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    // Reset store state
    act(() => {
      useEditorStore.setState({
        loroDoc: null,
        connectionStatus: { status: "disconnected", peers: 0 },
        connectedUsers: [],
        isConverting: false,
        errors: [],
        isAutoSyncEnabled: false,
        lastConversion: null,
        // Reset inputs to avoid "dirty" state from previous tests if persistence kicks in
        jsonSchema: "{}",
        graphqlSdl: "",
      });
    });
  });

  it("renders correctly", () => {
    render(<App />);
    expect(screen.getByText(/JSON Schema ⇋ GraphQL CRDT Demo/i)).toBeInTheDocument();
  });

  it("allows connecting to a session", async () => {
    render(<App />);

    // Click connect in header
    const headerConnect = screen.getByText("Connect");
    fireEvent.click(headerConnect);

    // Check dialog appears
    expect(screen.getByText("Connect to a session")).toBeInTheDocument();

    // Fill inputs
    const docId = screen.getByPlaceholderText("Document ID");
    const username = screen.getByPlaceholderText("Username");

    fireEvent.change(docId, { target: { value: "test-doc" } });
    fireEvent.change(username, { target: { value: "Test User" } });

    // Click connect in dialog (it's the second Connect button in the DOM)
    const buttons = screen.getAllByText("Connect");
    fireEvent.click(buttons[buttons.length - 1]);

    // Verify connected state (Disconnect button appears)
    await waitFor(() => {
      expect(screen.getByText("Disconnect")).toBeInTheDocument();
    });

    // Dialog should be gone
    expect(screen.queryByText("Connect to a session")).not.toBeInTheDocument();

    // Status footer should update
    expect(screen.getByText(/Status: connected/i)).toBeInTheDocument();
  });

  it("handles JSON -> GraphQL conversion", async () => {
    const mockSdl = "type Test { id: String }";
    vi.mocked(converterIntegration.jsonSchemaToGraphQL).mockResolvedValue(mockSdl);

    render(<App />);

    // Connect first (buttons are disabled if not connected)
    fireEvent.click(screen.getByText("Connect"));
    const buttons = screen.getAllByText("Connect");
    fireEvent.click(buttons[buttons.length - 1]);

    // Click convert button (right arrow)
    const convertBtn = screen.getByText("→");
    expect(convertBtn).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(convertBtn);
    });

    expect(converterIntegration.jsonSchemaToGraphQL).toHaveBeenCalled();

    // Verify UI update (via the textarea mock)
    await waitFor(() => {
      const graphqlInput = screen.getByTestId("textarea-graphqlSdl") as HTMLTextAreaElement;
      expect(graphqlInput.value).toBe(mockSdl);
    });
  });

  it("handles GraphQL -> JSON conversion", async () => {
    const mockJson = '{"type": "object", "title": "Converted"}';
    vi.mocked(converterIntegration.graphqlToJsonSchema).mockResolvedValue(mockJson);

    render(<App />);

    // Connect
    fireEvent.click(screen.getByText("Connect"));
    const buttons = screen.getAllByText("Connect");
    fireEvent.click(buttons[buttons.length - 1]);

    // Click convert button (left arrow)
    const convertBtn = screen.getByText("←");

    await act(async () => {
      fireEvent.click(convertBtn);
    });

    expect(converterIntegration.graphqlToJsonSchema).toHaveBeenCalled();

    // Verify UI update
    await waitFor(() => {
      const jsonInput = screen.getByTestId("textarea-jsonSchema") as HTMLTextAreaElement;
      expect(jsonInput.value).toBe(mockJson);
    });
  });

  it("shows error when conversion fails", async () => {
    const errorMsg = "Parse Error";
    vi.mocked(converterIntegration.jsonSchemaToGraphQL).mockRejectedValue(new Error(errorMsg));

    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<App />);

    // Connect
    fireEvent.click(screen.getByText("Connect"));
    const buttons = screen.getAllByText("Connect");
    fireEvent.click(buttons[buttons.length - 1]);

    const convertBtn = screen.getByText("→");

    await act(async () => {
      fireEvent.click(convertBtn);
    });

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(expect.stringContaining(errorMsg));
      expect(screen.getByText(`Error: ${errorMsg}`)).toBeInTheDocument();
    });
  });

  it("toggles auto-sync state", () => {
    render(<App />);

    const syncButton = screen.getByTitle("Toggle Auto-Sync");
    expect(syncButton).toHaveTextContent("Sync Off");

    fireEvent.click(syncButton);
    expect(syncButton).toHaveTextContent("Sync On");

    fireEvent.click(syncButton);
    expect(syncButton).toHaveTextContent("Sync Off");
  });
});
