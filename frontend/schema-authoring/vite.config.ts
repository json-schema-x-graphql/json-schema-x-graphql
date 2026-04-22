import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import path from "path";
import fs from "fs";

// Check if WASM directory exists
const wasmDir = path.resolve(__dirname, "./src/wasm");
const hasWasm = fs.existsSync(wasmDir);

if (!hasWasm) {
  console.warn("⚠️  WASM module not found. The app will use Node.js converter fallback.");
  console.info("💡 To enable WASM: run `pnpm run build:wasm`");
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  base: process.env.VITE_BASE_URL || "./", // Support for GitHub Pages or relative paths
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@wasm": hasWasm
        ? path.resolve(__dirname, "./src/wasm")
        : path.resolve(__dirname, "./src/lib"),
    },
  },
  define: {
    // Monaco editor needs this
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
  },
  build: {
    target: "esnext",
    minify: "terser",
    sourcemap: true,
    rollupOptions: {
      external: hasWasm ? [] : ["@wasm/json_schema_x_graphql"],
    },
  },
  optimizeDeps: {
    exclude: ["@json-schema-x-graphql/wasm"],
    include: ["monaco-editor"],
    esbuildOptions: {
      target: "esnext",
    },
  },
  server: {
    port: 3003,
    strictPort: false,
    host: true,
    fs: {
      // Allow serving files from the converters directory
      allow: ["../.."],
    },
    proxy: {
      // Proxy API requests to the Node converter server
      "/api": {
        target: "http://localhost:3004",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 4003,
    strictPort: false,
    host: true,
  },
  worker: {
    format: "es",
    plugins: () => [wasm(), topLevelAwait()],
  },
});
