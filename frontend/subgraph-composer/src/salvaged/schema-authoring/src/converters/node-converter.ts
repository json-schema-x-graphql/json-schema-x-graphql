/**
 * Node.js Converter Wrapper
 *
 * Wraps the Node.js converter (from converters/node) for use in the browser.
 * This can run via a backend API endpoint or through a bundled version.
 */

import type {
  ConversionResult,
  ConversionError,
  JsonToGraphQLOptions,
  GraphQLToJsonOptions,
} from "../types";

/**
 * Node converter configuration
 */
interface NodeConverterConfig {
  endpoint?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<NodeConverterConfig> = {
  endpoint: "/api/convert",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
};

/**
 * Node.js converter class
 */
export class NodeConverter {
  private config: Required<NodeConverterConfig>;
  private abortController: AbortController | null = null;

  constructor(config: NodeConverterConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Convert JSON Schema to GraphQL SDL
   */
  async convertJsonToGraphQL(
    jsonSchema: string,
    options: JsonToGraphQLOptions = {},
  ): Promise<ConversionResult> {
    const startTime = performance.now();

    try {
      // Parse JSON to validate
      let parsedSchema: unknown;
      try {
        parsedSchema = JSON.parse(jsonSchema);
      } catch (error) {
        return this.createErrorResult(
          "Invalid JSON Schema: " + (error instanceof Error ? error.message : "Parse error"),
          startTime,
          1,
          1,
        );
      }

      // Prepare request
      this.abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        this.abortController?.abort();
      }, this.config.timeout);

      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: this.config.headers,
        body: JSON.stringify({
          direction: "json-to-graphql",
          input: parsedSchema,
          options: {
            includeFederationDirectives: options.includeFederationDirectives ?? false,
            includeDescriptions: options.includeDescriptions ?? true,
            // Map frontend options to backend ConverterOptions format
            // Note: backend doesn't support all frontend options yet
          },
        }),
        signal: this.abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        return this.createErrorResult(
          errorData.message || "Conversion failed",
          startTime,
          errorData.line,
          errorData.column,
        );
      }

      const result = await response.json();
      const duration = performance.now() - startTime;

      return {
        success: true,
        output: result.output,
        warnings: result.warnings || [],
        metadata: {
          inputLength: jsonSchema.length,
          outputLength: result.output.length,
          typesGenerated: result.metadata?.typesGenerated,
          fieldsGenerated: result.metadata?.fieldsGenerated,
          directivesApplied: result.metadata?.directivesApplied,
          timestamp: new Date().toISOString(),
        },
        engine: "node",
        duration,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return this.createErrorResult(
          "Conversion timed out after " + this.config.timeout + "ms",
          startTime,
        );
      }

      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error occurred",
        startTime,
      );
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Convert GraphQL SDL to JSON Schema
   */
  async convertGraphQLToJson(
    graphqlSchema: string,
    options: GraphQLToJsonOptions = {},
  ): Promise<ConversionResult> {
    const startTime = performance.now();

    try {
      // Basic validation
      if (!graphqlSchema.trim()) {
        return this.createErrorResult("GraphQL schema cannot be empty", startTime);
      }

      // Prepare request
      this.abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        this.abortController?.abort();
      }, this.config.timeout);

      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: this.config.headers,
        body: JSON.stringify({
          direction: "graphql-to-json",
          input: graphqlSchema,
          options: {
            includeDescriptions: options.includeDescriptions ?? true,
          },
        }),
        signal: this.abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        return this.createErrorResult(
          errorData.message || "Conversion failed",
          startTime,
          errorData.line,
          errorData.column,
        );
      }

      const result = await response.json();
      const duration = performance.now() - startTime;

      return {
        success: true,
        output: result.output,
        warnings: result.warnings || [],
        metadata: {
          inputLength: graphqlSchema.length,
          outputLength: result.output.length,
          timestamp: new Date().toISOString(),
        },
        engine: "node",
        duration,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return this.createErrorResult(
          "Conversion timed out after " + this.config.timeout + "ms",
          startTime,
        );
      }

      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error occurred",
        startTime,
      );
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Check if Node converter is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(this.config.endpoint + "/health", {
        method: "GET",
        headers: this.config.headers,
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get converter version
   */
  async getVersion(): Promise<string | null> {
    try {
      const response = await fetch(this.config.endpoint + "/version", {
        method: "GET",
        headers: this.config.headers,
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.version || null;
    } catch {
      return null;
    }
  }

  /**
   * Cancel ongoing conversion
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NodeConverterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Create error result helper
   */
  private createErrorResult(
    message: string,
    startTime: number,
    line?: number,
    column?: number,
  ): ConversionResult {
    const error: ConversionError = {
      message,
      line,
      column,
      suggestion: this.getSuggestionForError(message),
    };

    return {
      success: false,
      error,
      engine: "node",
      duration: performance.now() - startTime,
    };
  }

  /**
   * Get suggestion for common errors
   */
  private getSuggestionForError(message: string): string | undefined {
    if (message.includes("timeout")) {
      return "The conversion is taking too long. Try reducing the schema size or increasing the timeout.";
    }
    if (message.includes("Invalid JSON")) {
      return "Check your JSON syntax. Common issues: trailing commas, unquoted keys, single quotes instead of double quotes.";
    }
    if (message.includes("empty")) {
      return "Provide a valid schema with at least one type definition.";
    }
    if (message.includes("HTTP 404")) {
      return "The Node converter API endpoint was not found. Ensure the backend server is running.";
    }
    if (message.includes("HTTP 500")) {
      return "The server encountered an error. Check the server logs for more details.";
    }
    if (message.includes("Network")) {
      return "Check your internet connection and ensure the backend server is accessible.";
    }
    return undefined;
  }
}

/**
 * Create and export singleton instance
 */
export const nodeConverter = new NodeConverter();

/**
 * Re-export for convenience
 */
export default NodeConverter;
