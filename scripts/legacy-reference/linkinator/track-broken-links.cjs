#!/usr/bin/env node
/**
 * scripts/linkinator/track-broken-links.cjs
 *
 * CommonJS helper to run Linkinator and map broken URLs to source files.
 * - Checks Node.js major version and skips running Linkinator if Node < 20.
 * - Applies two safe, reversible edits before running:
 *    1) Replace cloud.gov OpenGraph image URL in `src/constants/seo.ts` with a local path `/assets/diagram.svg`
 *    2) Inject simple `rewrites` into `next.config.js` so `/graphql-editor` is served from `public/graphql-editor/index.html`.
 * - Runs `pnpm dlx linkinator` against a provided URL and writes outputs to `tmp/`.
 *
 * Usage:
 *   node scripts/linkinator/track-broken-links.cjs http://localhost:3000
 *
 * Notes:
 * - Make sure pnpm is available and your shell uses Node >= 20 to actually run Linkinator.
 * - The script writes backups into `tmp/backup` when it edits files.
 * - The script is conservative: if it can't find the text to patch it will skip that edit.
 */

const fs = require("fs");
const path = require("path");
const child = require("child_process");

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "tmp");
const BACKUP_DIR = path.join(OUT_DIR, "backup");

function ensureDir(d) {
  try {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  } catch (e) {
    // best-effort
  }
}
ensureDir(OUT_DIR);
ensureDir(BACKUP_DIR);

const argvUrl = process.argv[2] || "http://localhost:3000";
const concurrency = process.env.LINKINATOR_CONCURRENCY || "10";

function log(...args) {
  console.log("[linkinator-helper]", ...args);
}
function warn(...args) {
  console.warn("[linkinator-helper][WARN]", ...args);
}
function err(...args) {
  console.error("[linkinator-helper][ERROR]", ...args);
}

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (e) {
    return null;
  }
}
function safeWrite(filePath, contents) {
  fs.writeFileSync(filePath, contents, "utf8");
}

/**
 * Node version guard: Linkinator requires Node >= 20 (per repo tools).
 * If Node < 20, we will still apply file patches (they are safe) but we will not attempt
 * to execute Linkinator. That matches the user's request to skip running Linkinator on Node < 20.
 */
function nodeMajorVersion() {
  const v = process.versions && process.versions.node;
  if (!v) return 0;
  const major = parseInt(v.split(".")[0], 10);
  return isNaN(major) ? 0 : major;
}

/**
 * Safe patch #1: change OpenGraph image URL in src/constants/seo.ts
 */
function patchSeoOpenGraph() {
  const seoPath = path.join(ROOT, "src", "constants", "seo.ts");
  const contents = safeRead(seoPath);
  if (!contents) {
    log("SEO file not found, skipping SEO patch:", path.relative(ROOT, seoPath));
    return { patched: false };
  }

  // Match the previous cloud.gov absolute URL used in the project.
  const cloudRegexp =
    /https?:\/\/ttse-schema-unification-project\.app\.cloud\.gov\/assets\/diagram\.svg/;
  const localPath = "/assets/diagram.svg";

  if (!cloudRegexp.test(contents)) {
    log("SEO does not reference cloud.gov diagram.svg (or already patched). Skipping SEO patch.");
    return { patched: false };
  }

  // Backup original
  const backup = path.join(BACKUP_DIR, "seo.ts.bak");
  safeWrite(backup, contents);

  const patched = contents.replace(cloudRegexp, localPath);
  safeWrite(seoPath, patched);
  log("Patched SEO OpenGraph image to local path:", localPath);
  log("Backup of original saved to:", path.relative(ROOT, backup));

  const assetCandidate = path.join(ROOT, "public", "assets", "diagram.svg");
  if (!fs.existsSync(assetCandidate)) {
    warn("Local asset file not found:", path.relative(ROOT, assetCandidate));
    warn(
      "If you want the image to appear on social cards, add public/assets/diagram.svg or update the SEO URL to an existing image.",
    );
  }

  return { patched: true, backup };
}

/**
 * Safe patch #2: inject rewrites into next.config.js so /graphql-editor serves the static index
 * We insert a `rewrites` property into the top-level config object if it doesn't already reference /graphql-editor.
 */
function injectNextConfigRewrites() {
  const nextConfigPath = path.join(ROOT, "next.config.js");
  const contents = safeRead(nextConfigPath);
  if (!contents) {
    log(
      "next.config.js not found, skipping rewrites injection:",
      path.relative(ROOT, nextConfigPath),
    );
    return { patched: false };
  }

  if (
    contents.includes("source: '/graphql-editor'") ||
    contents.includes("/graphql-editor/index.html")
  ) {
    log("next.config.js already contains graphql-editor rewrites/redirects. Skipping injection.");
    return { patched: false };
  }

  const marker = "const config = {";
  const idx = contents.indexOf(marker);
  if (idx === -1) {
    warn("Could not locate `const config = {` in next.config.js — skipping automated injection.");
    return { patched: false };
  }

  // Build the injection text. Keep style minimal and valid JS.
  const injection =
    "\n  // Added by scripts/linkinator/track-broken-links.cjs to ensure /graphql-editor is served\n" +
    "  rewrites: async () => [\n" +
    "    { source: '/graphql-editor', destination: '/graphql-editor/index.html' },\n" +
    "    { source: '/graphql-editor/:path*', destination: '/graphql-editor/:path*' },\n" +
    "  ],\n";

  const insertPos = idx + marker.length;
  const patched = contents.slice(0, insertPos) + injection + contents.slice(insertPos);

  const backup = path.join(BACKUP_DIR, "next.config.js.bak");
  safeWrite(backup, contents);
  safeWrite(nextConfigPath, patched);

  log(
    "Injected rewrites into next.config.js to serve /graphql-editor from public/graphql-editor/index.html",
  );
  log("Backup of original next.config.js saved to:", path.relative(ROOT, backup));

  return { patched: true, backup };
}

/**
 * Run Linkinator (only if Node >= 20)
 * We capture JSON output to tmp/linkinator.json and return parsed JSON if available.
 */
function runLinkinator(targetUrl) {
  const outFile = path.join(OUT_DIR, "linkinator.json");
  const cmd = `pnpm dlx linkinator ${targetUrl} --internal --allow-local --concurrency ${concurrency} --format json`;

  log("Executing:", cmd);
  try {
    const out = child.execSync(cmd, {
      stdio: ["inherit", "pipe", "pipe"],
      maxBuffer: 20 * 1024 * 1024,
    });
    fs.writeFileSync(outFile, out);
    log("Linkinator output saved to:", path.relative(ROOT, outFile));
    try {
      return JSON.parse(out.toString());
    } catch (e) {
      warn("Could not parse Linkinator JSON output:", e.message);
      return null;
    }
  } catch (e) {
    // Try to recover partial stdout if present
    if (e.stdout) {
      try {
        fs.writeFileSync(outFile, e.stdout);
        log("Partial Linkinator output written to:", path.relative(ROOT, outFile));
        try {
          return JSON.parse(e.stdout.toString());
        } catch (parseErr) {
          warn("Partial Linkinator output could not be parsed:", parseErr.message);
        }
      } catch (writeErr) {
        warn("Failed to write partial Linkinator output:", writeErr.message);
      }
    }
    err("Linkinator execution failed:", e && e.message ? e.message : e);
    return null;
  }
}

/**
 * Extract items that are broken (non-200 / non-OK)
 */
function extractBroken(results) {
  if (!results || !Array.isArray(results.results)) return [];
  return results.results.filter((r) => {
    const s = r.status;
    if (s === undefined || s === null) return true;
    if (typeof s === "number") return s !== 200;
    if (typeof s === "string") {
      const n = parseInt(s, 10);
      if (!isNaN(n)) return n !== 200;
      return s.toLowerCase() !== "ok";
    }
    return true;
  });
}

/**
 * Map broken URLs to source files using ripgrep (rg) when available, falling back to git ls-files + scan.
 */
function mapBrokenToSources(brokenList) {
  const map = {};
  const hasRg = (function () {
    try {
      const r = child.spawnSync("rg", ["--version"], { stdio: "ignore" });
      return r.status === 0;
    } catch (e) {
      return false;
    }
  })();

  for (const entry of brokenList) {
    const url = entry.url || entry.resource || entry.location || String(entry);
    map[url] = { status: entry.status, method: entry.method, sources: [] };

    if (hasRg) {
      try {
        // Use -n --hidden --no-ignore -S to be thorough
        const rgRes = child.spawnSync("rg", ["-n", "--hidden", "--no-ignore", "-S", url], {
          cwd: ROOT,
          encoding: "utf8",
          maxBuffer: 10 * 1024 * 1024,
        });
        if (rgRes.status === 0 && rgRes.stdout) {
          map[url].sources = rgRes.stdout.trim().split(/\r?\n/).slice(0, 500);
          continue;
        }
      } catch (e) {
        // fall through to fallback
      }
    }

    // Fallback: git ls-files + content scan
    try {
      const gitList = child.spawnSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" });
      if (gitList.status === 0 && gitList.stdout) {
        const files = gitList.stdout.trim().split(/\r?\n/).filter(Boolean);
        const found = [];
        const pathOnly = url.replace(/^https?:\/\/[^/]+/, "");
        for (const f of files) {
          if (found.length >= 500) break;
          try {
            const content = fs.readFileSync(path.join(ROOT, f), "utf8");
            if (content.includes(url)) {
              found.push(`${f}: contains full URL`);
            } else if (pathOnly && content.includes(pathOnly)) {
              found.push(`${f}: contains path ${pathOnly}`);
            }
          } catch (e) {
            // ignore unreadable files
          }
        }
        map[url].sources = found;
      }
    } catch (e) {
      // give up for this entry
      map[url].sources = [];
    }
  }

  return map;
}

/**
 * Persist outputs
 */
function writeOutputs(brokenList, mapping) {
  try {
    const brokenFile = path.join(OUT_DIR, "broken-links.json");
    const mappingFile = path.join(OUT_DIR, "broken-links-sources.json");
    fs.writeFileSync(brokenFile, JSON.stringify(brokenList, null, 2), "utf8");
    fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2), "utf8");
    log("Wrote outputs:", path.relative(ROOT, brokenFile), path.relative(ROOT, mappingFile));
  } catch (e) {
    warn("Failed to write outputs:", e && e.message ? e.message : e);
  }
}

/**
 * Main
 */
(function main() {
  log("Starting linkinator helper");

  // Apply safe edits first (they are harmless and useful even if we can't run linkinator)
  try {
    const seoResult = patchSeoOpenGraph();
    if (seoResult.patched) log("SEO OpenGraph patched (backup created).");

    const nextResult = injectNextConfigRewrites();
    if (nextResult.patched)
      log("next.config.js rewritten to add /graphql-editor rewrite (backup created).");
  } catch (e) {
    warn("Error while attempting safe edits:", e && e.message ? e.message : e);
  }

  const nodeMajor = nodeMajorVersion();
  if (nodeMajor < 20) {
    warn(
      `Node.js major version is ${nodeMajor}. Skipping running Linkinator because it requires Node >= 20. ` +
        `You can still run Linkinator after switching to Node >= 20 (for example: nvm install 20 && nvm use 20).`,
    );
    process.exit(0);
  }

  // Run Linkinator
  const results = runLinkinator(argvUrl);
  if (!results) {
    err("Linkinator did not produce parseable JSON results. Aborting mapping step.");
    process.exitCode = 2;
    return;
  }

  const broken = extractBroken(results);
  log(`Found ${broken.length} broken entries (non-200/non-OK).`);

  const mapping = mapBrokenToSources(broken);
  writeOutputs(broken, mapping);

  log("Completed linkinator helper operations");
})();
