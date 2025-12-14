import { useEffect, useRef, useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import Script from "next/script";

declare global {
  interface Window {
    GraphQLVoyager?: {
      renderVoyager: (
        element: HTMLElement,
        options: {
          introspection: unknown;
          displayOptions?: Record<string, unknown>;
        }
      ) => void;
    };
  }
}

const GraphQLPage: NextPage = () => {
  const singleRef = useRef<HTMLDivElement | null>(null);
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"canonical" | "hinted" | "unified_model">("canonical");
  const [compare, setCompare] = useState<boolean>(false);
  const [schemaLabel, setSchemaLabel] = useState<string>(
    "Schema Unification (canonical) - /data/schema_unification.graphql"
  );

  useEffect(() => {
    if (!scriptReady) return;

    let cancelled = false;

    const resolveCandidates = (m: "canonical" | "hinted" | "unified_model"): string[] => {
      if (m === "unified_model") {
        return [
          "/data/generated/unified_model/unified_model.graphql",
          "/data/unified_model.graphql",
          "/generated-schemas/unified_model/sdl/unified_model.graphql",
        ];
      }
      if (m === "hinted") {
        // Try the curated hinted SDL first, then fall back to any generated
        // composition supergraph we may have created during artifact generation.
        // NOTE: static dev server only exposes files under `public/`; to
        // use the generated path below either copy the file into
        // `public/data/supergraph/supergraph.graphql` or create a
        // symlink so it's reachable at runtime.
        return [
          "/data/schema_unification-contract_data-hinted.graphql",
          "/data/supergraph/supergraph.graphql",
          "/generated-schemas/supergraph/supergraph.graphql",
        ];
      }
      // Prefer the generated composition supergraph as the canonical view
      return [
        "/data/supergraph/supergraph.graphql",
        "/generated-schemas/supergraph/supergraph.graphql",
        "/data/schema_unification.graphql",
      ];
    };

    const pickFirstOk = async (urls: string[]): Promise<{ url: string; text: string }> => {
      for (const u of urls) {
        const r = await fetch(u);
        if (r.ok) {
          return { url: u, text: await r.text() };
        }
      }
      throw new Error(`Failed to load SDL from: ${urls.join(", ")}`);
    };

    const renderVoyager = async () => {
      try {
        // Initialize from URL on first run
        const params = new URLSearchParams(window.location.search);
        const qpMode = (params.get("mode") || "").toLowerCase() as
          | "canonical"
          | "hinted"
          | "unified_model"
          | "";
        const qpCompare = params.get("compare");
        if (!params.has("initialized")) {
          // Only set from URL once
          if (qpMode === "canonical" || qpMode === "hinted" || qpMode === "unified_model") {
            setMode(qpMode);
          }
          if (qpCompare === "1" || qpCompare === "true") {
            setCompare(true);
          }
          params.set("initialized", "1");
          window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
        }

        const graphqlModule = await import("graphql");
        const { buildSchema, getIntrospectionQuery, graphql } = graphqlModule as {
          buildSchema: (sdl: string) => any;
          getIntrospectionQuery: () => string;
          graphql: (args: any) => Promise<any>;
        };

        const voyager = window.GraphQLVoyager;
        if (!voyager) {
          throw new Error("GraphQLVoyager library is not available on window");
        }

        // Update URL to reflect current selection
        const nextParams = new URLSearchParams(window.location.search);
        nextParams.set("mode", mode);
        if (compare) nextParams.set("compare", "1");
        else nextParams.delete("compare");
        nextParams.set("initialized", "1");
        window.history.replaceState({}, "", `${window.location.pathname}?${nextParams.toString()}`);

        if (!compare) {
          // Single mode
          const cur = singleRef.current;
          if (!cur) throw new Error("Voyager container has not been initialised");
          cur.innerHTML = ""; // clear
          const { url, text } = await pickFirstOk(resolveCandidates(mode));
          setSchemaLabel(
            mode === "unified_model"
              ? `Unified Model View - ${url}`
              : mode === "hinted"
                ? `Schema Unification (hinted) - ${url}`
                : `Schema Unification (canonical) - ${url}`
          );
          const schema = buildSchema(text);
          const introspection = await graphql({ schema, source: getIntrospectionQuery() });
          if (introspection.errors?.length) {
            throw new Error(introspection.errors.map((e: any) => e.message).join("\n"));
          }
          if (cancelled) return;
          voyager.renderVoyager(cur, {
            introspection,
            displayOptions: { sortByAlphabet: true, showLeafFields: true },
          });
        } else {
          // Side-by-side: canonical (left) vs Unified Model (right)
          const left = leftRef.current;
          const right = rightRef.current;
          if (!left || !right) throw new Error("Voyager panes have not been initialised");
          left.innerHTML = "";
          right.innerHTML = "";

          const [{ url: lUrl, text: lSDL }, { url: rUrl, text: rSDL }] = await Promise.all([
            pickFirstOk(resolveCandidates("canonical")),
            pickFirstOk(resolveCandidates("unified_model")),
          ]);

          setSchemaLabel(`Compare: canonical (${lUrl}) vs Unified Model (${rUrl})`);

          const [lSchema, rSchema] = [buildSchema(lSDL), buildSchema(rSDL)];
          const [lIntrospection, rIntrospection] = await Promise.all([
            graphql({ schema: lSchema, source: getIntrospectionQuery() }),
            graphql({ schema: rSchema, source: getIntrospectionQuery() }),
          ]);

          if (lIntrospection.errors?.length) {
            throw new Error(lIntrospection.errors.map((e: any) => e.message).join("\n"));
          }
          if (rIntrospection.errors?.length) {
            throw new Error(rIntrospection.errors.map((e: any) => e.message).join("\n"));
          }
          if (cancelled) return;

          voyager.renderVoyager(left, {
            introspection: lIntrospection,
            displayOptions: { sortByAlphabet: true, showLeafFields: true },
          });
          voyager.renderVoyager(right, {
            introspection: rIntrospection,
            displayOptions: { sortByAlphabet: true, showLeafFields: true },
          });
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Unknown error initialising Voyager";
        setError(message);
        console.error("[GraphQLPage]", err);
      }
    };

    renderVoyager();

    return () => {
      cancelled = true;
    };
  }, [scriptReady, mode, compare]);

  return (
    <>
      <Head>
        <title>GraphQL Schema Viewer | Schema Unification Forest</title>
        <meta
          name="description"
          content="Visualize the Schema Unification Forest GraphQL schema as an interactive graph using GraphQL Voyager."
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/graphql-voyager/dist/voyager.css"
        />
      </Head>

      <Script
        src="https://cdn.jsdelivr.net/npm/graphql-voyager/dist/voyager.standalone.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => setError("Failed to load GraphQL Voyager CDN bundle.")}
      />

      <div className="voyager-wrapper">
        <div className="voyager-header">
          <div className="header-content">
            <h1>GraphQL Schema</h1>
            <p className="header-subtitle">{schemaLabel}</p>
          </div>
          <div className="header-controls">
            <div className="mode-toggle" role="group" aria-label="Schema mode">
              <button
                className={`toggle-btn ${mode === "canonical" ? "active" : ""}`}
                onClick={() => setMode("canonical")}
              >
                Canonical
              </button>
              <button
                className={`toggle-btn hinted ${mode === "hinted" ? "active" : ""}`}
                onClick={() => setMode("hinted")}
                aria-pressed={mode === "hinted"}
              >
                Hinted
              </button>
              <button
                className={`toggle-btn ${mode === "unified_model" ? "active" : ""}`}
                onClick={() => setMode("unified_model")}
              >
                Unified Model
              </button>
            </div>
            <label className="compare-toggle">
              <input
                type="checkbox"
                checked={compare}
                onChange={e => setCompare(e.target.checked)}
              />
              Compare canonical vs Unified Model
            </label>

            <a className="editor-btn" href="/graphql-editor" title="Open GraphQL Editor">
              Open Editor
            </a>
          </div>
        </div>

        {error ? (
          <div className="voyager-error" role="alert">
            {error}
          </div>
        ) : !compare ? (
          <div ref={singleRef} id="voyager" aria-live="polite">
            Loading GraphQL Voyager…
          </div>
        ) : (
          <div className="voyagers" aria-live="polite">
            <div className="voyager-pane">
              <div className="pane-header">Canonical</div>
              <div ref={leftRef} id="voyager-left">
                Loading GraphQL Voyager…
              </div>
            </div>
            <div className="voyager-pane">
              <div className="pane-header">Unified Model</div>
              <div ref={rightRef} id="voyager-right">
                Loading GraphQL Voyager…
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .voyager-wrapper {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
        }

        .voyager-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .header-content h1 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .header-subtitle {
          margin: 0.25rem 0 0 0;
          font-size: 0.875rem;
          opacity: 0.9;
        }

        #voyager {
          flex: 1;
          width: 100%;
          overflow: hidden;
        }

        .header-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .mode-toggle {
          display: inline-flex;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          overflow: hidden;
        }

        .toggle-btn {
          appearance: none;
          border: none;
          padding: 0.4rem 0.75rem;
          color: #fff;
          background: transparent;
          cursor: pointer;
          transition:
            background 0.15s ease-in-out,
            color 0.15s ease-in-out;
        }

        .toggle-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        /* Distinct styling for the Hinted button to make it stand out */
        .toggle-btn.hinted {
          color: #1f2937; /* dark text to contrast with warm background */
          background: rgba(255, 215, 0, 0.12);
        }

        .toggle-btn.hinted:hover {
          background: rgba(255, 215, 0, 0.2);
        }

        .toggle-btn.hinted.active {
          background: rgba(255, 215, 0, 0.35);
          font-weight: 700;
        }

        .toggle-btn.active {
          background: rgba(255, 255, 255, 0.3);
          font-weight: 600;
        }

        .editor-btn {
          margin-left: 12px;
          font-size: 0.9rem;
          color: #0b5fff;
          background: rgba(11, 95, 255, 0.06);
          padding: 6px 10px;
          border-radius: 6px;
          text-decoration: none;
          border: 1px solid rgba(11, 95, 255, 0.12);
        }

        .editor-btn:hover {
          background: rgba(11, 95, 255, 0.1);
        }

        .compare-toggle {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          user-select: none;
        }

        .voyagers {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          height: 100%;
          width: 100%;
        }

        .voyager-pane {
          display: flex;
          flex-direction: column;
          height: 100%;
          border-left: 1px solid rgba(0, 0, 0, 0.08);
          border-right: 1px solid rgba(0, 0, 0, 0.08);
          background: #fff;
        }

        .pane-header {
          padding: 0.4rem 0.75rem;
          background: #f3f4f6;
          color: #111827;
          font-size: 0.85rem;
          border-bottom: 1px solid #e5e7eb;
        }

        #voyager-left,
        #voyager-right {
          flex: 1;
          width: 100%;
          overflow: hidden;
        }

        .voyager-error {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1;
          padding: 2rem;
          color: #dc2626;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 0.5rem;
          margin: 2rem;
          font-family: monospace;
          white-space: pre-wrap;
        }
      `}</style>
    </>
  );
};

export default GraphQLPage;
