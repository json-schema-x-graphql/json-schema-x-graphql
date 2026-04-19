#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { parseArgs } from "util";
import { jsonSchemaToGraphQL } from "./converter.js";
import {
  FederationVersion,
  NamingConvention,
  IdInferenceStrategy,
  OutputFormat,
  ConverterOptions,
} from "./generated/types.js";

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
    descriptions: {
      type: "boolean",
    },
    "preserve-order": {
      type: "boolean",
    },
    "include-federation-directives": {
      type: "boolean",
      default: true,
    },
    "include-schema-link": {
      type: "boolean",
      default: false,
    },
    "federation-version": {
      type: "string",
    },
    "naming-convention": {
      type: "string",
    },
    "infer-ids": {
      type: "boolean",
      default: false,
    },
    "id-strategy": {
      type: "string",
    },
    "output-format": {
      type: "string",
    },
    "fail-on-warning": {
      type: "boolean",
      default: false,
    },
    "exclude-type": {
      type: "string",
      multiple: true,
    },
    "exclude-pattern": {
      type: "string",
      multiple: true,
    },
    help: {
      type: "boolean",
      short: "h",
    },
    version: {
      type: "boolean",
      short: "v",
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
      --include-schema-link  Prepend @link directive for Federation v2 (default: false)
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
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../package.json"), "utf-8"),
  );
  console.log(packageJson.version);
  process.exit(0);
}

const inputPath = values.input || positionals[0];

if (!inputPath) {
  console.error(
    "Error: Input file is required. Use --input <file> or provide it as an argument.",
  );
  process.exit(1);
}

try {
  const schemaContent = fs.readFileSync(inputPath, "utf-8");
  const schema = JSON.parse(schemaContent);
  const toEnum = <T extends string>(
    value: string | undefined,
    fallback: T,
  ): T => {
    return (value ? value.toUpperCase() : fallback) as T;
  };

  if (values["infer-ids"]) {
    console.warn("Warning: --infer-ids is deprecated. Use --id-strategy=COMMON_PATTERNS instead.");
  }

  const converterOptions: ConverterOptions = {
    includeDescriptions: values.descriptions,
    preserveFieldOrder: values["preserve-order"],
    includeFederationDirectives: values["include-federation-directives"],
    federationVersion: toEnum<FederationVersion>(
      values["federation-version"],
      "V2",
    ),
    namingConvention: values["naming-convention"]
      ? toEnum<NamingConvention>(
          values["naming-convention"],
          "GRAPHQL_IDIOMATIC",
        )
      : undefined,
    inferIds: values["infer-ids"],
    idStrategy: values["id-strategy"]
      ? toEnum<IdInferenceStrategy>(values["id-strategy"], "NONE")
      : undefined,
    outputFormat: values["output-format"]
      ? toEnum<OutputFormat>(values["output-format"], "SDL")
      : undefined,
    failOnWarning: values["fail-on-warning"],
    excludeTypes: values["exclude-type"],
    excludePatterns: values["exclude-pattern"],
  };

  let sdl = jsonSchemaToGraphQL(schema, converterOptions);

  // Add Federation schema link if requested
  if (
    values["include-schema-link"] &&
    converterOptions.includeFederationDirectives
  ) {
    const schemaLink = `extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key", "@shareable", "@external", "@provides", "@requires", "@extends"])

`;
    sdl = schemaLink + sdl;
  }

  if (values.output) {
    fs.writeFileSync(values.output, sdl);
    console.log(`Successfully wrote GraphQL SDL to ${values.output}`);
  } else {
    console.log(sdl);
  }
} catch (error: any) {
  console.error("Error converting schema:", error.message);
  process.exit(1);
}
