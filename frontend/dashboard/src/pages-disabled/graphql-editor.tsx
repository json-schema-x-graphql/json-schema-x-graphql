import React, { useEffect, useState } from "react";
import Head from "next/head";

type PassedSchema = {
  code: string;
  libraries?: Record<string, string> | string;
};

export default function GraphQLEditorPage(): JSX.Element {
  const [schema, setSchema] = useState<PassedSchema | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load the editor at runtime on the client to avoid Next.js detecting monaco/editor CSS
  // during the server build (which causes the "Global CSS cannot be imported from within node_modules" error).
  const [EditorComponent, setEditorComponent] = useState<React.ComponentType<any> | null>(null);
  const [editorLoading, setEditorLoading] = useState<boolean>(false);
  const [editorLoadError, setEditorLoadError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;

    // Only run in the browser and when we have a schema to display.
    if (typeof window === "undefined") return;
    if (!schema) return;
    if (EditorComponent || editorLoading) return;

    setEditorLoading(true);
    setEditorLoadError(null);

    // Runtime import: Next's server build won't evaluate this import, preventing CSS checks.
    // Use an indirect runtime importer via `new Function` so build-time static analysis
    // (webpack/Next) cannot see the `import("graphql-editor")` call. This prevents the
    // server build from attempting to process monaco-editor's CSS during compilation.
    const runtimeImporter = new Function('return import("graphql-editor")');
    runtimeImporter()
      .then(mod => {
        if (canceled) return;
        // Prefer named export `GraphQLEditor`, fall back to default or module itself
        const Comp = (mod && (mod.GraphQLEditor ?? mod.default)) || mod;
        setEditorComponent(() => Comp as React.ComponentType<any>);
      })
      .catch(err => {
        if (canceled) return;
        setEditorLoadError(String(err?.message ?? err));
      })
      .finally(() => {
        if (!canceled) setEditorLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [schema, EditorComponent, editorLoading]);

  // Attempt to load styles for the editor on the client only.
  useEffect(() => {
    // Optionally include styling for the GraphQLEditor via your global CSS
    // or by adding the package stylesheet to your app's build step.
    // We intentionally avoid a direct import here to prevent TypeScript
    // module-not-found errors in environments where the CSS path is not present.
  }, []);

  useEffect(() => {
    let canceled = false;

    async function loadInitialSDL() {
      setLoading(true);
      setError(null);
      try {
        // Primary source: public path that exists in this repo
        const response = await fetch("/data/schema_unification.graphql");
        if (!response.ok) {
          throw new Error(`Failed to fetch SDL: ${response.status}`);
        }
        const sdl = await response.text();

        if (canceled) return;

        // Build a PassedSchema for GraphQLEditor. Libraries can be used to
        // provide auxiliary schemas; keep it minimal for now.
        const initial: PassedSchema = {
          code: sdl,
          libraries: {} as Record<string, string>, // add additional named libraries if you want
        };

        setSchema(initial);
      } catch (err: unknown) {
        if (canceled) return;
        let msg = String(err);
        if (err && typeof err === "object" && "message" in err) {
          // Narrow to message property if available.
          msg = (err as any).message ?? String(err);
        }
        setError(msg);
        // provide a tiny fallback schema so editor still mounts
        setSchema({
          code: "type Query { _noop: String }",
        });
      } finally {
        if (!canceled) setLoading(false);
      }
    }

    loadInitialSDL();

    return () => {
      canceled = true;
    };
  }, []);

  return (
    <>
      <Head>
        <title>GraphQL Editor - Schema Unification Forest</title>
        <meta name="description" content="Edit and explore the generated GraphQL schema" />
        <meta name="robots" content="noindex" />
      </Head>

      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <header
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "var(--mantine-color-white, #fff)",
            zIndex: 10,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>GraphQL Editor</h1>
          <div style={{ marginLeft: 8, color: "#666", fontSize: 13 }}>
            Edit the schema for the site (loaded from <code>/data/schema_unification.graphql</code>)
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <a
              href="/data/schema_unification.graphql"
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: 13,
                color: "#0b5fff",
                textDecoration: "none",
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid rgba(11,95,255,0.12)",
                background: "rgba(11,95,255,0.04)",
              }}
            >
              Open raw SDL
            </a>
          </div>
        </header>

        <main style={{ flex: 1, position: "relative", minHeight: 0 }}>
          {loading && (
            <div
              style={{
                padding: 24,
                fontSize: 15,
                color: "#444",
              }}
            >
              Loading GraphQL Editor…
            </div>
          )}

          {error && (
            <div
              style={{
                padding: 12,
                color: "#7a1f0a",
                background: "rgba(122,31,10,0.06)",
                borderTop: "1px solid rgba(122,31,10,0.08)",
              }}
            >
              Error loading schema: {error}
            </div>
          )}

          {/* Render the editor only on the client and once schema state is available */}
          {!loading && schema && EditorComponent && (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                position: "relative",
                flex: 1,
              }}
            >
              {/* GraphQLEditor accepts setSchema and schema props. */}
              <EditorComponent
                setSchema={(next: PassedSchema) => {
                  setSchema(next);
                }}
                schema={schema}
              />
            </div>
          )}
        </main>
      </div>
    </>
  );
}
