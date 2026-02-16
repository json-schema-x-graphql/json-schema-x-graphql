#!/usr/bin/env node
/* ESM wrapper: import the validate-schema module and run it so
   callers can run `node scripts/validate-schema.js` (which is ESM
   because package.json contains "type": "module"). */
import { validateFiles } from "./validate-schema.mjs";

const results = validateFiles();
if (results.totalErrors > 0 && !results.mainFileValid) {
  console.error(`Validation failed: ${results.totalErrors} errors`);
  process.exit(1);
}
console.log("Validation completed.");
process.exit(0);
