#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const npmRegistry = "https://registry.npmjs.org/";
const allowedAdvisories = new Set(["GHSA-vfj7-8cjw-p6xm"]);
const workspaces = process.argv.slice(2);

if (workspaces.length === 0) {
  console.error("Usage: node scripts/audit-pnpm-workspaces.mjs <workspace> [...]");
  process.exit(2);
}

let failed = false;

for (const workspace of workspaces) {
  const result = spawnSync("pnpm", ["audit", "--prod", "--json", `--registry=${npmRegistry}`], {
    cwd: resolve(workspace),
    encoding: "utf8",
  });
  const output = result.stdout.trim();

  if (!output) {
    console.error(`${workspace}: pnpm audit returned no JSON output.`);
    failed = true;
    continue;
  }

  let report;
  try {
    report = JSON.parse(output);
  } catch {
    console.error(`${workspace}: pnpm audit returned invalid JSON.\n${output}`);
    failed = true;
    continue;
  }

  if (report.error) {
    console.error(`${workspace}: pnpm audit failed: ${report.error.message}`);
    failed = true;
    continue;
  }

  const advisories = Object.values(report.advisories ?? {});
  const advisoryId = (advisory) => advisory.github_advisory_id ?? advisory.url?.split("/").pop();
  const unapproved = advisories.filter((advisory) => !allowedAdvisories.has(advisoryId(advisory)));
  const allowed = advisories.filter((advisory) => allowedAdvisories.has(advisoryId(advisory)));

  for (const advisory of allowed) {
    console.warn(
      `${workspace}: temporarily allowing ${advisory.url} for ${advisory.module_name ?? advisory.module}; no patched npm release is published.`,
    );
  }

  for (const advisory of unapproved) {
    console.error(
      `${workspace}: ${advisory.severity} ${advisory.module_name ?? advisory.module}: ${advisory.title} (${advisory.url})`,
    );
  }

  if (unapproved.length > 0) {
    failed = true;
  } else {
    console.log(`${workspace}: no unapproved production advisories.`);
  }
}

process.exit(failed ? 1 : 0);