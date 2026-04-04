#!/usr/bin/env node
/**
 * scripts/run-all-pnpm-scripts.js
 *
 * Find all package.json files in the repository, enumerate `scripts`, and run them sequentially.
 *
 * Default behavior:
 *  - Skip long-running scripts: start, dev, watch, serve (case-insensitive)
 *  - Per-script timeout: 60s (60000 ms)
 *  - Results written to: scripts/pnpm-run-results.json
 *
 * Usage:
 *  node scripts/run-all-pnpm-scripts.js [timeout_seconds] [include_long_running true|false]
 *
 * Examples:
 *  node scripts/run-all-pnpm-scripts.js            # use defaults (60s, don't include long-running)
 *  node scripts/run-all-pnpm-scripts.js 120 true  # 120s timeout, include long-running scripts
 *
 * Notes:
 *  - This script runs `pnpm run <script>` inside each package directory. It does not modify any package.json files.
 *  - Long-running scripts are skipped by default to avoid starting dev servers.
 *  - Each script's stdout/stderr are captured and truncated to 10000 chars in the output file.
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const repoRoot = process.cwd();
const RESULTS_DIR = path.join(repoRoot, "scripts");
const RESULTS_FILE = path.join(RESULTS_DIR, "pnpm-run-results.json");

const DEFAULT_TIMEOUT_MS = 60 * 1000;
const TRUNCATE_LEN = 10000;
const LONG_RUNNING_REGEX =
  /^(?:watch|serve)$|^(?:dev|start)(?:$|:)|:(?:dev|start)\b/i;

function parseCli() {
  const args = process.argv.slice(2);
  const timeoutSeconds = args[0] ? Number(args[0]) : null;
  const timeoutMs =
    Number.isFinite(timeoutSeconds) && timeoutSeconds > 0
      ? timeoutSeconds * 1000
      : DEFAULT_TIMEOUT_MS;
  const includeLongRunning = args[1]
    ? String(args[1]).toLowerCase() === "true"
    : false;
  return { timeoutMs, includeLongRunning };
}

function findPackageJsonFiles(startDir) {
  const results = [];

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      // Skip directories we can't read
      return;
    }

    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (
          e.name === "node_modules" ||
          e.name === ".git" ||
          e.name === "dist" ||
          e.name === "build"
        )
          continue;
        walk(full);
      } else if (e.isFile() && e.name === "package.json") {
        results.push(full);
      }
    }
  }

  walk(startDir);
  return results;
}

function truncate(s, n) {
  if (!s) return "";
  if (s.length <= n) return s;
  return s.slice(0, n) + `\n...truncated ${s.length - n} chars...`;
}

function runCommand(cmd, args, cwd, timeoutMs) {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let finished = false;

    // spawn without shell to avoid env interpolation; however on Windows pnpm may be a shell script shim.
    // Using `shell: true` is more compatible but may change semantics; prefer shell: false first.
    const child = spawn(cmd, args, { cwd, shell: false, env: process.env });

    const timer = setTimeout(() => {
      if (!finished) {
        timedOut = true;
        try {
          child.kill("SIGKILL");
        } catch (e) {
          try {
            child.kill();
          } catch (e2) {}
        }
      }
    }, timeoutMs);

    if (child.stdout) {
      child.stdout.on("data", (chunk) => {
        stdout += String(chunk);
      });
    }
    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderr += String(chunk);
      });
    }

    child.on("error", (err) => {
      clearTimeout(timer);
      finished = true;
      resolve({
        code: null,
        signal: null,
        error: String(err),
        stdout,
        stderr,
        timedOut,
      });
    });

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      finished = true;
      resolve({ code, signal, error: null, stdout, stderr, timedOut });
    });
  });
}

async function main() {
  const { timeoutMs, includeLongRunning } = parseCli();
  console.log(`Repository root: ${repoRoot}`);
  console.log(`Per-script timeout: ${timeoutMs} ms`);
  console.log(`Include long-running scripts: ${includeLongRunning}`);

  const pkgFiles = findPackageJsonFiles(repoRoot)
    .map((p) => path.relative(repoRoot, p))
    .sort()
    .map((p) => path.join(repoRoot, p));

  console.log(`Found ${pkgFiles.length} package.json files.`);

  const summary = {
    run_at: new Date().toISOString(),
    timeout_ms: timeoutMs,
    include_long_running: includeLongRunning,
    packages: [],
  };

  for (const pkgPath of pkgFiles) {
    let pkg;
    try {
      const raw = fs.readFileSync(pkgPath, "utf8");
      pkg = JSON.parse(raw);
    } catch (err) {
      console.warn(
        `Skipping invalid package.json at ${pkgPath}: ${err && err.message ? err.message : String(err)}`,
      );
      summary.packages.push({
        package: pkgPath,
        error: "invalid package.json",
        details: String(err),
      });
      continue;
    }

    const pkgDir = path.dirname(pkgPath);
    const scripts = pkg.scripts || {};
    const scriptNames = Object.keys(scripts).sort();

    const pkgEntry = {
      package: pkgPath,
      packageName: pkg.name || null,
      scripts: scriptNames,
      skipped: [],
      results: [],
    };

    if (scriptNames.length === 0) {
      summary.packages.push(pkgEntry);
      continue;
    }

    console.log(
      `\nPackage: ${path.relative(repoRoot, pkgDir)} (${pkg.name || "unnamed"}) - scripts: [${scriptNames.join(", ")}]`,
    );

    for (const name of scriptNames) {
      if (!includeLongRunning && LONG_RUNNING_REGEX.test(name)) {
        console.log(`- Skipping long-running script '${name}'`);
        pkgEntry.skipped.push(name);
        continue;
      }

      console.log(
        `- Running '${name}' (timeout ${timeoutMs} ms) in ${path.relative(repoRoot, pkgDir)}`,
      );
      // use pnpm run <name> --silent to reduce noise; nevertheless some scripts ignore --silent
      const cmd = "pnpm";
      const args = ["run", name, "--silent"];

      let res;
      try {
        res = await runCommand(cmd, args, pkgDir, timeoutMs);
      } catch (err) {
        res = {
          code: null,
          signal: null,
          error: String(err),
          stdout: "",
          stderr: "",
          timedOut: false,
        };
      }

      const record = {
        name,
        succeeded: res.code === 0 && !res.timedOut && res.error === null,
        code: res.code,
        signal: res.signal,
        timedOut: Boolean(res.timedOut),
        error: res.error,
        stdout: truncate(res.stdout, TRUNCATE_LEN),
        stderr: truncate(res.stderr, TRUNCATE_LEN),
      };

      pkgEntry.results.push(record);
      console.log(
        `  -> finished: name='${name}' code=${record.code} timedOut=${record.timedOut} succeeded=${record.succeeded}`,
      );
    }

    summary.packages.push(pkgEntry);
  }

  // Ensure scripts directory exists
  try {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }

  try {
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(summary, null, 2), "utf8");
    console.log(
      `\nResults written to: ${path.relative(repoRoot, RESULTS_FILE)}`,
    );
  } catch (err) {
    console.error(
      "Failed to write results file:",
      err && err.message ? err.message : String(err),
    );
    process.exitCode = 2;
    return;
  }

  // Print short summary to console
  let totalScripts = 0;
  let totalFailed = 0;
  let totalTimedOut = 0;
  for (const p of summary.packages) {
    totalScripts += (p.scripts || []).length;
    for (const r of p.results || []) {
      if (!r.succeeded) totalFailed += 1;
      if (r.timedOut) totalTimedOut += 1;
    }
  }

  console.log(
    `\nSummary: packages=${summary.packages.length} scripts_discovered=${totalScripts} failed_or_nonzero=${totalFailed} timed_out=${totalTimedOut}`,
  );
}

if (require.main === module) {
  main().catch((err) => {
    console.error(
      "Unexpected error:",
      err && err.stack ? err.stack : String(err),
    );
    process.exit(1);
  });
}
