import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

/**
 * Vite entrypoint for the standalone GraphQL Editor app.
 * - Mounts the React app into #root
 * - Enables HMR when running under Vite
 */

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root element not found: expected an element with id 'root'");
}

const root = createRoot(container);

function Main() {
  return (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

root.render(<Main />);

// Enable HMR for the App module so edits update instantly in dev
if (import.meta.hot) {
  import.meta.hot.accept("./App", (newModule) => {
    // Re-import the updated App component and re-render
    const NextApp = newModule?.default;
    if (NextApp) {
      root.render(
        <React.StrictMode>
          <NextApp />
        </React.StrictMode>,
      );
    }
  });
}
