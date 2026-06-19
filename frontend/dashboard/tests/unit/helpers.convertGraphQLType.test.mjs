import { describe, test, expect } from "@jest/globals";
import { buildSchema } from "graphql";
import { convertGraphQLType } from "../../scripts/helpers/generate-graphql-json-schema-helpers.mjs";

describe("convertGraphQLType", () => {
  test("converts scalar, list and non-null types", () => {
    const schema = buildSchema(
      `type Query { a: String b: [String] c: String! }`,
    );
    const typeMap = schema.getTypeMap();
    const ctx = { definitions: new Map(), building: new Set(), schema };

    const Query = typeMap.Query;
    const fields = Query.getFields();

    const a = convertGraphQLType(fields.a.type, ctx);
    expect(a.schema).toBeDefined();

    const b = convertGraphQLType(fields.b.type, ctx);
    expect(b.schema.type).toBe("array");

    const c = convertGraphQLType(fields.c.type, ctx);
    expect(c.nullable).toBe(false);
  });
});
