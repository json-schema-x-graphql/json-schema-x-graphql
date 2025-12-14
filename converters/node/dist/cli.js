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
        },
        'preserve-order': {
            type: 'boolean',
        },
        'include-federation-directives': {
            type: 'boolean',
            default: true,
        },
        'federation-version': {
            type: 'string',
        },
        'naming-convention': {
            type: 'string',
        },
        'infer-ids': {
            type: 'boolean',
            default: false,
        },
        'id-strategy': {
            type: 'string',
        },
        'output-format': {
            type: 'string',
        },
        'fail-on-warning': {
            type: 'boolean',
            default: false,
        },
        'exclude-type': {
            type: 'string',
            multiple: true,
        },
        'exclude-pattern': {
            type: 'string',
            multiple: true,
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
      --include-federation-directives  Emit federation directives (default: true)
      --federation-version <NONE|V1|V2|AUTO>  Target federation version (default: V2)
      --naming-convention <PRESERVE|GRAPHQL_IDIOMATIC>  Naming strategy
      --infer-ids        Infer ID scalars for common patterns (deprecated in favor of --id-strategy)
      --id-strategy <NONE|COMMON_PATTERNS|ALL_STRINGS>  ID inference strategy
      --output-format <SDL|SDL_WITH_FEDERATION_METADATA|AST_JSON>  Output format
      --fail-on-warning  Treat warnings as errors
      --exclude-type <NAME>          Exclude a type (repeatable)
      --exclude-pattern <REGEX>      Exclude types/fields matching pattern (repeatable)
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
    const toEnum = (value, fallback) => {
        return (value ? value.toUpperCase() : fallback);
    };
    const converterOptions = {
        includeDescriptions: values.descriptions,
        preserveFieldOrder: values['preserve-order'],
        includeFederationDirectives: values['include-federation-directives'],
        federationVersion: toEnum(values['federation-version'], 'V2'),
        namingConvention: values['naming-convention']
            ? toEnum(values['naming-convention'], 'GRAPHQL_IDIOMATIC')
            : undefined,
        inferIds: values['infer-ids'],
        idStrategy: values['id-strategy']
            ? toEnum(values['id-strategy'], 'NONE')
            : undefined,
        outputFormat: values['output-format']
            ? toEnum(values['output-format'], 'SDL')
            : undefined,
        failOnWarning: values['fail-on-warning'],
        excludeTypes: values['exclude-type'],
        excludePatterns: values['exclude-pattern'],
    };
    const sdl = (0, converter_1.jsonSchemaToGraphQL)(schema, converterOptions);
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