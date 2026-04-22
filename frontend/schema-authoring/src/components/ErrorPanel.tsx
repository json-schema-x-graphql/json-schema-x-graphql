/**
 * ErrorPanel Component
 *
 * Displays validation and conversion errors with:
 * - Collapsible error list
 * - Inline suggestions and auto-fix actions
 * - Severity indicators (error/warning)
 * - Jump-to-location functionality
 * - Bulk actions (fix all, clear all)
 */

import React, { useState } from "react";
import { useAppStore } from "../store/app-store";
import type { ValidationError } from "../types";

export interface ErrorPanelProps {
  /** Optional CSS class */
  className?: string;
  /** Maximum height for the error list */
  maxHeight?: string;
  /** Callback when user clicks to jump to error location */
  onJumpToError?: (error: ValidationError) => void;
}

export const ErrorPanel: React.FC<ErrorPanelProps> = ({
  className = "",
  maxHeight = "16rem",
  onJumpToError,
}) => {
  const validationResult = useAppStore((state) => state.validationResult);
  const conversionResult = useAppStore((state) => state.conversionResult);
  const applyAutoFix = useAppStore((state) => state.applyAutoFix);
  const clearValidationResult = useAppStore((state) => state.clearValidationResult);

  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedErrorIndex, setSelectedErrorIndex] = useState<number | null>(null);

  if (!validationResult) return null;

  const { errors, warnings = [] } = validationResult;
  const totalIssues = errors.length + warnings.length;

  if (totalIssues === 0 && conversionResult?.success) return null;

  const handleFixError = async (error: ValidationError) => {
    if (!error.fix) return;

    try {
      await applyAutoFix(error);
      console.log(`Applied fix for error at line ${error.line}`);
    } catch (err) {
      console.error("Failed to apply fix:", err);
    }
  };

  const handleJumpToError = (error: ValidationError) => {
    onJumpToError?.(error);
    setSelectedErrorIndex(errors.indexOf(error));
  };

  const handleFixAll = async () => {
    const fixableErrors = errors.filter((e) => e.fix);
    if (fixableErrors.length === 0) return;

    try {
      for (const error of fixableErrors) {
        await applyAutoFix(error);
      }
      console.log(`Applied ${fixableErrors.length} fixes`);
    } catch (err) {
      console.error("Failed to apply all fixes:", err);
    }
  };

  const handleClearAll = () => {
    clearValidationResult();
    setSelectedErrorIndex(null);
  };

  const getSeverityColor = (severity: "error" | "warning" = "error") => {
    return severity === "error"
      ? "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
      : "text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
  };

  const getSeverityIcon = (severity: "error" | "warning" = "error") => {
    return severity === "error" ? "🔴" : "⚠️";
  };

  const fixableCount = errors.filter((e) => e.fix).length;

  return (
    <aside
      className={`error-panel border-t border-gray-200 dark:border-gray-700 ${className}`}
      style={{ maxHeight: isExpanded ? maxHeight : "3rem" }}
    >
      {/* Header */}
      <div
        className={`px-4 py-3 flex items-center justify-between cursor-pointer ${
          errors.length > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-yellow-50 dark:bg-yellow-900/20"
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <button className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
            {isExpanded ? "▼" : "▶"}
          </button>
          <h3
            className={`text-sm font-semibold ${
              errors.length > 0
                ? "text-red-800 dark:text-red-300"
                : "text-yellow-800 dark:text-yellow-300"
            }`}
          >
            {errors.length > 0 && (
              <>
                {errors.length} {errors.length === 1 ? "Error" : "Errors"}
              </>
            )}
            {errors.length > 0 && warnings.length > 0 && ", "}
            {warnings.length > 0 && (
              <>
                {warnings.length} {warnings.length === 1 ? "Warning" : "Warnings"}
              </>
            )}
          </h3>

          {fixableCount > 0 && (
            <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">
              {fixableCount} auto-fixable
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {fixableCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFixAll();
              }}
              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Fix All ({fixableCount})
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClearAll();
            }}
            className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Error list */}
      {isExpanded && (
        <div className="overflow-y-auto" style={{ maxHeight: "calc(100% - 3rem)" }}>
          <div className="p-4 space-y-2">
            {/* Errors */}
            {errors.map((error, index) => (
              <div
                key={`error-${index}`}
                className={`border rounded-lg p-3 ${getSeverityColor("error")} ${
                  selectedErrorIndex === index ? "ring-2 ring-red-500" : ""
                }`}
              >
                <div className="flex items-start space-x-3">
                  <span className="text-lg flex-shrink-0">{getSeverityIcon("error")}</span>

                  <div className="flex-1 min-w-0">
                    {/* Location and message */}
                    <div className="flex items-baseline space-x-2 mb-1">
                      {(error.line || error.column) && (
                        <button
                          onClick={() => handleJumpToError(error)}
                          className="text-xs font-mono bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                        >
                          Line {error.line || "?"}:{error.column || "?"}
                        </button>
                      )}
                      <span className="text-sm font-medium">{error.message}</span>
                    </div>

                    {/* Error path */}
                    {error.path && (
                      <div className="text-xs text-red-600 dark:text-red-400 mb-1 font-mono">
                        {error.path}
                      </div>
                    )}

                    {/* Suggestion */}
                    {error.suggestion && (
                      <div className="mt-2 text-xs bg-white dark:bg-gray-800 p-2 rounded border border-red-300 dark:border-red-700">
                        <div className="flex items-start space-x-2">
                          <span>💡</span>
                          <span className="flex-1">{error.suggestion}</span>
                        </div>
                      </div>
                    )}

                    {/* Auto-fix action */}
                    {error.fix && (
                      <div className="mt-2 flex items-center space-x-2">
                        <button
                          onClick={() => handleFixError(error)}
                          className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          🔧 Apply Fix
                        </button>
                        {error.fix.description && (
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {error.fix.description}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Source/category */}
                    {error.source && (
                      <div className="mt-2 text-xs text-red-600/70 dark:text-red-400/70">
                        Source: {error.source}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Warnings */}
            {warnings.map((warning, index) => (
              <div
                key={`warning-${index}`}
                className={`border rounded-lg p-3 ${getSeverityColor("warning")}`}
              >
                <div className="flex items-start space-x-3">
                  <span className="text-lg flex-shrink-0">{getSeverityIcon("warning")}</span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline space-x-2 mb-1">
                      {(warning.line || warning.column) && (
                        <span className="text-xs font-mono bg-yellow-100 dark:bg-yellow-900/40 px-1.5 py-0.5 rounded">
                          Line {warning.line || "?"}:{warning.column || "?"}
                        </span>
                      )}
                      <span className="text-sm font-medium">{warning.message}</span>
                    </div>

                    {warning.suggestion && (
                      <div className="mt-2 text-xs bg-white dark:bg-gray-800 p-2 rounded border border-yellow-300 dark:border-yellow-700">
                        <div className="flex items-start space-x-2">
                          <span>💡</span>
                          <span>{warning.suggestion}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* No issues message */}
            {errors.length === 0 && warnings.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="text-4xl mb-2">✓</div>
                <p className="text-sm">No validation issues found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};

export default ErrorPanel;
