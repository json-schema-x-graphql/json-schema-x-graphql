import React, { Suspense } from "react";
import "./SchemaEditor.css";

// Lazy load CodeMirror only when needed
const CodeMirrorEditor = React.lazy(() =>
  import("./CodeMirrorEditor").then((mod) => ({ default: mod.default })),
);

export default function SubgraphEditor({
  subgraph,
  onUpdate,
  isLoading: _isLoading,
  sdl,
  stats,
  errors: _errors,
  schemas: _schemas,
  subgraphCount,
}) {
  const [error, setError] = React.useState(null);

  const handleChange = (newContent) => {
    onUpdate(newContent);
    setError(null);
  };

  const handleValidate = () => {
    try {
      JSON.parse(subgraph.content);
      setError(null);
    } catch (err) {
      setError(`Invalid JSON: ${err.message}`);
    }
  };

  return (
    <div
      className="schema-editor"
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <div className="editor-header">
        <div className="editor-title">{subgraph.name}</div>
        <div className="editor-buttons">
          <button
            onClick={handleValidate}
            className="btn btn-secondary btn-small"
            title="Validate JSON"
          >
            ✓ Validate
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
        <Suspense fallback={<div className="editor-loading">Loading editor...</div>}>
          <CodeMirrorEditor value={subgraph.content} onChange={handleChange} />
        </Suspense>
      </div>
      {error && (
        <div className="editor-error">
          <span>❌ {error}</span>
        </div>
      )}
      {/* SDL and Stats Section */}
      <div
        className="schema-editor"
        style={{
          marginTop: "16px",
          background: "white",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-sm)",
          border: "1px solid var(--color-border)",
          padding: "var(--spacing-md)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--spacing-md)",
        }}
      >
        <div>
          <div
            className="editor-header"
            style={{
              background: "var(--color-bg-secondary)",
              borderRadius: "var(--radius-md) var(--radius-md) 0 0",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <div className="editor-title">SDL Preview</div>
          </div>
          <div
            style={{
              padding: "var(--spacing-md)",
              background: "white",
              minHeight: "80px",
              maxHeight: "400px",
              fontFamily: "monospace",
              fontSize: "0.95em",
              overflow: "auto",
              borderRadius: "0 0 var(--radius-md) var(--radius-md)",
            }}
          >
            {sdl ? (
              <pre style={{ margin: 0 }}>{sdl}</pre>
            ) : (
              <span style={{ color: "var(--color-text-light)" }}>No SDL available</span>
            )}
          </div>
        </div>
        <div>
          <div
            className="editor-header"
            style={{
              background: "var(--color-bg-secondary)",
              borderRadius: "var(--radius-md) var(--radius-md) 0 0",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <div className="editor-title">Statistics</div>
          </div>
          <div
            style={{
              padding: "var(--spacing-md)",
              background: "white",
              minHeight: "60px",
              maxHeight: "400px",
              overflow: "auto",
              borderRadius: "0 0 var(--radius-md) var(--radius-md)",
            }}
          >
            {stats ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--spacing-md)",
                }}
              >
                <div style={{ display: "flex", gap: "2em", flexWrap: "wrap" }}>
                  <div>
                    <b>Types:</b> {stats.totalTypes}
                  </div>
                  <div>
                    <b>Fields:</b> {stats.totalFields}
                  </div>
                  <div>
                    <b>Subgraphs:</b> {subgraphCount ?? 0}
                  </div>
                  {stats.conflicts?.length > 0 && (
                    <div
                      style={{
                        color: "var(--color-warning)",
                        fontWeight: "bold",
                      }}
                    >
                      ⚠️ Conflicts: {stats.conflicts.length}
                    </div>
                  )}
                </div>
                {stats.conflicts?.length > 0 && (
                  <div
                    style={{
                      padding: "var(--spacing-md)",
                      background: "#fef3c7",
                      border: "1px solid var(--color-warning)",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        marginBottom: "var(--spacing-sm)",
                        paddingBottom: "var(--spacing-sm)",
                        borderBottom: "1px solid rgba(146, 64, 14, 0.2)",
                      }}
                    >
                      Conflicting Types:
                    </div>
                    {stats.conflicts.map((conflict, idx) => (
                      <div
                        key={idx}
                        style={{
                          marginBottom: "var(--spacing-sm)",
                          padding: "var(--spacing-sm)",
                          background: "white",
                          borderLeft: "3px solid var(--color-warning)",
                          borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
                          fontSize: "0.75rem",
                        }}
                      >
                        <div style={{ fontWeight: "600", marginBottom: "2px" }}>
                          {conflict.type}
                        </div>
                        <div
                          style={{
                            color: "var(--color-text-light)",
                            marginBottom: "2px",
                          }}
                        >
                          Found in: {conflict.sources.join(", ")}
                        </div>
                        {conflict.fieldCount > 0 && (
                          <div style={{ color: "#92400e", fontStyle: "italic" }}>
                            {conflict.fieldCount} field(s)
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <span style={{ color: "var(--color-text-light)" }}>No statistics available</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
