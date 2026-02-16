import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "../src/store";

describe("Editor Store", () => {
  beforeEach(() => {
    // Reset the store state before each test
    useEditorStore.setState({
      jsonSchema: "",
      graphqlSdl: "",
      errors: [],
      options: {
        validate: true,
        includeDescriptions: true,
        preserveFieldOrder: true,
        federationVersion: "V2",
        includeFederationDirectives: true,
        namingConvention: "GRAPHQL_IDIOMATIC",
        idStrategy: "COMMON_PATTERNS",
        outputFormat: "SDL",
        failOnWarning: false,
        prettyPrint: true,
      },
    });
  });

  describe("Options Management", () => {
    it("should update individual options without affecting others", () => {
      const store = useEditorStore.getState();

      store.setOptions({ validate: false });
      let state = useEditorStore.getState();

      expect(state.options.validate).toBe(false);
      expect(state.options.federationVersion).toBe("V2"); // Should remain unchanged
    });

    it("should support all federation versions", () => {
      const store = useEditorStore.getState();
      const versions = ["NONE", "V1", "V2", "AUTO"] as const;

      versions.forEach((version) => {
        store.setOptions({ federationVersion: version });
        const state = useEditorStore.getState();
        expect(state.options.federationVersion).toBe(version);
      });
    });

    it("should support all ID strategies", () => {
      const store = useEditorStore.getState();
      const strategies = ["NONE", "COMMON_PATTERNS", "ALL_STRINGS"] as const;

      strategies.forEach((strategy) => {
        store.setOptions({ idStrategy: strategy });
        const state = useEditorStore.getState();
        expect(state.options.idStrategy).toBe(strategy);
      });
    });

    it("should support all output formats", () => {
      const store = useEditorStore.getState();
      const formats = [
        "SDL",
        "SDL_WITH_FEDERATION_METADATA",
        "AST_JSON",
      ] as const;

      formats.forEach((format) => {
        store.setOptions({ outputFormat: format });
        const state = useEditorStore.getState();
        expect(state.options.outputFormat).toBe(format);
      });
    });

    it("should toggle failOnWarning option", () => {
      const store = useEditorStore.getState();

      store.setOptions({ failOnWarning: true });
      let state = useEditorStore.getState();
      expect(state.options.failOnWarning).toBe(true);

      store.setOptions({ failOnWarning: false });
      state = useEditorStore.getState();
      expect(state.options.failOnWarning).toBe(false);
    });
  });

  describe("Error Management", () => {
    it("should add errors to the store", () => {
      const store = useEditorStore.getState();

      store.addError("Test error 1");
      store.addError("Test error 2");

      const state = useEditorStore.getState();
      expect(state.errors).toContain("Test error 1");
      expect(state.errors).toContain("Test error 2");
    });

    it("should clear errors", () => {
      const store = useEditorStore.getState();

      store.addError("Test error");
      let state = useEditorStore.getState();
      expect(state.errors.length).toBeGreaterThan(0);

      store.clearErrors();
      state = useEditorStore.getState();
      expect(state.errors.length).toBe(0);
    });
  });

  describe("Editor Content", () => {
    it("should update JSON schema", () => {
      const store = useEditorStore.getState();
      const testSchema = '{"type": "object"}';

      store.setJsonSchema(testSchema);
      const state = useEditorStore.getState();

      expect(state.jsonSchema).toBe(testSchema);
    });

    it("should update GraphQL SDL", () => {
      const store = useEditorStore.getState();
      const testSdl = "type Query { hello: String }";

      store.setGraphqlSdl(testSdl);
      const state = useEditorStore.getState();

      expect(state.graphqlSdl).toBe(testSdl);
    });

    it("should toggle active editor", () => {
      const store = useEditorStore.getState();

      store.setActiveEditor("graphql");
      let state = useEditorStore.getState();
      expect(state.activeEditor).toBe("graphql");

      store.setActiveEditor("json");
      state = useEditorStore.getState();
      expect(state.activeEditor).toBe("json");
    });
  });

  describe("Conversion Results", () => {
    it("should store conversion result metadata", () => {
      const store = useEditorStore.getState();
      const result = {
        timestamp: Date.now(),
        direction: "json-to-graphql" as const,
        duration: 150,
        outputSize: 512,
      };

      store.setLastConversion(result);
      const state = useEditorStore.getState();

      expect(state.lastConversion).toEqual(result);
    });
  });
});
