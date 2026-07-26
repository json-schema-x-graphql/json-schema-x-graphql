/**
 * Tests for the Directive Filter Framework.
 */

import {
  DirectiveFilterMode,
  classifyDirective,
  shouldIncludeDirective,
  filterLineDirectives,
  filterSdlDirectives,
  ensureFederationDirectives,
  sdlHasFederationDirectives,
  FEDERATION_DIRECTIVES_SDL,
  federationLinkDirective,
  FEDERATION_IMPORTS,
} from "./directive-filter";

describe("classifyDirective", () => {
  it("classifies GraphQL spec built-ins", () => {
    expect(classifyDirective("@deprecated")).toBe("spec");
    expect(classifyDirective("@skip")).toBe("spec");
    expect(classifyDirective("@include")).toBe("spec");
    expect(classifyDirective("deprecated")).toBe("spec");
  });

  it("classifies Federation directives", () => {
    expect(classifyDirective("@key")).toBe("federation");
    expect(classifyDirective("@shareable")).toBe("federation");
    expect(classifyDirective("@external")).toBe("federation");
    expect(classifyDirective("@requires")).toBe("federation");
    expect(classifyDirective("@authenticated")).toBe("federation");
  });

  it("classifies production custom directives", () => {
    expect(classifyDirective("@constraint")).toBe("custom");
    expect(classifyDirective("@cache")).toBe("custom");
    expect(classifyDirective("@authorize")).toBe("custom");
    expect(classifyDirective("@mask")).toBe("custom");
    expect(classifyDirective("@rateLimit")).toBe("custom");
  });

  it("classifies unknown directives as custom", () => {
    expect(classifyDirective("@unknown")).toBe("custom");
  });
});

describe("shouldIncludeDirective", () => {
  it("includes everything when mode is ALL", () => {
    expect(shouldIncludeDirective("@key", "ALL")).toBe(true);
    expect(shouldIncludeDirective("@deprecated", "ALL")).toBe(true);
    expect(shouldIncludeDirective("@custom", "ALL")).toBe(true);
  });

  it("only includes spec directives in VIEWER_FRIENDLY", () => {
    expect(shouldIncludeDirective("@deprecated", "VIEWER_FRIENDLY")).toBe(true);
    expect(shouldIncludeDirective("@key", "VIEWER_FRIENDLY")).toBe(false);
    expect(shouldIncludeDirective("@shareable", "VIEWER_FRIENDLY")).toBe(false);
  });

  it("includes everything except draft in EXCLUDE_DRAFT", () => {
    expect(shouldIncludeDirective("@key", "EXCLUDE_DRAFT")).toBe(true);
    expect(shouldIncludeDirective("@deprecated", "EXCLUDE_DRAFT")).toBe(true);
  });

  it("respects CUSTOM exclusion list", () => {
    const mode: DirectiveFilterMode = { CUSTOM: ["@key"] };
    expect(shouldIncludeDirective("@key", mode)).toBe(false);
    expect(shouldIncludeDirective("@shareable", mode)).toBe(true);
  });
});

describe("filterLineDirectives", () => {
  it("strips federation directives in viewer-friendly mode", () => {
    const line = '  id: ID! @key(fields: "id") @deprecated';
    const result = filterLineDirectives(line, "VIEWER_FRIENDLY");
    expect(result).toContain("@deprecated");
    expect(result).not.toContain("@key");
  });

  it("is a noop for ALL mode", () => {
    const line = '  id: ID! @key(fields: "id") @shareable';
    expect(filterLineDirectives(line, "ALL")).toBe(line);
  });

  it("handles directives on type declarations", () => {
    const line = 'type User @key(fields: "id") @shareable {';
    const result = filterLineDirectives(line, "VIEWER_FRIENDLY");
    expect(result).not.toContain("@key");
    expect(result).not.toContain("@shareable");
    expect(result).toContain("type User");
  });
});

describe("filterSdlDirectives", () => {
  it("strips directives from full SDL", () => {
    const sdl = `type User @key(fields: "id") {
  id: ID! @deprecated
  name: String @shareable
}`;
    const result = filterSdlDirectives(sdl, "VIEWER_FRIENDLY");
    expect(result).not.toContain("@key");
    expect(result).not.toContain("@shareable");
    expect(result).toContain("@deprecated");
  });

  it("is a noop for ALL mode", () => {
    const sdl = 'type User @key(fields: "id") { id: ID! }';
    expect(filterSdlDirectives(sdl, "ALL")).toBe(sdl);
  });
});

describe("ensureFederationDirectives", () => {
  it("adds directives when missing", () => {
    const sdl = "type User { id: ID! }";
    const result = ensureFederationDirectives(sdl);
    expect(result).toContain("directive @key");
    expect(result).toContain("type User");
  });

  it("is a noop when directives already present", () => {
    const sdl =
      "directive @key(fields: FieldSet!) on OBJECT\ntype User { id: ID! }";
    expect(ensureFederationDirectives(sdl)).toBe(sdl);
  });
});

describe("sdlHasFederationDirectives", () => {
  it("detects existing directives", () => {
    expect(
      sdlHasFederationDirectives("directive @key(fields: FieldSet!) on OBJECT"),
    ).toBe(true);
    expect(sdlHasFederationDirectives("directive @shareable on OBJECT")).toBe(
      true,
    );
  });

  it("returns false for plain SDL", () => {
    expect(sdlHasFederationDirectives("type User { id: ID! }")).toBe(false);
  });
});

describe("federationLinkDirective", () => {
  it("produces an @link extend schema directive", () => {
    const link = federationLinkDirective();
    expect(link).toContain("@link");
    expect(link).toContain("2.9");
    expect(link).toContain("@key");
  });
});

describe("FEDERATION_IMPORTS", () => {
  it("contains expected directives", () => {
    expect(FEDERATION_IMPORTS).toContain("@key");
    expect(FEDERATION_IMPORTS).toContain("@shareable");
    expect(FEDERATION_IMPORTS).toContain("@authenticated");
  });
});

describe("FEDERATION_DIRECTIVES_SDL", () => {
  it("contains all standard directives", () => {
    expect(FEDERATION_DIRECTIVES_SDL).toContain("directive @key");
    expect(FEDERATION_DIRECTIVES_SDL).toContain("directive @shareable");
    expect(FEDERATION_DIRECTIVES_SDL).toContain("directive @authenticated");
    expect(FEDERATION_DIRECTIVES_SDL).toContain("directive @constraint");
    expect(FEDERATION_DIRECTIVES_SDL).toContain("directive @cache");
  });
});
