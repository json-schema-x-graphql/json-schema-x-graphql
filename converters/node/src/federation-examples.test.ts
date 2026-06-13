/**
 * Federation Examples Integration Tests — #93 / #94
 *
 * Asserts that each federation example JSON schema, when converted with the
 * Node.js converter, produces SDL containing the expected federation
 * directives.  These tests act as the CI gate described in GitHub issue #93
 * to prevent silent failures caused by unsupported schema formats.
 */

import path from "path";
import fs from "fs";
import { Converter } from "./converter";

// __dirname is converters/node/src when ts-jest runs this file.
// examples/ is at <repo-root>/examples/, which is 3 levels up from src/.
const REPO_ROOT = path.resolve(__dirname, "../../../");
const EXAMPLES_ROOT = path.join(REPO_ROOT, "examples/federation/json-schemas");

const converter = new Converter();

async function convertExample(relPath: string) {
  const absPath = path.join(EXAMPLES_ROOT, relPath);
  const schema = JSON.parse(fs.readFileSync(absPath, "utf8"));
  const result = await converter.convert({
    jsonSchema: schema,
    options: { includeFederationDirectives: true, federationVersion: "V2" },
  });
  return result.output ?? "";
}

// ─── Apollo Classic ────────────────────────────────────────────────────────────

describe("Apollo Classic — users-service", () => {
  let sdl: string;
  beforeAll(async () => {
    sdl = await convertExample("apollo-classic/users-service.json");
  });

  it("emits @key directive for User entity", () => {
    expect(sdl).toContain("@key(");
  });

  it("uses 'type' (not 'extend type') — this service owns the entity", () => {
    expect(sdl).toContain("type User");
    expect(sdl).not.toMatch(/extend type User/);
  });

  it("produces non-empty SDL", () => {
    expect(sdl.trim().length).toBeGreaterThan(0);
  });
});

describe("Apollo Classic — products-service", () => {
  let sdl: string;
  beforeAll(async () => {
    sdl = await convertExample("apollo-classic/products-service.json");
  });

  it("emits @key directive for Product entity", () => {
    expect(sdl).toContain("@key(");
  });

  it("uses 'type' (not 'extend type') — this service owns the entity", () => {
    expect(sdl).toContain("type Product");
    expect(sdl).not.toMatch(/extend type Product/);
  });
});

describe("Apollo Classic — reviews-service", () => {
  let sdl: string;
  beforeAll(async () => {
    sdl = await convertExample("apollo-classic/reviews-service.json");
  });

  it("emits @key directive", () => {
    expect(sdl).toContain("@key(");
  });

  it("emits @extends directive on extended types", () => {
    expect(sdl).toContain("@extends");
  });

  it("emits 'extend type' keyword for User and Product (x-graphql-federation-extends: true)", () => {
    expect(sdl).toMatch(/extend type User/);
    expect(sdl).toMatch(/extend type Product/);
  });

  it("Review entity is NOT extended (owns the type)", () => {
    // Review is defined in this service — should be 'type Review', not 'extend type Review'
    expect(sdl).toMatch(/type Review/);
    expect(sdl).not.toMatch(/extend type Review/);
  });
});

// ─── Strawberry ────────────────────────────────────────────────────────────────

describe("Strawberry — books-service", () => {
  let sdl: string;
  beforeAll(async () => {
    sdl = await convertExample("strawberry/books-service.json");
  });

  it("emits @key directive for Book entity", () => {
    expect(sdl).toContain("@key(");
  });

  it("uses 'type' (not 'extend type') — this service owns the entity", () => {
    expect(sdl).toContain("type Book");
    expect(sdl).not.toMatch(/extend type Book/);
  });
});

describe("Strawberry — reviews-service", () => {
  let sdl: string;
  beforeAll(async () => {
    sdl = await convertExample("strawberry/reviews-service.json");
  });

  it("emits @key directive", () => {
    expect(sdl).toContain("@key(");
  });

  it("emits @extends directive on extended Book type", () => {
    expect(sdl).toContain("@extends");
  });

  it("emits 'extend type Book' — cross-subgraph entity extension", () => {
    expect(sdl).toMatch(/extend type Book/);
  });

  it("Review entity is NOT extended (owns the type)", () => {
    expect(sdl).toMatch(/type Review/);
    expect(sdl).not.toMatch(/extend type Review/);
  });
});

// ─── x-graphql-federation-extends unit tests ───────────────────────────────────

describe("x-graphql-federation-extends (unit)", () => {
  it("emits 'extend type' when x-graphql-federation-extends: true", async () => {
    const schema = {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      definitions: {
        User: {
          type: "object",
          "x-graphql-type-name": "User",
          "x-graphql-type-kind": "OBJECT",
          "x-graphql-federation-keys": ["id"],
          "x-graphql-federation-extends": true,
          properties: {
            id: { type: "string", "x-graphql-field-type": "ID", "x-graphql-field-non-null": true },
            email: { type: "string" },
          },
          required: ["id"],
        },
      },
    };
    const result = await converter.convert({
      jsonSchema: JSON.stringify(schema),
      options: { includeFederationDirectives: true, federationVersion: "V2" },
    });
    expect(result.output).toMatch(/extend type User/);
    expect(result.output).toContain("@key(");
    expect(result.output).toContain("@extends");
  });

  it("emits 'type' (no extend) when x-graphql-federation-extends is absent", async () => {
    const schema = {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      definitions: {
        User: {
          type: "object",
          "x-graphql-type-name": "User",
          "x-graphql-type-kind": "OBJECT",
          "x-graphql-federation-keys": ["id"],
          properties: {
            id: { type: "string", "x-graphql-field-type": "ID", "x-graphql-field-non-null": true },
          },
          required: ["id"],
        },
      },
    };
    const result = await converter.convert({
      jsonSchema: JSON.stringify(schema),
      options: { includeFederationDirectives: true, federationVersion: "V2" },
    });
    expect(result.output).toMatch(/^type User/m);
    expect(result.output).not.toMatch(/extend type/);
    expect(result.output).not.toContain("@extends");
  });

  it("emits 'type' (no extend) when x-graphql-federation-extends: false", async () => {
    const schema = {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      definitions: {
        Product: {
          type: "object",
          "x-graphql-type-name": "Product",
          "x-graphql-type-kind": "OBJECT",
          "x-graphql-federation-keys": ["upc"],
          "x-graphql-federation-extends": false,
          properties: {
            upc: { type: "string", "x-graphql-field-type": "ID", "x-graphql-field-non-null": true },
          },
          required: ["upc"],
        },
      },
    };
    const result = await converter.convert({
      jsonSchema: JSON.stringify(schema),
      options: { includeFederationDirectives: true, federationVersion: "V2" },
    });
    expect(result.output).toMatch(/^type Product/m);
    expect(result.output).not.toMatch(/extend type/);
  });

  it("detectFederationVersion returns V2 when only x-graphql-federation-extends is present", async () => {
    const schema = {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      definitions: {
        Widget: {
          type: "object",
          "x-graphql-type-name": "Widget",
          "x-graphql-type-kind": "OBJECT",
          "x-graphql-federation-extends": true,
          properties: {
            id: { type: "string", "x-graphql-field-type": "ID", "x-graphql-field-non-null": true },
          },
          required: ["id"],
        },
      },
    };
    // With federationVersion: AUTO, the converter should detect V2 from federation-extends
    const result = await converter.convert({
      jsonSchema: JSON.stringify(schema),
      options: { includeFederationDirectives: true, federationVersion: "AUTO" },
    });
    // The fact that @extends is emitted confirms V2 was detected
    expect(result.output).toContain("@extends");
    expect(result.output).toMatch(/extend type Widget/);
  });
});
