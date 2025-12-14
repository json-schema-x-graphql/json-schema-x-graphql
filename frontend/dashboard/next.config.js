import withBundleAnalyzer from "@next/bundle-analyzer";
import { createRequire } from "module";
import path from "path";

// Create a CommonJS `require` in this ESM context so calls like `require.resolve` work.
const require = createRequire(import.meta.url);

const withBundleAnalyzerPlugin = withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

// Use project root for path resolution
const projectRoot = process.cwd();

/**
 * @type {import('next').NextConfig}
 */
const config = {
  // Added by scripts/linkinator/track-broken-links.cjs to ensure /graphql-editor is served
  rewrites: async () => [
    { source: '/graphql-editor', destination: '/graphql-editor/index.html' },
    { source: '/graphql-editor/:path*', destination: '/graphql-editor/:path*' },
  ],

  output: "export",
  // Skip Next's ESLint run during `next build` because the repository uses
  // a custom linting pipeline and some ESLint options used by tooling are
  // incompatible with Next's built-in ESLint runner. Developers should still
  // run `pnpm run lint` locally or in CI to validate linting separately.
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  productionBrowserSourceMaps: true,
  // Load heavy editor packages client-side only; avoid transpiling monaco/graphql-editor
  // in the Next build to prevent global CSS from node_modules being processed by the server compiler.
  compiler: {
    styledComponents: true,
  },
  webpack: (config, { isServer }) => {
    // Ensure resolve object exists
    config.resolve = config.resolve || {};
    // Keep existing fallback for fs
    config.resolve.fallback = { fs: false };

    // Add an alias for js-yaml to guard against missing ESM entry files
    // Some bundlers may import 'js-yaml/dist/js-yaml.mjs' but the installed
    // package provides a different entry. This alias maps those imports to
    // the installed CJS entry point under the project root.
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "js-yaml/dist/js-yaml.mjs": path.resolve(projectRoot, "node_modules", "js-yaml", "index.js"),
      "js-yaml": path.resolve(projectRoot, "node_modules", "js-yaml", "index.js"),
    };

    // When building on the server, some packages import Monaco CSS via exact paths
    // which Next's CSS handling inspects too early. Provide server-only aliases that
    // map those CSS imports to a tiny CommonJS shim so the server build won't fail.
    if (isServer) {
      const serverShim = path.resolve(projectRoot, "src", "compat", "server", "empty-css.cjs");
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        "monaco-editor/esm/vs/base/browser/ui/aria/aria.css": serverShim,
        "monaco-editor/esm/vs/base/browser/ui/actionbar/actionbar.css": serverShim,
        "monaco-editor/esm/vs/editor/editor.main.css": serverShim,
        "monaco-editor/esm/vs/editor/edcore.main.css": serverShim,
        "graphql-editor/dist/style.css": serverShim,
      };

      // NOTE: Server externals for editor packages were removed.
      // Removing the externals prevents Next from emitting runtime `require(...)`
      // calls for these packages during prerender/collection of page data which
      // can cause `Cannot find module` errors. We rely on client-only dynamic
      // imports and the alias/shim rules to keep the server build safe.
    }

    // Redirect specific monaco and editor CSS imports to a small compat shim so Next.js
    // doesn't try to process global CSS from node_modules during the server build.
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "monaco-editor/esm/vs/base/browser/ui/aria/aria.css": path.resolve(
        projectRoot,
        "src",
        "compat",
        "monaco-css-shim.js"
      ),
      "monaco-editor/esm/vs/base/browser/ui/actionbar/actionbar.css": path.resolve(
        projectRoot,
        "src",
        "compat",
        "monaco-css-shim.js"
      ),
      "monaco-editor/esm/vs/editor/editor.main.css": path.resolve(
        projectRoot,
        "src",
        "compat",
        "monaco-css-shim.js"
      ),
      "monaco-editor/esm/vs/editor/edcore.main.css": path.resolve(
        projectRoot,
        "src",
        "compat",
        "monaco-css-shim.js"
      ),
      "graphql-editor/dist/style.css": path.resolve(
        projectRoot,
        "src",
        "compat",
        "monaco-css-shim.js"
      ),
    };

    // Ensure module.rules exists
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];

    // Strict early rules: target specific monaco CSS files by exact or narrowly-scoped paths
    // and null them before Next.js' CSS processing runs. These are inserted at the front
    // of the rules array so they take precedence over broader CSS handling rules.
    //
    // This helps prevent the Next.js error: "Global CSS cannot be imported from within node_modules"
    // for known monaco-editor CSS imports (e.g. aria.css, editor.main.css).
    config.module.rules.unshift({
      test: modulePath =>
        typeof modulePath === "string" &&
        /node_modules[\\/]+monaco-editor[\\/].*aria\\.css$/i.test(modulePath),
      use: [
        {
          loader: require.resolve("null-loader"),
        },
      ],
    });

    config.module.rules.unshift({
      test: modulePath =>
        typeof modulePath === "string" &&
        /node_modules[\\/]+monaco-editor[\\/].*(editor\\.main\\.css$|vs[\\/].*\\.css$)/i.test(
          modulePath
        ),
      use: [
        {
          loader: require.resolve("null-loader"),
        },
      ],
    });

    // Use null-loader for global CSS imports originating from various editor-related packages
    // This avoids Next.js error: "Global CSS cannot be imported from within node_modules."
    // Only apply this in the webpack build (affects both dev and production bundling).
    // We specifically match CSS files under monaco-editor, graphql-editor, and Mantine code-highlight.
    //
    // NOTE: Instead of providing a plain RegExp for `test` (which Next.js inspects to
    // detect a custom CSS configuration and disable built-in global CSS support),
    // we use a function-based `test` that only returns true for CSS files inside the
    // targeted node_modules. This keeps the rule narrowly scoped and avoids triggering
    // Next.js' "custom CSS" detection for general CSS handling.
    config.module.rules.push({
      test: modulePath =>
        typeof modulePath === "string" &&
        /\.css$/i.test(modulePath) &&
        /node_modules[\\/]+(monaco-editor|graphql-editor|@monaco-editor[\\/]+react|@mantine[\\/]+code-highlight)/.test(
          modulePath
        ),
      include: [
        /node_modules[\\/]+monaco-editor/,
        /node_modules[\\/]+graphql-editor/,
        /node_modules[\\/]+@monaco-editor[\\/]+react/,
        /node_modules[\\/]+@mantine[\\/]+code-highlight/,
      ],
      // Keep issuer constraint to limit application to imports coming from node_modules.
      issuer: { and: [/node_modules/] },
      use: [
        {
          loader: require.resolve("null-loader"),
        },
      ],
    });

    // Also guard against monaco-editor's web workers requiring CSS by marking those requests as empty.
    // Use a function-based test to keep the rule narrowly targeted and avoid Next.js
    // detecting a broad custom CSS configuration.
    config.module.rules.push({
      test: modulePath =>
        typeof modulePath === "string" &&
        /(actionbar\.css$|editor\.main\.css$)/.test(modulePath) &&
        /node_modules[\\/]+monaco-editor/.test(modulePath),
      include: /node_modules[\\/]+monaco-editor/,
      use: [
        {
          loader: require.resolve("null-loader"),
        },
      ],
    });

    // Replace editor CSS imports from node_modules with a local empty CSS file so Next.js
    // doesn't treat them as global CSS coming from node_modules. NormalModuleReplacementPlugin
    // swaps module requests at compile-time.
    try {
      const webpack = require("webpack");
      // Fix path resolution: empty.css lives under the project `src/styles` directory.
      const emptyCss = path.resolve(projectRoot, "src", "styles", "empty.css");

      // Provide a couple of explicit resolve aliases as a fallback for exact import paths
      // that some packages use. This helps when a package requires a CSS file by exact path
      // (e.g. monaco-editor/esm/vs/base/browser/ui/aria/aria.css) and bypasses the loader rules.
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        "monaco-editor/esm/vs/base/browser/ui/aria/aria.css": emptyCss,
        "monaco-editor/esm/vs/editor/editor.main.css": emptyCss,
      };

      // Match various CSS paths from monaco-editor and graphql-editor
      config.plugins = config.plugins || [];

      // When building for the server, prevent webpack from resolving heavy editor packages
      // at build-time. The IgnorePlugin will stop modules matching the resourceRegExp from
      // being parsed/loaded during the server build, which avoids early CSS import checks.
      if (isServer) {
        try {
          config.plugins.push(
            new webpack.IgnorePlugin({
              resourceRegExp:
                /(?:graphql-editor|@monaco-editor|monaco-editor|@monaco-editor\/react)/,
            })
          );
        } catch (err) {
          // If IgnorePlugin isn't available for some reason, continue gracefully.
        }
      }

      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/monaco-editor[\\/].*\\.css$/i, resource => {
          resource.request = emptyCss;
        })
      );
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/graphql-editor[\\/].*\\.css$/i, resource => {
          resource.request = emptyCss;
        })
      );
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/@monaco-editor[\\/].*\\.css$/i, resource => {
          resource.request = emptyCss;
        })
      );
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /@mantine[\\/].*code-highlight.*\\.css$/i,
          resource => {
            resource.request = emptyCss;
          }
        )
      );
    } catch (e) {
      // If webpack isn't available or plugin fails, continue without plugin — the earlier rules should help.
      // We intentionally do not throw here to avoid breaking Next.js startup.
      // eslint-disable-next-line no-console
      console.warn("Could not register NormalModuleReplacementPlugin for editor CSS:", e);
    }

    config.output.webassemblyModuleFilename = "static/wasm/[modulehash].wasm";
    config.experiments = { asyncWebAssembly: true, layers: true };

    if (!isServer) {
      config.output.environment = { ...config.output.environment, asyncFunction: true };
    }

    return config;
  },
};

const configExport = () => {
  if (process.env.ANALYZE === "true") return withBundleAnalyzerPlugin(config);

  return config;
};

export default configExport();
