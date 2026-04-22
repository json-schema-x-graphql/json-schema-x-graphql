#!/usr/bin/env node
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const repoRoot = path.resolve(new URL(import.meta.url).pathname, "..", "..");
const outputDir = path.join(repoRoot, "generated-schemas");

/**
 * Run the complete schema interop generation pipeline
 *
 * Orchestrates multiple generator scripts to produce schema artifacts:
 * 1. Field name mapping (camelCase <-> snake_case)
 * 2. Subgraphs from system-specific schemas (legacy_procurement, intake_process, contract_data, logistics_mgmt, public_spending)
 * 3. Supergraph from composed subgraphs
 * 4. JSON Schema from composed supergraph SDL
 * 5. GraphQL SDL from JSON Schema
 * 6. V2 JSON Schema from V2 GraphQL SDL (if target exists)
 *
 * All outputs are written to generated-schemas/ and copied to src/data/generated/
 * for website consumption.
 *
 * @param {object} options - Generation options
 * @param {string} [options.outputDir] - Output directory for generated files (defaults to generated-schemas/)
 * @param {boolean} [options.skipV2=false] - Skip V2 generation even if target SDL exists
 * @param {boolean} [options.verbose=true] - Enable verbose logging
 * @returns {Promise<string[]>} Array of paths to generated files
 * @throws {Error} If any generator script fails
 *
 * @example
 * // Run full pipeline with defaults
 * const outputs = await runInteropGeneration();
 * console.log('Generated:', outputs);
 *
 * @example
 * // Run with custom output directory
 * const outputs = await runInteropGeneration({
 *   outputDir: 'custom-output',
 *   verbose: true
 * });
 */
export async function runInteropGeneration(options = {}) {
  const targetOutputDir = options.outputDir || outputDir;
  const skipV2 = options.skipV2 || false;
  const verbose = options.verbose !== false;

  fs.mkdirSync(targetOutputDir, { recursive: true });

  const scriptsToRun = [
    {
      label: "Generate field name mapping",
      script: path.join(repoRoot, "scripts", "generate-field-mapping.mjs"),
      output: path.join(targetOutputDir, "field-name-mapping.json"),
    },
    {
      label: "Generate subgraphs from system schemas",
      script: path.join(repoRoot, "scripts", "generate-all-subgraphs.mjs"),
      output: null, // Multiple outputs
    },
    {
      label: "Generate supergraph from system schemas",
      script: path.join(repoRoot, "scripts", "generate-supergraph.mjs"),
      output: path.join(targetOutputDir, "schema_unification.supergraph.graphql"),
    },
    {
      label: "JSON Schema from GraphQL SDL",
      script: path.join(repoRoot, "scripts", "generate-graphql-json-schema.mjs"),
      output: path.join(targetOutputDir, "schema_unification.from-graphql.json"),
    },
    {
      label: "GraphQL SDL from JSON Schema",
      script: path.join(repoRoot, "scripts", "generate-graphql-from-json-schema.mjs"),
      output: path.join(targetOutputDir, "schema_unification.from-json.graphql"),
    },
    {
      label: "V2 JSON Schema from V2 GraphQL SDL",
      script: path.join(repoRoot, "scripts", "generate-graphql-json-schema-v2.mjs"),
      output: path.join(targetOutputDir, "schema_unification.v2.from-graphql.json"),
    },
  ];

  const generatedFiles = [];

  for (const { label, script, output } of scriptsToRun) {
    // If this step is the V2 generator, ensure the target SDL exists before running
    if (label.includes("V2")) {
      if (skipV2) {
        if (verbose) console.warn(`Skipping '${label}' (skipV2 option enabled)`);
        continue;
      }
      const targetSDL = path.join(repoRoot, "src", "data", "schema_unification.target.graphql");
      if (!fs.existsSync(targetSDL)) {
        if (verbose)
          console.warn(`Skipping '${label}' because target SDL not found at ${targetSDL}`);
        continue;
      }
    }

    if (verbose) console.log(`Running: ${label}...`);

    const result = spawnSync(process.execPath, [script], {
      cwd: repoRoot,
      stdio: verbose ? "inherit" : "pipe",
    });

    if (result.status !== 0) {
      throw new Error(`Failed to run generator: ${label}`);
    }

    if (output) {
      generatedFiles.push(output);
    }
  }

  // Format generated files with Prettier to ensure CI formatting checks pass.
  // Use npx to invoke prettier so this works in CI without requiring a global install.
  try {
    // Filter out null/undefined values from generatedFiles
    const filesToFormat = generatedFiles.filter((f) => f != null);
    if (filesToFormat.length > 0) {
      const prettierCmd = "npx";
      const prettierArgs = ["prettier", "--write", ...filesToFormat];
      if (verbose) console.log("Formatting generated files with Prettier:", prettierArgs.join(" "));
      const pf = spawnSync(prettierCmd, prettierArgs, { cwd: repoRoot, stdio: "inherit" });
      if (pf.error) {
        if (verbose) console.warn("Prettier formatting failed to start:", pf.error);
      } else if (pf.status !== 0) {
        if (verbose) console.warn("Prettier exited with non-zero status:", pf.status);
      } else {
        if (verbose) console.log("Prettier formatted generated files.");
      }
    }
  } catch (err) {
    if (verbose)
      console.warn(
        "Prettier formatting encountered an error:",
        err && err.message ? err.message : err,
      );
  }

  // Copy canonical example files for website consumption
  const examplesSrc = path.join(targetOutputDir, "examples");
  const examplesDest = path.join(repoRoot, "src", "data", "generated", "examples");
  fs.mkdirSync(examplesDest, { recursive: true });
  if (fs.existsSync(examplesSrc)) {
    for (const file of fs.readdirSync(examplesSrc)) {
      if (file.endsWith(".json")) {
        fs.copyFileSync(path.join(examplesSrc, file), path.join(examplesDest, file));
        if (verbose) console.log(`Copied example: ${file}`);
      }
    }
  }

  if (verbose) {
    console.log("\nGenerated:");
    for (const output of generatedFiles.filter((f) => f != null)) {
      console.log(` - ${path.relative(repoRoot, output)}`);
    }
  }

  return generatedFiles;
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runInteropGeneration()
    .then((files) => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error running interop generation:", error);
      process.exit(1);
    });
}
