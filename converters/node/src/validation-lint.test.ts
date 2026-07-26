/**
 * Tests for the x-graphql attribute linting.
 */

import {
  lintSchema,
  lintDefinitionsCompleteness,
  lintAll,
} from "./validation-lint";

describe("lintSchema - deprecated attributes", () => {
  it("detects deprecated x-* attributes", () => {
    const schema = {
      $defs: {
        Contract: {
          type: "object",
          "x-fpds-source": "some_value",
          "x-graphql-type-name": "Contract",
        },
      },
    };
    const issues = lintSchema(schema);
    expect(issues.some((i) => i.message.includes("x-fpds-source"))).toBe(true);
  });

  it("detects invalid x-* prefixes", () => {
    const schema = {
      $defs: {
        Contract: {
          type: "object",
          "x-custom-thing": "value",
          "x-graphql-type-name": "Contract",
        },
      },
    };
    const issues = lintSchema(schema);
    expect(issues.some((i) => i.message.includes("x-custom-thing"))).toBe(true);
  });

  it("allows permitted non-graphql x-* attributes", () => {
    const schema = { "x-request-id": "abc123" };
    const issues = lintSchema(schema);
    expect(issues.some((i) => i.message.includes("x-request-id"))).toBe(false);
  });

  it("allows x-graphql-* and x-viaduct-*", () => {
    const schema = {
      "x-graphql-type-name": "X",
      "x-viaduct-resolver": true,
    };
    const issues = lintSchema(schema);
    expect(issues).toHaveLength(0);
  });
});

describe("lintDefinitionsCompleteness", () => {
  it("warns on missing x-graphql-type-name for object definitions", () => {
    const schema = {
      $defs: {
        noName: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
      },
    };
    const issues = lintDefinitionsCompleteness(schema);
    expect(
      issues.some((i) => i.message.includes("missing x-graphql-type-name")),
    ).toBe(true);
  });

  it("warns on type-name not in PascalCase", () => {
    const schema = {
      $defs: {
        Test: {
          type: "object",
          "x-graphql-type-name": "lowercaseType",
        },
      },
    };
    const issues = lintDefinitionsCompleteness(schema);
    expect(issues.some((i) => i.message.includes("PascalCase"))).toBe(true);
  });

  it("warns on field-name using snake_case", () => {
    const schema = {
      $defs: {
        Test: {
          type: "object",
          "x-graphql-type-name": "Test",
          properties: {
            snake_field: {
              type: "string",
              "x-graphql-field-name": "snake_field",
            },
          },
        },
      },
    };
    const issues = lintDefinitionsCompleteness(schema);
    expect(issues.some((i) => i.message.includes("snake_case"))).toBe(true);
  });

  it("does not warn on clean schema", () => {
    const schema = {
      $defs: {
        User: {
          type: "object",
          "x-graphql-type-name": "User",
          properties: {
            userId: {
              type: "string",
              "x-graphql-field-name": "userId",
            },
          },
        },
      },
    };
    const issues = lintDefinitionsCompleteness(schema);
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });
});

describe("lintAll", () => {
  it("returns empty for a clean schema", () => {
    const schema = {
      $defs: {
        User: {
          type: "object",
          "x-graphql-type-name": "User",
          "x-graphql-federation-keys": ["id"],
        },
      },
    };
    const issues = lintAll(schema);
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("combines issues from both linters", () => {
    const schema = {
      $defs: {
        Test: {
          type: "object",
          "x-fpds-source": "x", // deprecated (lintSchema)
          "x-graphql-type-name": "Test",
        },
      },
    };
    const issues = lintAll(schema);
    expect(issues.length).toBeGreaterThan(0);
  });
});
