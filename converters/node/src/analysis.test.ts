/**
 * Tests for the schema analysis module.
 */

import {
  computeStats,
  diffSchemas,
  computeFieldCoverageByName,
} from "./analysis/index.js";

describe("computeStats", () => {
  it("returns zero stats for empty schema", () => {
    const stats = computeStats({});
    expect(stats.totalDefinitions).toBe(0);
    expect(stats.totalFields).toBe(0);
  });

  it("counts definitions and fields", () => {
    const schema = {
      $defs: {
        User: {
          type: "object",
          "x-graphql-type-name": "User",
          required: ["id"],
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            email: { type: "string" },
          },
        },
        Status: {
          type: "string",
          enum: ["ACTIVE", "INACTIVE"],
        },
      },
    };
    const stats = computeStats(schema);
    expect(stats.totalDefinitions).toBe(2);
    expect(stats.totalFields).toBe(3);
    expect(stats.byKind.OBJECT).toBe(1);
    expect(stats.byKind.STRING).toBe(1);
  });

  it("detects federation keys", () => {
    const schema = {
      $defs: {
        User: {
          type: "object",
          "x-graphql-federation-keys": ["id"],
        },
        Order: {
          type: "object",
          "x-graphql-federation": { keys: ["orderId"] },
        },
        Product: {
          type: "object",
        },
      },
    };
    const stats = computeStats(schema);
    expect(stats.federatedTypes).toContain("User");
    expect(stats.federatedTypes).toContain("Order");
    expect(stats.federatedTypes).not.toContain("Product");
  });

  it("counts $ref instances", () => {
    const schema = {
      $defs: {
        User: {
          type: "object",
          properties: {
            address: { $ref: "#/$defs/Address" },
            orders: { type: "array", items: { $ref: "#/$defs/Order" } },
          },
        },
      },
    };
    const stats = computeStats(schema);
    expect(stats.refCount).toBe(2);
  });
});

describe("diffSchemas", () => {
  it("returns no diff for identical schemas", () => {
    const schema = {
      $defs: {
        User: { type: "object", properties: { id: { type: "string" } } },
      },
    };
    const result = diffSchemas(schema, schema);
    expect(result.diffs).toHaveLength(0);
  });

  it("detects added type as non-breaking", () => {
    const old = { $defs: { User: { type: "object" } } };
    const newS = {
      $defs: { User: { type: "object" }, Order: { type: "object" } },
    };
    const result = diffSchemas(old, newS);
    expect(
      result.diffs.some((d: { message: string }) =>
        d.message.includes("Order"),
      ),
    ).toBe(true);
  });

  it("detects removed type as breaking", () => {
    const old = {
      $defs: { User: { type: "object" }, Order: { type: "object" } },
    };
    const newS = { $defs: { User: { type: "object" } } };
    const result = diffSchemas(old, newS);
    expect(result.breakingChanges).toBe(1);
  });

  it("detects new required field as breaking", () => {
    const old = {
      $defs: {
        User: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string" } },
        },
      },
    };
    const newSchema = {
      $defs: {
        User: {
          type: "object",
          required: ["id", "email"],
          properties: { id: { type: "string" }, email: { type: "string" } },
        },
      },
    };
    const result = diffSchemas(old, newSchema);
    expect(result.breakingChanges).toBeGreaterThan(0);
  });
});

describe("computeFieldCoverageByName", () => {
  it("returns 100% for full coverage", () => {
    const source = {
      $defs: {
        User: {
          type: "object",
          properties: { id: { type: "string" }, name: { type: "string" } },
        },
      },
    };
    const target = { ...source };
    const report = computeFieldCoverageByName(source, target);
    expect(report.overallCoveragePercent).toBe(100);
  });

  it("detects missing fields", () => {
    const source = {
      $defs: {
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            email: { type: "string" },
          },
        },
      },
    };
    const target = {
      $defs: {
        User: { type: "object", properties: { id: { type: "string" } } },
      },
    };
    const report = computeFieldCoverageByName(source, target);
    expect(report.overallCoveragePercent).toBeLessThan(100);
    expect(report.typeCoverages[0].missingFields).toContain("name");
  });

  it("returns 100% for empty schemas", () => {
    expect(computeFieldCoverageByName({}, {}).overallCoveragePercent).toBe(100);
  });
});
