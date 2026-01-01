#!/usr/bin/env node
/**
 * scripts/skip-report.js
 *
 * Scans a directory (or a single file) for JSON Schema files and reports occurrences
 * of `x-graphql-skip` with JSON Pointer locations and reasons.
 *
 * Usage:
 *   node scripts/skip-report.js --input <path> [--output <file>] [--ext <ext>]
 *
 * Examples:
 *   node scripts/skip-report.js --input schemas/ --output skip-report.json
 *   node scripts/skip-report.js --input schemas/user.json
 *
 * Output:
 *   JSON document containing `files`, `entries`, `warnings`, and `summary`.
 *
 * Notes:
 * - This script is conservative: it only attempts to parse files that look like JSON
 *   (by extension) unless you override with --ext.
 * - The script does not execute any dynamic parts of schemas; it only parses JSON.
 */

const fs = require('fs');
const path = require('path');

function usageAndExit(code = 1) {
  const msg = `
Usage: node scripts/skip-report.js --input <file|dir> [--output <file>] [--ext <ext>]

Options:
  --input   Path to a JSON Schema file or a directory containing schemas (required)
  --output  Optional path to write the JSON report (default: stdout)
  --ext     Optional extension filter (e.g. json, schema.json). If omitted, common JSON extensions are used.
  --help    Print this help
`;
  console.log(msg);
  process.exit(code);
}

// Basic arg parsing
const argv = process.argv.slice(2);
if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
  usageAndExit(0);
}

let inputPath = null;
let outputPath = null;
let ext = null;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if ((a === '--input' || a === '-i') && argv[i + 1]) {
    inputPath = argv[++i];
  } else if ((a === '--output' || a === '-o') && argv[i + 1]) {
    outputPath = argv[++i];
  } else if (a === '--ext' && argv[i + 1]) {
    ext = argv[++i].replace(/^\./, '').toLowerCase();
  } else {
    console.error('Unknown argument or missing value:', a);
    usageAndExit(1);
  }
}

if (!inputPath) {
  console.error('Missing required --input argument');
  usageAndExit(1);
}

function listFilesRecursive(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // skip node_modules, .git by default
      const base = entry.name.toLowerCase();
      if (base === 'node_modules' || base === '.git') continue;
      results.push(...listFilesRecursive(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

function isLikelyJsonSchemaFile(file) {
  if (ext) {
    return file.toLowerCase().endsWith('.' + ext);
  }
  const fn = path.basename(file).toLowerCase();
  // common JSON / JSONC / YAML schema file name patterns
  return fn.endsWith('.json') ||
         fn.endsWith('.jsonc') ||
         fn.endsWith('.schema.json') ||
         fn.endsWith('.jsonschema') ||
         fn.endsWith('.yaml') ||
         fn.endsWith('.yml');
}

function parseJsonc(content) {
  // Lightweight JSONC handling: remove // and /* */ comments and trailing commas,
  // then attempt JSON.parse. This handles many common tsconfig / JSONC cases.
  try {
    let s = String(content);
    // remove single-line comments
    s = s.replace(/\/\/[^\n\r]*/g, '');
    // remove block comments
    s = s.replace(/\/\*[\s\S]*?\*\//g, '');
    // remove trailing commas before } or ]
    s = s.replace(/,\s*(?=[}\]])/g, '');
    return JSON.parse(s);
  } catch (err) {
    // propagate original error
    throw err;
  }
}

function parseWithFallback(content) {
  // Try strict JSON, then JSONC, then YAML (if 'yaml' package is available).
  try {
    return { data: JSON.parse(content), parser: 'json', error: null };
  } catch (jsonErr) {
    // Try JSONC
    try {
      const data = parseJsonc(content);
      return { data, parser: 'jsonc', error: null };
    } catch (jsoncErr) {
      // Try YAML if the optional dependency is available.
      try {
        const yaml = require('yaml');
        try {
          const data = yaml.parse(content);
          return { data, parser: 'yaml', error: null };
        } catch (yamlErr) {
          return { data: null, parser: null, error: `yaml parse error: ${String(yamlErr)}` };
        }
      } catch (requireErr) {
        // 'yaml' package not installed — return combined errors and guidance.
        return {
          data: null,
          parser: null,
          error:
            `json parse error: ${String(jsonErr)}; jsonc parse error: ${String(jsoncErr)}; ` +
            `yaml parser not available (optional). To enable YAML parsing, install the 'yaml' package: ` +
            `'npm install yaml --save-dev'`,
        };
      }
    }
  }
}

function escapePointerPart(part) {
  // Per RFC 6901: '~' -> '~0', '/' -> '~1'
  return String(part).replace(/~/g, '~0').replace(/\//g, '~1');
}

function joinPointer(parts) {
  if (!parts || parts.length === 0) return '';
  return '/' + parts.map(escapePointerPart).join('/');
}

function detectScope(node, pointerParts) {
  // Heuristic: If node contains 'properties' or its type is 'object' treat as a type.
  if (node && typeof node === 'object') {
    if (Object.prototype.hasOwnProperty.call(node, 'properties') && typeof node.properties === 'object') {
      return 'type';
    }
    if (node.type === 'object' || node.type === 'array') return 'type';
  }
  // If the pointer is under /properties it is a field
  if (pointerParts.includes('properties')) return 'field';
  return 'unknown';
}

function snippetForNode(node, maxLen = 400) {
  try {
    const s = JSON.stringify(node);
    if (s.length <= maxLen) return JSON.parse(s);
    // Return truncated stringified snippet to avoid JSON parse errors
    return s.slice(0, maxLen) + '...';
  } catch (err) {
    return null;
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  scannedTarget: inputPath,
  files: [],
  entries: [],
  warnings: [],
  summary: null,
};

function traverse(node, file, pointerParts = []) {
  if (node && typeof node === 'object') {
    if (Object.prototype.hasOwnProperty.call(node, 'x-graphql-skip')) {
      const raw = node['x-graphql-skip'];
      const pointer = joinPointer(pointerParts);
      const scope = detectScope(node, pointerParts);
      const reason = typeof raw === 'string' ? raw : (typeof raw === 'boolean' ? (raw ? 'skipped' : null) : String(raw));
      const entry = {
        file,
        pointer,
        scope,
        value: raw,
        reason: reason || null,
        snippet: snippetForNode(node),
      };
      report.entries.push(entry);
    }

    // Recurse into children
    // For arrays: include indices in pointer
    for (const key of Object.keys(node)) {
      const child = node[key];
      if (Array.isArray(child)) {
        for (let i = 0; i < child.length; i++) {
          traverse(child[i], file, pointerParts.concat([key, i]));
        }
      } else if (child && typeof child === 'object') {
        traverse(child, file, pointerParts.concat([key]));
      }
    }
  }
}

function processFile(file) {
  const rfile = { file, parsed: false, parseError: null, entryCount: 0, parser: null };
  try {
    const content = fs.readFileSync(file, 'utf8');
    const { data, parser, error } = parseWithFallback(content);
    if (error) {
      rfile.parseError = error;
      report.warnings.push({ file, message: 'Failed to parse file: ' + error });
    } else {
      rfile.parsed = true;
      rfile.parser = parser || null;
      traverse(data, file, []);
      rfile.entryCount = report.entries.filter(e => e.file === file).length;
    }
  } catch (err) {
    rfile.parseError = String(err);
    report.warnings.push({ file, message: 'Failed to read file: ' + String(err) });
  }
  report.files.push(rfile);
}

function run() {
  const target = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(target)) {
    console.error('Input path does not exist:', inputPath);
    process.exit(2);
  }

  const s = fs.statSync(target);
  let files = [];
  if (s.isFile()) {
    files = [target];
  } else if (s.isDirectory()) {
    files = listFilesRecursive(target);
  } else {
    console.error('Input path is neither file nor directory:', inputPath);
    process.exit(2);
  }

  files = files.filter(isLikelyJsonSchemaFile);
  if (files.length === 0) {
    report.warnings.push({ message: 'No JSON-like files found under target (filtered by extension)' });
  }

  for (const f of files) {
    processFile(f);
  }

  report.summary = {
    filesScanned: report.files.length,
    entriesFound: report.entries.length,
    warnings: report.warnings.length,
  };

  const out = JSON.stringify(report, null, 2);
  if (outputPath) {
    try {
      fs.writeFileSync(outputPath, out, 'utf8');
      console.log('Skip report written to', outputPath);
    } catch (err) {
      console.error('Failed to write output file:', err);
      console.log(out);
    }
  } else {
    console.log(out);
  }
}

// Run main
try {
  run();
  process.exit(0);
} catch (err) {
  console.error('Unexpected error:', err);
  process.exit(3);
}
