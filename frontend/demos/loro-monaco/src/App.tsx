import { useState, useEffect, useCallback } from "react";
import { MonacoEditor } from "./MonacoEditor";
import { ConverterSettingsPanel } from "./ConverterSettingsPanel";
import { ErrorBanner, StatusBadge, KeyboardHint } from "./UIComponents";
import { useEditorStore as useStore } from "./store";
import {
  convertJsonSchemaToGraphQL,
  convertGraphQLToJsonSchema,
  formatOutput,
} from "./converter-api";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

const App = () => {
  const {
    loroDoc,
    jsonSchema,
    graphqlSdl,
    connectedUsers,
    connectionStatus,
    isConverting,
    options,
    lastConversion,
    errors,
    initializeLoro,
    disconnectLoro,
    addError,
    setJsonSchema,
    setGraphqlSdl,
    activeEditor,
    setActiveEditor,
    isAutoSyncEnabled,
    toggleAutoSync,
  } = useStore();

  const [docId, setDocId] = useState("loro-collaboration-doc");
  const [username, setUsername] = useState(
    `User-${Math.random().toString(36).substring(7)}`,
  );
  const [isConnected, setIsConnected] = useState(false);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    // Load theme preference from localStorage
    const saved = localStorage.getItem("theme-preference");
    return saved ? saved === "dark" : true;
  });

  // Resize state
  const [leftPaneWidth, setLeftPaneWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth =
          (mouseMoveEvent.clientX / document.body.offsetWidth) * 100;
        if (newWidth >= 20 && newWidth <= 80) {
          setLeftPaneWidth(newWidth);
        }
      }
    },
    [isResizing],
  );

  const handleConvert = useCallback(
    async (direction: "json-to-graphql" | "graphql-to-json") => {
      const startTime = Date.now();
      console.log(`🔄 Starting conversion: ${direction}`);
      useStore.setState({ isConverting: true, errors: [] });

      try {
        if (direction === "json-to-graphql") {
          const result = await convertJsonSchemaToGraphQL(jsonSchema, {
            validate: options.validate,
            includeDescriptions: options.includeDescriptions,
            preserveFieldOrder: options.preserveFieldOrder,
            federationVersion: options.federationVersion,
            includeFederationDirectives: options.includeFederationDirectives,
            namingConvention: options.namingConvention,
            idStrategy: options.idStrategy,
            outputFormat: options.outputFormat,
            failOnWarning: options.failOnWarning,
          });

          if (!result.success) {
            const errorMsg =
              result.diagnostics[0]?.message || "Conversion failed";
            addError(errorMsg);
            useStore.setState({ isConverting: false });
            return;
          }

          const graphqlOutput = formatOutput(
            result.output,
            options.outputFormat,
            options.prettyPrint,
          );

          if (loroDoc) {
            const graphqlText = loroDoc.getText("graphqlSdl");
            loroDoc.commit();
            graphqlText.delete(0, graphqlText.length);
            graphqlText.insert(0, graphqlOutput);
            loroDoc.commit();
          }

          const duration = Date.now() - startTime;
          useStore.setState({
            lastConversion: {
              direction,
              duration,
              timestamp: startTime,
              outputSize: graphqlOutput.length,
            },
          });
        } else {
          const result = await convertGraphQLToJsonSchema(graphqlSdl, {
            validate: options.validate,
            federationVersion: options.federationVersion,
          });

          if (!result.success) {
            const errorMsg =
              result.diagnostics[0]?.message || "Conversion failed";
            addError(errorMsg);
            useStore.setState({ isConverting: false });
            return;
          }

          const jsonSchemaOutput = formatOutput(
            result.output,
            "SDL",
            options.prettyPrint,
          );

          if (loroDoc) {
            const jsonText = loroDoc.getText("jsonSchema");
            loroDoc.commit();
            jsonText.delete(0, jsonText.length);
            jsonText.insert(0, jsonSchemaOutput);
            loroDoc.commit();
          }

          const duration = Date.now() - startTime;
          useStore.setState({
            lastConversion: {
              direction,
              duration,
              timestamp: startTime,
              outputSize: jsonSchemaOutput.length,
            },
          });
        }
      } catch (error) {
        console.error(`❌ Conversion failed:`, error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        addError(errorMessage);
      } finally {
        useStore.setState({ isConverting: false });
      }
    },
    [jsonSchema, graphqlSdl, loroDoc, options, addError],
  );

  // Save theme preference
  useEffect(() => {
    localStorage.setItem("theme-preference", isDarkTheme ? "dark" : "light");
    if (isDarkTheme) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkTheme]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+K or Cmd+K for settings
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        setShowSettings(!showSettings);
      }
      // Ctrl+Enter or Cmd+Enter for convert (JSON->GraphQL)
      else if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        if (!isConverting && activeEditor === "json") {
          handleConvert("json-to-graphql");
        }
      }
      // Escape to close modals
      else if (event.key === "Escape") {
        if (showSettings) setShowSettings(false);
        if (showConnectionDialog) setShowConnectionDialog(false);
      }
      // Ctrl+T or Cmd+T for theme toggle
      else if ((event.ctrlKey || event.metaKey) && event.key === "t") {
        event.preventDefault();
        setIsDarkTheme(!isDarkTheme);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSettings, showConnectionDialog, isConverting, activeEditor, isDarkTheme, handleConvert]);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const handleConnect = useCallback(() => {
    if (docId && username) {
      initializeLoro(docId, "ws://localhost:8080", username);
      setIsConnected(true);
      setShowConnectionDialog(false);
    }
  }, [docId, username, initializeLoro]);

  const handleDisconnect = useCallback(() => {
    disconnectLoro();
    setIsConnected(false);
  }, [disconnectLoro]);

  useEffect(() => {
    if (isConnected) {
      setShowConnectionDialog(false);
    }
  }, [isConnected]);

  // Auto-sync JSON -> GraphQL
  useEffect(() => {
    if (!isAutoSyncEnabled || activeEditor !== "json" || isConverting) return;
    const timer = setTimeout(() => {
      handleConvert("json-to-graphql");
    }, 1000);
    return () => clearTimeout(timer);
  }, [
    jsonSchema,
    isAutoSyncEnabled,
    activeEditor,
    isConverting,
    handleConvert,
  ]);

  // Auto-sync GraphQL -> JSON
  useEffect(() => {
    if (!isAutoSyncEnabled || activeEditor !== "graphql" || isConverting)
      return;
    const timer = setTimeout(() => {
      handleConvert("graphql-to-json");
    }, 1000);
    return () => clearTimeout(timer);
  }, [
    graphqlSdl,
    isAutoSyncEnabled,
    activeEditor,
    isConverting,
    handleConvert,
  ]);

  return (
    <div className={`flex flex-col h-screen font-sans ${isDarkTheme ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}>
      <header className={`flex items-center justify-between p-2 ${isDarkTheme ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-300"} border-b`}>
        <h1 className="text-xl font-bold">JSON Schema ⇋ GraphQL CRDT Demo</h1>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setIsDarkTheme(!isDarkTheme)}
            className={`px-3 py-2 rounded text-sm ${isDarkTheme ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"}`}
            title="Toggle theme (Ctrl+T)"
          >
            {isDarkTheme ? "🌙" : "☀️"}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
            title="Converter Options (Ctrl+K)"
          >
            ⚙️ Settings
          </button>
          {isConnected ? (
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={() => setShowConnectionDialog(true)}
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
            >
              Connect
            </button>
          )}
        </div>
      </header>

      {errors.length > 0 && (
        <ErrorBanner errors={errors} onClear={() => useStore.setState({ errors: [] })} />
      )}

      <ConverterSettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {showConnectionDialog && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className={`p-6 rounded-lg shadow-xl ${isDarkTheme ? "bg-gray-800" : "bg-white"}`}>
            <h2 className="mb-4 text-2xl font-bold">Connect to a session</h2>
            <input
              type="text"
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
              placeholder="Document ID"
              className={`w-full p-2 mb-4 rounded ${isDarkTheme ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900"}`}
            />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className={`w-full p-2 mb-4 rounded ${isDarkTheme ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900"}`}
            />
            <button
              onClick={handleConnect}
              className="w-full px-4 py-2 bg-green-600 rounded hover:bg-green-700"
            >
              Connect
            </button>
          </div>
        </div>
      )}

      <main className={`flex flex-1 overflow-hidden gap-0 md:gap-0 ${isDarkTheme ? "" : ""}`}>
        <div
          style={{ width: `${leftPaneWidth}%` }}
          className={`border-r ${isDarkTheme ? "border-gray-700" : "border-gray-300"} hidden md:flex flex-col`}
          onClick={() => {
            if (activeEditor !== "json") setActiveEditor("json");
          }}
        >
          <MonacoEditor
            value={jsonSchema}
            onChange={(val) => {
              if (activeEditor !== "json") setActiveEditor("json");
              setJsonSchema(val);
            }}
            loroDoc={loroDoc}
            textKey="jsonSchema"
            language="json"
          />
        </div>
        <div
          className="flex flex-col items-center justify-center px-2 bg-gray-800 cursor-col-resize hover:bg-gray-700 transition-colors z-10 select-none"
          onMouseDown={startResizing}
          title="Drag to resize"
        >
          <div className="w-1 h-4 mb-2 bg-gray-600 rounded-full opacity-50" />
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => handleConvert("json-to-graphql")}
            disabled={isConverting || !isConnected}
            className={cn(
              "px-4 py-2 my-2 text-lg font-semibold text-white bg-indigo-600 rounded-md shadow-md",
              "hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75",
              "disabled:bg-gray-500 disabled:cursor-not-allowed",
            )}
          >
            {isConverting && lastConversion?.direction === "json-to-graphql"
              ? "Converting..."
              : "→"}
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => handleConvert("graphql-to-json")}
            disabled={isConverting || !isConnected}
            className={cn(
              "px-4 py-2 my-2 text-lg font-semibold text-white bg-purple-600 rounded-md shadow-md",
              "hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75",
              "disabled:bg-gray-500 disabled:cursor-not-allowed",
            )}
          >
            {isConverting && lastConversion?.direction === "graphql-to-json"
              ? "Converting..."
              : "←"}
          </button>
          <div className="w-1 h-4 mt-2 bg-gray-600 rounded-full opacity-50" />
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={toggleAutoSync}
            className={cn(
              "px-2 py-1 my-2 text-xs font-semibold text-white rounded-md shadow-md",
              isAutoSyncEnabled
                ? "bg-green-600 hover:bg-green-700"
                : "bg-gray-500 hover:bg-gray-600",
            )}
            title="Toggle Auto-Sync"
          >
            {isAutoSyncEnabled ? "Sync On" : "Sync Off"}
          </button>
        </div>
        <div
          className="flex-1 min-w-0"
          onClick={() => {
            if (activeEditor !== "graphql") setActiveEditor("graphql");
          }}
        >
          {/* GraphQL SDL Editor using Monaco */}
          <MonacoEditor
            value={graphqlSdl}
            onChange={(val) => {
              if (activeEditor !== "graphql") setActiveEditor("graphql");
              setGraphqlSdl(val || "");
            }}
            language="graphql"
            isDarkTheme={isDarkTheme}
          />
        </div>
      </main>
      <footer className={`p-3 text-sm ${isDarkTheme ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-300"} border-t flex flex-col md:flex-row md:items-center md:justify-between gap-2`}>
        <div className="flex flex-col md:flex-row gap-4 flex-wrap">
          <StatusBadge label={`Status: ${connectionStatus.status}`} variant={connectionStatus.status === "connected" ? "success" : "warning"} />
          <span className="text-xs">Users: {connectedUsers.length}</span>
          {lastConversion && (
            <span className="text-xs">
              Last conversion: {lastConversion.duration}ms, {lastConversion.outputSize} bytes
            </span>
          )}
        </div>
        <div className="hidden md:flex gap-2 text-xs">
          <KeyboardHint text="Settings" shortcut="Ctrl+K" />
          <KeyboardHint text="Convert" shortcut="Ctrl+⏎" />
          <KeyboardHint text="Theme" shortcut="Ctrl+T" />
        </div>
      </footer>
    </div>
  );
};

export { App };
export default App;
