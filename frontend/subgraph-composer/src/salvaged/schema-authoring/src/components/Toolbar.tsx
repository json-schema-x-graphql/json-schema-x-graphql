/**
 * Toolbar Component
 *
 * Provides:
 * - Converter engine selection (auto/rust-wasm/node)
 * - Conversion direction toggle
 * - Action buttons (convert, validate, export, settings)
 * - Loading/status indicators
 */

import React, { useState } from "react";
import { useAppStore } from "../store/app-store";
import type { ConverterEngine, AppMode } from "../types";

export interface ToolbarProps {
  onSettingsClick?: () => void;
  onExportClick?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onSettingsClick,
  onExportClick,
}) => {
  const mode = useAppStore((state) => state.mode);
  const selectedEngine = useAppStore((state) => state.settings.converterEngine);
  const isConverting = useAppStore((state) => state.isConverting);
  const isValidating = useAppStore((state) => state.isValidating);
  const conversionResult = useAppStore((state) => state.conversionResult);
  const validationResult = useAppStore((state) => state.validationResult);

  const setConverterEngine = useAppStore((state) => state.setConverterEngine);
  const convertJsonToGraphQL = useAppStore(
    (state) => state.convertJsonToGraphQL,
  );
  const convertGraphQLToJson = useAppStore(
    (state) => state.convertGraphQLToJson,
  );
  const validateJsonSchema = useAppStore((state) => state.validateJsonSchema);
  const validateGraphQL = useAppStore((state) => state.validateGraphQL);
  const exportSchemas = useAppStore((state) => state.exportSchemas);
  const updateSettings = useAppStore((state) => state.updateSettings);

  const [showEngineMenu, setShowEngineMenu] = useState(false);

  const handleConvert = async () => {
    try {
      if (mode === "json-to-graphql") {
        await convertJsonToGraphQL();
      } else {
        await convertGraphQLToJson();
      }
    } catch (error) {
      console.error("Conversion failed:", error);
    }
  };

  const handleValidate = async () => {
    try {
      if (mode === "json-to-graphql") {
        await validateJsonSchema();
      } else {
        await validateGraphQL();
      }
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  const handleExport = async () => {
    try {
      const result = await exportSchemas("json");
      onExportClick?.();

      if (result) {
        // Trigger download
        const blob = new Blob([JSON.stringify(result, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `schema-export-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const handleEngineSelect = (engine: ConverterEngine) => {
    setConverterEngine(engine);
    setShowEngineMenu(false);
  };

  const handleDirectionToggle = () => {
    const newMode: AppMode =
      mode === "json-to-graphql" ? "graphql-to-json" : "json-to-graphql";
    updateSettings({ converterEngine: selectedEngine });
    // Note: The store doesn't expose setMode directly, so we'd need to add that
    // For now, this is a placeholder
    console.log("Toggle direction to:", newMode);
  };

  const getEngineIcon = (engine: ConverterEngine) => {
    switch (engine) {
      case "rust-wasm":
        return "⚡";
      case "node":
        return "🟢";
      case "auto":
        return "🤖";
    }
  };

  const getEngineLabel = (engine: ConverterEngine) => {
    switch (engine) {
      case "rust-wasm":
        return "WASM (Fast)";
      case "node":
        return "Node.js";
      case "auto":
        return "Auto";
    }
  };

  return (
    <header className="toolbar bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left section: Title and status */}
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              JSON Schema ↔ GraphQL
            </h1>

            {/* Loading indicator */}
            {(isConverting || isValidating) && (
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="animate-spin h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full" />
                <span>{isConverting ? "Converting..." : "Validating..."}</span>
              </div>
            )}

            {/* Success indicator */}
            {!isConverting && !isValidating && conversionResult?.success && (
              <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                <span>✓</span>
                <span>
                  Converted in {conversionResult.duration.toFixed(0)}ms via{" "}
                  {conversionResult.engine}
                </span>
              </div>
            )}

            {/* Validation status */}
            {validationResult && (
              <div
                className={`text-sm ${
                  validationResult.valid
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {validationResult.valid ? (
                  <span>✓ Schema valid</span>
                ) : (
                  <span>
                    ✗ {validationResult.errors.length} validation errors
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right section: Actions and controls */}
          <div className="flex items-center space-x-3">
            {/* Direction toggle */}
            <button
              onClick={handleDirectionToggle}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center space-x-2"
              title="Toggle conversion direction"
            >
              <span className="text-xs">
                {mode === "json-to-graphql" ? "JSON→GQL" : "GQL→JSON"}
              </span>
              <span>⇄</span>
            </button>

            {/* Engine selector */}
            <div className="relative">
              <button
                onClick={() => setShowEngineMenu(!showEngineMenu)}
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center space-x-2"
                title="Select converter engine"
              >
                <span>{getEngineIcon(selectedEngine)}</span>
                <span>{getEngineLabel(selectedEngine)}</span>
                <span className="text-xs">▼</span>
              </button>

              {showEngineMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="py-1">
                    {(["auto", "rust-wasm", "node"] as ConverterEngine[]).map(
                      (engine) => (
                        <button
                          key={engine}
                          onClick={() => handleEngineSelect(engine)}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 ${
                            selectedEngine === engine
                              ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          <span>{getEngineIcon(engine)}</span>
                          <span className="flex-1">
                            {getEngineLabel(engine)}
                          </span>
                          {selectedEngine === engine && <span>✓</span>}
                        </button>
                      ),
                    )}
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Auto: tries WASM first, falls back to Node
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Convert button */}
            <button
              onClick={handleConvert}
              disabled={isConverting}
              className="px-4 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              title="Run conversion"
            >
              Convert
            </button>

            {/* Validate button */}
            <button
              onClick={handleValidate}
              disabled={isValidating}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              title="Validate schemas"
            >
              Validate
            </button>

            {/* Export button */}
            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              title="Export schemas"
            >
              Export
            </button>

            {/* Settings button */}
            <button
              onClick={onSettingsClick}
              className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              title="Open settings"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>
      </div>

      {/* Close dropdown when clicking outside */}
      {showEngineMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowEngineMenu(false)}
        />
      )}
    </header>
  );
};

export default Toolbar;
