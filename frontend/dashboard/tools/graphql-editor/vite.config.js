import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * Vite configuration for the standalone GraphQL Editor app.
 *
 * - `base` controls the base public path the built assets will be served from.
 *   Default: '/graphql-editor/' so the built output can be copied into
 *   Next's `public/graphql-editor/` directory and served at /graphql-editor/.
 *
 * - `build.outDir` is set to the repo's `public/graphql-editor` so a `pnpm build`
 *   from this tools directory will produce files directly consumable by Next.
 *
 * - `server.port` default chosen to avoid common port collisions in dev.
 *
 * Override the base path by setting the `BASE_PATH` environment variable
 * when running Vite (e.g. `BASE_PATH=/foo/ pnpm build`).
 */
export default defineConfig({
  base: process.env.BASE_PATH || "/graphql-editor/",
  plugins: [react()],
  server: {
    port: Number(process.env.EDITOR_PORT || 5174),
    strictPort: false,
  },
  preview: {
    port: Number(process.env.EDITOR_PORT || 5174),
  },
  build: {
    // Output directly into the Next.js public folder so the main site can serve it.
    outDir: path.resolve(__dirname, "../../public/graphql-editor"),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      // Keep default options; adjust if you need to externalize large libs
      output: {
        // Ensure assets use relative paths under the configured base
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
  resolve: {
    alias: {
      // If you need to override libs during development, add aliases here.
      // Example: 'graphql-editor': path.resolve(__dirname, 'path/to/local/graphql-editor')
    },
  },
  optimizeDeps: {
    // Keep empty by default; you can add packages to force pre-bundling if needed.
    // exclude: ['some-package-to-exclude'],
  },
});
