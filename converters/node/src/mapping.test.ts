/**
 * Tests for the field mapping module.
 */

import {
  parseFieldMapping,
  resolvePointer,
  resolvePointerWithMapping,
  translateFederationFieldSet,
} from "./mapping/index.js";

describe("parseFieldMapping", () => {
  it("parses object format", () => {
    const json = {
      userId: {
        snake: "user_id",
        locations: ["/properties/user_id", "/$defs/User/properties/user_id"],
      },
    };
    const mapping = parseFieldMapping(json);
    expect(mapping.userId).toBeDefined();
    expect(mapping.userId.snake).toBe("user_id");
    expect(mapping.userId.locations).toHaveLength(2);
  });

  it("parses string shorthand", () => {
    const json = { id: "/properties/id" };
    const mapping = parseFieldMapping(json);
    expect(mapping.id.locations).toEqual(["/properties/id"]);
  });

  it("parses array shorthand", () => {
    const json = { id: ["/properties/id", "/a/b"] };
    const mapping = parseFieldMapping(json);
    expect(mapping.id.locations).toEqual(["/properties/id", "/a/b"]);
  });

  it("returns empty for invalid input", () => {
    expect(parseFieldMapping(null)).toEqual({});
    expect(parseFieldMapping({})).toEqual({});
  });
});

describe("resolvePointer", () => {
  it("resolves direct path", () => {
    const schema = { properties: { user_id: { type: "string" } } };
    expect(resolvePointer(schema, "/properties/user_id").type).toBe("string");
  });

  it("resolves with camel/snake variants", () => {
    const schema = { properties: { user_id: { type: "string" } } };
    expect(resolvePointer(schema, "/properties/userId").type).toBe("string");
  });

  it("returns undefined for missing path", () => {
    expect(resolvePointer({}, "/missing")).toBeUndefined();
  });
});

describe("resolvePointerWithMapping", () => {
  it("uses direct resolution first", () => {
    const schema = { properties: { user_id: { type: "string" } } };
    const result = resolvePointerWithMapping(schema, "/properties/user_id", {});
    expect(result).not.toBeNull();
    expect(result?.node.type).toBe("string");
  });

  it("falls back to mapping locations", () => {
    const schema = { properties: { user_id: { type: "string" } } };
    const mapping = {
      userId: {
        snake: "user_id",
        camel: "userId",
        locations: ["properties/user_id"],
      },
    };
    const result = resolvePointerWithMapping(
      schema,
      "/properties/userId",
      mapping,
    );
    expect(result).not.toBeNull();
    expect(result?.node.type).toBe("string");
  });
});

describe("translateFederationFieldSet", () => {
  it("translates tokens via mapping", () => {
    const mapping = {
      user_id: { snake: "user_id", camel: "userId", locations: [] },
    };
    const result = translateFederationFieldSet("user_id email", mapping);
    expect(result).toBe("userId email");
  });

  it("passes through unknown tokens", () => {
    const result = translateFederationFieldSet("id name", {});
    expect(result).toBe("id name");
  });
});
