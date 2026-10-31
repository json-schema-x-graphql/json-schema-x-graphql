import { graphqlToJsonSchema, jsonSchemaToGraphQL } from "./converter";
import type { JsonSchema } from "./interfaces";

/**
 * A schema with no faithful GraphQL equivalent falls back to the `JSON`
 * scalar. That scalar has to be declared as well as referenced: SDL that uses
 * `JSON` without a `scalar JSON` declaration is invalid GraphQL
 * (`Unknown type "JSON"`), and converting it back to JSON Schema produces a
 * `$ref` to a definition that was never created — a dangling reference on the
 * next cycle.
 *
 * Mirrors `converters/rust/tests/resolve_ref_regression.rs`.
 */
describe("JSON fallback scalar declaration", () => {
  const schema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    "x-graphql-type-name": "Root",
    properties: {
      anything: { anyOf: [{ type: "string" }, { type: "integer" }] },
    },
  } as JsonSchema;

  it("declares scalar JSON alongside the fields that use it", () => {
    const sdl = jsonSchemaToGraphQL(schema);

    expect(sdl).toContain("anything: JSON");
    expect(sdl.split("\n").some((line) => line.trim() === "scalar JSON")).toBe(
      true,
    );
  });

  it("does not leave a dangling JSON $ref after a round trip", () => {
    const json = JSON.parse(graphqlToJsonSchema(jsonSchemaToGraphQL(schema)));
    // The core emits draft-07 `definitions`; draft 2020-12 input uses `$defs`.
    const definitions = json.definitions ?? json.$defs ?? {};

    expect(definitions.JSON).toBeDefined();

    const dangling: string[] = [];
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (node && typeof node === "object") {
        for (const [key, value] of Object.entries(node)) {
          if (key === "$ref" && typeof value === "string") {
            const match = /^#\/(?:definitions|\$defs)\/(.+)$/.exec(value);
            if (match && !(match[1] in definitions)) dangling.push(value);
          }
          walk(value);
        }
      }
    };
    walk(json);

    expect(dangling).toEqual([]);

    // And the second cycle must still surface the JSON scalar.
    expect(jsonSchemaToGraphQL(json as JsonSchema)).toContain("anything: JSON");
  });
});
