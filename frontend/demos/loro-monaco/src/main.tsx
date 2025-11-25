import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";
// @ts-ignore
import { GraphQLEditorWorker } from "graphql-editor-worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";

window.MonacoEnvironment = {
  getWorker: (_workerId: string, label: string) => {
    if (label === "graphql") {
      return new GraphQLEditorWorker() as any;
    }
    if (label === "json") {
      return new jsonWorker();
    }
    return new editorWorker();
  },
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
