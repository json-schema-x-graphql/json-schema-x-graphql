import { jsonSchemaToGraphQL } from "./converter";

describe("Viaduct Directives", () => {
  it("should process viaduct extensions correctly", () => {
    const schema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      "x-graphql-type-name": "User",
      "x-graphql-viaduct-backing-data": { type: "com.example.User" },
      properties: {
        id: {
          type: "string",
          "x-graphql-viaduct-resolver": { isBatching: true },
        },
        email: {
          type: "string",
          "x-graphql-viaduct-resolver": true,
          "x-graphql-viaduct-id-of": { type: "Email" },
        },
      },
    };

    const result = jsonSchemaToGraphQL(schema);

    expect(result).toContain('@backingData(type: "com.example.User")');
    expect(result).toContain("id: String @resolver(isBatching: true)");
    expect(result).toContain('email: String @resolver @idOf(type: "Email")');
  });
});
