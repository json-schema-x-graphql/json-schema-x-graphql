/**
 * Unit tests for converter.js
 * Tests conversion, validation, and formatting functionality
 */

import { describe, it, expect } from "@jest/globals";
import {
  convertSchema,
  validateJsonSchema,
  formatJsonSchema,
  getConverterInfo,
  enhanceSchemaWithIdMetadata,
} from "../lib/converter";

describe("Converter Library", () => {
  describe("convertSchema", () => {
    it("should convert valid JSON Schema to GraphQL SDL", async () => {
      const schema = {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "User",
        type: "object",
        properties: {
          id: { type: "string", description: "User ID" },
          name: { type: "string" },
        },
        required: ["id"],
      };

      const result = await convertSchema(schema);

      expect(result.success).toBe(true);
      expect(result.sdl).toBeDefined();
      expect(typeof result.sdl).toBe("string");
      expect(result.sdl).toContain("User");
      expect(result.sdl).toContain("id");
      expect(result.sdl).toContain("name");
    });

    it("should handle JSON string input", async () => {
      const schemaString = JSON.stringify({
        title: "Product",
        type: "object",
        properties: { id: { type: "string" } },
      });

      const result = await convertSchema(schemaString);

      expect(result.success).toBe(true);
      expect(result.sdl).toContain("Product");
    });

    it("should return error for invalid schema", async () => {
      const result = await convertSchema(null);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.sdl).toBeNull();
    });

    it("should support conversion options", async () => {
      const schema = {
        title: "Order",
        type: "object",
        properties: {
          id: { type: "string" },
          items: { type: "array" },
        },
      };

      const result = await convertSchema(schema, {
        federation: true,
        descriptions: true,
      });

      expect(result.success).toBe(true);
      expect(result.sdl).toBeDefined();
    });

    it("should handle schema with enums", async () => {
      const schema = {
        title: "Status",
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["active", "inactive", "pending"],
          },
        },
      };

      const result = await convertSchema(schema);

      expect(result.success).toBe(true);
      expect(result.sdl).toContain("status");
    });

    it("should handle schema with descriptions", async () => {
      const schema = {
        title: "Document",
        description: "A document in the system",
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Document title",
          },
        },
      };

      const result = await convertSchema(schema, { descriptions: true });

      expect(result.success).toBe(true);
      expect(result.sdl).toContain("Document");
    });
  });

  describe("validateJsonSchema", () => {
    it("should validate valid schema", () => {
      const schema = {
        title: "Valid",
        type: "object",
        properties: { id: { type: "string" } },
      };

      const result = validateJsonSchema(schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect invalid schema", () => {
      const result = validateJsonSchema(null);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should warn about missing schema properties", () => {
      const schema = {
        type: "object",
        properties: {},
      };

      const result = validateJsonSchema(schema);

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should handle JSON string input", () => {
      const schemaString = JSON.stringify({
        title: "Test",
        type: "object",
        properties: { id: { type: "string" } },
      });

      const result = validateJsonSchema(schemaString);

      expect(result.valid).toBe(true);
    });
  });

  describe("formatJsonSchema", () => {
    it("should format valid JSON", () => {
      const jsonString = '{"title":"Test","type":"object"}';
      const result = formatJsonSchema(jsonString);

      expect(result).toContain("title");
      expect(result).toContain("Test");
      expect(result.includes("\n")).toBe(true); // Should have indentation
    });

    it("should throw error for invalid JSON", () => {
      expect(() => formatJsonSchema("{ invalid json }")).toThrow();
    });
  });

  describe("enhanceSchemaWithIdMetadata", () => {
    it("should add ID type metadata to uuid fields", () => {
      const schema = {
        type: "object",
        properties: {
          user_id: { type: "string", format: "uuid" },
          name: { type: "string" },
        },
      };

      const enhanced = enhanceSchemaWithIdMetadata(schema);

      expect(enhanced.properties.user_id["x-graphql-type"]).toBe("ID!");
      expect(enhanced.properties.user_id["x-graphql-field-type-name"]).toBe(
        "ID",
      );
      expect(enhanced.properties.user_id["x-graphql-is-entity-key"]).toBe(true);
      expect(enhanced.properties.name["x-graphql-type"]).toBeUndefined();
    });

    it("should mark fields ending with _id as ID type", () => {
      const schema = {
        type: "object",
        properties: {
          entity_id: { type: "string" },
          post_id: { type: "string" },
          content: { type: "string" },
        },
      };

      const enhanced = enhanceSchemaWithIdMetadata(schema);

      expect(enhanced.properties.entity_id["x-graphql-type"]).toBe("ID!");
      expect(enhanced.properties.post_id["x-graphql-type"]).toBe("ID!");
      expect(enhanced.properties.content["x-graphql-type"]).toBeUndefined();
    });

    it("should preserve existing ID type annotations", () => {
      const schema = {
        type: "object",
        properties: {
          id: {
            type: "string",
            "x-graphql-type": "ID",
          },
        },
      };

      const enhanced = enhanceSchemaWithIdMetadata(schema);

      expect(enhanced.properties.id["x-graphql-type"]).toBe("ID");
      expect(enhanced.properties.id["x-graphql-field-type-name"]).toBe("ID");
    });

    it("should handle nested objects", () => {
      const schema = {
        type: "object",
        properties: {
          user_id: { type: "string", format: "uuid" },
          profile: {
            type: "object",
            properties: {
              profile_id: { type: "string" },
              bio: { type: "string" },
            },
          },
        },
      };

      const enhanced = enhanceSchemaWithIdMetadata(schema);

      expect(enhanced.properties.user_id["x-graphql-is-entity-key"]).toBe(true);
      expect(
        enhanced.properties.profile.properties.profile_id[
          "x-graphql-is-entity-key"
        ],
      ).toBe(true);
      expect(
        enhanced.properties.profile.properties.bio["x-graphql-is-entity-key"],
      ).toBeUndefined();
    });

    it("should not modify non-ID fields", () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "integer" },
          email: { type: "string", format: "email" },
        },
      };

      const enhanced = enhanceSchemaWithIdMetadata(schema);

      expect(enhanced.properties.name["x-graphql-type"]).toBeUndefined();
      expect(enhanced.properties.age["x-graphql-type"]).toBeUndefined();
      expect(enhanced.properties.email["x-graphql-type"]).toBeUndefined();
    });
  });

  describe("getConverterInfo", () => {
    it("should return converter information", () => {
      const info = getConverterInfo();

      expect(info.name).toBeDefined();
      expect(info.capabilities).toBeDefined();
      expect(Array.isArray(info.capabilities)).toBe(true);
      expect(info.capabilities.length).toBeGreaterThan(0);
    });

    it("should include federation support", () => {
      const info = getConverterInfo();

      expect(info.capabilities).toContain("Federation support");
    });
  });
});
