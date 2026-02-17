const fs = require("fs");
const path = require("path");

const p = path.join("coverage", "coverage-summary.json");
if (!fs.existsSync(p)) {
  process.exit(0);
}

const summary = JSON.parse(fs.readFileSync(p, "utf8"));

// Parse lcov.info if present to collect uncovered line numbers per file
const lcovPath = path.join("coverage", "lcov.info");
const uncoveredMap = new Map();
if (fs.existsSync(lcovPath)) {
  const txt = fs.readFileSync(lcovPath, "utf8");
  const records = txt.split(/end_of_record/g);
  for (const rec of records) {
    const lines = rec
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    let file = null;
    const uncovered = [];
    for (const l of lines) {
      if (l.startsWith("SF:")) file = l.slice(3);
      else if (l.startsWith("DA:")) {
        const parts = l.slice(3).split(",");
        const ln = parts[0];
        const hits = Number(parts[1] || 0);
        if (hits === 0) uncovered.push(ln);
      }
    }
    if (file && uncovered.length > 0) {
      uncoveredMap.set(path.basename(file), uncovered);
      uncoveredMap.set(file, uncovered);
    }
  }
}

const rows = [];
for (const key of Object.keys(summary)) {
  const item = summary[key];
  const fullPath = key === "total" ? null : key;
  const name = key === "total" ? "All files" : path.basename(key);
  const stm =
    item.statements && item.statements.pct !== undefined
      ? item.statements.pct
      : "";
  const br =
    item.branches && item.branches.pct !== undefined ? item.branches.pct : "";
  const fn =
    item.functions && item.functions.pct !== undefined
      ? item.functions.pct
      : "";
  const ln = item.lines && item.lines.pct !== undefined ? item.lines.pct : "";
  let uncovered = "";
  if (fullPath && uncoveredMap.has(fullPath))
    uncovered = uncoveredMap.get(fullPath).join(",");
  else if (uncoveredMap.has(name)) uncovered = uncoveredMap.get(name).join(",");
  rows.push({ name, stm, br, fn, ln, uncovered });
}

console.log(
  "| File | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s |",
);
console.log("| --- | ---: | ---: | ---: | ---: | --- |");
for (const r of rows) {
  console.log(
    `| ${r.name} | ${r.stm} | ${r.br} | ${r.fn} | ${r.ln} | ${r.uncovered} |`,
  );
}
