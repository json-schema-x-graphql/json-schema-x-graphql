/**
 * Jest test suite for validate-schema-sync programmatic API.
 *
 * Targets:
 * - compareSchemas(sdl, jsonSchema, { strict?, config?, repoRoot? })
 */
import { describe, test, expect } from "@jest/globals";
import { compareSchemas } from "../../scripts/validate-schema-sync.mjs";

const BASE_SDL_COMPLETE = `
  type Query { _: Boolean }

  type VendorInfo {
    uei: String
    duns: String
    vendorName: String
  }

  type PlaceOfPerformance {
    country: String
    state: String
  }

  type Contract {
    piid: ID
    vendorInfo: VendorInfo
    placeOfPerformance: PlaceOfPerformance
    awardAmount: Float
    naicsCode: String
  }
`;

const BASE_SDL_MISSING_FIELDS = `
  type Query { _: Boolean }

  type VendorInfo {
    uei: String
  }

  type Contract {
    vendorInfo: VendorInfo
  }
`;

const JSON_SCHEMA_COMPLETE = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://example.com/contract.schema.json",
  type: "object",
  properties: {
    piid: { type: "string" },
    vendorInfo: {
      type: "object",
      properties: {
        uei: { type: "string" },
        duns: { type: "string" },
        vendorName: { type: "string" },
      },
    },
    placeOfPerformance: {
      type: "object",
      properties: {
        country: { type: "string" },
        state: { type: "string" },
      },
    },
    awardAmount: { type: "number" },
    naicsCode: { type: "string" },
  },
  additionalProperties: false,
};

const JSON_SCHEMA_MISSING_PIID = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://example.com/contract.schema.json",
  type: "object",
  properties: {
    vendorInfo: {
      type: "object",
      properties: {
        uei: { type: "string" },
      },
    },
    placeOfPerformance: {
      type: "object",
      properties: {
        country: { type: "string" },
      },
    },
    awardAmount: { type: "number" },
  },
  additionalProperties: false,
};

const STRICT_CONFIG_SUCCESS = {
  types: {
    Contract: {
      fields: {
        piid: "/piid",
        vendorInfo: "/vendorInfo",
        placeOfPerformance: "/placeOfPerformance",
        awardAmount: "/awardAmount",
        naicsCode: "/naicsCode",
      },
    },
    VendorInfo: {
      fields: {
        uei: "/vendorInfo/uei",
        duns: "/vendorInfo/duns",
        vendorName: "/vendorInfo/vendorName",
      },
    },
    PlaceOfPerformance: {
      fields: {
        country: "/placeOfPerformance/country",
        state: "/placeOfPerformance/state",
      },
    },
  },
};

const STRICT_CONFIG_FAILURE = {
  types: {
    Contract: {
      fields: {
        nonExistentField: "/piid",
        awardAmountWrong: "/awardAmount",
        piid: "/doesNotExist",
      },
    },
  },
};

describe("compareSchemas basic parity checks", () => {
  test("returns empty missing lists when SDL and JSON Schema align", () => {
    const result = compareSchemas(BASE_SDL_COMPLETE, JSON_SCHEMA_COMPLETE);
    expect(result.missingInJson).toHaveLength(0);
    expect(result.missingInGraphQL).toHaveLength(0);
    expect(result.missingCritical).toHaveLength(0);
    expect(result.strictIssues).toHaveLength(0);
    expect(result.exitCode).toBe(1);
    expect(result.namingViolations.jsonSchema.length).toBeGreaterThan(0);
  });

  test("detects missing GraphQL fields in JSON Schema (missingInJson)", () => {
    const alteredSchema = structuredClone(JSON_SCHEMA_COMPLETE);
    delete alteredSchema.properties.naicsCode;
    const result = compareSchemas(BASE_SDL_COMPLETE, alteredSchema);
    expect(result.missingInJson).toContain("naicsCode");
    expect(result.exitCode).toBe(1);
  });

  test("detects JSON Schema properties lacking GraphQL fields (missingInGraphQL)", () => {
    const result = compareSchemas(
      BASE_SDL_MISSING_FIELDS,
      JSON_SCHEMA_COMPLETE,
    );
    expect(result.missingInGraphQL).toEqual(
      expect.arrayContaining([
        "piid",
        "placeOfPerformance",
        "awardAmount",
        "naicsCode",
      ]),
    );
  });

  test("flags missingCritical when piid absent", () => {
    const result = compareSchemas(BASE_SDL_COMPLETE, JSON_SCHEMA_MISSING_PIID);
    expect(result.missingCritical).toContain("piid");
    expect(result.exitCode).toBe(1);
  });
});

describe("compareSchemas strict mode success", () => {
  test("strict mode passes with correct mapping config object", () => {
    const result = compareSchemas(BASE_SDL_COMPLETE, JSON_SCHEMA_COMPLETE, {
      strict: true,
      config: STRICT_CONFIG_SUCCESS,
    });
    expect(result.strictIssues).toHaveLength(0);
    expect(result.exitCode).toBe(1);
    expect(result.namingViolations.jsonSchema.length).toBeGreaterThan(0);
  });
});

describe("compareSchemas strict mode failure scenarios", () => {
  test("strict mode reports issues for bad config object", () => {
    const result = compareSchemas(BASE_SDL_COMPLETE, JSON_SCHEMA_COMPLETE, {
      strict: true,
      config: STRICT_CONFIG_FAILURE,
    });
    expect(result.strictIssues.length).toBeGreaterThanOrEqual(3);
    const joined = result.strictIssues.join("\n");
    expect(joined).toMatch(/GraphQL field missing: nonExistentField/);
    expect(joined).toMatch(/JSON Schema path missing: piid -> \/doesNotExist/);
    expect(result.exitCode).toBe(1);
  });

  test("strict mode throws when config file path does not exist", () => {
    expect(() =>
      compareSchemas(BASE_SDL_COMPLETE, JSON_SCHEMA_COMPLETE, {
        strict: true,
        config: "non-existent-config.json",
        repoRoot: process.cwd(),
      }),
    ).toThrow(/Strict mode enabled but config not found/);
  });
});

describe("compareSchemas exitCode logic", () => {
  test("exitCode is 1 when naming conventions are violated", () => {
    const result = compareSchemas(BASE_SDL_COMPLETE, JSON_SCHEMA_COMPLETE);
    expect(result.exitCode).toBe(1);
    expect(result.namingViolations.jsonSchema.length).toBeGreaterThan(0);
  });

  test("exitCode is 1 when missingInJson populated", () => {
    const alteredSchema = structuredClone(JSON_SCHEMA_COMPLETE);
    delete alteredSchema.properties.awardAmount;
    const result = compareSchemas(BASE_SDL_COMPLETE, alteredSchema);
    expect(result.exitCode).toBe(1);
  });

  test("exitCode escalates to 1 when strictIssues present even if parity passes", () => {
    const result = compareSchemas(BASE_SDL_COMPLETE, JSON_SCHEMA_COMPLETE, {
      strict: true,
      config: STRICT_CONFIG_FAILURE,
    });
    expect(result.exitCode).toBe(1);
    expect(result.strictIssues.length).toBeGreaterThan(0);
  });
});

describe("compareSchemas robustness / edge cases", () => {
  test("handles empty SDL gracefully", () => {
    const EMPTY_SDL = "type Query { _: Boolean }";
    const result = compareSchemas(EMPTY_SDL, JSON_SCHEMA_COMPLETE);
    expect(result.missingInJson).toHaveLength(0);
    expect(result.missingInGraphQL.length).toBeGreaterThanOrEqual(
      Object.keys(JSON_SCHEMA_COMPLETE.properties).length,
    );
  });

  test("handles schema with nested objects and arrays", () => {
    const NESTED_SCHEMA = {
      type: "object",
      properties: {
        contract: {
          type: "object",
          properties: {
            piid: { type: "string" },
            vendorInfo: {
              type: "object",
              properties: { vendorName: { type: "string" } },
            },
          },
        },
        listWrapper: {
          type: "array",
          items: {
            type: "object",
            properties: {
              placeOfPerformance: {
                type: "object",
                properties: { country: { type: "string" } },
              },
            },
          },
        },
      },
    };
    const SDL = `
      type Query { _: Boolean }
      type Contract { piid: ID vendorInfo: VendorInfo }
      type VendorInfo { vendorName: String }
      type PlaceOfPerformance { country: String }
    `;
    const result = compareSchemas(SDL, NESTED_SCHEMA);
    expect(result.missingInJson).toHaveLength(0);
    expect(result.missingInGraphQL).toContain("placeOfPerformance");
  });
});

describe("compareSchemas naming convention enforcement", () => {
  test("detects camelCase in JSON Schema and reports violation", () => {
    const jsonSchemaWithCamelCase = {
      type: "object",
      properties: {
        vendorInfo: { type: "string" },
        placeOfPerformance: { type: "string" },
      },
    };
    const sdl = `
      type Query { _: Boolean }
      type Contract {
        vendorInfo: String
        placeOfPerformance: String
      }
    `;
    const result = compareSchemas(sdl, jsonSchemaWithCamelCase);
    expect(result.namingViolations.jsonSchema.length).toBeGreaterThan(0);
    expect(
      result.namingViolations.jsonSchema.some((v) => v.field === "vendorInfo"),
    ).toBe(true);
    expect(
      result.namingViolations.jsonSchema.some(
        (v) => v.field === "placeOfPerformance",
      ),
    ).toBe(true);
    expect(result.exitCode).toBe(1);
  });

  test("detects snake_case in GraphQL SDL and reports violation", () => {
    const jsonSchema = {
      type: "object",
      properties: {
        vendor_info: { type: "string" },
        place_of_performance: { type: "string" },
      },
    };
    const sdlWithSnakeCase = `
      type Query { _: Boolean }
      type Contract {
        vendor_info: String
        place_of_performance: String
      }
    `;
    const result = compareSchemas(sdlWithSnakeCase, jsonSchema);
    expect(result.namingViolations.graphql.length).toBeGreaterThan(0);
    expect(
      result.namingViolations.graphql.some((v) => v.field === "vendor_info"),
    ).toBe(true);
    expect(
      result.namingViolations.graphql.some(
        (v) => v.field === "place_of_performance",
      ),
    ).toBe(true);
    expect(result.exitCode).toBe(1);
  });

  test("passes when JSON Schema uses snake_case and GraphQL uses camelCase", () => {
    const jsonSchemaSnakeCase = {
      type: "object",
      properties: {
        piid: { type: "string" },
        vendor_info: { type: "string" },
        place_of_performance: { type: "string" },
        naics_code: { type: "string" },
      },
    };
    const sdlCamelCase = `
      type Query { _: Boolean }
      type Contract {
        piid: ID
        vendorInfo: String
        placeOfPerformance: String
        naicsCode: String
      }
    `;
    const result = compareSchemas(sdlCamelCase, jsonSchemaSnakeCase);
    expect(result.namingViolations.jsonSchema).toHaveLength(0);
    expect(result.namingViolations.graphql).toHaveLength(0);
    expect(result.missingInJson).toHaveLength(0);
    expect(result.missingInGraphQL).toHaveLength(0);
    expect(result.exitCode).toBe(0);
  });

  test("can disable naming convention enforcement", () => {
    const jsonSchemaWithCamelCase = {
      type: "object",
      properties: {
        piid: { type: "string" },
        vendorInfo: { type: "string" },
        placeOfPerformance: { type: "string" },
      },
    };
    const sdl = `
      type Query { _: Boolean }
      type Contract {
        piid: ID
        vendorInfo: String
        placeOfPerformance: String
      }
    `;
    const result = compareSchemas(sdl, jsonSchemaWithCamelCase, {
      enforceNamingConventions: false,
    });
    expect(result.namingViolations.jsonSchema).toHaveLength(0);
    expect(result.namingViolations.graphql).toHaveLength(0);
    expect(result.missingInJson).toHaveLength(0);
    expect(result.missingInGraphQL).toHaveLength(0);
    expect(result.exitCode).toBe(0);
  });

  test("provides helpful suggestions for fixing naming violations", () => {
    const jsonSchemaWithCamelCase = {
      type: "object",
      properties: {
        vendorInfo: { type: "string" },
      },
    };
    const sdl = `type Query { _: Boolean }`;
    const result = compareSchemas(sdl, jsonSchemaWithCamelCase);
    expect(result.namingViolations.jsonSchema[0].suggestion).toBe(
      "vendor_info",
    );
  });
});
