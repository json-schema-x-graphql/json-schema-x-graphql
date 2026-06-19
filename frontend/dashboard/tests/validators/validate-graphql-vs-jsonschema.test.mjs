/**
 * Jest test suite for validate-graphql-vs-jsonschema programmatic API
 *
 * Targets:
 * - SchemaSyncManager.ensureGraphQLSchemaBuilds()
 * - validateParity(graphqlSchemaSDL, jsonSchema, sampleData?)
 *
 * These tests use minimal inline SDL and JSON Schema fixtures to avoid
 * coupling to repository files. They verify positive and negative paths.
 */
import { describe, test, expect } from "@jest/globals";
import {
  SchemaSyncManager,
  validateParity,
} from "../../scripts/validate-graphql-vs-jsonschema.mjs";

const MINIMAL_SDL = `
  type Query {
    _: Boolean
  }

  type Person {
    id: ID!
    name: String!
    age: Int
    email: String
  }
`;

const PERSON_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://example.com/person.schema.json",
  title: "Person",
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    name: { type: "string", minLength: 1 },
    age: { type: "integer", minimum: 0 },
    email: { type: "string", format: "email" },
  },
  required: ["id", "name"],
};

const VALID_PERSON_SAMPLE = {
  id: "001",
  name: "Alice",
  age: 30,
  email: "alice@example.com",
};

const INVALID_PERSON_SAMPLE = {
  id: "002",
  name: "Bob",
  age: 25,
  email: "not-an-email",
};

describe("validate-graphql-vs-jsonschema programmatic API", () => {
  test("exports are available", () => {
    expect(SchemaSyncManager).toBeDefined();
    expect(typeof SchemaSyncManager).toBe("function");
    expect(validateParity).toBeDefined();
    expect(typeof validateParity).toBe("function");
  });

  test("SchemaSyncManager.ensureGraphQLSchemaBuilds() returns true for valid SDL", () => {
    const mgr = new SchemaSyncManager(MINIMAL_SDL, PERSON_JSON_SCHEMA);
    const result = mgr.ensureGraphQLSchemaBuilds();
    expect(result).toBe(true);
  });

  test("validateParity succeeds with valid SDL and no sample (sampleValid=null)", () => {
    const result = validateParity(MINIMAL_SDL, PERSON_JSON_SCHEMA);
    expect(result).toEqual(
      expect.objectContaining({
        sdlBuilds: true,
        sampleValid: null,
      }),
    );
  });

  test("validateParity validates a good sample against the JSON Schema", () => {
    const result = validateParity(
      MINIMAL_SDL,
      PERSON_JSON_SCHEMA,
      VALID_PERSON_SAMPLE,
    );
    expect(result).toEqual(
      expect.objectContaining({
        sdlBuilds: true,
        sampleValid: true,
      }),
    );
  });

  test("validateParity throws with Ajv validationErrors for a bad sample", () => {
    expect(() =>
      validateParity(MINIMAL_SDL, PERSON_JSON_SCHEMA, INVALID_PERSON_SAMPLE),
    ).toThrow(/Schema validation failed:/);

    try {
      validateParity(MINIMAL_SDL, PERSON_JSON_SCHEMA, INVALID_PERSON_SAMPLE);
    } catch (e) {
      expect(e).toHaveProperty("validationErrors");
      expect(Array.isArray(e.validationErrors)).toBe(true);
      const messages = JSON.stringify(e.validationErrors);
      expect(messages).toMatch(/email/);
    }
  });

  test("validateParity throws when SDL is invalid", () => {
    const INVALID_SDL = `
      type Query {
        broken: ?
      }
    `;
    expect(() => validateParity(INVALID_SDL, PERSON_JSON_SCHEMA)).toThrow();
  });

  test("SchemaSyncManager.validateGraphQLResponse throws and exposes validationErrors", () => {
    const mgr = new SchemaSyncManager(MINIMAL_SDL, PERSON_JSON_SCHEMA);
    mgr.ensureGraphQLSchemaBuilds();

    expect(() => mgr.validateGraphQLResponse(INVALID_PERSON_SAMPLE)).toThrow();

    try {
      mgr.validateGraphQLResponse(INVALID_PERSON_SAMPLE);
    } catch (e) {
      expect(e).toHaveProperty("validationErrors");
      expect(Array.isArray(e.validationErrors)).toBe(true);
    }
  });
});
