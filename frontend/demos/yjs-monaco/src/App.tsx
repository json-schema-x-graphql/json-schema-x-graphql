import React, { useState, useEffect } from "react";
import { MonacoEditor } from "./MonacoEditor";
import { GraphQLVisualEditor } from "./GraphQLVisualEditor";
import { useEditorStore } from "./store";
import {
  jsonSchemaToGraphQL,
  graphqlToJsonSchema,
} from "./converter-integration";
import { clsx } from "clsx";

export const App: React.FC = () => {
  const {
    ydoc,
    provider,
    jsonSchema,
    graphqlSdl,
    currentUser,
    connectedUsers,
    connectionStatus,
    activeEditor: _activeEditor,
    isConverting,
    showSettings,
    options,
    lastConversion,
    errors,
    initializeYjs,
    disconnectYjs,
    setActiveEditor: _setActiveEditor,
    setOptions,
    clearErrors,
    toggleSettings,
  } = useEditorStore();

  const [roomName, setRoomName] = useState("default-room");
  const [username, setUsername] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [showConnectionDialog, setShowConnectionDialog] = useState(true);

  useEffect(() => {
    setIsConnected(connectionStatus.status === "connected");
  }, [connectionStatus.status]);

  const handleConnect = () => {
    if (!username.trim()) {
      alert("Please enter a username");
      return;
    }
    initializeYjs(roomName, username);
    setShowConnectionDialog(false);
  };

  const handleDisconnect = () => {
    disconnectYjs();
    setShowConnectionDialog(true);
    setIsConnected(false);
  };

  const handleConvert = async (
    direction: "json-to-graphql" | "graphql-to-json",
  ) => {
    const startTime = Date.now();

    try {
      if (direction === "json-to-graphql") {
        // Convert JSON Schema to GraphQL
        const graphqlOutput = jsonSchemaToGraphQL(jsonSchema, {
          validate: options.validate,
          includeDescriptions: options.includeDescriptions,
          preserveFieldOrder: options.preserveFieldOrder,
          federationVersion:
            options.federationVersion === "1"
              ? 1
              : options.federationVersion === "2"
                ? 2
                : null,
        });

        // Update the GraphQL SDL in the Yjs document
        if (ydoc) {
          const graphqlText = ydoc.getText("graphqlSdl");
          ydoc.transact(() => {
            graphqlText.delete(0, graphqlText.length);
            graphqlText.insert(0, graphqlOutput);
          });
        }

        // Record conversion stats
        const duration = Date.now() - startTime;
        console.log(`✅ Converted JSON Schema to GraphQL in ${duration}ms`);
        console.log(`Generated ${graphqlOutput.length} bytes of GraphQL SDL`);
      } else {
        // Convert GraphQL to JSON Schema
        const jsonSchemaOutput = graphqlToJsonSchema(graphqlSdl, {
          validate: options.validate,
          includeDescriptions: options.includeDescriptions,
          preserveFieldOrder: options.preserveFieldOrder,
        });

        // Update the JSON Schema in the Yjs document
        if (ydoc) {
          const jsonText = ydoc.getText("jsonSchema");
          ydoc.transact(() => {
            jsonText.delete(0, jsonText.length);
            jsonText.insert(0, jsonSchemaOutput);
          });
        }

        // Record conversion stats
        const duration = Date.now() - startTime;
        console.log(`✅ Converted GraphQL to JSON Schema in ${duration}ms`);
        console.log(
          `Generated ${jsonSchemaOutput.length} bytes of JSON Schema`,
        );
      }
    } catch (error) {
      console.error(`❌ Conversion failed:`, error);
      alert(
        `Conversion failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Yjs + Monaco Editor
          </h1>
          <span className="text-sm text-gray-400">JSON Schema ↔ GraphQL</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                "w-2 h-2 rounded-full",
                connectionStatus.status === "connected" && "bg-green-500",
                connectionStatus.status === "connecting" &&
                  "bg-yellow-500 animate-pulse",
                connectionStatus.status === "disconnected" && "bg-red-500",
              )}
            />
            <span className="text-sm text-gray-300">
              {connectionStatus.status === "connected" &&
                `Connected (${connectionStatus.peers} peers)`}
              {connectionStatus.status === "connecting" && "Connecting..."}
              {connectionStatus.status === "disconnected" && "Disconnected"}
            </span>
          </div>

          {/* Connected Users */}
          {isConnected && connectedUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Users:</span>
              <div className="flex -space-x-2">
                {connectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="w-8 h-8 rounded-full border-2 border-gray-800 flex items-center justify-center text-xs font-semibold text-white"
                    style={{ backgroundColor: user.color }}
                    title={user.name}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings Button */}
          <button
            onClick={toggleSettings}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
          >
            ⚙️ Settings
          </button>

          {/* Connect/Disconnect Button */}
          {isConnected ? (
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-medium transition-colors"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={() => setShowConnectionDialog(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors"
            >
              Connect
            </button>
          )}
        </div>
      </header>

      {/* Connection Dialog */}
      {showConnectionDialog && !isConnected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 shadow-2xl border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">
              Connect to Collaboration Room
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  onKeyPress={(e) => e.key === "Enter" && handleConnect()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Room Name
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="default-room"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  onKeyPress={(e) => e.key === "Enter" && handleConnect()}
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleConnect}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition-colors"
                >
                  Connect
                </button>
                <button
                  onClick={() => setShowConnectionDialog(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md font-medium transition-colors"
                >
                  Cancel (Solo Mode)
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              💡 Use the same room name to collaborate with others in real-time
            </p>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed right-0 top-16 bottom-0 w-80 bg-gray-800 border-l border-gray-700 p-6 overflow-y-auto z-40 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Converter Settings</h3>
            <button
              onClick={toggleSettings}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={options.validate}
                onChange={(e) => setOptions({ validate: e.target.checked })}
                className="w-4 h-4 rounded bg-gray-700 border-gray-600"
              />
              <span className="text-sm">Validate schemas</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={options.includeDescriptions}
                onChange={(e) =>
                  setOptions({ includeDescriptions: e.target.checked })
                }
                className="w-4 h-4 rounded bg-gray-700 border-gray-600"
              />
              <span className="text-sm">Include descriptions</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={options.preserveFieldOrder}
                onChange={(e) =>
                  setOptions({ preserveFieldOrder: e.target.checked })
                }
                className="w-4 h-4 rounded bg-gray-700 border-gray-600"
              />
              <span className="text-sm">Preserve field order</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={options.prettyPrint}
                onChange={(e) => setOptions({ prettyPrint: e.target.checked })}
                className="w-4 h-4 rounded bg-gray-700 border-gray-600"
              />
              <span className="text-sm">Pretty print</span>
            </label>
            <div>
              <label className="block text-sm font-medium mb-2">
                Federation Version
              </label>
              <select
                value={options.federationVersion || ""}
                onChange={(e) =>
                  setOptions({
                    federationVersion: e.target.value
                      ? (e.target.value as "1" | "2")
                      : null,
                  })
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm"
              >
                <option value="">None</option>
                <option value="1">Federation v1</option>
                <option value="2">Federation v2</option>
              </select>
            </div>
          </div>

          {lastConversion && (
            <div className="mt-6 p-4 bg-gray-700 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Last Conversion</h4>
              <div className="text-xs text-gray-300 space-y-1">
                <div>Direction: {lastConversion.direction}</div>
                <div>Duration: {lastConversion.duration}ms</div>
                {lastConversion.typesConverted && (
                  <div>Types: {lastConversion.typesConverted}</div>
                )}
                {lastConversion.fieldsConverted && (
                  <div>Fields: {lastConversion.fieldsConverted}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Banner */}
      {errors.length > 0 && (
        <div className="bg-red-900 border-b border-red-700 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-red-300 font-medium">⚠️ Errors:</span>
              <span className="text-sm text-red-200">{errors[0]}</span>
            </div>
            <button
              onClick={clearErrors}
              className="text-red-300 hover:text-white text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content - Two Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* JSON Schema Editor - 1/3 width */}
        <div className="w-1/3 flex flex-col border-r border-gray-700">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
            <h2 className="text-sm font-semibold text-gray-300">JSON Schema</h2>
            <button
              onClick={() => handleConvert("json-to-graphql")}
              disabled={isConverting}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition-colors"
            >
              {isConverting ? "Converting..." : "Convert to GraphQL →"}
            </button>
          </div>
          <div className="flex-1">
            <MonacoEditor
              value={jsonSchema}
              language="json"
              ydoc={ydoc}
              provider={provider}
              textKey="jsonSchema"
              height="100%"
            />
          </div>
        </div>

        {/* GraphQL Visual Editor - 2/3 width */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
            <h2 className="text-sm font-semibold text-gray-300">
              GraphQL SDL (Visual Editor with Code View)
            </h2>
            <button
              onClick={() => handleConvert("graphql-to-json")}
              disabled={isConverting}
              className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition-colors"
            >
              {isConverting ? "Converting..." : "← Convert to JSON Schema"}
            </button>
          </div>
          <div className="flex-1">
            <GraphQLVisualEditor
              value={graphqlSdl}
              ydoc={ydoc}
              provider={provider}
              textKey="graphqlSdl"
              className="h-full"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-3 bg-gray-800 border-t border-gray-700 text-xs text-gray-400 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>👤 {currentUser.name}</span>
          {isConnected && <span>📡 Room: {roomName}</span>}
        </div>
        <div className="flex items-center gap-4">
          <span>Powered by Yjs + Monaco Editor</span>
          <a
            href="https://github.com/yjs/yjs"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-400 transition-colors"
          >
            Learn More →
          </a>
        </div>
      </footer>
    </div>
  );
};
