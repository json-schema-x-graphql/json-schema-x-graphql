/// <reference types="vite/client" />

declare module "monaco-editor/esm/vs/language/json/json.worker?worker" {
  const worker: new () => Worker;
  export default worker;
}

declare module "monaco-editor/esm/vs/editor/editor.worker?worker" {
  const worker: new () => Worker;
  export default worker;
}
