#!/usr/bin/env node
/*
 Small utility to convert camelCase tokens and JSON pointer paths to snake_case using
 the generated `generated-schemas/field-name-mapping.json` when available, falling
 back to a naive camel->snake conversion.

 Usage:
  node scripts/camel-snake.mjs tokenOr/pointer
  node scripts/camel-snake.mjs --file scripts/schema-sync.config.json
*/
import fs from 'fs';
import path from 'path';
import { camelToSnake } from './helpers/case-conversion.mjs';

const arg = process.argv[2];
if (!arg) {
  console.error('Provide a token or --file <path>');
  process.exit(2);
}

const repo = path.resolve(new URL(import.meta.url).pathname, '..', '..');
const mappingPath = path.join(repo, 'generated-schemas', 'field-name-mapping.json');
let mapping = null;
if (fs.existsSync(mappingPath)) {
  try { mapping = JSON.parse(fs.readFileSync(mappingPath,'utf8')); } catch(e) { mapping = null; }
}

if (arg === '--file') {
  const fp = process.argv[3];
  if (!fp || !fs.existsSync(fp)) { console.error('missing file'); process.exit(2); }
  const txt = fs.readFileSync(fp,'utf8');
  const out = txt.replace(/"\/(?:[A-Za-z0-9_\.]+(?:\/[A-Za-z0-9_\.]+)*)"/g, m => {
    // basic JSON pointer string replacer: strip quotes
    const p = m.slice(1,-1);
    const parts = p.split('/').filter(Boolean).map(tok => {
      if (mapping && mapping[tok] && mapping[tok].snake) return mapping[tok].snake;
      return tok.includes('_') ? tok : camelToSnake(tok);
    });
    return '"/' + parts.join('/') + '"';
  });
  console.log(out);
  process.exit(0);
}

// Single token or pointer
if (arg.startsWith('/')) {
  const parts = arg.split('/').filter(Boolean).map(tok => {
    if (mapping && mapping[tok] && mapping[tok].snake) return mapping[tok].snake;
    return tok.includes('_') ? tok : camelToSnake(tok);
  });
  console.log('/' + parts.join('/'));
  process.exit(0);
}

const tok = arg;
if (mapping && mapping[tok] && mapping[tok].snake) console.log(mapping[tok].snake);
else console.log(camelToSnake(tok));
