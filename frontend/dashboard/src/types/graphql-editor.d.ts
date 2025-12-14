/**
 * Ambient module declarations for `graphql-editor`
 * Minimal surface area to satisfy TypeScript in this repo.
 *
 * This file intentionally provides only the props and types that the
 * application currently uses (schema + setSchema and a basic EditorProps shape).
 * Extend as needed if you use more of the library's API.
 */

declare module "graphql-editor" {
  import type * as React from "react";

  /**
   * A passed schema can be provided as source code (SDL string) and optional
   * library map (string -> SDL). Some library variants accept a single string
   * for libraries; we allow both shapes here.
   */
  export type PassedSchema = {
    code: string;
    // Libraries may be a map of name -> SDL or a single SDL string depending on usage.
    libraries?: Record<string, string> | string;
    // (Optional) any additional metadata the editor might attach
    [key: string]: any;
  };

  /**
   * Minimal external API surface for the editor that consuming code might use.
   * This is deliberately small — add methods as you discover real usage.
   */
  export interface ExternalEditorAPI {
    getSchema?: () => PassedSchema;
    setSchema?: (schema: PassedSchema) => void;
    // allow consumers to call other utility methods (typing as any to be permissive)
    [key: string]: any;
  }

  /**
   * Props the embedded editor accepts. The real package contains many more
   * options; provide optional shapes used by this codebase.
   */
  export interface EditorProps {
    schema: PassedSchema;
    setSchema?: (schema: PassedSchema) => void;
    readOnly?: boolean;
    /**
     * Optional callback that receives the editor API instance once ready.
     */
    onReady?: (api: ExternalEditorAPI) => void;
    // other common props (permissive)
    [key: string]: any;
  }

  /**
   * React component exported by the library.
   * Accepts `EditorProps` and renders the interactive editor.
   */
  export const GraphQLEditor: React.ComponentType<EditorProps>;

  export default GraphQLEditor;
}

/**
 * Allow importing the package stylesheet path that some code attempts to load.
 * This prevents TS module-not-found errors when doing `import 'graphql-editor/dist/style.css'`.
 */
declare module "graphql-editor/dist/style.css" {
  const css: string;
  export default css;
}
