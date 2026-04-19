import { jsonSchemaToGraphQL } from "./converter";

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

  it("handles circular $ref structures gracefully", () => {
    const schema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      "x-graphql-type-name": "Node",
      properties: {
        id: { type: "string" },
        next: { $ref: "#" }
      },
      required: ["id"]
    };

    const sdl = jsonSchemaToGraphQL(JSON.stringify(schema));

    expect(sdl).toContain("type Node");
    expect(sdl).toContain("id: String!");
    expect(sdl).toContain("next: Node");
  });

  it("handles deeply nested array $refs", () => {
    const schema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      "x-graphql-type-name": "Matrix",
      properties: {
        data: {
          type: "array",
          items: {
            type: "array",
            items: { $ref: "#/$defs/Cell" }
          }
        }
      },
      $defs: {
        Cell: {
          type: "object",
          "x-graphql-type-name": "Cell",
          properties: {
            value: { type: "number" }
          }
        }
      }
    };

    const sdl = jsonSchemaToGraphQL(JSON.stringify(schema));

    expect(sdl).toContain("type Matrix");
    expect(sdl).toContain("data: [[Cell]]");
    expect(sdl).toContain("type Cell");
    expect(sdl).toContain("value: Float");
  });
});
