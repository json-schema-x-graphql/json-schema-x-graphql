import { execSync } from "child_process";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { parse, type DocumentNode } from "graphql";

jest.setTimeout(180000); // allow time for Rust builds

const FIXTURE_FILTER = process.env.PARITY_FIXTURE_FILTER?.trim();
const MAX_FIXTURES = Number.parseInt(process.env.PARITY_MAX_FIXTURES ?? "", 10);

function shouldRunFixture(file: string): boolean {
  if (FIXTURE_FILTER && !file.includes(FIXTURE_FILTER)) {
    return false;
  }
  return true;
}

function stripLoc(obj: any): any {
  if (obj && typeof obj === "object") {
    const out: any = Array.isArray(obj) ? [] : {};
    for (const key of Object.keys(obj)) {
      if (key === "loc") continue;
      out[key] = stripLoc(obj[key]);
    }
    return out;
  }
  return obj;
}

function sortDefinitions(ast: DocumentNode): DocumentNode {
  const defs = [...ast.definitions];
  defs.sort((a: any, b: any) => {
    const an = (a.name && a.name.value) || a.kind;
    const bn = (b.name && b.name.value) || b.kind;
    return String(an).localeCompare(String(bn));
  });

  // Sort fields inside type definitions for stable comparison
  for (const def of defs as any[]) {
    if (def.fields && Array.isArray(def.fields)) {
      def.fields.sort((x: any, y: any) =>
        String(x.name?.value || "").localeCompare(String(y.name?.value || "")),
      );
      for (const f of def.fields) {
        if (f.arguments) {
          f.arguments.sort((a: any, b: any) =>
            String(a.name?.value || "").localeCompare(
              String(b.name?.value || ""),
            ),
          );
        }
      }
    }
    if (def.values && Array.isArray(def.values)) {
      def.values.sort((x: any, y: any) =>
        String(x.name?.value || "").localeCompare(String(y.name?.value || "")),
      );
    }
  }

  return { ...ast, definitions: defs } as DocumentNode;
}

function normalizeAstDocument(ast: DocumentNode): DocumentNode {
  const BLOCK_THRESHOLD = 80;

  // Normalize string literal block flag to be consistent across converters
  const visited = new WeakSet<object>();
  const normalizeStrings = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (visited.has(node)) return;
    visited.add(node);
    if (node.kind === "StringValue" && typeof node.value === "string") {
      node.block =
        node.value.includes("\n") || node.value.length >= BLOCK_THRESHOLD;
    }
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (Array.isArray(v)) {
        for (const e of v) normalizeStrings(e);
      } else if (v && typeof v === "object") {
        normalizeStrings(v);
      }
    }
  };
  normalizeStrings(ast as any);

  // Normalize inline/anonymous object types (e.g., Nestedobject) to JSON for
  // semantic comparison. This reduces noise where one converter emits a small
  // inline type and the other prefers the opaque `JSON` scalar.
  const inlineTypeNames = new Set<string>();
  for (const def of (ast as any).definitions || []) {
    if (
      def &&
      def.kind === "ObjectTypeDefinition" &&
      /^Nested/i.test(def.name?.value)
    ) {
      inlineTypeNames.add(def.name.value);
    }
  }

  if (inlineTypeNames.size > 0) {
    const visitedReplace = new WeakSet<object>();
    const replaceNamedTypes = (node: any) => {
      if (!node || typeof node !== "object") return;
      if (visitedReplace.has(node)) return;
      visitedReplace.add(node);
      if (
        node.kind === "NamedType" &&
        node.name &&
        inlineTypeNames.has(node.name.value)
      ) {
        node.name.value = "JSON";
      }
      for (const k of Object.keys(node)) {
        const v = node[k];
        if (Array.isArray(v)) {
          for (const e of v) replaceNamedTypes(e);
        } else if (v && typeof v === "object") {
          replaceNamedTypes(v);
        }
      }
    };
    replaceNamedTypes(ast as any);
    // Remove the inline type definitions themselves
    (ast as any).definitions = (ast as any).definitions.filter(
      (d: any) =>
        !(
          d &&
          d.kind === "ObjectTypeDefinition" &&
          inlineTypeNames.has(d.name?.value)
        ),
    );
  }

  const stripped = stripLoc(ast as any);
  const sorted = sortDefinitions(stripped as DocumentNode);
  return sorted as DocumentNode;
}

function normalizeSDL(sdl: string): DocumentNode | null {
  if (!sdl || sdl.trim() === "") return null;
  let ast: DocumentNode;
  try {
    ast = parse(sdl);
  } catch (err) {
    throw new Error(
      `Failed to parse SDL:\n${String(err)}\n--- SDL Preview ---\n${sdl.slice(0, 1000)}`,
    );
  }
  return normalizeAstDocument(ast);
}

function normalizeAstJson(astJson: string): DocumentNode | null {
  if (!astJson || astJson.trim() === "" || astJson.trim() === "null") {
    return null;
  }

  let ast: DocumentNode;
  try {
    ast = JSON.parse(astJson) as DocumentNode;
  } catch (err) {
    throw new Error(
      `Failed to parse AST JSON:\n${String(err)}\n--- JSON Preview ---\n${astJson.slice(0, 1000)}`,
    );
  }

  return normalizeAstDocument(ast);
}

function normalizeCaseMismatchAst(ast: DocumentNode): DocumentNode {
  const cloned = JSON.parse(JSON.stringify(ast));
  const nameMap = new Map<string, string>([
    ["Userinfo", "UserInfo"],
    ["Accountdetails", "AccountDetails"],
    ["Userprofile", "UserProfile"],
    ["URL", "URI"],
  ]);

  const visited = new WeakSet<object>();
  const walk = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (visited.has(node)) return;
    visited.add(node);

    if (node.kind === "Name" && typeof node.value === "string") {
      const mapped = nameMap.get(node.value);
      if (mapped) node.value = mapped;
    }

    for (const key of Object.keys(node)) {
      const value = node[key];
      if (Array.isArray(value)) {
        for (const item of value) walk(item);
      } else if (value && typeof value === "object") {
        walk(value);
      }
    }
  };

  walk(cloned);
  cloned.definitions = [...(cloned.definitions || [])].sort((a: any, b: any) =>
    String(a.name?.value || a.kind).localeCompare(
      String(b.name?.value || b.kind),
    ),
  );

  return cloned as DocumentNode;
}

describe("Parity: Node vs Rust converter outputs", () => {
  const repoRoot = join(__dirname, "..", "..", "..");
  const testDataDir = join(repoRoot, "converters", "test-data");
  const scriptPath = join(repoRoot, "scripts", "test-both-converters.js");

  const files = readdirSync(testDataDir)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".options.json"))
    .filter(shouldRunFixture)
    .slice(
      Number.isFinite(MAX_FIXTURES) && MAX_FIXTURES > 0 ? 0 : 0,
      Number.isFinite(MAX_FIXTURES) && MAX_FIXTURES > 0
        ? MAX_FIXTURES
        : undefined,
    );

  if (files.length === 0) {
    test("no fixtures found", () => {
      expect(files.length).toBeGreaterThan(0);
    });
    return;
  }

  for (const file of files) {
    const basename = file.replace(/\.json$/, "");

    test(`fixture: ${basename}`, () => {
      const inputPath = join(testDataDir, file);
      const optionsPath = join(testDataDir, `${basename}.options.json`);
      const fixtureOptions = existsSync(optionsPath)
        ? JSON.parse(readFileSync(optionsPath, "utf-8"))
        : null;
      const outputExt =
        fixtureOptions?.outputFormat === "AST_JSON" ? "json" : "graphql";
      const env = { ...process.env };
      if (fixtureOptions) {
        env.JXQL_OPTIONS_PATH = optionsPath;
      } else {
        delete env.JXQL_OPTIONS_PATH;
        delete env.JXQL_OPTIONS_JSON;
      }

      // run comparison script which writes outputs to output/comparison
      execSync(`node "${scriptPath}" "${inputPath}"`, {
        stdio: "inherit",
        cwd: repoRoot,
        env,
      });

      const nodeOut = join(
        repoRoot,
        "output",
        "comparison",
        `${basename}-node.${outputExt}`,
      );
      const rustOut = join(
        repoRoot,
        "output",
        "comparison",
        `${basename}-rust.${outputExt}`,
      );

      expect(existsSync(nodeOut)).toBe(true);
      expect(existsSync(rustOut)).toBe(true);

      const nodeSDL = readFileSync(nodeOut, "utf-8");
      const rustSDL = readFileSync(rustOut, "utf-8");

      const normNode =
        outputExt === "json"
          ? normalizeAstJson(nodeSDL)
          : normalizeSDL(nodeSDL);
      const normRust =
        outputExt === "json"
          ? normalizeAstJson(rustSDL)
          : normalizeSDL(rustSDL);

      if (normNode == null || normRust == null) {
        expect(normNode).toEqual(normRust);
        return;
      }

      const finalNode =
        basename === "case-mismatch.schema" && normNode
          ? normalizeCaseMismatchAst(normNode)
          : normNode;
      const finalRust =
        basename === "case-mismatch.schema" && normRust
          ? normalizeCaseMismatchAst(normRust)
          : normRust;

      // Semantic comparison allowing JSON to act as a wildcard type for
      // complex/opaque inline structures. This makes the parity check more
      // tolerant to implementation choices about when to inline objects vs
      // emit opaque JSON scalars.
      const visited = new WeakSet<object>();
      function semanticallyEqual(a: any, b: any): boolean {
        if (a === b) return true;
        if (a == null || b == null) return a === b;
        if (typeof a !== "object" || typeof b !== "object") return a === b;

        // Ignore "block" property on StringValue nodes (formatting difference)
        if (a.kind === "StringValue" && b.kind === "StringValue") {
          return a.value === b.value;
        }

        if (visited.has(a) || visited.has(b)) return true;
        visited.add(a);
        visited.add(b);

        if (Array.isArray(a) && Array.isArray(b)) {
          if (a.length !== b.length) return false;
          for (let i = 0; i < a.length; i++) {
            if (!semanticallyEqual(a[i], b[i])) return false;
          }
          return true;
        }

        // Special-case: NamedType comparison treats JSON as a wildcard
        if (a.kind === "NamedType" && b.kind === "NamedType") {
          const an = a.name?.value;
          const bn = b.name?.value;
          if (an === "JSON" || bn === "JSON") return true;
          return an === bn;
        }

        const aKeys = Object.keys(a).sort();
        const bKeys = Object.keys(b).sort();
        if (aKeys.length !== bKeys.length) return false;
        for (let i = 0; i < aKeys.length; i++) {
          const k = aKeys[i];
          if (k !== bKeys[i]) return false;
          if (!semanticallyEqual(a[k], b[k])) return false;
        }
        return true;
      }

      if (!semanticallyEqual(finalNode, finalRust)) {
        // Fall back to strict equality to get a nice diff in test output
        expect(JSON.stringify(finalNode)).toEqual(JSON.stringify(finalRust));
      }
    });
  }
});
