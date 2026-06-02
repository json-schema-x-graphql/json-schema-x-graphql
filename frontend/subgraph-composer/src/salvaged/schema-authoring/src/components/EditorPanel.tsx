/**
 * EditorPanel Component
 *
 * A Monaco Editor wrapper that provides:
 * - JSON Schema and GraphQL SDL editing with syntax highlighting
 * - Live validation with inline error markers
 * - Autocompletion suggestions
 * - Change debouncing for performance
 * - AI-accessible content retrieval
 */

import React, { useRef, useEffect, useCallback } from "react";
import Editor, { Monaco, OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useAppStore } from "../store/app-store";
import type { ValidationError } from "../types";

export interface EditorPanelProps {
  /** Editor mode: 'jsonschema' or 'graphql' */
  mode: "jsonschema" | "graphql";
  /** Content value */
  value: string;
  /** Callback when content changes */
  onChange: (value: string) => void;
  /** Validation errors to display */
  errors?: ValidationError[];
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Panel title */
  title?: string;
  /** Optional className for the container */
  className?: string;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({
  mode,
  value,
  onChange,
  errors = [],
  readOnly = false,
  title,
  className = "",
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const theme = useAppStore((state) => state.settings.theme);
  const autoValidate = useAppStore((state) => state.settings.autoValidate);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine Monaco language
  const language = mode === "jsonschema" ? "json" : "graphql";

  // Debug logging
  useEffect(() => {
    console.log(
      `EditorPanel mounted: mode=${mode}, language=${language}, value length=${value.length}`,
    );
  }, []);

  // Handle editor mount
  const handleEditorDidMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Configure editor options
      editor.updateOptions({
        minimap: { enabled: false },
        lineNumbers: "on",
        roundedSelection: true,
        scrollBeyondLastLine: false,
        readOnly,
        automaticLayout: true,
        formatOnPaste: true,
        formatOnType: true,
        tabSize: 2,
        insertSpaces: true,
        quickSuggestions: true,
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: "on",
        // Disable automatic wrapping by default for a better code-editing experience
        wordWrap: "off",
      });

      // Register completion provider for JSON Schema extensions
      if (mode === "jsonschema" && monaco) {
        monaco.languages.registerCompletionItemProvider("json", {
          provideCompletionItems: (model, position) => {
            const textUntilPosition = model.getValueInRange({
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            });

            // Check if we're in a property context
            const lastQuote = textUntilPosition.lastIndexOf('"');
            if (lastQuote === -1) return { suggestions: [] };

            const suggestions: any[] = [];

            // Suggest x-graphql extensions
            if (textUntilPosition.slice(lastQuote).includes('"x-graphql')) {
              const xGraphqlExtensions = [
                {
                  label: "x-graphql-type-name",
                  insertText: '"x-graphql-type-name": "$1"',
                  documentation: "Override the GraphQL type name",
                },
                {
                  label: "x-graphql-field-name",
                  insertText: '"x-graphql-field-name": "$1"',
                  documentation: "Override the GraphQL field name",
                },
                {
                  label: "x-graphql-federation-keys",
                  insertText: '"x-graphql-federation-keys": ["$1"]',
                  documentation: "Apollo Federation @key fields",
                },
                {
                  label: "x-graphql-arguments",
                  insertText:
                    '"x-graphql-arguments": {\n  "$1": {\n    "type": "$2"\n  }\n}',
                  documentation: "Add GraphQL arguments to a field",
                },
                {
                  label: "x-graphql-omit",
                  insertText: '"x-graphql-omit": true',
                  documentation: "Omit this field from GraphQL schema",
                },
                {
                  label: "x-graphql-subscription",
                  insertText: '"x-graphql-subscription": true',
                  documentation: "Mark this as a GraphQL subscription",
                },
              ];

              return {
                suggestions: xGraphqlExtensions.map((ext) => ({
                  label: ext.label,
                  kind: monaco.languages.CompletionItemKind.Property,
                  insertText: ext.insertText,
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation: ext.documentation,
                })),
              };
            }

            return { suggestions };
          },
        });
      }

      // Set up keyboard shortcuts
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        // Save/export action
        const content = editor.getValue();
        console.log("Save triggered, content length:", content.length);
        // Could trigger export here
      });

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
        // Format document
        editor.getAction("editor.action.formatDocument")?.run();
      });

      console.log(`✓ ${mode} editor mounted successfully`);
    },
    [mode, readOnly],
  );

  // Handle content changes with debouncing
  const handleEditorChange = useCallback(
    (newValue: string | undefined) => {
      if (newValue === undefined) return;

      // Clear previous debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Debounce the onChange callback for performance
      debounceTimeoutRef.current = setTimeout(() => {
        onChange(newValue);
      }, 300); // 300ms debounce
    },
    [onChange],
  );

  // Update error markers when errors change
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const monaco = monacoRef.current;
    const model = editorRef.current.getModel();
    if (!model) return;

    // Convert validation errors to Monaco markers
    const markers: editor.IMarkerData[] = errors.map((error) => ({
      severity: monaco.MarkerSeverity.Error,
      startLineNumber: error.line || 1,
      startColumn: error.column || 1,
      endLineNumber: error.line || 1,
      endColumn: error.column ? error.column + (error.length || 10) : 100,
      message: error.message,
      source: error.source || "validator",
    }));

    // Set markers on the model
    monaco.editor.setModelMarkers(model, "validator", markers);

    return () => {
      // Clean up markers on unmount
      monaco.editor.setModelMarkers(model, "validator", []);
    };
  }, [errors]);

  // Clean up debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`editor-panel flex flex-col h-full ${className}`}>
      {title && (
        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {title}
          </h2>
          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
            {errors.length > 0 && (
              <span className="text-red-600 dark:text-red-400">
                {errors.length} {errors.length === 1 ? "error" : "errors"}
              </span>
            )}
            {readOnly && (
              <span className="text-yellow-600 dark:text-yellow-400">
                Read-only
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 relative">
        <Editor
          height="100%"
          language={language}
          value={value}
          theme={theme}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          beforeMount={(monaco) => {
            console.log("Monaco beforeMount called, language:", language);
          }}
          options={{
            readOnly,
            minimap: { enabled: false },
            // Slightly larger default font for readability
            fontSize: 16,
            lineHeight: 22,
            fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
            fontLigatures: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            formatOnPaste: true,
            formatOnType: true,
            tabSize: 2,
            // Disable wrapping by default in editors to preserve formatting and improve UX
            wordWrap: "off",
            renderWhitespace: "selection",
          }}
          loading={
            <div className="flex items-center justify-center h-full bg-white dark:bg-gray-900">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Loading editor...
                </p>
              </div>
            </div>
          }
        />
      </div>

      {/* Error summary footer */}
      {errors.length > 0 && !title && (
        <div className="bg-red-50 dark:bg-red-900/20 px-4 py-2 border-t border-red-200 dark:border-red-800">
          <p className="text-xs text-red-700 dark:text-red-400">
            {errors.length} validation{" "}
            {errors.length === 1 ? "error" : "errors"} detected
          </p>
        </div>
      )}
    </div>
  );
};

export default EditorPanel;
