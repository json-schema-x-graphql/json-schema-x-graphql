#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const converter_1 = require("./converter");
const { values, positionals } = (0, util_1.parseArgs)({
    options: {
        input: {
            type: 'string',
            short: 'i',
        },
        output: {
            type: 'string',
            short: 'o',
        },
        descriptions: {
            type: 'boolean',
            default: false,
        },
        'preserve-order': {
            type: 'boolean',
            default: false,
        },
        help: {
            type: 'boolean',
            short: 'h',
        },
        version: {
            type: 'boolean',
            short: 'v',
        },
    },
    allowPositionals: true,
});
if (values.help) {
    console.log(`
Usage: node-jxql [OPTIONS] --input <INPUT>

Options:
  -i, --input <INPUT>    Path to local JSON schema file
  -o, --output <OUTPUT>  Output file path (defaults to stdout)
      --descriptions     Include descriptions in output
      --preserve-order   Preserve field order
  -h, --help             Print help
  -v, --version          Print version
`);
    process.exit(0);
}
if (values.version) {
    const packageJson = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, '../package.json'), 'utf-8'));
    console.log(packageJson.version);
    process.exit(0);
}
const inputPath = values.input || positionals[0];
if (!inputPath) {
    console.error('Error: Input file is required. Use --input <file> or provide it as an argument.');
    process.exit(1);
}
try {
    const schemaContent = fs_1.default.readFileSync(inputPath, 'utf-8');
    const schema = JSON.parse(schemaContent);
    const sdl = (0, converter_1.jsonSchemaToGraphQL)(schema, {
        includeDescriptions: values.descriptions,
        preserveFieldOrder: values['preserve-order'],
        federationVersion: 'V2', // Defaulting to federation 2 for parity with Rust/Legacy
    });
    if (values.output) {
        fs_1.default.writeFileSync(values.output, sdl);
        console.log(`Successfully wrote GraphQL SDL to ${values.output}`);
    }
    else {
        console.log(sdl);
    }
}
catch (error) {
    console.error('Error converting schema:', error.message);
    process.exit(1);
}
//# sourceMappingURL=cli.js.map