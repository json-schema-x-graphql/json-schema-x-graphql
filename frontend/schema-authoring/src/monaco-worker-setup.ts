/**
 * Monaco Worker Setup Helper
 *
 * Purpose:
 * - Provide a small, robust helper to configure `window.MonacoEnvironment.getWorker`
 *   so Monaco can load its web workers correctly in common bundlers (Vite, webpack, esbuild).
 * - Works with ESM-based builds (recommended) using `new URL(..., import.meta.url)` and
 *   falls back to base-url concatenation when a non-ESM worker loading strategy is required.
 *
 * Usage:
 *   import { setupMonacoWorkers } from './monaco-worker-setup';
 *   setupMonacoWorkers(); // call early, e.g. before mounting editors
 *
 * Notes:
 * - This file intentionally avoids direct runtime imports from `monaco-editor` so it can be
 *   executed even before Monaco is fully loaded. We create Worker instances via URLs that
 *   resolve to monaco's internal worker modules for ESM builds.
 * - If your build or hosting requires a different path, pass { workerBaseUrl }.
 */

type SetupOptions = {
  // Optional Monaco instance to operate on (if not provided we try window.monaco)
  monaco?: any;
  // Optional base URL to prepend to worker module paths (e.g. '/assets/')
  workerBaseUrl?: string;
  // Optionally disable console warnings
  silenceWarnings?: boolean;
};

const DEFAULT_WORKER_PATHS = {
  editor: 'monaco-editor/esm/vs/editor/editor.worker',
  json: 'monaco-editor/esm/vs/language/json/json.worker',
  css: 'monaco-editor/esm/vs/language/css/css.worker',
  html: 'monaco-editor/esm/vs/language/html/html.worker',
  ts: 'monaco-editor/esm/vs/language/typescript/ts.worker',
  // Keep this for future language-specific workers if needed
};

/**
 * Try to create a Worker using multiple strategies to support different bundlers/runtimes.
 *
 * Strategy order:
 *  1) ESM worker: new Worker(new URL(path, import.meta.url), { type: 'module' })
 *  2) Worker via provided workerBaseUrl: new Worker(workerBaseUrl + '/' + path + '.js')
 *  3) Global configured base: window.__MONACO_WORKER_BASE__ + path + '.js'
 *  4) Fallback to `new Worker(path)` (best-effort)
 */
function createWorkerFromPath(path: string, workerBaseUrl?: string): Worker {
  // 1) Preferred - ESM worker with import.meta.url (works with Vite / modern bundlers)
  try {
    // Using `new URL(..., import.meta.url)` allows bundlers to resolve the module and emit a worker chunk.
    // The `type: 'module'` option is required for ESM worker entrypoints.
    // We append `.js` only when bundlers require it; some will map correctly without it.
    // Note: This can throw at runtime on bundlers/environments that don't support `import.meta.url` inside a dynamic context.
    // eslint-disable-next-line no-new
    return new Worker(new URL(path, import.meta.url) as unknown as string, { type: 'module' });
  } catch (e) {
    // swallow and continue to next strategy
  }

  // 2) Use explicit base URL if supplied
  if (workerBaseUrl) {
    try {
      const adjusted = workerBaseUrl.endsWith('/') ? workerBaseUrl + path + '.js' : workerBaseUrl + '/' + path + '.js';
      // eslint-disable-next-line no-new
      return new Worker(adjusted);
    } catch (e) {
      // continue
    }
  }

  // 3) Use globally configured base (conventional)
  try {
    const globalBase = (typeof window !== 'undefined' && (window as any).__MONACO_WORKER_BASE__) || undefined;
    if (globalBase) {
      const url = globalBase.endsWith('/') ? globalBase + path + '.js' : globalBase + '/' + path + '.js';
      // eslint-disable-next-line no-new
      return new Worker(url);
    }
  } catch (e) {
    // continue
  }

  // 4) Best-effort fallback: try worker path directly (may work if assets are copied)
  try {
    // eslint-disable-next-line no-new
    return new Worker(path + '.js');
  } catch (err) {
    // Final fallback: throw a helpful error so developer can diagnose missing worker files
    throw new Error(
      `Monaco worker instantiation failed for "${path}". ` +
        `Provide a valid workerBaseUrl or ensure worker files are available under the expected path.`,
    );
  }
}

/**
 * Configure `window.MonacoEnvironment.getWorker`.
 * Call this before any Monaco editors mount.
 */
export function setupMonacoWorkers(options: SetupOptions = {}) {
  const { monaco, workerBaseUrl, silenceWarnings } = options;

  const globalObj: any =
    (typeof window !== 'undefined' ? (window as any) : undefined) ||
    (typeof globalThis !== 'undefined' ? globalThis : undefined);

  const monacoInstance = monaco || (globalObj && globalObj.monaco);

  if (!globalObj) {
    // Nothing to do in non-browser contexts
    return;
  }

  if (!silenceWarnings && typeof console !== 'undefined') {
    // lightweight notice for debugging setups
    console.debug?.('[monaco-worker-setup] initializing Monaco worker environment');
  }

  // If getWorker already exists, don't override it (allows other runtime to configure)
  if (globalObj.MonacoEnvironment && typeof globalObj.MonacoEnvironment.getWorker === 'function') {
    if (!silenceWarnings && typeof console !== 'undefined') {
      console.debug?.('[monaco-worker-setup] MonacoEnvironment.getWorker already defined - skipping override');
    }
    return;
  }

  // Map language label -> worker path. Extend as needed.
  function getWorkerPathByLabel(label?: string | undefined): string {
    if (!label) return DEFAULT_WORKER_PATHS.editor;
    const normalized = label.toLowerCase();
    if (normalized === 'json') return DEFAULT_WORKER_PATHS.json;
    if (normalized === 'css' || normalized === 'scss' || normalized === 'less') return DEFAULT_WORKER_PATHS.css;
    if (normalized === 'html' || normalized === 'handlebars' || normalized === 'razor') return DEFAULT_WORKER_PATHS.html;
    if (normalized === 'typescript' || normalized === 'javascript' || normalized === 'ts' || normalized === 'js') return DEFAULT_WORKER_PATHS.ts;
    // GraphQL doesn't have a dedicated Monaco worker in the upstream package; fallback to editor worker
    if (normalized === 'graphql') return DEFAULT_WORKER_PATHS.editor;
    return DEFAULT_WORKER_PATHS.editor;
  }

  // Install global MonacoEnvironment.getWorker
  globalObj.MonacoEnvironment = globalObj.MonacoEnvironment || {};

  globalObj.MonacoEnvironment.getWorker = function (_moduleId: string, label?: string) {
    const workerPath = getWorkerPathByLabel(label);
    try {
      return createWorkerFromPath(workerPath, workerBaseUrl);
    } catch (err) {
      // Surface a console error but still attempt to return a generic worker via editor.worker
      if (!silenceWarnings && typeof console !== 'undefined') {
        console.error?.(
          '[monaco-worker-setup] Failed to create worker for',
          label,
          '->',
          workerPath,
          '\n',
          err,
        );
      }
      // Final attempt to return editor worker or throw
      try {
        return createWorkerFromPath(DEFAULT_WORKER_PATHS.editor, workerBaseUrl);
      } catch (fatal) {
        // If even the fallback fails, escalate
        throw fatal;
      }
    }
  };

  // Optionally, if a monaco instance is available, add a small helper to it so other modules can verify configuration.
  if (monacoInstance && typeof monacoInstance.getConfiguredWorker !== 'function') {
    monacoInstance.getConfiguredWorker = function () {
      return {
        hasMonaco: true,
        getWorker: typeof globalObj.MonacoEnvironment.getWorker === 'function',
        workerBaseUrl: workerBaseUrl || (globalObj.__MONACO_WORKER_BASE__ || null),
      };
    };
  }
}

/**
 * Convenience default export for quickly initializing with default options.
 * Call this early in your application start-up (before editors mount).
 *
 * Example:
 *   import setupMonacoWorkers from './monaco-worker-setup';
 *   setupMonacoWorkers(); // default
 */
export default setupMonacoWorkers;
