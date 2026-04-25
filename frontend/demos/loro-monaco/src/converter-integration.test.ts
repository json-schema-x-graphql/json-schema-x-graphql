import { describe, it, expect, vi, beforeEach } from "vitest";
import { jsonSchemaToGraphQL, graphqlToJsonSchema } from "./converter-integration";

// Mock the WASM module
// We need to mock the default export (init) and the named exports
vi.mock("./wasm/json_schema_graphql_converter.js", () => {
  return {
    default: vi.fn().mockResolvedValue(undefined),
    jsonSchemaToGraphQL: vi.fn(),
    graphqlToJsonSchema: vi.fn(),
  };
});

// Import the mocked module to access the mock functions
import * as wasmModule from "./wasm/json_schema_graphql_converter.js";

describe("Converter Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("jsonSchemaToGraphQL", () => {
    it("should successfully convert JSON Schema to GraphQL SDL", async () => {
      const mockJsonSchema = '{"type": "string"}';
      const mockSdl = "scalar String";

      // Setup mock implementation
      vi.mocked(wasmModule.jsonSchemaToGraphQL).mockReturnValue(mockSdl);

      const result = await jsonSchemaToGraphQL(mockJsonSchema);

      // Verify init was called (indirectly via the promise in the module)
      // Note: Since init is called at module level, checking call count might be tricky
      // depending on when the module was loaded, but ensures the flow works.

      expect(wasmModule.jsonSchemaToGraphQL).toHaveBeenCalledWith(mockJsonSchema);
      expect(result).toBe(mockSdl);
    });

    it("should handle WASM conversion errors gracefully", async () => {
      const mockJsonSchema = "invalid";
      const errorMessage = "Conversion failed";

      // Setup mock to throw
      vi.mocked(wasmModule.jsonSchemaToGraphQL).mockImplementation(() => {
        throw new Error(errorMessage);
      });

      await expect(jsonSchemaToGraphQL(mockJsonSchema)).rejects.toThrow(
        `Failed to convert JSON Schema to GraphQL: ${errorMessage}`,
      );
    });

    it("should throw if return type is not string", async () => {
      // Setup mock to return something unexpected
      // @ts-expect-error - testing invalid return type
      vi.mocked(wasmModule.jsonSchemaToGraphQL).mockReturnValue(123);

      await expect(jsonSchemaToGraphQL("{}")).rejects.toThrow(
        "Failed to convert JSON Schema to GraphQL: Unexpected return type from WASM. Expected a GraphQL SDL string.",
      );
    });
  });

  describe("graphqlToJsonSchema", () => {
    it("should successfully convert GraphQL SDL to JSON Schema", async () => {
      const mockSdl = "type Query { hello: String }";
      const mockJsonSchema = '{"type":"object"}';

      // Setup mock implementation
      vi.mocked(wasmModule.graphqlToJsonSchema).mockReturnValue(mockJsonSchema);

      const result = await graphqlToJsonSchema(mockSdl);

      expect(wasmModule.graphqlToJsonSchema).toHaveBeenCalledWith(mockSdl);
      expect(result).toBe(mockJsonSchema);
    });

    it("should handle WASM conversion errors gracefully", async () => {
      const mockSdl = "invalid";
      const errorMessage = "Parse error";

      // Setup mock to throw
      vi.mocked(wasmModule.graphqlToJsonSchema).mockImplementation(() => {
        throw new Error(errorMessage);
      });

      await expect(graphqlToJsonSchema(mockSdl)).rejects.toThrow(
        `Failed to convert GraphQL to JSON Schema: ${errorMessage}`,
      );
    });

    it("should throw if return type is not string", async () => {
      // Setup mock to return something unexpected
      // @ts-expect-error - testing invalid return type
      vi.mocked(wasmModule.graphqlToJsonSchema).mockReturnValue(null);

      await expect(graphqlToJsonSchema("type Query { id: ID }")).rejects.toThrow(
        "Failed to convert GraphQL to JSON Schema: Unexpected return type from WASM. Expected a JSON Schema string.",
      );
    });
  });
});
