import { extractDirectives, printDirectives } from "./directives";

describe("Directives Normalization", () => {
  describe("extractDirectives", () => {
    it("should process explicit x-graphql-directives arrays of strings", () => {
      const schema = {
        "x-graphql-directives": ["@custom", '@auth(role: "admin")'],
      };
      const result = extractDirectives(schema, {
        includeFederationDirectives: true,
      } as any);
      expect(result).toEqual([
        { name: "custom", raw: "@custom" },
        { name: "auth", raw: '@auth(role: "admin")' },
      ]);
    });

    it("should process explicit x-graphql-directives arrays of objects", () => {
      const schema = {
        "x-graphql-directives": [
          { name: "custom", arguments: { arg1: "val1" } },
        ],
      };
      const result = extractDirectives(schema, {
        includeFederationDirectives: true,
      } as any);
      expect(result).toEqual([{ name: "custom", args: { arg1: "val1" } }]);
    });

    it("should process federation shortcut directives", () => {
      const schema = {
        "x-graphql-federation-shareable": true,
        "x-graphql-federation-inaccessible": true,
        "x-graphql-federation-keys": [
          "id",
          { fields: "email", resolvable: false },
        ],
      };
      const result = extractDirectives(schema, {
        includeFederationDirectives: true,
      } as any);
      expect(result).toEqual(
        expect.arrayContaining([
          { name: "shareable" },
          { name: "inaccessible" },
          { name: "key", args: { fields: "id" } },
          { name: "key", args: { fields: "email", resolvable: false } },
        ]),
      );
    });

    it("should skip federation directives if includeFederationDirectives is false", () => {
      const schema = {
        "x-graphql-directives": ['@key(fields: "id")', "@custom"],
        "x-graphql-federation-shareable": true,
      };
      const result = extractDirectives(schema, {
        includeFederationDirectives: false,
      } as any);
      expect(result).toEqual([{ name: "custom", raw: "@custom" }]);
    });
  });

  describe("printDirectives", () => {
    it("should print raw directives as-is", () => {
      const result = printDirectives([
        { name: "custom", raw: "@custom(a: 1)" },
      ]);
      expect(result).toBe(" @custom(a: 1)");
    });

    it("should stringify arguments correctly", () => {
      const result = printDirectives([
        { name: "custom", args: { str: "val", num: 42, bool: true } },
      ]);
      expect(result).toBe(' @custom(str: "val", num: 42, bool: true)');
    });

    it("should handle nested scopes arrays correctly", () => {
      const result = printDirectives([
        {
          name: "requiresScopes",
          args: { scopes: [["read", "write"], ["admin"]] },
        },
      ]);
      expect(result).toBe(
        ' @requiresScopes(scopes: [["read", "write"], ["admin"] ])',
      );
      // Normalize spaces for simpler comparison since formatting is tested
    });

    it("should return empty string for no directives", () => {
      expect(printDirectives([])).toBe("");
    });
  });
});
