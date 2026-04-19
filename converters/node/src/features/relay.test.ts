import { ensurePageInfo, ensureConnectionType } from "./relay";
import { ConversionContext } from "../interfaces";

describe("Relay Features", () => {
  let mockContext: ConversionContext;

  beforeEach(() => {
    mockContext = {
      options: {} as any,
      typeNames: new Map(),
      rootSchema: {},
      generatedTypes: new Set(),
      generating: new Set(),
      building: new Set(),
      usedScalars: new Set(),
      output: [],
    };
  });

  describe("ensurePageInfo", () => {
    it("should add PageInfo to output and generatedTypes if not present", () => {
      ensurePageInfo(mockContext);
      expect(mockContext.generatedTypes.has("PageInfo")).toBe(true);
      expect(mockContext.output.some(str => str.includes("type PageInfo {"))).toBe(true);
    });

    it("should not duplicate PageInfo if already present", () => {
      mockContext.generatedTypes.add("PageInfo");
      ensurePageInfo(mockContext);
      expect(mockContext.output.length).toBe(0);
    });
  });

  describe("ensureConnectionType", () => {
    it("should generate Edge and Connection types along with PageInfo", () => {
      ensureConnectionType("User", mockContext);
      expect(mockContext.generatedTypes.has("PageInfo")).toBe(true);
      expect(mockContext.generatedTypes.has("UserEdge")).toBe(true);
      expect(mockContext.generatedTypes.has("UserConnection")).toBe(true);
      
      const combinedOutput = mockContext.output.join("\\n");
      expect(combinedOutput).toContain("type PageInfo {");
      expect(combinedOutput).toContain("type UserEdge {");
      expect(combinedOutput).toContain("type UserConnection {");
    });

    it("should not duplicate Edge and Connection types if already present", () => {
      mockContext.generatedTypes.add("UserConnection");
      ensureConnectionType("User", mockContext);
      // It returns early if the connection exists.
      expect(mockContext.generatedTypes.has("PageInfo")).toBe(false);
    });

    it("should not duplicate Edge if only Edge is already present", () => {
      mockContext.generatedTypes.add("UserEdge");
      ensureConnectionType("User", mockContext);
      expect(mockContext.generatedTypes.has("PageInfo")).toBe(true);
      expect(mockContext.generatedTypes.has("UserConnection")).toBe(true);
      
      const combinedOutput = mockContext.output.join("\\n");
      expect(combinedOutput).toContain("type PageInfo {");
      expect(combinedOutput).toContain("type UserConnection {");
      expect(combinedOutput).not.toContain("type UserEdge {");
    });
  });
});
