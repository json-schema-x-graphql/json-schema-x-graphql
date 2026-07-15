import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.VITE_BASE_URL || "/",
  plugins: [react()],
  server: {
    port: 5176,
    strictPort: true,
    open: true,
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      // @visual-json/react comes from the external/visual-json git submodule which is not
      // initialized in CI. The dynamic import in CodeMirrorEditor.jsx handles the missing
      // package gracefully at runtime via .catch(). Marking it external prevents Vite from
      // failing to resolve the package during the production build.
      external: [
        "@visual-json/react",
        // @graphql-codegen packages use Node.js-only APIs (createRequire, path, process)
        // and are pulled in transitively via the converter's generateTypeScript re-export.
        // They are only used by the CLI, never in the browser app.
        "@graphql-codegen/core",
        "@graphql-codegen/plugin-helpers",
        "@graphql-codegen/typescript",
        "@graphql-codegen/visitor-plugin-common",
        "@graphql-codegen/schema-ast",
      ],
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      process.env.NODE_ENV || "development",
    ),
  },
});
