#!/usr/bin/env node
import fs from "fs";
import { parseArgs } from "util";
import { normalizeFederationExtensions } from "@json-schema-x-graphql/core";

const { values, positionals } = parseArgs({
  options: {
    input: {
      type: "string",
      short: "i",
    },
    output: {
      type: "string",
      short: "o",
    },
    write: {
      type: "boolean",
      short: "w",
      default: false,
    },
    help: {
      type: "boolean",
      short: "h",
    },
  },
  allowPositionals: true,
});

if (values.help) {
  console.log(`
Usage: jxql-migrate [OPTIONS] [INPUT]

Migrates JSON Schemas using the deprecated nested \`x-graphql-federation\` object
to the flat \`x-graphql-federation-*\` format.

Options:
  -i, --input <INPUT>    Path to input JSON Schema file (can also be passed as positional argument)
  -o, --output <OUTPUT>  Path to output JSON Schema file (defaults to stdout)
  -w, --write            Overwrite the input file in-place
  -h, --help             Print help
`);
  process.exit(0);
}

const inputPath = values.input || positionals[0];

if (!inputPath) {
  console.error(
    "Error: Input file is required. Use --input <file> or pass it as an argument.",
  );
  process.exit(1);
}

try {
  const fileContent = fs.readFileSync(inputPath, "utf-8");
  const schema = JSON.parse(fileContent);

  const migratedSchema = normalizeFederationExtensions(schema);

  const outputContent = JSON.stringify(migratedSchema, null, 2) + "\n";

  if (values.write) {
    fs.writeFileSync(inputPath, outputContent, "utf-8");
    console.log(`Successfully migrated and wrote to ${inputPath} in-place.`);
  } else if (values.output) {
    fs.writeFileSync(values.output, outputContent, "utf-8");
    console.log(`Successfully migrated schema and saved to ${values.output}`);
  } else {
    process.stdout.write(outputContent);
  }
} catch (error: any) {
  console.error("Migration failed:", error.message);
  process.exit(1);
}
