#!/usr/bin/env node
/**
 * Example script: Programmatic usage of validate-files API.
 *
 * Location: docs/examples/run-validate-schema.mjs
 *
 * Demonstrates how to:
 *  1. Import and call the validateFiles(...) function.
 *  2. Override the canonical schema path via --schema.
 *  3. Validate arbitrary JSON files passed as positional arguments.
 *  4. Print a concise validation summary and exit with non-zero on failure.
 *
 * Usage:
 *   node docs/examples/run-validate-schema.mjs
 *   node docs/examples/run-validate-schema.mjs /path/to/sample.json
 *   node docs/examples/run-validate-schema.mjs --schema src/data/schema_unification.schema.json sample-a.json sample-b.json
 *
 * Tips:
 *  - This script does not mutate or write any files.
 *  - Missing data files are reported but do not cause a hard failure unless they were explicitly passed.
 *  - Only files marked validateSchema: true are validated (all positional JSONs are treated that way).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateFiles } from '../../scripts/validate-schema.mjs';

// -- Helpers -----------------------------------------------------------------

function parseArgs(argv = process.argv.slice(2)) {
  const out = { schema: null, files: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--schema') {
      out.schema = argv[i + 1];
      i++;
    } else if (a.startsWith('--')) {
      // Ignore unknown flags for this example
    } else {
      out.files.push(a);
    }
  }
  return out;
}

function isJsonFile(p) {
  return /\.json$/i.test(p);
}

function resolvePathMaybe(p) {
  if (!p) return p;
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

// Simple color helpers (avoid external deps)
const colors = {
  red: s => `\x1b[31m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  green: s => `\x1b[32m${s}\x1b[0m`,
  cyan: s => `\x1b[36m${s}\x1b[0m`,
  dim: s => `\x1b[2m${s}\x1b[0m`,
};

// -- Main --------------------------------------------------------------------

async function main() {
  const { schema, files } = parseArgs();
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, '..', '..');

  const schemaFile = resolvePathMaybe(
    schema || path.join(repoRoot, 'src', 'data', 'schema_unification.schema.json')
  );

  if (!fs.existsSync(schemaFile)) {
    console.error(colors.red(`Schema file not found: ${schemaFile}`));
    process.exit(2);
  }

  // Build file descriptors: all positional args that look like JSON => validate
  const fileDescriptors =
    files.length === 0
      ? [
          {
            name: path.basename(schemaFile),
            path: schemaFile,
            validateSchema: true,
          },
        ]
      : files.map(f => {
          const full = resolvePathMaybe(f);
          return {
            name: path.basename(full),
            path: full,
            validateSchema: true,
          };
        });

  // Guard: Warn if any positional file is not .json
  for (const fd of fileDescriptors) {
    if (!isJsonFile(fd.path)) {
      console.warn(colors.yellow(`Skipping non-JSON file argument: ${fd.path}`));
      fd.validateSchema = false;
    }
  }

  let results;
  try {
    results = validateFiles({ schemaFile, files: fileDescriptors });
  } catch (e) {
    console.error(colors.red(`Validator initialization failed: ${e.message}`));
    process.exit(3);
  }

  // Output summary
  console.log(colors.cyan('Schema Validation Summary'));
  console.log(colors.dim('Schema:'), schemaFile);
  console.log('');

  let failures = 0;
  for (const fd of fileDescriptors) {
    const status = results.fileResults[fd.name];
    if (status === true) {
      console.log(colors.green(`✔ ${fd.name} valid`));
    } else if (status === false) {
      console.log(colors.red(`✖ ${fd.name} invalid`));
      failures++;
    } else if (status === 'missing') {
      console.log(colors.yellow(`⚠ ${fd.name} missing (not found on disk)`));
      failures++;
    } else if (status === 'skipped') {
      console.log(colors.dim(`⏭ ${fd.name} skipped`));
    } else {
      console.log(colors.dim(`? ${fd.name} status: ${String(status)}`));
    }
  }

  console.log('');
  console.log(
    `Total errors reported by validator: ${results.totalErrors} (critical failures: ${failures})`
  );

  if (results.totalErrors > 0 || failures > 0) {
    console.error(colors.red('Validation failed.'));
    process.exit(1);
  }

  console.log(colors.green('All validations passed.'));
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
