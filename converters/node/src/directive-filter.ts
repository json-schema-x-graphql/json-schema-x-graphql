/**
 * Directive Filter Framework for GraphQL SDL generation.
 *
 * Configuration-driven filtering of GraphQL directives during SDL output,
 * supporting modes like "viewer-friendly" (strip all infrastructure
 * directives) and "exclude-draft" (omit draft/unstable directives).
 *
 * Mirrors the Rust implementation in `converters/rust/src/directive_filter.rs`.
 */

export type DirectiveTier = "spec" | "federation" | "custom" | "draft";

/**
 * Public filter mode. Uses the same enum values as the GraphQL API
 * schema (ALL, VIEWER_FRIENDLY, EXCLUDE_DRAFT) plus a `Custom` variant
 * with a list of directive names to exclude.
 */
export type DirectiveFilterMode =
  | "ALL"
  | "VIEWER_FRIENDLY"
  | "EXCLUDE_DRAFT"
  | { CUSTOM: string[] };

/** Classify a directive by its tier. */
export function classifyDirective(name: string): DirectiveTier {
  const cleanName = name.startsWith("@") ? name.slice(1) : name;

  // GraphQL spec built-ins
  if (
    cleanName === "deprecated" ||
    cleanName === "skip" ||
    cleanName === "include" ||
    cleanName === "specifiedBy"
  ) {
    return "spec";
  }

  // Federation v2.x directives
  const federationDirectives = new Set([
    "key",
    "shareable",
    "external",
    "requires",
    "provides",
    "override",
    "inaccessible",
    "tag",
    "interfaceObject",
    "authenticated",
    "requiresScopes",
    "policy",
    "cost",
    "listSize",
    "composeDirective",
  ]);
  if (federationDirectives.has(cleanName)) {
    return "federation";
  }

  // Production custom directives
  const customDirectives = new Set([
    "constraint",
    "cache",
    "authorize",
    "mask",
    "rateLimit",
  ]);
  if (customDirectives.has(cleanName)) {
    return "custom";
  }

  // Unknown → treat as custom
  return "custom";
}

/** Determine if a directive should be included given the active mode. */
export function shouldIncludeDirective(
  name: string,
  mode: DirectiveFilterMode,
): boolean {
  if (mode === "ALL") {
    return true;
  }

  if (mode === "VIEWER_FRIENDLY") {
    return classifyDirective(name) === "spec";
  }

  if (mode === "EXCLUDE_DRAFT") {
    return classifyDirective(name) !== "draft";
  }

  // Custom exclusion list
  if (typeof mode === "object" && "CUSTOM" in mode) {
    const cleanName = (
      name.startsWith("@") ? name.slice(1) : name
    ).toLowerCase();
    return !mode.CUSTOM.some((d) => {
      const dName = (d.startsWith("@") ? d.slice(1) : d).toLowerCase();
      return dName === cleanName;
    });
  }

  return true;
}

/** Filter an array of directive strings based on the mode. */
export function filterDirectiveList(
  directives: string[],
  mode: DirectiveFilterMode,
): string[] {
  return directives.filter((d) => {
    const name = d.trimStart().replace(/^@/, "").split(/[(\s]/).shift() ?? d;
    return shouldIncludeDirective(name, mode);
  });
}

type ScannerState =
  | "normal"
  | "singleQuotedString"
  | "doubleQuotedString"
  | "blockString"
  | "comment";

function trimCurrentLineEnd(value: string): string {
  return value.replace(/[^\S\n]+$/, "");
}

function filterDirectives(input: string, mode: DirectiveFilterMode): string {
  if (mode === "ALL") {
    return input;
  }

  let result = "";
  let state: ScannerState = "normal";
  let escaped = false;
  let inDirective = false;
  let directiveBuffer = "";
  let parenDepth = 0;

  const append = (text: string) => {
    if (inDirective) {
      directiveBuffer += text;
    } else {
      result += text;
    }
  };

  const finishDirective = () => {
    const name =
      directiveBuffer.replace(/^@/, "").split(/[(\s]/).shift() ??
      directiveBuffer;
    if (shouldIncludeDirective(name, mode)) {
      result += directiveBuffer;
    }
    inDirective = false;
    directiveBuffer = "";
    parenDepth = 0;
  };

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (state === "comment") {
      if (ch === "\n") {
        state = "normal";
        if (inDirective) {
          if (parenDepth === 0) {
            finishDirective();
            result = trimCurrentLineEnd(result) + ch;
          } else {
            directiveBuffer += ch;
          }
        } else {
          result = trimCurrentLineEnd(result) + ch;
        }
      } else {
        append(ch);
      }
      continue;
    }

    if (state === "blockString") {
      if (ch === '"' && input.startsWith('"""', i)) {
        let backslashes = 0;
        let k = i - 1;
        while (k >= 0 && input[k] === "\\") {
          backslashes++;
          k--;
        }
        if (backslashes % 2 === 0) {
          append('"""');
          i += 2;
          state = "normal";
          continue;
        }
      }
      append(ch);
      continue;
    }

    if (state !== "normal") {
      append(ch);
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (
        (state === "singleQuotedString" && ch === "'") ||
        (state === "doubleQuotedString" && ch === '"')
      ) {
        state = "normal";
      }
      continue;
    }

    if (ch === "\n") {
      if (inDirective) {
        if (parenDepth === 0) {
          finishDirective();
          result = trimCurrentLineEnd(result) + ch;
        } else {
          directiveBuffer += ch;
        }
      } else {
        result = trimCurrentLineEnd(result) + ch;
      }
      continue;
    }

    if (ch === "#") {
      if (inDirective && parenDepth === 0) {
        finishDirective();
      }
      append(ch);
      state = "comment";
    } else if (ch === '"' && input.startsWith('"""', i)) {
      append('"""');
      i += 2;
      state = "blockString";
    } else if (ch === '"' || ch === "'") {
      append(ch);
      state = ch === '"' ? "doubleQuotedString" : "singleQuotedString";
      escaped = false;
    } else if (ch === "@" && !inDirective) {
      inDirective = true;
      directiveBuffer = ch;
    } else if (inDirective) {
      directiveBuffer += ch;
      if (ch === "(") {
        parenDepth++;
      } else if (ch === ")") {
        parenDepth--;
        if (parenDepth === 0) {
          finishDirective();
        }
      } else if (parenDepth === 0 && /\s/.test(ch)) {
        const name = directiveBuffer.replace(/^@/, "").trim();
        if (shouldIncludeDirective(name, mode)) {
          result += directiveBuffer;
        }
        result += ch;
        inDirective = false;
        directiveBuffer = "";
      }
    } else {
      result += ch;
    }
  }

  if (inDirective && directiveBuffer) {
    finishDirective();
  }

  return state === "normal" || state === "comment"
    ? trimCurrentLineEnd(result)
    : result;
}

/** Filter directive tokens from a single line of SDL output. */
export function filterLineDirectives(
  line: string,
  mode: DirectiveFilterMode,
): string {
  return filterDirectives(line, mode);
}

/** Apply directive filtering to an entire SDL string. */
export function filterSdlDirectives(
  sdl: string,
  mode: DirectiveFilterMode,
): string {
  return filterDirectives(sdl, mode);
}

export const FEDERATION_VERSION = "2.9";

export const FEDERATION_IMPORTS = [
  "@key",
  "@shareable",
  "@external",
  "@provides",
  "@requires",
  "@override",
  "@inaccessible",
  "@tag",
  "@interfaceObject",
  "@authenticated",
  "@requiresScopes",
  "@policy",
  "@cost",
  "@listSize",
];

/** Build the @link extend schema directive line. */
export function federationLinkDirective(): string {
  const imports = FEDERATION_IMPORTS.map((i) => `"${i}"`).join(", ");
  return `extend schema @link(url: "https://specs.apollo.dev/federation/v${FEDERATION_VERSION}", import: [${imports}])`;
}

/** Complete Federation v2.9 directive SDL definitions. */
export const FEDERATION_DIRECTIVES_SDL = `
scalar FieldSet
scalar link__Import

enum link__Purpose {
  """
  \`SECURITY\` features provide metadata necessary to securely resolve fields.
  """
  SECURITY

  """
  \`EXECUTION\` features provide metadata necessary for operation execution.
  """
  EXECUTION
}

directive @key(fields: FieldSet!, resolvable: Boolean = true) repeatable on OBJECT | INTERFACE
directive @requires(fields: FieldSet!) on FIELD_DEFINITION
directive @provides(fields: FieldSet!) on FIELD_DEFINITION
directive @external(reason: String) on FIELD_DEFINITION | OBJECT
directive @shareable on FIELD_DEFINITION | OBJECT
directive @link(url: String!, as: String, for: link__Purpose, import: [link__Import]) repeatable on SCHEMA
directive @tag(name: String!) repeatable on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION
directive @override(from: String!, label: String) on FIELD_DEFINITION
directive @inaccessible on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION
directive @interfaceObject on OBJECT
directive @composeDirective(name: String) repeatable on SCHEMA
directive @authenticated on FIELD_DEFINITION | OBJECT | INTERFACE | SCALAR | ENUM
directive @requiresScopes(scopes: [[String!]!]!) on FIELD_DEFINITION | OBJECT | INTERFACE | SCALAR | ENUM
directive @policy(policies: [[String!]!]!) on FIELD_DEFINITION | OBJECT | INTERFACE | SCALAR | ENUM
directive @cost(weight: Int!) on ARGUMENT_DEFINITION | ENUM | FIELD_DEFINITION | INPUT_FIELD_DEFINITION | OBJECT | SCALAR
directive @listSize(assumedSize: Int, slicingArguments: [String!], sizedFields: [String!], requireOneSlicingArgument: Boolean = true) on FIELD_DEFINITION

# Custom validation and performance directives
directive @constraint(pattern: String, min: Int, max: Int, minLength: Int, maxLength: Int) on FIELD_DEFINITION | ARGUMENT_DEFINITION
directive @cache(ttl: Int, scope: String) on FIELD_DEFINITION | OBJECT
directive @authorize(requires: String, roles: [String], scopes: [String]) on FIELD_DEFINITION | OBJECT | INTERFACE
directive @mask(pattern: String, if: String, value: String, maskLevel: String, maskFor: [String]) on FIELD_DEFINITION
directive @rateLimit(limit: Int, window: String, roles: [String]) on FIELD_DEFINITION
`;

/** Check whether an SDL string already contains federation directive definitions. */
export function sdlHasFederationDirectives(sdl: string): boolean {
  return (
    sdl.includes("directive @key") ||
    sdl.includes("directive @shareable") ||
    sdl.includes("directive @link")
  );
}

/** Inject federation directive definitions into an SDL string if missing. */
export function ensureFederationDirectives(sdl: string): string {
  if (sdlHasFederationDirectives(sdl)) {
    return sdl;
  }
  // Remove any existing @link line to avoid conflicts
  const cleaned = sdl
    .split("\n")
    .filter((l) => !l.trim().startsWith("extend schema @link"))
    .join("\n");
  return `${FEDERATION_DIRECTIVES_SDL.trim()}\n${cleaned.trim()}`;
}
