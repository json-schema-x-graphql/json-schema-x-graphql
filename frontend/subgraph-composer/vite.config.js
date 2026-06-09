import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.VITE_BASE_URL || "/",
  plugins: [react()],
  server: {
    port: 5175,
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
      external: ["@visual-json/react"],
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      process.env.NODE_ENV || "development",
    ),
  },
});
