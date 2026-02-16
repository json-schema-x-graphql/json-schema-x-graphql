
import { jsonSchemaToGraphQL, graphqlToJsonSchema } from "./converter.js";
import { JsonSchema } from "./interfaces.js";

describe("Roundtrip Integrity", () => {
  it("should preserve x-graphql-directives in roundtrip", async () => {
    const originalJson: JsonSchema = {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "User",
      type: "object",
      "x-graphql-directives": ["@key(fields: \"id\")"],
      properties: {
        id: { 
            type: "string", 
            "x-graphql-directives": ["@external"] 
        },
        username: { type: "string" }
      },
      required: ["id", "username"]
    };

    const sdl = jsonSchemaToGraphQL(originalJson, {
      federationVersion: "V2",
      includeFederationDirectives: true 
    });
    
    // SDL should have @key and @external
    expect(sdl).toContain('@key(fields: "id")');
    expect(sdl).toContain('@external');

    const roundtrippedJsonStr = graphqlToJsonSchema(sdl, { });
    const roundtrippedJson = JSON.parse(roundtrippedJsonStr);

    console.log("Original:", JSON.stringify(originalJson, null, 2));
    console.log("SDL:", sdl);
    console.log("Roundtripped:", JSON.stringify(roundtrippedJson, null, 2));

    // Check directives on type
    expect(roundtrippedJson["x-graphql-directives"]).toBeDefined();
    // Normalization might change format, but let's check basic presence
    const typeDirs = roundtrippedJson["x-graphql-directives"];
    const hasKey = Array.isArray(typeDirs) && typeDirs.some(d => 
        (typeof d === 'string' && d.includes('key')) || 
        (typeof d === 'object' && d.name === 'key')
    );
    expect(hasKey).toBe(true);

    // Check directives on field
    // Note: roundtrip structure puts root properties at top level for "Root" type
    const fieldDirs = roundtrippedJson.properties?.id["x-graphql-directives"];
    expect(fieldDirs).toBeDefined();
    const hasExternal = Array.isArray(fieldDirs) && fieldDirs.some(d => 
        (typeof d === 'string' && d.includes('external')) || 
        (typeof d === 'object' && d.name === 'external')
    );
    expect(hasExternal).toBe(true);
  });
});
