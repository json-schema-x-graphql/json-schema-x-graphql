import { Converter, jsonSchemaToGraphQL } from "./converter";

describe("jsonSchemaToGraphQL - nested $ref resolution", () => {
  it("resolves chained $ref entries inside $defs", () => {
    const schema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      "x-graphql-type-name": "Root",
      properties: {
        profile: { $ref: "#/$defs/Profile" },
      },
      $defs: {
        Profile: {
          type: "object",
          "x-graphql-type-name": "Profile",
          properties: {
            id: { type: "string" },
            address: { $ref: "#/$defs/Address" },
          },
          required: ["id", "address"],
        },
        Address: {
          type: "object",
          "x-graphql-type-name": "Address",
          properties: {
            street: { type: "string" },
          },
          required: ["street"],
        },
      },
    };

    const sdl = jsonSchemaToGraphQL(JSON.stringify(schema));

    expect(sdl).toContain("type Root");
    expect(sdl).toContain("profile: Profile");
    expect(sdl).toContain("type Profile");
    expect(sdl).toContain("address: Address!");
    expect(sdl).toContain("type Address");
    expect(sdl).toContain("street: String!");
  });

  it("resolves $ref pointers that target nested properties via JSON Pointer", () => {
    const schema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      "x-graphql-type-name": "Root",
      properties: {
        deep: { $ref: "#/$defs/Structure/properties/data" },
      },
      $defs: {
        Structure: {
          type: "object",
          properties: {
            data: {
              type: "object",
              "x-graphql-type-name": "DeepData",
              properties: {
                value: { type: "integer" },
              },
              required: ["value"],
            },
          },
        },
      },
    };

    const sdl = jsonSchemaToGraphQL(JSON.stringify(schema));

    expect(sdl).toContain("type Root");
    expect(sdl).toContain("deep: DeepData");
    expect(sdl).toContain("type DeepData");
    expect(sdl).toContain("value: Int!");
  });
});

describe("Converter.convert - outputFormat AST_JSON", () => {
  const schema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    "x-graphql-type-name": "Root",
    properties: {
      id: { type: "string" },
    },
    required: ["id"],
  };

  it("returns serialized AST JSON instead of failing to re-parse it as SDL", async () => {
    const result = await new Converter().convert({
      jsonSchema: JSON.stringify(schema),
      options: { outputFormat: "AST_JSON" },
    });

    expect(result.success).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.output).not.toBeNull();

    const ast = JSON.parse(result.output as string);
    expect(ast.kind).toBe("Document");
    expect(JSON.stringify(ast.definitions)).toContain("Root");
  });

  it("matches the direct function's AST_JSON output", async () => {
    const result = await new Converter().convert({
      jsonSchema: JSON.stringify(schema),
      options: { outputFormat: "AST_JSON" },
    });
    const direct = jsonSchemaToGraphQL(JSON.stringify(schema), {
      outputFormat: "AST_JSON",
    });

    expect(result.output).toBe(direct);
  });

  it("returns the literal 'null' for empty output", async () => {
    const result = await new Converter().convert({
      jsonSchema: JSON.stringify({}),
      options: { outputFormat: "AST_JSON" },
    });

    expect(result.success).toBe(true);
    expect(result.output).toBe("null");
  });
});
