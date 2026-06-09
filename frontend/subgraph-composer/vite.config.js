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
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      process.env.NODE_ENV || "development",
    ),
  },
});
