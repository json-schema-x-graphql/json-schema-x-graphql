import React, { useEffect, useRef, useState } from "react";
import { GraphQLEditor, PassedSchema } from "graphql-editor";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

// Import worker for validation
const workerUrl = new URL(
  "graphql-editor-worker/lib/worker/validation.worker.js",
  import.meta.url,
);

interface GraphQLVisualEditorProps {
  value: string;
  onChange?: (value: string) => void;
  ydoc?: Y.Doc | null;
  provider?: WebsocketProvider | null;
  textKey: string;
  readOnly?: boolean;
  className?: string;
}

export const GraphQLVisualEditor: React.FC<GraphQLVisualEditorProps> = ({
  value,
  onChange,
  ydoc,
  textKey,
  readOnly = false,
  className = "",
}) => {
  const [schema, setSchema] = useState<PassedSchema>({
    code: value,
    libraries: "",
    source: "outside",
  });
  const editorRef = useRef<any>(null);

  // Update local schema when value prop changes
  // Note: We rely on the store's Yjs subscription to update the value prop
  // This avoids race conditions from multiple Yjs subscriptions
  useEffect(() => {
    if (value !== schema.code) {
      setSchema({ code: value, libraries: "", source: "outside" });
    }
  }, [value, schema.code]);

  const handleSchemaChange = (newSchema: PassedSchema) => {
    if (readOnly) return;

    const newCode = newSchema.code;

    // Update local state immediately for responsive UI
    setSchema(newSchema);

    // Update Yjs document if available
    // The store's subscription will handle propagating this change
    if (ydoc) {
      const ytext = ydoc.getText(textKey);
      const currentText = ytext.toString();

      if (currentText !== newCode) {
        ydoc.transact(() => {
          ytext.delete(0, currentText.length);
          ytext.insert(0, newCode);
        });
      }
    } else if (onChange) {
      // Fallback to onChange callback
      onChange(newCode);
    }
  };

  return (
    <div
      className={`graphql-visual-editor ${className}`}
      style={{ height: "100%", width: "100%" }}
    >
      <GraphQLEditor
        ref={editorRef}
        schema={schema}
        setSchema={handleSchemaChange}
        readonly={readOnly}
        path="/"
        workers={{
          validation: workerUrl.href,
        }}
        onError={(error: string) => {
          console.error("❌ GraphQL Editor Error:", error);
          console.error("Current schema code:", schema.code);
        }}
      />
    </div>
  );
};
