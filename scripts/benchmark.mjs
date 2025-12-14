#!/usr/bin/env node
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { performance } from "perf_hooks";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

// Configuration
const ITERATIONS = 5;
const WARMUP = 2;

const PATHS = {
  nodeConverter: path.join(repoRoot, "converters/node/dist/cli.js"),
  rustConverter: path.join(repoRoot, "converters/rust/target/release/jxql"),
  schemasDir: path.join(repoRoot, "examples/real-world-schemas"),
  outputDir: path.join(repoRoot, "output/benchmark"),
};

// Ensure output directory exists
if (!fs.existsSync(PATHS.outputDir)) {
  fs.mkdirSync(PATHS.outputDir, { recursive: true });
}

// Find schemas
const schemas = fs
  .readdirSync(PATHS.schemasDir)
  .filter((f) => f.endsWith(".schema.json"))
  .map((f) => ({
    name: f.replace(".schema.json", ""),
    path: path.join(PATHS.schemasDir, f),
  }));

console.log(`Found ${schemas.length} schemas to benchmark.`);
console.log(`Iterations: ${ITERATIONS}, Warmup: ${WARMUP}\n`);

function runCommand(command, args) {
  const start = performance.now();
  const result = spawnSync(command, args, { encoding: "utf-8" });
  const end = performance.now();

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}\n${result.stderr}`);
  }

  return end - start;
}

function benchmark(name, runner) {
  // Warmup
  for (let i = 0; i < WARMUP; i++) {
    runner();
  }

  // Measurement
  const times = [];
  for (let i = 0; i < ITERATIONS; i++) {
    times.push(runner());
  }

  // Calculate stats
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  return { avg, min, max };
}

const results = [];

for (const schema of schemas) {
  console.log(`Benchmarking ${schema.name}...`);

  // Node Benchmark
  const nodeOut = path.join(PATHS.outputDir, `${schema.name}.node.graphql`);
  const nodeStats = benchmark("Node", () =>
    runCommand("node", [PATHS.nodeConverter, "--input", schema.path, "--output", nodeOut, "--descriptions"])
  );

  // Rust Benchmark
  const rustOut = path.join(PATHS.outputDir, `${schema.name}.rust.graphql`);
  const rustStats = benchmark("Rust", () =>
    runCommand(PATHS.rustConverter, ["--input", schema.path, "--output", rustOut, "--descriptions"])
  );

  results.push({
    schema: schema.name,
    node: nodeStats,
    rust: rustStats,
    speedup: nodeStats.avg / rustStats.avg,
  });
}

// Print Results
console.log("\nBenchmark Results (Average Time in ms):");
console.log(
  "Schema".padEnd(30) +
    "Node (ms)".padEnd(15) +
    "Rust (ms)".padEnd(15) +
    "Speedup (x)".padEnd(15)
);
console.log("-".repeat(75));

for (const res of results) {
  console.log(
    res.schema.padEnd(30) +
      res.node.avg.toFixed(2).padEnd(15) +
      res.rust.avg.toFixed(2).padEnd(15) +
      res.speedup.toFixed(2).padEnd(15)
  );
}

console.log("-".repeat(75));

// Calculate average speedup
const avgSpeedup = results.reduce((acc, curr) => acc + curr.speedup, 0) / results.length;
console.log(`Average Speedup: ${avgSpeedup.toFixed(2)}x`);
