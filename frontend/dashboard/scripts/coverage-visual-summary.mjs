#!/usr/bin/env node
/**
 * coverage-visual-summary.mjs
 *
 * Generates a visual coverage summary as SVG and HTML from native Jest outputs.
 * - Reads: coverage/coverage-summary.json (required), coverage/lcov.info (optional)
 * - Writes:
 *   - coverage/coverage-visual-summary.svg
 *   - coverage/coverage-visual-summary.html
 * - Prints a short console message with locations
 * - If GITHUB_STEP_SUMMARY is set, appends a Markdown block containing an inline SVG data URI
 *
 * Usage:
 *   node scripts/coverage-visual-summary.mjs
 *
 * Notes:
 * - No external dependencies. Works on Node 18+.
 * - Designed to run after `pnpm run test:coverage` which emits html, lcov, and json-summary.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COV_DIR = path.join(process.cwd(), 'coverage');
const SUMMARY_PATH = path.join(COV_DIR, 'coverage-summary.json');
const LCOV_PATH = path.join(COV_DIR, 'lcov.info');
const OUT_SVG = path.join(COV_DIR, 'coverage-visual-summary.svg');
const OUT_HTML = path.join(COV_DIR, 'coverage-visual-summary.html');
const MAX_FILES = Number(process.env.COVERAGE_VISUAL_MAX_FILES || 10);

function exists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function pctColor(p) {
  if (p >= 90) return '#2e7d32'; // green
  if (p >= 75) return '#f9a825'; // amber
  if (p >= 50) return '#fb8c00'; // orange
  return '#c62828'; // red
}

function textColorFor(bg) {
  // crude contrast heuristic
  // return white for darker backgrounds (green/red/orange), black for light backgrounds (none used)
  return '#ffffff';
}

function formatPct(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—';
  return `${n.toFixed(1)}%`;
}

function parseLCOV(lcovPath) {
  const map = new Map();
  if (!exists(lcovPath)) return map;
  const txt = fs.readFileSync(lcovPath, 'utf8');
  const records = txt.split(/end_of_record/);
  for (const recRaw of records) {
    const rec = recRaw.trim();
    if (!rec) continue;
    const lines = rec.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let file = null;
    const uncovered = [];
    for (const l of lines) {
      if (l.startsWith('SF:')) file = l.slice(3);
      else if (l.startsWith('DA:')) {
        // DA:<line>,<hits>[,<checksum>]
        const parts = l.slice(3).split(',');
        const ln = Number(parts[0]);
        const hits = Number(parts[1] || 0);
        if (hits === 0 && Number.isFinite(ln)) uncovered.push(ln);
      }
    }
    if (file) {
      const base = path.basename(file);
      if (!map.has(file)) map.set(file, []);
      if (!map.has(base)) map.set(base, []);
      const arrFull = map.get(file);
      const arrBase = map.get(base);
      arrFull.push(...uncovered);
      arrBase.push(...uncovered);
    }
  }
  // de-duplicate and sort
  for (const [k, arr] of map.entries()) {
    const uniqSorted = Array.from(new Set(arr)).sort((a, b) => a - b);
    map.set(k, uniqSorted);
  }
  return map;
}

function collectFilesFromSummary(summary) {
  const files = [];
  for (const [k, v] of Object.entries(summary)) {
    if (k === 'total') continue;
    const filePath = k;
    const stat = (v && v.statements && v.statements.pct) ?? null;
    const bran = (v && v.branches && v.branches.pct) ?? null;
    const func = (v && v.functions && v.functions.pct) ?? null;
    const line = (v && v.lines && v.lines.pct) ?? null;
    files.push({
      path: filePath,
      base: path.basename(filePath),
      statements: typeof stat === 'number' ? stat : null,
      branches: typeof bran === 'number' ? bran : null,
      functions: typeof func === 'number' ? func : null,
      lines: typeof line === 'number' ? line : null,
    });
  }
  return files;
}

function toDataUriSvg(svgText) {
  // Use UTF-8 encoded data URI to embed in Markdown/HTML
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgText)}`;
}

function buildTotals(summary) {
  const total = summary.total || {};
  const stm = (total.statements && total.statements.pct) ?? 0;
  const br = (total.branches && total.branches.pct) ?? 0;
  const fn = (total.functions && total.functions.pct) ?? 0;
  const ln = (total.lines && total.lines.pct) ?? 0;
  return { statements: stm, branches: br, functions: fn, lines: ln };
}

function svgRect({ x, y, w, h, fill, rx = 4, ry = 4, stroke = 'none', strokeWidth = 0 }) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" rx="${rx}" ry="${ry}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
}

function svgText({ x, y, text, fill = '#222', fontSize = 12, anchor = 'start', weight = '400' }) {
  return `<text x="${x}" y="${y}" fill="${fill}" font-size="${fontSize}" text-anchor="${anchor}" font-weight="${weight}" font-family="system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`;
}

function buildBar({ x, y, width, height, pct, label, valueLabel }) {
  const p = clamp(pct, 0, 100);
  const filled = Math.round((p / 100) * width);
  const color = pctColor(p);
  const textColor = textColorFor(color);
  const bg = '#e0e0e0';

  return [
    svgRect({ x, y, w: width, h: height, fill: bg, rx: 4, ry: 4 }),
    svgRect({ x, y, w: filled, h: height, fill: color, rx: 4, ry: 4 }),
    // Label left
    svgText({ x: x - 8, y: y + height - 4, text: label, fill: '#444', fontSize: 12, anchor: 'end', weight: '600' }),
    // Value right on the filled bar (or at the end if too small)
    svgText({
      x: x + Math.min(filled - 6, width - 6),
      y: y + height - 4,
      text: valueLabel,
      fill: filled > 36 ? textColor : '#222',
      fontSize: 12,
      anchor: 'end',
      weight: '600',
    }),
  ].join('');
}

function buildCoverageSVG({ totals, worstFiles, uncoveredMap }) {
  const width = 860;
  // Layout constants
  const padding = 16;
  const chartX = 160;
  const barW = 600;
  const barH = 16;
  const gap = 12;

  const headerH = 40;
  const totalsCount = 4;
  const totalsH = totalsCount * (barH + gap) + padding;
  const worstTitleH = 26;
  const worstRows = worstFiles.length;
  const worstH = worstRows * (barH + gap) + padding;

  const height = headerH + totalsH + worstTitleH + worstH + padding;

  let y = padding + 10;
  const parts = [];

  // Background
  parts.push(svgRect({ x: 0, y: 0, w: width, h: height, fill: '#fafafa', rx: 8, ry: 8, stroke: '#e0e0e0', strokeWidth: 1 }));

  // Title
  parts.push(svgText({ x: padding, y: y, text: 'Coverage Summary', fill: '#111', fontSize: 18, anchor: 'start', weight: '700' }));
  y += 10;
  const totalsLine = `Statements ${formatPct(totals.statements)}  •  Branches ${formatPct(totals.branches)}  •  Functions ${formatPct(totals.functions)}  •  Lines ${formatPct(totals.lines)}`;
  parts.push(svgText({ x: padding, y: y + 18, text: totalsLine, fill: '#666', fontSize: 12, anchor: 'start' }));

  // Totals bars
  y += headerH;
  parts.push(buildBar({ x: chartX, y, width: barW, height: barH, pct: totals.statements, label: 'Statements', valueLabel: formatPct(totals.statements) }));
  y += barH + gap;
  parts.push(buildBar({ x: chartX, y, width: barW, height: barH, pct: totals.branches, label: 'Branches', valueLabel: formatPct(totals.branches) }));
  y += barH + gap;
  parts.push(buildBar({ x: chartX, y, width: barW, height: barH, pct: totals.functions, label: 'Functions', valueLabel: formatPct(totals.functions) }));
  y += barH + gap;
  parts.push(buildBar({ x: chartX, y, width: barW, height: barH, pct: totals.lines, label: 'Lines', valueLabel: formatPct(totals.lines) }));
  y += barH + gap + padding;

  // Worst files title
  parts.push(svgText({ x: padding, y: y, text: `Lowest file coverage by lines (top ${worstFiles.length})`, fill: '#111', fontSize: 14, weight: '700' }));
  y += worstTitleH - 8;

  // Worst files bars
  for (const f of worstFiles) {
    const label = f.base.length > 28 ? `…${f.base.slice(-27)}` : f.base;
    const value = `${formatPct(f.lines)}  ${f.base}`;
    parts.push(buildBar({ x: chartX, y, width: barW, height: barH, pct: f.lines ?? 0, label, valueLabel: value }));
    // Under each bar, show a tiny hint of uncovered lines if available
    const uncovered = uncoveredMap.get(f.path) || uncoveredMap.get(f.base) || [];
    if (uncovered.length > 0) {
      const sample = uncovered.slice(0, 6).join(', ');
      parts.push(svgText({ x: chartX, y: y + barH + 12, text: `Uncovered: ${sample}${uncovered.length > 6 ? '…' : ''}`, fill: '#777', fontSize: 10 }));
      y += (barH + gap) + 12;
    } else {
      y += barH + gap;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" role="img" aria-label="Coverage Summary">
${parts.join('\n')}
</svg>`;
}

function buildHTML(svgText, totals, worstFiles) {
  const style = `
    :root {
      color-scheme: light dark;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 20px;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;
      background: #f6f8fa;
      color: #111;
    }
    .container {
      max-width: 980px;
      margin: 0 auto;
    }
    .card {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
      overflow: hidden;
    }
    header {
      padding: 16px 16px 0 16px;
    }
    h1 {
      font-size: 18px;
      margin: 0 0 8px 0;
    }
    .meta {
      color: #5f6368;
      font-size: 12px;
      margin-bottom: 12px;
    }
    .body {
      padding: 0 16px 16px 16px;
    }
    .grid {
      display: grid;
      gap: 12px;
      grid-template-columns: 1fr 1fr;
    }
    .table {
      border-collapse: collapse;
      width: 100%;
      font-size: 12px;
      background: #fff;
    }
    .table th, .table td {
      padding: 8px 10px;
      border-bottom: 1px solid #eee;
      text-align: left;
    }
    .table th {
      background: #fafafa;
      font-weight: 600;
    }
    .muted { color: #777; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    .svg-wrap {
      width: 100%;
      overflow: hidden;
      border: 1px solid #eee;
      border-radius: 8px;
      background: #fafafa;
    }
  `.trim();

  const tableRows = worstFiles.map((f) => {
    const lines = typeof f.lines === 'number' ? f.lines.toFixed(1) : '—';
    const stm = typeof f.statements === 'number' ? f.statements.toFixed(1) : '—';
    const fn = typeof f.functions === 'number' ? f.functions.toFixed(1) : '—';
    const br = typeof f.branches === 'number' ? f.branches.toFixed(1) : '—';
    return `<tr><td class="mono">${f.base}</td><td>${lines}%</td><td>${stm}%</td><td>${fn}%</td><td>${br}%</td></tr>`;
  }).join('\n');

  const totalLegend = `Statements ${formatPct(totals.statements)} • Branches ${formatPct(totals.branches)} • Functions ${formatPct(totals.functions)} • Lines ${formatPct(totals.lines)}`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Coverage Visual Summary</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>${style}</style>
  </head>
  <body>
    <div class="container">
      <div class="card">
        <header>
          <h1>Coverage Visual Summary</h1>
          <div class="meta">${totalLegend}</div>
        </header>
        <div class="body">
          <div class="grid">
            <div class="svg-wrap">
              ${svgText}
            </div>
            <div>
              <table class="table">
                <thead>
                  <tr>
                    <th>File</th><th>Lines</th><th>Stmts</th><th>Funcs</th><th>Branch</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>
              <p class="muted">Showing ${worstFiles.length} lowest-covered files by lines.</p>
            </div>
          </div>
        </div>
      </div>
      <p class="muted" style="margin-top:12px">Generated by scripts/coverage-visual-summary.mjs</p>
    </div>
  </body>
</html>`;
}

function ensureDir(p) {
  try {
    fs.mkdirSync(p, { recursive: true });
  } catch {}
}

function pickWorstFiles(files, n = 10) {
  const withLines = files.filter(f => typeof f.lines === 'number');
  withLines.sort((a, b) => (a.lines - b.lines) || a.base.localeCompare(b.base));
  return withLines.slice(0, n);
}

async function main() {
  if (!exists(SUMMARY_PATH)) {
    console.log(`[coverage-visual] coverage-summary.json not found at ${SUMMARY_PATH}. Nothing to do.`);
    process.exit(0);
  }

  const summary = readJSON(SUMMARY_PATH);
  const totals = buildTotals(summary);
  const files = collectFilesFromSummary(summary);
  const uncoveredMap = parseLCOV(LCOV_PATH);
  const worstFiles = pickWorstFiles(files, MAX_FILES);

  // Build SVG and HTML
  const svg = buildCoverageSVG({ totals, worstFiles, uncoveredMap });
  const html = buildHTML(svg, totals, worstFiles);

  ensureDir(COV_DIR);
  fs.writeFileSync(OUT_SVG, svg, 'utf8');
  fs.writeFileSync(OUT_HTML, html, 'utf8');

  // Append to GitHub job summary if present
  const ghSummary = process.env.GITHUB_STEP_SUMMARY;
  if (ghSummary) {
    const dataUri = toDataUriSvg(svg);
    const md = [
      '### Coverage visual summary',
      '',
      `<img alt="Coverage Visual" src="${dataUri}" />`,
      '',
      `Totals: Statements ${formatPct(totals.statements)} • Branches ${formatPct(totals.branches)} • Functions ${formatPct(totals.functions)} • Lines ${formatPct(totals.lines)}`,
      '',
      `_Artifacts written to:_`,
      `- ${path.relative(process.cwd(), OUT_HTML)}`,
      `- ${path.relative(process.cwd(), OUT_SVG)}`,
      '',
    ].join('\n');

    try {
      fs.appendFileSync(ghSummary, `${md}\n`, 'utf8');
    } catch (e) {
      console.error('[coverage-visual] Failed to write to GITHUB_STEP_SUMMARY:', e?.message || e);
    }
  }

  console.log('[coverage-visual] Wrote:');
  console.log(' -', path.relative(process.cwd(), OUT_SVG));
  console.log(' -', path.relative(process.cwd(), OUT_HTML));
  console.log(
    '[coverage-visual] Totals:',
    `Statements=${formatPct(totals.statements)},`,
    `Branches=${formatPct(totals.branches)},`,
    `Functions=${formatPct(totals.functions)},`,
    `Lines=${formatPct(totals.lines)}`
  );
}

main().catch((err) => {
  console.error('[coverage-visual] Error:', err?.stack || err?.message || err);
  process.exit(1);
});
