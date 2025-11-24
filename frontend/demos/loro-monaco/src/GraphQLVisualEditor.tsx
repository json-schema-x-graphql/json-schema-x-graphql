import React, { useEffect, useRef, useState } from "react";
import { GraphQLEditor, PassedSchema } from "graphql-editor";
import { Loro } from "loro-crdt";

// Import worker for validation
const workerUrl = new URL(
  "graphql-editor-worker/lib/worker/validation.worker.js",
  import.meta.url,
);

interface GraphQLVisualEditorProps {
  value: string;
  onChange?: (value: string) => void;
  loroDoc?: Loro | null;
  textKey: string;
  readOnly?: boolean;
  className?: string;
}

export const GraphQLVisualEditor: React.FC<GraphQLVisualEditorProps> = ({
  value,
  onChange,
  loroDoc,
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
  // Note: We rely on the store's Loro subscription to update the value prop
  // This avoids race conditions from multiple Loro subscriptions
  useEffect(() => {
    console.log("📝 GraphQLVisualEditor: value prop changed", {
      newValue: value.substring(0, 50) + "...",
      currentSchemaCode: schema.code.substring(0, 50) + "...",
      willUpdate: value !== schema.code,
    });
    if (value !== schema.code) {
      console.log("✅ GraphQLVisualEditor: Updating schema from value prop");
      try {
        setSchema({ code: value, libraries: "", source: "outside" });
      } catch (error) {
        console.error("❌ GraphQLVisualEditor: Failed to set schema", error);
        // Try to show error in console for debugging
        const err = error as Error;
        console.error("Schema content that failed:", value);
        console.error("Error details:", err.message);
      }
    }
  }, [value, schema.code]);

  const handleSchemaChange = (newSchema: PassedSchema) => {
    if (readOnly) {
      console.log("⏭️ GraphQLVisualEditor: Skipping schema change (readOnly)");
      return;
    }

    const newCode = newSchema.code;
    console.log("✏️ GraphQLVisualEditor: Schema changed by user", {
      newCodeLength: newCode.length,
      preview: newCode.substring(0, 50) + "...",
    });

    // Update local state immediately for responsive UI
    setSchema(newSchema);

    // Update Loro document if available
    // The store's subscription will handle propagating this change
    if (loroDoc) {
      const loroText = loroDoc.getText(textKey);
      const currentText = loroText.toString();

      if (currentText !== newCode) {
        console.log("📤 GraphQLVisualEditor: Pushing changes to Loro");

        // Apply changes to Loro
        loroText.delete(0, currentText.length);
        loroText.insert(0, newCode);

        console.log("✅ GraphQLVisualEditor: Changes pushed to Loro");
      }
    } else if (onChange) {
      // Fallback to onChange callback
      console.log("📤 GraphQLVisualEditor: No Loro, calling onChange");
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
        onError={(error: string) => {
          console.error("❌ GraphQL Editor Error:", error);
          console.error("Current schema code:", schema.code);
        }}
      />
    </div>
  );
};
