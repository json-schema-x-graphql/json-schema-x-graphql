import React, { useEffect, useState, useRef } from "react";
import type { PassedSchema } from "graphql-editor";
import { Loro } from "loro-crdt";
import { federationDirectives } from "./federation-directives";
import { parse } from "graphql";
import { MonacoEditor } from "./MonacoEditor";

let workerUrl: URL | null = null;
if (typeof window !== "undefined") {
  // Prefer resolving the worker from the installed `graphql-editor-worker` package
  // so Vite can serve the pre-bundled worker. Fall back to the public path if that
  // resolution fails (useful for environments where node_modules resolution isn't possible).
  try {
    // import.meta.url resolution allows bundlers (Vite) to rewrite the path to the
    // correct served asset in dev and build modes.
    workerUrl = new URL(
      "graphql-editor-worker/lib/worker/validation.worker.js",
      import.meta.url,
    );
    // Helpful runtime diagnostic for dev
    // eslint-disable-next-line no-console
    console.log(
      "[GraphQLVisualEditor] Resolved graphql-editor worker via package:",
      workerUrl.href,
    );
  } catch (err) {
    // If package resolution fails, try the public fallback
    // eslint-disable-next-line no-console
    console.warn(
      "[GraphQLVisualEditor] Could not resolve graphql-editor-worker via import.meta.url:",
      err,
    );
    try {
      workerUrl = new URL("/validation.worker.js", window.location.origin);
      // eslint-disable-next-line no-console
      console.log(
        "[GraphQLVisualEditor] Falling back to public worker path:",
        workerUrl.href,
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(
        "[GraphQLVisualEditor] Failed to construct fallback worker URL:",
        e,
      );
      workerUrl = null;
    }
  }
}

// Editor will be dynamically imported on the client to avoid bundling monaco/css during SSR
// and to provide a graceful fallback when the package fails to load.

interface GraphQLVisualEditorProps {
  value: string;
  onChange?: (value: string) => void;
  loroDoc?: Loro | null;
  textKey: string;
  readOnly?: boolean;
  className?: string;
}

/**
 * Error boundary to catch render-time errors coming from the upstream visual editor.
 * When an error occurs we notify the parent via `onError` so the parent can fall
 * back to the Monaco editor and surface diagnostics.
 */
class EditorErrorBoundary extends React.Component<
  { onError?: (err: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // Log for diagnostics and notify parent so it can render fallback
    console.error("GraphQLEditor render error:", error, info);
    if (this.props.onError) {
      try {
        this.props.onError(error);
      } catch (e) {
        // ignore errors from onError handler
      }
    }
  }

  render() {
    if (this.state.hasError) {
      // Parent will render the fallback UI (Monaco) when we report the error.
      return null;
    }
    return this.props.children;
  }
}

export const GraphQLVisualEditor = React.forwardRef<
  any,
  GraphQLVisualEditorProps
>(
  (
    { value, onChange, loroDoc, textKey, readOnly = false, className = "" },
    ref,
  ) => {
    const [error, setError] = useState<string | null>(null);
    const [schema, setSchema] = useState<PassedSchema>({
      code: value,
      libraries: federationDirectives,
      source: "outside",
    });

    // Dynamic editor component and load state
    const [Editor, setEditor] = useState<React.ComponentType<any> | null>(null);
    const [editorLoadError, setEditorLoadError] = useState<string | null>(null);
    const didAttemptLoadRef = useRef(false);

    // Attempt a client-only dynamic import of `graphql-editor`. If the import fails,
    // we surface the error and fall back to the Monaco-based plain editor.
    useEffect(() => {
      if (typeof window === "undefined") return;
      if (Editor) return;
      if (didAttemptLoadRef.current) return;

      didAttemptLoadRef.current = true;
      setEditorLoadError(null);

      // Use indirect import so static bundlers don't pull monaco/css into SSR builds.
      // Add runtime diagnostics to help identify why the visual editor may not mount.
      const runtimeImporter = new Function('return import("graphql-editor")');
      let canceled = false;

      // Diagnostic: show that we are attempting the dynamic import
      // eslint-disable-next-line no-console
      console.log(
        "[GraphQLVisualEditor] Attempting dynamic import of graphql-editor...",
      );

      (runtimeImporter() as Promise<any>)
        .then((mod: any) => {
          if (canceled) return;

          // Log module export shape to help debugging export/name mismatches
          // eslint-disable-next-line no-console
          console.log(
            "[GraphQLVisualEditor] graphql-editor module loaded:",
            Object.keys(mod || {}),
          );

          const Comp = (mod && (mod.GraphQLEditor ?? mod.default)) || mod;
          if (!Comp) {
            throw new Error("graphql-editor did not export a usable component");
          }

          // Log resolved worker URL to verify worker path is available to the editor
          // eslint-disable-next-line no-console
          console.log(
            "[GraphQLVisualEditor] Using worker URL:",
            workerUrl ? workerUrl.href : "(none)",
          );

          setEditor(() => Comp as React.ComponentType<any>);
        })
        .catch((err: unknown) => {
          if (canceled) return;
          const e = err as Error;
          const msg = String((e && e.message) ?? String(err));
          // Better diagnostics in the console for devs running the demo
          // eslint-disable-next-line no-console
          console.error(
            "[GraphQLVisualEditor] Failed to load graphql-editor dynamically:",
            err,
          );
          // Surface the message so the UI can show the fallback and the reason
          setEditorLoadError(msg);
        });

      return () => {
        canceled = true;
      };
    }, [Editor]);

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
          parse(value);
          setError(null);
        } catch (e) {
          const err = e as Error;
          console.warn(
            "⚠️ GraphQLVisualEditor: Schema validation warning:",
            err.message,
          );
          setError(err.message);
        }

        try {
          setSchema({
            code: value,
            libraries: federationDirectives,
            source: "outside",
          });
        } catch (error) {
          console.error("❌ GraphQLVisualEditor: Failed to set schema", error);
          // Try to show error in console for debugging
          const err = error as Error;
          console.error("Schema content that failed:", value);
          console.error("Error details:", err.message);
          setError(err.message);
        }
      }
    }, [value, schema.code]);

    const handleSchemaChange = (newSchema: PassedSchema) => {
      if (readOnly) {
        console.log(
          "⏭️ GraphQLVisualEditor: Skipping schema change (readOnly)",
        );
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

    // Retry handler to re-attempt the dynamic import of the visual editor.
    // Resets the attempt flag and clears errors so the import effect can run again.
    const handleRetryLoadEditor = () => {
      console.log(
        "[GraphQLVisualEditor] Retry requested for graphql-editor dynamic import",
      );
      setEditorLoadError(null);
      setEditor(null);
      didAttemptLoadRef.current = false;
    };

    return (
      <div
        className={`graphql-visual-editor ${className}`}
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {error && (
          <div className="bg-red-900 text-white p-2 text-sm overflow-auto max-h-32 border-b border-red-700 shrink-0">
            <strong>Schema Error:</strong> {error}
          </div>
        )}
        <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
          {Editor ? (
            // Render the full visual editor inside an Error Boundary to catch render-time exceptions.
            <EditorErrorBoundary
              onError={(err: Error) => {
                const msg = String((err && err.message) ?? String(err));
                console.error(
                  "GraphQLEditor render-time error (caught by boundary):",
                  err,
                );
                // Unregister the visual editor component so we fall back to Monaco and show the error.
                setEditor(null);
                setEditorLoadError(msg);
              }}
            >
              <Editor
                ref={ref}
                schema={schema}
                setSchema={handleSchemaChange}
                readonly={readOnly}
                path="/"
                workers={{
                  validation: workerUrl ? workerUrl.href : undefined,
                }}
              />
            </EditorErrorBoundary>
          ) : (
            // Fallback: show import/load error (if present) and a Monaco-based editor
            <>
              {editorLoadError && (
                <div
                  className="bg-yellow-900 text-white p-2 text-sm overflow-auto max-h-32 border-b border-yellow-700"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong>Editor Load Error:</strong>{" "}
                    <span
                      style={{
                        display: "inline-block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "80%",
                      }}
                    >
                      {editorLoadError}
                    </span>
                  </div>
                  <div style={{ flex: "none" }}>
                    <button
                      onClick={handleRetryLoadEditor}
                      className="px-3 py-1 bg-indigo-600 rounded hover:bg-indigo-700"
                      title="Retry loading the visual GraphQL editor"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
              <MonacoEditor
                value={schema.code}
                language="graphql"
                onChange={(val) =>
                  handleSchemaChange({ ...schema, code: val ?? "" })
                }
                loroDoc={loroDoc}
                textKey={textKey}
                readOnly={readOnly}
                height="100%"
              />
            </>
          )}
        </div>
      </div>
    );
  },
);
