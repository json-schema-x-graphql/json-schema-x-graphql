/**
 * monaco-css-shim.js
 *
 * Lightweight compatibility shim that acts as a harmless replacement for
 * monaco-editor / graphql-editor CSS imports. When webpack/Next resolves a
 * CSS import to this JS module (via `resolve.alias` or `NormalModuleReplacementPlugin`),
 * the module:
 *
 *  - exports an empty string (CommonJS + ESM) so imports succeed,
 *  - injects a no-op <style> tag on the client to satisfy any runtime side-effects
 *    that expect CSS to have been applied (the tag is empty).
 *
 * This avoids Next.js build-time errors about "Global CSS cannot be imported from within node_modules"
 * while still keeping runtime behavior safe.
 *
 * Usage (example in next.config.js):
 *   config.resolve.alias['monaco-editor/esm/vs/base/browser/ui/aria/aria.css'] = pathToThisFile;
 *
 * Keep this file intentionally minimal.
 */

const EMPTY_CSS = "";

/* If running in a browser environment, append an empty <style> node once.
   This is a no-op but can prevent edge-cases where code expects styles to exist. */
if (typeof document !== "undefined") {
  try {
    const STYLE_ID = "ttse-monaco-css-shim";
    if (!document.getElementById(STYLE_ID)) {
      const styleEl = document.createElement("style");
      styleEl.id = STYLE_ID;
      styleEl.type = "text/css";
      // Intentionally empty
      styleEl.appendChild(document.createTextNode(EMPTY_CSS));
      // Use append rather than prepend to avoid interfering with critical app styles
      document.head && document.head.appendChild(styleEl);
    }
  } catch (e) {
    // Silence any DOM-related errors — shim must be safe.
  }
}

// CommonJS export for environments that require it
if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
  module.exports = EMPTY_CSS;
}

// Named ESM export (and default)
export const css = EMPTY_CSS;
export default EMPTY_CSS;
