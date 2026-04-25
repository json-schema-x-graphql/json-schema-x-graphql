/**
 * Converter Manager
 *
 * Unified interface for managing both Rust WASM and Node.js converters
 * with automatic fallback, engine selection, and performance tracking.
 */

import { WasmConverter } from "./wasm-converter";
import { NodeConverter } from "./node-converter";
import type {
  ConversionResult,
  ConverterEngine,
  JsonToGraphQLOptions,
  GraphQLToJsonOptions,
  ConversionDirection,
} from "../types";

/**
 * Converter manager configuration
 */
export interface ConverterManagerConfig {
  preferredEngine?: ConverterEngine;
  enableFallback?: boolean;
  enablePerformanceTracking?: boolean;
  wasmConfig?: {
    wasmPath?: string;
    autoInit?: boolean;
  };
  nodeConfig?: {
    endpoint?: string;
    timeout?: number;
  };
}

/**
 * Performance metrics
 */
interface PerformanceMetrics {
  engine: ConverterEngine;
  direction: ConversionDirection;
  duration: number;
  timestamp: string;
  success: boolean;
}

/**
 * Engine availability status
 */
interface EngineStatus {
  wasm: {
    available: boolean;
    loading: boolean;
    version: string | null;
    error: string | null;
  };
  node: {
    available: boolean;
    version: string | null;
    error: string | null;
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<ConverterManagerConfig> = {
  preferredEngine: "auto",
  enableFallback: true,
  enablePerformanceTracking: true,
  wasmConfig: {
    wasmPath: "/wasm/json_schema_x_graphql_bg.wasm",
    autoInit: true,
  },
  nodeConfig: {
    endpoint: "/api/convert",
    timeout: 30000,
  },
};

/**
 * Converter Manager class
 */
export class ConverterManager {
  private config: Required<ConverterManagerConfig>;
  private wasmConverter: WasmConverter;
  private nodeConverter: NodeConverter;
  private performanceMetrics: PerformanceMetrics[] = [];
  private maxMetrics = 100; // Keep last 100 conversions
  private statusCache: EngineStatus | null = null;
  private statusCacheExpiry = 0;
  private readonly STATUS_CACHE_TTL = 5000; // 5 seconds

  constructor(config: ConverterManagerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize converters
    this.wasmConverter = new WasmConverter({
      wasmPath: this.config.wasmConfig.wasmPath,
      autoInit: this.config.wasmConfig.autoInit,
      fallbackToNode: this.config.enableFallback,
    });

    this.nodeConverter = new NodeConverter({
      endpoint: this.config.nodeConfig.endpoint,
      timeout: this.config.nodeConfig.timeout,
    });
  }

  /**
   * Convert JSON Schema to GraphQL SDL
   */
  async convertJsonToGraphQL(
    jsonSchema: string,
    options: JsonToGraphQLOptions = {},
    preferredEngine?: ConverterEngine,
  ): Promise<ConversionResult> {
    const engine = preferredEngine || this.config.preferredEngine;
    const direction: ConversionDirection = "json-to-graphql";

    return this.executeConversion(direction, engine, async (selectedEngine) => {
      if (selectedEngine === "rust-wasm") {
        return this.wasmConverter.convertJsonToGraphQL(jsonSchema, options);
      } else {
        return this.nodeConverter.convertJsonToGraphQL(jsonSchema, options);
      }
    });
  }

  /**
   * Convert GraphQL SDL to JSON Schema
   */
  async convertGraphQLToJson(
    graphqlSchema: string,
    options: GraphQLToJsonOptions = {},
    preferredEngine?: ConverterEngine,
  ): Promise<ConversionResult> {
    const engine = preferredEngine || this.config.preferredEngine;
    const direction: ConversionDirection = "graphql-to-json";

    return this.executeConversion(direction, engine, async (selectedEngine) => {
      if (selectedEngine === "rust-wasm") {
        return this.wasmConverter.convertGraphQLToJson(graphqlSchema, options);
      } else {
        return this.nodeConverter.convertGraphQLToJson(graphqlSchema, options);
      }
    });
  }

  /**
   * Execute conversion with engine selection and fallback
   */
  private async executeConversion(
    direction: ConversionDirection,
    preferredEngine: ConverterEngine,
    conversionFn: (engine: "rust-wasm" | "node") => Promise<ConversionResult>,
  ): Promise<ConversionResult> {
    const startTime = performance.now();
    let selectedEngine: "rust-wasm" | "node";

    // Determine which engine to use
    if (preferredEngine === "auto") {
      selectedEngine = await this.selectBestEngine();
    } else {
      selectedEngine = preferredEngine;
    }

    // Try primary engine
    try {
      const result = await conversionFn(selectedEngine);

      // Track performance
      if (this.config.enablePerformanceTracking) {
        this.trackPerformance({
          engine: selectedEngine,
          direction,
          duration: performance.now() - startTime,
          timestamp: new Date().toISOString(),
          success: result.success,
        });
      }

      // If successful, return result
      if (result.success) {
        return result;
      }

      // If failed and fallback is enabled, try fallback engine
      if (this.config.enableFallback) {
        const fallbackEngine = selectedEngine === "rust-wasm" ? "node" : "rust-wasm";
        console.warn(
          `Primary engine (${selectedEngine}) failed, falling back to ${fallbackEngine}`,
        );

        const fallbackResult = await conversionFn(fallbackEngine);

        // Track fallback performance
        if (this.config.enablePerformanceTracking) {
          this.trackPerformance({
            engine: fallbackEngine,
            direction,
            duration: performance.now() - startTime,
            timestamp: new Date().toISOString(),
            success: fallbackResult.success,
          });
        }

        return fallbackResult;
      }

      return result;
    } catch (error) {
      // If fallback is enabled, try fallback engine
      if (this.config.enableFallback) {
        const fallbackEngine = selectedEngine === "rust-wasm" ? "node" : "rust-wasm";
        console.warn(
          `Primary engine (${selectedEngine}) threw error, falling back to ${fallbackEngine}:`,
          error,
        );

        try {
          const fallbackResult = await conversionFn(fallbackEngine);

          // Track fallback performance
          if (this.config.enablePerformanceTracking) {
            this.trackPerformance({
              engine: fallbackEngine,
              direction,
              duration: performance.now() - startTime,
              timestamp: new Date().toISOString(),
              success: fallbackResult.success,
            });
          }

          return fallbackResult;
        } catch (fallbackError) {
          // Both engines failed
          return {
            success: false,
            error: {
              message: `Both converters failed. Primary: ${
                error instanceof Error ? error.message : "Unknown error"
              }. Fallback: ${
                fallbackError instanceof Error ? fallbackError.message : "Unknown error"
              }`,
            },
            engine: fallbackEngine,
            duration: performance.now() - startTime,
          };
        }
      }

      // Fallback disabled, throw error
      throw error;
    }
  }

  /**
   * Select best engine based on availability and performance
   */
  private async selectBestEngine(): Promise<"rust-wasm" | "node"> {
    const status = await this.getEngineStatus();

    // Prefer WASM if available (faster, no network)
    if (status.wasm.available) {
      return "rust-wasm";
    }

    // Fallback to Node if WASM is not available
    if (status.node.available) {
      return "node";
    }

    // If neither is available, try WASM (it might initialize on first use)
    return "rust-wasm";
  }

  /**
   * Get engine availability status
   */
  async getEngineStatus(useCache = true): Promise<EngineStatus> {
    const now = Date.now();

    // Return cached status if valid
    if (useCache && this.statusCache && now < this.statusCacheExpiry) {
      return this.statusCache;
    }

    // Check WASM status
    const wasmAvailable = this.wasmConverter.isAvailable();
    const wasmLoading = this.wasmConverter.isLoading();
    const wasmError = this.wasmConverter.getError();
    const wasmVersion = wasmAvailable ? await this.wasmConverter.getVersion() : null;

    // Check Node status
    const nodeAvailable = await this.nodeConverter.isAvailable();
    const nodeVersion = nodeAvailable ? await this.nodeConverter.getVersion() : null;

    const status: EngineStatus = {
      wasm: {
        available: wasmAvailable,
        loading: wasmLoading,
        version: wasmVersion,
        error: wasmError ? wasmError.message : null,
      },
      node: {
        available: nodeAvailable,
        version: nodeVersion,
        error: !nodeAvailable ? "Node converter endpoint not accessible" : null,
      },
    };

    // Cache status
    this.statusCache = status;
    this.statusCacheExpiry = now + this.STATUS_CACHE_TTL;

    return status;
  }

  /**
   * Initialize WASM converter explicitly
   */
  async initializeWasm(): Promise<void> {
    await this.wasmConverter.init();
  }

  /**
   * Check if any converter is available
   */
  async isAnyConverterAvailable(): Promise<boolean> {
    const status = await this.getEngineStatus();
    return status.wasm.available || status.node.available;
  }

  /**
   * Track performance metrics
   */
  private trackPerformance(metrics: PerformanceMetrics): void {
    this.performanceMetrics.push(metrics);

    // Keep only last N metrics
    if (this.performanceMetrics.length > this.maxMetrics) {
      this.performanceMetrics.shift();
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics[] {
    return [...this.performanceMetrics];
  }

  /**
   * Get average conversion time by engine
   */
  getAverageConversionTime(engine?: ConverterEngine): Record<ConverterEngine, number> {
    const metrics = engine
      ? this.performanceMetrics.filter((m) => m.engine === engine)
      : this.performanceMetrics;

    const byEngine = metrics.reduce(
      (acc, m) => {
        if (!acc[m.engine]) {
          acc[m.engine] = { total: 0, count: 0 };
        }
        acc[m.engine].total += m.duration;
        acc[m.engine].count += 1;
        return acc;
      },
      {} as Record<string, { total: number; count: number }>,
    );

    return Object.entries(byEngine).reduce(
      (acc, [eng, stats]) => {
        acc[eng as ConverterEngine] = stats.total / stats.count;
        return acc;
      },
      {} as Record<ConverterEngine, number>,
    );
  }

  /**
   * Get success rate by engine
   */
  getSuccessRate(engine?: ConverterEngine): Record<ConverterEngine, number> {
    const metrics = engine
      ? this.performanceMetrics.filter((m) => m.engine === engine)
      : this.performanceMetrics;

    const byEngine = metrics.reduce(
      (acc, m) => {
        if (!acc[m.engine]) {
          acc[m.engine] = { success: 0, total: 0 };
        }
        if (m.success) acc[m.engine].success += 1;
        acc[m.engine].total += 1;
        return acc;
      },
      {} as Record<string, { success: number; total: number }>,
    );

    return Object.entries(byEngine).reduce(
      (acc, [eng, stats]) => {
        acc[eng as ConverterEngine] = stats.total > 0 ? stats.success / stats.total : 0;
        return acc;
      },
      {} as Record<ConverterEngine, number>,
    );
  }

  /**
   * Clear performance metrics
   */
  clearPerformanceMetrics(): void {
    this.performanceMetrics = [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ConverterManagerConfig>): void {
    this.config = { ...this.config, ...config };

    // Update child converters if needed
    if (config.wasmConfig) {
      this.wasmConverter.updateConfig(config.wasmConfig);
    }
    if (config.nodeConfig) {
      this.nodeConverter.updateConfig(config.nodeConfig);
    }

    // Invalidate status cache
    this.statusCache = null;
    this.statusCacheExpiry = 0;
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<ConverterManagerConfig> {
    return { ...this.config };
  }

  /**
   * Cancel any ongoing conversions
   */
  cancelAll(): void {
    this.nodeConverter.cancel();
  }

  /**
   * Reset all converters
   */
  async reset(): Promise<void> {
    await this.wasmConverter.reset();
    this.clearPerformanceMetrics();
    this.statusCache = null;
    this.statusCacheExpiry = 0;
  }

  /**
   * Get converter instances (for advanced usage)
   */
  getConverters(): {
    wasm: WasmConverter;
    node: NodeConverter;
  } {
    return {
      wasm: this.wasmConverter,
      node: this.nodeConverter,
    };
  }
}

/**
 * Create and export singleton instance
 */
export const converterManager = new ConverterManager();

/**
 * Re-export for convenience
 */
export default ConverterManager;
