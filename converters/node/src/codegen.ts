import { codegen } from "@graphql-codegen/core";
import * as typescriptPlugin from "@graphql-codegen/typescript";
import { parse, GraphQLSchema, buildSchema } from "graphql";

/**
 * Generates TypeScript interfaces from a GraphQL SDL string using @graphql-codegen/core.
 * @param sdl The GraphQL SDL string.
 * @returns A promise resolving to the generated TypeScript code.
 */
export async function generateTypeScript(sdl: string): Promise<string> {
  // We parse the SDL to an AST DocumentNode
  const schemaAst = parse(sdl);
  
  const config = {
    documents: [],
    config: {},
    // Filename is required by the codegen core API
    filename: "generated.ts",
    schema: schemaAst,
    plugins: [
      { typescript: {} }
    ],
    pluginMap: {
      typescript: typescriptPlugin
    }
  };
  
  return await codegen(config);
}
