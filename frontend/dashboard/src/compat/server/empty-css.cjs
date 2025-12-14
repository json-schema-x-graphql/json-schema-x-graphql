/**
 * Server-side shim for CSS imports used to satisfy CommonJS `require` calls
 * during the Next.js / webpack server-side build. Some packages import CSS
 * via absolute or relative paths which can trigger Next's "Global CSS cannot
 * be imported from within node_modules" check when the build statically
 * analyzes modules.
 *
 * Importing this file (via resolve.alias in next.config.js) lets the build
 * succeed by providing a harmless CommonJS module in place of a CSS file.
 *
 * Usage (example next.config.js):
 *   config.resolve.alias['monaco-editor/esm/vs/base/browser/ui/aria/aria.css'] =
 *     path.resolve(projectRoot, 'src/compat/server/empty-css.cjs');
 *
 * The module exports an empty string as the CSS content and marks itself as an
 * ESModule-compatible export to work with different import styles.
 */

"use strict";

const EMPTY = "";

// CommonJS export
module.exports = EMPTY;

// Named ESM-like default export for bundlers that read `default`
module.exports.default = EMPTY;

// Provide __esModule flag so interop behaves as expected
Object.defineProperty(module.exports, "__esModule", { value: true });

// Optional: a no-op toString for some bundlers/runtime usages
module.exports.toString = function toString() {
  return EMPTY;
};
