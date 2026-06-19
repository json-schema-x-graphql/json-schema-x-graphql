/**
 * Generates TypeScript interfaces from a GraphQL SDL string using @graphql-codegen/core.
 * @param sdl The GraphQL SDL string.
 * @returns A promise resolving to the generated TypeScript code.
 */
export declare function generateTypeScript(sdl: string): Promise<string>;
