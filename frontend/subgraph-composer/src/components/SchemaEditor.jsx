import React, { Suspense } from "react";
import "./SchemaEditor.css";
import { formatJsonSchema, validateJsonSchema } from "../lib/converter";

// Lazy load CodeMirror only when needed
const CodeMirrorEditor = React.lazy(() =>
  import("./CodeMirrorEditor").then((mod) => ({ default: mod.default })),
);

export default function SchemaEditor({
  schema,
  onUpdate,
  onGenerate,
  isLoading,
}) {
  const [error, setError] = React.useState(null);

  const handleChange = (newContent) => {
    onUpdate(newContent);
    setError(null);
  };

  const handleFormat = () => {
    try {
      const formatted = formatJsonSchema(schema.content);
      onUpdate(formatted);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleValidate = () => {
    try {
      JSON.parse(schema.content);
      const validation = validateJsonSchema(JSON.parse(schema.content));

      if (validation.valid) {
        setError(null);
      } else {
        setError(validation.errors.join("; "));
      }
    } catch (err) {
      setError(`Invalid JSON: ${err.message}`);
    }
  };

  const handleGenerate = async () => {
    try {
      JSON.parse(schema.content);
      await onGenerate();
    } catch (err) {
      setError(`Cannot generate: Invalid JSON`);
    }
  };

  return (
    <div className="schema-editor">
      <div className="editor-header">
        <div className="editor-title">{schema.name}</div>
        <div className="editor-buttons">
          <button
            onClick={handleValidate}
            className="btn btn-secondary btn-small"
            title="Validate JSON"
          >
            ✓ Validate
          </button>
          <button
            onClick={handleFormat}
            className="btn btn-secondary btn-small"
            title="Format with 2-space indentation"
          >
            ⟿ Format
          </button>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="btn btn-primary btn-small"
            title="Generate GraphQL subgraph from this schema"
          >
            {isLoading ? "⟳ Generating..." : "⚡ Generate"}
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Suspense
          fallback={<div className="editor-loading">Loading editor...</div>}
        >
          <CodeMirrorEditor value={schema.content} onChange={handleChange} />
        </Suspense>
      </div>

      {error && (
        <div className="editor-error">
          <span>❌ {error}</span>
        </div>
      )}
    </div>
  );
}
