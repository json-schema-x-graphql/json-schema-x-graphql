/**
 * monaco-react-shim.cjs
 *
 * Server-side CommonJS shim for `@monaco-editor/react`.
 *
 * Purpose:
 * - Satisfy `require('@monaco-editor/react')` during server-side prerender/build steps
 *   so Node/Next does not throw "Cannot find module" when server code (or emitted
 *   require calls) reference the package.
 * - Provide minimal no-op exports that mimic the surface area the app expects:
 *   - a default React component (no-op)
 *   - named `Editor` export aliasing the default
 *   - a `loader` object with a `config` noop (some code calls `loader.config(...)`)
 *   - `useMonaco` that returns null on the server
 *
 * Notes:
 * - Keep this file CommonJS so it can be used directly by server builds that
 *   resolve aliases to this path.
 * - This shim intentionally does not attempt to implement Monaco functionality.
 *   It only prevents runtime/module-not-found failures during server-side work.
 */

"use strict";

let React = null;
try {
  // Try to require React if it is available in node_modules. If it's not, fall back
  // to null and return plain `null` from the component.
  React = require("react");
} catch (e) {
  React = null;
}

/**
 * A minimal no-op React component to act as the editor on the server.
 * It renders `null` (no DOM) and accepts any props so consumer code can call it.
 */
function NoopEditor(props) {
  // If React is available, return a lightweight React element (null is fine).
  // Returning `null` is safe either way.
  return null;
}
NoopEditor.displayName = "MonacoEditorServerShim";

/**
 * Minimal `loader` object. Some client code calls `loader.config({ paths: { vs: ... } })`.
 * Provide a no-op `config` so server-side imports won't fail.
 */
const loader = {
  config: function () {
    // noop on server
    return;
  },
  // Some packages reference `loader.init()` — provide a harmless stub.
  init: function () {
    return Promise.resolve();
  },
};

/**
 * `useMonaco` hook stub for server environment.
 * Client usage should guard against null; on server we just return null.
 */
function useMonaco() {
  return null;
}

/**
 * Also export a tiny `monaco` placeholder (empty object) in case code reads it.
 * On the client the real `window.monaco` will be present once Monaco loads.
 */
const monaco = {};

/**
 * Export the shims:
 * - default export: NoopEditor (so `import Editor from '@monaco-editor/react'` works)
 * - named exports: Editor, loader, useMonaco, monaco
 */
module.exports = NoopEditor;
module.exports.default = NoopEditor;
module.exports.Editor = NoopEditor;
module.exports.loader = loader;
module.exports.useMonaco = useMonaco;
module.exports.monaco = monaco;
module.exports.__esModule = true;
