import { defineConfig, searchForWorkspaceRoot } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  server: {
    port: 3002,
    open: true,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd())],
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    target: "esnext",
  },
  optimizeDeps: {
    exclude: ["loro-crdt"],
    include: ["graphql-editor-worker"],
    esbuildOptions: {
      target: "esnext",
    },
  },
  worker: {
    format: "es",
    plugins: () => [wasm(), topLevelAwait()],
  },
});
