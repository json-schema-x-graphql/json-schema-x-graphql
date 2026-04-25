#!/usr/bin/env node

/**
 * Test Both Converters Script
 *
 * Runs both Node and Rust converters on the same input and compares outputs.
 * This helps identify discrepancies between implementations.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "fs";
import { join, dirname, isAbsolute } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = join(__dirname, "..");
const outputDir = join(projectRoot, "output", "comparison");

const convertersManifestPath = join(projectRoot, "converters", "manifest.json");
let convertersManifest = null;

if (existsSync(convertersManifestPath)) {
  try {
    convertersManifest = JSON.parse(readFileSync(convertersManifestPath, "utf-8"));
  } catch (error) {
    console.warn(
      `Warning: Failed to parse converters manifest at ${convertersManifestPath}: ${error.message}`,
    );
  }
}

// Colors for output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log("\n" + "=".repeat(70));
  log(title, "cyan");
  console.log("=".repeat(70) + "\n");
}

function stripLeadingDotSlash(value = "") {
  if (value.startsWith("./") || value.startsWith(".\\")) {
    return value.slice(2);
  }
  return value;
}

function getConverterConfig(name) {
  return convertersManifest?.converters?.find((converter) => converter.name === name);
}

function resolveConverterRoot(name, fallback = name) {
  const relativePath = stripLeadingDotSlash(getConverterConfig(name)?.path ?? fallback);
  return join(projectRoot, "converters", relativePath);
}

function resolveEntryPath(entry) {
  return join(projectRoot, "converters", stripLeadingDotSlash(entry));
}

function getNodeModulePath() {
  const config = getConverterConfig("node");
  if (config?.entryPoints?.build) {
    return resolveEntryPath(config.entryPoints.build);
  }
  return join(resolveConverterRoot("node", "node"), "dist", "converter.js");
}

const nodeModulePath = getNodeModulePath();
const rustConverterRoot = resolveConverterRoot("rust", "rust");
let rustBinaryPath = join(rustConverterRoot, "target", "release", "jxql");
const workspaceBinaryPath = join(projectRoot, "target", "release", "jxql");

if (existsSync(workspaceBinaryPath)) {
  rustBinaryPath = workspaceBinaryPath;
}

const STANDARD_OPTIONS = {
  includeDescriptions: true,
  preserveFieldOrder: true,
  includeFederationDirectives: true,
  federationVersion: "V2",
  namingConvention: "GRAPHQL_IDIOMATIC",
  idStrategy: "COMMON_PATTERNS",
  outputFormat: "SDL",
  failOnWarning: false,
};

function loadOptionOverrides() {
  const { JXQL_OPTIONS_JSON, JXQL_OPTIONS_PATH } = process.env;
  if (JXQL_OPTIONS_PATH) {
    try {
      const raw = readFileSync(JXQL_OPTIONS_PATH, "utf-8");
      return JSON.parse(raw);
    } catch (error) {
      log(`⚠️  Failed to read options file at ${JXQL_OPTIONS_PATH}: ${error.message}`, "yellow");
    }
  }
  if (JXQL_OPTIONS_JSON) {
    try {
      return JSON.parse(JXQL_OPTIONS_JSON);
    } catch (error) {
      log(`⚠️  Failed to parse JXQL_OPTIONS_JSON: ${error.message}`, "yellow");
    }
  }
  return {};
}

const OPTION_OVERRIDES = loadOptionOverrides();
const EFFECTIVE_OPTIONS = { ...STANDARD_OPTIONS, ...OPTION_OVERRIDES };

function buildRustArgs(options, inputFile, outputFile) {
  const args = ["--input", inputFile, "--output", outputFile];
  // The current Rust CLI supports a minimal flag set; advanced options are not yet exposed.
  args.push("--descriptions");
  args.push("--preserve-order");
  // Legacy infer-ids fallback when idStrategy is set and not NONE.
  if (options.idStrategy && options.idStrategy !== "NONE") {
    args.push("--infer-ids");
  }
  return args;
}

async function testNodeConverter(inputFile, outputFile) {
  log("🟢 Testing Node Converter...", "green");

  try {
    if (!existsSync(nodeModulePath)) {
      log(
        `⚠️  Node converter build not found at ${nodeModulePath}. Run "npm run converters:node:build" first.`,
        "yellow",
      );
      return {
        success: false,
        error: `Missing Node build at ${nodeModulePath}`,
      };
    }
    // Import Node converter
    const converterModule = await import(pathToFileURL(nodeModulePath).href);
    const { jsonSchemaToGraphQL } = converterModule;

    // Read input
    const jsonSchemaContent = readFileSync(inputFile, "utf-8");

    // Convert
    const startTime = Date.now();
    const result = jsonSchemaToGraphQL(jsonSchemaContent, {
      ...EFFECTIVE_OPTIONS,
      // Preserve backward compatibility: allow validate flag to be omitted.
      validate: false,
    });
    const duration = Date.now() - startTime;

    // Write output
    writeFileSync(outputFile, result, "utf-8");

    log(`✅ Success (${duration}ms)`, "green");
    log(`   Output: ${outputFile}`, "reset");
    log(`   Size: ${result.length} bytes`, "reset");

    return { success: true, sdl: result, duration };
  } catch (error) {
    log(`❌ Error: ${error.message}`, "red");
    if (error.stack) {
      console.error(error.stack);
    }
    return { success: false, error: error.message };
  }
}

async function testRustConverter(inputFile, outputFile) {
  log("🦀 Testing Rust Converter...", "magenta");

  try {
    const rustDir = rustConverterRoot;
    const startTime = Date.now();

    if (existsSync(rustBinaryPath)) {
      const args = buildRustArgs(EFFECTIVE_OPTIONS, inputFile, outputFile);
      const cmd = [rustBinaryPath, ...args].join(" ");
      execSync(cmd, { encoding: "utf-8", stdio: "inherit" });

      const duration = Date.now() - startTime;
      const result = readFileSync(outputFile, "utf-8");

      log(`✅ Success (${duration}ms)`, "green");
      log(`   Output: ${outputFile}`, "reset");
      log(`   Size: ${result.length} bytes`, "reset");

      return { success: true, sdl: result, duration };
    }

    // Fallback: use cargo run --bin jxql
    const argsFallback = buildRustArgs(EFFECTIVE_OPTIONS, inputFile, outputFile);
    const cmdFallback = `cd "${rustDir}" && cargo run -q --bin jxql --features="cli" -- ${argsFallback.join(" ")}`;
    execSync(cmdFallback, { encoding: "utf-8", stdio: "inherit" });

    const duration = Date.now() - startTime;
    const result = readFileSync(outputFile, "utf-8");

    log(`✅ Success (${duration}ms)`, "green");
    log(`   Output: ${outputFile}`, "reset");
    log(`   Size: ${result.length} bytes`, "reset");

    return { success: true, sdl: result, duration };
  } catch (error) {
    log(`❌ Error: ${error.message}`, "red");
    if (error.stdout) {
      console.error("STDOUT:", error.stdout.toString());
    }
    if (error.stderr) {
      console.error("STDERR:", error.stderr.toString());
    }
    return { success: false, error: error.message };
  }
}

function compareOutputs(nodeResult, rustResult) {
  logSection("📊 Comparison Results");

  if (!nodeResult.success || !rustResult.success) {
    log("⚠️  Cannot compare - one or both conversions failed", "yellow");
    return;
  }

  const nodeSdl = nodeResult.sdl;
  const rustSdl = rustResult.sdl;

  if (EFFECTIVE_OPTIONS.outputFormat === "AST_JSON") {
    try {
      const nodeJson = JSON.parse(nodeSdl || "null");
      const rustJson = JSON.parse(rustSdl || "null");
      const nodeStr = JSON.stringify(nodeJson, null, 2);
      const rustStr = JSON.stringify(rustJson, null, 2);
      if (nodeStr === rustStr) {
        log("✅ Perfect Match! Both converters produce identical AST JSON", "green");
      } else {
        log("⚠️  Differences detected between converters (AST JSON)", "yellow");
        console.log("\n--- Node Output (JSON) ---\n" + nodeStr.slice(0, 500));
        console.log("\n--- Rust Output (JSON) ---\n" + rustStr.slice(0, 500));
      }
      return;
    } catch (error) {
      log(`❌ Failed to parse AST JSON: ${error.message}`, "red");
      return;
    }
  }

  // Normalize SDL for comparison
  const normalizeSDL = (sdl) => {
    return sdl
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .join("\n");
  };

  const nodeNormalized = normalizeSDL(nodeSdl);
  const rustNormalized = normalizeSDL(rustSdl);

  if (nodeNormalized === rustNormalized) {
    log("✅ Perfect Match! Both converters produce identical SDL", "green");
  } else {
    log("⚠️  Differences detected between converters", "yellow");
    console.log("\n--- Node Output ---");
    console.log(nodeSdl.substring(0, 500) + (nodeSdl.length > 500 ? "..." : ""));
    console.log("\n--- Rust Output ---");
    console.log(rustSdl.substring(0, 500) + (rustSdl.length > 500 ? "..." : ""));

    // Find specific differences
    const nodeLines = nodeSdl.split("\n");
    const rustLines = rustSdl.split("\n");

    console.log("\n--- Line-by-Line Differences ---");
    const maxLines = Math.max(nodeLines.length, rustLines.length);
    let diffCount = 0;

    for (let i = 0; i < maxLines && diffCount < 20; i++) {
      const nodeLine = (nodeLines[i] || "").trim();
      const rustLine = (rustLines[i] || "").trim();

      if (nodeLine !== rustLine) {
        diffCount++;
        console.log(`\nLine ${i + 1}:`);
        log(`  Node: ${nodeLine}`, "green");
        log(`  Rust: ${rustLine}`, "magenta");
      }
    }

    if (diffCount === 0) {
      log("\n✅ Only whitespace/comment differences", "green");
    }
  }

  console.log("\n--- Statistics ---");
  console.log(`Node lines: ${nodeSdl.split("\n").length}`);
  console.log(`Rust lines: ${rustSdl.split("\n").length}`);
  console.log(`Node size: ${nodeSdl.length} bytes`);
  console.log(`Rust size: ${rustSdl.length} bytes`);
  console.log(`Node time: ${nodeResult.duration}ms`);
  console.log(`Rust time: ${rustResult.duration}ms`);
}

async function main() {
  logSection("🔄 JSON Schema to GraphQL Converter Comparison Test");

  // Get input file from command line or use defaults
  const inputFiles = process.argv.slice(2);

  if (inputFiles.length === 0) {
    const testDataDir = join(projectRoot, "converters", "test-data");
    try {
      const files = readdirSync(testDataDir);
      const jsonFiles = files
        .filter((file) => file.endsWith(".json"))
        .map((file) => join(testDataDir, file));

      if (jsonFiles.length > 0) {
        inputFiles.push(...jsonFiles);
        log(`Found ${jsonFiles.length} test files in ${testDataDir}`, "cyan");
      }
    } catch (error) {
      log(`Note: Could not read test data directory: ${error.message}`, "yellow");
    }

    if (inputFiles.length === 0) {
      inputFiles.push(
        join(projectRoot, "examples", "user-service.schema.json"),
        join(projectRoot, "schema", "test.json"),
      );
    }
  }

  const resolvedInputs = inputFiles.map((file) =>
    isAbsolute(file) ? file : join(projectRoot, file),
  );

  // Ensure output directory exists
  mkdirSync(outputDir, { recursive: true });

  // Test each input file
  for (const inputFile of resolvedInputs) {
    try {
      // Check if file exists
      readFileSync(inputFile, "utf-8");

      const basename = inputFile.split("/").pop().replace(".json", "");
      const ext = EFFECTIVE_OPTIONS.outputFormat === "AST_JSON" ? "json" : "graphql";

      logSection(`📁 Testing: ${basename}`);
      log(`Input: ${inputFile}`, "blue");

      const nodeOutputFile = join(outputDir, `${basename}-node.${ext}`);
      const rustOutputFile = join(outputDir, `${basename}-rust.${ext}`);

      const nodeResult = await testNodeConverter(inputFile, nodeOutputFile);
      console.log();
      const rustResult = await testRustConverter(inputFile, rustOutputFile);
      console.log();

      if (!nodeResult.success || !rustResult.success) {
        // Ensure deterministic outputs even when one converter fails so parity
        // checks do not reuse stale files from previous runs.
        writeFileSync(nodeOutputFile, "", "utf-8");
        writeFileSync(rustOutputFile, "", "utf-8");
      }

      compareOutputs(nodeResult, rustResult);
    } catch (error) {
      log(`❌ Error reading file: ${inputFile}`, "red");
      log(`   ${error.message}`, "red");
    }
  }

  logSection("✅ Comparison Complete");
  log(`Output files saved to: ${outputDir}`, "blue");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
