import * as fs from 'fs/promises';
import { convertJsonToGraphql } from './json-to-graphql.js';
import { convertGraphqlToJson } from './graphql-to-json.js';
import { ConversionOptions, JsonSchema } from './types.js';

/**
 * Prints the command-line usage instructions.
 */
function printUsage() {
  console.log(`
Usage: node dist/cli.js <direction> <input-file> [output-file]

Directions:
  json2gql    Converts a JSON Schema file to GraphQL SDL.
  gql2json    Converts a GraphQL SDL file to JSON Schema.

Arguments:
  input-file   The path to the input file.
  output-file  (Optional) The path to the output file. If not provided,
               the result will be printed to standard output.

Example:
  node dist/cli.js json2gql ./schema.json > schema.graphql
`);
}

/**
 * Main CLI execution function.
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const [direction, inputFile, outputFile] = args;

  // Validate direction
  if (direction !== 'json2gql' && direction !== 'gql2json') {
    console.error(`Error: Invalid direction "${direction}". Must be 'json2gql' or 'gql2json'.`);
    printUsage();
    process.exit(1);
  }

  // Read input file
  let inputFileContent: string;
  try {
    inputFileContent = await fs.readFile(inputFile, 'utf-8');
  } catch (error) {
    console.error(`Error: Could not read input file "${inputFile}".`);
    console.error(error);
    process.exit(1);
  }

  let output: string | undefined;
  const options: ConversionOptions = {}; // Placeholder for future CLI options

  try {
    console.log(`Converting ${inputFile} from ${direction}...`);
    if (direction === 'json2gql') {
      const schemaObject: JsonSchema = JSON.parse(inputFileContent);
      output = await convertJsonToGraphql(schemaObject, options);
    } else {
      // gql2json
      const schemaObject = await convertGraphqlToJson(inputFileContent, options);
      output = JSON.stringify(schemaObject, null, 2);
    }
  } catch (error) {
    console.error('Error: Conversion failed.');
    console.error(error);
    process.exit(1);
  }

  // Output the result
  if (outputFile) {
    try {
      await fs.writeFile(outputFile, output, 'utf-8');
      console.log(`Successfully wrote output to ${outputFile}`);
    } catch (error) {
      console.error(`Error: Could not write to output file "${outputFile}".`);
      console.error(error);
      process.exit(1);
    }
  } else {
    // Print to stdout if no output file is specified
    console.log(output);
  }
}

// Run the main function and handle any top-level errors.
main().catch((err) => {
  console.error('An unexpected error occurred:', err);
  process.exit(1);
});
