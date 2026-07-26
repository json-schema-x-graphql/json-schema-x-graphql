/**
 * Tests for the GraphQL Hints post-processing module.
 */

import {
  parseCustomScalars,
  generateScalarsSdl,
  injectCustomScalars,
  buildScalarFieldMap,
  applyScalarFieldReplacements,
  parseOperations,
  injectOperations,
  parsePagination,
  injectPaginationTypes,
  applyHints,
  parseHints,
} from "./hints";

describe("Custom Scalar parsing", () => {
  it("parses top-level object format", () => {
    const schema = {
      "x-graphql-scalars": {
        DateTime: {
          description: "ISO 8601 date-time string",
          specifiedByURL: "https://example.com/datetime",
        },
        JSON: {
          description: "Arbitrary JSON value",
        },
      },
    };
    const scalars = parseCustomScalars(schema);
    expect(scalars).toHaveLength(2);
    expect(scalars[0].name).toBe("DateTime");
    expect(scalars[0].description).toBe("ISO 8601 date-time string");
    expect(scalars[0].specifiedByURL).toBe("https://example.com/datetime");
  });

  it("parses array format", () => {
    const schema = {
      "x-graphql-scalars": [
        { name: "DateTime", description: "ISO 8601 date-time" },
      ],
    };
    const scalars = parseCustomScalars(schema);
    expect(scalars).toHaveLength(1);
    expect(scalars[0].name).toBe("DateTime");
  });

  it("returns empty for missing scalars", () => {
    expect(parseCustomScalars({})).toEqual([]);
  });
});

describe("generateScalarsSdl", () => {
  it("generates scalar declarations with descriptions", () => {
    const sdl = generateScalarsSdl(
      [
        {
          name: "DateTime",
          description: "ISO 8601 date-time",
          specifiedByURL: "https://example.com",
        },
      ],
      "",
    );
    expect(sdl).toContain("scalar DateTime");
    expect(sdl).toContain("@specifiedBy");
    expect(sdl).toContain("ISO 8601");
  });

  it("is idempotent (skips existing scalars)", () => {
    const sdl = generateScalarsSdl(
      [{ name: "DateTime", description: "test" }],
      "scalar DateTime",
    );
    expect(sdl).toBe("");
  });
});

describe("injectCustomScalars", () => {
  it("prepends scalar declarations to SDL", () => {
    const result = injectCustomScalars("type User { id: ID! }", [
      { name: "DateTime", description: "ISO 8601" },
    ]);
    expect(result.indexOf("scalar DateTime")).toBeLessThan(
      result.indexOf("type User"),
    );
  });
});

describe("buildScalarFieldMap", () => {
  it("builds type.field → scalar map", () => {
    const schema = {
      $defs: {
        User: {
          properties: {
            created_at: {
              type: "string",
              "x-graphql-scalar": "DateTime",
            },
          },
        },
      },
    };
    const map = buildScalarFieldMap(schema);
    expect(map.get("User.created_at")).toBe("DateTime");
  });

  it("returns empty map for no fields", () => {
    expect(buildScalarFieldMap({}).size).toBe(0);
  });
});

describe("applyScalarFieldReplacements", () => {
  it("replaces standard types with custom scalars", () => {
    const sdl = "type User {\n  created_at: String\n}";
    const result = applyScalarFieldReplacements(
      sdl,
      new Map([["User.created_at", "DateTime"]]),
    );
    expect(result).toContain("created_at: DateTime");
    expect(result).not.toContain("created_at: String");
  });

  it("is a noop for empty map", () => {
    const sdl = "type User { id: ID! }";
    expect(applyScalarFieldReplacements(sdl, new Map())).toBe(sdl);
  });
});

describe("Operations parsing", () => {
  it("parses query/mutation/subscription", () => {
    const schema = {
      "x-graphql-operations": {
        queries: {
          user: { type: "User", description: "Get a user by ID" },
        },
        mutations: {
          createUser: { type: "User!", description: "Create a new user" },
        },
        subscriptions: {},
      },
    };
    const config = parseOperations(schema);
    expect(config.queries).toHaveLength(1);
    expect(config.queries[0].name).toBe("user");
    expect(config.queries[0].graphqlType).toBe("User");
    expect(config.mutations).toHaveLength(1);
    expect(config.subscriptions).toHaveLength(0);
  });

  it("parses args", () => {
    const schema = {
      "x-graphql-operations": {
        queries: {
          user: {
            type: "User",
            args: {
              id: { type: "ID!", description: "User ID" },
            },
          },
        },
      },
    };
    const config = parseOperations(schema);
    expect(config.queries[0].arguments).toHaveLength(1);
    expect(config.queries[0].arguments[0].name).toBe("id");
    expect(config.queries[0].arguments[0].graphqlType).toBe("ID!");
  });
});

describe("injectOperations", () => {
  it("appends query type to SDL", () => {
    const result = injectOperations("type User { id: ID! }", {
      queries: [{ name: "user", graphqlType: "User", arguments: [] }],
      mutations: [],
      subscriptions: [],
    });
    expect(result).toContain("type Query");
    expect(result).toContain("user: User");
  });

  it("is a noop for empty config", () => {
    const sdl = "type User { id: ID! }";
    const result = injectOperations(sdl, {
      queries: [],
      mutations: [],
      subscriptions: [],
    });
    expect(result).toBe(sdl);
  });
});

describe("Pagination parsing", () => {
  it("parses enabled pagination config", () => {
    const schema = {
      "x-graphql-pagination": {
        enabled: true,
        types: {
          contract: {
            connection: "ContractConnection",
            edge: "ContractEdge",
          },
        },
      },
    };
    const config = parsePagination(schema);
    expect(config.enabled).toBe(true);
    expect(config.types).toHaveLength(1);
    expect(config.types[0].typeName).toBe("Contract");
    expect(config.types[0].connectionName).toBe("ContractConnection");
    expect(config.types[0].edgeName).toBe("ContractEdge");
  });

  it("returns disabled for missing config", () => {
    expect(parsePagination({}).enabled).toBe(false);
  });
});

describe("injectPaginationTypes", () => {
  it("is a noop for disabled pagination", () => {
    const sdl = "type User { id: ID! }";
    const result = injectPaginationTypes(sdl, {
      enabled: false,
      types: [],
    });
    expect(result).toBe(sdl);
  });

  it("appends PageInfo and connection types when enabled", () => {
    const result = injectPaginationTypes("type User { id: ID! }", {
      enabled: true,
      types: [
        {
          typeName: "User",
          connectionName: "UserConnection",
          edgeName: "UserEdge",
        },
      ],
    });
    expect(result).toContain("type PageInfo");
    expect(result).toContain("type UserConnection");
    expect(result).toContain("type UserEdge");
  });
});

describe("applyHints", () => {
  it("applies all hints in correct order", () => {
    const schema = {
      "x-graphql-scalars": {
        DateTime: { description: "ISO 8601 date-time" },
      },
      "x-graphql-operations": {
        queries: { users: { type: "[User!]!" } },
      },
      $defs: {
        User: {
          properties: {
            created_at: { type: "string", "x-graphql-scalar": "DateTime" },
          },
        },
      },
    };
    const result = applyHints("type User { id: ID! }", schema);
    expect(result).toContain("scalar DateTime");
    expect(result).toContain("type Query");
    expect(result).toContain("users: [User!]!");
  });

  it("is a noop for schemas without hints", () => {
    const sdl = "type User { id: ID! }";
    const result = applyHints(sdl, {});
    expect(result).toBe(sdl);
  });
});

describe("parseHints", () => {
  it("returns empty hint data for empty schema", () => {
    const hints = parseHints({});
    expect(hints.scalars).toEqual([]);
    expect(hints.operations.queries).toEqual([]);
    expect(hints.pagination.enabled).toBe(false);
  });
});
