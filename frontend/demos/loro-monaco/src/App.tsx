import { useState, useEffect, useCallback } from "react";
import { MonacoEditor } from "./MonacoEditor";
import { GraphQLVisualEditor } from "./GraphQLVisualEditor";
import { useEditorStore as useStore } from "./store";
import {
  jsonSchemaToGraphQL,
  graphqlToJsonSchema,
} from "./converter-integration";
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

  const handleConvert = useCallback(
    async (direction: "json-to-graphql" | "graphql-to-json") => {
      const startTime = Date.now();
      console.log(`🔄 Starting conversion: ${direction}`);
      useStore.setState({ isConverting: true, errors: [] });

      try {
        if (direction === "json-to-graphql") {
          const graphqlOutput = await jsonSchemaToGraphQL(jsonSchema);

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
          const jsonSchemaOutput = await graphqlToJsonSchema(graphqlSdl);

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
        alert(`Conversion Failed: ${errorMessage}`);
      } finally {
        useStore.setState({ isConverting: false });
      }
    },
    [jsonSchema, graphqlSdl, loroDoc, options, addError],
  );

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
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans">
      <header className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700">
        <h1 className="text-xl font-bold">JSON Schema ⇋ GraphQL CRDT Demo</h1>
        <div>
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

      {showConnectionDialog && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-6 bg-gray-800 rounded-lg shadow-xl">
            <h2 className="mb-4 text-2xl font-bold">Connect to a session</h2>
            <input
              type="text"
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
              placeholder="Document ID"
              className="w-full p-2 mb-4 bg-gray-700 rounded"
            />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full p-2 mb-4 bg-gray-700 rounded"
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

      <main className="flex flex-1 overflow-hidden">
        <div
          style={{ width: `${leftPaneWidth}%` }}
          className="border-r border-gray-700"
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
          <GraphQLVisualEditor
            value={graphqlSdl}
            onChange={(val) => {
              if (activeEditor !== "graphql") setActiveEditor("graphql");
              setGraphqlSdl(val);
            }}
            loroDoc={loroDoc}
            textKey="graphqlSdl"
          />
        </div>
      </main>
      <footer className="p-2 text-sm bg-gray-800 border-t border-gray-700">
        Status: {connectionStatus.status} | Users: {connectedUsers.length} | Doc
        ID: {docId}
        {lastConversion && (
          <span className="ml-4">
            Last conversion: {lastConversion.duration}ms,{" "}
            {lastConversion.outputSize} bytes
          </span>
        )}
        {errors.length > 0 && (
          <span className="ml-4 text-red-400">Error: {errors[0]}</span>
        )}
      </footer>
    </div>
  );
};

export { App };
export default App;
