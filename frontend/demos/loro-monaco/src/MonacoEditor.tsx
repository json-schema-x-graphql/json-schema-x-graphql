import React, { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { Loro, LoroText } from "loro-crdt";

// Disable Monaco workers to avoid worker loading issues
if (typeof window !== "undefined") {
  (self as any).MonacoEnvironment = {
    getWorkerUrl: () => {
      return "data:text/javascript;base64,";
    },
  };
}

interface MonacoEditorProps {
  value: string;
  language: "json" | "graphql";
  onChange?: (value: string) => void;
  loroDoc?: Loro | null;
  textKey: string;
  readOnly?: boolean;
  height?: string;
  className?: string;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  language,
  onChange,
  loroDoc,
  textKey,
  readOnly = false,
  height = "100%",
  className = "",
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const loroTextRef = useRef<LoroText | null>(null);
  const isUpdatingFromLoroRef = useRef(false);

  const handleEditorDidMount = (
    editor: monaco.editor.IStandaloneCodeEditor,
    monacoInstance: typeof monaco,
  ) => {
    editorRef.current = editor;

    // Configure editor
    editor.updateOptions({
      minimap: { enabled: true },
      fontSize: 14,
      lineNumbers: "on",
      roundedSelection: true,
      scrollBeyondLastLine: false,
      readOnly,
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      wordWrap: "on",
      wrappingIndent: "indent",
    });

    // Setup Loro binding if available
    if (loroDoc) {
      const loroText = loroDoc.getText(textKey);
      loroTextRef.current = loroText;

      // Set initial content
      const initialContent = loroText.toString();
      if (initialContent && editor.getValue() !== initialContent) {
        editor.setValue(initialContent);
      }

      // Subscribe to Loro changes
      loroDoc.subscribe(() => {
        if (isUpdatingFromLoroRef.current) {
          return;
        }

        const loroContent = loroText.toString();
        const editorContent = editor.getValue();

        if (loroContent !== editorContent) {
          isUpdatingFromLoroRef.current = true;

          // Get current cursor position
          const position = editor.getPosition();
          const selection = editor.getSelection();

          // Update editor content
          editor.setValue(loroContent);

          // Restore cursor position if possible
          if (position) {
            editor.setPosition(position);
          }
          if (selection) {
            editor.setSelection(selection);
          }

          isUpdatingFromLoroRef.current = false;
        }
      });

      // Listen for Monaco editor changes and sync to Loro
      editor.onDidChangeModelContent((e) => {
        if (isUpdatingFromLoroRef.current || !loroText) {
          return;
        }

        const editorContent = editor.getValue();
        const loroContent = loroText.toString();

        if (editorContent !== loroContent) {
          isUpdatingFromLoroRef.current = true;

          // Apply changes to Loro
          for (const change of e.changes) {
            const offset = change.rangeOffset;
            const deleteLength = change.rangeLength;
            const insertText = change.text;

            if (deleteLength > 0) {
              loroText.delete(offset, deleteLength);
            }
            if (insertText.length > 0) {
              loroText.insert(offset, insertText);
            }
          }

          isUpdatingFromLoroRef.current = false;
        }
      });

      // Cleanup - store subscription ID for potential future unsubscribe
      // Note: Loro subscriptions are automatically cleaned up when the document is destroyed
      return () => {
        // Subscription cleanup happens automatically with Loro
        // Store subscriptionId if needed: subscriptionId
      };
    } else {
      // Non-collaborative mode: use local onChange
      editor.onDidChangeModelContent(() => {
        const currentValue = editor.getValue();
        if (onChange) {
          onChange(currentValue);
        }
      });
    }

    // Add JSON Schema validation for JSON editor
    if (language === "json") {
      monacoInstance.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        schemas: [
          {
            uri: "http://json-schema.org/draft-07/schema#",
            fileMatch: ["*"],
            schema: {
              type: "object",
              properties: {
                $schema: { type: "string" },
                $id: { type: "string" },
                $ref: { type: "string" },
                $comment: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                type: {
                  oneOf: [
                    { type: "string" },
                    { type: "array", items: { type: "string" } },
                  ],
                },
                properties: { type: "object" },
                required: { type: "array", items: { type: "string" } },
                additionalProperties: {},
                definitions: { type: "object" },
                $defs: { type: "object" },
              },
            },
          },
        ],
      });
    }

    // Add GraphQL syntax support
    if (language === "graphql") {
      // Register GraphQL language if not already registered
      const languages = monacoInstance.languages.getLanguages();
      if (!languages.some((lang) => lang.id === "graphql")) {
        monacoInstance.languages.register({ id: "graphql" });

        monacoInstance.languages.setMonarchTokensProvider("graphql", {
          keywords: [
            "type",
            "interface",
            "union",
            "enum",
            "input",
            "extend",
            "schema",
            "directive",
            "scalar",
            "implements",
            "fragment",
            "query",
            "mutation",
            "subscription",
            "on",
            "null",
            "true",
            "false",
          ],
          typeKeywords: ["String", "Int", "Float", "Boolean", "ID"],
          operators: ["=", "!", "?", ":", "&", "|", "@"],
          symbols: /[=><!~?:&|+\-*\/\^%]+/,

          tokenizer: {
            root: [
              [
                /[a-zA-Z_][\w]*/,
                {
                  cases: {
                    "@keywords": "keyword",
                    "@typeKeywords": "type",
                    "@default": "identifier",
                  },
                },
              ],
              { include: "@whitespace" },
              [/[{}()\[\]]/, "@brackets"],
              [/[<>](?!@symbols)/, "@brackets"],
              [
                /@symbols/,
                { cases: { "@operators": "operator", "@default": "" } },
              ],
              [/"([^"\\]|\\.)*$/, "string.invalid"],
              [
                /"/,
                { token: "string.quote", bracket: "@open", next: "@string" },
              ],
              [/\d+/, "number"],
            ],

            string: [
              [/[^\\"]+/, "string"],
              [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
            ],

            whitespace: [
              [/[ \t\r\n]+/, "white"],
              [/#.*$/, "comment"],
            ],
          },
        });

        monacoInstance.languages.setLanguageConfiguration("graphql", {
          comments: {
            lineComment: "#",
          },
          brackets: [
            ["{", "}"],
            ["[", "]"],
            ["(", ")"],
          ],
          autoClosingPairs: [
            { open: "{", close: "}" },
            { open: "[", close: "]" },
            { open: "(", close: ")" },
            { open: '"', close: '"' },
          ],
          surroundingPairs: [
            { open: "{", close: "}" },
            { open: "[", close: "]" },
            { open: "(", close: ")" },
            { open: '"', close: '"' },
          ],
        });
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className={`monaco-editor-wrapper ${className}`} style={{ height }}>
      <Editor
        height={height}
        defaultLanguage={language}
        value={!loroDoc ? value : undefined}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          readOnly,
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: "on",
          roundedSelection: true,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          wordWrap: "on",
        }}
      />
    </div>
  );
};
