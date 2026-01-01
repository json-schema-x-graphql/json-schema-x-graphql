/**
 * StatusBar Component
 *
 * Displays:
 * - Current converter engine and status
 * - Performance metrics (conversion time, validation time)
 * - Schema statistics (lines, types, fields)
 * - AI API availability indicator
 * - Quick actions and shortcuts
 */

import React from "react";
import { useAppStore } from "../store/app-store";

export interface StatusBarProps {
  /** Optional CSS class */
  className?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ className = "" }) => {
  const selectedEngine = useAppStore((state) => state.settings.converterEngine);
  const conversionResult = useAppStore((state) => state.conversionResult);
  const validationResult = useAppStore((state) => state.validationResult);
  const jsonSchemaContent = useAppStore(
    (state) => state.jsonSchemaEditor.content,
  );
  const graphQLContent = useAppStore((state) => state.graphqlEditor.content);
  const mode = useAppStore((state) => state.mode);

  // Calculate statistics
  const jsonSchemaLines = jsonSchemaContent.split("\n").length;
  const graphQLLines = graphQLContent.split("\n").length;

  // Count types in GraphQL schema (rough estimation)
  const typeCount = (graphQLContent.match(/\btype\s+\w+/g) || []).length;
  const interfaceCount = (graphQLContent.match(/\binterface\s+\w+/g) || [])
    .length;
  const enumCount = (graphQLContent.match(/\benum\s+\w+/g) || []).length;

  // Get engine status indicator
  const getEngineStatus = () => {
    if (!conversionResult) {
      return {
        color: "text-gray-500 dark:text-gray-400",
        icon: "○",
        label: "Ready",
      };
    }

    if (conversionResult.success) {
      return {
        color: "text-green-600 dark:text-green-400",
        icon: "●",
        label: conversionResult.engine,
      };
    }

    return {
      color: "text-red-600 dark:text-red-400",
      icon: "●",
      label: "Error",
    };
  };

  const engineStatus = getEngineStatus();

  // Format duration for display
  const formatDuration = (ms: number) => {
    if (ms < 1) return "<1ms";
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <footer
      className={`status-bar bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 ${className}`}
    >
      <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
        {/* Left section: Engine and metrics */}
        <div className="flex items-center space-x-6">
          {/* Engine status */}
          <div className="flex items-center space-x-2">
            <span className={engineStatus.color}>{engineStatus.icon}</span>
            <span>
              Engine: <span className="font-medium">{engineStatus.label}</span>
              {selectedEngine === "auto" && conversionResult?.engine && (
                <span className="text-gray-500 dark:text-gray-500">
                  {" "}
                  (auto-selected)
                </span>
              )}
            </span>
          </div>

          {/* Conversion metrics */}
          {conversionResult && (
            <div className="flex items-center space-x-4">
              <span>
                Conversion:{" "}
                <span className="font-medium">
                  {formatDuration(conversionResult.duration)}
                </span>
              </span>
            </div>
          )}

          {/* Validation status */}
          {validationResult && (
            <div
              className={`flex items-center space-x-2 ${
                validationResult.valid
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              <span>{validationResult.valid ? "✓" : "✗"}</span>
              <span>
                {validationResult.valid ? (
                  "Valid"
                ) : (
                  <>
                    {validationResult.errors.length}{" "}
                    {validationResult.errors.length === 1 ? "error" : "errors"}
                  </>
                )}
              </span>
            </div>
          )}

          {/* Direction indicator */}
          <div className="text-gray-500 dark:text-gray-500">
            <span className="font-mono text-xs">
              {mode === "json-to-graphql" ? "JSON→GQL" : "GQL→JSON"}
            </span>
          </div>
        </div>

        {/* Center section: Statistics */}
        <div className="flex items-center space-x-6">
          {/* JSON Schema stats */}
          <div className="flex items-center space-x-2">
            <span className="text-gray-500 dark:text-gray-500">JSON:</span>
            <span className="font-medium">{jsonSchemaLines} lines</span>
          </div>

          {/* GraphQL stats */}
          <div className="flex items-center space-x-2">
            <span className="text-gray-500 dark:text-gray-500">GraphQL:</span>
            <span className="font-medium">{graphQLLines} lines</span>
            {(typeCount > 0 || interfaceCount > 0 || enumCount > 0) && (
              <span className="text-gray-500 dark:text-gray-500">
                ({typeCount}T {interfaceCount}I {enumCount}E)
              </span>
            )}
          </div>
        </div>

        {/* Right section: API and shortcuts */}
        <div className="flex items-center space-x-6">
          {/* AI API indicator */}
          <div className="flex items-center space-x-2">
            <span className="text-green-600 dark:text-green-400">●</span>
            <span className="text-gray-500 dark:text-gray-500">
              AI API:{" "}
              <span className="font-mono text-xs">
                window.__schemaAuthoringAPI__
              </span>
            </span>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="flex items-center space-x-3 text-gray-500 dark:text-gray-500">
            <span className="font-mono">Ctrl+S: Export</span>
            <span>•</span>
            <span className="font-mono">Ctrl+K: Format</span>
            <span>•</span>
            <span className="font-mono">F1: Help</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default StatusBar;
