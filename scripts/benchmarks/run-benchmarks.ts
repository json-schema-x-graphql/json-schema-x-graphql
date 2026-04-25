#!/usr/bin/env node
/**
 * Benchmark Script - JSON Schema ↔ GraphQL Conversion Performance
 *
 * Measures conversion and validation performance across test-data files.
 * Does NOT inline tests - imports from test-data directories.
 * Outputs benchmark results in JSON format for CI/CD integration.
 */

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "fs";
import { join, relative, basename } from "path";
import { jsonSchemaToGraphQL } from "../../converters/node/src/converter";
import { parse as parseGraphQL, buildSchema, validate } from "graphql";

interface BenchmarkResult {
  name: string;
  file: string;
  iterations: number;
  metrics: {
    conversionTimeMs: {
      min: number;
      max: number;
      mean: number;
      median: number;
      stdDev: number;
      p95: number;
      p99: number;
    };
    validationTimeMs?: {
      min: number;
      max: number;
      mean: number;
      median: number;
      stdDev: number;
      p95: number;
      p99: number;
    };
    memoryUsageMB?: {
      before: number;
      after: number;
      delta: number;
    };
    throughput?: {
      conversionsPerSecond: number;
      typesPerSecond: number;
    };
  };
  metadata: {
    schemaSize: number;
    typesGenerated: number;
    fieldsGenerated: number;
    hasXGraphQLExtensions: boolean;
  };
}

interface BenchmarkReport {
  timestamp: string;
  environment: {
    nodeVersion: string;
    platform: string;
    arch: string;
    cpus: number;
  };
  totalBenchmarks: number;
  results: BenchmarkResult[];
  summary: {
    fastest: string;
    slowest: string;
    averageConversionMs: number;
    totalTypesGenerated: number;
    totalIterations: number;
  };
}

const PROJECT_ROOT = join(__dirname, "../..");
const TEST_DATA_DIR = join(PROJECT_ROOT, "converters/test-data");
const X_GRAPHQL_DIR = join(TEST_DATA_DIR, "x-graphql");

// Benchmark configuration
const DEFAULT_ITERATIONS = 100;
const WARMUP_ITERATIONS = 10;

class BenchmarkRunner {
  /**
   * Discover benchmark test files
   */
  discoverBenchmarkFiles(): string[] {
    const files: string[] = [];

    // Priority files for benchmarking
    const priorityFiles = [
      join(X_GRAPHQL_DIR, "basic-types.json"),
      join(X_GRAPHQL_DIR, "comprehensive.json"),
      join(X_GRAPHQL_DIR, "interfaces.json"),
      join(X_GRAPHQL_DIR, "unions.json"),
      join(TEST_DATA_DIR, "complex-schema.json"),
      join(TEST_DATA_DIR, "user-service.json"),
      join(TEST_DATA_DIR, "federation_v2.json"),
      join(TEST_DATA_DIR, "deep_nesting.json"),
    ];

    for (const file of priorityFiles) {
      if (existsSync(file)) {
        files.push(file);
      }
    }

    return files;
  }

  /**
   * Load options file if exists
   */
  loadOptions(schemaPath: string): any {
    const optionsPath = schemaPath.replace(".json", ".options.json");
    if (existsSync(optionsPath)) {
      try {
        const content = readFileSync(optionsPath, "utf-8");
        return JSON.parse(content);
      } catch (err) {
        return {};
      }
    }
    return {};
  }

  /**
   * Check if schema has x-graphql extensions
   */
  hasXGraphQLExtensions(schema: any): boolean {
    const checkObject = (obj: any): boolean => {
      if (!obj || typeof obj !== "object") return false;
      for (const key in obj) {
        if (key.startsWith("x-graphql")) return true;
        if (typeof obj[key] === "object" && checkObject(obj[key])) return true;
      }
      return false;
    };
    return checkObject(schema);
  }

  /**
   * Count types and fields in SDL
   */
  countTypesAndFields(sdl: string): { types: number; fields: number } {
    try {
      const ast = parseGraphQL(sdl);
      let types = 0;
      let fields = 0;

      for (const def of ast.definitions) {
        if (
          def.kind === "ObjectTypeDefinition" ||
          def.kind === "InterfaceTypeDefinition" ||
          def.kind === "InputObjectTypeDefinition" ||
          def.kind === "EnumTypeDefinition" ||
          def.kind === "ScalarTypeDefinition" ||
          def.kind === "UnionTypeDefinition"
        ) {
          types++;

          if ("fields" in def && def.fields) {
            fields += def.fields.length;
          }
          if ("values" in def && def.values) {
            fields += def.values.length;
          }
        }
      }

      return { types, fields };
    } catch (err) {
      return { types: 0, fields: 0 };
    }
  }

  /**
   * Calculate statistics from array of numbers
   */
  calculateStats(values: number[]): {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
    p95: number;
    p99: number;
  } {
    const sorted = [...values].sort((a, b) => a - b);
    const len = sorted.length;

    const min = sorted[0];
    const max = sorted[len - 1];
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / len;

    const median =
      len % 2 === 0 ? (sorted[len / 2 - 1] + sorted[len / 2]) / 2 : sorted[Math.floor(len / 2)];

    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / len;
    const stdDev = Math.sqrt(variance);

    const p95Index = Math.ceil(len * 0.95) - 1;
    const p99Index = Math.ceil(len * 0.99) - 1;
    const p95 = sorted[p95Index];
    const p99 = sorted[p99Index];

    return { min, max, mean, median, stdDev, p95, p99 };
  }

  /**
   * Run benchmark for a single file
   */
  async runBenchmark(
    filePath: string,
    iterations: number = DEFAULT_ITERATIONS,
  ): Promise<BenchmarkResult> {
    const relativePath = relative(PROJECT_ROOT, filePath);
    const benchmarkName = basename(filePath, ".json");

    console.log(`\n🏃 Running benchmark: ${benchmarkName}`);
    console.log(`   File: ${relativePath}`);
    console.log(`   Warmup: ${WARMUP_ITERATIONS} iterations`);
    console.log(`   Benchmark: ${iterations} iterations`);

    // Load schema and options
    const schemaContent = readFileSync(filePath, "utf-8");
    const schema = JSON.parse(schemaContent);
    const options = this.loadOptions(filePath);
    const schemaSize = schemaContent.length;

    // Warmup phase
    console.log("   ⏳ Warming up...");
    for (let i = 0; i < WARMUP_ITERATIONS; i++) {
      jsonSchemaToGraphQL(schema, options);
    }

    // Measure memory before
    if (global.gc) {
      global.gc();
    }
    const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;

    // Benchmark conversion
    console.log("   ⏱️  Benchmarking conversion...");
    const conversionTimes: number[] = [];
    let generatedSDL = "";

    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      generatedSDL = jsonSchemaToGraphQL(schema, options);
      const end = process.hrtime.bigint();
      conversionTimes.push(Number(end - start) / 1_000_000); // Convert to ms
    }

    // Benchmark validation
    console.log("   ⏱️  Benchmarking validation...");
    const validationTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      try {
        const ast = parseGraphQL(generatedSDL);
        const graphqlSchema = buildSchema(generatedSDL);
        validate(graphqlSchema, ast);
      } catch (err) {
        // Validation errors don't affect timing
      }
      const end = process.hrtime.bigint();
      validationTimes.push(Number(end - start) / 1_000_000);
    }

    // Measure memory after
    const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;
    const memDelta = memAfter - memBefore;

    // Extract metadata
    const { types, fields } = this.countTypesAndFields(generatedSDL);
    const hasExtensions = this.hasXGraphQLExtensions(schema);

    // Calculate statistics
    const conversionStats = this.calculateStats(conversionTimes);
    const validationStats = this.calculateStats(validationTimes);

    // Calculate throughput
    const conversionsPerSecond = 1000 / conversionStats.mean;
    const typesPerSecond = conversionsPerSecond * types;

    const result: BenchmarkResult = {
      name: benchmarkName,
      file: relativePath,
      iterations,
      metrics: {
        conversionTimeMs: conversionStats,
        validationTimeMs: validationStats,
        memoryUsageMB: {
          before: memBefore,
          after: memAfter,
          delta: memDelta,
        },
        throughput: {
          conversionsPerSecond,
          typesPerSecond,
        },
      },
      metadata: {
        schemaSize,
        typesGenerated: types,
        fieldsGenerated: fields,
        hasXGraphQLExtensions: hasExtensions,
      },
    };

    // Log results
    console.log(`   ✅ Complete`);
    console.log(
      `      Conversion: ${conversionStats.mean.toFixed(2)}ms avg (±${conversionStats.stdDev.toFixed(2)}ms)`,
    );
    console.log(
      `      Validation: ${validationStats.mean.toFixed(2)}ms avg (±${validationStats.stdDev.toFixed(2)}ms)`,
    );
    console.log(
      `      Throughput: ${conversionsPerSecond.toFixed(0)} conv/s, ${typesPerSecond.toFixed(0)} types/s`,
    );
    console.log(`      Memory: ${memDelta.toFixed(2)}MB delta`);
    console.log(`      Generated: ${types} types, ${fields} fields`);

    return result;
  }

  /**
   * Run all benchmarks
   */
  async runAll(iterations: number = DEFAULT_ITERATIONS): Promise<BenchmarkReport> {
    const files = this.discoverBenchmarkFiles();
    const results: BenchmarkResult[] = [];

    console.log(`\n📊 Starting benchmarks for ${files.length} files`);
    console.log(`   Iterations per file: ${iterations}`);
    console.log(`   Node version: ${process.version}`);
    console.log(`   Platform: ${process.platform} ${process.arch}`);

    for (const file of files) {
      try {
        const result = await this.runBenchmark(file, iterations);
        results.push(result);
      } catch (err: any) {
        console.error(`   ❌ Benchmark failed: ${err.message}`);
      }
    }

    // Calculate summary
    const conversionTimes = results.map((r) => r.metrics.conversionTimeMs.mean);
    const averageConversionMs =
      conversionTimes.length > 0
        ? conversionTimes.reduce((a, b) => a + b, 0) / conversionTimes.length
        : 0;

    const fastest =
      results.length > 0
        ? results.reduce((prev, curr) =>
            curr.metrics.conversionTimeMs.mean < prev.metrics.conversionTimeMs.mean ? curr : prev,
          )
        : null;

    const slowest =
      results.length > 0
        ? results.reduce((prev, curr) =>
            curr.metrics.conversionTimeMs.mean > prev.metrics.conversionTimeMs.mean ? curr : prev,
          )
        : null;

    const totalTypes = results.reduce((sum, r) => sum + r.metadata.typesGenerated, 0);
    const totalIterations = results.reduce((sum, r) => sum + r.iterations, 0);

    const report: BenchmarkReport = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cpus: require("os").cpus().length,
      },
      totalBenchmarks: results.length,
      results,
      summary: {
        fastest: fastest?.name || "N/A",
        slowest: slowest?.name || "N/A",
        averageConversionMs,
        totalTypesGenerated: totalTypes,
        totalIterations,
      },
    };

    return report;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const flags = {
    iterations: parseInt(
      args.find((arg) => arg.startsWith("--iterations="))?.split("=")[1] || `${DEFAULT_ITERATIONS}`,
    ),
    json: args.includes("--json"),
    output: args.find((arg) => arg.startsWith("--output="))?.split("=")[1],
    compare: args.find((arg) => arg.startsWith("--compare="))?.split("=")[1],
  };

  const runner = new BenchmarkRunner();
  const report = await runner.runAll(flags.iterations);

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("BENCHMARK SUMMARY");
  console.log("=".repeat(60));
  console.log(`Environment:       ${report.environment.platform} ${report.environment.arch}`);
  console.log(`Node version:      ${report.environment.nodeVersion}`);
  console.log(`CPUs:              ${report.environment.cpus}`);
  console.log(`Total benchmarks:  ${report.totalBenchmarks}`);
  console.log(`Total iterations:  ${report.summary.totalIterations}`);
  console.log(`Avg conversion:    ${report.summary.averageConversionMs.toFixed(2)}ms`);
  console.log(`Fastest:           ${report.summary.fastest}`);
  console.log(`Slowest:           ${report.summary.slowest}`);
  console.log(`Total types gen:   ${report.summary.totalTypesGenerated}`);

  console.log("\nPer-file results:");
  for (const result of report.results) {
    const conv = result.metrics.conversionTimeMs;
    const val = result.metrics.validationTimeMs;
    const xGraphQL = result.metadata.hasXGraphQLExtensions ? "🔧" : "  ";

    console.log(`\n  ${xGraphQL} ${result.name}`);
    console.log(
      `     Conversion: ${conv.mean.toFixed(2)}ms (min: ${conv.min.toFixed(2)}ms, max: ${conv.max.toFixed(2)}ms, p95: ${conv.p95.toFixed(2)}ms)`,
    );
    console.log(
      `     Validation: ${val?.mean.toFixed(2)}ms (min: ${val?.min.toFixed(2)}ms, max: ${val?.max.toFixed(2)}ms, p95: ${val?.p95.toFixed(2)}ms)`,
    );
    console.log(
      `     Throughput: ${result.metrics.throughput?.conversionsPerSecond.toFixed(0)} conv/s`,
    );
    console.log(
      `     Generated:  ${result.metadata.typesGenerated} types, ${result.metadata.fieldsGenerated} fields`,
    );
  }

  console.log("\n" + "=".repeat(60) + "\n");

  // Output JSON report if requested
  if (flags.output) {
    writeFileSync(flags.output, JSON.stringify(report, null, 2));
    console.log(`📄 Benchmark report written to: ${flags.output}\n`);
  }

  if (flags.json) {
    console.log(JSON.stringify(report, null, 2));
  }

  // Compare with previous results if requested
  if (flags.compare && existsSync(flags.compare)) {
    console.log("\n📊 Comparing with previous results...\n");
    const previousReport = JSON.parse(readFileSync(flags.compare, "utf-8"));

    for (const result of report.results) {
      const previous = previousReport.results?.find((r: any) => r.name === result.name);
      if (previous) {
        const currentTime = result.metrics.conversionTimeMs.mean;
        const previousTime = previous.metrics.conversionTimeMs.mean;
        const delta = currentTime - previousTime;
        const percentChange = (delta / previousTime) * 100;

        const symbol = delta < 0 ? "🚀" : delta > 0 ? "🐌" : "➡️ ";
        const sign = delta > 0 ? "+" : "";

        console.log(
          `${symbol} ${result.name}: ${currentTime.toFixed(2)}ms (${sign}${delta.toFixed(2)}ms, ${sign}${percentChange.toFixed(1)}%)`,
        );
      }
    }
    console.log();
  }

  console.log("✅ Benchmarks complete\n");
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}

export { BenchmarkRunner, BenchmarkResult, BenchmarkReport };
