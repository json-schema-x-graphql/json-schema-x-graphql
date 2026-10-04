import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { parse } from "graphql";

/**
 * Canary: every committed SDL file under examples/real-world-schemas must
 * parse as GraphQL. These files are used as reference outputs and size
 * baselines; historically some contained invalid identifiers (enum values
 * and type names with embedded spaces) that broke downstream tooling such
 * as dprint's pretty_graphql plugin.
 */
describe("Committed example SDL validity", () => {
  const rootDir = join(
    __dirname,
    "..",
    "..",
    "..",
    "examples",
    "real-world-schemas",
  );

  function collectGraphqlFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        out.push(...collectGraphqlFiles(full));
      } else if (entry.name.endsWith(".graphql")) {
        out.push(full);
      }
    }
    return out.sort();
  }

  it("all reference and legacy SDL files parse as GraphQL", () => {
    const files = collectGraphqlFiles(rootDir);
    expect(files.length).toBeGreaterThan(0);

    const errors: string[] = [];
    for (const file of files) {
      const sdl = readFileSync(file, "utf-8");
      try {
        parse(sdl);
      } catch (err) {
        errors.push(
          `${file}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    expect(errors).toEqual([]);
  });
});
