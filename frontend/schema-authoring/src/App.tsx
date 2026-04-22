/**
 * Main Application Component
 *
 * This is the root component for the JSON Schema Authoring UI.
 * It provides a split-pane editor interface with live conversion and validation.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useAppStore } from "./store/app-store";
import { converterManager } from "./converters/converter-manager";
import { EditorPanel, Toolbar, ErrorPanel, StatusBar, SettingsPanel } from "./components";
import type { ValidationError } from "./types";
import { getTemplateNames, getTemplate, getDefaultTemplate } from "./lib/templates";

export function App() {
  const mode = useAppStore((state) => state.mode);
  const theme = useAppStore((state) => state.settings.theme);
  const autoConvert = useAppStore((state) => state.settings.autoConvert);
  const autoValidate = useAppStore((state) => state.settings.autoValidate);

  const jsonSchemaContent = useAppStore((state) => state.jsonSchemaEditor.content);
  const graphQLContent = useAppStore((state) => state.graphqlEditor.content);
  const validationResult = useAppStore((state) => state.validationResult);
  const isConverting = useAppStore((state) => state.isConverting);

  const setJsonSchemaContent = useAppStore((state) => state.setJsonSchemaContent);
  const setGraphQLContent = useAppStore((state) => state.setGraphQLContent);
  const convertJsonToGraphQL = useAppStore((state) => state.convertJsonToGraphQL);
  const convertGraphQLToJson = useAppStore((state) => state.convertGraphQLToJson);
  const validateJsonSchema = useAppStore((state) => state.validateJsonSchema);
  const validateGraphQL = useAppStore((state) => state.validateGraphQL);

  const [showSettings, setShowSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Split-pane state (resizable editors) - persisted to store and keyboard-accessible
  // Read initial persisted position from the app store and keep a setter to persist changes.
  const storeDividerPosition = useAppStore((s) => s.settings?.dividerPosition ?? 50);
  const storeSetDividerPosition = useAppStore((s) => s.setDividerPosition);
  const [dividerPosition, setDividerPosition] = useState<number>(storeDividerPosition);
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Ensure local state follows persisted store when it changes (e.g., restored from storage)
  useEffect(() => {
    if (typeof storeDividerPosition === "number" && storeDividerPosition !== dividerPosition) {
      setDividerPosition(storeDividerPosition);
    }
  }, [storeDividerPosition]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.min(90, Math.max(10, (x / rect.width) * 100));
      setDividerPosition(pct);
    };

    const onMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        // Persist the last position to the store (rounded)
        try {
          storeSetDividerPosition(Math.round(dividerPosition));
        } catch {
          // best-effort persistence; swallow errors so UI is not blocked
          // console.debug('Persist divider failed', err);
        }
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    // Recreate handlers when dividerPosition or the store setter changes
  }, [dividerPosition, storeSetDividerPosition]);

  // Load default template on first mount if editors are empty
  useEffect(() => {
    if (!jsonSchemaContent && !graphQLContent) {
      const defaultContent = getDefaultTemplate();
      setJsonSchemaContent(defaultContent);
    }
  }, []);

  // Initialize converters on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check converter availability
        const status = await converterManager.getEngineStatus();
        console.log("Converter Status:", status);

        // Initialize WASM converter (optional, will auto-init on first use)
        if (status.wasm.available) {
          console.log("✓ WASM converter ready");
        } else if (status.wasm.loading) {
          console.log("⏳ WASM converter loading...");
        } else {
          console.warn("⚠️ WASM converter not available:", status.wasm.error);
        }

        if (status.node.available) {
          console.log("✓ Node converter ready");
        } else {
          console.warn("⚠️ Node converter not available:", status.node.error);
        }
      } catch (error) {
        console.error("Failed to initialize converters:", error);
      }
    };

    initializeApp();
  }, []);

  // Apply theme to root element
  useEffect(() => {
    const isDark = theme === "vs-dark" || theme === "hc-black";
    document.documentElement.classList.toggle("dark", isDark);
  }, [theme]);

  // Auto-convert when content changes
  useEffect(() => {
    if (!autoConvert || isConverting) return;

    const timer = setTimeout(async () => {
      if (mode === "json-to-graphql" && jsonSchemaContent.trim()) {
        try {
          await convertJsonToGraphQL();
        } catch (error) {
          console.error("Auto-conversion failed:", error);
        }
      } else if (mode === "graphql-to-json" && graphQLContent.trim()) {
        try {
          await convertGraphQLToJson();
        } catch (error) {
          console.error("Auto-conversion failed:", error);
        }
      }
    }, 500); // Debounce auto-conversion

    return () => clearTimeout(timer);
  }, [
    jsonSchemaContent,
    graphQLContent,
    autoConvert,
    mode,
    isConverting,
    convertJsonToGraphQL,
    convertGraphQLToJson,
  ]);

  // Auto-validate when auto-validate is enabled
  useEffect(() => {
    if (!autoValidate) return;

    const timer = setTimeout(async () => {
      try {
        if (mode === "json-to-graphql") {
          await validateJsonSchema();
        } else {
          await validateGraphQL();
        }
      } catch (error) {
        console.error("Auto-validation failed:", error);
      }
    }, 800); // Debounce validation slightly longer

    return () => clearTimeout(timer);
  }, [jsonSchemaContent, graphQLContent, autoValidate, mode, validateJsonSchema, validateGraphQL]);

  // Handle JSON Schema content changes
  const handleJsonSchemaChange = useCallback(
    (value: string) => {
      setJsonSchemaContent(value);
    },
    [setJsonSchemaContent],
  );

  // Handle GraphQL content changes
  const handleGraphQLChange = useCallback(
    (value: string) => {
      setGraphQLContent(value);
    },
    [setGraphQLContent],
  );

  // Handle error jump-to-location
  const handleJumpToError = useCallback(
    (error: ValidationError) => {
      // Determine which editor to focus based on error source
      const isJsonSchemaError = error.source?.includes("json") || mode === "json-to-graphql";

      // TODO: Implement actual jump-to-line in Monaco editor
      // For now, just log the action
      console.log(`Jump to ${isJsonSchemaError ? "JSON Schema" : "GraphQL"} error:`, {
        line: error.line,
        column: error.column,
        message: error.message,
      });

      // You can add Monaco editor jump logic here when editor refs are available
    },
    [mode],
  );

  // Handle template selection
  const handleTemplateSelect = useCallback(
    (templateKey: string) => {
      const template = getTemplate(templateKey);
      if (template) {
        setJsonSchemaContent(template.content);
        setShowTemplates(false);
      }
    },
    [setJsonSchemaContent],
  );

  // Get errors for each editor
  const jsonSchemaErrors =
    validationResult?.errors.filter(
      (e) => e.source?.includes("json") || mode === "json-to-graphql",
    ) || [];

  const graphQLErrors =
    validationResult?.errors.filter(
      (e) => e.source?.includes("graphql") || mode === "graphql-to-json",
    ) || [];

  const templates = getTemplateNames();
  const templatesByCategory = templates.reduce(
    (acc, t) => {
      if (!acc[t.category]) acc[t.category] = [];
      acc[t.category].push(t);
      return acc;
    },
    {} as Record<string, typeof templates>,
  );

  return (
    <div className="app-container flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Toolbar */}
      <Toolbar
        onSettingsClick={() => setShowSettings(true)}
        onExportClick={() => console.log("Export clicked")}
      />

      {/* Template Selector Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Choose a Template
              </h2>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {Object.entries(templatesByCategory).map(([category, items]) => (
                <div key={category} className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map((template) => (
                      <button
                        key={template.key}
                        onClick={() => handleTemplateSelect(template.key)}
                        className="text-left p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <div className="font-medium text-gray-900 dark:text-white mb-1">
                          {template.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {template.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area - Split Editor Layout */}
      <main className="flex-1 flex overflow-hidden">
        <div ref={containerRef} className="flex-1 flex relative" style={{ minHeight: 0 }}>
          {/* Left Panel: JSON Schema Editor (resizable) */}
          <div
            className="flex flex-col border-r border-gray-200 dark:border-gray-700 transition-all"
            style={{ width: `${dividerPosition}%`, minWidth: "10%" }}
          >
            <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {mode === "json-to-graphql"
                  ? "JSON Schema Input"
                  : "JSON Schema Output (Read-only)"}
              </h3>
              <button
                onClick={() => setShowTemplates(true)}
                className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                title="Load a template"
              >
                📄 Templates
              </button>
            </div>
            <EditorPanel
              mode="jsonschema"
              value={jsonSchemaContent}
              onChange={handleJsonSchemaChange}
              errors={jsonSchemaErrors}
              readOnly={mode === "graphql-to-json"}
              className="h-full"
            />
          </div>

          {/* Resize Divider */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize editor panes"
            tabIndex={0}
            aria-valuemin={10}
            aria-valuemax={90}
            aria-valuenow={Math.round(dividerPosition)}
            className="w-2 cursor-col-resize bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 z-20 focus:outline-none focus:ring-2 focus:ring-primary-500"
            onMouseDown={(e) => {
              isDraggingRef.current = true;
              document.body.style.cursor = "col-resize";
              document.body.style.userSelect = "none";
              e.preventDefault();
            }}
            onKeyDown={(e) => {
              // Keyboard controls for accessibility:
              // ArrowLeft / ArrowDown -> move left by small step
              // ArrowRight / ArrowUp -> move right by small step
              // Shift + arrow -> larger step
              // Home -> min, End -> max
              const step = e.shiftKey ? 5 : 2;
              if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                e.preventDefault();
                const next = Math.max(10, Math.min(90, dividerPosition - step));
                setDividerPosition(next);
                try {
                  storeSetDividerPosition(Math.round(next));
                } catch {}
              } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                e.preventDefault();
                const next = Math.max(10, Math.min(90, dividerPosition + step));
                setDividerPosition(next);
                try {
                  storeSetDividerPosition(Math.round(next));
                } catch {}
              } else if (e.key === "Home") {
                e.preventDefault();
                setDividerPosition(10);
                try {
                  storeSetDividerPosition(10);
                } catch {}
              } else if (e.key === "End") {
                e.preventDefault();
                setDividerPosition(90);
                try {
                  storeSetDividerPosition(90);
                } catch {}
              }
            }}
            style={{ height: "100%" }}
            data-testid="split-resizer"
          >
            <div className="h-full w-1 mx-auto bg-gray-200 dark:bg-gray-700 rounded" />
          </div>

          {/* Right Panel: GraphQL SDL Editor (resizable) */}
          <div
            className="flex-1 flex flex-col transition-all"
            style={{ width: `calc(${100 - dividerPosition}% - 2px)` }}
          >
            <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {mode === "graphql-to-json"
                  ? "GraphQL SDL Input"
                  : "GraphQL SDL Output (Read-only)"}
              </h3>
            </div>
            <EditorPanel
              mode="graphql"
              value={graphQLContent}
              onChange={handleGraphQLChange}
              errors={graphQLErrors}
              readOnly={mode === "json-to-graphql"}
              className="h-full"
            />
          </div>
        </div>
      </main>

      {/* Error Panel (Collapsible) */}
      <ErrorPanel onJumpToError={handleJumpToError} maxHeight="20rem" />

      {/* Status Bar */}
      <StatusBar />

      {/* Settings Modal */}
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

export default App;
