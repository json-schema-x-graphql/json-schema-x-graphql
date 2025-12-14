/**
 * ClientMonacoEditor.tsx
 *
 * Runtime-only loader for `@monaco-editor/react`.
 *
 * - Uses a bundler-proof dynamic importer (via `new Function('return import(...)')`)
 *   so Next/webpack cannot statically analyze the import and attempt to process
 *   Monaco's node_modules CSS during server builds.
 * - Sets up a small loader config (if available) so consumers that rely on
 *   `loader.config({ paths: { vs: ... }})` can still work when the module loads.
 *
 * Usage:
 * <ClientMonacoEditor
 *   value={...}
 *   language="json"
 *   height={400}
 *   options={...}
 *   onChange={...}
 * />
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { EditorProps } from "@monaco-editor/react";

type Props = Partial<EditorProps> & {
  // Optional explicit loading placeholder shown while the editor is imported
  loading?: React.ReactNode;
  // Optional flag to enable configuring loader.paths (defaults to a CDN path)
  configureLoader?: boolean;
  // Optional URL to use for the monaco `vs` path if loader.config is present
  monacoVsPath?: string;
};

export default function ClientMonacoEditor({
  loading,
  configureLoader = true,
  monacoVsPath = "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs",
  ...editorProps
}: Props) {
  const [EditorComp, setEditorComp] = useState<React.ComponentType<any> | null>(null);
  const loadErrorRef = useRef<Error | null>(null);

  // Memoize the bundler-proof importer so it's stable across renders.
  // Try the CDN ESM first since we're using static export mode where bare
  // specifiers can't be resolved by the browser.
  const runtimeImporter = useMemo(() => {
    // CDN ESM fallback (pin to a known version). Adjust if you prefer a different provider.
    const cdnUrl = "https://esm.sh/@monaco-editor/react@4.7.0";

    return async () => {
      try {
        // Load from CDN first (works in static export mode)
        // @ts-ignore
        return await import(/* @vite-ignore */ cdnUrl);
      } catch (cdnErr) {
        console.warn("CDN import failed, trying local package:", cdnErr);
        // Fallback: try local package (only works in dev mode with bundler)
        try {
          return await import("@monaco-editor/react");
        } catch (localErr) {
          // Both failed, throw the CDN error as it's more likely to succeed
          throw cdnErr;
        }
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    // Kick off the runtime import.
    runtimeImporter()
      .then(mod => {
        if (!mounted) return;

        // Some packages export the editor as default, some as named `Editor`.
        const Comp = mod?.default ?? mod?.Editor ?? mod;

        // Try to configure the loader if requested and available on the imported module.
        try {
          if (configureLoader) {
            // `loader` might live on the imported module or on the module's default export.
            const loader = mod?.loader ?? (mod?.default && mod.default.loader);
            if (loader && typeof loader.config === "function") {
              // Configure a public CDN path for the monaco `vs` assets.
              // This is a best-effort: if it fails, ignore the error.
              loader.config({
                paths: {
                  vs: monacoVsPath,
                },
              });
            }
          }
        } catch (e) {
          // Non-fatal: continue even if loader config fails.

          console.debug && console.debug("monaco loader config failed:", e);
        }

        setEditorComp(() => Comp as React.ComponentType<any>);
      })
      .catch(err => {
        // Store error for debugging and leave EditorComp null
        loadErrorRef.current = err instanceof Error ? err : new Error(String(err));

        console.error("Failed to load @monaco-editor/react at runtime:", err);
      });

    return () => {
      mounted = false;
    };
  }, [runtimeImporter, configureLoader, monacoVsPath]);

  // If we failed to load, show a small fallback UI (or the provided loading node).
  if (!EditorComp) {
    // Prefer user's provided `loading` node, otherwise a simple text fallback.
    return (
      <div style={{ width: "100%", height: "100%", minHeight: 120, position: "relative" }}>
        {loading ?? <div style={{ padding: 12 }}>Loading editor…</div>}
      </div>
    );
  }

  // Render the loaded Monaco Editor component and pass through all props.
  // Cast to any because the runtime component types aren't visible to TypeScript at compile time.
  const Editor = EditorComp as React.ComponentType<EditorProps>;

  return <Editor {...(editorProps as EditorProps)} />;
}
