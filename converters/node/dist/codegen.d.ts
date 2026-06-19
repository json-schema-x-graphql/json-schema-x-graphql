/**
 * Generates TypeScript interfaces from a GraphQL SDL string using @graphql-codegen/core.
 *
 * This function is intentionally NOT exported from the main `converter.ts` barrel
 * because `@graphql-codegen/core` uses Node.js-only APIs (createRequire, path)
 * and cannot be bundled for browser environments via Vite.
 *
 * Import directly: `import { generateTypeScript } from "@json-schema-x-graphql/core/dist/codegen.js"`
 *
 * @param sdl The GraphQL SDL string to generate TypeScript types from.
 * @returns A promise resolving to the generated TypeScript code string.
 */
export declare function generateTypeScript(sdl: string): Promise<string>;
