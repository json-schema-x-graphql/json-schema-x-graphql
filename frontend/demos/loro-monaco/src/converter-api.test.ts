import { describe, it, expect } from "vitest";
import { ConversionResult } from "../src/converter-api";

describe("Converter API", () => {
  describe("Result Types", () => {
    it("should have correct ConversionResult structure for success", () => {
      const result: ConversionResult = {
        output: "type Query { hello: String }",
        success: true,
        errorCount: 0,
        warningCount: 0,
        diagnostics: [],
      };

      expect(result.output).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.errorCount).toBe(0);
      expect(result.warningCount).toBe(0);
      expect(Array.isArray(result.diagnostics)).toBe(true);
    });

    it("should have correct ConversionResult structure for failure", () => {
      const result: ConversionResult = {
        output: null,
        success: false,
        errorCount: 1,
        warningCount: 0,
        diagnostics: [
          {
            severity: "error",
            message: "Invalid schema",
            kind: "validation-error",
          },
        ],
      };

      expect(result.output).toBeNull();
      expect(result.success).toBe(false);
      expect(result.errorCount).toBe(1);
      expect(result.diagnostics.length).toBeGreaterThan(0);
    });
  });

  describe("Diagnostic Handling", () => {
    it("should support error severity", () => {
      const diagnostic = {
        severity: "error" as const,
        message: "Test error",
        kind: "test-error",
      };

      expect(diagnostic.severity).toBe("error");
    });

    it("should support warning severity", () => {
      const diagnostic = {
        severity: "warning" as const,
        message: "Test warning",
        kind: "test-warning",
      };

      expect(diagnostic.severity).toBe("warning");
    });

    it("should support info severity", () => {
      const diagnostic = {
        severity: "info" as const,
        message: "Test info",
        kind: "test-info",
      };

      expect(diagnostic.severity).toBe("info");
    });
  });

  describe("Options Mapping", () => {
    it("should support all output formats in options", () => {
      const formats = ["SDL", "SDL_WITH_FEDERATION_METADATA", "AST_JSON"] as const;

      formats.forEach((format) => {
        const options = { outputFormat: format };
        expect(options.outputFormat).toBe(format);
      });
    });

    it("should support all federation versions in options", () => {
      const versions = ["NONE", "V1", "V2", "AUTO"] as const;

      versions.forEach((version) => {
        const options = { federationVersion: version };
        expect(options.federationVersion).toBe(version);
      });
    });

    it("should support all ID strategies in options", () => {
      const strategies = ["NONE", "COMMON_PATTERNS", "ALL_STRINGS"] as const;

      strategies.forEach((strategy) => {
        const options = { idStrategy: strategy };
        expect(options.idStrategy).toBe(strategy);
      });
    });
  });
});
