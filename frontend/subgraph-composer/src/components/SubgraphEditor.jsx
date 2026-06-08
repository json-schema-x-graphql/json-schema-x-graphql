import React, { Suspense } from "react";
import "./SchemaEditor.css";
import { validateSchemaSDL } from "../lib/federation-validator";
import { otelTracer } from "../otel";

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
  const [validMsg, setValidMsg] = React.useState(null);

  const handleChange = (newContent) => {
    onUpdate(newContent);
    setError(null);
  };

  const handleValidate = () => {
    otelTracer.startActiveSpan("validateSDL", (span) => {
      try {
        // subgraph.content is GraphQL SDL — validate it as SDL, not JSON
        const sdlToCheck = sdl || subgraph.content;
        if (!sdlToCheck || !sdlToCheck.trim()) {
          setError("No SDL to validate. Click Generate first.");
          setValidMsg(null);
          span.setStatus({ code: 2, message: "empty SDL" });
          return;
        }
        const result = validateSchemaSDL(sdlToCheck);
        span.setAttribute("sdl.valid", result.valid);
        span.setAttribute("sdl.errorCount", result.errors.length);
        span.setAttribute("sdl.typeCount", result.typeCount ?? 0);
        if (result.valid) {
          setError(null);
          setValidMsg(`✅ SDL valid — ${result.typeCount ?? 0} type(s) found`);
          span.setStatus({ code: 1 });
        } else {
          setValidMsg(null);
          setError(`SDL errors: ${result.errors.join("; ")}`);
          span.setStatus({ code: 2, message: result.errors[0] });
        }
      } finally {
        span.end();
      }
    });
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
            title="Validate generated GraphQL SDL"
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
        <Suspense
          fallback={<div className="editor-loading">Loading editor...</div>}
        >
          <CodeMirrorEditor value={subgraph.content} onChange={handleChange} />
        </Suspense>
      </div>
      {error && (
        <div className="editor-error">
          <span>❌ {error}</span>
        </div>
      )}
      {validMsg && !error && (
        <div
          className="editor-error"
          style={{
            background: "#ecfdf5",
            color: "#065f46",
            borderTop: "1px solid #6ee7b7",
          }}
        >
          <span>{validMsg}</span>
        </div>
      )}
      {/* SDL and Stats Section — no className="schema-editor" here; that class sets overflow:hidden which breaks scrolling */}
      <div
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
          overflow: "auto",
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
              <span style={{ color: "var(--color-text-light)" }}>
                No SDL available
              </span>
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
                          <div
                            style={{ color: "#92400e", fontStyle: "italic" }}
                          >
                            {conflict.fieldCount} field(s)
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <span style={{ color: "var(--color-text-light)" }}>
                No statistics available
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
