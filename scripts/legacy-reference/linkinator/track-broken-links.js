#!/usr/bin/env node
/**
 * scripts/linkinator/track-broken-links.js
 *
 * Usage:
 *   node scripts/linkinator/track-broken-links.js http://localhost:3000
 *
 * What this script does:
 * 1. Optionally applies two safe fixes:
 *    - Replace OpenGraph image URL in `src/constants/seo.ts` from the external
 *      cloud.gov URL to a local path `/assets/diagram.svg` (creates a backup).
 *    - Inject a simple `rewrites` entry into `next.config.js` so `/graphql-editor`
 *      is served from `public/graphql-editor/index.html` during dev/export.
 *    Both fixes are applied only if they appear necessary and the files exist.
 *
 * 2. Runs Linkinator (via `pnpm dlx linkinator`) against the provided URL,
 *    captures JSON output to `tmp/linkinator.json`, extracts broken results,
 *    and attempts to map each broken URL to repo source files (via `rg` when
 *    available, otherwise a git ls-files + content search fallback).
 *
 * 3. Writes:
 *    - tmp/linkinator.json
 *    - tmp/broken-links.json
 *    - tmp/broken-links-sources.json
 *
 * Notes:
 * - Linkinator requires Node >= 20. This script will attempt to run `pnpm dlx`
 *   locally; make sure your environment has Node >= 20 and pnpm, or run the
 *   commands yourself if you prefer.
 * - This script only modifies two files and writes backups into `tmp/backup`.
 *   Inspect backups before committing any of the changes.
 *
 * Safety:
 * - The file edits are conservative: backups are created and edits are skipped
 *   if the target text isn't found or if the change seems already applied.
 */

const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "tmp");
const BACKUP_DIR = path.join(OUT_DIR, "backup");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const targetUrl = process.argv[2] || "http://localhost:3000";
const concurrency = process.env.LINKINATOR_CONCURRENCY || "10";

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
 * 1) Safe fix: update OpenGraph image in src/constants/seo.ts
 */
function patchSeoOpenGraph() {
  const seoPath = path.join(ROOT, "src", "constants", "seo.ts");
  const current = safeRead(seoPath);
  if (!current) {
    console.log(`[skip] SEO file not found: ${seoPath}`);
    return { patched: false };
  }

  const cloudUrlRegex = /https?:\/\/ttse-schema-unification-project\.app\.cloud\.gov\/assets\/diagram\.svg/;
  const localPath = "/assets/diagram.svg";

  if (!cloudUrlRegex.test(current)) {
    console.log("[skip] SEO file does not reference cloud.gov diagram.svg (or already patched).");
    return { patched: false };
  }

  // Backup original
  const backupPath = path.join(BACKUP_DIR, "seo.ts.bak");
  safeWrite(backupPath, current);
  console.log(`Backed up original SEO file to ${path.relative(ROOT, backupPath)}`);

  const patched = current.replace(cloudUrlRegex, localPath);
  safeWrite(seoPath, patched);
  console.log(`Patched SEO OpenGraph image URL -> ${localPath} in ${path.relative(ROOT, seoPath)}`);

  // Warn if the asset file is missing
  const assetCandidate = path.join(ROOT, "public", "assets", "diagram.svg");
  if (!fs.existsSync(assetCandidate)) {
    console.warn(
      `Note: ${path.relative(ROOT, assetCandidate)} does not exist. ` +
        `If the diagram asset isn't present, add it to public/assets/diagram.svg or point SEO to an existing image.`
    );
  }

  return { patched: true, backup: backupPath };
}

/**
 * 2) Safe fix: inject rewrites into next.config.js to serve /graphql-editor
 */
function ensureNextConfigRewrites() {
  const nextConfigPath = path.join(ROOT, "next.config.js");
  const content = safeRead(nextConfigPath);
  if (!content) {
    console.log(`[skip] next.config.js not found: ${nextConfigPath}`);
    return { patched: false };
  }

  // Quick test to see if rewrites for graphql-editor already exist
  if (
    content.includes("source: '/graphql-editor'") ||
    content.includes("/graphql-editor/index.html")
  ) {
    console.log("[skip] next.config.js already contains graphql-editor rewrites/redirects.");
    return { patched: false };
  }

  // Prepare injection text
  const injection = `  // Added by scripts/linkinator/track-broken-links.js to ensure /graphql-editor is served
  rewrites: async () => [
    // Map the root path to the static index.html in public/graphql-editor
    { source: '/graphql-editor', destination: '/graphql-editor/index.html' },
    // Preserve deep asset paths
    { source: '/graphql-editor/:path*', destination: '/graphql-editor/:path*' },
  ],\n`;

  // Find the start of the config object: `const config = {`
  const marker = "const config = {";
  const idx = content.indexOf(marker);
  if (idx === -1) {
    console.warn(
      "Could not locate `const config = {` in next.config.js — manual edit recommended."
    );
    return { patched: false };
  }

  // Insert injection right after the opening of the config object
  const insertPos = idx + marker.length;
  const patched = content.slice(0, insertPos) + "\n" + injection + content.slice(insertPos);

  // Backup and write
  const backupPath = path.join(BACKUP_DIR, "next.config.js.bak");
  safeWrite(backupPath, content);
  safeWrite(nextConfigPath, patched);
  console.log(
    `Inserted rewrites into next.config.js and backed up original to ${path.relative(ROOT, backupPath)}`
  );

  return { patched: true, backup: backupPath };
}

/**
 * 3) Run linkinator and capture JSON output
 */
function runLinkinator(url) {
  console.log(`Running linkinator against ${url} ...`);
  const outFile = path.join(OUT_DIR, "linkinator.json");

  // Build command - use pnpm dlx for project-local runner
  const cmd = `pnpm dlx linkinator ${url} --internal --allow-local --concurrency ${concurrency} --format json`;

  try {
    const out = execSync(cmd, { stdio: ["inherit", "pipe", "pipe"], maxBuffer: 1024 * 1024 * 20 });
    fs.writeFileSync(outFile, out);
    console.log(`Linkinator JSON saved to ${path.relative(ROOT, outFile)}`);
    return JSON.parse(out.toString());
  } catch (err) {
    // Attempt to capture partial stdout
    if (err.stdout) {
      try {
        fs.writeFileSync(outFile, err.stdout);
        console.log(`Partial linkinator output saved to ${path.relative(ROOT, outFile)}`);
        return JSON.parse(err.stdout.toString());
      } catch (e) {
        console.error("Failed to parse linkinator output:", e.message);
      }
    }
    console.error("Linkinator execution failed. See error below:");
    if (err.stderr) {
      console.error(err.stderr.toString());
    } else {
      console.error(err.message);
    }
    return null;
  }
}

function extractBroken(results) {
  if (!results || !results.results) return [];
  return results.results.filter(r => {
    // Linkinator result items include status as number/string or 'OK' etc.
    // Consider 200 OK successful; everything else we capture.
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
 * 4) Map broken URLs to source files
 */
function mapToSources(brokenList) {
  const mapping = {};
  const hasRg = (function () {
    try {
      const r = spawnSync("rg", ["--version"], { stdio: "ignore" });
      return r.status === 0;
    } catch (e) {
      return false;
    }
  })();

  const repoRoot = ROOT;

  for (const entry of brokenList) {
    const url = entry.url || entry.resource || entry.location || entry;
    mapping[url] = { status: entry.status, method: entry.method, sources: [] };

    // Try ripgrep first for speed
    if (hasRg) {
      try {
        // Use --hidden and --no-ignore to find references even in ignored folders if present
        const rgArgs = ["-n", "--hidden", "--no-ignore", "-S", url];
        const res = spawnSync("rg", rgArgs, {
          cwd: repoRoot,
          encoding: "utf8",
          maxBuffer: 1024 * 1024 * 10,
        });
        if (res.status === 0 && res.stdout) {
          mapping[url].sources = res.stdout.trim().split(/\r?\n/).slice(0, 500);
          continue;
        }
      } catch (e) {
        // fall through to fallback
      }
    }

    // Fallback: scan git-tracked files (fast enough for medium repos)
    try {
      const gitList = spawnSync("git", ["ls-files"], { cwd: repoRoot, encoding: "utf8" });
      if (gitList.status === 0 && gitList.stdout) {
        const files = gitList.stdout.trim().split(/\r?\n/).filter(Boolean);
        const matches = [];
        for (const f of files) {
          try {
            const content = fs.readFileSync(path.join(repoRoot, f), "utf8");
            if (content.includes(url)) {
              matches.push(`${f}: (contains)`);
              if (matches.length >= 500) break;
            } else {
              // Also check for path-only match for internal urls like /docs/foo
              const pathOnly = url.replace(/^https?:\/\/[^/]+/, "");
              if (pathOnly && content.includes(pathOnly)) {
                matches.push(`${f}: (contains path ${pathOnly})`);
                if (matches.length >= 500) break;
              }
            }
          } catch (e) {
            // ignore unreadable files
          }
        }
        mapping[url].sources = matches;
      }
    } catch (e) {
      mapping[url].sources = [];
    }
  }

  return mapping;
}

function writeOutputs(broken, mapping) {
  const brokenFile = path.join(OUT_DIR, "broken-links.json");
  const mappingFile = path.join(OUT_DIR, "broken-links-sources.json");
  safeWrite(brokenFile, JSON.stringify(broken, null, 2));
  safeWrite(mappingFile, JSON.stringify(mapping, null, 2));
  console.log(`Wrote ${broken.length} broken link entries to ${path.relative(ROOT, brokenFile)}`);
  console.log(`Wrote mapping to ${path.relative(ROOT, mappingFile)}`);
}

/**
 * Main flow
 */
(function main() {
  console.log("== linkinator helper started ==");

  // Apply safe edits (A & C from your request)
  try {
    const seoResult = patchSeoOpenGraph();
    if (seoResult.patched) {
      console.log("Applied SEO OpenGraph image patch.");
    }

    const nextResult = ensureNextConfigRewrites();
    if (nextResult.patched) {
      console.log("Injected rewrites into next.config.js.");
    }
  } catch (e) {
    console.error("Error while attempting safe fixes:", e && e.message ? e.message : e);
  }

  // Run linkinator
  const results = runLinkinator(targetUrl);
  if (!results) {
    console.error("No results produced by linkinator; aborting mapping step.");
    process.exitCode = 2;
    return;
  }

  const broken = extractBroken(results);
  console.log(`Found ${broken.length} broken entries (non-200/non-OK).`);

  const mapping = mapToSources(broken);
  writeOutputs(broken, mapping);

  console.log("== done ==");
})();
