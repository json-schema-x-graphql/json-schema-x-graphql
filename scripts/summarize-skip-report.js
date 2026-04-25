#!/usr/bin/env node
/**
 * scripts/summarize-skip-report.js
 *
 * Read a skip-report JSON (produced by scripts/skip-report.js) and produce a
 * concise, human-readable summary. Optionally write the summary to a file or
 * emit JSON output for automation.
 *
 * Usage:
 *   node scripts/summarize-skip-report.js [--input <path>] [--output <path>] [--format text|json] [--top N]
 *
 * Defaults:
 *   --input  ./reports/skip-report.json
 *   --format text
 *
 * Output (text):
 *   - global summary (files scanned, entries found, warnings)
 *   - per-file counts sorted by descending entries
 *   - per-scope counts (field/type/unknown)
 *   - list of entries (file, pointer, scope, reason, short snippet) optionally limited by --top
 *
 * Exit codes:
 *   0 success
 *   1 invalid args or IO error
 *   2 parse error or missing expected fields
 *
 * Notes:
 *   This script is intentionally dependency-free and uses Node.js built-ins.
 */

const fs = require("fs");
const path = require("path");

function usage() {
  console.log(
    "Usage: node scripts/summarize-skip-report.js [--input <path>] [--output <path>] [--format text|json] [--top N]",
  );
  console.log("");
  console.log("Defaults: --input ./reports/skip-report.json --format text");
  process.exit(1);
}

function parseArgs(argv) {
  const args = {
    input: path.resolve(process.cwd(), "reports/skip-report.json"),
    output: null,
    format: "text",
    top: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if ((a === "--input" || a === "-i") && argv[i + 1]) {
      args.input = path.resolve(process.cwd(), argv[++i]);
    } else if ((a === "--output" || a === "-o") && argv[i + 1]) {
      args.output = path.resolve(process.cwd(), argv[++i]);
    } else if ((a === "--format" || a === "-f") && argv[i + 1]) {
      args.format = argv[++i];
    } else if (a === "--top" && argv[i + 1]) {
      args.top = parseInt(argv[++i], 10);
      if (Number.isNaN(args.top) || args.top <= 0) {
        console.error("Invalid --top value; must be a positive integer.");
        process.exit(1);
      }
    } else {
      console.error("Unknown argument:", a);
      usage();
    }
  }
  if (!["text", "json"].includes(args.format)) {
    console.error('--format must be "text" or "json".');
    process.exit(1);
  }
  return args;
}

function safeReadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return { data: JSON.parse(raw), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

function truncateString(s, max = 160) {
  if (s === null || s === undefined) return "";
  const str = typeof s === "string" ? s : typeof s === "object" ? JSON.stringify(s) : String(s);
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + "...";
}

function summarize(report, opts) {
  const summary = {};
  summary.generatedAt = report.generatedAt || null;
  summary.scannedTarget = report.scannedTarget || null;

  // Basic counts from report.summary if present
  if (report.summary && typeof report.summary === "object") {
    summary.filesScanned = report.summary.filesScanned ?? (report.files ? report.files.length : 0);
    summary.entriesFound =
      report.summary.entriesFound ?? (report.entries ? report.entries.length : 0);
    summary.warnings = report.summary.warnings ?? (report.warnings ? report.warnings.length : 0);
  } else {
    summary.filesScanned = report.files ? report.files.length : 0;
    summary.entriesFound = report.entries ? report.entries.length : 0;
    summary.warnings = report.warnings ? report.warnings.length : 0;
  }

  // Group entries by file and by scope
  const entries = Array.isArray(report.entries) ? report.entries.slice() : [];
  const byFile = {};
  const scopeCounts = {};
  for (const e of entries) {
    const file = e.file || "<unknown>";
    if (!byFile[file]) byFile[file] = [];
    byFile[file].push(e);

    const scope = e.scope || "unknown";
    scopeCounts[scope] = (scopeCounts[scope] || 0) + 1;
  }

  // Create file summary list sorted by descending entry count
  const files = Object.keys(byFile).map((f) => ({
    file: f,
    count: byFile[f].length,
    entries: byFile[f],
  }));
  files.sort((a, b) => b.count - a.count);

  summary.files = files;
  summary.scopeCounts = scopeCounts;

  // Top entries (global) sorted by file then pointer
  const sortedEntries = entries.slice().sort((a, b) => {
    if (a.file === b.file) return (a.pointer || "").localeCompare(b.pointer || "");
    return a.file.localeCompare(b.file);
  });
  summary.entries = opts.top ? sortedEntries.slice(0, opts.top) : sortedEntries;

  // Warnings and parse issues
  summary.warnings = report.warnings || [];

  return summary;
}

function formatText(summary) {
  const lines = [];
  lines.push("SKIP REPORT SUMMARY");
  lines.push("=".repeat(60));
  lines.push(`Generated at : ${summary.generatedAt || "n/a"}`);
  lines.push(`Scanned path : ${summary.scannedTarget || "n/a"}`);
  lines.push("");
  lines.push("GLOBAL COUNTS");
  lines.push("---------------");
  lines.push(`Files scanned : ${summary.filesScanned}`);
  lines.push(`Skip entries  : ${summary.entriesFound}`);
  lines.push(`Warnings      : ${summary.warnings.length}`);
  lines.push("");

  lines.push("BY SCOPE");
  lines.push("--------");
  const scopes = Object.entries(summary.scopeCounts || {}).sort((a, b) => b[1] - a[1]);
  if (scopes.length === 0) {
    lines.push("  (no scoped entries found)");
  } else {
    for (const [scope, count] of scopes) {
      lines.push(`  ${scope.padEnd(10)} : ${count}`);
    }
  }
  lines.push("");

  lines.push("FILES WITH SKIPPED ENTRIES (top by number of entries)");
  lines.push("--------------------------------------------------");
  if (!summary.files || summary.files.length === 0) {
    lines.push("  (no files with x-graphql-skip entries)");
  } else {
    const maxShow = 50;
    for (let i = 0; i < Math.min(summary.files.length, maxShow); i++) {
      const f = summary.files[i];
      lines.push(
        `  ${String(i + 1).padStart(2)}. ${f.file} — ${f.count} entry${f.count !== 1 ? "ies" : ""}`,
      );
    }
    if (summary.files.length > maxShow)
      lines.push(`  ... and ${summary.files.length - maxShow} more files`);
  }
  lines.push("");

  lines.push("SAMPLED SKIP ENTRIES");
  lines.push("---------------------");
  if (!summary.entries || summary.entries.length === 0) {
    lines.push("  (no entries to show)");
  } else {
    for (let i = 0; i < summary.entries.length; i++) {
      const e = summary.entries[i];
      lines.push(` ${String(i + 1).padStart(2)}. File   : ${e.file}`);
      lines.push(`     Pointer: ${e.pointer || "(root)"}`);
      lines.push(`     Scope  : ${e.scope || "unknown"}`);
      lines.push(`     Value  : ${JSON.stringify(e.value)}`);
      if (e.reason) lines.push(`     Reason : ${truncateString(e.reason, 120)}`);
      if (e.snippet)
        lines.push(
          `     Snip   : ${truncateString(typeof e.snippet === "string" ? e.snippet : JSON.stringify(e.snippet), 200)}`,
        );
      lines.push("");
    }
  }

  if (summary.warnings && summary.warnings.length > 0) {
    lines.push("");
    lines.push("WARNINGS (files that failed to parse or other issues)");
    lines.push("------------------------------------------------------");
    for (const w of summary.warnings) {
      const file = w.file || "(unknown)";
      const msg = w.message || (w.parseError ? w.parseError : JSON.stringify(w));
      lines.push(` - ${file}: ${truncateString(msg, 200)}`);
    }
  }

  return lines.join("\n");
}

function formatJson(summary) {
  // Return a structured JSON summary (already plain JS object)
  const out = {
    generatedAt: summary.generatedAt,
    scannedTarget: summary.scannedTarget,
    counts: {
      filesScanned: summary.filesScanned,
      entriesFound: summary.entriesFound,
      warnings: summary.warnings.length,
      byScope: summary.scopeCounts,
    },
    topFiles: summary.files.map((f) => ({ file: f.file, count: f.count })),
    entries: summary.entries.map((e) => ({
      file: e.file,
      pointer: e.pointer,
      scope: e.scope,
      value: e.value,
      reason: e.reason,
      snippet: e.snippet,
    })),
    warnings: summary.warnings,
  };
  return JSON.stringify(out, null, 2);
}

// Main
(function main() {
  const args = parseArgs(process.argv);
  const { input, output, format, top } = args;

  const { data: report, error } = safeReadJson(input);
  if (error) {
    console.error(`Failed to read or parse input file "${input}":`, error.message || String(error));
    process.exit(2);
  }

  if (!report || typeof report !== "object") {
    console.error("Invalid report structure (expected JSON object).");
    process.exit(2);
  }

  const summary = summarize(report, { top });

  let outStr;
  if (format === "json") {
    outStr = formatJson(summary);
  } else {
    outStr = formatText(summary);
  }

  if (output) {
    try {
      fs.writeFileSync(output, outStr + "\n", "utf8");
      console.log("Summary written to", output);
    } catch (err) {
      console.error("Failed to write output file:", err);
      console.log("--- Summary follows ---\n");
      console.log(outStr);
      process.exit(1);
    }
  } else {
    console.log(outStr);
  }

  process.exit(0);
})();
