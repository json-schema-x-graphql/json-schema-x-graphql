import React, { useEffect, useState, useCallback, Suspense } from "react";

const GraphQLEditor = React.lazy(() =>
  import("graphql-editor").then((mod) => ({ default: mod.GraphQLEditor || mod.default })),
);

/**
 * Standalone GraphQL Editor App
 *
 * - Loads a chosen SDL from the host site's `public/data/*` paths (so the same server can serve both apps).
 * - Provides mode selector (canonical, hinted, v2) and small controls to open raw SDL or copy it.
 * - Renders the `GraphQLEditor` component with the loaded SDL.
 *
 * This file is intended to live inside a small Vite app (tools/graphql-editor) and run
 * independently from the main Next.js build to avoid bundling issues with Monaco / global CSS.
 */

const MODES = [
  {
    key: "canonical",
    label: "Canonical (schema_unification.graphql)",
    path: "/data/schema_unification.graphql",
  },
  {
    key: "hinted",
    label: "Hinted (schema_unification-contract_data-hinted.graphql)",
    path: "/data/schema_unification-contract_data-hinted.graphql",
  },
  {
    key: "v2",
    label: "V2 (schema_unification-v2.graphql)",
    path: "/data/schema_unification-v2.graphql",
  },
];

export default function App() {
  const [mode, setMode] = useState("canonical");
  const [schema, setSchema] = useState({ code: "type Query { _noop: String }" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSDL = useCallback(
    async (m = mode) => {
      setLoading(true);
      setError(null);
      try {
        const candidate = MODES.find((x) => x.key === m) || MODES[0];
        const res = await fetch(candidate.path);
        if (!res.ok) {
          throw new Error(`Failed to fetch ${candidate.path} (HTTP ${res.status})`);
        }
        const text = await res.text();
        setSchema({ code: text });
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        // Keep a minimal fallback schema so the editor can render
        setSchema({ code: "type Query { _noop: String }" });
        setLoading(false);
      }
    },
    [mode],
  );

  useEffect(() => {
    // load on mount and whenever mode changes
    loadSDL(mode);
  }, [mode, loadSDL]);

  const handleModeChange = async (e) => {
    const next = e.target.value;
    setMode(next);
  };

  const openRaw = () => {
    const candidate = MODES.find((x) => x.key === mode) || MODES[0];
    window.open(candidate.path, "_blank", "noopener,noreferrer");
  };

  const copySDL = async () => {
    try {
      await navigator.clipboard.writeText(schema.code || "");
      // simple visual feedback (could be improved with toasts)
      // eslint-disable-next-line no-alert
      alert("SDL copied to clipboard");
    } catch {
      // eslint-disable-next-line no-alert
      alert("Failed to copy SDL to clipboard");
    }
  };

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.titleBlock}>
          <h1 style={styles.title}>GraphQL Editor — Schema Unification Forest (Standalone)</h1>
          <p style={styles.subtitle}>
            Edit and explore the generated GraphQL SDL. This editor runs as an isolated app to avoid
            bundling issues with Monaco and the main site.
          </p>
        </div>

        <div style={styles.controls}>
          <label style={styles.label}>
            Mode
            <select value={mode} onChange={handleModeChange} style={styles.select}>
              {MODES.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={openRaw} style={styles.button}>
              Open raw SDL
            </button>
            <button onClick={copySDL} style={styles.button}>
              Copy SDL
            </button>
            <button
              onClick={() => {
                // reload current SDL from server
                loadSDL(mode);
              }}
              style={styles.button}
            >
              Reload
            </button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {loading && (
          <div style={styles.loading}>
            <div style={styles.loaderDot} />
            <div>Loading SDL…</div>
          </div>
        )}

        {error && (
          <div style={styles.error}>
            <strong>Error loading SDL:</strong> {error}
          </div>
        )}

        {!loading && (
          <div style={styles.editorWrapper}>
            <Suspense fallback={<div style={styles.loading}>Loading editor…</div>}>
              <GraphQLEditor
                schema={schema}
                setSchema={(next) => {
                  // GraphQLEditor calls setSchema while editing; store the latest in state
                  setSchema(next);
                }}
                // optional: expose editor API hook if needed by adding onReady prop
              />
            </Suspense>
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        <small>
          Built as an isolated Vite app. To serve from the main site, build and copy the output to
          the Next.js site's <code>/public/graphql-editor</code> directory.
        </small>
      </footer>
    </div>
  );
}

const styles = {
  app: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
    background: "#f8fafc",
    color: "#0f172a",
  },
  header: {
    padding: "12px 16px",
    borderBottom: "1px solid rgba(15,23,42,0.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    background: "#fff",
  },
  titleBlock: {
    display: "flex",
    flexDirection: "column",
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
  },
  subtitle: {
    margin: 0,
    marginTop: 4,
    color: "#475569",
    fontSize: 13,
  },
  controls: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    fontSize: 12,
    color: "#334155",
    gap: 6,
    marginRight: 8,
  },
  select: {
    marginLeft: 6,
    padding: "6px 8px",
    borderRadius: 6,
    border: "1px solid #cbd5e1",
    background: "#fff",
  },
  button: {
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#fff",
    cursor: "pointer",
    fontSize: 13,
  },
  main: {
    flex: 1,
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },
  loading: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    flexDirection: "column",
    color: "#475569",
  },
  loaderDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#7c3aed",
    animation: "pulse 1s infinite ease-in-out",
  },
  editorWrapper: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    position: "relative",
  },
  error: {
    padding: 12,
    background: "#fff1f2",
    color: "#7f1d1d",
    border: "1px solid #fecaca",
    margin: 12,
    borderRadius: 6,
  },
  footer: {
    padding: 10,
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    background: "#fff",
    borderTop: "1px solid rgba(15,23,42,0.04)",
  },
};

/* keyframes inline for loader; Vite will accept this string-injection */
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes pulse {
  0% { opacity: 0.25; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.15); }
  100% { opacity: 0.25; transform: scale(0.9); }
}
`;
document.head.appendChild(styleSheet);
