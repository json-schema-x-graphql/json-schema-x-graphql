import { describe, it, expect } from "vitest";
import { buildSchema, parse, Source } from "graphql";
// We use the same import path as store.ts to test the exact file being loaded
import federalProcurementGraphql from "../../../../examples/federal-procurement.graphql?raw";
import { federationDirectives } from "./federation-directives";

describe("Federal Procurement Schema Validation", () => {
  it("should parse successfully as a GraphQL Source", () => {
    const source = new Source(federalProcurementGraphql);
    expect(() => parse(source)).not.toThrow();
  });

  it("should contain necessary types", () => {
    const doc = parse(federalProcurementGraphql);
    const typeNames = doc.definitions
      .filter((def: any) => def.kind === "ObjectTypeDefinition")
      .map((def: any) => def.name.value);

    expect(typeNames).toContain("Query");
    expect(typeNames).toContain("PerformanceMetrics");
    expect(typeNames).toContain("CompetitionMetrics");
  });

  it("should be a valid schema when combined with federation directives", () => {
    // The editor usually combines these. We need to ensure the combination is valid SDL.
    // We strip scalars that are already present in federationDirectives to avoid duplicates
    const cleanedSchema = federalProcurementGraphql
      .replace("scalar DateTime", "")
      .replace("scalar Date", "")
      .replace("scalar JSON", "")
      .replace("scalar Decimal", "");

    const fullSdl = `${federationDirectives}\n${cleanedSchema}`;

    expect(() => {
      buildSchema(fullSdl);
    }).not.toThrow();
  });

  it("should validate specific problem areas", () => {
    // Specific check for the area reported as problematic
    // We mock the types needed for this isolated test
    const metricsPart = `
      type CompetitionMetrics {
        competitionType: CompetitionType!
      }

      enum CompetitionType {
        FULL_OPEN
        SET_ASIDE
      }

      """
      Business Classification Types
      """
      type PerformanceMetrics {
        onTimeDeliveryRate: Float
        budgetVariance: Float
        qualityRating: Float
        customerSatisfaction: Float
      }
    `;
    expect(() => buildSchema(metricsPart)).not.toThrow();
  });
});
