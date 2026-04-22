/**
 * Simple API server for JSON Schema ↔ GraphQL converter
 *
 * This provides a REST endpoint for the frontend to call the Node.js converter.
 */

import http from "http";
import { performance } from "perf_hooks";
import { jsonSchemaToGraphQL, graphqlToJsonSchema } from "./converter.js";
import type { ConverterOptions } from "./generated/types.js";

interface ConvertRequest {
  direction: "json-to-graphql" | "graphql-to-json";
  input: string | object;
  options?: ConverterOptions;
}

interface ConvertResponse {
  success: boolean;
  output?: string;
  error?: string;
  details?: {
    line?: number;
    column?: number;
    context?: string;
  };
  timing?: {
    parse?: number;
    convert?: number;
    total?: number;
  };
}

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3004;
const HOST = process.env.HOST || "localhost";

/**
 * Parse JSON from request body
 */
function parseRequestBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer | string) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      resolve(body);
    });
    req.on("error", reject);
  });
}

/**
 * Send JSON response
 */
function sendJson(res: http.ServerResponse, statusCode: number, data: ConvertResponse) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(data, null, 2));
}

/**
 * Handle conversion request
 */
async function handleConvert(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const startTime = performance.now();

  try {
    // Parse request body
    const bodyStr = await parseRequestBody(req);
    console.log("📥 Received request body:", bodyStr.substring(0, 200));

    let request: ConvertRequest;

    try {
      request = JSON.parse(bodyStr);
      console.log("✓ Parsed request:", {
        direction: request.direction,
        inputType: typeof request.input,
        hasOptions: !!request.options,
      });
    } catch (error) {
      console.error("❌ JSON parse error:", error);
      sendJson(res, 400, {
        success: false,
        error: "Invalid JSON in request body",
        details: {
          context: error instanceof Error ? error.message : "Parse error",
        },
      });
      return;
    }

    // Validate request
    if (!request.direction || !request.input) {
      sendJson(res, 400, {
        success: false,
        error: "Missing required fields: direction and input",
      });
      return;
    }

    // Perform conversion
    let output: string;
    const convertStart = performance.now();

    if (request.direction === "json-to-graphql") {
      console.log("🔄 Converting JSON Schema to GraphQL...");

      // Convert JSON Schema to GraphQL
      const schema = typeof request.input === "string" ? JSON.parse(request.input) : request.input;

      console.log("📋 Schema to convert:", JSON.stringify(schema).substring(0, 200));

      try {
        output = jsonSchemaToGraphQL(schema, request.options);
        console.log("✓ Conversion successful, output length:", output.length);
      } catch (convError) {
        console.error("❌ Conversion failed:", convError);
        throw convError;
      }
    } else if (request.direction === "graphql-to-json") {
      // Convert GraphQL to JSON Schema
      const sdl = typeof request.input === "string" ? request.input : JSON.stringify(request.input);

      const result = graphqlToJsonSchema(sdl, request.options);
      output = JSON.stringify(result, null, 2);
    } else {
      sendJson(res, 400, {
        success: false,
        error: `Unknown direction: ${request.direction}`,
      });
      return;
    }

    const convertEnd = performance.now();
    const totalTime = performance.now() - startTime;

    // Send success response
    sendJson(res, 200, {
      success: true,
      output,
      timing: {
        convert: convertEnd - convertStart,
        total: totalTime,
      },
    });
  } catch (error) {
    console.error("💥 Conversion error:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : "No stack");
    console.error("Error type:", error?.constructor?.name);

    sendJson(res, 500, {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      details: {
        context: error instanceof Error ? error.stack : undefined,
      },
    });
  }
}

/**
 * Create HTTP server
 */
const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.end();
    return;
  }

  // Health check
  if (req.url === "/health" || req.url === "/") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(
      JSON.stringify({
        status: "ok",
        service: "json-schema-x-graphql-converter",
        version: "2.0.0",
      }),
    );
    return;
  }

  // Conversion endpoint
  if (req.url === "/api/convert" && req.method === "POST") {
    handleConvert(req, res).catch((error) => {
      console.error("Unexpected error:", error);
      sendJson(res, 500, {
        success: false,
        error: "Internal server error",
      });
    });
    return;
  }

  // 404
  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(
    JSON.stringify({
      error: "Not found",
      path: req.url,
    }),
  );
});

/**
 * Start server
 */
server.listen(PORT, HOST, () => {
  console.log(`🚀 Converter API server running at http://${HOST}:${PORT}`);
  console.log(`📡 Endpoint: POST http://${HOST}:${PORT}/api/convert`);
  console.log(`💚 Health check: GET http://${HOST}:${PORT}/health`);
});

/**
 * Graceful shutdown
 */
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\nSIGINT received, shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
