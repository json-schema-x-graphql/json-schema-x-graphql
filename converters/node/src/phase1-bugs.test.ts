import { jsonSchemaToGraphQL } from "./converter";

describe("Phase 1 Converter Bug Fixes (#245, #234, #233, #231, #236, #237)", () => {
  it("resolves #245: oneOf [{type: 'null'}, {$ref: ...}] collapses to referenced object type", () => {
    const schema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $defs: {
        AnchorReceipt: {
          type: "object",
          "x-graphql-type-name": "AnchorReceipt",
          properties: {
            contentHash: { type: "string" },
          },
        },
      },
      type: "object",
      title: "Contract",
      properties: {
        anchorReceipt: {
          oneOf: [{ type: "null" }, { $ref: "#/$defs/AnchorReceipt" }],
        },
      },
    };

    const sdl = jsonSchemaToGraphQL(schema);
    expect(sdl).toContain("anchorReceipt: AnchorReceipt");
    expect(sdl).not.toContain("anchorReceipt: JSON");
    expect(sdl).toContain("type AnchorReceipt");
  });

  it("resolves #234: ['null', 'string'] type unions generate String scalar instead of JSON", () => {
    const schema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      title: "Dataset",
      properties: {
        title: {
          type: ["null", "string"],
        },
        count: {
          type: ["integer", "null"],
        },
      },
    };

    const sdl = jsonSchemaToGraphQL(schema);
    expect(sdl).toContain("title: String");
    expect(sdl).toContain("count: Int");
    expect(sdl).not.toContain("title: JSON");
    expect(sdl).not.toContain("count: JSON");
  });

  it("resolves #233: x-graphql-field-type on array properties preserves list wrapper", () => {
    const schema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      title: "Catalog",
      properties: {
        hasPart: {
          type: "array",
          items: { type: "object" },
          "x-graphql-field-type": "DcatCatalog",
        },
      },
    };

    const sdl = jsonSchemaToGraphQL(schema);
    expect(sdl).toContain("hasPart: [DcatCatalog]");
    expect(sdl).not.toMatch(/hasPart:\s*DcatCatalog(\s|$)/);
  });

  it("resolves #231: x-graphql-type-name is respected on root schema", () => {
    const schema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://example.com/schemas/dcat-us-catalog.template.schema.json",
      type: "object",
      "x-graphql-type-name": "DcatCatalog",
      properties: {
        name: { type: "string" },
      },
    };

    const sdl = jsonSchemaToGraphQL(schema);
    expect(sdl).toContain("type DcatCatalog");
    expect(sdl).not.toContain("type Dcatcatalog");
    expect(sdl).not.toContain("type DcatUsCatalog");
  });

  it("resolves #236 & #237: $ref: '#' self-references resolve to root type without duplicates", () => {
    const schema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      title: "Catalog",
      "x-graphql-type-name": "DcatCatalog",
      properties: {
        subCatalogs: {
          type: "array",
          items: {
            $ref: "#",
          },
        },
      },
    };

    const sdl = jsonSchemaToGraphQL(schema);
    expect(sdl).toContain("type DcatCatalog");
    expect(sdl).toContain("subCatalogs: [DcatCatalog]");
    expect(sdl).not.toContain("type Catalog");
    expect(sdl).not.toContain("type DcatCatalog1");
  });

  it("resolves #232: x-graphql-field-vocabulary preserves String scalar and emits @vocabulary directive", () => {
    const schema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $defs: {
        Concept: {
          type: "object",
          "x-graphql-type-name": "DcatConcept",
          properties: {
            prefLabel: { type: "string" },
          },
        },
      },
      type: "object",
      title: "Agent",
      properties: {
        hadRole: {
          $ref: "#/$defs/Concept",
          "x-graphql-field-vocabulary": "http://www.w3.org/ns/dcat#hadRole",
        },
      },
    };

    const sdl = jsonSchemaToGraphQL(schema);
    expect(sdl).toContain(
      'hadRole: String @vocabulary(concept: "http://www.w3.org/ns/dcat#hadRole")',
    );
    expect(sdl).not.toContain("hadRole: DcatConcept");
  });

  it("resolves #235: Query argument docstring formatting places description on its own line", () => {
    const schema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      title: "Dataset",
      "x-graphql-operations": {
        queries: {
          dcatDataset: {
            type: "DcatDataset",
            description: "Fetch a dataset by ID",
            args: {
              id: {
                type: "ID!",
                description: "@id IRI of the dataset.",
              },
            },
          },
        },
      },
    };

    const sdl = jsonSchemaToGraphQL(schema);
    expect(sdl).toContain('"""@id IRI of the dataset."""');
    expect(sdl).toContain("id: ID!");
    expect(sdl).toContain('"""@id IRI of the dataset."""\n    id: ID!');
    expect(sdl).not.toMatch(/\"\"\"[^\S\r\n]+id: ID!/);
  });

  it("preserves nested oneOf on the non-null branch of a null union (parity with Rust)", () => {
    const schema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      title: "Meta",
      properties: {
        value: {
          oneOf: [
            { type: "null" },
            { oneOf: [{ type: "string" }, { type: "integer" }] },
          ],
        },
      },
    };

    const sdl = jsonSchemaToGraphQL(schema);
    expect(sdl).toContain("value: JSON");
    expect(sdl).not.toContain("value: String");
  });

  it('wraps x-graphql-field-type in a list when type is ["array", "null"] (parity with Rust)', () => {
    const schema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      title: "Holder",
      properties: {
        items: {
          type: ["array", "null"],
          items: { type: "string" },
          "x-graphql-field-type": "Tag",
        },
      },
    };

    const sdl = jsonSchemaToGraphQL(schema);
    expect(sdl).toContain("items: [Tag]");
    expect(sdl).not.toMatch(/items:\s*Tag(\s|$)/);
  });

  it("emits @vocabulary even when federation directives are disabled (parity with Rust)", () => {
    const schema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      title: "Agent",
      properties: {
        hadRole: {
          type: "string",
          "x-graphql-field-vocabulary": "http://www.w3.org/ns/dcat#hadRole",
        },
      },
    };

    const sdl = jsonSchemaToGraphQL(schema, {
      includeFederationDirectives: false,
    });
    expect(sdl).toContain(
      'hadRole: String @vocabulary(concept: "http://www.w3.org/ns/dcat#hadRole")',
    );
  });
});
